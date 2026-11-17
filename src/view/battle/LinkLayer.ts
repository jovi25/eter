import * as Phaser from 'phaser';
import { ELEMENTS } from '../../data/elements';
import { TOWERS } from '../../data/towers';
import type { Simulation } from '../../sim/simulation';
import type { TowerState } from '../../sim/types';
import { DEPTH } from './layers';

interface LinkView {
  glow: Phaser.GameObjects.Image;
  core: Phaser.GameObjects.Image;
  bead: Phaser.GameObjects.Image;
}

/**
 * Vínculos de Éter on screen: a thread of light between neighbouring towers of different kinds,
 * with a bead that travels along it. The thread flashes when a tower borrows its neighbour's element.
 * Also draws the preview threads while the build menu is open on an empty slot.
 */
export class LinkLayer {
  private views = new Map<string, LinkView>();
  private preview: Phaser.GameObjects.Image[] = [];
  private signature = '';

  constructor(private scene: Phaser.Scene) {}

  private color(t: TowerState): number {
    return ELEMENTS[TOWERS[t.type].element].color;
  }

  private line(ax: number, ay: number, bx: number, by: number, thick: number, tint: number, alpha: number): Phaser.GameObjects.Image {
    return this.scene.add
      .image((ax + bx) / 2, (ay + by) / 2, 'px')
      .setDisplaySize(Math.hypot(bx - ax, by - ay), thick)
      .setRotation(Math.atan2(by - ay, bx - ax))
      .setTint(tint)
      .setAlpha(alpha)
      .setDepth(DEPTH.range);
  }

  /** Rebuild the threads only when the towers changed (built, sold, fused). */
  update(sim: Simulation): void {
    const towers = sim.state.towers;
    let sig = '';
    for (const t of towers) sig += `${t.id}${t.type[0]},`;
    if (sig === this.signature) return;
    this.signature = sig;
    const pairs = sim.linkPairs();
    const keep = new Set<string>();
    for (const [a, b] of pairs) {
      const key = `${a.id}-${b.id}`;
      keep.add(key);
      if (this.views.has(key)) continue;
      const ca = Phaser.Display.Color.ValueToColor(this.color(a));
      const cb = Phaser.Display.Color.ValueToColor(this.color(b));
      const mix = Phaser.Display.Color.GetColor((ca.red + cb.red) >> 1, (ca.green + cb.green) >> 1, (ca.blue + cb.blue) >> 1);
      const glow = this.line(a.x, a.y, b.x, b.y, 18, mix, 0);
      const core = this.line(a.x, a.y, b.x, b.y, 6, 0xffffff, 0);
      const bead = this.scene.add.image(a.x, a.y, 'spark').setTint(mix).setScale(1.5).setAlpha(1).setDepth(DEPTH.range);
      this.scene.tweens.add({ targets: glow, alpha: 0.55, duration: 350 });
      this.scene.tweens.add({ targets: core, alpha: 0.9, duration: 350 });
      this.scene.tweens.add({ targets: bead, x: b.x, y: b.y, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.views.set(key, { glow, core, bead });
    }
    for (const [key, v] of this.views) {
      if (keep.has(key)) continue;
      this.scene.tweens.killTweensOf([v.glow, v.core, v.bead]);
      v.glow.destroy();
      v.core.destroy();
      v.bead.destroy();
      this.views.delete(key);
    }
  }

  /** A tower just borrowed its neighbour's element: the thread between them lights up. */
  flash(aId: number, bId: number): void {
    const v = this.views.get(`${Math.min(aId, bId)}-${Math.max(aId, bId)}`);
    if (!v) return;
    this.scene.tweens.killTweensOf(v.glow);
    v.glow.setAlpha(1).setScale(v.glow.scaleX, v.glow.scaleY);
    this.scene.tweens.add({ targets: v.glow, alpha: 0.55, duration: 320 });
  }

  /** Threads a tower built on this slot would get (null = hide). */
  showPreview(sim: Simulation, slot: number | null): void {
    for (const p of this.preview) {
      this.scene.tweens.killTweensOf(p);
      p.destroy();
    }
    this.preview = [];
    if (slot === null) return;
    const at = sim.slots[slot]!;
    for (const t of sim.linkPreview(slot)) {
      const p = this.line(at.x, at.y, t.x, t.y, 6, this.color(t), 0.75);
      this.scene.tweens.add({ targets: p, alpha: 0.25, duration: 450, yoyo: true, repeat: -1 });
      this.preview.push(p);
    }
  }
}
