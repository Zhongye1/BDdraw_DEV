import apiClient, { makeCancelableRequest, cancelRequest } from './utils/apiClient'

// 用户认证
export const registerUser = async (username: string, password: string) => {
  try {
    const config = makeCancelableRequest({
      method: 'post',
      url: '/auth/register',
      data: { username, password },
    })
    return await apiClient(config)
  } catch (error) {
    console.error('注册失败:', error)
    throw error
  }
}

export const loginUser = async (username: string, password: string) => {
  try {
    const config = makeCancelableRequest({
      method: 'post',
      url: '/auth/login',
      data: { username, password },
    })
    return await apiClient(config)
  } catch (error) {
    console.error('登录失败:', error)
    throw error
  }
}

// 房间管理
export const createRoom = async (name: string, token: string) => {
  try {
    const config = makeCancelableRequest({
      method: 'post',
      url: '/rooms',
      data: { name },
      headers: { Authorization: `Bearer ${token}` },
    })
    return await apiClient(config)
  } catch (error) {
    console.error('创建房间失败:', error)
    throw error
  }
}

export const listRooms = async (token: string) => {
  try {
    const config = makeCancelableRequest({
      method: 'get',
      url: '/rooms',
      headers: { Authorization: `Bearer ${token}` },
    })
    return await apiClient(config)
  } catch (error) {
    console.error('列出房间失败:', error)
    throw error
  }
}

export const getRoomDetails = async (roomId: string, token: string) => {
  try {
    const config = makeCancelableRequest({
      method: 'get',
      url: `/rooms/${roomId}`,
      headers: { Authorization: `Bearer ${token}` },
    })
    return await apiClient(config)
  } catch (error) {
    console.error('获取房间详情失败:', error)
    throw error
  }
}

export const inviteUserToRoom = async (roomId: string, username: string, token: string) => {
  try {
    const config = makeCancelableRequest({
      method: 'post',
      url: `/rooms/${roomId}/invite`,
      data: { username },
      headers: { Authorization: `Bearer ${token}` },
    })
    return await apiClient(config)
  } catch (error) {
    console.error('邀请用户到房间失败:', error)
    throw error
  }
}

export const getRoomMembers = async (roomId: string, token: string) => {
  try {
    const config = makeCancelableRequest({
      method: 'get',
      url: `/rooms/${roomId}/members`,
      headers: { Authorization: `Bearer ${token}` },
    })
    return await apiClient(config)
  } catch (error) {
    console.error('获取房间成员失败:', error)
    throw error
  }
}

export const deleteRoom = async (roomId: string, token: string) => {
  try {
    const config = makeCancelableRequest({
      method: 'delete',
      url: `/rooms/${roomId}`,
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
