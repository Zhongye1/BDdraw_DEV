import { z } from '@hono/zod-openapi'

// ==============================
// 请求和响应类型定义 - Room List
// ==============================

// 房间基本信息
export const RoomInfoSchema = z.object({
  id: z.string(),
  name: z.string(),
  creator_id: z.string(),
  creator_name: z.string(),
  created_at: z.string().optional(),
  member_count: z.number().int().nonnegative(),
})

// 获取房间列表响应体
export const ListRoomsResponseSchema = z.array(RoomInfoSchema)

// 浏览房间查询参数
export const BrowseRoomsQuerySchema = z.object({
  page: z.string().optional().default('1').openapi({
    description: '页码',
    example: '1',
  }),
  limit: z.string().optional().default('10').openapi({
    description: '每页数量',
    example: '10',
  }),
})

// 浏览房间响应体
export const BrowseRoomsResponseSchema = z.object({
  rooms: z.array(
    RoomInfoSchema.extend({
      id: z.string().uuid(),
      creator_id: z.string().uuid(),
    }),
  ),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
  }),
})

// 搜索房间查询参数
export const SearchRoomsQuerySchema = z.object({
  q: z.string().openapi({
    description: '搜索关键词',
    example: 'design',
  }),
  page: z.string().optional().default('1').openapi({
    description: '页码',
    example: '1',
  }),
  limit: z.string().optional().default('10').openapi({
    description: '每页数量',
    example: '10',
  }),
})

// 搜索房间响应体（与浏览房间响应体相同）
export const SearchRoomsResponseSchema = z.object({
  rooms: z.array(RoomInfoSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
  }),
})
