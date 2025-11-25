// src/Canvas.tsx
import React, { useEffect, useRef } from 'react'
import { StageManager } from './Pixi_stageManager'
import { useStore } from '@/stores/canvasStore'
import PropertyPanel from '@/components/property-panel'
import TopToolbar from '@/components/canvas_toolbar/TopToolbar'
import BottomTextEditor from '@/components/Richtext_editor/BottomTextEditor'
import { useCanvasShortcuts } from '@/hooks/use_React_hotkeys_management'
import { Minimap } from '@/components/minimap/Minimap'

export default function PixiCanvas() {
  const containerRef = useRef<HTMLDivElement>(null)
  const stageManagerRef = useRef<StageManager | null>(null)
  const { elements } = useStore()

  // 使用自定义hook管理快捷键
  useCanvasShortcuts()

  // 初始化 StageManager
  useEffect(() => {
    if (!containerRef.current) return

    const stageManager = new StageManager(containerRef.current)
    stageManagerRef.current = stageManager

    return () => {
      stageManagerRef.current?.destroy()
      stageManagerRef.current = null
    }
  }, [])

  return (
    <div className="relative h-[90vh] w-auto overflow-hidden bg-blue-200">
      {/* 1. 悬浮工具栏 (内部已经配置了 fixed 定位) */}
      <TopToolbar />

      {/* 2. 主画布区域：完全占满屏幕，无 padding */}
      <div
        ref={containerRef}
        className="absolute inset-0 h-full w-full touch-none overflow-hidden bg-white" // touch-none 防止移动端误触
      />

      {/* 3. 右侧属性面板 (保持原样，它是 fixed 或 absolute right-0) */}
      <PropertyPanel />

      {/* 底部文本编辑器：自动根据选中状态显示/隐藏 */}
      <BottomTextEditor />

      {/* 小地图组件 */}
      <Minimap stageManager={stageManagerRef.current} />

      {/* 4. 调试面板 (可选) */}
      {/* <div className="pointer-events-none absolute right-4 bottom-4 z-10 rounded-md bg-gray-100/80 p-2 text-xs text-gray-500">
        {Object.keys(elements).length} elements
      </div> */}
    </div>
  )
}
