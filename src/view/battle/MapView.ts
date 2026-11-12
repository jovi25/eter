import * as Phaser from 'phaser';
import { economyOn } from '../perf';
import { addBlend } from '../quality';
import { ensureBaked, stamp } from '../ui/bake';
import { GAME_HEIGHT, GAME_WIDTH } from '../../data/config';
import type { Vec2 } from '../../data/maps';
import { Rng } from '../../sim/rng';
import type { Simulation } from '../../sim/simulation';
import { radial, type Ctx } from '../art/paint';
import { DEPTH, unitDepth } from './layers';
import { RUNE_RULES, RUNES, type RuneKind } from '../../data/runes';

/** Static scenery: painted grass + dirt roads background, decorations, portals, crystal and build slots. */
/** Show a built rune: crystal on the stone + a soft circle of its reach. */
export function showRune(map: MapView, scene: Phaser.Scene, index: number, x: number, y: number, kind: RuneKind | null): void {
  const img = map.runeImages[index];
  const aura = map.runeAuras[index];
  if (!img || !aura) return;
  scene.tweens.killTweensOf(img);
  img.setTexture(kind ? `rune_${kind}` : 'rune_stone').setY(y - 14);
  aura.setVisible(!!kind);
  if (!kind) return;
  const color = RUNES[kind].color;
  const R = RUNE_RULES.radius;
  ensureBaked(scene, `runeaura_${kind}`, { x0: -R - 3, y0: -R - 3, w: 2 * R + 6, h: 2 * R + 6 }, (g) => {
    g.fillStyle(color, 0.07);
    g.fillCircle(0, 0, R);
    g.lineStyle(3, color, 0.35);
    g.strokeCircle(0, 0, R);
  });
  aura.setTexture(`runeaura_${kind}`).setPosition(x, y);
  scene.tweens.add({ targets: img, y: y - 20, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
}

export class MapView {
  readonly crystal: Phaser.GameObjects.Image;
  readonly portals: Phaser.GameObjects.Image[] = [];
  readonly slotImages: Phaser.GameObjects.Image[] = [];
  readonly runeImages: Phaser.GameObjects.Image[] = [];
  readonly runeAuras: Phaser.GameObjects.Image[] = [];

  constructor(scene: Phaser.Scene, sim: Simulation) {
    const paths = sim.paths.map((p) => p.points as Vec2[]);
    paintMapBackground(scene, paths, 'map_bg').setDepth(DEPTH.ground);
    placeDecor(scene, paths, [...sim.slots, ...sim.state.runes], 2024);

    // One portal per distinct road start.
    const starts = new Map<string, Vec2>();
    for (const p of paths) starts.set(`${p[0]!.x},${p[0]!.y}`, p[0]!);
    for (const start of starts.values()) {
      const portal = scene.add.image(start.x, start.y + 10, 'portal').setDepth(DEPTH.decor).setScale(0.85);
      scene.tweens.add({ targets: portal, angle: 360, duration: 5000, repeat: -1 });
      scene.tweens.add({ targets: portal, scale: 0.92, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.portals.push(portal);
    }

    const end = paths[0]!.at(-1)!;
    const glowImg = scene.add.image(end.x, end.y - 10, 'spark').setDepth(DEPTH.decor).setScale(7).setTint(0xa77bff).setAlpha(0.35);
    glowImg.setBlendMode(addBlend());
    scene.tweens.add({ targets: glowImg, alpha: 0.6, scale: 8, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.crystal = scene.add.image(end.x, end.y - 24, 'crystal').setDepth(unitDepth(end.y)).setScale(0.68);
    scene.tweens.add({ targets: this.crystal, y: end.y - 34, duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    sim.slots.forEach((s) => {
      this.slotImages.push(scene.add.image(s.x, s.y, 'slot').setDepth(DEPTH.slot));
    });
    // Rune stones: the aura (radius) is painted once and only shown while a rune stands there.
    sim.state.runes.forEach((r) => {
      const aura = scene.add.image(r.x, r.y, '__WHITE').setDepth(DEPTH.slot).setVisible(false);
      this.runeAuras.push(aura);
      this.runeImages.push(scene.add.image(r.x, r.y - 14, 'rune_stone').setDepth(unitDepth(r.y)).setScale(0.8));
    });
  }
}

let bgCanvas: HTMLCanvasElement | null = null;

/** Paint grass + every road into one canvas texture; returns the full-screen image. */
export function paintMapBackground(scene: Phaser.Scene, paths: Vec2[][], key: string): Phaser.GameObjects.Image {
  // Painted off-screen, then stamped into the shared UI atlas (so the background costs no extra draw call).
  bgCanvas ??= document.createElement('canvas');
  bgCanvas.width = GAME_WIDTH;
  bgCanvas.height = GAME_HEIGHT;
  const c = bgCanvas.getContext('2d')!;
  const rng = new Rng(77);

  // Grass: base gradient + soft blotches + blades.
  const base = c.createLinearGradient(0, 0, 0, GAME_HEIGHT);
  base.addColorStop(0, '#5fa64a');
  base.addColorStop(1, '#4b9140');
  c.fillStyle = base;
  c.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  for (let i = 0; i < 90; i++) {
    const x = rng.int(0, GAME_WIDTH);
    const y = rng.int(0, GAME_HEIGHT);
    const r = rng.int(40, 130);
    const light = rng.chance(0.5);
    c.fillStyle = radial(c, x, y, r, [
      [0, light ? 'rgba(140,205,95,0.35)' : 'rgba(40,100,45,0.3)'],
      [1, 'rgba(0,0,0,0)'],
    ]);
    c.fillRect(x - r, y - r, r * 2, r * 2);
  }
  for (let i = 0; i < 420; i++) {
    const x = rng.int(0, GAME_WIDTH);
    const y = rng.int(0, GAME_HEIGHT);
    const h = rng.int(5, 11);
    c.strokeStyle = rng.chance(0.5) ? 'rgba(45,110,50,0.75)' : 'rgba(150,215,100,0.6)';
    c.lineWidth = 2;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(x, y);
    c.quadraticCurveTo(x - 1, y - h * 0.6, x - 3, y - h);
    c.moveTo(x + 3, y);
    c.quadraticCurveTo(x + 4, y - h * 0.5, x + 6, y - h * 0.9);
    c.stroke();
  }

  // Roads: each layer is drawn for all roads before the next, so junctions merge cleanly.
  const layer = (width: number, style: string, dy = 0) => {
    c.strokeStyle = style;
    c.lineWidth = width;
    c.lineJoin = 'round';
    c.lineCap = 'round';
    for (const pts of paths) {
      c.beginPath();
      c.moveTo(pts[0]!.x, pts[0]!.y + dy);
      for (const p of pts.slice(1)) c.lineTo(p.x, p.y + dy);
      c.stroke();
    }
  };
  layer(92, 'rgba(20,50,20,0.35)', 6);
  layer(86, '#7d5c33');
  layer(74, '#c9a46a');
  layer(44, 'rgba(232,200,140,0.55)');
  layer(16, 'rgba(250,225,170,0.35)');
  for (const pts of paths) pebbles(c, pts, rng);

  // Vignette.
  c.fillStyle = radial(c, GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_HEIGHT * 0.75, [
    [0.55, 'rgba(0,0,0,0)'],
    [1, 'rgba(10,20,10,0.45)'],
  ]);
  c.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  if (stamp(scene, 'scene_bg', bgCanvas, GAME_WIDTH, GAME_HEIGHT, true)) return scene.add.image(0, 0, 'scene_bg').setOrigin(0);
  // No room in the atlas: a texture of its own.
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const tex = scene.textures.createCanvas(key, GAME_WIDTH, GAME_HEIGHT)!;
  tex.getContext().drawImage(bgCanvas, 0, 0);
  tex.refresh();
  return scene.add.image(0, 0, key).setOrigin(0);
}

function pebbles(c: Ctx, pts: readonly Vec2[], rng: Rng): void {
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]!;
    const b = pts[i]!;
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    for (let d = 0; d < len; d += 22) {
      const t = d / len;
      const x = a.x + (b.x - a.x) * t + rng.int(-26, 26);
      const y = a.y + (b.y - a.y) * t + rng.int(-26, 26);
      const r = rng.int(2, 5);
      c.fillStyle = 'rgba(120,85,45,0.55)';
      c.beginPath();
      c.ellipse(x, y + 1, r, r * 0.75, 0, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = 'rgba(240,215,170,0.6)';
      c.beginPath();
      c.ellipse(x - 0.5, y - 0.5, r * 0.6, r * 0.45, 0, 0, Math.PI * 2);
      c.fill();
    }
  }
}

/** Trees, rocks and flowers on free grass (away from roads and the given spots). */
export function placeDecor(scene: Phaser.Scene, paths: Vec2[][], keepClear: readonly Vec2[], seed: number, max = 30): void {
  const rng = new Rng(seed);
  const clearOf = (x: number, y: number, r: number) => {
    for (const s of keepClear) if (Math.hypot(s.x - x, s.y - y) < 72 + r) return false;
    for (const pts of paths) {
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1]!;
        const b = pts[i]!;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / (dx * dx + dy * dy)));
        if (Math.hypot(a.x + dx * t - x, a.y + dy * t - y) < 50 + r) return false;
      }
    }
    return y > 120 && y < 1170;
  };
  let placed = 0;
  for (let tries = 0; tries < 600 && placed < max; tries++) {
    const x = rng.int(20, GAME_WIDTH - 20);
    const y = rng.int(130, 1160);
    const kind = rng.next();
    const r = kind < 0.42 ? 34 : kind < 0.65 ? 20 : 8;
    if (!clearOf(x, y, r)) continue;
    const k = kind < 0.42 ? 'tree' : kind < 0.65 ? 'rock' : 'flower';
    const img = scene.add.image(x, y, k).setDepth(k === 'flower' ? DEPTH.decor : unitDepth(y + 30));
    if (k === 'tree') {
      img.setScale(0.78 + rng.next() * 0.35);
      if (!economyOn()) scene.tweens.add({ targets: img, scaleX: img.scaleX * 1.03, duration: 1800 + rng.int(0, 900), yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    placed++;
  }
}
