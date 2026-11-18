// Laboratório de criaturas: three art directions for the Braseiro line (level 1 → level 3), each drawn
// with a pose so it can attack. Lab-only until the player picks one; the chosen style then moves into
// src/view/art/creatures.ts and gets baked into attack frames for the game.
// Original designs, painted like the rest of the game.
import { blush, circle, ellipse, eyes, glow, gloss, INK, linear, poly, radial, roundRect, shape, type Ctx } from '../view/art/paint';

/** t: seconds (idle motion). atk: attack progress 0..1, or < 0 when not attacking. */
export interface Pose {
  t: number;
  atk: number;
}
export interface Form {
  name: string;
  draw: (c: Ctx, cx: number, fy: number, p: Pose) => void;
}
export interface Style {
  id: string;
  title: string;
  blurb: string;
  forms: Form[];
}

type P2 = [number, number];
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const mix = (a: P2, b: P2, t: number): P2 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
const fl = (t: number, s: number, a: number) => Math.sin(t * 7.3 + s) * a + Math.sin(t * 11.1 + s * 2.3) * a * 0.5;

/** Attack phases: wind = gathering (0→1→0), hit = release (peaks at 0.45, then fades), shot = projectile 0→1. */
export function phases(atk: number): { wind: number; hit: number; shot: number } {
  if (atk < 0 || atk > 1) return { wind: 0, hit: 0, shot: -1 };
  const wind = atk < 0.35 ? 1 - (1 - atk / 0.35) ** 2 : atk < 0.45 ? 1 - (atk - 0.35) / 0.1 : 0;
  const hit = atk < 0.35 ? 0 : atk < 0.45 ? (atk - 0.35) / 0.1 : (1 - clamp01((atk - 0.45) / 0.5)) ** 2;
  const shot = atk < 0.42 || atk > 0.85 ? -1 : (atk - 0.42) / 0.43;
  return { wind, hit, shot };
}

const FIRE: [number, string][] = [
  [0, '#fffbe6'],
  [0.25, '#ffe27a'],
  [0.6, '#ff9a35'],
  [1, '#e2401c'],
];

/** Teardrop: a round base of radius w centred at (x, y), tip h above (leaning sideways by `lean`). */
function dropPath(x: number, y: number, w: number, h: number, lean: number): (p: Ctx) => void {
  return (p) => {
    p.moveTo(x - w, y);
    p.bezierCurveTo(x - w, y - h * 0.5, x + lean * 0.35 - w * 0.45, y - h * 0.75, x + lean, y - h);
    p.bezierCurveTo(x + lean * 0.35 + w * 0.45, y - h * 0.75, x + w, y - h * 0.5, x + w, y);
    p.arc(x, y, w, 0, Math.PI);
    p.closePath();
  };
}

export function flame(c: Ctx, x: number, y: number, w: number, h: number, lean = 0, lw = 2.5): void {
  shape(c, dropPath(x, y, w, h, lean), radial(c, x, y - w * 0.3, h, FIRE), INK, lw);
  shape(c, dropPath(x, y - w * 0.1, w * 0.5, h * 0.55, lean * 0.6), 'rgba(255,248,214,0.9)', INK, 0);
}

export function fireball(c: Ctx, x: number, y: number, r: number, alpha = 1): void {
  c.save();
  c.globalAlpha = alpha;
  glow(c, x, y, r * 2.8, 0xff8a2e, 0.85);
  shape(
    c,
    (p) => {
      p.moveTo(x - r * 3.2, y);
      p.quadraticCurveTo(x - r, y - r * 1.3, x, y - r);
      p.arc(x, y, r, -Math.PI / 2, Math.PI / 2);
      p.quadraticCurveTo(x - r, y + r * 1.3, x - r * 3.2, y);
    },
    linear(c, x - r * 3.2, 0, x + r, 0, [
      [0, 'rgba(255,90,26,0)'],
      [0.5, '#ff7a2e'],
      [1, '#ffe27a'],
    ]),
    INK,
    0,
  );
  shape(c, circle(x, y, r * 0.7), radial(c, x, y, r * 0.7, [[0, '#ffffff'], [1, '#ffd06a']]), INK, 0);
  c.restore();
}

/** A shot that flies to the right from (x0, y0); `arc` lifts it like a lob. */
function shotAt(c: Ctx, x0: number, y0: number, r: number, shot: number, arc = 6): void {
  if (shot < 0) return;
  const a = shot > 0.75 ? 1 - (shot - 0.75) / 0.25 : 1;
  fireball(c, x0 + shot * 72, y0 - Math.sin(shot * Math.PI) * arc + shot * arc * 0.6, r * (1 - shot * 0.15), a);
}

/** A tapering limb/tail along a quadratic curve a → (b) → d. */
export function limb(c: Ctx, a: P2, b: P2, d: P2, w0: number, w1: number, fill: string | CanvasGradient, lw = 3): void {
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
  shape(
    c,
    (p) => {
      poly([...left, ...right.reverse()])(p);
      p.moveTo(d[0] + w1 / 2, d[1]);
      p.arc(d[0], d[1], w1 / 2, 0, Math.PI * 2);
    },
    fill,
    INK,
    lw,
  );
}

function coal(c: Ctx, x: number, y: number, rx: number, ry: number): void {
  shape(c, ellipse(x, y, rx, ry), linear(c, x, y - ry, x, y + ry, [[0, '#5e4a58'], [1, '#1e1620']]), INK, 2.5);
  c.save();
  c.strokeStyle = '#ffb347';
  c.shadowColor = '#ff7a2e';
  c.shadowBlur = 6;
  c.lineWidth = 2;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(x - rx * 0.5, y - ry * 0.2);
  c.lineTo(x - rx * 0.1, y + ry * 0.25);
  c.lineTo(x + rx * 0.35, y - ry * 0.1);
  c.stroke();
  c.restore();
}

/** Glowing ember strokes (markings, cracks). */
function emberLines(c: Ctx, lines: P2[][], w = 3): void {
  c.save();
  c.strokeStyle = '#ffa63d';
  c.shadowColor = '#ff6a1a';
  c.shadowBlur = 8;
  c.lineWidth = w;
  c.lineCap = 'round';
  c.lineJoin = 'round';
  for (const l of lines) {
    c.beginPath();
    c.moveTo(l[0]![0], l[0]![1]);
    if (l.length === 3) c.quadraticCurveTo(l[1]![0], l[1]![1], l[2]![0], l[2]![1]);
    else for (const q of l.slice(1)) c.lineTo(q[0], q[1]);
    c.stroke();
  }
  c.restore();
}

function squint(c: Ctx, x: number, y: number, spread: number, r: number): void {
  c.save();
  c.strokeStyle = INK;
  c.lineWidth = Math.max(2.5, r * 0.45);
  c.lineCap = 'round';
  c.lineJoin = 'round';
  for (const s of [-1, 1]) {
    const ex = x + s * spread;
    c.beginPath();
    c.moveTo(ex - s * r, y - r * 0.7);
    c.lineTo(ex + s * r * 0.8, y);
    c.lineTo(ex - s * r, y + r * 0.7);
    c.stroke();
  }
  c.restore();
}

