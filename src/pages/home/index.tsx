import { Helmet } from 'react-helmet-async'
import { Card, Typography, Divider, Grid, Badge } from '@arco-design/web-react'
import { IconCheckCircle, IconClockCircle, IconCode, IconCommand } from '@arco-design/web-react/icon'
import { getDefaultLayout } from '@/components/layout'

const { Paragraph, Text } = Typography
const { Row, Col } = Grid

// 技术栈数据配置
const TECH_STACKS = [
  {
    category: '核心框架 | Core',
    badges: [
      { src: 'https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white', alt: 'React 18' },
      { src: 'https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white', alt: 'TypeScript' },
      { src: 'https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white', alt: 'Vite' },
      {
        src: 'https://img.shields.io/badge/React%20Router%20DOM-6-CA4245?logo=reactrouter&logoColor=white',
        alt: 'React Router',
      },
    ],
  },
  {
    category: '图形渲染 | Graphics',
    badges: [
      { src: 'https://img.shields.io/badge/PixiJS-8-CC0066?logo=pixijs&logoColor=white', alt: 'PixiJS v8' },
      {
        src: 'https://img.shields.io/badge/pixi--viewport-latest-CC0066?logo=pixijs&logoColor=white',
        alt: 'pixi-viewport',
      },
    ],
  },
  {
    category: '状态管理 | State',
    badges: [
      { src: 'https://img.shields.io/badge/Zustand-4-443333?logo=zustand&logoColor=white', alt: 'Zustand' },
      {
        src: 'https://img.shields.io/badge/TanStack%20Query-5-FF4154?logo=reactquery&logoColor=white',
        alt: 'React Query',
      },
    ],
  },
  {
    category: 'UI 组件库 | UI Library',
    badges: [
      { src: 'https://img.shields.io/badge/shadcn%2Fui-latest-000000?logo=shadcnui&logoColor=white', alt: 'shadcn/ui' },
      {
        src: 'https://img.shields.io/badge/Arco%20Design-2-006AFF?logo=arco-design&logoColor=white',
        alt: 'Arco Design',
      },
      {
        src: 'https://img.shields.io/badge/Tailwind%20CSS-3-06B6D4?logo=tailwindcss&logoColor=white',
        alt: 'Tailwind CSS',
      },
    ],
  },
]

// 任务进度数据
const TASK_PROGRESS = [
  {
    title: '【P0】基础渲染',
    color: 'red',
    items: [
      { label: '图形渲染 (矩形/圆/三角) & 属性配置', done: true },
      { label: '图片渲染 (PNG/JPEG) & 简单滤镜', done: true },
      { label: '富文本渲染 (字体/字号/颜色/BIUS)', done: true },
    ],
  },
  {
    title: '【P0】画布交互',
    color: 'orange',
    items: [
      { label: '无限画布缩放、滚动、拖拽', done: true },
      { label: '无限画布滚动', done: true },
      { label: 'Minimap 缩略图', done: true },
      { label: '选区功能 (点选/框选)', done: true },
      { label: '数据持久化 (自动保存)', done: true },
      { label: '快捷键复制/粘贴', done: true },
      { label: '辅助线功能', done: true },
    ],
  },
  {
    title: '【P0】调参工具栏',
    color: 'blue',
    items: [
      { label: '文本浮动工具栏 (编辑器)', done: true },
      { label: '图形浮动工具栏', done: true },
      { label: '图片浮动工具栏', done: true },
      { label: '局部文本样式编辑', done: true },
    ],
  },
  {
    title: '【P0】元素编辑',
    color: 'green',
    items: [
      { label: '双击文本编辑', done: true },
      { label: '元素删除', done: true },
      { label: '元素拖拽/缩放', done: true },
      { label: '元素旋转', done: true },
      { label: '多元素组合/解组', done: true },
    ],
  },
  {
    title: '【P0】性能优化',
    color: 'purple',
    items: [
      { label: '100+ 元素加载 < 3s', done: true },
      { label: '100+ 元素操作 FPS 50+', done: true },
    ],
  },
  {
    title: '【P1】协同 & 高级',
    color: 'cyan',
    items: [
      { label: 'Undo & Redo (撤销重做)', done: true },
      { label: '多人协同编辑', done: true },
      { label: '离线编辑支持', done: true },
    ],
  },
]

