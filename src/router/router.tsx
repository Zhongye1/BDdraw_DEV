import React from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import Home from '@/pages/home'
import CanvasPage from '@/pages/canvas'
import IntroPage from '@/pages/intro'
import Login from '@/pages/auth/Login'
import Register from '@/pages/auth/Register'
import RoomManagement from '@/pages/room/RoomManagement'
import ErrorPage from '@/components/error-page'
import { Header } from '@/components/header'
import AnimatedRoutes from '@/components/AnimatedRoutes'
import Settings from '@/components/settings/setting'

// 自定义组件，用于处理默认画布路由
const DefaultCanvasRoute: React.FC = () => {
  const lastRoomId = localStorage.getItem('lastRoomId')
  console.log('[Router] Last room ID from localStorage:', lastRoomId)

  if (lastRoomId) {
    // 如果存在上次访问的房间ID，则重定向到该房间
    return <Navigate to={`/canvas/${lastRoomId}`} replace />
  } else {
    // 否则使用默认画布
    return (
      <>
        <Header />
        <div className="pt-16">
          <CanvasPage />
        </div>
      </>
    )
  }
}

// 布局组件，包含公共的头部和页面容器
const Layout = ({ children }: { children: React.ReactNode }) => (
  <>
    <Header />
    <div className="pt-16">{children}</div>
  </>
)

// 主布局组件，包含动画和公共布局
const MainLayout = () => (
  <Layout>
    <AnimatedRoutes />
  </Layout>
)

const router = createBrowserRouter(
  [
    {
      element: <MainLayout />,
      children: [
        {
          path: '/',
          element: <Home />,
        },
        {
          path: '/canvas',
          element: <DefaultCanvasRoute />,
        },
        {
          path: '/canvas/:roomId',
          element: <CanvasPage />,
        },
        {
          path: '/intro',
          element: <IntroPage />,
        },
        {
          path: '/login',
          element: <Login />,
        },
        {
          path: '/register',
          element: <Register />,
        },
        {
          path: '/rooms',
          element: <RoomManagement />,
        },
        {
          path: '/home',
          element: <Home />,
          errorElement: <ErrorPage />,
        },
        {
          path: '/settings',
          element: <Settings />,
        },
      ],
    },
  ],
  {
    basename: '/BDdraw_DEV/',
  },
)

export default router
