import { z } from "zod";

// API 提供商相关 Schema
export const CreateApiProviderSchema = z.object({
  name: z.string().min(1, "名称不能为空").max(100, "名称不能超过100个字符"),
  baseUrl: z.string().url("请输入有效的 URL").max(500, "URL 不能超过500个字符"),
  apiKey: z.string().min(1, "API Key 不能为空").max(1000, "API Key 不能超过1000个字符"),
  isDefault: z.boolean().optional().default(false),
});

export const UpdateApiProviderSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  baseUrl: z.string().url().max(500).optional(),
  apiKey: z.string().min(1).max(1000).optional(),
  isDefault: z.boolean().optional(),
});

export const ApiProviderResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  baseUrl: z.string(),
  // 注意：响应中不返回完整的 API Key，只返回部分信息
  apiKeyMask: z.string(),
  isDefault: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// 模型映射规则相关 Schema
export const CreateModelMappingSchema = z.object({
  keyword: z.string().min(1, "关键词不能为空").max(50, "关键词不能超过50个字符"),
  providerId: z.string().min(1, "必须选择一个 API 提供商"),
  targetModel: z.string().min(1, "目标模型名称不能为空").max(100, "模型名称不能超过100个字符"),
  priority: z.number().int().min(0).max(999).optional().default(0),
  isEnabled: z.boolean().optional().default(true),
});

export const UpdateModelMappingSchema = z.object({
  keyword: z.string().min(1).max(50).optional(),
  providerId: z.string().min(1).optional(),
  targetModel: z.string().min(1).max(100).optional(),
  priority: z.number().int().min(0).max(999).optional(),
  isEnabled: z.boolean().optional(),
});

export const ModelMappingResponseSchema = z.object({
  id: z.string(),
  keyword: z.string(),
  providerId: z.string(),
  providerName: z.string(), // 关联的提供商名称，便于前端显示
  targetModel: z.string(),
  priority: z.number(),
  isEnabled: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// 批量操作 Schema
export const BatchUpdateMappingsSchema = z.object({
  mappings: z.array(
    z.object({
      id: z.string(),
      priority: z.number().int().min(0).max(999),
    }),
  ),
});

// 通用响应 Schema
export const StandardResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z.any().optional(),
});

// 参数 Schema
export const IdParamSchema = z.object({
  id: z.string().min(1, "ID 不能为空"),
});

// 查询参数 Schema
export const PaginationQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).optional().default("1"),
  limit: z.string().regex(/^\d+$/).transform(Number).optional().default("20"),
  sort: z.enum(["createdAt", "updatedAt", "name", "priority"]).optional().default("createdAt"),
  order: z.enum(["asc", "desc"]).optional().default("desc"),
});