const DIRECTORY_STRUCTURE = `
BDdraw_DEV/
├── .husky/                     # Git hooks 配置
├── .vscode/                    # VSCode 配置
├── docs/                       # 文档目录
├── public/                     # 静态资源目录
├── src/                        # 源代码主目录
│   ├── api/                    # API 接口定义
│   ├── assets/                 # 静态资源文件
│   ├── components/             # 公共组件
│   │   ├── Richtext_editor/    # 富文本编辑器组件
│   │   ├── canvas_toolbar/     # 画布工具栏组件
│   │   ├── console/            # 控制台组件
│   │   ├── error-page/         # 错误页面组件
│   │   ├── header/             # 头部组件
│   │   ├── image-insert-modal/ # 图像插入模态框组件
│   │   ├── layout/             # 布局组件
│   │   ├── property-panel/     # 属性面板组件
│   │   └── ui/                 # 基础UI组件
│   ├── hooks/                  # 自定义 React Hooks
│   ├── lib/                    # 工具库和核心功能模块
│   │   ├── ResizeCommand.ts    # 调整大小命令
│   │   ├── UndoRedoManager.ts  # 撤销重做管理器
│   │   ├── UpdateElementCommand.ts # 更新元素命令
│   │   ├── constants.ts        # 常量定义
│   │   ├── env.ts              # 环境配置
│   │   └── utils.ts            # 工具函数
│   ├── pages/                  # 页面组件
│   │   ├── about/              # 关于页面
│   │   ├── canvas/             # 画布页面
│   │   │   ├── Pixi_STM_modules/ # Pixi Stage Manager 模块
│   │   │   │   ├── core/       # 核心类和类型定义
│   │   │   │   │   ├── StageManagerCore.ts # 舞台管理核心类
│   │   │   │   │   └── types.ts # 核心类型定义
│   │   │   │   ├── interaction/ # 交互处理模块
│   │   │   │   │   └── InteractionHandler.ts # 交互处理器
│   │   │   │   ├── rendering/  # 渲染模块
│   │   │   │   │   ├── ElementRenderer.ts # 元素渲染器
│   │   │   │   │   └── TransformerRenderer.ts # 变换控制器渲染器
│   │   │   │   ├── utils/      # 工具函数
│   │   │   │   │   └── cursorUtils.ts # 光标工具函数
│   │   │   │   └── STM_modules.md # 模块说明文档
│   │   │   ├── Pixi_stageManager.ts # Pixi舞台管理器入口
│   │   │   └── index.tsx       # 画布页面入口
│   │   └── home/               # 主页
│   │       └── index.tsx       # 主页入口
│   ├── router/                 # 路由配置
│   │   └── router.tsx          # 路由定义
│   ├── stores/                 # 状态管理
│   │   └── canvasStore.ts      # 画布状态管理
│   ├── styles/                 # 样式文件
│   ├── app.tsx                 # 应用入口组件
│   ├── main.tsx                # 主入口文件
│   └── vite-env.d.ts           # Vite 环境声明文件
├── .editorconfig               # 编辑器配置
├── .eslintrc                  # ESLint 配置
├── .gitignore                 # Git 忽略文件配置
├── .prettierrc.js             # Prettier 配置
├── .stylelintrc.json          # Stylelint 配置
├── commitlint.config.cjs      # Commitlint 配置
├── components.json            # 组件配置
├── index.html                 # HTML 入口
├── lint-staged.config.js      # Lint-staged 配置
├── package.json               # 项目依赖和脚本配置
├── postcss.config.js          # PostCSS 配置
├── tailwind.config.js         # Tailwind CSS 配置
├── transmart.config.ts        # Transmart 配置
├── tsconfig.json              # TypeScript 配置
├── tsconfig.node.json         # Node.js TypeScript 配置
├── vite.config.ts             # Vite 配置
└── README.md                  # 项目说明文档

`

