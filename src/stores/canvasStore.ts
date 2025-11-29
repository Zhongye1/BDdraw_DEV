//快_snapshot机制大本营
import { create } from 'zustand'
import { subscribeWithSelector, devtools } from 'zustand/middleware'
import { nanoid } from 'nanoid'
import { undoRedoManager } from '@/lib/UndoRedoManager'
import { AddElementCommand } from '@/lib/AddElementCommand'
import { RemoveElementCommand } from '@/lib/RemoveElementCommand'
import * as Y from 'yjs'

export type ToolType =
  | 'select'
  | 'hand'
  | 'rect'
  | 'circle'
  | 'triangle'
  | 'diamond'
  | 'line'
  | 'arrow'
  | 'pencil'
  | 'text'
  | 'image' // 添加 image 类型
  | 'eraser'
  | 'group'

export interface CanvasElement {
  id: string
  type: ToolType
  x: number
  y: number
  width: number
  height: number
  fill: string
  stroke: string
  strokeWidth: number
  alpha?: number
  points?: number[][]
  rotation?: number // 新增：弧度制 (radians)元素旋转要用

  // [新增] 文本相关属性
  text?: string // 存储 HTML 字符串
  fontSize?: number
  fontFamily?: string
  textAlign?: 'left' | 'center' | 'right'

  // [新增] 图像相关属性
  imageUrl?: string
  filter?: 'none' | 'blur' | 'brightness' | 'grayscale' // 三种滤镜加一个无滤镜选项

  // 矩形圆角属性
  radius?: number

  // 分组相关属性
  groupId?: string // 元素所属的组ID
}

// 添加组接口定义
export interface GroupElement extends CanvasElement {
  type: 'group'
  children: string[] // 子元素ID列表
}

interface CanvasState {
  tool: ToolType
  elements: Record<string, CanvasElement>
  selectedIds: string[]
  editingId: string | null
  // 添加剪贴板状态
  clipboard: CanvasElement[] | null
  // 添加粘贴偏移计数
  pasteOffset: number
  status: 'loading' | 'idle'

  currentStyle: {
    fill: string
    stroke: string
    strokeWidth: number
    alpha: number
    fontSize: number
    fontFamily: string
    textAlign: 'left' | 'center' | 'right'
    eraserSize: number // 添加橡皮擦大小属性
  }

  setTool: (tool: ToolType) => void
  addElement: (el: CanvasElement) => void
  updateElement: (id: string, attrs: Partial<CanvasElement>) => void
  removeElements: (ids: string[]) => void
  setSelected: (ids: string[]) => void
  setEditingId: (id: string | null) => void
  // 添加复制粘贴方法
  copyElements: (ids: string[]) => void
  pasteElements: (x?: number, y?: number) => void

  // 添加批量更新元素方法，用于提高性能
  batchUpdateElements: (updates: Record<string, Partial<CanvasElement>>) => void

  // 添加撤销/重做方法
  undo: () => void
  redo: () => void
  canUndo: () => boolean
  canRedo: () => boolean

  // 添加分组方法
  groupElements: (elementIds: string[]) => void
  ungroupElements: (groupIds: string[]) => void

  // 添加重置方法
  resetStore: () => void
}

// 递归获取所有后代元素的 ID（包括子元素的子元素）
function getAllDescendantIds(groupId: string, elements: Record<string, CanvasElement>): string[] {
  const group = elements[groupId]
  if (!group || group.type !== 'group') return []

  const groupEl = group as GroupElement
  let descendants: string[] = [...groupEl.children]

  groupEl.children.forEach((childId) => {
    // 递归查找：如果子元素也是组，把它的后代也加进来
    descendants = descendants.concat(getAllDescendantIds(childId, elements))
  })

  return descendants
}

// 递归获取所有祖先组的 ID
function getAllAncestorGroupIds(elementId: string, elements: Record<string, CanvasElement>): string[] {
  const element = elements[elementId]
  if (!element || !element.groupId) return []

  const ancestors = [element.groupId]
  return ancestors.concat(getAllAncestorGroupIds(element.groupId, elements))
}

