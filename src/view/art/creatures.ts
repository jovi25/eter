// Torres-criaturas (amostra, Fase 19): the Braseiro is a fire lizard that grows with each level and becomes
// one of two creatures when it evolves. Original designs, painted like the rest of the game.
// Only the Braseiro for now; the option lives in Opções ("Braseiro-criatura").
import { EVOLUTIONS, type EvolutionId } from '../../data/evolutions';
import fireMeta from './sprites/fire.json';
import iceMeta from './sprites/ice.json';
import natureMeta from './sprites/nature.json';
import stormMeta from './sprites/storm.json';
import windMeta from './sprites/wind.json';
import normalMeta from './sprites/normal.json';
import type { TowerId } from '../../data/towers';
import { getSettings } from '../settings';
import { blush, circle, ellipse, eyes, glow, gloss, INK, linear, poly, radial, shape, type Ctx } from './paint';

export interface CreatureForm {
  key: string;
  name: string;
  w: number;
  h: number;
  /** Paint with the feet on the line `fy` (= 0.6·h + 22, where the tower's pedestal is). */
  draw: (c: Ctx, cx: number, fy: number) => void;
}

const ORANGE = (c: Ctx, x0: number, y0: number, x1: number, y1: number) => linear(c, x0, y0, x1, y1, [[0, '#ffb35a'], [0.55, '#ff7a2e'], [1, '#c2401a']]);
const BELLY = '#ffe6b0';

function flameTip(c: Ctx, x: number, y: number, k: number, lean = 0): void {
  const f = (sc: number, stops: [number, string][], lw: number) =>
    shape(c, (p) => {
      p.moveTo(x - 12 * k * sc, y + 6 * k);
      p.bezierCurveTo(x - 16 * k * sc, y - 10 * k, x - 4 * k + lean, y - 14 * k, x + lean * 1.5, y - 30 * k * sc);
      p.bezierCurveTo(x + 6 * k + lean, y - 16 * k, x + 16 * k * sc, y - 8 * k, x + 12 * k * sc, y + 6 * k);
      p.closePath();
    }, linear(c, 0, y - 30 * k, 0, y + 6 * k, stops), INK, lw);
  glow(c, x, y - 8 * k, 22 * k, 0xff9a2e, 0.6);
  f(1, [[0, '#ffd06a'], [1, '#ff3a10']], 2.5);
  f(0.6, [[0, '#ffffff'], [1, '#ffc24a']], 0);
}

function tail(c: Ctx, pts: [number, number][], w0: number, w1: number): void {
  // A tapering tail along a quadratic curve.
  const [a, b, d] = pts as [[number, number], [number, number], [number, number]];
  const n = 14;
  const left: [number, number][] = [];
  const right: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = (1 - t) ** 2 * a[0] + 2 * (1 - t) * t * b[0] + t * t * d[0];
    const y = (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * b[1] + t * t * d[1];
    const dx = 2 * (1 - t) * (b[0] - a[0]) + 2 * t * (d[0] - b[0]);
    const dy = 2 * (1 - t) * (b[1] - a[1]) + 2 * t * (d[1] - b[1]);
    const len = Math.hypot(dx, dy) || 1;
    const w = (w0 + (w1 - w0) * t) / 2;
    left.push([x - (dy / len) * w, y + (dx / len) * w]);
    right.push([x + (dy / len) * w, y - (dx / len) * w]);
  }
  shape(c, poly([...left, ...right.reverse()]), ORANGE(c, a[0], a[1], d[0], d[1]), INK, 3);
}

function foot(c: Ctx, x: number, y: number, r: number): void {
  shape(c, ellipse(x, y, r * 1.2, r * 0.7), '#e0602a', INK, 2.5);
  for (const dx of [-0.6, 0, 0.6]) shape(c, circle(x + dx * r, y + r * 0.45, r * 0.25), '#fff3dc', INK, 1.5);
}

