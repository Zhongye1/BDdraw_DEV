import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listRooms } from '../../api/apiService'
import { Button, Card, List, Typography, Notification } from '@arco-design/web-react'
import { RoomInfo } from '../../api/types'

const { Title } = Typography

const IntroPage: React.FC = () => {
  const [rooms, setRooms] = useState<RoomInfo[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      navigate('/login')
      return
    }

    const fetchRooms = async () => {
      try {
        const response = await listRooms(token)
        setRooms(response)
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load rooms.')
        Notification.error({
          title: '加载失败',
          content: err.response?.data?.error || '加载房间列表时发生错误',
        })
      } finally {
        setLoading(false)
      }
    }

    fetchRooms()
  }, [navigate])

  const handleCreateRoom = () => {
    navigate('/rooms')
  }

  const handleEnterRoom = (roomId: string) => {
    navigate(`/canvas/${roomId}`)
  }

  if (loading) return <p>Loading...</p>
  if (error) return <p>{error}</p>

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-4xl">
        <Title heading={2} className="mb-6 text-center">
          欢迎使用 BDdraw_DEV
        </Title>

        <Card title="我的房间" className="mb-6">
          <div className="mb-4 flex items-center justify-between">
            <Title heading={5}>房间列表</Title>
            <Button type="primary" onClick={handleCreateRoom}>
              管理房间
            </Button>
          </div>

          {rooms.length === 0 ? (
            <div className="py-8 text-center">
              <p className="mb-4">您还没有任何房间</p>
              <Button type="primary" onClick={handleCreateRoom}>
                创建第一个房间
              </Button>
            </div>
          ) : (
            <List
              dataSource={rooms}
              render={(item) => (
                <List.Item
                  key={item.id}
                  extra={
                    <Button type="primary" size="small" onClick={() => handleEnterRoom(item.id)}>
                      进入房间
                    </Button>
                  }
                >
                  <List.Item.Meta title={item.name} description={`ID: ${item.id}`} />
                </List.Item>
              )}
            />
          )}
        </Card>
      </div>
    </div>
  )
}

export default IntroPage