let currentYDoc: Y.Doc | null = null
let currentYElements: Y.Map<any> | null = null
let currentProvider: any | null = null

// 设置 Yjs 数据的函数
export const setYjsData = (yDoc: Y.Doc, yElements: Y.Map<any>, provider: any) => {
  // 更新当前引用
  currentYDoc = yDoc
  currentYElements = yElements
  currentProvider = provider

  // 重置 store
  useStore.getState().resetStore()

  // 绑定：Yjs 变动 -> 更新 Zustand -> 触发 React 重绘
  yElements.observe(() => {
    useStore.setState({ elements: yElements.toJSON() })
  })

  // 监听 IndexedDB 同步状态
  provider.on('synced', () => {
    console.log('✅ 本地数据加载完成')
    useStore.setState({ status: 'idle' })
  })

  // 添加对 synced 状态的轮询检查
  // 这解决了初始化时可能错过 synced 事件的问题
  const checkSyncStatus = () => {
    if (provider.synced) {
      console.log('✅ 本地数据已同步')
      useStore.setState({ status: 'idle' })
    } else {
      // 如果尚未同步，稍后再检查
      setTimeout(checkSyncStatus, 100)
      console.log('⏳ 正在同步本地数据...')
    }
  }

  // 启动检查
  checkSyncStatus()

  // 初始加载状态 - 备用方案
  yDoc.on('update', () => {
    // 第一次有数据进来时，说明加载完成了
    useStore.setState((state) => (state.status === 'loading' ? { status: 'idle' } : state))
  })
}

