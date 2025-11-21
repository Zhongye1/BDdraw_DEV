import React, { useState, useRef, useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import { Button, Slider, Trigger, Tooltip } from '@arco-design/web-react'
import {
  IconPen,
  IconUndo,
  IconRedo,
  IconDelete,
  IconBgColors,
  IconDownload,
  IconEraser,
  IconFullscreen as IconSquare,
  IconObliqueLine as IconLine,
} from '@arco-design/web-react/icon'

import IconCircle from '@/components/ui/icon-circle'

// 定义工具类型
type ToolType = 'select' | 'pen' | 'rectangle' | 'circle' | 'line' | 'eraser'

// 定义坐标点
interface Point {
  x: number
  y: number
}

export default function Canvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  // 用于在拖拽图形时暂存画布状态，实现“预览”效果
  const snapshotRef = useRef<ImageData | null>(null)

  const [isDrawing, setIsDrawing] = useState(false)
  const [tool, setTool] = useState<ToolType>('pen')

  // 样式状态
  const [strokeColor, setStrokeColor] = useState('#000000')
  const [lineWidth, setLineWidth] = useState(4)

  // 历史记录
  const [history, setHistory] = useState<ImageData[]>([])
  const [historyStep, setHistoryStep] = useState(-1)
  const MAX_HISTORY = 20 // 限制历史记录步数，防止内存爆炸

  // 1. 初始化与窗口大小监听
  useEffect(() => {
    initCanvas()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // 更新上下文样式（当颜色或线宽改变时）
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.strokeStyle = strokeColor
    ctx.lineWidth = lineWidth
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }, [strokeColor, lineWidth])

  // 初始化画布（处理高清屏）
  const initCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const parent = canvas.parentElement
    if (!parent) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // 处理 DPR (Device Pixel Ratio)
    const dpr = window.devicePixelRatio || 1
    const rect = parent.getBoundingClientRect()

    // 设置实际物理像素大小
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr

    // 设置 CSS 大小
    canvas.style.width = `${rect.width}px`
    canvas.style.height = `${rect.height}px`

    // 缩放上下文以匹配 DPR，或者我们在坐标计算时手动乘 DPR
    // 这里为了 getImageData 处理方便，我们选择在坐标计算时处理，不使用 ctx.scale

    // 填充白色背景（防止导出透明图片）
    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // 恢复画笔样式
    ctx.strokeStyle = strokeColor
    ctx.lineWidth = lineWidth
    ctx.lineCap = 'round'

    // 保存初始空白状态
    saveToHistory(ctx, canvas)
  }

  // 处理 resize：简单重置，生产环境通常需要把内容画回去
  const handleResize = () => {
    // 注意：这里简单的重置会丢失内容。
    // 理想做法是：暂存当前 ImageData -> resize -> putImageData
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const tempImage = ctx.getImageData(0, 0, canvas.width, canvas.height)
    initCanvas()
    // 尝试恢复（注意：如果变大，边缘会是空的）
    // 实际项目中通常不自动 resize canvas 分辨率，或者采用更复杂的重绘机制
  }

  // 2. 历史记录管理
  const saveToHistory = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    // 获取当前画布像素数据
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

    setHistory((prev) => {
      // 如果当前处于撤销中间状态，丢弃后面的记录
      const newHistory = prev.slice(0, historyStep + 1)
      newHistory.push(imageData)

      // 限制步数
      if (newHistory.length > MAX_HISTORY) {
        newHistory.shift()
      }
      return newHistory
    })

    setHistoryStep((prev) => {
      const nextStep = prev + 1
      return nextStep >= MAX_HISTORY ? MAX_HISTORY - 1 : nextStep
    })
  }

  const undo = () => {
    if (historyStep <= 0) return
    const newStep = historyStep - 1
    restoreHistory(newStep)
    setHistoryStep(newStep)
  }

  const redo = () => {
    if (historyStep >= history.length - 1) return
    const newStep = historyStep + 1
    restoreHistory(newStep)
    setHistoryStep(newStep)
  }

  const restoreHistory = (index: number) => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx || !history[index]) return
    ctx.putImageData(history[index], 0, 0)
  }

  // 3. 绘图逻辑
  const startPoint = useRef<Point>({ x: 0, y: 0 })

  const getCoords = (e: React.MouseEvent): Point => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }

    const rect = canvas.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    return {
      x: (e.clientX - rect.left) * dpr,
      y: (e.clientY - rect.top) * dpr,
    }
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (tool === 'select') return

    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    setIsDrawing(true)
    const coords = getCoords(e)
    startPoint.current = coords

    // 核心逻辑：对于形状工具，我们需要保存“当前这一刻”的画面
    // 这样在拖拽过程中，我们可以不断 clear -> 恢复背景 -> 画新形状
    snapshotRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height)

    ctx.beginPath()
    ctx.moveTo(coords.x, coords.y)

    // 如果是笔，直接开始画
    if (tool === 'pen' || tool === 'eraser') {
      ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : strokeColor
      // 橡皮擦通常粗一点
      ctx.lineWidth = tool === 'eraser' ? lineWidth * 2 : lineWidth
    }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const current = getCoords(e)

    if (tool === 'pen' || tool === 'eraser') {
      // 自由绘图：直接连接线段
      ctx.lineTo(current.x, current.y)
      ctx.stroke()
    } else {
      // 图形工具：先恢复背景，再画新形状
      if (snapshotRef.current) {
        ctx.putImageData(snapshotRef.current, 0, 0)
      }
      drawShape(ctx, startPoint.current, current)
    }
  }

  const handleMouseUp = () => {
    if (!isDrawing) return
    setIsDrawing(false)
    snapshotRef.current = null // 清除暂存

    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (canvas && ctx) {
      saveToHistory(ctx, canvas)
    }
  }

  // 绘制具体图形的算法
  const drawShape = (ctx: CanvasRenderingContext2D, start: Point, end: Point) => {
    ctx.beginPath()
    // 确保样式正确（因为 putImageData 可能会重置部分状态，虽然 context 状态通常保留，但为了保险）
    ctx.strokeStyle = strokeColor
    ctx.lineWidth = lineWidth

    const width = end.x - start.x
    const height = end.y - start.y

    if (tool === 'rectangle') {
      ctx.strokeRect(start.x, start.y, width, height)
    } else if (tool === 'circle') {
      // 计算半径
      const radius = Math.sqrt(width * width + height * height)
      ctx.arc(start.x, start.y, radius, 0, 2 * Math.PI)
      ctx.stroke()
    } else if (tool === 'line') {
      ctx.moveTo(start.x, start.y)
      ctx.lineTo(end.x, end.y)
      ctx.stroke()
    }
  }

  // 4. 辅助功能
  const clearCanvas = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    saveToHistory(ctx, canvas)
  }

  const downloadImage = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const url = canvas.toDataURL('image/png')
    const a = document.createElement('a')
    a.href = url
    a.download = `drawing_${new Date().getTime()}.png`
    a.click()
  }

  // UI 组件：颜色选择器弹出层
  const ColorPickerContent = () => (
    <div className="w-48 rounded-md border border-gray-200 bg-white p-2 shadow-lg">
      <div className="mb-2 text-xs text-gray-500">预设颜色</div>
      <div className="mb-4 grid grid-cols-5 gap-2">
        {[
          '#000000',
          '#ff4d4f',
          '#f53f3f',
          '#ff7d00',
          '#f7ba1e',
          '#00b42a',
          '#165dff',
          '#722ed1',
          '#f5319d',
          '#86909c',
        ].map((c) => (
          <div
            key={c}
            className={`h-6 w-6 cursor-pointer rounded border ${
              strokeColor === c ? 'scale-110 border-blue-500' : 'border-transparent'
            }`}
            style={{ backgroundColor: c }}
            onClick={() => setStrokeColor(c)}
          />
        ))}
      </div>
      <div className="mb-1 text-xs text-gray-500">自定义 (HEX)</div>
      <input
        type="color"
        className="h-8 w-full cursor-pointer"
        value={strokeColor}
        onChange={(e) => setStrokeColor(e.target.value)}
      />
    </div>
  )

  // UI 组件：线宽选择弹出层
  const WidthPickerContent = () => (
    <div className="w-48 rounded-md border border-gray-200 bg-white p-4 shadow-lg">
      <div className="mb-2 text-xs text-gray-500">粗细: {lineWidth}px</div>
      <Slider value={lineWidth} onChange={(val) => setLineWidth(val as number)} min={1} max={20} />
    </div>
  )

  // 工具按钮封装
  const ToolBtn = ({ t, icon }: { t: ToolType; icon: React.ReactNode }) => (
    <Tooltip content={t.charAt(0).toUpperCase() + t.slice(1)}>
      <Button
        type={tool === t ? 'primary' : 'secondary'}
        icon={icon}
        shape="circle"
        onClick={() => setTool(t)}
        className={tool === t ? '!bg-blue-600 !text-white' : ''}
      />
    </Tooltip>
  )

  return (
    <>
      <Helmet>
        <title>高级绘图 - BDdraw_DEV</title>
      </Helmet>

      <div className="flex h-screen select-none pt-16">
        {/* 左侧工具栏 */}
        <div className="z-10 flex w-16 flex-col items-center space-y-4 border-r border-gray-200 bg-white py-4 shadow-sm">
          {/* 基础绘图 */}
          <ToolBtn t="pen" icon={<IconPen />} />
          <ToolBtn t="eraser" icon={<IconEraser />} />
          <div className="my-2 w-8 border-t border-gray-200"></div>
          {/* 形状 */}
          <ToolBtn t="rectangle" icon={<IconSquare />} />
          <ToolBtn t="circle" icon={<IconCircle />} />
          <ToolBtn t="line" icon={<IconLine />} />
          <div className="my-2 w-8 border-t border-gray-200"></div>
          {/* 样式设置 */}
          <Trigger trigger="click" position="right" popup={() => <ColorPickerContent />}>
            <Button shape="circle" type="secondary" style={{ color: strokeColor }}>
              <IconBgColors />
            </Button>
          </Trigger>
          <Trigger trigger="click" position="right" popup={() => <WidthPickerContent />}>
            <div className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-gray-100 transition hover:bg-gray-200">
              <div
                className="rounded-full bg-black"
                style={{ width: Math.min(lineWidth, 20), height: Math.min(lineWidth, 20) }}
              ></div>
            </div>
          </Trigger>
          <div className="my-2 w-8 border-t border-gray-200"></div>
          {/* 操作 */}
          <Tooltip content="Undo (Ctrl+Z)">
            <Button type="secondary" icon={<IconUndo />} shape="circle" onClick={undo} disabled={historyStep <= 0} />
          </Tooltip>
          <Tooltip content="Redo (Ctrl+Y)">
            <Button
              type="secondary"
              icon={<IconRedo />}
              shape="circle"
              onClick={redo}
              disabled={historyStep >= history.length - 1}
            />
          </Tooltip>
          <Tooltip content="Clear All">
            <Button type="secondary" status="danger" icon={<IconDelete />} shape="circle" onClick={clearCanvas} />
          </Tooltip>
          <Tooltip content="Download PNG">
            <Button type="secondary" icon={<IconDownload />} shape="circle" onClick={downloadImage} />
          </Tooltip>
        </div>

        {/* 画布区域 */}
        <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-gray-100">
          {/* 画布容器 */}
          <div className="relative bg-white shadow-md" style={{ width: '100%', height: '100%' }}>
            <canvas
              ref={canvasRef}
              className="block cursor-crosshair touch-none"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            />
          </div>
        </div>
      </div>
    </>
  )
}
