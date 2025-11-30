// --- 先前卡片组件边角料 ---
import { IconCommand, IconCode, IconGithub, IconBook } from '@arco-design/web-react/icon'

// 定义卡片类型
interface AkCard {
  title: string
  subtitle: string
  img: string
  icon: React.ReactNode
  accent: string
  onClick?: () => void
}

const AK_CARDS: AkCard[] = [
  {
    title: '在线体验',
    subtitle: 'ONLINE_EXPERIENCE',
    img: 'https://picx.zhimg.com/v2-baf3ea39d66f64fa8896a2959003c445_720w.jpg?source=d16d100b',
    icon: <IconCommand className="text-4xl" />,
    accent: 'group-hover:text-red-500',
    onClick: () => {
      // 跳转到登录页
      window.location.href = '/BDdraw_DEV/login'
    },
  },
  {
    title: '代码仓库',
    subtitle: 'REPOSITORY',
    img: 'https://picx.zhimg.com/80/v2-63542c8f3f069487b14251aaeb260a83_720w.webp?source=d16d100b',
    icon: <IconCode className="text-4xl" />,
    accent: 'group-hover:text-yellow-500',
    onClick: () => {
      // 跳转到代码仓库
      window.open('https://github.com/Zhongye1/BDdraw_DEV', '_blank')
    },
  },
  {
    title: '相关文档',
    subtitle: 'DOCUMENTATION',
    img: 'https://picx.zhimg.com/v2-381cc3f4ba85f62cdc483136e5fa4f47_720w.jpg?source=d16d100b',
    icon: <IconBook className="text-4xl" />,
    accent: 'group-hover:text-blue-500',
    onClick: () => {
      // 跳转到文档
      window.open('https://github.com/Zhongye1/BDdraw_DEV/tree/main/docs', '_blank')
    },
  },
  {
    title: '作者主页',
    subtitle: 'AUTHOR',
    img: 'https://picx.zhimg.com/v2-e491f9c331cc60fcedd39c703d6dc037_720w.jpg?source=d16d100b',
    icon: <IconGithub className="text-4xl" />,
    accent: 'group-hover:text-green-500',
    onClick: () => {
      // 跳转到作者主页
      window.open('https://github.com/Zhongye1', '_blank')
    },
  },
]

export const ArknightsCards = ({ isActive }: { isActive: boolean }) => {
  return (
    <div className="relative h-[80vh] w-full overflow-hidden bg-black">
      {/* 背景大字 - MORE CONTENT */}
      <div className="absolute bottom-[-5%] left-0 z-0 select-none font-mono text-[15vw] font-bold leading-none text-[#ffffff08]">
        MORE CONTENT
      </div>

      <div className="flex h-full w-full">
        {AK_CARDS.map((card, index) => (
          <div
            key={index}
            onClick={card.onClick}
            className={`
              group relative flex h-full cursor-pointer overflow-hidden border-r border-white/10 transition-[flex] duration-700 ease-in-out
              hover:flex-[2] hover:grayscale-0
              ${isActive ? 'flex-[1]' : 'flex-[0]'} 
              grayscale filter
            `}
          >
            {/* 背景图 */}
            <div className="absolute inset-0 z-0">
              <img
                src={card.img}
                alt={card.title}
                className="h-full w-full object-cover opacity-60 transition-transform duration-700 group-hover:scale-110 group-hover:opacity-100"
              />
              {/* 渐变遮罩，保证文字清晰 */}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent opacity-90 transition-opacity duration-500 group-hover:opacity-60" />
            </div>

            {/* 内容区域 - 竖向布局 */}
            <div className="relative z-10 flex flex-col items-center justify-center p-8 md:p-12">
              {/* 图标 */}
              <div className="mb-8 translate-y-4 opacity-80 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100">
                <div className="inline-flex h-16 w-16 items-center justify-center border-2 border-white/30 bg-black/20 text-white backdrop-blur-sm transition-colors group-hover:border-white">
                  {/* 这里使用了 Icon 组件，实际可以使用 SVG 绘制更精确的图形 */}
                  {card.icon}
                </div>
              </div>

              {/* 标题 - 竖向排列 */}
              <h3 className="mb-6 flex flex-col items-center text-4xl font-black tracking-wider text-white md:text-5xl">
                {card.title.split('').map((char, charIndex) => (
                  <span key={charIndex} className="leading-none">
                    {char}
                  </span>
                ))}
              </h3>

              {/* 英文副标题 - 竖向排列 */}
              <div className="mb-8 flex flex-col items-center font-mono text-sm font-bold tracking-[0.2em] text-white/60">
                {card.subtitle.split(' ').map((word, wordIndex) => (
                  <span key={wordIndex} className="mb-1 leading-none">
                    {word}
                  </span>
                ))}
              </div>

              {/* View More 按钮 */}
              <div className="flex flex-col items-center gap-2 overflow-hidden">
                <span
                  className={`translate-y-10 text-xs font-bold transition-all duration-500 group-hover:translate-y-0 ${card.accent}`}
                >
                  VIEW MORE
                </span>
              </div>

              {/* 底部装饰线 */}
              <div className="mt-8 h-12 w-[1px] bg-white/50 transition-all duration-500 group-hover:h-24 group-hover:bg-white" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
