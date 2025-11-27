import React, { ReactNode, useState, useEffect } from 'react'
import { Notification, Dropdown, Menu, Avatar } from '@arco-design/web-react'
import { IconGithub, IconUser, IconExport, IconLanguage, IconSettings } from '@arco-design/web-react/icon'
import { useNavigate, useLocation } from 'react-router-dom'

interface IProps {
  leftNode?: ReactNode
}

export function Header(props: IProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [username, setUsername] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('token')
    const userStr = localStorage.getItem('user')

    if (token && userStr) {
      setIsLoggedIn(true)
      try {
        const user = JSON.parse(userStr)
        setUsername(user.username)
      } catch (e) {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        setIsLoggedIn(false)
      }
    } else {
      setIsLoggedIn(false)
    }
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setIsLoggedIn(false)
    Notification.success({
      title: '退出成功',
      content: '您已安全退出系统',
    })
    navigate('/login')
  }

  const showLoginRequired = () => {
    Notification.warning({
      title: '需要登录',
      content: '此功能在离线模式下不可用，请先登录',
    })
  }

  // 用户下拉菜单
  const userMenu = (
    <Menu className="w-36 font-medium">
      <Menu.Item key="profile" onClick={() => (isLoggedIn ? navigate('/rooms') : showLoginRequired())}>
        <IconUser className="mr-2" />
        房间管理
      </Menu.Item>
      <Menu.Item key="logout" onClick={handleLogout}>
        <IconExport className="mr-2" />
        退出登录
      </Menu.Item>
    </Menu>
  )

  // 导航链接组件
  const NavLink = ({
    label,
    path,
    active = false,
    onClick,
  }: {
    label: string
    path?: string
    active?: boolean
    onClick?: () => void
  }) => (
    <div
      onClick={onClick || (() => path && navigate(path))}
      className={`
        flex cursor-pointer items-center px-1 py-4 text-[14px] font-medium transition-colors
        ${
          active || location.pathname === path
            ? 'border-b-2 border-[#1a73e8] text-[#1a73e8]' // 选中态：安卓蓝
            : 'border-b-2 border-transparent text-[#5f6368] hover:text-[#202124]' // 默认态：深灰
        }
      `}
    >
      {label}
    </div>
  )

  // 获取当前房间ID（如果在画布页面）
  const getCurrentRoomId = () => {
    const match = location.pathname.match(/^\/canvas\/(.+)$/)
    return match ? match[1] : null
  }

  return (
    <header className="fixed left-0 top-0 z-50 w-full border-b border-gray-200 bg-white">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo + 导航 */}
        <div className="flex items-center gap-8">
          <div className="flex cursor-pointer items-center gap-2" onClick={() => navigate('/home')}>
            <div className="flex h-8 w-8 items-center justify-center rounded text-blue-600">
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-7 w-7">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </div>
            <span className="text-[20px] font-medium tracking-tight text-[#202124]">
              BDdraw<span className="ml-1 text-base font-normal text-gray-500">_DEV</span>
            </span>
          </div>

          <nav className="hidden h-16 items-center space-x-6 md:flex">
            <NavLink
              label="画布"
              onClick={() => {
                const currentRoomId = getCurrentRoomId()
                const lastRoomId = localStorage.getItem('lastRoomId')
                console.log('[Header] Current location:', location.pathname)
                console.log('[Header] Current room ID:', currentRoomId)
                console.log('[Header] Last room ID:', lastRoomId)
                if (currentRoomId) {
                  console.log('[Header] Navigating to room:', `/canvas/${currentRoomId}`)
                  navigate(`/canvas/${currentRoomId}`)
                } else if (lastRoomId) {
                  console.log('[Header] Navigating to last room:', `/canvas/${lastRoomId}`)
                  navigate(`/canvas/${lastRoomId}`)
                } else {
                  console.log('[Header] Navigating to default canvas')
                  navigate('/canvas')
                }
              }}
              active={location.pathname === '/canvas' || location.pathname.startsWith('/canvas/')}
            />
            <div className="group relative flex h-full items-center">
              <NavLink
                label="房间管理"
                onClick={() => (isLoggedIn ? navigate('/rooms') : showLoginRequired())}
                active={location.pathname === '/rooms'}
              />
            </div>
            <NavLink label="关于项目" path="/home" />
          </nav>
        </div>

        <div className="flex items-center gap-3 md:gap-5">
          {/* 用户头像 / 登录按钮 */}
          {isLoggedIn ? (
            <Dropdown droplist={userMenu} position="br">
              <div className="ml-2 cursor-pointer transition-transform hover:scale-105">
                <Avatar size={32} className="bg-[#1a73e8]">
                  {username ? username[0].toUpperCase() : <IconUser />}
                </Avatar>
              </div>
            </Dropdown>
          ) : (
            <button
              onClick={() => navigate('/login')}
              className="ml-2 rounded-md bg-[#1a73e8] px-5 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#1557b0]"
            >
              登录
            </button>
          )}

          <div className="hidden h-6 w-[1px] bg-gray-300 sm:block"></div>

          {/* 功能图标区 */}
          <div className="flex items-center space-x-1">
            <button
              onClick={() => window.open('https://github.com/Zhongye1/BDdraw_DEV', '_blank')}
              className="hidden rounded-full p-2 text-[#5f6368] transition-all hover:bg-gray-100 hover:text-[#202124] sm:flex"
              title="GitHub"
            >
              <IconGithub className="text-xl" />
            </button>

            <button
              className="hidden rounded-full p-2 text-[#5f6368] transition-all hover:bg-gray-100 hover:text-[#202124] sm:flex"
              onClick={() => {
                Notification.info({
                  title: '功能提示',
                  content: '多语言功能暂未实现',
                })
              }}
            >
              <IconLanguage className="text-xl" />
            </button>
            <button
              className="hidden rounded-full p-2 text-[#5f6368] transition-all hover:bg-gray-100 hover:text-[#202124] sm:flex"
              onClick={() => {
                Notification.info({
                  title: '功能提示',
                  content: '设置功能暂未实现',
                })
              }}
            >
              <IconSettings className="text-xl" />
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
