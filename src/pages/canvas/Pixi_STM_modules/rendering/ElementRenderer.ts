import * as PIXI from 'pixi.js'
import { HTMLText } from 'pixi.js'
import type { CanvasElement } from '@/stores/canvasStore'

export class ElementRenderer {
  private spriteMap: Map<string, PIXI.Graphics | HTMLText> = new Map()

  public renderElements(elements: Record<string, CanvasElement>, elementLayer: PIXI.Container, destroyed: boolean) {
    if (destroyed) return
    const elementIds = new Set(Object.keys(elements))

    elementIds.forEach((id) => {
      const data = elements[id]
      let graphic = this.spriteMap.get(id)

      // === 处理 Text 类型 (HTMLText) ===
      if (data.type === 'text') {
        // 如果之前的 sprite 不是 HTMLText，销毁重建
        if (graphic && !(graphic instanceof HTMLText)) {
          elementLayer.removeChild(graphic)
          graphic.destroy()
          graphic = undefined
        }

        if (!graphic) {
          // 创建 HTMLText
          graphic = new HTMLText({
            text: '',
            // 定义基础样式，具体的颜色/加粗由 HTML 字符串内的 style 决定
            style: {
              wordWrap: true, // 开启换行
              breakWords: true,
            },
          })
          graphic.label = id
          graphic.eventMode = 'static'
          graphic.cursor = 'move'
          elementLayer.addChild(graphic)
          this.spriteMap.set(id, graphic)
        }

        const textObj = graphic as HTMLText

        // 直接赋值 HTML 字符串
        // HTMLText 会自动解析 span, strong, style 等标签
        const htmlContent = data.text || '<span style="color:#cccccc">请输入文本</span>'

        if (textObj.text !== htmlContent) {
          textObj.text = htmlContent
        }

        // 更新样式配置 (主要是宽高限制和默认字体)
        // 注意：HTMLText 的 style 实际上是生成 CSS 注入到 foreignObject 中
        textObj.style = {
          wordWrap: true,
          wordWrapWidth: data.width || 400, // 宽度受控于 Store
          fontSize: data.fontSize || 20, // 默认字体大小 (会被 HTML 内联样式覆盖)
          fontFamily: data.fontFamily || 'Arial',
          fill: data.fill || '#000000', // 默认颜色 (会被 HTML 内联样式覆盖)
          align: data.textAlign || ('left' as any),
          // CSS 重置，消除 p 标签自带的 margin
          cssOverrides: ['p { margin: 0; padding: 0; }', 'span { display: inline; }'],
        }

        textObj.position.set(data.x, data.y)
      }

      // === 处理其他几何图形 ===
      else {
        // 如果之前的 sprite 是 HTMLText，销毁重建
        if (graphic && graphic instanceof HTMLText) {
          elementLayer.removeChild(graphic)
          graphic.destroy()
          graphic = undefined
        }

        if (!graphic) {
          graphic = new PIXI.Graphics()
          graphic.label = id
          graphic.eventMode = 'static'
          graphic.cursor = 'move'
          elementLayer.addChild(graphic)
          this.spriteMap.set(id, graphic)
        }

        const g = graphic as PIXI.Graphics
        g.clear()
        const strokeWidth = data.strokeWidth ?? 2
        const strokeColor = new PIXI.Color(data.stroke)
        const fillColor = new PIXI.Color(data.fill)
        const alpha = data.alpha ?? 1

        if (strokeWidth > 0) {
          g.stroke({ width: strokeWidth, color: strokeColor, cap: 'round', join: 'round' })
        }

        if (data.type === 'rect') {
          // 添加圆角支持
          if (data.radius && data.radius > 0) {
            g.roundRect(0, 0, data.width, data.height, data.radius)
            if (strokeWidth > 0) {
              g.stroke({ width: strokeWidth, color: strokeColor, cap: 'round', join: 'round' })
            }
            g.fill({ color: fillColor, alpha })
          } else {
            g.rect(0, 0, data.width, data.height)
            if (strokeWidth > 0) {
              g.stroke({ width: strokeWidth, color: strokeColor, cap: 'round', join: 'round' })
            }
            g.fill({ color: fillColor, alpha })
          }
        } else if (data.type === 'circle') {
          g.ellipse(data.width / 2, data.height / 2, data.width / 2, data.height / 2)
          if (strokeWidth > 0) {
            g.stroke({ width: strokeWidth, color: strokeColor, cap: 'round', join: 'round' })
          }
          g.fill({ color: fillColor, alpha })
        } else if (data.type === 'triangle') {
          g.poly([data.width / 2, 0, data.width, data.height, 0, data.height])
          if (strokeWidth > 0) {
            g.stroke({ width: strokeWidth, color: strokeColor, cap: 'round', join: 'round' })
          }
          g.fill({ color: fillColor, alpha })
        } else if (data.type === 'diamond') {
          g.poly([data.width / 2, 0, data.width, data.height / 2, data.width / 2, data.height, 0, data.height / 2])
          if (strokeWidth > 0) {
            g.stroke({ width: strokeWidth, color: strokeColor, cap: 'round', join: 'round' })
          }
          g.fill({ color: fillColor, alpha })
        } else if (
          (data.type === 'line' || data.type === 'arrow' || data.type === 'pencil') &&
          data.points &&
          data.points.length > 0
        ) {
          g.moveTo(data.points[0][0], data.points[0][1])
          for (let i = 1; i < data.points.length; i++) {
            g.lineTo(data.points[i][0], data.points[i][1])
          }
          g.stroke({ width: strokeWidth, color: strokeColor, cap: 'round', join: 'round' })

          if (data.type === 'arrow' && data.points.length >= 2) {
            const start = data.points[0]
            const end = data.points[data.points.length - 1]
            const dx = end[0] - start[0]
            const dy = end[1] - start[1]
            const angle = Math.atan2(dy, dx)
            const headLength = 15
            const headAngle = Math.PI / 6
            g.moveTo(end[0], end[1])
            g.lineTo(
              end[0] - headLength * Math.cos(angle - headAngle),
              end[1] - headLength * Math.sin(angle - headAngle),
            )
            g.moveTo(end[0], end[1])
            g.lineTo(
              end[0] - headLength * Math.cos(angle + headAngle),
              end[1] - headLength * Math.sin(angle + headAngle),
            )
            g.stroke({ width: strokeWidth, color: strokeColor, cap: 'round', join: 'round' })
          }
        }
        g.position.set(data.x, data.y)
      }
    })

    this.spriteMap.forEach((graphic, id) => {
      if (!elementIds.has(id)) {
        elementLayer.removeChild(graphic)
        graphic.destroy()
        this.spriteMap.delete(id)
      }
    })
  }

  public getSpriteMap(): Map<string, PIXI.Graphics | HTMLText> {
    return this.spriteMap
  }

  public clear() {
    this.spriteMap.forEach((graphic) => {
      graphic.destroy()
    })
    this.spriteMap.clear()
  }
}
