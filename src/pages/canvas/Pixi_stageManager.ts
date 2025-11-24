// src/Pixi_stageManager.ts
// 引入 HTMLText (PixiJS v8 内置支持，如果是 v7 可能需要安装 @pixi/text-html)

type InteractionMode = 'idle' | 'panning' | 'selecting' | 'dragging' | 'resizing' | 'drawing'
type HandleType = 'tl' | 't' | 'tr' | 'r' | 'br' | 'b' | 'bl' | 'l' | 'p0' | 'p1'

// 导出 StageManagerCore 作为新的 StageManager
export { StageManagerCore as StageManager } from './Pixi_STM_modules/core/Core_StageManager'
