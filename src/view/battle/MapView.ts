import * as Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../../data/config';
import type { Vec2 } from '../../data/maps';
import { Rng } from '../../sim/rng';
import type { Simulation } from '../../sim/simulation';
import { PIXEL_SCALE, TOWN } from '../art/sprites';
import { DEPTH, unitDepth } from './layers';

const T = 16; // source tile size
const TS = T * PIXEL_SCALE; // 48 px on screen

function distToSegment(px: number, py: number, a: Vec2, b: Vec2): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const t = Math.max(0, Math.min(1, ((px - a.x) * dx + (py - a.y) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(a.x + dx * t - px, a.y + dy * t - py);
}

/**
 * Static scenery in pixel art: a 16 px tile map (Kenney Tiny Town, CC0) painted on a small canvas and
 * shown ×3 with nearest filtering; dirt road auto-tiled from the map paths; decor; portal, crystal, slots.
 */
export class MapView {
  readonly crystal: Phaser.GameObjects.Image;
  readonly portals: Phaser.GameObjects.Image[] = [];
  readonly slotImages: Phaser.GameObjects.Image[] = [];

  constructor(scene: Phaser.Scene, sim: Simulation) {
    paintTileBackground(scene, sim.paths.map((p) => p.points as Vec2[]), sim.slots, 'map_tiles').setDepth(DEPTH.ground);

    const starts = new Map<string, Vec2>();
    for (const p of sim.paths) starts.set(`${p.points[0]!.x},${p.points[0]!.y}`, p.points[0]!);
    for (const start of starts.values()) {
      const portal = scene.add.image(start.x, start.y + 10, 'portal').setDepth(DEPTH.decor).setScale(0.8);
      scene.tweens.add({ targets: portal, angle: 360, duration: 5000, repeat: -1 });
      scene.tweens.add({ targets: portal, scale: 0.88, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.portals.push(portal);
    }

    const end = sim.paths[0]!.points.at(-1)!;
    const glowImg = scene.add.image(end.x, end.y - 10, 'spark').setDepth(DEPTH.decor).setScale(7).setTint(0xa77bff).setAlpha(0.35);
    glowImg.setBlendMode(Phaser.BlendModes.ADD);
    scene.tweens.add({ targets: glowImg, alpha: 0.6, scale: 8, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.crystal = scene.add.image(end.x, end.y - 24, 'crystal').setDepth(unitDepth(end.y)).setScale(0.62);
    scene.tweens.add({ targets: this.crystal, y: end.y - 34, duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    sim.slots.forEach((s) => {
      const img = scene.add.image(s.x, s.y + 6, 'pslot').setDepth(DEPTH.slot).setScale(PIXEL_SCALE);
      this.slotImages.push(img);
    });
  }
}

/** Paint a grass + dirt-road tile map for the given roads; returns the ×3 image (origin top-left). */
export function paintTileBackground(scene: Phaser.Scene, paths: Vec2[][], slots: readonly Vec2[], key: string): Phaser.GameObjects.Image {
  const cols = Math.ceil(GAME_WIDTH / TS);
  const rows = Math.ceil(GAME_HEIGHT / TS);
  // Road mask: a tile is dirt if its center is within ~1 tile of any path segment (roads are 2 tiles wide).
  const dirt: boolean[][] = [];
  for (let r = 0; r < rows; r++) {
    dirt.push([]);
    for (let c = 0; c < cols; c++) {
      const cx = c * TS + TS / 2;
      const cy = r * TS + TS / 2;
      let near = false;
      for (const p of paths) {
        for (let i = 1; i < p.length && !near; i++) if (distToSegment(cx, cy, p[i - 1]!, p[i]!) <= 34) near = true;
        if (near) break;
      }
      dirt[r]!.push(near);
    }
  }
  const isDirt = (c: number, r: number) => (r < 0 || r >= rows || c < 0 || c >= cols ? false : dirt[r]![c]!);

  if (scene.textures.exists(key)) scene.textures.remove(key);
  const tex = scene.textures.createCanvas(key, cols * T, rows * T)!;
  const ctx = tex.getContext();
  ctx.imageSmoothingEnabled = false;
  const src = scene.textures.get('town').getSourceImage() as HTMLImageElement;
  const draw = (frame: number, c: number, r: number) => ctx.drawImage(src, (frame % 12) * T, Math.floor(frame / 12) * T, T, T, c * T, r * T, T, T);
  const rng = new Rng(4242);
  const D = TOWN.dirt;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      draw(TOWN.grass[rng.int(0, TOWN.grass.length - 1)]!, c, r);
      if (!isDirt(c, r)) continue;
      const n = isDirt(c, r - 1);
      const s = isDirt(c, r + 1);
      const w = isDirt(c - 1, r);
      const e = isDirt(c + 1, r);
      let f = D.c;
      if (!n && !w) f = D.tl;
      else if (!n && !e) f = D.tr;
      else if (!s && !w) f = D.bl;
      else if (!s && !e) f = D.br;
      else if (!n) f = D.t;
      else if (!s) f = D.b;
      else if (!w) f = D.l;
      else if (!e) f = D.r;
      else if (!isDirt(c - 1, r - 1)) f = D.itl;
      else if (!isDirt(c + 1, r - 1)) f = D.itr;
      else if (!isDirt(c + 1, r + 1)) f = D.ibr;
      else if (!isDirt(c - 1, r + 1)) f = D.ibl;
      draw(f, c, r);
    }
  }

  // Decor on free grass: away from roads, slots and the HUD bands.
  const blocked = (c: number, r: number) => {
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) if (isDirt(c + dc, r + dr)) return true;
    const cx = c * TS + TS / 2;
    const cy = r * TS + TS / 2;
    for (const sl of slots) if (Math.abs(sl.x - cx) < 72 && Math.abs(sl.y - cy) < 60) return true;
    return r < 2 || r >= rows - 3;
  };
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (blocked(c, r) || !rng.chance(0.18)) continue;
      draw(TOWN.decor[rng.int(0, TOWN.decor.length - 1)]!, c, r);
    }
  }
  tex.refresh();
  tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
  return scene.add.image(0, 0, key).setOrigin(0).setScale(PIXEL_SCALE);
}
