import { type CanvasElement } from '@/stores/canvasStore'
import { rotatePoint } from './geometryUtils'

// 添加节流函数
const throttle = <Args extends unknown[]>(func: (...args: Args) => void, limit: number) => {
  let inThrottle: boolean
  return function (this: any, ...args: Args) {
    if (!inThrottle) {
      func.apply(this, args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}

// 添加缓存机制
const rotationCache = new Map<string, { x: number; y: number; rotation: number }>()
let cacheTimeout: number | null = null

/**
 * 计算旋转操作的结果
 * @param rotationInitialStates 旋转初始状态
 * @param rotationCenter 旋转中心点
 * @param startRotationAngle 起始旋转角度
 * @param currentPos 当前鼠标位置
 * @returns 旋转后各元素的新属性
 */
export function calculateRotation(
  rotationInitialStates: Record<string, any>,
  rotationCenter: { x: number; y: number },
  startRotationAngle: number,
  currentPos: { x: number; y: number },
) {
  const { x: cx, y: cy } = rotationCenter

  // 1. 计算当前鼠标角度
  const currentAngle = Math.atan2(currentPos.y - cy, currentPos.x - cx)

  // 2. 计算旋转增量（当前角度 - 起始角度）
  const deltaAngle = currentAngle - startRotationAngle

  // 3. 计算所有元素的新属性
  const rotatedElements: Record<string, Partial<CanvasElement>> = {}

  // 遍历所有选中元素并计算它们的旋转角度和位置
  Object.entries(rotationInitialStates).forEach(([id, initEl]) => {
    // 检查是否为组元素
    if (initEl.type === 'group') {
      // 对于组元素，计算新的自转角度
      const newRotation = initEl.rotation + deltaAngle

      // 计算新的位置 (公转)
      const newCenter = rotatePoint(initEl.cx, initEl.cy, cx, cy, deltaAngle)
      const newX = newCenter.x - initEl.width / 2
      const newY = newCenter.y - initEl.height / 2

      rotatedElements[id] = {
        x: newX,
        y: newY,
        rotation: newRotation,
      }

      // 注意：组内子元素的处理将在主逻辑中单独处理
    } else {
      // 普通元素的处理逻辑
      const newRotation = initEl.rotation + deltaAngle
      // 公转
      const newCenter = rotatePoint(initEl.cx, initEl.cy, cx, cy, deltaAngle)
      const newX = newCenter.x - initEl.width / 2
      const newY = newCenter.y - initEl.height / 2

      rotatedElements[id] = {
        x: newX,
        y: newY,
        rotation: newRotation,
      }
    }
  })

  // 清除之前的缓存超时
  if (cacheTimeout) {
    clearTimeout(cacheTimeout)
  }

  // 设置新的缓存超时（100ms后清除缓存）
  cacheTimeout = window.setTimeout(() => {
    rotationCache.clear()
  }, 100) as unknown as number

  return {
    rotatedElements,
    deltaAngle,
  }
}

/**
 * 计算组内子元素的旋转结果
 * @param rotationInitialStates 旋转初始状态
 * @param groupId 组元素ID
 * @param deltaAngle 旋转角度增量
 * @param rotationCenter 旋转中心点
 * @returns 子元素的新属性
 */
export function calculateGroupChildrenRotation(
  rotationInitialStates: Record<string, any>,
  groupId: string,
  deltaAngle: number,
  rotationCenter: { x: number; y: number },
) {
  const { x: cx, y: cy } = rotationCenter
  const childrenUpdates: Record<string, Partial<CanvasElement>> = {}

  // 获取组元素
  const groupElement = rotationInitialStates[groupId] as any

  if (groupElement && groupElement.children) {
    groupElement.children.forEach((childId: string) => {
      const childInitEl = rotationInitialStates[childId]
      if (!childInitEl) return

      // 计算子元素新的位置
      const childNewCenter = rotatePoint(childInitEl.cx, childInitEl.cy, cx, cy, deltaAngle)
      const childNewX = childNewCenter.x - childInitEl.width / 2
      const childNewY = childNewCenter.y - childInitEl.height / 2

      childrenUpdates[childId] = {
        x: childNewX,
        y: childNewY,
        rotation: childInitEl.rotation + deltaAngle,
      }
    })
  }

  return childrenUpdates
}

// 创建节流版本的计算函数
export const throttledCalculateRotation = throttle(calculateRotation, 16) // 约60fps
