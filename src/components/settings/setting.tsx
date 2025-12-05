import React, { useState, useEffect, useRef } from 'react'
import { Button, Card, Typography, Modal, Table, Tag, Space, Message, Tooltip } from '@arco-design/web-react'
import { IconEdit, IconAlignLeft as IconKeyboard, IconCloseCircle, IconRefresh } from '@arco-design/web-react/icon'
import { useCanvasShortcuts } from '@/hooks/use_React_hotkeys_management'

const { Title, Text } = Typography

interface Shortcut {
  id: string
  name: string
  key: string
  description: string
  isLocked?: boolean // 是否允许修改
}

// 默认快捷键配置（用于重置）
const DEFAULT_SHORTCUTS: Shortcut[] = [
  { id: 'undo', name: '撤销', key: 'Ctrl+Z', description: '撤销上一步操作' },
  { id: 'redo', name: '重做', key: 'Ctrl+Y', description: '重做上一步操作' },
  { id: 'delete', name: '删除', key: 'Delete', description: '删除选中的元素' },
  { id: 'copy', name: '复制', key: 'Ctrl+C', description: '复制选中的元素' },
  { id: 'paste', name: '粘贴', key: 'Ctrl+V', description: '粘贴元素' },
  { id: 'group', name: '分组', key: 'Ctrl+G', description: '将多个元素分组' },
  { id: 'ungroup', name: '取消分组', key: 'Ctrl+Shift+G', description: '取消元素分组' },
  { id: 'select', name: '选择工具', key: 'Shift+1', description: '激活选择工具' },
  { id: 'rectangle', name: '矩形工具', key: 'Shift+2', description: '激活矩形工具' },
  { id: 'diamond', name: '菱形工具', key: 'Shift+3', description: '激活菱形工具' },
  { id: 'circle', name: '圆形工具', key: 'Shift+4', description: '激活圆形工具' },
  { id: 'arrow', name: '箭头工具', key: 'Shift+5', description: '激活箭头工具' },
  { id: 'line', name: '直线工具', key: 'Shift+6', description: '激活直线工具' },
  { id: 'pencil', name: '铅笔工具', key: 'Shift+7', description: '激活铅笔工具' },
  { id: 'text', name: '文本工具', key: 'Shift+8', description: '激活文本工具' },
  { id: 'image', name: '图片工具', key: 'Shift+9', description: '激活图片工具' },
  { id: 'eraser', name: '橡皮擦工具', key: 'Shift+0', description: '激活橡皮擦工具' },
]

// 快捷键映射到hook中的键名
const SHORTCUT_HOOK_MAP: Record<string, string> = {
  undo: 'undo',
  redo: 'redo',
  delete: 'delete',
  copy: 'copy',
  paste: 'paste',
  group: 'group',
  ungroup: 'ungroup',
  select: 'selectTool',
  rectangle: 'rectTool',
  diamond: 'diamondTool',
  circle: 'circleTool',
  arrow: 'arrowTool',
  line: 'lineTool',
  pencil: 'pencilTool',
  text: 'textTool',
  image: 'imageTool',
  eraser: 'eraserTool',
}

/**
 * 单个按键的视觉组件
 */
const KeyTag = ({ k }: { k: string }) => {
  // 映射特殊符号以便显示
  const displayMap: Record<string, string> = {
    Control: 'Ctrl',
    Command: 'Cmd',
    ArrowUp: '↑',
    ArrowDown: '↓',
    ArrowLeft: '←',
    ArrowRight: '→',
    ' ': 'Space',
  }

  const label = displayMap[k] || k

  return (
    <kbd
      className="inline-flex min-w-[24px] items-center justify-center rounded border border-gray-200 bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600 shadow-sm"
      style={{ fontFamily: 'monospace' }}
    >
      {label}
    </kbd>
  )
}

/**
 * 快捷键组合展示组件
 */
const ShortcutDisplay = ({ shortcutKey }: { shortcutKey: string }) => {
  if (!shortcutKey) return <Tag color="gray">未设置</Tag>

  // 处理 "Ctrl+C / Ctrl+V" 这种多组快捷键的情况
  const groups = shortcutKey.split(' / ')

  return (
    <div className="flex flex-col gap-1">
      {groups.map((group, idx) => (
        <Space key={idx} size={4}>
          {group.split('+').map((k, i) => (
            <React.Fragment key={i}>
              <KeyTag k={k.trim()} />
              {i < group.split('+').length - 1 && <span className="text-gray-400">+</span>}
            </React.Fragment>
          ))}
        </Space>
      ))}
    </div>
  )
}

