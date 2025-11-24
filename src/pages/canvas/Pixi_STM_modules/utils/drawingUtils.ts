import { useStore } from '@/stores/canvasStore'
import { undoRedoManager } from '@/lib/UndoRedoManager'

/**
 * 处理绘图模式下的指针移动事件
 * @param state 应用状态
 * @param currentId 当前元素ID
 * @param startPos 起始位置
 * @param currentPos 当前位置
 * @param updateElement 更新元素的函数
 */
export function handleDrawingMove(
  state: ReturnType<typeof useStore.getState>,
  currentId: string | null,
  startPos: { x: number; y: number },
  currentPos: { x: number; y: number },
  updateElement: (id: string, attrs: Record<string, any>) => void,
) {
  if (!currentId) return

  const el = state.elements[currentId]
  if (!el) return

  if (el.type === 'line' || el.type === 'arrow') {
    const dx = currentPos.x - startPos.x
    const dy = currentPos.y - startPos.y
    updateElement(currentId, {
      points: [
        [0, 0],
        [dx, dy],
      ],
      width: Math.abs(dx),
      height: Math.abs(dy),
    })
  } else if (el.type === 'pencil') {
    const localX = currentPos.x - el.x
    const localY = currentPos.y - el.y
    const newPoints = [...(el.points || []), [localX, localY]]
    const xs = newPoints.map((p) => p[0])
    const ys = newPoints.map((p) => p[1])
    updateElement(currentId, {
      points: newPoints,
      width: Math.max(...xs) - Math.min(...xs),
      height: Math.max(...ys) - Math.min(...ys),
    })
  } else {
    const width = currentPos.x - startPos.x
    const height = currentPos.y - startPos.y
    const x = width < 0 ? startPos.x + width : startPos.x
    const y = height < 0 ? startPos.y + height : startPos.y
    updateElement(currentId, { x, y, width: Math.abs(width), height: Math.abs(height) })
  }
}

/**
 * 处理绘图模式下的指针释放事件
 * @param state 应用状态
 * @param currentId 当前元素ID
 * @param updateElement 更新元素的函数
 * @param removeElements 删除元素的函数
 * @returns 是否应该返回不继续处理
 */
export function handleDrawingUp(
  state: ReturnType<typeof useStore.getState>,
  currentId: string | null,
  updateElement: (id: string, attrs: Record<string, any>) => void,
  removeElements: (ids: string[]) => void,
): boolean {
  if (!currentId) return false

  const el = state.elements[currentId]
  // 添加安全检查，确保元素存在再访问其属性
  if (el) {
    if ((el.type === 'pencil' || el.type === 'line' || el.type === 'arrow') && el.points) {
      const absPoints = el.points.map((p) => ({ x: el.x + p[0], y: el.y + p[1] }))
      const xs = absPoints.map((p) => p.x)
      const ys = absPoints.map((p) => p.y)
      const minX = Math.min(...xs)
      const minY = Math.min(...ys)
      const maxX = Math.max(...xs)
      const maxY = Math.max(...ys)

      // 更新元素位置和尺寸
      updateElement(currentId, {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
        points: absPoints.map((p) => [p.x - minX, p.y - minY]),
      })
    } else {
      // 对于其他元素类型，确保有合理的尺寸
      if (el.width === 0 && el.height === 0) {
        // 如果没有实际绘制（点击后立即释放），删除元素
        removeElements([currentId])
        undoRedoManager.unlock()
        return true
      }
    }

    // 解锁撤销/重做管理器
    undoRedoManager.unlock()
    console.log('[StageManager] 解锁撤销/重做管理器')
    return false
  }

  return true
}
