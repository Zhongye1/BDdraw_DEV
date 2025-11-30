import { motion } from 'framer-motion'
import { ReactNode } from 'react'

interface WipeTransitionProps {
  children: ReactNode
  variant?: 'default' | 'no-line' | 'thick-line' | 'vercel' | 'reverse'
}

export default function WipeTransition({ children, variant = 'default' }: WipeTransitionProps) {
  // 根据变体设置clip-path动画参数
  const getClipPathAnimation = () => {
    switch (variant) {
      case 'reverse':
        return {
          initial: { clipPath: 'inset(0 100% 0 0)', zIndex: 20 },
          animate: { clipPath: 'inset(0 0 0 0%)', zIndex: 20 },
          exit: { clipPath: 'inset(0 0 0 100%)', zIndex: 10 },
        }
      default:
        return {
          initial: { clipPath: 'inset(0 0 0 100%)', zIndex: 20 },
          animate: { clipPath: 'inset(0 0 0 0%)', zIndex: 20 },
          exit: { clipPath: 'inset(0 100% 0 0)', zIndex: 10 },
        }
    }
  }

  // 确定是否显示分隔线
  const showLine = variant !== 'no-line'

  // 根据变体设置分隔线样式
  const getLineStyle = () => {
    switch (variant) {
      case 'thick-line':
        return {
          background: 'linear-gradient(90deg, transparent 45%, #fff 50%, transparent 55%)',
          boxShadow: '0 0 20px #0066ff',
        }
      case 'vercel':
        return {
          background: 'linear-gradient(90deg, transparent 49.5%, #0066ff 50%, transparent 50.5%)',
          height: '2px',
          top: '50%',
        }
      default:
        return {
          background: 'linear-gradient(90deg, transparent 48%, #0066ff 50%, transparent 52%)',
        }
    }
  }

  // 动画持续时间
  const duration = variant === 'vercel' ? 0.8 : 1

  return (
    <motion.div
      {...getClipPathAnimation()}
      transition={{
        duration,
        ease: [0.76, 0, 0.24, 1],
      }}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'inherit',
      }}
    >
      {/* 可选：添加分隔线 */}
      {showLine && (
        <motion.div
          className="pointer-events-none"
          initial={{ x: '-100%' }}
          animate={{ x: '100%' }}
          transition={{ duration, ease: [0.76, 0, 0.24, 1] }}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: '100%',
            height: '100%',
            backgroundSize: '200% 100%',
            mixBlendMode: 'screen',
            opacity: 0.6,
            ...getLineStyle(),
          }}
        />
      )}

      {children}
    </motion.div>
  )
}
