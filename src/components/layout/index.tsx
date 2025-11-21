import React from 'react'
import { Header } from '../header'

export const getNoneLayout = (page: React.ReactElement) => page

export const getDefaultLayout = (page: React.ReactElement) => {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <div className="flex-1 pt-14">{page}</div>
    </div>
  )
}
