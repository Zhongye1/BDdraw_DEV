import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import db from '../db'
import { verifyToken } from '../auth'
import { collabServer } from '../collab'

type Variables = {
  user: {
    id: string
    username: string
  }
}

const roomsApp = new OpenAPIHono<{ Variables: Variables }>()

// 中间件：验证 Token
roomsApp.use('/*', async (c, next) => {
  const authHeader = c.req.header('Authorization')
  const token = authHeader?.split(' ')[1]
  const user = token ? await verifyToken(token) : null

  if (!user) return c.json({ error: 'Unauthorized' }, 401)
  c.set('user', user) // 将用户信息存入 Context
  await next()
})

// 定义创建房间路由
const createRoomRoute = createRoute({
  method: 'post',
  path: '/api/rooms',
  summary: '创建房间',
  description: '创建一个新的协作绘图房间',
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.object({
            name: z.string().min(1).openapi({
              example: 'My Drawing Room',
              description: '房间名称',
            }),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: '房间创建成功',
      content: {
        'application/json': {
          schema: z.object({
            roomId: z.string().uuid(),
            name: z.string(),
            creator: z.string().uuid(),
          }),
        },
      },
    },
  },
  security: [{ Bearer: [] }],
})

// 创建房间
roomsApp.openapi(createRoomRoute, async (c) => {
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
})

// 定义获取房间列表路由
const listRoomsRoute = createRoute({
  method: 'get',
  path: '/api/rooms',
  summary: '获取房间列表',
  description: '获取当前用户加入的所有房间列表',
  responses: {
    200: {
      description: '返回房间列表',
      content: {
        'application/json': {
          schema: z.array(
            z.object({
              id: z.string().uuid(),
              name: z.string(),
              created_at: z.string().optional(),
            }),
          ),
        },
      },
    },
  },
  security: [{ Bearer: [] }],
})

// 获取房间列表
roomsApp.openapi(listRoomsRoute, (c) => {
  const user = c.get('user')
  // 获取我加入的房间
  const rooms: { id: string; name: string; created_at?: string }[] = db
    .query(
      `
    SELECT r.id, r.name, r.created_at 
    FROM rooms r
    JOIN room_members rm ON r.id = rm.room_id
    WHERE rm.user_id = $uid
  `,
    )
    .all({ $uid: user.id })
    .map((room: any) => ({
      id: room.id,
      name: room.name,
      ...(room.created_at && { created_at: room.created_at }),
    }))

  return c.json(rooms, 200)
})

// 定义获取房间详情路由
const getRoomRoute = createRoute({
  method: 'get',
  path: '/api/rooms/{id}',
  summary: '获取房间详情',
  description: '获取指定房间的详细信息',
  request: {
    params: z.object({
      id: z
        .string()
        .uuid()
        .openapi({
          param: { name: 'id', in: 'path' },
          example: '123e4567-e89b-12d3-a456-426614174000',
        }),
    }),
  },
  responses: {
    200: {
      description: '返回房间详情',
      content: {
        'application/json': {
          schema: z.object({
            id: z.string().uuid(),
            name: z.string(),
            creator_id: z.string().uuid(),
            created_at: z.string().optional(),
            activeUsers: z.number().int().nonnegative(),
          }),
        },
      },
    },
    404: {
      description: '房间未找到',
      content: {
        'application/json': {
          schema: z.object({
            error: z.string(),
          }),
        },
      },
    },
  },
  security: [{ Bearer: [] }],
})

// 获取单个房间详情
roomsApp.openapi(getRoomRoute, (c) => {
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
})

// 定义邀请用户路由
const inviteUserRoute = createRoute({
  method: 'post',
  path: '/api/rooms/{id}/invite',
  summary: '邀请用户加入房间',
  description: '房间创建者可以邀请其他用户加入房间',
  request: {
    params: z.object({
      id: z
        .string()
        .uuid()
        .openapi({
          param: { name: 'id', in: 'path' },
          example: '123e4567-e89b-12d3-a456-426614174000',
        }),
    }),
    body: {
      content: {
        'application/json': {
          schema: z.object({
            username: z.string().min(1).openapi({
              example: 'jane_doe',
              description: '要邀请的用户名',
            }),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: '用户邀请成功',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            message: z.string(),
          }),
        },
      },
    },
    403: {
      description: '权限不足',
      content: {
        'application/json': {
          schema: z.object({
            error: z.string(),
          }),
        },
      },
    },
    404: {
      description: '房间或用户未找到',
      content: {
        'application/json': {
          schema: z.object({
            error: z.string(),
          }),
        },
      },
    },
    400: {
      description: '用户已在房间中',
      content: {
        'application/json': {
          schema: z.object({
            error: z.string(),
          }),
        },
      },
    },
  },
  security: [{ Bearer: [] }],
})

