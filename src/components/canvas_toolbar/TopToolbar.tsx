// src/components/TopToolbar.tsx
import React, { useState, useMemo } from 'react'
import { Notification } from '@arco-design/web-react'
import { useStore } from '@/stores/canvasStore'
import {
  MousePointer2,
  Hand,
  Square,
  Diamond,
  Circle,
  ArrowRight,
  Minus,
  Pencil,
  Type,
  Image as ImageIcon,
  Eraser,
  //Lock,
  //Unlock,
  LayoutGrid, // 用作最后的那个库图标
  RotateCcw,
  RotateCw,
  Group,
  Ungroup,
  ImageDown,
} from 'lucide-react'
import ImageInsertModal from '@/components/image-insert-modal'
import ExportCanvasModal from '@/components/header/contents/ExportCanvasModal'

// 默认快捷键配置
const DEFAULT_SHORTCUTS = {
  undo: 'ctrl+z',
  redo: 'ctrl+y, ctrl+shift+z',
  delete: 'delete, backspace',
  copy: 'ctrl+c',
  paste: 'ctrl+v',
  group: 'ctrl+g',
  ungroup: 'ctrl+shift+g',
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

// 从localStorage获取用户自定义快捷键配置
const getUserShortcuts = () => {
  try {
    const saved = localStorage.getItem('customShortcuts')
    if (saved) {
      const parsed = JSON.parse(saved)
      // 合并默认配置和用户配置，防止缺少某些键
      return { ...DEFAULT_SHORTCUTS, ...parsed }
    }
  } catch (e) {
    console.warn('Failed to parse custom shortcuts from localStorage', e)
  }
  return DEFAULT_SHORTCUTS
}

// 格式化快捷键显示
const formatShortcut = (shortcut: string): string => {
  if (!shortcut) return ''

  // 获取第一个快捷键组合（如果有多个用逗号分隔）
  const firstCombo = shortcut.split(',')[0].trim()

  // 提取最后一个按键作为显示（例如从 'shift+1' 提取 '1'）
  const parts = firstCombo.split('+')
  const lastPart = parts[parts.length - 1]

  // 特殊处理数字键
  if (lastPart.startsWith('digit')) {
    return lastPart.replace('digit', '')
  }

  return lastPart
}

// 添加分组功能函数
const groupElements = (elementIds: string[]) => {
  const { groupElements } = useStore.getState()
  groupElements(elementIds)
  Notification.success({
    closable: false,
    title: '分组成功',
    content: `已将 ${elementIds.length} 个元素分组`,
  })
}

// 添加取消分组功能函数
const ungroupElements = (groupIds: string[]) => {
  const { ungroupElements } = useStore.getState()
  ungroupElements(groupIds)
  Notification.success({
    closable: false,
    title: '取消分组成功',
    content: '已取消选中组的分组',
  })
}

export default function TopToolbar() {
  const { tool, setTool, undo, redo, canUndo, canRedo } = useStore()
  //const [locked, setLocked] = useState(false)
  const [imageModalVisible, setImageModalVisible] = useState(false)

  // 添加导出相关的状态
  const [exportModalVisible, setExportModalVisible] = useState(false)

  // 获取当前快捷键配置
  const shortcuts = useMemo(() => getUserShortcuts(), [])

  // 简单的 className 拼接函数（如果你没有引入 clsx/tailwind-merge）
  const cls = (...classes: (string | undefined | boolean)[]) => classes.filter(Boolean).join(' ')

  // 工具栏配置
  // 顺序: 锁 | 手 | 选择 | 矩形 | 菱形 | 圆 | 箭头 | 线 | 笔 | 文字 | 图片 | 橡皮 | 分组 | 取消分组 | 库
  const tools = [
    /*{ // 锁功能还没写完
      id: 'lock',
      type: 'action',
      icon: locked ? Lock : Unlock,
      label: locked ? 'Unlock (Ctrl+Shift+L)' : 'Lock (Ctrl+Shift+L)',
      onClick: () => setLocked(!locked),
    },*/
    { isSeparator: true },
    {
      id: 'hand',
      value: 'hand',
      icon: Hand,
      label: 'Hand tool (H)',
      shortcut: '',
    },
    {
      id: 'select',
      value: 'select',
      icon: MousePointer2,
      label: 'Selection (V)',
      shortcut: formatShortcut(shortcuts.selectTool),
    },
    {
      id: 'rect',
      value: 'rect',
      icon: Square,
      label: 'Rectangle (R)',
      shortcut: formatShortcut(shortcuts.rectTool),
    },
    {
      id: 'diamond',
      value: 'diamond',
      icon: Diamond,
      label: 'Diamond (D)',
      shortcut: formatShortcut(shortcuts.diamondTool),
    },
    {
      id: 'circle',
      value: 'circle',
      icon: Circle,
      label: 'Ellipse (E)',
      shortcut: formatShortcut(shortcuts.circleTool),
    },
    {
      id: 'arrow',
      value: 'arrow',
      icon: ArrowRight,
      label: 'Arrow (A)',
      shortcut: formatShortcut(shortcuts.arrowTool),
    },
    {
      id: 'line',
      value: 'line',
      icon: Minus,
      label: 'Line (L)',
      shortcut: formatShortcut(shortcuts.lineTool),
    },
    {
      id: 'pencil',
      value: 'pencil',
      icon: Pencil,
      label: 'Draw (P)',
      shortcut: formatShortcut(shortcuts.pencilTool),
    },
    {
      id: 'text',
      value: 'text',
      icon: Type,
      label: 'Text (T)',
      shortcut: formatShortcut(shortcuts.textTool),
    },
    {
      id: 'image',
      value: 'image',
      icon: ImageIcon,
      label: 'Insert image',
      shortcut: formatShortcut(shortcuts.imageTool),
      onClick: () => setImageModalVisible(true),
    },
    {
      id: 'eraser',
      value: 'eraser',
      icon: Eraser,
      label: 'Eraser (E)',
      shortcut: formatShortcut(shortcuts.eraserTool),
    },
    { isSeparator: true },
    {
      id: 'group',
      type: 'action',
      icon: Group,
      label: 'Group Elements (Ctrl+G)',
      onClick: () => {
        const state = useStore.getState()
        if (state.selectedIds.length > 1) {
          groupElements(state.selectedIds)
        } else {
          Notification.warning({
            closable: false,
            title: '无法分组',
            content: '请选择至少两个元素进行分组',
          })
        }
      },
    },
    {
      id: 'ungroup',
      type: 'action',
      icon: Ungroup,
      label: 'Ungroup Elements (Ctrl+Shift+G)',
      onClick: () => {
        const state = useStore.getState()
        const selectedGroups = state.selectedIds.filter(
          (id) => state.elements[id] && (state.elements[id] as any).type === 'group',
        )

        if (selectedGroups.length > 0) {
          ungroupElements(selectedGroups)
        } else {
          Notification.warning({
            closable: false,
            title: '无法取消分组',
            content: '请选择一个分组元素',
          })
        }
      },
    },
    {
      id: 'export',
      type: 'action',
      icon: ImageDown,
      label: '导出画布',
      onClick: () => setExportModalVisible(true),
    },
    {
      id: 'library',
      type: 'action',
      icon: LayoutGrid,
      label: 'Library',
      onClick: () =>
        Notification.error({
          closable: false,
          title: 'DEV',
          content: 'lib功能还没完善',
        }),
    },
  ]

  return (
    <>
      {/* 导出画布模态框 */}
      <ExportCanvasModal visible={exportModalVisible} onClose={() => setExportModalVisible(false)} />
      <div className="fixed left-1/2 top-20 z-50 flex -translate-x-1/2 flex-col items-center gap-3">
        {/* 1. 药丸形状的主工具栏 */}
        <div className="flex items-center rounded-lg border border-gray-200/60 bg-white p-1 shadow-[0_0_6px_rgba(0,0,0,0.1)]">
          {tools.map((item, index) => {
            // 渲染分隔线
            if (item.isSeparator) {
              return <div key={`sep-${index}`} className="mx-1 h-6 w-px bg-gray-200" />
            }

            // 渲染按钮
            const isActive = tool === item.value && item.type !== 'action'
            const Icon = item.icon

            return (
              <button
                key={item.id || index}
                title={item.label}
                onClick={() => {
                  if (item.onClick) item.onClick()
                  if (item.value) setTool(item.value as any)
                }}
                className={cls(
                  'relative flex h-9 w-9 items-center justify-center transition-colors duration-100',
                  // 选中状态：淡紫色背景，深紫色图标
                  isActive ? 'bg-violet-100 text-violet-700' : 'bg-transparent text-gray-600 hover:bg-gray-100',
                  // 锁的样式
                  //item.id === 'lock' && locked ? 'text-gray-900' : '',
                )}
              >
                {Icon && (
                  <Icon
                    className={cls('h-4 w-4', item.value === 'line' ? 'rotate-45' : '')} // 线条图标旋转一下更像 Excalidraw
                    strokeWidth={2}
                  />
                )}

                {/* 右下角的快捷键数字 */}
                {item.shortcut && (
                  <span className="absolute bottom-[2px] right-[2px] text-[9px] font-medium leading-none opacity-50">
                    {item.shortcut}
                  </span>
                )}
              </button>
            )
          })}

          {/* 撤销/重做按钮 */}
          <div className="mx-1 h-6 w-px bg-gray-200"></div>
          <button
            title="撤销 (Ctrl+Z)"
            onClick={undo}
            disabled={!canUndo()}
            className={cls(
              'relative flex h-9 w-9 items-center justify-center transition-colors duration-100',
              canUndo() ? 'text-gray-600 hover:bg-gray-100' : 'cursor-not-allowed text-gray-300',
            )}
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          <button
            title="重做 (Ctrl+Y)"
            onClick={redo}
            disabled={!canRedo()}
            className={cls(
              'relative flex h-9 w-9 items-center justify-center transition-colors duration-100',
              canRedo() ? 'text-gray-600 hover:bg-gray-100' : 'cursor-not-allowed text-gray-300',
            )}
          >
            <RotateCw className="h-4 w-4" />
          </button>
        </div>

        {/* 2. 下方的提示文字 (Hint)  */}
        <div className="pointer-events-none select-none text-xs text-gray-400">
          按住鼠标中键或空格键拖动画布，或使用手形工具，且shift+数字键可快捷选择工具
        </div>
      </div>

      <ImageInsertModal visible={imageModalVisible} onClose={() => setImageModalVisible(false)} />
    </>
  )
}
