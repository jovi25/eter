// Dragões elementais (lab only for now): one chibi dragon rig that grows in 3 stages and is dressed
// by element — horns, crest, wings, tail tip, markings, particles and its own attack.
// Look: thick dark outline, two-tone (cel) shading, big shiny eyes, warm saturated colours.
import { INK, ellipse, glow, gloss, hex, linear, poly, radial, shade, shape, softShadow, type Ctx } from '../view/art/paint';
import { fireball, flame, limb, phases, type Pose } from './designs';

type P2 = [number, number];
type Stage = 0 | 1 | 2;
export type DragonId = 'fire' | 'ice' | 'nature' | 'lightning' | 'wind' | 'stone' | 'normal';

export interface Skin {
  id: DragonId;
  label: string;
  band: [string, string]; // lab row background
  base: string;
  dark: string;
  belly: string;
  bellyDark: string;
  horn: [string, string];
  wing: [string, string];
  iris: number;
  fx: number;
}

export const SKINS: Skin[] = [
  { id: 'fire', label: 'Fogo', band: ['#8a4632', '#5e2a1e'], base: '#ff8a52', dark: '#d9502e', belly: '#ffe6b8', bellyDark: '#f4bd80', horn: ['#fff4d8', '#d6a058'], wing: ['#ffc07a', '#f07a3c'], iris: 0x5a2a12, fx: 0xff8a2e },
  { id: 'ice', label: 'Gelo', band: ['#3e6e92', '#284a68'], base: '#b2e0ff', dark: '#6aa6e6', belly: '#f2fbff', bellyDark: '#c6e4f7', horn: ['#ffffff', '#8fd4ff'], wing: ['#e6f6ff', '#9cccf2'], iris: 0x1f5a96, fx: 0xa8ecff },
  { id: 'nature', label: 'Planta', band: ['#456f32', '#2c4c20'], base: '#92d25e', dark: '#52a03c', belly: '#eef8c0', bellyDark: '#c6e08c', horn: ['#c89a68', '#7c5230'], wing: ['#a6e070', '#4f9a36'], iris: 0x2c5418, fx: 0x9cf06a },
  { id: 'lightning', label: 'Raio', band: ['#86741e', '#5a4c10'], base: '#ffe24e', dark: '#eaa21e', belly: '#fff7cc', bellyDark: '#f6d77e', horn: ['#fffbe2', '#ffb81a'], wing: ['#fff0a0', '#f4b62a'], iris: 0x5a3a08, fx: 0xfff36a },
  { id: 'wind', label: 'Vento', band: ['#4c8486', '#2e5a5e'], base: '#a4e8de', dark: '#55afb2', belly: '#f4fffc', bellyDark: '#c4ece4', horn: ['#ffffff', '#a6e2e4'], wing: ['#f4fffd', '#9cdcd6'], iris: 0x174e62, fx: 0xc8fff0 },
  { id: 'stone', label: 'Pedra', band: ['#665040', '#42322a'], base: '#a3866a', dark: '#66503c', belly: '#d6c2a2', bellyDark: '#ae9474', horn: ['#e8dcc4', '#8e7a60'], wing: ['#8f765c', '#5a4634'], iris: 0x3a2412, fx: 0xd6b88a },
  { id: 'normal', label: 'Normal', band: ['#77705f', '#4e483c'], base: '#fdf6e8', dark: '#d9c7a8', belly: '#fffbf2', bellyDark: '#ecdec4', horn: ['#f6e6c4', '#b48c58'], wing: ['#f4ead6', '#cdb894'], iris: 0x4a3420, fx: 0xfff0b8 },
];

// How the body changes as it grows: head gets relatively smaller, legs/neck/wings longer.
const STAGES = [
  { k: 0.66, head: 1.42, leg: 0.55, neck: 0, wing: 0.5, tail: 0.85 },
  { k: 0.86, head: 1.1, leg: 0.9, neck: 0.55, wing: 1.0, tail: 1 },
  { k: 1.08, head: 0.95, leg: 1.1, neck: 1, wing: 1.75, tail: 1.1 },
] as const;

const TAU = Math.PI * 2;

/** Two-tone ("cel") fill: flat light colour, then a hard step into the shadow colour. */
function cel(c: Ctx, x0: number, y0: number, x1: number, y1: number, light: string, dark: string, at = 0.6): CanvasGradient {
  return linear(c, x0, y0, x1, y1, [[0, light], [at, light], [Math.min(1, at + 0.02), dark], [1, dark]]);
}

/** Path of a tapering limb along a quadratic curve a → (b) → d, with a round end. */
function limbPath(a: P2, b: P2, d: P2, w0: number, w1: number): (p: Ctx) => void {
  const n = 16;
  const left: P2[] = [];
  const right: P2[] = [];
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
  return (p) => {
    poly([...left, ...right.reverse()])(p);
    p.moveTo(d[0] + w1 / 2, d[1]);
    p.arc(d[0], d[1], w1 / 2, 0, TAU);
    p.moveTo(a[0] + w0 / 2, a[1]);
    p.arc(a[0], a[1], w0 / 2, 0, TAU);
  };
}

/** Cel shading that follows the form: dark fill, then the same shape nudged toward the light
 *  (up-right) in the light colour, clipped — leaves a crescent of shadow on the lower-left. */
function celShape(c: Ctx, path: (p: Ctx) => void, light: string, dark: string, d: number, lw: number): void {
  c.save();
  c.lineJoin = 'round';
  c.beginPath();
  path(c);
  if (lw > 0) {
    c.lineWidth = lw * 2;
    c.strokeStyle = INK;
    c.stroke();
  }
  c.fillStyle = dark;
  c.fill();
  c.clip();
  c.translate(d, -d * 0.8);
  c.beginPath();
  path(c);
  c.fillStyle = light;
  c.fill();
  c.restore();
}

function part(c: Ctx, a: P2, b: P2, e: P2, w0: number, w1: number, light: string, dark: string, lw: number): void {
  celShape(c, limbPath(a, b, e, w0, w1), light, dark, Math.max(w0, w1) * 0.22, lw);
}

function oval(p: Ctx, x: number, y: number, rx: number, ry: number, rot = 0): void {
  p.moveTo(x + rx * Math.cos(rot), y + rx * Math.sin(rot));
  p.ellipse(x, y, rx, ry, rot, 0, TAU);
}

function stroke(c: Ctx, color: string, w: number, path: (p: Ctx) => void): void {
  c.save();
  c.strokeStyle = color;
  c.lineWidth = w;
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.beginPath();
  path(c);
  c.stroke();
  c.restore();
}

