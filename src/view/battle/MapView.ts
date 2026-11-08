import * as Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../../data/config';
import type { Vec2 } from '../../data/maps';
import { Rng } from '../../sim/rng';
import type { Simulation } from '../../sim/simulation';
import { PAL } from '../art/palette';
import { DEPTH, unitDepth } from './layers';

/** Static scenery: grass, dirt path, decorations, portal, crystal and build slots. */
export class MapView {
  readonly crystal: Phaser.GameObjects.Image;
  readonly portal: Phaser.GameObjects.Image;
  readonly slotImages: Phaser.GameObjects.Image[] = [];

  constructor(private scene: Phaser.Scene, sim: Simulation) {
    const pts = sim.path.points;
    this.drawGround();
    this.drawPath(pts);
    this.drawDecor(pts, sim.slots);

    const start = pts[0]!;
    const end = pts[pts.length - 1]!;
    this.portal = scene.add.image(start.x, start.y + 10, 'portal').setDepth(DEPTH.decor).setScale(0.9);
    scene.tweens.add({ targets: this.portal, angle: 360, duration: 4000, repeat: -1 });

    const glow = scene.add.image(end.x, end.y - 10, 'spark').setDepth(DEPTH.decor).setScale(7).setTint(0xa77bff).setAlpha(0.35);
    glow.setBlendMode(Phaser.BlendModes.ADD);
    scene.tweens.add({ targets: glow, alpha: 0.6, scale: 8, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.crystal = scene.add.image(end.x, end.y - 20, 'crystal').setDepth(unitDepth(end.y)).setScale(0.75);
    scene.tweens.add({ targets: this.crystal, y: end.y - 30, duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    sim.slots.forEach((s) => {
      const img = scene.add.image(s.x, s.y, 'slot').setDepth(DEPTH.slot);
      this.slotImages.push(img);
    });
  }

  private drawGround(): void {
    const g = this.scene.add.graphics().setDepth(DEPTH.ground);
    g.fillStyle(PAL.grass, 1);
    g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    const rng = new Rng(77);
    for (let i = 0; i < 70; i++) {
      g.fillStyle(rng.chance(0.5) ? PAL.grassLight : PAL.grassDark, 0.35);
      g.fillEllipse(rng.int(0, GAME_WIDTH), rng.int(0, GAME_HEIGHT), rng.int(60, 180), rng.int(30, 90));
    }
    for (let i = 0; i < 160; i++) {
      const x = rng.int(0, GAME_WIDTH);
      const y = rng.int(0, GAME_HEIGHT);
      g.lineStyle(3, PAL.grassDark, 0.6);
      g.lineBetween(x, y, x - 3, y - 8);
      g.lineBetween(x, y, x + 3, y - 8);
    }
  }

  private drawPath(pts: readonly Vec2[]): void {
    const g = this.scene.add.graphics().setDepth(DEPTH.path);
    const stroke = (width: number, color: number) => {
      g.lineStyle(width, color, 1);
      g.beginPath();
      g.moveTo(pts[0]!.x, pts[0]!.y);
      for (const p of pts.slice(1)) g.lineTo(p.x, p.y);
      g.strokePath();
      g.fillStyle(color, 1);
      for (const p of pts) g.fillCircle(p.x, p.y, width / 2);
    };
    stroke(82, PAL.dirtDark);
    stroke(68, PAL.dirt);
    // pebbles
    const rng = new Rng(9);
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1]!;
      const b = pts[i]!;
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      for (let d = 0; d < len; d += 34) {
        const t = d / len;
        g.fillStyle(PAL.dirtDark, 0.5);
        g.fillCircle(a.x + (b.x - a.x) * t + rng.int(-22, 22), a.y + (b.y - a.y) * t + rng.int(-22, 22), rng.int(2, 5));
      }
    }
  }

  private drawDecor(pts: readonly Vec2[], slots: readonly Vec2[]): void {
    const rng = new Rng(2024);
    const clearOf = (x: number, y: number, r: number) => {
      for (const s of slots) if (Math.hypot(s.x - x, s.y - y) < 70 + r) return false;
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1]!;
        const b = pts[i]!;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / (dx * dx + dy * dy)));
        if (Math.hypot(a.x + dx * t - x, a.y + dy * t - y) < 48 + r) return false;
      }
      return y > 120 && y < 1170;
    };
    let placed = 0;
    for (let tries = 0; tries < 400 && placed < 26; tries++) {
      const x = rng.int(20, GAME_WIDTH - 20);
      const y = rng.int(130, 1160);
      const kind = rng.next();
      const r = kind < 0.45 ? 34 : kind < 0.7 ? 20 : 8;
      if (!clearOf(x, y, r)) continue;
      const key = kind < 0.45 ? 'tree' : kind < 0.7 ? 'rock' : 'flower';
      const img = this.scene.add.image(x, y, key).setDepth(key === 'flower' ? DEPTH.decor : unitDepth(y + 30));
      if (key === 'tree') img.setScale(0.8 + rng.next() * 0.4);
      placed++;
    }
  }
}