function openMouth(c: Ctx, x: number, y: number, w: number, open: number, fangs = false): void {
  if (open < 0.15) {
    c.save();
    c.strokeStyle = INK;
    c.lineWidth = 2.5;
    c.lineCap = 'round';
    c.beginPath();
    c.arc(x, y - w * 0.3, w * 0.45, 0.25 * Math.PI, 0.75 * Math.PI);
    c.stroke();
    c.restore();
    return;
  }
  shape(c, ellipse(x, y + w * 0.1, w * 0.55, w * 0.62 * open), '#5a1408', INK, 2);
  shape(c, ellipse(x, y + w * 0.1 + w * 0.35 * open, w * 0.3, w * 0.18 * open), '#ff7a6a', INK, 0);
  if (fangs) for (const s of [-1, 1]) shape(c, poly([[x + s * w * 0.32 - 2.5, y + w * 0.1 - w * 0.5 * open], [x + s * w * 0.32 + 2.5, y + w * 0.1 - w * 0.5 * open], [x + s * w * 0.32, y + w * 0.1 - w * 0.5 * open + 6]]), '#ffffff', INK, 1);
}

// ───────────────────────── Opção A — Espírito de chama ─────────────────────────

function spirit(st: 0 | 1 | 2): Form['draw'] {
  return (c, cx, fy, p) => {
    const { wind, hit, shot } = phases(p.atk);
    const W = [19, 26, 30][st]!;
    const H = [58, 84, 112][st]!;
    const bob = Math.sin(p.t * 2.2) * (2 + st);
    const sq = wind * 0.16 - hit * 0.1;
    const w = W * (1 + sq);
    const h = H * (1 - sq) * (1 + hit * 0.1);
    const lean = -wind * W * 0.6 + hit * W * 0.8 + fl(p.t, st, W * 0.12);
    const bx = cx - wind * 4 + hit * 5;
    const by = fy - [20, 26, 46][st]! - w + bob;

    glow(c, bx, by - h * 0.35, h * 0.95, 0xff8a2e, 0.28 + wind * 0.35 + hit * 0.2);
    if (st === 0) {
      glow(c, cx, fy - 8, 26, 0xffa23a, 0.6);
      coal(c, cx, fy - 7, 17, 9);
    } else if (st === 1) {
      glow(c, cx, fy - 10, 34, 0xffa23a, 0.6);
      coal(c, cx - 15, fy - 6, 13, 8);
      coal(c, cx + 15, fy - 6, 13, 8);
      coal(c, cx, fy - 13, 15, 9);
    } else {
      // a swirl of fire instead of a base: it floats on its own tail
      const tip: P2 = [bx - w * 1.4 + fl(p.t, 3, 3), fy - 30];
      limb(c, [bx, by + w * 0.3], [bx + w * 0.9, fy + 2], tip, w * 1.5, 5, radial(c, bx, by, w * 3, FIRE), 3);
      flame(c, tip[0], tip[1], 5, 16, -4 + fl(p.t, 5, 3), 2);
    }

    // orbiting embers (back half first)
    const embers = st === 0 ? 0 : st === 1 ? 3 : 5;
    const ember = (front: boolean) => {
      for (let i = 0; i < embers; i++) {
        const a = p.t * 1.6 + (i * Math.PI * 2) / embers;
        if (Math.sin(a) > 0 !== front) continue;
        const ex = bx + Math.cos(a) * (w + 18);
        const ey = by - h * 0.35 + Math.sin(a) * 9;
        glow(c, ex, ey, 9, 0xffb347, 0.8);
        shape(c, circle(ex, ey, 2.6), '#fff1b0', INK, 0);
      }
    };
    ember(false);

    // hands: floating fire-orbs (Candeia) or slim arms (Fogaréu)
    const restF: P2 = [bx + w + 12, by - h * 0.12 + Math.sin(p.t * 2.2 + 1) * 3];
    const backF: P2 = [bx + w * 1.0, by - h * 0.86];
    const fwdF: P2 = [bx + w + 32, by - h * 0.36];
    const handF = mix(mix(restF, backF, wind), fwdF, hit);
    const restB: P2 = [bx - w - 12, by - h * 0.1 + Math.sin(p.t * 2.2 + 2.5) * 3];
    const handB = mix(mix(restB, [bx - w * 0.5, by - h * 0.7], wind), [bx + w * 0.4, by - h * 0.46], hit);
    const handR = st === 1 ? 7 : 6;
    const hand = (pt: P2, sh: P2, k: number) => {
      if (st === 2) limb(c, sh, [lerp(sh[0], pt[0], 0.5), lerp(sh[1], pt[1], 0.5) + 10], pt, w * 0.36, w * 0.17, radial(c, sh[0], sh[1], 60, FIRE), 2.5);
      flame(c, pt[0], pt[1], handR * k, handR * 2.6 * k * (1 + hit * 0.3), 3 + fl(p.t, pt[0], 2), 2);
    };
    if (st >= 1) hand(handB, [bx - w * 0.7, by - h * 0.3], 0.9);

    // horns (Candeia) / crown (Fogaréu) behind the body
    if (st === 1) for (const s of [-1, 1]) flame(c, bx + s * w * 0.6 + lean * 0.3, by - h * 0.42, w * 0.3, h * 0.42 * (1 + hit * 0.3), s * 7 + lean * 0.4 + fl(p.t, s, 2), 2.5);
    if (st === 2) {
      for (const [o, k] of [[-0.75, 0.32], [-0.38, 0.42], [0.38, 0.42], [0.75, 0.32]] as const) {
        flame(c, bx + o * w * 0.75 + lean * 0.5, by - h * 0.6 + Math.abs(o) * 10, w * 0.26, h * k * (1 + hit * 0.35 + wind * 0.15), o * 14 + lean * 0.5 + fl(p.t, o * 9, 2), 2.5);
      }
    }

    // body
    shape(c, dropPath(bx, by, w, h, lean), radial(c, bx, by - w * 0.2, h * 1.05, FIRE), INK, 3);
    shape(c, dropPath(bx, by - w * 0.05, w * 0.62, h * 0.62, lean * 0.6), 'rgba(255,250,224,0.7)', INK, 0);

    // ember heart (Fogaréu)
    if (st === 2) {
      const hx = bx + lean * 0.05;
      const hy = by - h * 0.08;
      glow(c, hx, hy, 18 + wind * 16 + hit * 10, 0xffe27a, 0.95);
      shape(c, poly([[hx, hy - 11], [hx + 7, hy], [hx, hy + 9], [hx - 7, hy]]), radial(c, hx, hy, 11, [[0, '#ffffff'], [0.5, '#ffd34d'], [1, '#ff7a2e']]), INK, 2);
    }

    // face
    const fx = bx + 3 + hit * 3 - wind * 2 + lean * 0.12;
    const fyy = st === 2 ? by - h * 0.42 : by - w * 0.3;
    const er = w * (st === 2 ? 0.12 : 0.14);
    if (wind > 0.3) squint(c, fx, fyy, w * 0.36, er * 1.2);
    else {
      for (const s of [-1, 1]) {
        const ex = fx + s * w * 0.36 + 1.5;
        const k = hit > 0.3 ? 1.15 : 1;
        shape(c, ellipse(ex, fyy, er * k, er * 1.5 * k), linear(c, 0, fyy - er * 1.5, 0, fyy + er * 1.5, [[0, '#2a0e08'], [1, '#7a2a10']]), INK, 0);
        shape(c, ellipse(ex - er * 0.3, fyy - er * 0.55, er * 0.42, er * 0.38), '#ffffff', INK, 0);
        shape(c, circle(ex + er * 0.35, fyy + er * 0.6, er * 0.18), '#ffffff', INK, 0);
      }
    }
    blush(c, fx, fyy + er * 1.9, w * 0.5, Math.max(3, w * 0.13));
    openMouth(c, fx + 1, fyy + er * 2.3, w * 0.32, hit, false);
    gloss(c, bx - w * 0.45, by - h * 0.35, w * 0.25, w * 0.12, 0.6);

    if (st >= 1) hand(handF, [bx + w * 0.7, by - h * 0.3], 1);
    // charging fire between the hands, then the shot
    if (st >= 1 && wind > 0) fireball(c, handF[0] + 4, handF[1] - 6, [0, 6, 9][st]! * wind, wind);
    ember(true);
    if (st === 0) shotAt(c, fx + w * 0.5, fyy + er * 2.4, 6, shot);
    else shotAt(c, fwdF[0] + 6, fwdF[1] - 6, [0, 8, 11][st]!, shot);
  };
}