function rot(c: Ctx, x: number, y: number, a: number, draw: () => void): void {
  c.save();
  c.translate(x, y);
  c.rotate(a);
  draw();
  c.restore();
}

// ───────────── little parts ─────────────

function cuteEye(c: Ctx, x: number, y: number, r: number, iris: number, closed: boolean, brow: number): void {
  if (closed) {
    stroke(c, INK, Math.max(2, r * 0.4), (p) => {
      p.moveTo(x - r * 0.85, y + r * 0.15);
      p.quadraticCurveTo(x, y - r * 0.75, x + r * 0.85, y + r * 0.15);
    });
    return;
  }
  shape(c, ellipse(x, y, r * 0.8, r), radial(c, x, y + r * 0.55, r * 1.25, [[0, hex(shade(iris, 0.55))], [0.55, hex(iris)], [1, hex(shade(iris, -0.55))]]), INK, Math.max(1.2, r * 0.14));
  shape(c, ellipse(x + r * 0.06, y + r * 0.08, r * 0.36, r * 0.48), hex(shade(iris, -0.7)), INK, 0);
  shape(c, ellipse(x - r * 0.24, y - r * 0.38, r * 0.3, r * 0.32), '#ffffff', INK, 0);
  shape(c, ellipse(x + r * 0.3, y + r * 0.4, r * 0.13, r * 0.13), '#ffffff', INK, 0);
  if (brow > 0)
    stroke(c, INK, brow, (p) => {
      p.moveTo(x - r * 0.95, y - r * 1.3);
      p.lineTo(x + r * 0.85, y - r * 0.98);
    });
}

function paw(c: Ctx, x: number, y: number, w: number, h: number, fill: string | CanvasGradient, lw: number): void {
  shape(c, ellipse(x, y, w, h), fill, INK, lw * 0.8);
  for (let i = 0; i < 3; i++) shape(c, ellipse(x + w * (0.05 + i * 0.32), y + h * 0.62, h * 0.3, h * 0.26), '#fffaf0', INK, 0.9);
}

function leaf(c: Ctx, x: number, y: number, len: number, a: number, light: string, dark: string, lw: number): void {
  rot(c, x, y, a, () => {
    shape(
      c,
      (p) => {
        p.moveTo(0, 0);
        p.quadraticCurveTo(len * 0.5, -len * 0.42, len, 0);
        p.quadraticCurveTo(len * 0.5, len * 0.42, 0, 0);
      },
      cel(c, 0, -len * 0.4, 0, len * 0.4, light, dark, 0.5),
      INK,
      lw,
    );
    stroke(c, 'rgba(29,21,48,0.45)', Math.max(1, lw * 0.5), (p) => {
      p.moveTo(len * 0.1, 0);
      p.lineTo(len * 0.85, 0);
    });
  });
}

function shard(c: Ctx, x: number, y: number, len: number, w: number, a: number, lw: number): void {
  rot(c, x, y, a, () =>
    shape(c, poly([[0, 0], [len * 0.35, -w], [len, 0], [len * 0.35, w]]), linear(c, 0, -w, 0, w, [[0, '#ffffff'], [0.5, '#d4f2ff'], [0.52, '#8fd0ff'], [1, '#5ea6e8']]), INK, lw),
  );
}

function bolt(len: number, w: number): P2[] {
  // a lightning-bolt silhouette pointing along +x
  return [[0, -w * 0.5], [len * 0.55, -w * 0.7], [len * 0.45, -w * 0.05], [len, -w * 0.25], [len * 0.42, w * 0.9], [len * 0.5, w * 0.2], [0, w * 0.5]];
}

function rock(c: Ctx, x: number, y: number, r: number, a: number, light: string, dark: string, lw: number): void {
  rot(c, x, y, a, () =>
    shape(c, poly([[-r, -r * 0.3], [-r * 0.45, -r * 0.95], [r * 0.5, -r * 0.85], [r, -r * 0.1], [r * 0.6, r * 0.8], [-r * 0.6, r * 0.75]]), cel(c, r * 0.5, -r, -r * 0.5, r, light, dark, 0.55), INK, lw),
  );
}

function sparkle(c: Ctx, x: number, y: number, r: number, color: string): void {
  shape(c, poly([[x, y - r], [x + r * 0.25, y - r * 0.25], [x + r, y], [x + r * 0.25, y + r * 0.25], [x, y + r], [x - r * 0.25, y + r * 0.25], [x - r, y], [x - r * 0.25, y - r * 0.25]]), color, INK, 0);
}

function fur(c: Ctx, x: number, y: number, r: number, n: number, light: string, dark: string, lw: number, spread = 1): void {
  shape(
    c,
    (p) => {
      for (let i = 0; i < n; i++) {
        const a = -Math.PI / 2 + (i - (n - 1) / 2) * 0.62 * spread;
        oval(p, x + Math.cos(a) * r * 0.7, y + Math.sin(a) * r * 0.55, r * 0.55, r * 0.5);
      }
    },
    cel(c, x, y - r, x, y + r * 0.6, light, dark, 0.55),
    INK,
    lw,
  );
}

// ───────────── wings ─────────────

