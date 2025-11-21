// src/Pixi_stageManager.ts
import * as PIXI from 'pixi.js'
import { Viewport } from 'pixi-viewport'
import { useStore, type CanvasElement, type ToolType } from '@/stores/canvasStore'
import { nanoid } from 'nanoid'

// 定义交互模式
type InteractionMode = 'idle' | 'panning' | 'selecting' | 'dragging' | 'resizing' | 'drawing'

// 定义手柄类型
type HandleType = 'tl' | 't' | 'tr' | 'r' | 'br' | 'b' | 'bl' | 'l'

export class StageManager {
  public app: PIXI.Application
  public viewport!: Viewport

  // 图层管理
  private elementLayer: PIXI.Container = new PIXI.Container() // 存放用户画的图形
  private uiLayer: PIXI.Container = new PIXI.Container() // 存放选框、手柄

  private spriteMap: Map<string, PIXI.Graphics> = new Map()

  // 交互状态
  private mode: InteractionMode = 'idle'
  private startPos = { x: 0, y: 0 } // 拖拽起始的世界坐标
  private currentId: string | null = null // 当前操作的元素ID

  // 辅助图形
  private selectionRectGraphic = new PIXI.Graphics() // 蓝色选框
  private transformerGraphic = new PIXI.Graphics() // 变换控制器

  // 变换/拖拽相关数据
  private initialElementState: Partial<CanvasElement> | null = null // 记录操作前的元素状态
  private activeHandle: HandleType | null = null // 当前激活的缩放手柄
  private isSpacePressed = false
  private destroyed = false

