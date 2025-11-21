## Canvas 下的分包结构

Canvas 模块采用了清晰的功能模块划分，遵循单一职责原则，将不同的功能拆分成独立的子模块。以下是详细的分包结构：

### 整体结构

```
src/pages/canvas/Pixi_STM_modules/
├── core/                     # 核心模块
│   ├── StageManagerCore.ts   # StageManager 核心类和初始化逻辑
│   └── types.ts              # 自定义类型定义
├── rendering/                # 渲染模块
│   ├── ElementRenderer.ts    # 元素渲染逻辑
│   └── TransformerRenderer.ts# 变换控制器渲染逻辑
├── interaction/              # 交互模块
│   └── InteractionHandler.ts # 交互事件处理
└── utils/                    # 工具模块
    └── cursorUtils.ts        # 光标相关工具函数
```

### 各模块详细说明

#### 1. Core 核心模块

**StageManagerCore.ts** 这是整个 StageManager 的核心实现文件，包含了以下主要功能：

- PIXI 应用和视口的初始化
- 图层管理（元素图层和UI图层）
- 状态订阅和响应机制
- 构造函数及初始化逻辑
- 视口管理

**types.ts** 定义了 StageManager 中使用的自定义 TypeScript 类型：

- [InteractionMode](javascript:void(0))：交互模式枚举（idle、panning、selecting、dragging、resizing、drawing）
- [HandleType](javascript:void(0))：手柄类型枚举（tl、t、tr、r、br、b、bl、l、p0、p1）
- [StageManagerState](javascript:void(0))：StageManager 内部状态接口

#### 2. Rendering 渲染模块

**ElementRenderer.ts** 负责将画布元素数据渲染成可视化的 PIXI 对象：

- 根据元素类型（文本、矩形、圆形、三角形等）创建对应的 PIXI 对象
- 实现增量更新机制，只更新发生变化的元素
- 管理 spriteMap 映射关系
- 处理不同元素类型的渲染细节（文本使用 HTMLText，几何图形使用 Graphics）

**TransformerRenderer.ts** 负责渲染选中元素的变换控制器：

- 绘制选中元素的边界框
- 创建和渲染控制手柄（8个方向的调整手柄）
- 特殊处理直线和箭头类型元素的端点控制
- 计算正确的手柄位置和大小
- 提供手柄点击事件处理

#### 3. Interaction 交互模块

**InteractionHandler.ts** 处理用户与画布的基本交互：

- 注册和移除 PIXI 事件监听器
- 将 PIXI 事件转发给 StageManager 处理函数
- 管理 pointerdown、pointermove、pointerup 等事件

#### 4. Utils 工具模块

**cursorUtils.ts** 提供光标相关的工具函数：

- [getCursorForHandle](javascript:void(0))：根据手柄类型返回相应的光标样式

注意：在 TransformerRenderer.ts 中也有一份相同的 [getCursorForHandle](javascript:void(0)) 函数实现，可能是为了减少依赖。

### 设计优势

这种分包方式的优势包括：

1. **职责分离**：每个模块都有明确的职责，便于维护和扩展
2. **可测试性**：每个模块相对独立，便于单元测试
3. **可复用性**：渲染和交互逻辑可以独立复用
4. **易于理解**：新开发者可以快速定位到相关功能代码
5. **团队协作**：不同开发者可以并行开发不同模块

### 工作流程

1. StageManagerCore 初始化 PIXI 应用和视口
2. 订阅 Zustand store 的状态变化
3. 当状态变化时，调用 ElementRenderer 渲染元素
4. 根据选中状态，调用 TransformerRenderer 渲染变换控制器
5. InteractionHandler 处理用户交互事件
6. 事件处理函数更新 store 状态，触发新一轮渲染

这种架构使得整个系统具有良好的扩展性和维护性。