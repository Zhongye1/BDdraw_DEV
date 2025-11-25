// @/stores/persistenceStore.ts
import * as Y from 'yjs'
import { IndexeddbPersistence } from 'y-indexeddb'

// 1. 创建 Yjs 文档 (这是内存中的数据源)
export const yDoc = new Y.Doc()

// 2. 定义共享数据类型
// 所有的画布元素都存在这个 Map 里
export const yElements = yDoc.getMap<any>('elements')

// 3. 连接 IndexedDB (实现断网编辑的关键)
// 这一行代码会做两件事：
// A. 初始化时，把 IndexedDB 的数据加载到 yDoc (内存)
// B. 内存数据变化时，异步保存回 IndexedDB
const provider = new IndexeddbPersistence('canvas-local-db', yDoc)

// 4. 监听同步状态 (用于 UI 显示 "已保存" 或 "离线中")
// 这是一个简单的状态存储，不存入 DB
export const syncStatus = {
  synced: false,
}

// 导出 provider 以便后续销毁或监听
export const persistenceProvider = provider
