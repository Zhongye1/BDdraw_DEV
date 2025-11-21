import * as PIXI from 'pixi.js'
import { HTMLText } from 'pixi.js'
import type { CanvasElement } from '@/stores/canvasStore'

export class ElementRenderer {
  private spriteMap: Map<string, PIXI.Graphics | HTMLText | PIXI.Sprite> = new Map()
  private textureCache: Map<string, PIXI.Texture> = new Map()
  // 新增：用来记录正在加载中的 URL，防止重复触发 Assets.load
  private loadingSet: Set<string> = new Set()
  // 用于存储图像元素的更新检查定时器
  private imageUpdateTimers: Map<string, NodeJS.Timeout> = new Map()

  public renderElements(elements: Record<string, CanvasElement>, elementLayer: PIXI.Container, destroyed: boolean) {
    if (destroyed) return
    const elementIds = new Set(Object.keys(elements))

    elementIds.forEach((id) => {
      const data = elements[id]
      let graphic = this.spriteMap.get(id)

      // === 处理 Image 类型 ===
      if (data.type === 'image' && data.imageUrl) {
        // 如果之前的 sprite 不是 Sprite，销毁重建
        if (graphic && !(graphic instanceof PIXI.Sprite)) {
          elementLayer.removeChild(graphic)
          graphic.destroy()
          graphic = undefined
        }

        // 获取或创建纹理
        const texture = this.textureCache.get(data.imageUrl)

        // 如果没有纹理，检查是否正在加载中
        if (!texture) {
          if (!this.loadingSet.has(data.imageUrl)) {
            // 标记为正在加载
            this.loadingSet.add(data.imageUrl)

            // 异步加载资源
            PIXI.Assets.load(data.imageUrl)
              .then((loadedTexture) => {
                // 加载完成：存入缓存
                this.textureCache.set(data.imageUrl!, loadedTexture)
                this.loadingSet.delete(data.imageUrl!)

                // *** 立即更新图形显示 ***
                // 纹理加载完成后立即更新图形，不再等待定时检查
                const graphic = this.spriteMap.get(id)
                if (graphic && !(graphic instanceof PIXI.Sprite)) {
                  // 替换占位符为真实图像
                  elementLayer.removeChild(graphic)
                  graphic.destroy()

                  // 创建新的Sprite
                  const sprite = new PIXI.Sprite(loadedTexture)
                  sprite.label = id
                  sprite.eventMode = 'static'
                  sprite.cursor = 'move'
                  sprite.position.set(data.x, data.y)
                  sprite.width = data.width
                  sprite.height = data.height

                  elementLayer.addChild(sprite)
                  this.spriteMap.set(id, sprite)

                  // 应用滤镜
                  const filters: PIXI.Filter[] = []
                  switch (data.filter) {
                    case 'blur':
                      filters.push(new PIXI.BlurFilter())
                      break
                    case 'brightness': {
                      const brightnessFilter = new PIXI.ColorMatrixFilter()
                      brightnessFilter.brightness(1.5, false)
                      filters.push(brightnessFilter)
                      break
                    }
                    case 'grayscale': {
                      const grayscaleFilter = new PIXI.ColorMatrixFilter()
                      grayscaleFilter.grayscale(1, false)
                      filters.push(grayscaleFilter)
                      break
                    }
                  }
                  sprite.filters = filters

                  // 停止定时检查
                  if (this.imageUpdateTimers.has(id)) {
                    clearInterval(this.imageUpdateTimers.get(id))
                    this.imageUpdateTimers.delete(id)
                  }
                } else if (graphic && graphic instanceof PIXI.Sprite) {
                  // 如果已经是Sprite，直接更新纹理
                  graphic.texture = loadedTexture
                  graphic.width = data.width
                  graphic.height = data.height
                  graphic.position.set(data.x, data.y)

                  // 停止定时检查
                  if (this.imageUpdateTimers.has(id)) {
                    clearInterval(this.imageUpdateTimers.get(id))
                    this.imageUpdateTimers.delete(id)
                  }
                }
              })
              .catch((err) => {
                console.error('Failed to load asset:', err)
                this.loadingSet.delete(data.imageUrl!)

                // 加载失败也停止定时检查
                if (this.imageUpdateTimers.has(id)) {
                  clearInterval(this.imageUpdateTimers.get(id))
                  this.imageUpdateTimers.delete(id)
                }
              })
          }

          // 在加载过程中创建一个占位符图形
          if (!graphic) {
            graphic = new PIXI.Graphics()
            graphic.label = id
            graphic.eventMode = 'static'
            graphic.cursor = 'move'
            // 绘制一个占位符矩形
            graphic.rect(0, 0, data.width, data.height)
            graphic.fill({ color: 0xdddddd })
            graphic.stroke({ width: 1, color: 0x999999 })
            graphic.position.set(data.x, data.y)
            elementLayer.addChild(graphic)
            this.spriteMap.set(id, graphic)
          }

          return
        }

        // 如果纹理已存在（缓存中有），正常创建/更新 Sprite
        if (!graphic || !(graphic instanceof PIXI.Sprite)) {
          // 如果存在旧图形，先移除
          if (graphic) {
            elementLayer.removeChild(graphic)
            ;(graphic as PIXI.Graphics | HTMLText | PIXI.Sprite).destroy({ children: true })
          }

          const sprite = new PIXI.Sprite(texture)
          sprite.label = id
          sprite.eventMode = 'static'
          sprite.cursor = 'move'
          sprite.position.set(data.x, data.y)
          sprite.width = data.width
          sprite.height = data.height

          elementLayer.addChild(sprite)
          this.spriteMap.set(id, sprite)

          graphic = sprite
        } else {
          const sprite = graphic as PIXI.Sprite
          sprite.texture = texture // 此时 texture 一定是 valid 的
          sprite.position.set(data.x, data.y)
          sprite.width = data.width
          sprite.height = data.height
        }

        // 应用滤镜
        const filters: PIXI.Filter[] = []
        switch (data.filter) {
          case 'blur':
            filters.push(new PIXI.BlurFilter())
            break
          case 'brightness': {
            const brightnessFilter = new PIXI.ColorMatrixFilter()
            brightnessFilter.brightness(1.5, false)
            filters.push(brightnessFilter)
            break
          }
          case 'grayscale': {
            const grayscaleFilter = new PIXI.ColorMatrixFilter()
            grayscaleFilter.grayscale(1, false)
            filters.push(grayscaleFilter)
            break
          }
        }
        graphic.filters = filters

        // 纹理已存在，停止定时检查
        if (this.imageUpdateTimers.has(id)) {
          clearInterval(this.imageUpdateTimers.get(id))
          this.imageUpdateTimers.delete(id)
        }
      }

      // === 处理 Text 类型 (HTMLText) ===
      else if (data.type === 'text') {
        // 如果之前的 sprite 不是 HTMLText，销毁重建
        if (graphic && !(graphic instanceof HTMLText)) {
          elementLayer.removeChild(graphic)
          ;(graphic as PIXI.Graphics | HTMLText | PIXI.Sprite).destroy({ children: true })
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
        // 如果之前的 sprite 是 HTMLText 或 Sprite，销毁重建
        if (graphic && (graphic instanceof HTMLText || graphic instanceof PIXI.Sprite)) {
          elementLayer.removeChild(graphic)
          ;(graphic as PIXI.Graphics | HTMLText | PIXI.Sprite).destroy({ children: true })
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
          g.poly([data.width / 2, 0, data.width, data.height, 0, data.height / 2])
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
        ;(graphic as PIXI.Graphics | HTMLText | PIXI.Sprite).destroy({ children: true })
        this.spriteMap.delete(id)

        // 清理不再使用的纹理
        const element = elements[id]
        if (element && element.type === 'image' && element.imageUrl) {
          const texture = this.textureCache.get(element.imageUrl)
          if (texture && texture !== PIXI.Texture.EMPTY) {
            // 检查是否还有其他元素使用这个纹理
            const stillUsed = Object.values(elements).some(
              (el) => el.type === 'image' && el.imageUrl === element.imageUrl && el.id !== id,
            )

            if (!stillUsed) {
              texture.destroy()
              this.textureCache.delete(element.imageUrl)
            }
          }
        }

        // 清理定时器
        if (this.imageUpdateTimers.has(id)) {
          clearInterval(this.imageUpdateTimers.get(id)!)
          this.imageUpdateTimers.delete(id)
        }
      }
    })
  }

  public getSpriteMap(): Map<string, PIXI.Graphics | HTMLText | PIXI.Sprite> {
    return this.spriteMap
  }

  public clear() {
    this.spriteMap.forEach((graphic) => {
      graphic.destroy()
    })
    this.spriteMap.clear()

    // 清理纹理缓存
    this.textureCache.forEach((texture) => {
      if (texture !== PIXI.Texture.EMPTY) {
        texture.destroy()
      }
    })
    this.textureCache.clear()

    // 清理所有定时器
    this.imageUpdateTimers.forEach((timer) => {
      clearInterval(timer)
    })
    this.imageUpdateTimers.clear()
  }
}
