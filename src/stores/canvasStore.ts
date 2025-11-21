import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'

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
  | 'text' // [新增] text 类型

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

  // [新增] 文本相关属性
  text?: string // 存储 HTML 字符串
  fontSize?: number
  fontFamily?: string
  textAlign?: 'left' | 'center' | 'right'

  // 矩形圆角属性
  radius?: number
}

interface CanvasState {
  tool: ToolType
  elements: Record<string, CanvasElement>
  selectedIds: string[]
  editingId: string | null

  currentStyle: {
    fill: string
    stroke: string
    strokeWidth: number
    alpha: number
    fontSize: number
    fontFamily: string
    textAlign: 'left' | 'center' | 'right'
  }

  setTool: (tool: ToolType) => void
  addElement: (el: CanvasElement) => void
  updateElement: (id: string, attrs: Partial<CanvasElement>) => void
  removeElements: (ids: string[]) => void
  setSelected: (ids: string[]) => void
  setEditingId: (id: string | null) => void
}

export const useStore = create<CanvasState>()(
  subscribeWithSelector((set) => ({
    tool: 'select',
    elements: {},
    selectedIds: [],
    editingId: null,
    currentStyle: {
      fill: '#000000', // 默认文字颜色
      stroke: '#000000',
      strokeWidth: 2,
      alpha: 1,
      fontSize: 20,
      fontFamily: 'Arial',
      textAlign: 'left',
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
  })),
)
