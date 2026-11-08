import * as Phaser from 'phaser';

export interface DebugInfo {
  tick: number;
  seed: number;
}

/** Small text in the corner with fps, simulation tick and seed. Tap it to hide/show. */
export class DebugOverlay {
  private text: Phaser.GameObjects.Text;
  private visible = true;

  constructor(private scene: Phaser.Scene, private getInfo: () => DebugInfo) {
    this.text = scene.add
      .text(12, 12, '', {
        fontFamily: 'monospace',
        fontSize: '22px',
        color: '#9cff9c',
        backgroundColor: '#000000aa',
        padding: { x: 8, y: 6 },
      })
      .setDepth(10_000)
      .setScrollFactor(0)
      .setInteractive({ useHandCursor: true });

    this.text.on('pointerdown', () => {
      this.visible = !this.visible;
      this.text.setAlpha(this.visible ? 1 : 0.15);
    });
  }

  update(): void {
    const { tick, seed } = this.getInfo();
    const fps = this.scene.game.loop.actualFps.toFixed(0);
    this.text.setText(`fps ${fps}\ntick ${tick}\nseed ${seed}`);
  }
}