// 邀请用户加入房间
roomsApp.openapi(inviteUserRoute, async (c) => {
  const roomId = c.req.param('id')
  const { username } = await c.req.json()
  const currentUser = c.get('user')

  // 检查房间是否存在
  const room = db.query('SELECT id FROM rooms WHERE id = $id').get({ $id: roomId })
  if (!room) return c.json({ error: 'Room not found' }, 404)

  // 检查是否是房间创建者
  const isCreator = db.query('SELECT id FROM rooms WHERE id = $id AND creator_id = $creatorId').get({
    $id: roomId,
    $creatorId: currentUser.id,
  })

  if (!isCreator) return c.json({ error: 'Only room creator can invite users' }, 403)

  // 查找要邀请的用户
  const user = db.query('SELECT id FROM users WHERE username = $username').get({ username }) as { id: string } | null
  if (!user) return c.json({ error: 'User not found' }, 404)

  // 添加用户到房间成员
  try {
    db.query('INSERT INTO room_members (room_id, user_id) VALUES ($roomId, $userId)').run({
      $roomId: roomId,
      $userId: user.id,
    })
    return c.json({ success: true, message: 'User invited successfully' }, 200)
  } catch (error) {
    return c.json({ error: 'User already in room' }, 400)
  }
})

// 定义获取房间成员路由
const getRoomMembersRoute = createRoute({
  method: 'get',
  path: '/api/rooms/{id}/members',
  summary: '获取房间成员列表',
  description: '获取指定房间的所有成员列表',
  request: {
    params: z.object({
      id: z
        .string()
        .uuid()
        .openapi({
          param: { name: 'id', in: 'path' },
          example: '123e4567-e89b-12d3-a456-426614174000',
        }),
    }),
  },
  responses: {
    200: {
      description: '返回房间成员列表',
      content: {
        'application/json': {
          schema: z.array(
            z.object({
              id: z.string().uuid(),
              username: z.string(),
            }),
          ),
        },
      },
    },
    404: {
      description: '房间未找到',
      content: {
        'application/json': {
          schema: z.object({
            error: z.string(),
          }),
        },
      },
    },
  },
  security: [{ Bearer: [] }],
})

// 获取房间成员列表
roomsApp.openapi(getRoomMembersRoute, (c) => {
  const roomId = c.req.param('id')

  // 检查房间是否存在
  const room = db.query('SELECT id FROM rooms WHERE id = $id').get({ $id: roomId })
  if (!room) return c.json({ error: 'Room not found' }, 404)

  // 获取房间成员
  const membersResult = db
    .query(
      `
    SELECT u.id, u.username 
    FROM users u
    JOIN room_members rm ON u.id = rm.user_id
    WHERE rm.room_id = $roomId
  `,
    )
    .all({ $roomId: roomId })

  const members: { id: string; username: string }[] = membersResult.map((row: any) => ({
    id: row.id,
    username: row.username,
  }))

  return c.json(members, 200)
})

// 定义删除房间路由
const deleteRoomRoute = createRoute({
  method: 'delete',
  path: '/api/rooms/{id}',
  summary: '删除房间',
  description: '房间创建者可以删除房间',
  request: {
    params: z.object({
      id: z
        .string()
        .uuid()
        .openapi({
          param: { name: 'id', in: 'path' },
          example: '123e4567-e89b-12d3-a456-426614174000',
        }),
    }),
  },
  responses: {
    200: {
      description: '房间删除成功',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            message: z.string(),
          }),
        },
      },
    },
    404: {
      description: '房间未找到或无权限',
      content: {
        'application/json': {
          schema: z.object({
            error: z.string(),
          }),
        },
      },
    },
  },
  security: [{ Bearer: [] }],
})

// 删除房间
roomsApp.openapi(deleteRoomRoute, (c) => {
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
})

export default roomsApp
