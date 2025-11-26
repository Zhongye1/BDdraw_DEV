import React, { useEffect, useRef, useState } from 'react'

interface ParallaxBackgroundProps {
  imageUrl: string
  title: string
  description: string
  className?: string
}

const ParallaxBackground: React.FC<ParallaxBackgroundProps> = ({ imageUrl, title, description, className = '' }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return

      const rect = containerRef.current.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2

      // 计算鼠标相对于中心的位置，增加视差效果强度
      const moveX = (e.clientX - centerX) / 30
      const moveY = (e.clientY - centerY) / 30

      setPosition({ x: moveX, y: moveY })
    }

    window.addEventListener('mousemove', handleMouseMove)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
    }
  }, [])

  return (
    <div ref={containerRef} className={`relative overflow-hidden ${className}`}>
      <div
        className="absolute inset-0 transition-transform duration-100 ease-out"
        style={{
          transform: `translate(${position.x}px, ${position.y}px) scale(1.05)`,
        }}
      >
        <img className="h-full w-full object-cover opacity-80" src={imageUrl} alt="Parallax Background" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
      </div>

      <div className="absolute bottom-0 left-0 z-10 p-12 text-white">
        <h2 className="text-4xl font-bold">{title}</h2>
        <p className="mt-4 max-w-md text-lg text-gray-200">{description}</p>
      </div>
    </div>
  )
}

export default ParallaxBackground
