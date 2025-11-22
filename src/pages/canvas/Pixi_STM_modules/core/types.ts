import type { CanvasElement, ToolType } from '@/stores/canvasStore'

export type InteractionMode =
  | 'idle'
  | 'panning'
  | 'selecting'
  | 'dragging'
  | 'resizing'
  | 'drawing'
  | 'texting'
  | 'erasing'

export type HandleType = 'tl' | 't' | 'tr' | 'r' | 'br' | 'b' | 'bl' | 'l' | 'p0' | 'p1' | 'rotate'

export interface StageManagerState {
  mode: InteractionMode
  startPos: { x: number; y: number }
  currentId: string | null

  // --- 新增状态：用于多选缩放 ---
  // 存储所有选中元素的初始状态快照 (ID -> Element)
  initialElementsMap: Record<string, Partial<CanvasElement>> | null
  // 存储多选时的初始群组包围盒
  initialGroupBounds: { x: number; y: number; width: number; height: number } | null
  // --------------------------

  // 单选时仍然可能用到，但在多选逻辑中主要依赖上面的 Map
  initialElementState: Partial<CanvasElement> | null

  // 用于存储调整大小操作的初始状态
  resizeInitialStates: Record<string, Partial<CanvasElement>> | null

  // 用于存储拖拽操作的初始状态
  dragInitialStates: Record<string, Partial<CanvasElement>> | null

  // 旋转状态(待写)
  //rotationCenter: { x: number; y: number } | null // 旋转中心
  //initialRotationAngle: number | null // 鼠标初始角度

  activeHandle: HandleType | null
  isSpacePressed: boolean
  destroyed: boolean
}

export type { CanvasElement, ToolType }
