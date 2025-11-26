import apiClient, { makeCancelableRequest, cancelRequest } from './utils/apiClient'
import {
  AuthResponse,
  RoomsResponse,
  CreateRoomResponse,
  RoomDetailResponse,
  RoomMembersResponse,
  InviteUserResponse,
  DeleteRoomResponse,
  PaginatedRoomsResult,
  SearchRoomsQuery,
  BrowseRoomsQuery,
} from './types/types'

// 用户认证
export const registerUser = async (username: string, password: string): Promise<AuthResponse> => {
  try {
    const config = makeCancelableRequest({
      method: 'post',
      url: '/api/auth/register',
      data: { username, password },
    })
    return await apiClient(config)
  } catch (error) {
    console.error('注册失败:', error)
    throw error
  }
}

export const loginUser = async (username: string, password: string): Promise<AuthResponse> => {
  try {
    const config = makeCancelableRequest({
      method: 'post',
      url: '/api/auth/login',
      data: { username, password },
    })
    return await apiClient(config)
  } catch (error) {
    console.error('登录失败:', error)
    throw error
  }
}

// 房间管理
export const createRoom = async (name: string, token: string): Promise<CreateRoomResponse> => {
  try {
    const config = makeCancelableRequest({
      method: 'post',
      url: '/api/rooms',
      data: { name },
      headers: { Authorization: `Bearer ${token}` },
    })
    return await apiClient(config)
  } catch (error) {
    console.error('创建房间失败:', error)
    throw error
  }
}

export const listRooms = async (token: string): Promise<RoomsResponse> => {
  try {
    const config = makeCancelableRequest({
      method: 'get',
      url: '/api/rooms',
      headers: { Authorization: `Bearer ${token}` },
    })
    return await apiClient(config)
  } catch (error) {
    console.error('列出房间失败:', error)
    throw error
  }
}

export const browseRooms = async (token: string, params?: BrowseRoomsQuery): Promise<PaginatedRoomsResult> => {
  try {
    const config = makeCancelableRequest({
      method: 'get',
      url: '/api/rooms/browse',
      params,
      headers: { Authorization: `Bearer ${token}` },
    })
    return await apiClient(config)
  } catch (error) {
    console.error('浏览房间失败:', error)
    throw error
  }
}

export const searchRooms = async (
  keyword: string,
  token: string,
  params?: Omit<SearchRoomsQuery, 'q'>,
): Promise<PaginatedRoomsResult> => {
  try {
    const config = makeCancelableRequest({
      method: 'get',
      url: '/api/rooms/search',
      params: { q: keyword, ...params },
      headers: { Authorization: `Bearer ${token}` },
    })
    return await apiClient(config)
  } catch (error) {
    console.error('搜索房间失败:', error)
    throw error
  }
}

export const getRoomDetails = async (roomId: string, token: string): Promise<RoomDetailResponse> => {
  try {
    const config = makeCancelableRequest({
      method: 'get',
      url: `/api/rooms/${roomId}`,
      headers: { Authorization: `Bearer ${token}` },
    })
    return await apiClient(config)
  } catch (error) {
    console.error('获取房间详情失败:', error)
    throw error
  }
}

export const inviteUserToRoom = async (
  roomId: string,
  username: string,
  token: string,
): Promise<InviteUserResponse> => {
  try {
    const config = makeCancelableRequest({
      method: 'post',
      url: `/api/rooms/${roomId}/invite`,
      data: { username },
      headers: { Authorization: `Bearer ${token}` },
    })
    return await apiClient(config)
  } catch (error) {
    console.error('邀请用户到房间失败:', error)
    throw error
  }
}

export const getRoomMembers = async (roomId: string, token: string): Promise<RoomMembersResponse> => {
  try {
    const config = makeCancelableRequest({
      method: 'get',
      url: `/api/rooms/${roomId}/members`,
      headers: { Authorization: `Bearer ${token}` },
    })
    return await apiClient(config)
  } catch (error) {
    console.error('获取房间成员失败:', error)
    throw error
  }
}

export const deleteRoom = async (roomId: string, token: string): Promise<DeleteRoomResponse> => {
  try {
    const config = makeCancelableRequest({
      method: 'delete',
      url: `/api/rooms/${roomId}`,
      headers: { Authorization: `Bearer ${token}` },
    })
    return await apiClient(config)
  } catch (error) {
    console.error('删除房间失败:', error)
    throw error
  }
}

// 取消请求示例
export const cancelApiRequest = (url: string) => {
  cancelRequest(url)
}
