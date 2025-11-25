import axios, { AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios'

// 创建一个用于存储请求取消函数的Map
const requestCancelMap = new Map<string, () => void>()

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 添加请求拦截器
apiClient.interceptors.request.use(
  (config) => {
    // 在这里可以添加额外的请求头或进行其他预处理操作
    return config
  },
  (error) => {
    return Promise.reject(error)
  },
)

// 添加响应拦截器
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    // 移除已完成请求的取消函数
    const url = response.config.url || ''
    if (requestCancelMap.has(url)) {
      requestCancelMap.delete(url)
    }
    return response.data
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      try {
        // 这里可以调用刷新token的API
        // const newToken = await refreshToken()
        // setAuthToken(newToken)
        // originalRequest.headers['Authorization'] = `Bearer ${newToken}`
        // return apiClient(originalRequest)
      } catch (refreshError) {
        // 处理刷新token失败的情况，例如跳转到登录页
      }
    }

    return Promise.reject(error)
  },
)

export const setAuthToken = (token: string) => {
  apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`
}

export const clearAuthToken = () => {
  delete apiClient.defaults.headers.common['Authorization']
}

export const cancelRequest = (url: string) => {
  if (requestCancelMap.has(url)) {
    const cancel = requestCancelMap.get(url)
    if (cancel) {
      cancel()
      requestCancelMap.delete(url)
    }
  }
}

// 修改请求配置以支持取消功能
export const makeCancelableRequest = (config: AxiosRequestConfig<any>): AxiosRequestConfig => {
  const source = axios.CancelToken.source()
  const url = config.url || ''
  requestCancelMap.set(url, source.cancel)
  return {
    ...config,
    cancelToken: source.token,
  }
}

export default apiClient
