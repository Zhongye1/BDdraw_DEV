import { useEffect, useRef, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Grid } from '@arco-design/web-react'
import { IconGithub } from '@arco-design/web-react/icon'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'

// Swiper 核心
import { Mousewheel, Pagination, Parallax, EffectCreative } from 'swiper/modules'
import { Swiper, SwiperSlide } from 'swiper/react'

import { ArknightsCards } from './contents/AKN'
// Swiper 样式
import 'swiper/swiper-bundle.css'

const { Row, Col } = Grid

// --- 数据配置 ---
const TECH_STACKS = [
  {
    category: '核心框架 | Core',
    badges: [
      { src: 'https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white', alt: 'React' },
      { src: 'https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white', alt: 'TS' },
      { src: 'https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white', alt: 'Vite' },
      { src: 'https://img.shields.io/badge/React_Router-6-CA4245?logo=reactrouter&logoColor=white', alt: 'Router' },
    ],
  },
  {
    category: '图形与界面 | Graphics & UI',
    badges: [
      { src: 'https://img.shields.io/badge/PixiJS-8-CC0066?logo=pixijs&logoColor=white', alt: 'PixiJS' },
      { src: 'https://img.shields.io/badge/Arco%20Design-2-006AFF?logo=arco-design&logoColor=white', alt: 'Arco' },
      { src: 'https://img.shields.io/badge/Tailwind-3-06B6D4?logo=tailwindcss&logoColor=white', alt: 'Tailwind' },
      { src: 'https://img.shields.io/badge/Framer-Motion-6B46C1?logo=framer&logoColor=white', alt: 'Motion' },
    ],
  },
  {
    category: '多人协作与状态管理 | COOP & State',
    badges: [
      { src: 'https://img.shields.io/badge/Zustand-4-443333?logo=Zustand', alt: 'Zustand' },
      { src: 'https://img.shields.io/badge/Yjs-13-8A2BE2?logo=yjs&logoColor=white', alt: 'Yjs' },
      { src: 'https://img.shields.io/badge/Y--WebSocket-3-8A2BE2', alt: 'Y-Socket' },
      { src: 'https://img.shields.io/badge/Y--IndexedDB-9-8A2BE2', alt: 'Y-IndexedDB' },
    ],
  },
]

// --- 粒子背景组件 ---
const ParticleBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrameId: number
    let particles: Array<{ x: number; y: number; size: number; speedX: number; speedY: number }> = []

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    const initParticles = () => {
      particles = Array.from({ length: 50 }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2 + 0.5,
        speedX: (Math.random() - 0.5) * 0.5,
        speedY: (Math.random() - 0.5) * 0.5,
      }))
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'

      particles.forEach((p) => {
        p.x += p.speedX
        p.y += p.speedY
        if (p.x < 0) p.x = canvas.width
        if (p.x > canvas.width) p.x = 0
        if (p.y < 0) p.y = canvas.height
        if (p.y > canvas.height) p.y = 0
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fill()
      })

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)'
      ctx.lineWidth = 0.5
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 100) {
            ctx.beginPath()
            ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
            ctx.stroke()
          }
        }
      }
      animationFrameId = requestAnimationFrame(draw)
    }

    resize()
    initParticles()
    draw()
    window.addEventListener('resize', resize)
    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(animationFrameId)
    }
  }, [])

  return <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 z-0 h-full w-full" />
}

// --- 动画容器 ---
const AnimatedSection = ({
  isActive,
  children,
  delay = 0,
}: {
  isActive: boolean
  children: React.ReactNode
  delay?: number
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: 100, filter: 'blur(10px)' }}
      animate={isActive ? { opacity: 1, x: 0, filter: 'blur(0px)' } : { opacity: 0, x: 50, filter: 'blur(5px)' }}
      transition={{ duration: 0.8, delay, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  )
}

