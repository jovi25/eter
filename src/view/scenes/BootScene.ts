import * as Phaser from 'phaser';
import { DEFAULT_SEED, GAME_HEIGHT, GAME_WIDTH } from '../../data/config';
import { FixedClock } from '../../sim/clock';
import { DebugOverlay } from '../DebugOverlay';

/**
 * Phase 0 boot screen: proves the 9:16 frame, scaling, touch and the fixed-step clock.
 */
export class BootScene extends Phaser.Scene {
  private clock = new FixedClock();
  private debug!: DebugOverlay;
  private crystal!: Phaser.GameObjects.Container;

  constructor() {
    super('Boot');
  }

  create(): void {
    const cx = GAME_WIDTH / 2;

    // Background gradient made of horizontal bands (cheap and works on any renderer).
    const bg = this.add.graphics();
    const bands = 32;
    for (let i = 0; i < bands; i++) {
      const t = i / (bands - 1);
      const color = Phaser.Display.Color.Interpolate.ColorWithColor(
        Phaser.Display.Color.ValueToColor(0x2a1858),
        Phaser.Display.Color.ValueToColor(0x0b0716),
        100,
        t * 100,
      );
      bg.fillStyle(Phaser.Display.Color.GetColor(color.r, color.g, color.b), 1);
      bg.fillRect(0, (GAME_HEIGHT / bands) * i, GAME_WIDTH, GAME_HEIGHT / bands + 1);
    }

    // Frame border so the 9:16 area is obvious on the phone (letterbox outside it).
    const frame = this.add.graphics();
    frame.lineStyle(4, 0xa77bff, 0.6);
    frame.strokeRect(2, 2, GAME_WIDTH - 4, GAME_HEIGHT - 4);

    this.crystal = this.buildCrystal(cx, 520);

    this.tweens.add({
      targets: this.crystal,
      y: 500,
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.add
      .text(cx, 760, 'ÉTER', {
        fontFamily: 'Georgia, serif',
        fontSize: '120px',
        color: '#f3e9ff',
        stroke: '#5a2fc2',
        strokeThickness: 10,
      })
      .setOrigin(0.5);

    this.add
      .text(cx, 860, 'Fase 0 — fundação', {
        fontFamily: 'sans-serif',
        fontSize: '34px',
        color: '#c9b6ff',
      })
      .setOrigin(0.5);

    this.add
      .text(cx, 1160, 'toque na tela para testar', {
        fontFamily: 'sans-serif',
        fontSize: '28px',
        color: '#8a7bb0',
      })
      .setOrigin(0.5);

    // Touch test: a ring pops where you tap.
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.tapRing(p.worldX, p.worldY));

    this.debug = new DebugOverlay(this, () => ({ tick: this.clock.tick, seed: DEFAULT_SEED }));
  }

  update(_time: number, delta: number): void {
    this.clock.advance(delta / 1000);
    this.debug.update();
  }

  private buildCrystal(x: number, y: number): Phaser.GameObjects.Container {
    const g = this.add.graphics();
    // Glow
    for (let r = 150; r > 0; r -= 15) {
      g.fillStyle(0xa77bff, 0.035);
      g.fillCircle(0, 0, r);
    }
    // Body
    g.fillStyle(0x7d4dff, 1);
    g.fillPoints(
      [
        new Phaser.Math.Vector2(0, -150),
        new Phaser.Math.Vector2(95, -10),
        new Phaser.Math.Vector2(0, 170),
        new Phaser.Math.Vector2(-95, -10),
      ],
      true,
    );
    // Facet highlight
    g.fillStyle(0xe8d8ff, 0.45);
    g.fillPoints(
      [
        new Phaser.Math.Vector2(0, -150),
        new Phaser.Math.Vector2(30, -10),
        new Phaser.Math.Vector2(0, 170),
        new Phaser.Math.Vector2(-30, -10),
      ],
      true,
    );
    // Outline
    g.lineStyle(8, 0xffffff, 1);
    g.strokePoints(
      [
        new Phaser.Math.Vector2(0, -150),
        new Phaser.Math.Vector2(95, -10),
        new Phaser.Math.Vector2(0, 170),
        new Phaser.Math.Vector2(-95, -10),
      ],
      true,
    );
    return this.add.container(x, y, [g]);
  }

  private tapRing(x: number, y: number): void {
    const ring = this.add.circle(x, y, 20).setStrokeStyle(6, 0xffd36b).setFillStyle(0xffd36b, 0.25);
    this.tweens.add({
      targets: ring,
      scale: 3,
      alpha: 0,
      duration: 450,
      ease: 'Cubic.easeOut',
      onComplete: () => ring.destroy(),
    });
    this.tweens.add({
      targets: this.crystal,
      scaleX: { from: 1.12, to: 1 },
      scaleY: { from: 0.9, to: 1 },
      duration: 260,
      ease: 'Back.easeOut',
    });
  }
}
