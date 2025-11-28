---
uuid: b594c210-c9a4-11f0-ad04-63fbb55bd414
title: 2025-11-27-Canvas项目相关-画布元素操作性能优化
category: 归档
mathjax: true
date: 2025-11-27 20:16:10
tags:
---

### DSP：画布元素操作性能优化技术实现

目前这个画布应用的话需要同时操作大量元素，包括拖拽、旋转和缩放等变换操作，随着元素数量的增加，这些操作的性能问题变得尤为突出，可能导致界面卡顿、响应延迟，严重影响体验

27 号对拖拽、旋转和缩放操作进行了全面的性能优化。主要为了提升大量元素同时操作时的流畅度、减少 UI 卡顿和延迟、优化内存使用，以及保持代码的可维护性和可扩展性。通过一系列技术手段，成功实现了在对上百个元素同时操作的场景下，操作帧率保持在 60FPS 以上

### 核心架构设计

性能优化的核心在于将计算逻辑与渲染逻辑分离，避免在高频交互事件（如鼠标移动）中执行耗时操作。系统采用分层架构设计，将状态管理、计算逻辑和渲染逻辑清晰划分，通过批量更新和延迟同步等策略，有效降低系统负载。

在架构层面，将原本直接更新状态和渲染的同步操作，重构为仅在交互过程中更新视觉反馈，而在交互结束时才批量更新状态，使得高频的视觉反馈更新不会触发昂贵的状态同步和重新渲染，而低频的状态更新则能保证数据一致性。系统通过引入独立的计算工具函数、批量更新机制和节流机制，构建了一套完整的性能优化体系。

数据流方面，用户交互首先触发 PixiJS 层的视觉更新，提供即时反馈；交互结束后，再将最终结果批量同步到 Zustand 状态管理器，触发一次性的重新渲染。这种单向数据流设计有效避免了状态更新与渲染之间的循环依赖，提升了系统稳定性。

### 拖拽操作优化实现