function wing(c: Ctx, sk: Skin, x: number, y: number, span: number, a: number, far: boolean, lw: number): void {
  const [light, dark] = sk.wing;
  const L = far ? hex(shade(parseInt(light.slice(1), 16), -0.25)) : light;
  const D = far ? hex(shade(parseInt(dark.slice(1), 16), -0.25)) : dark;
  const s = span;
  rot(c, x, y, a, () => {
    if (sk.id === 'wind') {
      // feathered wing: broad feathers fanning back from the arm, longest at the top
      for (let i = 0; i < 5; i++) {
        const u = 0.3 + i * 0.17;
        const len = s * (0.42 + i * 0.1);
        rot(c, s * 0.1 * u, -s * 0.95 * u, Math.PI - 0.15 + i * 0.2, () => shape(c, ellipse(len * 0.5, 0, len * 0.55, s * 0.13), cel(c, 0, -s * 0.12, 0, s * 0.12, L, D, 0.55), INK, lw * 0.7));
      }
      limb(c, [0, 0], [-s * 0.02, -s * 0.5], [s * 0.1, -s * 0.95], s * 0.15, s * 0.08, L, lw * 0.7);
      return;
    }
    if (sk.id === 'nature') {
      leaf(c, 0, 0, s * 0.95, -1.95, L, D, lw * 0.8);
      leaf(c, 0, 0, s * 1.05, -1.55, L, D, lw * 0.8);
      leaf(c, 0, 0, s * 0.8, -2.45, L, D, lw * 0.8);
      return;
    }
    const W: P2 = [-s * 0.12, -s * 0.62];
    const T1: P2 = [s * 0.25, -s];
    const T2: P2 = [-s * 0.38, -s * 0.92];
    const T3: P2 = [-s * 0.82, -s * 0.58];
    const E: P2 = [-s * 0.62, -s * 0.08];
    const dip = (a1: P2, b: P2): P2 => [(a1[0] + b[0]) / 2 + (W[0] - (a1[0] + b[0]) / 2) * 0.35, (a1[1] + b[1]) / 2 + (W[1] - (a1[1] + b[1]) / 2) * 0.35];
    shape(
      c,
      (p) => {
        p.moveTo(0, 0);
        p.lineTo(W[0], W[1]);
        p.lineTo(T1[0], T1[1]);
        const d1 = dip(T1, T2);
        p.quadraticCurveTo(d1[0], d1[1], T2[0], T2[1]);
        const d2 = dip(T2, T3);
        p.quadraticCurveTo(d2[0], d2[1], T3[0], T3[1]);
        const d3 = dip(T3, E);
        p.quadraticCurveTo(d3[0], d3[1], E[0], E[1]);
        p.quadraticCurveTo(-s * 0.3, -s * 0.12, 0, 0);
        p.closePath();
      },
      linear(c, 0, -s, 0, 0, [[0, L], [1, D]]),
      INK,
      lw * 0.8,
    );
    for (const T of [T1, T2, T3]) stroke(c, 'rgba(29,21,48,0.4)', Math.max(1.2, lw * 0.55), (p) => { p.moveTo(W[0], W[1]); p.lineTo(T[0], T[1]); });
    limb(c, [0, 0], [-s * 0.02, -s * 0.35], W, s * 0.13, s * 0.08, far ? sk.dark : sk.base, lw * 0.8);
    shape(c, poly([[W[0] - s * 0.04, W[1]], [W[0] + s * 0.02, W[1] - s * 0.12], [W[0] + s * 0.06, W[1] + s * 0.01]]), sk.horn[0], INK, lw * 0.5);
  });
}

// ───────────── per-element pieces ─────────────

function spike(c: Ctx, sk: Skin, x: number, y: number, nx: number, ny: number, h: number, lw: number): void {
  const a = Math.atan2(ny, nx) - 0.35; // lean backwards
  switch (sk.id) {
    case 'ice':
      shard(c, x, y, h * 1.4, h * 0.38, a, lw * 0.7);
      return;
    case 'nature':
      leaf(c, x, y, h * 1.25, a, sk.wing[0], sk.wing[1], lw * 0.7);
      return;
    case 'lightning':
      rot(c, x, y, a, () => shape(c, poly(bolt(h * 1.35, h * 0.7)), cel(c, 0, -h, 0, h, '#fff6a8', sk.dark, 0.5), INK, lw * 0.7));
      return;
    case 'stone':
      rock(c, x + nx * h * 0.25, y + ny * h * 0.25, h * 0.62, a, sk.horn[0], sk.horn[1], lw * 0.7);
      return;
    case 'normal':
      fur(c, x, y, h * 0.75, 2, sk.base, sk.dark, lw * 0.6);
      return;
    default:
      rot(c, x, y, a, () => shape(c, (p) => { p.moveTo(-1, -h * 0.42); p.quadraticCurveTo(h * 0.55, -h * 0.35, h, 0.5); p.quadraticCurveTo(h * 0.4, h * 0.3, -1, h * 0.42); p.closePath(); }, cel(c, 0, -h * 0.4, 0, h * 0.4, sk.id === 'fire' ? '#ffc35a' : sk.wing[0], sk.id === 'fire' ? '#e2602c' : sk.dark, 0.5), INK, lw * 0.7));
  }
}

function tailTip(c: Ctx, sk: Skin, st: Stage, x: number, y: number, k: number, t: number, heat: number, lw: number): void {
  const s = (v: number) => v * k;
  const g = 1 + st * 0.3;
  switch (sk.id) {
    case 'fire':
      glow(c, x, y - s(8), s(18) * g, sk.fx, 0.55 + heat * 0.4);
      flame(c, x, y - s(2), s(6) * g, s(17) * g * (1 + Math.sin(t * 9) * 0.06 + heat * 0.3), Math.sin(t * 5) * s(3), lw * 0.7);
      return;
    case 'ice':
      glow(c, x, y, s(14) * g, sk.fx, 0.4 + heat * 0.4);
      shard(c, x, y, s(14) * g, s(4.5) * g, -1.9, lw * 0.7);
      shard(c, x, y, s(10) * g, s(3.5) * g, -2.6, lw * 0.7);
      if (st > 0) shard(c, x, y, s(9) * g, s(3) * g, -1.2, lw * 0.7);
      return;
    case 'nature':
      leaf(c, x, y, s(13) * g, -2.4, sk.wing[0], sk.wing[1], lw * 0.7);
      leaf(c, x, y, s(12) * g, -1.3, sk.wing[0], sk.wing[1], lw * 0.7);
      if (st > 0) flower(c, x, y - s(2), s(4.5) * g, lw * 0.6, st === 2 ? '#ff8fb0' : '#ffb0c8');
      return;
    case 'lightning':
      glow(c, x, y, s(14) * g, sk.fx, 0.45 + heat * 0.5);
      rot(c, x, y, -1.75, () => shape(c, poly(bolt(s(20) * g, s(10) * g)), cel(c, 0, -s(8), 0, s(8), '#fffbe0', '#ffc21a', 0.5), INK, lw * 0.7));
      return;
    case 'wind':
      for (const [a, l] of [[-2.5, 1], [-1.9, 1.15], [-1.3, 0.95]] as const)
        rot(c, x, y, a, () => shape(c, ellipse(s(9) * g * l, 0, s(10) * g * l, s(3.6) * g), cel(c, 0, -s(4), 0, s(4), sk.wing[0], sk.wing[1], 0.5), INK, lw * 0.6));
      return;
    case 'stone':
      rock(c, x - s(1), y - s(2), s(7) * g, 0.3, sk.horn[0], sk.horn[1], lw * 0.7);
      return;
    case 'normal':
      fur(c, x, y - s(2), s(9) * g, 3, sk.base, sk.dark, lw * 0.6, 1.1);
      return;
  }
}

function flower(c: Ctx, x: number, y: number, r: number, lw: number, color: string): void {
  shape(c, (p) => { for (let i = 0; i < 5; i++) { const a = (i / 5) * TAU - Math.PI / 2; oval(p, x + Math.cos(a) * r, y + Math.sin(a) * r, r * 0.75, r * 0.75); } }, color, INK, lw);
  shape(c, ellipse(x, y, r * 0.55, r * 0.55), '#ffe27a', INK, lw * 0.6);
}

