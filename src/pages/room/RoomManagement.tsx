import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Button,
  Form,
  Input,
  Notification,
  Card,
  Typography,
  Tabs,
  Grid,
  Modal,
  Drawer,
  Empty,
  Spin,
  Space,
  Tag,
  Avatar,
  Descriptions,
  List,
  Popconfirm,
  Message,
} from '@arco-design/web-react'
import { IconPlus, IconUser, IconUserGroup, IconDelete, IconClockCircle } from '@arco-design/web-react/icon'
import {
  createRoom,
  listRooms,
  getRoomDetails,
  inviteUserToRoom,
  getRoomMembers,
  deleteRoom,
  searchRooms,
  browseRooms,
} from '@/api/apiService'

const { Title, Text } = Typography
const { Row, Col } = Grid
const { TabPane } = Tabs

// 定义接口以规范类型
interface Room {
  id: string
  name: string
  creator_id?: string // 添加可选标记
  creator_name?: string
  created_at?: string
  member_count?: number
  activeUsers?: number
}

const RoomManagement: React.FC = () => {
  const navigate = useNavigate()
  const token = localStorage.getItem('token') || ''
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}')

  // --- State Management ---
  const [rooms, setRooms] = useState<Room[]>([])
  const [allRooms, setAllRooms] = useState<Room[]>([])
  const [searchResults, setSearchResults] = useState<Room[]>([])

  // Loading States
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false) // 通用的操作loading

  // UI States
  const [activeTab, setActiveTab] = useState('myRooms')
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false)
  const [isDetailDrawerVisible, setIsDetailDrawerVisible] = useState(false)
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)
  const [roomMembers, setRoomMembers] = useState<any[]>([])
  const [searchText, setSearchText] = useState('')

  // Forms
  const [createForm] = Form.useForm()
  const [inviteForm] = Form.useForm()

  // --- Effects ---
  useEffect(() => {
    if (!token) {
      navigate('/login')
    } else {
      fetchDataByTab(activeTab)
    }
  }, [token, navigate, activeTab])

  // --- Data Fetching ---
  const fetchDataByTab = (tab: string) => {
    if (tab === 'myRooms') fetchRooms()
    if (tab === 'allRooms') fetchAllRooms()
    // searchResults 不需要自动刷新，保留当前结果
  }

  const fetchRooms = async () => {
    setLoading(true)
    try {
      const response = await listRooms(token)
      setRooms(response)
      Message.info('已成功刷新')
    } catch (error: any) {
      handleError('获取房间列表失败', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAllRooms = async () => {
    setLoading(true)
    try {
      const response = await browseRooms(token)
      setAllRooms(response.rooms)
      Message.info('已成功刷新')
    } catch (error: any) {
      handleError('获取所有房间失败', error)
    } finally {
      setLoading(false)
    }
  }

  // --- Actions ---

  const handleCreateRoom = async () => {
    try {
      const values = await createForm.validate()
      setActionLoading(true)
      const response = await createRoom(values.name, token)
      Notification.success({ title: '创建成功', content: `房间 "${response.name}" 创建成功` })
      setIsCreateModalVisible(false)
      createForm.resetFields()
      setActiveTab('myRooms')
      fetchRooms()
    } catch (error: any) {
      handleError('创建房间失败', error)
    } finally {
      setActionLoading(false)
    }
  }

  const handleSearch = async (value: string) => {
    setSearchText(value)
    if (!value.trim()) {
      setActiveTab('myRooms')
      return
    }

    setLoading(true)
    setActiveTab('searchResults')
    try {
      const response = await searchRooms(value, token)
      setSearchResults(response.rooms)
    } catch (error: any) {
      handleError('搜索房间失败', error)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenDetail = async (room: Room) => {
    setSelectedRoom(room)
    setIsDetailDrawerVisible(true)
    // 异步加载详情和成员，不阻塞UI打开
    fetchRoomFullDetails(room.id)
  }

  const fetchRoomFullDetails = async (roomId: string) => {
    try {
      const [details, members] = await Promise.all([getRoomDetails(roomId, token), getRoomMembers(roomId, token)])
      setSelectedRoom(details) // 更新为更详细的信息
      setRoomMembers(members)
    } catch (error: any) {
      // 不弹窗报错，可能只是静默失败，避免打断用户
      console.error(error)
    }
  }

  const handleInviteUser = async () => {
    if (!selectedRoom) return
    try {
      const values = await inviteForm.validate()
      setActionLoading(true)
      await inviteUserToRoom(selectedRoom.id, values.username, token)
      Notification.success({ title: '邀请成功', content: `用户 "${values.username}" 已被邀请` })
      inviteForm.resetFields()
      // 刷新成员
      const members = await getRoomMembers(selectedRoom.id, token)
      setRoomMembers(members)
    } catch (error: any) {
      handleError('邀请用户失败', error)
    } finally {
      setActionLoading(false)
    }
  }

  const handleDeleteRoom = async (e: React.MouseEvent | any, roomId: string) => {
    // 防止事件冒泡
    if (e && e.stopPropagation) {
      e.stopPropagation()
    }

    try {
      await deleteRoom(roomId, token)
      Notification.success({
        title: '删除成功',
        content: '房间已被成功删除',
      })

      // 从所有可能的列表中移除房间
      setRooms((prev) => prev.filter((r) => r.id !== roomId))
      setAllRooms((prev) => prev.filter((r) => r.id !== roomId))
      setSearchResults((prev) => prev.filter((r) => r.id !== roomId))

      // 如果详情抽屉显示的是被删除的房间，则关闭抽屉
      if (selectedRoom?.id === roomId) {
        setIsDetailDrawerVisible(false)
        setSelectedRoom(null)
      }
    } catch (error: any) {
      handleError('删除房间失败', error)
    }
  }

  const handleError = (title: string, error: any) => {
    Notification.error({
      title,
      content: error.response?.data?.error || error.message || '发生未知错误',
    })
  }

  // --- Render Helpers ---

  const getCurrentList = () => {
    switch (activeTab) {
      case 'myRooms':
        return rooms
      case 'allRooms':
        return allRooms
      case 'searchResults':
        return searchResults
      default:
        return rooms
    }
  }

  const renderRoomCard = (room: Room) => (
    <Col xs={24} sm={12} md={8} lg={6} xl={6} key={room.id}>
      <Card
        hoverable
        className="flex h-full cursor-pointer flex-col rounded-lg border-[1.5px] border-gray-300 transition-all hover:shadow-lg"
        onClick={() => handleOpenDetail(room)}
      >
        <div className="mb-4 flex items-center">
          <Avatar style={{ backgroundColor: '#165DFF' }} size={40}>
            {room.name[0]?.toUpperCase()}
          </Avatar>
          <div className="ml-3 overflow-hidden">
            <Title heading={6} className="m-0 truncate" title={room.name}>
              {room.name}
            </Title>
            <Text type="secondary" className="text-xs">
              ID: {room.id.slice(0, 8)}...
            </Text>
          </div>
        </div>

        <Space wrap size={[0, 8]} className="mb-2">
          <Tag color="arcoblue" icon={<IconUser />}>
            {room.creator_name || '未知创建者 '}
          </Tag>
          <div className="w-1"></div>
          <Tag color="green" icon={<IconUserGroup />}>
            {room.member_count ?? 0} 成员
          </Tag>
        </Space>

        <div className="mt-2 flex items-center text-xs text-gray-400">
          <IconClockCircle className="mr-1" />
          {room.created_at ? new Date(room.created_at).toLocaleDateString() : '-'}
        </div>

        <div className="mt-4 flex h-[32px] items-center justify-end">
          {activeTab === 'myRooms' || room.creator_id === currentUser.id ? (
            <Popconfirm
              title="确定删除该房间吗？"
              onConfirm={(e) => handleDeleteRoom(e as any, room.id)}
              onCancel={(e) => e?.stopPropagation()}
              okText="确定"
              cancelText="取消"
            >
              <Button type="text" status="danger" size="mini" onClick={(e) => e.stopPropagation()}>
                <IconDelete /> 删除
              </Button>
            </Popconfirm>
          ) : (
            <span className="text-xs text-gray-400">只读</span>
          )}
        </div>
      </Card>
    </Col>
  )

  return (
    <div className="mt-16 h-[calc(100vh-4rem)] overflow-hidden bg-custom-color p-6">
      <div className="mx-auto max-w-7xl">
        <div className="h-[600px] rounded-lg border-[1.5px] border-gray-300 bg-[var(--color-bg-2)] p-6 shadow-sm">
          <div className="mb-6 flex justify-between bg-[var(--color-bg-2)] p-4 pb-1 pt-1">
            <Title heading={4}>房间管理</Title>

            <Space size="large">
              <Input.Search
                className="border-[1.5px] border-gray-500"
                allowClear
                placeholder="搜索房间名称..."
                style={{ width: 300 }}
                searchButton
                onSearch={handleSearch}
                loading={loading && activeTab === 'searchResults'}
              />
              <Button
                type="primary"
                className="border-[1.5px] border-gray-500"
                icon={<IconPlus />}
                onClick={() => setIsCreateModalVisible(true)}
              >
                创建新房间
              </Button>
            </Space>
          </div>
          <Tabs
            activeTab={activeTab}
            onChange={setActiveTab}
            type="line"
            size="large"
            extra={
              <Button type="secondary" onClick={() => fetchDataByTab(activeTab)}>
                刷新列表
              </Button>
            }
          >
            <TabPane key="myRooms" title="我的房间" />
            <TabPane key="allRooms" title="发现房间" />
            {searchResults.length > 0 && <TabPane key="searchResults" title={`搜索结果 (${searchResults.length})`} />}
          </Tabs>

          <div className="mt-2">
            {loading ? (
              <div className="flex h-64 items-center justify-center">
                <Spin tip="加载中..." />
              </div>
            ) : getCurrentList().length === 0 ? (
              <Empty description={activeTab === 'searchResults' ? '未找到相关房间' : '暂无数据，快去创建一个吧'} />
            ) : (
              <Row gutter={[24, 24]}>{getCurrentList().map(renderRoomCard)}</Row>
            )}
          </div>
        </div>
      </div>

      {/* Create Room Modal */}
      <Modal
        title="创建新房间"
        visible={isCreateModalVisible}
        onOk={handleCreateRoom}
        onCancel={() => setIsCreateModalVisible(false)}
        confirmLoading={actionLoading}
        unmountOnExit
      >
        <Form form={createForm} layout="vertical">
          <Form.Item
            label="房间名称"
            field="name"
            requiredSymbol={false}
            rules={[{ required: true, message: '请输入房间名称' }]}
          >
            <Input placeholder="给房间起个名字..." maxLength={20} showWordLimit />
          </Form.Item>
        </Form>
      </Modal>

      {/* Room Detail Drawer (Side Panel) */}
      <Drawer
        width={400}
        title="房间详情"
        visible={isDetailDrawerVisible}
        onOk={() => setIsDetailDrawerVisible(false)}
        onCancel={() => setIsDetailDrawerVisible(false)}
        footer={null}
      >
        {selectedRoom && (
          <div className="flex h-full flex-col">
            {/* Info Header */}
            <div className="mb-6 text-center">
              <Avatar size={64} style={{ backgroundColor: '#165DFF', fontSize: 24, marginBottom: 16 }}>
                {selectedRoom.name[0]?.toUpperCase()}
              </Avatar>
              <Title heading={5} className="m-0">
                {selectedRoom.name}
              </Title>
              <Text type="secondary">ID: {selectedRoom.id}</Text>
              <div className="mt-4">
                <Button
                  type="primary"
                  long
                  onClick={() => {
                    // 用户主动选择进入房间时，更新lastRoomId
                    localStorage.setItem('lastRoomId', selectedRoom.id)
                    navigate(`/canvas/${selectedRoom.id}?userSelected=true`)
                  }}
                >
                  立即进入房间
                </Button>
              </div>
            </div>

            <Tabs defaultActiveTab="info">
              <TabPane key="info" title="基本信息">
                <Descriptions
                  column={1}
                  data={[
                    { label: '创建者', value: selectedRoom.creator_name || selectedRoom.creator_id },
                    {
                      label: '创建时间',
                      value: selectedRoom.created_at ? new Date(selectedRoom.created_at).toLocaleString() : '-',
                    },
                    { label: '在线人数', value: <Tag color="green">{selectedRoom.activeUsers || 0} 人在线</Tag> },
                    { label: '总成员数', value: <Tag color="blue">{roomMembers.length} 人</Tag> },
                  ]}
                  layout="inline-horizontal"
                  colon=" :"
                />
              </TabPane>

              <TabPane key="members" title="成员管理">
                <div className="mb-4 rounded bg-gray-50 p-3">
                  <Form form={inviteForm} layout="vertical" onSubmit={handleInviteUser}>
                    <div className="flex gap-2">
                      <Form.Item field="username" noStyle rules={[{ required: true }]}>
                        <Input placeholder="输入用户名邀请..." />
                      </Form.Item>
                      <Button type="primary" htmlType="submit" loading={actionLoading}>
                        邀请
                      </Button>
                    </div>
                  </Form>
                </div>

                <div className="flex-1 overflow-y-auto" style={{ maxHeight: '400px' }}>
                  <List
                    dataSource={roomMembers}
                    render={(member, index) => (
                      <List.Item key={index}>
                        <List.Item.Meta
                          avatar={<Avatar size={32}>{member.username[0]}</Avatar>}
                          title={member.username}
                          description={`ID: ${member.id}`}
                        />
                      </List.Item>
                    )}
                  />
                </div>
              </TabPane>
            </Tabs>
          </div>
        )}
      </Drawer>
    </div>
  )
}

export default RoomManagement
