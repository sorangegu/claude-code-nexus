import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { eq, and, desc } from "drizzle-orm";
import { apiProviders, modelMappings } from "../db/schema";
import {
  CreateApiProviderSchema,
  UpdateApiProviderSchema,
  ApiProviderResponseSchema,
  CreateModelMappingSchema,
  UpdateModelMappingSchema,
  ModelMappingResponseSchema,
  StandardResponseSchema,
  IdParamSchema,
  BatchUpdateMappingsSchema,
} from "../validators/config.schema";
import { encryptApiKey, maskApiKey } from "../utils/encryption";
import { authMiddleware } from "./auth";
import type { Bindings } from "../types";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import * as drizzleSchema from "../db/schema";

type Variables = {
  db: DrizzleD1Database<typeof drizzleSchema>;
  user?: typeof drizzleSchema.users.$inferSelect;
};

const config = new OpenAPIHono<{ Bindings: Bindings; Variables: Variables }>();

// 应用认证中间件到所有路由
config.use("*", authMiddleware);

// ==================== API 提供商管理 ====================

// 获取用户的所有 API 提供商
const getProvidersRoute = createRoute({
  method: "get",
  path: "/providers",
  summary: "获取 API 提供商列表",
  description: "获取当前用户配置的所有 API 提供商",
  security: [{ BearerAuth: [] }],
  responses: {
    200: {
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              data: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    name: { type: "string" },
                    baseUrl: { type: "string" },
                    apiKeyMask: { type: "string" },
                    isDefault: { type: "boolean" },
                    createdAt: { type: "string" },
                    updatedAt: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
      description: "成功获取提供商列表",
    },
  },
});

config.openapi(getProvidersRoute as any, async (c) => {
  const user = c.get("user")!;
  const db = c.get("db");

  const providers = await db
    .select()
    .from(apiProviders)
    .where(eq(apiProviders.userId, user.id))
    .orderBy(desc(apiProviders.createdAt))
    .all();

  const responseData = providers.map((provider) => ({
    id: provider.id,
    name: provider.name,
    baseUrl: provider.baseUrl,
    apiKeyMask: maskApiKey(provider.apiKey),
    isDefault: provider.isDefault,
    createdAt: provider.createdAt.toISOString(),
    updatedAt: provider.updatedAt.toISOString(),
  }));

  return c.json({
    success: true,
    data: responseData,
  });
});

// 创建新的 API 提供商
const createProviderRoute = createRoute({
  method: "post",
  path: "/providers",
  summary: "创建 API 提供商",
  description: "为当前用户创建新的 API 提供商配置",
  security: [{ BearerAuth: [] }],
  request: {
    body: {
      content: {
        "application/json": {
          schema: CreateApiProviderSchema,
        },
      },
    },
  },
  responses: {
    201: {
      content: {
        "application/json": {
          schema: StandardResponseSchema,
        },
      },
      description: "创建成功",
    },
    400: {
      content: {
        "application/json": {
          schema: StandardResponseSchema,
        },
      },
      description: "请求参数错误",
    },
  },
});

config.openapi(createProviderRoute as any, async (c) => {
  const user = c.get("user")!;
  const db = c.get("db");
  const providerData = await c.req.json();

  try {
    // 如果设置为默认提供商，需要将其他提供商的默认状态取消
    if (providerData.isDefault) {
      await db.update(apiProviders).set({ isDefault: false }).where(eq(apiProviders.userId, user.id));
    }

    // 加密 API 密钥
    const encryptedApiKey = await encryptApiKey(providerData.apiKey, c.env.ENCRYPTION_KEY);

    // 创建新提供商
    const newProvider = await db
      .insert(apiProviders)
      .values({
        userId: user.id,
        name: providerData.name,
        baseUrl: providerData.baseUrl,
        apiKey: encryptedApiKey,
        isDefault: providerData.isDefault || false,
      })
      .returning()
      .get();

    return c.json(
      {
        success: true,
        message: "API 提供商创建成功",
        data: {
          id: newProvider.id,
          name: newProvider.name,
          baseUrl: newProvider.baseUrl,
          apiKeyMask: maskApiKey(providerData.apiKey),
          isDefault: newProvider.isDefault,
          createdAt: newProvider.createdAt.toISOString(),
          updatedAt: newProvider.updatedAt.toISOString(),
        },
      },
      201,
    );
  } catch (error) {
    console.error("创建 API 提供商失败:", error);
    return c.json(
      {
        success: false,
        message: "创建失败，请重试",
      },
      500,
    );
  }
});

