import { CanvasElement } from '@/stores/canvasStore'

interface Guideline {
  type: 'horizontal' | 'vertical'
  position: number
  originId?: string // 对齐线来源元素的ID
}

interface SnapResult {
  x?: number
  y?: number
  guidelines: Guideline[]
}

/**
 * 计算辅助线和吸附位置
 */
export function calculateGuidelines(
  movingElement: CanvasElement,
  allElements: Record<string, CanvasElement>,
  selectedIds: string[],
  threshold = 3, //辅助线吸附
): SnapResult {
  const result: SnapResult = {
    guidelines: [],
  }

  // 获取移动元素的边界
  const movingBounds = getElementBounds(movingElement)

  // 遍历所有其他元素（排除正在移动的元素和选中的元素）
  Object.entries(allElements).forEach(([id, element]) => {
    if (id === movingElement.id || selectedIds.includes(id)) {
      return
    }

    const bounds = getElementBounds(element)

    // 检查水平对齐
    // 左对左
    if (Math.abs(movingBounds.left - bounds.left) < threshold) {
      result.x = bounds.left
      result.guidelines.push({ type: 'vertical', position: bounds.left, originId: id })
    }
    // 左对右
    else if (Math.abs(movingBounds.left - bounds.right) < threshold) {
      result.x = bounds.right
      result.guidelines.push({ type: 'vertical', position: bounds.right, originId: id })
    }
    // 右对右
    else if (Math.abs(movingBounds.right - bounds.right) < threshold) {
      result.x = bounds.right - movingElement.width
      result.guidelines.push({ type: 'vertical', position: bounds.right, originId: id })
    }
    // 右对左
    else if (Math.abs(movingBounds.right - bounds.left) < threshold) {
      result.x = bounds.left - movingElement.width
      result.guidelines.push({ type: 'vertical', position: bounds.left, originId: id })
    }
    // 中心对中心（水平）
    else if (Math.abs(movingBounds.centerX - bounds.centerX) < threshold) {
      result.x = bounds.centerX - movingElement.width / 2
      result.guidelines.push({ type: 'vertical', position: bounds.centerX, originId: id })
    }

    // 检查垂直对齐
    // 上对上
    if (Math.abs(movingBounds.top - bounds.top) < threshold) {
      result.y = bounds.top
      result.guidelines.push({ type: 'horizontal', position: bounds.top, originId: id })
    }
    // 上对下
    else if (Math.abs(movingBounds.top - bounds.bottom) < threshold) {
      result.y = bounds.bottom
      result.guidelines.push({ type: 'horizontal', position: bounds.bottom, originId: id })
    }
    // 下对下
    else if (Math.abs(movingBounds.bottom - bounds.bottom) < threshold) {
      result.y = bounds.bottom - movingElement.height
      result.guidelines.push({ type: 'horizontal', position: bounds.bottom, originId: id })
    }
    // 下对上
    else if (Math.abs(movingBounds.bottom - bounds.top) < threshold) {
      result.y = bounds.top - movingElement.height
      result.guidelines.push({ type: 'horizontal', position: bounds.top, originId: id })
    }
    // 中心对中心（垂直）
    else if (Math.abs(movingBounds.centerY - bounds.centerY) < threshold) {
      result.y = bounds.centerY - movingElement.height / 2
      result.guidelines.push({ type: 'horizontal', position: bounds.centerY, originId: id })
    }
  })

  return result
}

/**
 * 获取元素边界信息
 */
function getElementBounds(element: CanvasElement) {
  return {
    left: element.x,
    top: element.y,
    right: element.x + element.width,
    bottom: element.y + element.height,
    centerX: element.x + element.width / 2,
    centerY: element.y + element.height / 2,
  }
}
