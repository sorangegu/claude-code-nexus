import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { eq, and, like } from "drizzle-orm";
import { users } from "../db/schema";
import { ClaudeRequestSchema } from "@common/validators/claude.schema";
import { decryptApiKey } from "../utils/encryption";
import { convertClaudeToOpenAI, convertOpenAIToClaude, StreamConverter } from "../utils/claudeConverter";
import { ModelMappingService } from "../services/modelMappingService";
import type { Bindings } from "../types";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import * as drizzleSchema from "../db/schema";

type Variables = {
  db: DrizzleD1Database<typeof drizzleSchema>;
};

const claude = new OpenAPIHono<{ Bindings: Bindings; Variables: Variables }>();

// Claude API 兼容端点 - 消息接口
const messagesRoute = createRoute({
  method: "post",
  path: "/messages",
  summary: "Claude Messages API 兼容接口",
  description: "完全兼容 Claude API 的消息接口，支持流式响应和工具使用",
  request: {
    body: {
      content: {
        "application/json": {
          schema: ClaudeRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              message: { type: "string" },
            },
          },
        },
        "text/event-stream": {
          schema: {
            type: "string",
            description: "Server-Sent Events 流式响应",
          },
        },
      },
      description: "成功响应",
    },
    400: {
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              error: {
                type: "object",
                properties: {
                  type: { type: "string" },
                  message: { type: "string" },
                },
              },
            },
          },
        },
      },
      description: "请求错误",
    },
    401: {
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              error: {
                type: "object",
                properties: {
                  type: { type: "string" },
                  message: { type: "string" },
                },
              },
            },
          },
        },
      },
      description: "认证失败",
    },
    500: {
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              error: {
                type: "object",
                properties: {
                  type: { type: "string" },
                  message: { type: "string" },
                },
              },
            },
          },
        },
      },
      description: "服务器错误",
    },
  },
});

