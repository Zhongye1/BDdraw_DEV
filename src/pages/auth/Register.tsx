import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Form, Input, Notification } from '@arco-design/web-react'
import { registerUser } from '@/api/apiService'
import ParallaxBackground from '@/components/ParallaxBackground'
import { useTheme } from '@/stores/themeStore'

const Register: React.FC = () => {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { theme } = useTheme()

  const onFinish = async (values: { username: string; password: string }) => {
    setLoading(true)
    try {
      const response = await registerUser(values.username, values.password)
      localStorage.setItem('token', response.token)
      localStorage.setItem('user', JSON.stringify(response.user))
      Notification.success({
        title: '注册成功',
        content: '账户创建完成，欢迎使用！',
      })
      // 发送自定义事件通知其他组件更新登录状态
      window.dispatchEvent(
        new CustomEvent('user-login-status-changed', {
          detail: { isLoggedIn: true },
        }),
      )
      navigate('/')
    } catch (error: any) {
      Notification.error({
        title: '注册失败',
        content: error.response?.data?.error || '注册时发生错误',
      })
    } finally {
      setLoading(false)
    }
  }

  const onOfflineMode = () => {
    navigate('/canvas')
  }

  const onBackToLogin = () => {
    navigate('/login')
  }

  return (
    <div
      className={`mt-16 flex h-[calc(100vh-4rem)] w-full overflow-hidden ${
        theme === 'dark' ? 'bg-gray-900' : 'bg-white'
      }`}
    >
      <ParallaxBackground
        className="hidden w-[60vw] bg-gray-900 lg:block"
        imageUrl="https://images.unsplash.com/photo-1504805572947-34fad45aed93?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80"
        title="开始使用"
        description="创建您的专属账户"
      />

      {/* 右侧表单区域 */}
      <div className="flex w-full flex-col justify-center px-8 sm:px-12 lg:w-1/2 xl:px-24">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-10">
            <h1 className={`text-3xl font-extrabold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>用户注册</h1>
            <p className={`mt-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>创建您的新账号</p>
          </div>

          <Form
            form={form}
            layout="vertical"
            onSubmit={onFinish}
            size="large"
            className="space-y-4"
            requiredSymbol={false}
          >
            <Form.Item
              label={<span className={theme === 'dark' ? 'text-white' : ''}>用户名</span>}
              field="username"
              rules={[
                { required: true, message: '请输入用户名' },
                { minLength: 3, message: '用户名至少3个字符' },
                { maxLength: 20, message: '用户名最多20个字符' },
              ]}
            >
              <Input
                placeholder="请输入用户名"
                className={theme === 'dark' ? '!border-gray-700 !bg-gray-800 !text-white' : ''}
              />
            </Form.Item>
            <Form.Item
              label={<span className={theme === 'dark' ? 'text-white' : ''}>密码</span>}
              field="password"
              rules={[
                { required: true, message: '请输入密码' },
                { minLength: 6, message: '密码至少6个字符' },
              ]}
            >
              <Input.Password
                placeholder="请输入密码"
                autoComplete="new-password"
                className={theme === 'dark' ? '!border-gray-700 !bg-gray-800 !text-white' : ''}
              />
            </Form.Item>

            <Form.Item className="pt-4">
              <Button type="primary" htmlType="submit" loading={loading} long className="h-10 text-base">
                注册
              </Button>
            </Form.Item>
          </Form>

          <div className="mt-4 text-center">
            <Button type="dashed" onClick={onOfflineMode} long className="h-10 text-base">
              离线模式
            </Button>
            <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>
              已有账户？{' '}
              <Button type="text" onClick={onBackToLogin} className="px-0 font-semibold hover:bg-transparent">
                立即登录
              </Button>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Register