// --- 终端打字机组件 ---
const TerminalDemo = ({ isActive }: { isActive: boolean }) => {
  const [step, setStep] = useState(0)

  // 当进入该 Slide 时，启动序列；离开时重置
  useEffect(() => {
    if (!isActive) {
      setStep(0)
      return
    }

    const sequence = [
      { t: 800, s: 1 }, // 显示 git clone
      { t: 1600, s: 2 }, // 显示 cd
      { t: 2200, s: 3 }, // 显示 bun install
      { t: 3000, s: 4 }, // 显示 bun dev
      { t: 3800, s: 5 }, // 显示 结果
    ]

    const timers = sequence.map((item) => setTimeout(() => setStep(item.s), item.t))

    return () => timers.forEach((t) => clearTimeout(t))
  }, [isActive])

  return (
    <div className="h-full w-full rounded-lg border border-white/10 bg-[#0d1117] p-6 font-mono text-sm leading-6 shadow-2xl backdrop-blur-xl">
      {/* Terminal Header */}
      <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-4">
        <div className="flex gap-2">
          <div className="h-3 w-3 rounded-full bg-red-500/80" />
          <div className="h-3 w-3 rounded-full bg-yellow-500/80" />
          <div className="h-3 w-3 rounded-full bg-green-500/80" />
        </div>
        <span className="text-xs text-slate-500">bash — Arch Linux</span>
      </div>

      {/* Terminal Body */}
      <div className="flex flex-col gap-2">
        {/* Step 1: Clone */}
        {step >= 1 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
            <span className="select-none text-green-500">➜</span>
            <span className="text-slate-300">
              git clone <span className="text-slate-500">git@github.com:Zhongye1/BDdraw_DEV.git</span>
            </span>
          </motion.div>
        )}

        {/* Step 2: CD */}
        {step >= 2 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
            <span className="select-none text-green-500">➜</span>
            <span className="text-slate-300">cd BDdraw_DEV</span>
          </motion.div>
        )}

        {/* Step 3: Install */}
        {step >= 3 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
            <span className="select-none text-green-500">➜</span>
            <span className="text-slate-300">
              bun install <span className="text-slate-600">&&</span> bun dev
            </span>
          </motion.div>
        )}

        {/* Step 4: Run Command (Typing Effect for this line specifically if desired, but fade is cleaner for multi-line) */}
        {step >= 4 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3 text-slate-500">
            <span className="animate-pulse">...</span>
          </motion.div>
        )}

        {/* Step 5: Vite Output */}
        {step >= 5 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-2 rounded bg-[#161b22] p-3 text-slate-300"
          >
            <div className="flex items-center gap-2 font-bold text-white">
              <span className="bg-gradient-to-r from-purple-400 to-blue-500 bg-clip-text text-transparent">VITE</span>
              <span className="text-green-400">v7.2.4</span>
              <span className="text-slate-400">ready in 408 ms</span>
            </div>
            <div className="mt-3 space-y-1">
              <div className="flex gap-2">
                <span className="font-bold text-white">➜</span>
                <span className="font-bold text-white">Local:</span>
                <span className="cursor-pointer text-cyan-400 hover:underline">http://localhost:5000/BDdraw_DEV/</span>
              </div>
              <div className="flex gap-2">
                <span className="font-bold text-white">➜</span>
                <span className="font-bold text-white">Network:</span>
                <span className="text-slate-400">use --host to expose</span>
              </div>
            </div>
            <div className="mt-2 text-slate-500">➜ press h + enter to show help</div>
          </motion.div>
        )}
      </div>
    </div>
  )
}

