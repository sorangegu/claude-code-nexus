import { z } from "zod";
import { createRoute, OpenAPIHono } from "@hono/zod-openapi";

const zodOpenAPIRequest = (req: any) => req;
const zodOpenAPIResponse = (res: any) => res;

export const ProviderConfigSchema = z.object({
  baseUrl: z.string().url("请输入有效的 URL"), // 仅用于前端显示，不存储
  apiKey: z.string().min(1, "API Key 不能为空"),
});

// 固定的三个模型映射配置
export const ModelMappingConfigSchema = z.object({
  haiku: z.string().min(1, "Haiku模型不能为空"),
  sonnet: z.string().min(1, "Sonnet模型不能为空"),
  opus: z.string().min(1, "Opus模型不能为空"),
});

// 用户模型配置
export const UserModelConfigSchema = z.object({
  useSystemMapping: z.boolean(), // true=使用系统默认，false=使用自定义
  customMapping: ModelMappingConfigSchema.optional(), // 自定义映射配置
});

export const UpdateUserConfigSchema = z.object({
  provider: ProviderConfigSchema.optional(),
  modelConfig: UserModelConfigSchema.optional(),
});

export const UserConfigSchema = z.object({
  provider: ProviderConfigSchema,
  modelConfig: UserModelConfigSchema,
});

// --- OpenAPI Routes ---

export const getUserConfigRoute = createRoute({
  method: "get",
  path: "/",
  summary: "获取用户配置",
  responses: {
    200: zodOpenAPIResponse({
      description: "成功获取用户配置",
      schema: UserConfigSchema,
    }),
  },
});

export const updateUserConfigRoute = createRoute({
  method: "put",
  path: "/",
  summary: "更新用户配置",
  request: zodOpenAPIRequest({
    body: {
      content: {
        "application/json": {
          schema: UpdateUserConfigSchema,
        },
      },
    },
  }),
  responses: {
    200: zodOpenAPIResponse({
      description: "成功更新用户配置",
      schema: UserConfigSchema,
    }),
  },
});

export const resetMappingsRoute = createRoute({
  method: "post",
  path: "/reset",
  summary: "重置模型映射到系统默认配置",
  responses: {
    200: zodOpenAPIResponse({
      description: "成功重置映射配置",
      schema: UserConfigSchema,
    }),
  },
});
