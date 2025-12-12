// --- START OF FILE index.ts ---
import { serve } from '@hono/node-server'
import { OpenAPIHono } from '@hono/zod-openapi'
import { cors } from 'hono/cors'
import { collabServer } from './src/collab'
import { WebSocketServer } from 'ws' // [新增] 引入 ws 库

// 导入你的 API 路由
import authApp from './src/api/USER_management/auth_API'
import roomsApp from './src/api/Room_management/CORE'

// ---------------------------------------------------------
// 1. Web API 设置 (Hono)
// ---------------------------------------------------------
const app = new OpenAPIHono()

// CORS 设置
app.use(
  '/*',
  cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'Upgrade', 'Connection'],
    exposeHeaders: ['Content-Length', 'X-Kuma-Revision'],
    maxAge: 600,
    credentials: true,
  }),
)

app.onError((err, c) => {
  console.error('[API Error]', err)
  return c.json({ error: 'Internal Server Error', message: err.message }, 500)
})

app.doc('/doc', {
  openapi: '3.0.0',
  info: { title: 'ALD API', version: '1.0.0' },
})
app.get('/swagger-ui', (c) =>
  c.html(`
  <!DOCTYPE html><html><head><title>API Docs</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@4/swagger-ui.css"></head>
  <body><div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@4/swagger-ui-bundle.js"></script>
  <script>SwaggerUIBundle({url:'/doc',dom_id:'#swagger-ui'})</script></body></html>
`),
)

// 正确挂载认证和房间路由
app.route('/api/auth', authApp)
app.route('/api', roomsApp)

// ---------------------------------------------------------
// 2. 准备 WebSocket 服务器实例 (用于处理握手)
// ---------------------------------------------------------
// noServer: true 表示我们不创建新的 http 服务器，而是依附于 Hono 的 server
const wss = new WebSocketServer({ noServer: true })

// ---------------------------------------------------------
// 3. 启动服务器
// ---------------------------------------------------------
const PORT = 3000

console.log(`[System] Starting server on port ${PORT}...`)

const server = serve(
  {
    fetch: app.fetch,
    port: PORT,
  },
  (info) => {
    console.log(`[System] HTTP API ready at http://localhost:${info.port}`)
    console.log(`[System] WebSocket ready at ws://localhost:${info.port}/collaboration/{roomId}`)
  },
)

// ---------------------------------------------------------
// 4. 手动处理 WebSocket Upgrade (修复版)
// ---------------------------------------------------------
server.on('upgrade', (request, socket, head) => {
  const url = request.url || ''

  // [修改] 统一判定逻辑，只允许以 /collaboration/ 开头的 WebSocket 连接
  // 这样无论 roomId 是不是 UUID 都能正常工作
  const isCollab = url.startsWith('/collaboration/')

  console.log(`[Upgrade] Request URL: ${url}, Is collaboration request: ${isCollab}`)

  if (isCollab) {
    wss.handleUpgrade(request, socket, head, (ws) => {
      console.log(`[Upgrade] Handling collaboration connection for URL: ${url}`)
      // 传递完整的request对象，确保Hocuspocus能正确处理URL参数
      collabServer.handleConnection(ws, request)
    })
  } else {
    console.log(`[Upgrade] Non-collaboration request, destroying socket`)
    socket.destroy()
  }
})

// ---------------------------------------------------------
// 5. 异常处理
// ---------------------------------------------------------
process.on('uncaughtException', (err: any) => {
  // 忽略 Hocuspocus 在 Bun/Node 兼容层下的已知噪音
  if (err.message && err.message.includes('undefined is not an object') && err.message.includes('reason.toString')) {
    return
  }
  console.error('[Uncaught Exception]', err)
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Unhandled Rejection]', reason)
})
