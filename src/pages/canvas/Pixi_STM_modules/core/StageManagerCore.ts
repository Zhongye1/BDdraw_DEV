import * as PIXI from 'pixi.js'
import { Viewport } from 'pixi-viewport'
import { ElementRenderer } from '../rendering/ElementRenderer'
import { TransformerRenderer } from '../rendering/TransformerRenderer'
import { InteractionHandler } from '../interaction/InteractionHandler'
import { useStore, type ToolType, type CanvasElement } from '@/stores/canvasStore'
import { nanoid } from 'nanoid'
import type { HandleType, StageManagerState } from './types'

export class StageManagerCore {
  public app: PIXI.Application
  public viewport!: Viewport

  private elementLayer: PIXI.Container = new PIXI.Container()
  private uiLayer: PIXI.Container = new PIXI.Container()

  private elementRenderer = new ElementRenderer()
  private transformerRenderer = new TransformerRenderer()

  private interactionHandler!: InteractionHandler

  private selectionRectGraphic = new PIXI.Graphics()
  private eraserGraphic = new PIXI.Graphics()

  private state: StageManagerState = {
    mode: 'idle',
    startPos: { x: 0, y: 0 },
    currentId: null,
    initialElementState: null,
    // --- 新增初始化 ---
    initialElementsMap: null,
    initialGroupBounds: null,
    // ----------------
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
      this.uiLayer.addChild(this.eraserGraphic)
      this.uiLayer.addChild(this.transformerRenderer.getGraphic())

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

  // --- 辅助方法：计算选中元素的整体包围盒 ---
  private getSelectionBounds(selectedIds: string[], elements: Record<string, CanvasElement>) {
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity

    let hasValid = false
    selectedIds.forEach((id) => {
      const el = elements[id]
      if (!el) return
      hasValid = true
      // 使用数据模型中的宽高计算
      // 如果想要更精确的 Text 包围盒，可以结合 ElementRenderer 的 spriteMap
      minX = Math.min(minX, el.x)
      minY = Math.min(minY, el.y)
      maxX = Math.max(maxX, el.x + el.width)
      maxY = Math.max(maxY, el.y + el.height)
    })

    if (!hasValid) return null
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
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
    this.eraserGraphic.clear()

    if (tool === 'hand' || this.state.isSpacePressed) return

    // Eraser Mode
    if (tool === 'eraser') {
      this.state.mode = 'erasing'
      if (e.target && e.target.label) {
        const hitId = e.target.label
        state.removeElements([hitId])
      }
      return
    }

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
        fill: '#000000',
        stroke: '#000000',
        strokeWidth: 0,
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
    e.stopPropagation()
    this.state.mode = 'resizing'
    this.state.activeHandle = handle as HandleType | null
    this.state.currentId = elementId
    this.state.startPos = e.getLocalPosition(this.viewport)

    const state = useStore.getState()
    const { elements, selectedIds } = state

    // 1. 捕捉所有选中元素的初始状态 (深拷贝 points)
    const initialMap: Record<string, Partial<CanvasElement>> = {}
    selectedIds.forEach((id) => {
      const el = elements[id]
      if (el) {
        initialMap[id] = {
          ...el,
          points: el.points ? el.points.map((p) => [...p]) : undefined,
        }
      }
    })
    this.state.initialElementsMap = initialMap

    // 2. 计算初始的群组包围盒
    this.state.initialGroupBounds = this.getSelectionBounds(selectedIds, elements)
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
    } else if (this.state.mode === 'erasing') {
      if (e.target && e.target.label) {
        const hitId = e.target.label
        state.removeElements([hitId])
      } else {
        const eraserSize = 20
        const worldPos = e.getLocalPosition(this.viewport)
        this.eraserGraphic.clear()
        this.eraserGraphic.circle(worldPos.x, worldPos.y, eraserSize)
        this.eraserGraphic.stroke({ width: 2, color: 0xff0000 })
      }
    } else if (this.state.mode === 'dragging') {
      const dx = currentPos.x - this.state.startPos.x
      const dy = currentPos.y - this.state.startPos.y

      if (state.selectedIds.length > 0) {
        state.selectedIds.forEach((id) => {
          const el = state.elements[id]
          // 注意：这里假设 onPointerMove 频率较高，dx/dy 是相对上一次的增量
          // 但我们现在的 dx 是 current - start，所以需要基于 snapshot 移动，或者每次重置 startPos
          // 原代码使用的是 "每次移动 state 后重置 startPos" 的策略 (见下方)
          state.updateElement(id, { x: el.x + dx, y: el.y + dy })
        })
        // 重置起点，使 dx/dy 成为增量
        this.state.startPos = { x: currentPos.x, y: currentPos.y }
      }
    } else if (this.state.mode === 'resizing' && this.state.initialElementsMap && this.state.initialGroupBounds) {
      // === 修复后的 Resize 逻辑 ===
      const selectedIds = state.selectedIds
      const initBounds = this.state.initialGroupBounds
      const handle = this.state.activeHandle

      // 1. 处理单个线段/箭头的端点拖拽 (特例)
      const singleId = selectedIds[0]
      const singleEl = this.state.initialElementsMap[singleId]
      if (
        selectedIds.length === 1 &&
        (singleEl.type === 'line' || singleEl.type === 'arrow') &&
        (handle === 'p0' || handle === 'p1')
      ) {
        const initX = singleEl.x ?? 0
        const initY = singleEl.y ?? 0
        const points = singleEl.points!
        const p0Abs = { x: initX + points[0][0], y: initY + points[0][1] }
        const p1Abs = { x: initX + points[1][0], y: initY + points[1][1] }

        if (handle === 'p0') {
          p0Abs.x = currentPos.x
          p0Abs.y = currentPos.y
        } else {
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
        state.updateElement(singleId, { x: newX, y: newY, width: newW, height: newH, points: newPoints })
        return
      }

      // 2. 通用群组缩放逻辑
      // 计算鼠标相对于点击时的位移
      const totalDx = currentPos.x - this.state.startPos.x
      const totalDy = currentPos.y - this.state.startPos.y

      // 基于初始包围盒计算新的包围盒
      let finalL = initBounds.x
      let finalR = initBounds.x + initBounds.width
      let finalT = initBounds.y
      let finalB = initBounds.y + initBounds.height

      // 根据手柄方向应用位移
      if (handle?.includes('l')) finalL += totalDx
      if (handle?.includes('r')) finalR += totalDx
      if (handle?.includes('t')) finalT += totalDy
      if (handle?.includes('b')) finalB += totalDy

      // 处理翻转（如果拉过了头）
      if (finalR < finalL) {
        ;[finalL, finalR] = [finalR, finalL]
      }
      if (finalB < finalT) {
        ;[finalT, finalB] = [finalB, finalT]
      }

      const newBoundsW = finalR - finalL
      const newBoundsH = finalB - finalT

      // 3. 计算缩放比例
      const scaleX = initBounds.width === 0 ? 1 : newBoundsW / initBounds.width
      const scaleY = initBounds.height === 0 ? 1 : newBoundsH / initBounds.height

      // 4. 应用到所有选中的元素
      selectedIds.forEach((id) => {
        const initEl = this.state.initialElementsMap![id]
        if (!initEl) return

        // 计算新位置：新原点 + (相对位移 * 缩放)
        const relX = initEl.x! - initBounds.x
        const relY = initEl.y! - initBounds.y

        const finalElX = finalL + relX * scaleX
        const finalElY = finalT + relY * scaleY
        const finalElW = initEl.width! * scaleX
        const finalElH = initEl.height! * scaleY

        const updatePayload: any = {
          x: finalElX,
          y: finalElY,
          width: finalElW,
          height: finalElH,
        }

        // 如果有内部点集，也需要缩放
        if (initEl.points) {
          updatePayload.points = initEl.points.map((p) => [p[0] * scaleX, p[1] * scaleY])
        }

        state.updateElement(id, updatePayload)
      })
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
    if (this.state.mode === 'erasing') {
      this.state.mode = 'idle'
      this.eraserGraphic.clear()
    }
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
    // --- 清理状态 ---
    this.state.initialElementsMap = null
    this.state.initialGroupBounds = null
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
