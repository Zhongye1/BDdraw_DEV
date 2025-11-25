import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Form, Input, Notification, Card, List, Typography } from '@arco-design/web-react'
import { createRoom, listRooms, getRoomDetails, inviteUserToRoom, getRoomMembers, deleteRoom } from '@/api/apiService'

const { Title, Text } = Typography

const RoomManagement: React.FC = () => {
  const [rooms, setRooms] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [roomLoading, setRoomLoading] = useState(false)
  const [inviteLoading, setInviteLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [selectedRoom, setSelectedRoom] = useState<any>(null)
  const [roomMembers, setRoomMembers] = useState<any[]>([])
  const navigate = useNavigate()

  const [inviteForm] = Form.useForm() // 创建表单实例

  const token = localStorage.getItem('token') || ''

  useEffect(() => {
    if (!token) {
      navigate('/login')
    } else {
      fetchRooms()
    }
  }, [token, navigate])

  const fetchRooms = async () => {
    setLoading(true)
    try {
      const response = await listRooms(token)
      setRooms(response)
    } catch (error: any) {
      Notification.error({
        title: '获取房间列表失败',
        content: error.response?.data?.error || '获取房间列表时发生错误',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateRoom = async (values: { name: string }) => {
    try {
      const response = await createRoom(values.name, token)
      Notification.success({
        title: '创建成功',
        content: `房间 "${response.name}" 创建成功`,
      })
      fetchRooms()
    } catch (error: any) {
      Notification.error({
        title: '创建房间失败',
        content: error.response?.data?.error || '创建房间时发生错误',
      })
    }
  }

  const handleSelectRoom = async (roomId: string) => {
    setRoomLoading(true)
    try {
      // 获取房间详情
      const roomResponse = await getRoomDetails(roomId, token)
      setSelectedRoom(roomResponse)

      // 获取房间成员
      const membersResponse = await getRoomMembers(roomId, token)
      setRoomMembers(membersResponse)
    } catch (error: any) {
      Notification.error({
        title: '获取房间信息失败',
        content: error.response?.data?.error || '获取房间信息时发生错误',
      })
    } finally {
      setRoomLoading(false)
    }
  }

  const handleInviteUser = async (values: { username: string }) => {
    if (!selectedRoom) return

    setInviteLoading(true)
    try {
      await inviteUserToRoom(selectedRoom.id, values.username, token)
      Notification.success({
        title: '邀请成功',
        content: `用户 "${values.username}" 已被邀请加入房间`,
      })
      // 刷新成员列表
      const membersResponse = await getRoomMembers(selectedRoom.id, token)
      setRoomMembers(membersResponse)
      // 重置表单
      inviteForm.resetFields()
    } catch (error: any) {
      Notification.error({
        title: '邀请用户失败',
        content: error.response?.data?.error || '邀请用户时发生错误',
      })
    } finally {
      setInviteLoading(false)
    }
  }

  const handleDeleteRoom = async (roomId: string, roomName: string) => {
    setDeleteLoading(true)
    try {
      await deleteRoom(roomId, token)
      Notification.success({
        title: '删除成功',
        content: `房间 "${roomName}" 已被删除`,
      })
      fetchRooms()
      if (selectedRoom && selectedRoom.id === roomId) {
        setSelectedRoom(null)
        setRoomMembers([])
      }
    } catch (error: any) {
      Notification.error({
        title: '删除房间失败',
        content: error.response?.data?.error || '删除房间时发生错误',
      })
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleEnterRoom = (roomId: string) => {
    navigate(`/canvas/${roomId}`)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-6xl">
        <Title heading={3} className="mb-6">
          房间管理
        </Title>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* 左侧：创建房间和房间列表 */}
          <div className="space-y-6">
            {/* 创建房间卡片 */}
            <Card title="创建房间">
              <Form layout="vertical" onSubmit={handleCreateRoom}>
                <Form.Item label="房间名称" field="name" rules={[{ required: true, message: '请输入房间名称' }]}>
                  <Input placeholder="请输入房间名称" />
                </Form.Item>
                <Form.Item>
                  <Button type="primary" htmlType="submit">
                    创建房间
                  </Button>
                </Form.Item>
              </Form>
            </Card>

            {/* 房间列表卡片 */}
            <Card
              title="我的房间"
              extra={
                <Button onClick={fetchRooms} loading={loading}>
                  刷新
                </Button>
              }
            >
              {rooms.length === 0 ? (
                <Text>暂无房间，请先创建一个房间</Text>
              ) : (
                <List
                  dataSource={rooms}
                  render={(item) => (
                    <List.Item
                      key={item.id}
                      extra={
                        <div className="flex space-x-2">
                          <Button type="primary" size="small" onClick={() => handleEnterRoom(item.id)}>
                            进入
                          </Button>
                          <Button
                            type="outline"
                            status="danger"
                            size="small"
                            loading={deleteLoading}
                            onClick={() => handleDeleteRoom(item.id, item.name)}
                          >
                            删除
                          </Button>
                        </div>
                      }
                    >
                      <List.Item.Meta
                        title={item.name}
                        description={
                          <div>
                            <Text>ID: {item.id}</Text>
                            {item.created_at && (
                              <Text className="ml-4">创建时间: {new Date(item.created_at).toLocaleString()}</Text>
                            )}
                          </div>
                        }
                      />
                      <Button type="text" size="small" onClick={() => handleSelectRoom(item.id)}>
                        查看详情
                      </Button>
                    </List.Item>
                  )}
                />
              )}
            </Card>
          </div>

          {/* 右侧：房间详情和成员管理 */}
          <div className="space-y-6">
            {/* 房间详情卡片 */}
            <Card title="房间详情">
              {selectedRoom ? (
                <div className="space-y-4">
                  <div>
                    <Text className="font-medium">房间名称:</Text>
                    <Text className="ml-2">{selectedRoom.name}</Text>
                  </div>
                  <div>
                    <Text className="font-medium">房间ID:</Text>
                    <Text className="ml-2">{selectedRoom.id}</Text>
                  </div>
                  <div>
                    <Text className="font-medium">创建者ID:</Text>
                    <Text className="ml-2">{selectedRoom.creator_id}</Text>
                  </div>
                  {selectedRoom.created_at && (
                    <div>
                      <Text className="font-medium">创建时间:</Text>
                      <Text className="ml-2">{new Date(selectedRoom.created_at).toLocaleString()}</Text>
                    </div>
                  )}
                  <div>
                    <Text className="font-medium">在线人数:</Text>
                    <Text className="ml-2">{selectedRoom.activeUsers}</Text>
                  </div>
                </div>
              ) : (
                <Text>请选择一个房间查看详细信息</Text>
              )}
            </Card>

            {/* 成员管理卡片 */}
            <Card
              title="房间成员"
              extra={
                selectedRoom && (
                  <Button
                    type="primary"
                    size="small"
                    onClick={() => {
                      // 刷新成员列表
                      handleSelectRoom(selectedRoom.id)
                    }}
                  >
                    刷新成员
                  </Button>
                )
              }
            >
              {selectedRoom ? (
                <div className="space-y-4">
                  <Form layout="vertical" form={inviteForm} onSubmit={handleInviteUser}>
                    <Form.Item
                      label="邀请用户"
                      field="username"
                      rules={[{ required: true, message: '请输入要邀请的用户名' }]}
                    >
                      <Input placeholder="请输入要邀请的用户名" />
                    </Form.Item>
                    <Form.Item>
                      <Button type="primary" htmlType="submit" loading={inviteLoading}>
                        邀请
                      </Button>
                    </Form.Item>
                  </Form>

                  <div>
                    <Title heading={6}>成员列表</Title>
                    {roomMembers.length === 0 ? (
                      <Text>暂无成员</Text>
                    ) : (
                      <List
                        dataSource={roomMembers}
                        render={(member) => (
                          <List.Item key={member.id}>
                            <List.Item.Meta title={member.username} description={`ID: ${member.id}`} />
                          </List.Item>
                        )}
                      />
                    )}
                  </div>
                </div>
              ) : (
                <Text>请选择一个房间查看和管理成员</Text>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RoomManagement
