import React, { ReactNode } from 'react'
import { Button, Notification } from '@arco-design/web-react'
import { IconGithub } from '@arco-design/web-react/icon'
import { useNavigate } from 'react-router-dom'

interface IProps {
  leftNode?: ReactNode
}

export function Header(props: IProps) {
  const navigate = useNavigate()

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

            <Button
              type="secondary"
              size="large"
              onClick={() => navigate('/')}
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
              <span>画布</span>
            </Button>
            <Button
              type="secondary"
              size="large"
              onClick={() => navigate('/about')}
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
              <span>关于</span>
            </Button>
          </div>

          {/* 右侧：功能按钮 */}
          <div className="flex items-center space-x-3">
            <Button
              icon={<IconGithub />}
              shape="circle"
              onClick={() => window.open('https://github.com/Zhongye1/BDdraw_DEV', '_blank')}
              className="flex h-10 w-10 transform items-center justify-center rounded-full bg-gray-100 transition-colors duration-200 hover:scale-105 hover:bg-gray-200"
            />

            {/* 可以添加更多功能按钮 */}
            <button
              onClick={() =>
                Notification.error({
                  closable: false,
                  title: 'DEV',
                  content: '设置功能还没完善',
                })
              }
              className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 transition-colors hover:bg-gray-200"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
