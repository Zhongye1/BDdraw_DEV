import { useHotkeys } from 'react-hotkeys-hook'
import { useStore } from '@/stores/canvasStore'
import { Notification } from '@arco-design/web-react'
import { RemoveElementCommand } from '@/lib/RemoveElementCommand'
import { undoRedoManager } from '@/lib/UndoRedoManager'
import { useRef, useEffect } from 'react'

export const useCanvasShortcuts = () => {
  const { setTool, undo, redo, copyElements, pasteElements, selectedIds, elements, groupElements, ungroupElements } =
    useStore()

  // 防抖定时器
  const undoDebounceTimer = useRef<NodeJS.Timeout | null>(null)
  const redoDebounceTimer = useRef<NodeJS.Timeout | null>(null)

  // 清理定时器
  useEffect(() => {
    return () => {
      if (undoDebounceTimer.current) {
        clearTimeout(undoDebounceTimer.current)
      }
      if (redoDebounceTimer.current) {
        clearTimeout(redoDebounceTimer.current)
      }
    }
  }, [])

  // 防抖的undo函数
  const debouncedUndo = () => {
    if (undoDebounceTimer.current) {
      clearTimeout(undoDebounceTimer.current)
    }
    undoDebounceTimer.current = setTimeout(() => {
      undo()
    }, 100) // 100ms防抖
  }

  // 防抖的redo函数
  const debouncedRedo = () => {
    if (redoDebounceTimer.current) {
      clearTimeout(redoDebounceTimer.current)
    }
    redoDebounceTimer.current = setTimeout(() => {
      redo()
    }, 100) // 100ms防抖
  }

  // Ctrl+Z 撤销
  useHotkeys(
    'ctrl+z',
    (event) => {
      event.preventDefault()
      debouncedUndo()
    },
    {},
    [debouncedUndo],
  )

  // Ctrl+Shift+Z 或 Ctrl+Y 重做
  useHotkeys(
    'ctrl+y, ctrl+shift+z',
    (event) => {
      event.preventDefault()
      debouncedRedo()
    },
    {},
    [debouncedRedo],
  )

  // Delete 删除元素
  useHotkeys(
    'delete, backspace',
    (event) => {
      event.preventDefault()
      const state = useStore.getState()
      if (state.selectedIds.length > 0) {
        // 收集要删除的元素
        const elementsToRemove = state.selectedIds.map((id) => state.elements[id]).filter((el) => el !== undefined)

        // 创建并执行删除命令
        elementsToRemove.forEach((element) => {
          const removeCommand = new RemoveElementCommand({ element })
          undoRedoManager.executeCommand(removeCommand)
        })

        // 更新选中状态
        state.setSelected([])
      }
    },
    {},
    [],
  )

  // Ctrl+C 复制
  useHotkeys(
    'ctrl+c',
    (event) => {
      event.preventDefault()
      if (selectedIds.length > 0) {
        copyElements(selectedIds)
        Notification.success({
          closable: false,
          title: '复制成功',
          content: `已复制 ${selectedIds.length} 个元素`,
        })
      }
    },
    {
      enableOnFormTags: false,
      ignoreEventWhen: (event) => event.target instanceof HTMLInputElement,
    },
    [selectedIds, copyElements],
  )

  // Ctrl+V 粘贴
  useHotkeys(
    'ctrl+v',
    (event) => {
      event.preventDefault()
      pasteElements()
    },
    {
      enableOnFormTags: false,
      ignoreEventWhen: (event) => event.target instanceof HTMLInputElement,
    },
    [pasteElements],
  )

  // 切换到选择工具
  useHotkeys(
    'shift+1',
    () => {
      setTool('select')
    },
    {
      enableOnFormTags: false,
      ignoreEventWhen: (event) => event.target instanceof HTMLInputElement,
    },
    [setTool],
  )

  // 切换到矩形工具
  useHotkeys(
    'shift+2',
    () => {
      setTool('rect')
    },
    {
      enableOnFormTags: false,
      ignoreEventWhen: (event) => event.target instanceof HTMLInputElement,
    },
    [setTool],
  )

  // 切换棱形工具
  useHotkeys(
    'shift+3',
    () => {
      setTool('diamond')
    },
    {
      enableOnFormTags: false,
      ignoreEventWhen: (event) => event.target instanceof HTMLInputElement,
    },
    [setTool],
  )
  // 切换到圆形工具
  useHotkeys(
    'shift+4',
    () => {
      setTool('circle')
    },
    {
      enableOnFormTags: false,
      ignoreEventWhen: (event) => event.target instanceof HTMLInputElement,
    },
    [setTool],
  )

  // 切换到箭头工具
  useHotkeys(
    'shift+5',
    () => {
      setTool('arrow')
    },
    {
      enableOnFormTags: false,
      ignoreEventWhen: (event) => event.target instanceof HTMLInputElement,
    },
    [setTool],
  )

  // 切换到直线工具
  useHotkeys(
    'shift+6',
    () => {
      setTool('line')
    },
    {
      enableOnFormTags: false,
      ignoreEventWhen: (event) => event.target instanceof HTMLInputElement,
    },
    [setTool],
  )

  // 切换到铅笔工具
  useHotkeys(
    'shift+7',
    () => {
      setTool('pencil')
    },
    {
      enableOnFormTags: false,
      ignoreEventWhen: (event) => event.target instanceof HTMLInputElement,
    },
    [setTool],
  )

  // 切换到文本工具
  useHotkeys(
    'shift+8',
    () => {
      setTool('text')
    },
    {
      enableOnFormTags: false,
      ignoreEventWhen: (event) => event.target instanceof HTMLInputElement,
    },
    [setTool],
  )

  // 切换到图像工具
  useHotkeys(
    'shift+9',
    () => {
      setTool('image')
    },
    {
      enableOnFormTags: false,
      ignoreEventWhen: (event) => event.target instanceof HTMLInputElement,
    },
    [setTool],
  )

  // 切换到橡皮擦工具
  useHotkeys(
    'shift+0',
    () => {
      setTool('eraser')
    },
    {
      enableOnFormTags: false,
      ignoreEventWhen: (event) => event.target instanceof HTMLInputElement,
    },
    [setTool],
  )

  // Ctrl+G 分组
  useHotkeys(
    'ctrl+g',
    (event) => {
      event.preventDefault()
      if (selectedIds.length > 1) {
        groupElements(selectedIds)
        Notification.success({
          closable: false,
          title: '分组成功',
          content: `已将 ${selectedIds.length} 个元素分组`,
        })
      } else {
        Notification.warning({
          closable: false,
          title: '无法分组',
          content: '请选择至少两个元素进行分组',
        })
      }
    },
    {
      enableOnFormTags: false,
      ignoreEventWhen: (event) => event.target instanceof HTMLInputElement,
    },
    [selectedIds, elements, groupElements],
  )

  // Ctrl+Shift+G 取消分组
  useHotkeys(
    'ctrl+shift+g',
    (event) => {
      event.preventDefault()
      const selectedGroups = selectedIds.filter((id) => elements[id] && elements[id].type === 'group')

      if (selectedGroups.length > 0) {
        ungroupElements(selectedGroups)
        Notification.success({
          closable: false,
          title: '取消分组成功',
          content: `已取消 ${selectedGroups.length} 个组的分组`,
        })
      } else {
        Notification.warning({
          closable: false,
          title: '无法取消分组',
          content: '请选择一个分组元素',
        })
      }
    },
    {
      enableOnFormTags: false,
      ignoreEventWhen: (event) => event.target instanceof HTMLInputElement,
    },
    [selectedIds, elements, ungroupElements],
  )
}
