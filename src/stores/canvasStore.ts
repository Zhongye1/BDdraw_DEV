import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { nanoid } from 'nanoid'

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
}

export const useStore = create<CanvasState>()(
  subscribeWithSelector((set, get) => ({
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

    setTool: (tool) => set({ tool, selectedIds: [], editingId: null }),
    setEditingId: (id) => set({ editingId: id }),
    setSelected: (ids) => set({ selectedIds: ids }),
    addElement: (el) => set((state) => ({ elements: { ...state.elements, [el.id]: el } })),
    updateElement: (id, attrs) =>
      set((state) => {
        if (!state.elements[id]) return state
        return { elements: { ...state.elements, [id]: { ...state.elements[id], ...attrs } } }
      }),
    removeElements: (ids) =>
      set((state) => {
        const newElements = { ...state.elements }
        ids.forEach((id) => delete newElements[id])
        return { elements: newElements, selectedIds: [] }
      }),
    // 实现复制方法
    copyElements: (ids) =>
      set((state) => {
        const elementsToCopy = ids.map((id) => state.elements[id]).filter(Boolean)
        return { clipboard: elementsToCopy }
      }),
    // 实现粘贴方法
    pasteElements: () =>
      set((state) => {
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
  })),
)
