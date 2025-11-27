import * as PIXI from 'pixi.js'
import { HTMLText } from 'pixi.js'
import { useStore, type CanvasElement } from '@/stores/canvasStore'
import type { HandleType, StageManagerState } from '../shared/types'
import { undoRedoManager } from '@/lib/UndoRedoManager'
import { getSelectionBounds, getAllDescendantIds } from '../utils/geometryUtils'
import { executeResizeCommand, executeRotateCommand } from '../utils/commandUtils'
import { handlePointerDown, handleHandleDown } from '../utils/interactionUtils'
import { calculateRotation, calculateGroupChildrenRotation } from '../utils/rotationUtils'
import { calculateScaling } from '../utils/scaleUtils'
import { handleSelectingMove, handleSelectingUp } from '../utils/selectionUtils'
import { handleErasingMove, clearEraser } from '../utils/eraserUtils'
import { handleDraggingMove } from '../utils/dragUtils'
import { handleDrawingMove, handleDrawingUp } from '../utils/drawingUtils'
import type { Viewport } from 'pixi-viewport'
import type { TransformerRenderer } from '../core/TF_controler_Renderer'

export class StageInteractionHandler {
  private state: StageManagerState
  private app: PIXI.Application
  private viewport: Viewport
  private isCtrlPressed: () => boolean // 修改为函数形式
  private selectionRectGraphic: PIXI.Graphics
  private eraserGraphic: PIXI.Graphics
  private elementRendererSpriteMap: () => Map<string, PIXI.Graphics | HTMLText | PIXI.Sprite>
  private transformerRenderer: TransformerRenderer // 添加 transformerRenderer 引用
  // 可视化辅助图形（用于调试和展示变换中心/锚点），生产环境可根据需求隐藏
  private resizeVisualizationGraphic: PIXI.Graphics

  // 回调函数
  private updateState: {
    setMode: (mode: StageManagerState['mode']) => void
    setStartPos: (pos: { x: number; y: number }) => void
    setCurrentId: (id: string | null) => void
    setInitialElementsMap: (map: Record<string, any> | null) => void
    setInitialGroupBounds: (bounds: { x: number; y: number; width: number; height: number } | null) => void
    setResizeInitialStates: (states: Record<string, Partial<CanvasElement>> | null) => void
    setDragInitialStates: (states: Record<string, Partial<CanvasElement>> | null) => void
    setRotationInitialStates: (states: Record<string, any> | null) => void
    setRotationCenter: (center: { x: number; y: number } | null) => void
    setStartRotationAngle: (angle: number | null) => void
    setActiveHandle: (handle: HandleType | null) => void
    //triggerDebounceSnapshot: () => void
  }

  constructor(
    state: StageManagerState,
    app: PIXI.Application,
    viewport: Viewport,
    isCtrlPressed: () => boolean, // 修改为函数形式
    selectionRectGraphic: PIXI.Graphics,
    eraserGraphic: PIXI.Graphics,
    elementRendererSpriteMap: () => Map<string, PIXI.Graphics | HTMLText | PIXI.Sprite>,
    updateState: {
      setMode: (mode: StageManagerState['mode']) => void
      setStartPos: (pos: { x: number; y: number }) => void
      setCurrentId: (id: string | null) => void
      setInitialElementsMap: (map: Record<string, any> | null) => void
      setInitialGroupBounds: (bounds: { x: number; y: number; width: number; height: number } | null) => void
      setResizeInitialStates: (states: Record<string, Partial<CanvasElement>> | null) => void
      setDragInitialStates: (states: Record<string, Partial<CanvasElement>> | null) => void
      setRotationInitialStates: (states: Record<string, any> | null) => void
      setRotationCenter: (center: { x: number; y: number } | null) => void
      setStartRotationAngle: (angle: number | null) => void
      setActiveHandle: (handle: HandleType | null) => void
      //triggerDebounceSnapshot: () => void
    },
    transformerRenderer: TransformerRenderer, // 添加 transformerRenderer 参数
  ) {
    this.state = state
    this.app = app
    this.viewport = viewport
    this.isCtrlPressed = isCtrlPressed // 保存函数引用
    this.selectionRectGraphic = selectionRectGraphic
    this.eraserGraphic = eraserGraphic
    this.elementRendererSpriteMap = elementRendererSpriteMap
    this.transformerRenderer = transformerRenderer // 保存 transformerRenderer 引用
    this.updateState = updateState

    // 创建用于可视化resize时中心点和锚点的图形对象
    this.resizeVisualizationGraphic = new PIXI.Graphics()
    this.viewport.addChild(this.resizeVisualizationGraphic)
  }

