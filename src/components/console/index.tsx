import React, { useState } from 'react'
import { Tabs } from '@arco-design/web-react'
import CommandStackConsole from './CommandStackConsole'

const TabPane = Tabs.TabPane

const Console: React.FC = () => {
  const [activeTab, setActiveTab] = useState('command-stack')

  return (
    <div className="flex h-full flex-col">
      <Tabs activeTab={activeTab} onChange={setActiveTab} size="small" className="flex flex-1 flex-col">
        <TabPane key="command-stack" title="命令栈" className="flex-1">
          <div className="h-full">
            <CommandStackConsole />
          </div>
        </TabPane>
        <TabPane key="logs" title="日志" className="flex-1">
          <div className="h-full overflow-y-auto bg-gray-900 p-4 font-mono text-sm text-green-400">
            {/* 这里将显示日志内容 */}
            日志内容区域
          </div>
        </TabPane>
      </Tabs>
    </div>
  )
}

export default Console
