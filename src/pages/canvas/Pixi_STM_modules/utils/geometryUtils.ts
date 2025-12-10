import type { CanvasElement, GroupElement } from '@/stores/canvasStore'

// 基础旋转工具
export function rotatePoint(x: number, y: number, cx: number, cy: number, angle: number) {
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  return {
    x: (x - cx) * cos - (y - cy) * sin + cx,
    y: (x - cx) * sin + (y - cy) * cos + cy,
  }
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
 * 计算组的精确几何属性 (OBB)
 * @param elements 画布元素字典
 * @param childIds 组内子元素的ID
 * @param groupRotation 组的旋转角度 (通常取第一个子元素的角度，或0)
 */
export function calculateGroupBounds(
  elements: Record<string, CanvasElement>,
  childIds: string[],
  groupRotation: number,
) {
  let minLx = Infinity,
    maxLx = -Infinity
  let minLy = Infinity,
    maxLy = -Infinity

  childIds.forEach((id) => {
    const el = elements[id]
    if (!el) return

    // 1. 获取子元素的世界坐标参数
    // 注意：如果是 Text，建议通过 measureText 获取真实渲染宽
    const elW = el.width
    const elH = el.height
    const elCx = el.x + elW / 2
    const elCy = el.y + elH / 2
    const elRot = el.rotation || 0

    // 2. 计算子元素 4 个角在【世界坐标系】的位置
    const corners = [
      { x: -elW / 2, y: -elH / 2 },
      { x: elW / 2, y: -elH / 2 },
      { x: elW / 2, y: elH / 2 },
      { x: -elW / 2, y: elH / 2 },
    ]

    corners.forEach((c) => {
      // 子元素局部 -> 世界
      const pWorld = rotatePoint(elCx + c.x, elCy + c.y, elCx, elCy, elRot)

      // 3. 关键：世界 -> 组的【未旋转】局部坐标
      // 逆向旋转 (-groupRotation)，相当于把组"摆正"来测量
      const pLocal = rotatePoint(pWorld.x, pWorld.y, 0, 0, -groupRotation)

      if (pLocal.x < minLx) minLx = pLocal.x
      if (pLocal.x > maxLx) maxLx = pLocal.x
      if (pLocal.y < minLy) minLy = pLocal.y
      if (pLocal.y > maxLy) maxLy = pLocal.y
    })
  })

  if (minLx === Infinity) return null

  // 4. 算出摆正后的宽高
  const width = maxLx - minLx
  const height = maxLy - minLy

  // 5. 算出摆正后的中心，再【转回】世界坐标
  const cxLocal = minLx + width / 2
  const cyLocal = minLy + height / 2
  const centerWorld = rotatePoint(cxLocal, cyLocal, 0, 0, groupRotation)

  // 6. 返回 Store 需要的格式 (左上角 x,y)
  return {
    x: centerWorld.x - width / 2,
    y: centerWorld.y - height / 2,
    width,
    height,
    rotation: groupRotation,
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
