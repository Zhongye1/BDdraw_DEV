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
  creator_id?: string // 可选字段
  activeUsers?: number // 可选字段
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

// API 响应包装器
export interface ApiResponse<T> {
  data: T
  success?: boolean
  message?: string
}

// 房间列表响应 - 直接返回房间数组
export type RoomsResponse = RoomBasic[]

// 房间分页结果
export interface PaginatedRoomsResult {
  rooms: Array<{
    id: string
    name: string
    creator_id: string
    creator_name: string
    created_at?: string
    member_count: number
  }>
  pagination: {
    page: number
    limit: number
    total: number
  }
}

// 搜索房间请求查询参数
export interface SearchRoomsQuery {
  q: string
  page?: string
  limit?: string
}

// 浏览房间请求查询参数
export interface BrowseRoomsQuery {
  page?: string
  limit?: string
}

// 创建房间响应 - 直接返回房间详情
export type CreateRoomResponse = RoomDetail

// 房间详情响应 - 直接返回房间详情
export type RoomDetailResponse = RoomDetail

// 房间成员响应 - 直接返回成员数组
export type RoomMembersResponse = Member[]

// 邀请用户响应 - 直接返回成功响应
export type InviteUserResponse = SuccessResponse

// 删除房间响应 - 直接返回成功响应
export type DeleteRoomResponse = SuccessResponse

// 实际的 API 响应格式（如果 API 实际返回的是 { data: T } 格式）
export type ActualApiResponse<T> = {
  data: T
  [key: string]: any // 允许其他属性
}

// 错误响应
export interface ErrorResponse {
  error: string
}
