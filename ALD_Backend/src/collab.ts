import { Hocuspocus } from '@hocuspocus/server'
import { Database as HocuspocusDB } from '@hocuspocus/extension-database'
import db from './db'
import { verifyToken } from './auth'

// 1. 定义数据库扩展：告诉 Hocuspocus 如何存取 Yjs 数据
const dbExtension = new HocuspocusDB({
  // 从数据库加载文档
  fetch: async ({ documentName }) => {
    console.log(`[Yjs] Loading doc: ${documentName}`)
    const query = db.query('SELECT content FROM rooms WHERE id = $id')
    const row = query.get({ $id: documentName }) as { content: Uint8Array } | null
    return row ? row.content : null
  },

  // 将文档保存到数据库
  store: async ({ documentName, state }) => {
    console.log(`[Yjs] Saving doc: ${documentName}`)
    // state 是二进制 Buffer
    const update = db.query('UPDATE rooms SET content = $blob WHERE id = $id')
    update.run({ $blob: state, $id: documentName })
  },
})

// 2. 配置 WebSocket 服务器
export const collabServer = new Hocuspocus({
  extensions: [dbExtension],

  // WebSocket 握手时的鉴权
  async onAuthenticate(data) {
    const { token, documentName } = data

    // 验证 Token
    const user = await verifyToken(token)
    if (!user) {
      throw new Error('Unauthorized')
    }

    // 检查用户是否属于该房间
    const hasAccess = db.query('SELECT 1 FROM room_members WHERE room_id = $roomId AND user_id = $userId').get({
      $roomId: documentName,
      $userId: user.id,
    })

    if (!hasAccess) {
      throw new Error('Forbidden')
    }

    // 返回上下文，供 Awareness 等使用
    return {
      user: {
        id: user.id,
        name: user.username,
      },
    }
  },

  async onConnect(data) {
    console.log(`[WS] Client connected to room ${data.documentName}`)
  },
})
