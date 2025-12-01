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
        // 如果之前的 sprite 不是 Sprite 且不是 Graphics(占位符)，销毁重建
        if (graphic && !(graphic instanceof PIXI.Sprite) && !(graphic instanceof PIXI.Graphics)) {
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
                this.textureCache.set(data.imageUrl ?? '', loadedTexture)
                this.loadingSet.delete(data.imageUrl ?? '')

                // *** 立即更新图形显示 ***
                const graphic = this.spriteMap.get(id)

                // 只要该元素还存在，就进行替换
                if (graphic) {
                  // 移除旧图形（无论是占位符还是旧 Sprite）
                  elementLayer.removeChild(graphic)
                  graphic.destroy()

                  // 创建新的Sprite
                  const sprite = new PIXI.Sprite(loadedTexture)
                  sprite.label = id
                  sprite.eventMode = 'static'
                  sprite.cursor = 'move'

                  // 设置宽高
                  sprite.width = data.width
                  sprite.height = data.height

                  // === 修复点 1：异步加载完成后，使用 anchor 处理 Sprite ===
                  // Sprite 使用 anchor(0.5) 来确保缩放时中心点不会偏移
                  sprite.anchor.set(0.5)
                  sprite.position.set(data.x + data.width / 2, data.y + data.height / 2)
                  sprite.rotation = data.rotation || 0

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
                }
              })
              .catch((err) => {
                console.error('Failed to load asset:', err)
                this.loadingSet.delete(data.imageUrl ?? '')
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

            elementLayer.addChild(graphic)
            this.spriteMap.set(id, graphic)
          }
        }
        // 如果纹理已存在（缓存中有），正常创建/更新 Sprite
        else {
          if (!graphic || !(graphic instanceof PIXI.Sprite)) {
            // 如果存在旧图形（如占位符），先移除
            if (graphic) {
              elementLayer.removeChild(graphic)
              ;(graphic as PIXI.Graphics | HTMLText | PIXI.Sprite).destroy({ children: true })
            }

            const sprite = new PIXI.Sprite(texture)
            sprite.label = id
            sprite.eventMode = 'static'
            sprite.cursor = 'move'

            elementLayer.addChild(sprite)
            this.spriteMap.set(id, sprite)

            graphic = sprite
          } else {
            const sprite = graphic as PIXI.Sprite
            if (sprite.texture !== texture) {
              sprite.texture = texture
            }
          }

          // 纹理已存在，停止定时检查
          if (this.imageUpdateTimers.has(id)) {
            clearInterval(this.imageUpdateTimers.get(id))
            this.imageUpdateTimers.delete(id)
          }
        }

        // === 通用属性设置 (适用于 占位符Graphics 和 正式Sprite) ===
        // 这里处理的是同步更新逻辑
        if (graphic) {
          graphic.width = data.width
          graphic.height = data.height

          // === 修复点 2：同步更新时区分 Sprite 和 Graphics 处理中心点 ===
          if (graphic instanceof PIXI.Sprite) {
            // 修复：对于图片(Sprite)，使用 anchor 代替 pivot
            // anchor 是相对值(0-1)，不受 texture 尺寸和 scale 影响，完美解决缩放错位问题
            graphic.anchor.set(0.5)
            graphic.position.set(data.x + data.width / 2, data.y + data.height / 2)
            graphic.rotation = data.rotation || 0
          } else {
            // 对于占位符(Graphics)，它没有 anchor，只能用 pivot
            // Graphics 是按 width/height 绘制的，所以 pivot 设置为中心像素值是正确的
            if (data.rotation !== undefined) {
              graphic.pivot.set(data.width / 2, data.height / 2)
              graphic.position.set(data.x + data.width / 2, data.y + data.height / 2)
              graphic.rotation = data.rotation
            } else {
              graphic.pivot.set(0, 0)
              graphic.position.set(data.x, data.y)
              graphic.rotation = 0
            }
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
        }
      }

      // === 处理 Text 类型 (HTMLText) ===
      else if (data.type === 'text') {
        if (graphic && !(graphic instanceof HTMLText)) {
          elementLayer.removeChild(graphic)
          ;(graphic as PIXI.Graphics | HTMLText | PIXI.Sprite).destroy({ children: true })
          graphic = undefined
        }

        if (!graphic) {
          graphic = new HTMLText({
            text: '',
            style: {
              wordWrap: true,
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
        const htmlContent = data.text || '<span style="color:#cccccc">请输入文本</span>'

        if (textObj.text !== htmlContent) {
          textObj.text = htmlContent
        }

        textObj.style = {
          wordWrap: true,
          wordWrapWidth: data.width || 400,
          fontSize: data.fontSize || 20,
          fontFamily: data.fontFamily || 'Arial',
          fill: data.fill || '#000000',
          align: data.textAlign || ('left' as 'left' | 'center' | 'right'),
          cssOverrides: ['p { margin: 0; padding: 0; }', 'span { display: inline; }'],
        }

        if (data.rotation !== undefined) {
          textObj.pivot.set(data.width / 2, data.height / 2)
          textObj.position.set(data.x + data.width / 2, data.y + data.height / 2)
          textObj.rotation = data.rotation
        } else {
          textObj.pivot.set(0, 0)
          textObj.position.set(data.x, data.y)
          textObj.rotation = 0
        }
      }

      // === 处理其他类型 (Rect/Circle/Triangle/Diamond/Line/Arrow/Pencil/Group) ===
      else {
        if (graphic && !(graphic instanceof PIXI.Graphics)) {
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
        } else if (data.type === 'group') {
          g.rect(0, 0, data.width, data.height)
          g.stroke({ width: 1, color: 0x0099ff, alpha: 0.7 })
          g.fill({ color: 0x0099ff, alpha: 0.1 })
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

        // 初始位置设置，如果 rotation 存在会被覆盖，但如果 rotation 为 undefined 则生效
        g.position.set(data.x, data.y)

        if (data.rotation !== undefined) {
          g.pivot.set(data.width / 2, data.height / 2)
          g.position.set(data.x + data.width / 2, data.y + data.height / 2)
          g.rotation = data.rotation
        } else {
          g.pivot.set(0, 0)
          g.rotation = 0
        }
      }
    })

    this.spriteMap.forEach((graphic, id) => {
      if (!elementIds.has(id)) {
        elementLayer.removeChild(graphic)
        ;(graphic as PIXI.Graphics | HTMLText | PIXI.Sprite).destroy({ children: true })
        this.spriteMap.delete(id)

        const element = elements[id]
        if (element && element.type === 'image' && element.imageUrl) {
          const texture = this.textureCache.get(element.imageUrl)
          if (texture && texture !== PIXI.Texture.EMPTY) {
            const stillUsed = Object.values(elements).some(
              (el) => el.type === 'image' && el.imageUrl === element.imageUrl && el.id !== id,
            )

            if (!stillUsed) {
              texture.destroy()
              this.textureCache.delete(element.imageUrl)
            }
          }
        }

        if (this.imageUpdateTimers.has(id)) {
          clearInterval(this.imageUpdateTimers.get(id) ?? '')
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

    this.textureCache.forEach((texture) => {
      if (texture !== PIXI.Texture.EMPTY) {
        texture.destroy()
      }
    })
    this.textureCache.clear()

    this.imageUpdateTimers.forEach((timer) => {
      clearInterval(timer)
    })
    this.imageUpdateTimers.clear()
  }
}
