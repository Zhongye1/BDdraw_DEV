import { z } from '@hono/zod-openapi'

// ==============================
// 请求和响应类型定义 - Auth API
// ==============================

// 注册请求体
export const RegisterRequestSchema = z.object({
  username: z.string().min(1).openapi({
    example: 'john_doe',
    description: '用户名',
  }),
  password: z.string().min(6).openapi({
    example: 'securepassword',
    description: '密码（至少6位）',
  }),
})

// 用户信息
export const UserSchema = z
  .object({
    id: z.string().uuid(),
    username: z.string(),
  })
  .openapi({ description: '用户信息' })

// 注册响应体
export const RegisterResponseSchema = z.object({
  token: z.string().openapi({ description: 'JWT 访问令牌' }),
  user: UserSchema,
})

// 注册错误响应体（用户名已存在）
export const RegisterErrorResponseSchema = z.object({
  error: z.string(),
})

// 登录请求体
export const LoginRequestSchema = z.object({
  username: z.string().min(1).openapi({
    example: 'john_doe',
    description: '用户名',
  }),
  password: z.string().min(1).openapi({
    example: 'securepassword',
    description: '密码',
  }),
})

// 登录响应体
export const LoginResponseSchema = z.object({
  token: z.string().openapi({ description: 'JWT 访问令牌' }),
  user: UserSchema,
})

// 登录错误响应体（无效凭证）
export const LoginErrorResponseSchema = z.object({
  error: z.string(),
})

// Token验证响应体（与登录响应体相同）
export const ValidateTokenResponseSchema = LoginResponseSchema

// Token验证错误响应体（与登录错误响应体相同）
export const ValidateTokenErrorResponseSchema = LoginErrorResponseSchema
