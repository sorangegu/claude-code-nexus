import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { eq, and, asc } from "drizzle-orm";
import { users, apiProviders, modelMappings } from "../db/schema";
import { ClaudeRequestSchema, ClaudeResponseSchema } from "../validators/claude.schema";
import { convertClaudeToOpenAI, convertOpenAIToClaude, StreamConverter } from "../utils/claudeConverter";
import { decryptApiKey } from "../utils/encryption";
import type { Bindings } from "../types";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import * as drizzleSchema from "../db/schema";

type Variables = {
  db: DrizzleD1Database<typeof drizzleSchema>;
  user?: typeof users.$inferSelect;
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
          schema: ClaudeResponseSchema,
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
  try {
    const claudeRequest = c.req.valid("json");
    const user = c.get("user");
    const db = c.get("db");

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

    // 1. 根据模型名称查找匹配的映射规则
    const mappingRules = await db
      .select({
        mapping: modelMappings,
        provider: apiProviders,
      })
      .from(modelMappings)
      .innerJoin(apiProviders, eq(modelMappings.providerId, apiProviders.id))
      .where(and(eq(modelMappings.userId, user.id), eq(modelMappings.isEnabled, true)))
      .orderBy(asc(modelMappings.priority))
      .all();

    // 查找匹配的规则
    let selectedProvider: typeof apiProviders.$inferSelect | null = null;
    let targetModel = claudeRequest.model;

    for (const rule of mappingRules) {
      if (claudeRequest.model.toLowerCase().includes(rule.mapping.keyword.toLowerCase())) {
        selectedProvider = rule.provider;
        targetModel = rule.mapping.targetModel;
        break;
      }
    }

    // 如果没有找到匹配规则，使用默认提供商
    if (!selectedProvider) {
      const defaultProvider = await db
        .select()
        .from(apiProviders)
        .where(and(eq(apiProviders.userId, user.id), eq(apiProviders.isDefault, true)))
        .get();

      if (!defaultProvider) {
        return c.json(
          {
            error: {
              type: "invalid_request_error",
              message: "No API provider configured. Please configure at least one API provider in your settings.",
            },
          },
          400,
        );
      }

      selectedProvider = defaultProvider;
    }

    // 2. 解密 API 密钥
    const decryptedApiKey = await decryptApiKey(selectedProvider.apiKey, c.env.ENCRYPTION_KEY);

    // 3. 转换请求格式
    const openAIRequest = convertClaudeToOpenAI(claudeRequest, targetModel);

    // 4. 发送请求到目标 API
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${decryptedApiKey}`,
      "User-Agent": "Claude-Proxy/1.0",
    };

    const requestBody = JSON.stringify(openAIRequest);

    const response = await fetch(`${selectedProvider.baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers,
      body: requestBody,
    });

    if (!response.ok) {
      const errorText = await response.text();
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
        response.status as any,
      );
    }

    // 5. 处理响应
    if (claudeRequest.stream) {
      // 流式响应处理
      return handleStreamingResponse(c, response, claudeRequest.model);
    } else {
      // 非流式响应处理
      const openAIResponse = await response.json();
      const claudeResponse = convertOpenAIToClaude(openAIResponse, claudeRequest.model);
      return c.json(claudeResponse);
    }
  } catch (error) {
    console.error("Claude API 代理错误:", error);
    return c.json(
      {
        error: {
          type: "internal_server_error",
          message: "An internal error occurred while processing your request.",
        },
      },
      500,
    );
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

          // 发送初始事件
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
            buffer = lines.pop() || ""; // 保留不完整的行

            for (const line of lines) {
              if (line.trim() === "") continue;
              if (line.startsWith("data: ")) {
                const data = line.slice(6);

                if (data === "[DONE]") {
                  // 生成结束事件
                  const finishEvents = converter.generateFinishEvents(finishReason);
                  for (const event of finishEvents) {
                    controller.enqueue(encoder.encode(event));
                  }
                  controller.close();
                  return;
                }

                try {
                  const chunk = JSON.parse(data);

                  // 记录结束原因
                  if (chunk.choices?.[0]?.finish_reason) {
                    finishReason = chunk.choices[0].finish_reason;
                  }

                  // 转换并发送事件
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

          // 如果流结束但没有收到 [DONE]，手动发送结束事件
          const finishEvents = converter.generateFinishEvents(finishReason);
          for (const event of finishEvents) {
            controller.enqueue(encoder.encode(event));
          }
          controller.close();
        } catch (error) {
          console.error("流式响应处理错误:", error);

          // 发送错误事件
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
