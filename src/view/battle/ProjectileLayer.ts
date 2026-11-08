import * as Phaser from 'phaser';
import type { Simulation } from '../../sim/simulation';
import { DEPTH } from './layers';

interface ProjView {
  img: Phaser.GameObjects.Image;
  prevX: number;
  prevY: number;
  seen: boolean;
}

/** Pooled projectile sprites, interpolated between sim ticks and rotated along their flight. */
export class ProjectileLayer {
  private views = new Map<number, ProjView>();
  private pool: Phaser.GameObjects.Image[] = [];

  constructor(private scene: Phaser.Scene) {}

  snapshot(sim: Simulation): void {
    for (const p of sim.state.projectiles) {
      const v = this.views.get(p.id);
      if (v) {
        v.prevX = p.x;
        v.prevY = p.y;
      }
    }
  }

  sync(sim: Simulation, alpha: number): void {
    for (const v of this.views.values()) v.seen = false;
    for (const p of sim.state.projectiles) {
      let v = this.views.get(p.id);
      if (!v) {
        const img = (this.pool.pop() ?? this.scene.add.image(0, 0, 'px')).setVisible(true).setDepth(DEPTH.projectiles);
        img.setTexture(`proj_${p.element}`).setScale(p.element === 'fire' ? 1.1 : 1);
        v = { img, prevX: p.x, prevY: p.y, seen: true };
        this.views.set(p.id, v);
      }
      v.seen = true;
      const x = v.prevX + (p.x - v.prevX) * alpha;
      const y = v.prevY + (p.y - v.prevY) * alpha;
      v.img.setPosition(x, y);
      if (p.element !== 'fire') v.img.setRotation(Math.atan2(p.ty - p.y, p.tx - p.x));
      else v.img.rotation += 0.3;
    }
    for (const [id, v] of this.views) {
      if (v.seen) continue;
      this.views.delete(id);
      v.img.setVisible(false);
      this.pool.push(v.img);
    }
  }
}