export const useStore = create<CanvasState>()(
  devtools(
    subscribeWithSelector((set, get) => {
      console.log('[CanvasStore] 创建 store')

      // 保存原始的set方法
      const originalSet: typeof set = (partial, replace?) => {
        // 工具切换不记录到撤销/重做栈
        const isToolChangeOnly =
          typeof partial === 'object' &&
          partial !== null &&
          Object.keys(partial).length === 3 &&
          'tool' in partial &&
          'selectedIds' in partial &&
          'editingId' in partial &&
          Array.isArray((partial as any).selectedIds) &&
          (partial as any).selectedIds.length === 0 &&
          (partial as any).editingId === null

        // 选中操作不记录到撤销/重做栈
        const isSelectionChangeOnly =
          typeof partial === 'object' &&
          partial !== null &&
          Object.keys(partial).length === 1 &&
          'selectedIds' in partial

        if (undoRedoManager.isLocked() || isToolChangeOnly || isSelectionChangeOnly) {
          return replace === true ? set(partial as CanvasState, true) : set(partial)
        }

        const currentState = (() => {
          const state = get()
          const {
            setTool,
            addElement,
            updateElement,
            removeElements,
            setSelected,
            setEditingId,
            copyElements,
            pasteElements,
            undo,
            redo,
            canUndo,
            canRedo,
            resetStore,
            ...dataOnlyState
          } = state
          return JSON.parse(JSON.stringify(dataOnlyState))
        })()

        const result = replace === true ? set(partial as CanvasState, true) : set(partial)
        return result
      }

      return {
        tool: 'select',
        elements: currentYElements?.toJSON() || {}, // 初始值来自 Yjs
        selectedIds: [],
        editingId: null,
        clipboard: null,
        pasteOffset: 0,
        status: 'loading', // 初始状态为 loading
        currentStyle: {
          fill: '#fbfbfdd2', // 默认文字颜色
          stroke: '#000000',
          strokeWidth: 2,
          alpha: 1,
          fontSize: 20,
          fontFamily: 'Arial',
          textAlign: 'left',
          eraserSize: 20, // 默认橡皮擦大小
        },

        setTool: (tool) => originalSet({ tool }),
        addElement: (el) => {
          // 使用 transact 保证原子性，这对撤销重做很重要
          currentYDoc?.transact(() => {
            currentYElements?.set(el.id, el)
          })
        },
        updateElement: (id, attrs) => {
          // 使用 transact 保证原子性，这对撤销重做很重要
          currentYDoc?.transact(() => {
            const oldEl = currentYElements?.get(id)
            if (oldEl) {
              currentYElements?.set(id, { ...oldEl, ...attrs })
            }
          })
        },

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

        removeElements: (ids) => {
          currentYDoc?.transact(() => {
            ids.forEach((id) => currentYElements?.delete(id))
          })
        },
        setSelected: (ids) => originalSet({ selectedIds: ids }),
        setEditingId: (id) => originalSet({ editingId: id }),
        copyElements: (ids) =>
          originalSet((state) => {
            const elementsToCopy = ids
              .map((id) => state.elements[id])
              .filter((el) => el !== undefined) as CanvasElement[]
            return { clipboard: elementsToCopy, pasteOffset: 0 }
          }),
        pasteElements: (targetX?: number, targetY?: number) =>
          originalSet((state) => {
            // 检查粘贴锁，防止重复粘贴
            if ((window as any).pasteLock) {
              console.log('[Store] 粘贴操作被锁拦截')
              return state
            }

            if (!state.clipboard || state.clipboard.length === 0) {
              console.log('[Store] 剪贴板为空，取消粘贴')
              return state
            }

            // 设置粘贴锁
            ;(window as any).pasteLock = true
            if ((window as any).pasteLockTimeout) {
              clearTimeout((window as any).pasteLockTimeout)
            }
            ;(window as any).pasteLockTimeout = setTimeout(() => {
              ;(window as any).pasteLock = false
            }, 300)

            const newElements: Record<string, CanvasElement> = {}
            const newIds: string[] = []

            // [新增] 如果指定了目标位置，先计算剪贴板内容的包围盒中心
            let clipCenterX = 0
            let clipCenterY = 0

            if (targetX !== undefined && targetY !== undefined) {
              let minX = Infinity
              let minY = Infinity
              let maxX = -Infinity
              let maxY = -Infinity

              state.clipboard.forEach((el) => {
                minX = Math.min(minX, el.x)
                minY = Math.min(minY, el.y)
                maxX = Math.max(maxX, el.x + el.width)
                maxY = Math.max(maxY, el.y + el.height)
              })

              clipCenterX = (minX + maxX) / 2
              clipCenterY = (minY + maxY) / 2
            }

            state.clipboard.forEach((element) => {
              const newId = nanoid()
              let newX = element.x
              let newY = element.y

              if (targetX !== undefined && targetY !== undefined) {
                // 1. 指定位置粘贴：保持相对位置，整体中心对齐到鼠标位置
                const offsetX = element.x - clipCenterX
                const offsetY = element.y - clipCenterY
                newX = targetX + offsetX
                newY = targetY + offsetY
              } else {
                // 2. 默认粘贴 (Ctrl+V)：在原位置附近添加随机偏移
                const randomSign = Math.random() > 0.5 ? 1 : -1
                const randomOffset = 30 + Math.random() * 30
                // 每次粘贴都在前一次偏移的基础上继续偏移
                const baseOffset = (state.pasteOffset + 1) * 20
                // 这里的逻辑可以简化，目前保留原有风格但去掉累加器以防止无限飘远
                newX = element.x + 30
                newY = element.y + 30
              }

              const newElement = {
                ...element,
                id: newId,
                x: newX,
                y: newY,
              }

              newElements[newId] = newElement
              newIds.push(newId)
            })

            // 增加粘贴偏移量（仅用于 Ctrl+V 连续粘贴计数）
            const newOffset = state.pasteOffset + 1

            // 使用 transact 保证原子性
            currentYDoc?.transact(() => {
              Object.entries(newElements).forEach(([id, element]) => {
                currentYElements?.set(id, element)
              })
            })

            // 为每个新元素创建 AddElementCommand 并执行
            Object.values(newElements).forEach((element) => {
              const addCommand = new AddElementCommand({ element })
              undoRedoManager.executeCommand(addCommand)
            })

            return {
              selectedIds: newIds,
              pasteOffset: newOffset,
            }
          }),

        // 实现分组方法，支持嵌套组
        groupElements: (elementIds) => {
          // 1. 获取当前状态 (使用闭包中的 get)
          const state = get()

          if (elementIds.length < 2) return // 至少需要两个元素才能分组

          // 2. 执行副作用逻辑 (只执行一次)
          const groupId = nanoid()
          console.log(`[groupElements] 开始创建组 ID: ${groupId}`, { elementIds })

          let minX = Infinity,
            minY = Infinity,
            maxX = -Infinity,
            maxY = -Infinity

          const allElementIds: string[] = []
          elementIds.forEach((id) => {
            const el = state.elements[id]
            if (el) {
              allElementIds.push(id)
              if (el.type === 'group') {
                allElementIds.push(...getAllDescendantIds(id, state.elements))
              }
              minX = Math.min(minX, el.x)
              minY = Math.min(minY, el.y)
              maxX = Math.max(maxX, el.x + el.width)
              maxY = Math.max(maxY, el.y + el.height)
            }
          })

          const groupElement: GroupElement = {
            id: groupId,
            type: 'group',
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY,
            fill: 'transparent',
            stroke: '#000000',
            strokeWidth: 0,
            children: elementIds,
          }

          // Yjs 事务
          currentYDoc?.transact(() => {
            elementIds.forEach((id) => {
              if (currentYElements?.has(id)) {
                const element = currentYElements.get(id)!
                currentYElements.set(id, { ...element, groupId })
              }
            })
          })

          // 执行命令
          const addCommand = new AddElementCommand({ element: groupElement })
          undoRedoManager.executeCommand(addCommand)

          console.log(`[groupElements] 组创建完成`, { groupId })

          // 3. 最后只调用 originalSet 更新 UI 选中状态
          // 此时传入的是对象而不是函数，不会触发重复执行逻辑
          originalSet({
            selectedIds: [groupId],
          })
        },

        // 实现取消分组方法
        ungroupElements: (groupIds) => {
          const state = get()
          console.log(`[ungroupElements] 开始取消分组`, { groupIds })

          const newSelectedIds: string[] = []

          const groupsToRemove = groupIds
            .map((id) => state.elements[id])
            .filter((el) => el !== undefined) as GroupElement[]

          // Yjs 事务
          currentYDoc?.transact(() => {
            groupIds.forEach((groupId) => {
              const group = currentYElements?.get(groupId)
              if (group && group.type === 'group') {
                ;(group as GroupElement).children.forEach((childId) => {
                  if (currentYElements?.has(childId)) {
                    const { groupId: removedGroupId, ...rest } = currentYElements.get(childId)!
                    currentYElements.set(childId, rest)
                    newSelectedIds.push(childId)
                  }
                })
              }
            })
          })

          // 执行命令
          groupsToRemove.forEach((group) => {
            const removeCommand = new RemoveElementCommand({ element: group })
            undoRedoManager.executeCommand(removeCommand)
          })

          // 更新状态
          originalSet({
            selectedIds: newSelectedIds,
          })
        },

        // ========== 撤销/重做方法实现 ==========
        undo: () => undoRedoManager.undo(),
        redo: () => undoRedoManager.redo(),
        canUndo: () => undoRedoManager.canUndo(),
        canRedo: () => undoRedoManager.canRedo(),
        // ===================================

        // 重置 store 状态
        resetStore: () => {
          originalSet({
            elements: currentYElements?.toJSON() || {},
            selectedIds: [],
            editingId: null,
            clipboard: null,
            pasteOffset: 0,
            status: 'loading',
          })
        },
      }
    }),
    { name: 'CanvasStore' },
  ),
)
