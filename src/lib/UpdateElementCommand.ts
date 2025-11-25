import { useStore, type CanvasElement } from '@/stores/canvasStore'
import type { Command } from './UndoRedoManager'
//import { consoleCommandStack } from '@/components/debug/canvas_commandstack'

interface UpdateOperation {
  id: string
  initialAttrs: Partial<CanvasElement> // 修改前的属性 (Snapshot A)
  finalAttrs: Partial<CanvasElement> // 修改后的属性 (Snapshot B)
}

export class UpdateElementCommand implements Command {
  private commandId: string

  constructor(private operations: UpdateOperation[], private operationType: string = '更新元素') {
    // 生成唯一命令ID
    this.commandId = `UpdateElementCommand-${Math.random().toString(36).slice(2, 11)}`
    console.log(`[UpdateElementCommand] 创建命令 ID: ${this.commandId}`)

    // 记录操作日志
    operations.forEach((op) => {
      // consoleCommandStack.logUpdateCommandCreate(op.id, operationType)
    })
  }

  execute(): void {
    // 应用最终状态
    const store = useStore.getState()
    this.operations.forEach((op) => {
      store.updateElement(op.id, op.finalAttrs)
    })

    //consoleCommandStack.logCommandExecution('UpdateElementCommand', this.commandId)
  }

  undo(): void {
    // 撤销：恢复到 initialAttrs
    const store = useStore.getState()
    this.operations.forEach((op) => {
      store.updateElement(op.id, op.initialAttrs)
    })

    //consoleCommandStack.logUndo('UpdateElementCommand', this.commandId)
  }

  redo(): void {
    // 重做：恢复到 finalAttrs
    const store = useStore.getState()
    this.operations.forEach((op) => {
      store.updateElement(op.id, op.finalAttrs)
    })

    //consoleCommandStack.logRedo('UpdateElementCommand', this.commandId)
  }
}