/** Level 1 — Faísca: a chubby baby lizard sitting with its tail flame up. */
function faisca(c: Ctx, cx: number, cy: number): void {
  const fy = cy; // cy = the feet line
  tail(c, [[cx - 14, fy - 16], [cx - 46, fy - 8], [cx - 38, fy - 40]], 16, 6);
  flameTip(c, cx - 38, fy - 42, 0.9, -2);
  shape(c, ellipse(cx - 2, fy - 20, 27, 22), ORANGE(c, cx - 30, fy - 40, cx + 26, fy), INK, 3);
  shape(c, ellipse(cx + 4, fy - 14, 15, 14), BELLY, INK, 0);
  foot(c, cx - 14, fy - 2, 8);
  foot(c, cx + 12, fy - 1, 8);
  // head
  shape(c, ellipse(cx + 8, fy - 52, 26, 23), ORANGE(c, cx - 18, fy - 76, cx + 34, fy - 30), INK, 3);
  for (const dx of [-8, 12]) shape(c, poly([[cx + dx - 4, fy - 72], [cx + dx + 1, fy - 84], [cx + dx + 5, fy - 72]]), '#ffd06a', INK, 2);
  eyes(c, cx + 10, fy - 54, 10, 8, { iris: 0x7a2a10, look: 1.5 });
  blush(c, cx + 10, fy - 42, 17, 4);
  c.strokeStyle = INK;
  c.lineWidth = 2.5;
  c.beginPath();
  c.arc(cx + 12, fy - 42, 5, 0.2, Math.PI - 0.2);
  c.stroke();
  for (const [x, y] of [[cx - 16, fy - 30], [cx - 6, fy - 36]] as const) shape(c, circle(x, y, 3), '#ffd06a', INK, 0);
  gloss(c, cx - 2, fy - 64, 8, 4, 0.7);
}

/** Level 2 — Brasito: up on two legs, little arms, a crest of three flames. */
function brasito(c: Ctx, cx: number, cy: number): void {
  const fy = cy; // cy = the feet line
  tail(c, [[cx - 14, fy - 18], [cx - 54, fy - 8], [cx - 46, fy - 52]], 20, 8);
  flameTip(c, cx - 46, fy - 54, 1.15, -3);
  foot(c, cx - 12, fy - 3, 10);
  foot(c, cx + 14, fy - 2, 10);
  shape(c, ellipse(cx, fy - 32, 26, 31), ORANGE(c, cx - 26, fy - 62, cx + 26, fy), INK, 3);
  shape(c, ellipse(cx + 5, fy - 26, 15, 21), BELLY, INK, 0);
  for (const s of [-1, 1]) shape(c, ellipse(cx + s * 24, fy - 34, 7, 12, s * 0.5), '#ff8a3a', INK, 2.5);
  // head (crest flames first, so the head sits in front of them)
  for (const [dx, k] of [[-12, 0.65], [4, 0.85], [20, 0.65]] as const) flameTip(c, cx + dx, fy - 92, k);
  shape(c, ellipse(cx + 6, fy - 76, 27, 24), ORANGE(c, cx - 20, fy - 100, cx + 34, fy - 52), INK, 3);
  eyes(c, cx + 8, fy - 77, 11, 8, { iris: 0x7a2a10, look: 1.5 });
  blush(c, cx + 8, fy - 65, 18, 4);
  c.strokeStyle = INK;
  c.lineWidth = 2.5;
  c.beginPath();
  c.arc(cx + 10, fy - 65, 6, 0.15, Math.PI - 0.15);
  c.stroke();
  for (const [x, y] of [[cx - 18, fy - 46], [cx - 20, fy - 30], [cx - 12, fy - 56]] as const) shape(c, circle(x, y, 3.5), '#ffd06a', INK, 0);
  gloss(c, cx - 4, fy - 88, 9, 4, 0.7);
}

