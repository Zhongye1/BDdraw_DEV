import React, { useMemo } from 'react'
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
