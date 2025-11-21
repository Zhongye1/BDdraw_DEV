import type { CanvasElement, ToolType } from '@/stores/canvasStore'

export type InteractionMode = 'idle' | 'panning' | 'selecting' | 'dragging' | 'resizing' | 'drawing'
export type HandleType = 'tl' | 't' | 'tr' | 'r' | 'br' | 'b' | 'bl' | 'l' | 'p0' | 'p1'

export interface StageManagerState {
  mode: InteractionMode
  startPos: { x: number; y: number }
  currentId: string | null
  initialElementState: Partial<CanvasElement> | null
  activeHandle: HandleType | null
  isSpacePressed: boolean
  destroyed: boolean
}

export type { CanvasElement, ToolType }
