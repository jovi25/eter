import * as Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../../data/config';
import type { Vec2 } from '../../data/maps';
import { Rng } from '../../sim/rng';
import { BG_KEY, stamp } from '../ui/bake';
import { radial, type Ctx } from './paint';

/**
 * Mapa de Éter: one painted world (meadow at the bottom, amber plains, snowy peaks, the unknown at the top)
 * crossed by a dashed trail. Every stop on the trail is a region (a sub-map of 5 stages);
 * the side paths lead to the game modes.
 */

/** The main trail, bottom to top. Regions stand on the points listed in REGION_AT. */
export const WORLD_TRAIL: Vec2[] = [
  { x: 360, y: 1140 },
  { x: 300, y: 1062 },
  { x: 210, y: 985 },
  { x: 345, y: 885 },
  { x: 505, y: 770 },
  { x: 385, y: 655 },
  { x: 215, y: 545 },
  { x: 330, y: 425 },
  { x: 490, y: 330 },
  { x: 250, y: 222 },
];
/** Index in WORLD_TRAIL of each region stop (the last one is the region still to come). */
export const REGION_AT = [2, 4, 6, 8, 9];

export type ModeSpot = 'rift' | 'daily' | 'expedition' | 'hunt' | 'mutant';
/** Game modes: where they stand and which trail point their side path leaves from. */
export const MODE_SPOTS: Record<ModeSpot, { x: number; y: number; from: number }> = {
  rift: { x: 585, y: 985, from: 0 },
  daily: { x: 125, y: 760, from: 3 },
  expedition: { x: 590, y: 545, from: 5 },
  hunt: { x: 88, y: 398, from: 7 },
  mutant: { x: 632, y: 180, from: 8 },
};

let canvas: HTMLCanvasElement | null = null;

/** Smooth curve through the points (Catmull-Rom as béziers), from point `a` to point `b`. */
function trace(c: Ctx, pts: readonly Vec2[], a: number, b: number): void {
  c.beginPath();
  c.moveTo(pts[a]!.x, pts[a]!.y);
  for (let i = a; i < b; i++) {
    const p0 = pts[Math.max(0, i - 1)]!;
    const p1 = pts[i]!;
    const p2 = pts[i + 1]!;
    const p3 = pts[Math.min(pts.length - 1, i + 2)]!;
    c.bezierCurveTo(p1.x + (p2.x - p0.x) / 6, p1.y + (p2.y - p0.y) / 6, p2.x - (p3.x - p1.x) / 6, p2.y - (p3.y - p1.y) / 6, p2.x, p2.y);
  }
}

function dashed(c: Ctx, draw: () => void, bright: boolean, small = false): void {
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.setLineDash(small ? [4, 16] : [22, 18]);
  draw();
  c.strokeStyle = bright ? 'rgba(45,25,10,0.6)' : 'rgba(20,15,30,0.3)';
  c.lineWidth = small ? 11 : 15;
  c.stroke();
  draw();
  c.strokeStyle = bright ? '#fff1c9' : 'rgba(255,255,255,0.4)';
  c.lineWidth = small ? 6 : 9;
  c.stroke();
  c.setLineDash([]);
}

function mountain(c: Ctx, x: number, y: number, w: number, h: number): void {
  c.fillStyle = 'rgba(20,30,60,0.25)';
  c.beginPath();
  c.ellipse(x, y + 4, w * 0.6, 10, 0, 0, Math.PI * 2);
  c.fill();
  const body = c.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
  body.addColorStop(0, '#8fa3bd');
  body.addColorStop(0.55, '#6f829e');
  body.addColorStop(1, '#4c5c78');
  c.fillStyle = body;
  c.strokeStyle = '#2a3350';
  c.lineWidth = 4;
  c.lineJoin = 'round';
  c.beginPath();
  c.moveTo(x - w / 2, y);
  c.lineTo(x - w * 0.08, y - h);
  c.lineTo(x + w * 0.06, y - h * 0.94);
  c.lineTo(x + w / 2, y);
  c.closePath();
  c.fill();
  c.stroke();
  // Snow cap.
  c.fillStyle = '#ffffff';
  c.beginPath();
  c.moveTo(x - w * 0.08, y - h);
  c.lineTo(x + w * 0.06, y - h * 0.94);
  c.lineTo(x + w * 0.2, y - h * 0.62);
  c.lineTo(x + w * 0.08, y - h * 0.7);
  c.lineTo(x - w * 0.02, y - h * 0.58);
  c.lineTo(x - w * 0.12, y - h * 0.7);
  c.lineTo(x - w * 0.22, y - h * 0.6);
  c.closePath();
  c.fill();
}

