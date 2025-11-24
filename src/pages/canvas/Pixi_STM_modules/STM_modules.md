StageManager 类
├── 类属性定义模块
│ ├── PIXI 应用和视口
│ ├── 图层管理
│ ├── 元素映射
│ ├── 交互状态
│ ├── 辅助图形
│ └── 变换/拖拽相关数据
├── 构造函数与初始化模块
│ ├── 主构造函数
│ │ ├── 应用初始化
│ │ ├── 视口设置
│ │ ├── 图层结构初始化
│ │ ├── UI 元素初始化
│ │ ├── 交互设置
│ │ └── 状态订阅
│ └── 应用初始化方法 (initApp)
├── 视口管理模块
│ └── 视口设置 (setupViewport)
├── 渲染核心模块
│ ├── 画布元素渲染 (renderElements)
│ └── 变换控制器渲染 (renderTransformer)
├── 交互逻辑模块
│ ├── 交互设置 (setupInteraction)
│ ├── 指针按下处理 (onPointerDown)
│ ├── 手柄按下处理 (onHandleDown)
│ ├── 指针移动处理 (onPointerMove)
│ └── 指针抬起处理 (onPointerUp)
├── 辅助函数模块
│ ├── 获取手柄光标样式 (getCursorForHandle)
│ ├── 更新视口状态 (updateViewportState)
│ ├── 设置空格键状态 (setSpacePressed)
│ ├── 更新光标 (updateCursor)
│ └── 销毁方法 (destroy)

各模块功能说明

类属性定义模块
这部分定义了 StageManager 类的各种属性，包括：

PIXI 应用实例和视口
图层容器(elementLayer 和 uiLayer)
元素映射(spriteMap)
交互状态变量
辅助图形对象
变换和拖拽相关的状态数据 2. 构造函数与初始化模块
包含类的主构造函数和应用初始化方法：

构造函数负责整体初始化流程
initApp() 方法初始化 PIXI 应用程序
设置各种监听器和订阅状态变化 3. 视口管理模块
专门处理视口相关的配置和管理：

setupViewport() 方法创建并配置视口，添加拖拽、捏合和滚轮等交互功能 4. 渲染核心模块
负责将画布元素和变换控件渲染到屏幕上：

renderElements() 渲染所有画布元素(矩形、圆形、三角形)
renderTransformer() 渲染选中元素的变换控制器(包括手柄) 5. 交互逻辑模块
处理用户的输入和交互行为：

setupInteraction() 设置基本的指针事件监听
onPointerDown() 处理指针按下事件，确定交互模式
onHandleDown() 处理手柄按下事件
onPointerMove() 处理指针移动事件，执行实际的交互逻辑
onPointerUp() 处理指针释放事件，完成交互操作 6. 辅助函数模块
提供各种辅助功能的方法：

getCursorForHandle() 根据手柄类型返回相应的光标样式
updateViewportState() 更新视口状态
setSpacePressed() 设置空格键按下状态
updateCursor() 更新鼠标光标
destroy() 销毁资源

预期分包方案：
src/pages/canvas/Pixi_STM_modules/
├── core/
│ ├── StageManagerCore.ts # StageManager 核心类和初始化逻辑
│ └── types.ts # 自定义类型定义
├── element-rendering/
│ └── ElementRenderer.ts # 元素渲染逻辑 (renderElements)
├── transformer-rendering/
│ └── TransformerRenderer.ts # 变换控制器渲染逻辑 (renderTransformer)
├── interaction/
│ ├── InteractionHandler.ts # 交互事件处理 (setupInteraction)
│ ├── PointerHandler.ts # 指针事件处理 (onPointerDown, onPointerMove, onPointerUp)
│ └── HandleHandler.ts # 手柄事件处理 (onHandleDown)
└── utils/
└── cursorUtils.ts # 光标相关工具函数 (getCursorForHandle)

core/

StageManagerCore.ts: 包含 StageManager 类的主要结构、属性定义、构造函数以及初始化相关方法
types.ts: 包含自定义类型如 InteractionMode 和 HandleType
element-rendering/

ElementRenderer.ts: 负责渲染画布元素的方法 renderElements()
transformer-rendering/

TransformerRenderer.ts: 负责渲染变换控制器的方法 renderTransformer()
interaction/

InteractionHandler.ts: 包含交互设置方法 setupInteraction()
PointerHandler.ts: 包含指针事件处理方法 onPointerDown, onPointerMove, onPointerUp
HandleHandler.ts: 包含手柄事件处理方法 onHandleDown()
utils/

cursorUtils.ts: 包含光标相关的辅助函数 getCursorForHandle()