import React, { ReactNode, useState, useEffect } from 'react'
import { Button, Notification, Dropdown, Menu } from '@arco-design/web-react'
import { IconGithub, IconUser, IconUndo as IconLogout, IconHome } from '@arco-design/web-react/icon'
import { useNavigate } from 'react-router-dom'

interface IProps {
  leftNode?: ReactNode
}

export function Header(props: IProps) {
  const navigate = useNavigate()
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
        // 如果解析失败，清除本地存储
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

  const userMenu = (
    <Menu>
      <Menu.Item key="profile" onClick={() => navigate('/rooms')}>
        <IconUser className="mr-2" />
        房间管理
      </Menu.Item>
      <Menu.Item key="logout" onClick={handleLogout}>
        <IconLogout className="mr-2" />
        退出登录
      </Menu.Item>
    </Menu>
  )

  return (
    <div className="fixed left-0 top-0 z-40 w-full border-b border-gray-200/60 bg-white/80 shadow-sm backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* 左侧：Logo 和导航按钮 */}
          <div className="flex items-center space-x-4 md:space-x-6">
            <a
              href="/"
              className="text-lg font-semibold text-gray-900 transition-colors duration-200 hover:text-blue-600 md:text-xl"
            >
              BDdraw_DEV
            </a>

            {isLoggedIn && (
              <>
                <Button
                  type="secondary"
                  size="large"
                  onClick={() => navigate('/')}
                  className="hidden items-center space-x-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors hover:bg-gray-100 sm:flex"
                >
                  <IconHome />
                  <span>画布</span>
                </Button>
                <Button
                  type="secondary"
                  size="large"
                  onClick={() => navigate('/rooms')}
                  className="hidden items-center space-x-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors hover:bg-gray-100 sm:flex"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 3v4a1 1 0 001 1h4M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z"
                    />
                  </svg>
                  <span>房间管理</span>
                </Button>
                <Button
                  type="secondary"
                  size="large"
                  onClick={() => navigate('/home')}
                  className="hidden items-center space-x-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors hover:bg-gray-100 sm:flex"
                >
                  <IconHome />
                  <span>关于项目</span>
                </Button>
              </>
            )}
          </div>

          {/* 右侧：功能按钮 */}
          <div className="flex items-center space-x-3">
            <Button
              icon={<IconGithub />}
              shape="circle"
              onClick={() => window.open('https://github.com/Zhongye1/BDdraw_DEV', '_blank')}
              className="flex h-10 w-10 transform items-center justify-center rounded-full bg-gray-100 transition-colors duration-200 hover:scale-105 hover:bg-gray-200"
            />

            {isLoggedIn ? (
              <Dropdown droplist={userMenu} position="br">
                <div className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-gray-100 transition-colors hover:bg-gray-200">
                  <IconUser />
                </div>
              </Dropdown>
            ) : (
              <Button type="primary" size="small" onClick={() => navigate('/login')}>
                登录
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
