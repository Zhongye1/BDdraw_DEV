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
  private isCtrlPressed: () => boolean // 修改为函数形式
  private selectionRectGraphic: PIXI.Graphics
  private eraserGraphic: PIXI.Graphics
  private elementRendererSpriteMap: () => Map<string, PIXI.Graphics | HTMLText | PIXI.Sprite>
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
  ) {
    this.state = state
    this.app = app
    this.viewport = viewport
    this.isCtrlPressed = isCtrlPressed // 保存函数引用
    this.selectionRectGraphic = selectionRectGraphic
    this.eraserGraphic = eraserGraphic
    this.elementRendererSpriteMap = elementRendererSpriteMap
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
      this.updateState.setStartPos(
        handleDraggingMove(state, state.selectedIds, this.state.startPos, currentPos, (id, attrs) =>
          state.updateElement(id, attrs),
        ),
      )
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

      // === 2. 确定"隐式组"的属性 ===

      // 2.1 确定组的旋转角度 (Group Angle)
      // - 单选或多选统一旋转：使用该统一角度
      // - 多选混合旋转：使用 0 度 (AABB)
      let groupAngle = 0

      // 检查统一旋转
      let isUniform = false
      const firstRotation = this.state.initialElementsMap[selectedIds[0]]?.rotation || 0
      if (
        selectedIds.every((id) => Math.abs((this.state.initialElementsMap![id]?.rotation || 0) - firstRotation) < 0.001)
      ) {
        isUniform = true
        groupAngle = firstRotation
      }

      // 2.2 确定组的旋转中心 (Pivot) - 使用初始包围盒的中心
      const groupCx = initGroupBounds.x + initGroupBounds.width / 2
      const groupCy = initGroupBounds.y + initGroupBounds.height / 2

      // 2.3 计算组在"去旋转"后的局部包围盒 (Local OBB)
      // 这一步是为了确定手柄操作的基准框
      let minLx = Infinity,
        maxLx = -Infinity,
        minLy = Infinity,
        maxLy = -Infinity

      Object.keys(this.state.initialElementsMap).forEach((id) => {
        const el = this.state.initialElementsMap![id]
        // 元素的四个角点
        const elCx = el.x! + el.width! / 2
        const elCy = el.y! + el.height! / 2
        const elHalfW = el.width! / 2
        const elHalfH = el.height! / 2
        const elRot = el.rotation || 0

        // 计算元素四个角点在世界坐标的位置
        // 然后将其旋转回组的局部坐标系
        const corners = [
          { x: -elHalfW, y: -elHalfH }, // TL
          { x: elHalfW, y: -elHalfH }, // TR
          { x: elHalfW, y: elHalfH }, // BR
          { x: -elHalfW, y: elHalfH }, // BL
        ].map((p) => {
          // 1. 元素自转转回世界坐标 (相对元素中心)
          const pWorldRel = rotatePoint(p.x, p.y, 0, 0, elRot)
          const pWorld = { x: elCx + pWorldRel.x, y: elCy + pWorldRel.y }
          // 2. 世界坐标转回组局部坐标 (相对组中心)
          return rotatePoint(pWorld.x, pWorld.y, groupCx, groupCy, -groupAngle)
        })

        corners.forEach((p) => {
          minLx = Math.min(minLx, p.x)
          maxLx = Math.max(maxLx, p.x)
          minLy = Math.min(minLy, p.y)
          maxLy = Math.max(maxLy, p.y)
        })
      })

      const groupInitLocalX = minLx
      const groupInitLocalY = minLy
      const groupInitLocalW = maxLx - minLx
      const groupInitLocalH = maxLy - minLy

      // === 3. 计算拖拽后的组局部包围盒 ===

      // 将鼠标位移转换到组的局部坐标系
      const startLocal = rotatePoint(this.state.startPos.x, this.state.startPos.y, groupCx, groupCy, -groupAngle)
      const currLocal = rotatePoint(currentPos.x, currentPos.y, groupCx, groupCy, -groupAngle)
      const dx = currLocal.x - startLocal.x
      const dy = currLocal.y - startLocal.y

      let newGroupLocalX = groupInitLocalX
      let newGroupLocalY = groupInitLocalY
      let newGroupLocalW = groupInitLocalW
      let newGroupLocalH = groupInitLocalH

      // 根据手柄调整尺寸 (固定对侧锚点)
      if (handle?.includes('l')) {
        newGroupLocalX += dx
        newGroupLocalW -= dx
      }
      if (handle?.includes('r')) {
        newGroupLocalW += dx
      }
      if (handle?.includes('t')) {
        newGroupLocalY += dy
        newGroupLocalH -= dy
      }
      if (handle?.includes('b')) {
        newGroupLocalH += dy
      }

      // 翻转处理 (Flip)
      let scaleXSign = 1
      let scaleYSign = 1
      if (newGroupLocalW < 0) {
        newGroupLocalW = Math.abs(newGroupLocalW)
        newGroupLocalX -= newGroupLocalW
        scaleXSign = -1
      }
      if (newGroupLocalH < 0) {
        newGroupLocalH = Math.abs(newGroupLocalH)
        newGroupLocalY -= newGroupLocalH
        scaleYSign = -1
      }

      // === 可视化中心点和锚点 (可选：调试用) ===
      this.resizeVisualizationGraphic.clear()
      // ... (可视化绘图代码，保留以供调试，生产环境可注释)
      /* 
      this.resizeVisualizationGraphic.beginFill(0xff0000)
      this.resizeVisualizationGraphic.drawCircle(groupCx, groupCy, 5) // 中心
      this.resizeVisualizationGraphic.endFill() 
      */

      // === 4. 对每个子元素进行矩阵变换模拟 ===

      Object.keys(this.state.initialElementsMap).forEach((id) => {
        const initEl = this.state.initialElementsMap![id]
        if (!initEl) return

        // 4.1 获取元素初始的关键点 (中心 + 尺寸向量)
        // 为了精确模拟矩阵变换，我们追踪元素的三个关键点：左上(TL), 右上(TR), 左下(BL)
        // 通过变换后的这三个点，可以反解出新的 Width, Height, Rotation, XY
        const elCx = initEl.x! + initEl.width! / 2
        const elCy = initEl.y! + initEl.height! / 2
        const halfW = initEl.width! / 2
        const halfH = initEl.height! / 2
        const rot = initEl.rotation || 0

        // 原始局部向量 (相对于元素中心)
        const vTL = { x: -halfW, y: -halfH }
        const vTR = { x: halfW, y: -halfH }
        const vBL = { x: -halfW, y: halfH }

        // 定义变换函数：世界点 -> 组局部 -> 缩放 -> 组局部 -> 世界点
        const transformPoint = (localX: number, localY: number) => {
          // A. 元素局部 -> 世界
          const pWorldRel = rotatePoint(localX, localY, 0, 0, rot)
          const pWorld = { x: elCx + pWorldRel.x, y: elCy + pWorldRel.y }

          // B. 世界 -> 组局部 (Old)
          const pGroupLocal = rotatePoint(pWorld.x, pWorld.y, groupCx, groupCy, -groupAngle)

          // C. 计算在组内的相对比例 (0.0 - 1.0)
          const ratioX = groupInitLocalW === 0 ? 0 : (pGroupLocal.x - groupInitLocalX) / groupInitLocalW
          const ratioY = groupInitLocalH === 0 ? 0 : (pGroupLocal.y - groupInitLocalY) / groupInitLocalH

          // D. 映射到新组局部 (New)
          const pGroupLocalNewX = newGroupLocalX + ratioX * newGroupLocalW
          const pGroupLocalNewY = newGroupLocalY + ratioY * newGroupLocalH

          // E. 组局部 (New) -> 世界 (New)
          return rotatePoint(pGroupLocalNewX, pGroupLocalNewY, groupCx, groupCy, groupAngle)
        }

        // 4.2 变换关键点
        const newTL = transformPoint(vTL.x, vTL.y)
        const newTR = transformPoint(vTR.x, vTR.y)
        const newBL = transformPoint(vBL.x, vBL.y)

        // 4.3 反解属性
        // 新宽度 = TL 到 TR 的距离
        const newWidth = Math.sqrt(Math.pow(newTR.x - newTL.x, 2) + Math.pow(newTR.y - newTL.y, 2))
        // 新高度 = TL 到 BL 的距离
        const newHeight = Math.sqrt(Math.pow(newBL.x - newTL.x, 2) + Math.pow(newBL.y - newTL.y, 2))

        // 新中心 = (TL + TR + BL + BR)/2 => (TL + BR)/2
        // 利用矩形对角线性质：Mid(TL, BR) = Mid(TR, BL)
        // 计算 BR: newBR = newTR + (newBL - newTL) (向量加法)
        const vecTop = { x: newTR.x - newTL.x, y: newTR.y - newTL.y }
        const vecLeft = { x: newBL.x - newTL.x, y: newBL.y - newTL.y }

        // 中心点 = TL + 0.5 * vecTop + 0.5 * vecLeft
        const newCx = newTL.x + vecTop.x / 2 + vecLeft.x / 2
        const newCy = newTL.y + vecTop.y / 2 + vecLeft.y / 2

        // 新旋转 = TL 到 TR 的角度
        // 注意：这是世界坐标系下的角度
        const newRotation = Math.atan2(newTR.y - newTL.y, newTR.x - newTL.x)

        const finalX = newCx - newWidth / 2
        const finalY = newCy - newHeight / 2

        // 4.4 计算平均缩放比例 (用于字体/描边)
        const groupScaleX = groupInitLocalW === 0 ? 1 : newGroupLocalW / groupInitLocalW
        const groupScaleY = groupInitLocalH === 0 ? 1 : newGroupLocalH / groupInitLocalH
        const avgScale = (Math.abs(groupScaleX) + Math.abs(groupScaleY)) / 2

        const updatePayload: any = {
          x: finalX,
          y: finalY,
          width: newWidth,
          height: newHeight,
          rotation: newRotation,
        }

        // 点集处理 (Line/Arrow/Pencil)
        // 简单缩放处理：这对于路径类元素在非均匀缩放下是合理的近似（类似SVG viewBox scaling）
        if (initEl.points) {
          updatePayload.points = initEl.points.map((p: number[]) => {
            return [p[0] * groupScaleX * scaleXSign, p[1] * groupScaleY * scaleYSign]
          })
        }

        if (initEl.fontSize) updatePayload.fontSize = initEl.fontSize * avgScale
        if (initEl.strokeWidth) updatePayload.strokeWidth = initEl.strokeWidth * avgScale

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

      // 清除/绘制可视化辅助 (可选)
      this.resizeVisualizationGraphic.clear()
      // ... (绘制旋转中心)

      // 3. 遍历所有选中元素并更新它们的旋转角度和位置
      Object.entries(this.state.rotationInitialStates).forEach(([id, initEl]) => {
        const element = state.elements[id]
        if (!element) return

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
          const newRotation = initEl.rotation + deltaAngle
          // 公转
          const newCenter = rotatePoint(initEl.cx, initEl.cy, cx, cy, deltaAngle)
          const newX = newCenter.x - initEl.width / 2
          const newY = newCenter.y - initEl.height / 2

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
  }
}