// ───────────────────────── Opção B — Felino de brasa ─────────────────────────

function fur(c: Ctx, x0: number, y0: number, x1: number, y1: number): CanvasGradient {
  return linear(c, x0, y0, x1, y1, [[0, '#7a6276'], [0.5, '#4b3850'], [1, '#2a1f30']]);
}
const FUR_LIGHT = '#9c8296';

function cat(st: 0 | 1 | 2): Form['draw'] {
  return (c, cx, fy, p) => {
    const { wind, hit, shot } = phases(p.atk);
    const rx = [20, 21, 25][st]!;
    const ry = [21, 30, 40][st]!;
    const R = [23, 22, 23][st]!;
    const neck = [0, 10, 18][st]!;
    const breathe = Math.sin(p.t * 2.4);
    const crouch = wind * 0.1 - hit * 0.05;
    c.save();
    c.translate(cx, fy);
    c.scale(1 + crouch * 0.6, 1 - crouch);
    c.translate(-cx, -fy);
    const bx = cx - 4;
    const by = fy - ry - 2;

    // tail with a flame at the tip
    const tEnd: P2 = [bx - rx * 1.6 + Math.sin(p.t * 1.7) * 4, by - ry * 0.7 - [12, 22, 32][st]!];
    limb(c, [bx - rx * 0.5, fy - 6], [bx - rx * 2.3, fy - 10], tEnd, [9, 10, 12][st]!, [6, 7, 8][st]!, fur(c, bx - rx * 2, fy, bx, fy - 60), 3);
    flame(c, tEnd[0], tEnd[1] + 3, [5, 7, 9][st]! * (1 + hit * 0.3), [14, 22, 32][st]! * (1 + hit * 0.4 + wind * 0.2), -5 + fl(p.t, 1, 2.5), 2.5);

    // sitting body (pear) with a light chest and ember markings
    shape(
      c,
      (pp) => {
        pp.moveTo(bx, by - ry);
        pp.bezierCurveTo(bx + rx * 0.8, by - ry, bx + rx * 1.15, by + ry * 0.55, bx + rx * 0.95, by + ry);
        pp.lineTo(bx - rx * 0.95, by + ry);
        pp.bezierCurveTo(bx - rx * 1.15, by + ry * 0.55, bx - rx * 0.8, by - ry, bx, by - ry);
        pp.closePath();
      },
      fur(c, bx - rx, by - ry, bx + rx, by + ry),
      INK,
      3,
    );
    shape(c, ellipse(bx + 4, by - ry * 0.15, rx * 0.42, ry * 0.55), FUR_LIGHT, INK, 0);
    emberLines(c, [
      [[bx - rx * 0.85, by - ry * 0.05], [bx - rx * 0.55, by + ry * 0.05], [bx - rx * 0.45, by - ry * 0.2]],
      [[bx - rx * 0.95, by + ry * 0.35], [bx - rx * 0.6, by + ry * 0.45], [bx - rx * 0.5, by + ry * 0.28]],
    ]);
    if (st === 2) {
      const mx = bx + 4;
      const my = by - ry * 0.25;
      glow(c, mx, my, 16 + wind * 12, 0xffd34d, 0.8);
      shape(c, poly([[mx, my - 9], [mx + 6, my], [mx, my + 9], [mx - 6, my]]), radial(c, mx, my, 9, [[0, '#ffffff'], [0.5, '#ffd34d'], [1, '#ff7a2e']]), INK, 2);
    }
    // front legs and paws
    for (const s of [-1, 1]) {
      const lx = bx + s * rx * 0.36 + 3;
      const top = by - ry * 0.05;
      shape(c, roundRect(lx - 5.5, top, 11, fy - 4 - top, 5.5), fur(c, lx, top, lx, fy), INK, 2.5);
      shape(c, ellipse(lx + 1, fy - 4, 8, 5.5), FUR_LIGHT, INK, 2.5);
      c.save();
      c.strokeStyle = INK;
      c.lineWidth = 1.5;
      for (const d of [-2.5, 2.5]) {
        c.beginPath();
        c.moveTo(lx + 1 + d, fy - 7);
        c.lineTo(lx + 1 + d, fy - 2.5);
        c.stroke();
      }
      c.restore();
    }

    // flame mane (Fornalince) / flame collar (Brasino) behind the head
    const hx = bx + 4 + hit * 9 - wind * 3;
    const hy = by - ry - neck * 0.4 - R * 0.6 + wind * 7 - hit * 3 + breathe;
    if (st === 2) {
      for (const o of [-1.3, -0.9, -0.45, 0, 0.45, 0.9, 1.3]) {
        flame(c, hx + o * R * 0.95, hy + R * 1.0 - Math.abs(o) * R * 0.3, R * 0.32, R * (0.75 + Math.abs(o) * 0.4) * (1 + hit * 0.3 + wind * 0.2), o * 10 + fl(p.t, o * 7, 2), 2.5);
      }
    } else if (st === 1) {
      for (const o of [-0.6, 0, 0.6]) flame(c, bx + 4 + o * rx * 0.8, by - ry + 8, 6, 16 * (1 + hit * 0.4), o * 6 + fl(p.t, o * 5, 1.5), 2);
    }

    // head
    const rot = -wind * 0.12 + hit * 0.14;
    c.save();
    c.translate(hx, hy);
    c.rotate(rot);
    const earH = [6, 10, 13][st]!;
    for (const s of [-1, 1]) {
      const tip: P2 = [s * R * 0.82, -R * 1.42 - earH];
      shape(c, poly([[s * R * 0.92, -R * 0.15], [s * R * 0.18, -R * 0.82], tip]), fur(c, 0, -R * 1.6, 0, 0), INK, 2.5);
      shape(c, poly([[s * R * 0.75, -R * 0.35], [s * R * 0.35, -R * 0.8], [s * R * 0.78, -R * 1.25 - earH * 0.8]]), radial(c, s * R * 0.6, -R * 0.6, R, [[0, '#ffd06a'], [1, '#ff6a1a']]), INK, 0);
      flame(c, tip[0], tip[1] + 4, [3.5, 5, 6.5][st]! * (1 + hit * 0.3), [9, 14, 17][st]! * (1 + hit * 0.5 + wind * 0.3), s * 3 + fl(p.t, s * 3, 1.5), 2);
    }
    for (const s of [-1, 1]) shape(c, poly([[s * R * 0.9, -R * 0.1], [s * R * 1.32, R * 0.2], [s * R * 1.0, R * 0.32], [s * R * 1.22, R * 0.5], [s * R * 0.7, R * 0.6]]), fur(c, 0, -R, 0, R), INK, 2.5);
    shape(c, ellipse(0, 0, R * 1.08, R * 0.95), fur(c, -R, -R, R, R), INK, 3);
    shape(c, ellipse(R * 0.16, R * 0.45, R * 0.48, R * 0.32), FUR_LIGHT, INK, 0);
    emberLines(c, [
      [[-R * 0.32, -R * 0.82], [-R * 0.26, -R * 0.55]],
      [[0, -R * 0.9], [0.02 * R, -R * 0.6]],
      [[R * 0.32, -R * 0.82], [R * 0.26, -R * 0.55]],
    ], 2.5);
    if (wind > 0.3) squint(c, R * 0.16, -R * 0.02, R * 0.42, R * 0.2);
    else eyes(c, R * 0.16, -R * 0.05, R * 0.42, R * 0.3, { iris: 0xf0920a, look: 1.6, angry: st > 0 && hit > 0.3 });
    shape(c, poly([[R * 0.08, R * 0.3], [R * 0.26, R * 0.3], [R * 0.17, R * 0.41]]), '#ff8a7a', INK, 1.5);
    if (hit > 0.15) openMouth(c, R * 0.17, R * 0.58, R * 0.5, hit, st > 0);
    else {
      c.strokeStyle = INK;
      c.lineWidth = 2;
      c.lineCap = 'round';
      c.beginPath();
      c.arc(R * 0.08, R * 0.45, R * 0.1, 0.1 * Math.PI, 0.9 * Math.PI);
      c.arc(R * 0.26, R * 0.45, R * 0.1, 0.1 * Math.PI, 0.9 * Math.PI);
      c.stroke();
    }
    if (st < 2) blush(c, R * 0.16, R * 0.3, R * 0.62, R * 0.13);
    gloss(c, -R * 0.4, -R * 0.5, R * 0.3, R * 0.14, 0.45);
    c.restore();
    const mx = hx + Math.cos(rot) * R * 0.17 - Math.sin(rot) * R * 0.58;
    const my = hy + Math.sin(rot) * R * 0.17 + Math.cos(rot) * R * 0.58;
    c.restore();
    shotAt(c, cx + (mx - cx) * (1 + crouch * 0.6) + R * 0.6, fy + (my - fy) * (1 - crouch), [6, 8, 10][st]!, shot);
  };
}

