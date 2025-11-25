import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Form, Input, Notification } from '@arco-design/web-react'
import { registerUser } from '@/api/apiService'

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

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-800">用户注册</h1>
          <p className="mt-2 text-gray-600">创建您的账号</p>
        </div>

        <Form form={form} layout="vertical" onSubmit={onFinish} className="space-y-6">
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

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} long>
              注册
            </Button>
          </Form.Item>
        </Form>

        <div className="mt-6 text-center">
          <p className="text-gray-600">
            已有账号？{' '}
            <Button type="text" onClick={onLogin}>
              立即登录
            </Button>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Register
