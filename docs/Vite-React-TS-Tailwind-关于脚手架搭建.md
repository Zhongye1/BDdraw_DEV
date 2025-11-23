## Vite + React + TypeScript + Tailwind CSS 脚手架搭建指南

本文记录从零搭建 `Vite + React + Tailwind CSS` 项目，省去一个个官网去查阅文档，旨在方便快速丝滑的创建项目

### 概览

- **Vite 4.2.0** - 新一代构建工具，提供极快的冷启动和热更新。基于原生 ES 模块实现，开发时按需编译，相比传统打包工具具有显著的速度优势。
- **React 18.2.0** - 流行的前端 UI 库，采用组件化架构和虚拟 DOM 技术，提供高效的渲染性能和良好的开发体验。
- **TypeScript 5.3.3** - JavaScript 的超集，提供静态类型检查，在编译阶段发现潜在错误，增强代码可维护性和开发效率。
- **Tailwind CSS 3.3.1** - 实用优先的 CSS 框架，通过组合预定义的原子类来构建界面，无需编写自定义 CSS 即可实现复杂设计。
- **ESLint & Prettier** - 代码规范和格式化工具。ESLint 用于检测代码质量问题和潜在错误，Prettier 专注于代码格式统一，共同保障代码质量。
- **Husky & lint-staged** - Git 钩子工具，用于提交前代码检查。Husky 简化 Git 钩子配置，lint-staged 仅对暂存文件执行操作，提升提交前检查效率。
- **React Router DOM 6** - React 应用的路由管理工具，提供声明式路由配置，支持动态路由、嵌套路由等特性，是构建单页应用的核心组件。

### 结构

```bash
BDdraw_DEV/
├── .husky/                     # Git hooks 配置
├── .vscode/                    # VSCode 配置
├── docs/                       # 文档目录
├── public/                     # 静态资源目录
├── src/                        # 源代码主目录
│   ├── api/                    # API 接口定义
│   ├── assets/                 # 静态资源文件
│   ├── components/             # 公共组件
│   ├── hooks/                  # 自定义 React Hooks
│   ├── lib/                    # 工具库和核心功能模块
│   ├── pages/                  # 页面组件
│   ├── router/                 # 路由配置
│   │   └── router.tsx          # 路由定义
│   ├── stores/                 # 状态管理
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

```

### 初始化项目

使用 Vite 创建项目

```bash
npm create vite@latest [项目名] -- --template react-ts
cd [项目名]
```

安装依赖

```bash
npm install
```

### 集成 Tailwind CSS v3

Tailwind CSS 是一个功能类优先的 CSS 框架，它提供了大量的实用类，可以直接在 HTML 中组合使用来构建任何设计。通过配置文件可以自定义主题、颜色、间距等设计系统，并且只生成实际使用的样式，使得最终的 CSS 文件非常精简。其 JIT（Just-In-Time）模式可以按需生成样式，大大提高了编译速度并支持更多功能。

安装 Tailwind CSS v3 及其依赖

