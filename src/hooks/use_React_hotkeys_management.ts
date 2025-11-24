import { useHotkeys } from 'react-hotkeys-hook'
import { useStore } from '@/stores/canvasStore'
import { Notification } from '@arco-design/web-react'

export const useCanvasShortcuts = () => {
  const { setTool, undo, redo, copyElements, pasteElements, selectedIds, elements, groupElements, ungroupElements } =
    useStore()

  // Ctrl+Z 撤销
  useHotkeys(
    'ctrl+z',
    (event) => {
      event.preventDefault()
      undo()
    },
    {},
    [undo],
  )

  // Ctrl+Shift+Z 或 Ctrl+Y 重做
  useHotkeys(
    'ctrl+y, ctrl+shift+z',
    (event) => {
      event.preventDefault()
      redo()
    },
    {},
    [redo],
  )

  // Delete 删除元素
  useHotkeys(
    'delete, backspace',
    (event) => {
      event.preventDefault()
      const state = useStore.getState()
      if (state.selectedIds.length > 0) {
        state.removeElements(state.selectedIds)
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

  // 切换到文字工具
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

  // 切换到图像工具
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
