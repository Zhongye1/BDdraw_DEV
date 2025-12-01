import React, { useEffect, useRef } from 'react'

// 1. 样式定义 (保持不变)
const styles = `
  * { margin: 0; padding: 0; transition: 0.7s; -webkit-tap-highlight-color:rgba(0,0,0,0); }
  .tb-container { position: relative; width: 180em; height: 70em; display: inline-block; vertical-align: bottom; transform: translate3d(0, 0, 0); }
  .components{ position:absolute; width: 180em; height: 70em; background-color: rgba(70, 133, 192,1); border-radius: 100em; box-shadow: inset 0 0 5em 3em rgba(0, 0, 0, 0.5); overflow: hidden; transition: 0.7s; transition-timing-function: cubic-bezier( 0,0.5, 1,1); cursor: pointer; }
  .main-button{ margin: 7.5em 0 0 7.5em; width: 55em; height:55em; background-color: rgba(255, 195, 35,1); border-radius: 50%; box-shadow:3em 3em 5em rgba(0, 0, 0, 0.5), inset -3em -5em 3em -3em rgba(0, 0, 0, 0.5), inset 4em 5em 2em -2em rgba(255, 230, 80,1); transition: 1.0s; transition-timing-function: cubic-bezier(0.56, 1.35, 0.52, 1.00); }
  .moon{ position: absolute; background-color: rgba(150, 160, 180, 1); box-shadow:inset 0em 0em 1em 1em rgba(0, 0, 0, 0.3) ; border-radius: 50%; transition: 0.5s; opacity: 0; }
  .moon:nth-child(1){ top: 7.5em; left: 25em; width: 12.5em; height: 12.5em; }
  .moon:nth-child(2){ top: 20em; left: 7.5em; width: 20em; height: 20em; }
  .moon:nth-child(3){ top: 32.5em; left: 32.5em; width: 12.5em; height: 12.5em; }
  .daytime-background { position: absolute; border-radius: 50%; transition: 1.0s; transition-timing-function: cubic-bezier(0.56, 1.35, 0.52, 1.00); }
  .daytime-background:nth-child(2){ top: -20em; left: -20em; width: 110em; height:110em; background-color: rgba(255, 255, 255,0.2); z-index: -2; }
  .daytime-background:nth-child(3){ top: -32.5em; left: -17.5em; width: 135em; height:135em; background-color: rgba(255, 255, 255,0.1); z-index: -3; }
  .daytime-background:nth-child(4){ top: -45em; left: -15em; width: 160em; height:160em; background-color: rgba(255, 255, 255,0.05); z-index: -4; }
  .cloud,.cloud-light{ transform: translateY(10em); transition: 1.0s; transition-timing-function: cubic-bezier(0.56, 1.35, 0.52, 1.00); }
  .cloud-son{ position: absolute; background-color: #fff; border-radius: 50%; z-index: -1; transition: transform 6s,right 1s,bottom 1s; }
  .cloud-son:nth-child(6n+1){ right: -20em; bottom: 10em; width: 50em; height: 50em; }
  .cloud-son:nth-child(6n+2) { right: -10em; bottom: -25em; width: 60em; height: 60em; }
  .cloud-son:nth-child(6n+3) { right: 20em; bottom: -40em; width: 60em; height: 60em; }
  .cloud-son:nth-child(6n+4) { right: 50em; bottom: -35em; width: 60em; height: 60em; }
  .cloud-son:nth-child(6n+5) { right: 75em; bottom: -60em; width: 75em; height: 75em; }
  .cloud-son:nth-child(6n+6) { right: 110em; bottom: -50em; width: 60em; height: 60em; }
  .cloud{ z-index: -2; }
  .cloud-light{ position: absolute; right: 0em; bottom: 25em; opacity: 0.5; z-index: -3; }
  .stars{ transform: translateY(-125em); z-index: -2; transition: 1.0s; transition-timing-function: cubic-bezier(0.56, 1.35, 0.52, 1.00); }
  .big { --size: 7.5em; }
  .medium { --size: 5em; }
  .small { --size: 3em; }
  .star { position: absolute; width: calc(2*var(--size)); height: calc(2*var(--size)); }
  .star:nth-child(1){ top: 11em; left: 39em; animation-name: star; animation-duration: 3.5s; }
  .star:nth-child(2){ top: 39em; left: 91em; animation-name: star; animation-duration: 4.1s; }
  .star:nth-child(3){ top: 26em; left: 19em; animation-name: star; animation-duration: 4.9s; }
  .star:nth-child(4){ top: 37em; left: 66em; animation-name: star; animation-duration: 5.3s; }
  .star:nth-child(5){ top: 21em; left: 75em; animation-name: star; animation-duration: 3s; }
  .star:nth-child(6){ top: 51em; left: 38em; animation-name: star; animation-duration: 2.2s; }
  @keyframes star { 0%,20%{ transform: scale(0); } 20%,100% { transform: scale(1); } }
  .star-son{ float: left; }
  .star-son:nth-child(1) { --pos: left 0; }
  .star-son:nth-child(2) { --pos: right 0; }
  .star-son:nth-child(3) { --pos: 0 bottom; }
  .star-son:nth-child(4) { --pos: right bottom; }
  .star-son { width: var(--size); height: var(--size); background-image: radial-gradient(circle var(--size) at var(--pos), transparent var(--size), #fff); }
  .star{ transform: scale(1); transition-timing-function: cubic-bezier(0.56, 1.35, 0.52, 1.00); transition: 1s; animation-iteration-count:infinite; animation-direction: alternate; animation-timing-function: linear; }
`

