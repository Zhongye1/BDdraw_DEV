import * as PIXI from 'pixi.js'
import type { CanvasElement } from '@/stores/canvasStore'
import type { HandleType } from '../shared/types'
import { getAllDescendantIds } from '../utils/geometryUtils'

// 辅助函数：旋转点
function rotatePoint(x: number, y: number, cx: number, cy: number, angle: number) {
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  return {
    x: (x - cx) * cos - (y - cy) * sin + cx,
    y: (x - cx) * sin + (y - cy) * cos + cy,
  }
}

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

    // 2. 彻底销毁旧的子元素 (HitZones 和 Text)
    // 仅仅 removeChildren 是不够的，必须调用 destroy 释放内存和纹理引用
    const children = this.transformerGraphic.removeChildren()
    children.forEach((child) => {
      child.destroy({ children: true, texture: true })
    })

    if (selectedIds.length === 0) return

    const validSelectedIds = selectedIds.filter((id) => elements[id])
    if (validSelectedIds.length === 0) return

    const firstEl = elements[validSelectedIds[0]]

    // --- A. 直线/箭头模式 (保持不变) ---
    const isLinearElement =
      validSelectedIds.length === 1 &&
      firstEl &&
      (firstEl.type === 'line' || firstEl.type === 'arrow') &&
      firstEl.points?.length === 2

    if (isLinearElement) {
      const points = firstEl.points ?? []
      const p0 = { x: firstEl.x + points[0][0], y: firstEl.y + points[0][1] }
      const p1 = { x: firstEl.x + points[1][0], y: firstEl.y + points[1][1] }
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

    // --- B. 通用包围盒模式 (Text, Rect, Group, Multi-select) ---

    let finalBounds: { x: number; y: number; width: number; height: number }
    let finalRotation: number

    // 1. 如果有强制覆盖 (Resizing / Rotating 中)，直接使用
    if (overrideBounds && overrideRotation !== null) {
      finalBounds = overrideBounds
      finalRotation = overrideRotation
    } else {
      // 2. 否则，执行与 Handler 及 ElementRenderer 一致的几何计算逻辑

      // 2.1 确定组的旋转角度 (Group Angle)
      // 逻辑：如果是单选，或者多选但所有元素旋转角度一致，则使用该角度。否则为0。
      let groupAngle = 0

      // 如果选中了单个组，直接使用组的属性，不再递归计算
      if (validSelectedIds.length === 1 && firstEl.type === 'group') {
        groupAngle = firstEl.rotation || 0
        finalBounds = {
          x: firstEl.x,
          y: firstEl.y,
          width: firstEl.width,
          height: firstEl.height,
        }
        finalRotation = groupAngle
      } else {
        const firstRotation = elements[validSelectedIds[0]]?.rotation || 0
        const isUniform = validSelectedIds.every(
          (id) => Math.abs((elements[id]?.rotation || 0) - firstRotation) < 0.001,
        )
        if (isUniform) {
          groupAngle = firstRotation
        }

        // 2.2 计算 Local OBB (局部有向包围盒)
        let minLx = Infinity,
          maxLx = -Infinity,
          minLy = Infinity,
          maxLy = -Infinity

        // 遍历所有选中的根元素
        validSelectedIds.forEach((id) => {
          const rootEl = elements[id]
          if (!rootEl) return

          // 如果选中了组，需要展开计算其所有后代，以保证选中框贴合子元素边缘
          // 这样可以确保 Transformer 的框与 ElementRenderer 绘制的蓝色框完全一致
          const idsToProcess = rootEl.type === 'group' ? getAllDescendantIds(id, elements) : [id]

          idsToProcess.forEach((subId) => {
            const el = elements[subId]
            if (!el) return

            // 获取元素未旋转时的宽高
            let elW = el.width
            let elH = el.height
            if (el.type === 'text') {
              const sprite = spriteMap.get(subId)
              if (sprite) {
                // 文本的高度必须以实际渲染为准
                const localBounds = sprite.getLocalBounds()
                elW = el.width || localBounds.width || 0
                elH = localBounds.height
              }
            }

            const elCx = el.x + elW / 2
            const elCy = el.y + elH / 2
            const elRot = el.rotation || 0

            // 计算元素四个角点在世界坐标的位置
            const halfW = elW / 2
            const halfH = elH / 2

            const corners = [
              { x: -halfW, y: -halfH },
              { x: halfW, y: -halfH },
              { x: halfW, y: halfH },
              { x: -halfW, y: halfH },
            ].map((p) => {
              // 1. 元素局部 -> 世界 (考虑元素自身旋转)
              const pWorld = rotatePoint(elCx + p.x, elCy + p.y, elCx, elCy, elRot)
              // 2. 世界 -> 组局部 (逆向旋转 groupAngle，对齐到组轴)
              return rotatePoint(pWorld.x, pWorld.y, 0, 0, -groupAngle)
            })

            corners.forEach((p) => {
              minLx = Math.min(minLx, p.x)
              maxLx = Math.max(maxLx, p.x)
              minLy = Math.min(minLy, p.y)
              maxLy = Math.max(maxLy, p.y)
            })
          })
        })

        // 2.3 组装最终数据
        let width = maxLx - minLx
        let height = maxLy - minLy

        // 为文本元素设置最小宽度和高度，确保用户可以轻松选中和编辑
        const hasTextElement =
          validSelectedIds.some((id) => elements[id]?.type === 'text') ||
          validSelectedIds.some(
            (id) =>
              elements[id].type === 'group' &&
              getAllDescendantIds(id, elements).some((did) => elements[did]?.type === 'text'),
          )

        if (hasTextElement) {
          if (width < 50) width = 50
          if (height < 30) height = 30
        }

        // 中心点在组局部坐标系的位置
        const cxLocal = minLx + width / 2
        const cyLocal = minLy + height / 2

        // 将中心点旋转回世界坐标
        const centerWorld = rotatePoint(cxLocal, cyLocal, 0, 0, groupAngle)

        finalBounds = {
          x: centerWorld.x - width / 2,
          y: centerWorld.y - height / 2,
          width: width,
          height: height,
        }
        finalRotation = groupAngle
      }
    }

    // 3. 统一绘制
    this.drawRotatedBounds(finalBounds, finalRotation, viewportScale, validSelectedIds, onHandleDown, elements)
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
    const halfWidth = bounds.width / 2
    const halfHeight = bounds.height / 2

    // 1. 绘制边框
    const corners = [
      { x: -halfWidth, y: -halfHeight },
      { x: halfWidth, y: -halfHeight },
      { x: halfWidth, y: halfHeight },
      { x: -halfWidth, y: halfHeight },
    ].map((corner) => {
      // 绕中心旋转
      return {
        x: centerX + corner.x * Math.cos(rotation) - corner.y * Math.sin(rotation),
        y: centerY + corner.x * Math.sin(rotation) + corner.y * Math.cos(rotation),
      }
    })

    const isGroupSelected = selectedIds.length === 1 && elements[selectedIds[0]]?.type === 'group'
    const strokeColor = isGroupSelected ? 0x0099ff : 0x8b5cf6

    this.transformerGraphic.moveTo(corners[0].x, corners[0].y)
    for (let i = 1; i < 4; i++) {
      this.transformerGraphic.lineTo(corners[i].x, corners[i].y)
    }
    this.transformerGraphic.lineTo(corners[0].x, corners[0].y)
    this.transformerGraphic.stroke({ width: 1, color: strokeColor })

    // 2. 绘制 8 个控制手柄
    const handleSize = 8 / viewportScale
    // 定义手柄相对于中心的偏移（未旋转）
    const handleOffsets = [
      { type: 'tl', x: -halfWidth, y: -halfHeight },
      { type: 't', x: 0, y: -halfHeight },
      { type: 'tr', x: halfWidth, y: -halfHeight },
      { type: 'r', x: halfWidth, y: 0 },
      { type: 'br', x: halfWidth, y: halfHeight },
      { type: 'b', x: 0, y: halfHeight },
      { type: 'bl', x: -halfWidth, y: halfHeight },
      { type: 'l', x: -halfWidth, y: 0 },
    ]

    handleOffsets.forEach(({ type, x, y }) => {
      // 旋转手柄位置
      const rotatedX = centerX + x * Math.cos(rotation) - y * Math.sin(rotation)
      const rotatedY = centerY + x * Math.sin(rotation) + y * Math.cos(rotation)

      this.transformerGraphic.rect(rotatedX - handleSize / 2, rotatedY - handleSize / 2, handleSize, handleSize)
      this.transformerGraphic.fill({ color: 0xffffff })
      this.transformerGraphic.stroke({ width: 1, color: strokeColor })

      const hitZone = new PIXI.Graphics()
      hitZone.rect(rotatedX - handleSize, rotatedY - handleSize, handleSize * 2, handleSize * 2)
      hitZone.fill({ color: 0x000000, alpha: 0.0001 })
      hitZone.eventMode = 'static'
      // 计算光标方向
      hitZone.cursor = this.getCursorForHandle(type as HandleType, rotation)
      hitZone.label = `handle:${type}`

      hitZone.on('pointerdown', (e) => {
        e.stopPropagation()
        onHandleDown(e, type as HandleType, selectedIds[0])
      })

      this.transformerGraphic.addChild(hitZone)
    })

    // 3. 绘制旋转手柄 (顶部中心上方)
    const rotDist = 20 / viewportScale
    const topCenterX = centerX + 0 * Math.cos(rotation) - -halfHeight * Math.sin(rotation)
    const topCenterY = centerY + 0 * Math.sin(rotation) + -halfHeight * Math.cos(rotation)

    const rotHandleX = centerX + 0 * Math.cos(rotation) - (-halfHeight - rotDist) * Math.sin(rotation)
    const rotHandleY = centerY + 0 * Math.sin(rotation) + (-halfHeight - rotDist) * Math.cos(rotation)

    this.transformerGraphic.moveTo(topCenterX, topCenterY)
    this.transformerGraphic.lineTo(rotHandleX, rotHandleY)
    this.transformerGraphic.stroke({ width: 1, color: strokeColor })

    this.transformerGraphic.circle(rotHandleX, rotHandleY, handleSize / 2)
    this.transformerGraphic.fill({ color: 0xffffff })
    this.transformerGraphic.stroke({ width: 1 / viewportScale, color: strokeColor })

    const rotationHitZone = new PIXI.Graphics()
    rotationHitZone.circle(rotHandleX, rotHandleY, handleSize * 1.5)
    rotationHitZone.fill({ color: 0x000000, alpha: 0.0001 })
    rotationHitZone.eventMode = 'static'
    rotationHitZone.cursor = 'grab'
    rotationHitZone.label = 'handle:rotate'

    rotationHitZone.on('pointerdown', (e) => {
      e.stopPropagation()
      onHandleDown(e, 'rotate' as HandleType, selectedIds[0])
    })
    this.transformerGraphic.addChild(rotationHitZone)

    // 4. 组名标签
    if (isGroupSelected) {
      const groupName = `Group ${selectedIds[0].substring(0, 4)}`
      const textStyle = new PIXI.TextStyle({
        fontSize: 10 / viewportScale,
        fill: 0x0099ff,
        fontWeight: 'bold',
      })
      const text = new PIXI.Text(groupName, textStyle)
      // 简单定位到旋转手柄附近
      text.x = rotHandleX + 15 / viewportScale
      text.y = rotHandleY - 15 / viewportScale
      this.transformerGraphic.addChild(text)
    }
  }

  private getCursorForHandle(handle: HandleType, rotation = 0): string {
    if (handle === 'p0' || handle === 'p1') return 'move'
    if (handle === 'rotate') return 'grab'

    // 这里简化处理，实际上应该根据 handle + rotation 计算出一个 0-180 的角度，然后映射到对应的 css cursor
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