  public onPointerDown = (e: PIXI.FederatedPointerEvent) => {
    // 触发防抖检查
    //this.updateState.triggerDebounceSnapshot()

    const state = useStore.getState()
    const tool = state.tool

    handlePointerDown(
      e,
      state,
      this.isCtrlPressed(), // 调用函数获取当前值
      this.updateState.setMode,
      this.updateState.setStartPos,
      this.updateState.setCurrentId,
      this.updateState.setDragInitialStates,
      (e) => e.getLocalPosition(this.viewport),
      tool,
      this.state.isSpacePressed,
    )
  }

  public onHandleDown = (
    e: PIXI.FederatedPointerEvent,
    handle: HandleType | 'p0' | 'p1' | 'rotate',
    elementId: string,
  ) => {
    // 触发防抖检查
    //this.updateState.triggerDebounceSnapshot()

    const state = useStore.getState()

    handleHandleDown(
      e,
      handle,
      elementId,
      state,
      this.updateState.setMode,
      this.updateState.setActiveHandle,
      this.updateState.setCurrentId,
      this.updateState.setStartPos,
      this.updateState.setResizeInitialStates,
      this.updateState.setInitialElementsMap,
      this.updateState.setInitialGroupBounds,
      this.updateState.setRotationInitialStates,
      this.updateState.setRotationCenter,
      this.updateState.setStartRotationAngle,
      (selectedIds, elements) => getSelectionBounds(selectedIds, elements),
      (groupId, elements) => getAllDescendantIds(groupId, elements),
    )
  }

