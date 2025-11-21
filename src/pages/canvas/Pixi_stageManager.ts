import * as PIXI from 'pixi.js'
import { useStore, type CanvasElement } from '@/stores/canvasStore'
import { nanoid } from 'nanoid'

export class StageManager {
  public app: PIXI.Application
  private spriteMap: Map<string, PIXI.Graphics> = new Map()
  private isDragging = false
  private startPos!: { x: number; y: number }
  private currentId: string | null = null
  private dragOffset!: { x: number; y: number }
  private destroyed = false

  constructor(container: HTMLElement) {
    this.app = new PIXI.Application()
    this.initApp(container).then(() => {
      this.setupInteraction()

      // 订阅 Store 变化
      useStore.subscribe(
        (state) => ({ elements: state.elements, selectedIds: state.selectedIds }),
        (state) => {
          if (!this.destroyed) {
            this.render(state.elements, state.selectedIds)
          }
        },
        {
          equalityFn: (prev, next) => JSON.stringify(prev) === JSON.stringify(next),
        },
      )

      // 首次渲染
      const { elements, selectedIds } = useStore.getState()
      if (!this.destroyed) {
        this.render(elements, selectedIds)
      }
    })
  }

  private async initApp(container: HTMLElement) {
    await this.app.init({
      background: '#f9fafb', // 对应 bg-gray-50
      resizeTo: container,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    })

    container.appendChild(this.app.canvas)
  }

  private setupInteraction() {
    // 2. 配置舞台交互
    this.app.stage.eventMode = 'static'
    this.app.stage.hitArea = this.app.screen // 确保点击空白处也能触发
    this.app.stage.on('pointerdown', this.onPointerDown)
    this.app.stage.on('pointermove', this.onPointerMove)
    this.app.stage.on('pointerup', this.onPointerUp)
    this.app.stage.on('pointerupoutside', this.onPointerUp)
  }

  // --- 渲染循环 (Diff 算法) ---
  private render(elements: Record<string, CanvasElement>, selectedIds: string[]) {
    if (this.destroyed || !this.app.stage) return

    const elementIds = new Set(Object.keys(elements))

    // --- 1. 处理新增或更新 ---
    elementIds.forEach((id) => {
      const data = elements[id]
      let graphic = this.spriteMap.get(id)

      // 如果图形不存在，初始化实例
      if (!graphic) {
        graphic = new PIXI.Graphics()
        graphic.label = id
        graphic.eventMode = 'static' // 允许交互
        graphic.cursor = 'pointer'

        if (!this.destroyed && this.app.stage) {
          this.app.stage.addChild(graphic)
          this.spriteMap.set(id, graphic)
        }
      }

      if (graphic && !this.destroyed) {
        // 每次渲染前清除旧的绘图指令
        graphic.clear()

        // --- A. 准备样式数据 ---
        // 使用 PIXI.Color 自动解析颜色字符串 (支持 #fff, red, rgba(0,0,0,1) 等)
        const fillColor = new PIXI.Color(data.fill)
        const strokeColor = new PIXI.Color(data.stroke)

        // 处理选中态：如果是选中状态，强制改变边框颜色和宽度
        const isSelected = selectedIds.includes(id)
        const activeStrokeColor = isSelected ? new PIXI.Color(0x165dff) : strokeColor
        // 选中时边框宽度 + 2，且至少为 2 (防止无边框图形选中看不见)
        const activeStrokeWidth = isSelected ? (data.strokeWidth || 0) + 2 : data.strokeWidth
        // 透明度：如果没有定义，默认为 1
        const alpha = data.alpha ?? 1

        // --- B. 定义几何路径 (Geometry) ---
        // 注意：在 Pixi v8 中，先定义路径，再填充和描边

        if (data.type === 'rect') {
          const radius = data.radius ?? 0
          if (radius > 0) {
            // 关键逻辑：圆角不能超过短边的一半
            const maxRadius = Math.min(data.width, data.height) / 2
            graphic.roundRect(0, 0, data.width, data.height, Math.min(radius, maxRadius))
          } else {
            graphic.rect(0, 0, data.width, data.height)
          }
        } else if (data.type === 'circle') {
          // 绘制椭圆/圆
          // 参数：cx, cy, halfWidth, halfHeight
          graphic.ellipse(data.width / 2, data.height / 2, data.width / 2, data.height / 2)
        } else if (data.type === 'triangle') {
          // 绘制等腰三角形
          graphic.poly([
            data.width / 2,
            0, // 顶点 (中上)
            data.width,
            data.height, // 右下
            0,
            data.height, // 左下
          ])
        }

        // --- C. 填充 (Fill) ---
        graphic.fill({
          color: fillColor,
          alpha: alpha, // 这里应用 store 中的 alpha
        })

        // --- D. 描边 (Stroke) ---
        if (activeStrokeWidth > 0) {
          // Pixi v8 stroke 配置对象
          graphic.stroke({
            width: activeStrokeWidth,
            color: activeStrokeColor,
            // 描边通常保持不透明，或者你可以新增 strokeAlpha 字段
            // 如果希望描边也跟随整体透明度，可以设置为 alpha
            alpha: 1,
            alignment: 0.5, // 0.5 = 居中描边 (标准), 0 = 内描边, 1 = 外描边
          })
        }

        // --- E. 设置变换 (Transform) ---
        graphic.position.set(data.x, data.y)
        // 如果需要支持旋转，将来可以在这里加 graphic.rotation = data.rotation
      }
    })

    // --- 2. 处理删除 ---
    this.spriteMap.forEach((graphic, id) => {
      if (!elementIds.has(id)) {
        if (this.app.stage && !this.destroyed) {
          this.app.stage.removeChild(graphic)
        }
        graphic.destroy()
        this.spriteMap.delete(id)
      }
    })
  }

