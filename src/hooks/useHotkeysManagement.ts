import { useHotkeys } from 'react-hotkeys-hook'
import { useStore } from '@/stores/canvasStore'

export const useHotkeysManagement = () => {
  const { undo, redo } = useStore()

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
}
