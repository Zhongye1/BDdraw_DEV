# BDdraw_DEV 项目架构设计详解

## 1. 概述

BDdraw_DEV 项目采用分层架构设计，将应用分为数据层、渲染层、交互层和 UI 层。这种架构设计使得各层职责清晰，便于维护和扩展。

## 2. 架构分层详解

### 2.1 数据层 (Store)

**技术实现**:
- 使用 Zustand 作为状态管理库
- 数据存储在 [canvasStore.ts](file:///e:/ADF-workbase/BDdraw_DEV/src/stores/canvasStore.ts) 中
- 采用函数式更新方式，通过展开运算符实现不可变更新

**核心功能**:
- 存储画布元素数据 ([elements](file:///e:/ADF-workbase/BDdraw_DEV/src/stores/canvasStore.ts#L79-L79))
- 管理选中状态 ([selectedIds](file:///e:/ADF-workbase/BDdraw_DEV/src/stores/canvasStore.ts#L81-L81))
- 管理当前工具 ([tool](file:///e:/ADF-workbase/BDdraw_DEV/src/stores/canvasStore.ts#L78-L78))
- 管理样式设置 ([currentStyle](file:///e:/ADF-workbase/BDdraw_DEV/src/stores/canvasStore.ts#L90-L100))
- 提供状态更新方法 ([addElement](file:///e:/ADF-workbase/BDdraw_DEV/src/stores/canvasStore.ts#L104-L104), [updateElement](file:///e:/ADF-workbase/BDdraw_DEV/src/stores/canvasStore.ts#L105-L105), [removeElements](file:///e:/ADF-workbase/BDdraw_DEV/src/stores/canvasStore.ts#L106-L106) 等)

**代码位置**: [src/stores/canvasStore.ts](file:///e:/ADF-workbase/BDdraw_DEV/src/stores/canvasStore.ts)

### 2.2 渲染层 (Rendering)

**技术实现**:
- 使用 PixiJS v8 作为渲染引擎
- 使用 HTMLText 实现富文本渲染
- 通过 [ElementRenderer.ts](file:///e:/ADF-workbase/BDdraw_DEV/src/pages/canvas/Pixi_STM_modules/rendering/ElementRenderer.ts) 管理元素渲染
- 使用 Map 缓存图形对象 ([spriteMap](file:///e:/ADF-workbase/BDdraw_DEV/src/pages/canvas/Pixi_STM_modules/rendering/ElementRenderer.ts#L5-L5))

**核心功能**:
- 根据元素类型选择合适的 PixiJS 对象进行渲染
  - 图形元素使用 Graphics 对象
  - 图片元素使用 Sprite 对象
  - 文本元素使用 HTMLText 对象
- 维护元素 ID 与 PixiJS 对象的映射关系
- 处理元素的创建、更新和销毁
- 图片资源的异步加载和缓存管理

**代码位置**: 
- [src/pages/canvas/Pixi_STM_modules/rendering/ElementRenderer.ts](file:///e:/ADF-workbase/BDdraw_DEV/src/pages/canvas/Pixi_STM_modules/rendering/ElementRenderer.ts)
- [src/pages/canvas/Pixi_STM_modules/rendering/TransformerRenderer.ts](file:///e:/ADF-workbase/BDdraw_DEV/src/pages/canvas/Pixi_STM_modules/rendering/TransformerRenderer.ts)

### 2.3 交互层 (Interaction)

**技术实现**:
- 使用 pixi-viewport 实现无限画布
- 通过 [StageManagerCore.ts](file:///e:/ADF-workbase/BDdraw_DEV/src/pages/canvas/Pixi_STM_modules/core/StageManagerCore.ts) 管理核心交互逻辑
- 使用 [InteractionHandler.ts](file:///e:/ADF-workbase/BDdraw_DEV/src/pages/canvas/Pixi_STM_modules/interaction/InteractionHandler.ts) 处理指针事件

**核心功能**:
- 处理鼠标/触摸事件 (点击、拖拽、释放)
- 管理交互状态 ([mode](file:///e:/ADF-workbase/BDdraw_DEV/src/pages/canvas/Pixi_STM_modules/core/StageManagerCore.ts#L22-L22): idle, selecting, dragging, resizing 等)
- 实现选区功能
- 处理元素的拖拽、缩放等操作
- 管理视口的平移和缩放

**代码位置**:
- [src/pages/canvas/Pixi_STM_modules/core/StageManagerCore.ts](file:///e:/ADF-workbase/BDdraw_DEV/src/pages/canvas/Pixi_STM_modules/core/StageManagerCore.ts)
- [src/pages/canvas/Pixi_STM_modules/interaction/InteractionHandler.ts](file:///e:/ADF-workbase/BDdraw_DEV/src/pages/canvas/Pixi_STM_modules/interaction/InteractionHandler.ts)

### 2.4 UI 层 (User Interface)

**技术实现**:
- 使用 React 构建 UI 组件
- 使用 Arco Design 组件库
- 使用 Tailwind CSS 进行样式设计

**核心功能**:
- 工具栏 ([TopToolbar.tsx](file:///e:/ADF-workbase/BDdraw_DEV/src/components/canvas_toolbar/TopToolbar.tsx))
- 属性面板 ([property-panel/index.tsx](file:///e:/ADF-workbase/BDdraw_DEV/src/components/property-panel/index.tsx))
- 文本编辑器 ([BottomTextEditor.tsx](file:///e:/ADF-workbase/BDdraw_DEV/src/components/Richtext_editor/BottomTextEditor.tsx))
- 图片插入模态框 ([image-insert-modal/index.tsx](file:///e:/ADF-workbase/BDdraw_DEV/src/components/image-insert-modal/index.tsx))

**代码位置**:
- [src/components/](file:///e:/ADF-workbase/BDdraw_DEV/src/components/)

## 3. 核心设计要素实现

### 3.1 渲染引擎

**实现方式**:
- 使用 PixiJS v8 作为核心渲染引擎
- 使用 HTMLText 实现富文本渲染
- 通过 WebGL 进行硬件加速渲染

**优势**:
- 高性能渲染，支持大量元素
- 抗锯齿效果好，高分屏显示清晰
- HTMLText 支持复杂的富文本格式

**代码位置**:
- [src/pages/canvas/Pixi_STM_modules/rendering/ElementRenderer.ts](file:///e:/ADF-workbase/BDdraw_DEV/src/pages/canvas/Pixi_STM_modules/rendering/ElementRenderer.ts)

### 3.2 状态管理

**实现方式**:
- 使用 Zustand 进行全局状态管理
- 通过中间件实现撤销/重做功能
- 使用 subscribeWithSelector 优化状态订阅

**优势**:
- 轻量级，API 简单易用
- 支持中间件扩展功能
- 响应式更新，自动触发 UI 重渲染

**代码位置**:
- [src/stores/canvasStore.ts](file:///e:/ADF-workbase/BDdraw_DEV/src/stores/canvasStore.ts)

### 3.3 元素对象缓存

**实现方式**:
- 使用 Map 缓存 PixiJS 对象 ([spriteMap](file:///e:/ADF-workbase/BDdraw_DEV/src/pages/canvas/Pixi_STM_modules/rendering/ElementRenderer.ts#L5-L5))
- 永久缓存元素对象，避免频繁创建和销毁
- 根据元素 ID 精确管理对象生命周期

**优势**:
- 避免元素闪烁问题
- 提高渲染性能
- 保持元素状态一致性

**代码位置**:
- [src/pages/canvas/Pixi_STM_modules/rendering/ElementRenderer.ts](file:///e:/ADF-workbase/BDdraw_DEV/src/pages/canvas/Pixi_STM_modules/rendering/ElementRenderer.ts)

### 3.4 历史栈

**实现方式**:
- 使用命令模式实现撤销/重做功能
- 通过 [UndoRedoManager.ts](file:///e:/ADF-workbase/BDdraw_DEV/src/lib/UndoRedoManager.ts) 管理命令栈
- 使用 [SnapshotCommand](file:///e:/ADF-workbase/BDdraw_DEV/src/lib/UndoRedoManager.ts#L147-L171) 和 [UpdateElementCommand](file:///e:/ADF-workbase/BDdraw_DEV/src/lib/UpdateElementCommand.ts#L12-L77) 两种命令类型

**优势**:
- 支持精确的撤销/重做操作
- 可扩展性强，支持不同类型的命令
- 状态隔离，避免副作用

**代码位置**:
- [src/lib/UndoRedoManager.ts](file:///e:/ADF-workbase/BDdraw_DEV/src/lib/UndoRedoManager.ts)
- [src/lib/UpdateElementCommand.ts](file:///e:/ADF-workbase/BDdraw_DEV/src/lib/UpdateElementCommand.ts)

### 3.5 选中/变换系统

**实现方式**:
- 使用独立的变换控制器渲染 ([TransformerRenderer.ts](file:///e:/ADF-workbase/BDdraw_DEV/src/pages/canvas/Pixi_STM_modules/rendering/TransformerRenderer.ts))
- 通过手柄实现元素的缩放操作
- 支持多元素同时选中和操作

**优势**:
- 专业级的选中和变换体验
- 支持多元素操作
- 与主渲染层解耦

**代码位置**:
- [src/pages/canvas/Pixi_STM_modules/rendering/TransformerRenderer.ts](file:///e:/ADF-workbase/BDdraw_DEV/src/pages/canvas/Pixi_STM_modules/rendering/TransformerRenderer.ts)

### 3.6 辅助对齐线

**当前状态**:
- 项目中目前尚未实现辅助对齐线功能
- 可以通过在拖拽过程中计算元素间距离实现

### 3.7 组合（Group）

**当前状态**:
- 数据结构中预留了扩展字段
- 功能实现尚未完成
- 可通过添加 groupId 字段实现基本分组功能

### 3.8 数据持久化

**实现方式**:
- 使用 Zustand 管理内存状态
- 可通过添加持久化中间件实现数据持久化

**当前状态**:
- 项目中暂未实现数据持久化
- 可通过 zustand/middleware/persist 或 localForage 实现

### 3.9 图片处理

**实现方式**:
- 使用 PixiJS 的 Sprite 对象渲染图片
- 使用 Filter 实现滤镜效果 (BlurFilter, ColorMatrixFilter)
- 使用 Graphics 实现遮罩效果实现圆角

**优势**:
- 原生支持，性能优秀
- 支持多种滤镜效果
- 可扩展性强

**代码位置**:
- [src/pages/canvas/Pixi_STM_modules/rendering/ElementRenderer.ts](file:///e:/ADF-workbase/BDdraw_DEV/src/pages/canvas/Pixi_STM_modules/rendering/ElementRenderer.ts)

## 4. 数据流设计

```mermaid
graph TD
    A[用户操作] --> B[UI层]
    B --> C[状态管理(canvasStore)]
    C --> D[渲染层(ElementRenderer)]
    C --> E[交互层(StageManager)]
    E --> F[更新PixiJS对象]
    D --> F
    F --> G[PixiJS渲染]
```

## 5. 总结

BDdraw_DEV 项目采用了清晰的分层架构设计，各层之间职责明确，通过状态管理进行协调。这种设计方式具有以下优势：

1. **可维护性强**: 各层职责清晰，便于维护和调试
2. **可扩展性好**: 可以独立扩展某一层的功能而不影响其他层
3. **性能优秀**: 通过对象缓存和高效的渲染引擎保证性能
4. **用户体验佳**: 专业的交互设计和流畅的操作体验

项目在核心功能上已经实现了较为完整的解决方案，对于部分高级功能（如辅助对齐线、组合等）仍有待完善，但架构上已经为这些功能的实现提供了良好的基础。