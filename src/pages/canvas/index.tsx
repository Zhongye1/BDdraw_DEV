// src/Canvas.tsx
import { useEffect, useRef } from 'react'

import { StageManager } from './Pixi_stageManager'
import { useStore } from '@/stores/canvasStore'
import { Button } from '@arco-design/web-react'
import IconRect from '@/components/ui/icon-rect'
import IconCircle from '@/components/ui/icon-circle'
import IconTriangle from '@/components/ui/icon-triangle'
import IconSelect from '@/components/ui/icon-select'
import IconClear from '@/components/ui/icon-clear'
import PropertyPanel from '@/components/property-panel'

export default function PixiCanvas() {
  const containerRef = useRef<HTMLDivElement>(null)
  const stageManagerRef = useRef<StageManager | null>(null)

  // 订阅 Store 用于 UI 高亮显示
  const { tool, setTool, elements, removeElements, selectedIds } = useStore()

  useEffect(() => {
    let stageManager: StageManager | null = null

    if (containerRef.current) {
      // 初始化 Pixi
      stageManager = new StageManager(containerRef.current)
      stageManagerRef.current = stageManager
    }

    return () => {
      // 组件卸载时销毁 Pixi
      stageManagerRef.current?.destroy()
    }
  }, [])

  // 清空画布示例
  const handleClear = () => {
    const ids = Object.keys(elements)
    removeElements(ids)
  }

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* 左侧工具栏 */}
      <div className="flex w-16 flex-col items-center gap-4 border-r bg-white px-2 py-4 shadow-sm">
        <div className="mb-2 text-lg font-bold">Pixi Editor</div>

        <Button
          type={tool === 'select' ? 'primary' : 'secondary'}
          icon={<IconSelect />}
          onClick={() => setTool('select')}
          className="!h-12 !w-12"
        />

        <Button
          type={tool === 'rect' ? 'primary' : 'secondary'}
          icon={<IconRect />}
          onClick={() => setTool('rect')}
          className="!h-12 !w-12"
        />

        <Button
          type={tool === 'circle' ? 'primary' : 'secondary'}
          icon={<IconCircle />}
          onClick={() => setTool('circle')}
          className="!h-12 !w-12"
        />

        <Button
          type={tool === 'triangle' ? 'primary' : 'secondary'}
          icon={<IconTriangle />}
          onClick={() => setTool('triangle')}
          className="!h-12 !w-12"
        />

        <div className="flex-1"></div>

        <Button status="danger" icon={<IconClear />} onClick={handleClear} className="!h-12 !w-12" />
        <div className="text-xs text-gray-500">元素: {Object.keys(elements).length}</div>
      </div>

      {/* 画布区域 */}
      <div className="relative flex-1">
        <div ref={containerRef} className="h-full w-full overflow-hidden bg-gray-50" />

        {/* 属性面板 */}
        <PropertyPanel />

        {/* 属性调试面板 (可选) */}
        <div className="pointer-events-none absolute right-4 top-4 w-48 rounded bg-white p-4 opacity-80 shadow-lg">
          <h3 className="mb-2 font-bold">Debug Info</h3>
          <pre className="text-xs">{JSON.stringify({ tool, selectedIds }, null, 2)}</pre>
        </div>
      </div>
    </div>
  )
}
