import { useHotkeys } from 'react-hotkeys-hook'
import { useStore } from '@/stores/canvasStore'
import { Notification } from '@arco-design/web-react'
import { RemoveElementCommand } from '@/lib/RemoveElementCommand'
import { undoRedoManager } from '@/lib/UndoRedoManager'
import { useRef } from 'react'

export const useCanvasShortcuts = () => {
  const { setTool, undo, redo, copyElements, pasteElements, selectedIds, elements, groupElements, ungroupElements } =
    useStore()

  // 使用 Ref 创建一个操作锁，防止短时间内重复触发（解决开发环境双重触发 + 防止按键过快）
  const lockRef = useRef(false)

  /**
   * 通用的节流执行器
   * @param callback 要执行的函数
   * @param delay 冷却时间 (ms)
   */
  const throttleExecute = (callback: () => void, delay = 200) => {
    if (lockRef.current) {
      console.log('[Hotkey] 操作被节流拦截')
      return
    }

    // 立即执行
    callback()

    // 开启锁
    lockRef.current = true
    setTimeout(() => {
      lockRef.current = false
    }, delay)
  }

  // Ctrl+Z 撤销
  useHotkeys(
    'ctrl+z',
    (event) => {
      event.preventDefault()
      // 如果是长按产生的重复事件，直接忽略
      if (event.repeat) return

      // 使用节流执行撤销，避免连续快速撤销导致的状态混乱
      throttleExecute(() => {
        undo()
      }, 100)
    },
    {},
    [undo],
  )

  // Ctrl+Shift+Z 或 Ctrl+Y 重做
  useHotkeys(
    'ctrl+y, ctrl+shift+z',
    (event) => {
      event.preventDefault()
      if (event.repeat) return

      throttleExecute(() => {
        redo()
      }, 100)
    },
    {},
    [redo],
  )

  // Delete 删除元素
  useHotkeys(
    'delete, backspace',
    (event) => {
      // 只有在没有锁定的情况下才阻止默认行为（防止在输入框中无法删除）
      if (!lockRef.current) {
        // 注意：这里通常不需要阻止默认行为，除非确定不是在输入框。
        // useHotkeys 配置了 enableOnFormTags: false，通常会自动处理输入框问题。
        // 但为了保险，可以在 options 里配置 ignoreEventWhen
      }

      if (event.repeat) return

      const state = useStore.getState()
      if (state.selectedIds.length > 0) {
        // 执行删除逻辑...
        const elementsToRemove = state.selectedIds.map((id) => state.elements[id]).filter((el) => el !== undefined)
        elementsToRemove.forEach((element) => {
          const removeCommand = new RemoveElementCommand({ element })
          undoRedoManager.executeCommand(removeCommand)
        })
        state.setSelected([])
      }
    },
    {
      enableOnFormTags: false, // 默认就是 false，不如果不写也可以
      ignoreEventWhen: (event) => {
        // 显式忽略输入框中的按键
        const target = event.target as HTMLElement
        return target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable
      },
    },
    [],
  )

  // Ctrl+C 复制
  useHotkeys(
    'ctrl+c',
    (event) => {
      event.preventDefault()
      if (event.repeat) return // 忽略长按

      // 使用节流锁，解决 React StrictMode 下的两次触发问题
      throttleExecute(() => {
        if (selectedIds.length > 0) {
          copyElements(selectedIds)
          Notification.success({
            closable: false,
            title: '复制成功',
            content: `已复制 ${selectedIds.length} 个元素`,
            duration: 2000, // 自动关闭
          })
        }
      }, 300) // 给稍微长一点的冷却时间，防止用户手抖复制多次
    },
    {
      enableOnFormTags: false,
      ignoreEventWhen: (event) => {
        const target = event.target as HTMLElement
        return target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable
      },
    },
    [selectedIds, copyElements],
  )

  // Ctrl+V 粘贴
  useHotkeys(
    'ctrl+v',
    (event) => {
      event.preventDefault()
      if (event.repeat) {
        console.log('[Hotkey] 忽略重复的粘贴事件')
        return
      }

      // [关键修复] 加锁，防止 React StrictMode 下 hook 执行两次导致粘贴两份
      throttleExecute(() => {
        console.log('[Hotkey] Ctrl+V 粘贴事件触发', {
          timestamp: Date.now(),
          selectedIdsLength: selectedIds.length,
          clipboard: useStore.getState().clipboard?.length,
        })
        pasteElements()
      }, 300)
    },
    {
      enableOnFormTags: false,
      ignoreEventWhen: (event) => {
        const target = event.target as HTMLElement
        return target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable
      },
    },
    [pasteElements],
  )

  // 切换工具 (不需要加锁，因为切换多次状态也是一样的)
  useHotkeys('shift+1', () => setTool('select'), {}, [setTool])
  useHotkeys('shift+2', () => setTool('rect'), {}, [setTool])
  useHotkeys('shift+3', () => setTool('diamond'), {}, [setTool])
  useHotkeys('shift+4', () => setTool('circle'), {}, [setTool])
  useHotkeys('shift+5', () => setTool('arrow'), {}, [setTool])
  useHotkeys('shift+6', () => setTool('line'), {}, [setTool])
  useHotkeys('shift+7', () => setTool('pencil'), {}, [setTool])
  useHotkeys('shift+8', () => setTool('text'), {}, [setTool])
  useHotkeys('shift+9', () => setTool('image'), {}, [setTool])
  useHotkeys('shift+0', () => setTool('eraser'), {}, [setTool])

  // Ctrl+G 分组
  useHotkeys(
    'ctrl+g',
    (event) => {
      event.preventDefault()
      if (event.repeat) return

      throttleExecute(() => {
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
      })
    },
    {},
    [selectedIds, elements, groupElements],
  )

  // Ctrl+Shift+G 取消分组
  useHotkeys(
    'ctrl+shift+g',
    (event) => {
      event.preventDefault()
      if (event.repeat) return

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
      ignoreEventWhen: (event) => {
        const target = event.target as HTMLElement
        return target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable
      },
    },
    [selectedIds, elements, ungroupElements],
  )
}