// 更新 API 提供商
const updateProviderRoute = createRoute({
  method: "put",
  path: "/providers/{id}",
  summary: "更新 API 提供商",
  description: "更新指定的 API 提供商配置",
  security: [{ BearerAuth: [] }],
  request: {
    params: IdParamSchema,
    body: {
      content: {
        "application/json": {
          schema: UpdateApiProviderSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: StandardResponseSchema,
        },
      },
      description: "更新成功",
    },
    404: {
      content: {
        "application/json": {
          schema: StandardResponseSchema,
        },
      },
      description: "提供商不存在",
    },
  },
});

config.openapi(updateProviderRoute as any, async (c) => {
  const user = c.get("user")!;
  const db = c.get("db");
  const id = c.req.param("id");
  const updateData = await c.req.json();

  try {
    // 检查提供商是否存在且属于当前用户
    const existingProvider = await db
      .select()
      .from(apiProviders)
      .where(and(eq(apiProviders.id, id), eq(apiProviders.userId, user.id)))
      .get();

    if (!existingProvider) {
      return c.json(
        {
          success: false,
          message: "API 提供商不存在",
        },
        404,
      );
    }

    // 准备更新数据
    const updateFields: any = { updatedAt: new Date() };

    if (updateData.name) updateFields.name = updateData.name;
    if (updateData.baseUrl) updateFields.baseUrl = updateData.baseUrl;
    if (updateData.apiKey) {
      updateFields.apiKey = await encryptApiKey(updateData.apiKey, c.env.ENCRYPTION_KEY);
    }

    // 处理默认状态
    if (updateData.isDefault !== undefined) {
      if (updateData.isDefault) {
        // 如果设置为默认，取消其他提供商的默认状态
        await db
          .update(apiProviders)
          .set({ isDefault: false })
          .where(and(eq(apiProviders.userId, user.id), eq(apiProviders.id, id)));
      }
      updateFields.isDefault = updateData.isDefault;
    }

    // 执行更新
    await db.update(apiProviders).set(updateFields).where(eq(apiProviders.id, id));

    return c.json({
      success: true,
      message: "API 提供商更新成功",
    });
  } catch (error) {
    console.error("更新 API 提供商失败:", error);
    return c.json(
      {
        success: false,
        message: "更新失败，请重试",
      },
      500,
    );
  }
});

// 删除 API 提供商
const deleteProviderRoute = createRoute({
  method: "delete",
  path: "/providers/{id}",
  summary: "删除 API 提供商",
  description: "删除指定的 API 提供商（同时删除相关的模型映射规则）",
  security: [{ BearerAuth: [] }],
  request: {
    params: IdParamSchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: StandardResponseSchema,
        },
      },
      description: "删除成功",
    },
    404: {
      content: {
        "application/json": {
          schema: StandardResponseSchema,
        },
      },
      description: "提供商不存在",
    },
  },
});

config.openapi(deleteProviderRoute as any, async (c) => {
  const user = c.get("user")!;
  const db = c.get("db");
  const id = c.req.param("id");

  try {
    // 检查提供商是否存在且属于当前用户
    const existingProvider = await db
      .select()
      .from(apiProviders)
      .where(and(eq(apiProviders.id, id), eq(apiProviders.userId, user.id)))
      .get();

    if (!existingProvider) {
      return c.json(
        {
          success: false,
          message: "API 提供商不存在",
        },
        404,
      );
    }

    // 删除提供商（级联删除会自动删除相关的模型映射）
    await db.delete(apiProviders).where(eq(apiProviders.id, id));

    return c.json({
      success: true,
      message: "API 提供商删除成功",
    });
  } catch (error) {
    console.error("删除 API 提供商失败:", error);
    return c.json(
      {
        success: false,
        message: "删除失败，请重试",
      },
      500,
    );
  }
});

// ==================== 模型映射规则管理 ====================

