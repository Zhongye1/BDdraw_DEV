import type { CanvasElement } from '@/stores/canvasStore'

export type { CanvasElement }

export type HandleType = 'tl' | 't' | 'tr' | 'r' | 'br' | 'b' | 'bl' | 'l' | 'p0' | 'p1' | 'rotate'

export interface StageManagerState {
  mode: 'idle' | 'panning' | 'selecting' | 'dragging' | 'resizing' | 'drawing' | 'texting' | 'erasing' | 'rotating'
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

  // 旋转状态
  rotationInitialStates: Record<
    string,
    {
      x: number
      y: number
      width: number
      height: number
      rotation: number
      type: string // 元素类型，用于区分组元素
      cx: number // 元素中心点 x
      cy: number // 元素中心点 y
    }
  > | null
  rotationCenter: { x: number; y: number } | null // 旋转中心（群组中心或单元素中心）
  startRotationAngle: number | null // 鼠标按下时的初始角度

  activeHandle: HandleType | null
  isSpacePressed: boolean
  destroyed: boolean

  // [新增] 用于解决旋转时框大小抖动问题
  initialSelectionBounds: { x: number; y: number; width: number; height: number } | null
  currentRotationAngle: number | null
}
