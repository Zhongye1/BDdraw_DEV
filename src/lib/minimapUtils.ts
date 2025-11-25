import { CanvasElement } from '@/stores/canvasStore'

interface Rect {
  x: number
  y: number
  width: number
  height: number
}

// 计算所有元素的世界边界（加一些 padding 防止贴边）
export function getContentBounds(elements: Record<string, CanvasElement>, padding = 50): Rect {
  const ids = Object.keys(elements)
  if (ids.length === 0) return { x: 0, y: 0, width: 1000, height: 1000 }

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  ids.forEach((id) => {
    const el = elements[id]
    minX = Math.min(minX, el.x)
    minY = Math.min(minY, el.y)
    maxX = Math.max(maxX, el.x + el.width)
    maxY = Math.max(maxY, el.y + el.height)
  })

  return {
    x: minX - padding,
    y: minY - padding,
    width: maxX - minX + padding * 2,
    height: maxY - minY + padding * 2,
  }
}

// 计算缩放比例，使内容完整填充小地图（contain 模式）
export function getMinimapScale(contentBounds: Rect, minimapSize: { width: number; height: number }) {
  const scaleX = minimapSize.width / contentBounds.width
  const scaleY = minimapSize.height / contentBounds.height
  return Math.min(scaleX, scaleY)
}
