import * as Phaser from 'phaser';
import { ensureBaked } from '../ui/bake';
import { ELEMENTS } from '../../data/elements';
import { MAX_LEVEL, TOWERS } from '../../data/towers';
import type { TowerState } from '../../sim/types';
import { DEPTH, unitDepth } from './layers';
import { quality, addBlend } from '../quality';
import { EVOLUTIONS, evolvedLevel } from '../../data/evolutions';
import { FUSIONS } from '../../data/fusions';
import { dragonArt, isCreature, type DragonArt } from '../art/creatures';

class TowerView {
  readonly root: Phaser.GameObjects.Container;
  readonly top: Phaser.GameObjects.Image;
  readonly pips: Phaser.GameObjects.Image[] = [];
  private aura: Phaser.GameObjects.Image;
  private auraTween?: Phaser.Tweens.Tween;

  /** Torres-criaturas (amostra): the art itself grows; it breathes and never gets tinted. */
  readonly creature: boolean;
  /** Illustrated creature (pilot): a picture with an attack pose; null = painted art. */
  art: DragonArt | null = null;
  /** Shooting squash, combined with the breathing every frame. */
  readonly squash = { x: 1, y: 1 };
  facing = 1;
  flameGlow?: Phaser.GameObjects.Image;
  atkTimer?: Phaser.Time.TimerEvent;

  private readonly type: TowerState['type'];