// 获取用户的所有模型映射规则
const getMappingsRoute = createRoute({
  method: "get",
  path: "/mappings",
  summary: "获取模型映射规则列表",
  description: "获取当前用户配置的所有模型映射规则",
  security: [{ BearerAuth: [] }],
  responses: {
    200: {
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              data: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    keyword: { type: "string" },
                    providerId: { type: "string" },
                    providerName: { type: "string" },
                    targetModel: { type: "string" },
                    priority: { type: "number" },
                    isEnabled: { type: "boolean" },
                    createdAt: { type: "string" },
                    updatedAt: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
      description: "成功获取映射规则列表",
    },
  },
});

config.openapi(getMappingsRoute as any, async (c) => {
  const user = c.get("user")!;
  const db = c.get("db");

  const mappings = await db
    .select({
      mapping: modelMappings,
      provider: apiProviders,
    })
    .from(modelMappings)
    .innerJoin(apiProviders, eq(modelMappings.providerId, apiProviders.id))
    .where(eq(modelMappings.userId, user.id))
    .orderBy(modelMappings.priority, desc(modelMappings.createdAt))
    .all();

  const responseData = mappings.map((item) => ({
    id: item.mapping.id,
    keyword: item.mapping.keyword,
    providerId: item.mapping.providerId,
    providerName: item.provider.name,
    targetModel: item.mapping.targetModel,
    priority: item.mapping.priority,
    isEnabled: item.mapping.isEnabled,
    createdAt: item.mapping.createdAt.toISOString(),
    updatedAt: item.mapping.updatedAt.toISOString(),
  }));

  return c.json({
    success: true,
    data: responseData,
  });
});

// 创建新的模型映射规则
const createMappingRoute = createRoute({
  method: "post",
  path: "/mappings",
  summary: "创建模型映射规则",
  description: "为当前用户创建新的模型映射规则",
  security: [{ BearerAuth: [] }],
  request: {
    body: {
      content: {
        "application/json": {
          schema: CreateModelMappingSchema,
        },
      },
    },
  },
  responses: {
    201: {
      content: {
        "application/json": {
          schema: StandardResponseSchema,
        },
      },
      description: "创建成功",
    },
    400: {
      content: {
        "application/json": {
          schema: StandardResponseSchema,
        },
      },
      description: "请求参数错误",
    },
  },
});

config.openapi(createMappingRoute as any, async (c) => {
  const user = c.get("user")!;
  const db = c.get("db");
  const mappingData = await c.req.json();

  try {
    // 验证提供商是否属于当前用户
    const provider = await db
      .select()
      .from(apiProviders)
      .where(and(eq(apiProviders.id, mappingData.providerId), eq(apiProviders.userId, user.id)))
      .get();

    if (!provider) {
      return c.json(
        {
          success: false,
          message: "指定的 API 提供商不存在",
        },
        400,
      );
    }

    // 创建新映射规则
    const newMapping = await db
      .insert(modelMappings)
      .values({
        userId: user.id,
        keyword: mappingData.keyword,
        providerId: mappingData.providerId,
        targetModel: mappingData.targetModel,
        priority: mappingData.priority || 0,
        isEnabled: mappingData.isEnabled !== false,
      })
      .returning()
      .get();

    return c.json(
      {
        success: true,
        message: "模型映射规则创建成功",
        data: {
          id: newMapping.id,
          keyword: newMapping.keyword,
          providerId: newMapping.providerId,
          providerName: provider.name,
          targetModel: newMapping.targetModel,
          priority: newMapping.priority,
          isEnabled: newMapping.isEnabled,
          createdAt: newMapping.createdAt.toISOString(),
          updatedAt: newMapping.updatedAt.toISOString(),
        },
      },
      201,
    );
  } catch (error) {
    console.error("创建模型映射规则失败:", error);
    return c.json(
      {
        success: false,
        message: "创建失败，请重试",
      },
      500,
    );
  }
});

// 更新模型映射规则
const updateMappingRoute = createRoute({
  method: "put",
  path: "/mappings/{id}",
  summary: "更新模型映射规则",
  description: "更新指定的模型映射规则",
  security: [{ BearerAuth: [] }],
  request: {
    params: IdParamSchema,
    body: {
      content: {
        "application/json": {
          schema: UpdateModelMappingSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: StandardResponseSchema,
        },
      },
      description: "更新成功",
    },
    404: {
      content: {
        "application/json": {
          schema: StandardResponseSchema,
        },
      },
      description: "映射规则不存在",
    },
  },
});

