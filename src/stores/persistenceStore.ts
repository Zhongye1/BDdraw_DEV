// @/stores/persistenceStore.ts
import * as Y from 'yjs'
import { IndexeddbPersistence } from 'y-indexeddb'
import { HocuspocusProvider } from '@hocuspocus/provider'

// 存储不同房间的 Yjs 文档和相关提供者
const roomDocuments = new Map<
  string,
  {
    yDoc: Y.Doc
    yElements: Y.Map<any>
    indexeddbProvider: IndexeddbPersistence
    wsProvider: HocuspocusProvider | null
  }
>()

// 获取或创建指定房间的 Yjs 文档
export const getYDocForRoom = (roomId: string) => {
  if (!roomDocuments.has(roomId)) {
    const yDoc = new Y.Doc()
    const yElements = yDoc.getMap<any>('elements')
    const indexeddbProvider = new IndexeddbPersistence(`canvas-local-db-${roomId}`, yDoc)

    roomDocuments.set(roomId, {
      yDoc,
      yElements,
      indexeddbProvider,
      wsProvider: null,
    })
  }

  return roomDocuments.get(roomId)!.yDoc
}

// 获取指定房间的元素映射
export const getYElementsForRoom = (roomId: string) => {
  if (!roomDocuments.has(roomId)) {
    getYDocForRoom(roomId) // 初始化文档
  }

  return roomDocuments.get(roomId)!.yElements
}

// 获取指定房间的 IndexedDB 提供者
export const getIndexedDBProviderForRoom = (roomId: string) => {
  if (!roomDocuments.has(roomId)) {
    getYDocForRoom(roomId) // 初始化文档
  }

  return roomDocuments.get(roomId)!.indexeddbProvider
}

// 初始化指定房间的 WebSocket 提供者
export const initWsProvider = (roomId: string, token: string) => {
  // 如果房间不存在，先创建
  if (!roomDocuments.has(roomId)) {
    getYDocForRoom(roomId)
  }

  const roomData = roomDocuments.get(roomId)!

  // 如果已存在 WebSocket 提供者，先销毁
  if (roomData.wsProvider) {
    roomData.wsProvider.destroy()
  }

  // 创建新的 WebSocket 提供者，并关联 Yjs 文档
  console.log(`[Room ${roomId}] Initializing WebSocket Provider with token: ${token}`)

  const wsProvider = new HocuspocusProvider({
    // 确保 URL 结尾规范，方便拼接
    url: `ws://localhost:3000/collaboration/${roomId}`,
    name: roomId, // Hocuspocus 会将其拼接为 /collaboration/{roomId}
    token: token,
    // 明确指定要同步的文档
    document: roomData.yDoc,
  })
  console.log(wsProvider)

  // 监听 WebSocket 连接状态
  wsProvider.on('status', (event: any) => {
    console.log(`[Room ${roomId}] WebSocket status:`, event.status) // 'connected' or 'disconnected'
  })

  // 更新房间数据中的 WebSocket 提供者
  roomData.wsProvider = wsProvider

  return wsProvider
}

// 销毁指定房间的所有资源
export const destroyRoomResources = (roomId: string) => {
  if (roomDocuments.has(roomId)) {
    const roomData = roomDocuments.get(roomId)!

    // 销毁 WebSocket 提供者
    if (roomData.wsProvider) {
      roomData.wsProvider.destroy()
      roomData.wsProvider = null
    }

    // 销毁 IndexedDB 提供者
    roomData.indexeddbProvider.destroy()

    // 销毁 Yjs 文档
    roomData.yDoc.destroy()

    // 从映射中删除
    roomDocuments.delete(roomId)

    console.log(`[Room ${roomId}] Resources destroyed`)
  }
}

// 获取当前房间的 Awareness 对象
export const getAwareness = (roomId: string) => {
  if (roomDocuments.has(roomId) && roomDocuments.get(roomId)!.wsProvider) {
    return roomDocuments.get(roomId)!.wsProvider?.awareness || null
  }
  return null
}
