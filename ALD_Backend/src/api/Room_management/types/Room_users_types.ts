import { z } from '@hono/zod-openapi'

// ==============================
// 请求和响应类型定义 - Room Users
// ==============================

// 邀请用户请求体
export const InviteUserRequestSchema = z.object({
  username: z.string().min(1).openapi({
    example: 'jane_doe',
    description: '要邀请的用户名',
  }),
})

// 邀请用户响应体
export const InviteUserResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
})

// 邀请用户错误响应体
export const InviteUserErrorResponseSchema = z.object({
  error: z.string(),
})

// 获取房间成员参数
export const RoomMembersParamSchema = z.object({
  id: z
    .string()
    .uuid()
    .openapi({
      param: { name: 'id', in: 'path' },
      example: '123e4567-e89b-12d3-a456-426614174000',
    }),
})

// 房间成员信息
export const RoomMemberSchema = z.object({
  id: z.string().uuid(),
  username: z.string(),
})

// 获取房间成员响应体
export const GetRoomMembersResponseSchema = z.array(RoomMemberSchema)

// 房间未找到错误响应体
export const RoomNotFoundErrorResponseSchema = z.object({
  error: z.string(),
})
