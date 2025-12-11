// --- START OF FILE collab.ts ---
import { Hocuspocus } from '@hocuspocus/server'
import { Database as HocuspocusDB } from '@hocuspocus/extension-database'
import db from './db'
import { verifyToken } from './auth'
import * as Y from 'yjs'

console.log('[Collab] Module loaded')

// 辅助函数：从请求路径或文档名中提取纯 UUID
// 例如: "collaboration/123-abc" -> "123-abc"
function getRoomId(documentName: string): string {
  console.log(`[getRoomId] Input documentName: ${documentName}`)

  // 如果documentName已经是UUID格式，直接返回
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (uuidRegex.test(documentName)) {
    console.log(`[getRoomId] documentName is already a UUID: ${documentName}`)
    return documentName
  }

  // 如果是路径格式，提取最后一部分
  const parts = documentName.split('/')
  const roomId = parts[parts.length - 1] || documentName

  console.log(`[getRoomId] Extracted roomId: ${roomId}`)
  return roomId
}

// 1. 数据库扩展
const dbExtension = new HocuspocusDB({
  fetch: async ({ documentName }) => {
    const roomId = getRoomId(documentName)
    console.log(`[Yjs] Fetching data for RoomID: ${roomId}, Original documentName: ${documentName}`)

    const query = db.query('SELECT content FROM rooms WHERE id = $id')
    const row = query.get({ $id: roomId }) as { content: Uint8Array | null } | null

    console.log(`[Yjs] Raw fetch result for RoomID ${roomId}:`, row)

    // 检查数据是否存在且有效
    if (row && row.content !== null && row.content !== undefined) {
      // 检查数据是否为空或无效
      if (row.content.length > 0) {
        console.log(`[Yjs] Returning data with size: ${row.content.length} bytes`)
        // 确保返回的是一个干净的 Uint8Array 副本
        return new Uint8Array(row.content)
      } else {
        console.log(`[Yjs] content is empty, creating new Yjs document`)
        // 创建一个新的空Yjs文档并返回其二进制表示
        const ydoc = new Y.Doc()
        // 初始化共享数据类型，确保与前端一致
        ydoc.getMap('elements') // 存储图形元素
        //ydoc.getArray('history'); // 存储历史记录（如果需要）
        return Y.encodeStateAsUpdate(ydoc)
      }
    }

    console.log(`[Yjs] No valid data found, creating new Yjs document`)
    // 创建一个新的空Yjs文档并返回其二进制表示
    const ydoc = new Y.Doc()
    // 初始化共享数据类型，确保与前端一致
    ydoc.getMap('elements') // 存储图形元素
    //ydoc.getArray('history'); // 存储历史记录（如果需要）
    return Y.encodeStateAsUpdate(ydoc)
  },

  store: async ({ documentName, state }) => {
    const roomId = getRoomId(documentName)
    try {
      console.log(
        `[Yjs] Saving data for RoomID: ${roomId}, State size: ${state.length} bytes, Original documentName: ${documentName}`,
      )

      // 确保只在有实际数据时才保存
      if (state.length > 0) {
        // 在更新前先检查房间是否存在
        const roomCheck = db.query('SELECT id FROM rooms WHERE id = $id')
        const roomExists = roomCheck.get({ $id: roomId })

        if (!roomExists) {
          console.error(`[Yjs] Room ${roomId} does not exist, cannot save data`)
          return
        }

        const update = db.query('UPDATE rooms SET content = $blob WHERE id = $id')
        update.run({ $blob: state, $id: roomId })
        console.log(`[Yjs] Data saved successfully for RoomID: ${roomId}`)
      } else {
        console.log(`[Yjs] Skipping save for RoomID: ${roomId} as state is empty`)
      }
    } catch (error) {
      console.error(`[Yjs] Save failed for ${roomId}:`, error)
    }
  },
})

console.log('[Collab] DB Extension initialized')

// 2. 服务器实例
export const collServer = new Hocuspocus({
  // 端口配置不在这里设置，由 index.ts 的 http server 统一接管
  extensions: [dbExtension],

  // 添加一个名称，确保所有连接使用相同的文档实例
  name: 'collab-server',

  async onAuthenticate(data) {
    console.log('[Auth] Authentication started')
    const { token, documentName } = data
    const roomId = getRoomId(documentName)

    console.log(`[Auth] Authenticating for room: ${roomId}, document: ${documentName}`)

    // 1. 基础 Token 检查
    if (!token) {
      console.warn(`[Auth] Missing token for room ${roomId}`)
      throw new Error('Unauthorized')
    }

    console.log('[Auth] Verifying token...')
    const user = await verifyToken(token)
    console.log(`[Auth] Token verification result for room ${roomId}:`, user ? 'Valid' : 'Invalid')

    if (!user) {
      console.warn(`[Auth] Invalid token for room ${roomId}`)
      throw new Error('Unauthorized')
    }

    // 2. 数据库权限检查
    // 逻辑：用户必须是 (Creator) 或者 (在 room_members 表中)
    console.log(`[Auth] Checking database access for user ${user.username} (ID: ${user.id}) in room ${roomId}`)
    const accessQuery = db.query(`
      SELECT 1 FROM rooms 
      WHERE id = $roomId 
      AND (
        creator_id = $userId 
        OR EXISTS (SELECT 1 FROM room_members WHERE room_id = $roomId AND user_id = $userId)
      )
    `)

    const hasAccess = accessQuery.get({
      $roomId: roomId,
      $userId: user.id,
    })

    console.log(
      `[Auth] Access check result for user ${user.username} (ID: ${user.id}) in room ${roomId}:`,
      hasAccess ? 'Allowed' : 'Denied',
    )

    // 如果用户没有访问权限，则自动将用户添加到房间中，之后会跟进这个逻辑
    if (!hasAccess) {
      console.log(
        `[Auth] User ${user.username} (ID: ${user.id}) does not have access to room ${roomId}. Adding user to room members.`,
      )

      try {
        // 检查房间是否存在
        const roomExistsQuery = db.query('SELECT 1 FROM rooms WHERE id = $roomId')
        const roomExists = roomExistsQuery.get({ $roomId: roomId })

        if (!roomExists) {
          console.error(`[Auth] Room ${roomId} does not exist`)
          throw new Error('Room not found')
        }

        // 将用户添加到房间成员中
        const insertMemberQuery = db.query('INSERT INTO room_members (room_id, user_id) VALUES ($roomId, $userId)')
        insertMemberQuery.run({
          $roomId: roomId,
          $userId: user.id,
        })

        console.log(`[Auth] Successfully added user ${user.username} (ID: ${user.id}) to room ${roomId}`)
      } catch (error) {
        console.error(`[Auth] Failed to add user ${user.username} (ID: ${user.id}) to room ${roomId}:`, error)
        throw new Error('Failed to join room')
      }
    }

    console.log(`[Auth] User ${user.username} joined room ${roomId}`)

    // 3. 返回用户信息给 Yjs Awareness (用于显示谁在线)
    return {
      user: {
        id: user.id,
        name: user.username,
      },
    }
  },

  // 连接事件日志
  async onConnect(data) {
    const roomId = getRoomId(data.documentName)
    console.log(`[WS] Connected to room ${roomId}, document: ${data.documentName}`)
  },

  async onDisconnect(data) {
    const roomId = getRoomId(data.documentName)
    console.log(`[WS] Disconnected from room ${roomId}, document: ${data.documentName}`)
  },
})

// 导出兼容旧代码
export const collabServer = collServer
