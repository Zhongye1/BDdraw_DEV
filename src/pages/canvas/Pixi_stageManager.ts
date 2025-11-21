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

  // --- 1. 核心渲染逻辑 (更新) ---
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
      const fillColor = new PIXI.Color(data.fill)
      const alpha = data.alpha ?? 1

      // 统一设置描边风格
      if (strokeWidth > 0) {
        graphic.stroke({ width: strokeWidth, color: strokeColor, cap: 'round', join: 'round' })
      }

      // --- A. 形状类 (基于 width/height) ---
      if (data.type === 'rect') {
        graphic.rect(0, 0, data.width, data.height)
        if (strokeWidth > 0) graphic.stroke()
        graphic.fill({ color: fillColor, alpha })
      } else if (data.type === 'circle') {
        graphic.ellipse(data.width / 2, data.height / 2, data.width / 2, data.height / 2)
        if (strokeWidth > 0) graphic.stroke()
        graphic.fill({ color: fillColor, alpha })
      } else if (data.type === 'triangle') {
        graphic.poly([data.width / 2, 0, data.width, data.height, 0, data.height])
        if (strokeWidth > 0) graphic.stroke()
        graphic.fill({ color: fillColor, alpha })
      } else if (data.type === 'diamond') {
        // 菱形: 四边中点连线
        graphic.poly([
          data.width / 2,
          0, // Top
          data.width,
          data.height / 2, // Right
          data.width / 2,
          data.height, // Bottom
          0,
          data.height / 2, // Left
        ])
        if (strokeWidth > 0) graphic.stroke()
        graphic.fill({ color: fillColor, alpha })
      }

      // --- B. 路径类 (基于 points) ---
      // 注意: 路径类通常不需要闭合填充(fill)，除非是特定需求。这里只做描边。
      else if (
        (data.type === 'line' || data.type === 'arrow' || data.type === 'pencil') &&
        data.points &&
        data.points.length > 0
      ) {
        // 1. 绘制主线条
        graphic.moveTo(data.points[0][0], data.points[0][1])
        for (let i = 1; i < data.points.length; i++) {
          graphic.lineTo(data.points[i][0], data.points[i][1])
        }
        graphic.stroke({ width: strokeWidth, color: strokeColor, cap: 'round', join: 'round' })

        // 2. 箭头的特殊处理 (画箭头尾巴)
        if (data.type === 'arrow' && data.points.length >= 2) {
          const start = data.points[0]
          const end = data.points[data.points.length - 1]

          // 计算角度
          const dx = end[0] - start[0]
          const dy = end[1] - start[1]
          const angle = Math.atan2(dy, dx)
          const headLength = 15 // 箭头长度
          const headAngle = Math.PI / 6 // 30度

          // 左翼
          graphic.moveTo(end[0], end[1])
          graphic.lineTo(
            end[0] - headLength * Math.cos(angle - headAngle),
            end[1] - headLength * Math.sin(angle - headAngle),
          )
          // 右翼
          graphic.moveTo(end[0], end[1])
          graphic.lineTo(
            end[0] - headLength * Math.cos(angle + headAngle),
            end[1] - headLength * Math.sin(angle + headAngle),
          )
          graphic.stroke({ width: strokeWidth, color: strokeColor, cap: 'round', join: 'round' })
        }
      }

      // 设置整体位置
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

  // --- 2. 渲染选框 (Transformer) ---
  // (保持原代码逻辑，但增加了对 Line/Pencil 这种可能很细的物体的包围盒处理)
  private renderTransformer(elements: Record<string, CanvasElement>, selectedIds: string[]) {
    this.transformerGraphic.clear()
    this.transformerGraphic.removeChildren()

    if (selectedIds.length === 0) return

    // 计算包围盒 (Bounding Box)
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity
    selectedIds.forEach((id) => {
      const el = elements[id]
      if (!el) return

      // 对于路径类元素，包围盒计算稍微复杂一点 (因为 width/height 可能是根据 points 算出来的)
      // 这里的 el.width/height 应该已经在 onPointerMove 里更新正确了
      minX = Math.min(minX, el.x)
      minY = Math.min(minY, el.y)
      maxX = Math.max(maxX, el.x + el.width)
      maxY = Math.max(maxY, el.y + el.height)
    })

    const bounds = { x: minX, y: minY, width: maxX - minX, height: maxY - minY }

    // 绘制边框
    this.transformerGraphic.rect(bounds.x, bounds.y, bounds.width, bounds.height)
    this.transformerGraphic.stroke({ width: 1, color: 0x8b5cf6 })

    // 如果是单选，绘制手柄 (保持原逻辑)
    if (selectedIds.length === 1) {
      const handleSize = 8 / this.viewport.scale.x
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

  // --- 3. 交互逻辑 (Interaction) ---

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
    }
    // 绘图模式 (核心改动)
    else {
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

      // 根据工具类型初始化不同数据结构
      if (tool === 'pencil' || tool === 'line' || tool === 'arrow') {
        // 路径类：初始化 points，起点是 [0,0] (相对于 graphic 自身的 x,y)
        state.addElement({
          ...commonProps,
          points: [[0, 0]],
        })
      } else {
        // 形状类 (Rect, Circle, Diamond...)
        state.addElement(commonProps)
      }
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

    // C. Resize (保持不变，适用于所有物体)
    // 当对 Line/Pencil resize 时，这里简单的拉伸 width/height 其实会产生缩放效果，
    // Pixi 的 Graphics 会根据 width/height 自动缩放内容。这对于简单的 Pencil/Line 缩放是可行的。
    else if (this.mode === 'resizing' && this.initialElementState && this.currentId) {
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

      let isWidthFlipped = false
      let isHeightFlipped = false

      if (newW < 0) {
        newX += newW
        newW = Math.abs(newW)
        isWidthFlipped = true
      }
      if (newH < 0) {
        newY += newH
        newH = Math.abs(newH)
        isHeightFlipped = true
      }

      // 对于直线和箭头元素，需要同时更新points坐标
      // 逻辑没写完，要改一下
      const element = state.elements[this.currentId]
      if (element && (element.type === 'line' || element.type === 'arrow') && element.points) {
        // 计算宽高变化比例
        let scaleX = newW / init.width!
        let scaleY = newH / init.height!

        // 如果发生了翻转，则相应地反转比例
        if (isWidthFlipped) scaleX *= -1
        if (isHeightFlipped) scaleY *= -1

        // 更新points坐标，保持起点[0,0]不变，调整终点坐标
        const newPoints = [
          [0, 0],
          [init.points![1][0] * scaleX, init.points![1][1] * scaleY],
        ]

        state.updateElement(this.currentId, {
          x: newX,
          y: newY,
          width: newW,
          height: newH,
          points: newPoints,
        })
      } else {
        state.updateElement(this.currentId, { x: newX, y: newY, width: newW, height: newH })
      }
    }

    // D. 绘图 (Drawing) - 核心修改
    else if (this.mode === 'drawing' && this.currentId) {
      const el = state.elements[this.currentId]
      if (!el) return

      // 1. 铅笔 (Pencil): 自由绘制
      if (el.type === 'pencil') {
        // 计算相对于 graphic 起始位置(x,y) 的坐标
        const localX = currentPos.x - el.x
        const localY = currentPos.y - el.y

        // 添加新点
        const newPoints = [...(el.points || []), [localX, localY]]

        // 更新点数据
        // 同时我们需要更新 width/height 以便选中框能正确包裹它
        // 计算 bounds
        const xs = newPoints.map((p) => p[0])
        const ys = newPoints.map((p) => p[1])
        const minX = Math.min(...xs),
          maxX = Math.max(...xs)
        const minY = Math.min(...ys),
          maxY = Math.max(...ys)

        state.updateElement(this.currentId, {
          points: newPoints,
          width: maxX - minX,
          height: maxY - minY,
          // 注意：铅笔绘图时通常不做 x/y 的动态位移修正，
          // 否则绘图过程中整个图形会跳动。
          // 完美的做法是在 onPointerUp 时重新规范化 (normalize) 坐标，把 x,y 移到 minX,minY，并让 points 减去偏移量。
          // 这里为了简单，暂时不实时修 x,y
        })
      }

      // 2. 直线 & 箭头 (Line & Arrow): 两点定位
      else if (el.type === 'line' || el.type === 'arrow') {
        const localX = currentPos.x - el.x
        const localY = currentPos.y - el.y

        // 始终只有两个点：起点 [0,0] 和 终点 [localX, localY]
        const newPoints = [
          [0, 0],
          [localX, localY],
        ]

        // 更新 width/height 用于包围盒计算
        // 这里的 width/height 必须是正数 (Bounding Box 尺寸)
        const width = Math.abs(localX)
        const height = Math.abs(localY)
        // 确保最小宽度和高度，避免出现0值导致选中困难
        const minWidth = Math.max(width, 1)
        const minHeight = Math.max(height, 1)

        state.updateElement(this.currentId, {
          points: newPoints,
          width: minWidth,
          height: minHeight,
        })
      }

      // 3. 形状类 (Rect, Circle, Triangle, Diamond)
      else {
        const width = currentPos.x - this.startPos.x
        const height = currentPos.y - this.startPos.y
        const x = width < 0 ? this.startPos.x + width : this.startPos.x
        const y = height < 0 ? this.startPos.y + height : this.startPos.y

        state.updateElement(this.currentId, {
          x,
          y,
          width: Math.abs(width),
          height: Math.abs(height),
        })
      }
    }
  }

  // 3. 指针抬起：结算逻辑
  private onPointerUp = () => {
    const state = useStore.getState()

    // 结算框选 (同上一版)
    if (this.mode === 'selecting') {
      const endPos = this.app.renderer.events.pointer.getLocalPosition(this.viewport)
      const minX = Math.min(this.startPos.x, endPos.x)
      const maxX = Math.max(this.startPos.x, endPos.x)
      const minY = Math.min(this.startPos.y, endPos.y)
      const maxY = Math.max(this.startPos.y, endPos.y)

      const hitIds: string[] = []
      Object.values(state.elements).forEach((el) => {
        // 对于 line/pencil，这里的 x,y,width,height 构成的包围盒也能正常工作
        if (el.x < maxX && el.x + el.width > minX && el.y < maxY && el.y + el.height > minY) {
          hitIds.push(el.id)
        }
      })
      state.setSelected(hitIds)
      this.selectionRectGraphic.clear()
    }

    // 绘图结束后的数据整理 (Normalization)
    // 对于 Pencil，我们在 drawing 时没有调整 x,y，现在需要把 x,y 移动到包围盒左上角，
    // 并让所有 points 减去偏移量。这样 Transformer 框才会贴合图形。
    // 对于 Line/Arrow，我们也需要进行类似处理
    if (this.mode === 'drawing' && this.currentId) {
      const el = state.elements[this.currentId]
      if ((el.type === 'pencil' || el.type === 'line' || el.type === 'arrow') && el.points) {
        const xs = el.points.map((p) => p[0])
        const ys = el.points.map((p) => p[1])
        const minX = Math.min(...xs)
        const minY = Math.min(...ys)
        const maxX = Math.max(...xs)
        const maxY = Math.max(...ys)

        // 只有当图形不在原点时才需要调整
        if (minX !== 0 || minY !== 0) {
          const newX = el.x + minX
          const newY = el.y + minY
          const newPoints = el.points.map((p) => [p[0] - minX, p[1] - minY])
          state.updateElement(this.currentId, {
            x: newX,
            y: newY,
            points: newPoints,
            width: maxX - minX,
            height: maxY - minY,
          })
        }
      }
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
