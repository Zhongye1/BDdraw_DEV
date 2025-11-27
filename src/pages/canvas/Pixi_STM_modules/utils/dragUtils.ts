import { useStore, type GroupElement, CanvasElement } from '@/stores/canvasStore'
import { calculateGuidelines } from './guidelineUtils'

import { undoRedoManager } from '@/lib/UndoRedoManager'

// 递归获取所有后代元素的 ID（包括子元素的子元素）
function getAllDescendantIds(groupId: string, elements: Record<string, CanvasElement>): string[] {
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

/**
 * 处理拖拽模式下的指针移动事件
 * @param state 应用状态
 * @param selectedIds 选中的元素ID列表
 * @param startPos 起始位置
 * @param currentPos 当前位置
 * @param dragInitialStates 拖拽初始状态，如果没有则在首次移动时创建
 * @param setDragInitialStates 设置拖拽初始状态的函数
 * @param updateState 用于更新状态的回调函数集合
 * @returns 包含新起始位置、拖拽增量和辅助线信息的对象
 */
export function handleDraggingMove(
  state: ReturnType<typeof useStore.getState>,
  selectedIds: string[],
  startPos: { x: number; y: number },
  currentPos: { x: number; y: number },
  dragInitialStates: Record<string, Partial<CanvasElement>> | null,
  setDragInitialStates: (states: Record<string, Partial<CanvasElement>> | null) => void,
  updateState: any,
): {
  newStartPos: { x: number; y: number }
  dragDelta: { dx: number; dy: number }
  snapLines: any[]
} {
  // 如果是第一次拖拽且尚未记录初始状态，则记录初始状态
  let newDragInitialStates = dragInitialStates
  if (!dragInitialStates) {
    const initialDragMap: Record<string, any> = {}

    // 添加当前选中元素的所有后代元素（支持嵌套组）
    const allSelectedIds = [...selectedIds]
    selectedIds.forEach((id) => {
      const el = state.elements[id]
      if (el && el.type === 'group') {
        allSelectedIds.push(...getAllDescendantIds(id, state.elements))
      }
    })

    // 去重
    const uniqueIds = [...new Set(allSelectedIds)]

    uniqueIds.forEach((id) => {
      const el = state.elements[id]
      if (el) {
        // 记录 x, y (如果是直线/箭头，可能也需要记录 points)
        initialDragMap[id] = {
          x: el.x,
          y: el.y,
          points: el.points ? [...el.points.map((p) => [...p])] : undefined,
        }
      }
    })

    setDragInitialStates(initialDragMap)
    newDragInitialStates = initialDragMap

    // 保存到临时状态，确保在 onPointerUp 中可以访问
    if (updateState) {
      ;(updateState as any)._tempDragInitialStates = initialDragMap
    }

    // 开始拖拽时锁定撤销/重做管理器
    undoRedoManager.lock()
  }

  if (selectedIds.length > 0) {
    // 计算总位移 (Current - DragStart)
    const totalDx = currentPos.x - startPos.x
    const totalDy = currentPos.y - startPos.y

    let finalDx = totalDx
    let finalDy = totalDy
    let guidelines: any[] = []

    // 取第一个元素作为参考元素来计算辅助线
    const primaryElementId = selectedIds[0]
    // 确保有初始状态才继续
    if (!newDragInitialStates) {
      return { newStartPos: startPos, dragDelta: { dx: 0, dy: 0 }, snapLines: [] }
    }
    const primaryElementInitial = newDragInitialStates[primaryElementId]

    // 只有当选择单个元素时才计算辅助线，多元素选择时跳过以提升性能
    if (primaryElementInitial && selectedIds.length === 1) {
      // 创建带有新位置的临时元素用于计算辅助线
      const tempElement = {
        ...state.elements[primaryElementId],
        x: primaryElementInitial.x! + totalDx,
        y: primaryElementInitial.y! + totalDy,
      }

      // 计算辅助线和吸附位置
      const snapResult = calculateGuidelines(tempElement, state.elements, selectedIds)

      // 如果有吸附位置，则使用吸附后的位置

      const initialX = primaryElementInitial.x!
      const initialY = primaryElementInitial.y!

      if (snapResult.x !== undefined) finalDx = snapResult.x - initialX
      if (snapResult.y !== undefined) finalDy = snapResult.y - initialY
      guidelines = snapResult.guidelines
    }

    return {
      newStartPos: startPos,
      dragDelta: { dx: finalDx, dy: finalDy },
      snapLines: guidelines,
    }
  }

  return { newStartPos: startPos, dragDelta: { dx: 0, dy: 0 }, snapLines: [] }
}
