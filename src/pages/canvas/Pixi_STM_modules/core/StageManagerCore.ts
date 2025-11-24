import * as PIXI from 'pixi.js'
import { Viewport } from 'pixi-viewport'
import { ElementRenderer } from '../rendering/ElementRenderer'
import { TransformerRenderer } from '../rendering/TransformerRenderer'
import { InteractionHandler } from '../interaction/InteractionHandler'
import { useStore, type ToolType, type CanvasElement, type GroupElement } from '@/stores/canvasStore'
import { nanoid } from 'nanoid'
import type { HandleType, StageManagerState } from './types'
import { undoRedoManager } from '@/lib/UndoRedoManager'
import { UpdateElementCommand } from '@/lib/UpdateElementCommand'

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

  // 防抖相关变量
  private debounceTimer: number | null = null
  private readonly DEBOUNCE_DELAY = 100 // 0.1秒

  private state: StageManagerState = {
    mode: 'idle',
    startPos: { x: 0, y: 0 },
    currentId: null,
    initialElementState: null,
    initialElementsMap: null, // 用于 Resize
    initialGroupBounds: null, // 用于 Resize
    activeHandle: null,
    isSpacePressed: false,
    destroyed: false,
    resizeInitialStates: null, // 用于 Resize

    // [新增] 用于 Move 操作的初始状态记录
    dragInitialStates: null as Record<string, Partial<CanvasElement>> | null,

    // [新增] 用于旋转操作的初始状态记录
    rotationInitialStates: null,
    rotationCenter: null,
    startRotationAngle: null,

    // [修复] 添加缺失的属性
    initialSelectionBounds: null,
    currentRotationAngle: null,
  }

  // 添加 Ctrl 键状态跟踪
  private isCtrlPressed = false

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

      // 添加键盘事件监听
      this.setupKeyboardEvents()

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

            // 触发防抖检查
            this.triggerDebounceSnapshot()
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

  // 添加键盘事件处理
  private setupKeyboardEvents() {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Control' || e.key === 'Meta') {
        this.isCtrlPressed = true
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Control' || e.key === 'Meta') {
        this.isCtrlPressed = false
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    // 在组件销毁时移除事件监听器
    const originalDestroy = this.destroy.bind(this)
    this.destroy = () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      originalDestroy()
    }
  }

  // 添加防抖快照方法
  private triggerDebounceSnapshot() {
    // 清除之前的定时器
    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer)
    }

    // 设置新的定时器
    this.debounceTimer = window.setTimeout(() => {
      // 这里可以执行保存快照的逻辑
      // 例如，可以调用一个保存状态的方法
      //console.log('保存画布状态快照')

      // 重置定时器
      this.debounceTimer = null
    }, this.DEBOUNCE_DELAY)
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

      // 如果是组元素，需要特殊处理
      if ((el.type as any) === 'group') {
        minX = Math.min(minX, el.x)
        minY = Math.min(minY, el.y)
        maxX = Math.max(maxX, el.x + el.width)
        maxY = Math.max(maxY, el.y + el.height)
      } else {
        // 普通元素
        minX = Math.min(minX, el.x)
        minY = Math.min(minY, el.y)
        maxX = Math.max(maxX, el.x + el.width)
        maxY = Math.max(maxY, el.y + el.height)
      }
    })

    if (!hasValid) return null
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
  }

  /**
   * 计算点绕中心旋转后的新坐标
   * @param x 点的 x
   * @param y 点的 y
   * @param cx 中心点 x
   * @param cy 中心点 y
   * @param angle 旋转角度 (弧度)
   */
  private rotatePoint(x: number, y: number, cx: number, cy: number, angle: number) {
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)
    const nx = cos * (x - cx) - sin * (y - cy) + cx
    const ny = sin * (x - cx) + cos * (y - cy) + cy
    return { x: nx, y: ny }
  }

  // 添加辅助方法：获取组内所有子元素
  private getGroupChildrenElements(groupId: string, elements: Record<string, CanvasElement>): CanvasElement[] {
    const group = elements[groupId]
    if (!group || group.type !== 'group') return []

    const groupElement = group as GroupElement
    return groupElement.children.map((childId) => elements[childId]).filter(Boolean) as CanvasElement[]
  }

  // 添加辅助方法：递归获取所有后代元素的 ID（包括子元素的子元素）
  private getAllDescendantIds(groupId: string, elements: Record<string, CanvasElement>): string[] {
    const group = elements[groupId]
    if (!group || group.type !== 'group') return []

    const groupEl = group as GroupElement
    let descendants: string[] = [...groupEl.children]

    groupEl.children.forEach((childId) => {
      // 递归查找：如果子元素也是组，把它的后代也加进来
      descendants = descendants.concat(this.getAllDescendantIds(childId, elements))
    })

    return descendants
  }

  // 添加辅助方法：递归获取所有需要更新的子节点状态
  private getGroupResizeUpdates(
    groupId: string,
    scaleX: number,
    scaleY: number,
    // 组的新位置
    groupX: number,
    groupY: number,
    // 组的原始尺寸（用于计算相对位置）
    groupInitX: number,
    groupInitY: number,
    groupInitW: number,
    groupInitH: number,
    elementsSnapshot: Record<string, any>, // 传入 initialElementsMap
  ): Record<string, Partial<CanvasElement>> {
    const updates: Record<string, Partial<CanvasElement>> = {}
    const groupEl = elementsSnapshot[groupId] as GroupElement

    if (!groupEl || !groupEl.children) return updates

    groupEl.children.forEach((childId) => {
      const childInit = elementsSnapshot[childId]
      if (!childInit) return

      // 1. 计算相对比例
      const relX = (childInit.x - groupInitX) / groupInitW
      const relY = (childInit.y - groupInitY) / groupInitH
      const relW = childInit.width / groupInitW
      const relH = childInit.height / groupInitH

      // 2. 计算新属性
      const newX = groupX + relX * (groupInitW * scaleX)
      const newY = groupY + relY * (groupInitH * scaleY)
      const newW = childInit.width * scaleX
      const newH = childInit.height * scaleY

      // 字体和描边缩放 (取平均值)
      const avgScale = (Math.abs(scaleX) + Math.abs(scaleY)) / 2

      const childUpdate: any = {
        x: newX,
        y: newY,
        width: newW,
        height: newH,
      }

      // 缩放字体大小
      if (childInit.fontSize) {
        childUpdate.fontSize = childInit.fontSize * avgScale
      }

      // 缩放描边宽度
      if (childInit.strokeWidth) {
        childUpdate.strokeWidth = childInit.strokeWidth * avgScale
      }

      if (childInit.points) {
        childUpdate.points = childInit.points.map((p: number[]) => [p[0] * scaleX, p[1] * scaleY])
      }

      updates[childId] = childUpdate

      // 3. 递归：如果子元素也是组，基于子元素的新状态继续计算孙子元素
      if (childInit.type === 'group') {
        const nestedUpdates = this.getGroupResizeUpdates(
          childId,
          scaleX, // 传递累积缩放或保持当前缩放，视逻辑而定。这里简化为直接传递，因为我们是基于最外层组计算的
          scaleY,
          newX,
          newY,
          childInit.x,
          childInit.y,
          childInit.width,
          childInit.height,
          elementsSnapshot,
        )
        Object.assign(updates, nestedUpdates)
      }
    })

    return updates
  }

  // --- 交互逻辑 ---
  private onPointerDown = (e: PIXI.FederatedPointerEvent) => {
    // 触发防抖检查
    this.triggerDebounceSnapshot()

    if (e.button === 1) return
    const state = useStore.getState()
    const tool = state.tool
    const worldPos = e.getLocalPosition(this.viewport)
    if (e.target && e.target.label?.startsWith('handle:')) return

    this.state.startPos = { x: worldPos.x, y: worldPos.y }
    //this.selectionRectGraphic.clear()
    //this.eraserGraphic.clear()

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

    // Check if we're clicking on an element (Drag Start)
    if (e.target && e.target.label && !e.target.label.startsWith('handle:')) {
      const hitId = e.target.label
      // If we're not already in select mode, switch to it
      if (tool !== 'select') {
        state.setTool('select')
      }

      // 处理 Ctrl+点击多选
      if (this.isCtrlPressed) {
        // 如果元素已被选中，则取消选中
        if (state.selectedIds.includes(hitId)) {
          const newSelectedIds = state.selectedIds.filter((id) => id !== hitId)
          state.setSelected(newSelectedIds)
        } else {
          // 如果元素未被选中，则添加到选中列表
          state.setSelected([...state.selectedIds, hitId])
        }
      } else {
        // 普通点击，只选中当前元素
        if (!state.selectedIds.includes(hitId)) {
          state.setSelected([hitId])
        }
      }

      // Select the element and start dragging
      this.state.mode = 'dragging'
      this.state.currentId = hitId

      // [新增] 捕获所有选中元素在拖拽前的初始状态
      const initialDragMap: Record<string, Partial<CanvasElement>> = {}
      state.selectedIds.forEach((id) => {
        const el = state.elements[id]
        if (el) {
          // 记录 x, y (如果是直线/箭头，可能也需要记录 points)
          initialDragMap[id] = {
            x: el.x,
            y: el.y,
            points: el.points ? [...el.points.map((p) => [...p])] : undefined,
          }
        }
      })
      this.state.dragInitialStates = initialDragMap

      // 开始拖拽时锁定撤销/重做管理器
      undoRedoManager.lock()
      return
    }

    // Select Mode
    if (tool === 'select') {
      this.state.mode = 'selecting'
      // 只有在没有按住 Ctrl 键时才清空选中项
      if (!this.isCtrlPressed) {
        state.setSelected([])
      }
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

    // 开始绘制时锁定撤销/重做管理器
    undoRedoManager.lock()
  }

  private onHandleDown = (
    e: PIXI.FederatedPointerEvent,
    handle: HandleType | 'p0' | 'p1' | 'rotate',
    elementId: string,
  ) => {
    // 触发防抖检查
    this.triggerDebounceSnapshot()

    e.stopPropagation()

    // === [新增] 旋转逻辑分支 ===
    if (handle === 'rotate') {
      this.state.mode = 'rotating'
      this.state.currentId = elementId

      const state = useStore.getState()
      const { elements, selectedIds } = state
      const mousePos = e.getLocalPosition(this.viewport)

      // 1. 计算旋转中心（选中元素的包围盒中心）
      const bounds = this.getSelectionBounds(selectedIds, elements)
      if (!bounds) return

      const centerX = bounds.x + bounds.width / 2
      const centerY = bounds.y + bounds.height / 2
      this.state.rotationCenter = { x: centerX, y: centerY }

      // 2. 计算鼠标起始角度（相对于中心点）
      this.state.startRotationAngle = Math.atan2(mousePos.y - centerY, mousePos.x - centerX)

      // 3. 记录所有选中元素的初始状态
      const initialMap: Record<string, any> = {}
      selectedIds.forEach((id) => {
        const el = elements[id]
        if (el) {
          initialMap[id] = {
            x: el.x,
            y: el.y,
            width: el.width,
            height: el.height,
            rotation: el.rotation || 0, // 确保你的 CanvasElement 类型里有 rotation
            type: el.type, // 添加 type 属性以支持组元素判断
            // 记录元素自身的中心点，方便后续计算
            cx: el.x + el.width / 2,
            cy: el.y + el.height / 2,
          }

          // 如果是组元素，还需要记录子元素的信息
          if (el.type === 'group') {
            const groupElement = el as GroupElement
            groupElement.children.forEach((childId) => {
              const childEl = elements[childId]
              if (childEl) {
                initialMap[childId] = {
                  x: childEl.x,
                  y: childEl.y,
                  width: childEl.width,
                  height: childEl.height,
                  rotation: childEl.rotation || 0,
                  type: childEl.type,
                  cx: childEl.x + childEl.width / 2,
                  cy: childEl.y + childEl.height / 2,
                }
              }
            })
          }
        }
      })
      this.state.rotationInitialStates = initialMap

      undoRedoManager.lock()
      console.log('[StageManager] 开始旋转操作')
      return
    }

    // === Resizing 逻辑 ===
    this.state.mode = 'resizing'
    this.state.activeHandle = handle as HandleType | null
    this.state.currentId = elementId
    this.state.startPos = e.getLocalPosition(this.viewport)

    const state = useStore.getState()
    const { elements, selectedIds } = state

    // 1. 收集所有需要跟踪状态的元素 ID (包括选中项 + 它们的所有后代)
    const idsToTrack = new Set<string>(selectedIds)
    selectedIds.forEach((id) => {
      const descendants = this.getAllDescendantIds(id, elements)
      descendants.forEach((dId) => idsToTrack.add(dId))
    })

    // 2. 捕捉所有这些元素的初始状态
    const initialMap: Record<string, Partial<CanvasElement>> = {}

    idsToTrack.forEach((id) => {
      const el = elements[id]
      if (el) {
        initialMap[id] = {
          x: el.x,
          y: el.y,
          width: el.width,
          height: el.height,
          type: el.type,
          rotation: el.rotation || 0,
          fontSize: (el as any).fontSize, // 记录字体大小
          strokeWidth: (el as any).strokeWidth, // 记录描边宽度
          points: el.points ? el.points.map((p) => [...p]) : undefined,
        }
      }
    })

    this.state.resizeInitialStates = initialMap
    this.state.initialElementsMap = initialMap // 确保这两个状态一致

    // 3. 计算初始的群组包围盒 (只基于选中的元素，不包含子元素，因为子元素在组内部)
    // 注意：TransformerRenderer 画出的框通常只包含选中的顶层元素
    this.state.initialGroupBounds = this.getSelectionBounds(selectedIds, elements)

    undoRedoManager.lock()
  }

  private onPointerMove = (e: PIXI.FederatedPointerEvent) => {
    // 触发防抖检查
    this.triggerDebounceSnapshot()

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

          // 检查是否为组元素
          if (el && el.type === 'group') {
            // 对于组元素，使用与多选元素相同的逻辑
            state.updateElement(id, { x: el.x + dx, y: el.y + dy })

            // 同时移动组内所有子元素
            const groupElement = el as GroupElement
            groupElement.children.forEach((childId) => {
              const childEl = state.elements[childId]
              if (childEl) {
                state.updateElement(childId, { x: childEl.x + dx, y: childEl.y + dy })
              }
            })
          } else {
            // 普通元素移动
            state.updateElement(id, { x: el.x + dx, y: el.y + dy })
          }
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
        singleEl &&
        (singleEl.type === 'line' || singleEl.type === 'arrow') &&
        (handle === 'p0' || handle === 'p1')
      ) {
        const initX = singleEl.x ?? 0
        const initY = singleEl.y ?? 0
        const points = singleEl.points || [
          [0, 0],
          [0, 0],
        ]
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

      // === 通用缩放逻辑 (扁平化计算) ===

      // 1. 计算当前鼠标造成的位移
      const totalDx = currentPos.x - this.state.startPos.x
      const totalDy = currentPos.y - this.state.startPos.y

      // 2. 计算新的包围盒边界
      let finalL = initBounds.x
      let finalR = initBounds.x + initBounds.width
      let finalT = initBounds.y
      let finalB = initBounds.y + initBounds.height

      if (handle?.includes('l')) finalL += totalDx
      if (handle?.includes('r')) finalR += totalDx
      if (handle?.includes('t')) finalT += totalDy
      if (handle?.includes('b')) finalB += totalDy

      // 处理翻转 (Flip)
      // 关键：不要交换 L/R 来计算 Scale，这会导致翻转时子元素不镜像
      // 我们允许 width/height 为负数用于计算 Scale，但在写入 Element 时转为正数并调整 x/y

      // 为了简化模型，这里使用简单的翻转修正：
      let newBoundsX = finalL
      let newBoundsY = finalT
      let newBoundsW = finalR - finalL
      let newBoundsH = finalB - finalT

      // 3. 计算缩放比例 (允许为负，如果做了翻转处理)
      // 如果 newBoundsW 为负，说明翻转了。
      // 注意：Pixi 或 Canvas 通常需要正的 width/height。
      // 简单的做法是：如果翻转了，我们要相应调整计算逻辑。
      // 这里采用更稳妥的策略：交换边界值，但 Scale 取绝对值，
      // 复杂的镜像翻转通常需要 scaleX = -1，这里先只做非镜像的调整大小。

      if (newBoundsW < 0) {
        ;[newBoundsX, newBoundsW] = [newBoundsX + newBoundsW, -newBoundsW]
      }
      if (newBoundsH < 0) {
        ;[newBoundsY, newBoundsH] = [newBoundsY + newBoundsH, -newBoundsH]
      }

      const scaleX = initBounds.width === 0 ? 1 : newBoundsW / initBounds.width
      const scaleY = initBounds.height === 0 ? 1 : newBoundsH / initBounds.height
      const avgScale = (Math.abs(scaleX) + Math.abs(scaleY)) / 2

      // 4. 遍历快照中的 **每一个** 元素 (无论是组还是组内的子元素)
      // 因为我们在 onHandleDown 里已经把所有层级的子元素都加进来了
      Object.keys(this.state.initialElementsMap).forEach((id) => {
        const initEl = this.state.initialElementsMap![id]
        if (!initEl) return

        // A. 计算新位置
        // 公式：新位置 = 新原点 + (旧位置 - 旧原点) * 缩放比例
        const relX = initEl.x! - initBounds.x
        const relY = initEl.y! - initBounds.y

        const newX = newBoundsX + relX * scaleX
        const newY = newBoundsY + relY * scaleY

        // B. 计算新尺寸
        const newW = initEl.width! * Math.abs(scaleX)
        const newH = initEl.height! * Math.abs(scaleY)

        const updatePayload: any = {
          x: newX,
          y: newY,
          width: newW,
          height: newH,
        }

        // C. 处理点集 (Line, Arrow, Pencil)
        if (initEl.points) {
          updatePayload.points = initEl.points.map((p) => [
            p[0] * scaleX, // 使用带符号的 scale，如果支持翻转
            p[1] * scaleY,
          ])
        }

        // D. 处理文字大小和描边粗细
        if (initEl.fontSize) {
          updatePayload.fontSize = initEl.fontSize * avgScale
        }
        if (initEl.strokeWidth) {
          updatePayload.strokeWidth = initEl.strokeWidth * avgScale
        }

        state.updateElement(id, updatePayload)
      })
    } else if (
      this.state.mode === 'rotating' &&
      this.state.rotationInitialStates &&
      this.state.rotationCenter &&
      this.state.startRotationAngle !== null
    ) {
      // === [新增] 旋转逻辑 ===
      const { x: cx, y: cy } = this.state.rotationCenter

      // 1. 计算当前鼠标角度
      const currentAngle = Math.atan2(currentPos.y - cy, currentPos.x - cx)

      // 2. 计算旋转增量（当前角度 - 起始角度）
      const deltaAngle = currentAngle - this.state.startRotationAngle

      // 3. 更新每一个选中元素
      state.selectedIds.forEach((id) => {
        const initEl = this.state.rotationInitialStates![id]
        if (!initEl) return

        // 检查是否为组元素
        if (initEl.type === 'group') {
          // 对于组元素，使用与多选元素相同的逻辑
          // 计算新的自转角度
          const newRotation = initEl.rotation + deltaAngle

          // 计算新的位置 (公转)
          const newCenter = this.rotatePoint(initEl.cx, initEl.cy, cx, cy, deltaAngle)
          const newX = newCenter.x - initEl.width / 2
          const newY = newCenter.y - initEl.height / 2

          state.updateElement(id, {
            x: newX,
            y: newY,
            rotation: newRotation,
          })

          // 组内子元素也使用相同逻辑处理
          const actualGroupElement = state.elements[id] as GroupElement
          if (actualGroupElement && actualGroupElement.children) {
            actualGroupElement.children.forEach((childId) => {
              const childInitEl = this.state.rotationInitialStates![childId]
              if (!childInitEl) return

              // 计算子元素新的位置
              const childNewCenter = this.rotatePoint(childInitEl.cx, childInitEl.cy, cx, cy, deltaAngle)
              const childNewX = childNewCenter.x - childInitEl.width / 2
              const childNewY = childNewCenter.y - childInitEl.height / 2

              state.updateElement(childId, {
                x: childNewX,
                y: childNewY,
                rotation: childInitEl.rotation + deltaAngle,
              })
            })
          }
        } else {
          // 普通元素的处理逻辑
          // A. 计算新的自转角度
          const newRotation = initEl.rotation + deltaAngle

          // B. 计算新的位置 (公转)
          // 将元素的中心点 (initEl.cx, initEl.cy) 绕着 组中心 (cx, cy) 旋转 deltaAngle
          const newCenter = this.rotatePoint(initEl.cx, initEl.cy, cx, cy, deltaAngle)

          // C. 根据新的中心点反推 x, y (x = center.x - width/2)
          const newX = newCenter.x - initEl.width / 2
          const newY = newCenter.y - initEl.height / 2

          // D. 更新 Store
          state.updateElement(id, {
            x: newX,
            y: newY,
            rotation: newRotation,
          })
        }
      })
      return
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
    // 触发防抖检查
    this.triggerDebounceSnapshot()

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
      // 添加安全检查，确保元素存在再访问其属性
      if (el) {
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
        } else if (
          el.width === 0 &&
          el.height === 0 &&
          (el.type === 'rect' || el.type === 'circle' || el.type === 'triangle' || el.type === 'diamond')
        ) {
          // 删除零大小的元素
          state.removeElements([this.state.currentId])
          this.state.currentId = null
          this.state.mode = 'idle'
          // 解锁撤销/重做管理器
          undoRedoManager.unlock()
          return
        }
      }

      // [新增] 修复 Undo/Redo Bug
      // 在解锁前或解锁后均可，关键是获取当前的最新 State（包含了最终宽高的 State）
      // 并更新掉 onPointerDown 时记录的那个"0宽高"的快照
      undoRedoManager.updateLatestSnapshot(useStore.getState())

      // 解锁撤销/重做管理器
      undoRedoManager.unlock()
      console.log('[StageManager] 解锁撤销/重做管理器')
    }

    // [新增] 处理 Dragging (移动) 结束的命令记录
    if (this.state.mode === 'dragging' && this.state.dragInitialStates) {
      console.log('[StageManager] 结束移动操作')

      // 操作结束时解锁撤销/重做管理器
      undoRedoManager.unlock()
      console.log('[StageManager] 解锁撤销/重做管理器')

      const operations: any[] = []
      let hasChanges = false

      Object.entries(this.state.dragInitialStates).forEach(([id, initialAttrs]) => {
        const finalElement = state.elements[id]
        if (!finalElement) return

        // 检查是否真的发生了移动，避免微小抖动或原地点击产生历史记录
        const isMoved = finalElement.x !== initialAttrs.x || finalElement.y !== initialAttrs.y

        if (isMoved) {
          hasChanges = true
          operations.push({
            id,
            initialAttrs, // 只有 x, y, points
            finalAttrs: {
              x: finalElement.x,
              y: finalElement.y,
              points: finalElement.points ? [...finalElement.points] : undefined,
            },
          })

          // 如果是组元素，还需要添加组内元素的记录
          if (finalElement.type === 'group') {
            const groupElement = finalElement as GroupElement
            groupElement.children.forEach((childId) => {
              const childElement = state.elements[childId]
              const childInitialAttrs = this.state.dragInitialStates![childId]
              if (childElement && childInitialAttrs) {
                const childIsMoved = childElement.x !== childInitialAttrs.x || childElement.y !== childInitialAttrs.y
                if (childIsMoved) {
                  operations.push({
                    id: childId,
                    initialAttrs: {
                      x: childInitialAttrs.x,
                      y: childInitialAttrs.y,
                    },
                    finalAttrs: {
                      x: childElement.x,
                      y: childElement.y,
                    },
                  })
                }
              }
            })
          }
        }
      })

      if (hasChanges && operations.length > 0) {
        const moveCommand = new UpdateElementCommand(operations, '移动元素')
        undoRedoManager.executeCommand(moveCommand)
        console.log('[StageManager] 创建并执行 Move Command')
      }
    }

    // [修改] 处理 Resizing (调整大小) 结束的命令记录
    // 使用通用的 UpdateElementCommand
    if (this.state.mode === 'resizing' && this.state.resizeInitialStates) {
      console.log('[StageManager] 结束调整大小操作')

      // 操作结束时解锁撤销/重做管理器
      undoRedoManager.unlock()
      console.log('[StageManager] 解锁撤销/重做管理器')

      const operations: any[] = []

      // 遍历所有被记录的初始状态 (包含了深层子元素)
      Object.entries(this.state.resizeInitialStates).forEach(([id, initialAttrs]) => {
        const finalElement = state.elements[id]
        if (!finalElement) return

        // 构造最终状态 (包含所有可能变化的属性)
        const finalAttrs = {
          x: finalElement.x,
          y: finalElement.y,
          width: finalElement.width,
          height: finalElement.height,
          points: finalElement.points ? [...finalElement.points] : undefined,
          fontSize: (finalElement as any).fontSize,
          strokeWidth: (finalElement as any).strokeWidth,
          rotation: finalElement.rotation,
        }

        // 简单对比是否变化
        const hasChanged = JSON.stringify(initialAttrs) !== JSON.stringify(finalAttrs)

        if (hasChanged) {
          operations.push({ id, initialAttrs, finalAttrs })
        }
      })

      if (operations.length > 0) {
        // 这里不需要递归了，因为 operations 列表里已经包含了所有层级的元素
        const resizeCommand = new UpdateElementCommand(operations, '调整元素大小')
        undoRedoManager.executeCommand(resizeCommand)
      }
    }

    // === [新增] 旋转结束逻辑 ===
    if (this.state.mode === 'rotating' && this.state.rotationInitialStates) {
      console.log('[StageManager] 结束旋转操作')
      undoRedoManager.unlock()

      const operations: any[] = []

      Object.entries(this.state.rotationInitialStates).forEach(([id, initialAttrs]) => {
        const finalElement = state.elements[id]
        if (!finalElement) return

        // 获取最终状态
        const finalAttrs = {
          x: finalElement.x,
          y: finalElement.y,
          width: finalElement.width,
          height: finalElement.height,
          rotation: finalElement.rotation || 0,
        }

        // 检查是否有变化 (对比 x, y, rotation)
        // 注意：即使只是自转，x/y 也可能因为精度问题微变，或者如果是多选旋转，x/y 必然变
        const hasChanged =
          Math.abs(initialAttrs.x - finalAttrs.x) > 0.01 ||
          Math.abs(initialAttrs.y - finalAttrs.y) > 0.01 ||
          Math.abs(initialAttrs.width - finalAttrs.width) > 0.01 ||
          Math.abs(initialAttrs.height - finalAttrs.height) > 0.01 ||
          Math.abs(initialAttrs.rotation - finalAttrs.rotation) > 0.001

        if (hasChanged) {
          operations.push({
            id,
            initialAttrs: {
              x: initialAttrs.x,
              y: initialAttrs.y,
              width: initialAttrs.width,
              height: initialAttrs.height,
              rotation: initialAttrs.rotation,
            },
            finalAttrs,
          })

          // 如果是组元素，还需要添加组内元素的记录
          if (finalElement.type === 'group') {
            const groupElement = finalElement as GroupElement
            groupElement.children.forEach((childId) => {
              const childElement = state.elements[childId]
              const childInitialAttrs = this.state.rotationInitialStates![childId]
              if (childElement && childInitialAttrs) {
                const childFinalAttrs = {
                  x: childElement.x,
                  y: childElement.y,
                  width: childElement.width,
                  height: childElement.height,
                  rotation: childElement.rotation || 0,
                }

                const childHasChanged =
                  Math.abs(childInitialAttrs.x - childFinalAttrs.x) > 0.01 ||
                  Math.abs(childInitialAttrs.y - childFinalAttrs.y) > 0.01 ||
                  Math.abs(childInitialAttrs.width - childFinalAttrs.width) > 0.01 ||
                  Math.abs(childInitialAttrs.height - childFinalAttrs.height) > 0.01 ||
                  Math.abs(childInitialAttrs.rotation - childFinalAttrs.rotation) > 0.001

                if (childHasChanged) {
                  operations.push({
                    id: childId,
                    initialAttrs: {
                      x: childInitialAttrs.x,
                      y: childInitialAttrs.y,
                      width: childInitialAttrs.width,
                      height: childInitialAttrs.height,
                      rotation: childInitialAttrs.rotation,
                    },
                    finalAttrs: childFinalAttrs,
                  })
                }
              }
            })
          }
        }
      })

      if (operations.length > 0) {
        const rotateCommand = new UpdateElementCommand(operations, '旋转元素')
        undoRedoManager.executeCommand(rotateCommand)
      }
    }

    this.state.mode = 'idle'
    this.state.currentId = null
    this.state.activeHandle = null
    this.state.initialElementState = null
    // --- 清理状态 ---
    this.state.initialElementsMap = null
    this.state.initialGroupBounds = null
    this.state.resizeInitialStates = null
    this.state.dragInitialStates = null // 清理
    // [新增] 清理旋转状态
    this.state.rotationInitialStates = null
    this.state.rotationCenter = null
    this.state.startRotationAngle = null

    // 移除了原来在此处的解锁操作
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
    // 触发防抖检查
    this.triggerDebounceSnapshot()

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
