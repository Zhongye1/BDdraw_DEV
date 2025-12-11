// --- START OF FILE auth.ts ---
import { SignJWT, jwtVerify } from 'jose'

// 建议将密钥放入 .env 文件
const SECRET_KEY = new TextEncoder().encode(process.env.JWT_SECRET || 'my-super-secret-key')

export async function createToken(payload: { id: string; username: string }) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h') // Token 有效期 24 小时
    .sign(SECRET_KEY)
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY)
    return payload as { id: string; username: string }
  } catch (e) {
    console.error('[Auth] Token verification failed:', e)
    return null
  }
}

// 密码工具
export const hashPassword = async (password: string) => Bun.password.hash(password)
export const verifyPassword = async (password: string, hash: string) => Bun.password.verify(password, hash)
