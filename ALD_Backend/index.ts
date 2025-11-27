import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { collabServer } from './src/collab'
import db from './src/db'
import { createServer } from 'http'

// 添加 OpenAPI 相关导入
import { OpenAPIHono } from '@hono/zod-openapi'

// 导入API路由模块
import authApp from './src/api/USER_management/auth_API'
import roomsApp from './src/api/Room_management/CORE'

type Variables = {
  user: {
    id: string
    username: string
  }
}

// 使用 OpenAPIHono 替代 Hono
const app = new OpenAPIHono<{ Variables: Variables }>()

// --- API 文档路由 ---
// OpenAPI 规范端点
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
const wsServer = createServer(async (req, res) => {
  // 处理 HTTP 请求
  try {
    // 将 Node.js 的 req/res 转换为 Hono 可以处理的 Request 对象
    const url = `http://${req.headers.host}${req.url}`
    const body = req.method !== 'GET' && req.method !== 'HEAD' ? await getRawBody(req) : null

    const request = new Request(url, {
      method: req.method,
      headers: getHeaders(req.headers),
      body: body,
    })

    const response = await app.fetch(request)

    // 将 Hono 的 Response 对象转换为 Node.js 响应
    res.writeHead(response.status, Object.fromEntries(response.headers.entries()))
    if (response.body) {
      const reader = response.body.getReader()
      if (response.body) {
        for await (const chunk of response.body) {
          res.write(chunk)
        }
        res.end()
      }
    }
    res.end()
  } catch (err) {
    console.error('Error handling request:', err)
    res.statusCode = 500
    res.end('Internal Server Error')
  }
})

// 辅助函数：获取原始请求体
function getRawBody(req: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

// 辅助函数：转换请求头
function getHeaders(headers: any): Record<string, string> {
  const result: Record<string, string> = {}
  for (const [key, value] of Object.entries(headers)) {
    if (Array.isArray(value)) {
      result[key] = value.join(', ')
    } else if (typeof value === 'string') {
      result[key] = value
    }
  }
  return result
}

// 使用 handleConnection 处理 WebSocket 升级请求
wsServer.on('upgrade', (request, socket, head) => {
  try {
    // 检查路径是否为协作端点
    if (request.url?.startsWith('/collaboration')) {
      collabServer.handleConnection(socket, request)
    } else {
      // 如果不是协作端点，销毁 socket
      socket.destroy()
    }
  } catch (error) {
    console.error('WebSocket upgrade error:', error)
    socket.destroy()
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
  console.log('websocket服务 ws://localhost:1234')
})

// 2. 启动 API 服务 (端口 3000)
export default {
  port: 3000,
  fetch: app.fetch,
}

console.log('API服务运行在 http://localhost:3000')
console.log('API文档 http://localhost:3000/swagger-ui')
