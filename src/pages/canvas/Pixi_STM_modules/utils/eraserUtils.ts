import * as PIXI from 'pixi.js'
import { RemoveElementCommand } from '@/lib/RemoveElementCommand'
import { undoRedoManager } from '@/lib/UndoRedoManager'
import { useStore } from '@/stores/canvasStore'

/**
 * 处理橡皮擦模式下的指针移动事件
 * @param e PIXI指针事件
 * @param eraserGraphic 橡皮擦图形对象
 * @param removeElements 删除元素的函数
 */
export function handleErasingMove(
  e: PIXI.FederatedPointerEvent,
  eraserGraphic: PIXI.Graphics,
  //removeElements: (ids: string[]) => void,
) {
  if (e.target && e.target.label) {
    const hitId = e.target.label
    const state = useStore.getState()
    const element = state.elements[hitId]

    // 创建并执行删除元素命令
    if (element) {
      const removeCommand = new RemoveElementCommand({ element })
      undoRedoManager.executeCommand(removeCommand)
    }
  } else {
    const eraserSize = 15
    const worldPos = e.getLocalPosition(e.currentTarget as PIXI.Container)

    eraserGraphic.clear()
    eraserGraphic.circle(worldPos.x, worldPos.y, eraserSize)
    eraserGraphic.stroke({ width: 2, color: 0xff0000 })
  }
}

/**
 * 清理橡皮擦图形
 * @param eraserGraphic 橡皮擦图形对象
 */
export function clearEraser(eraserGraphic: PIXI.Graphics) {
  eraserGraphic.clear()
}
