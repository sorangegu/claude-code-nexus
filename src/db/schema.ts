import { sqliteTable, text, integer, unique, index } from "drizzle-orm/sqlite-core";
import { createId } from "@paralleldrive/cuid2";

// 保留原有的 features 表
export const features = sqliteTable(
  "features",
  {
    id: integer("id").primaryKey(),
    key: text("key").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull(),
    enabled: integer("enabled", { mode: "boolean" }).notNull().default(false),
  },
  (table) => [unique("features_key_idx").on(table.key)],
);

// AI 代理服务相关表结构

// 用户表
export const users = sqliteTable(
  "users",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    githubId: text("github_id").notNull().unique(),
    username: text("username").notNull(),
    email: text("email"),
    avatarUrl: text("avatar_url"),
    apiKey: text("api_key").notNull().unique(), // 用户专属的 ANTHROPIC_API_KEY
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [index("users_github_id_idx").on(table.githubId), index("users_api_key_idx").on(table.apiKey)],
);

// 用户会话表
export const userSessions = sqliteTable(
  "user_sessions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    sessionToken: text("session_token").notNull().unique(),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    index("user_sessions_session_token_idx").on(table.sessionToken),
    index("user_sessions_user_id_idx").on(table.userId),
  ],
);

// API 提供商配置表
export const apiProviders = sqliteTable(
  "api_providers",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(), // 例如: "我的 OneAPI 服务", "Azure GPT-4o"
    baseUrl: text("base_url").notNull(), // 例如: "https://api.oneapi.com", "https://my-resource.openai.azure.com"
    apiKey: text("api_key").notNull(), // 加密存储的 API Key
    isDefault: integer("is_default", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [index("api_providers_user_id_idx").on(table.userId)],
);

// 模型映射规则表
export const modelMappings = sqliteTable(
  "model_mappings",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    keyword: text("keyword").notNull(), // 匹配关键词，例如: "haiku", "sonnet"
    providerId: text("provider_id")
      .notNull()
      .references(() => apiProviders.id, { onDelete: "cascade" }),
    targetModel: text("target_model").notNull(), // 目标模型名称，例如: "gpt-4o-mini", "gpt-4o"
    priority: integer("priority").notNull().default(0), // 优先级，数字越小优先级越高
    isEnabled: integer("is_enabled", { mode: "boolean" }).notNull().default(true),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    index("model_mappings_user_id_idx").on(table.userId),
    index("model_mappings_priority_idx").on(table.userId, table.priority),
  ],
);
