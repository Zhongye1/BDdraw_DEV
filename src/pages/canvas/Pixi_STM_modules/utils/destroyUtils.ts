/**
 * 移除事件监听器
 * @param handleKeyDown 按键按下处理函数
 * @param handleKeyUp 按键释放处理函数
 */
export function removeKeyboardEventListeners(
  handleKeyDown: (e: KeyboardEvent) => void,
  handleKeyUp: (e: KeyboardEvent) => void,
) {
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('keyup', handleKeyUp)
}
