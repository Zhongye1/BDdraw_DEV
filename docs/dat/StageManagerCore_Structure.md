# StageManagerCore.ts 结构说明

## 概述

StageManagerCore.ts 文件包含 StageManager 类的核心实现，负责管理画布上的所有交互逻辑，包括元素的选择、移动、缩放、旋转等操作。

## 类结构

### 1. 类属性定义模块

定义了 StageManager 类所需的各种属性：

#### PIXI 相关

- `app`: PIXI.Application 实例
- `viewport`: Viewport 视口实例
- `elementLayer`: 元素图层容器
- `uiLayer`: UI 图层容器

#### 渲染器

- `elementRenderer`: ElementRenderer 实例，负责元素渲染
- `transformerRenderer`: TransformerRenderer 实例，负责变换控制器渲染

#### 交互处理器

- `interactionHandler`: InteractionHandler 实例，处理用户交互

#### 图形对象

- `selectionRectGraphic`: 选择框图形
- `eraserGraphic`: 橡皮擦图形

#### 状态管理

- `state`: StageManagerState 类型，包含所有交互状态
- `isCtrlPressed`: Ctrl 键按下状态

#### 防抖相关

- `debounceTimer`: 防抖定时器
- `DEBOUNCE_DELAY`: 防抖延迟时间

### 2. 构造函数与初始化模块

#### constructor

主构造函数，负责：

- 初始化 PIXI 应用
- 设置视口和图层
- 初始化渲染器
- 设置交互处理器
- 添加键盘事件监听
- 订阅状态变化

#### initApp

初始化 PIXI 应用程序：

- 配置应用参数
- 将 canvas 添加到容器
- 处理鼠标中键事件

#### setupViewport

设置视口：

- 创建 Viewport 实例
- 配置视口参数
- 添加拖拽、捏合、滚轮等交互功能

#### setupKeyboardEvents

设置键盘事件监听：

- 监听 Ctrl/Meta 键按下和释放
- 在销毁时移除事件监听器

### 3. 辅助方法模块

#### 防抖相关

- `triggerDebounceSnapshot`: 触发防抖快照

#### 计算相关

- `getSelectionBounds`: 计算选中元素的整体包围盒
- `rotatePoint`: 计算点绕中心旋转后的新坐标
- `getGroupChildrenElements`: 获取组内所有子元素
- `getAllDescendantIds`: 递归获取所有后代元素的 ID
- `getGroupResizeUpdates`: 获取组调整大小的更新

### 4. 交互逻辑模块

#### 指针事件处理

- `onPointerDown`: 处理指针按下事件

  - 处理不同工具模式（手形、橡皮擦、文本、选择、绘制）
  - 处理元素选择和拖拽开始
  - 处理 Ctrl+点击多选

- `onHandleDown`: 处理手柄按下事件

  - 处理旋转操作
  - 处理缩放操作
  - 记录初始状态

- `onPointerMove`: 处理指针移动事件

  - 处理选择框绘制
  - 处理橡皮擦操作
  - 处理元素拖拽
  - 处理元素缩放
  - 处理元素旋转
  - 处理绘图操作

- `onPointerUp`: 处理指针释放事件
  - 处理橡皮擦模式结束
  - 处理选择框结束
  - 处理绘图结束
  - 处理拖拽结束并记录命令
  - 处理缩放结束并记录命令
  - 处理旋转结束并记录命令
  - 清理状态

#### 视口和光标管理

- `updateViewportState`: 更新视口状态
- `setSpacePressed`: 设置空格键按下状态
- `updateCursor`: 更新鼠标光标

#### 销毁方法

- `destroy`: 销毁资源，清理事件监听器

### 5. 状态管理