  public onPointerMove = (e: PIXI.FederatedPointerEvent) => {
    // 触发防抖检查
    //this.updateState.triggerDebounceSnapshot()

    if (this.state.mode === 'idle') return
    const state = useStore.getState()
    const currentPos = e.getLocalPosition(this.viewport)

    if (this.state.mode === 'selecting') {
      handleSelectingMove(this.state.startPos, currentPos, this.selectionRectGraphic)
    } else if (this.state.mode === 'erasing') {
      handleErasingMove(e, this.eraserGraphic)
    } else if (this.state.mode === 'dragging') {
      // 使用新的 handleDraggingMove 函数，只计算坐标和增量，不更新 Store
      const dragResult = handleDraggingMove(
        state,
        state.selectedIds,
        this.state.startPos,
        currentPos,
        this.state.dragInitialStates,
        this.updateState.setDragInitialStates,
        this.updateState,
      )

      // 直接操作 Pixi 对象进行视觉反馈，不更新 Store
      const initialStates = this.state.dragInitialStates || (this.updateState as any)._tempDragInitialStates
      if (initialStates) {
        // 计算总位移 (Current - DragStart)
        let totalDx = currentPos.x - this.state.startPos.x
        let totalDy = currentPos.y - this.state.startPos.y

        // 获取精灵映射表
        const spriteMap = this.elementRendererSpriteMap()

        // 如果有吸附结果，使用修正后的位移
        if (dragResult.dragDelta.dx !== totalDx || dragResult.dragDelta.dy !== totalDy) {
          totalDx = dragResult.dragDelta.dx
          totalDy = dragResult.dragDelta.dy
        }

        // 核心优化：直接遍历选中的 Sprite 修改位置
        state.selectedIds.forEach((id) => {
          const sprite = spriteMap.get(id)
          const initData = initialStates[id]

          if (sprite && initData) {
            // 检查元素是否有旋转
            const element = state.elements[id]
            if (element && element.rotation !== undefined && element.rotation !== 0) {
              // 对于有旋转的元素，需要特殊处理位置
              // 旋转元素的pivot设置在中心，position也是基于中心的
              sprite.position.set(
                (initData.x || 0) + totalDx + (element.width || 0) / 2,
                (initData.y || 0) + totalDy + (element.height || 0) / 2,
              )
            } else {
              // 直接修改 Pixi 对象的 transform
              sprite.position.set((initData.x || 0) + totalDx, (initData.y || 0) + totalDy)
            }
          }
        })

        // 更新选择框位置
        const transformerGraphic = this.transformerRenderer.getGraphic()
        if (transformerGraphic) {
          transformerGraphic.position.set(totalDx, totalDy)
        }
      }

      // 更新辅助线显示
      if (dragResult.snapLines.length > 0) {
        if (typeof window !== 'undefined' && window.dispatchEvent) {
          window.dispatchEvent(new CustomEvent('drawGuidelines', { detail: dragResult.snapLines }))
        }
      } else {
        if (typeof window !== 'undefined' && window.dispatchEvent) {
          window.dispatchEvent(new CustomEvent('clearGuidelines'))
        }
      }
    } else if (this.state.mode === 'resizing' && this.state.initialElementsMap && this.state.initialGroupBounds) {
      // === 【完美版】基于隐式组 + 矩阵变换模拟的缩放逻辑 ===
      const state = useStore.getState()
      const selectedIds = state.selectedIds
      const handle = this.state.activeHandle
      const initGroupBounds = this.state.initialGroupBounds

      // 1. 特殊处理：线段/箭头的端点拖拽 (逻辑保持不变，因为它们是基于点的)
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

      // 使用分离的计算逻辑计算缩放结果
      const scaledElements = calculateScaling(
        this.state.initialElementsMap,
        this.state.initialGroupBounds,
        selectedIds,
        handle,
        this.state.startPos,
        currentPos,
      )

      // 批量更新所有元素，避免多次触发重新渲染
      state.batchUpdateElements(scaledElements)

      return
    } else if (
      this.state.mode === 'rotating' &&
      this.state.rotationInitialStates &&
      this.state.rotationCenter &&
      this.state.startRotationAngle !== null
    ) {
      // === [新增] 旋转逻辑 ===
      // 使用分离的计算逻辑计算旋转结果
      const { rotatedElements, deltaAngle } = calculateRotation(
        this.state.rotationInitialStates,
        this.state.rotationCenter,
        this.state.startRotationAngle,
        currentPos,
      )

      // 清除/绘制可视化辅助 (可选)
      this.resizeVisualizationGraphic.clear()
      // ... (绘制旋转中心)

      // 批量更新元素以提高性能
      const batchUpdates: Record<string, Partial<CanvasElement>> = {}

      // 收集所有需要更新的元素
      Object.entries(rotatedElements).forEach(([id, attrs]) => {
        batchUpdates[id] = attrs
      })

      // 处理组内子元素
      Object.entries(this.state.rotationInitialStates).forEach(([id, initEl]) => {
        if (initEl.type === 'group') {
          const childrenUpdates = calculateGroupChildrenRotation(
            this.state.rotationInitialStates!,
            id,
            deltaAngle,
            this.state.rotationCenter!,
          )

          Object.entries(childrenUpdates).forEach(([childId, attrs]) => {
            batchUpdates[childId] = attrs
          })
        }
      })

      // 一次性批量更新所有元素，避免多次触发重新渲染
      state.batchUpdateElements(batchUpdates)

      return
    } else if (this.state.mode === 'drawing' && this.state.currentId) {
      handleDrawingMove(state, this.state.currentId, this.state.startPos, currentPos, (id, attrs) =>
        state.updateElement(id, attrs),
      )
    }
  }

