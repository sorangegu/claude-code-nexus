import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { eq } from "drizzle-orm";
import { drizzle, type DrizzleD1Database } from "drizzle-orm/d1";
import { users } from "../db/schema";
import { ClaudeRequestSchema } from "@common/validators/claude.schema";
import { decryptApiKey } from "../utils/encryption";
import { ModelMappingService } from "../services/modelMappingService";
import type { Bindings } from "../types";
import * as drizzleSchema from "../db/schema";
import { convertClaudeToOpenAI, convertOpenAIToClaude } from "../utils/claudeConverter";

type Variables = {
  db: DrizzleD1Database<typeof drizzleSchema>;
  user?: typeof drizzleSchema.users.$inferSelect;
};

// --- StreamConverter 类 ---
class ClaudeStreamConverter {
  private claudeModel: string;
  private messageId: string;
  private contentBlockIndex: number;
  private hasSentMessageStart: boolean;
  private toolCallStates: { [id: string]: { name: string; arguments: string } };

  constructor(claudeModel: string) {
    this.claudeModel = claudeModel;
    this.messageId = `msg_${Math.random().toString(36).substr(2, 24)}`;
    this.contentBlockIndex = -1;
    this.hasSentMessageStart = false;
    this.toolCallStates = {};
  }

  private formatEvent(eventName: string, data: object): string {
    return `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
  }

  public generateInitialEvents(): string[] {
    const events = [];
    if (!this.hasSentMessageStart) {
      const messageStartEvent = {
        type: "message_start",
        message: {
          id: this.messageId,
          type: "message",
          role: "assistant",
          content: [],
          model: this.claudeModel,
          stop_reason: null,
          stop_sequence: null,
          usage: { input_tokens: 0, output_tokens: 0 },
        },
      };
      events.push(this.formatEvent("message_start", messageStartEvent));
      this.hasSentMessageStart = true;
    }
    return events;
  }

  public processOpenAIChunk(chunk: any): string[] {
    const events: string[] = [];
    const delta = chunk.choices?.[0]?.delta;
    if (!delta) return events;

    if (delta.content) {
      if (this.contentBlockIndex === -1) {
        this.contentBlockIndex = 0;
        events.push(
          this.formatEvent("content_block_start", {
            type: "content_block_start",
            index: this.contentBlockIndex,
            content_block: { type: "text", text: "" },
          }),
        );
      }
      events.push(
        this.formatEvent("content_block_delta", {
          type: "content_block_delta",
          index: this.contentBlockIndex,
          delta: { type: "text_delta", text: delta.content },
        }),
      );
    }

    if (delta.tool_calls) {
      for (const toolCallDelta of delta.tool_calls) {
        if (toolCallDelta.index > this.contentBlockIndex) {
          if (this.contentBlockIndex !== -1 && !this.toolCallStates[this.contentBlockIndex]) {
            events.push(
              this.formatEvent("content_block_stop", { type: "content_block_stop", index: this.contentBlockIndex }),
            );
          }
          this.contentBlockIndex = toolCallDelta.index;
          const toolCallId = toolCallDelta.id || `toolu_${Math.random().toString(36).substr(2, 24)}`;
          this.toolCallStates[toolCallId] = { name: toolCallDelta.function.name || "", arguments: "" };

          events.push(
            this.formatEvent("content_block_start", {
              type: "content_block_start",
              index: this.contentBlockIndex,
              content_block: {
                type: "tool_use",
                id: toolCallId,
                name: this.toolCallStates[toolCallId].name,
                input: {},
              },
            }),
          );
        }

        const toolCallId = Object.keys(this.toolCallStates)[toolCallDelta.index];
        if (toolCallId && toolCallDelta.function?.arguments) {
          this.toolCallStates[toolCallId].arguments += toolCallDelta.function.arguments;
          events.push(
            this.formatEvent("content_block_delta", {
              type: "content_block_delta",
              index: this.contentBlockIndex,
              delta: { type: "input_json_delta", partial_json: toolCallDelta.function.arguments },
            }),
          );
        }
      }
    }
    return events;
  }

  public generateFinishEvents(
    finishReason: string | null,
    usage: { input_tokens: number; output_tokens: number },
  ): string[] {
    const events = [];
    for (let i = 0; i <= this.contentBlockIndex; i++) {
      events.push(this.formatEvent("content_block_stop", { type: "content_block_stop", index: i }));
    }
    events.push(
      this.formatEvent("message_delta", {
        type: "message_delta",
        delta: { stop_reason: finishReason, stop_sequence: null },
        usage: { output_tokens: usage.output_tokens },
      }),
    );
    events.push(
      this.formatEvent("message_stop", {
        type: "message_stop",
        "amazon-bedrock-invocationMetrics": {
          inputTokenCount: usage.input_tokens,
          outputTokenCount: usage.output_tokens,
          invocationLatency: 0,
          firstByteLatency: 0,
        },
      }),
    );
    return events;
  }
}

const claude = new OpenAPIHono<{ Bindings: Bindings; Variables: Variables }>();

claude.use("*", async (c, next) => {
  const db = drizzle(c.env.DB, { schema: drizzleSchema });
  c.set("db", db);
  await next();
});

// **FIX 1: 将路由定义内联到 openapi() 调用中**
claude.openapi(
  createRoute({
    method: "post",
    path: "/messages",
    summary: "Claude Messages API 兼容接口",
    description: "完全兼容 Claude API 的消息接口，支持流式响应和工具使用",
    request: {
      body: {
        content: { "application/json": { schema: ClaudeRequestSchema } },
      },
    },
    responses: {
      200: {
        description: "成功响应",
        content: {
          "application/json": { schema: { type: "object" } },
          "text/event-stream": { schema: { type: "string" } },
        },
      },
      400: { description: "请求错误" },
      401: { description: "认证失败" },
      500: { description: "服务器错误" },
    },
  }),
  async (c: any) => {
    const db = c.get("db");
    const claudeRequest = c.req.valid("json");

    const authHeader = c.req.header("authorization");
    let userApiKey = c.req.header("x-api-key") || c.req.header("anthropic-api-key");
    if (!userApiKey && authHeader && authHeader.startsWith("Bearer ")) {
      userApiKey = authHeader.substring(7);
    }
    if (!userApiKey) {
      return c.json({ error: { type: "authentication_error", message: "Missing API key." } }, 401);
    }
    const user = await db.query.users.findFirst({ where: eq(users.apiKey, userApiKey) });
    if (!user) {
      return c.json({ error: { type: "authentication_error", message: "Invalid API key" } }, 401);
    }
    const modelKeyword = claudeRequest.model;
    const mappingService = new ModelMappingService(db);
    const targetModel = await mappingService.findTargetModel(user.id, modelKeyword);
    if (targetModel === modelKeyword) {
      return c.json(
        { error: { type: "invalid_request_error", message: `No model mapping found for: ${modelKeyword}.` } },
        400,
      );
    }
    if (!user.encryptedProviderApiKey) {
      return c.json({ error: { type: "invalid_request_error", message: "User has not configured an API key" } }, 400);
    }
    const defaultApiConfig = mappingService.getDefaultApiConfig();
    const baseUrl = user.providerBaseUrl || defaultApiConfig.baseUrl;
    const targetApiKey = await decryptApiKey(user.encryptedProviderApiKey, c.env.ENCRYPTION_KEY);
    const targetUrl = baseUrl.endsWith("/") ? `${baseUrl}chat/completions` : `${baseUrl}/chat/completions`;

    const openAIRequest = convertClaudeToOpenAI(claudeRequest, targetModel);

    const res = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${targetApiKey}`,
      },
      body: JSON.stringify(openAIRequest),
    });

    if (!res.ok) {
      console.error(`Upstream API request failed: ${res.status} ${res.statusText}`);
      return c.newResponse(res.body, res.status, res.headers);
    }

    if (claudeRequest.stream) {
      const inputLength = claudeRequest.messages.reduce(
        (total: number, msg: any) => total + (msg.content?.[0]?.text?.length || 0),
        0,
      );
      return handleStreamingResponse(c, res, claudeRequest.model, inputLength, user.username);
    } else {
      const openAIResponse = await res.json();
      const claudeResponse = convertOpenAIToClaude(openAIResponse, claudeRequest.model);
      return c.json(claudeResponse);
    }
  },
);

