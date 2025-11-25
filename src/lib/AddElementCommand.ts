import { useStore, type CanvasElement } from '@/stores/canvasStore'
import type { Command } from './UndoRedoManager'

interface AddElementOperation {
  element: CanvasElement
}

export class AddElementCommand implements Command {
  private commandId: string
  private finalElementState: CanvasElement | null = null

  constructor(private operation: AddElementOperation) {
    // 生成唯一命令ID
    this.commandId = `AddElementCommand-${Math.random().toString(36).slice(2, 11)}`
    //console.log(`[AddElementCommand] 创建命令 ID: ${this.commandId}`, AddElementCommand)
  }

  execute(): void {
    // 添加元素
    const store = useStore.getState()
    store.addElement(this.operation.element)
  }

  undo(): void {
    // 获取元素的最终状态
    const currentState = useStore.getState()
    if (currentState.elements[this.operation.element.id]) {
      this.finalElementState = { ...currentState.elements[this.operation.element.id] }
    }

    // 撤销：删除元素
    const store = useStore.getState()
    store.removeElements([this.operation.element.id])

    //console.log(`[AddElementCommand] 撤销命令 ID: ${this.commandId}`)
  }

  redo(): void {
    // 重做：重新添加元素
    // 使用元素的最终状态（如果有）或者原始状态
    const elementToAdd = this.finalElementState || this.operation.element

    const store = useStore.getState()
    store.addElement(elementToAdd)

    //console.log(`[AddElementCommand] 重做命令 ID: ${this.commandId}`)
  }
}
