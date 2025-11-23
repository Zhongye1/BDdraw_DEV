import { create } from 'zustand'
import { subscribeWithSelector, devtools } from 'zustand/middleware'

import { nanoid } from 'nanoid'
import { SnapshotCommand, undoRedoManager } from '@/lib/UndoRedoManager'

export type ToolType =
  | 'select'
  | 'hand'
  | 'rect'
  | 'circle'
  | 'triangle'
  | 'diamond'
  | 'line'
  | 'arrow'
  | 'pencil'
  | 'text'
  | 'image' // 添加 image 类型
  | 'eraser'

export interface CanvasElement {
  id: string
  type: ToolType
  x: number
  y: number
  width: number
  height: number
  fill: string
  stroke: string
  strokeWidth: number
  alpha?: number
  points?: number[][]
  rotation?: number // 新增：弧度制 (radians)元素旋转要用

  // [新增] 文本相关属性
  text?: string // 存储 HTML 字符串
  fontSize?: number
  fontFamily?: string
  textAlign?: 'left' | 'center' | 'right'

  // [新增] 图像相关属性
  imageUrl?: string
  filter?: 'none' | 'blur' | 'brightness' | 'grayscale' // 三种滤镜加一个无滤镜选项

  // 矩形圆角属性
  radius?: number
}

interface CanvasState {
  tool: ToolType
  elements: Record<string, CanvasElement>
  selectedIds: string[]
  editingId: string | null
  // 添加剪贴板状态
  clipboard: CanvasElement[] | null
  // 添加粘贴偏移计数
  pasteOffset: number

  currentStyle: {
    fill: string
    stroke: string
    strokeWidth: number
    alpha: number
    fontSize: number
    fontFamily: string
    textAlign: 'left' | 'center' | 'right'
    eraserSize: number // 添加橡皮擦大小属性
  }

  setTool: (tool: ToolType) => void
  addElement: (el: CanvasElement) => void
  updateElement: (id: string, attrs: Partial<CanvasElement>) => void
  removeElements: (ids: string[]) => void
  setSelected: (ids: string[]) => void
  setEditingId: (id: string | null) => void
  // 添加复制粘贴方法
  copyElements: (ids: string[]) => void
  pasteElements: () => void

  // 添加撤销/重做方法
  undo: () => void
  redo: () => void
  canUndo: () => boolean
  canRedo: () => boolean
}

