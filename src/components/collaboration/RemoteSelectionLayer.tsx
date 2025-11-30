import { useEffect, useRef } from 'react'
import * as PIXI from 'pixi.js'
import { StageManager } from '@/pages/canvas/Pixi_stageManager'
import { useStore } from '@/stores/canvasStore'

interface Props {
  stageManager: StageManager
  awareness: any
}

export const RemoteSelectionLayer = ({ stageManager, awareness }: Props) => {
  // 保存每个元素的用户ID标签 (Container)
  const userIdLabelsRef = useRef<Map<string, PIXI.Container>>(new Map())
  // 保存高亮矩形
  const highlightRectsRef = useRef<Map<string, PIXI.Graphics>>(new Map())
  // 保存每个用户的选中元素
  const userSelectionsRef = useRef<Map<number, string[]>>(new Map())
  // 保存被禁用交互的元素
  const disabledElementsRef = useRef<Set<string>>(new Set())

  // 监听 Awareness 变化并更新元素样式
  useEffect(() => {
    if (!awareness) return

    const updateRemoteSelectionStyles = () => {
      const states = awareness.getStates() as Map<number, any>
      const myClientId = awareness.clientID
      const elements = useStore.getState().elements
      const spriteMap = stageManager.elementRenderer.getSpriteMap()

      // --- 清理逻辑 ---
      userIdLabelsRef.current.forEach((label) => {
        if (label.parent) label.parent.removeChild(label)
        label.destroy()
      })
      userIdLabelsRef.current.clear()

      highlightRectsRef.current.forEach((rect) => {
        if (rect.parent) rect.parent.removeChild(rect)
        rect.destroy()
      })
      highlightRectsRef.current.clear()

      userSelectionsRef.current.clear()

      disabledElementsRef.current.forEach((elId) => {
        const graphic = spriteMap.get(elId)
        if (graphic) graphic.eventMode = 'static'
      })
      disabledElementsRef.current.clear()
      // ----------------

      // 处理每个远程用户的选择状态
      states.forEach((state, clientId) => {
        if (clientId === myClientId) return

        const selection: string[] = state.selection || []
        const userColor = state.user?.color || '#ff0000'
        const userName = state.user?.name || `User ${clientId}`
        const colorInt = parseInt(userColor.slice(1), 16)

        userSelectionsRef.current.set(clientId, selection)

        selection.forEach((elId) => {
          const el = elements[elId]
          const graphic = spriteMap.get(elId)

          if (el && graphic) {
            const highlightGraphic = new PIXI.Graphics()
            const padding = 4

            // === 1. 绘制高亮框 ===
            const isPathBased = el.type === 'line' || el.type === 'arrow' || el.type === 'pencil'

            // 用于计算 Label 位置的参考点
            let labelX = 0
            let labelY = 0

            // 几何中心
            const w = el.width || 0
            const h = el.height || 0
            const centerX = el.x + w / 2
            const centerY = el.y + h / 2

            if (isPathBased && el.points && el.points.length >= 2) {
              // --- 路径元素 (Line/Arrow/Pencil) ---

              // 关键修复：计算中心点偏移量
              // 我们要以 (0,0) 为图形中心进行绘制，这样旋转才不会飘
              const offsetX = w / 2
              const offsetY = h / 2

              const p0 = el.points[0]
              // 绘制点减去偏移量
              highlightGraphic.moveTo(p0[0] - offsetX, p0[1] - offsetY)

              for (let i = 1; i < el.points.length; i++) {
                highlightGraphic.lineTo(el.points[i][0] - offsetX, el.points[i][1] - offsetY)
              }

              highlightGraphic.stroke({
                width: (el.strokeWidth || 2) + 8,
                color: colorInt,
                alpha: 0.4,
                cap: 'round',
                join: 'round',
              })

              // 定位到几何中心，并应用旋转
              highlightGraphic.position.set(centerX, centerY)
              if (el.rotation) highlightGraphic.rotation = el.rotation

              // --- 计算 Label 位置 (路径终点) ---
              // 计算终点相对于中心的坐标，并旋转
              const lastPoint = el.points[el.points.length - 1]

              // 终点相对于中心的坐标
              const localEndX = lastPoint[0] - offsetX
              const localEndY = lastPoint[1] - offsetY

              const angle = el.rotation || 0
              const cos = Math.cos(angle)
              const sin = Math.sin(angle)

              // 旋转向量
              const rotatedEndX = localEndX * cos - localEndY * sin
              const rotatedEndY = localEndX * sin + localEndY * cos

              // 最终世界坐标 = 中心 + 旋转后的向量
              labelX = centerX + rotatedEndX
              labelY = centerY + rotatedEndY
            } else {
              // --- 块级元素 (Rect/Text/Image/Group) ---

              // 绘制相对于自身中心的矩形
              highlightGraphic.rect(-w / 2 - padding, -h / 2 - padding, w + padding * 2, h + padding * 2)

              highlightGraphic.stroke({ width: 2, color: colorInt, alpha: 0.8 })
              highlightGraphic.fill({ color: colorInt, alpha: 0.1 })

              // 将高亮框定位到中心，并应用旋转
              highlightGraphic.position.set(centerX, centerY)
              if (el.rotation) highlightGraphic.rotation = el.rotation

              // --- 计算 Label 坐标 (右下角) ---
              const angle = el.rotation || 0
              const cos = Math.cos(angle)
              const sin = Math.sin(angle)

              // 原始右下角相对于中心的坐标
              const localBottomRightX = w / 2
              const localBottomRightY = h / 2

              // 旋转该向量
              const rotatedX = localBottomRightX * cos - localBottomRightY * sin
              const rotatedY = localBottomRightX * sin + localBottomRightY * cos

              labelX = centerX + rotatedX
              labelY = centerY + rotatedY
            }

            // 添加高亮框到场景
            if (graphic.parent) {
              const index = graphic.parent.getChildIndex(graphic)
              graphic.parent.addChildAt(highlightGraphic, index)
              highlightRectsRef.current.set(elId, highlightGraphic)
            }

            // === 2. 绘制用户 ID 标签 ===
            const selectedlabel = '选中者：' + userName
            const userIdLabel = new PIXI.Text(selectedlabel, {
              fontSize: 14,
              fill: userColor,
              fontWeight: 'bold',
            })

            const background = new PIXI.Graphics()
            background.roundRect(0, 0, userIdLabel.width + 8, userIdLabel.height + 4, 3)
            background.fill({ color: 0xffffff, alpha: 0.9 })
            background.stroke({ width: 1, color: colorInt })

            const labelContainer = new PIXI.Container()
            labelContainer.addChild(background)
            labelContainer.addChild(userIdLabel)
            userIdLabel.position.set(4, 2)

            // 设置 Label 位置
            labelContainer.position.set(labelX - 10, labelY + 10)

            stageManager.uiLayer.addChild(labelContainer)
            userIdLabelsRef.current.set(elId, labelContainer)

            graphic.eventMode = 'none'
            disabledElementsRef.current.add(elId)
          }
        })
      })
    }

    awareness.on('change', updateRemoteSelectionStyles)
    const unsubscribeElements = useStore.subscribe((state) => state.elements, updateRemoteSelectionStyles)
    const unsubscribeSelectedIds = useStore.subscribe((state) => state.selectedIds, updateRemoteSelectionStyles)

    const handleViewportChange = () => updateRemoteSelectionStyles()
    const viewport = stageManager.viewport
    if (viewport) {
      viewport.on('moved', handleViewportChange)
      viewport.on('zoomed', handleViewportChange)
    }

    updateRemoteSelectionStyles()

    return () => {
      awareness.off('change', updateRemoteSelectionStyles)
      unsubscribeElements()
      unsubscribeSelectedIds()
      if (viewport) {
        viewport.off('moved', handleViewportChange)
        viewport.off('zoomed', handleViewportChange)
      }

      userIdLabelsRef.current.forEach((l) => l.destroy({ children: true }))
      highlightRectsRef.current.forEach((r) => r.destroy())

      const spriteMap = stageManager.elementRenderer.getSpriteMap()
      disabledElementsRef.current.forEach((elId) => {
        const g = spriteMap.get(elId)
        if (g) g.eventMode = 'static'
      })
    }
  }, [awareness, stageManager])

  return null
}
