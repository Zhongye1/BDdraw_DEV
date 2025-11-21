import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'

// 在文件顶部添加或更新类型定义
export type ToolType = 'select' | 'rect' | 'circle' | 'triangle' | 'hand'

// 定义元素结构
export interface CanvasElement {
  id: string
  type: 'rect' | 'circle' | 'triangle'
  x: number
  y: number
  width: number
  height: number
  fill: string
  stroke: string
  strokeWidth: number
  radius?: number
  alpha?: number
}

interface CanvasState {
  tool: ToolType
  elements: Record<string, CanvasElement>
  selectedIds: string[]

  // 默认样式
  currentStyle: {
    fill: string
    stroke: string
    strokeWidth: number
    radius: number
    alpha: number
  }

  // Actions
  setTool: (tool: ToolType) => void
  addElement: (el: CanvasElement) => void
  updateElement: (id: string, attrs: Partial<CanvasElement>) => void
  removeElements: (ids: string[]) => void
  setSelected: (ids: string[]) => void
}

export const useStore = create<CanvasState>()(
  subscribeWithSelector((set) => ({
    tool: 'select', // 默认改为 select
    elements: {},
    selectedIds: [],
    currentStyle: {
      fill: '#3b82f6',
      stroke: '#000000',
      strokeWidth: 2,
      radius: 0,
      alpha: 1,
    },

    setTool: (tool) => set({ tool, selectedIds: [] }), // 切换工具时清空选中

    addElement: (el) =>
      set((state) => ({
        elements: { ...state.elements, [el.id]: el },
        // 新增元素后自动选中它，并切回选择模式（可选，仿 Figma 行为）
        // selectedIds: [el.id],
        // tool: 'select'
      })),

    updateElement: (id, attrs) =>
      set((state) => {
        if (!state.elements[id]) return state
        return {
          elements: {
            ...state.elements,
            [id]: { ...state.elements[id], ...attrs },
          },
        }
      }),

    removeElements: (ids) =>
      set((state) => {
        const newElements = { ...state.elements }
        ids.forEach((id) => delete newElements[id])
        return { elements: newElements, selectedIds: [] }
      }),

    setSelected: (ids) => set({ selectedIds: ids }),
  })),
)