// ───────────────────────── Opção C — Guardião do braseiro ─────────────────────────

function iron(c: Ctx, x0: number, y0: number, x1: number, y1: number): CanvasGradient {
  return linear(c, x0, y0, x1, y1, [[0, '#a3a6c4'], [0.45, '#5f627e'], [1, '#2a2a3e']]);
}

function coalHead(c: Ctx, x: number, y: number, R: number, wind: number, hit: number, t: number, hair: number): void {
  // flame hair first, the head sits in front of it
  const hk = 1 - wind * 0.45 + hit * 0.6;
  const n = hair;
  for (let i = 0; i < n; i++) {
    const o = n === 1 ? 0 : (i / (n - 1)) * 2 - 1;
    flame(c, x + o * R * 0.6, y - R * 0.55 + Math.abs(o) * R * 0.2, R * 0.3, R * (1.3 - Math.abs(o) * 0.45) * hk, o * 8 + fl(t, i, 2), 2.5);
  }
  shape(c, circle(x, y, R), radial(c, x - R * 0.3, y - R * 0.4, R * 1.4, [[0, '#6e5868'], [0.6, '#3a2c3c'], [1, '#1a1220']]), INK, 3);
  emberLines(c, [
    [[x - R * 0.85, y + R * 0.1], [x - R * 0.55, y + R * 0.3], [x - R * 0.6, y + R * 0.6]],
    [[x + R * 0.7, y - R * 0.55], [x + R * 0.5, y - R * 0.35]],
  ], 2.2);
  // glowing ember eyes
  const ex = x + R * 0.12;
  const ey = y - R * 0.05;
  if (wind > 0.3) {
    c.save();
    c.strokeStyle = '#ffd34d';
    c.shadowColor = '#ff7a2e';
    c.shadowBlur = 8;
    c.lineWidth = 3;
    c.lineCap = 'round';
    for (const s of [-1, 1]) {
      c.beginPath();
      c.moveTo(ex + s * R * 0.36 - R * 0.16, ey);
      c.lineTo(ex + s * R * 0.36 + R * 0.16, ey);
      c.stroke();
    }
    c.restore();
  } else {
    for (const s of [-1, 1]) {
      const k = hit > 0.3 ? 1.15 : 1;
      glow(c, ex + s * R * 0.36, ey, R * 0.42, 0xffb347, 0.9);
      shape(c, ellipse(ex + s * R * 0.36, ey, R * 0.15 * k, R * 0.22 * k), radial(c, ex + s * R * 0.36, ey, R * 0.22, [[0, '#ffffff'], [0.6, '#ffe27a'], [1, '#ffa23a']]), INK, 0);
    }
  }
  if (hit > 0.15) {
    glow(c, ex, y + R * 0.45, R * 0.5, 0xff9a2e, 0.9);
    shape(c, ellipse(ex, y + R * 0.42, R * 0.24, R * 0.2 * hit), radial(c, ex, y + R * 0.42, R * 0.25, [[0, '#ffffff'], [1, '#ff8a2e']]), INK, 2);
  } else {
    c.save();
    c.strokeStyle = '#ffb347';
    c.lineWidth = 2.5;
    c.lineCap = 'round';
    c.beginPath();
    c.arc(ex, y + R * 0.2, R * 0.2, 0.2 * Math.PI, 0.8 * Math.PI);
    c.stroke();
    c.restore();
  }
  gloss(c, x - R * 0.4, y - R * 0.5, R * 0.3, R * 0.14, 0.35);
}

function bowl(c: Ctx, x: number, y: number, rx: number, d: number, front: boolean): void {
  if (!front) {
    // the inside of the brazier, glowing
    shape(c, ellipse(x, y, rx, rx * 0.26), radial(c, x, y, rx, [[0, '#ffcf6a'], [0.5, '#c2401a'], [1, '#3a1a20']]), INK, 3);
    return;
  }
  shape(
    c,
    (p) => {
      p.moveTo(x - rx, y);
      p.ellipse(x, y, rx, d, 0, Math.PI, 0, true);
      p.ellipse(x, y, rx, rx * 0.26, 0, 0, Math.PI, false);
      p.closePath();
    },
    iron(c, x - rx, y - d, x + rx * 0.6, y + d),
    INK,
    3,
  );
  // rim band and rivets
  c.save();
  c.strokeStyle = 'rgba(255,255,255,0.35)';
  c.lineWidth = 2;
  c.beginPath();
  c.ellipse(x, y + 5, rx * 0.92, rx * 0.26, 0, 0.1 * Math.PI, 0.9 * Math.PI);
  c.stroke();
  c.restore();
  for (const o of [-0.6, 0, 0.6]) shape(c, circle(x + o * rx, y + d * 0.55 - Math.abs(o) * d * 0.2, 2.6), '#c9cbe0', INK, 1.5);
  gloss(c, x - rx * 0.5, y + d * 0.35, rx * 0.25, d * 0.14, 0.5);
}

