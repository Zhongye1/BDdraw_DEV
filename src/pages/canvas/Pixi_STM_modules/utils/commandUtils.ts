import { useStore, type CanvasElement, GroupElement } from '@/stores/canvasStore'
import { UpdateElementCommand } from '@/lib/UpdateElementCommand'
import { undoRedoManager } from '@/lib/UndoRedoManager'

/**
 * 创建并执行移动命令
 * @param dragInitialStates 初始状态映射
 * @param state 当前状态
 */
export function executeMoveCommand(
  dragInitialStates: Record<string, Partial<CanvasElement>> | null,
  state: ReturnType<typeof useStore.getState>,
) {
  console.log('[StageManager] 结束移动操作')

  // 操作结束时解锁撤销/重做管理器
  undoRedoManager.unlock()
  console.log('[StageManager] 解锁撤销/重做管理器')

  const operations: any[] = []
  let hasChanges = false

  Object.entries(dragInitialStates || {}).forEach(([id, initialAttrs]) => {
    const finalElement = state.elements[id]
    if (!finalElement) return

    // 检查是否真的发生了移动，避免微小抖动或原地点击产生历史记录
    const isMoved = finalElement.x !== initialAttrs.x || finalElement.y !== initialAttrs.y

    if (isMoved) {
      hasChanges = true
      operations.push({
        id,
        initialAttrs, // 只有 x, y, points
        finalAttrs: {
          x: finalElement.x,
          y: finalElement.y,
          points: finalElement.points ? [...finalElement.points] : undefined,
        },
      })
    }

    // 如果是组元素，还需要添加组内元素的记录
    if (finalElement.type === 'group') {
      const groupElement = finalElement as GroupElement
      groupElement.children.forEach((childId) => {
        const childElement = state.elements[childId]
        const childInitialAttrs = dragInitialStates![childId]
        if (childElement && childInitialAttrs) {
          const childIsMoved = childElement.x !== childInitialAttrs.x || childElement.y !== childInitialAttrs.y
          if (childIsMoved) {
            operations.push({
              id: childId,
              initialAttrs: {
                x: childInitialAttrs.x,
                y: childInitialAttrs.y,
              },
              finalAttrs: {
                x: childElement.x,
                y: childElement.y,
              },
            })
          }
        }
      })
    }
  })

  if (hasChanges && operations.length > 0) {
    const moveCommand = new UpdateElementCommand(operations, '移动元素')
    undoRedoManager.executeCommand(moveCommand)
    console.log('[StageManager] 创建并执行 Move Command')
  }
}

/**
 * 创建并执行调整大小命令
 * @param resizeInitialStates 初始状态映射
 * @param state 当前状态
 */
export function executeResizeCommand(
  resizeInitialStates: Record<string, Partial<CanvasElement>> | null,
  state: ReturnType<typeof useStore.getState>,
) {
  console.log('[StageManager] 结束调整大小操作')

  // 操作结束时解锁撤销/重做管理器
  undoRedoManager.unlock()
  console.log('[StageManager] 解锁撤销/重做管理器')

  const operations: any[] = []

  // 遍历所有被记录的初始状态 (包含了深层子元素)
  Object.entries(resizeInitialStates || {}).forEach(([id, initialAttrs]) => {
    const finalElement = state.elements[id]
    if (!finalElement) return

    // 构造最终状态 (包含所有可能变化的属性)
    const finalAttrs = {
      x: finalElement.x,
      y: finalElement.y,
      width: finalElement.width,
      height: finalElement.height,
      points: finalElement.points ? [...finalElement.points] : undefined,
      fontSize: (finalElement as any).fontSize,
      strokeWidth: (finalElement as any).strokeWidth,
      rotation: finalElement.rotation,
    }

    // 简单对比是否变化
    const hasChanged = JSON.stringify(initialAttrs) !== JSON.stringify(finalAttrs)

    if (hasChanged) {
      operations.push({ id, initialAttrs, finalAttrs })
    }
  })

  if (operations.length > 0) {
    // 这里不需要递归了，因为 operations 列表里已经包含了所有层级的元素
    const resizeCommand = new UpdateElementCommand(operations, '调整元素大小')
    undoRedoManager.executeCommand(resizeCommand)
  }
}

/**
 * 创建并执行旋转命令
 * @param rotationInitialStates 初始状态映射
 * @param state 当前状态
 */
export function executeRotateCommand(
  rotationInitialStates: Record<string, any> | null,
  state: ReturnType<typeof useStore.getState>,
) {
  console.log('[StageManager] 结束旋转操作')
  undoRedoManager.unlock()

  const operations: any[] = []

  Object.entries(rotationInitialStates || {}).forEach(([id, initialAttrs]) => {
    const finalElement = state.elements[id]
    if (!finalElement) return

    // 获取最终状态
    const finalAttrs = {
      x: finalElement.x,
      y: finalElement.y,
      width: finalElement.width,
      height: finalElement.height,
      rotation: finalElement.rotation || 0,
    }

    // 检查是否有变化 (对比 x, y, rotation)
    // 注意：即使只是自转，x/y 也可能因为精度问题微变，或者如果是多选旋转，x/y 必然变
    const hasChanged =
      Math.abs(initialAttrs.x - finalAttrs.x) > 0.01 ||
      Math.abs(initialAttrs.y - finalAttrs.y) > 0.01 ||
      Math.abs(initialAttrs.width - finalAttrs.width) > 0.01 ||
      Math.abs(initialAttrs.height - finalAttrs.height) > 0.01 ||
      Math.abs(initialAttrs.rotation - finalAttrs.rotation) > 0.001

    if (hasChanged) {
      operations.push({
        id,
        initialAttrs: {
          x: initialAttrs.x,
          y: initialAttrs.y,
          width: initialAttrs.width,
          height: initialAttrs.height,
          rotation: initialAttrs.rotation,
        },
        finalAttrs: finalAttrs,
      })

      // 如果是组元素，还需要添加组内元素的记录
      if (finalElement.type === 'group') {
        const groupElement = finalElement as GroupElement
        groupElement.children.forEach((childId) => {
          const childElement = state.elements[childId]
          const childInitialAttrs = rotationInitialStates![childId]
          if (childElement && childInitialAttrs) {
            const childFinalAttrs = {
              x: childElement.x,
              y: childElement.y,
              width: childElement.width,
              height: childElement.height,
              rotation: childElement.rotation || 0,
            }

            const childHasChanged =
              Math.abs(childInitialAttrs.x - childFinalAttrs.x) > 0.01 ||
              Math.abs(childInitialAttrs.y - childFinalAttrs.y) > 0.01 ||
              Math.abs(childInitialAttrs.width - childFinalAttrs.width) > 0.01 ||
              Math.abs(childInitialAttrs.height - childFinalAttrs.height) > 0.01 ||
              Math.abs(childInitialAttrs.rotation - childFinalAttrs.rotation) > 0.001

            if (childHasChanged) {
              operations.push({
                id: childId,
                initialAttrs: {
                  x: childInitialAttrs.x,
                  y: childInitialAttrs.y,
                  width: childInitialAttrs.width,
                  height: childInitialAttrs.height,
                  rotation: childInitialAttrs.rotation,
                },
                finalAttrs: childFinalAttrs,
              })
            }
          }
        })
      }
    }
  })

  if (operations.length > 0) {
    const rotateCommand = new UpdateElementCommand(operations, '旋转元素')
    undoRedoManager.executeCommand(rotateCommand)
  }
}