interface ThemeButtonProps {
  theme?: 'light' | 'dark'
  size?: number
  onChange?: (theme: 'light' | 'dark') => void
}

const ThemeButton = ({ theme, size = 3, onChange }: ThemeButtonProps) => {
  const containerRef = useRef<HTMLDivElement>(null)

  // 状态Ref：isMoved = true 代表 Dark，false 代表 Light
  const stateRef = useRef({
    isMoved: false,
    isClicked: false,
  })

  // 暴露给外部 Effect 调用的动作，避免将 DOM 逻辑暴露在 useEffect 依赖中
  const actionsRef = useRef<{
    toLight: () => void
    toDark: () => void
  }>({
    toLight: () => {
      void 0
    },
    toDark: () => {
      void 0
    },
  })

  useEffect(() => {
    const root = containerRef.current
    if (!root) return

    // 辅助函数
    const $ = (s: string): HTMLElement | null => root.querySelector(s)
    const $$ = (s: string): NodeListOf<HTMLElement> => root.querySelectorAll(s)

    const mainButton = $('.main-button')
    const daytimeBackground = Array.from($$('.daytime-background'))
    const cloud = $('.cloud')
    const cloudList = Array.from($$('.cloud-son'))
    const cloudLight = $('.cloud-light')
    const components = $('.components')
    const moon = Array.from($$('.moon'))
    const stars = $('.stars')
    const star = Array.from($$('.star'))

    if (!mainButton || !components || !cloud || !cloudLight || !stars) return

    // --- 定义原子操作：仅负责变色和动画，不负责回调 ---

    const animateToLight = () => {
      mainButton.style.transform = 'translateX(0)'
      mainButton.style.backgroundColor = 'rgba(255, 195, 35,1)'
      mainButton.style.boxShadow =
        '3em 3em 5em rgba(0, 0, 0, 0.5), inset  -3em -5em 3em -3em rgba(0, 0, 0, 0.5), inset  4em 5em 2em -2em rgba(255, 230, 80,1)'

      daytimeBackground.forEach((el) => (el.style.transform = 'translateX(0)'))
      cloud.style.transform = 'translateY(10em)'
      cloudLight.style.transform = 'translateY(10em)'
      components.style.backgroundColor = 'rgba(70, 133, 192,1)'

      moon.forEach((el) => (el.style.opacity = '0'))

      stars.style.transform = 'translateY(-125em)'
      stars.style.opacity = '0'

      stateRef.current.isMoved = false
    }

    const animateToDark = () => {
      mainButton.style.transform = 'translateX(110em)'
      mainButton.style.backgroundColor = 'rgba(195, 200,210,1)'
      mainButton.style.boxShadow =
        '3em 3em 5em rgba(0, 0, 0, 0.5), inset  -3em -5em 3em -3em rgba(0, 0, 0, 0.5), inset  4em 5em 2em -2em rgba(255, 255, 210,1)'

      if (daytimeBackground[0]) daytimeBackground[0].style.transform = 'translateX(110em)'
      if (daytimeBackground[1]) daytimeBackground[1].style.transform = 'translateX(80em)'
      if (daytimeBackground[2]) daytimeBackground[2].style.transform = 'translateX(50em)'

      cloud.style.transform = 'translateY(80em)'
      cloudLight.style.transform = 'translateY(80em)'
      components.style.backgroundColor = 'rgba(25,30,50,1)'

      moon.forEach((el) => (el.style.opacity = '1'))

      stars.style.transform = 'translateY(-62.5em)'
      stars.style.opacity = '1'

      stateRef.current.isMoved = true
    }

    // 将动画方法挂载到 ref，供外部 Effect 调用
    actionsRef.current.toLight = animateToLight
    actionsRef.current.toDark = animateToDark

    // --- 用户点击交互逻辑 ---
    const handleUserClick = () => {
      // 动画期间避免重复点击
      if (stateRef.current.isClicked) return

      stateRef.current.isClicked = true
      setTimeout(() => {
        stateRef.current.isClicked = false
      }, 500)

      if (stateRef.current.isMoved) {
        // 当前是 Dark，切换到 Light
        animateToLight()
        if (onChange) onChange('light')
      } else {
        // 当前是 Light，切换到 Dark
        animateToDark()
        if (onChange) onChange('dark')
      }
    }

    // --- 鼠标移动视差效果 (保持原有逻辑) ---
    const onMouseMove = () => {
      if (stateRef.current.isClicked) return

      if (stateRef.current.isMoved) {
        // Dark Mode Hover
        mainButton.style.transform = 'translateX(100em)'
        if (daytimeBackground[0]) daytimeBackground[0].style.transform = 'translateX(100em)'
        if (daytimeBackground[1]) daytimeBackground[1].style.transform = 'translateX(73em)'
        if (daytimeBackground[2]) daytimeBackground[2].style.transform = 'translateX(46em)'

        const starPositions = [
          { top: '10em', left: '36em' },
          { top: '40em', left: '87em' },
          { top: '26em', left: '16em' },
          { top: '38em', left: '63em' },
          { top: '20.5em', left: '72em' },
          { top: '51.5em', left: '35em' },
        ]
        star.forEach((s, i) => {
          if (starPositions[i]) {
            s.style.top = starPositions[i].top
            s.style.left = starPositions[i].left
          }
        })
      } else {
        // Light Mode Hover
        mainButton.style.transform = 'translateX(10em)'
        daytimeBackground.forEach((el) => (el.style.transform = 'translateX(10em)'))

        const setCloudPos = (idx: number, right: string, bottom: string) => {
          if (cloudList[idx]) {
            cloudList[idx].style.right = right
            cloudList[idx].style.bottom = bottom
          }
        }
        // Cloud Hover Positions
        const hoverCloud = [
          ['-24em', '10em'],
          ['-12em', '-27em'],
          ['17em', '-43em'],
          ['46em', '-39em'],
          ['70em', '-65em'],
          ['109em', '-54em'],
          // light layer
          ['-23em', '10em'],
          ['-11em', '-26em'],
          ['18em', '-42em'],
          ['47em', '-38em'],
          ['74em', '-64em'],
          ['110em', '-55em'],
        ]
        hoverCloud.forEach((pos, i) => setCloudPos(i, pos[0], pos[1]))
      }
    }

    const onMouseOut = () => {
      if (stateRef.current.isClicked) return

      if (stateRef.current.isMoved) {
        // Reset to Dark
        animateToDark() // 利用现有的复位逻辑
        // 特殊修正：star位置复原
        const starReset = [
          { top: '11em', left: '39em' },
          { top: '39em', left: '91em' },
          { top: '26em', left: '19em' },
          { top: '37em', left: '66em' },
          { top: '21em', left: '75em' },
          { top: '51em', left: '38em' },
        ]
        star.forEach((s, i) => {
          if (starReset[i]) {
            s.style.top = starReset[i].top
            s.style.left = starReset[i].left
          }
        })
      } else {
        // Reset to Light
        animateToLight() // 利用现有的复位逻辑
        // 特殊修正：云朵位置复原
        const setCloudPos = (idx: number, right: string, bottom: string) => {
          if (cloudList[idx]) {
            cloudList[idx].style.right = right
            cloudList[idx].style.bottom = bottom
          }
        }
        const resetCloud = [
          ['-20em', '10em'],
          ['-10em', '-25em'],
          ['20em', '-40em'],
          ['50em', '-35em'],
          ['75em', '-60em'],
          ['110em', '-50em'],
          // light layer
          ['-20em', '10em'],
          ['-10em', '-25em'],
          ['20em', '-40em'],
          ['50em', '-35em'],
          ['75em', '-60em'],
          ['110em', '-50em'],
        ]
        resetCloud.forEach((pos, i) => setCloudPos(i, pos[0], pos[1]))
      }
    }

    // 云朵随机移动
    const moveElementRandomly = (element: HTMLElement) => {
      const directions = ['2em', '-2em']
      const randomDirectionX = directions[Math.floor(Math.random() * directions.length)]
      const randomDirectionY = directions[Math.floor(Math.random() * directions.length)]
      element.style.transform = `translate(${randomDirectionX}, ${randomDirectionY})`
    }
    const intervalId = setInterval(() => {
      cloudList.forEach((el) => moveElementRandomly(el))
    }, 1000)

    // 绑定事件
    components.onclick = handleUserClick
    mainButton.addEventListener('mousemove', onMouseMove)
    mainButton.addEventListener('mouseout', onMouseOut)

    // 初始化：确保 UI 与初始 props 一致
    // 如果没有传入 theme prop，默认逻辑在父组件处理，这里只看当前 theme
    // 为了防止闪烁，这里立即执行一次
    if (theme === 'dark' || (theme === undefined && stateRef.current.isMoved)) {
      animateToDark()
    } else {
      animateToLight()
    }

    return () => {
      clearInterval(intervalId)
      mainButton.removeEventListener('mousemove', onMouseMove)
      mainButton.removeEventListener('mouseout', onMouseOut)
      components.onclick = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // 仅在组件挂载时执行

  // 监听外部 prop theme 的变化
  useEffect(() => {
    // 获取当前的有效主题
    const effectiveTheme = theme ?? 'dark' // 默认为 dark 或者根据需求

    const isCurrentlyDark = stateRef.current.isMoved

    if (effectiveTheme === 'dark' && !isCurrentlyDark) {
      // 外部要求变黑，且当前是白 -> 变黑 (静默，不触发 onChange)
      actionsRef.current.toDark()
    } else if (effectiveTheme === 'light' && isCurrentlyDark) {
      // 外部要求变白，且当前是黑 -> 变白 (静默，不触发 onChange)
      actionsRef.current.toLight()
    }
  }, [theme])

  return (
    <div ref={containerRef} className="tb-container" style={{ fontSize: `${(size / 12).toFixed(2)}px` }}>
      <style>{styles}</style>
      <div className="components">
        <div className="main-button">
          <div className="moon"></div>
          <div className="moon"></div>
          <div className="moon"></div>
        </div>
        <div className="daytime-background"></div>
        <div className="daytime-background"></div>
        <div className="daytime-background"></div>
        <div className="cloud">
          <div className="cloud-son"></div>
          <div className="cloud-son"></div>
          <div className="cloud-son"></div>
          <div className="cloud-son"></div>
          <div className="cloud-son"></div>
          <div className="cloud-son"></div>
        </div>
        <div className="cloud-light">
          <div className="cloud-son"></div>
          <div className="cloud-son"></div>
          <div className="cloud-son"></div>
          <div className="cloud-son"></div>
          <div className="cloud-son"></div>
          <div className="cloud-son"></div>
        </div>
        <div className="stars">
          <div className="star big">
            <div className="star-son"></div>
            <div className="star-son"></div>
            <div className="star-son"></div>
            <div className="star-son"></div>
          </div>
          <div className="star big">
            <div className="star-son"></div>
            <div className="star-son"></div>
            <div className="star-son"></div>
            <div className="star-son"></div>
          </div>
          <div className="star medium">
            <div className="star-son"></div>
            <div className="star-son"></div>
            <div className="star-son"></div>
            <div className="star-son"></div>
          </div>
          <div className="star medium">
            <div className="star-son"></div>
            <div className="star-son"></div>
            <div className="star-son"></div>
            <div className="star-son"></div>
          </div>
          <div className="star small">
            <div className="star-son"></div>
            <div className="star-son"></div>
            <div className="star-son"></div>
            <div className="star-son"></div>
          </div>
          <div className="star small">
            <div className="star-son"></div>
            <div className="star-son"></div>
            <div className="star-son"></div>
            <div className="star-son"></div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ThemeButton
