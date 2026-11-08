import * as Phaser from 'phaser';
import { ELEMENTS } from '../../data/elements';
import { MAX_LEVEL, TOWERS } from '../../data/towers';
import type { TowerState } from '../../sim/types';
import { unitDepth } from './layers';

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
      .setBlendMode(Phaser.BlendModes.ADD)
      .setVisible(false);
    const base = scene.add.image(0, 6, 'tower_base');
    this.top = scene.add.image(0, -22, `tower_${t.type}`).setOrigin(0.5, 0.6);
    for (let i = 0; i < 3; i++) this.pips.push(scene.add.image(-18 + i * 18, 30, 'pip'));
    this.root = scene.add.container(t.x, t.y, [this.aura, base, this.top, ...this.pips]).setDepth(unitDepth(t.y + 20));
    this.setLevel(t.level);
  }

  baseScale = 1;

  setLevel(level: number): void {
    this.pips.forEach((p, i) => p.setVisible(i < level));
    this.baseScale = 1 + (level - 1) * 0.1;
    this.top.setScale(this.baseScale);
    if (level >= MAX_LEVEL && !this.aura.visible) {
      this.aura.setVisible(true).setAlpha(0.5);
      this.auraTween = this.scene.tweens.add({ targets: this.aura, alpha: 0.95, scaleX: 6.3, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
  }

  destroy(): void {
    this.auraTween?.stop();
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

  fired(id: number): void {
    const v = this.views.get(id);
    if (!v) return;
    // Always squash relative to the level's base size (reading the current scale would creep mid-tween).
    const s = v.baseScale;
    this.scene.tweens.killTweensOf(v.top);
    this.scene.tweens.add({ targets: v.top, scaleY: { from: s * 0.82, to: s }, scaleX: { from: s * 1.12, to: s }, duration: 140, ease: 'Quad.easeOut' });
  }
}
