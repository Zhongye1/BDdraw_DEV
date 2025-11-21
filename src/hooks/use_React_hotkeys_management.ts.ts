import { useHotkeys } from 'react-hotkeys-hook'
import { useStore } from '@/stores/canvasStore'
import { StageManager } from '@/pages/canvas/Pixi_stageManager'

interface UseCanvasShortcutsProps {
  stageManagerRef: React.RefObject<StageManager | null>
}

export const useCanvasShortcuts = ({ stageManagerRef }: UseCanvasShortcutsProps) => {
  const { selectedIds, removeElements, setTool, copyElements, pasteElements } = useStore()

  // 删除选中元素
  useHotkeys(
    'delete, backspace',
    () => {
      if (selectedIds.length > 0) {
        removeElements(selectedIds)
      }
    },
    {
      enableOnFormTags: false,
      ignoreEventWhen: (event) => event.target instanceof HTMLInputElement,
    },
    [selectedIds, removeElements],
  )

  // 复制元素
  useHotkeys(
    'ctrl+c, cmd+c',
    () => {
      if (selectedIds.length > 0) {
        copyElements(selectedIds)
      }
    },
    {
      enableOnFormTags: false,
      ignoreEventWhen: (event) => event.target instanceof HTMLInputElement,
    },
    [selectedIds, copyElements],
  )

  // 粘贴元素
  useHotkeys(
    'ctrl+v, cmd+v',
    () => {
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
}