function horn(c: Ctx, sk: Skin, a: P2, b: P2, d: P2, w: number, lw: number): void {
  limb(c, a, b, d, w, w * 0.18, linear(c, a[0], a[1], d[0], d[1], [[0, sk.horn[1]], [0.25, sk.horn[0]], [1, sk.horn[0]]]), lw * 0.7);
}

/** Things behind the head: horns, crests, fins, antlers. */
function headBack(c: Ctx, sk: Skin, st: Stage, hx: number, hy: number, R: number, lw: number): void {
  const len = [0.45, 0.8, 1.1][st]!;
  const pair = (fn: (bx: number, by: number, far: boolean) => void) => {
    fn(hx + R * 0.32, hy - R * 0.82, true);
    fn(hx - R * 0.2, hy - R * 0.78, false);
  };
  switch (sk.id) {
    case 'fire':
      pair((bx, by) => horn(c, sk, [bx, by + R * 0.1], [bx - R * 0.15 * len, by - R * 0.7 * len], [bx - R * 0.65 * len, by - R * 0.85 * len], R * 0.3, lw));
      if (st === 2) {
        horn(c, sk, [hx - R * 0.75, hy - R * 0.15], [hx - R * 1.1, hy - R * 0.25], [hx - R * 1.45, hy - R * 0.55], R * 0.22, lw);
        for (let i = 0; i < 3; i++) spike(c, sk, hx - R * (0.55 + i * 0.18), hy - R * (0.6 - i * 0.25), -0.6, -0.8, R * 0.42, lw);
      }
      return;
    case 'ice':
      pair((bx, by) => shard(c, bx, by + R * 0.1, R * (0.6 + len * 0.55), R * 0.16, -2.3, lw * 0.7));
      if (st > 0) for (let i = 0; i < st + 1; i++) shard(c, hx - R * (0.75 + i * 0.12), hy - R * (0.25 - i * 0.28), R * 0.55, R * 0.14, -2.7 + i * 0.2, lw * 0.6);
      return;
    case 'nature':
      if (st === 0) return;
      pair((bx, by, far) => {
        const tip: P2 = [bx - R * 0.45 * len, by - R * 1.0 * len];
        horn(c, sk, [bx, by + R * 0.1], [bx - R * 0.05, by - R * 0.5 * len], tip, R * 0.17, lw);
        horn(c, sk, [bx - R * 0.08, by - R * 0.45 * len], [bx + R * 0.15, by - R * 0.75 * len], [bx + R * 0.25, by - R * 0.95 * len], R * 0.1, lw);
        if (st === 2) {
          leaf(c, tip[0], tip[1], R * 0.55, -2.6, sk.wing[0], sk.wing[1], lw * 0.6);
          if (!far) flower(c, bx + R * 0.25, by - R * 0.95 * len, R * 0.14, lw * 0.5, '#ff9ab8');
        }
      });
      return;
    case 'lightning':
      pair((bx, by) => rot(c, bx, by + R * 0.15, -2.15 - (st === 2 ? 0.1 : 0), () => shape(c, poly(bolt(R * (0.7 + len * 0.65), R * 0.42)), cel(c, 0, -R * 0.3, 0, R * 0.3, '#fffbe2', sk.dark, 0.5), INK, lw * 0.7)));
      if (st === 2) rot(c, hx - R * 0.85, hy - R * 0.05, -2.75, () => shape(c, poly(bolt(R * 0.8, R * 0.35)), cel(c, 0, -R * 0.3, 0, R * 0.3, '#fffbe2', sk.dark, 0.5), INK, lw * 0.7));
      return;
    case 'wind':
      for (let i = 0; i <= st + 1; i++) {
        const a = -2.35 - i * 0.28;
        const l = R * (0.75 + len * 0.45 - i * 0.12);
        rot(c, hx - R * 0.45, hy - R * 0.55 + i * R * 0.12, a, () => shape(c, ellipse(l * 0.85, 0, l, R * 0.17), cel(c, 0, -R * 0.15, 0, R * 0.15, sk.wing[0], sk.wing[1], 0.5), INK, lw * 0.6));
      }
      return;
    case 'stone':
      if (st === 2) {
        pair((bx, by) => horn(c, sk, [bx - R * 0.1, by + R * 0.15], [bx - R * 1.05, by - R * 0.55], [bx - R * 0.75, by + R * 0.45], R * 0.42, lw));
      } else pair((bx, by) => horn(c, sk, [bx, by + R * 0.12], [bx - R * 0.12, by - R * 0.35 * len], [bx - R * 0.35 * len, by - R * 0.55 * len], R * 0.38, lw));
      return;
    case 'normal':
      // soft ears, then horns that sweep back
      pair((bx, by, far) => shape(c, ellipse(bx - R * 0.35, by + R * 0.12, R * 0.42, R * 0.2, -0.5), far ? sk.dark : cel(c, bx, by - R * 0.2, bx, by + R * 0.3, sk.base, sk.dark, 0.55), INK, lw * 0.7));
      if (st > 0) pair((bx, by) => horn(c, sk, [bx + R * 0.05, by + R * 0.05], [bx - R * 0.55 * len, by - R * 0.55 * len], [bx - R * 0.95 * len, by - R * 0.05], R * 0.24, lw));
      return;
  }
}

/** Things in front of the head: forehead horn, sprout, fluffy tuft, brow rock. */
function headFront(c: Ctx, sk: Skin, st: Stage, hx: number, hy: number, R: number, lw: number, t: number): void {
  switch (sk.id) {
    case 'ice':
      shard(c, hx + R * 0.38, hy - R * 0.78, R * [0.4, 0.95, 1.15][st]!, R * 0.16, -1.35, lw * 0.7);
      return;
    case 'nature':
      if (st === 0) {
        stroke(c, INK, lw * 1.6, (p) => { p.moveTo(hx + R * 0.1, hy - R * 0.9); p.quadraticCurveTo(hx + R * 0.15, hy - R * 1.15, hx + R * 0.05, hy - R * 1.3); });
        stroke(c, '#6cbc48', lw * 0.7, (p) => { p.moveTo(hx + R * 0.1, hy - R * 0.9); p.quadraticCurveTo(hx + R * 0.15, hy - R * 1.15, hx + R * 0.05, hy - R * 1.3); });
        const sw = Math.sin(t * 2) * 0.1;
        leaf(c, hx + R * 0.05, hy - R * 1.28, R * 0.5, -2.7 + sw, sk.wing[0], sk.wing[1], lw * 0.6);
        leaf(c, hx + R * 0.05, hy - R * 1.28, R * 0.55, -0.5 + sw, sk.wing[0], sk.wing[1], lw * 0.6);
      } else if (st === 1) flower(c, hx - R * 0.1, hy - R * 0.92, R * 0.16, lw * 0.5, '#ff9ab8');
      return;
    case 'lightning':
      if (st > 0) rot(c, hx + R * 0.05, hy - R * 0.95, -1.75, () => shape(c, poly(bolt(R * (0.45 + st * 0.15), R * 0.32)), cel(c, 0, -R * 0.2, 0, R * 0.2, '#fffbe2', sk.dark, 0.5), INK, lw * 0.6));
      return;
    case 'stone':
      rock(c, hx + R * 0.25, hy - R * 0.62, R * (0.22 + st * 0.06), -0.2, sk.horn[0], sk.horn[1], lw * 0.6);
      return;
    case 'normal':
      fur(c, hx - R * 0.05, hy - R * 0.82, R * (0.36 + st * 0.06), 3, sk.base, sk.dark, lw * 0.6);
      return;
    case 'wind':
      if (st > 0) fur(c, hx - R * 0.15, hy - R * 0.85, R * 0.3, 2, sk.belly, sk.bellyDark, lw * 0.55);
      return;
    default:
  }
}

