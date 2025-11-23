import { logger } from '@/components/console/consolements'
import { undoRedoManager } from '@/lib/UndoRedoManager'

// 创建命令栈专用logger
const commandStackLogger = logger.child('CommandStack')

/**
 * 控制台命令栈操作类
 * 提供对撤销/重做命令栈的监控和日志记录功能
 */
class ConsoleCommandStack {
  /**
   * 记录快照命令的创建
   * @param commandId 命令ID
   * @param type 命令类型
   */
  logSnapshotCommandCreate(commandId: number, type: string) {
    commandStackLogger.info(`[快照命令] 创建 ${type} 命令 ID: ${commandId}`)
  }

  /**
   * 记录更新命令的创建
   * @param elementId 元素ID
   * @param operation 操作类型 (移动、缩放等)
   */
  logUpdateCommandCreate(elementId: string, operation: string) {
    commandStackLogger.info(`[更新命令] 元素 "${elementId}" 执行 "${operation}" 操作`)
  }

  /**
   * 记录命令执行
   * @param commandType 命令类型
   * @param commandId 命令ID
   */
  logCommandExecution(commandType: string, commandId?: number | string) {
    //commandStackLogger.debug(`[执行] ${commandType} 命令 ID: ${commandId}`)
  }

  /**
   * 记录撤销操作
   * @param commandType 命令类型
   * @param commandId 命令ID
   */
  logUndo(commandType: string, commandId?: number | string) {
    if (commandId) {
      commandStackLogger.info(`[撤销] ${commandType} 命令 ID: ${commandId}`)
    } else {
      commandStackLogger.info(`[撤销] ${commandType}`)
    }
  }

  /**
   * 记录重做操作
   * @param commandType 命令类型
   * @param commandId 命令ID
   */
  logRedo(commandType: string, commandId?: number | string) {
    if (commandId) {
      commandStackLogger.info(`[重做] ${commandType} 命令 ID: ${commandId}`)
    } else {
      commandStackLogger.info(`[重做] ${commandType}`)
    }
  }

  /**
   * 显示当前命令栈状态
   */
  showStackStatus() {
    const undoCount = undoRedoManager['undoStack'].length
    const redoCount = undoRedoManager['redoStack'].length

    commandStackLogger.log(`命令栈状态 -> 撤销栈: ${undoCount} 个命令, 重做栈: ${redoCount} 个命令`)

    if (undoCount > 0) {
      const undoCommands = undoRedoManager['undoStack']
        .map((cmd, index) => `${index + 1}.${cmd.constructor.name}`)
        .join(', ')
      // 直接打印撤销栈内容
      console.warn('撤销栈:', undoRedoManager['undoStack'])
    }

    if (redoCount > 0) {
      const redoCommands = undoRedoManager['redoStack']
        .map((cmd, index) => `${index + 1}.${cmd.constructor.name}`)
        .join(', ')
      // 直接打印重做栈内容
      console.warn('重做栈:', undoRedoManager['redoStack'])
    }
  }

  /**
   * 清空命令栈日志
   */
  clearStackLog() {
    commandStackLogger.success('命令栈已清空')
  }
}

// 导出全局实例
export const consoleCommandStack = new ConsoleCommandStack()
