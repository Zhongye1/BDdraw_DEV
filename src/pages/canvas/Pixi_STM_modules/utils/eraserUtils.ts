import * as PIXI from 'pixi.js'

/**
 * 处理橡皮擦模式下的指针移动事件
 * @param e PIXI指针事件
 * @param eraserGraphic 橡皮擦图形对象
 * @param removeElements 删除元素的函数
 */
export function handleErasingMove(
  e: PIXI.FederatedPointerEvent,
  eraserGraphic: PIXI.Graphics,
  removeElements: (ids: string[]) => void,
) {
  if (e.target && e.target.label) {
    const hitId = e.target.label
    removeElements([hitId])
  } else {
    const eraserSize = 20
    const parent = e.target?.parent
    if (!parent) return
    const worldPos = e.getLocalPosition(parent)

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
