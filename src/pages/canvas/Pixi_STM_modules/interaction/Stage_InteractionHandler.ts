import * as PIXI from 'pixi.js'
import { HTMLText } from 'pixi.js'
import { useStore, type GroupElement, type CanvasElement } from '@/stores/canvasStore'
import type { HandleType, StageManagerState } from '../shared/types'
import { undoRedoManager } from '@/lib/UndoRedoManager'
import { rotatePoint, getSelectionBounds, getAllDescendantIds } from '../utils/geometryUtils'
import { executeMoveCommand, executeResizeCommand, executeRotateCommand } from '../utils/commandUtils'
import { handlePointerDown, handleHandleDown } from '../utils/interactionUtils'
import { handleSelectingMove, handleSelectingUp } from '../utils/selectionUtils'
import { handleErasingMove, clearEraser } from '../utils/eraserUtils'
import { handleDraggingMove } from '../utils/dragUtils'
import { handleDrawingMove, handleDrawingUp } from '../utils/drawingUtils'
import type { Viewport } from 'pixi-viewport'

export class StageInteractionHandler {
  private state: StageManagerState
  private app: PIXI.Application
  private viewport: Viewport
  private isCtrlPressed: boolean
  private selectionRectGraphic: PIXI.Graphics
  private eraserGraphic: PIXI.Graphics
  private elementRendererSpriteMap: () => Map<string, PIXI.Graphics | HTMLText | PIXI.Sprite>

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
    triggerDebounceSnapshot: () => void
  }

  constructor(
    state: StageManagerState,
    app: PIXI.Application,
    viewport: Viewport,
    isCtrlPressed: boolean,
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
      triggerDebounceSnapshot: () => void
    },
  ) {
    this.state = state
    this.app = app
    this.viewport = viewport
    this.isCtrlPressed = isCtrlPressed
    this.selectionRectGraphic = selectionRectGraphic
    this.eraserGraphic = eraserGraphic
    this.elementRendererSpriteMap = elementRendererSpriteMap
    this.updateState = updateState
  }

  public onPointerDown = (e: PIXI.FederatedPointerEvent) => {
    // 触发防抖检查
    this.updateState.triggerDebounceSnapshot()

    const state = useStore.getState()
    const tool = state.tool

    handlePointerDown(
      e,
      state,
      this.isCtrlPressed,
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
    this.updateState.triggerDebounceSnapshot()

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
    this.updateState.triggerDebounceSnapshot()

    if (this.state.mode === 'idle') return
    const state = useStore.getState()
    const currentPos = e.getLocalPosition(this.viewport)

    if (this.state.mode === 'selecting') {
      handleSelectingMove(this.state.startPos, currentPos, this.selectionRectGraphic)
    } else if (this.state.mode === 'erasing') {
      handleErasingMove(e, this.eraserGraphic, (ids) => state.removeElements(ids))
    } else if (this.state.mode === 'dragging') {
      this.updateState.setStartPos(
        handleDraggingMove(state, state.selectedIds, this.state.startPos, currentPos, (id, attrs) =>
          state.updateElement(id, attrs),
        ),
      )
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
          const newCenter = rotatePoint(initEl.cx, initEl.cy, cx, cy, deltaAngle)
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
              const childNewCenter = rotatePoint(childInitEl.cx, childInitEl.cy, cx, cy, deltaAngle)
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
          const newCenter = rotatePoint(initEl.cx, initEl.cy, cx, cy, deltaAngle)

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
      handleDrawingMove(state, this.state.currentId, this.state.startPos, currentPos, (id, attrs) =>
        state.updateElement(id, attrs),
      )
    }
  }

  public onPointerUp = () => {
    // 触发防抖检查
    this.updateState.triggerDebounceSnapshot()

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
      console.log('[StageManager] 解锁撤销/重做管理器')
    }

    // [新增] 处理 Dragging (移动) 结束的命令记录
    if (this.state.mode === 'dragging' && this.state.dragInitialStates) {
      executeMoveCommand(this.state.dragInitialStates, state)
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
  }
}
