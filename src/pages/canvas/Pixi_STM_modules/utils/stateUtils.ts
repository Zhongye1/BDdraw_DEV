/**
 * 防抖处理函数
 * @param callback 要执行的回调函数
 * @param delay 延迟时间（毫秒）
 * @param timerId 定时器ID
 * @returns 新的定时器ID
 */
export function debounce(callback: () => void, delay: number, timerId: number | null): number | null {
  // 清除之前的定时器
  if (timerId !== null) {
    clearTimeout(timerId)
  }

  // 设置新的定时器
  return window.setTimeout(() => {
    callback()
    // 重置定时器
  }, delay)
}

/**
 * 检查两个状态是否相等
 * @param prev 之前的状态
 * @param next 新的状态
 * @returns 是否相等
 */
export function stateEqualityFn(prev: any, next: any): boolean {
  return JSON.stringify(prev) === JSON.stringify(next)
}
