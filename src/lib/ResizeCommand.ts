// --- START OF FILE UpdateElementCommand.ts ---
import { useStore, type CanvasElement } from '@/stores/canvasStore'
import type { Command } from './UndoRedoManager'

interface UpdateOperation {
  id: string
  initialAttrs: Partial<CanvasElement>
  finalAttrs: Partial<CanvasElement>
}

export class UpdateElementCommand implements Command {
  private operations: UpdateOperation[]
  private commandId: number

  constructor(operations: UpdateOperation[]) {
    this.operations = operations
    this.commandId = Date.now() % 1000000
    console.log(`[UpdateElementCommand] 创建命令 ID: ${this.commandId}`, operations)
  }

  execute(): void {
    // 执行时什么都不做，因为交互过程中状态已经更新到 final 了
    console.log(`[UpdateElementCommand] 执行命令 ID: ${this.commandId}`)
  }

  undo(): void {
    console.log(`[UpdateElementCommand] 撤销命令 ID: ${this.commandId}`)
    const updates: Record<string, Partial<CanvasElement>> = {}
    this.operations.forEach((op) => {
      updates[op.id] = op.initialAttrs
    })

    useStore.setState((state) => {
      const newElements = { ...state.elements }
      Object.entries(updates).forEach(([id, attrs]) => {
        if (newElements[id]) {
          newElements[id] = { ...newElements[id], ...attrs }
        }
      })
      return { elements: newElements }
    })
  }

  redo(): void {
    console.log(`[UpdateElementCommand] 重做命令 ID: ${this.commandId}`)
    const updates: Record<string, Partial<CanvasElement>> = {}
    this.operations.forEach((op) => {
      updates[op.id] = op.finalAttrs
    })

    useStore.setState((state) => {
      const newElements = { ...state.elements }
      Object.entries(updates).forEach(([id, attrs]) => {
        if (newElements[id]) {
          newElements[id] = { ...newElements[id], ...attrs }
        }
      })
      return { elements: newElements }
    })
  }
}
