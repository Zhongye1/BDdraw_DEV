// src/components/BottomTextEditor.tsx
import React, { useEffect, useState } from 'react'
import { useStore } from '@/stores/canvasStore'
import { RichTextEditor } from './Richtext_editor'
import { undoRedoManager } from '@/lib/UndoRedoManager'
import { UpdateElementPropertyCommand } from '@/lib/UpdateElementPropertyCommand'

export default function BottomTextEditor() {
  const { selectedIds, elements, updateElement } = useStore()

  // 获取当前选中的元素
  const selectedId = selectedIds.length === 1 ? selectedIds[0] : null
  const element = selectedId ? elements[selectedId] : null

  // 本地中间状态，用于解决输入法（中文拼音）和 Store 更新的冲突
  const [localHtml, setLocalHtml] = useState('')

  // 当选中元素改变时，同步 Store 的值到本地状态
  useEffect(() => {
    if (element && element.type === 'text') {
      setLocalHtml(element.text || '')
    }
  }, [element?.id, element?.text])

  if (!element || element.type !== 'text') {
    return null
  }

  const handleChange = (html: string) => {
    setLocalHtml(html)
    // 记录更改前的属性值
    const initialText = element.text || ''

    // 实时更新 Store，驱动 Canvas 重新渲染
    updateElement(element.id, { text: html })

    // 创建并执行更新命令以支持撤销/重做
    const updateCommand = new UpdateElementPropertyCommand(
      {
        id: element.id,
        property: 'text',
        oldValue: initialText,
        newValue: html,
      },
      '修改文本内容',
    )
    undoRedoManager.executeCommand(updateCommand)
  }

  return (
    <div className="pointer-events-none fixed bottom-8 left-0 right-0 z-50 flex justify-center">
      <div className="animate-slide-up pointer-events-auto mx-4 w-full max-w-3xl shadow-xl">
        <RichTextEditor
          value={localHtml}
          onChange={handleChange}
          className="rounded-lg border-t-2 border-blue-500 bg-white"
        />
      </div>
    </div>
  )
}
