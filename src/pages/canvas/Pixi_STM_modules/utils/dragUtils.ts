import { useStore, type GroupElement } from '@/stores/canvasStore'
import { calculateGuidelines } from './guidelineUtils'

/**
 * 处理拖拽模式下的指针移动事件
 * @param state 应用状态
 * @param selectedIds 选中的元素ID列表
 * @param startPos 起始位置
 * @param currentPos 当前位置
 * @param updateElement 更新元素的函数
 * @returns 新的起始位置
 */
export function handleDraggingMove(
  state: ReturnType<typeof useStore.getState>,
  selectedIds: string[],
  startPos: { x: number; y: number },
  currentPos: { x: number; y: number },
  updateElement: (id: string, attrs: Record<string, any>) => void,
): { x: number; y: number } {
  const dx = currentPos.x - startPos.x
  const dy = currentPos.y - startPos.y

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
