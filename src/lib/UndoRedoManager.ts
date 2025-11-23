import { logger } from '@/components/console/consolements'
import { consoleCommandStack } from '@/components/console/canvas_commandstack'

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
    logger.debug('[UndoRedoManager] 管理器已锁定')
    consoleCommandStack.logCommandExecution('锁定管理器')
  }

  unlock() {
    this.locked = false
    logger.debug('[UndoRedoManager] 管理器已解锁')
    consoleCommandStack.logCommandExecution('解锁管理器')
  }

  isLocked() {
    return this.locked
  }

  // [新增] 用于在操作结束时更新栈顶命令的最终状态
  updateLatestSnapshot(nextState: any) {
    if (this.undoStack.length === 0) return
    const lastCommand = this.undoStack[this.undoStack.length - 1]

    // 确保只更新 SnapshotCommand 类型的命令
    if (lastCommand instanceof SnapshotCommand) {
      lastCommand.updateNextState(nextState)
      logger.debug('[UndoRedoManager] 已更新最近一次快照的最终状态')
    }
  }

  executeCommand(command: Command) {
    if (this.locked) {
      logger.debug('[UndoRedoManager] 管理器被锁定，忽略命令')
      consoleCommandStack.logCommandExecution('忽略命令', '管理器已锁定')
      return
    }

    // 执行命令
    command.execute()
    // 修改这行，使其能正确传递命令ID（如果命令有commandId属性）
    if ('commandId' in command) {
      consoleCommandStack.logCommandExecution(command.constructor.name, (command as any).commandId)
    } else {
      consoleCommandStack.logCommandExecution(command.constructor.name)
    }

    // 将命令添加到撤销栈
    this.undoStack.push(command)
    logger.debug('[UndoRedoManager] 命令已添加到撤销栈，当前撤销栈大小:', this.undoStack.length)

    // 清空重做栈
    this.redoStack = []
    logger.debug('[UndoRedoManager] 清空重做栈')
    consoleCommandStack.showStackStatus()
  }

  undo() {
    if (this.undoStack.length === 0) {
      logger.log('[UndoRedoManager] 撤销栈为空，无法撤销')
      consoleCommandStack.logUndo('失败', '撤销栈为空')
      return
    }

    logger.log('[UndoRedoManager] 执行撤销操作')
    this.lock()
    const command = this.undoStack.pop()!
    command.undo()
    this.redoStack.push(command)
    this.unlock()

    logger.log(
      '[UndoRedoManager] 撤销完成，当前撤销栈大小:',
      this.undoStack.length,
      '重做栈大小:',
      this.redoStack.length,
    )

    consoleCommandStack.logUndo(command.constructor.name)
    consoleCommandStack.showStackStatus()
  }

  redo() {
    if (this.redoStack.length === 0) {
      logger.debug('[UndoRedoManager] 重做栈为空，无法重做')
      consoleCommandStack.logRedo('失败', '重做栈为空')
      return
    }

    logger.debug('[UndoRedoManager] 执行重做操作')
    this.lock()
    const command = this.redoStack.pop()!
    command.redo()
    this.undoStack.push(command)
    this.unlock()

    logger.log(
      '[UndoRedoManager] 重做完成，当前撤销栈大小:',
      this.undoStack.length,
      '重做栈大小:',
      this.redoStack.length,
    )

    consoleCommandStack.logRedo(command.constructor.name)
    consoleCommandStack.showStackStatus()
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
    logger.log('[UndoRedoManager] 清空撤销/重做栈')
    consoleCommandStack.clearStackLog()
    consoleCommandStack.showStackStatus()
  }

  // 用于调试的方法，获取当前栈状态
  getStackStatus() {
    return {
      undoStackSize: this.undoStack.length,
      redoStackSize: this.redoStack.length,
      isLocked: this.locked,
    }
  }
}

// 全局单例
export const undoRedoManager = new UndoRedoManager()

// 快照命令 - 适用于任何状态变化
export class SnapshotCommand implements Command {
  private prevState: any
  private nextState: any
  private commandId: number
  private description: string // 改名为 description，语义更清晰

  constructor(prevState: any, nextState: any, description: string) {
    // 不使用 structuredClone，而是直接引用对象
    this.prevState = prevState
    this.nextState = nextState
    this.description = description || '状态变更' // 确保始终有描述
    // 生成唯一的命令ID用于调试
    this.commandId = Date.now() % 1000000
    logger.warn(`[SnapshotCommand] 创建命令 ID: ${this.commandId}`, {
      description: this.description,
      prevState,
      nextState,
    })
    consoleCommandStack.logSnapshotCommandCreate(this.commandId, this.description)
  }

  // [新增] 更新 nextState 的方法
  updateNextState(nextState: any) {
    this.nextState = nextState
    logger.debug(`[SnapshotCommand] 命令 ID: ${this.commandId} 的最终状态已更新`)
  }

  execute(): void {
    // execute在添加到命令栈之前已经执行了
    logger.warn(`[SnapshotCommand] 执行命令 ID: ${this.commandId}`)
    consoleCommandStack.logCommandExecution('SnapshotCommand', this.commandId)
  }

  undo(): void {
    logger.warn(`[SnapshotCommand] 撤销命令 ID: ${this.commandId}`, this.prevState)
    consoleCommandStack.logUndo('SnapshotCommand', this.commandId)
    // 在使用时动态导入并获取原始的 setState 方法绕过中间件
    import('@/stores/canvasStore').then((module) => {
      const { setState: originalSetState } = module.useStore
      originalSetState(this.prevState)
    })
  }

  redo(): void {
    logger.warn(`[SnapshotCommand] 重做命令 ID: ${this.commandId}`, this.nextState)
    consoleCommandStack.logRedo('SnapshotCommand', this.commandId)
    // 在使用时动态导入并获取原始的 setState 方法绕过中间件
    import('@/stores/canvasStore').then((module) => {
      const { setState: originalSetState } = module.useStore
      originalSetState(this.nextState)
    })
  }
}
