// src/Pixi_stageManager.ts
import * as PIXI from 'pixi.js'
// 引入 HTMLText (PixiJS v8 内置支持，如果是 v7 可能需要安装 @pixi/text-html)
import { HTMLText } from 'pixi.js'
import { Viewport } from 'pixi-viewport'
import { useStore, type CanvasElement, type ToolType } from '@/stores/canvasStore'
import { nanoid } from 'nanoid'

type InteractionMode = 'idle' | 'panning' | 'selecting' | 'dragging' | 'resizing' | 'drawing'
type HandleType = 'tl' | 't' | 'tr' | 'r' | 'br' | 'b' | 'bl' | 'l' | 'p0' | 'p1'

export class StageManager {
  public app: PIXI.Application
  public viewport!: Viewport

  private elementLayer: PIXI.Container = new PIXI.Container()
  private uiLayer: PIXI.Container = new PIXI.Container()

  // 【修改点1】spriteMap 类型增加 HTMLText
  private spriteMap: Map<string, PIXI.Graphics | HTMLText> = new Map()

  private mode: InteractionMode = 'idle'
  private startPos = { x: 0, y: 0 }
  private currentId: string | null = null

  private selectionRectGraphic = new PIXI.Graphics()
  private transformerGraphic = new PIXI.Graphics()

  private initialElementState: Partial<CanvasElement> | null = null
  private activeHandle: HandleType | null = null
  private isSpacePressed = false
  private destroyed = false

  constructor(container: HTMLElement) {
    this.app = new PIXI.Application()
    this.initApp(container).then(() => {
      this.setupViewport(container)
      this.viewport.addChild(this.elementLayer)
      this.viewport.addChild(this.uiLayer)
      this.uiLayer.addChild(this.selectionRectGraphic)
      this.uiLayer.addChild(this.transformerGraphic)
      this.setupInteraction()

      useStore.subscribe(
        (state) => ({ elements: state.elements, selectedIds: state.selectedIds, tool: state.tool }),
        (state) => {
          if (!this.destroyed) {
            this.renderElements(state.elements, state.selectedIds)
            this.renderTransformer(state.elements, state.selectedIds)
            this.updateViewportState(state.tool)
            this.updateCursor(state.tool)
          }
        },
        { equalityFn: (prev, next) => JSON.stringify(prev) === JSON.stringify(next) },
      )

      const { elements, selectedIds, tool } = useStore.getState()
      this.renderElements(elements, selectedIds)
      this.renderTransformer(elements, selectedIds)
      this.updateViewportState(tool)
    })
  }

  private async initApp(container: HTMLElement) {
    await this.app.init({
      background: '#ffffff',
      resizeTo: container,
      antialias: true,
      eventMode: 'static',
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    })
    container.appendChild(this.app.canvas)
    container.addEventListener('mousedown', (e) => {
      if (e.button === 1) e.preventDefault()
    })
  }

  private setupViewport(container: HTMLElement) {
    this.viewport = new Viewport({
      screenWidth: container.clientWidth,
      screenHeight: container.clientHeight,
      worldWidth: 1000,
      worldHeight: 1000,
      events: this.app.renderer.events,
    })
    this.app.stage.addChild(this.viewport)
    this.viewport.drag({ mouseButtons: 'middle' }).pinch().wheel()
  }