function mesa(c: Ctx, x: number, y: number, w: number, h: number): void {
  c.fillStyle = 'rgba(70,35,10,0.25)';
  c.beginPath();
  c.ellipse(x, y + 4, w * 0.62, 9, 0, 0, Math.PI * 2);
  c.fill();
  const body = c.createLinearGradient(0, y - h, 0, y);
  body.addColorStop(0, '#d9824a');
  body.addColorStop(1, '#9a4f2c');
  c.fillStyle = body;
  c.strokeStyle = '#5a2a14';
  c.lineWidth = 4;
  c.lineJoin = 'round';
  c.beginPath();
  c.moveTo(x - w / 2, y);
  c.lineTo(x - w * 0.36, y - h);
  c.lineTo(x + w * 0.34, y - h);
  c.lineTo(x + w / 2, y);
  c.closePath();
  c.fill();
  c.stroke();
  c.strokeStyle = 'rgba(255,220,170,0.45)';
  c.lineWidth = 3;
  for (const t of [0.35, 0.65]) {
    c.beginPath();
    c.moveTo(x - w * (0.36 + 0.14 * t), y - h * (1 - t));
    c.lineTo(x + w * (0.34 + 0.16 * t), y - h * (1 - t));
    c.stroke();
  }
}

function crystal(c: Ctx, x: number, y: number, s: number): void {
  c.fillStyle = radial(c, x, y - s * 0.5, s * 1.6, [
    [0, 'rgba(190,140,255,0.45)'],
    [1, 'rgba(0,0,0,0)'],
  ]);
  c.fillRect(x - s * 2, y - s * 2.5, s * 4, s * 4);
  c.fillStyle = '#b98bff';
  c.strokeStyle = '#1c1236';
  c.lineWidth = 3;
  c.lineJoin = 'round';
  c.beginPath();
  c.moveTo(x, y - s * 1.5);
  c.lineTo(x + s * 0.45, y - s * 0.4);
  c.lineTo(x, y);
  c.lineTo(x - s * 0.45, y - s * 0.4);
  c.closePath();
  c.fill();
  c.stroke();
  c.fillStyle = 'rgba(255,255,255,0.55)';
  c.beginPath();
  c.moveTo(x, y - s * 1.5);
  c.lineTo(x, y);
  c.lineTo(x - s * 0.45, y - s * 0.4);
  c.closePath();
  c.fill();
}

/** Ilhas do Vazio: a floating island (violet moss on top, rock hanging below). */
function island(c: Ctx, x: number, y: number, w: number): void {
  c.fillStyle = radial(c, x, y + w * 0.5, w * 1.1, [
    [0, 'rgba(180,120,255,0.25)'],
    [1, 'rgba(0,0,0,0)'],
  ]);
  c.fillRect(x - w * 1.2, y - w * 0.6, w * 2.4, w * 2.2);
  const rock = c.createLinearGradient(0, y, 0, y + w * 0.9);
  rock.addColorStop(0, '#5a4a7a');
  rock.addColorStop(1, '#241a3a');
  c.fillStyle = rock;
  c.strokeStyle = '#140c24';
  c.lineWidth = 4;
  c.lineJoin = 'round';
  c.beginPath();
  c.moveTo(x - w / 2, y);
  c.lineTo(x - w * 0.3, y + w * 0.35);
  c.lineTo(x - w * 0.08, y + w * 0.9);
  c.lineTo(x + w * 0.12, y + w * 0.45);
  c.lineTo(x + w * 0.32, y + w * 0.55);
  c.lineTo(x + w / 2, y);
  c.closePath();
  c.fill();
  c.stroke();
  c.fillStyle = '#7d5ec4';
  c.beginPath();
  c.ellipse(x, y, w / 2 + 2, w * 0.16, 0, 0, Math.PI * 2);
  c.fill();
  c.stroke();
  c.fillStyle = 'rgba(230,210,255,0.35)';
  c.beginPath();
  c.ellipse(x - w * 0.1, y - w * 0.04, w * 0.28, w * 0.06, 0, 0, Math.PI * 2);
  c.fill();
}

