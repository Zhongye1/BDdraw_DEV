// src/Canvas.tsx
import React, { useEffect, useRef, useState } from 'react'
import { StageManager } from './Pixi_stageManager'
import { useStore } from '@/stores/canvasStore'
import PropertyPanel from '@/components/property-panel'
import TopToolbar from '@/components/canvas_toolbar/TopToolbar'
import BottomTextEditor from '@/components/Richtext_editor/BottomTextEditor'
import { useCanvasShortcuts } from '@/hooks/use_React_hotkeys_management'
import { Minimap } from '@/components/minimap/Minimap'
import { getDefaultLayout } from '@/components/layout'
import { undoRedoManager } from '@/lib/UndoRedoManager'
import { CollaboratorCursors } from '@/components/collaboration/CollaboratorCursors'
import { initWsProvider, getAwareness } from '@/stores/persistenceStore'
import { useParams, useNavigate } from 'react-router-dom'

import { Button } from '@arco-design/web-react'
import { IconNotification as IconWarning } from '@arco-design/web-react/icon'

export default function PixiCanvas() {
  const containerRef = useRef<HTMLDivElement>(null)
  const stageManagerRef = useRef<StageManager | null>(null)
  const [stageManager, setStageManager] = useState<StageManager | null>(null)
  const { elements, status } = useStore()
  const { roomId } = useParams<{ roomId: string }>()
  const navigate = useNavigate()

  // 生成随机颜色和名字用于演示
  const myColor = '#' + Math.floor(Math.random() * 16777215).toString(16)
  const myName = 'User ' + Math.floor(Math.random() * 100)

  const [awareness, setAwareness] = useState<any>(null)
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)

  // 初始化 WebSocket 连接
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      // 显示登录提示而不是直接重定向
      setShowLoginPrompt(true)
      // 仍然初始化默认的协作功能，但不连接到真实房间
      const wsProvider = initWsProvider('default')
      const currentAwareness = getAwareness()
      setAwareness(currentAwareness)

      // 初始化自己的信息
      if (currentAwareness) {
        currentAwareness.setLocalStateField('user', {
          name: myName,
          color: myColor,
        })
      }

      return () => {
        wsProvider.destroy()
      }
    }

    const wsProvider = initWsProvider(roomId || 'default')
    const currentAwareness = getAwareness()
    setAwareness(currentAwareness)

    // 初始化自己的信息
    if (currentAwareness) {
      currentAwareness.setLocalStateField('user', {
        name: myName,
        color: myColor,
      })
    }

    return () => {
      wsProvider.destroy()
    }
  }, [roomId, navigate])

  const handleLoginRedirect = () => {
    navigate('/login')
  }

  // 监听鼠标移动，广播自己的位置
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!awareness) return

    // 转换坐标为画布相对坐标...
    const point = { x: e.clientX, y: e.clientY }

    awareness.setLocalStateField('cursor', point)
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

  return (
    <div className="relative h-[92vh] w-auto overflow-hidden bg-blue-200" onPointerMove={handlePointerMove}>
      {/* 登录提示横幅 */}
      {showLoginPrompt && (
        <div className="absolute  bottom-0 left-0 right-0 z-50 bg-orange-100 p-2 text-center text-sm">
          <div className="flex items-center justify-center">
            <IconWarning className="mr-2 text-orange-500" />
            <span>当前处于演示模式，登录以启用完整功能</span>
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
      {awareness && <CollaboratorCursors awareness={awareness} />}

      {/* 3. 右侧属性面板 (保持原样，它是 fixed 或 absolute right-0) */}
      <PropertyPanel />

      {/* 底部文本编辑器：自动根据选中状态显示/隐藏 */}
      <BottomTextEditor />

      {/* 小地图组件 */}
      <Minimap stageManager={stageManager} />

      {/* 4. 调试面板 (可选) */}
      {/* <div className="pointer-events-none absolute right-4 bottom-4 z-10 rounded-md bg-gray-100/80 p-2 text-xs text-gray-500">
        {Object.keys(elements).length} elements
      </div> */}
    </div>
  )
}

PixiCanvas.getLayout = getDefaultLayout