function guardian(st: 0 | 1 | 2): Form['draw'] {
  return (c, cx, fy, p) => {
    const { wind, hit, shot } = phases(p.atk);
    const breathe = Math.sin(p.t * 2.4);
    if (st < 2) {
      const rx = st === 0 ? 27 : 36;
      const d = st === 0 ? 20 : 28;
      const yb = fy - (st === 0 ? 22 : 40);
      // legs
      if (st === 0) {
        for (const s of [-1, 1]) limb(c, [cx + s * 14, yb + d * 0.6], [cx + s * 20, fy - 6], [cx + s * 24, fy - 2], 7, 5, iron(c, cx, yb, cx, fy), 2.5);
      } else {
        for (const s of [-1, 1]) {
          shape(c, roundRect(cx + s * 16 - 8, yb + d * 0.5, 16, fy - 6 - (yb + d * 0.5), 6), iron(c, cx + s * 16 - 8, yb, cx + s * 16 + 8, fy), INK, 2.5);
          shape(c, ellipse(cx + s * 16 + 3, fy - 5, 13, 6), iron(c, cx, fy - 11, cx, fy), INK, 2.5);
        }
      }
      // back arm (Fornilho)
      const R = st === 0 ? 18 : 24;
      const hy = yb - R * 0.55 + wind * (st === 0 ? 10 : 6) - hit * 8 + breathe;
      const hx = cx + 2 + hit * 3;
      const sh: P2 = [cx + rx - 4, yb + 2];
      const rest: P2 = [cx + rx + 12, yb + 22];
      const back: P2 = [cx + rx - 8, yb - 30];
      const fwd: P2 = [cx + rx + 30, yb - 14];
      const hand = mix(mix(rest, back, wind), fwd, hit);
      if (st === 1) {
        const shB: P2 = [cx - rx + 4, yb + 2];
        const hB: P2 = [cx - rx - 10, yb + 22 + breathe * 2];
        limb(c, shB, [shB[0] - 8, shB[1] + 12], hB, 11, 9, iron(c, hB[0], shB[1], shB[0], hB[1]), 2.5);
        shape(c, circle(hB[0], hB[1], 8), iron(c, hB[0] - 8, hB[1] - 8, hB[0] + 8, hB[1] + 8), INK, 2.5);
      }
      bowl(c, cx, yb, rx, d, false);
      glow(c, cx, yb - 6, rx * 1.3, 0xff8a2e, 0.45 + wind * 0.4);
      coalHead(c, hx, hy, R, wind, hit, p.t, st === 0 ? 3 : 5);
      bowl(c, cx, yb, rx, d, true);
      if (st === 1) {
        limb(c, sh, [lerp(sh[0], hand[0], 0.5) + 6, lerp(sh[1], hand[1], 0.5) + 6], hand, 11, 9, iron(c, sh[0], sh[1] - 20, hand[0], hand[1] + 10), 2.5);
        shape(c, circle(sh[0], sh[1], 7), '#c9cbe0', INK, 2);
        if (wind > 0) fireball(c, hand[0], hand[1] - 10, 8 * wind, wind);
        shape(c, circle(hand[0], hand[1], 9), iron(c, hand[0] - 9, hand[1] - 9, hand[0] + 9, hand[1] + 9), INK, 2.5);
        shotAt(c, fwd[0] + 8, fwd[1] - 8, 8, shot, 18);
      } else {
        shotAt(c, hx + R + 4, hy - R * 0.2, 6, shot, 26);
      }
      return;
    }

    // Forjador: an iron giant with a living furnace in its chest
    const lean = -wind * 4 + hit * 6;
    const tx = cx + lean;
    const ty = fy - 108;
    for (const s of [-1, 1]) {
      shape(c, roundRect(cx + s * 18 - 10, fy - 44, 20, 38, 8), iron(c, cx + s * 18 - 10, fy - 44, cx + s * 18 + 10, fy), INK, 3);
      shape(c, roundRect(cx + s * 18 - 13, fy - 14, 28, 14, 6), iron(c, cx, fy - 14, cx, fy), INK, 2.5);
    }
    const shF: P2 = [tx + 38, ty + 12];
    const shB: P2 = [tx - 38, ty + 12];
    const rest: P2 = [tx + 46, ty + 62];
    const back: P2 = [tx + 22, ty - 18];
    const fwd: P2 = [tx + 72, ty + 20];
    const fist = mix(mix(rest, back, wind), fwd, hit);
    const fistB: P2 = [tx - 48, ty + 62 + breathe * 2];
    limb(c, shB, [shB[0] - 12, shB[1] + 28], fistB, 18, 14, iron(c, fistB[0] - 10, shB[1], shB[0], fistB[1]), 3);
    shape(c, circle(fistB[0], fistB[1], 13), iron(c, fistB[0] - 13, fistB[1] - 13, fistB[0] + 13, fistB[1] + 13), INK, 3);
    // torso: a barrel-shaped brazier with a grill
    shape(c, roundRect(tx - 36, ty, 72, 70, 22), iron(c, tx - 36, ty, tx + 36, ty + 70), INK, 3.5);
    const heat = 0.55 + wind * 0.45 + hit * 0.3;
    glow(c, tx, ty + 34, 46 * heat, 0xff8a2e, 0.7);
    shape(c, roundRect(tx - 22, ty + 12, 44, 42, 12), radial(c, tx, ty + 40, 34, [[0, '#ffffff'], [0.3 / heat, '#ffe27a'], [0.7, '#ff7a2e'], [1, '#7a1e10']]), INK, 3);
    for (let i = 0; i < 3; i++) flame(c, tx - 12 + i * 12, ty + 50, 5, (16 + (i === 1 ? 8 : 0)) * heat, fl(p.t, i, 2), 0);
    for (const o of [-11, 0, 11]) shape(c, roundRect(tx + o - 2.5, ty + 10, 5, 46, 2.5), iron(c, tx + o, ty + 10, tx + o + 3, ty + 56), INK, 2);
    shape(c, roundRect(tx - 36, ty + 58, 72, 9, 4), '#3a3a52', INK, 2.5);
    for (const o of [-26, 26]) shape(c, circle(tx + o, ty + 8, 2.8), '#c9cbe0', INK, 1.5);
    gloss(c, tx - 22, ty + 6, 14, 5, 0.45);
    // shoulders with vents of fire
    for (const s of [-1, 1]) {
      flame(c, tx + s * 40, ty + 2, 8, 22 * (1 + hit * 0.5 + wind * 0.2), s * 5 + fl(p.t, s, 2), 2.5);
      shape(c, ellipse(tx + s * 38, ty + 12, 17, 13), iron(c, tx + s * 38 - 17, ty, tx + s * 38 + 17, ty + 25), INK, 3);
    }
    // head: a horned helm with a glowing visor and a crest of flame
    const hx = tx + 3 + hit * 4;
    const hy = ty - 14 + wind * 4 - hit * 2 + breathe;
    flame(c, hx - 2, hy - 14, 9, 30 * (1 - wind * 0.3 + hit * 0.6), -3 + fl(p.t, 9, 3), 2.5);
    for (const s of [-1, 1]) shape(c, (pp) => {
      pp.moveTo(hx + s * 12, hy - 8);
      pp.quadraticCurveTo(hx + s * 30, hy - 10, hx + s * 30, hy - 32);
      pp.quadraticCurveTo(hx + s * 22, hy - 16, hx + s * 10, hy - 2);
      pp.closePath();
    }, linear(c, hx, hy - 32, hx, hy, [[0, '#fff3dc'], [1, '#c9b48a']]), INK, 2.5);
    shape(c, roundRect(hx - 18, hy - 16, 36, 32, 14), iron(c, hx - 18, hy - 16, hx + 18, hy + 16), INK, 3);
    glow(c, hx + 2, hy, 20 + hit * 10, 0xffb347, 0.9);
    const vis = wind > 0.3 ? 2 : 5 + hit * 2;
    shape(c, roundRect(hx - 12, hy - vis / 2, 26, vis, vis / 2), linear(c, hx - 12, 0, hx + 14, 0, [[0, '#ffa23a'], [0.5, '#ffffff'], [1, '#ffa23a']]), INK, 2);
    gloss(c, hx - 8, hy - 10, 7, 3, 0.5);
    // front arm and fist
    limb(c, shF, [lerp(shF[0], fist[0], 0.5) + 8, lerp(shF[1], fist[1], 0.5) + 8], fist, 18, 14, iron(c, shF[0], shF[1], fist[0], fist[1]), 3);
    if (wind > 0) fireball(c, fist[0], fist[1] - 14, 11 * wind, wind);
    shape(c, circle(fist[0], fist[1], 14), iron(c, fist[0] - 14, fist[1] - 14, fist[0] + 14, fist[1] + 14), INK, 3);
    emberLines(c, [[[fist[0] - 6, fist[1] - 4], [fist[0] + 6, fist[1] - 4]]], 2);
    shotAt(c, fwd[0] + 12, fwd[1] - 6, 12, shot, 4);
  };
}

