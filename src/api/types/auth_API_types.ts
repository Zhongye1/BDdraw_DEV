// ==============================
// 请求和响应类型定义 - Auth API
// ==============================

// 注册请求体
export interface RegisterRequest {
  username: string
  password: string
}

// 用户信息
export interface User {
  id: string
  username: string
}

// 注册响应体
export interface RegisterResponse {
  token: string
  user: User
}

// 注册错误响应体（用户名已存在）
export interface RegisterErrorResponse {
  error: string
}

// 登录请求体
export interface LoginRequest {
  username: string
  password: string
}

// 登录响应体
export interface LoginResponse {
  token: string
  user: User
}

// 登录错误响应体（无效凭证）
export interface LoginErrorResponse {
  error: string
}
