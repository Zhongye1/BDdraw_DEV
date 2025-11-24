import { Viewport } from 'pixi-viewport'

/**
 * 更新视口状态
 * @param viewport Pixi视口
 * @param tool 当前工具
 * @param isSpacePressed 空格键是否按下
 */
export function updateViewportState(viewport: Viewport, tool: string, isSpacePressed: boolean) {
  if (!viewport) return
  const isHandMode = tool === 'hand' || isSpacePressed
  if (isHandMode) {
    viewport.drag({ mouseButtons: 'all' })
    viewport.cursor = 'grab'
  } else {
    viewport.drag({ mouseButtons: 'middle' })
    viewport.cursor = 'default'
  }
}

/**
 * 更新光标样式
 * @param canvas HTML画布元素
 * @param tool 当前工具
 * @param isSpacePressed 空格键是否按下
 */
export function updateCursor(canvas: HTMLCanvasElement | null, tool: string, isSpacePressed: boolean) {
  if (!canvas) return
  if (isSpacePressed || tool === 'hand') canvas.style.cursor = 'grab'
  else if (tool === 'select') canvas.style.cursor = 'default'
  else canvas.style.cursor = 'crosshair'
}