const Settings: React.FC = () => {
  const [shortcuts, setShortcuts] = useState<Shortcut[]>(() => {
    // 从localStorage加载用户自定义快捷键
    const saved = localStorage.getItem('customShortcutsDisplay')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        // 合并默认配置和保存的配置，防止缺少某些键
        return DEFAULT_SHORTCUTS.map((defaultItem) => {
          const savedItem = parsed.find((item: Shortcut) => item.id === defaultItem.id)
          return savedItem || defaultItem
        })
      } catch (e) {
        console.warn('Failed to parse custom shortcuts from localStorage', e)
      }
    }
    return DEFAULT_SHORTCUTS
  })
  const [visible, setVisible] = useState(false)
  const [editingItem, setEditingItem] = useState<Shortcut | null>(null)
  const [recordedKey, setRecordedKey] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const recordInputRef = useRef<HTMLDivElement>(null)
  const escPressTimer = useRef<NodeJS.Timeout | null>(null)

  useCanvasShortcuts()

  // 保存快捷键到localStorage
  const saveShortcutsToStorage = (newShortcuts: Shortcut[]) => {
    // 保存用于显示的快捷键
    localStorage.setItem('customShortcutsDisplay', JSON.stringify(newShortcuts))

    // 转换为hook使用的格式并保存
    const hookShortcuts: Record<string, string> = {}
    newShortcuts.forEach((shortcut) => {
      const hookKey = SHORTCUT_HOOK_MAP[shortcut.id]
      if (hookKey) {
        // 将显示格式转换为hook使用的格式
        hookShortcuts[hookKey] = convertDisplayToHookFormat(shortcut.key)
      }
    })

    localStorage.setItem('customShortcuts', JSON.stringify(hookShortcuts))
  }

  // 将显示格式转换为hook使用的格式
  const convertDisplayToHookFormat = (displayKey: string): string => {
    return displayKey
      .toLowerCase()
      .replace(/ctrl/g, 'ctrl')
      .replace(/cmd/g, 'meta')
      .replace(/shift/g, 'shift')
      .replace(/alt/g, 'alt')
      .replace(/space/g, 'space')
      .replace(/delete/g, 'delete')
      .replace(/backspace/g, 'backspace')
  }

  // 打开编辑模态框
  const handleEdit = (item: Shortcut) => {
    setEditingItem(item)
    setRecordedKey(item.key)
    setVisible(true)
    setIsRecording(false) // 初始不处于录制状态，等待用户点击输入框
  }

  // 保存修改
  const handleSave = () => {
    if (editingItem) {
      const updatedShortcuts = shortcuts.map((s) => (s.id === editingItem.id ? { ...s, key: recordedKey } : s))
      setShortcuts(updatedShortcuts)
      saveShortcutsToStorage(updatedShortcuts)
      Message.success(`快捷键 "${editingItem.name}" 已更新`)
      setVisible(false)
    }
  }

  // 重置单个快捷键
  const handleResetSingle = () => {
    if (editingItem) {
      const defaultItem = DEFAULT_SHORTCUTS.find((s) => s.id === editingItem.id)
      if (defaultItem) setRecordedKey(defaultItem.key)
    }
  }

  // 清除当前快捷键
  const handleClear = () => {
    setRecordedKey('')
    recordInputRef.current?.focus()
  }

  // 监听键盘事件（核心录制逻辑）
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isRecording) return

    e.preventDefault()
    e.stopPropagation()

    // 处理长按ESC清除快捷键
    if (e.key === 'Escape') {
      if (!escPressTimer.current) {
        escPressTimer.current = setTimeout(() => {
          handleClear()
          Message.info('已清除快捷键设置')
          escPressTimer.current = null
        }, 500) // 长按500ms触发清除
      }
      return
    } else {
      // 如果按下了其他键，清除ESC定时器
      if (escPressTimer.current) {
        clearTimeout(escPressTimer.current)
        escPressTimer.current = null
      }
    }

    const modifiers = []
    if (e.ctrlKey) modifiers.push('Ctrl')
    if (e.metaKey) modifiers.push('Cmd')
    if (e.altKey) modifiers.push('Alt')
    if (e.shiftKey) modifiers.push('Shift')

    // 忽略单纯的修饰键按下
    const isModifierKey = ['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)

    let mainKey = ''
    if (!isModifierKey) {
      // 处理特殊键名
      if (e.key === ' ') mainKey = 'Space'
      else if (e.code.startsWith('Key')) mainKey = e.key.toUpperCase()
      else if (e.code.startsWith('Digit')) mainKey = e.key
      else mainKey = e.key
      // 首字母大写处理
      if (mainKey.length > 1) {
        mainKey = mainKey.charAt(0).toUpperCase() + mainKey.slice(1)
      } else {
        mainKey = mainKey.toUpperCase()
      }
    }

    // 生成组合键字符串
    if (modifiers.length > 0 || mainKey) {
      // 只有当有主键按下，或者只有修饰键（虽然通常不建议）时更新显示
      // 这里逻辑是：用户按住 Ctrl 会显示 "Ctrl+"，再按 C 显示 "Ctrl+C"
      const combo = [...new Set([...modifiers, mainKey])].filter(Boolean).join('+')
      setRecordedKey(combo)
    }
  }

  // 处理按键释放事件，用于清理ESC定时器
  const handleKeyUp = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && escPressTimer.current) {
      clearTimeout(escPressTimer.current)
      escPressTimer.current = null
    }
  }

  // 表格列定义
  const columns = [
    {
      title: '功能名称',
      dataIndex: 'name',
      width: 150,
      render: (text: string) => <Text bold>{text}</Text>,
    },
    {
      title: '功能描述',
      dataIndex: 'description',
      render: (text: string) => <Text type="secondary">{text}</Text>,
    },
    {
      title: '快捷键',
      dataIndex: 'key',
      width: 200,
      render: (key: string) => <ShortcutDisplay shortcutKey={key} />,
    },
    {
      title: '操作',
      width: 100,
      render: (_: unknown, record: Shortcut) => (
        <Button type="text" size="small" icon={<IconEdit />} onClick={() => handleEdit(record)}>
          修改
        </Button>
      ),
    },
  ]

  // 组件卸载时清理定时器
  useEffect(() => {
    return () => {
      if (escPressTimer.current) {
        clearTimeout(escPressTimer.current)
      }
    }
  }, [])

  // 重置所有快捷键为默认值
  const handleResetAll = () => {
    setShortcuts(DEFAULT_SHORTCUTS)
    saveShortcutsToStorage(DEFAULT_SHORTCUTS)
    Message.success('所有快捷键已恢复为默认设置')
  }

  return (
    <div className="mx-auto mt-16 h-[calc(100vh-4rem)] overflow-auto bg-custom-color p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Title heading={4} style={{ margin: 0 }}>
            快捷键设置
          </Title>
          <Text type="secondary">自定义画布操作的快捷键以提高工作效率</Text>
        </div>
        <Button type="primary" icon={<IconRefresh />} onClick={handleResetAll}>
          恢复所有为默认
        </Button>
      </div>

      <Card className="shadow-sm">
        <Table rowKey="id" columns={columns} data={shortcuts} pagination={false} border={false} hover={true} />
      </Card>

      {/* 修改快捷键的 Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <IconKeyboard />
            修改快捷键 - {editingItem?.name}
          </div>
        }
        visible={visible}
        onOk={handleSave}
        onCancel={() => {
          setVisible(false)
          // 清理ESC定时器
          if (escPressTimer.current) {
            clearTimeout(escPressTimer.current)
            escPressTimer.current = null
          }
        }}
        okText="保存更改"
        cancelText="取消"
        className="w-[500px]"
      >
        <div className="flex flex-col gap-4 py-4">
          <div className="rounded bg-blue-50 p-3 text-sm text-blue-600">
            点击下方输入框并按下键盘组合键即可录制。支持 Ctrl, Shift, Alt 等组合。
            <br />
            <strong>长按 ESC 键可清除当前快捷键设置。</strong>
          </div>

          <div className="relative">
            {/* 模拟输入框外观的录制区域 */}
            <div
              ref={recordInputRef}
              tabIndex={0}
              className={`relative flex min-h-[50px] cursor-pointer items-center justify-center rounded-lg border-2 bg-white px-4 py-2 outline-none transition-all ${
                isRecording
                  ? 'border-blue-500 shadow-[0_0_0_4px_rgba(22,93,255,0.1)]'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setIsRecording(true)}
              onBlur={() => {
                setIsRecording(false)
                // 失去焦点时清理ESC定时器
                if (escPressTimer.current) {
                  clearTimeout(escPressTimer.current)
                  escPressTimer.current = null
                }
              }}
              onKeyDown={handleKeyDown}
              onKeyUp={handleKeyUp}
            >
              {recordedKey ? (
                <div className="scale-125 transform">
                  <ShortcutDisplay shortcutKey={recordedKey} />
                </div>
              ) : (
                <Text type="secondary" className="select-none">
                  {isRecording ? '请按下按键... (长按ESC清除)' : '点击此处录制'}
                </Text>
              )}

              {/* 清除按钮 */}
              {recordedKey && (
                <Tooltip content="清除快捷键">
                  <div
                    className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-gray-400 hover:text-gray-600"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleClear()
                    }}
                  >
                    <IconCloseCircle style={{ fontSize: 16 }} />
                  </div>
                </Tooltip>
              )}
            </div>

            {/* 状态提示 */}
            <div className="mt-2 flex justify-between text-xs text-gray-500">
              <span>
                当前状态: {isRecording ? <span className="font-bold text-blue-500">录制中...</span> : '未激活'}
              </span>
              {recordedKey !== editingItem?.key && (
                <span className="cursor-pointer text-blue-500 hover:underline" onClick={handleResetSingle}>
                  恢复该项默认
                </span>
              )}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default Settings
