import { type CanvasElement } from '@/stores/canvasStore'
import { rotatePoint } from './geometryUtils'

// 添加节流函数
const throttle = (func: (...args: any[]) => any, limit: number) => {
  let inThrottle: boolean
  return function (this: any, ...args: any[]) {
    if (!inThrottle) {
      func.apply(this, args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}

// 添加缓存机制
const scaleCache = new Map<string, Record<string, Partial<CanvasElement>>>()
let cacheTimeout: number | null = null

/**
 * 计算缩放操作的结果
 * @param initialElementsMap 初始元素状态映射
 * @param initialGroupBounds 初始组边界
 * @param selectedIds 选中的元素ID列表
 * @param handle 操作手柄类型
 * @param startPos 起始位置
 * @param currentPos 当前位置
 * @returns 缩放后各元素的新属性
 */
export function calculateScaling(
  initialElementsMap: Record<string, any>,
  initialGroupBounds: { x: number; y: number; width: number; height: number },
  selectedIds: string[],
  handle: string | null,
  startPos: { x: number; y: number },
  currentPos: { x: number; y: number },
) {
  // === 2. 确定"隐式组"的属性 ===

  // 2.1 确定组的旋转角度 (Group Angle)
  // - 单选或多选统一旋转：使用该统一角度
  // - 多选混合旋转：使用 0 度 (AABB)
  let groupAngle = 0

  // 检查统一旋转
  const firstRotation = initialElementsMap[selectedIds[0]]?.rotation || 0
  const isUniform = selectedIds.every((id) => Math.abs((initialElementsMap[id]?.rotation || 0) - firstRotation) < 0.001)
  if (isUniform) {
    groupAngle = firstRotation
  }

  // 2.2 确定组的旋转中心 (Pivot) - 使用初始包围盒的中心
  const groupCx = initialGroupBounds.x + initialGroupBounds.width / 2
  const groupCy = initialGroupBounds.y + initialGroupBounds.height / 2

  // 2.3 计算组在"去旋转"后的局部包围盒 (Local OBB)
  // 这一步是为了确定手柄操作的基准框
  let minLx = Infinity,
    maxLx = -Infinity,
    minLy = Infinity,
    maxLy = -Infinity

  Object.keys(initialElementsMap).forEach((id) => {
    const el = initialElementsMap[id]
    // 元素的四个角点
    const elCx = el.x + el.width / 2
    const elCy = el.y + el.height / 2
    const elHalfW = el.width / 2
    const elHalfH = el.height / 2
    const elRot = el.rotation || 0

    // 计算元素四个角点在世界坐标的位置
    // 然后将其旋转回组的局部坐标系
    const corners = [
      { x: -elHalfW, y: -elHalfH }, // TL
      { x: elHalfW, y: -elHalfH }, // TR
      { x: elHalfW, y: elHalfH }, // BR
      { x: -elHalfW, y: elHalfH }, // BL
    ].map((p) => {
      // 1. 元素自转转回世界坐标 (相对元素中心)
      const pWorldRel = rotatePoint(p.x, p.y, 0, 0, elRot)
      const pWorld = { x: elCx + pWorldRel.x, y: elCy + pWorldRel.y }
      // 2. 世界坐标转回组局部坐标 (相对组中心)
      return rotatePoint(pWorld.x, pWorld.y, groupCx, groupCy, -groupAngle)
    })

    corners.forEach((p) => {
      minLx = Math.min(minLx, p.x)
      maxLx = Math.max(maxLx, p.x)
      minLy = Math.min(minLy, p.y)
      maxLy = Math.max(maxLy, p.y)
    })
  })

  const groupInitLocalX = minLx
  const groupInitLocalY = minLy
  const groupInitLocalW = maxLx - minLx
  const groupInitLocalH = maxLy - minLy

  // === 3. 计算拖拽后的组局部包围盒 ===

  // 将鼠标位移转换到组的局部坐标系
  const startLocal = rotatePoint(startPos.x, startPos.y, groupCx, groupCy, -groupAngle)
  const currLocal = rotatePoint(currentPos.x, currentPos.y, groupCx, groupCy, -groupAngle)
  const dx = currLocal.x - startLocal.x
  const dy = currLocal.y - startLocal.y

  let newGroupLocalX = groupInitLocalX
  let newGroupLocalY = groupInitLocalY
  let newGroupLocalW = groupInitLocalW
  let newGroupLocalH = groupInitLocalH

  // 根据手柄调整尺寸 (固定对侧锚点)
  if (handle?.includes('l')) {
    newGroupLocalX += dx
    newGroupLocalW -= dx
  }
  if (handle?.includes('r')) {
    newGroupLocalW += dx
  }
  if (handle?.includes('t')) {
    newGroupLocalY += dy
    newGroupLocalH -= dy
  }
  if (handle?.includes('b')) {
    newGroupLocalH += dy
  }

  // 翻转处理 (Flip)
  let scaleXSign = 1
  let scaleYSign = 1
  if (newGroupLocalW < 0) {
    newGroupLocalW = Math.abs(newGroupLocalW)
    newGroupLocalX -= newGroupLocalW
    scaleXSign = -1
  }
  if (newGroupLocalH < 0) {
    newGroupLocalH = Math.abs(newGroupLocalH)
    newGroupLocalY -= newGroupLocalH
    scaleYSign = -1
  }

  // === 4. 对每个子元素进行矩阵变换模拟 ===
  const scaledElements: Record<string, Partial<CanvasElement>> = {}

  Object.keys(initialElementsMap).forEach((id) => {
    const initEl = initialElementsMap[id]
    if (!initEl) return

    // 4.1 获取元素初始的关键点 (中心 + 尺寸向量)
    // 为了精确模拟矩阵变换，我们追踪元素的三个关键点：左上(TL), 右上(TR), 左下(BL)
    // 通过变换后的这三个点，可以反解出新的 Width, Height, Rotation, XY
    const elCx = initEl.x + initEl.width / 2
    const elCy = initEl.y + initEl.height / 2
    const halfW = initEl.width / 2
    const halfH = initEl.height / 2
    const rot = initEl.rotation || 0

    // 原始局部向量 (相对于元素中心)
    const vTL = { x: -halfW, y: -halfH }
    const vTR = { x: halfW, y: -halfH }
    const vBL = { x: -halfW, y: halfH }

    // 定义变换函数：世界点 -> 组局部 -> 缩放 -> 组局部 -> 世界点
    const transformPoint = (localX: number, localY: number) => {
      // A. 元素局部 -> 世界
      const pWorldRel = rotatePoint(localX, localY, 0, 0, rot)
      const pWorld = { x: elCx + pWorldRel.x, y: elCy + pWorldRel.y }

      // B. 世界 -> 组局部 (Old)
      const pGroupLocal = rotatePoint(pWorld.x, pWorld.y, groupCx, groupCy, -groupAngle)

      // C. 计算在组内的相对比例 (0.0 - 1.0)
      const ratioX = groupInitLocalW === 0 ? 0 : (pGroupLocal.x - groupInitLocalX) / groupInitLocalW
      const ratioY = groupInitLocalH === 0 ? 0 : (pGroupLocal.y - groupInitLocalY) / groupInitLocalH

      // D. 映射到新组局部 (New)
      const pGroupLocalNewX = newGroupLocalX + ratioX * newGroupLocalW
      const pGroupLocalNewY = newGroupLocalY + ratioY * newGroupLocalH

      // E. 组局部 (New) -> 世界 (New)
      return rotatePoint(pGroupLocalNewX, pGroupLocalNewY, groupCx, groupCy, groupAngle)
    }

    // 4.2 变换关键点
    const newTL = transformPoint(vTL.x, vTL.y)
    const newTR = transformPoint(vTR.x, vTR.y)
    const newBL = transformPoint(vBL.x, vBL.y)

    // 4.3 反解属性
    // 新宽度 = TL 到 TR 的距离
    const newWidth = Math.sqrt(Math.pow(newTR.x - newTL.x, 2) + Math.pow(newTR.y - newTL.y, 2))
    // 新高度 = TL 到 BL 的距离
    const newHeight = Math.sqrt(Math.pow(newBL.x - newTL.x, 2) + Math.pow(newBL.y - newTL.y, 2))

    // 新中心 = (TL + TR + BL + BR)/2 => (TL + BR)/2
    // 利用矩形对角线性质：Mid(TL, BR) = Mid(TR, BL)
    // 计算 BR: newBR = newTR + (newBL - newTL) (向量加法)
    const vecTop = { x: newTR.x - newTL.x, y: newTR.y - newTL.y }
    const vecLeft = { x: newBL.x - newTL.x, y: newBL.y - newTL.y }

    // 中心点 = TL + 0.5 * vecTop + 0.5 * vecLeft
    const newCx = newTL.x + vecTop.x / 2 + vecLeft.x / 2
    const newCy = newTL.y + vecTop.y / 2 + vecLeft.y / 2

    // 新旋转 = TL 到 TR 的角度
    // 注意：这是世界坐标系下的角度
    const newRotation = Math.atan2(newTR.y - newTL.y, newTR.x - newTL.x)

    const finalX = newCx - newWidth / 2
    const finalY = newCy - newHeight / 2

    // 4.4 计算平均缩放比例 (用于字体/描边)
    const groupScaleX = groupInitLocalW === 0 ? 1 : newGroupLocalW / groupInitLocalW
    const groupScaleY = groupInitLocalH === 0 ? 1 : newGroupLocalH / groupInitLocalH
    const avgScale = (Math.abs(groupScaleX) + Math.abs(groupScaleY)) / 2

    const updatePayload: any = {
      x: finalX,
      y: finalY,
      width: newWidth,
      height: newHeight,
      rotation: newRotation,
    }

    // 点集处理 (Line/Arrow/Pencil)
    // 简单缩放处理：这对于路径类元素在非均匀缩放下是合理的近似（类似SVG viewBox scaling）
    if (initEl.points) {
      updatePayload.points = initEl.points.map((p: number[]) => {
        return [p[0] * groupScaleX * scaleXSign, p[1] * groupScaleY * scaleYSign]
      })
    }

    if (initEl.fontSize) updatePayload.fontSize = initEl.fontSize * avgScale
    if (initEl.strokeWidth) updatePayload.strokeWidth = initEl.strokeWidth * avgScale

    scaledElements[id] = updatePayload
  })

  // 清除之前的缓存超时
  if (cacheTimeout) {
    clearTimeout(cacheTimeout)
  }

  // 设置新的缓存超时（100ms后清除缓存）
  cacheTimeout = window.setTimeout(() => {
    scaleCache.clear()
  }, 100) as unknown as number

  return scaledElements
}

// 创建节流版本的计算函数
export const throttledCalculateScaling = throttle(calculateScaling, 16) // 约60fps