/** Patterns on the body: spots, stripes, cracks, frost. Drawn clipped to the body. */
function markings(c: Ctx, sk: Skin, st: Stage, bx: number, by: number, rx: number, ry: number, lw: number): void {
  const ink = 'rgba(29,21,48,0.35)';
  switch (sk.id) {
    case 'nature':
      for (const [dx, dy, r] of [[-0.45, -0.45, 0.13], [-0.15, -0.6, 0.1], [0.05, -0.35, 0.08], [-0.6, -0.1, 0.09]] as const) shape(c, ellipse(bx + dx * rx, by + dy * ry, r * rx, r * rx * 0.8), sk.dark, INK, 0);
      return;
    case 'fire':
      if (st === 2) for (let i = 0; i < 3; i++) shape(c, poly([[bx - rx * (0.65 - i * 0.28), by - ry * 0.95], [bx - rx * (0.5 - i * 0.28), by - ry * 0.25], [bx - rx * (0.42 - i * 0.28), by - ry * 0.95]]), sk.dark, INK, 0);
      return;
    case 'lightning':
      if (st > 0) stroke(c, sk.dark, lw * 1.4, (p) => { p.moveTo(bx - rx * 0.85, by - ry * 0.35); p.lineTo(bx - rx * 0.5, by - ry * 0.7); p.lineTo(bx - rx * 0.35, by - ry * 0.4); p.lineTo(bx, by - ry * 0.8); p.lineTo(bx + rx * 0.15, by - ry * 0.5); p.lineTo(bx + rx * 0.45, by - ry * 0.85); });
      return;
    case 'stone':
      stroke(c, ink, Math.max(1.2, lw * 0.5), (p) => { p.moveTo(bx - rx * 0.3, by - ry); p.lineTo(bx - rx * 0.4, by - ry * 0.5); p.lineTo(bx - rx * 0.2, by - ry * 0.2); p.moveTo(bx - rx * 0.4, by - ry * 0.5); p.lineTo(bx - rx * 0.7, by - ry * 0.35); });
      return;
    case 'ice':
      for (const [dx, dy] of [[-0.5, -0.5], [-0.1, -0.7], [-0.7, -0.05]] as const) sparkle(c, bx + dx * rx, by + dy * ry, rx * 0.09, 'rgba(255,255,255,0.9)');
      return;
    default:
  }
}

function particles(c: Ctx, sk: Skin, st: Stage, cx: number, fy: number, t: number, k: number): void {
  const n = 2 + st * 2;
  const s = (v: number) => v * k;
  for (let i = 0; i < n; i++) {
    const ph = (t * 0.32 + i / n + i * 0.137) % 1;
    const a = Math.sin(ph * Math.PI);
    const x0 = cx + (((i * 53) % 100) - 50) * k * 1.5;
    c.save();
    c.globalAlpha = a;
    switch (sk.id) {
      case 'fire': {
        const x = x0 + Math.sin(t * 2 + i) * s(4);
        const y = fy - s(30) - ph * s(90);
        glow(c, x, y, s(5), sk.fx, 0.9);
        shape(c, ellipse(x, y, s(1.6), s(1.6)), '#ffe9a0', INK, 0);
        break;
      }
      case 'ice': {
        const x = x0 + Math.sin(t + i) * s(5);
        const y = fy - s(120) + ph * s(100);
        const r = s(3.2);
        stroke(c, '#ffffff', s(1.4), (p) => { for (let j = 0; j < 3; j++) { const q = (j / 3) * Math.PI + t; p.moveTo(x - Math.cos(q) * r, y - Math.sin(q) * r); p.lineTo(x + Math.cos(q) * r, y + Math.sin(q) * r); } });
        break;
      }
      case 'nature': {
        const x = x0 + Math.sin(t * 1.5 + i) * s(8);
        const y = fy - s(120) + ph * s(100);
        shape(c, ellipse(x, y, s(3), s(1.8), t * 2 + i), i % 2 ? '#ffb0c8' : '#a6e070', INK, 0.8);
        break;
      }
      case 'lightning': {
        if (Math.sin(t * 17 + i * 3) < 0.2) break;
        const x = x0;
        const y = fy - s(25) - ((i * 37) % 90) * k;
        stroke(c, '#fff36a', s(1.8), (p) => { p.moveTo(x - s(4), y - s(3)); p.lineTo(x, y); p.lineTo(x - s(2), y + s(1)); p.lineTo(x + s(4), y + s(4)); });
        break;
      }
      case 'wind': {
        const x = cx - s(70) + ph * s(140);
        const y = fy - s(30) - ((i * 41) % 80) * k;
        stroke(c, 'rgba(255,255,255,0.85)', s(1.6), (p) => { p.arc(x, y, s(6), Math.PI * 0.9, Math.PI * 2.1); });
        break;
      }
      case 'stone': {
        const x = x0 * 0.7 + cx * 0.3;
        const y = fy - s(4) - Math.abs(Math.sin(ph * Math.PI)) * s(16);
        shape(c, ellipse(x, y, s(2.4), s(2)), '#8a7056', INK, 0.8);
        break;
      }
      case 'normal': {
        const y = fy - s(25) - ((i * 37) % 95) * k;
        sparkle(c, x0, y, s(3.5) * (0.6 + a * 0.4), '#ffe9a0');
        break;
      }
    }
    c.restore();
  }
}

