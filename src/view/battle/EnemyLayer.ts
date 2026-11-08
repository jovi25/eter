import * as Phaser from 'phaser';
import { ENEMIES } from '../../data/enemies';
import type { EnemyState } from '../../sim/types';
import type { Simulation } from '../../sim/simulation';
import { PAL } from '../art/palette';
import { unitDepth } from './layers';

const HP_W = 52;

class EnemyView {
  readonly root: Phaser.GameObjects.Container;
  readonly shadow: Phaser.GameObjects.Image;
  readonly roots: Phaser.GameObjects.Image;
  readonly body: Phaser.GameObjects.Image;
  readonly ice: Phaser.GameObjects.Image;
  readonly fragile: Phaser.GameObjects.Image;
  readonly hpBg: Phaser.GameObjects.Rectangle;
  readonly hpFill: Phaser.GameObjects.Rectangle;
  id = 0;
  prevX = 0;
  prevY = 0;
  bodyY = 0;
  flashUntil = 0;
  seen = false;
  dying: 'kill' | 'leak' | null = null;
  breath?: Phaser.Tweens.Tween;
  fireTimer = 0;

  constructor(scene: Phaser.Scene) {
    this.shadow = scene.add.image(0, 0, 'shadow');
    this.roots = scene.add.image(0, 0, 'status_roots').setVisible(false);
    this.body = scene.add.image(0, 0, 'enemy_slime');
    this.ice = scene.add.image(0, 0, 'status_ice').setVisible(false);
    this.fragile = scene.add.image(0, 0, 'status_fragile').setVisible(false);
    this.hpBg = scene.add.rectangle(0, 0, HP_W + 4, 9, PAL.ink).setVisible(false);
    this.hpFill = scene.add.rectangle(0, 0, HP_W, 5, 0x6ee66e).setOrigin(0, 0.5).setVisible(false);
    this.root = scene.add.container(0, 0, [this.shadow, this.roots, this.body, this.ice, this.fragile, this.hpBg, this.hpFill]);
  }
}

/** Draws enemies from the simulation state (interpolated between ticks), with pooling. */
export class EnemyLayer {
  private views = new Map<number, EnemyView>();
  private pool: EnemyView[] = [];
  /** Called every ~0.12 s for each burning enemy so the FX layer can emit flames. */
  onBurning?: (x: number, y: number) => void;

  constructor(private scene: Phaser.Scene) {}

  get(id: number): EnemyView | undefined {
    return this.views.get(id);
  }

  /** Visual top-of-head position (for damage numbers). */
  headOf(id: number): { x: number; y: number } | null {
    const v = this.views.get(id);
    if (!v) return null;
    return { x: v.root.x, y: v.root.y + v.bodyY - v.body.displayHeight * 0.5 };
  }

  /** Remember positions before a sim tick, for interpolation. */
  snapshot(sim: Simulation): void {
    for (const e of sim.state.enemies) {
      const v = this.views.get(e.id);
      if (v) {
        v.prevX = e.x;
        v.prevY = e.y;
      }
    }
  }

  markDying(id: number, how: 'kill' | 'leak'): void {
    const v = this.views.get(id);
    if (v) v.dying = how;
  }

  /** Brief brighten on hit. Rate-limited so constant fire doesn't leave enemies permanently white. */
  flash(id: number): void {
    const v = this.views.get(id);
    const now = this.scene.time.now;
    if (v && now - v.flashUntil > 220) v.flashUntil = now + 60;
  }

  sync(sim: Simulation, alpha: number, dtMs: number): void {
    for (const v of this.views.values()) v.seen = false;
    for (const e of sim.state.enemies) {
      let v = this.views.get(e.id);
      if (!v) v = this.spawn(e);
      v.seen = true;
      const x = v.prevX + (e.x - v.prevX) * alpha;
      const y = v.prevY + (e.y - v.prevY) * alpha;
      v.root.setPosition(x, y).setDepth(unitDepth(y));
      this.updateStatus(v, e, dtMs);
    }
    for (const [id, v] of this.views) {
      if (v.seen) continue;
      this.views.delete(id);
      this.despawn(v);
    }
  }