export default function Home() {
  return (
    <>
      <Helmet>
        <title>BDdraw_DEV - 项目文档与进度</title>
      </Helmet>

      <div className="min-h-screen bg-slate-50 px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-7xl space-y-8">
          <Row gutter={[24, 24]}>
            {/* Left Column: Tech Stack & Guide */}
            <Col xs={24} lg={14}>
              <div className="space-y-8">
                {/* Tech Stack */}
                <Card
                  title={
                    <div className="flex items-center gap-2">
                      <IconCode /> 技术栈 · Tech Stack
                    </div>
                  }
                  className="shadow-sm"
                >
                  <div className="mt-3 space-y-6">
                    {TECH_STACKS.map((group, idx) => (
                      <div key={idx}>
                        <div className="mb-3 text-sm font-semibold text-slate-500">{group.category}</div>
                        <div className="flex flex-wrap gap-2">
                          {group.badges.map((badge, bIdx) => (
                            <img key={bIdx} src={badge.src} alt={badge.alt} className="h-6" />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Architecture */}
                <Card title="项目架构树" className="shadow-sm">
                  <pre className="scrollbar-thin scrollbar-track-slate-800 scrollbar-thumb-slate-600 overflow-x-auto rounded-lg bg-slate-800 p-4 text-xs leading-5 text-blue-100">
                    {DIRECTORY_STRUCTURE}
                  </pre>
                </Card>
              </div>
            </Col>

            {/* Right Column: Progress Dashboard */}
            <Col xs={24} lg={10}>
              <div className="space-y-8">
                <Card
                  title={
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <IconClockCircle /> 开发进度看板
                      </span>
                      <Badge status="processing" text="开发中" />
                    </div>
                  }
                  className="h-full shadow-sm"
                  bodyStyle={{ padding: '12px' }}
                >
                  <div className="space-y-4">
                    {TASK_PROGRESS.map((section, idx) => (
                      <div
                        key={idx}
                        className={`rounded-lg border border-${section.color}-100 bg-${section.color}-50 p-4`}
                      >
                        <div className={`mb-3 flex items-center justify-between font-bold text-${section.color}-700`}>
                          <span>{section.title}</span>
                          <span className="text-xs opacity-70">
                            {section.items.filter((i) => i.done).length}/{section.items.length}
                          </span>
                        </div>
                        <div className="space-y-2">
                          {section.items.map((item, iIdx) => (
                            <div key={iIdx} className="flex items-start gap-2 text-sm">
                              <div className="mt-0.5 shrink-0">
                                {item.done ? (
                                  <IconCheckCircle className={`text-${section.color}-600`} />
                                ) : (
                                  <div
                                    className={`h-3.5 w-3.5 rounded-full border-2 border-${section.color}-200 bg-white`}
                                  />
                                )}
                              </div>
                              <span
                                className={`${
                                  item.done ? 'text-slate-600 line-through decoration-slate-400' : 'text-slate-800'
                                }`}
                              >
                                {item.label}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Run Guide */}
                <Card
                  title={
                    <div className="flex items-center gap-2">
                      <IconCommand /> 快速开始
                    </div>
                  }
                  className="shadow-sm"
                >
                  <div className="rounded-md bg-slate-100 p-4 font-mono text-sm text-slate-700">
                    <div className="mb-2 select-all border-b border-slate-200 pb-2">
                      <span className="mr-2 text-slate-400">$</span>
                      git clone git@github.com:Zhongye1/BDdraw_DEV.git
                    </div>
                    <div className="mb-2 select-all border-b border-slate-200 pb-2">
                      <span className="mr-2 text-slate-400">$</span>
                      cd BDdraw_DEV
                    </div>
                    <div className="mb-2 select-all">
                      <span className="mr-2 text-slate-400">$</span>
                      bun install && bun dev
                    </div>
                  </div>
                  <Paragraph className="mt-4 text-xs text-slate-500">* 推荐使用 Bun 包管理器以获得最佳性能</Paragraph>
                </Card>
              </div>
            </Col>
          </Row>

          <Divider />

          <div className="text-center text-slate-400">
            <Text className="text-xs">BDdraw_DEV 字节工训营项目</Text>
          </div>
        </div>
      </div>
    </>
  )
}

Home.getLayout = getDefaultLayout