function cone(c: Ctx, M: P2, L: number, spread: number, stops: [number, string][], alpha: number, t: number): void {
  if (L < 2) return;
  c.save();
  c.globalAlpha = alpha;
  c.fillStyle = radial(c, M[0], M[1], L * 1.05, stops);
  c.beginPath();
  c.moveTo(M[0], M[1]);
  const n = 9;
  for (let i = 0; i <= n; i++) {
    const a = -spread + (2 * spread * i) / n + 0.1;
    const w = L * (1 + Math.sin(t * 25 + i * 1.7) * 0.07);
    c.lineTo(M[0] + Math.cos(a) * w, M[1] + Math.sin(a) * w);
  }
  c.closePath();
  c.fill();
  c.restore();
}

/** The attack effect that leaves the mouth M (to the right). */
function attack(c: Ctx, sk: Skin, st: Stage, M: P2, k: number, wind: number, hit: number, shot: number, t: number, lw: number): void {
  const s = (v: number) => v * k;
  if (wind > 0) glow(c, M[0], M[1], s(7) + wind * s(11), sk.fx, 0.75 * wind);
  const D = s(64) + st * s(8);
  const fade = shot > 0.75 ? 1 - (shot - 0.75) / 0.25 : 1;
  const big = 1 + st * 0.3;
  c.save();
  switch (sk.id) {
    case 'fire':
      if (st === 2) cone(c, M, s(88) * Math.min(1, hit * 1.6), 0.32, [[0, '#fffbe6'], [0.3, '#ffe27a'], [0.65, '#ff8a35'], [1, 'rgba(226,64,28,0)']], Math.min(1, hit * 1.5), t);
      else if (shot >= 0) fireball(c, M[0] + shot * D, M[1] + shot * s(6), s(5) * big, fade);
      break;
    case 'ice':
      if (st === 2) {
        cone(c, M, s(85) * Math.min(1, hit * 1.6), 0.3, [[0, '#ffffff'], [0.4, '#d8f4ff'], [0.75, '#8fd0ff'], [1, 'rgba(120,190,255,0)']], Math.min(1, hit * 1.5), t);
        if (shot >= 0) for (let i = 0; i < 3; i++) shard(c, M[0] + shot * D * (0.8 + i * 0.15), M[1] + (i - 1) * s(9) * shot, s(12), s(3.5), (i - 1) * 0.15, lw * 0.6);
      } else if (shot >= 0) {
        c.globalAlpha = fade;
        glow(c, M[0] + shot * D, M[1] + shot * s(6), s(12), sk.fx, 0.6);
        shard(c, M[0] + shot * D - s(8), M[1] + shot * s(6), s(16) * big, s(4.5) * big, 0.08, lw * 0.6);
      }
      break;
    case 'nature':
      if (shot >= 0) {
        c.globalAlpha = fade;
        const n = st === 2 ? 3 : 1;
        for (let i = 0; i < n; i++) leaf(c, M[0] + shot * D, M[1] + shot * s(6) + (i - (n - 1) / 2) * s(12) * shot, s(11) * big, t * 14 + i * 2, sk.wing[0], sk.wing[1], lw * 0.6);
      }
      break;
    case 'lightning':
      if (hit > 0.05) {
        const end: P2 = [M[0] + D, M[1] + s(10)];
        const seed = Math.floor(t * 24);
        const pts: P2[] = [M];
        for (let i = 1; i < 7; i++) {
          const u = i / 7;
          const j = Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453;
          pts.push([M[0] + (end[0] - M[0]) * u, M[1] + (end[1] - M[1]) * u + (j - Math.floor(j) - 0.5) * s(16)]);
        }
        pts.push(end);
        glow(c, end[0], end[1], s(16) * big, sk.fx, hit);
        const line = (w: number, col: string, from = pts) => stroke(c, col, w, (p) => { p.moveTo(from[0]![0], from[0]![1]); for (const q of from.slice(1)) p.lineTo(q[0], q[1]); });
        c.globalAlpha = Math.min(1, hit * 1.4);
        line(s(7) * big, 'rgba(255,240,120,0.35)');
        line(s(3.2) * big, '#ffe24e');
        line(s(1.4) * big, '#ffffff');
        if (st === 2) {
          const b = pts[3]!;
          const branch: P2[] = [b, [b[0] + s(14), b[1] - s(14)], [b[0] + s(22), b[1] - s(10)], [b[0] + s(32), b[1] - s(24)]];
          line(s(2.4), '#ffe24e', branch);
          line(s(1), '#ffffff', branch);
        }
      }
      break;
    case 'wind':
      if (shot >= 0) {
        c.globalAlpha = fade;
        for (let i = 0; i < (st === 2 ? 2 : 1); i++) {
          const x = M[0] + shot * D - i * s(16);
          const y = M[1] + shot * s(6) + i * s(4);
          const r = s(11) * big;
          shape(c, (p) => { p.arc(x, y, r, -1.2, 1.2); p.arc(x - r * 0.45, y, r * 0.85, 1.15, -1.15, true); p.closePath(); }, linear(c, x - r, y, x + r, y, [[0, 'rgba(255,255,255,0.2)'], [1, '#ffffff']]), '#4fa9b0', 1.2);
        }
      }
      break;
    case 'stone':
      if (shot >= 0) {
        c.globalAlpha = fade;
        const x = M[0] + shot * D;
        const y = M[1] - Math.sin(shot * Math.PI) * s(22) + shot * s(14);
        rock(c, x, y, s(6) * big, shot * 8, sk.horn[0], sk.horn[1], lw * 0.6);
        if (st === 2) {
          rock(c, x - s(12), y + s(6), s(3), shot * 9, sk.horn[0], sk.horn[1], lw * 0.5);
          rock(c, x - s(6), y - s(9), s(2.5), shot * 7, sk.horn[0], sk.horn[1], lw * 0.5);
        }
      }
      break;
    case 'normal':
      if (hit > 0.02) {
        c.globalAlpha = Math.min(1, hit * 1.3);
        for (let j = 0; j < 2 + st; j++) {
          const r = s(8) + (1 - hit) * s(42) + j * s(9);
          stroke(c, j % 2 ? '#ffe9a0' : '#ffffff', s(3), (p) => p.arc(M[0], M[1], r, -0.55, 0.55));
        }
      }
      break;
  }
  c.restore();
}

// ───────────── the rig ─────────────