config.openapi(updateMappingRoute as any, async (c) => {
  const user = c.get("user")!;
  const db = c.get("db");
  const id = c.req.param("id");
  const updateData = await c.req.json();

  try {
    // 检查映射规则是否存在且属于当前用户
    const existingMapping = await db
      .select()
      .from(modelMappings)
      .where(and(eq(modelMappings.id, id), eq(modelMappings.userId, user.id)))
      .get();

    if (!existingMapping) {
      return c.json(
        {
          success: false,
          message: "模型映射规则不存在",
        },
        404,
      );
    }

    // 如果更新了 providerId，验证提供商是否属于当前用户
    if (updateData.providerId) {
      const provider = await db
        .select()
        .from(apiProviders)
        .where(and(eq(apiProviders.id, updateData.providerId), eq(apiProviders.userId, user.id)))
        .get();

      if (!provider) {
        return c.json(
          {
            success: false,
            message: "指定的 API 提供商不存在",
          },
          400,
        );
      }
    }

    // 准备更新数据
    const updateFields: any = { updatedAt: new Date() };
    if (updateData.keyword) updateFields.keyword = updateData.keyword;
    if (updateData.providerId) updateFields.providerId = updateData.providerId;
    if (updateData.targetModel) updateFields.targetModel = updateData.targetModel;
    if (updateData.priority !== undefined) updateFields.priority = updateData.priority;
    if (updateData.isEnabled !== undefined) updateFields.isEnabled = updateData.isEnabled;

    // 执行更新
    await db.update(modelMappings).set(updateFields).where(eq(modelMappings.id, id));

    return c.json({
      success: true,
      message: "模型映射规则更新成功",
    });
  } catch (error) {
    console.error("更新模型映射规则失败:", error);
    return c.json(
      {
        success: false,
        message: "更新失败，请重试",
      },
      500,
    );
  }
});

// 删除模型映射规则
const deleteMappingRoute = createRoute({
  method: "delete",
  path: "/mappings/{id}",
  summary: "删除模型映射规则",
  description: "删除指定的模型映射规则",
  security: [{ BearerAuth: [] }],
  request: {
    params: IdParamSchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: StandardResponseSchema,
        },
      },
      description: "删除成功",
    },
    404: {
      content: {
        "application/json": {
          schema: StandardResponseSchema,
        },
      },
      description: "映射规则不存在",
    },
  },
});

config.openapi(deleteMappingRoute as any, async (c) => {
  const user = c.get("user")!;
  const db = c.get("db");
  const id = c.req.param("id");

  try {
    // 检查映射规则是否存在且属于当前用户
    const existingMapping = await db
      .select()
      .from(modelMappings)
      .where(and(eq(modelMappings.id, id), eq(modelMappings.userId, user.id)))
      .get();

    if (!existingMapping) {
      return c.json(
        {
          success: false,
          message: "模型映射规则不存在",
        },
        404,
      );
    }

    // 删除映射规则
    await db.delete(modelMappings).where(eq(modelMappings.id, id));

    return c.json({
      success: true,
      message: "模型映射规则删除成功",
    });
  } catch (error) {
    console.error("删除模型映射规则失败:", error);
    return c.json(
      {
        success: false,
        message: "删除失败，请重试",
      },
      500,
    );
  }
});

// 批量更新映射规则优先级
const batchUpdateMappingsRoute = createRoute({
  method: "patch",
  path: "/mappings/batch-priority",
  summary: "批量更新映射规则优先级",
  description: "批量更新多个映射规则的优先级顺序",
  security: [{ BearerAuth: [] }],
  request: {
    body: {
      content: {
        "application/json": {
          schema: BatchUpdateMappingsSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: StandardResponseSchema,
        },
      },
      description: "更新成功",
    },
  },
});

config.openapi(batchUpdateMappingsRoute as any, async (c) => {
  const user = c.get("user")!;
  const db = c.get("db");
  const { mappings } = await c.req.json();

  try {
    // 批量更新优先级
    for (const mapping of mappings) {
      await db
        .update(modelMappings)
        .set({
          priority: mapping.priority,
          updatedAt: new Date(),
        })
        .where(and(eq(modelMappings.id, mapping.id), eq(modelMappings.userId, user.id)));
    }

    return c.json({
      success: true,
      message: "映射规则优先级更新成功",
    });
  } catch (error) {
    console.error("批量更新映射规则失败:", error);
    return c.json(
      {
        success: false,
        message: "更新失败，请重试",
      },
      500,
    );
  }
});

export default config;