```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

如果出问题可以去翻一下官方文档，v4 改变了一些部署方式

配置 Tailwind CSS

编辑 `tailwind.config.js` 文件：

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

### 引入 Tailwind CSS v3

在 `src/index.css` 文件中添加：

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

并在入口文件中导入该 CSS 文件：

Tailwind CSS 的三个核心层：

- `@tailwind base` - 包含 Normalize.css 和一些基础样式重置
- `@tailwind components` - 包含框架的组件类，可用于添加结构样式
- `@tailwind utilities` - 包含所有实用类，这是 Tailwind 的核心部分

通过这种分层方式，Tailwind 提供了一种灵活的方式来组织和扩展样式。

### 配置 TypeScript

TypeScript 是 JavaScript 的超集，添加了可选的静态类型。它可以帮助开发者在编码阶段捕获错误，提供更好的代码补全和重构支持。通过配置 `tsconfig.json`，我们可以控制 TypeScript 编译器的行为，如目标 JavaScript 版本、模块解析策略、严格性级别等。在本项目中，我们启用了严格的类型检查，同时配置了 React JSX 支持。

项目中的 `tsconfig.json` 文件已经包含了基本的 TypeScript 配置。根据项目需求，我们可以对其进行定制：

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "useDefineForClassFields": true,
    "lib": ["DOM", "DOM.Iterable", "ESNext"],
    "allowJs": false,
    "skipLibCheck": true,
    "esModuleInterop": false,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "Node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx"
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

### 配置 ESLint 和 Prettier

ESLint 是一个可插拔的 JavaScript 和 TypeScript 代码质量检查工具，它可以识别语法错误和代码风格问题。Prettier 是一个代码格式化工具，专注于代码风格统一。两者结合使用可以确保团队代码质量和风格的一致性。通过配置规则，我们可以自定义检查标准，例如是否使用分号、引号类型、缩进大小等。

安装相关依赖

```bash
npm install -D eslint prettier eslint-config-prettier eslint-plugin-prettier eslint-plugin-react eslint-plugin-react-hooks @typescript-eslint/eslint-plugin @typescript-eslint/parser
```

配置 ESLint

创建 `.eslintrc` 文件：

```json
{
  "env": {
    "browser": true,
    "es2021": true
  },
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "prettier"
  ],
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "ecmaVersion": "latest",
    "sourceType": "module"
  },
  "plugins": ["@typescript-eslint", "react", "prettier"],
  "rules": {
    "prettier/prettier": "error",
    "react/react-in-jsx-scope": "off"
  },
  "settings": {
    "react": {
      "version": "detect"
    }
  }
}
```

配置 Prettier

创建 `.prettierrc` 文件：

```json
{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5"
}
```

### 配置 Git Hooks

Git Hooks 允许我们在 Git 操作的不同阶段执行自定义脚本。通过 Husky 和 lint-staged，我们可以在代码提交前自动运行 ESLint 和 Prettier，确保只有符合规范的代码才能进入代码库。lint-staged 只会针对暂存区的文件运行检查，提高效率。这有助于保持整个项目的代码质量和一致性。

使用 Husky 和 lint-staged 在代码提交前自动运行代码检查和格式化。

安装依赖

```bash
npm install -D husky lint-staged
```

初始化 Husky

```bash
npx husky install
```

配置 lint-staged

创建 `lint-staged.config.js` 文件：

```javascript
module.exports = {
  '*.{ts,tsx}': ['eslint --fix', 'prettier --write'],
  '*.{css,md}': 'prettier --write',
}
```

添加 pre-commit 钩子

```bash
npx husky add .husky/pre-commit "npx lint-staged"
```

### 集成 React Router

React Router 是 React 应用中最流行的路由解决方案，它允许我们构建单页应用程序(SPA)，通过 URL 的变化来展示不同的视图组件。它提供了声明式的路由配置，支持嵌套路由、动态路由参数、编程式导航等功能。通过使用 React Router，我们可以轻松地管理应用的不同页面和视图之间的导航关系。

安装 React Router

```bash
npm install react-router-dom
npm install -D @types/react-router-dom
```

创建路由配置

创建 `src/router/router.tsx` 文件：

```typescript
import { createBrowserRouter } from 'react-router-dom'
import Home from '../pages/Home'
import About from '../pages/About'

const router = createBrowserRouter([
  {
    path: '/',
    element: <Home />,
  },
  {
    path: '/about',
    element: <About />,
  },
])

export default router
```

在应用中使用路由

更新 `src/App.tsx` 文件：

```typescript
import { RouterProvider } from 'react-router-dom'
import router from './router/router'

function App() {
  return <RouterProvider router={router} />
}

export default App
```

创建页面组件

创建 `src/pages/Home.tsx` 和 `src/pages/About.tsx` 文件：

```typescript
// src/pages/Home.tsx
import React from 'react'

const Home: React.FC = () => {
  return (
    <div>
      <h1>首页</h1>
    </div>
  )
}

export default Home
```

```typescript
// src/pages/About.tsx
import React from 'react'

const About: React.FC = () => {
  return (
    <div>
      <h1>关于</h1>
    </div>
  )
}

export default About
```

React Router 是 React 应用中最流行的路由解决方案，它允许我们构建单页应用程序(SPA)，通过 URL 的变化来展示不同的视图组件。它提供了声明式的路由配置，支持嵌套路由、动态路由参数、编程式导航等功能。通过使用 React Router，我们可以轻松地管理应用的不同页面和视图之间的导航关系。

### 配置 Vite

项目的 `vite.config.ts` 文件配置如下：

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  css: {
    postcss: './postcss.config.js',
  },
  server: {
    port: 3000,
  },
})
```

### 配置 PostCSS

PostCSS 是一个使用 JavaScript 插件转换 CSS 的工具。在这个项目中，我们使用了两个关键插件：

- Tailwind CSS 插件：处理 Tailwind CSS 相关的样式生成
- Autoprefixer 插件：自动添加厂商前缀以确保样式在不同浏览器中的兼容性