[state](file:///e%3A/ADF-workbase/BDdraw_DEV/src/pages/canvas/Pixi_STM_modules/core/StageManagerCore.ts#L35-L61) 对象包含以下属性：

- `mode`: 当前交互模式（idle, dragging, resizing, rotating 等）
- `startPos`: 起始位置
- `currentId`: 当前操作元素 ID
- `initialElementState`: 单个元素初始状态
- `initialElementsMap`: 多个元素初始状态映射
- `initialGroupBounds`: 初始群组边界
- `resizeInitialStates`: 缩放初始状态
- `dragInitialStates`: 拖拽初始状态
- `rotationInitialStates`: 旋转初始状态
- `rotationCenter`: 旋转中心点
- `startRotationAngle`: 起始旋转角度
- `activeHandle`: 活动手柄
- `isSpacePressed`: 空格键按下状态
- `destroyed`: 是否已销毁
- `initialSelectionBounds`: 初始选择边界
- `currentRotationAngle`: 当前旋转角度

## 功能流程

### 元素移动流程

1. onPointerDown: 捕获元素初始位置并记录到 dragInitialStates
2. onPointerMove: 根据鼠标移动更新元素位置
3. onPointerUp: 创建 UpdateElementCommand 并执行，支持撤销/重做

### 元素缩放流程

1. onHandleDown: 记录元素初始状态到 resizeInitialStates
2. onPointerMove: 根据手柄拖拽计算缩放比例并更新元素
3. onPointerUp: 创建 UpdateElementCommand 并执行，支持撤销/重做

### 元素旋转流程

1. onHandleDown: 计算旋转中心并记录元素初始状态到 rotationInitialStates
2. onPointerMove: 根据鼠标位置计算旋转角度并更新元素
3. onPointerUp: 创建 UpdateElementCommand 并执行，支持撤销/重做

```
StageManagerCore.ts
├── 导入模块
│   ├── PIXI 相关库
│   ├── 渲染器模块
│   ├── 交互处理器
│   ├── 状态管理
│   ├── 工具库 (nanoid)
│   ├── 类型定义
│   └── 撤销/重做管理器
│
├── StageManager 类
│   ├── 类属性
│   │   ├── PIXI 实例
│   │   │   ├── app: PIXI.Application
│   │   │   └── viewport: Viewport
│   │   │
│   │   ├── 图层容器
│   │   │   ├── elementLayer: PIXI.Container
│   │   │   └── uiLayer: PIXI.Container
│   │   │
│   │   ├── 渲染器实例
│   │   │   ├── elementRenderer: ElementRenderer
│   │   │   └── transformerRenderer: TransformerRenderer
│   │   │
│   │   ├── 交互处理器
│   │   │   └── interactionHandler: InteractionHandler
│   │   │
│   │   ├── 图形对象
│   │   │   ├── selectionRectGraphic: PIXI.Graphics
│   │   │   └── eraserGraphic: PIXI.Graphics
│   │   │
│   │   ├── 状态管理
│   │   │   ├── state: StageManagerState
│   │   │   └── isCtrlPressed: boolean
│   │   │
│   │   └── 防抖相关
│   │       ├── debounceTimer: number | null
│   │       └── DEBOUNCE_DELAY: number
│   │
│   ├── 构造函数和初始化方法
│   │   ├── constructor
│   │   ├── initApp
│   │   ├── setupViewport
│   │   └── setupKeyboardEvents
│   │
│   ├── 辅助方法模块
│   │   ├── 防抖相关
│   │   │   └── triggerDebounceSnapshot
│   │   │
│   │   ├── 计算相关
│   │   │   ├── getSelectionBounds
│   │   │   └── rotatePoint
│   │   │
│   │   └── 组元素处理
│   │       ├── getGroupChildrenElements
│   │       ├── getAllDescendantIds
│   │       └── getGroupResizeUpdates
│   │
│   ├── 交互逻辑模块
│   │   ├── 指针事件处理
│   │   │   ├── onPointerDown
│   │   │   ├── onPointerMove
│   │   │   └── onPointerUp
│   │   │
│   │   └── 手柄事件处理
│   │       └── onHandleDown
│   │
│   └── 状态和资源管理
│       ├── updateViewportState
│       ├── setSpacePressed
│       ├── updateCursor
│       └── destroy
```