function compass(c: Ctx, x: number, y: number, r: number): void {
  c.fillStyle = 'rgba(30,18,8,0.55)';
  c.beginPath();
  c.arc(x, y, r + 5, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#f3e2b8';
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  c.fill();
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 - Math.PI / 2;
    c.fillStyle = i === 0 ? '#d94a3a' : '#5a3a1a';
    c.beginPath();
    c.moveTo(x + Math.cos(a) * r * 0.86, y + Math.sin(a) * r * 0.86);
    c.lineTo(x + Math.cos(a + 1.35) * r * 0.2, y + Math.sin(a + 1.35) * r * 0.2);
    c.lineTo(x + Math.cos(a - 1.35) * r * 0.2, y + Math.sin(a - 1.35) * r * 0.2);
    c.closePath();
    c.fill();
  }
}

/**
 * Paints the world. `reached` = how many regions are open: the trail is bright up to the last open
 * region and faded beyond it. `modesOpen` brightens the side paths to the game modes.
 */
/** The world drawn in code: four lands, a river and landmarks. */
function paintGround(c: Ctx, rng: Rng, W: number, H: number): void {
  const g = c.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#1d1438');
  g.addColorStop(0.17, '#43356f');
  g.addColorStop(0.25, '#b9c8e2');
  g.addColorStop(0.31, '#e6eef7');
  g.addColorStop(0.44, '#d5e2ef');
  g.addColorStop(0.5, '#d2b87c');
  g.addColorStop(0.56, '#c79a4a');
  g.addColorStop(0.655, '#b88a3c');
  g.addColorStop(0.7, '#8faa4c');
  g.addColorStop(0.75, '#5fa64a');
  g.addColorStop(1, '#468a3c');
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
  for (let i = 0; i < 110; i++) {
    const x = rng.int(0, W);
    const y = rng.int(0, H);
    const r = rng.int(40, 120);
    c.fillStyle = radial(c, x, y, r, [
      [0, rng.chance(0.5) ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,30,0.09)'],
      [1, 'rgba(0,0,0,0)'],
    ]);
    c.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // Grass tufts (meadow), dry strokes (amber), snow sparkles, stars (unknown land).
  for (let i = 0; i < 420; i++) {
    const x = rng.int(0, W);
    const y = rng.int(130, H - 120);
    const t = y / H;
    if (t > 0.7) {
      c.strokeStyle = rng.chance(0.5) ? 'rgba(40,105,45,0.7)' : 'rgba(160,220,105,0.6)';
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x - 3, y - 8);
      c.moveTo(x + 3, y);
      c.lineTo(x + 6, y - 7);
      c.stroke();
    } else if (t > 0.5) {
      c.strokeStyle = 'rgba(110,65,25,0.4)';
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x + 10, y - 1);
      c.stroke();
    } else if (t > 0.26) {
      c.fillStyle = 'rgba(255,255,255,0.85)';
      c.fillRect(x, y, 3, 3);
    } else {
      c.fillStyle = rng.chance(0.3) ? 'rgba(200,160,255,0.9)' : 'rgba(255,255,255,0.7)';
      c.fillRect(x, y, 2, 2);
    }
  }

  // River between the meadow and the amber plains.
  const river = (width: number, style: string) => {
    c.strokeStyle = style;
    c.lineWidth = width;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(-20, 930);
    c.bezierCurveTo(140, 870, 230, 960, 380, 905);
    c.bezierCurveTo(520, 850, 600, 905, 740, 850);
    c.stroke();
  };
  river(46, 'rgba(20,50,90,0.45)');
  river(38, '#3f8fd0');
  river(24, '#6fc0ee');
  c.setLineDash([14, 30]);
  river(4, 'rgba(255,255,255,0.7)');
  c.setLineDash([]);

  // Landmarks, back to front.
  for (const [x, y, w, h] of [[70, 470, 150, 120], [660, 440, 160, 130], [130, 400, 120, 90], [600, 390, 110, 80], [40, 600, 110, 80], [690, 640, 120, 90]] as const) mountain(c, x, y, w, h);
  for (const [x, y, w, h] of [[650, 690, 130, 62], [300, 745, 100, 46], [660, 810, 90, 40]] as const) mesa(c, x, y, w, h);
  for (const [x, y, w] of [[650, 322, 100], [100, 258, 84], [395, 168, 80]] as const) island(c, x, y, w);
  for (const [x, y, s] of [[650, 312, 26], [100, 248, 22], [395, 158, 20], [160, 200, 16]] as const) crystal(c, x, y, s);
}

