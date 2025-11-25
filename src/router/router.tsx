import React from 'react'
import { createHashRouter, RouteObject } from 'react-router-dom'
import ErrorPage from '../components/error-page'
import { getDefaultLayout } from '../components/layout'
import HomePage from '../pages/home'
import CanvasPage from '../pages/canvas'

export const routerObjects: RouteObject[] = [
  {
    path: '/about',
    Component: HomePage,
    handle: {
      layout: getDefaultLayout,
    },
  },
  {
    path: '/',
    Component: CanvasPage,
    handle: {
      layout: getDefaultLayout,
    },
  },
]

export function createRouter(): ReturnType<typeof createHashRouter> {
  const routeWrappers = routerObjects.map((router) => {
    const getLayout = (router.handle as { layout: typeof getDefaultLayout })?.layout || getDefaultLayout
    const Component = router.Component!
    const page = getLayout(<Component />)
    return {
      ...router,
      element: page,
      Component: null,
      ErrorBoundary: ErrorPage,
    }
  })
  return createHashRouter(routeWrappers, {
    future: {
      v7_fetcherPersist: true,
      v7_relativeSplatPath: true,
      v7_partialHydration: true,
      v7_normalizeFormMethod: true,
      v7_skipActionErrorRevalidation: true,
    },
  })
}
