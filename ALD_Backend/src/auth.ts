import { SignJWT, jwtVerify } from 'jose'

const SECRET_KEY = new TextEncoder().encode(process.env.JWT_SECRET || 'my-super-secret-key')

export async function createToken(payload: { id: string; username: string }) {
  return await new SignJWT(payload).setProtectedHeader({ alg: 'HS256' }).setExpirationTime('24h').sign(SECRET_KEY)
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY)
    return payload as { id: string; username: string }
  } catch (e) {
    return null
  }
}

// 密码哈希工具
export const hashPassword = async (password: string) => Bun.password.hash(password)
export const verifyPassword = async (password: string, hash: string) => Bun.password.verify(password, hash)
