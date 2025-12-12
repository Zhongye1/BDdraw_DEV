import { useHotkeys } from 'react-hotkeys-hook'
import { useStore } from '@/stores/canvasStore'
import { Notification } from '@arco-design/web-react'
import { RemoveElementCommand } from '@/lib/RemoveElementCommand'
import { undoRedoManager } from '@/lib/UndoRedoManager'
import { useRef } from 'react'
import { detectPlatform, getModifierKeyCode } from '@/lib/platformUtils'

// 默认快捷键配置
const getDefaultShortcuts = () => {
  const platform = detectPlatform()
  const modifierKey = getModifierKeyCode(platform)

  return {
    undo: `${modifierKey}+z`,
    redo: `${modifierKey}+y, ${modifierKey}+shift+z`,
    delete: 'delete, backspace',
    copy: `${modifierKey}+c`,
    paste: `${modifierKey}+v`,
    group: `${modifierKey}+g`,
    ungroup: `${modifierKey}+shift+g`,
    selectTool: 'shift+1',
    rectTool: 'shift+2',
    diamondTool: 'shift+3',
    circleTool: 'shift+4',
    arrowTool: 'shift+5',
    lineTool: 'shift+6',
    pencilTool: 'shift+7',
    textTool: 'shift+8',
    imageTool: 'shift+9',
    eraserTool: 'shift+0',
  }
}

// 从localStorage获取用户自定义快捷键配置
const getUserShortcuts = () => {
  try {
    const saved = localStorage.getItem('customShortcuts')
    if (saved) {
      const parsed = JSON.parse(saved)
      // 合并默认配置和用户配置，防止缺少某些键
      return { ...getDefaultShortcuts(), ...parsed }
    }
  } catch (e) {
    console.warn('Failed to parse custom shortcuts from localStorage', e)
  }
  return getDefaultShortcuts()
}

export const useCanvasShortcuts = () => {
  const { setTool, undo, redo, copyElements, pasteElements, selectedIds, elements, groupElements, ungroupElements } =
    useStore()

  // 获取当前快捷键配置
  const shortcuts = getUserShortcuts()

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
    shortcuts.undo,
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
    shortcuts.redo,
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
    shortcuts.delete,
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
    shortcuts.copy,
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
    shortcuts.paste,
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
  useHotkeys(shortcuts.selectTool, () => setTool('select'), {}, [setTool])
  useHotkeys(shortcuts.rectTool, () => setTool('rect'), {}, [setTool])
  useHotkeys(shortcuts.diamondTool, () => setTool('diamond'), {}, [setTool])
  useHotkeys(shortcuts.circleTool, () => setTool('circle'), {}, [setTool])
  useHotkeys(shortcuts.arrowTool, () => setTool('arrow'), {}, [setTool])
  useHotkeys(shortcuts.lineTool, () => setTool('line'), {}, [setTool])
  useHotkeys(shortcuts.pencilTool, () => setTool('pencil'), {}, [setTool])
  useHotkeys(shortcuts.textTool, () => setTool('text'), {}, [setTool])
  useHotkeys(shortcuts.imageTool, () => setTool('image'), {}, [setTool])
  useHotkeys(shortcuts.eraserTool, () => setTool('eraser'), {}, [setTool])

  // Ctrl+G 分组
  useHotkeys(
    shortcuts.group,
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
    shortcuts.ungroup,
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