// ───────────────────────── Opção D — Dragão ─────────────────────────
// Crimson scales, ivory-gold horns, a glowing ember crystal at the tail tip (no flame on the tail),
// four legs and real wings. It hatches, grows wings, then breathes a stream of fire.

function scales(c: Ctx, x0: number, y0: number, x1: number, y1: number, dark = false): CanvasGradient {
  return dark
    ? linear(c, x0, y0, x1, y1, [[0, '#b23a52'], [0.5, '#7a1834'], [1, '#3e0a22']])
    : linear(c, x0, y0, x1, y1, [[0, '#ee6a78'], [0.5, '#b02a46'], [1, '#5e1030']]);
}
const HORN = (c: Ctx, x0: number, y0: number, x1: number, y1: number) => linear(c, x0, y0, x1, y1, [[0, '#fff6e0'], [1, '#d9a85a']]);

function crystal(c: Ctx, x: number, y: number, r: number, heat: number, rot: number): void {
  glow(c, x, y, r * 3.2, 0xffb347, 0.5 + heat * 0.45);
  c.save();
  c.translate(x, y);
  c.rotate(rot);
  shape(c, poly([[0, -r * 1.7], [r * 0.85, 0], [0, r], [-r * 0.85, 0]]), radial(c, 0, -r * 0.3, r * 1.7, [[0, '#ffffff'], [0.45, '#ffd34d'], [1, '#ff7a2e']]), INK, 2);
  c.restore();
}

function sideEye(c: Ctx, x: number, y: number, r: number, closed: boolean, brow: number): void {
  if (closed) {
    c.save();
    c.strokeStyle = INK;
    c.lineWidth = Math.max(2.5, r * 0.5);
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(x - r, y - r * 0.1);
    c.quadraticCurveTo(x, y + r * 0.6, x + r, y - r * 0.1);
    c.stroke();
    c.restore();
    return;
  }
  shape(c, ellipse(x, y, r * 0.9, r), '#ffffff', INK, 2);
  shape(c, ellipse(x + r * 0.2, y + r * 0.1, r * 0.62, r * 0.78), radial(c, x + r * 0.2, y + r * 0.4, r, [[0, '#ffe27a'], [1, '#e08a10']]), INK, 0);
  shape(c, ellipse(x + r * 0.25, y + r * 0.1, r * 0.16, r * 0.6), '#2a0e08', INK, 0);
  shape(c, circle(x - r * 0.15, y - r * 0.35, r * 0.25), '#ffffff', INK, 0);
  if (brow > 0) {
    c.save();
    c.strokeStyle = INK;
    c.lineWidth = brow;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(x - r * 1.1, y - r * 1.25);
    c.lineTo(x + r * 1.0, y - r * 0.85);
    c.stroke();
    c.restore();
  }
}

function hatchling(c: Ctx, cx: number, fy: number, p: Pose, wind: number, hit: number, shot: number, br: number): void {
  const sy = fy - 22; // shell rim
  const sway = Math.sin(p.t * 1.6) * 3;
  limb(c, [cx - 10, sy + 2], [cx - 34, sy + 2], [cx - 33 + sway, sy - 20], 10, 5, scales(c, cx - 40, sy - 20, cx, sy), 2.5);
  crystal(c, cx - 33 + sway, sy - 25, 4.5, wind, -0.3);
  shape(c, ellipse(cx, sy, 25, 7), '#7a5a48', INK, 2.5); // inside of the shell
  const hy = fy - 52 + wind * 11 - hit * 6 + br;
  shape(c, ellipse(cx, sy - 8 + wind * 6, 17, 16), scales(c, cx - 17, sy - 24, cx + 17, sy + 8), INK, 3);
  for (const s of [-1, 1]) shape(c, poly([[cx - 8 + s * 4, sy - 18 + wind * 6], [cx - 24 + s * 4, sy - 30 + wind * 4 - hit * 4], [cx - 18 + s * 4, sy - 14 + wind * 6]]), linear(c, 0, sy - 30, 0, sy - 14, [[0, '#ffb36a'], [1, '#d8455a']]), INK, 2);
  // head (3/4 view)
  const hx = cx + 4 + hit * 4;
  for (const s of [-1, 1]) shape(c, poly([[hx + s * 8 - 3, hy - 15], [hx + s * 10 - 4, hy - 26], [hx + s * 8 + 4, hy - 16]]), HORN(c, 0, hy - 26, 0, hy - 14), INK, 2);
  shape(
    c,
    (pp) => {
      pp.arc(hx, hy, 19, 0, Math.PI * 2);
      pp.moveTo(hx + 25, hy + 6);
      pp.ellipse(hx + 16, hy + 6, 9, 7.5, 0, 0, Math.PI * 2);
    },
    scales(c, hx - 19, hy - 19, hx + 19, hy + 19),
    INK,
    3,
  );
  shape(c, ellipse(hx + 10, hy + 10, 9, 5), '#ffd9a0', INK, 0);
  if (wind > 0.3) squint(c, hx + 3, hy - 2, 7, 4.5);
  else eyes(c, hx + 3, hy - 2, 7, 6, { iris: 0xe08a10, look: 2 });
  blush(c, hx + 4, hy + 7, 12, 3.5);
  openMouth(c, hx + 15, hy + 10, 9, hit, false);
  for (const d of [12, 19]) shape(c, circle(hx + d, hy + 2, 1.2), INK, INK, 0);
  gloss(c, hx - 8, hy - 9, 6, 3, 0.55);
  // a piece of eggshell still on its head
  c.save();
  c.translate(hx - 7, hy - 15);
  c.rotate(-0.4);
  shape(
    c,
    (pp) => {
      pp.moveTo(-13, 3);
      for (let i = 1; i <= 6; i++) pp.lineTo(-13 + i * (26 / 6), i % 2 ? 8 : 3);
      pp.ellipse(0, 3, 13, 11, 0, 0, Math.PI, true);
      pp.closePath();
    },
    linear(c, 0, -8, 0, 8, [[0, '#fffaf0'], [1, '#e6cfa6']]),
    INK,
    2.5,
  );
  shape(c, ellipse(-4, -2, 2.5, 1.8), '#c23a52', INK, 0);
  c.restore();
  // front of the shell, with a zigzag edge
  shape(
    c,
    (pp) => {
      pp.moveTo(cx - 26, sy);
      for (let i = 1; i <= 8; i++) pp.lineTo(cx - 26 + i * 6.5, i % 2 ? sy - 7 : sy);
      pp.ellipse(cx, sy, 26, 22, 0, 0, Math.PI, false);
      pp.closePath();
    },
    linear(c, cx - 20, sy - 6, cx + 20, sy + 22, [[0, '#fffaf0'], [1, '#d9bd8c']]),
    INK,
    3,
  );
  for (const [x, y, r] of [[-14, 8, 3], [6, 12, 2.5], [14, 4, 2], [-4, 16, 2]] as const) shape(c, ellipse(cx + x, sy + y, r, r * 0.7), '#c23a52', INK, 0);
  gloss(c, cx - 12, sy + 6, 8, 3, 0.6);
  for (const x of [-9, 11]) shape(c, ellipse(cx + x, sy - 2, 5, 3.5), scales(c, 0, sy - 6, 0, sy + 2), INK, 2);
  shotAt(c, hx + 22, hy + 10, 6, shot);
}

