// logger.ts
const isNode = typeof process !== 'undefined' && process.release?.name === 'node'
const isBrowser = typeof window !== 'undefined'

// ANSI 颜色码（Node.js 终端专用）
const ANSI = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',

  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',

  bgBlack: '\x1b[40m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
  bgWhite: '\x1b[47m',
}

// 日志级别配置
type LogLevel = 'debug' | 'info' | 'log' | 'warn' | 'error' | 'success' | 'trace'

interface LevelConfig {
  label: string
  emoji: string
  color: string // 浏览器 CSS 颜色
  bgColor?: string // 可选背景色
  ansiColor?: string // Node 颜色
  ansiBg?: string
}

const LEVELS: Record<LogLevel, LevelConfig> = {
  debug: { label: 'DEBUG', emoji: '🔧', color: '#8b8b8b', bgColor: '#e6e6f8', ansiColor: ANSI.dim + ANSI.white },
  trace: { label: 'TRACE', emoji: '🔍', color: '#6666ff', bgColor: '#e6e6f8', ansiColor: ANSI.cyan },
  info: { label: 'INFO ', emoji: 'ℹ️', color: '#1e90ff', bgColor: '#e6e6f8', ansiColor: ANSI.blue },
  log: {
    label: 'LOG  ',
    emoji: '📝',
    color: '#ffffff',
    bgColor: '#0066cc', // 添加蓝色背景
    ansiColor: ANSI.white,
    ansiBg: ANSI.bgBlue, // 添加终端蓝色背景
  },

  success: {
    label: 'OK   ',
    emoji: '✅',
    color: '#00ff00',
    bgColor: 'blue',
    ansiColor: ANSI.green,
    ansiBg: ANSI.bgGreen,
  },
  warn: {
    label: 'WARN ',
    emoji: '⚠️',
    color: '#ffd700',
    bgColor: '#fef1d9',
    ansiColor: ANSI.yellow,
    ansiBg: ANSI.bgYellow,
  },
  error: { label: 'ERROR', emoji: '❌', color: '#ff3333', bgColor: '#ffb3d1', ansiColor: ANSI.red, ansiBg: ANSI.bgRed },
}

// 当前是否开启调试模式（可全局控制）
let ENABLE_DEBUG = true

class Logger {
  private tag: string

  constructor(tag = '') {
    this.tag = tag
  }

  // 格式化时间
  private getTimestamp(): string {
    const now = new Date()
    return now.toLocaleTimeString('zh-CN', { hour12: false }) + '.' + now.getMilliseconds().toString().padStart(3, '0')
  }

  // 通用打印方法
  private print(level: LogLevel, ...args: any[]) {
    const config = LEVELS[level]
    const timestamp = this.getTimestamp()
    const tagStr = this.tag ? `[${this.tag}]` : ''

    if (level === 'debug' && !ENABLE_DEBUG) return

    if (isNode) {
      // Node.js 环境使用 ANSI 颜色
      const color = config.ansiColor || ANSI.white
      const bg = config.ansiBg || ''
      const reset = ANSI.reset
      const bold = ANSI.bold

      console.log(
        `${ANSI.dim}${timestamp}${reset} ` +
          `${bg}${bold}${color} ${config.emoji} ${config.label} ${reset} ` +
          `${ANSI.cyan}${tagStr}${reset} `,
        ...args,
      )
    } else {
      // 浏览器环境使用 CSS 样式
      const bg = config.bgColor ? `background:${config.bgColor};` : ''
      const styles = [
        `color: ${config.color}`,
        `background: ${config.bgColor || '#1e1e1e'}`,
        'padding: 2px 6px',
        'border-radius: 4px',
        'font-weight: bold',
        bg,
      ]
        .filter(Boolean)
        .join(';')

      const tagStyle = 'color: #00ffff; font-weight: bold'

      console.log(
        `%c${config.emoji} ${config.label}%c ${timestamp} %c${tagStr}`,
        styles,
        'color: #888',
        tagStyle,
        ...args,
      )
    }
  }

  // 各日志方法
  debug(...args: any[]) {
    this.print('debug', ...args)
  }
  trace(...args: any[]) {
    this.print('trace', ...args)
  }
  info(...args: any[]) {
    this.print('info', ...args)
  }
  log(...args: any[]) {
    this.print('log', ...args)
  }
  success(...args: any[]) {
    this.print('success', ...args)
  }
  warn(...args: any[]) {
    console.warn(...args)
    this.print('warn', ...args)
  }
  error(...args: any[]) {
    console.error(...args)
    this.print('error', ...args)
  }

  // 美化 JSON 输出
  json(data: any, label = 'JSON') {
    this.info(label + ':')
    console.log(JSON.stringify(data, null, 2))
  }

  // 分组（浏览器支持折叠）
  group(label: string) {
    console.group(`%c🚀 ${label}`, 'color: #ff9900; font-weight: bold')
  }
  groupEnd() {
    console.groupEnd()
  }

  // 开启/关闭 debug
  static enableDebug(enable = true) {
    ENABLE_DEBUG = enable
  }

  // 创建带 tag 的子 logger
  child(tag: string) {
    return new Logger(this.tag ? `${this.tag}:${tag}` : tag)
  }
}

// 导出全局实例
export const logger = new Logger('APP')

// 快捷导出带 tag 的 logger
export const createLogger = (tag: string) => new Logger(tag)

// 示例使用
if (import.meta.env?.DEV || process.env.NODE_ENV === 'development') {
  // 开发环境开启 debug
  Logger.enableDebug(true)
}
