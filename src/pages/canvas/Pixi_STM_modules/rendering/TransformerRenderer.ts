import * as PIXI from 'pixi.js'
import type { CanvasElement } from '@/stores/canvasStore'
import type { HandleType } from '../core/types'

export class TransformerRenderer {
  private transformerGraphic = new PIXI.Graphics()

  public getGraphic(): PIXI.Graphics {
    return this.transformerGraphic
  }

  public renderTransformer(
    elements: Record<string, CanvasElement>,
    selectedIds: string[],
    spriteMap: Map<string, PIXI.Graphics | any>,
    onHandleDown: (e: PIXI.FederatedPointerEvent, handle: HandleType | 'p0' | 'p1', elementId: string) => void,
    viewportScale: number,
  ) {
    this.transformerGraphic.clear()
    this.transformerGraphic.removeChildren()

    if (selectedIds.length === 0) return

    const el = elements[selectedIds[0]]
    const isLinearElement =
      selectedIds.length === 1 && (el.type === 'line' || el.type === 'arrow') && el.points?.length === 2

    // --- A. 直线/箭头模式 ---
    if (isLinearElement) {
      const points = el.points!
      const p0 = { x: el.x + points[0][0], y: el.y + points[0][1] }
      const p1 = { x: el.x + points[1][0], y: el.y + points[1][1] }
      const handleSize = 10 / viewportScale

      const drawHandle = (x: number, y: number, type: 'p0' | 'p1') => {
        this.transformerGraphic.circle(x, y, handleSize / 2)
        this.transformerGraphic.fill({ color: 0xffffff })
        this.transformerGraphic.stroke({ width: 1, color: 0x8b5cf6 })

        const hitZone = new PIXI.Graphics()
        hitZone.circle(x, y, handleSize)
        hitZone.fill({ color: 0x000000, alpha: 0.0001 })
        hitZone.eventMode = 'static'
        hitZone.cursor = 'move'
        hitZone.label = `handle:${type}`
        hitZone.on('pointerdown', (e) => {
          e.stopPropagation()
          onHandleDown(e, type, selectedIds[0])
        })
        this.transformerGraphic.addChild(hitZone)
      }
      drawHandle(p0.x, p0.y, 'p0')
      drawHandle(p1.x, p1.y, 'p1')
      return
    }

    // --- B. 普通包围盒模式 (Text, Rect, etc) ---
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity

    selectedIds.forEach((id) => {
      const el = elements[id]
      const sprite = spriteMap.get(id)

      if (!el || !sprite) return

      // 针对 Text，读取 sprite 的实时尺寸
      // 文本的高度是由内容决定的，Store 里的 height 往往不准
      if (el.type === 'text') {
        // 注意：Text/HTMLText 的宽高是包含内容的实时边界
        minX = Math.min(minX, el.x)
        minY = Math.min(minY, el.y)
        maxX = Math.max(maxX, el.x + sprite.width)
        maxY = Math.max(maxY, el.y + sprite.height)
      } else {
        minX = Math.min(minX, el.x)
        minY = Math.min(minY, el.y)
        maxX = Math.max(maxX, el.x + el.width)
        maxY = Math.max(maxY, el.y + el.height)
      }
    })

    const bounds = { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
    this.transformerGraphic.rect(bounds.x, bounds.y, bounds.width, bounds.height)
    this.transformerGraphic.stroke({ width: 1, color: 0x8b5cf6 })

    if (selectedIds.length === 1) {
      const handleSize = 8 / viewportScale
      const handles: Record<string, { x: number; y: number }> = {
        tl: { x: bounds.x, y: bounds.y },
        t: { x: bounds.x + bounds.width / 2, y: bounds.y },
        tr: { x: bounds.x + bounds.width, y: bounds.y },
        r: { x: bounds.x + bounds.width, y: bounds.y + bounds.height / 2 },
        br: { x: bounds.x + bounds.width, y: bounds.y + bounds.height },
        b: { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height },
        bl: { x: bounds.x, y: bounds.y + bounds.height },
        l: { x: bounds.x, y: bounds.y + bounds.height / 2 },
      }

      Object.entries(handles).forEach(([type, pos]) => {
        this.transformerGraphic.rect(pos.x - handleSize / 2, pos.y - handleSize / 2, handleSize, handleSize)
        this.transformerGraphic.fill({ color: 0xffffff })
        this.transformerGraphic.stroke({ width: 1, color: 0x8b5cf6 })

        const hitZone = new PIXI.Graphics()
        hitZone.rect(pos.x - handleSize, pos.y - handleSize, handleSize * 2, handleSize * 2)
        hitZone.fill({ color: 0x000000, alpha: 0.0001 })
        hitZone.eventMode = 'static'
        hitZone.cursor = this.getCursorForHandle(type as HandleType)
        hitZone.label = `handle:${type}`

        hitZone.on('pointerdown', (e) => {
          e.stopPropagation()
          onHandleDown(e, type as HandleType, selectedIds[0])
        })

        this.transformerGraphic.addChild(hitZone)
      })
    }
  }

  private getCursorForHandle(handle: HandleType): string {
    if (handle === 'p0' || handle === 'p1') return 'move'
    switch (handle) {
      case 'tl':
      case 'br':
        return 'nwse-resize'
      case 'tr':
      case 'bl':
        return 'nesw-resize'
      case 't':
      case 'b':
        return 'ns-resize'
      case 'l':
      case 'r':
        return 'ew-resize'
      default:
        return 'default'
    }
  }
}
