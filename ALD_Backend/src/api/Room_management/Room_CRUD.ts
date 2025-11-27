import { createRoute } from '@hono/zod-openapi'
import db from '../../db'
import { collabServer } from '../../collab'
import {
  CreateRoomRequestSchema,
  CreateRoomResponseSchema,
  RoomParamSchema,
  GetRoomResponseSchema,
  DeleteRoomResponseSchema,
  DeleteRoomErrorResponseSchema,
  UpdateRoomRequestSchema,
  UpdateRoomResponseSchema,
  PermissionErrorResponseSchema,
  RoomNotFoundResponseSchema,
} from './types/Room_CRUD_types'

// 定义创建房间路由
export const createRoomRoute = createRoute({
  method: 'post',
  path: '/api/rooms',
  summary: '创建房间',
  description: '创建一个新的协作绘图房间',
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateRoomRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: '房间创建成功',
      content: {
        'application/json': {
          schema: CreateRoomResponseSchema,
        },
      },
    },
  },
  security: [{ Bearer: [] }],
})

// 创建房间处理器
export const createRoomHandler = async (c: any) => {
  const user = c.get('user')
  const { name } = await c.req.json()
  const roomId = crypto.randomUUID()

  // 插入房间记录
  db.query('INSERT INTO rooms (id, name, creator_id) VALUES ($id, $name, $creator)').run({
    $id: roomId,
    $name: name,
    $creator: user.id,
  })

  // 自动将创建者加入成员列表
  db.query('INSERT INTO room_members (room_id, user_id) VALUES ($rid, $uid)').run({ $rid: roomId, $uid: user.id })

  return c.json({ roomId, name, creator: user.id }, 200)
}

// 定义获取房间详情路由
export const getRoomRoute = createRoute({
  method: 'get',
  path: '/api/rooms/{id}',
  summary: '获取房间详情',
  description: '获取指定房间的详细信息',
  request: {
    params: RoomParamSchema,
  },
  responses: {
    200: {
      description: '返回房间详情',
      content: {
        'application/json': {
          schema: GetRoomResponseSchema,
        },
      },
    },
    404: {
      description: '房间未找到',
      content: {
        'application/json': {
          schema: RoomNotFoundResponseSchema,
        },
      },
    },
  },
  security: [{ Bearer: [] }],
})

// 获取单个房间详情处理器
export const getRoomHandler = (c: any) => {
  const roomId = c.req.param('id')
  const room: any = db.query('SELECT id, name, creator_id, created_at FROM rooms WHERE id = $id').get({ $id: roomId })

  if (!room) return c.json({ error: 'Room not found' }, 404)

  // 获取在线连接数（从 WebSocket 服务获取）
  const document = collabServer.documents.get(roomId)
  const connections = document ? document.getConnectionsCount() : 0

  return c.json(
    {
      id: room.id,
      name: room.name,
      creator_id: room.creator_id,
      ...(room.created_at && { created_at: room.created_at }),
      activeUsers: connections,
    },
    200,
  )
}

// 定义删除房间路由
export const deleteRoomRoute = createRoute({
  method: 'delete',
  path: '/api/rooms/{id}',
  summary: '删除房间',
  description: '房间创建者可以删除房间',
  request: {
    params: RoomParamSchema,
  },
  responses: {
    200: {
      description: '房间删除成功',
      content: {
        'application/json': {
          schema: DeleteRoomResponseSchema,
        },
      },
    },
    404: {
      description: '房间未找到或无权限',
      content: {
        'application/json': {
          schema: DeleteRoomErrorResponseSchema,
        },
      },
    },
  },
  security: [{ Bearer: [] }],
})

// 删除房间处理器
export const deleteRoomHandler = (c: any) => {
  const roomId = c.req.param('id')
  const currentUser = c.get('user')

  // 检查房间是否存在且由当前用户创建
  const room = db.query('SELECT id FROM rooms WHERE id = $id AND creator_id = $creatorId').get({
    $id: roomId,
    $creatorId: currentUser.id,
  })

  if (!room) return c.json({ error: 'Room not found or you do not have permission to delete it' }, 404)

  // 删除房间相关数据
  db.query('DELETE FROM room_members WHERE room_id = $roomId').run({ $roomId: roomId })
  db.query('DELETE FROM rooms WHERE id = $roomId').run({ $roomId: roomId })

  return c.json({ success: true, message: 'Room deleted successfully' }, 200)
}

// 定义修改房间信息路由
export const updateRoomRoute = createRoute({
  method: 'put',
  path: '/api/rooms/{id}',
  summary: '修改房间信息',
  description: '房间创建者可以修改房间信息',
  request: {
    params: RoomParamSchema,
    body: {
      content: {
        'application/json': {
          schema: UpdateRoomRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: '房间信息更新成功',
      content: {
        'application/json': {
          schema: UpdateRoomResponseSchema,
        },
      },
    },
    403: {
      description: '权限不足',
      content: {
        'application/json': {
          schema: PermissionErrorResponseSchema,
        },
      },
    },
    404: {
      description: '房间未找到',
      content: {
        'application/json': {
          schema: RoomNotFoundResponseSchema,
        },
      },
    },
  },
  security: [{ Bearer: [] }],
})

// 修改房间信息处理器
export const updateRoomHandler = async (c: any) => {
  const roomId = c.req.param('id')
  const { name } = await c.req.json()
  const currentUser = c.get('user')

  // 检查房间是否存在
  const room: any = db.query('SELECT id, creator_id FROM rooms WHERE id = $id').get({ $id: roomId })
  if (!room) return c.json({ error: 'Room not found' }, 404)

  // 检查是否是房间创建者
  if (room.creator_id !== currentUser.id) return c.json({ error: 'Only room creator can update room info' }, 403)

  // 更新房间信息
  db.query('UPDATE rooms SET name = $name WHERE id = $id').run({
    $name: name,
    $id: roomId,
  })

  // 获取更新后的房间信息
  const updatedRoom: any = db
    .query('SELECT id, name, creator_id, created_at FROM rooms WHERE id = $id')
    .get({ $id: roomId })

  return c.json(
    {
      id: updatedRoom.id,
      name: updatedRoom.name,
      creator_id: updatedRoom.creator_id,
      ...(updatedRoom.created_at && { created_at: updatedRoom.created_at }),
    },
    200,
  )
}
