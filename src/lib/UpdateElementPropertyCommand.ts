import { useStore } from '@/stores/canvasStore'
import type { Command } from './UndoRedoManager'

interface UpdateElementPropertyOperation {
  id: string
  property: string
  oldValue: any
  newValue: any
}

export class UpdateElementPropertyCommand implements Command {
  private commandId: string

  constructor(private operation: UpdateElementPropertyOperation, private description: string = '更新元素属性') {
    // 生成唯一命令ID
    this.commandId = `UpdateElementPropertyCommand-${Math.random().toString(36).slice(2, 11)}`
    console.log(`[UpdateElementPropertyCommand] 创建命令 ID: ${this.commandId}`, operation)
  }

  execute(): void {
    // 执行更新操作
    const store = useStore.getState()
    store.updateElement(this.operation.id, { [this.operation.property]: this.operation.newValue })

    console.log(`[UpdateElementPropertyCommand] 执行命令 ID: ${this.commandId}`)
  }

  undo(): void {
    // 撤销：恢复到旧值
    const store = useStore.getState()
    store.updateElement(this.operation.id, { [this.operation.property]: this.operation.oldValue })

    console.log(`[UpdateElementPropertyCommand] 撤销命令 ID: ${this.commandId}`)
  }

  redo(): void {
    // 重做：恢复到新值
    this.execute()

    console.log(`[UpdateElementPropertyCommand] 重做命令 ID: ${this.commandId}`)
  }
}
