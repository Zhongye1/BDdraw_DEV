import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { collabServer } from './src/collab'
import db from './src/db'
import { createServer } from 'http'

// 添加 OpenAPI 相关导入
import { OpenAPIHono } from '@hono/zod-openapi'

// 导入API路由模块
import authApp from './src/api/auth'
import roomsApp from './src/api/rooms'

type Variables = {
  user: {
    id: string
    username: string
  }
}

// 使用 OpenAPIHono 替代 Hono
const app = new OpenAPIHono<{ Variables: Variables }>()

// --- API 文档路由 ---
// OpenAPI 规范端点 (放在 CORS 之前，避免认证检查)
app.doc('/doc', {
  openapi: '3.0.0',
  info: {
    version: '1.0.0',
    title: 'ALD Backend API',
    description: 'ALD 协作绘图应用的后端 API 文档',
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: '本地开发服务器',
    },
  ],
})

// Swagger UI 端点 (放在 CORS 之前，避免认证检查)
app.get('/swagger-ui', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>ALD Backend API 文档</title>
        <meta charset="utf-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@4/swagger-ui.css">
      </head>
      <body>
        <div id="swagger-ui"></div>
        <script src="https://unpkg.com/swagger-ui-dist@4/swagger-ui-bundle.js"></script>
        <script>
          SwaggerUIBundle({
            url: '/doc',
            dom_id: '#swagger-ui'
          })
        </script>
      </body>
    </html>
  `)
})

// 中间件：跨域和错误处理
app.use('/api/*', cors())

// 全局错误处理中间件
app.onError((err, c) => {
  console.error('Unhandled error:', err)
  // 防止服务器因未处理的错误而崩溃
  return c.json({ error: 'Internal Server Error' }, 500)
})

// 挂载API路由模块
app.route('/', authApp)
app.route('/', roomsApp)

// --- 启动服务 ---

// 1. 启动 WebSocket 服务 (独立端口 1234)
const wsServer = createServer()
// 使用 handleConnection 替代 attach 方法
wsServer.on('upgrade', (request, socket, head) => {
  try {
    collabServer.handleConnection(socket, request)
  } catch (error) {
    console.error('WebSocket upgrade error:', error)
  }
})

// 添加全局未捕获异常处理
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err)
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason)
})

wsServer.listen(1234, () => {
  console.log('🔌 WebSocket Server running on ws://localhost:1234')
})

// 2. 启动 API 服务 (端口 3000)
export default {
  port: 3000,
  fetch: app.fetch,
}

console.log('🚀 API Server running on http://localhost:3000')
console.log('📖 API Documentation available at http://localhost:3000/swagger-ui')
