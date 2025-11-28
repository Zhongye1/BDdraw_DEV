// src/Canvas.tsx
import React, { useEffect, useRef, useState } from 'react'
import { StageManager } from './Pixi_stageManager'
import { useStore, setYjsData } from '@/stores/canvasStore'
import PropertyPanel from '@/components/property-panel'
import TopToolbar from '@/components/canvas_toolbar/TopToolbar'
import BottomTextEditor from '@/components/Richtext_editor/BottomTextEditor'
import { useCanvasShortcuts } from '@/hooks/use_React_hotkeys_management'
import { Minimap } from '@/components/minimap/Minimap'
import { getDefaultLayout } from '@/components/layout'
import { undoRedoManager } from '@/lib/UndoRedoManager'
import { CollaboratorCursors } from '@/components/collaboration/CollaboratorCursors'
import {
  initWsProvider,
  getAwareness,
  getYDocForRoom,
  getYElementsForRoom,
  getIndexedDBProviderForRoom,
  destroyRoomResources,
} from '@/stores/persistenceStore'

import { useParams, useNavigate, useSearchParams } from 'react-router-dom'

import { Button } from '@arco-design/web-react'
import { IconNotification as IconWarning } from '@arco-design/web-react/icon'
import { StageManagerProvider } from '@/components/header/StageManagerContext'