claude.openapi(messagesRoute, async (c) => {
  const db = c.get("db");
  const apiKey = c.req.header("x-api-key");
  const claudeRequest = c.req.valid("json");

  if (!apiKey) {
    return c.json({ success: false, message: "Missing x-api-key header" }, 401);
  }

  // 1. Authenticate user
  const user = await db.query.users.findFirst({ where: eq(users.apiKey, apiKey) });
  if (!user) {
    return c.json({ success: false, message: "Invalid API Key" }, 401);
  }

  // 2. Find target model using the new mapping service
  const modelKeyword = claudeRequest.model;
  const mappingService = new ModelMappingService(db);
  const targetModel = await mappingService.findTargetModel(user.id, modelKeyword);

  // 检查是否成功映射到了不同的模型
  if (targetModel === modelKeyword) {
    return c.json(
      {
        success: false,
        message: `No model mapping found for: ${modelKeyword}. Only haiku, sonnet, and opus are supported.`,
      },
      400,
    );
  }

  // 3. Get provider details from the user or use defaults
  if (!user.encryptedProviderApiKey) {
    return c.json({ success: false, message: "User has not configured an API key" }, 400);
  }

  const defaultApiConfig = mappingService.getDefaultApiConfig();
  const baseUrl = defaultApiConfig.baseUrl; // 始终使用默认baseUrl
  const targetApiKey = await decryptApiKey(user.encryptedProviderApiKey, c.env.ENCRYPTION_KEY);

  // 4. Convert and forward request
  const openAIRequest = convertClaudeToOpenAI(claudeRequest, targetModel);

  const targetUrl = new URL(baseUrl);
  targetUrl.pathname = "/v1/chat/completions";

  const res = await fetch(targetUrl.toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${targetApiKey}`,
    },
    body: JSON.stringify(openAIRequest),
  });

  if (!res.ok) {
    const errorText = await res.text();
    let errorMessage = "API request failed";

    try {
      const errorData = JSON.parse(errorText);
      errorMessage = errorData.error?.message || errorMessage;
    } catch {
      errorMessage = errorText || errorMessage;
    }

    return c.json(
      {
        error: {
          type: "api_error",
          message: `Upstream API error: ${errorMessage}`,
        },
      },
      res.status as any,
    );
  }

  // 5. Handle response
  if (claudeRequest.stream) {
    // Stream response handling
    return handleStreamingResponse(c, res, claudeRequest.model);
  } else {
    // Non-streaming response handling
    const openAIResponse = await res.json();
    const claudeResponse = convertOpenAIToClaude(openAIResponse, claudeRequest.model);
    return c.json(claudeResponse);
  }
});

/**
 * 处理流式响应
 */
async function handleStreamingResponse(c: any, upstreamResponse: Response, originalModel: string) {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  return c.newResponse(
    new ReadableStream({
      async start(controller) {
        try {
          const converter = new StreamConverter(undefined, originalModel);

          // Send initial events
          const initialEvents = converter.generateInitialEvents();
          for (const event of initialEvents) {
            controller.enqueue(encoder.encode(event));
          }

          const reader = upstreamResponse.body?.getReader();
          if (!reader) {
            throw new Error("Unable to read response stream");
          }

          let buffer = "";
          let finishReason: string | undefined;

          while (true) {
            const { done, value } = await reader.read();

            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || ""; // Keep incomplete lines

            for (const line of lines) {
              if (line.trim() === "") continue;
              if (line.startsWith("data: ")) {
                const data = line.slice(6);

                if (data === "[DONE]") {
                  // Generate finish events
                  const finishEvents = converter.generateFinishEvents(finishReason);
                  for (const event of finishEvents) {
                    controller.enqueue(encoder.encode(event));
                  }
                  controller.close();
                  return;
                }

                try {
                  const chunk = JSON.parse(data);

                  // Record finish reason
                  if (chunk.choices?.[0]?.finish_reason) {
                    finishReason = chunk.choices[0].finish_reason;
                  }

                  // Convert and send events
                  const events = converter.processOpenAIChunk(chunk);
                  for (const event of events) {
                    controller.enqueue(encoder.encode(event));
                  }
                } catch (parseError) {
                  console.error("解析 SSE 数据失败:", parseError, "数据:", data);
                }
              }
            }
          }

          // If stream ends without receiving [DONE], manually send finish events
          const finishEvents = converter.generateFinishEvents(finishReason);
          for (const event of finishEvents) {
            controller.enqueue(encoder.encode(event));
          }
          controller.close();
        } catch (error) {
          console.error("流式响应处理错误:", error);

          // Send error event
          const errorEvent = `event: error\ndata: ${JSON.stringify({
            type: "error",
            error: {
              type: "internal_server_error",
              message: "Stream processing failed",
            },
          })}\n\n`;

          controller.enqueue(encoder.encode(errorEvent));
          controller.close();
        }
      },
    }),
    {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    },
  );
}

// API Key 认证中间件（专用于 Claude API）
export const claudeAuthMiddleware = async (c: any, next: any) => {
  const authHeader = c.req.header("x-api-key") || c.req.header("anthropic-api-key");

  if (!authHeader) {
    return c.json(
      {
        error: {
          type: "authentication_error",
          message: "Missing API key. Please provide your API key in the 'x-api-key' or 'anthropic-api-key' header.",
        },
      },
      401,
    );
  }

  const db = c.get("db");

  try {
    // 通过 API Key 查找用户
    const user = await db.select().from(users).where(eq(users.apiKey, authHeader)).get();

    if (!user) {
      return c.json(
        {
          error: {
            type: "authentication_error",
            message: "Invalid API key",
          },
        },
        401,
      );
    }

    // 将用户信息存储到上下文中
    c.set("user", user);
    await next();
  } catch (error) {
    console.error("Claude API 认证错误:", error);
    return c.json(
      {
        error: {
          type: "authentication_error",
          message: "Authentication failed",
        },
      },
      500,
    );
  }
};

// 应用认证中间件到所有路由
claude.use("*", claudeAuthMiddleware);

export default claude;