export function paintWorldMap(scene: Phaser.Scene, reached: number, modesOpen: boolean): Phaser.GameObjects.Image {
  const W = GAME_WIDTH;
  const H = GAME_HEIGHT;
  canvas ??= document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const c = canvas.getContext('2d')!;
  const rng = new Rng(4242);

  // Ground: the painted map when there is one (docs/ARTE_IA.md, P5), else four lands drawn in code.
  const painted = scene.textures.exists('map_world');
  if (painted) c.drawImage(scene.textures.get('map_world').getSourceImage() as CanvasImageSource, 0, 0, W, H);
  else paintGround(c, rng, W, H);

  // The trail: bright where the player can walk, faded beyond.
  const lastOpen = REGION_AT[Math.max(0, Math.min(reached, REGION_AT.length) - 1)]!;
  dashed(c, () => trace(c, WORLD_TRAIL, lastOpen, WORLD_TRAIL.length - 1), false);
  dashed(c, () => trace(c, WORLD_TRAIL, 0, lastOpen), true);
  for (const spot of Object.values(MODE_SPOTS)) {
    const from = WORLD_TRAIL[spot.from]!;
    dashed(
      c,
      () => {
        c.beginPath();
        c.moveTo(from.x, from.y);
        c.quadraticCurveTo((from.x + spot.x) / 2, Math.min(from.y, spot.y) - 30, spot.x, spot.y);
      },
      modesOpen,
      true,
    );
  }

  // Little bridge where the trail crosses the river.
  if (!painted) {
    c.save();
    c.translate(372, 905);
    c.rotate(-0.72);
    c.fillStyle = '#3a2412';
    c.fillRect(-36, -19, 72, 38);
    c.fillStyle = '#b07a44';
    for (let i = 0; i < 6; i++) c.fillRect(-33 + i * 11.2, -15, 9, 30);
    c.restore();
  }

  compass(c, 52, 166, 28);

  // Old-map edges.
  c.fillStyle = radial(c, W / 2, H / 2, H * 0.72, [
    [0.6, 'rgba(0,0,0,0)'],
    [1, 'rgba(15,8,30,0.55)'],
  ]);
  c.fillRect(0, 0, W, H);

  if (stamp(scene, BG_KEY, canvas, W, H, true)) return scene.add.image(0, 0, BG_KEY).setOrigin(0);
  if (scene.textures.exists('world_bg')) scene.textures.remove('world_bg');
  const tex = scene.textures.createCanvas('world_bg', W, H)!;
  tex.getContext().drawImage(canvas, 0, 0);
  tex.refresh();
  return scene.add.image(0, 0, 'world_bg').setOrigin(0);
}
