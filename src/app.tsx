import React, { useMemo, useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { RouterProvider } from 'react-router-dom'
import router from './router/router'
import { HelmetProvider } from 'react-helmet-async'
import { Inspector } from 'react-dev-inspector'
import { ThemeProvider, useTheme } from './stores/themeStore'
import { ConfigProvider } from '@arco-design/web-react'
import '@arco-design/web-react/dist/css/arco.css'

// 创建一个包装组件来使用主题上下文
const AppContent: React.FC = () => {
  const { theme } = useTheme()

  // 全局禁用浏览器默认快捷键和文本选中
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): boolean => {
      // 阻止常见的浏览器快捷键
      if (
        // Ctrl 组合键
        (e.ctrlKey && ['s', 'S'].includes(e.key)) || // 保存页面
        (e.ctrlKey && ['o', 'O'].includes(e.key)) || // 打开页面
        (e.ctrlKey && ['r', 'R'].includes(e.key)) || // 刷新页面
        (e.ctrlKey && ['p', 'P'].includes(e.key)) || // 打印页面
        (e.ctrlKey && ['u', 'U'].includes(e.key)) || // 查看源代码
        (e.ctrlKey && ['l', 'L'].includes(e.key)) || // 选择地址栏
        (e.ctrlKey && ['a', 'A'].includes(e.key) && e.shiftKey) || // 全选地址栏
        // F5 刷新
        e.key === 'F5' ||
        // F11 全屏
        e.key === 'F11' ||
        // Delete 删除历史记录
        (e.altKey && e.key === 'Delete') ||
        // Alt+Tab 切换标签页
        (e.altKey && e.key === 'Tab')
      ) {
        e.preventDefault()
        e.stopPropagation()
        return false
      }

      // 添加默认返回值
      return true
    }

    // 移除了对右键菜单的禁用逻辑，完全解除限制

    // 添加事件监听器
    document.addEventListener('keydown', handleKeyDown, true)

    // 清理函数
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true)
    }
  }, [])

  return (
    <ConfigProvider theme={{ dark: theme === 'dark' }}>
      <Inspector keys={['control', 'q']} />
      <QueryClientProvider client={useMemo(() => new QueryClient({}), [])}>
        <RouterProvider router={router} future={{ v7_startTransition: true }} />
        <ReactQueryDevtools />
      </QueryClientProvider>
    </ConfigProvider>
  )
}

export default function App() {
  return (
    <HelmetProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </HelmetProvider>
  )
}
