import type { CanvasElement } from '@/stores/canvasStore'

/**
 * 递归获取所有需要更新的子节点状态
 * @param groupId 组ID
 * @param scaleX X轴缩放比例
 * @param scaleY Y轴缩放比例
 * @param groupX 组的新位置X
 * @param groupY 组的新位置Y
 * @param groupInitX 组的原始X位置
 * @param groupInitY 组的原始Y位置
 * @param groupInitW 组的原始宽度
 * @param groupInitH 组的原始高度
 * @param elementsSnapshot 元素快照映射
 */
export function getGroupResizeUpdates(
  groupId: string,
  scaleX: number,
  scaleY: number,
  // 组的新位置
  groupX: number,
  groupY: number,
  // 组的原始尺寸（用于计算相对位置）
  groupInitX: number,
  groupInitY: number,
  groupInitW: number,
  groupInitH: number,
  elementsSnapshot: Record<string, any>, // 传入 initialElementsMap
): Record<string, Partial<CanvasElement>> {
  const updates: Record<string, Partial<CanvasElement>> = {}
  const groupEl = elementsSnapshot[groupId] as any

  if (!groupEl || !groupEl.children) return updates

  groupEl.children.forEach((childId: string) => {
    const childInit = elementsSnapshot[childId]
    if (!childInit) return

    // 1. 计算相对比例
    const relX = (childInit.x - groupInitX) / groupInitW
    const relY = (childInit.y - groupInitY) / groupInitH
    const relW = childInit.width / groupInitW
    const relH = childInit.height / groupInitH

    // 2. 计算新属性
    const newX = groupX + relX * (groupInitW * scaleX)
    const newY = groupY + relY * (groupInitH * scaleY)
    const newW = childInit.width * scaleX
    const newH = childInit.height * scaleY

    // 字体和描边缩放 (取平均值)
    const avgScale = (Math.abs(scaleX) + Math.abs(scaleY)) / 2

    const childUpdate: any = {
      x: newX,
      y: newY,
      width: newW,
      height: newH,
    }

    // 缩放字体大小
    if (childInit.fontSize) {
      childUpdate.fontSize = childInit.fontSize * avgScale
    }

    // 缩放描边宽度
    if (childInit.strokeWidth) {
      childUpdate.strokeWidth = childInit.strokeWidth * avgScale
    }

    if (childInit.points) {
      childUpdate.points = childInit.points.map((p: number[]) => [p[0] * scaleX, p[1] * scaleY])
    }

    updates[childId] = childUpdate

    // 3. 递归：如果子元素也是组，基于子元素的新状态继续计算孙子元素
    if (childInit.type === 'group') {
      const nestedUpdates = getGroupResizeUpdates(
        childId,
        scaleX, // 传递累积缩放或保持当前缩放，视逻辑而定。这里简化为直接传递，因为我们是基于最外层组计算的
        scaleY,
        newX,
        newY,
        childInit.x,
        childInit.y,
        childInit.width,
        childInit.height,
        elementsSnapshot,
      )
      Object.assign(updates, nestedUpdates)
    }
  })

  return updates
}