  // --- 渲染元素 ---
  private renderElements(elements: Record<string, CanvasElement>, selectedIds: string[]) {
    if (this.destroyed) return
    const elementIds = new Set(Object.keys(elements))

    elementIds.forEach((id) => {
      const data = elements[id]
      let graphic = this.spriteMap.get(id)

      // === 处理 Text 类型 (HTMLText) ===
      if (data.type === 'text') {
        // 如果之前的 sprite 不是 HTMLText，销毁重建
        if (graphic && !(graphic instanceof HTMLText)) {
          this.elementLayer.removeChild(graphic)
          graphic.destroy()
          graphic = undefined
        }

        if (!graphic) {
          // 【修改点2】创建 HTMLText
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
          this.elementLayer.addChild(graphic)
          this.spriteMap.set(id, graphic)
        }

        const textObj = graphic as HTMLText

        // 【修改点3】直接赋值 HTML 字符串
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
          this.elementLayer.removeChild(graphic)
          graphic.destroy()
          graphic = undefined
        }

        if (!graphic) {
          graphic = new PIXI.Graphics()
          graphic.label = id
          graphic.eventMode = 'static'
          graphic.cursor = 'move'
          this.elementLayer.addChild(graphic)
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
          g.rect(0, 0, data.width, data.height).fill({ color: fillColor, alpha })
        } else if (data.type === 'circle') {
          g.ellipse(data.width / 2, data.height / 2, data.width / 2, data.height / 2).fill({ color: fillColor, alpha })
        } else if (data.type === 'triangle') {
          g.poly([data.width / 2, 0, data.width, data.height, 0, data.height]).fill({ color: fillColor, alpha })
        } else if (data.type === 'diamond') {
          g.poly([
            data.width / 2,
            0,
            data.width,
            data.height / 2,
            data.width / 2,
            data.height,
            0,
            data.height / 2,
          ]).fill({ color: fillColor, alpha })
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
        this.elementLayer.removeChild(graphic)
        graphic.destroy()
        this.spriteMap.delete(id)
      }
    })
  }

