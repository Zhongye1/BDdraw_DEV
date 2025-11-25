//快_snapshot机制大本营
import { create } from 'zustand'
import { subscribeWithSelector, devtools } from 'zustand/middleware'
import { nanoid } from 'nanoid'
import { undoRedoManager } from '@/lib/UndoRedoManager'
import { yElements, yDoc, persistenceProvider } from './persistenceStore'
import { AddElementCommand } from '@/lib/AddElementCommand'
import { RemoveElementCommand } from '@/lib/RemoveElementCommand'

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
  pasteElements: () => void

  // 添加撤销/重做方法
  undo: () => void
  redo: () => void
  canUndo: () => boolean
  canRedo: () => boolean

  // 添加分组方法
  groupElements: (elementIds: string[]) => void
  ungroupElements: (groupIds: string[]) => void
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

export const useStore = create<CanvasState>()(
  devtools(
    subscribeWithSelector((set, get) => {
      console.log('[CanvasStore] 创建 store')
      // 绑定：Yjs 变动 -> 更新 Zustand -> 触发 React 重绘
      yElements.observe(() => {
        set({ elements: yElements.toJSON() })
      })

      // 监听 IndexedDB 同步状态
      persistenceProvider.on('synced', () => {
        console.log('✅ 本地数据加载完成')
        set({ status: 'idle' })
      })

      // 添加对 synced 状态的轮询检查
      // 这解决了初始化时可能错过 synced 事件的问题
      const checkSyncStatus = () => {
        if (persistenceProvider.synced) {
          console.log('✅ 本地数据已同步')
          set({ status: 'idle' })
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
        set((state) => (state.status === 'loading' ? { status: 'idle' } : state))
      })

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
          // 如果被锁定，或者只是工具切换，或者是选中操作，直接设置状态

          /**
          console.log(
          '[CanvasStore] 状态更新被忽略，锁定状态:',
          undoRedoManager.isLocked(),
          '工具切换:',
          isToolChangeOnly,
          '选中变化:',
          isSelectionChangeOnly,
        )
         * 
         */

          return replace === true ? set(partial as CanvasState, true) : set(partial)
        }

        // 获取当前状态，只克隆数据部分，不包括函数
        const currentState = (() => {
          const state = get()
          // 克隆数据属性

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
            ...dataOnlyState
          } = state

          // 使用 JSON 方法替代 structuredClone 以避免克隆函数的问题
          return JSON.parse(JSON.stringify(dataOnlyState))
        })()

        // 设置新状态
        const result = replace === true ? set(partial as CanvasState, true) : set(partial)

        // 获取更新后的状态
        const newState = (() => {
          const state = get()
          // 只克隆数据属性，排除函数
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
            ...dataOnlyState
          } = state

          // 使用 JSON 方法替代 structuredClone 以避免克隆函数的问题
          return JSON.parse(JSON.stringify(dataOnlyState))
        })()

        // ========== 撤销/重做机制核心部分 ==========
        // 创建快照命令并执行
        // 判断操作类型
        // 兼容函数式更新
        const partialObj = typeof partial === 'function' ? partial(get()) : partial

        let operationType = '未知操作'
        if (partialObj && typeof partialObj === 'object') {
          if ('elements' in partialObj) {
            // 比较元素数量变化
            const prevCount = Object.keys(currentState.elements).length
            const nextCount = Object.keys(newState.elements).length

            if (nextCount > prevCount) {
              operationType = '添加元素'
            } else if (nextCount < prevCount) {
              operationType = '删除元素'
            } else {
              operationType = '修改元素'
            }
          } else if ('tool' in partialObj) {
            operationType = '切换工具'
          } else if ('selectedIds' in partialObj) {
            operationType = '选择元素'
          }
        }

        //const command = new SnapshotCommand(currentState, newState, operationType || '状态变更')
        //console.log('[CanvasStore] 创建并执行快照命令')
        //undoRedoManager.executeCommand(command)
        // ======================================

        return result
      }

      return {
        tool: 'select',
        elements: yElements.toJSON(), // 初始值来自 Yjs
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
          yDoc.transact(() => {
            yElements.set(el.id, el)
          })
        },
        updateElement: (id, attrs) => {
          // 使用 transact 保证原子性，这对撤销重做很重要
          yDoc.transact(() => {
            const oldEl = yElements.get(id)
            if (oldEl) {
              yElements.set(id, { ...oldEl, ...attrs })
            }
          })
        },
        removeElements: (ids) => {
          yDoc.transact(() => {
            ids.forEach((id) => yElements.delete(id))
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
        pasteElements: () =>
          originalSet((state) => {
            if (!state.clipboard || state.clipboard.length === 0) return state

            // 增加粘贴偏移量
            const newOffset = state.pasteOffset + 1

            const newElements: Record<string, CanvasElement> = {}
            const newIds: string[] = []

            state.clipboard.forEach((element) => {
              const newId = nanoid()
              const randomSign = Math.random() > 0.5 ? 1 : -1 // 随机选择正负
              const randomOffset = Math.random() * 20 // 0-20的随机偏移量
              newIds.push(newId)
              newElements[newId] = {
                ...element,
                id: newId,
                // 每次粘贴都在前一次的基础上继续偏移
                x: element.x + randomOffset * randomSign,
                y: element.y + randomOffset * randomSign,
              }
            })

            // 使用 transact 保证原子性
            yDoc.transact(() => {
              Object.entries(newElements).forEach(([id, el]) => {
                yElements.set(id, el)
              })
            })

            // 创建并执行添加元素命令以支持撤销/重做
            Object.values(newElements).forEach((el) => {
              const addCommand = new AddElementCommand({ element: el })
              undoRedoManager.executeCommand(addCommand)
            })

            return {
              selectedIds: newIds,
              pasteOffset: newOffset,
            }
          }),

        // 实现分组方法，支持嵌套组
        groupElements: (elementIds) =>
          originalSet((state) => {
            if (elementIds.length < 2) return state // 至少需要两个元素才能分组

            // 创建新的组元素
            const groupId = nanoid()

            // 计算包围盒
            let minX = Infinity,
              minY = Infinity,
              maxX = -Infinity,
              maxY = -Infinity

            // 收集所有要分组的元素（包括嵌套组中的元素）
            const allElementIds: string[] = []
            elementIds.forEach((id) => {
              const el = state.elements[id]
              if (el) {
                allElementIds.push(id)
                // 如果是组元素，也添加它的所有后代元素
                if (el.type === 'group') {
                  allElementIds.push(...getAllDescendantIds(id, state.elements))
                }

                minX = Math.min(minX, el.x)
                minY = Math.min(minY, el.y)
                maxX = Math.max(maxX, el.x + el.width)
                maxY = Math.max(maxY, el.y + el.height)
              }
            })

            // 创建组元素
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
              children: elementIds, // 只保存直接子元素
            }

            // 更新子元素的groupId属性
            const updatedElements = { ...state.elements }

            // 更新所有直接子元素的groupId
            elementIds.forEach((id) => {
              if (updatedElements[id]) {
                updatedElements[id] = { ...updatedElements[id], groupId }
              }
            })

            // 使用 transact 保证原子性
            yDoc.transact(() => {
              // 更新子元素的groupId属性
              elementIds.forEach((id) => {
                if (yElements.has(id)) {
                  const element = yElements.get(id)!
                  yElements.set(id, { ...element, groupId })
                }
              })

              // 添加组元素到画布
              yElements.set(groupId, groupElement)
            })

            // 创建并执行添加元素命令以支持撤销/重做
            const addCommand = new AddElementCommand({ element: groupElement })
            undoRedoManager.executeCommand(addCommand)

            return {
              selectedIds: [groupId],
            }
          }),

        // 实现取消分组方法，支持嵌套组
        ungroupElements: (groupIds) =>
          originalSet((state) => {
            const newSelectedIds: string[] = []

            // 收集要删除的组元素
            const groupsToRemove = groupIds
              .map((id) => state.elements[id])
              .filter((el) => el !== undefined) as GroupElement[]

            // 使用 transact 保证原子性
            yDoc.transact(() => {
              groupIds.forEach((groupId) => {
                const group = yElements.get(groupId)
                if (group && group.type === 'group') {
                  // 将组内直接子元素的groupId属性移除
                  ;(group as GroupElement).children.forEach((childId) => {
                    if (yElements.has(childId)) {
                      const { groupId: removedGroupId, ...rest } = yElements.get(childId)!
                      yElements.set(childId, rest)
                      newSelectedIds.push(childId)
                    }
                  })

                  // 删除组元素本身
                  yElements.delete(groupId)
                }
              })
            })

            // 为每个删除的组元素创建并执行删除命令以支持撤销/重做
            groupsToRemove.forEach((group) => {
              const removeCommand = new RemoveElementCommand({ element: group })
              undoRedoManager.executeCommand(removeCommand)
            })

            return {
              selectedIds: newSelectedIds,
            }
          }),

        // ========== 撤销/重做方法实现 ==========
        undo: () => undoRedoManager.undo(),
        redo: () => undoRedoManager.redo(),
        canUndo: () => undoRedoManager.canUndo(),
        canRedo: () => undoRedoManager.canRedo(),
        // ===================================
      }
    }),
    { name: 'CanvasStore' },
  ),
)
