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
 * @param updateElement 更新元素的函数
 * @param dragInitialStates 拖拽初始状态，如果没有则在首次移动时创建
 * @param setDragInitialStates 设置拖拽初始状态的函数
 * @param updateState 用于更新状态的回调函数集合
 * @returns 新的起始位置
 */
export function handleDraggingMove(
  state: ReturnType<typeof useStore.getState>,
  selectedIds: string[],
  startPos: { x: number; y: number },
  currentPos: { x: number; y: number },
  updateElement: (id: string, attrs: Record<string, any>) => void,
  dragInitialStates: Record<string, Partial<CanvasElement>> | null,
  setDragInitialStates: (states: Record<string, Partial<CanvasElement>> | null) => void,
  updateState: any,
): { x: number; y: number } {
  const dx = currentPos.x - startPos.x
  const dy = currentPos.y - startPos.y

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
    // 先计算原始新位置
    const newPositions: Record<string, { x: number; y: number }> = {}

    selectedIds.forEach((id) => {
      const el = state.elements[id]
      if (el) {
        newPositions[id] = {
          x: el.x + dx,
          y: el.y + dy,
        }
      }
    })

    // 取第一个元素作为参考元素来计算辅助线
    const primaryElementId = selectedIds[0]
    const primaryElement = state.elements[primaryElementId]

    if (primaryElement) {
      // 创建带有新位置的临时元素用于计算辅助线
      const tempElement = {
        ...primaryElement,
        x: newPositions[primaryElementId].x,
        y: newPositions[primaryElementId].y,
      }

      // 计算辅助线和吸附位置
      const snapResult = calculateGuidelines(tempElement, state.elements, selectedIds)

      // 如果有吸附位置，则使用吸附后的位置
      if (snapResult.x !== undefined || snapResult.y !== undefined) {
        const adjustedDx = snapResult.x !== undefined ? snapResult.x - primaryElement.x : dx
        const adjustedDy = snapResult.y !== undefined ? snapResult.y - primaryElement.y : dy

        // 更新所有选中元素的位置
        selectedIds.forEach((id) => {
          const el = state.elements[id]
          if (el) {
            updateElement(id, {
              x: el.x + adjustedDx,
              y: el.y + adjustedDy,
            })

            // 如果是组元素，同时移动组内所有子元素
            if (el.type === 'group') {
              const groupElement = el as GroupElement
              groupElement.children.forEach((childId) => {
                const childEl = state.elements[childId]
                if (childEl) {
                  updateElement(childId, {
                    x: childEl.x + adjustedDx,
                    y: childEl.y + adjustedDy,
                  })
                }
              })
            }
          }
        })

        // 发送事件以绘制辅助线
        if (typeof window !== 'undefined' && window.dispatchEvent) {
          window.dispatchEvent(new CustomEvent('drawGuidelines', { detail: snapResult.guidelines }))
          //console.log('发送绘制辅助线事件:', snapResult.guidelines)
        }
      } else {
        // 没有吸附，使用原始位置
        selectedIds.forEach((id) => {
          const el = state.elements[id]
          if (el) {
            updateElement(id, {
              x: newPositions[id].x,
              y: newPositions[id].y,
            })

            // 如果是组元素，同时移动组内所有子元素
            if (el.type === 'group') {
              const groupElement = el as GroupElement
              groupElement.children.forEach((childId) => {
                const childEl = state.elements[childId]
                if (childEl) {
                  updateElement(childId, {
                    x: childEl.x + dx,
                    y: childEl.y + dy,
                  })
                }
              })
            }
          }
        })

        // 只在有辅助线显示时才清除
        if (typeof window !== 'undefined' && window.dispatchEvent) {
          // 检查是否有辅助线需要清除的标志
          const hasGuidelines = document.body.classList.contains('has-guidelines')
          if (hasGuidelines) {
            window.dispatchEvent(new CustomEvent('clearGuidelines'))
            //console.log('发送清除辅助线事件')
            document.body.classList.remove('has-guidelines')
          }
        }
      }
    } else {
      // 没有主要元素，使用原始逻辑
      selectedIds.forEach((id) => {
        const el = state.elements[id]

        // 检查是否为组元素
        if (el && el.type === 'group') {
          // 对于组元素，使用与多选元素相同的逻辑
          updateElement(id, { x: el.x + dx, y: el.y + dy })

          // 同时移动组内所有子元素
          const groupElement = el as GroupElement
          groupElement.children.forEach((childId) => {
            const childEl = state.elements[childId]
            if (childEl) {
              updateElement(childId, { x: childEl.x + dx, y: childEl.y + dy })
            }
          })
        } else {
          // 普通元素移动
          updateElement(id, { x: el.x + dx, y: el.y + dy })
        }
      })

      // 清除辅助线
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('clearGuidelines'))
        console.log('发送清除辅助线事件')
      }
    }

    // 重置起点，使 dx/dy 成为增量
    return { x: currentPos.x, y: currentPos.y }
  }

  return startPos
}
