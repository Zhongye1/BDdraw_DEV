// ==============================
// 请求和响应类型定义 - Room List
// ==============================

// 房间基本信息
export interface RoomInfo {
  id: string
  name: string
  creator_id: string
  creator_name: string
  created_at?: string
  member_count: number
}

// 获取房间列表响应体
export type ListRoomsResponse = RoomInfo[]

// 浏览房间查询参数
export interface BrowseRoomsQuery {
  page?: string
  limit?: string
}

// 浏览房间响应体
export interface BrowseRoomsResponse {
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

// 搜索房间查询参数
export interface SearchRoomsQuery {
  q: string
  page?: string
  limit?: string
}

// 搜索房间响应体（与浏览房间响应体相同）
export interface SearchRoomsResponse {
  rooms: RoomInfo[]
  pagination: {
    page: number
    limit: number
    total: number
  }
}
