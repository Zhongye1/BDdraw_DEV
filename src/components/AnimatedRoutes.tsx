import { useLocation, useOutlet } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import WipeTransition from './WipeTransition'

export default function AnimatedRoutes() {
  const location = useLocation()
  const outlet = useOutlet()

  return (
    <AnimatePresence mode="sync" initial={false}>
      <WipeTransition key={location.pathname}>{outlet}</WipeTransition>
    </AnimatePresence>
  )
}
