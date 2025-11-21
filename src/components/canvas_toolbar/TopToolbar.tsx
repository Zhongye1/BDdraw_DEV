// src/components/TopToolbar.tsx
import React, { useState } from 'react'
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
  Lock,
  Unlock,
  LayoutGrid, // 用作最后的那个库图标
} from 'lucide-react'
import ImageInsertModal from '@/components/image-insert-modal'

// --- 类型定义 ---
type ToolType =
  | 'select'
  | 'hand'
  | 'rect'
  | 'diamond'
  | 'circle'
  | 'arrow'
  | 'line'
  | 'pencil'
  | 'text'
  | 'image'
  | 'eraser'

interface ToolItemConfig {
  type: ToolType | 'action' // action 代表锁、库等非绘图工具
  icon: React.ElementType
  label: string // 用于 tooltip
  value?: string // store 中的 tool 值
  shortcut?: string // 右下角快捷键提示
  isSeparator?: boolean // 是否是分隔符
}

export default function TopToolbar() {
  const { tool, setTool } = useStore()
  const [locked, setLocked] = useState(false)
  const [imageModalVisible, setImageModalVisible] = useState(false)

  // 简单的 className 拼接函数（如果你没有引入 clsx/tailwind-merge）
  const cls = (...classes: (string | undefined | boolean)[]) => classes.filter(Boolean).join(' ')

  // 工具栏配置，严格按照截图顺序
  // 顺序: 锁 | 手 | 选择 | 矩形 | 菱形 | 圆 | 箭头 | 线 | 笔 | 文字 | 图片 | 橡皮 | 库
  const tools = [
    {
      id: 'lock',
      type: 'action',
      icon: locked ? Lock : Unlock,
      label: locked ? 'Unlock (Ctrl+Shift+L)' : 'Lock (Ctrl+Shift+L)',
      onClick: () => setLocked(!locked),
    },
    { isSeparator: true },
    { id: 'hand', value: 'hand', icon: Hand, label: 'Hand tool (H)', shortcut: '' },
    { id: 'select', value: 'select', icon: MousePointer2, label: 'Selection (V)', shortcut: '1' },
    { id: 'rect', value: 'rect', icon: Square, label: 'Rectangle (R)', shortcut: '2' },
    { id: 'diamond', value: 'diamond', icon: Diamond, label: 'Diamond (D)', shortcut: '3' },
    { id: 'circle', value: 'circle', icon: Circle, label: 'Ellipse (E)', shortcut: '4' },
    { id: 'arrow', value: 'arrow', icon: ArrowRight, label: 'Arrow (A)', shortcut: '5' },
    { id: 'line', value: 'line', icon: Minus, label: 'Line (L)', shortcut: '6' },
    { id: 'pencil', value: 'pencil', icon: Pencil, label: 'Draw (P)', shortcut: '7' },
    { id: 'text', value: 'text', icon: Type, label: 'Text (T)', shortcut: '8' },
    {
      id: 'image',
      value: 'image',
      icon: ImageIcon,
      label: 'Insert image',
      shortcut: '9',
      onClick: () => setImageModalVisible(true),
    },
    { id: 'eraser', value: 'eraser', icon: Eraser, label: 'Eraser (E)', shortcut: '0' },
    { isSeparator: true },
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
                  // 锁的特殊样式
                  item.id === 'lock' && locked ? 'text-gray-900' : '',
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
