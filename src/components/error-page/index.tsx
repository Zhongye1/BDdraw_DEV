import { Link, useRouteError } from 'react-router-dom'
import { Button } from '@arco-design/web-react'

export default function ErrorPage() {
  const error = useRouteError() as any

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center gap-4 text-left">
      <h1>Oops!</h1>
      <p>Sorry, an unexpected error has occurred.</p>
      <p className="font-mono">
        <span className="mr-2">{error?.status}</span>
        <i>{error?.statusText || error?.message}</i>
      </p>
      <Button>
        <Link to="/">Back to home page</Link>
      </Button>
    </div>
  )
}
