# 小地图 (Minimap) 实现机制文档

## 概述

在无限画布应用中，小地图是一个重要的导航辅助工具，它能够帮助用户快速了解整个画布内容的布局和当前视口的位置。本文档详细介绍了小地图的实现机制，包括核心原理、坐标映射算法、组件设计和优化策略。

当前实现基于 React + HTML5 Canvas 技术栈，不依赖额外的 PixiJS 实例，以节省资源并提高性能。

## 核心原理

小地图的核心是两个矩形的关系映射：

1. **内容包围盒 (Content Bounds)**：所有画布元素构成的最大矩形区域，加上适当的内边距
2. **视口矩形 (Viewport Rect)**：用户当前屏幕看到的世界坐标区域

我们需要将这两个矩形从**世界坐标系**映射到**小地图 Canvas 坐标系**，实现坐标系的转换。

## 实现架构

### 1. 工具函数 (minimapUtils.ts)

工具函数负责计算所有元素的边界和坐标转换，文件位于 `src/lib/minimapUtils.ts`：

```typescript
import { CanvasElement } from '@/stores/canvasStore'

interface Rect {
  x: number
  y: number
  width: number
  height: number
}

// 计算所有元素的世界边界（加一些 padding 防止贴边）
export function getContentBounds(elements: Record<string, CanvasElement>, padding = 50): Rect {
  const ids = Object.keys(elements)
  if (ids.length === 0) return { x: 0, y: 0, width: 1000, height: 1000 }

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  ids.forEach((id) => {
    const el = elements[id]
    minX = Math.min(minX, el.x)
    minY = Math.min(minY, el.y)
    maxX = Math.max(maxX, el.x + el.width)
    maxY = Math.max(maxY, el.y + el.height)
  })

  return {
    x: minX - padding,
    y: minY - padding,
    width: maxX - minX + padding * 2,
    height: maxY - minY + padding * 2,
  }
}

// 计算缩放比例，使内容完整填充小地图（contain 模式）
export function getMinimapScale(contentBounds: Rect, minimapSize: { width: number; height: number }) {
  const scaleX = minimapSize.width / contentBounds.width
  const scaleY = minimapSize.height / contentBounds.height
  return Math.min(scaleX, scaleY)
}
```

该工具函数包含两个核心方法：

1. `getContentBounds`：计算包含所有元素的最小矩形区域，添加50像素的内边距防止元素贴边显示
2. `getMinimapScale`：使用"contain"模式计算缩放比例，确保内容完整显示在小地图中且不变形

### 2. 小地图组件 (Minimap.tsx)

小地图组件是一个独立于 Pixi 渲染循环的 React 组件，但它会监听 Pixi Viewport 的变化。组件文件位于 `src/components/minimap/Minimap.tsx`：