  constructor(private scene: Phaser.Scene, t: TowerState) {
    this.type = t.type;
    this.art = isCreature(t.type, scene.textures) ? dragonArt(scene.textures, t.type, t.level, null) : null;
    this.creature = this.art !== null;
    // Max-level aura: a pulsing glow in the tower's element color.
    this.aura = scene.add
      .image(0, 4, 'spark')
      .setScale(5.5, 3.2)
      .setTint(ELEMENTS[TOWERS[t.type].element].color)
      .setBlendMode(addBlend())
      .setVisible(false);
    const base = scene.add.image(0, 6, 'tower_base');
    this.top = scene.add.image(0, -22, this.art ? this.art.key : `tower_${t.type}`).setOrigin(0.5, 0.6);
    for (let i = 0; i < 3; i++) this.pips.push(scene.add.image(-18 + i * 18, 30, 'pip'));
    this.root = scene.add.container(t.x, t.y, [this.aura, base, this.top, ...this.pips]).setDepth(unitDepth(t.y + 20));
    if (this.art && this.art.glow !== null) {
      // The tail tip (flame, snowflake, spark) glows softly behind the picture.
      this.flameGlow = scene.add.image(0, 0, 'spark').setTint(this.art.glow).setBlendMode(addBlend()).setAlpha(0.55);
      this.root.addAt(this.flameGlow, this.root.getIndex(this.top));
      this.top.setY(2);
    }
    this.setLevel(t.level);
    if (this.art && !quality.low) {
      // Breathing: the chest swells (scale from the feet), combined with the shooting squash.
      const b = { v: 0 };
      scene.tweens.add({
        targets: b, v: 1, duration: 1100 + Math.random() * 300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
        onUpdate: () => this.top.setScale(this.facing * this.baseScale * this.squash.x * (1 - 0.012 * b.v), this.baseScale * this.squash.y * (1 + 0.03 * b.v)),
      });
      if (this.flameGlow) scene.tweens.add({ targets: this.flameGlow, alpha: 0.95, duration: 380 + Math.random() * 120, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
  }

  baseScale = 1;
  private crown?: Phaser.GameObjects.Image;
  private snow?: Phaser.GameObjects.Particles.ParticleEmitter;
  private field?: Phaser.GameObjects.Image;

  /** Evolved: bigger, tinted in the evolution's colour, a star crown, and a storm for the blizzard. */
  setEvolution(t: TowerState): void {
    if (!t.evo) return;
    const def = EVOLUTIONS[t.evo];
    if (this.art) {
      this.showArt(dragonArt(this.scene.textures, t.type, t.evo ? 3 : t.level, t.evo) ?? this.art);
      this.top.clearTint();
    } else {
      this.baseScale = 1.32;
      this.top.setScale(this.baseScale).setTint(0xffffff, 0xffffff, def.color, def.color);
    }
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
        tint: [0xffffff, def.color],
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

  /** Fused: the partner tower rides on the side, a two-colour ring, the fusion colour on top. */
  setFusion(t: TowerState): void {
    if (!t.fusion || this.crown) return;
    const def = FUSIONS[t.fusion];
    const partner = def.towers[0] === t.type ? def.towers[1] : def.towers[0];
    this.baseScale = this.art ? this.art.scale * 1.1 : 1.2;
    this.top.setScale(this.facing * this.baseScale, this.baseScale).setTint(0xffffff, 0xffffff, def.color, def.color);
    this.aura.setTint(def.color);
    this.pips.forEach((p) => p.setVisible(false));
    const ringA = this.scene.add.image(0, 14, 'ring').setScale(1.55, 0.72).setTint(ELEMENTS[TOWERS[t.type].element].color).setBlendMode(addBlend()).setAlpha(0.85);
    const ringB = this.scene.add.image(0, 14, 'ring').setScale(1.2, 0.56).setTint(ELEMENTS[TOWERS[partner].element].color).setBlendMode(addBlend()).setAlpha(0.85);
    this.root.addAt(ringA, 0);
    this.root.addAt(ringB, 0);
    // The partner rides on the side: its adult dragon, small (or its painted tower).
    const pArt = this.creature ? dragonArt(this.scene.textures, partner, 3, null) : null;
    const side = pArt
      ? this.scene.add.image(34, -18, pArt.key).setOrigin(pArt.originX, pArt.originY).setScale(pArt.scale * 0.55)
      : this.scene.add.image(30, -34, `tower_${partner}`).setOrigin(0.5, 0.6).setScale(0.62);
    this.root.add(side);
    this.crown = this.scene.add.image(0, -92, 'star').setScale(0.5).setTint(def.color);
    this.root.add(this.crown);
    if (!quality.low) {
      this.scene.tweens.add({ targets: [ringA, ringB], angle: 360, duration: 4000, repeat: -1 });
      this.scene.tweens.add({ targets: this.crown, y: -94, angle: 15, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
  }

  setLevel(level: number): void {
    this.pips.forEach((p, i) => p.setVisible(i < level));
    const art = this.art ? dragonArt(this.scene.textures, this.type, level, null) : null;
    if (art) this.showArt(art);
    else {
      this.baseScale = this.creature ? 1 : 1 + (level - 1) * 0.1;
      this.top.setScale(this.baseScale);
    }
    if (level >= MAX_LEVEL && !this.aura.visible && !quality.low) {
      this.aura.setVisible(true).setAlpha(0.5);
      this.auraTween = this.scene.tweens.add({ targets: this.aura, alpha: 0.95, scaleX: 6.3, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
  }

  /** Switch to an illustrated form: picture, feet anchor, size, and where the tail flame glows. */
  showArt(art: DragonArt): void {
    this.art = art;
    this.atkTimer?.remove();
    this.top.setTexture(art.key).setOrigin(art.originX, art.originY);
    this.baseScale = art.scale;
    this.top.setScale(this.facing * art.scale, art.scale);
    this.placeGlow();
  }

  /** The glow follows the tail flame (it flips with the creature). */
  placeGlow(): void {
    if (!this.art || !this.flameGlow) return;
    const f = this.top.frame;
    const gx = (this.art.flame[0] - this.art.originX * f.width) * this.art.scale;
    const gy = (this.art.flame[1] - this.art.originY * f.height) * this.art.scale;
    this.flameGlow.setPosition(this.top.x + gx * this.facing, this.top.y + gy).setScale(1.2 + this.art.scale * 2);
  }

  /** Attack: turn to the target, open the mouth, lunge forward and squash; back to rest after a moment. */
  attack(targetX: number | undefined): void {
    if (!this.art) return;
    if (targetX !== undefined && Math.abs(targetX - this.root.x) > 8) {
      this.facing = targetX < this.root.x ? -1 : 1;
      this.placeGlow();
    }
    const art = this.art;
    this.top.setTexture(art.atkKey);
    this.atkTimer?.remove();
    this.atkTimer = this.scene.time.delayedCall(320, () => this.top.setTexture(art.key));
    this.scene.tweens.killTweensOf(this.squash);
    this.scene.tweens.add({ targets: this.squash, x: { from: 1.1, to: 1 }, y: { from: 0.86, to: 1 }, duration: 260, ease: 'Quad.easeOut' });
    this.scene.tweens.killTweensOf(this.top);
    this.scene.tweens.add({ targets: this.top, x: { from: 9 * this.facing, to: 0 }, duration: 300, ease: 'Quad.easeOut' });
    if (quality.low) this.top.setScale(this.facing * this.baseScale, this.baseScale);
  }

  destroy(): void {
    this.atkTimer?.remove();
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

  fuse(t: TowerState): void {
    const v = this.views.get(t.id);
    if (!v) return;
    v.setFusion(t);
    this.scene.tweens.add({ targets: v.root, scaleX: { from: 1.6, to: 1 }, scaleY: { from: 0.5, to: 1 }, duration: 600, ease: 'Elastic.easeOut' });
  }

  /** The partner flies into the fused tower and disappears. */
  absorb(id: number, x: number, y: number): void {
    const v = this.views.get(id);
    if (!v) return;
    this.views.delete(id);
    this.scene.tweens.add({ targets: v.root, x, y: y - 20, scale: 0.2, alpha: 0.3, duration: 380, ease: 'Cubic.easeIn', onComplete: () => v.destroy() });
  }

  fired(id: number, targetX?: number): void {
    const v = this.views.get(id);
    if (!v) return;
    if (v.art) {
      v.attack(targetX);
      return;
    }
    if (quality.low) return;
    // Always squash relative to the level's base size (reading the current scale would creep mid-tween).
    const s = v.baseScale;
    this.scene.tweens.killTweensOf(v.top);
    this.scene.tweens.add({ targets: v.top, scaleY: { from: s * 0.82, to: s }, scaleX: { from: s * 1.12, to: s }, duration: 140, ease: 'Quad.easeOut' });
  }
}
