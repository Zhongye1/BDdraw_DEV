import { OpenAPIHono } from '@hono/zod-openapi'
import { verifyToken } from '../../auth'
// 导入房间基本操作模块
import {
  createRoomRoute,
  createRoomHandler,
  getRoomRoute,
  getRoomHandler,
  deleteRoomRoute,
  deleteRoomHandler,
  updateRoomRoute,
  updateRoomHandler,
} from './Room_CRUD'

// 导入房间列表相关模块
import {
  listRoomsRoute,
  listRoomsHandler,
  browseRoomsRoute,
  browseRoomsHandler,
  searchRoomsRoute,
  searchRoomsHandler,
} from './Room_List'

// 导入成员管理模块
import { inviteUserRoute, inviteUserHandler, getRoomMembersRoute, getRoomMembersHandler } from './Room_users'

type Variables = {
  user: {
    id: string
    username: string
  }
}

const roomsApp = new OpenAPIHono<{ Variables: Variables }>()

// 错误处理中间件
roomsApp.onError((err, c) => {
  console.error('[ERROR] Application error:', err)
  console.error('[ERROR] Error details:', {
    name: err.name,
    message: err.message,
    stack: err.stack,
  })

  // 如果是Zod错误，输出更多详细信息
  if (err.name === 'ZodError') {
    console.error('[ERROR] Zod validation error details:', err)
  }

  return c.json(
    {
      success: false,
      error: {
        name: err.name,
        message: err.message,
        ...(err.name === 'ZodError' ? { details: err } : {}),
      },
    },
    500,
  )
})

// 中间件：验证 Token
roomsApp.use('/*', async (c, next) => {
  console.log('[DEBUG] Auth middleware - Start processing request')
  const authHeader = c.req.header('Authorization')
  console.log('[DEBUG] Auth middleware - Auth header:', authHeader)

  const token = authHeader?.split(' ')[1]
  console.log('[DEBUG] Auth middleware - Extracted token:', token)

  const user = token ? await verifyToken(token) : null
  console.log('[DEBUG] Auth middleware - Verified user:', user)

  // 添加更多关于用户ID的调试信息
  if (user) {
    console.log('[DEBUG] Auth middleware - User ID type:', typeof user.id)
    console.log('[DEBUG] Auth middleware - User ID value:', user.id)
    console.log('[DEBUG] Auth middleware - User ID length:', user.id.length)
    console.log(
      '[DEBUG] Auth middleware - Is User ID a valid UUID format:',
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(user.id),
    )
  }

  if (!user) {
    console.log('[DEBUG] Auth middleware - User not authenticated, returning 401')
    return c.json({ error: 'Unauthorized' }, 401)
  }

  c.set('user', user) // 将用户信息存入 Context
  console.log('[DEBUG] Auth middleware - User authenticated, proceeding to next middleware')
  await next()
})

// ==========================================
// 路由
// ==========================================

// 1. 先注册具体的静态路径 (Specific Paths)
// 这样 /api/rooms/browse 和 /api/rooms/search 才会被正确匹配
roomsApp.openapi(listRoomsRoute, listRoomsHandler) // /api/rooms
roomsApp.openapi(browseRoomsRoute, browseRoomsHandler) // /api/rooms/browse
roomsApp.openapi(searchRoomsRoute, searchRoomsHandler) // /api/rooms/search

// 2. 然后注册带参数的动态路径 (Dynamic Paths)
// 这样只有不是 browse/search 的请求才会落到 /api/rooms/{id}
roomsApp.openapi(createRoomRoute, createRoomHandler) // POST /api/rooms (通常 post 不会冲突，但保持逻辑清晰)
roomsApp.openapi(getRoomRoute, getRoomHandler) // GET /api/rooms/{id}
roomsApp.openapi(deleteRoomRoute, deleteRoomHandler) // DELETE /api/rooms/{id}
roomsApp.openapi(updateRoomRoute, updateRoomHandler) // PUT/PATCH /api/rooms/{id}

// 3. 成员管理路由 (视具体路径而定，如果也是 /api/rooms/{id}/... 则无所谓顺序，只要在 getRoom 之后即可，或者单独处理)
roomsApp.openapi(inviteUserRoute, inviteUserHandler)
roomsApp.openapi(getRoomMembersRoute, getRoomMembersHandler)

export default roomsApp