```tsx
import React, { useRef, useEffect, useState } from 'react'
import { useStore } from '@/stores/canvasStore'
import { getContentBounds, getMinimapScale } from '@/lib/minimapUtils'
import type { StageManager } from '@/pages/canvas/Pixi_stageManager'

interface MinimapProps {
  stageManager: StageManager | null
  width?: number
  height?: number
}

export const Minimap: React.FC<MinimapProps> = ({ stageManager, width = 240, height = 160 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const elements = useStore((state) => state.elements)
  const selectedIds = useStore((state) => state.selectedIds)
  const [triggerRender, setTriggerRender] = useState(0)

  // 状态记录，用于拖拽逻辑
  const isDragging = useRef(false)

  // 1. 监听 Pixi Viewport 变化，强制重绘小地图
  useEffect(() => {
    if (!stageManager || !stageManager.viewport) return

    const viewport = stageManager.viewport

    const onViewportChange = () => {
      // 使用 requestAnimationFrame 避免高频重绘
      requestAnimationFrame(() => setTriggerRender((prev) => prev + 1))
    }

    viewport.on('moved', onViewportChange)
    viewport.on('zoomed', onViewportChange)

    return () => {
      viewport.off('moved', onViewportChange)
      viewport.off('zoomed', onViewportChange)
    }
  }, [stageManager])

  // 2. 绘制逻辑
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !stageManager) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // 清空画布
    ctx.clearRect(0, 0, width, height)

    // 背景色
    ctx.fillStyle = '#f5f5f5'
    ctx.fillRect(0, 0, width, height)

    // --- A. 计算比例 ---
    const contentBounds = getContentBounds(elements)
    const scale = getMinimapScale(contentBounds, { width, height })

    // 计算内容在小地图中的偏移量（居中显示）
    const offsetX = (width - contentBounds.width * scale) / 2
    const offsetY = (height - contentBounds.height * scale) / 2

    // --- B. 绘制所有元素（简化版） ---
    Object.values(elements).forEach((el) => {
      // 区分选中元素和普通元素的颜色
      if (selectedIds.includes(el.id)) {
        ctx.fillStyle = '#8888ff' // 选中元素用蓝色
      } else {
        ctx.fillStyle = '#cccccc' // 普通元素用灰色
      }

      // 将世界坐标转换为小地图坐标
      const mx = (el.x - contentBounds.x) * scale + offsetX
      const my = (el.y - contentBounds.y) * scale + offsetY
      const mw = el.width * scale
      const mh = el.height * scale

      ctx.fillRect(mx, my, mw, mh)
    })

    // --- C. 绘制视口框 (Viewport Viewfinder) ---
    if (stageManager && stageManager.viewport) {
      const viewport = stageManager.viewport
      // 获取视口在世界坐标系中的可视区域
      const viewBounds = viewport.getVisibleBounds()

      const vx = (viewBounds.x - contentBounds.x) * scale + offsetX
      const vy = (viewBounds.y - contentBounds.y) * scale + offsetY
      const vw = viewBounds.width * scale
      const vh = viewBounds.height * scale

      ctx.strokeStyle = '#ff4757'
      ctx.lineWidth = 2
      ctx.strokeRect(vx, vy, vw, vh)
    }

    // 绘制半透明遮罩（可选：让视口外变暗）
    // 这个稍微复杂点，需要反向剪裁，这里暂略
  }, [elements, selectedIds, width, height, stageManager, triggerRender])

  // 3. 交互逻辑：点击或拖拽小地图移动视口
  const handlePointer = (e: React.PointerEvent) => {
    if (!stageManager || !stageManager.viewport || !canvasRef.current) return

    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // 反向计算：从小地图坐标 -> 世界坐标
    const contentBounds = getContentBounds(elements)
    const scale = getMinimapScale(contentBounds, { width, height })
    const offsetX = (width - contentBounds.width * scale) / 2
    const offsetY = (height - contentBounds.height * scale) / 2

    // 公式推导：mx = (wx - cx) * scale + ox  ==>  wx = (mx - ox) / scale + cx
    const worldX = (x - offsetX) / scale + contentBounds.x
    const worldY = (y - offsetY) / scale + contentBounds.y

    // 移动 Pixi Viewport 中心点
    stageManager.viewport.moveCenter(worldX, worldY)
    // 强制触发重绘
    setTriggerRender((p) => p + 1)
  }

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 20,
        right: 20,
        boxShadow: '0 0 10px rgba(0,0,0,0.2)',
        borderRadius: 4,
        overflow: 'hidden',
        background: 'white',
        cursor: 'pointer',
      }}
    >
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onPointerDown={(e) => {
          isDragging.current = true
          canvasRef.current?.setPointerCapture(e.pointerId)
          handlePointer(e)
        }}
        onPointerMove={(e) => {
          if (isDragging.current) handlePointer(e)
        }}
        onPointerUp={(e) => {
          isDragging.current = false
          canvasRef.current?.releasePointerCapture(e.pointerId)
        }}
      />
    </div>
  )
}
```

组件主要功能包括：

1. **状态管理**：通过 `useState` 和 `useRef` 管理渲染触发和拖拽状态
2. **视口监听**：通过 `useEffect` 监听 Pixi Viewport 的移动和缩放事件
3. **元素渲染**：遍历所有画布元素，根据其状态（选中与否）使用不同颜色渲染
4. **视口框绘制**：获取当前视口位置并绘制红色边框
5. **交互处理**：支持点击和拖拽小地图来移动视口

## 坐标映射算法详解

### 1. 内容边界计算

```typescript
function getContentBounds(elements: Record<string, CanvasElement>, padding = 50): Rect
```