  private spawn(e: EnemyState): EnemyView {
    const v = this.pool.pop() ?? new EnemyView(this.scene);
    const def = ENEMIES[e.type];
    v.id = e.id;
    v.prevX = e.x;
    v.prevY = e.y;
    v.dying = null;
    v.flashUntil = 0;
    v.root.setVisible(true).setAlpha(1).setScale(1);
    v.body.setTexture(`enemy_${e.type}`).setScale(1).setAlpha(1).clearTint().setTintMode(Phaser.TintModes.MULTIPLY);
    const h = v.body.height;
    v.bodyY = def.flying ? -h * 0.5 - 34 : -h * 0.42;
    v.body.setPosition(0, v.bodyY);
    v.shadow.setScale(def.radius / 30, 1).setPosition(0, 4).setAlpha(def.flying ? 0.5 : 1);
    v.roots.setVisible(false).setScale(def.radius / 28);
    v.ice.setVisible(false).setPosition(0, v.bodyY).setScale((def.radius * 2.4) / 64);
    const top = v.bodyY - h * 0.5 - 8;
    v.hpBg.setPosition(0, top).setVisible(false);
    v.hpFill.setPosition(-HP_W / 2, top).setVisible(false);
    v.fragile.setPosition(HP_W / 2 + 10, top).setVisible(false);
    // Breathing (squash & stretch) — bats flap faster and bob.
    v.breath?.stop();
    v.breath = this.scene.tweens.add({
      targets: v.body,
      scaleY: def.flying ? 0.9 : 0.92,
      scaleX: def.flying ? 1.08 : 1.05,
      y: v.bodyY + (def.flying ? 6 : 1),
      duration: def.flying ? 180 : 420 + (e.id % 5) * 40,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    // Spawn pop
    v.root.setScale(0.2);
    this.scene.tweens.add({ targets: v.root, scale: 1, duration: 220, ease: 'Back.easeOut' });
    this.views.set(e.id, v);
    return v;
  }

  private updateStatus(v: EnemyView, e: EnemyState, dtMs: number): void {
    const now = this.scene.time.now;
    if (now < v.flashUntil) {
      v.body.setTint(0x555555).setTintMode(Phaser.TintModes.ADD);
    } else {
      v.body.setTintMode(Phaser.TintModes.MULTIPLY);
      if (e.frozenTime > 0) v.body.setTint(0x9fdcff);
      else if (e.chillTime > 0 && e.chillStacks > 0) v.body.setTint(e.chillStacks > 1 ? 0x8fdcff : 0xb5ecff);
      else if (e.burnTime > 0) v.body.setTint(0xffb48a);
      else v.body.clearTint();
    }
    v.ice.setVisible(e.frozenTime > 0);
    v.roots.setVisible(e.rootTime > 0);
    v.fragile.setVisible(e.fragileTime > 0);
    const damaged = e.hp < e.maxHp;
    v.hpBg.setVisible(damaged);
    v.hpFill.setVisible(damaged);
    if (damaged) {
      const pct = Math.max(0, e.hp / e.maxHp);
      v.hpFill.width = HP_W * pct;
      v.hpFill.fillColor = pct > 0.5 ? 0x6ee66e : pct > 0.25 ? 0xffd34d : 0xff4d5e;
    }
    if (e.burnTime > 0 && this.onBurning) {
      v.fireTimer -= dtMs;
      if (v.fireTimer <= 0) {
        v.fireTimer = 120;
        this.onBurning(v.root.x + (Math.random() - 0.5) * 20, v.root.y + v.bodyY);
      }
    }
    // Rooted/frozen enemies stop breathing for clear feedback.
    if (v.breath) v.breath.timeScale = e.frozenTime > 0 || e.rootTime > 0 ? 0 : 1;
  }

  private despawn(v: EnemyView): void {
    v.breath?.stop();
    v.breath = undefined;
    const done = () => {
      v.root.setVisible(false);
      this.pool.push(v);
    };
    if (v.dying === 'leak') {
      this.scene.tweens.add({ targets: v.root, alpha: 0, scale: 0.3, y: v.root.y + 20, duration: 250, onComplete: done });
    } else {
      v.hpBg.setVisible(false);
      v.hpFill.setVisible(false);
      v.body.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
      this.scene.tweens.add({
        targets: v.root,
        scaleX: 1.35,
        scaleY: 0.6,
        alpha: 0,
        duration: 200,
        ease: 'Quad.easeOut',
        onComplete: done,
      });
    }
  }
}
