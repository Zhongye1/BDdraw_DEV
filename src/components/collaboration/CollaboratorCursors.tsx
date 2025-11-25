import React, { useEffect, useState } from 'react'

interface CollaboratorCursorsProps {
  awareness: any
}

export const CollaboratorCursors: React.FC<CollaboratorCursorsProps> = ({ awareness }) => {
  const [cursors, setCursors] = useState<any[]>([])

  useEffect(() => {
    if (!awareness) return

    const updateCursors = () => {
      const states = awareness.getStates()
      const activeCursors: any[] = []

      states.forEach((state: any, clientId: number) => {
        // 排除自己
        if (clientId === awareness.clientID) return
        if (state.cursor) {
          activeCursors.push({
            clientId,
            x: state.cursor.x,
            y: state.cursor.y,
            user: state.user, // 包含名字和颜色
          })
        }
      })
      setCursors(activeCursors)
    }

    awareness.on('change', updateCursors)
    return () => {
      awareness.off('change', updateCursors)
    }
  }, [awareness])

  if (!awareness) return null

  return (
    <>
      {cursors.map((cursor) => (
        <div
          key={cursor.clientId}
          style={{
            position: 'absolute',
            left: cursor.x,
            top: cursor.y,
            pointerEvents: 'none',
            zIndex: 999999,
            transform: 'translate(-50%, -50%)',
          }}
        >
          {/* 简单的光标表示 */}
          <div
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: cursor.user?.color || 'red',
              boxShadow: '0 0 0 2px white, 0 0 10px rgba(0,0,0,0.3)',
            }}
          />
          <span
            style={{
              position: 'absolute',
              top: '15px',
              left: '50%',
              transform: 'translateX(-50%)',
              backgroundColor: cursor.user?.color || 'red',
              color: 'white',
              padding: '2px 8px',
              borderRadius: '4px',
              fontSize: '12px',
              whiteSpace: 'nowrap',
              boxShadow: '0 0 5px rgba(0,0,0,0.3)',
            }}
          >
            {cursor.user?.name || 'Anonymous'}
          </span>
        </div>
      ))}
    </>
  )
}
