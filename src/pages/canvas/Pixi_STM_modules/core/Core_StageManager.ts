import * as PIXI from 'pixi.js'
import { Viewport } from 'pixi-viewport'
import { ElementRenderer } from './ElementRender'
import { TransformerRenderer } from './TF_controler_Renderer'
import { InteractionHandler } from '../interaction/Base_InteractionHandler'
import { StageInteractionHandler } from '../interaction/Stage_InteractionHandler'
import { useStore, type ToolType, type CanvasElement } from '@/stores/canvasStore'
import type { HandleType, StageManagerState } from '../shared/types'
import { rotatePoint, getSelectionBounds, getAllDescendantIds } from '../utils/geometryUtils'
import { updateViewportState, updateCursor } from '../utils/renderUtils'
import { debounce, stateEqualityFn } from '../utils/stateUtils'
import { removeKeyboardEventListeners } from '../utils/destroyUtils'

export class StageManagerCore {
  public app: PIXI.Application
  public viewport!: Viewport

  private elementLayer: PIXI.Container = new PIXI.Container()
  private uiLayer: PIXI.Container = new PIXI.Container()

  private elementRenderer = new ElementRenderer()
  private transformerRenderer = new TransformerRenderer()

  private interactionHandler!: InteractionHandler
  private stageInteractionHandler!: StageInteractionHandler

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

      // 初始化交互处理器
      this.stageInteractionHandler = new StageInteractionHandler(
        this.state,
        this.app,
        this.viewport,
        this.isCtrlPressed,
        this.selectionRectGraphic,
        this.eraserGraphic,
        () => this.elementRenderer.getSpriteMap(),
        {
          setMode: (mode) => {
            this.state.mode = mode
          },
          setStartPos: (pos) => {
            this.state.startPos = pos
          },
          setCurrentId: (id) => {
            this.state.currentId = id
          },
          setInitialElementsMap: (map) => {
            this.state.initialElementsMap = map
          },
          setInitialGroupBounds: (bounds) => {
            this.state.initialGroupBounds = bounds
          },
          setResizeInitialStates: (states) => {
            this.state.resizeInitialStates = states
          },
          setDragInitialStates: (states) => {
            this.state.dragInitialStates = states
          },
          setRotationInitialStates: (states) => {
            this.state.rotationInitialStates = states
          },
          setRotationCenter: (center) => {
            this.state.rotationCenter = center
          },
          setStartRotationAngle: (angle) => {
            this.state.startRotationAngle = angle
          },
          setActiveHandle: (handle) => {
            this.state.activeHandle = handle
          },
          triggerDebounceSnapshot: () => this.triggerDebounceSnapshot(),
        },
      )

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
        { equalityFn: stateEqualityFn },
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
      removeKeyboardEventListeners(handleKeyDown, handleKeyUp)
      originalDestroy()
    }
  }

  // 添加防抖快照方法
  private triggerDebounceSnapshot() {
    this.debounceTimer = debounce(
      () => {
        // 这里可以执行保存快照的逻辑
        // 例如，可以调用一个保存状态的方法
        //console.log('保存画布状态快照')

        // 重置定时器
        this.debounceTimer = null
      },
      this.DEBOUNCE_DELAY,
      this.debounceTimer,
    ) as number | null
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
    return getSelectionBounds(selectedIds, elements)
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
    return rotatePoint(x, y, cx, cy, angle)
  }

  // 添加辅助方法：递归获取所有后代元素的 ID（包括子元素的子元素）
  private getAllDescendantIds(groupId: string, elements: Record<string, CanvasElement>): string[] {
    return getAllDescendantIds(groupId, elements)
  }

  // --- 交互逻辑 ---
  private onPointerDown = (e: PIXI.FederatedPointerEvent) => {
    this.stageInteractionHandler.onPointerDown(e)
  }

  private onHandleDown = (
    e: PIXI.FederatedPointerEvent,
    handle: HandleType | 'p0' | 'p1' | 'rotate',
    elementId: string,
  ) => {
    this.stageInteractionHandler.onHandleDown(e, handle, elementId)
  }

  private onPointerMove = (e: PIXI.FederatedPointerEvent) => {
    this.stageInteractionHandler.onPointerMove(e)
  }

  private onPointerUp = () => {
    this.stageInteractionHandler.onPointerUp()
  }

  public updateViewportState(tool: ToolType) {
    updateViewportState(this.viewport, tool, this.state.isSpacePressed)
  }

  public setSpacePressed(pressed: boolean) {
    // 触发防抖检查
    this.triggerDebounceSnapshot()

    this.state.isSpacePressed = pressed
    const tool = useStore.getState().tool
    this.updateViewportState(tool)
    this.updateCursor(tool)
  }

  private updateCursor(tool: ToolType) {
    updateCursor(this.app.canvas, tool, this.state.isSpacePressed)
  }

  public destroy() {
    this.state.destroyed = true
    this.interactionHandler.removeInteraction()
    this.elementRenderer.clear()
    this.app.destroy(true, { children: true, texture: true })
  }
}
