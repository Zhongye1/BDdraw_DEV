import React, { useState, useEffect } from 'react'
import { Button } from '@arco-design/web-react'
import { IconRefresh, IconDelete } from '@arco-design/web-react/icon'
import { undoRedoManager } from '@/lib/UndoRedoManager'

interface CommandInfo {
  id: number
  type: string
  name: string
  timestamp: Date
}

const CommandStackConsole: React.FC = () => {
  const [undoStack, setUndoStack] = useState<CommandInfo[]>([])
  const [redoStack, setRedoStack] = useState<CommandInfo[]>([])
  const [isLocked, setIsLocked] = useState(false)

  const refreshStacks = () => {
    // 获取撤销栈信息
    const undoCommands = (undoRedoManager as any).undoStack.map((cmd: any, index: number) => ({
      id: index,
      type: 'undo',
      name: cmd.constructor.name,
      timestamp: new Date(),
    }))

    // 获取重做栈信息
    const redoCommands = (undoRedoManager as any).redoStack.map((cmd: any, index: number) => ({
      id: index,
      type: 'redo',
      name: cmd.constructor.name,
      timestamp: new Date(),
    }))

    setUndoStack(undoCommands)
    setRedoStack(redoCommands)
    setIsLocked(undoRedoManager.isLocked())
  }

  const clearStacks = () => {
    undoRedoManager.clear()
    refreshStacks()
  }

  useEffect(() => {
    refreshStacks()

    // 定期刷新状态
    const interval = setInterval(refreshStacks, 100)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex h-full flex-col bg-gray-900 p-4 text-gray-100">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold">命令栈控制台</h2>
        <div className="flex space-x-2">
          <Button icon={<IconRefresh />} size="small" onClick={refreshStacks}>
            刷新
          </Button>
          <Button icon={<IconDelete />} size="small" status="danger" onClick={clearStacks}>
            清空
          </Button>
        </div>
      </div>

      <div className="mb-4 rounded bg-gray-800 p-2">
        <div className="flex items-center">
          <span className="mr-2">状态:</span>
          <span className={`rounded px-2 py-1 text-xs ${isLocked ? 'bg-red-500' : 'bg-green-500'}`}>
            {isLocked ? '锁定' : '解锁'}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="mb-4 flex flex-1 flex-col">
          <h3 className="mb-2 font-semibold">撤销栈 ({undoStack.length})</h3>
          <div className="flex-1 overflow-y-auto rounded bg-gray-800 p-2">
            {undoStack.length === 0 ? (
              <p className="text-sm text-gray-400">暂无撤销操作</p>
            ) : (
              <ul className="space-y-1">
                {[...undoStack].reverse().map((cmd) => (
                  <li key={cmd.id} className="flex justify-between rounded p-1 text-sm hover:bg-gray-700">
                    <span>{cmd.name}</span>
                    <span className="text-xs text-gray-400">{cmd.timestamp.toLocaleTimeString()}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="flex flex-1 flex-col">
          <h3 className="mb-2 font-semibold">重做栈 ({redoStack.length})</h3>
          <div className="flex-1 overflow-y-auto rounded bg-gray-800 p-2">
            {redoStack.length === 0 ? (
              <p className="text-sm text-gray-400">暂无重做操作</p>
            ) : (
              <ul className="space-y-1">
                {redoStack.map((cmd) => (
                  <li key={cmd.id} className="flex justify-between rounded p-1 text-sm hover:bg-gray-700">
                    <span>{cmd.name}</span>
                    <span className="text-xs text-gray-400">{cmd.timestamp.toLocaleTimeString()}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default CommandStackConsole