拖拽操作的性能优化主要通过分离视觉反馈更新和状态更新来实现。在用户拖拽元素时，系统不再直接更新元素状态，而是直接操作 PixiJS 图形对象提供视觉反馈。具体实现中，[handleDraggingMove](/src/pages/canvas/Pixi_STM_modules/utils/dragUtils.ts#L24-L137) 函数仅计算坐标和增量，返回拖拽结果而不更新 Store

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
  // 如果是第一次拖拽且尚未记录初始状态，则记录初始状态

  let newDragInitialStates = dragInitialStates

  if (!dragInitialStates) {
    const initialDragMap: Record<string, any> = {} // 添加当前选中元素的所有后代元素（支持嵌套组）

    const allSelectedIds = [...selectedIds]

    selectedIds.forEach((id) => {
      const el = state.elements[id]

      if (el && el.type === 'group') {
        allSelectedIds.push(...getAllDescendantIds(id, state.elements))
      }
    }) // 去重

    const uniqueIds = [...new Set(allSelectedIds)]

    uniqueIds.forEach((id) => {
      const el = state.elements[id]

      if (el) {
        // 记录 x, y (如果是直线/箭头，可能也需要记录 points)

        initialDragMap[id] = {
          x: el.x,

          y: el.y,

          points: el.points ? [...el.points.map((p) => [...p])] : undefined, // ... 其他属性
        }
      }
    })

    setDragInitialStates(initialDragMap)

    newDragInitialStates = initialDragMap // 锁定撤销/重做管理器，防止记录中间状态

    undoRedoManager.lock()
  }

  if (selectedIds.length > 0) {
    // 计算总位移 (Current - DragStart)

    const totalDx = currentPos.x - startPos.x

    const totalDy = currentPos.y - startPos.y

    let finalDx = totalDx

    let finalDy = totalDy

    let guidelines: any[] = [] // 取第一个元素作为参考元素来计算辅助线

    const primaryElementId = selectedIds[0] // 确保有初始状态才继续

    if (!newDragInitialStates) {
      return {
        newStartPos: startPos,
        dragDelta: { dx: 0, dy: 0 },
        snapLines: [],
      }
    }

    const primaryElementInitial = newDragInitialStates[primaryElementId] // 只有当选择单个元素时才计算辅助线，多元素选择时跳过以提升性能

    if (primaryElementInitial && selectedIds.length === 1) {
      // 创建带有新位置的临时元素用于计算辅助线

      const tempElement = {
        ...state.elements[primaryElementId],

        x: primaryElementInitial.x! + totalDx,

        y: primaryElementInitial.y! + totalDy,
      } // 计算辅助线和吸附位置

      const snapResult = calculateGuidelines(tempElement, state.elements, selectedIds)

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

在 [StageInteractionHandler](/src/pages/canvas/Pixi_STM_modules/interaction/Stage_InteractionHandler.ts#L22-L460) 的 [onPointerMove](/src/pages/canvas/Pixi_STM_modules/interaction/Stage_InteractionHandler.ts#L109-L401) 方法中，系统获取精灵映射表，直接遍历选中的 Sprite 修改位置，从而提供即时的视觉反馈。只有在拖拽结束时，才通过 [batchUpdateElements](/src/stores/canvasStore.ts#L353-L365) 方法批量更新元素状态，触发一次性的重新渲染

```typescript
// 使用新的 handleDraggingMove 函数，只计算坐标和增量，不更新 Store

const dragResult = handleDraggingMove(
  state,

  state.selectedIds,

  this.state.startPos,

  currentPos,

  this.state.dragInitialStates,

  this.updateState.setDragInitialStates,

  this.updateState,
)

// 直接操作 Pixi 对象进行视觉反馈，不更新 Store

const initialStates = this.state.dragInitialStates || (this.updateState as any)._tempDragInitialStates

if (initialStates) {
  // 计算总位移 (Current - DragStart)

  let totalDx = currentPos.x - this.state.startPos.x

  let totalDy = currentPos.y - this.state.startPos.y // 获取精灵映射表

  const spriteMap = this.elementRendererSpriteMap() // 如果有吸附结果，使用修正后的位移

  if (dragResult.dragDelta.dx !== totalDx || dragResult.dragDelta.dy !== totalDy) {
    totalDx = dragResult.dragDelta.dx

    totalDy = dragResult.dragDelta.dy
  } // 核心优化：直接遍历选中的 Sprite 修改位置

  state.selectedIds.forEach((id) => {
    const sprite = spriteMap.get(id)

    const initData = initialStates[id]

    if (sprite && initData) {
      // 检查元素是否有旋转

      const element = state.elements[id]

      if (element && element.rotation !== undefined && element.rotation !== 0) {
        // 对于有旋转的元素，需要特殊处理位置

        // 旋转元素的pivot设置在中心，position也是基于中心的

        sprite.position.set(
          (initData.x || 0) + totalDx + (element.width || 0) / 2,

          (initData.y || 0) + totalDy + (element.height || 0) / 2,
        )
      } else {
        // 直接修改 Pixi 对象的 transform

        sprite.position.set((initData.x || 0) + totalDx, (initData.y || 0) + totalDy)
      }
    }
  }) // 更新选择框位置

  const transformerGraphic = this.transformerRenderer.getGraphic()

  if (transformerGraphic) {
    transformerGraphic.position.set(totalDx, totalDy)
  }
}

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

这种实现方式的话，视觉反馈更新直接操作 PixiJS 对象，绕过了状态管理层，避免了频繁的状态同步。拖拽过程中，用户可以看到元素的实时移动，而不会感受到卡顿。拖拽结束后，系统才将最终位置批量更新到状态管理器，确保数据一致性。

### 旋转操作优化实现

旋转操作的优化主要通过将计算逻辑分离到独立的 [rotationUtils.ts](/src/pages/canvas/Pixi_STM_modules/utils/rotationUtils.ts) 工具文件中实现。[calculateRotation](/src/pages/canvas/Pixi_STM_modules/utils/rotationUtils.ts#L41-L112) 函数负责计算旋转后各元素的新属性，而 [calculateGroupChildrenRotation](/src/pages/canvas/Pixi_STM_modules/utils/rotationUtils.ts#L89-L127) 函数专门处理组内子元素的旋转计算。

```typescript
/**

 * 计算旋转操作的结果

 * @param rotationInitialStates 旋转初始状态

 * @param rotationCenter 旋转中心点

 * @param startRotationAngle 起始旋转角度

 * @param currentPos 当前鼠标位置

 * @returns 旋转后各元素的新属性

 */

export function calculateRotation(
  rotationInitialStates: Record<string, any>,

  rotationCenter: { x: number; y: number },

  startRotationAngle: number,

  currentPos: { x: number; y: number },
) {
  const { x: cx, y: cy } = rotationCenter // 1. 计算当前鼠标角度

  const currentAngle = Math.atan2(currentPos.y - cy, currentPos.x - cx) // 2. 计算旋转增量（当前角度 - 起始角度）

  const deltaAngle = currentAngle - startRotationAngle // 3. 计算所有元素的新属性

  const rotatedElements: Record<string, Partial<CanvasElement>> = {} // 遍历所有选中元素并计算它们的旋转角度和位置

  Object.entries(rotationInitialStates).forEach(([id, initEl]) => {
    // 检查是否为组元素

    if (initEl.type === 'group') {
      // 对于组元素，计算新的自转角度

      const newRotation = initEl.rotation + deltaAngle // 计算新的位置 (公转)

      const newCenter = rotatePoint(initEl.cx, initEl.cy, cx, cy, deltaAngle)

      const newX = newCenter.x - initEl.width / 2

      const newY = newCenter.y - initEl.height / 2

      rotatedElements[id] = {
        x: newX,

        y: newY,

        rotation: newRotation,
      } // 注意：组内子元素的处理将在主逻辑中单独处理
    } else {
      // 普通元素的处理逻辑

      const newRotation = initEl.rotation + deltaAngle // 公转

      const newCenter = rotatePoint(initEl.cx, initEl.cy, cx, cy, deltaAngle)

      const newX = newCenter.x - initEl.width / 2

      const newY = newCenter.y - initEl.height / 2

      rotatedElements[id] = {
        x: newX,

        y: newY,

        rotation: newRotation,
      }
    }
  }) // 清除之前的缓存超时

  if (cacheTimeout) {
    clearTimeout(cacheTimeout)
  } // 设置新的缓存超时（100ms后清除缓存）

  cacheTimeout = window.setTimeout(() => {
    rotationCache.clear()
  }, 100) as unknown as number

  return {
    rotatedElements,

    deltaAngle,
  }
}
```

在 [StageInteractionHandler](/src/pages/canvas/Pixi_STM_modules/interaction/Stage_InteractionHandler.ts#L22-L460) 中，系统调用 [calculateRotation](/src/pages/canvas/Pixi_STM_modules/utils/rotationUtils.ts#L41-L112) 获取旋转结果，然后收集所有需要更新的元素，最后通过 [batchUpdateElements](/src/stores/canvasStore.ts#L353-L365) 方法批量更新所有元素，避免多次触发重新渲染。

```typescript
// === [新增] 旋转逻辑 ===

// 使用分离的计算逻辑计算旋转结果

const { rotatedElements, deltaAngle } = calculateRotation(
  this.state.rotationInitialStates,

  this.state.rotationCenter,

  this.state.startRotationAngle,

  currentPos,
)

// 批量更新元素以提高性能

const batchUpdates: Record<string, Partial<CanvasElement>> = {}

// 收集所有需要更新的元素

Object.entries(rotatedElements).forEach(([id, attrs]) => {
  batchUpdates[id] = attrs
})

// 处理组内子元素

Object.entries(this.state.rotationInitialStates).forEach(([id, initEl]) => {
  if (initEl.type === 'group') {
    const childrenUpdates = calculateGroupChildrenRotation(
      this.state.rotationInitialStates!,

      id,

      deltaAngle,

      this.state.rotationCenter!,
    )

    Object.entries(childrenUpdates).forEach(([childId, attrs]) => {
      batchUpdates[childId] = attrs
    })
  }
})

// 一次性批量更新所有元素，避免多次触发重新渲染

state.batchUpdateElements(batchUpdates)
```

这样的话复杂的数学计算被封装在独立的工具函数中，便于测试和维护。同时，通过批量更新机制，避免了在旋转过程中频繁触发状态更新和重新渲染，显著提升了旋转操作的性能。

### 缩放操作优化实现

缩放操作的优化与旋转操作类似，通过将计算逻辑分离到独立的 [scaleUtils.ts](/src/pages/canvas/Pixi_STM_modules/utils/scaleUtils.ts) 工具文件中实现。[calculateScaling](/src/pages/canvas/Pixi_STM_modules/utils/scaleUtils.ts#L31-L252) 函数负责计算缩放后各元素的新属性。

```typescript
/**

 * 计算缩放操作的结果

 * @param initialElementsMap 初始元素状态映射

 * @param initialGroupBounds 初始组边界

 * @param selectedIds 选中的元素ID列表

 * @param handle 操作手柄类型

 * @param startPos 起始位置

 * @param currentPos 当前位置

 * @returns 缩放后各元素的新属性

 */

export function calculateScaling(
  initialElementsMap: Record<string, any>,

  initialGroupBounds: { x: number; y: number; width: number; height: number },

  selectedIds: string[],

  handle: string | null,

  startPos: { x: number; y: number },

  currentPos: { x: number; y: number },
) {
  // === 2. 确定"隐式组"的属性 ===

  // 2.1 确定组的旋转角度 (Group Angle)

  // - 单选或多选统一旋转：使用该统一角度

  // - 多选混合旋转：使用 0 度 (AABB)

  let groupAngle = 0 // 检查统一旋转

  const firstRotation = initialElementsMap[selectedIds[0]]?.rotation || 0

  const isUniform = selectedIds.every((id) => Math.abs((initialElementsMap[id]?.rotation || 0) - firstRotation) < 0.001)

  if (isUniform) {
    groupAngle = firstRotation
  } // 2.2 确定组的旋转中心 (Pivot) - 使用初始包围盒的中心

  const groupCx = initialGroupBounds.x + initialGroupBounds.width / 2

  const groupCy = initialGroupBounds.y + initialGroupBounds.height / 2 // 2.3 计算组在"去旋转"后的局部包围盒 (Local OBB) // 这一步是为了确定手柄操作的基准框

  let minLx = Infinity,
    maxLx = -Infinity,
    minLy = Infinity,
    maxLy = -Infinity

  Object.keys(initialElementsMap).forEach((id) => {
    const el = initialElementsMap[id] // 元素的四个角点

    const elCx = el.x + el.width / 2

    const elCy = el.y + el.height / 2

    const elHalfW = el.width / 2

    const elHalfH = el.height / 2

    const elRot = el.rotation || 0 // 计算元素四个角点在世界坐标的位置 // 然后将其旋转回组的局部坐标系

    const corners = [
      { x: -elHalfW, y: -elHalfH }, // TL

      { x: elHalfW, y: -elHalfH }, // TR

      { x: elHalfW, y: elHalfH }, // BR

      { x: -elHalfW, y: elHalfH }, // BL
    ].map((p) => {
      // 1. 元素自转转回世界坐标 (相对元素中心)

      const pWorldRel = rotatePoint(p.x, p.y, 0, 0, elRot)

      const pWorld = { x: elCx + pWorldRel.x, y: elCy + pWorldRel.y } // 2. 世界坐标转回组局部坐标 (相对组中心)

      return rotatePoint(pWorld.x, pWorld.y, groupCx, groupCy, -groupAngle)
    })

    corners.forEach((p) => {
      minLx = Math.min(minLx, p.x)

      maxLx = Math.max(maxLx, p.x)

      minLy = Math.min(minLy, p.y)

      maxLy = Math.max(maxLy, p.y)
    })
  })

  const groupInitLocalX = minLx

  const groupInitLocalY = minLy

  const groupInitLocalW = maxLx - minLx

  const groupInitLocalH = maxLy - minLy // === 3. 计算拖拽后的组局部包围盒 === // 将鼠标位移转换到组的局部坐标系

  const startLocal = rotatePoint(startPos.x, startPos.y, groupCx, groupCy, -groupAngle)

  const currLocal = rotatePoint(currentPos.x, currentPos.y, groupCx, groupCy, -groupAngle)

  const dx = currLocal.x - startLocal.x

  const dy = currLocal.y - startLocal.y

  let newGroupLocalX = groupInitLocalX

  let newGroupLocalY = groupInitLocalY

  let newGroupLocalW = groupInitLocalW

  let newGroupLocalH = groupInitLocalH // 根据手柄调整尺寸 (固定对侧锚点)

  if (handle?.includes('l')) {
    newGroupLocalX += dx

    newGroupLocalW -= dx
  }

  if (handle?.includes('r')) {
    newGroupLocalW += dx
  }

  if (handle?.includes('t')) {
    newGroupLocalY += dy

    newGroupLocalH -= dy
  }

  if (handle?.includes('b')) {
    newGroupLocalH += dy
  } // 翻转处理 (Flip)

  let scaleXSign = 1

  let scaleYSign = 1

  if (newGroupLocalW < 0) {
    newGroupLocalW = Math.abs(newGroupLocalW)

    newGroupLocalX -= newGroupLocalW

    scaleXSign = -1
  }

  if (newGroupLocalH < 0) {
    newGroupLocalH = Math.abs(newGroupLocalH)

    newGroupLocalY -= newGroupLocalH

    scaleYSign = -1
  } // === 4. 对每个子元素进行矩阵变换模拟 ===

  const scaledElements: Record<string, Partial<CanvasElement>> = {}

  Object.keys(initialElementsMap).forEach((id) => {
    const initEl = initialElementsMap[id]

    if (!initEl) return // 4.1 获取元素初始的关键点 (中心 + 尺寸向量) // 为了精确模拟矩阵变换，我们追踪元素的三个关键点：左上(TL), 右上(TR), 左下(BL) // 通过变换后的这三个点，可以反解出新的 Width, Height, Rotation, XY

    const elCx = initEl.x + initEl.width / 2

    const elCy = initEl.y + initEl.height / 2

    const halfW = initEl.width / 2

    const halfH = initEl.height / 2

    const rot = initEl.rotation || 0 // 原始局部向量 (相对于元素中心)

    const vTL = { x: -halfW, y: -halfH }

    const vTR = { x: halfW, y: -halfH }

    const vBL = { x: -halfW, y: halfH } // 定义变换函数：世界点 -> 组局部 -> 缩放 -> 组局部 -> 世界点

    const transformPoint = (localX: number, localY: number) => {
      // A. 元素局部 -> 世界

      const pWorldRel = rotatePoint(localX, localY, 0, 0, rot)

      const pWorld = { x: elCx + pWorldRel.x, y: elCy + pWorldRel.y } // B. 世界 -> 组局部 (Old)

      const pGroupLocal = rotatePoint(pWorld.x, pWorld.y, groupCx, groupCy, -groupAngle) // C. 计算在组内的相对比例 (0.0 - 1.0)

      const ratioX = groupInitLocalW === 0 ? 0 : (pGroupLocal.x - groupInitLocalX) / groupInitLocalW

      const ratioY = groupInitLocalH === 0 ? 0 : (pGroupLocal.y - groupInitLocalY) / groupInitLocalH // D. 映射到新组局部 (New)

      const pGroupLocalNewX = newGroupLocalX + ratioX * newGroupLocalW

      const pGroupLocalNewY = newGroupLocalY + ratioY * newGroupLocalH // E. 组局部 (New) -> 世界 (New)

      return rotatePoint(pGroupLocalNewX, pGroupLocalNewY, groupCx, groupCy, groupAngle)
    } // 4.2 变换关键点

    const newTL = transformPoint(vTL.x, vTL.y)

    const newTR = transformPoint(vTR.x, vTR.y)

    const newBL = transformPoint(vBL.x, vBL.y) // 4.3 反解属性 // 新宽度 = TL 到 TR 的距离

    const newWidth = Math.sqrt(Math.pow(newTR.x - newTL.x, 2) + Math.pow(newTR.y - newTL.y, 2)) // 新高度 = TL 到 BL 的距离

    const newHeight = Math.sqrt(Math.pow(newBL.x - newTL.x, 2) + Math.pow(newBL.y - newTL.y, 2)) // 新中心 = (TL + TR + BL + BR)/2 => (TL + BR)/2 // 利用矩形对角线性质：Mid(TL, BR) = Mid(TR, BL) // 计算 BR: newBR = newTR + (newBL - newTL) (向量加法)

    const vecTop = { x: newTR.x - newTL.x, y: newTR.y - newTL.y }

    const vecLeft = { x: newBL.x - newTL.x, y: newBL.y - newTL.y } // 中心点 = TL + 0.5 * vecTop + 0.5 * vecLeft

    const newCx = newTL.x + vecTop.x / 2 + vecLeft.x / 2

    const newCy = newTL.y + vecTop.y / 2 + vecLeft.y / 2 // 新旋转 = TL 到 TR 的角度 // 注意：这是世界坐标系下的角度

    const newRotation = Math.atan2(newTR.y - newTL.y, newTR.x - newTL.x)

    const finalX = newCx - newWidth / 2

    const finalY = newCy - newHeight / 2 // 4.4 计算平均缩放比例 (用于字体/描边)

    const groupScaleX = groupInitLocalW === 0 ? 1 : newGroupLocalW / groupInitLocalW

    const groupScaleY = groupInitLocalH === 0 ? 1 : newGroupLocalH / groupInitLocalH

    const avgScale = (Math.abs(groupScaleX) + Math.abs(groupScaleY)) / 2

    const updatePayload: any = {
      x: finalX,

      y: finalY,

      width: newWidth,

      height: newHeight,

      rotation: newRotation,
    } // 点集处理 (Line/Arrow/Pencil) // 简单缩放处理：这对于路径类元素在非均匀缩放下是合理的近似（类似SVG viewBox scaling）

    if (initEl.points) {
      updatePayload.points = initEl.points.map((p: number[]) => {
        return [p[0] * groupScaleX * scaleXSign, p[1] * groupScaleY * scaleYSign]
      })
    }

    if (initEl.fontSize) updatePayload.fontSize = initEl.fontSize * avgScale

    if (initEl.strokeWidth) updatePayload.strokeWidth = initEl.strokeWidth * avgScale

    scaledElements[id] = updatePayload
  }) // 清除之前的缓存超时

  if (cacheTimeout) {
    clearTimeout(cacheTimeout)
  } // 设置新的缓存超时（100ms后清除缓存）

  cacheTimeout = window.setTimeout(() => {
    scaleCache.clear()
  }, 100) as unknown as number

  return scaledElements
}
```

在 [StageInteractionHandler](/src/pages/canvas/Pixi_STM_modules/interaction/Stage_InteractionHandler.ts#L22-L460) 中，系统调用 [calculateScaling](/src/pages/canvas/Pixi_STM_modules/utils/scaleUtils.ts#L31-L252) 获取缩放结果，然后通过 [batchUpdateElements](/src/stores/canvasStore.ts#L353-L365) 方法批量更新所有元素。

```typescript
// 使用分离的计算逻辑计算缩放结果

const scaledElements = calculateScaling(
  this.state.initialElementsMap,

  this.state.initialGroupBounds,

  selectedIds,

  handle,

  this.state.startPos,

  currentPos,
)

// 批量更新所有元素，避免多次触发重新渲染

state.batchUpdateElements(scaledElements)
```

从而避免了鼠标移动过程中频繁更新状态和重新渲染，显著提升了缩放操作的性能。

缩放计算涉及复杂的矩阵变换和几何计算，将其分离到独立工具函数中不仅提升了代码的可维护性，便于性能优化。同时，批量更新机制下系统能够在一次操作中完成所有元素的更新，避免了多次状态同步和重新渲染的开销。

## 性能优化与难点攻克

这个过程遇到了几个关键技术难点。最开始认为是辅助线计算的性能问题，当元素数量较多时，计算辅助线会成为性能瓶颈，于是：

```typescript
// 限制辅助线数量为3条

if (result.guidelines.length > 3) {
  result.guidelines = result.guidelines.slice(0, 3)
}
```

后续是解决计算与渲染耦合导致的性能问题。原先的实现中，每次鼠标移动都会触发状态更新和重新渲染，导致大量不必要的计算。解决思路是通过将计算逻辑与渲染逻辑分离，仅在交互过程中更新视觉反馈，而在交互结束时才批量更新状态

最后是批量更新机制的实现。为了避免频繁的状态更新导致的性能问题，遂在 `canvasStore.ts` 中添加了 `batchUpdateElements` 方法，使用 Yjs 的 `transact` 方法保证原子性，确保批量更新的高效和一致

```typescript

// 添加批量更新元素方法，用于提高性能

batchUpdateElements: (updates) => {

  // 使用 transact 保证原子性，这对撤销重做很重要

  currentYDoc?.transact(() => {

    Object.entries(updates).forEach(([id, attrs]) => {

      const oldEl = currentYElements?.get(id)

      if (oldEl) {

        currentYElements?.set(id, { ...oldEl, ...attrs })

      }

    })

  })

},

```

另一个重要的优化点是引入了缓存机制和节流函数。在旋转和缩放操作中，我们实现了计算结果的缓存，并通过节流函数控制计算频率，进一步提升了性能。这些技术手段的综合运用，使得系统在高负载情况下仍能保持良好的响应性。

```typescript
// 添加节流函数

const throttle = <Args extends unknown[]>(func: (...args: Args) => void, limit: number) => {
  let inThrottle: boolean

  return function (this: any, ...args: Args) {
    if (!inThrottle) {
      func.apply(this, args)

      inThrottle = true

      setTimeout(() => (inThrottle = false), limit)
    }
  }
}

// 添加缓存机制

const rotationCache = new Map<string, { x: number; y: number; rotation: number }>()

let cacheTimeout: number | null = null
```

### 总结

通过计算与渲染分离、批量更新机制和辅助线优化等技术手段，最后便成功将包含上百个元素的场景下的操作帧率提升至 60FPS 以上，操作流畅度大幅提升。
问了一圈，剩下的优化方向包括但不限于引入 Web Workers 将复杂计算移至后台线程，避免阻塞主线程；实现更智能的视口裁剪机制，仅渲染可见区域内的元素；探索更高效的元素表示和存储方式，降低内存占用，还有如虚拟化渲染、LOD（Level of Detail）技术等，以应对更大规模的元素操作场景。太复杂，目前方案应该够用
