import * as PIXI from 'pixi.js'
import { Viewport } from 'pixi-viewport'
import { ElementRenderer } from '../rendering/ElementRenderer'
import { TransformerRenderer } from '../rendering/TransformerRenderer'
import { InteractionHandler } from '../interaction/InteractionHandler'
import { useStore, type ToolType } from '@/stores/canvasStore'
import { nanoid } from 'nanoid'
import type { HandleType, StageManagerState } from './types'

export class StageManagerCore {
  public app: PIXI.Application
  public viewport!: Viewport

  private elementLayer: PIXI.Container = new PIXI.Container()
  private uiLayer: PIXI.Container = new PIXI.Container()

  // 使用独立的渲染器模块
  private elementRenderer = new ElementRenderer()
  private transformerRenderer = new TransformerRenderer()

  // 使用独立的交互处理器
  private interactionHandler!: InteractionHandler

  private selectionRectGraphic = new PIXI.Graphics()

  private state: StageManagerState = {
    mode: 'idle',
    startPos: { x: 0, y: 0 },
    currentId: null,
    initialElementState: null,
    activeHandle: null,
    isSpacePressed: false,
    destroyed: false,
  }

  constructor(container: HTMLElement) {
    this.app = new PIXI.Application()
    this.initApp(container).then(() => {
      this.setupViewport(container)
      this.viewport.addChild(this.elementLayer)
      this.viewport.addChild(this.uiLayer)
      this.uiLayer.addChild(this.selectionRectGraphic)
      this.uiLayer.addChild(this.transformerRenderer.getGraphic())

      // 初始化交互处理器
      this.interactionHandler = new InteractionHandler(
        this.viewport,
        this.onPointerDown,
        this.onPointerMove,
        this.onPointerUp,
      )
      this.interactionHandler.setupInteraction()

      useStore.subscribe(
        (state) => ({ elements: state.elements, selectedIds: state.selectedIds, tool: state.tool }),
        (state) => {
          if (!this.state.destroyed) {
            this.elementRenderer.renderElements(state.elements, this.elementLayer, this.state.destroyed)
            this.transformerRenderer.renderTransformer(
              state.elements,
              state.selectedIds,
              this.elementRenderer.getSpriteMap(),
              this.onHandleDown,
              this.viewport.scale.x,
            )
            this.updateViewportState(state.tool)
            this.updateCursor(state.tool)
          }
        },
        { equalityFn: (prev, next) => JSON.stringify(prev) === JSON.stringify(next) },
      )

      const { elements, selectedIds, tool } = useStore.getState()
      this.elementRenderer.renderElements(elements, this.elementLayer, this.state.destroyed)
      this.transformerRenderer.renderTransformer(
        elements,
        selectedIds,
        this.elementRenderer.getSpriteMap(),
        this.onHandleDown,
        this.viewport.scale.x,
      )
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

  // --- 交互逻辑 ---
  private onPointerDown = (e: PIXI.FederatedPointerEvent) => {
    if (e.button === 1) return
    const state = useStore.getState()
    const tool = state.tool
    const worldPos = e.getLocalPosition(this.viewport)
    if (e.target && e.target.label?.startsWith('handle:')) return

    this.state.startPos = { x: worldPos.x, y: worldPos.y }
    this.selectionRectGraphic.clear()

    if (tool === 'hand' || this.state.isSpacePressed) return

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
        this.state.mode = 'dragging'
        this.state.currentId = hitId
        if (!state.selectedIds.includes(hitId)) state.setSelected([hitId])
        return
      }
      this.state.mode = 'selecting'
      state.setSelected([])
      return
    }

    // Drawing Mode
    this.state.mode = 'drawing'
    const newId = nanoid()
    this.state.currentId = newId
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

  private onHandleDown = (e: PIXI.FederatedPointerEvent, handle: HandleType | 'p0' | 'p1', elementId: string) => {
    this.state.mode = 'resizing'
    this.state.activeHandle = handle as HandleType | null
    this.state.currentId = elementId
    const el = useStore.getState().elements[elementId]
    this.state.initialElementState = { ...el, points: el.points ? [...el.points.map((p) => [...p])] : undefined }
    this.state.startPos = e.getLocalPosition(this.viewport)
  }

  private onPointerMove = (e: PIXI.FederatedPointerEvent) => {
    if (this.state.mode === 'idle') return
    const state = useStore.getState()
    const currentPos = e.getLocalPosition(this.viewport)

    if (this.state.mode === 'selecting') {
      const x = Math.min(this.state.startPos.x, currentPos.x)
      const y = Math.min(this.state.startPos.y, currentPos.y)
      const w = Math.abs(currentPos.x - this.state.startPos.x)
      const h = Math.abs(currentPos.y - this.state.startPos.y)
      this.selectionRectGraphic
        .clear()
        .rect(x, y, w, h)
        .fill({ color: 0x3b82f6, alpha: 0.2 })
        .stroke({ width: 1, color: 0x3b82f6 })
    } else if (this.state.mode === 'dragging' && this.state.currentId) {
      const dx = currentPos.x - this.state.startPos.x
      const dy = currentPos.y - this.state.startPos.y
      state.selectedIds.forEach((id) => {
        const el = state.elements[id]
        state.updateElement(id, { x: el.x + dx, y: el.y + dy })
      })
      this.state.startPos = { x: currentPos.x, y: currentPos.y }
    } else if (this.state.mode === 'resizing' && this.state.initialElementState && this.state.currentId) {
      const el = state.elements[this.state.currentId]

      if ((el.type === 'line' || el.type === 'arrow') && this.state.initialElementState.points) {
        // ... 直线 Resize 逻辑 ...
        const initX = this.state.initialElementState.x!
        const initY = this.state.initialElementState.y!
        const p0Abs = {
          x: initX + this.state.initialElementState.points![0][0],
          y: initY + this.state.initialElementState.points![0][1],
        }
        const p1Abs = {
          x: initX + this.state.initialElementState.points![1][0],
          y: initY + this.state.initialElementState.points![1][1],
        }

        if (this.state.activeHandle === 'p0') {
          p0Abs.x = currentPos.x
          p0Abs.y = currentPos.y
        } else if (this.state.activeHandle === 'p1') {
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

        state.updateElement(this.state.currentId, { x: newX, y: newY, width: newW, height: newH, points: newPoints })
        return
      }

      // 普通 Resize
      const dx = currentPos.x - this.state.startPos.x
      const dy = currentPos.y - this.state.startPos.y
      const init = this.state.initialElementState
      let newX = init.x!
      let newY = init.y!
      let newW = init.width!
      let newH = init.height!

      if (this.state.activeHandle?.includes('l')) {
        newX += dx
        newW -= dx
      }
      if (this.state.activeHandle?.includes('r')) {
        newW += dx
      }
      if (this.state.activeHandle?.includes('t')) {
        newY += dy
        newH -= dy
      }
      if (this.state.activeHandle?.includes('b')) {
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

      state.updateElement(this.state.currentId, { x: newX, y: newY, width: newW, height: newH })
    } else if (this.state.mode === 'drawing' && this.state.currentId) {
      const el = state.elements[this.state.currentId]
      if (!el) return
      if (el.type === 'line' || el.type === 'arrow') {
        const dx = currentPos.x - this.state.startPos.x
        const dy = currentPos.y - this.state.startPos.y
        state.updateElement(this.state.currentId, {
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
        state.updateElement(this.state.currentId, {
          points: newPoints,
          width: Math.max(...xs) - Math.min(...xs),
          height: Math.max(...ys) - Math.min(...ys),
        })
      } else {
        const width = currentPos.x - this.state.startPos.x
        const height = currentPos.y - this.state.startPos.y
        const x = width < 0 ? this.state.startPos.x + width : this.state.startPos.x
        const y = height < 0 ? this.state.startPos.y + height : this.state.startPos.y
        state.updateElement(this.state.currentId, { x, y, width: Math.abs(width), height: Math.abs(height) })
      }
    }
  }

  private onPointerUp = () => {
    const state = useStore.getState()
    if (this.state.mode === 'selecting') {
      const endPos = this.app.renderer.events.pointer.getLocalPosition(this.viewport)
      const minX = Math.min(this.state.startPos.x, endPos.x)
      const maxX = Math.max(this.state.startPos.x, endPos.x)
      const minY = Math.min(this.state.startPos.y, endPos.y)
      const maxY = Math.max(this.state.startPos.y, endPos.y)
      const hitIds: string[] = []
      Object.values(state.elements).forEach((el) => {
        if (el.x < maxX && el.x + el.width > minX && el.y < maxY && el.y + el.height > minY) {
          hitIds.push(el.id)
        }
      })
      state.setSelected(hitIds)
      this.selectionRectGraphic.clear()
    }
    if (this.state.mode === 'drawing' && this.state.currentId) {
      const el = state.elements[this.state.currentId]
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
        state.updateElement(this.state.currentId, {
          x: newX,
          y: newY,
          width: maxX - minX,
          height: maxY - minY,
          points: newPoints,
        })
      }
    }
    this.state.mode = 'idle'
    this.state.currentId = null
    this.state.activeHandle = null
    this.state.initialElementState = null
  }

  public updateViewportState(tool: ToolType) {
    if (!this.viewport) return
    const isHandMode = tool === 'hand' || this.state.isSpacePressed
    if (isHandMode) {
      this.viewport.drag({ mouseButtons: 'all' })
      this.viewport.cursor = 'grab'
    } else {
      this.viewport.drag({ mouseButtons: 'middle' })
      this.viewport.cursor = 'default'
    }
  }

  public setSpacePressed(pressed: boolean) {
    this.state.isSpacePressed = pressed
    this.updateViewportState(useStore.getState().tool)
    this.updateCursor(useStore.getState().tool)
  }

  private updateCursor(tool: ToolType) {
    if (!this.app.canvas) return
    if (this.state.isSpacePressed || tool === 'hand') this.app.canvas.style.cursor = 'grab'
    else if (tool === 'select') this.app.canvas.style.cursor = 'default'
    else this.app.canvas.style.cursor = 'crosshair'
  }

  public destroy() {
    this.state.destroyed = true
    this.interactionHandler.removeInteraction()
    this.elementRenderer.clear()
    this.app.destroy(true, { children: true, texture: true })
  }
}
