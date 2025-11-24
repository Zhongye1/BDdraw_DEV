import { useStore, type GroupElement } from '@/stores/canvasStore'

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
    // 重置起点，使 dx/dy 成为增量
    return { x: currentPos.x, y: currentPos.y }
  }

  return startPos
}