function dragon(st: 0 | 1 | 2): Form['draw'] {
  return (c, cx, fy, p) => {
    const { wind, hit, shot } = phases(p.atk);
    const br = Math.sin(p.t * 2.4);
    if (st === 0) return hatchling(c, cx, fy, p, wind, hit, shot, br);
    const k = st === 1 ? 1 : 1.4;
    const T: P2 = [cx - 8 * k, fy - 31 * k + br * 0.8];
    const rx = 29 * k;
    const ry = 16 * k;
    const sway = Math.sin(p.t * 1.5) * 4;

    // tail, ending in an ember crystal
    const tEnd: P2 = [T[0] - rx * 1.9 + sway, T[1] - 20 * k];
    limb(c, [T[0] - rx * 0.6, T[1] + 2 * k], [T[0] - rx * 1.7, fy - 2 * k], tEnd, 15 * k, 4 * k, scales(c, tEnd[0], tEnd[1], T[0], fy), 3);
    crystal(c, tEnd[0] - 1 * k, tEnd[1] - 5 * k, 5.5 * k, wind, -0.5);

    // wings
    const lift = wind * 12 * k - hit * 10 * k + br * 2 * k;
    const spread = st === 2 ? 1 : 0.5;
    const wing = (dx: number, dy: number, dark: boolean) => {
      const S: P2 = [T[0] + 4 * k + dx, T[1] - 11 * k + dy];
      const E: P2 = [S[0] - (6 + 18 * spread) * k, S[1] - (26 + 22 * spread) * k - lift];
      const tips: P2[] = [
        [E[0] - (10 + 30 * spread) * k, E[1] + 4 * k],
        [E[0] - (12 + 34 * spread) * k, E[1] + (18 + 6 * spread) * k + lift * 0.3],
        [E[0] - (8 + 26 * spread) * k, E[1] + (30 + 12 * spread) * k + lift * 0.5],
      ];
      const root: P2 = [T[0] - 16 * k + dx, T[1] - 9 * k + dy];
      shape(
        c,
        (pp) => {
          pp.moveTo(S[0], S[1]);
          pp.lineTo(E[0], E[1]);
          pp.lineTo(tips[0]![0], tips[0]![1]);
          const all = [...tips, root];
          for (let i = 1; i < all.length; i++) {
            const a = all[i - 1]!;
            const b = all[i]!;
            pp.quadraticCurveTo(lerp((a[0] + b[0]) / 2, E[0], 0.28), lerp((a[1] + b[1]) / 2, E[1], 0.28), b[0], b[1]);
          }
          pp.closePath();
        },
        linear(c, E[0], E[1], root[0], root[1] + 10 * k, dark ? [[0, '#c86a50'], [1, '#7a2040']] : [[0, '#ffb36a'], [0.6, '#e2604a'], [1, '#b02a46']]),
        INK,
        2.5,
      );
      c.save();
      c.strokeStyle = INK;
      c.lineCap = 'round';
      c.lineWidth = 2;
      for (const t of tips) {
        c.beginPath();
        c.moveTo(E[0], E[1]);
        c.lineTo(t[0], t[1]);
        c.stroke();
      }
      c.restore();
      limb(c, S, [lerp(S[0], E[0], 0.5) + 4 * k, lerp(S[1], E[1], 0.5)], E, 7 * k, 4.5 * k, scales(c, E[0], E[1], S[0], S[1], dark), 2.5);
      shape(c, poly([[E[0] - 2 * k, E[1]], [E[0] + 2 * k, E[1] - 8 * k], [E[0] + 3 * k, E[1] + 1 * k]]), HORN(c, 0, E[1] - 8 * k, 0, E[1]), INK, 1.5);
    };
    wing(10 * k, -4 * k, true);

    // legs: far side first (darker)
    const leg = (x: number, dark: boolean, hind = false) => {
      const hip: P2 = [x, T[1] + 2 * k];
      if (hind) shape(c, ellipse(x + 2 * k, T[1] + 1 * k, 12 * k, 14 * k, -0.3), scales(c, x, T[1] - 14 * k, x, T[1] + 14 * k, dark), INK, 2.5);
      const foot: P2 = [x + 3 * k, fy - 5 * k];
      limb(c, hip, [x - 5 * k, lerp(hip[1], foot[1], 0.5)], foot, 15 * k, 9 * k, scales(c, x, hip[1], x, fy, dark), 2.5);
      shape(c, ellipse(foot[0] + 3 * k, fy - 3.5 * k, 8.5 * k, 4.5 * k), scales(c, 0, fy - 8 * k, 0, fy, dark), INK, 2.5);
      for (const d of [0, 4, 8]) shape(c, poly([[foot[0] + (d + 1) * k, fy - 2 * k], [foot[0] + (d + 5) * k, fy - 1 * k], [foot[0] + (d + 2) * k, fy + 1.5 * k]]), HORN(c, 0, fy - 2, 0, fy + 2), INK, 1.2);
    };
    leg(T[0] - rx * 0.45 + 7 * k, true, true);
    leg(T[0] + rx * 0.55 + 7 * k, true);

    // back spikes (Dragão: ember crystals)
    for (let i = 0; i < 4; i++) {
      const dx = -0.55 + i * 0.32;
      const x = T[0] + dx * rx;
      const y = T[1] - ry * Math.sqrt(1 - dx * dx) + 2 * k;
      if (st === 2) crystal(c, x, y - 3 * k, 3.5 * k, wind * 0.6, 0.15);
      else shape(c, poly([[x - 4 * k, y + 2 * k], [x, y - 7 * k], [x + 4 * k, y + 2 * k]]), HORN(c, 0, y - 7 * k, 0, y + 2 * k), INK, 1.8);
    }

    // body
    shape(c, ellipse(T[0], T[1], rx, ry), scales(c, T[0], T[1] - ry, T[0], T[1] + ry), INK, 3);
    shape(c, ellipse(T[0] + 5 * k, T[1] + ry * 0.45, rx * 0.72, ry * 0.42), linear(c, 0, T[1], 0, T[1] + ry, [[0, '#ffe7a0'], [1, '#f0a84a']]), INK, 0);
    c.save();
    c.strokeStyle = 'rgba(160,80,30,0.55)';
    c.lineWidth = 1.5;
    for (let i = -2; i <= 2; i++) {
      c.beginPath();
      c.moveTo(T[0] + 5 * k + i * rx * 0.24, T[1] + ry * 0.1);
      c.lineTo(T[0] + 5 * k + i * rx * 0.24, T[1] + ry * 0.82);
      c.stroke();
    }
    c.restore();
    glow(c, T[0] + rx * 0.55, T[1] - 2 * k, (14 + wind * 16) * k, 0xffc24a, wind * 0.9);
    gloss(c, T[0] - rx * 0.3, T[1] - ry * 0.5, rx * 0.3, ry * 0.18, 0.45);
    leg(T[0] - rx * 0.45, false, true);
    leg(T[0] + rx * 0.55, false);

    // neck and head
    const H: P2 = [T[0] + rx + (st === 2 ? 20 : 12) * k + hit * 10 * k - wind * 10 * k, T[1] - (st === 2 ? 44 : 34) * k - wind * 5 * k + hit * 4 * k + br];
    const N0: P2 = [T[0] + rx * 0.62, T[1] - ry * 0.35];
    limb(c, N0, [N0[0] + 4 * k, H[1] + 10 * k], [H[0] - 4 * k, H[1] + 2 * k], 17 * k, 11 * k, scales(c, N0[0], H[1], N0[0] + 10 * k, N0[1]), 3);
    wing(0, 0, false);
    const R = 11 * k;
    // horns (swept back)
    const horn = (y0: number, len: number, w: number) =>
      shape(
        c,
        (pp) => {
          pp.moveTo(H[0] - 2 * k, H[1] + y0 - w);
          pp.quadraticCurveTo(H[0] - len * 0.5, H[1] + y0 - w * 2.2, H[0] - len, H[1] + y0 - len * 0.55);
          pp.quadraticCurveTo(H[0] - len * 0.45, H[1] + y0 - w * 0.3, H[0] - 4 * k, H[1] + y0 + w);
          pp.closePath();
        },
        HORN(c, H[0] - len, 0, H[0], 0),
        INK,
        2,
      );
    horn(-7 * k, (st === 2 ? 26 : 16) * k, 3.5 * k);
    if (st === 2) horn(-1 * k, 18 * k, 2.6 * k);
    // jaw opens on the attack
    const hinge: P2 = [H[0] + 2 * k, H[1] + 5 * k];
    const ang = hit * 0.55;
    const jawTip: P2 = [hinge[0] + Math.cos(ang) * 19 * k - Math.sin(ang) * 2 * k, hinge[1] + Math.sin(ang) * 19 * k + Math.cos(ang) * 2 * k];
    const U: P2 = [H[0] + 22 * k, H[1] + 5 * k];
    if (hit > 0.05) shape(c, poly([hinge, U, jawTip]), '#5a1408', INK, 2);
    limb(c, hinge, [lerp(hinge[0], jawTip[0], 0.5), lerp(hinge[1], jawTip[1], 0.5) + 2 * k], jawTip, 9 * k, 5 * k, scales(c, 0, hinge[1], 0, jawTip[1] + 5 * k), 2.5);
    shape(
      c,
      (pp) => {
        pp.arc(H[0], H[1], R, 0, Math.PI * 2);
        pp.moveTo(H[0] + 24 * k, H[1] + 1 * k);
        pp.ellipse(H[0] + 12 * k, H[1] + 1 * k, 12 * k, 7.5 * k, 0, 0, Math.PI * 2);
      },
      scales(c, H[0] - R, H[1] - R, H[0] + R, H[1] + R),
      INK,
      3,
    );
    if (hit > 0.2) for (const d of [10, 16]) shape(c, poly([[H[0] + d * k - 2 * k, H[1] + 7.5 * k], [H[0] + d * k + 2 * k, H[1] + 7.5 * k], [H[0] + d * k, H[1] + 11 * k]]), '#ffffff', INK, 1);
    for (const d of [-1, 1]) shape(c, poly([[H[0] - 8 * k, H[1] + (2 + d * 3) * k], [H[0] - 17 * k, H[1] + (5 + d * 5) * k], [H[0] - 7 * k, H[1] + (6 + d * 2) * k]]), scales(c, 0, H[1], 0, H[1] + 10 * k, true), INK, 1.8);
    shape(c, ellipse(H[0] + 20 * k, H[1] - 1.5 * k, 1.8 * k, 1.2 * k), INK, INK, 0);
    sideEye(c, H[0] + 3 * k, H[1] - 3 * k, 4.6 * k, wind > 0.3, st === 2 ? 3.5 : 2.5);
    gloss(c, H[0] - 3 * k, H[1] - 7 * k, 5 * k, 2.5 * k, 0.5);

    // attack: a stream of fire (Dragão) or a fireball (Dragonete)
    const M: P2 = [U[0] + 2 * k, U[1] + 3 * k + hit * 3 * k];
    if (st === 2 && hit > 0.1) {
      const L = 80 * Math.min(1, hit * 1.6);
      glow(c, M[0] + L * 0.5, M[1] + L * 0.1, L * 0.55, 0xff8a2e, 0.7 * hit);
      shape(
        c,
        (pp) => {
          pp.moveTo(M[0], M[1] - 3 * k);
          pp.quadraticCurveTo(M[0] + L * 0.6, M[1] - L * 0.12, M[0] + L, M[1] - L * 0.08 + fl(p.t, 1, 3));
          pp.quadraticCurveTo(M[0] + L * 1.08, M[1] + L * 0.1, M[0] + L, M[1] + L * 0.3);
          pp.quadraticCurveTo(M[0] + L * 0.6, M[1] + L * 0.24, M[0], M[1] + 3 * k);
          pp.closePath();
        },
        linear(c, M[0], 0, M[0] + L, 0, [[0, '#ffffff'], [0.3, '#ffe27a'], [0.7, '#ff8a2e'], [1, 'rgba(226,64,28,0.6)']]),
        INK,
        0,
      );
    } else if (st === 1) {
      if (wind > 0.2) glow(c, U[0], U[1], 10 * wind * k, 0xffb347, 0.8);
      shotAt(c, M[0] + 4, M[1], 8, shot);
    }
  };
}

