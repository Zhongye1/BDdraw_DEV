import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Form, Input, Notification } from '@arco-design/web-react'
import { registerUser } from '@/api/apiService'
import ParallaxBackground from '@/components/ParallaxBackground'

const Register: React.FC = () => {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const onFinish = async (values: { username: string; password: string }) => {
    setLoading(true)
    try {
      const response = await registerUser(values.username, values.password)
      localStorage.setItem('token', response.token)
      localStorage.setItem('user', JSON.stringify(response.user))
      Notification.success({
        title: '注册成功',
        content: '欢迎加入我们！',
      })
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

  const onLogin = () => {
    navigate('/login')
  }

  const onOfflineMode = () => {
    navigate('/canvas')
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full overflow-hidden bg-white">
      <ParallaxBackground
        className="hidden w-[60vw] bg-gray-900 lg:block"
        imageUrl="https://images.unsplash.com/photo-1517048676732-d65bc937f952?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80"
        title="加入我们"
        description="创建账号，探索无限可能。"
      />

      {/* 右侧表单区域 */}
      <div className="flex w-full flex-col justify-center px-8 sm:px-12 lg:w-1/2 xl:px-24">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-10">
            <h1 className="text-3xl font-extrabold text-gray-900">用户注册</h1>
            <p className="mt-2 text-gray-600">创建您的新账号</p>
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
              label="用户名"
              field="username"
              rules={[
                { required: true, message: '请输入用户名' },
                { minLength: 3, message: '用户名至少3个字符' },
              ]}
            >
              <Input placeholder="请输入用户名" />
            </Form.Item>

            <Form.Item
              label="密码"
              field="password"
              rules={[
                { required: true, message: '请输入密码' },
                { minLength: 6, message: '密码至少6个字符' },
              ]}
            >
              <Input.Password placeholder="请输入密码" autoComplete="new-password" />
            </Form.Item>

            <Form.Item className="pt-4">
              <Button type="primary" htmlType="submit" loading={loading} long className="h-10 text-base">
                注册
              </Button>
            </Form.Item>
          </Form>

          <div className="mt-4 flex flex-col gap-2">
            <Button type="dashed" onClick={onOfflineMode} long className="h-10 text-base">
              离线模式
            </Button>

            <div className="text-center">
              <p className="text-gray-600">
                已有账号？{' '}
                <Button type="text" onClick={onLogin} className="px-0 font-semibold hover:bg-transparent">
                  立即登录
                </Button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Register
