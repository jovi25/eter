import * as Phaser from 'phaser';

export interface DebugInfo {
  tick: number;
  seed: number;
}

/** Small text with fps, simulation tick and seed. Tap it to dim/undim. */
export class DebugOverlay {
  private text: Phaser.GameObjects.Text;
  private bright = true;

  constructor(private scene: Phaser.Scene, private getInfo: () => DebugInfo, x = 12, y = 12, depth = 10_000) {
    this.text = scene.add
      .text(x, y, '', {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: '#9cff9c',
        backgroundColor: '#000000aa',
        padding: { x: 6, y: 4 },
      })
      .setDepth(depth)
      .setScrollFactor(0)
      .setInteractive({ useHandCursor: true });

    this.text.on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, ev: Phaser.Types.Input.EventData) => {
      ev.stopPropagation();
      this.bright = !this.bright;
      this.text.setAlpha(this.bright ? 0.85 : 0.15);
    });
    this.text.setAlpha(0.85);
  }

  update(): void {
    const { tick, seed } = this.getInfo();
    const fps = this.scene.game.loop.actualFps.toFixed(0);
    this.text.setText(`fps ${fps}  tick ${tick}  seed ${seed}`);
  }
}
