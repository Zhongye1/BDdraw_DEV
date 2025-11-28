# 项目架构文档

## 整体结构

```
BDdraw_DEV/
├── ALD_Backend/                     # 后端服务
│   ├── src/
│   │   ├── api/                     # API接口
│   │   │   ├── Room_management/     # 房间管理相关API
│   │   │   ├── USER_management/     # 用户管理相关API
│   │   │   └── index.ts             # API路由汇总
│   │   ├── auth.ts                  # 认证相关
│   │   ├── collab.ts                # 协作相关
│   │   └── db.ts                    # 数据库连接
│   ├── ARCHITECTURE.md              # 后端架构文档
│   ├── README.md                    # 后端说明文档
│   ├── index.ts                     # 后端入口文件
│   ├── package.json                 # 后端依赖配置
│   └── tsconfig.json                # TypeScript配置
├── src/                             # 前端源码
│   ├── api/                         # 前端API客户端
│   │   ├── types/                   # TypeScript类型定义
│   │   ├── utils/                   # API工具函数
│   │   ├── apiService.ts            # API服务封装
│   │   └── index.ts                 # API入口
│   ├── components/                  # React组件
│   │   ├── Richtext_editor/         # 富文本编辑器
│   │   ├── canvas_toolbar/          # 画布工具栏
│   │   ├── collaboration/           # 协作功能组件
│   │   ├── error-page/              # 错误页面
│   │   ├── header/                  # 页面头部
│   │   ├── image-insert-modal/      # 图片插入模态框
│   │   ├── layout/                  # 页面布局组件
│   │   ├── minimap/                 # 小地图组件
│   │   ├── property-panel/          # 属性面板
│   │   └── ui/                      # 基础UI组件
│   ├── hooks/                       # React自定义Hooks
│   ├── lib/                         # 工具库和核心功能
│   │   ├── AddElementCommand.ts     # 添加元素命令
│   │   ├── RemoveElementCommand.ts  # 删除元素命令
│   │   ├── UndoRedoManager.ts       # 撤销/重做管理器
│   │   ├── UpdateElementCommand.ts  # 更新元素命令
│   │   ├── constants.ts             # 常量定义
│   │   ├── env.ts                   # 环境变量
│   │   ├── minimapUtils.ts          # 小地图工具函数
│   │   └── utils.ts                 # 通用工具函数
│   ├── pages/                       # 页面组件
│   │   ├── auth/                    # 认证页面（登录/注册）
│   │   ├── canvas/                  # 画布页面
│   │   │   ├── Pixi_STM_modules/    # Pixi状态机模块
│   │   │   ├── Pixi_stageManager.ts # Pixi舞台管理器
│   │   │   └── index.tsx            # 画布页面入口
│   │   ├── home/                    # 主页
│   │   ├── intro/                   # 介绍页面
│   │   └── room/                    # 房间管理页面
│   ├── router/                      # 路由配置
│   ├── stores/                      # 状态管理（Zustand）
│   │   ├── canvasStore.ts           # 画布状态存储
│   │   └── persistenceStore.ts      # 持久化存储
│   ├── app.tsx                      # 应用根组件
│   ├── main.tsx                     # 应用入口
│   └── vite-env.d.ts                # Vite环境声明
├── docs/                            # 文档目录
├── public/                          # 静态资源
├── README.md                        # 项目说明文档
├── package.json                     # 项目依赖配置
└── vite.config.ts                   # Vite配置文件
```

## 前端架构详解

### 1. 核心模块

#### 画布模块 (Canvas)
位于 `src/pages/canvas/`，是整个应用的核心部分：

```
canvas/
├── Pixi_STM_modules/               # Pixi状态机模块
│   ├── core/                       # 核心模块
│   │   ├── Core_StageManager.ts    # 核心舞台管理器
│   │   ├── ElementRender.ts        # 元素渲染器
│   │   ├── TF_controler_Renderer.ts# 变换控制器渲染器
│   │   └── types.ts                # 核心类型定义
│   ├── interaction/                # 交互处理模块
│   │   ├── Base_InteractionHandler.ts  # 基础交互处理器
│   │   └── Stage_InteractionHandler.ts # 舞台交互处理器
│   ├── shared/                     # 共享模块
│   │   └── types.ts                # 共享类型定义
│   ├── utils/                      # 工具函数
│   │   ├── commandUtils.ts         # 命令工具
│   │   ├── cursorUtils.ts          # 光标工具
│   │   ├── dragUtils.ts            # 拖拽工具
│   │   ├── drawingUtils.ts         # 绘图工具
│   │   ├── eraserUtils.ts          # 橡皮擦工具
│   │   ├── geometryUtils.ts        # 几何工具
│   │   ├── guidelineUtils.ts       # 辅助线工具
│   │   ├── interactionUtils.ts     # 交互工具
│   │   ├── renderUtils.ts          # 渲染工具
│   │   ├── resizeUtils.ts          # 缩放工具
│   │   ├── rotationUtils.ts        # 旋转工具
│   │   ├── scaleUtils.ts           # 缩放工具
│   │   ├── selectionUtils.ts       # 选择工具
│   │   └── stateUtils.ts           # 状态工具
│   └── STM_modules.md              # 状态机模块文档
├── Pixi_stageManager.ts            # Pixi舞台管理器封装
└── index.tsx                       # 画布页面组件
```

