import type { CanvasElement, GroupElement } from '@/stores/canvasStore'

/**
 * 计算点绕中心旋转后的新坐标
 * @param x 点的 x
 * @param y 点的 y
 * @param cx 中心点 x
 * @param cy 中心点 y
 * @param angle 旋转角度 (弧度)
 */
export function rotatePoint(x: number, y: number, cx: number, cy: number, angle: number) {
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  const nx = cos * (x - cx) - sin * (y - cy) + cx
  const ny = sin * (x - cx) + cos * (y - cy) + cy
  return { x: nx, y: ny }
}

/**
 * 计算点绕中心旋转后的新坐标 (增强版本)
 * @param x 点的 x
 * @param y 点的 y
 * @param cx 中心点 x
 * @param cy 中心点 y
 * @param angle 旋转角度 (弧度)
 */
export function rotatePointAdvanced(x: number, y: number, cx: number, cy: number, angle: number) {
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  return {
    x: cx + (x - cx) * cos - (y - cy) * sin,
    y: cy + (x - cx) * sin + (y - cy) * cos,
  }
}

/**
 * 计算选中元素的整体包围盒
 * @param selectedIds 选中的元素ID列表
 * @param elements 元素映射
 */
export function getSelectionBounds(selectedIds: string[], elements: Record<string, CanvasElement>) {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity

  let hasValid = false
  selectedIds.forEach((id) => {
    const el = elements[id]
    if (!el) return
    hasValid = true
    // 使用数据模型中的宽高计算
    // 如果想要更精确的 Text 包围盒，可以结合 ElementRenderer 的 spriteMap

    // 如果是组元素，需要特殊处理
    if (el.type === 'group') {
      minX = Math.min(minX, el.x)
      minY = Math.min(minY, el.y)
      maxX = Math.max(maxX, el.x + el.width)
      maxY = Math.max(maxY, el.y + el.height)
    } else {
      // 普通元素
      minX = Math.min(minX, el.x)
      minY = Math.min(minY, el.y)
      maxX = Math.max(maxX, el.x + el.width)
      maxY = Math.max(maxY, el.y + el.height)
    }
  })

  if (!hasValid) return null
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
}

/**
 * 递归获取所有后代元素的 ID（包括子元素的子元素）
 * @param groupId 组ID
 * @param elements 元素映射
 */
export function getAllDescendantIds(groupId: string, elements: Record<string, CanvasElement>): string[] {
  const group = elements[groupId]
  if (!group || group.type !== 'group') return []

  const groupEl = group as GroupElement
  let descendants: string[] = [...groupEl.children]

  groupEl.children.forEach((childId) => {
    // 递归查找：如果子元素也是组，把它的后代也加进来
    descendants = descendants.concat(getAllDescendantIds(childId, elements))
  })

  return descendants
}
