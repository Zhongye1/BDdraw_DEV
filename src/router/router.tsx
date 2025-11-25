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

const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <Navigate to="/canvas" replace />,
    },
    {
      path: '/canvas',
      element: (
        <>
          <Header />
          <div className="pt-16">
            <CanvasPage />
          </div>
        </>
      ),
    },
    {
      path: '/canvas/:roomId',
      element: (
        <>
          <Header />
          <div className="pt-16">
            <CanvasPage />
          </div>
        </>
      ),
    },
    {
      path: '/intro',
      element: (
        <>
          <Header />
          <div className="pt-16">
            <IntroPage />
          </div>
        </>
      ),
    },
    {
      path: '/login',
      element: (
        <>
          <Header />
          <div className="pt-16">
            <Login />
          </div>
        </>
      ),
    },
    {
      path: '/register',
      element: (
        <>
          <Header />
          <div className="pt-16">
            <Register />
          </div>
        </>
      ),
    },
    {
      path: '/rooms',
      element: (
        <>
          <Header />
          <div className="pt-16">
            <RoomManagement />
          </div>
        </>
      ),
    },
    {
      path: '/home',
      element: (
        <>
          <Header />
          <div className="pt-16">
            <Home />
          </div>
        </>
      ),
      errorElement: <ErrorPage />,
    },
  ],
  {
    basename: '/BDdraw_DEV/',
  },
)

export default router
