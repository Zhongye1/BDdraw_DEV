// 自动生成的接口类型定义

// 用户注册请求
export interface RegisterRequest {
  username: string
  password: string
}

// 用户登录请求
export interface LoginRequest {
  username: string
  password: string
}

// 认证响应
export interface AuthResponse {
  token: string
  user: {
    id: string
    username: string
  }
}

// 创建房间请求
export interface CreateRoomRequest {
  name: string
}

// 房间基本信息
export interface RoomBasic {
  id: string
  name: string
  created_at?: string // 可选字段
}

// 房间详情信息
export interface RoomDetail extends RoomBasic {
  creator_id: string
  activeUsers: number
}

// 邀请用户加入房间请求
export interface InviteUserRequest {
  username: string
}

// 成员信息
export interface Member {
  id: string
  username: string
}

// 通用成功响应
export interface SuccessResponse {
  success: boolean
  message: string
}

// 错误响应
export interface ErrorResponse {
  error: string
}
