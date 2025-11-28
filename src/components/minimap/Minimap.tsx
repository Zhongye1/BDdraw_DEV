import React, { useRef, useEffect, useState } from 'react'
import { useStore } from '@/stores/canvasStore'
import { getContentBounds, getMinimapScale } from '@/lib/minimapUtils'
import type { StageManager } from '@/pages/canvas/Pixi_stageManager'

interface MinimapProps {
  stageManager: StageManager | null
  width?: number
  height?: number
}

export const Minimap: React.FC<MinimapProps> = ({ stageManager, width = 240, height = 160 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const elements = useStore((state) => state.elements)
  const selectedIds = useStore((state) => state.selectedIds)
  const [triggerRender, setTriggerRender] = useState(0)

  // 状态记录，用于拖拽逻辑
  const isDragging = useRef(false)

  // 1. 监听 Pixi Viewport 变化，强制重绘小地图
  useEffect(() => {
    if (!stageManager || !stageManager.viewport) return

    const viewport = stageManager.viewport

    // 使用 ticker 实现更流畅的更新
    const onViewportChange = () => {
      // 使用 requestAnimationFrame 避免高频重绘
      requestAnimationFrame(() => setTriggerRender((prev) => prev + 1))
    }

    // 同时监听多个事件确保实时更新
    viewport.on('moved', onViewportChange)
    viewport.on('zoomed', onViewportChange)

    // 添加额外的更新机制 - 使用 PIXI Ticker 实现持续检测
    let lastUpdate = 0
    const tickerCallback = () => {
      const now = Date.now()
      // 限制更新频率，最多每16ms更新一次（约60fps）
      if (now - lastUpdate > 16) {
        // 检查视口是否真的发生了变化
        onViewportChange()
        lastUpdate = now
      }
    }

    // 尝试使用 PIXI Ticker 如果可用
    const ticker = stageManager.app.ticker
    if (ticker) {
      ticker.add(tickerCallback)
    }

    return () => {
      viewport.off('moved', onViewportChange)
      viewport.off('zoomed', onViewportChange)
      if (ticker) {
        ticker.remove(tickerCallback)
      }
    }
  }, [stageManager])

  // 2. 绘制逻辑
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !stageManager) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // 清空画布
    ctx.clearRect(0, 0, width, height)

    // 背景色
    ctx.fillStyle = '#f5f5f5'
    ctx.fillRect(0, 0, width, height)

    // --- A. 计算比例 ---
    const contentBounds = getContentBounds(elements)
    const scale = getMinimapScale(contentBounds, { width, height })

    // 计算内容在小地图中的偏移量（居中显示）
    const offsetX = (width - contentBounds.width * scale) / 2
    const offsetY = (height - contentBounds.height * scale) / 2

    // --- B. 绘制所有元素（简化版） ---
    Object.values(elements).forEach((el) => {
      // 区分选中元素和普通元素的颜色
      if (selectedIds.includes(el.id)) {
        ctx.fillStyle = '#8888ff' // 选中元素用蓝色
      } else {
        ctx.fillStyle = '#cccccc' // 普通元素用灰色
      }

      // 将世界坐标转换为小地图坐标
      const mx = (el.x - contentBounds.x) * scale + offsetX
      const my = (el.y - contentBounds.y) * scale + offsetY
      const mw = el.width * scale
      const mh = el.height * scale

      ctx.fillRect(mx, my, mw, mh)
    })

    // --- C. 绘制视口框 (Viewport Viewfinder) ---
    if (stageManager && stageManager.viewport) {
      const viewport = stageManager.viewport
      // 获取视口在世界坐标系中的可视区域
      const viewBounds = viewport.getVisibleBounds()

      const vx = (viewBounds.x - contentBounds.x) * scale + offsetX
      const vy = (viewBounds.y - contentBounds.y) * scale + offsetY
      const vw = viewBounds.width * scale
      const vh = viewBounds.height * scale

      ctx.strokeStyle = '#ff4757'
      ctx.lineWidth = 2
      ctx.strokeRect(vx, vy, vw, vh)

      // 绘制一个小的填充矩形表示视口中心点
      ctx.fillStyle = '#ff4757'
      ctx.fillRect(vx + vw / 2 - 2, vy + vh / 2 - 2, 4, 4)
    }

    // 绘制半透明遮罩（可选：让视口外变暗）
    // 这个稍微复杂点，需要反向剪裁，这里暂略
  }, [elements, selectedIds, width, height, stageManager, triggerRender])

  // 3. 交互逻辑：点击或拖拽小地图移动视口
  const handlePointer = (e: React.PointerEvent) => {
    if (!stageManager || !stageManager.viewport || !canvasRef.current) return

    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // 反向计算：从小地图坐标 -> 世界坐标
    const contentBounds = getContentBounds(elements)
    const scale = getMinimapScale(contentBounds, { width, height })
    const offsetX = (width - contentBounds.width * scale) / 2
    const offsetY = (height - contentBounds.height * scale) / 2

    // 公式推导：mx = (wx - cx) * scale + ox  ==>  wx = (mx - ox) / scale + cx
    const worldX = (x - offsetX) / scale + contentBounds.x
    const worldY = (y - offsetY) / scale + contentBounds.y

    // 移动 Pixi Viewport 中心点
    stageManager.viewport.moveCenter(worldX, worldY)
    // 强制触发重绘
    setTriggerRender((p) => p + 1)
  }

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 20,
        right: 20,
        boxShadow: '0 0 10px rgba(0,0,0,0.2)',
        borderRadius: 4,
        overflow: 'hidden',
        background: 'white',
        cursor: 'pointer',
      }}
    >
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onPointerDown={(e) => {
          isDragging.current = true
          canvasRef.current?.setPointerCapture(e.pointerId)
          handlePointer(e)
        }}
        onPointerMove={(e) => {
          if (isDragging.current) handlePointer(e)
        }}
        onPointerUp={(e) => {
          isDragging.current = false
          canvasRef.current?.releasePointerCapture(e.pointerId)
        }}
      />
    </div>
  )
}