export function drawDragon(c: Ctx, sk: Skin, st: Stage, cx: number, fy: number, p: Pose): void {
  const S = STAGES[st];
  const k = S.k;
  const s = (v: number) => v * k;
  const lw = 1.6 + k * 1.1;
  const { wind, hit, shot } = phases(p.atk);
  const br = Math.sin(p.t * 2.4);
  const rx = s(36);
  const ry = s(25);
  const legLen = s(16) * S.leg;
  const bx = cx - s(6);
  const by = fy - legLen - ry * 0.72 + wind * s(2) + br * 0.6 * k;
  const R = s(22) * S.head;
  const chest: P2 = [bx + rx * 0.62, by - ry * 0.35];
  const hx = chest[0] + s(4) + s(9) * S.neck - wind * s(6) + hit * s(8);
  const hy = by - ry * 0.55 - R * 0.68 - s(24) * S.neck + wind * s(3) - hit * s(2) + br * 1.1 * k;
  const lift = wind * 0.4 - hit * 0.35 + Math.sin(p.t * 3) * 0.05;

  softShadow(c, cx, fy + 2, rx * 1.45, s(8), 0.32);
  if (st === 2) glow(c, cx, by - s(14), s(95), sk.fx, 0.16);

  // far wing and tail
  wing(c, sk, bx + rx * 0.05 + s(9), by - ry * 0.75 - s(3), s(40) * S.wing, -0.3 + lift, true, lw);
  const sway = Math.sin(p.t * 1.7) * s(3);
  const tb: P2 = [bx - rx * 0.78, by + ry * 0.1];
  const tc: P2 = [tb[0] - s(34) * S.tail, fy - s(2)];
  const tt: P2 = [tb[0] - s(46) * S.tail + sway, by - s(12) * S.tail - s(4)];
  part(c, tb, tc, tt, ry * 0.95, s(5), sk.base, sk.dark, lw);
  tailTip(c, sk, st, tt[0], tt[1], k, p.t, wind, lw);

  // legs on the far side (darker), then the body
  legs(c, sk, bx + s(8), by - s(2), rx, ry, fy - s(2), k, lw, true, 'all');
  legs(c, sk, bx, by, rx, ry, fy, k, lw, false, 'under');
  // neck (its base hides under the body)
  if (S.neck > 0) {
    const n0: P2 = [chest[0] - s(6), chest[1] + s(4)];
    const n2: P2 = [hx - R * 0.15, hy + R * 0.45];
    const nb: P2 = [chest[0] - s(5), (chest[1] + n2[1]) / 2];
    part(c, n0, nb, n2, s(22), s(17), sk.base, sk.dark, lw);
    c.save();
    c.beginPath();
    limbPath(n0, nb, n2, s(22), s(17))(c);
    c.clip();
    part(c, [n0[0] + s(9), n0[1] + s(2)], [nb[0] + s(10), nb[1]], [n2[0] + s(9), n2[1]], s(12), s(9), sk.belly, sk.bellyDark, 0);
    c.restore();
  }
  celShape(c, ellipse(bx, by, rx, ry), sk.base, sk.dark, ry * 0.2, lw);
  c.save();
  c.beginPath();
  c.ellipse(bx, by, rx, ry, 0, 0, TAU);
  c.clip();
  markings(c, sk, st, bx, by, rx, ry, lw);
  c.fillStyle = cel(c, bx + rx, by, bx + rx * 0.2, by + ry, sk.belly, sk.bellyDark, 0.6);
  c.beginPath();
  c.ellipse(bx + rx * 0.35, by + ry * 0.62, rx * 0.82, ry * 0.6, -0.15, 0, TAU);
  c.fill();
  stroke(c, 'rgba(29,21,48,0.45)', Math.max(1.2, lw * 0.5), (pp) => pp.ellipse(bx + rx * 0.35, by + ry * 0.62, rx * 0.82, ry * 0.6, -0.15, Math.PI, TAU));
  for (let i = 0; i < 3; i++) stroke(c, 'rgba(29,21,48,0.18)', 1.4, (pp) => pp.arc(bx + rx * (0.1 + i * 0.25), by + ry * 0.2, ry * 0.6, Math.PI * 0.35, Math.PI * 0.65));
  c.restore();
  gloss(c, bx + rx * 0.1, by - ry * 0.55, rx * 0.35, ry * 0.16, 0.45, -0.1);

  // back crest
  const nSp = [2, 3, 5][st]!;
  for (let i = 0; i < nSp; i++) {
    const th = -2.75 + (i * 1.15) / Math.max(1, nSp - 1);
    const nx = Math.cos(th) / rx;
    const ny = Math.sin(th) / ry;
    const nl = Math.hypot(nx, ny);
    spike(c, sk, bx + rx * Math.cos(th) * 0.9, by + ry * Math.sin(th) * 0.9, nx / nl, ny / nl, s(9) * (1 + st * 0.12), lw);
  }

  // near wing, near legs, accessories on the body
  wing(c, sk, bx + rx * 0.05, by - ry * 0.75, s(40) * S.wing, -0.14 + lift, false, lw);
  legs(c, sk, bx, by, rx, ry, fy, k, lw, false, 'thigh');
  bodyGear(c, sk, st, bx, by, rx, ry, fy, k, lw);

  if (sk.id === 'normal' || (sk.id === 'wind' && st > 0)) fur(c, chest[0] + s(2), chest[1] + s(8), s(12) + st * s(2), 3, sk.belly, sk.bellyDark, lw * 0.7, 1.2);
  if (sk.id === 'lightning' && st === 2) {
    stroke(c, '#c8901a', s(2), (pp) => pp.arc(chest[0], chest[1] - s(6), s(10), 0.3, Math.PI - 0.6));
    shape(c, poly([[chest[0] + s(3), chest[1] + s(2)], [chest[0] + s(8), chest[1] + s(8)], [chest[0] + s(3), chest[1] + s(14)], [chest[0] - s(2), chest[1] + s(8)]]), linear(c, 0, chest[1], 0, chest[1] + s(14), [[0, '#9cf0ff'], [1, '#3a7ae0']]), INK, lw * 0.6);
  }

  // head
  headBack(c, sk, st, hx, hy, R, lw);
  head(c, sk, st, hx, hy, R, lw, wind, hit);
  headFront(c, sk, st, hx, hy, R, lw, p.t);

  particles(c, sk, st, cx, fy, p.t, k);
  attack(c, sk, st, [hx + R * 1.12, hy + R * 0.5], k, wind, hit, shot, p.t, lw);
}