/** Level 3 — Labarão: a sturdy fire lizard with a flame mane, horns and a glowing ember in the chest. */
function labarao(c: Ctx, cx: number, cy: number): void {
  const fy = cy; // cy = the feet line
  tail(c, [[cx - 18, fy - 22], [cx - 66, fy - 6], [cx - 58, fy - 64]], 26, 10);
  flameTip(c, cx - 58, fy - 66, 1.45, -4);
  foot(c, cx - 15, fy - 4, 12);
  foot(c, cx + 17, fy - 3, 12);
  shape(c, ellipse(cx, fy - 40, 32, 38), ORANGE(c, cx - 32, fy - 78, cx + 32, fy), INK, 3.5);
  shape(c, ellipse(cx + 5, fy - 32, 19, 26), BELLY, INK, 0);
  glow(c, cx + 4, fy - 44, 22, 0xffc24a, 0.9);
  shape(c, circle(cx + 4, fy - 44, 8), radial(c, cx + 4, fy - 44, 8, [[0, '#ffffff'], [0.5, '#ffe27a'], [1, '#ff7a2e']]), INK, 2);
  for (const s of [-1, 1]) {
    shape(c, ellipse(cx + s * 30, fy - 44, 9, 16, s * 0.5), '#ff8a3a', INK, 2.5);
    for (const d of [-4, 0, 4]) shape(c, poly([[cx + s * 34 + d, fy - 30], [cx + s * 36 + d, fy - 24], [cx + s * 32 + d, fy - 28]]), '#fff3dc', INK, 1.2);
  }
  // mane of flames behind the head
  for (const [dx, dy, k] of [[-22, -104, 0.9], [-8, -118, 1.1], [10, -120, 1.1], [26, -106, 0.9]] as const) flameTip(c, cx + 4 + dx, fy + dy, k);
  shape(c, ellipse(cx + 6, fy - 92, 29, 25), ORANGE(c, cx - 22, fy - 118, cx + 36, fy - 66), INK, 3.5);
  for (const s of [-1, 1]) shape(c, poly([[cx + 6 + s * 16, fy - 108], [cx + 6 + s * 30, fy - 124], [cx + 6 + s * 22, fy - 104]]), '#fff0c8', INK, 2);
  eyes(c, cx + 8, fy - 93, 11, 8, { iris: 0xb02a10, look: 1.5 });
  c.strokeStyle = INK;
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(cx - 2, fy - 78);
  c.quadraticCurveTo(cx + 10, fy - 72, cx + 22, fy - 79);
  c.stroke();
  for (const [x, y] of [[cx - 22, fy - 56], [cx - 24, fy - 38], [cx - 14, fy - 68]] as const) shape(c, circle(x, y, 4), '#ffd06a', INK, 0);
  gloss(c, cx - 4, fy - 106, 10, 4, 0.7);
}

