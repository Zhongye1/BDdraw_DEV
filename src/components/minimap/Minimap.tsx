import React, { useRef, useEffect } from 'react'
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

  // =================================================================================
  // 1. 数据同步层 (Data Synchronization)
  // =================================================================================
  // 我们使用 Ref 来存储最新的 elements 和选中状态。
  // 这样 Pixi 的 Ticker 在运行时可以直接读取 Ref，而不需要依赖 React 的组件重绘。
  const elements = useStore((state) => state.elements)
  const selectedIds = useStore((state) => state.selectedIds)

  const dataRef = useRef({ elements, selectedIds })

  // 当 React Store 更新时，悄悄更新 Ref，不触发组件重渲染
  useEffect(() => {
    dataRef.current = { elements, selectedIds }
  }, [elements, selectedIds])

  // 用于拖拽状态
  const isDragging = useRef(false)

  // 用于跟踪是否已经完成初始化绘制
  const initialized = useRef(false)

  // =================================================================================
  // 2. 核心渲染循环 (Render Loop)
  // =================================================================================
  useEffect(() => {
    let retryCount = 0
    const maxRetries = 50 // 最多重试50次
    let retryTimeout: NodeJS.Timeout | null = null

    // 重试函数
    const tryInitialize = () => {
      // 检查 stageManager 是否已准备好
      if (!stageManager || !stageManager.app || !stageManager.viewport) {
        if (retryCount < maxRetries) {
          retryCount++
          retryTimeout = setTimeout(tryInitialize, 100) // 100ms后重试
        }
        return
      }

      // 如果 stageManager 已经准备好，则继续执行初始化逻辑
      initializeMinimap()
    }

    // 初始化函数
    const initializeMinimap = () => {
      const app = stageManager!.app
      const viewport = stageManager!.viewport

      // --- 绘制函数 (每秒执行60次) ---
      const draw = () => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        // [核心修复]：主动布局同步
        // 初次加载时，Pixi Viewport 的 screenWidth 可能是 0。
        // 我们不在乎 React 的 resize 事件有没有触发，每一帧都检查一次。
        // 一旦发现 Viewport 认为自己宽是 0，但 DOM 有宽度，立即强制修正。
        if (viewport.screenWidth <= 0 || viewport.screenHeight <= 0) {
          if (app.canvas) {
            const domRect = app.canvas.getBoundingClientRect()
            if (domRect.width > 0) {
              // console.log('[Minimap] 强制同步视口尺寸', domRect.width, domRect.height)
              viewport.resize(domRect.width, domRect.height)
            }
          }
        }

        // 1. 清空画布
        ctx.clearRect(0, 0, width, height)
        ctx.fillStyle = '#f5f5f5' // 背景色
        ctx.fillRect(0, 0, width, height)

        // 2. 读取最新数据
        const currentElements = dataRef.current.elements
        const currentSelectedIds = dataRef.current.selectedIds
        const hasElements = Object.keys(currentElements).length > 0

        // 3. 计算边界和缩放 (数学防御逻辑)
        let bounds
        if (hasElements) {
          bounds = getContentBounds(currentElements)
          // 防止除以0错误：如果宽高极小，强制给一个最小值
          bounds.width = Math.max(bounds.width, 1)
          bounds.height = Math.max(bounds.height, 1)
        } else {
          // 空状态默认值
          bounds = { x: 0, y: 0, width: 1000, height: 1000 }
        }

        // 计算缩放比例
        let scale = getMinimapScale(bounds, { width, height })
        // 防御 NaN 或 Infinity
        if (!Number.isFinite(scale) || scale <= 0) scale = 0.05

        // 计算居中偏移量
        const offsetX = (width - bounds.width * scale) / 2
        const offsetY = (height - bounds.height * scale) / 2

        // 4. 绘制所有元素
        if (hasElements) {
          Object.values(currentElements).forEach((el) => {
            const mx = (el.x - bounds.x) * scale + offsetX
            const my = (el.y - bounds.y) * scale + offsetY
            const mw = el.width * scale
            const mh = el.height * scale

            // 根据元素类型选择不同的绘制方式
            if ((el.type === 'line' || el.type === 'arrow') && el.points) {
              // 对于线和箭头，绘制连接两点的线段
              ctx.strokeStyle = currentSelectedIds.includes(el.id) ? '#8888ff' : '#cccccc'
              ctx.lineWidth = Math.max(1, 2 * scale) // 至少1像素宽

              const startPoint = el.points[0]
              const endPoint = el.points[1]

              const startX = (el.x + startPoint[0] - bounds.x) * scale + offsetX
              const startY = (el.y + startPoint[1] - bounds.y) * scale + offsetY
              const endX = (el.x + endPoint[0] - bounds.x) * scale + offsetX
              const endY = (el.y + endPoint[1] - bounds.y) * scale + offsetY

              ctx.beginPath()
              ctx.moveTo(startX, startY)
              ctx.lineTo(endX, endY)
              ctx.stroke()
            } else if (el.type === 'pencil' && el.points) {
              // 对于铅笔绘制的自由线条，绘制简化路径
              ctx.strokeStyle = currentSelectedIds.includes(el.id) ? '#8888ff' : '#cccccc'
              ctx.lineWidth = Math.max(1, 2 * scale) // 至少1像素宽
              ctx.beginPath()

              // 简化路径点，避免在小地图中过于密集
              const step = Math.max(1, Math.floor(el.points.length / 20)) // 最多20个点
              let firstPoint = true

              for (let i = 0; i < el.points.length; i += step) {
                const point = el.points[i]
                const x = (el.x + point[0] - bounds.x) * scale + offsetX
                const y = (el.y + point[1] - bounds.y) * scale + offsetY

                if (firstPoint) {
                  ctx.moveTo(x, y)
                  firstPoint = false
                } else {
                  ctx.lineTo(x, y)
                }
              }

              // 确保最后一个点也被绘制
              if (el.points.length > 0) {
                const lastPoint = el.points[el.points.length - 1]
                const x = (el.x + lastPoint[0] - bounds.x) * scale + offsetX
                const y = (el.y + lastPoint[1] - bounds.y) * scale + offsetY
                ctx.lineTo(x, y)
              }

              ctx.stroke()
            } else if (el.type === 'group') {
              // 对于组元素，只绘制边框
              ctx.strokeStyle = currentSelectedIds.includes(el.id) ? '#8888ff' : 'rgba(204, 204, 204, 0.5)'
              ctx.lineWidth = 1
              ctx.strokeRect(mx, my, mw, mh)
            } else if (el.type === 'circle') {
              // 对于圆形，绘制椭圆
              ctx.fillStyle = currentSelectedIds.includes(el.id) ? '#8888ff' : 'rgba(204, 204, 204, 0.5)'
              ctx.beginPath()
              const centerX = mx + mw / 2
              const centerY = my + mh / 2
              const radiusX = mw / 2
              const radiusY = mh / 2
              ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2)
              ctx.fill()
            } else if (el.type === 'diamond') {
              // 对于菱形，绘制菱形路径
              ctx.fillStyle = currentSelectedIds.includes(el.id) ? '#8888ff' : 'rgba(204, 204, 204, 0.5)'
              ctx.beginPath()
              const centerX = mx + mw / 2
              const centerY = my + mh / 2
              ctx.moveTo(centerX, my) // 顶部
              ctx.lineTo(mx + mw, centerY) // 右侧
              ctx.lineTo(centerX, my + mh) // 底部
              ctx.lineTo(mx, centerY) // 左侧
              ctx.closePath()
              ctx.fill()
            } else {
              // 对于其他元素类型（矩形、三角形等），保持原有绘制方式，但使用半透明灰色
              ctx.fillStyle = currentSelectedIds.includes(el.id) ? '#8888ff' : 'rgba(204, 204, 204, 0.5)'
              ctx.fillRect(mx, my, mw, mh)
            }
          })
        }

        // 5. 绘制视口红框 (Viewport Frame)
        const view = viewport.getVisibleBounds()

        // 只有当视口数据合法时才绘制
        if (view.width > 0 && view.width !== Infinity) {
          // 如果没有元素，我们假设 bounds 原点对齐视口中心，保证红框在中间显示
          // 这里简化逻辑：如果有元素，基于元素定位；无元素，基于 (0,0)

          const vx = (view.x - bounds.x) * scale + offsetX
          const vy = (view.y - bounds.y) * scale + offsetY
          const vw = view.width * scale
          const vh = view.height * scale

          // 绘制半透明遮罩 (反向思维：画四条边填充)
          ctx.fillStyle = 'rgba(0, 0, 0, 0.15)'

          // 限制绘制区域，防止负值 bug
          const safeVx = vx
          const safeVy = vy
          // 上
          ctx.fillRect(0, 0, width, Math.max(0, safeVy))
          // 下
          ctx.fillRect(0, safeVy + vh, width, Math.max(0, height - (safeVy + vh)))
          // 左
          ctx.fillRect(0, safeVy, Math.max(0, safeVx), vh)
          // 右
          ctx.fillRect(safeVx + vw, safeVy, Math.max(0, width - (safeVx + vw)), vh)

          // 绘制红框边框
          ctx.strokeStyle = '#ff4757'
          ctx.lineWidth = 2
          ctx.strokeRect(vx, vy, vw, vh)

          // 绘制视口中心点
          const centerX = vx + vw / 2
          const centerY = vy + vh / 2
          ctx.fillStyle = '#ff4757'
          ctx.beginPath()
          ctx.arc(centerX, centerY, 4, 0, Math.PI * 2)
          ctx.fill()

          // 添加中心点的高亮轮廓
          ctx.strokeStyle = '#ffffff'
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.arc(centerX, centerY, 4, 0, Math.PI * 2)
          ctx.stroke()
        }

        // 标记已完成初始化绘制
        if (!initialized.current) {
          initialized.current = true
        }
      }

      // --- 注册 Ticker ---
      // 这是关键：只要 Pixi 在运行，每一帧都会调用 draw。
      // 这比 React 的 useEffect 重绘要稳定得多，也快得多。
      app.ticker.add(draw)

      // [核心修复] 强制触发一次初始绘制，确保小地图不会空白
      setTimeout(() => {
        draw()
      }, 0)

      console.log('[Minimap] Ticker mounted')

      // 清理函数
      return () => {
        console.log('[Minimap] Ticker unmounted')
        app.ticker.remove(draw)
        if (retryTimeout) {
          clearTimeout(retryTimeout)
        }
      }
    }

    // 开始尝试初始化
    tryInitialize()

    // 清理函数
    return () => {
      if (retryTimeout) {
        clearTimeout(retryTimeout)
      }
    }
  }, [stageManager, width, height]) // 仅在 stageManager 变化时重建，几乎只执行一次

  // =================================================================================
  // 3. 交互逻辑 (Interaction)
  // =================================================================================
  const handlePointer = (e: React.PointerEvent) => {
    if (!stageManager || !stageManager.viewport || !canvasRef.current) return

    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // 必须重新计算一遍当前的坐标系参数，逻辑与 draw 中一致
    const currentElements = dataRef.current.elements
    const hasElements = Object.keys(currentElements).length > 0

    let bounds
    if (hasElements) {
      bounds = getContentBounds(currentElements)
      bounds.width = Math.max(bounds.width, 1)
      bounds.height = Math.max(bounds.height, 1)
    } else {
      bounds = { x: 0, y: 0, width: 1000, height: 1000 }
    }

    let scale = getMinimapScale(bounds, { width, height })
    if (!Number.isFinite(scale) || scale <= 0) scale = 0.05

    const offsetX = (width - bounds.width * scale) / 2
    const offsetY = (height - bounds.height * scale) / 2

    // 逆向映射：屏幕坐标 -> 世界坐标
    const worldX = (x - offsetX) / scale + bounds.x
    const worldY = (y - offsetY) / scale + bounds.y

    stageManager.viewport.moveCenter(worldX, worldY)
  }

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 20,
        right: 20,
        width: width,
        height: height,
        backgroundColor: 'white',
        boxShadow: '0 0 10px rgba(0,0,0,0.2)',
        borderRadius: 4,
        overflow: 'hidden',
        zIndex: 100,
      }}
    >
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{ display: 'block', cursor: 'pointer' }}
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
