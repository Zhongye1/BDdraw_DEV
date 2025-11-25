# BDdraw 本地优先架构实现

为了支持离线编辑功能，我们采用了 Local-First（本地优先）架构方案，基于 Yjs 和 IndexedDB 技术实现。

## 核心理念

应用不再依赖服务器来"保存"数据：

- 数据源头在本地：应用总是读写本地的数据库（IndexedDB）
- 即时响应：无论有没有网，操作都是毫秒级生效，因为是在操作内存和本地 DB
- 后台同步：网络只是一个"同步通道"。有网时，后台悄悄把本地数据同步给服务器；没网时，数据留在本地，等有网了自动补传

## 技术实现

### 1. 依赖安装

我们使用了以下关键库：

- `yjs`: CRDT 实现，用于处理数据同步和冲突解决
- `y-indexeddb`: Yjs 的 IndexedDB 适配器，用于本地持久化

### 2. 核心架构

#### persistenceStore.ts

该文件是整个本地优先架构的核心，负责管理：

- Yjs 文档实例 (`yDoc`)
- 共享元素映射 (`yElements`)
- IndexedDB 持久化提供者 (`persistenceProvider`)

```typescript
// 创建 Yjs 文档 (这是内存中的数据源)
export const yDoc = new Y.Doc()

// 所有的画布元素都存在这个 Map 里
export const yElements = yDoc.getMap<any>('elements')

// 连接 IndexedDB (实现断网编辑的关键)
const provider = new IndexeddbPersistence('canvas-local-db', yDoc)
```

#### canvasStore.ts 更新

我们将 Zustand store 与 Yjs 文档进行了深度整合：

- 状态源从 Zustand 转移到了 Yjs 文档
- 所有元素操作都通过 Yjs API 进行
- 使用 `transact` 方法确保操作的原子性
- 通过观察者模式将 Yjs 变更同步到 React 组件

#### 状态同步流程

1. 用户执行操作（如添加、修改、删除元素）
2. 操作通过 Yjs API 写入内存中的 Yjs 文档
3. y-indexeddb 自动在后台将变更异步保存到 IndexedDB
4. Yjs 文档变更触发观察者回调
5. 观察者将最新状态同步到 Zustand store
6. Zustand 状态更新触发 React 组件重渲染

### 3. 离线场景模拟

#### 用户打开页面 (有网)

- y-indexeddb 启动，从 IndexedDB 读取上次的数据
- 页面显示上次画的图

#### 用户断网 (进入隧道/拔掉网线)

- 用户拖动矩形 A 到右边
- 代码调用 updateElement -> 更新 yElements (内存) -> Zustand 更新 -> Canvas 重绘。用户感觉不到任何卡顿
- 同时，y-indexeddb 在后台默默把新坐标写入浏览器的 IndexedDB

#### 用户关闭浏览器 (依然没网)

- 最新的位置已经保存在 IndexedDB 里了

#### 用户第二天打开浏览器 (依然没网)

- y-indexeddb 从 IndexedDB 读取数据
- 用户看到矩形 A 就在右边（即昨天断网后修改的位置）

#### 用户连上网络

- (未来集成 WebsocketProvider 后) Yjs 会检测到网络连接
- 它会自动计算本地数据与服务器数据的差异
- 它把"移动矩形 A"这个操作发送给服务器
- 数据一致性达成

### 4. 状态指示器

我们在界面右上角添加了 [SyncIndicator](file:///e:/ADF-workbase/BDdraw_DEV/src/components/SyncIndicator.tsx#L4-L27) 组件，用于向用户显示当前的连接状态：

- 在线时显示绿色"已同步 (在线)"状态
- 离线时显示橙色"离线编辑中 (已保存到本地)"状态

## 总结

要支持断网编辑，核心不在于"如何保存"，而在于"把谁当做真理"。

### 错误做法

把后端数据库当真理。每次操作都要 POST /save，断网就报错或把请求存队列（非常难维护）。

### 正确做法 (Local-First)

把本地 IndexedDB 当做第一真理。

- UI 永远只和本地 DB 交互
- 同步逻辑与 UI 逻辑完全解耦
- 使用 Yjs 这一类 CRDT 库，它天生就是为了解决"离线后重新合并数据"这个数学难题而生的

按照上面的代码实现后，你的应用现在已经具备了：自动保存、断网编辑、刷新恢复、剪贴板持久化（配合之前的 localStorage 方案）的所有能力。