/** Evolução A (Vulcão) — Dracomagma: a heavy dragon of rock and lava with a crater on its back. */
function dracomagma(c: Ctx, cx: number, cy: number): void {
  const fy = cy; // cy = the feet line
  const ROCK = linear(c, cx - 50, fy - 120, cx + 50, fy, [[0, '#6a5a6a'], [0.6, '#3e3240'], [1, '#221a26']]);
  const LAVA = (x0: number, y0: number, x1: number, y1: number) => linear(c, x0, y0, x1, y1, [[0, '#ff9a3a'], [0.5, '#d0301a'], [1, '#6a1010']]);
  // wings
  for (const s of [-1, 1]) {
    shape(c, poly([[cx + s * 22, fy - 84], [cx + s * 74, fy - 118], [cx + s * 66, fy - 92], [cx + s * 80, fy - 84], [cx + s * 60, fy - 70], [cx + s * 66, fy - 58], [cx + s * 30, fy - 60]]), LAVA(cx, fy - 118, cx + s * 80, fy - 58), INK, 3);
  }
  tail(c, [[cx - 22, fy - 20], [cx - 78, fy - 4], [cx - 74, fy - 50]], 30, 10);
  flameTip(c, cx - 74, fy - 52, 1.3, -3);
  for (const s of [-1, 1]) {
    shape(c, ellipse(cx + s * 22, fy - 8, 17, 11), LAVA(cx, fy - 18, cx, fy), INK, 3);
    for (const d of [-8, 0, 8]) shape(c, poly([[cx + s * 22 + d - 3, fy], [cx + s * 22 + d, fy + 7], [cx + s * 22 + d + 3, fy]]), '#fff0c8', INK, 1.5);
  }
  shape(c, ellipse(cx, fy - 48, 44, 44), LAVA(cx - 44, fy - 92, cx + 44, fy), INK, 4);
  shape(c, ellipse(cx + 6, fy - 40, 24, 30), '#ffc27a', INK, 0);
  for (let i = 0; i < 4; i++) shape(c, ellipse(cx + 6, fy - 58 + i * 12, 18 - i * 2, 3), 'rgba(160,60,20,0.5)', INK, 0);
  // rock spikes along the shoulders, glowing cracks between them
  for (const [x, y, h] of [[-40, -78, 22], [-26, -88, 26], [26, -88, 26], [40, -78, 22]] as const) {
    shape(c, poly([[cx + x - 10, fy + y + 6], [cx + x, fy + y - h], [cx + x + 10, fy + y + 6]]), ROCK, INK, 2.5);
    c.strokeStyle = '#ffb347';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(cx + x, fy + y - h * 0.6);
    c.lineTo(cx + x + 2, fy + y);
    c.stroke();
  }
  // crater on the back, erupting
  shape(c, poly([[cx - 34, fy - 86], [cx - 24, fy - 108], [cx - 2, fy - 108], [cx + 8, fy - 86]]), ROCK, INK, 3);
  shape(c, ellipse(cx - 13, fy - 108, 11, 4), '#ffc24a', INK, 2);
  glow(c, cx - 13, fy - 124, 42, 0xff7a2e, 0.9);
  flameTip(c, cx - 13, fy - 110, 1.7);
  // head, forward and to the right
  shape(c, ellipse(cx + 30, fy - 112, 28, 23), LAVA(cx + 2, fy - 135, cx + 58, fy - 89), INK, 4);
  shape(c, ellipse(cx + 54, fy - 102, 15, 11), LAVA(cx + 40, fy - 113, cx + 69, fy - 91), INK, 3);
  c.strokeStyle = INK;
  c.lineWidth = 2.5;
  c.beginPath();
  c.moveTo(cx + 44, fy - 96);
  c.lineTo(cx + 66, fy - 98);
  c.stroke();
  for (const d of [48, 56, 62]) shape(c, poly([[cx + d - 2, fy - 97], [cx + d, fy - 92], [cx + d + 2, fy - 97]]), '#fff3dc', INK, 1);
  for (const sx of [-1, 1]) shape(c, poly([[cx + 30 + sx * 12, fy - 128], [cx + 30 + sx * 26, fy - 150], [cx + 30 + sx * 20, fy - 124]]), ROCK, INK, 2.5);
  eyes(c, cx + 34, fy - 114, 10, 7, { iris: 0xffc24a, look: 2 });
  for (const [x, y] of [[cx + 60, fy - 106], [cx + 64, fy - 104]] as const) shape(c, circle(x, y, 1.8), INK, INK, 0);
  glow(c, cx + 8, fy - 40, 26, 0xffc24a, 0.6);
}

