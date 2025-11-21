import '@wangeditor/editor/dist/css/style.css'
import { useState, useEffect } from 'react'
import { Editor, Toolbar } from '@wangeditor/editor-for-react'
import type { IDomEditor, IEditorConfig, IToolbarConfig } from '@wangeditor/editor'

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  className?: string
}

export const RichTextEditor = ({ value, onChange, className }: RichTextEditorProps) => {
  const [editor, setEditor] = useState<IDomEditor | null>(null)

  // 工具栏配置：仅保留基础文本样式
  const toolbarConfig: Partial<IToolbarConfig> = {
    toolbarKeys: [
      'bold',
      'italic',
      'underline',
      'through',
      '|',
      'fontSize',
      'fontFamily',
      'color',
      'bgColor',
      '|',
      'justifyLeft',
      'justifyCenter',
      'justifyRight',
      '|',
      'undo',
      'redo',
    ],
  }

  const editorConfig: Partial<IEditorConfig> = {
    placeholder: '请输入文本...',
    autoFocus: true,
  }

  // 销毁 editor
  useEffect(() => {
    return () => {
      if (editor == null) return
      editor.destroy()
      setEditor(null)
    }
  }, [editor])

  return (
    <div className={`flex flex-col border-t border-gray-50 bg-white shadow-xl ${className || ''}`}>
      {/* 工具栏 */}
      <Toolbar
        editor={editor}
        defaultConfig={toolbarConfig}
        mode="simple"
        className="border-b border-gray-100"
        style={{ borderBottom: '1px solid #e5e7eb' }}
      />
      {/* 编辑区域：高度固定较小，形成底部面板感 */}
      <Editor
        defaultConfig={editorConfig}
        value={value}
        onCreated={setEditor}
        onChange={(editor) => onChange(editor.getHtml())}
        mode="simple"
        style={{ height: '200px', overflowY: 'auto' }}
      />
    </div>
  )
}
