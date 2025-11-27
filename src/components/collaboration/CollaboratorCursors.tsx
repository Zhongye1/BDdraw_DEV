import React, { useEffect, useRef, useState } from 'react'
import { StageManager } from '@/pages/canvas/Pixi_stageManager'

interface Props {
  awareness: any // Yjs awareness
  stageManager: StageManager
}

export const CollaboratorCursors: React.FC<Props> = ({ awareness, stageManager }) => {
  // 存储所有在线用户的状态
  const [collaborators, setCollaborators] = useState<Map<number, any>>(new Map())

  // 使用 Ref 存储光标 DOM 元素的引用，直接操作 DOM 避免 React 重渲染卡顿
  const cursorRefs = useRef<Map<number, HTMLDivElement>>(new Map())

  // 1. 监听 Awareness 变化 (别人进入、离开、移动)
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

  // 2. 核心逻辑：实时更新光标位置
  // 当以下情况发生时需要更新位置：
  // A. 别人的 awareness 数据变了
  // B. 我自己的 viewport (缩放/平移) 变了
  useEffect(() => {
    // 确保 stageManager 和 viewport 存在
    if (!stageManager) return

    const viewport = stageManager.viewport
    if (!viewport) return

    const updateCursorPositions = () => {
      // 遍历所有协作者
      collaborators.forEach((state, clientId) => {
        // 跳过自己
        if (clientId === awareness.clientID) return

        const cursorRef = cursorRefs.current.get(clientId)
        const cursorData = state.cursor // {x: WorldX, y: WorldY}

        if (cursorRef && cursorData) {
          // === 关键转换：世界坐标 -> 屏幕坐标 ===
          // 使用我当前视口的变换矩阵
          const screenPoint = viewport.toScreen(cursorData.x, cursorData.y)

          // 直接操作 DOM transform，性能最高
          cursorRef.style.transform = `translate(${screenPoint.x}px, ${screenPoint.y}px)`

          // 可选：如果光标移出视野，可以隐藏
          // const isVisible = screenPoint.x >= 0 && screenPoint.y >= 0 && ...
        }
      })
    }

    // 立即执行一次
    updateCursorPositions()

    // 监听 Viewport 的移动/缩放事件 (pixi-viewport 事件)
    // 当我拖拽画布时，别人的光标需要跟着动
    viewport.on('moved', updateCursorPositions)
    viewport.on('zoomed', updateCursorPositions)

    // 如果 awareness 更新了 (通过 React state 触发 effect)，这里也会重新计算
    return () => {
      viewport.off('moved', updateCursorPositions)
      viewport.off('zoomed', updateCursorPositions)
    }
  }, [collaborators, stageManager, awareness.clientID])

  return (
    <div className="pointer-events-none absolute inset-0 z-50 overflow-hidden">
      {Array.from(collaborators.entries()).map(([clientId, state]) => {
        if (clientId === awareness.clientID || !state.cursor) return null

        const user = state.user || { name: 'Unknown', color: '#000' }

        return (
          <div
            key={clientId}
            ref={(el) => {
              if (el) cursorRefs.current.set(clientId, el)
              else cursorRefs.current.delete(clientId)
            }}
            className="absolute left-0 top-0 transition-opacity duration-200"
            style={{
              // 初始位置设为 0,0，位置完全由 useEffect 中的 transform 控制
              willChange: 'transform',
              transform: 'translate(0px, 0px)', // 初始变换
            }}
          >
            {/* 光标图标 SVG */}
            <svg
              width="24"
              height="36"
              viewBox="0 0 24 36"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="drop-shadow-md"
            >
              <path
                d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19841L11.7841 12.3673H5.65376Z"
                fill={user.color}
                stroke="white"
              />
            </svg>

            {/* 用户名标签 */}
            <div
              className="absolute left-4 top-4 whitespace-nowrap rounded px-2 py-1 text-xs text-white"
              style={{ backgroundColor: user.color }}
            >
              {user.name}
            </div>
          </div>
        )
      })}
    </div>
  )
}
