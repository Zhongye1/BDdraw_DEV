import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Form, Input, Notification } from '@arco-design/web-react'
import { loginUser } from '@/api/apiService'

const Login: React.FC = () => {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const onFinish = async (values: { username: string; password: string }) => {
    setLoading(true)
    try {
      const response = await loginUser(values.username, values.password)
      localStorage.setItem('token', response.token)
      localStorage.setItem('user', JSON.stringify(response.user))
      Notification.success({
        title: '登录成功',
        content: '欢迎回来！',
      })
      navigate('/')
    } catch (error: any) {
      Notification.error({
        title: '登录失败',
        content: error.response?.data?.error || '登录时发生错误',
      })
    } finally {
      setLoading(false)
    }
  }

  const onRegister = () => {
    navigate('/register')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-800">用户登录</h1>
          <p className="mt-2 text-gray-600">请输入您的账号信息</p>
        </div>

        <Form form={form} layout="vertical" onSubmit={onFinish} className="space-y-6">
          <Form.Item label="用户名" field="username" rules={[{ required: true, message: '请输入用户名' }]}>
            <Input placeholder="请输入用户名" />
          </Form.Item>

          <Form.Item label="密码" field="password" rules={[{ required: true, message: '请输入密码' }]}>
            <Input.Password placeholder="请输入密码" autoComplete="current-password" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} long>
              登录
            </Button>
          </Form.Item>
        </Form>

        <div className="mt-6 text-center">
          <p className="text-gray-600">
            还没有账号？{' '}
            <Button type="text" onClick={onRegister}>
              立即注册
            </Button>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Login
