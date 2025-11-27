import { z } from '@hono/zod-openapi'

// ==============================
// 请求和响应类型定义 - Room CRUD
// ==============================

// 创建房间请求体
export const CreateRoomRequestSchema = z.object({
  name: z.string().min(1).openapi({
    example: 'My Drawing Room',
    description: '房间名称',
  }),
})

// 创建房间响应体
export const CreateRoomResponseSchema = z.object({
  roomId: z.string().uuid(),
  name: z.string(),
  creator: z.string().uuid(),
})

// 房间参数（用于获取、更新、删除）
export const RoomParamSchema = z.object({
  id: z
    .string()
    .uuid()
    .openapi({
      param: { name: 'id', in: 'path' },
      example: '123e4567-e89b-12d3-a456-426614174000',
    }),
})

// 获取房间响应体
export const GetRoomResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  creator_id: z.string().uuid(),
  created_at: z.string().optional(),
  activeUsers: z.number().int().nonnegative(),
})

// 删除房间响应体
export const DeleteRoomResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
})

// 删除房间错误响应体
export const DeleteRoomErrorResponseSchema = z.object({
  error: z.string(),
})

// 更新房间请求体
export const UpdateRoomRequestSchema = z.object({
  name: z.string().min(1).openapi({
    example: 'Updated Room Name',
    description: '新的房间名称',
  }),
})

// 更新房间响应体
export const UpdateRoomResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  creator_id: z.string().uuid(),
  created_at: z.string().optional(),
})

// 权限不足错误响应体
export const PermissionErrorResponseSchema = z.object({
  error: z.string(),
})

// 房间未找到错误响应体
export const RoomNotFoundResponseSchema = z.object({
  error: z.string(),
})
