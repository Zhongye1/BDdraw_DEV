import * as PIXI from 'pixi.js'

/**
 * 处理选择模式下的指针移动事件
 * @param startPos 起始位置
 * @param currentPos 当前位置
 * @param selectionRectGraphic 选择矩形图形对象
 */
export function handleSelectingMove(
  startPos: { x: number; y: number },
  currentPos: { x: number; y: number },
  selectionRectGraphic: PIXI.Graphics,
) {
  const x = Math.min(startPos.x, currentPos.x)
  const y = Math.min(startPos.y, currentPos.y)
  const w = Math.abs(currentPos.x - startPos.x)
  const h = Math.abs(currentPos.y - startPos.y)
  selectionRectGraphic
    .clear()
    .rect(x, y, w, h)
    .fill({ color: 0x3b82f6, alpha: 0.2 })
    .stroke({ width: 1, color: 0x3b82f6 })
}

/**
 * 处理选择模式下的指针释放事件
 * @param startPos 起始位置
 * @param endPos 结束位置
 * @param elements 所有元素
 * @param setSelected 设置选中元素的函数
 * @param selectionRectGraphic 选择矩形图形对象
 */
export function handleSelectingUp(
  startPos: { x: number; y: number },
  endPos: { x: number; y: number },
  elements: Record<string, any>,
  setSelected: (ids: string[]) => void,
  selectionRectGraphic: PIXI.Graphics,
) {
  const minX = Math.min(startPos.x, endPos.x)
  const maxX = Math.max(startPos.x, endPos.x)
  const minY = Math.min(startPos.y, endPos.y)
  const maxY = Math.max(startPos.y, endPos.y)
  const hitIds: string[] = []
  Object.values(elements).forEach((el) => {
    if (el.x < maxX && el.x + el.width > minX && el.y < maxY && el.y + el.height > minY) {
      hitIds.push(el.id)
    }
  })
  setSelected(hitIds)
  selectionRectGraphic.clear()
}