  // --- 2. 渲染 Transformer ---
  private renderTransformer(elements: Record<string, CanvasElement>, selectedIds: string[]) {
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
      const handleSize = 10 / this.viewport.scale.x

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
          this.onHandleDown(e, type, selectedIds[0])
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
      const sprite = this.spriteMap.get(id)

      if (!el || !sprite) return

      // 【修改点4】针对 Text，读取 sprite 的实时尺寸
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
      const handleSize = 8 / this.viewport.scale.x
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
          this.onHandleDown(e, type as HandleType, selectedIds[0])
        })
        this.transformerGraphic.addChild(hitZone)
      })
    }
  }

  // --- 3. 交互逻辑 ---
  private setupInteraction() {
    this.viewport.on('pointerdown', this.onPointerDown)
    this.viewport.on('pointermove', this.onPointerMove)
    this.viewport.on('pointerup', this.onPointerUp)
    this.viewport.on('pointerupoutside', this.onPointerUp)
  }

  private onPointerDown = (e: PIXI.FederatedPointerEvent) => {
    if (e.button === 1) return
    const state = useStore.getState()
    const tool = state.tool
    const worldPos = e.getLocalPosition(this.viewport)
    if (e.target && e.target.label?.startsWith('handle:')) return

    this.startPos = { x: worldPos.x, y: worldPos.y }
    this.selectionRectGraphic.clear()

    if (tool === 'hand' || this.isSpacePressed) return

    // Text Mode
    if (tool === 'text') {
      const newId = nanoid()
      state.addElement({
        id: newId,
        type: 'text',
        x: worldPos.x,
        y: worldPos.y,
        width: 200,
        height: 40,
        fill: state.currentStyle.fill,
        stroke: '#000000',
        strokeWidth: 0,
        // 初始文本带个标签比较好，方便 HTMLText 解析
        text: '<p>请输入文本</p>',
        fontSize: state.currentStyle.fontSize || 20,
        fontFamily: state.currentStyle.fontFamily || 'Arial',
      })
      state.setSelected([newId])
      state.setTool('select')
      return
    }

    // Select Mode
    if (tool === 'select') {
      if (e.target && e.target.label && !e.target.label.startsWith('handle:')) {
        const hitId = e.target.label
        this.mode = 'dragging'
        this.currentId = hitId
        if (!state.selectedIds.includes(hitId)) state.setSelected([hitId])
        return
      }
      this.mode = 'selecting'
      state.setSelected([])
      return
    }

    // Drawing Mode
    this.mode = 'drawing'
    const newId = nanoid()
    this.currentId = newId
    const commonProps = {
      id: newId,
      type: tool,
      x: worldPos.x,
      y: worldPos.y,
      width: 0,
      height: 0,
      fill: state.currentStyle.fill,
      stroke: state.currentStyle.stroke,
      strokeWidth: state.currentStyle.strokeWidth,
      alpha: state.currentStyle.alpha,
    }

    if (tool === 'pencil') {
      state.addElement({ ...commonProps, points: [[0, 0]] })
    } else if (tool === 'line' || tool === 'arrow') {
      state.addElement({
        ...commonProps,
        points: [
          [0, 0],
          [0, 0],
        ],
      })
    } else {
      state.addElement(commonProps)
    }
  }

  private onHandleDown = (e: PIXI.FederatedPointerEvent, handle: HandleType, elementId: string) => {
    this.mode = 'resizing'
    this.activeHandle = handle
    this.currentId = elementId
    const el = useStore.getState().elements[elementId]
    this.initialElementState = { ...el, points: el.points ? [...el.points.map((p) => [...p])] : undefined }
    this.startPos = e.getLocalPosition(this.viewport)
  }

  private onPointerMove = (e: PIXI.FederatedPointerEvent) => {
    if (this.mode === 'idle') return
    const state = useStore.getState()
    const currentPos = e.getLocalPosition(this.viewport)

    if (this.mode === 'selecting') {
      const x = Math.min(this.startPos.x, currentPos.x)
      const y = Math.min(this.startPos.y, currentPos.y)
      const w = Math.abs(currentPos.x - this.startPos.x)
      const h = Math.abs(currentPos.y - this.startPos.y)
      this.selectionRectGraphic
        .clear()
        .rect(x, y, w, h)
        .fill({ color: 0x3b82f6, alpha: 0.2 })
        .stroke({ width: 1, color: 0x3b82f6 })
    } else if (this.mode === 'dragging' && this.currentId) {
      const dx = currentPos.x - this.startPos.x
      const dy = currentPos.y - this.startPos.y
      state.selectedIds.forEach((id) => {
        const el = state.elements[id]
        state.updateElement(id, { x: el.x + dx, y: el.y + dy })
      })
      this.startPos = { x: currentPos.x, y: currentPos.y }
    } else if (this.mode === 'resizing' && this.initialElementState && this.currentId) {
      const el = state.elements[this.currentId]

      if ((el.type === 'line' || el.type === 'arrow') && this.initialElementState.points) {
        // ... 直线 Resize 逻辑 ...
        const initX = this.initialElementState.x!
        const initY = this.initialElementState.y!
        const p0Abs = {
          x: initX + this.initialElementState.points![0][0],
          y: initY + this.initialElementState.points![0][1],
        }
        const p1Abs = {
          x: initX + this.initialElementState.points![1][0],
          y: initY + this.initialElementState.points![1][1],
        }

        if (this.activeHandle === 'p0') {
          p0Abs.x = currentPos.x
          p0Abs.y = currentPos.y
        } else if (this.activeHandle === 'p1') {
          p1Abs.x = currentPos.x
          p1Abs.y = currentPos.y
        }

        const newX = Math.min(p0Abs.x, p1Abs.x)
        const newY = Math.min(p0Abs.y, p1Abs.y)
        const newW = Math.abs(p0Abs.x - p1Abs.x)
        const newH = Math.abs(p0Abs.y - p1Abs.y)
        const newPoints = [
          [p0Abs.x - newX, p0Abs.y - newY],
          [p1Abs.x - newX, p1Abs.y - newY],
        ]

        state.updateElement(this.currentId, { x: newX, y: newY, width: newW, height: newH, points: newPoints })
        return
      }

      // 普通 Resize
      const dx = currentPos.x - this.startPos.x
      const dy = currentPos.y - this.startPos.y
      const init = this.initialElementState
      let newX = init.x!
      let newY = init.y!
      let newW = init.width!
      let newH = init.height!

      if (this.activeHandle?.includes('l')) {
        newX += dx
        newW -= dx
      }
      if (this.activeHandle?.includes('r')) {
        newW += dx
      }
      if (this.activeHandle?.includes('t')) {
        newY += dy
        newH -= dy
      }
      if (this.activeHandle?.includes('b')) {
        newH += dy
      }
      if (newW < 0) {
        newX += newW
        newW = Math.abs(newW)
      }
      if (newH < 0) {
        newY += newH
        newH = Math.abs(newH)
      }

      state.updateElement(this.currentId, { x: newX, y: newY, width: newW, height: newH })
    } else if (this.mode === 'drawing' && this.currentId) {
      const el = state.elements[this.currentId]
      if (!el) return
      if (el.type === 'line' || el.type === 'arrow') {
        const dx = currentPos.x - this.startPos.x
        const dy = currentPos.y - this.startPos.y
        state.updateElement(this.currentId, {
          points: [
            [0, 0],
            [dx, dy],
          ],
          width: Math.abs(dx),
          height: Math.abs(dy),
        })
      } else if (el.type === 'pencil') {
        const localX = currentPos.x - el.x
        const localY = currentPos.y - el.y
        const newPoints = [...(el.points || []), [localX, localY]]
        const xs = newPoints.map((p) => p[0])
        const ys = newPoints.map((p) => p[1])
        state.updateElement(this.currentId, {
          points: newPoints,
          width: Math.max(...xs) - Math.min(...xs),
          height: Math.max(...ys) - Math.min(...ys),
        })
      } else {
        const width = currentPos.x - this.startPos.x
        const height = currentPos.y - this.startPos.y
        const x = width < 0 ? this.startPos.x + width : this.startPos.x
        const y = height < 0 ? this.startPos.y + height : this.startPos.y
        state.updateElement(this.currentId, { x, y, width: Math.abs(width), height: Math.abs(height) })
      }
    }
  }

  private onPointerUp = () => {
    const state = useStore.getState()
    if (this.mode === 'selecting') {
      const endPos = this.app.renderer.events.pointer.getLocalPosition(this.viewport)
      const minX = Math.min(this.startPos.x, endPos.x)
      const maxX = Math.max(this.startPos.x, endPos.x)
      const minY = Math.min(this.startPos.y, endPos.y)
      const maxY = Math.max(this.startPos.y, endPos.y)
      const hitIds: string[] = []
      Object.values(state.elements).forEach((el) => {
        if (el.x < maxX && el.x + el.width > minX && el.y < maxY && el.y + el.height > minY) {
          hitIds.push(el.id)
        }
      })
      state.setSelected(hitIds)
      this.selectionRectGraphic.clear()
    }
    if (this.mode === 'drawing' && this.currentId) {
      const el = state.elements[this.currentId]
      if ((el.type === 'pencil' || el.type === 'line' || el.type === 'arrow') && el.points) {
        const absPoints = el.points.map((p) => ({ x: el.x + p[0], y: el.y + p[1] }))
        const xs = absPoints.map((p) => p.x)
        const ys = absPoints.map((p) => p.y)
        const minX = Math.min(...xs)
        const minY = Math.min(...ys)
        const maxX = Math.max(...xs)
        const maxY = Math.max(...ys)
        const newX = minX
        const newY = minY
        const newPoints = absPoints.map((p) => [p.x - newX, p.y - newY])
        state.updateElement(this.currentId, {
          x: newX,
          y: newY,
          width: maxX - minX,
          height: maxY - minY,
          points: newPoints,
        })
      }
    }
    this.mode = 'idle'
    this.currentId = null
    this.activeHandle = null
    this.initialElementState = null
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

  public updateViewportState(tool: ToolType) {
    if (!this.viewport) return
    const isHandMode = tool === 'hand' || this.isSpacePressed
    if (isHandMode) {
      this.viewport.drag({ mouseButtons: 'all' })
      this.viewport.cursor = 'grab'
    } else {
      this.viewport.drag({ mouseButtons: 'middle' })
      this.viewport.cursor = 'default'
    }
  }

  public setSpacePressed(pressed: boolean) {
    this.isSpacePressed = pressed
    this.updateViewportState(useStore.getState().tool)
    this.updateCursor(useStore.getState().tool)
  }

  private updateCursor(tool: ToolType) {
    if (!this.app.canvas) return
    if (this.isSpacePressed || tool === 'hand') this.app.canvas.style.cursor = 'grab'
    else if (tool === 'select') this.app.canvas.style.cursor = 'default'
    else this.app.canvas.style.cursor = 'crosshair'
  }

  public destroy() {
    this.destroyed = true
    this.app.destroy(true, { children: true, texture: true })
  }
}