export const useStore = create<CanvasState>()(
  devtools(
    subscribeWithSelector((set, get) => {
      // 保存原始的set方法
      const originalSet: typeof set = (partial, replace?) => {
        // 工具切换不记录到撤销/重做栈
        const isToolChangeOnly =
          typeof partial === 'object' &&
          partial !== null &&
          Object.keys(partial).length === 3 &&
          'tool' in partial &&
          'selectedIds' in partial &&
          'editingId' in partial &&
          Array.isArray((partial as any).selectedIds) &&
          (partial as any).selectedIds.length === 0 &&
          (partial as any).editingId === null

        // 选中操作不记录到撤销/重做栈
        const isSelectionChangeOnly =
          typeof partial === 'object' &&
          partial !== null &&
          Object.keys(partial).length === 1 &&
          'selectedIds' in partial

        if (undoRedoManager.isLocked() || isToolChangeOnly || isSelectionChangeOnly) {
          // 如果被锁定，或者只是工具切换，或者是选中操作，直接设置状态

          /**
          console.log(
          '[CanvasStore] 状态更新被忽略，锁定状态:',
          undoRedoManager.isLocked(),
          '工具切换:',
          isToolChangeOnly,
          '选中变化:',
          isSelectionChangeOnly,
        )
         * 
         */

          return replace === true ? set(partial as CanvasState, true) : set(partial)
        }

        // 获取当前状态，只克隆数据部分，不包括函数
        const currentState = (() => {
          const state = get()
          // 克隆数据属性

          const {
            setTool,
            addElement,
            updateElement,
            removeElements,
            setSelected,
            setEditingId,
            copyElements,
            pasteElements,
            undo,
            redo,
            canUndo,
            canRedo,
            ...dataOnlyState
          } = state
          return structuredClone(dataOnlyState)
        })()

        // 设置新状态
        const result = replace === true ? set(partial as CanvasState, true) : set(partial)

        // 获取更新后的状态
        const newState = (() => {
          const state = get()
          // 只克隆数据属性，排除函数
          const {
            setTool,
            addElement,
            updateElement,
            removeElements,
            setSelected,
            setEditingId,
            copyElements,
            pasteElements,
            undo,
            redo,
            canUndo,
            canRedo,
            ...dataOnlyState
          } = state
          return structuredClone(dataOnlyState)
        })()

        // ========== 撤销/重做机制核心部分 ==========
        // 创建快照命令并执行
        // 判断操作类型
        // 兼容函数式更新
        const partialObj = typeof partial === 'function' ? partial(get()) : partial

        let operationType = '未知操作'
        if (partialObj && typeof partialObj === 'object') {
          if ('elements' in partialObj) {
            // 比较元素数量变化
            const prevCount = Object.keys(currentState.elements).length
            const nextCount = Object.keys(newState.elements).length

            if (nextCount > prevCount) {
              operationType = '添加元素'
            } else if (nextCount < prevCount) {
              operationType = '删除元素'
            } else {
              operationType = '修改元素'
            }
          } else if ('tool' in partialObj) {
            operationType = '切换工具'
          } else if ('selectedIds' in partialObj && !('elements' in partialObj)) {
            operationType = '选择元素'
          }
        }

        const command = new SnapshotCommand(currentState, newState, operationType || '状态变更')
        //console.log('[CanvasStore] 创建并执行快照命令')
        undoRedoManager.executeCommand(command)
        // ======================================

        return result
      }

      return {
        tool: 'select',
        elements: {},
        selectedIds: [],
        editingId: null,
        clipboard: null,
        pasteOffset: 0,
        currentStyle: {
          fill: '#fbfbfdd2', // 默认文字颜色
          stroke: '#000000',
          strokeWidth: 2,
          alpha: 1,
          fontSize: 20,
          fontFamily: 'Arial',
          textAlign: 'left',
          eraserSize: 20, // 默认橡皮擦大小
        },

        setTool: (tool) => originalSet({ tool, selectedIds: [], editingId: null }),
        setEditingId: (id) => originalSet({ editingId: id }),
        setSelected: (ids) => originalSet({ selectedIds: ids }),
        addElement: (el) => originalSet((state) => ({ elements: { ...state.elements, [el.id]: el } })),
        updateElement: (id, attrs) =>
          originalSet((state) => {
            if (!state.elements[id]) return state
            return { elements: { ...state.elements, [id]: { ...state.elements[id], ...attrs } } }
          }),
        removeElements: (ids) =>
          originalSet((state) => {
            const newElements = { ...state.elements }
            ids.forEach((id) => delete newElements[id])
            return { elements: newElements, selectedIds: [] }
          }),
        // 实现复制方法
        copyElements: (ids) =>
          originalSet((state) => {
            const elementsToCopy = ids.map((id) => state.elements[id]).filter(Boolean)
            return { clipboard: elementsToCopy }
          }),
        // 实现粘贴方法
        pasteElements: () =>
          originalSet((state) => {
            if (!state.clipboard || state.clipboard.length === 0) return state

            // 增加粘贴偏移量
            const newOffset = state.pasteOffset + 1

            const newElements: Record<string, CanvasElement> = {}
            const newIds: string[] = []

            state.clipboard.forEach((element) => {
              const newId = nanoid()
              const randomSign = Math.random() > 0.5 ? 1 : -1 // 随机选择正负
              const randomOffset = Math.random() * 20 // 0-20的随机偏移量
              newIds.push(newId)
              newElements[newId] = {
                ...element,
                id: newId,
                // 每次粘贴都在前一次的基础上继续偏移
                x: element.x + randomOffset * randomSign,
                y: element.y + randomOffset * randomSign,
              }
            })

            return {
              elements: { ...state.elements, ...newElements },
              selectedIds: newIds,
              pasteOffset: newOffset,
            }
          }),

        // ========== 撤销/重做方法实现 ==========
        undo: () => undoRedoManager.undo(),
        redo: () => undoRedoManager.redo(),
        canUndo: () => undoRedoManager.canUndo(),
        canRedo: () => undoRedoManager.canRedo(),
        // ===================================
      }
    }),
    { name: 'CanvasStore' },
  ),
)
