import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Modal } from '@arco-design/web-react'

interface ProtectedRouteProps {
  children: React.ReactNode
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const navigate = useNavigate()
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token')
      if (!token) {
        handleLogout()
        return
      }

      try {
        // 调用后端API验证token有效性
        const response = await fetch('/api/auth/validate', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          handleLogout()
        } else {
          setIsChecking(false)
        }
      } catch (error) {
        console.error('Token validation error:', error)
        handleLogout()
      }
    }

    checkAuth()
  }, [navigate])

  const handleLogout = () => {
    // 清除本地存储
    localStorage.removeItem('token')
    localStorage.removeItem('user')

    // 发送自定义事件通知其他组件更新登录状态
    window.dispatchEvent(new CustomEvent('user-login-status-changed', { detail: { isLoggedIn: false } }))

    // 显示提示信息并跳转到登录页面
    Modal.info({
      title: '登录已过期',
      content: '您的登录会话已过期，请重新登录。',
      onOk: () => {
        navigate('/login')
      },
    })
  }

  if (isChecking) {
    return <div className="flex h-screen items-center justify-center">验证中...</div>
  }

  return <>{children}</>
}

export default ProtectedRoute
