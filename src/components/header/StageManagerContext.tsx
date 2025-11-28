import React, { createContext, useContext } from 'react'
import { StageManager } from '@/pages/canvas/Pixi_stageManager'

// 创建 Context，初始值为 null
const StageManagerContext = createContext<StageManager | null>(null)

// 创建 Provider 组件
export const StageManagerProvider: React.FC<{
  stageManager: StageManager | null
  children: React.ReactNode
}> = ({ stageManager, children }) => {
  return <StageManagerContext.Provider value={stageManager}>{children}</StageManagerContext.Provider>
}

// 创建自定义 hook 用于访问 StageManager 实例
export const useStageManager = (): StageManager | null => {
  const context = useContext(StageManagerContext)

  if (context === undefined) {
    throw new Error('useStageManager must be used within a StageManagerProvider')
  }

  return context
}