export default function Home() {
  const [activeIndex, setActiveIndex] = useState(0)
  const navigate = useNavigate()

  return (
    <>
      <Helmet>
        <title>BDdraw_DEV - Development</title>
      </Helmet>

      <div className="relative h-screen overflow-hidden bg-[#000000f3] p-6 pt-16 text-white">
        {/* 背景层 */}
        <div
          className="duration-[1200ms] absolute inset-0 z-0 bg-cover bg-center opacity-20 transition-transform ease-out"
          style={{
            backgroundImage: `url('https://pic3.zhimg.com/v2-983244d3ef88846217191a74b5439350_1440w.jpg')`,
          }}
        />
        <ParticleBackground />

        {/* Swiper */}
        <Swiper
          modules={[Mousewheel, Pagination, Parallax, EffectCreative]}
          direction="horizontal"
          mousewheel={true}
          speed={1000}
          parallax={true}
          className="z-10 h-full w-full"
          onSlideChange={(swiper) => setActiveIndex(swiper.activeIndex)}
        >
          {/* Slide 1: Cover */}
          <SwiperSlide className="flex items-center justify-center">
            <div className="container mx-auto px-6">
              <AnimatedSection isActive={activeIndex === 0}>
                <div className="relative z-10 max-w-4xl">
                  <h1 className="font-mono text-5xl font-black uppercase tracking-tighter text-white sm:text-7xl md:text-8xl">
                    Infinite <br />
                    <span className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                      Canvas Cloud
                    </span>
                  </h1>
                  <p className="mt-8 max-w-xl text-lg leading-relaxed text-slate-400" data-swiper-parallax="-200">
                    基于 React 18 与 PixiJS v8 的现代 2D 画布应用
                    <br />
                    集成了协同编辑等功能，适用于各种创意项目
                  </p>
                  <div className="mt-10 flex gap-4" data-swiper-parallax="-400">
                    <button
                      onClick={() => {
                        // 跳转到登录页
                        navigate('/rooms')
                      }}
                      className="group flex items-center gap-2 bg-white px-8 py-4 text-sm font-bold text-black transition-all hover:bg-blue-500 hover:text-white"
                    >
                      开始创作
                    </button>
                    <a
                      href="https://github.com/Zhongye1/BDdraw_DEV"
                      className="flex items-center gap-2 border border-white/20 px-8 py-4 text-sm font-bold text-white transition-all hover:bg-white/10"
                    >
                      <IconGithub /> GITHUB
                    </a>
                  </div>
                </div>
              </AnimatedSection>
            </div>
          </SwiperSlide>

          {/* Slide 2: Tech Stack */}
          <SwiperSlide className="flex items-center justify-center">
            <div className="container mx-auto px-6">
              <Row gutter={[48, 48]} className="items-center">
                <Col span={24} lg={8}>
                  <AnimatedSection isActive={activeIndex === 1}>
                    <h2 className="mb-6 text-4xl font-bold text-white">核心架构</h2>
                    <p className="mb-8 leading-relaxed text-slate-400">
                      采用最新的前端技术栈构建，确保在大规模图形渲染场景下的极致体验。
                    </p>
                    <div className="space-y-4 border-l-2 border-white/10 pl-6">
                      <div className="text-sm text-slate-500">Render Engine</div>
                      <div className="font-mono text-xl text-white">PixiJS v8 + WebGL 2</div>
                      <div className="pt-2 text-sm text-slate-500">Build Tool</div>
                      <div className="font-mono text-xl text-white">Vite 7.0 + Bun</div>
                    </div>
                  </AnimatedSection>
                </Col>
                <Col span={24} lg={16}>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {TECH_STACKS.map((group, idx) => (
                      <AnimatedSection key={idx} isActive={activeIndex === 1} delay={0.2 + idx * 0.1}>
                        <div className="h-full border border-white/5 bg-white/5 p-6 backdrop-blur transition-colors hover:border-blue-500/30 hover:bg-white/10">
                          <div className="mb-4 text-xs font-bold uppercase tracking-widest text-blue-400">
                            {group.category}
                          </div>
                          <div className="flex flex-wrap gap-3">
                            {group.badges.map((badge, bIdx) => (
                              <img key={bIdx} src={badge.src} alt={badge.alt} className="h-6 opacity-90" />
                            ))}
                          </div>
                        </div>
                      </AnimatedSection>
                    ))}
                  </div>
                </Col>
              </Row>
            </div>
          </SwiperSlide>

          {/* Slide 3: Deployment (Updated) */}
          <SwiperSlide className="flex items-center justify-center">
            <div className="container mx-auto px-6 lg:px-12">
              <Row gutter={[64, 32]} className="items-center">
                {/* 左侧：动态终端 */}
                <Col span={24} lg={12}>
                  <AnimatedSection isActive={activeIndex === 2}>
                    <TerminalDemo isActive={activeIndex === 2} />
                  </AnimatedSection>
                </Col>

                {/* 右侧：命令说明 */}
                <Col span={24} lg={12}>
                  <AnimatedSection isActive={activeIndex === 2} delay={0.2}>
                    <div className="space-y-8">
                      <div>
                        <h2 className="mb-2 text-3xl font-bold text-white">运行</h2>
                        <p className="text-slate-400">通过以下方式来启动服务</p>
                      </div>

                      {/* Frontend Instructions */}
                      <div className="group">
                        <div className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-blue-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-blue-400"></span>
                          前端服务 | Frontend Service
                        </div>
                        <div className="rounded border border-white/10 bg-white/5 p-4 font-mono text-sm text-slate-300 transition-colors group-hover:border-blue-500/30">
                          <div className="select-all">git clone git@github.com:Zhongye1/BDdraw_DEV.git</div>
                          <div className="mt-1 select-all">cd BDdraw_DEV</div>
                          <div className="mt-1 select-all text-white">bun install && bun dev</div>
                        </div>
                      </div>

                      {/* Backend Instructions */}
                      <div className="group">
                        <div className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-purple-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-purple-400"></span>
                          后端服务 | Backend Service
                        </div>
                        <div className="rounded border border-white/10 bg-white/5 p-4 font-mono text-sm text-slate-300 transition-colors group-hover:border-purple-500/30">
                          <div className="select-all">cd ALD_Backend/</div>
                          <div className="mt-1 select-all">bun install</div>
                          <div className="mt-1 select-all text-white">bun index.ts</div>
                        </div>
                      </div>
                    </div>
                  </AnimatedSection>
                </Col>
              </Row>
            </div>
          </SwiperSlide>

          {/* Slide 4: 在线体验 */}
          <SwiperSlide className="flex items-center justify-center">
            <div className="container mx-auto px-6 lg:px-12">
              <AnimatedSection isActive={activeIndex === 3} delay={0.2}>
                <ArknightsCards isActive={activeIndex === 3} />
              </AnimatedSection>
            </div>
          </SwiperSlide>
        </Swiper>

        {/* 底部进度条 */}
        {/* 底部页码 */}
        <div className="absolute bottom-12 right-12 z-50 flex items-end gap-2 font-mono text-white/60">
          <span className="text-6xl font-bold">{`0${activeIndex + 1}`}</span>
          <span className="mb-2 text-xl">/ 04</span>
        </div>
        <div className="absolute bottom-0 left-0 right-0 z-50 flex h-1">
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={idx}
              className={`h-full flex-1 transition-all duration-700 ${
                idx === activeIndex ? 'bg-gradient-to-r from-blue-500 to-purple-500' : 'bg-white/5'
              }`}
            />
          ))}
        </div>
      </div>
    </>
  )
}

Home.getLayout = (page: React.ReactNode) => page