function legs(c: Ctx, sk: Skin, bx: number, by: number, rx: number, ry: number, fy: number, k: number, lw: number, far: boolean, mode: 'all' | 'under' | 'thigh'): void {
  const s = (v: number) => v * k;
  const L = far ? sk.dark : sk.base;
  const D = far ? hex(shade(parseInt(sk.dark.slice(1), 16), -0.2)) : sk.dark;
  const hip: P2 = [bx - rx * 0.42, by + ry * 0.25];
  const hf: P2 = [bx - rx * 0.36 + s(3), fy - s(4)];
  if (mode === 'thigh') {
    celShape(c, ellipse(hip[0], hip[1] + s(1), s(14), s(15), -0.2), L, D, s(3.5), lw);
    return;
  }
  part(c, hip, [hip[0] - s(4), (hip[1] + hf[1]) / 2], hf, s(14), s(11), L, D, lw);
  paw(c, hf[0] + s(3), fy - s(3.5), s(9.5), s(5), L, lw);
  const sh: P2 = [bx + rx * 0.5, by + ry * 0.1];
  const ff: P2 = [bx + rx * 0.58 + s(2), fy - s(4)];
  part(c, sh, [sh[0] + s(4), (sh[1] + ff[1]) / 2], ff, s(14), s(11), L, D, lw);
  paw(c, ff[0] + s(3), fy - s(3.5), s(9.5), s(5), L, lw);
}

/** Bandages, satchel, harness: they show the creature growing up. */
function bodyGear(c: Ctx, sk: Skin, st: Stage, bx: number, by: number, rx: number, ry: number, fy: number, k: number, lw: number): void {
  const s = (v: number) => v * k;
  if ((sk.id === 'fire' || sk.id === 'stone') && st === 1) {
    const x = bx + rx * 0.58 + s(1);
    for (const f of [0.35]) {
      const y = by + ry * 0.75 + (fy - by - ry * 0.75) * f;
      shape(c, (p) => p.roundRect(x - s(8), y - s(2), s(16), s(4.5), s(2)), '#fff6e6', INK, lw * 0.45);
    }
  }
  if (sk.id === 'normal' && st > 0) {
    const a: P2 = [bx + rx * 0.35, by - ry * 0.85];
    const b: P2 = [bx - rx * 0.25, by + ry * 0.75];
    stroke(c, INK, s(7), (p) => { p.moveTo(a[0], a[1]); p.lineTo(b[0], b[1]); });
    stroke(c, '#9a5a32', s(4), (p) => { p.moveTo(a[0], a[1]); p.lineTo(b[0], b[1]); });
    if (st === 2) {
      shape(c, (p) => p.roundRect(bx + rx * 0.05 - s(4), by - ry * 0.1 - s(4), s(8), s(8), s(1.5)), '#ffd25a', INK, lw * 0.45);
    }
    const bagX = bx - rx * 0.42;
    const bagY = by + ry * 0.35;
    shape(c, (p) => p.roundRect(bagX - s(10), bagY - s(7), s(20), s(16), s(4)), linear(c, 0, bagY - s(7), 0, bagY + s(9), [[0, '#b8703e'], [1, '#7a4422']]), INK, lw * 0.7);
    shape(c, (p) => p.roundRect(bagX - s(10), bagY - s(7), s(20), s(8), s(4)), '#d08a50', INK, lw * 0.5);
    shape(c, ellipse(bagX, bagY + s(1), s(2.2), s(2.2)), '#ffd25a', INK, lw * 0.3);
  }
}

function head(c: Ctx, sk: Skin, st: Stage, hx: number, hy: number, R: number, lw: number, wind: number, hit: number): void {
  const sn: [number, number, number, number, number] = [hx + R * 0.72, hy + R * 0.3, R * 0.6, R * 0.45, -0.08];
  const outline = (p: Ctx) => {
    oval(p, hx, hy, R * 1.04, R * 0.98);
    oval(p, ...sn);
  };
  celShape(c, outline, sk.base, sk.dark, R * 0.16, lw);
  c.save();
  c.beginPath();
  outline(c);
  c.clip();
  c.fillStyle = cel(c, 0, hy + R * 0.35, 0, hy + R * 0.9, sk.belly, sk.bellyDark, 0.6);
  c.beginPath();
  c.ellipse(hx + R * 0.72, hy + R * 0.66, R * 0.68, R * 0.3, -0.08, 0, TAU);
  c.fill();
  c.restore();
  gloss(c, hx - R * 0.3, hy - R * 0.55, R * 0.38, R * 0.18, 0.5, -0.3);

  // mouth
  const open = Math.max(hit, 0);
  const mx = hx + R * 0.85;
  const my = hy + R * 0.52;
  if (open > 0.05) {
    shape(c, ellipse(mx, my + R * 0.04, R * 0.36, R * (0.07 + 0.24 * open), -0.12), '#5a1424', INK, lw * 0.6);
    shape(c, ellipse(mx - R * 0.08, my + R * (0.1 + 0.14 * open), R * 0.18, R * 0.08 * (0.5 + open)), '#ff7d92', INK, 0);
    if (st > 0) shape(c, poly([[mx - R * 0.22, my - R * 0.08 * open], [mx - R * 0.14, my + R * 0.08], [mx - R * 0.08, my - R * 0.08 * open]]), '#ffffff', INK, 1);
  } else {
    stroke(c, INK, Math.max(1.8, lw * 0.75), (p) => { p.moveTo(hx + R * 0.45, hy + R * 0.5); p.quadraticCurveTo(hx + R * 0.78, hy + R * 0.68, hx + R * 1.12, hy + R * 0.46); });
    if (st > 0) shape(c, poly([[hx + R * 0.62, hy + R * 0.56], [hx + R * 0.67, hy + R * 0.7], [hx + R * 0.73, hy + R * 0.59]]), '#ffffff', INK, 1);
  }
  for (const [dx, dy] of [[1.08, 0.12], [1.22, 0.16]] as const) shape(c, ellipse(hx + R * dx, hy + R * dy, R * 0.05, R * 0.035), INK, INK, 0);

  // eyes and cheeks
  const er = R * (st === 2 ? 0.33 : st === 1 ? 0.37 : 0.41);
  const closed = wind > 0.45;
  const brow = st === 0 ? 0 : st === 1 ? (hit > 0.1 ? lw * 0.8 : 0) : lw * 0.9;
  cuteEye(c, hx + R * 0.66, hy - R * 0.12, er * 0.84, sk.iris, closed, brow * 0.8);
  cuteEye(c, hx + R * 0.02, hy - R * 0.06, er, sk.iris, closed, brow);
  c.save();
  c.fillStyle = radial(c, hx - R * 0.08, hy + R * 0.42, R * 0.2, [[0, 'rgba(255,120,150,0.55)'], [1, 'rgba(255,120,150,0)']]);
  c.beginPath();
  c.ellipse(hx - R * 0.08, hy + R * 0.42, R * 0.2, R * 0.12, 0, 0, TAU);
  c.fill();
  c.restore();
}
