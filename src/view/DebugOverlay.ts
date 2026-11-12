import * as Phaser from 'phaser';
import { quality } from './quality';
import { renderScale } from './perf';

/** Smoothed ms spent in BattleScene.update (simulation + view sync), set by the scene. */
export const logicMs = { value: 0 };

/** Smoothed ms of a whole frame on the CPU (update + building/sending the draw commands). */
export const frameMs = { value: 0 };
let hooked = false;
function hookFrameMeter(game: Phaser.Game): void {
  if (hooked) return;
  hooked = true;
  let t0 = 0;
  game.events.on('prestep', () => (t0 = performance.now()));
  game.events.on('postrender', () => (frameMs.value = frameMs.value * 0.9 + (performance.now() - t0) * 0.1));
}

export interface DebugInfo {
  tick: number;
  seed: number;
}

/** Small text with fps, simulation tick and seed. Tap it to dim/undim. */
export class DebugOverlay {
  private text: Phaser.GameObjects.Text;
  private bright = true;

  constructor(private scene: Phaser.Scene, _getInfo: () => DebugInfo, x = 12, y = 12, depth = 10_000) {
    this.text = scene.add
      .text(x, y, '', {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: '#9cff9c',
        backgroundColor: '#000000aa',
        padding: { x: 6, y: 4 },
      })
      .setDepth(depth)
      .setInteractive({ useHandCursor: true });

    this.text.on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, ev: Phaser.Types.Input.EventData) => {
      ev.stopPropagation();
      this.bright = !this.bright;
      this.text.setAlpha(this.bright ? 0.85 : 0.15);
    });
    this.text.setAlpha(0.85);
    hookFrameMeter(scene.game);
  }

  private nextAt = 0;

  update(): void {
    const now = this.scene.time.now;
    if (now < this.nextAt) return;
    this.nextAt = now + 500;
    const fps = this.scene.game.loop.actualFps.toFixed(0);
    const mode = `${this.scene.game.renderer.type === 2 ? 'GL' : 'CV'}${renderScale() < 1 ? ` ${Math.round(renderScale() * 100)}%` : ''}`;
    this.text.setText(`fps ${fps}${quality.low ? ' (leve)' : ''} • quadro ${frameMs.value.toFixed(1)}ms (lógica ${logicMs.value.toFixed(1)}) • ${mode}`);
  }
}
