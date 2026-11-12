import * as Phaser from 'phaser';
import { ensureBaked } from '../ui/bake';
import { ELEMENTS } from '../../data/elements';
import { MAX_LEVEL, TOWERS } from '../../data/towers';
import type { TowerState } from '../../sim/types';
import { DEPTH, unitDepth } from './layers';
import { quality, addBlend } from '../quality';
import { EVOLUTIONS, evolvedLevel } from '../../data/evolutions';

class TowerView {
  readonly root: Phaser.GameObjects.Container;
  readonly top: Phaser.GameObjects.Image;
  readonly pips: Phaser.GameObjects.Image[] = [];
  private aura: Phaser.GameObjects.Image;
  private auraTween?: Phaser.Tweens.Tween;

  constructor(private scene: Phaser.Scene, t: TowerState) {
    // Max-level aura: a pulsing glow in the tower's element color.
    this.aura = scene.add
      .image(0, 4, 'spark')
      .setScale(5.5, 3.2)
      .setTint(ELEMENTS[TOWERS[t.type].element].color)
      .setBlendMode(addBlend())
      .setVisible(false);
    const base = scene.add.image(0, 6, 'tower_base');
    this.top = scene.add.image(0, -22, `tower_${t.type}`).setOrigin(0.5, 0.6);
    for (let i = 0; i < 3; i++) this.pips.push(scene.add.image(-18 + i * 18, 30, 'pip'));
    this.root = scene.add.container(t.x, t.y, [this.aura, base, this.top, ...this.pips]).setDepth(unitDepth(t.y + 20));
    this.setLevel(t.level);
  }

  baseScale = 1;
  private crown?: Phaser.GameObjects.Image;
  private snow?: Phaser.GameObjects.Particles.ParticleEmitter;
  private field?: Phaser.GameObjects.Image;

  /** Evolved: bigger, tinted in the evolution's colour, a star crown, and a storm for the blizzard. */
  setEvolution(t: TowerState): void {
    if (!t.evo) return;
    const def = EVOLUTIONS[t.evo];
    this.baseScale = 1.32;
    this.top.setScale(this.baseScale).setTint(0xffffff, 0xffffff, def.color, def.color);
    this.aura.setTint(def.color);
    this.pips.forEach((p) => p.setVisible(false));
    if (!this.crown) {
      // Glowing rune ring on the ground in the evolution's colour + a floating star crown.
      const ring = this.scene.add.image(0, 14, 'ring').setScale(1.5, 0.7).setTint(def.color).setBlendMode(addBlend()).setAlpha(0.85);
      this.root.addAt(ring, 0);
      if (!quality.low) this.scene.tweens.add({ targets: ring, alpha: 0.4, scaleX: 1.7, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.crown = this.scene.add.image(0, -92, 'star').setScale(0.5).setTint(def.color);
      this.root.add(this.crown);
      if (!quality.low) this.scene.tweens.add({ targets: this.crown, y: -94, angle: 15, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    if (def.aura && !this.snow) {
      const r = evolvedLevel(t.type, t.evo).range;
      this.snow = this.scene.add.particles(t.x, t.y, 'spark', {
        x: { min: -r, max: r },
        y: { min: -r * 0.8, max: r * 0.6 },
        speedY: { min: 30, max: 70 },
        speedX: { min: -30, max: -10 },
        lifespan: 1400,
        frequency: quality.low ? 140 : 45,
        scale: { start: 0.7, end: 0.2 },
        alpha: { start: 0.95, end: 0 },
        tint: [0xffffff, 0xd8f6ff],
        blendMode: addBlend(),
      }).setDepth(DEPTH.fx - 1);
      const key = `stormfield_${Math.round(r)}`;
      ensureBaked(this.scene, key, { x0: -r - 3, y0: -r - 3, w: 2 * r + 6, h: 2 * r + 6 }, (g) => {
        g.fillStyle(0xd8f6ff, 0.1);
        g.fillCircle(0, 0, r);
        g.lineStyle(3, 0xd8f6ff, 0.4);
        g.strokeCircle(0, 0, r);
      });
      this.field = this.scene.add.image(t.x, t.y, key).setDepth(DEPTH.groundFx);
    }
  }

  setLevel(level: number): void {
    this.pips.forEach((p, i) => p.setVisible(i < level));
    this.baseScale = 1 + (level - 1) * 0.1;
    this.top.setScale(this.baseScale);
    if (level >= MAX_LEVEL && !this.aura.visible && !quality.low) {
      this.aura.setVisible(true).setAlpha(0.5);
      this.auraTween = this.scene.tweens.add({ targets: this.aura, alpha: 0.95, scaleX: 6.3, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
  }

  destroy(): void {
    this.auraTween?.stop();
    this.snow?.destroy();
    this.field?.destroy();
    this.root.destroy();
  }
}

/** Towers: pop in when built, grow when upgraded, squash when they shoot. */
export class TowerLayer {
  private views = new Map<number, TowerView>();

  constructor(private scene: Phaser.Scene) {}

  add(t: TowerState): void {
    const v = new TowerView(this.scene, t);
    this.views.set(t.id, v);
    v.root.setScale(0.1).setY(t.y - 60);
    this.scene.tweens.add({ targets: v.root, scale: 1, y: t.y, duration: 380, ease: 'Back.easeOut' });
  }

  upgrade(t: TowerState): void {
    const v = this.views.get(t.id);
    if (!v) return;
    v.setLevel(t.level);
    this.scene.tweens.add({ targets: v.root, scaleX: { from: 1.35, to: 1 }, scaleY: { from: 0.7, to: 1 }, duration: 420, ease: 'Elastic.easeOut' });
  }

  remove(id: number): void {
    const v = this.views.get(id);
    if (!v) return;
    this.views.delete(id);
    this.scene.tweens.add({ targets: v.root, scale: 0, alpha: 0, duration: 220, ease: 'Back.easeIn', onComplete: () => v.destroy() });
  }

  evolve(t: TowerState): void {
    const v = this.views.get(t.id);
    if (!v) return;
    v.setEvolution(t);
    this.scene.tweens.add({ targets: v.root, scaleX: { from: 1.6, to: 1 }, scaleY: { from: 0.5, to: 1 }, duration: 600, ease: 'Elastic.easeOut' });
  }

  fired(id: number): void {
    const v = this.views.get(id);
    if (!v || quality.low) return;
    // Always squash relative to the level's base size (reading the current scale would creep mid-tween).
    const s = v.baseScale;
    this.scene.tweens.killTweensOf(v.top);
    this.scene.tweens.add({ targets: v.top, scaleY: { from: s * 0.82, to: s }, scaleX: { from: s * 1.12, to: s }, duration: 140, ease: 'Quad.easeOut' });
  }
}
