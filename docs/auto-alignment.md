# 自动对齐功能实现文档

## 概述

自动对齐功能（也称为智能引导线或磁性吸附）是现代设计工具中的一个重要特性，它可以帮助用户在拖动元素时自动对齐到其他元素的边缘或中心，从而创建整齐、专业的布局。本文档详细描述了该功能的实现机制。

## 功能组成

自动对齐功能由以下几个核心部分组成：

1. **辅助线计算模块** - 计算何时以及在哪里显示辅助线
2. **辅助线渲染模块** - 在画布上绘制辅助线
3. **拖拽处理模块** - 处理元素拖拽过程中的对齐逻辑
4. **事件系统** - 协调各模块之间的通信

## 实现细节

### 1. 辅助线计算 (guidelineUtils.ts)

辅助线计算是通过对拖动元素与其他元素的边界进行比较来实现的。主要实现在 [calculateGuidelines](file://e:\ADF-workbase\BDdraw_DEV\src\pages\canvas\Pixi_STM_modules\utils\guidelineUtils.ts#L17-L85) 函数中：

```typescript
export function calculateGuidelines(
  movingElement: CanvasElement,
  allElements: Record<string, CanvasElement>,
  selectedIds: string[],
  threshold = 1, //辅助线吸附
): SnapResult {
  const result: SnapResult = {
    guidelines: [],
  }

  // 获取移动元素的边界
  const movingBounds = getElementBounds(movingElement)

  // 遍历所有其他元素（排除正在移动的元素和选中的元素）
  Object.entries(allElements).forEach(([id, element]) => {
    if (id === movingElement.id || selectedIds.includes(id)) {
      return
    }

    const bounds = getElementBounds(element)

    // 检查水平对齐
    // 左对左
    if (Math.abs(movingBounds.left - bounds.left) < threshold) {
      result.x = bounds.left
      result.guidelines.push({ type: 'vertical', position: bounds.left, originId: id })
    }
    // 左对右
    else if (Math.abs(movingBounds.left - bounds.right) < threshold) {
      result.x = bounds.right
      result.guidelines.push({ type: 'vertical', position: bounds.right, originId: id })
    }
    // 右对右
    else if (Math.abs(movingBounds.right - bounds.right) < threshold) {
      result.x = bounds.right - movingElement.width
      result.guidelines.push({ type: 'vertical', position: bounds.right, originId: id })
    }
    // 右对左
    else if (Math.abs(movingBounds.right - bounds.left) < threshold) {
      result.x = bounds.left - movingElement.width
      result.guidelines.push({ type: 'vertical', position: bounds.left, originId: id })
    }
    // 中心对中心（水平）
    else if (Math.abs(movingBounds.centerX - bounds.centerX) < threshold) {
      result.x = bounds.centerX - movingElement.width / 2
      result.guidelines.push({ type: 'vertical', position: bounds.centerX, originId: id })
    }

    // 检查垂直对齐
    // 上对上
    if (Math.abs(movingBounds.top - bounds.top) < threshold) {
      result.y = bounds.top
      result.guidelines.push({ type: 'horizontal', position: bounds.top, originId: id })
    }
    // 上对下
    else if (Math.abs(movingBounds.top - bounds.bottom) < threshold) {
      result.y = bounds.bottom
      result.guidelines.push({ type: 'horizontal', position: bounds.bottom, originId: id })
    }
    // 下对下
    else if (Math.abs(movingBounds.bottom - bounds.bottom) < threshold) {
      result.y = bounds.bottom - movingElement.height
      result.guidelines.push({ type: 'horizontal', position: bounds.bottom, originId: id })
    }
    // 下对上
    else if (Math.abs(movingBounds.bottom - bounds.top) < threshold) {
      result.y = bounds.top - movingElement.height
      result.guidelines.push({ type: 'horizontal', position: bounds.top, originId: id })
    }
    // 中心对中心（垂直）
    else if (Math.abs(movingBounds.centerY - bounds.centerY) < threshold) {
      result.y = bounds.centerY - movingElement.height / 2
      result.guidelines.push({ type: 'horizontal', position: bounds.centerY, originId: id })
    }

    // 限制辅助线数量为3条
    if (result.guidelines.length > 3) {
      result.guidelines = result.guidelines.slice(0, 3)
    }
  })

  // 确保最终结果不超过3条辅助线
  if (result.guidelines.length > 3) {
    result.guidelines = result.guidelines.slice(0, 3)
  }

  return result
}
```

该函数会检查以下几种对齐情况：
- 左边缘对齐左边缘
- 左边缘对齐右边缘
- 右边缘对齐右边缘
- 右边缘对齐左边缘
- 水平中心对齐水平中心
- 上边缘对齐上边缘
- 上边缘对齐下边缘
- 下边缘对齐下边缘
- 下边缘对齐上边缘
- 垂直中心对齐垂直中心

### 2. 拖拽处理 (dragUtils.ts)

在拖拽过程中，系统会持续调用 [handleDraggingMove](file://e:\ADF-workbase\BDdraw_DEV\src\pages\canvas\Pixi_STM_modules\utils\dragUtils.ts#L34-L133) 函数来处理元素移动和对齐逻辑：

```typescript
export function handleDraggingMove(
  state: ReturnType<typeof useStore.getState>,
  selectedIds: string[],
  startPos: { x: number; y: number },
  currentPos: { x: number; y: number },
  dragInitialStates: Record<string, Partial<CanvasElement>> | null,
  setDragInitialStates: (states: Record<string, Partial<CanvasElement>> | null) => void,
  updateState: any,
): {
  newStartPos: { x: number; y: number }
  dragDelta: { dx: number; dy: number }
  snapLines: any[]
} {
  // ... 实现细节 ...

  if (selectedIds.length > 0) {
    // 计算总位移 (Current - DragStart)
    const totalDx = currentPos.x - startPos.x
    const totalDy = currentPos.y - startPos.y

    let finalDx = totalDx
    let finalDy = totalDy
    let guidelines: any[] = []

    // 取第一个元素作为参考元素来计算辅助线
    const primaryElementId = selectedIds[0]
    // 确保有初始状态才继续
    if (!newDragInitialStates) {
      return { newStartPos: startPos, dragDelta: { dx: 0, dy: 0 }, snapLines: [] }
    }
    const primaryElementInitial = newDragInitialStates[primaryElementId]

    // 只有当选择单个元素时才计算辅助线，多元素选择时跳过以提升性能
    if (primaryElementInitial && selectedIds.length === 1) {
      // 创建带有新位置的临时元素用于计算辅助线
      const tempElement = {
        ...state.elements[primaryElementId],
        x: primaryElementInitial.x! + totalDx,
        y: primaryElementInitial.y! + totalDy,
      }

      // 计算辅助线和吸附位置
      const snapResult = calculateGuidelines(tempElement, state.elements, selectedIds)

      // 如果有吸附位置，则使用吸附后的位置

      const initialX = primaryElementInitial.x!
      const initialY = primaryElementInitial.y!

      if (snapResult.x !== undefined) finalDx = snapResult.x - initialX
      if (snapResult.y !== undefined) finalDy = snapResult.y - initialY
      guidelines = snapResult.guidelines
    }

    return {
      newStartPos: startPos,
      dragDelta: { dx: finalDx, dy: finalDy },
      snapLines: guidelines,
    }
  }

  return { newStartPos: startPos, dragDelta: { dx: 0, dy: 0 }, snapLines: [] }
}
```

### 3. 辅助线渲染

辅助线的渲染通过事件系统实现。在 [Stage_InteractionHandler.ts](file:///E:/ADF-workbase/BDdraw_DEV/src/pages/canvas/Pixi_STM_modules/interaction/Stage_InteractionHandler.ts) 中，系统会根据计算结果决定是否显示辅助线：

```typescript
// 更新辅助线显示
if (dragResult.snapLines.length > 0) {
  if (typeof window !== 'undefined' && window.dispatchEvent) {
    window.dispatchEvent(new CustomEvent('drawGuidelines', { detail: dragResult.snapLines }))
  }
} else {
  if (typeof window !== 'undefined' && window.dispatchEvent) {
    window.dispatchEvent(new CustomEvent('clearGuidelines'))
  }
}
```

然后在 [Core_StageManager.ts](file:///E:/ADF-workbase/BDdraw_DEV/src/pages/canvas/Pixi_STM_modules/core/Core_StageManager.ts) 中监听这些事件并实际绘制辅助线：

```typescript
// 设置辅助线事件监听
private setupGuidelineEvents() {
  // 使用保存的引用添加监听
  window.addEventListener('drawGuidelines', this._boundDrawGuidelines)
  window.addEventListener('clearGuidelines', this._boundClearGuidelines)
}

// 绘制辅助线
private drawGuidelines(guidelines: Array<{ type: string; position: number }>) {
  // 确保辅助线图层存在且未被销毁
  if (!this.guidelineLayer || this.state.destroyed) {
    return
  }

  // 清除之前的辅助线
  this.guidelineLayer.clear()

  // 如果没有辅助线要绘制，直接返回
  if (!guidelines || guidelines.length === 0) {
    return
  }

  // 获取视口边界
  const visibleBounds = this.viewport.getVisibleBounds()
  const startX = visibleBounds.x - 1000
  const endX = visibleBounds.x + visibleBounds.width + 1000
  const startY = visibleBounds.y - 1000
  const endY = visibleBounds.y + visibleBounds.height + 1000

  // 绘制每条辅助线
  guidelines.forEach((guideline) => {
    if (guideline.type === 'horizontal') {
      // 绘制水平辅助线
      this.guidelineLayer.moveTo(startX, guideline.position)
      this.guidelineLayer.lineTo(endX, guideline.position)
    } else if (guideline.type === 'vertical') {
      // 绘制垂直辅助线
      this.guidelineLayer.moveTo(guideline.position, startY)
      this.guidelineLayer.lineTo(guideline.position, endY)
    }
  })

  // 应用样式并绘制
  this.guidelineLayer.stroke({
    width: 1,
    color: 0x78deff,
    alpha: 0.8,
  })
}

// 清除辅助线
private clearGuidelines() {
  // 确保辅助线图层存在且未被销毁
  if (!this.guidelineLayer || this.state.destroyed) {
    return
  }

  this.guidelineLayer.clear()
}
```

## 工作流程

1. 用户开始拖动一个元素
2. 系统记录元素的初始位置
3. 在拖动过程中，系统持续计算元素当前位置与其他元素的对齐关系
4. 当检测到对齐关系时，计算辅助线位置并触发 [drawGuidelines](file://e:\ADF-workbase\BDdraw_DEV\src\pages\canvas\Pixi_STM_modules\core\Core_StageManager.ts#L203-L251) 事件
5. [Core_StageManager.ts](file:///E:/ADF-workbase/BDdraw_DEV/src/pages/canvas/Pixi_STM_modules/core/Core_StageManager.ts) 监听到事件后，在画布上绘制辅助线
6. 如果启用了吸附功能，元素会被"吸"到对齐位置
7. 用户释放鼠标时，拖动操作完成，辅助线被清除

## 性能优化

1. **限制辅助线数量**：最多只显示3条辅助线，避免界面混乱
2. **多选优化**：只在单个元素选择时计算辅助线，多元素选择时不计算以提高性能
3. **事件驱动渲染**：只在需要时才绘制或清除辅助线
4. **视口范围限制**：辅助线只在当前视口范围内绘制，减少不必要的绘制操作

## 可定制性

该系统可以通过以下方式进行定制：

1. **调整吸附阈值**：通过修改 [threshold](file://e:\ADF-workbase\BDdraw_DEV\src\pages\canvas\Pixi_STM_modules\utils\guidelineUtils.ts#L18-L18) 参数来改变元素对齐的敏感度
2. **更改辅助线样式**：修改 [drawGuidelines](file://e:\ADF-workbase\BDdraw_DEV\src\pages\canvas\Pixi_STM_modules\core\Core_StageManager.ts#L203-L251) 方法中的颜色、宽度等参数
3. **扩展对齐类型**：在 [calculateGuidelines](file://e:\ADF-workbase\BDdraw_DEV\src\pages\canvas\Pixi_STM_modules\utils\guidelineUtils.ts#L17-L85) 中添加新的对齐规则