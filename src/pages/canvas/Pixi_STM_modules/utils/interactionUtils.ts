import * as PIXI from 'pixi.js'
import { useStore, type ToolType } from '@/stores/canvasStore'
import { nanoid } from 'nanoid'
import type { HandleType, CanvasElement } from '../shared/types'
import { undoRedoManager } from '@/lib/UndoRedoManager'
import { AddElementCommand } from '@/lib/AddElementCommand'

/**
 * 处理指针按下事件
 * @param e PIXI指针事件
 * @param state 应用状态
 * @param isCtrlPressed Ctrl键是否按下
 * @param setMode 设置交互模式的函数
 * @param setStartPos 设置起始位置的函数
 * @param setCurrentId 设置当前ID的函数
 * @param setDragInitialStates 设置拖拽初始状态的函数
 */
export function handlePointerDown(
  e: PIXI.FederatedPointerEvent,
  state: ReturnType<typeof useStore.getState>,
  isCtrlPressed: boolean,
  setMode: (
    mode: 'idle' | 'panning' | 'selecting' | 'dragging' | 'resizing' | 'drawing' | 'texting' | 'erasing' | 'rotating',
  ) => void,
  setStartPos: (pos: { x: number; y: number }) => void,
  setCurrentId: (id: string | null) => void,
  setDragInitialStates: (states: Record<string, any> | null) => void,
  getLocalPosition: (e: PIXI.FederatedPointerEvent) => { x: number; y: number },
  tool: string,
  isSpacePressed: boolean,
) {
  if (e.button === 1) return
  const worldPos = getLocalPosition(e)
  if (e.target && e.target.label?.startsWith('handle:')) return

  setStartPos({ x: worldPos.x, y: worldPos.y })

  if (tool === 'hand' || isSpacePressed) return

  // Eraser Mode
  if (tool === 'eraser') {
    setMode('erasing')
    if (e.target && e.target.label) {
      const hitId = e.target.label
      state.removeElements([hitId])
    }
    return
  }

  // Text Mode
  if (tool === 'text') {
    const newId = nanoid()
    const newElement = {
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
    } as CanvasElement

    // 创建并执行添加元素命令
    const addCommand = new AddElementCommand({ element: newElement })
    undoRedoManager.executeCommand(addCommand)

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
    if (isCtrlPressed) {
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
    setMode('dragging')
    setCurrentId(hitId)

    // [新增] 捕获所有选中元素在拖拽前的初始状态
    const initialDragMap: Record<string, any> = {}
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
    setDragInitialStates(initialDragMap)

    // 开始拖拽时锁定撤销/重做管理器
    undoRedoManager.lock()
    return
  }

  // Select Mode
  if (tool === 'select') {
    setMode('selecting')
    // 只有在没有按住 Ctrl 键时才清空选中项
    if (!isCtrlPressed) {
      state.setSelected([])
    }
    return
  }

  // Drawing Mode
  setMode('drawing')
  const newId = nanoid()
  setCurrentId(newId)
  const commonProps = {
    id: newId,
    type: tool as ToolType,
    x: worldPos.x,
    y: worldPos.y,
    width: 0,
    height: 0,
    fill: state.currentStyle.fill,
    stroke: state.currentStyle.stroke,
    strokeWidth: state.currentStyle.strokeWidth,
    alpha: state.currentStyle.alpha,
  }

  let newElement: CanvasElement
  if (tool === 'pencil') {
    newElement = { ...commonProps, points: [[0, 0]] } as CanvasElement
  } else if (tool === 'line' || tool === 'arrow') {
    newElement = {
      ...commonProps,
      points: [
        [0, 0],
        [0, 0],
      ],
    } as CanvasElement
  } else {
    newElement = commonProps as CanvasElement
  }

  // 创建并执行添加元素命令
  const addCommand = new AddElementCommand({ element: newElement })
  undoRedoManager.executeCommand(addCommand)

  // 开始绘制时锁定撤销/重做管理器
  undoRedoManager.lock()
}

/**
 * 处理手柄按下事件
 * @param e PIXI指针事件
 * @param handle 手柄类型
 * @param elementId 元素ID
 * @param state 应用状态
 * @param setMode 设置交互模式的函数
 * @param setActiveHandle 设置活动手柄的函数
 * @param setCurrentId 设置当前ID的函数
 * @param setStartPos 设置起始位置的函数
 * @param setResizeInitialStates 设置调整大小初始状态的函数
 * @param setInitialElementsMap 设置初始元素映射的函数
 * @param setInitialGroupBounds 设置初始组边界的函数
 * @param setRotationInitialStates 设置旋转初始状态的函数
 * @param setRotationCenter 设置旋转中心的函数
 * @param setStartRotationAngle 设置起始旋转角度的函数
 * @param getSelectionBounds 获取选区边界的函数
 * @param getAllDescendantIds 获取所有后代ID的函数
 */
export function handleHandleDown(
  e: PIXI.FederatedPointerEvent,
  handle: HandleType | 'p0' | 'p1' | 'rotate',
  elementId: string,
  state: ReturnType<typeof useStore.getState>,
  setMode: (
    mode: 'idle' | 'panning' | 'selecting' | 'dragging' | 'resizing' | 'drawing' | 'texting' | 'erasing' | 'rotating',
  ) => void,
  setActiveHandle: (handle: HandleType | null) => void,
  setCurrentId: (id: string | null) => void,
  setStartPos: (pos: { x: number; y: number }) => void,
  setResizeInitialStates: (states: Record<string, any> | null) => void,
  setInitialElementsMap: (map: Record<string, any> | null) => void,
  setInitialGroupBounds: (bounds: { x: number; y: number; width: number; height: number } | null) => void,
  setRotationInitialStates: (states: Record<string, any> | null) => void,
  setRotationCenter: (center: { x: number; y: number } | null) => void,
  setStartRotationAngle: (angle: number | null) => void,
  getSelectionBounds: (selectedIds: string[], elements: Record<string, any>) => any,
  getAllDescendantIds: (groupId: string, elements: Record<string, any>) => string[],
) {
  e.stopPropagation()

  // === [新增] 旋转逻辑分支 ===
  if (handle === 'rotate') {
    setMode('rotating')
    setCurrentId(elementId)

    const { elements, selectedIds } = state
    // 获取相对于视口的位置，处理parent可能为null的情况
    const parent = e.target.parent || e.target
    const mousePos = e.getLocalPosition(parent)

    // 1. 计算旋转中心（选中元素的包围盒中心）
    const bounds = getSelectionBounds(selectedIds, elements)
    if (!bounds) return

    const centerX = bounds.x + bounds.width / 2
    const centerY = bounds.y + bounds.height / 2
    setRotationCenter({ x: centerX, y: centerY })

    // 2. 计算鼠标起始角度（相对于中心点）
    setStartRotationAngle(Math.atan2(mousePos.y - centerY, mousePos.x - centerX))

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
          const groupElement = el as any
          groupElement.children.forEach((childId: string) => {
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
    setRotationInitialStates(initialMap)

    undoRedoManager.lock()
    console.log('[StageManager] 开始旋转操作')
    return
  }

  // === Resizing 逻辑 ===
  setMode('resizing')
  setActiveHandle(handle as HandleType | null)
  setCurrentId(elementId)
  // 处理parent可能为null的情况
  const parent = e.target.parent || e.target
  setStartPos(e.getLocalPosition(parent))

  const { elements, selectedIds } = state

  // 1. 收集所有需要跟踪状态的元素 ID (包括选中项 + 它们的所有后代)
  const idsToTrack = new Set<string>(selectedIds)
  selectedIds.forEach((id) => {
    const descendants = getAllDescendantIds(id, elements)
    descendants.forEach((dId) => idsToTrack.add(dId))
  })

  // 2. 捕捉所有这些元素的初始状态
  const initialMap: Record<string, any> = {}

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
        points: el.points ? el.points.map((p: any) => [...p]) : undefined,
      }
    }
  })

  setResizeInitialStates(initialMap)
  setInitialElementsMap(initialMap) // 确保这两个状态一致

  // 3. 计算初始的群组包围盒 (只基于选中的元素，不包含子元素，因为子元素在组内部)
  // 注意：TransformerRenderer 画出的框通常只包含选中的顶层元素
  setInitialGroupBounds(getSelectionBounds(selectedIds, elements))

  undoRedoManager.lock()
}