export const STYLES: Style[] = [
  {
    id: 'A',
    title: 'Opção A — Espírito de chama',
    blurb: 'Uma chama viva que flutua. Ganha mãos de fogo e depois braços e coroa. Ataque: encolhe, junta fogo nas mãos e lança.',
    forms: [
      { name: 'Pavio', draw: spirit(0) },
      { name: 'Candeia', draw: spirit(1) },
      { name: 'Fogaréu', draw: spirit(2) },
    ],
  },
  {
    id: 'B',
    title: 'Opção B — Felino de brasa',
    blurb: 'Um gato de carvão com marcas de brasa. Cresce esguio até virar um lince com juba de fogo. Ataque: se encolhe e cospe fogo.',
    forms: [
      { name: 'Tição', draw: cat(0) },
      { name: 'Brasino', draw: cat(1) },
      { name: 'Fornalince', draw: cat(2) },
    ],
  },
  {
    id: 'C',
    title: 'Opção C — Guardião do braseiro',
    blurb: 'O próprio braseiro ganha vida: um carvãozinho na bacia que vira um gigante de ferro com fornalha no peito. Ataque: arremessa brasas.',
    forms: [
      { name: 'Carvãozinho', draw: guardian(0) },
      { name: 'Fornilho', draw: guardian(1) },
      { name: 'Forjador', draw: guardian(2) },
    ],
  },
  {
    id: 'D',
    title: 'Opção D — Dragão',
    blurb: 'Nasce de um ovo de brasa, ganha asas e vira um dragão de escamas rubras com cristais de fogo nas costas e na cauda. Ataque: cospe bola de fogo e, no fim, um jato de chamas.',
    forms: [
      { name: 'Casquinho', draw: dragon(0) },
      { name: 'Asabrasa', draw: dragon(1) },
      { name: 'Rubidraco', draw: dragon(2) },
    ],
  },
];
