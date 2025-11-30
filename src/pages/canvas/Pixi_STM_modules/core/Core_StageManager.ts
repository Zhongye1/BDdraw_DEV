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
import { stateEqualityFn } from '../utils/stateUtils'
import { removeKeyboardEventListeners } from '../utils/destroyUtils'

export class StageManagerCore {
  public app: PIXI.Application
  public viewport!: Viewport

  private elementLayer: PIXI.Container = new PIXI.Container()
  public uiLayer: PIXI.Container = new PIXI.Container()
  private guidelineLayer!: PIXI.Graphics // 辅助线图层

  // 显式定义事件处理函数引用
  private _boundDrawGuidelines: (e: Event) => void
  private _boundClearGuidelines: () => void

  public elementRenderer = new ElementRenderer()
  private transformerRenderer = new TransformerRenderer()

  private interactionHandler!: InteractionHandler
  private stageInteractionHandler!: StageInteractionHandler

  private selectionRectGraphic = new PIXI.Graphics()
  private eraserGraphic = new PIXI.Graphics()

  // 防抖相关变量
  private debounceTimer: number | null = null
  //private readonly DEBOUNCE_DELAY = 100 // 0.1秒

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
    // 在构造函数中绑定上下文
    this._boundDrawGuidelines = (event: Event) => {
      const customEvent = event as CustomEvent
      this.drawGuidelines(customEvent.detail)
      document.body.classList.add('has-guidelines')
    }

    this._boundClearGuidelines = () => {
      this.clearGuidelines()
      document.body.classList.remove('has-guidelines')
    }