通过 PostCSS，我们可以自动化处理 CSS，减少手动工作并提高样式兼容性。

`postcss.config.js` 文件配置如下：

```javascript
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

### 添加常用组件和工具

通过创建可复用的 UI 组件和自定义 Hooks，可以大大提高开发效率并保证界面一致性。路径别名的配置使得导入模块更加简洁，避免了复杂的相对路径引用。

创建基础 UI 组件：在 `src/components/ui` 目录下创建一些基础 UI 组件，例如按钮、输入框等

创建自定义 Hooks：在 `src/hooks` 目录下创建常用的自定义 Hooks，例如 `useLocalStorage`、`useToggle` 等

配置路径别名：在 `tsconfig.json` 中配置路径别名，方便导入模块：

```json
{
  "compilerOptions": {
    // ... 其他配置
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

通过创建可复用的 UI 组件和自定义 Hooks，可以大大提高开发效率并保证界面一致性。路径别名的配置使得导入模块更加简洁，避免了复杂的相对路径引用。

### 其他重要配置文件说明

#### .gitignore

`.gitignore` 文件用于指定 Git 应当忽略的文件和目录，防止不必要的文件被提交到代码仓库。在本项目中，该文件包含了以下几类被忽略的内容：

1. **系统文件**：如 macOS 系统生成的 `.DS_Store` 文件
2. **日志文件**：如 npm、yarn 等生成的日志文件
3. **依赖目录**：如 `node_modules/` 目录
4. **构建输出**：如构建工具生成的 `dist/`、`.next/` 等目录
5. **缓存文件**：如各种工具生成的缓存文件
6. **环境变量文件**：如 `.env` 及其变体文件，防止敏感信息泄露
7. **编辑器配置**：如编辑器生成的临时文件

通过合理配置 `.gitignore`，可以减小代码仓库体积，保护敏感信息，并避免无关文件干扰开发。

#### .editorconfig

`.editorconfig` 文件用于统一不同编辑器和 IDE 的代码格式设置。在团队协作中，不同开发者可能使用不同的编辑器，该文件可以确保所有人使用相同的编码规范：

- 使用空格缩进，缩进大小为 2 个空格
- 行尾符使用 LF (Unix 风格)
- 字符编码使用 UTF-8
- 自动删除行尾空白字符
- 文件末尾自动添加新行

这有助于保持代码风格的一致性，避免因编辑器差异导致的格式混乱。

#### .prettierrc.js

Prettier 配置文件，用于统一代码格式化风格：

- 不使用分号结尾
- 对象和数组末尾保留逗号
- 使用单引号而非双引号
- 单行最大宽度为 120 字符
- 缩进使用 2 个空格
- 行尾符自动适应操作系统

Prettier 会在保存文件或执行格式化命令时自动应用这些规则，确保整个项目的代码风格统一。

#### commitlint.config.cjs

Commitlint 配置文件，用于校验 Git 提交信息的格式。它继承了 `@commitlint/config-conventional` 规则，要求提交信息遵循约定式提交规范：

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

其中 type 必须是以下几种之一：

- feat: 新功能
- fix: 修复 bug
- chore: 构建过程或辅助工具的变动
- docs: 文档更新
- style: 代码格式调整
- refactor: 重构
- perf: 性能优化
- test: 测试用例

这有助于生成标准化的变更日志，便于团队理解和维护项目历史。

#### .stylelintrc.json

Stylelint 配置文件，用于检查 CSS/LESS 样式代码的质量和风格。该项目配置了：

- 继承标准规则集和 Prettier 推荐规则
- 支持 LESS 语法
- 启用 Prettier 规则
- 自定义类名命名规范（小写字母和连字符）
- 允许未知的 at-rule（为了支持 LESS 特性）

通过 Stylelint 可以确保样式代码的一致性和质量，避免常见的样式错误。

#### lint-staged.config.js

Lint-staged 配置文件，用于对 Git 暂存区的文件执行检查和格式化：

- 对 TypeScript 文件执行 ESLint 和 Prettier
- 对 JavaScript 文件执行 ESLint 和 Prettier
- 对 LESS 和 CSS 文件执行 Stylelint
- 对其他文件执行相应检查

这确保只有符合规范的代码才能被提交到仓库，提升整体代码质量。

### 开发环境和生产环境配置

开发环境启动

```bash
npm run dev
```

构建生产版本

```bash
npm run build
```

预览生产构建

```bash
npm run preview
```
