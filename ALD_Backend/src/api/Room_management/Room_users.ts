import { createRoute, z } from '@hono/zod-openapi'
import db from '../../db'

// 定义邀请用户路由
export const inviteUserRoute = createRoute({
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

// 邀请用户加入房间处理器
export const inviteUserHandler = async (c: any) => {
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
}

// 定义获取房间成员路由
export const getRoomMembersRoute = createRoute({
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

// 获取房间成员列表处理器
export const getRoomMembersHandler = (c: any) => {
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
}