    this.app = new PIXI.Application()
    this.initApp(container).then(() => {
      this.setupViewport(container)
      this.viewport.addChild(this.elementLayer)
      this.viewport.addChild(this.uiLayer)

      // 初始化辅助线图层
      this.guidelineLayer = new PIXI.Graphics()

      // 调整图层顺序，确保辅助线图层在最上层
      this.uiLayer.addChild(this.selectionRectGraphic)
      this.uiLayer.addChild(this.eraserGraphic)
      this.uiLayer.addChild(this.transformerRenderer.getGraphic())
      this.uiLayer.addChild(this.guidelineLayer) // 最后添加辅助线图层，确保在最上层

      // 设置辅助线图层的一些属性以确保可见性
      this.uiLayer.sortableChildren = true // 启用自动排序
      this.guidelineLayer.zIndex = 2000

      // 监听辅助线绘制事件
      this.setupGuidelineEvents()

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
        () => this.isCtrlPressed, // 返回当前 isCtrlPressed 值
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
          //triggerDebounceSnapshot: () => this.triggerDebounceSnapshot(),
        },
        this.transformerRenderer, // 添加 transformerRenderer 引用
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
            //this.triggerDebounceSnapshot()
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

  // 设置辅助线事件监听
  private setupGuidelineEvents() {
    // 使用保存的引用添加监听
    window.addEventListener('drawGuidelines', this._boundDrawGuidelines)
    window.addEventListener('clearGuidelines', this._boundClearGuidelines)
  }

  // 绘制辅助线
  private drawGuidelines(guidelines: Array<{ type: string; position: number }>) {
    // 确保辅助线图层存在且未被销毁
    if (!this.guidelineLayer || this.state.destroyed) {
      //console.warn('Guideline layer is not available')
      return
    }

    // 清除之前的辅助线
    this.guidelineLayer.clear()

    // 如果没有辅助线要绘制，直接返回
    if (!guidelines || guidelines.length === 0) {
      return
    }

    // 获取视口边界
    const visibleBounds = this.viewport.getVisibleBounds()
    const startX = visibleBounds.x - 1000
    const endX = visibleBounds.x + visibleBounds.width + 1000
    const startY = visibleBounds.y - 1000
    const endY = visibleBounds.y + visibleBounds.height + 1000

    // 添加调试日志
    //console.log('绘制辅助线:', guidelines)

    // 绘制每条辅助线 - 先构建路径
    guidelines.forEach((guideline) => {
      if (guideline.type === 'horizontal') {
        // 绘制水平辅助线
        this.guidelineLayer.moveTo(startX, guideline.position)
        this.guidelineLayer.lineTo(endX, guideline.position)
        //console.log(`绘制水平辅助线: y=${guideline.position}`)
      } else if (guideline.type === 'vertical') {
        // 绘制垂直辅助线
        this.guidelineLayer.moveTo(guideline.position, startY)
        this.guidelineLayer.lineTo(guideline.position, endY)
        //console.log(`绘制垂直辅助线: x=${guideline.position}`)
      }
    })

    // 最后应用样式并绘制
    this.guidelineLayer.stroke({
      width: 1,
      color: 0x78deff,
      alpha: 0.8,
    })

    //console.log('辅助线绘制完成')
  }

  // 清除辅助线
  private clearGuidelines() {
    // 确保辅助线图层存在且未被销毁
    if (!this.guidelineLayer || this.state.destroyed) {
      //console.warn('Guideline layer is not available')
      return
    }

    this.guidelineLayer.clear()
    // this.guidelineLayer.dirty = true
    //console.log('辅助线已清除')
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
  //private triggerDebounceSnapshot() {
  // 移除防抖逻辑，直接执行快照操作
  // this.debounceTimer = debounce(
  //   () => {
  // 这里可以执行保存快照的逻辑
  // 例如，可以调用一个保存状态的方法
  //console.log('保存画布状态快照')
  // 重置定时器
  //    this.debounceTimer = null
  //  },
  //  this.DEBOUNCE_DELAY,
  //  this.debounceTimer,
  // ) as number | null
  //}

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
    // 移除防抖检查
    // this.triggerDebounceSnapshot()

    this.state.isSpacePressed = pressed
    const tool = useStore.getState().tool
    this.updateViewportState(tool)
    this.updateCursor(tool)
  }

  private updateCursor(tool: ToolType) {
    updateCursor(this.app.canvas, tool, this.state.isSpacePressed)
  }

  /**
   * 销毁整个 StageManager 实例，清理所有资源
   */
  public destroy() {
    console.log('[StageManager] 开始销毁...')
    this.state.destroyed = true

    // 移除辅助线事件监听
    window.removeEventListener('drawGuidelines', this._boundDrawGuidelines)
    window.removeEventListener('clearGuidelines', this._boundClearGuidelines)

    // 确保 interactionHandler 已初始化后再调用 removeInteraction
    if (this.interactionHandler) {
      this.interactionHandler.removeInteraction()
    }
    this.elementRenderer.clear()

    // 销毁辅助线图层
    if (this.guidelineLayer) {
      // 检查是否已被 Pixi 自动销毁
      if (!this.guidelineLayer.destroyed) {
        this.guidelineLayer.destroy()
      }
      this.guidelineLayer = null as any
    }

    // 销毁应用，确保 app 存在且未被销毁
    if (this.app) {
      // 确保 viewport 存在再尝试销毁
      if (this.viewport) {
        // 移除可能的事件监听器
        try {
          this.viewport.removeAllListeners()
        } catch (e) {
          // 忽略移除监听器时的错误
        }
      }

      // 在销毁前检查 renderer 是否存在
      if (this.app.renderer) {
        this.app.destroy(true, { children: true, texture: true })
      } else {
        // 如果 renderer 不存在，尝试移除 canvas 元素
        try {
          // 检查 app.canvas 是否存在再访问其 parentNode
          if (this.app.canvas && this.app.canvas.parentNode) {
            this.app.canvas.parentNode.removeChild(this.app.canvas)
          }
        } catch (e) {
          // 忽略 DOM 操作错误
          console.warn('[StageManager] 清理 canvas 元素时出错:', e)
        }
      }
    }

    console.log('[StageManager] 销毁完成')
  }
}
