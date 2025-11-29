import React, { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { useStore } from '@/stores/canvasStore'
import { Message } from '@arco-design/web-react'
import {
  IconCopy,
  IconPaste,
  IconDelete,
  IconDownload,
  IconUndo,
  IconRedo,
  IconSelectAll,
  IconArrowRight as IconLayers,
  IconBgColors,
} from '@arco-design/web-react/icon'
import ExportCanvasModal from '../header/ExportCanvasModal'
import type { StageManager } from '@/pages/canvas/Pixi_stageManager'

interface ContextMenuProps {
  stageManager: StageManager | null
  // [新增] 直接接收容器元素，避免通过未初始化的 app.canvas 获取
  container: HTMLElement | null
}

// 提取单个菜单项组件
const MenuItem: React.FC<{
  icon: React.ReactNode
  label: string
  onClick: () => void
  disabled?: boolean
  danger?: boolean
}> = ({ icon, label, onClick, disabled = false, danger = false }) => {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <li
      onClick={(e) => {
        e.stopPropagation()
        if (!disabled) onClick()
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        padding: '8px 12px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        color: disabled ? '#c9c9c9' : danger ? '#f53f3f' : '#1d2129',
        backgroundColor: isHovered && !disabled ? '#f2f3f5' : 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '14px',
        transition: 'background-color 0.1s',
        borderRadius: '2px',
        margin: '2px 4px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <span style={{ marginRight: '8px', fontSize: '16px', display: 'flex' }}>{icon}</span>
        <span>{label}</span>
      </div>
    </li>
  )
}

const ContextMenu: React.FC<ContextMenuProps> = ({ stageManager, container }) => {
  const selectedIds = useStore((state) => state.selectedIds)
  const clipboard = useStore((state) => state.clipboard)
  const elements = useStore((state) => state.elements)

  const [visible, setVisible] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [exportModalVisible, setExportModalVisible] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const canCopy = selectedIds.length > 0
  const canPaste = clipboard !== null && clipboard.length > 0
  const canDelete = selectedIds.length > 0
  const canGroup = selectedIds.length > 1
  const canUngroup = selectedIds.some((id) => elements[id]?.type === 'group')

  // 监听右键事件
  useEffect(() => {
    // [修复] 不再尝试访问 stageManager.app.canvas，直接使用传入的 container
    if (!container) return

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault()

      // 只有点击在 canvas 容器内才触发
      if (e.target instanceof Node && container.contains(e.target)) {
        setPosition({ x: e.clientX, y: e.clientY })
        setVisible(true)
      }
    }

    container.addEventListener('contextmenu', handleContextMenu)

    return () => {
      container.removeEventListener('contextmenu', handleContextMenu)
    }
  }, [container]) // 依赖项改为 container

  // 边界检测
  useLayoutEffect(() => {
    if (visible && menuRef.current) {
      const menuRect = menuRef.current.getBoundingClientRect()
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight

      let newX = position.x
      let newY = position.y

      if (newX + menuRect.width > viewportWidth) {
        newX = viewportWidth - menuRect.width - 10
      }
      if (newY + menuRect.height > viewportHeight) {
        newY = viewportHeight - menuRect.height - 10
      }

      if (newX !== position.x || newY !== position.y) {
        setPosition({ x: newX, y: newY })
      }
    }
  }, [visible, position.x, position.y])

  // --- 动作处理 ---
  const handleCopy = () => {
    useStore.getState().copyElements(selectedIds)
    Message.success('已复制')
    setVisible(false)
  }

  const handlePaste = () => {
    useStore.getState().pasteElements()
    setVisible(false)
  }

  const handleDelete = () => {
    useStore.getState().removeElements(selectedIds)
    setVisible(false)
  }

  const handleGroup = () => {
    useStore.getState().groupElements(selectedIds)
    setVisible(false)
  }

  const handleUngroup = () => {
    useStore.getState().ungroupElements(selectedIds)
    setVisible(false)
  }

  const handleSelectAll = () => {
    const { elements } = useStore.getState()
    useStore.getState().setSelected(Object.keys(elements))
    setVisible(false)
  }

  const handleUndo = () => {
    useStore.getState().undo()
    setVisible(false)
  }

  const handleRedo = () => {
    useStore.getState().redo()
    setVisible(false)
  }

  const handleExport = () => {
    setExportModalVisible(true)
    setVisible(false)
  }

  const Divider = () => (
    <li style={{ height: 1, padding: '4px 0' }}>
      <div style={{ height: '1px', backgroundColor: '#e5e6eb', margin: '0 12px' }}></div>
    </li>
  )

  return (
    <>
      {visible && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            zIndex: 9998,
          }}
          onContextMenu={(e) => {
            e.preventDefault()
            setVisible(false)
          }}
          onClick={() => setVisible(false)}
        />
      )}

      {visible && (
        <div
          ref={menuRef}
          className="context-menu"
          style={{
            position: 'fixed',
            left: position.x,
            top: position.y,
            backgroundColor: '#fff',
            borderRadius: '4px',
            boxShadow: '0 4px 10px rgba(0, 0, 0, 0.1)',
            border: '1px solid #e5e6eb',
            zIndex: 9999,
            minWidth: '180px',
            padding: '4px 0',
            userSelect: 'none',
          }}
        >
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            <MenuItem icon={<IconCopy />} label="复制" onClick={handleCopy} disabled={!canCopy} />
            <MenuItem icon={<IconPaste />} label="粘贴" onClick={handlePaste} disabled={!canPaste} />

            <Divider />

            {(canGroup || canUngroup) && (
              <>
                {canGroup && <MenuItem icon={<IconLayers />} label="编组" onClick={handleGroup} />}
                {canUngroup && <MenuItem icon={<IconBgColors />} label="取消编组" onClick={handleUngroup} />}
                <Divider />
              </>
            )}

            <MenuItem icon={<IconSelectAll />} label="全选" onClick={handleSelectAll} />
            <MenuItem icon={<IconDelete />} label="删除" onClick={handleDelete} disabled={!canDelete} danger />

            <Divider />

            <MenuItem icon={<IconUndo />} label="撤销" onClick={handleUndo} disabled={!useStore.getState().canUndo()} />
            <MenuItem icon={<IconRedo />} label="重做" onClick={handleRedo} disabled={!useStore.getState().canRedo()} />

            <Divider />

            <MenuItem icon={<IconDownload />} label="导出画布" onClick={handleExport} />
          </ul>
        </div>
      )}

      <ExportCanvasModal
        visible={exportModalVisible}
        onClose={() => setExportModalVisible(false)}
        stageManager={stageManager}
      />
    </>
  )
}

export default ContextMenu