export default function PixiCanvas() {
  const containerRef = useRef<HTMLDivElement>(null)
  const stageManagerRef = useRef<StageManager | null>(null)
  const [stageManager, setStageManager] = useState<StageManager | null>(null)
  const { elements, status } = useStore()
  const { roomId } = useParams<{ roomId: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  // 生成随机颜色和名字用于演示
  const myColor = '#' + Math.floor(Math.random() * 16777215).toString(16)
  const myName = 'User ' + Math.floor(Math.random() * 100)

  const [awareness, setAwareness] = useState<any>(null)
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)
  const [collaborators, setCollaborators] = useState<Map<number, any>>(new Map())

  // 初始化 WebSocket 连接
  useEffect(() => {
    // 1. 立即设置状态为 loading，清空当前视图，避免残影
    useStore.setState({ status: 'loading', elements: {} })

    const token = localStorage.getItem('token')
    const targetRoomId = token ? roomId || 'default' : 'default'

    // 只有当用户主动选择进入房间时才更新lastRoomId
    const userSelected = searchParams.get('userSelected') === 'true'
    if (roomId && userSelected) {
      console.log('[Canvas] User actively selected room, saving lastRoomId to localStorage:', roomId)
      localStorage.setItem('lastRoomId', roomId)
    }

    // 如果有roomId但不是用户主动选择的，也要更新lastRoomId（为了向后兼容）
    if (roomId && !userSelected) {
      console.log('[Canvas] Updating lastRoomId for room visit:', roomId)
      localStorage.setItem('lastRoomId', roomId)
    }

    console.log(`[Canvas] Switching to room: ${targetRoomId}`)

    // 初始化 Provider
    const wsProvider = initWsProvider(targetRoomId, token || '')
    const currentAwareness = getAwareness(targetRoomId)
    setAwareness(currentAwareness)

    // 初始化自己的信息
    if (currentAwareness) {
      currentAwareness.setLocalStateField('user', {
        name: myName,
        color: myColor,
      })
    }

    // 设置 Yjs 数据
    const ydoc = getYDocForRoom(targetRoomId)
    const yElements = getYElementsForRoom(targetRoomId)
    const provider = getIndexedDBProviderForRoom(targetRoomId)

    // 这会触发 Store 内部的重置和重新绑定
    setYjsData(ydoc, yElements, provider)

    return () => {
      // 组件卸载或 roomId 变化时的清理
      destroyRoomResources(targetRoomId)
      // 可选：清理 store，防止下次加载前显示旧数据
      useStore.getState().resetStore()
    }
  }, [roomId, navigate, setYjsData])

  // 监听协作用户变化
  useEffect(() => {
    if (!awareness) return

    const handleAwarenessChange = () => {
      const states = awareness.getStates() as Map<number, any>
      setCollaborators(new Map(states))
    }

    awareness.on('change', handleAwarenessChange)

    // 初始化一次
    handleAwarenessChange()

    return () => {
      awareness.off('change', handleAwarenessChange)
    }
  }, [awareness])

  const handleLoginRedirect = () => {
    navigate('/login')
  }

  // 监听鼠标移动，广播自己的位置
  // 用户光标位置
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!awareness || !stageManagerRef.current) return

    // 使用 Pixi viewport 将屏幕坐标转换为世界坐标
    const viewport = stageManagerRef.current.viewport
    if (viewport) {
      // 通过 stageManager 获取 canvas 元素
      const canvas = stageManagerRef.current.app.canvas
      if (canvas) {
        // 获取画布容器的边界
        const containerRect = canvas.getBoundingClientRect()

        // 计算相对于画布的坐标
        const x = e.clientX - containerRect.left
        const y = e.clientY - containerRect.top

        // 将屏幕坐标转换为世界坐标
        const point = viewport.toWorld(x, y)

        // 广播世界坐标
        awareness.setLocalStateField('cursor', {
          x: point.x,
          y: point.y,
        })
      }
    }
  }

  // 使用自定义hook管理快捷键
  useCanvasShortcuts()

  // 初始化 StageManager
  useEffect(() => {
    console.log('[CanvasPage] useEffect 执行, status:', status)
    // 组件挂载时强制重置，确保状态干净
    undoRedoManager.reset()

    // 只有当状态不是 loading 且容器存在时才初始化
    if (status === 'loading' || !containerRef.current) return

    const stageManager = new StageManager(containerRef.current)
    stageManagerRef.current = stageManager
    setStageManager(stageManager)

    return () => {
      console.log('[CanvasPage] 组件卸载')
      stageManagerRef.current?.destroy()
      stageManagerRef.current = null
      setStageManager(null)
      // 组件卸载时也可以选择重置
      undoRedoManager.reset()
    }
  }, [status])

  if (status == 'loading') {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg">加载中...</div>
      </div>
    )
  }

  // 获取当前用户列表（排除自己）
  const userList = Array.from(collaborators.entries())
    .map(([clientId, state]) => {
      if (awareness && clientId === awareness.clientID) return null
      return state.user || { name: 'Unknown', color: '#000' }
    })
    .filter((user) => user !== null)

  // 获取当前用户名
  const currentUser =
    awareness && collaborators.has(awareness.clientID)
      ? collaborators.get(awareness.clientID)?.user || { name: 'Unknown' }
      : { name: myName }

  return (
    <StageManagerProvider stageManager={stageManager}>
      <div className="relative h-[92vh] w-auto overflow-hidden bg-blue-200" onPointerMove={handlePointerMove}>
        {/* 登录提示横幅 */}
        {showLoginPrompt && (
          <div className="absolute  bottom-0 left-0 right-0 z-50 bg-orange-100 p-2 text-center text-sm">
            <div className="flex items-center justify-center">
              <IconWarning className="mr-2 text-orange-500" />
              <span>当前处于离线模式，登录以启用多人协作</span>
              <Button type="primary" size="small" className="ml-4" onClick={handleLoginRedirect}>
                登录
              </Button>
              <Button type="text" size="small" className="ml-2" onClick={() => setShowLoginPrompt(false)}>
                关闭
              </Button>
            </div>
          </div>
        )}

        {/* 1. 悬浮工具栏 (内部已经配置了 fixed 定位) */}
        <TopToolbar />

        {/* 2. 主画布区域：完全占满屏幕，无 padding */}
        <div
          ref={containerRef}
          className="absolute inset-0 h-full w-full touch-none overflow-hidden bg-white" // touch-none 防止移动端误触
        />

        {/* 协作光标 */}
        {awareness && stageManager && <CollaboratorCursors awareness={awareness} stageManager={stageManager} />}

        {/* 3. 右侧属性面板 (保持原样，它是 fixed 或 absolute right-0) */}
        <PropertyPanel />

        {/* 底部文本编辑器：自动根据选中状态显示/隐藏 */}
        <BottomTextEditor />

        {/* 小地图组件 */}
        <Minimap stageManager={stageManager} />

        {/* 4. 画布信息面板 */}
        <div className="pointer-events-none absolute bottom-4 left-4 z-10 rounded-md bg-gray-100/80 p-3 text-xs text-gray-700">
          <div className="grid grid-cols-1 gap-1">
            <div>
              <span className="font-medium">room:</span> {roomId || 'default'}
            </div>
            <div>
              <span className="font-medium">elements:</span> {Object.keys(elements).length}
            </div>
            <div>
              <span className="font-medium">user:</span> {currentUser.name}
            </div>
            <div>
              <span className="font-medium">collaborators:</span>
              <div className="mt-1 flex flex-wrap gap-1">
                {[currentUser, ...userList].map((user: any, index: number) => (
                  <span
                    key={index}
                    className="inline-flex items-center rounded px-2 py-1 text-xs text-white"
                    style={{ backgroundColor: user.color }}
                  >
                    {user.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </StageManagerProvider>
  )
}

PixiCanvas.getLayout = getDefaultLayout
