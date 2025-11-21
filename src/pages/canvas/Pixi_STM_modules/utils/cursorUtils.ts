import type { HandleType } from '../core/types'

export function getCursorForHandle(handle: HandleType): string {
  if (handle === 'p0' || handle === 'p1') return 'move'
  switch (handle) {
    case 'tl':
    case 'br':
      return 'nwse-resize'
    case 'tr':
    case 'bl':
      return 'nesw-resize'
    case 't':
    case 'b':
      return 'ns-resize'
    case 'l':
    case 'r':
      return 'ew-resize'
    default:
      return 'default'
  }
}
