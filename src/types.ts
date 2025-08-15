/// <reference types="@cloudflare/workers-types" />

export type Bindings = {
  DB: D1Database;
  ASSETS: Fetcher;
  NODE_ENV: "development" | "production" | "test";
  VITE_PORT: string;
  // GitHub OAuth 配置
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  // 加密密钥
  ENCRYPTION_KEY: string;
  // 应用基础 URL
  APP_BASE_URL: string;
};
