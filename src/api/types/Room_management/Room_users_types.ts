// ==============================
// 请求和响应类型定义 - Room Users
// ==============================

// 邀请用户请求体
export interface InviteUserRequest {
  username: string
}

// 邀请用户响应体
export interface InviteUserResponse {
  success: boolean
  message: string
}

// 邀请用户错误响应体
export interface InviteUserErrorResponse {
  error: string
}

// 获取房间成员参数
export interface RoomMembersParam {
  id: string
}

// 房间成员信息
export interface RoomMember {
  id: string
  username: string
}

// 获取房间成员响应体
export type GetRoomMembersResponse = RoomMember[]

// 房间未找到错误响应体
export interface RoomNotFoundErrorResponse {
  error: string
}