async function handleStreamingResponse(
  c: any,
  upstreamResponse: Response,
  originalModel: string,
  inputLength: number,
  username: string,
) {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let heartbeatInterval: number;

  const stream = new ReadableStream({
    async start(controller) {
      heartbeatInterval = setInterval(() => {
        controller.enqueue(encoder.encode("event: ping\ndata: {}\n\n"));
      }, 3000);

      const converter = new ClaudeStreamConverter(originalModel);
      converter.generateInitialEvents().forEach((event) => controller.enqueue(encoder.encode(event)));

      const reader = upstreamResponse.body?.getReader();
      if (!reader) throw new Error("Unable to read response stream");

      let buffer = "";
      let usage = { input_tokens: 0, output_tokens: 0 };
      let finishReason: string | null = null;
      let totalOutputLength = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;

          const data = line.slice(6);
          if (data === "[DONE]") continue;

          try {
            const chunk = JSON.parse(data);
            if (chunk.usage) {
              usage = chunk.usage;
            }
            if (chunk.choices?.[0]?.finish_reason) {
              finishReason = chunk.choices[0].finish_reason;
            }

            const events = converter.processOpenAIChunk(chunk);
            for (const event of events) {
              controller.enqueue(encoder.encode(event));
              if (event.includes('"type":"text_delta"')) {
                try {
                  const eventData = JSON.parse(event.split("\ndata: ")[1]);
                  totalOutputLength += eventData.delta.text.length;
                } catch (e) {
                  /* ignore */
                }
              }
            }
          } catch (e) {
            console.error("Failed to parse SSE chunk:", e, "Data:", data);
          }
        }
      }

      clearInterval(heartbeatInterval);
      converter.generateFinishEvents(finishReason, usage).forEach((event) => controller.enqueue(encoder.encode(event)));
      console.log(
        `📤 Stream finished | User: ${username} | Input: ${inputLength} chars | Output: ${totalOutputLength} chars`,
      );
      controller.close();
    },
    cancel() {
      clearInterval(heartbeatInterval);
      console.log("Stream cancelled by client.");
    },
  });

  return c.newResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

export default claude;
