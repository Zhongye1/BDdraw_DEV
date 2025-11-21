import * as PIXI from 'pixi.js'
import { Viewport } from 'pixi-viewport'

export class InteractionHandler {
  private viewport: Viewport
  private onPointerDown: (e: PIXI.FederatedPointerEvent) => void
  private onPointerMove: (e: PIXI.FederatedPointerEvent) => void
  private onPointerUp: (e: PIXI.FederatedPointerEvent) => void

  constructor(
    viewport: Viewport,
    onPointerDown: (e: PIXI.FederatedPointerEvent) => void,
    onPointerMove: (e: PIXI.FederatedPointerEvent) => void,
    onPointerUp: (e: PIXI.FederatedPointerEvent) => void,
  ) {
    this.viewport = viewport
    this.onPointerDown = onPointerDown
    this.onPointerMove = onPointerMove
    this.onPointerUp = onPointerUp
  }

  public setupInteraction() {
    this.viewport.on('pointerdown', this.onPointerDown)
    this.viewport.on('pointermove', this.onPointerMove)
    this.viewport.on('pointerup', this.onPointerUp)
    this.viewport.on('pointerupoutside', this.onPointerUp)
  }

  public removeInteraction() {
    this.viewport.off('pointerdown', this.onPointerDown)
    this.viewport.off('pointermove', this.onPointerMove)
    this.viewport.off('pointerup', this.onPointerUp)
    this.viewport.off('pointerupoutside', this.onPointerUp)
  }
}