  // --- 交互逻辑 ---

  private onPointerDown = (e: PIXI.FederatedPointerEvent) => {
    if (this.destroyed) return

    const state = useStore.getState()
    const tool = state.tool

    // 获取相对于舞台的坐标
    const localPos = e.getLocalPosition(this.app.stage)

    this.isDragging = true
    this.startPos = { x: localPos.x, y: localPos.y }

    // 场景 A: 点击了某个具体元素 (选中/拖拽)
    if (e.target !== this.app.stage && e.target instanceof PIXI.Graphics) {
      const hitId = e.target.label

      if (tool === 'select') {
        state.setSelected([hitId])
        this.currentId = hitId

        // 记录拖拽偏移量，防止跳变
        const el = state.elements[hitId]
        this.dragOffset = {
          x: localPos.x - el.x,
          y: localPos.y - el.y,
        }
        return // 阻止继续执行后续的创建逻辑
      }
    }

    // 场景 B: 点击了空白处
    if (tool === 'select') {
      // 点击空白取消选中
      state.setSelected([])
      this.currentId = null
      return
    }

    // 场景 C: 绘制新图形 (Rect / Circle)
    const newId = nanoid()
    this.currentId = newId

    // 在 Store 中创建初始大小为 0 的图形
    state.addElement({
      id: newId,
      type: tool as 'rect' | 'circle' | 'triangle',
      x: localPos.x,
      y: localPos.y,
      width: 0,
      height: 0,
      fill: state.currentStyle.fill,
      stroke: state.currentStyle.stroke,
      strokeWidth: state.currentStyle.strokeWidth,
      radius: state.currentStyle.radius,
      alpha: state.currentStyle.alpha,
    })
  }

  private onPointerMove = (e: PIXI.FederatedPointerEvent) => {
    if (this.destroyed || !this.isDragging || !this.currentId) return

    const state = useStore.getState()
    const tool = state.tool
    const localPos = e.getLocalPosition(this.app.stage)

    if (tool === 'select') {
      // 拖拽已有元素
      const dx = localPos.x - this.dragOffset.x
      const dy = localPos.y - this.dragOffset.y
      state.updateElement(this.currentId, { x: dx, y: dy })
    } else {
      // 调整新创建图形的大小
      const width = localPos.x - this.startPos.x
      const height = localPos.y - this.startPos.y

      // 标准化负尺寸（允许从右下往左上绘制）
      const x = width < 0 ? this.startPos.x + width : this.startPos.x
      const y = height < 0 ? this.startPos.y + height : this.startPos.y

      state.updateElement(this.currentId, {
        x,
        y,
        width: Math.abs(width),
        height: Math.abs(height),
      })
    }
  }

  private onPointerUp = () => {
    if (this.destroyed) return
    this.isDragging = false
    // this.currentId = null // 保留引用，方便后续操作
  }

  // 销毁资源
  public destroy() {
    this.destroyed = true
    this.app.destroy(true, {
      children: true,
      texture: true,
    })
  }
}