  constructor(container: HTMLElement) {
    this.app = new PIXI.Application()
    this.initApp(container).then(() => {
      this.setupViewport(container)

      // 初始化图层结构
      this.viewport.addChild(this.elementLayer)
      this.viewport.addChild(this.uiLayer)

      // 初始化UI元素
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

      // Initial Render
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
    this.viewport.drag({ mouseButtons: 'middle' }).pinch().wheel() //.decelerate()惯性
  }

  // --- 渲染核心 ---

  // 1. 渲染画布元素
  private renderElements(elements: Record<string, CanvasElement>, selectedIds: string[]) {
    if (this.destroyed) return
    const elementIds = new Set(Object.keys(elements))

    // Create/Update
    elementIds.forEach((id) => {
      const data = elements[id]
      let graphic = this.spriteMap.get(id)
      if (!graphic) {
        graphic = new PIXI.Graphics()
        graphic.label = id
        graphic.eventMode = 'static' // 允许点击
        graphic.cursor = 'move'
        this.elementLayer.addChild(graphic)
        this.spriteMap.set(id, graphic)
      }

      graphic.clear()
      const isSelected = selectedIds.includes(id)
      // 选中时，元素本身只负责稍微亮一点的边框，主要的框选由 UI Layer 负责
      const strokeWidth = data.strokeWidth ?? 0
      const strokeColor = new PIXI.Color(data.stroke)

      if (data.type === 'rect') {
        graphic.rect(0, 0, data.width, data.height)
      } else if (data.type === 'circle') {
        graphic.ellipse(data.width / 2, data.height / 2, data.width / 2, data.height / 2)
      } else if (data.type === 'triangle') {
        graphic.poly([data.width / 2, 0, data.width, data.height, 0, data.height])
      }

      graphic.fill({ color: data.fill, alpha: data.alpha ?? 1 })
      if (strokeWidth > 0) {
        graphic.stroke({ width: strokeWidth, color: strokeColor })
      }
      graphic.position.set(data.x, data.y)
    })

    // Remove
    this.spriteMap.forEach((graphic, id) => {
      if (!elementIds.has(id)) {
        this.elementLayer.removeChild(graphic)
        graphic.destroy()
        this.spriteMap.delete(id)
      }
    })
  }

  // 2. 渲染变换控制器 (Transformer)
  private renderTransformer(elements: Record<string, CanvasElement>, selectedIds: string[]) {
    this.transformerGraphic.clear()
    this.transformerGraphic.removeChildren() // 清除旧的手柄 HitArea

    // 简单起见，只支持单选 Resize，多选只画框
    if (selectedIds.length === 0) return

    // 计算包围盒
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity
    selectedIds.forEach((id) => {
      const el = elements[id]
      if (!el) return
      minX = Math.min(minX, el.x)
      minY = Math.min(minY, el.y)
      maxX = Math.max(maxX, el.x + el.width)
      maxY = Math.max(maxY, el.y + el.height)
    })

    const bounds = { x: minX, y: minY, width: maxX - minX, height: maxY - minY }

    // A. 绘制紫色包围框
    this.transformerGraphic.rect(bounds.x, bounds.y, bounds.width, bounds.height)
    this.transformerGraphic.stroke({ width: 1, color: 0x8b5cf6 }) // purple-500

    // B. 如果是单选，绘制 8 个手柄
    if (selectedIds.length === 1) {
      const handleSize = 8 / this.viewport.scale.x // 保持手柄大小恒定，反向缩放
      // 定义手柄位置
      const handles: Record<HandleType, { x: number; y: number }> = {
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
        // 1. 绘制可见的方块
        this.transformerGraphic.rect(pos.x - handleSize / 2, pos.y - handleSize / 2, handleSize, handleSize)
        this.transformerGraphic.fill({ color: 0xffffff })
        this.transformerGraphic.stroke({ width: 1, color: 0x8b5cf6 })

        // 2. 创建不可见的交互热区 (Hit Area) - 添加到 transformerGraphic 的子节点
        // 这样我们可以检测点击的是哪个手柄
        const hitZone = new PIXI.Graphics()
        hitZone.rect(pos.x - handleSize, pos.y - handleSize, handleSize * 2, handleSize * 2) // 热区大一点
        hitZone.fill({ color: 0x000000, alpha: 0.0001 }) // 几乎透明，但必须有填充才能响应事件
        hitZone.eventMode = 'static'
        hitZone.cursor = this.getCursorForHandle(type as HandleType)
        hitZone.label = `handle:${type}` // 关键：用 label 标记手柄类型

        // 绑定事件到手柄热区
        hitZone.on('pointerdown', (e) => {
          e.stopPropagation() // 阻止冒泡，防止触发元素拖拽
          this.onHandleDown(e, type as HandleType, selectedIds[0])
        })

        this.transformerGraphic.addChild(hitZone)
      })
    }
  }

  // --- 交互逻辑 ---

  private setupInteraction() {
    this.viewport.on('pointerdown', this.onPointerDown)
    this.viewport.on('pointermove', this.onPointerMove)
    this.viewport.on('pointerup', this.onPointerUp)
    this.viewport.on('pointerupoutside', this.onPointerUp)
  }

  // 1. 指针按下：路由逻辑 (决定是 框选、拖拽 还是 绘图)
  private onPointerDown = (e: PIXI.FederatedPointerEvent) => {
    if (e.button === 1) return // 中键交给 Viewport

    const state = useStore.getState()
    const tool = state.tool
    const worldPos = e.getLocalPosition(this.viewport)

    // 如果点击的是 Transformer 手柄，逻辑已经在 onHandleDown 处理了，这里不需要做
    if (e.target && e.target.label?.startsWith('handle:')) return

    // 初始化通用状态
    this.startPos = { x: worldPos.x, y: worldPos.y }
    this.selectionRectGraphic.clear()

    // A. 手型模式
    if (tool === 'hand' || this.isSpacePressed) return

    // B. 点击了元素 -> 拖拽模式 (Dragging)
    if (e.target instanceof PIXI.Graphics && tool === 'select') {
      const hitId = e.target.label
      if (hitId && !hitId.startsWith('handle:')) {
        this.mode = 'dragging'
        this.currentId = hitId
        // 如果没选中，先选中它；如果按住Shift，则是加选(暂略)
        if (!state.selectedIds.includes(hitId)) {
          state.setSelected([hitId])
        }
        return
      }
    }

    // C. 点击空白处 -> 框选模式 或 绘图模式
    if (tool === 'select') {
      this.mode = 'selecting'
      state.setSelected([]) // 点击空白清空选中
    } else {
      this.mode = 'drawing' // 比如 rect, circle
      const newId = nanoid()
      this.currentId = newId
      state.addElement({
        id: newId,
        type: tool as any,
        x: worldPos.x,
        y: worldPos.y,
        width: 0,
        height: 0,
        fill: state.currentStyle.fill,
        stroke: state.currentStyle.stroke,
        strokeWidth: state.currentStyle.strokeWidth,
        alpha: state.currentStyle.alpha,
      })
    }
  }

  // 特殊：手柄按下的处理
  private onHandleDown = (e: PIXI.FederatedPointerEvent, handle: HandleType, elementId: string) => {
    this.mode = 'resizing'
    this.activeHandle = handle
    this.currentId = elementId
    const el = useStore.getState().elements[elementId]
    this.initialElementState = { ...el } // 深拷贝当前状态
    this.startPos = e.getLocalPosition(this.viewport) // 记录起始鼠标位置
  }

  // 2. 指针移动：执行逻辑
  private onPointerMove = (e: PIXI.FederatedPointerEvent) => {
    if (this.mode === 'idle') return
    const state = useStore.getState()
    const currentPos = e.getLocalPosition(this.viewport)

    // A. 框选中
    if (this.mode === 'selecting') {
      const x = Math.min(this.startPos.x, currentPos.x)
      const y = Math.min(this.startPos.y, currentPos.y)
      const w = Math.abs(currentPos.x - this.startPos.x)
      const h = Math.abs(currentPos.y - this.startPos.y)

      // 绘制蓝色选框
      this.selectionRectGraphic.clear()
      this.selectionRectGraphic.rect(x, y, w, h)
      this.selectionRectGraphic.fill({ color: 0x3b82f6, alpha: 0.2 })
      this.selectionRectGraphic.stroke({ width: 1, color: 0x3b82f6 })
    }

    // B. 拖拽元素中
    else if (this.mode === 'dragging' && this.currentId) {
      // 使用世界坐标差值而不是movementX/Y，避免受viewport缩放影响
      const dx = currentPos.x - this.startPos.x
      const dy = currentPos.y - this.startPos.y

      // 简单的移动逻辑：这里应该基于选中所有元素移动
      // 简化版：只移动选中的
      state.selectedIds.forEach((id) => {
        const el = state.elements[id]
        // 注意：这里是累加式更新会导致漂移，最好是基于 initialPos + delta
        // 但为了代码简短，这里演示相对位移（在 onDown 时通常需要记录所有选中元素的初始位置）
        // 暂且用由 store 处理位移的思路，或者直接修改 x/y
        state.updateElement(id, {
          x: el.x + dx,
          y: el.y + dy,
        })
      })

      // 更新起始位置，为下一次移动计算做准备
      this.startPos = { x: currentPos.x, y: currentPos.y }
    }

    // C. 调整大小中 (核心数学逻辑)
    else if (this.mode === 'resizing' && this.initialElementState && this.currentId) {
      const dx = currentPos.x - this.startPos.x
      const dy = currentPos.y - this.startPos.y
      const init = this.initialElementState

      // 计算新的几何属性
      let newX = init.x!
      let newY = init.y!
      let newW = init.width!
      let newH = init.height!

      // 根据手柄调整
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

      // 处理翻转 (宽高为负)
      if (newW < 0) {
        newX += newW
        newW = Math.abs(newW)
      }
      if (newH < 0) {
        newY += newH
        newH = Math.abs(newH)
      }

      state.updateElement(this.currentId, { x: newX, y: newY, width: newW, height: newH })
    }

    // D. 绘图中
    else if (this.mode === 'drawing' && this.currentId) {
      const width = currentPos.x - this.startPos.x
      const height = currentPos.y - this.startPos.y
      const x = width < 0 ? this.startPos.x + width : this.startPos.x
      const y = height < 0 ? this.startPos.y + height : this.startPos.y
      state.updateElement(this.currentId, { x, y, width: Math.abs(width), height: Math.abs(height) })
    }
  }

  // 3. 指针抬起：结算逻辑
  private onPointerUp = () => {
    const state = useStore.getState()

    // 结算框选
    if (this.mode === 'selecting') {
      const bounds = this.selectionRectGraphic.getBounds() // 获取选框的世界包围盒
      // 这一步稍微有点 tricky，因为 Pixi getBounds 是屏幕坐标还是世界坐标取决于 target
      // 手动计算更稳：
      const rect = {
        x:
          Math.min(this.startPos.x, this.selectionRectGraphic.x + this.selectionRectGraphic.width + this.startPos.x) -
          this.selectionRectGraphic.width, // 简化逻辑...其实用下面这个：
      }
      // 实际上我们在 onMove 里已经画在了正确的位置，直接拿 geometry 数据
      // 但更简单的是重新算一次：
      const endPos = this.app.renderer.events.pointer.getLocalPosition(this.viewport)
      const minX = Math.min(this.startPos.x, endPos.x)
      const maxX = Math.max(this.startPos.x, endPos.x)
      const minY = Math.min(this.startPos.y, endPos.y)
      const maxY = Math.max(this.startPos.y, endPos.y)

      // 碰撞检测
      const hitIds: string[] = []
      Object.values(state.elements).forEach((el) => {
        // AABB 碰撞
        if (el.x < maxX && el.x + el.width > minX && el.y < maxY && el.y + el.height > minY) {
          hitIds.push(el.id)
        }
      })
      state.setSelected(hitIds)
      this.selectionRectGraphic.clear()
    }

    this.mode = 'idle'
    this.currentId = null
    this.activeHandle = null
    this.initialElementState = null
  }

  // --- 辅助函数 ---

  // 根据手柄位置返回 CSS 光标样式
  private getCursorForHandle(handle: HandleType): string {
    switch (handle) {
      case 'tl':
        return 'nwse-resize'
      case 'br':
        return 'nwse-resize'
      case 'tr':
        return 'nesw-resize'
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

  // 保持之前的 updateViewportState 和 updateCursor...
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
