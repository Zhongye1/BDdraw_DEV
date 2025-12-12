import { createRoute } from '@hono/zod-openapi'
import db from '../../db'
import {
  ListRoomsResponseSchema,
  BrowseRoomsQuerySchema,
  BrowseRoomsResponseSchema,
  SearchRoomsQuerySchema,
  SearchRoomsResponseSchema,
} from './types/Room_List_types'

// 定义获取房间列表路由
export const listRoomsRoute = createRoute({
  method: 'get',
  path: '/rooms',
  summary: '获取房间列表',
  description: '获取当前用户加入的所有房间列表',
  responses: {
    200: {
      description: '返回房间列表',
      content: {
        'application/json': {
          schema: ListRoomsResponseSchema,
        },
      },
    },
  },
  security: [{ Bearer: [] }],
})

// 获取房间列表处理器
export const listRoomsHandler = (c: any) => {
  const user = c.get('user')
  console.log('[DEBUG][GET /rooms] listRoomsHandler - Received request')
  console.log('[DEBUG][GET /rooms] listRoomsHandler - User:', user)

  try {
    console.log('[DEBUG][GET /rooms] listRoomsHandler - Executing query with user ID:', user.id)
    // 获取我加入的房间
    const rooms: {
      id: string
      name: string
      creator_id: string
      creator_name: string
      created_at?: string
      member_count: number
    }[] = db
      .query(
        `
      SELECT r.id, r.name, r.creator_id, u.username as creator_name, r.created_at, 
             (SELECT COUNT(*) FROM room_members rm WHERE rm.room_id = r.id) as member_count
      FROM rooms r
      JOIN room_members rm ON r.id = rm.room_id
      JOIN users u ON r.creator_id = u.id
      WHERE rm.user_id = $uid
    `,
      )
      .all({ $uid: user.id })
      .map((room: any) => {
        console.log('[DEBUG][GET /rooms] Processing room:', room)
        console.log('[DEBUG][GET /rooms] Room ID type:', typeof room.id)
        console.log('[DEBUG][GET /rooms] Room ID value:', room.id)

        return {
          id: String(room.id).trim(),
          name: String(room.name).trim(),
          creator_id: String(room.creator_id).trim(),
          creator_name: String(room.creator_name).trim(),
          ...(room.created_at && { created_at: new Date(room.created_at).toISOString() }),
          member_count: Number(room.member_count),
        }
      })

    console.log('[DEBUG][GET /rooms] listRoomsHandler - Query result:', rooms)
    return c.json(rooms, 200)
  } catch (error) {
    console.error('[ERROR][GET /rooms] listRoomsHandler - Error processing request:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
}

// 定义浏览房间列表路由
export const browseRoomsRoute = createRoute({
  method: 'get',
  path: '/rooms/browse',
  summary: '浏览所有房间',
  description: '获取所有公开房间的列表，支持分页',
  request: {
    query: BrowseRoomsQuerySchema,
  },
  responses: {
    200: {
      description: '返回房间列表',
      content: {
        'application/json': {
          schema: BrowseRoomsResponseSchema,
        },
      },
    },
  },
  security: [{ Bearer: [] }],
})

// 浏览所有房间处理器
export const browseRoomsHandler = (c: any) => {
  console.log('[DEBUG][GET /rooms/browse] browseRoomsHandler - Start processing request')
  const user = c.get('user')
  const page = parseInt(c.req.query('page') || '1')
  const limit = parseInt(c.req.query('limit') || '10')
  const offset = (page - 1) * limit

  console.log('[DEBUG][GET /rooms/browse] browseRoomsHandler - User:', user)
  console.log('[DEBUG][GET /rooms/browse] browseRoomsHandler - Page:', page, 'Limit:', limit, 'Offset:', offset)

  try {
    // 查询房间总数
    console.log('[DEBUG][GET /rooms/browse] browseRoomsHandler - Executing total rooms query')
    const totalResult = db.query('SELECT COUNT(*) as total FROM rooms').get() as { total: number }
    console.log('[DEBUG][GET /rooms/browse] browseRoomsHandler - Total rooms:', totalResult.total)

    // 查询房间列表
    console.log(
      '[DEBUG][GET /rooms/browse] browseRoomsHandler - Executing rooms query with limit:',
      limit,
      'offset:',
      offset,
    )
    const roomsQuery = db.query(`
      SELECT 
        r.id, 
        r.name, 
        r.creator_id,
        u.username as creator_name,
        r.created_at,
        (SELECT COUNT(*) FROM room_members rm WHERE rm.room_id = r.id) as member_count
      FROM rooms r
      JOIN users u ON r.creator_id = u.id
      ORDER BY r.created_at DESC
      LIMIT $limit OFFSET $offset
    `)

    const roomsResult = roomsQuery.all({ $limit: limit, $offset: offset })
    console.log('[DEBUG][GET /rooms/browse] browseRoomsHandler - Raw rooms query result:', roomsResult)

    const rooms = roomsResult.map((room: any) => {
      console.log('[DEBUG][GET /rooms/browse] Processing room:', room)
      console.log('[DEBUG][GET /rooms/browse] Room ID type:', typeof room.id)
      console.log('[DEBUG][GET /rooms/browse] Room ID value:', room.id)
      console.log('[DEBUG][GET /rooms/browse] Creator ID type:', typeof room.creator_id)
      console.log('[DEBUG][GET /rooms/browse] Creator ID value:', room.creator_id)
      console.log('[DEBUG][GET /rooms/browse] Creator name type:', typeof room.creator_name)
      console.log('[DEBUG][GET /rooms/browse] Creator name value:', room.creator_name)

      return {
        id: String(room.id).trim(),
        name: String(room.name).trim(),
        creator_id: String(room.creator_id).trim(),
        creator_name: String(room.creator_name).trim(),
        ...(room.created_at && { created_at: new Date(room.created_at).toISOString() }),
        member_count: Number(room.member_count),
      }
    })

    console.log('[DEBUG][GET /rooms/browse] browseRoomsHandler - Mapped rooms:', rooms)

    const response = {
      rooms: rooms,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: Number(totalResult.total),
      },
    }

    console.log('[DEBUG][GET /rooms/browse] browseRoomsHandler - Final response:', response)
    return c.json(response, 200)
  } catch (error) {
    console.error('[ERROR][GET /rooms/browse] browseRoomsHandler - Error processing request:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
}

// 定义搜索房间路由
export const searchRoomsRoute = createRoute({
  method: 'get',
  path: '/rooms/search',
  summary: '搜索房间',
  description: '根据关键词搜索房间',
  request: {
    query: SearchRoomsQuerySchema,
  },
  responses: {
    200: {
      description: '返回匹配的房间列表',
      content: {
        'application/json': {
          schema: SearchRoomsResponseSchema,
        },
      },
    },
  },
  security: [{ Bearer: [] }],
})

// 搜索房间处理器
export const searchRoomsHandler = (c: any) => {
  console.log('[DEBUG][GET /rooms/search] searchRoomsHandler - Start processing request')
  const user = c.get('user')
  const keyword = c.req.query('q') || ''
  const page = parseInt(c.req.query('page') || '1')
  const limit = parseInt(c.req.query('limit') || '10')
  const offset = (page - 1) * limit

  console.log('[DEBUG][GET /rooms/search] searchRoomsHandler - User:', user)
  console.log(
    '[DEBUG][GET /rooms/search] searchRoomsHandler - Keyword:',
    keyword,
    'Page:',
    page,
    'Limit:',
    limit,
    'Offset:',
    offset,
  )

  if (!keyword) {
    console.log('[DEBUG][GET /rooms/search] searchRoomsHandler - Empty keyword, returning empty result')
    // 当关键字为空时，返回空的结果集而不是错误消息
    return c.json(
      {
        rooms: [],
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: 0,
        },
      },
      200,
    )
  }

  try {
    // 查询匹配的房间总数
    console.log(
      '[DEBUG][GET /rooms/search] searchRoomsHandler - Executing total matching rooms query with keyword:',
      keyword,
    )
    const totalResult = db
      .query(
        `
      SELECT COUNT(*) as total 
      FROM rooms r 
      WHERE r.name LIKE $keyword
    `,
      )
      .get({ $keyword: `%${keyword}%` }) as { total: number }

    console.log('[DEBUG][GET /rooms/search] searchRoomsHandler - Total matching rooms:', totalResult.total)

    // 查询匹配的房间列表
    console.log(
      '[DEBUG][GET /rooms/search] searchRoomsHandler - Executing matching rooms query with keyword:',
      keyword,
      'limit:',
      limit,
      'offset:',
      offset,
    )
    const roomsQuery = db.query(`
      SELECT 
        r.id, 
        r.name, 
        r.creator_id,
        u.username as creator_name,
        r.created_at,
        (SELECT COUNT(*) FROM room_members rm WHERE rm.room_id = r.id) as member_count
      FROM rooms r
      JOIN users u ON r.creator_id = u.id
      WHERE r.name LIKE $keyword
      ORDER BY r.created_at DESC
      LIMIT $limit OFFSET $offset
    `)

    const roomsResult = roomsQuery.all({
      $keyword: `%${keyword}%`,
      $limit: limit,
      $offset: offset,
    })

    console.log('[DEBUG][GET /rooms/search] searchRoomsHandler - Raw matching rooms query result:', roomsResult)

    const rooms = roomsResult.map((room: any) => {
      console.log('[DEBUG][GET /rooms/search] Processing room:', room)
      console.log('[DEBUG][GET /rooms/search] Room ID type:', typeof room.id)
      console.log('[DEBUG][GET /rooms/search] Room ID value:', room.id)
      console.log('[DEBUG][GET /rooms/search] Creator ID type:', typeof room.creator_id)
      console.log('[DEBUG][GET /rooms/search] Creator ID value:', room.creator_id)
      console.log('[DEBUG][GET /rooms/search] Creator name type:', typeof room.creator_name)
      console.log('[DEBUG][GET /rooms/search] Creator name value:', room.creator_name)

      return {
        id: String(room.id).trim(),
        name: String(room.name).trim(),
        creator_id: String(room.creator_id).trim(),
        creator_name: String(room.creator_name).trim(),
        ...(room.created_at && { created_at: new Date(room.created_at).toISOString() }),
        member_count: Number(room.member_count),
      }
    })

    const response = {
      rooms: rooms,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: Number(totalResult.total),
      },
    }

    console.log('[DEBUG][GET /rooms/search] searchRoomsHandler - Response:', response)
    return c.json(response, 200)
  } catch (error) {
    console.error('[ERROR][GET /rooms/search] searchRoomsHandler - Error processing request:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
}
