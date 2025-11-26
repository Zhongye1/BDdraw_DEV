import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import db from '../db'
import { createToken, hashPassword, verifyPassword } from '../auth'

type Variables = {
  user: {
    id: string
    username: string
  }
}

const authApp = new OpenAPIHono<{ Variables: Variables }>()

// 定义注册路由和模式
const registerRoute = createRoute({
  method: 'post',
  path: '/api/auth/register',
  summary: '用户注册',
  description: '注册新用户账号',
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.object({
            username: z.string().min(1).openapi({
              example: 'john_doe',
              description: '用户名',
            }),
            password: z.string().min(6).openapi({
              example: 'securepassword',
              description: '密码（至少6位）',
            }),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: '注册成功',
      content: {
        'application/json': {
          schema: z.object({
            token: z.string().openapi({ description: 'JWT 访问令牌' }),
            user: z
              .object({
                id: z.string().uuid(),
                username: z.string(),
              })
              .openapi({ description: '用户信息' }),
          }),
        },
      },
    },
    400: {
      description: '用户名已存在',
      content: {
        'application/json': {
          schema: z.object({
            error: z.string(),
          }),
        },
      },
    },
  },
})

// 注册
authApp.openapi(registerRoute, async (c) => {
  const { username, password } = await c.req.json()
  const id = crypto.randomUUID()
  const hashed = await hashPassword(password)

  try {
    db.query('INSERT INTO users (id, username, password_hash) VALUES ($id, $username, $hash)').run({
      $id: id,
      $username: username,
      $hash: hashed,
    })

    const token = await createToken({ id, username })
    return c.json({ token, user: { id, username } }, 200)
  } catch (e) {
    return c.json({ error: 'Username already exists' }, 400)
  }
})

// 定义登录路由和模式
const loginRoute = createRoute({
  method: 'post',
  path: '/api/auth/login',
  summary: '用户登录',
  description: '使用已有账户登录',
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.object({
            username: z.string().min(1).openapi({
              example: 'john_doe',
              description: '用户名',
            }),
            password: z.string().min(1).openapi({
              example: 'securepassword',
              description: '密码',
            }),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: '登录成功',
      content: {
        'application/json': {
          schema: z.object({
            token: z.string().openapi({ description: 'JWT 访问令牌' }),
            user: z
              .object({
                id: z.string().uuid(),
                username: z.string(),
              })
              .openapi({ description: '用户信息' }),
          }),
        },
      },
    },
    401: {
      description: '无效凭证',
      content: {
        'application/json': {
          schema: z.object({
            error: z.string(),
          }),
        },
      },
    },
  },
})

// 登录
authApp.openapi(loginRoute, async (c) => {
  const { username, password } = await c.req.json()
  const user = db.query('SELECT * FROM users WHERE username = $username').get({ $username: username }) as any

  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return c.json({ error: 'Invalid credentials' }, 401)
  }

  const token = await createToken({ id: user.id, username: user.username })
  return c.json({ token, user: { id: user.id, username: user.username } }, 200)
})

export default authApp