/** Evolução B (Fornalha) — Rubra: a slim, fast salamander with a flame mane, breathing a stream of fire. */
function rubra(c: Ctx, cx: number, cy: number): void {
  const fy = cy; // cy = the feet line
  const RED = (x0: number, y0: number, x1: number, y1: number) => linear(c, x0, y0, x1, y1, [[0, '#ff7a6a'], [0.5, '#d02a3a'], [1, '#7a1020']]);
  tail(c, [[cx - 20, fy - 30], [cx - 70, fy - 34], [cx - 74, fy - 76]], 18, 6);
  flameTip(c, cx - 74, fy - 78, 1.1, -3);
  for (const [x, y] of [[cx - 22, fy - 4], [cx + 24, fy - 2]] as const) {
    shape(c, ellipse(x, y, 11, 6), '#a01a2a', INK, 2.5);
    for (const d of [-6, 0, 6]) shape(c, circle(x + d, y + 4, 2.5), '#fff3dc', INK, 1.2);
  }
  // long low body
  shape(c, (p) => {
    p.moveTo(cx - 34, fy - 30);
    p.quadraticCurveTo(cx - 30, fy - 62, cx + 10, fy - 58);
    p.quadraticCurveTo(cx + 42, fy - 54, cx + 40, fy - 26);
    p.quadraticCurveTo(cx + 34, fy - 4, cx, fy - 8);
    p.quadraticCurveTo(cx - 34, fy - 6, cx - 34, fy - 30);
  }, RED(cx - 34, fy - 62, cx + 40, fy - 4), INK, 3.5);
  shape(c, ellipse(cx + 6, fy - 20, 24, 9), '#ffd08a', INK, 0);
  for (const [x, y] of [[cx - 18, fy - 46], [cx - 2, fy - 52], [cx + 16, fy - 50], [cx + 28, fy - 42]] as const) shape(c, ellipse(x, y, 5, 3, 0.4), '#ffd34d', INK, 1.5);
  // flame mane along the back
  for (const [dx, dy, k] of [[-24, -58, 0.7], [-8, -64, 0.85], [8, -64, 0.85], [24, -58, 0.7]] as const) flameTip(c, cx + dx, fy + dy, k, 4);
  // head, stretched forward
  shape(c, (p) => {
    p.moveTo(cx + 26, fy - 62);
    p.quadraticCurveTo(cx + 40, fy - 86, cx + 64, fy - 72);
    p.quadraticCurveTo(cx + 78, fy - 64, cx + 72, fy - 52);
    p.lineTo(cx + 52, fy - 50);
    p.quadraticCurveTo(cx + 34, fy - 44, cx + 26, fy - 62);
  }, RED(cx + 26, fy - 86, cx + 78, fy - 44), INK, 3);
  shape(c, poly([[cx + 52, fy - 50], [cx + 72, fy - 52], [cx + 64, fy - 44]]), '#5a0a14', INK, 2);
  eyes(c, cx + 50, fy - 68, 8, 6, { iris: 0xffc24a, angry: true, look: 2 });
  for (const s of [0, 1]) shape(c, poly([[cx + 36 + s * 8, fy - 78], [cx + 30 + s * 6, fy - 96], [cx + 44 + s * 8, fy - 80]]), '#ffd34d', INK, 2);
  // fire breath: a cone of flame
  glow(c, cx + 92, fy - 50, 28, 0xff9a2e, 0.9);
  shape(c, (p) => {
    p.moveTo(cx + 70, fy - 52);
    p.quadraticCurveTo(cx + 92, fy - 70, cx + 106, fy - 62);
    p.quadraticCurveTo(cx + 98, fy - 52, cx + 108, fy - 40);
    p.quadraticCurveTo(cx + 90, fy - 36, cx + 70, fy - 50);
  }, linear(c, cx + 70, 0, cx + 108, 0, [[0, '#ffffff'], [0.35, '#ffd06a'], [1, '#ff4a1a']]), INK, 2);
  gloss(c, cx + 46, fy - 78, 7, 3, 0.7);
}

