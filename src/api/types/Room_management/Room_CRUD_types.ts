// ==============================
// 请求和响应类型定义 - Room CRUD
// ==============================

// 创建房间请求体
export interface CreateRoomRequest {
  name: string
}

// 创建房间响应体
export interface CreateRoomResponse {
  roomId: string
  name: string
  creator: string
}

// 房间参数（用于获取、更新、删除）
export interface RoomParam {
  id: string
}

// 获取房间响应体
export interface GetRoomResponse {
  id: string
  name: string
  creator_id: string
  created_at?: string
  activeUsers: number
}

// 删除房间响应体
export interface DeleteRoomResponse {
  success: boolean
  message: string
}

// 删除房间错误响应体
export interface DeleteRoomErrorResponse {
  error: string
}

// 更新房间请求体
export interface UpdateRoomRequest {
  name: string
}

// 更新房间响应体
export interface UpdateRoomResponse {
  id: string
  name: string
  creator_id: string
  created_at?: string
}

// 权限不足错误响应体
export interface PermissionErrorResponse {
  error: string
}

// 房间未找到错误响应体
export interface RoomNotFoundResponse {
  error: string
}