该函数遍历所有画布元素，计算出包含所有元素的最小矩形区域，并添加指定的内边距，防止元素贴边显示。当没有元素时，默认返回一个 1000x1000 的区域。

### 2. 缩放比例计算

```typescript
function getMinimapScale(contentBounds: Rect, minimapSize: { width: number; height: number })
```

使用"contain"模式计算缩放比例，通过比较宽度和高度的缩放比例，取较小值确保内容完整显示在小地图中且不变形。

### 3. 坐标转换

正向转换（世界坐标 → 小地图坐标）：
```
mx = (wx - contentBounds.x) * scale + offsetX
my = (wy - contentBounds.y) * scale + offsetY
```

其中 `offsetX` 和 `offsetY` 是为了在小地图中居中显示内容而计算的偏移量：
```
offsetX = (width - contentBounds.width * scale) / 2
offsetY = (height - contentBounds.height * scale) / 2
```

反向转换（小地图坐标 → 世界坐标）：
```
wx = (mx - offsetX) / scale + contentBounds.x
wy = (my - offsetY) / scale + contentBounds.y
```

## 性能优化策略

### 1. 渲染优化

- 使用 `requestAnimationFrame` 避免高频重绘，在视口移动或缩放时触发重绘
- 通过 `triggerRender` 状态变量控制重绘时机，避免不必要的重复绘制
- 使用 React 的 `useEffect` 钩子监听相关状态变化

### 2. 绘制优化

- 使用简单的矩形绘制代替复杂图形，提高渲染性能
- 区分选中元素（蓝色 #8888ff）和普通元素（灰色 #cccccc）的颜色
- 视口框使用固定颜色（红色 #ff4757）和线宽（2像素）

### 3. 交互优化

- 使用 Pointer Events API 提供更好的跨设备支持
- 实现拖拽状态管理，通过 `isDragging` ref 支持连续移动视口
- 使用 `setPointerCapture` 确保拖拽过程的连续性，即使指针移出元素范围也能继续响应

## 集成方式

在应用中使用小地图组件，需要将 StageManager 实例传递给小地图组件：

```tsx
// App.tsx 或 CanvasPage.tsx

const stageManagerRef = useRef<StageManager | null>(null)

// ... 在初始化 StageManager 后 ...
// stageManagerRef.current = new StageManager(...)

return (
  <div className="container">
    <div ref={containerRef} className="canvas-container" />
    
    {/* 将 stageManager 实例传给小地图 */}
    <Minimap stageManager={stageManagerRef.current} />
  </div>
)
```

在当前项目中，StageManager 是对 Pixi STG 的封装，位于 `src/pages/canvas/Pixi_stageManager.ts`。

## 进阶优化建议

### 1. 性能优化

对于元素数量非常多的情况（> 1000），可以考虑以下优化：

- 给 Minimap 增加防抖机制，避免频繁重绘
- 只绘制可视区域附近的元素，减少绘制负担
- 使用 OffscreenCanvas 缓存背景，只有当 elements 结构发生变化时才重绘背景，视口移动时只重绘红框

### 2. 交互增强

- 限制视口移动范围，防止 Viewport 移出内容区域太远
- 保持小地图的 Canvas 长宽比和屏幕长宽比一致
- 实现"拖拽红框"功能，提升用户体验

### 3. 显示优化

- 添加半透明遮罩，让视口外区域变暗，突出显示视口内区域
- 支持不同元素类型的差异化显示（如圆形、三角形等）
- 添加缩略图模式，提供更多视觉信息

## 技术选型理由

### 为什么不使用 Pixi 渲染小地图？

虽然可以使用 RenderTexture 将主舞台渲染成纹理放到小地图中，但存在以下问题：

1. **显存消耗**：如果画布很大，生成的 Texture 会非常大，或者需要频繁 Update，消耗大量 GPU 资源
2. **清晰度问题**：缩放很小时，纹理采样会导致严重的锯齿或模糊
3. **抽象度不足**：小地图通常需要"抽象显示"（比如用灰色块代表复杂的组件），直接截图会显示太多细节，反而看不清结构

使用 HTML5 Canvas 绘制简单的 `fillRect` 是最标准的做法，Figma、VSCode、Miro 等知名产品都采用这种方案。