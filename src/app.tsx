import React, { useMemo } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { RouterProvider } from 'react-router-dom'
import { createRouter } from './router/router'
import { HelmetProvider } from 'react-helmet-async'
import { Inspector } from 'react-dev-inspector'

export default function App() {
  const queryClient = useMemo(() => new QueryClient({}), [])

  return (
    <HelmetProvider>
      <Inspector keys={['control', 'q']} />
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={createRouter()} future={{ v7_startTransition: true }} />
        <ReactQueryDevtools />
      </QueryClientProvider>
    </HelmetProvider>
  )
}
