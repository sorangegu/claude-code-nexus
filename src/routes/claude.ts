import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { eq, and, like } from "drizzle-orm";
import { drizzle, type DrizzleD1Database } from "drizzle-orm/d1";
import { users } from "../db/schema";
import { ClaudeRequestSchema } from "@common/validators/claude.schema";
import { decryptApiKey } from "../utils/encryption";
import { convertClaudeToOpenAI, convertOpenAIToClaude, StreamConverter } from "../utils/claudeConverter";
import { ModelMappingService } from "../services/modelMappingService";
import type { Bindings } from "../types";
import * as drizzleSchema from "../db/schema";

type Variables = {
  db: DrizzleD1Database<typeof drizzleSchema>;
  user?: typeof drizzleSchema.users.$inferSelect;
};

const claude = new OpenAPIHono<{ Bindings: Bindings; Variables: Variables }>();

// Add DB middleware to all Claude routes
claude.use("*", async (c, next) => {
  const db = drizzle(c.env.DB, { schema: drizzleSchema });
  c.set("db", db);
  await next();
});

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

claude.openapi(messagesRoute, async (c: any) => {
  const db = c.get("db");
  const claudeRequest = c.req.valid("json");

  // 1. 通过请求头中的API key找到用户
  // Claude Code CLI 使用 Authorization: Bearer 格式
  const authHeader = c.req.header("authorization");
  let userApiKey = c.req.header("x-api-key") || c.req.header("anthropic-api-key");

  // 如果是 Bearer token 格式，提取 token 部分
  if (!userApiKey && authHeader && authHeader.startsWith("Bearer ")) {
    userApiKey = authHeader.substring(7); // 移除 "Bearer " 前缀
  }

  if (!userApiKey) {
    return c.json(
      {
        error: {
          type: "authentication_error",
          message:
            "Missing API key. Please provide your API key in the 'Authorization: Bearer' header, or 'x-api-key' or 'anthropic-api-key' header.",
        },
      },
      401,
    );
  }

  const user = await db.query.users.findFirst({ where: eq(users.apiKey, userApiKey) });

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

  // 2. Find target model using the new mapping service
  const modelKeyword = claudeRequest.model;
  const mappingService = new ModelMappingService(db);
  const targetModel = await mappingService.findTargetModel(user.id, modelKeyword);

  // 📋 关键信息日志
  const keyPrefix = userApiKey.substring(0, 8);
  const keySuffix = userApiKey.substring(userApiKey.length - 8);

  // 计算输入字符长度
  const inputLength = claudeRequest.messages.reduce((total: number, msg: any) => {
    if (msg.content && Array.isArray(msg.content)) {
      return (
        total +
        msg.content.reduce((sum: number, content: any) => {
          if (content.type === "text") return sum + (content.text?.length || 0);
          return sum;
        }, 0)
      );
    } else if (msg.content && typeof msg.content === "string") {
      return total + msg.content.length;
    }
    return total;
  }, 0);

  console.log(
    `🔑 用户: ${user.username} | Key: ${keyPrefix}...${keySuffix} | 模型: ${modelKeyword} → ${targetModel} | 输入: ${inputLength} 字符`,
  );

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
    return handleStreamingResponse(c, res, claudeRequest.model, inputLength, user.username);
  } else {
    // Non-streaming response handling
    const openAIResponse = await res.json();
    const claudeResponse = convertOpenAIToClaude(openAIResponse, claudeRequest.model);

    // 计算输出字符长度
    const outputLength = claudeResponse.content?.[0]?.text?.length || 0;
    console.log(
      `📤 响应完成 | 用户: ${user.username} | 输入: ${inputLength} 字符 | 输出: ${outputLength} 字符 | 总计: ${inputLength + outputLength} 字符`,
    );

    return c.json(claudeResponse);
  }
});

/**
 * 处理流式响应
 */
async function handleStreamingResponse(
  c: any,
  upstreamResponse: Response,
  originalModel: string,
  inputLength: number,
  username: string,
) {
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
          let totalOutputLength = 0;

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

                  // 输出流式响应的字符统计日志
                  console.log(
                    `📤 流式响应完成 | 用户: ${username} | 输入: ${inputLength} 字符 | 输出: ${totalOutputLength} 字符 | 总计: ${inputLength + totalOutputLength} 字符`,
                  );

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

                    // 统计输出字符长度（从content事件中提取）
                    if (event.includes('"type":"content"')) {
                      try {
                        const eventData = event.split("\n").find((line) => line.startsWith("data: "));
                        if (eventData) {
                          const data = JSON.parse(eventData.slice(6));
                          if (data.content && Array.isArray(data.content)) {
                            const textContent = data.content.find((c: any) => c.type === "text");
                            if (textContent?.text) {
                              totalOutputLength += textContent.text.length;
                            }
                          }
                        }
                      } catch (e) {
                        // 忽略解析错误，不影响流式响应
                      }
                    }
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

          // 输出流式响应的字符统计日志（异常结束情况）
          console.log(
            `📤 流式响应完成 | 用户: ${username} | 输入: ${inputLength} 字符 | 输出: ${totalOutputLength} 字符 | 总计: ${inputLength + totalOutputLength} 字符`,
          );

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

export default claude;