  public onPointerUp = () => {
    // 触发防抖检查
    //this.updateState.triggerDebounceSnapshot()

    const state = useStore.getState()
    if (this.state.mode === 'erasing') {
      this.updateState.setMode('idle')
      clearEraser(this.eraserGraphic)
    }
    if (this.state.mode === 'selecting') {
      const endPos = this.app.renderer.events.pointer.getLocalPosition(this.viewport)
      handleSelectingUp(
        this.state.startPos,
        endPos,
        state.elements,
        (ids) => state.setSelected(ids),
        this.selectionRectGraphic,
      )
    }
    if (this.state.mode === 'drawing' && this.state.currentId) {
      const shouldReturn = handleDrawingUp(
        state,
        this.state.currentId,
        (id, attrs) => state.updateElement(id, attrs),
        (ids) => state.removeElements(ids),
      )

      if (shouldReturn) {
        this.updateState.setCurrentId(null)
        this.updateState.setMode('idle')
        // 解锁撤销/重做管理器
        undoRedoManager.unlock()
        return
      }

      // [新增] 修复 Undo/Redo Bug
      // 在解锁前或解锁后均可，关键是获取当前的最新 State（包含了最终宽高的 State）
      // 并更新掉 onPointerDown 时记录的那个"0宽高"的快照
      undoRedoManager.updateLatestSnapshot(useStore.getState())

      // 解锁撤销/重做管理器
      undoRedoManager.unlock()
      //console.log('[StageManager] 解锁撤销/重做管理器')
    }

    // [新增] 处理 Dragging (移动) 结束的命令记录
    if (this.state.mode === 'dragging') {
      // 确保即使 dragInitialStates 是在移动过程中创建的也能正确执行命令
      const dragInitialStates = this.state.dragInitialStates || (this.updateState as any)._tempDragInitialStates

      // 拖拽结束时，将最终计算的位置写入 Store
      if (dragInitialStates) {
        // 获取最终的鼠标位置
        const currentPos = this.app.renderer.events.pointer.getLocalPosition(this.viewport)

        // 计算最终的位移（使用初始位置和最终位置计算，而不是累加）
        const totalDx = currentPos.x - this.state.startPos.x
        const totalDy = currentPos.y - this.state.startPos.y

        // 批量更新 Store (触发 Yjs transaction)
        const updates: Record<string, Partial<CanvasElement>> = {}

        state.selectedIds.forEach((id) => {
          const initData = dragInitialStates[id]
          //const element = state.elements[id]

          if (initData) {
            // 使用初始状态加上总位移来计算最终位置，避免累积误差
            updates[id] = {
              x: (initData.x || 0) + totalDx,
              y: (initData.y || 0) + totalDy,
            }
          }
        })

        // 批量更新元素
        Object.keys(updates).forEach((id) => {
          state.updateElement(id, updates[id])
        })

        // 执行命令 (Undo/Redo)
        import('../utils/commandUtils').then(({ executeMoveCommand }) => {
          executeMoveCommand(dragInitialStates, state)
        })
      }

      // 重置选择框位置
      const transformerGraphic = this.transformerRenderer.getGraphic()
      if (transformerGraphic) {
        transformerGraphic.position.set(0, 0)
      }
    }

    // [修改] 处理 Resizing (调整大小) 结束的命令记录
    // 使用通用的 UpdateElementCommand
    if (this.state.mode === 'resizing' && this.state.resizeInitialStates) {
      executeResizeCommand(this.state.resizeInitialStates, state)
    }

    // === [新增] 旋转结束逻辑 ===
    if (this.state.mode === 'rotating' && this.state.rotationInitialStates) {
      executeRotateCommand(this.state.rotationInitialStates, state)
    }

    // 清除resize可视化图形
    if (this.resizeVisualizationGraphic) {
      this.resizeVisualizationGraphic.clear()
    }

    this.updateState.setMode('idle')
    this.updateState.setCurrentId(null)
    this.updateState.setActiveHandle(null)
    // --- 清理状态 ---
    this.updateState.setInitialElementsMap(null)
    this.updateState.setInitialGroupBounds(null)
    this.updateState.setResizeInitialStates(null)
    this.updateState.setDragInitialStates(null)
    // [新增] 清理旋转状态
    this.updateState.setRotationInitialStates(null)
    this.updateState.setRotationCenter(null)
    this.updateState.setStartRotationAngle(null)

    // 清理临时状态
    delete (this.updateState as any)._tempDragInitialStates
  }
}
