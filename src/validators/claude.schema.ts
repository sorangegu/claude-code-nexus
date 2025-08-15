import { z } from "zod";

// Claude API 请求相关 Schema

// Claude 消息内容类型
export const ClaudeTextContentSchema = z.object({
  type: z.literal("text"),
  text: z.string(),
});

export const ClaudeImageContentSchema = z.object({
  type: z.literal("image"),
  source: z.object({
    type: z.literal("base64"),
    media_type: z.enum(["image/jpeg", "image/png", "image/gif", "image/webp"]),
    data: z.string(),
  }),
});

export const ClaudeToolUseContentSchema = z.object({
  type: z.literal("tool_use"),
  id: z.string(),
  name: z.string(),
  input: z.record(z.any()),
});

export const ClaudeToolResultContentSchema = z.object({
  type: z.literal("tool_result"),
  tool_use_id: z.string(),
  content: z.union([z.string(), z.array(z.any())]),
  is_error: z.boolean().optional(),
});

export const ClaudeContentSchema = z.union([
  ClaudeTextContentSchema,
  ClaudeImageContentSchema,
  ClaudeToolUseContentSchema,
  ClaudeToolResultContentSchema,
]);

// Claude 消息 Schema
export const ClaudeMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.union([z.string(), z.array(ClaudeContentSchema)]),
});

// Claude 工具定义 Schema
export const ClaudeToolSchema = z.object({
  name: z.string(),
  description: z.string(),
  input_schema: z.object({
    type: z.literal("object"),
    properties: z.record(z.any()),
    required: z.array(z.string()).optional(),
  }),
});

// Claude 工具选择 Schema
export const ClaudeToolChoiceSchema = z.union([
  z.object({ type: z.literal("auto") }),
  z.object({ type: z.literal("any") }),
  z.object({
    type: z.literal("tool"),
    name: z.string(),
  }),
]);

// Claude API 请求 Schema
export const ClaudeRequestSchema = z.object({
  model: z.string(),
  max_tokens: z.number().int().positive(),
  messages: z.array(ClaudeMessageSchema),
  system: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  top_p: z.number().min(0).max(1).optional(),
  top_k: z.number().int().positive().optional(),
  stream: z.boolean().optional().default(false),
  stop_sequences: z.array(z.string()).optional(),
  tools: z.array(ClaudeToolSchema).optional(),
  tool_choice: ClaudeToolChoiceSchema.optional(),
});

// Claude API 响应 Schema
export const ClaudeUsageSchema = z.object({
  input_tokens: z.number().int(),
  output_tokens: z.number().int(),
});

export const ClaudeResponseSchema = z.object({
  id: z.string(),
  type: z.literal("message"),
  role: z.literal("assistant"),
  content: z.array(ClaudeContentSchema),
  model: z.string(),
  stop_reason: z.enum(["end_turn", "max_tokens", "stop_sequence", "tool_use"]).nullable(),
  stop_sequence: z.string().nullable().optional(),
  usage: ClaudeUsageSchema,
});

// OpenAI API 请求/响应相关 Schema（用于转换）

export const OpenAIMessageSchema = z.object({
  role: z.enum(["system", "user", "assistant", "tool"]),
  content: z.union([z.string(), z.array(z.any()), z.null()]),
  name: z.string().optional(),
  tool_calls: z.array(z.any()).optional(),
  tool_call_id: z.string().optional(),
});

export const OpenAIRequestSchema = z.object({
  model: z.string(),
  messages: z.array(OpenAIMessageSchema),
  max_tokens: z.number().int().positive().optional(),
  temperature: z.number().min(0).max(2).optional(),
  top_p: z.number().min(0).max(1).optional(),
  stream: z.boolean().optional().default(false),
  stop: z.union([z.string(), z.array(z.string())]).optional(),
  tools: z.array(z.any()).optional(),
  tool_choice: z.union([z.string(), z.object({ type: z.string() })]).optional(),
});

// 流式响应事件 Schema
export const ClaudeStreamEventSchema = z.union([
  z.object({ type: z.literal("ping") }),
  z.object({
    type: z.literal("message_start"),
    message: ClaudeResponseSchema.omit({ content: true, stop_reason: true, stop_sequence: true }).extend({
      content: z.array(z.any()),
      stop_reason: z.null(),
      stop_sequence: z.null(),
    }),
  }),
  z.object({
    type: z.literal("content_block_start"),
    index: z.number().int(),
    content_block: z.union([
      z.object({ type: z.literal("text"), text: z.string() }),
      z.object({
        type: z.literal("tool_use"),
        id: z.string(),
        name: z.string(),
        input: z.record(z.any()),
      }),
    ]),
  }),
  z.object({
    type: z.literal("content_block_delta"),
    index: z.number().int(),
    delta: z.union([
      z.object({ type: z.literal("text_delta"), text: z.string() }),
      z.object({ type: z.literal("input_json_delta"), partial_json: z.string() }),
    ]),
  }),
  z.object({
    type: z.literal("content_block_stop"),
    index: z.number().int(),
  }),
  z.object({
    type: z.literal("message_delta"),
    delta: z.object({
      stop_reason: z.enum(["end_turn", "max_tokens", "stop_sequence", "tool_use"]).optional(),
      stop_sequence: z.string().optional(),
    }),
    usage: z.object({
      output_tokens: z.number().int(),
    }),
  }),
  z.object({ type: z.literal("message_stop") }),
]);
