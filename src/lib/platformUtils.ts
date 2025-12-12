/**
 * 检测用户操作系统平台
 * @returns 'mac' | 'windows' | 'linux' | 'other'
 */
export function detectPlatform(): 'mac' | 'windows' | 'linux' | 'other' {
  const userAgent = navigator.userAgent.toLowerCase()

  if (userAgent.includes('macintosh') || userAgent.includes('mac os')) {
    return 'mac'
  } else if (userAgent.includes('windows')) {
    return 'windows'
  } else if (userAgent.includes('linux')) {
    return 'linux'
  } else {
    return 'other'
  }
}

/**
 * 根据平台获取对应的修饰键名称
 * @param platform 操作系统平台
 * @returns 修饰键名称
 */
export function getModifierKeyName(platform: 'mac' | 'windows' | 'linux' | 'other'): string {
  switch (platform) {
    case 'mac':
      return 'Cmd'
    default:
      return 'Ctrl'
  }
}

/**
 * 根据平台获取对应的修饰键代码
 * @param platform 操作系统平台
 * @returns 修饰键代码
 */
export function getModifierKeyCode(platform: 'mac' | 'windows' | 'linux' | 'other'): string {
  switch (platform) {
    case 'mac':
      return 'meta'
    default:
      return 'ctrl'
  }
}