#### 状态管理 (Stores)
使用 Zustand 进行状态管理：

```
stores/
├── canvasStore.ts                  # 画布状态管理
└── persistenceStore.ts              # 持久化状态管理
```

#### 命令模式 (Command Pattern)
实现撤销/重做功能：

```
lib/
├── AddElementCommand.ts            # 添加元素命令
├── RemoveElementCommand.ts         # 删除元素命令
├── UpdateElementCommand.ts         # 更新元素命令
├── UpdateElementPropertyCommand.ts  # 更新元素属性命令
└── UndoRedoManager.ts              # 撤销/重做管理器
```

### 2. UI组件结构

```
components/
├── Richtext_editor/                # 富文本编辑器
├── canvas_toolbar/                 # 画布工具栏
├── collaboration/                  # 协作功能组件
├── error-page/                     # 错误页面
├── header/                         # 页面头部
├── image-insert-modal/             # 图片插入模态框
├── layout/                         # 页面布局组件
├── minimap/                        # 小地图组件
├── property-panel/                 # 属性面板
└── ui/                             # 基础UI组件
    ├── button.tsx                  # 按钮组件
    ├── icon-circle.tsx             # 圆形图标
    ├── icon-clear.tsx              # 清除图标
    ├── icon-rect.tsx               # 矩形图标
    ├── icon-select.tsx             # 选择图标
    └── icon-triangle.tsx           # 三角形图标
```

## 后端架构详解

### 1. API结构

```
ALD_Backend/src/api/
├── Room_management/                # 房间管理API
│   ├── types/                      # 类型定义
│   ├── CORE.ts                     # 核心功能
│   ├── Room_CRUD.ts                # 房间增删改查
│   ├── Room_List.ts                # 房间列表
│   └── Room_users.ts               # 房间用户管理
├── USER_management/                # 用户管理API
│   ├── auth_API.ts                 # 认证API
│   └── auth_API_types.ts           # 认证API类型定义
└── index.ts                        # API路由汇总
```

### 2. 核心功能模块

```
ALD_Backend/src/
├── auth.ts                         # 认证中间件
├── collab.ts                       # 协作功能
├── db.ts                           # 数据库连接
└── api/                            # API模块
```

## 数据流和通信

### 1. 前端内部数据流

1. 用户操作触发事件
2. 事件通过交互处理器([Stage_InteractionHandler.ts](file:///E:/ADF-workbase/BDdraw_DEV/src/pages/canvas/Pixi_STM_modules/interaction/Stage_InteractionHandler.ts))处理
3. 状态更新通过[Zustand store](file:///E:/ADF-workbase/BDdraw_DEV/src/stores/canvasStore.ts)管理
4. 状态变化触发组件重新渲染
5. 命令模式记录操作历史，支持撤销/重做

### 2. 前后端通信

1. 前端通过[apiService.ts](file:///E:/ADF-workbase/BDdraw_DEV/src/api/apiService.ts)与后端通信
2. 后端提供RESTful API接口
3. 使用WebSocket实现实时协作功能

## 技术栈

### 前端
- React 18 (TypeScript)
- PixiJS + pixi-viewport (图形渲染)
- Zustand (状态管理)
- React Router v6 (路由)
- Tailwind CSS (样式)
- Vite (构建工具)

### 后端
- Node.js (Bun runtime)
- Express-like框架
- WebSocket (实时通信)
- SQLite (数据库)

## 架构特点

1. **模块化设计**：各个功能模块解耦，便于维护和扩展
2. **状态驱动**：使用Zustand进行全局状态管理
3. **命令模式**：实现完善的撤销/重做功能
4. **事件驱动**：通过事件系统处理组件间通信
5. **响应式设计**：适配不同屏幕尺寸
6. **实时协作**：基于WebSocket实现多人协作