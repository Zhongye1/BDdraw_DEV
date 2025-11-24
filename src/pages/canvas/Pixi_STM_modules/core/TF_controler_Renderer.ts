import * as PIXI from 'pixi.js'
import type { CanvasElement } from '@/stores/canvasStore'
import type { HandleType } from '../shared/types'

export class TransformerRenderer {
  private transformerGraphic = new PIXI.Graphics()

  public getGraphic(): PIXI.Graphics {
    return this.transformerGraphic
  }

  public renderTransformer(
    elements: Record<string, CanvasElement>,
    selectedIds: string[],
    spriteMap: Map<string, PIXI.Graphics | PIXI.HTMLText | PIXI.Sprite>,
    onHandleDown: (e: PIXI.FederatedPointerEvent, handle: HandleType | 'p0' | 'p1', elementId: string) => void,
    viewportScale: number,
    overrideBounds: { x: number; y: number; width: number; height: number } | null = null,
    overrideRotation: number | null = null,
  ) {
    this.transformerGraphic.clear()
    this.transformerGraphic.removeChildren()

    if (selectedIds.length === 0) return

    // 添加安全检查，确保所有选中的元素都存在
    const validSelectedIds = selectedIds.filter((id) => elements[id])
    if (validSelectedIds.length === 0) return

    const el = elements[validSelectedIds[0]]
    const isLinearElement =
      validSelectedIds.length === 1 && el && (el.type === 'line' || el.type === 'arrow') && el.points?.length === 2

    // --- A. 直线/箭头模式 ---
    if (isLinearElement) {
      const points = el.points ?? []
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
          onHandleDown(e, type, validSelectedIds[0])
        })
        this.transformerGraphic.addChild(hitZone)
      }
      drawHandle(p0.x, p0.y, 'p0')
      drawHandle(p1.x, p1.y, 'p1')
      return
    }

    // --- B. 普通包围盒模式 (Text, Rect, etc) ---

    // [修改逻辑核心]
    // 1. 如果有强制覆盖的 Bounds (说明正在旋转中)，直接使用它
    if (overrideBounds && overrideRotation !== null) {
      // 直接调用绘制旋转框的方法
      this.drawRotatedBounds(overrideBounds, overrideRotation, viewportScale, validSelectedIds, onHandleDown, elements)
      return // 结束，不再进行后续计算
    }

    // 2. 否则，执行原有的 AABB 计算逻辑 (非旋转交互状态)
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity

    // 检查是否有旋转的元素
    let hasRotation = false
    let rotation = 0

    validSelectedIds.forEach((id) => {
      const el = elements[id]
      if (el && el.rotation && el.type !== 'group') {
        hasRotation = true
        rotation = el.rotation
      }
    })

    validSelectedIds.forEach((id) => {
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
      } else if (el.type === 'group') {
        // 对于组元素，检查是否有旋转
        if (el.rotation) {
          hasRotation = true
          rotation = el.rotation
        }
        minX = Math.min(minX, el.x)
        minY = Math.min(minY, el.y)
        maxX = Math.max(maxX, el.x + el.width)
        maxY = Math.max(maxY, el.y + el.height)
      } else {
        minX = Math.min(minX, el.x)
        minY = Math.min(minY, el.y)
        maxX = Math.max(maxX, el.x + el.width)
        maxY = Math.max(maxY, el.y + el.height)
      }
    })

    const bounds = { x: minX, y: minY, width: maxX - minX, height: maxY - minY }

    // 如果有旋转，则绘制旋转后的选择框（支持单个和多个元素）
    // 组元素也可以使用旋转边界框
    const isGroupSelected = validSelectedIds.length === 1 && elements[validSelectedIds[0]]?.type === 'group'

    if (hasRotation && validSelectedIds.length > 0) {
      // 对于多个元素，我们使用第一个有旋转的元素的角度
      this.drawRotatedBounds(bounds, rotation, viewportScale, validSelectedIds, onHandleDown, elements)
    } else {
      // 绘制普通包围盒边框
      this.transformerGraphic.rect(bounds.x, bounds.y, bounds.width, bounds.height)
      this.transformerGraphic.stroke({ width: 1, color: isGroupSelected ? 0x0099ff : 0x8b5cf6 })

      // 如果只有一个元素被选中，显示各个控制手柄
      if (validSelectedIds.length === 1) {
        this.drawHandles(bounds, viewportScale, validSelectedIds, onHandleDown, elements)
      } else if (validSelectedIds.length > 1) {
        // 多元素选择模式 - 显示包围盒控制手柄
        this.drawHandles(bounds, viewportScale, validSelectedIds, onHandleDown, elements)
      }
    }
  }

  private drawRotatedBounds(
    bounds: { x: number; y: number; width: number; height: number },
    rotation: number,
    viewportScale: number,
    selectedIds: string[],
    onHandleDown: (e: PIXI.FederatedPointerEvent, handle: HandleType | 'p0' | 'p1', elementId: string) => void,
    elements: Record<string, CanvasElement>,
  ) {
    const centerX = bounds.x + bounds.width / 2
    const centerY = bounds.y + bounds.height / 2

    // 计算旋转后的四个角点
    const halfWidth = bounds.width / 2
    const halfHeight = bounds.height / 2

    // 四个角点（相对于中心点）
    const corners = [
      { x: -halfWidth, y: -halfHeight }, // 左上
      { x: halfWidth, y: -halfHeight }, // 右上
      { x: halfWidth, y: halfHeight }, // 右下
      { x: -halfWidth, y: halfHeight }, // 左下
    ]

    // 旋转后的角点
    const rotatedCorners = corners.map((corner) => {
      const cos = Math.cos(rotation)
      const sin = Math.sin(rotation)
      return {
        x: centerX + corner.x * cos - corner.y * sin,
        y: centerY + corner.x * sin + corner.y * cos,
      }
    })

    // 绘制旋转后的边框
    this.transformerGraphic.poly(rotatedCorners)
    this.transformerGraphic.stroke({ width: 1, color: 0x8b5cf6 })
    this.transformerGraphic.closePath()

    // 绘制控制手柄
    const handleSize = 8 / viewportScale
    rotatedCorners.forEach((corner, index) => {
      const handleTypes = ['tl', 'tr', 'br', 'bl']
      const type = handleTypes[index]

      this.transformerGraphic.rect(corner.x - handleSize / 2, corner.y - handleSize / 2, handleSize, handleSize)
      this.transformerGraphic.fill({ color: 0xffffff })
      this.transformerGraphic.stroke({ width: 1, color: 0x8b5cf6 })

      const hitZone = new PIXI.Graphics()
      hitZone.rect(corner.x - handleSize, corner.y - handleSize, handleSize * 2, handleSize * 2)
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

    // 绘制旋转手柄
    // 计算未旋转时顶部中心点
    const topCenterX = centerX
    const topCenterY = bounds.y

    // 将顶部中心点也进行旋转
    const rotatedTopCenterX =
      centerX + (topCenterX - centerX) * Math.cos(rotation) - (topCenterY - centerY) * Math.sin(rotation)
    const rotatedTopCenterY =
      centerY + (topCenterX - centerX) * Math.sin(rotation) + (topCenterY - centerY) * Math.cos(rotation)

    const rotationHandleDist = 20 / viewportScale
    const rotationHandleAngle = rotation - Math.PI / 2
    const rotationHandleX = rotatedTopCenterX + Math.cos(rotationHandleAngle) * rotationHandleDist
    const rotationHandleY = rotatedTopCenterY + Math.sin(rotationHandleAngle) * rotationHandleDist

    // 连接线，从旋转后的顶部中心点到旋转手柄
    this.transformerGraphic.moveTo(rotatedTopCenterX, rotatedTopCenterY)
    this.transformerGraphic.lineTo(rotationHandleX, rotationHandleY)
    this.transformerGraphic.stroke({ width: 1, color: 0x8b5cf6 })

    // 旋转手柄圆圈
    this.transformerGraphic.circle(rotationHandleX, rotationHandleY, handleSize / 2)
    this.transformerGraphic.fill({ color: 0xffffff })
    this.transformerGraphic.stroke({ width: 1 / viewportScale, color: 0x8b5cf6 })
    this.transformerGraphic.lineStyle(1 / viewportScale, 0x8b5cf6)
    this.transformerGraphic.moveTo(bounds.x + bounds.width / 2, bounds.y)
    this.transformerGraphic.lineTo(bounds.x + bounds.width / 2, rotationHandleY + 5 / viewportScale)

    // 旋转手柄点击区域
    const rotationHitZone = new PIXI.Graphics()
    rotationHitZone.circle(rotationHandleX, rotationHandleY, handleSize)
    rotationHitZone.fill({ color: 0x000000, alpha: 0.0001 })
    rotationHitZone.eventMode = 'static'
    rotationHitZone.cursor = 'grab'
    rotationHitZone.label = 'handle:rotate'

    rotationHitZone.on('pointerdown', (e) => {
      e.stopPropagation()
      onHandleDown(e, 'rotate' as HandleType, selectedIds[0])
    })

    this.transformerGraphic.addChild(rotationHitZone)
  }

  private drawHandles(
    bounds: { x: number; y: number; width: number; height: number },
    viewportScale: number,
    selectedIds: string[],
    onHandleDown: (e: PIXI.FederatedPointerEvent, handle: HandleType | 'p0' | 'p1', elementId: string) => void,
    elements: Record<string, CanvasElement>,
  ) {
    const handleSize = 8 / viewportScale
    const handles = {
      tl: { x: bounds.x, y: bounds.y },
      t: { x: bounds.x + bounds.width / 2, y: bounds.y },
      tr: { x: bounds.x + bounds.width, y: bounds.y },
      r: { x: bounds.x + bounds.width, y: bounds.y + bounds.height / 2 },
      br: { x: bounds.x + bounds.width, y: bounds.y + bounds.height },
      b: { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height },
      bl: { x: bounds.x, y: bounds.y + bounds.height },
      l: { x: bounds.x, y: bounds.y + bounds.height / 2 },
    }

    // 绘制控制手柄
    Object.entries(handles).forEach(([type, pos]) => {
      // 对于组元素，使用不同的颜色
      const isSelectedGroup =
        selectedIds.length === 1 && elements[selectedIds[0]] && elements[selectedIds[0]].type === 'group'

      this.transformerGraphic.rect(pos.x - handleSize / 2, pos.y - handleSize / 2, handleSize, handleSize)
      this.transformerGraphic.fill({ color: 0xffffff })
      this.transformerGraphic.stroke({ width: 1, color: isSelectedGroup ? 0x0099ff : 0x8b5cf6 })

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

    // 绘制旋转手柄
    const rotationHandleY = bounds.y - 20 / viewportScale
    const rotationHandleX = bounds.x + bounds.width / 2

    // 对于组元素，使用不同的颜色
    const isSelectedGroup =
      selectedIds.length === 1 && elements[selectedIds[0]] && elements[selectedIds[0]].type === 'group'

    this.transformerGraphic.circle(rotationHandleX, rotationHandleY, 5 / viewportScale)
    this.transformerGraphic.fill({ color: 0xffffff })
    this.transformerGraphic.stroke({ width: 1 / viewportScale, color: isSelectedGroup ? 0x0099ff : 0x8b5cf6 })
    this.transformerGraphic.lineStyle(1 / viewportScale, isSelectedGroup ? 0x0099ff : 0x8b5cf6)
    this.transformerGraphic.moveTo(bounds.x + bounds.width / 2, bounds.y)
    this.transformerGraphic.lineTo(bounds.x + bounds.width / 2, rotationHandleY + 5 / viewportScale)

    // 旋转手柄点击区域
    const rotationHitZone = new PIXI.Graphics()
    rotationHitZone.circle(rotationHandleX, rotationHandleY, handleSize)
    rotationHitZone.fill({ color: 0x000000, alpha: 0.0001 })
    rotationHitZone.eventMode = 'static'
    rotationHitZone.cursor = 'grab'
    rotationHitZone.label = 'handle:rotate'

    rotationHitZone.on('pointerdown', (e) => {
      e.stopPropagation()
      onHandleDown(e, 'rotate' as HandleType, selectedIds[0])
    })

    this.transformerGraphic.addChild(rotationHitZone)
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
      case 'rotate':
        return 'grab'
      default:
        return 'default'
    }
  }
}
