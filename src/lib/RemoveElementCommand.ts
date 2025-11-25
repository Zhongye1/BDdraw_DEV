import { useStore, type CanvasElement } from '@/stores/canvasStore'
import type { Command } from './UndoRedoManager'

interface RemoveElementOperation {
  element: CanvasElement
}

export class RemoveElementCommand implements Command {
  private commandId: string

  constructor(private operation: RemoveElementOperation) {
    // 生成唯一命令ID
    this.commandId = `RemoveElementCommand-${Math.random().toString(36).slice(2, 11)}`
    console.log(`[RemoveElementCommand] 创建命令 ID: ${this.commandId}`)
  }

  execute(): void {
    // 删除元素
    const store = useStore.getState()
    store.removeElements([this.operation.element.id])
  }

  undo(): void {
    // 撤销：重新添加元素
    const store = useStore.getState()
    store.addElement(this.operation.element)

    console.log(`[RemoveElementCommand] 撤销命令 ID: ${this.commandId}`)
  }

  redo(): void {
    // 重做：再次删除元素
    this.execute()
    console.log(`[RemoveElementCommand] 重做命令 ID: ${this.commandId}`)
  }
}
