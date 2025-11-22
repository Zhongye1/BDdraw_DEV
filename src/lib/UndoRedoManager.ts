import { useStore } from '@/stores/canvasStore'

export interface Command {
  execute(): void
  undo(): void
  redo(): void
}

export class UndoRedoManager {
  private undoStack: Command[] = []
  private redoStack: Command[] = []
  private locked = false // 防止在执行undo/redo时记录新命令

  // 锁定机制，防止在执行命令时记录新命令
  lock() {
    this.locked = true
  }

  unlock() {
    this.locked = false
  }

  isLocked() {
    return this.locked
  }

  executeCommand(command: Command) {
    if (this.locked) return

    // 执行命令
    command.execute()

    // 将命令添加到撤销栈
    this.undoStack.push(command)

    // 清空重做栈
    this.redoStack = []
  }

  undo() {
    if (this.undoStack.length === 0) return

    this.lock()
    const command = this.undoStack.pop()!
    command.undo()
    this.redoStack.push(command)
    this.unlock()
  }

  redo() {
    if (this.redoStack.length === 0) return

    this.lock()
    const command = this.redoStack.pop()!
    command.redo()
    this.undoStack.push(command)
    this.unlock()
  }

  canUndo() {
    return this.undoStack.length > 0
  }

  canRedo() {
    return this.redoStack.length > 0
  }

  clear() {
    this.undoStack = []
    this.redoStack = []
  }
}

// 全局单例
export const undoRedoManager = new UndoRedoManager()

// 快照命令 - 适用于任何状态变化
export class SnapshotCommand implements Command {
  private prevState: any
  private nextState: any

  constructor(prevState: any, nextState: any) {
    this.prevState = structuredClone(prevState)
    this.nextState = structuredClone(nextState)
  }

  execute(): void {
    // execute在添加到命令栈之前已经执行了
  }

  undo(): void {
    useStore.setState(this.prevState)
  }

  redo(): void {
    useStore.setState(this.nextState)
  }
}
