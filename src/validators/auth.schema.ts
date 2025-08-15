import { z } from "zod";

// GitHub OAuth 相关 Schema
export const GitHubCallbackSchema = z.object({
  code: z.string().min(1, "授权码不能为空"),
  state: z.string().optional(),
});

export const GitHubUserSchema = z.object({
  id: z.number(),
  login: z.string(),
  email: z.string().email().nullable(),
  avatar_url: z.string().url(),
  name: z.string().nullable(),
});

// 认证相关响应 Schema
export const AuthResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z
    .object({
      user: z.object({
        id: z.string(),
        username: z.string(),
        email: z.string().nullable(),
        avatarUrl: z.string().nullable(),
        apiKey: z.string(),
      }),
      sessionToken: z.string(),
    })
    .optional(),
});

// 用户信息 Schema
export const UserInfoSchema = z.object({
  id: z.string(),
  username: z.string(),
  email: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  apiKey: z.string(),
  createdAt: z.string(),
});

// 错误响应 Schema
export const ErrorSchema = z.object({
  code: z.number(),
  message: z.string(),
});