export const CREATURE_FORMS: CreatureForm[] = [
  { key: 'creature_brazier_1', name: 'Faísca', w: 130, h: 140, draw: faisca },
  { key: 'creature_brazier_2', name: 'Brasito', w: 150, h: 190, draw: brasito },
  { key: 'creature_brazier_3', name: 'Labarão', w: 180, h: 240, draw: labarao },
  { key: 'creature_volcano', name: 'Dracomagma', w: 210, h: 250, draw: dracomagma },
  { key: 'creature_furnace', name: 'Rubra', w: 230, h: 170, draw: rubra },
];

/** Is this tower shown as a creature? Every tower with loaded pictures (option in Opções). */
export function isCreature(type: TowerId, has: { exists(key: string): boolean }): boolean {
  return getSettings().creatures && dragonArt(has, type, 1, null) !== null;
}

/** Texture and display name of a creature tower at this level / evolution. */
export function creatureForm(level: number, evo: EvolutionId | null): CreatureForm {
  if (evo === 'volcano') return CREATURE_FORMS[3]!;
  if (evo === 'furnace') return CREATURE_FORMS[4]!;
  return CREATURE_FORMS[Math.max(0, Math.min(2, level - 1))]!;
}

// ── Illustrated dragon lines (see docs/ARTE_IA.md) ──
// Pictures made by the player in an image AI and cut out by tools/cutout.py (which also writes the
// sprites/*.json frame data); the code only moves them.

export interface DragonArt {
  key: string;
  /** Same frame, attack pose (mouth open, effect at the mouth). */
  atkKey: string;
  name: string;
  scale: number;
  /** Feet anchor inside the picture. */
  originX: number;
  originY: number;
  /** Tail tip, in picture pixels: a soft glow pulses there (null = no glow for this line). */
  flame: [number, number];
  glow: number | null;
}

interface SpriteMeta {
  w: number;
  h: number;
  originX: number;
  originY: number;
  tail: number[];
}

interface Line {
  file: string;
  names: [string, string, string];
  meta: SpriteMeta[];
  glow: number | null;
}

const LINES: Record<TowerId, Line> = {
  brazier: { file: 'fire', names: ['Faísca', 'Brasito', 'Labarão'], meta: fireMeta, glow: 0xffa040 },
  frost: { file: 'ice', names: ['Floco', 'Geada', 'Glaciar'], meta: iceMeta, glow: 0x9fe8ff },
  vine: { file: 'nature', names: ['Broto', 'Rama', 'Copado'], meta: natureMeta, glow: null },
  storm: { file: 'storm', names: ['Estalo', 'Relampo', 'Trovoada'], meta: stormMeta, glow: 0xfff27a },
  wind: { file: 'wind', names: ['Brisa', 'Lufada', 'Vendaval'], meta: windMeta, glow: null },
  archer: { file: 'normal', names: ['Tufo', 'Juba', 'Jubão'], meta: normalMeta, glow: null },
};

/** On-screen area of each stage (px²): every line grows the same way whatever the picture's shape. */
const STAGE_AREA = [7200, 10900, 17900];

/** The illustrated form for this tower / level / evolution, or null when its pictures are not loaded.
 *  Evolutions reuse the adult, a bit bigger, until they get pictures of their own. */
export function dragonArt(has: { exists(key: string): boolean }, type: TowerId, level: number, evo: EvolutionId | null): DragonArt | null {
  const line = LINES[type];
  const st = evo ? 2 : Math.max(0, Math.min(2, level - 1));
  const key = `creature_${line.file}_${st + 1}`;
  const m = line.meta[st];
  if (!m || !has.exists(key) || !has.exists(`${key}_atk`)) return null;
  const scale = Math.sqrt(STAGE_AREA[st]! / (m.w * m.h)) * (evo ? 1.12 : 1);
  return {
    key,
    atkKey: `${key}_atk`,
    name: evo ? EVOLUTIONS[evo].name : line.names[st]!,
    scale,
    originX: m.originX,
    originY: m.originY,
    flame: [m.tail[0] ?? 0, m.tail[1] ?? 0],
    glow: line.glow,
  };
}
