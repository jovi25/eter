import * as Phaser from 'phaser';
import { ASSETS, type AssetKey } from '../../assets/manifest';
import {
  blush,
  circle,
  ellipse,
  eyes,
  gloss,
  glow,
  hex,
  INK,
  linear,
  poly,
  radial,
  roundRect,
  shade,
  shape,
  smile,
  softShadow,
  star,
  type Ctx,
} from './paint';

type Drawer = { w: number; h: number; draw: (ctx: Ctx, cx: number, cy: number) => void };

/** Vertical body gradient: light top-left → base → dark bottom. */
function bodyGrad(ctx: Ctx, cx: number, cy: number, r: number, base: number): CanvasGradient {
  return radial(ctx, cx, cy + r * 0.2, r * 1.25, [
    [0, hex(shade(base, 0.35))],
    [0.55, hex(base)],
    [1, hex(shade(base, -0.35))],
  ], cx - r * 0.35, cy - r * 0.45);
}

function stoneGrad(ctx: Ctx, x0: number, y0: number, x1: number, y1: number): CanvasGradient {
  return linear(ctx, x0, y0, x1, y1, [
    [0, '#b9b4cf'],
    [0.5, '#8a85a0'],
    [1, '#5c5772'],
  ]);
}

const DRAW: Record<AssetKey, Drawer> = {
  // ─────────── generic ───────────
  px: { w: 4, h: 4, draw: (c) => ((c.fillStyle = '#fff'), c.fillRect(0, 0, 4, 4)) },
  spark: {
    w: 32,
    h: 32,
    draw: (c, cx, cy) => {
      c.fillStyle = radial(c, cx, cy, 16, [
        [0, 'rgba(255,255,255,1)'],
        [0.3, 'rgba(255,255,255,0.7)'],
        [1, 'rgba(255,255,255,0)'],
      ]);
      c.fillRect(0, 0, 32, 32);
    },
  },
  ring: {
    w: 128,
    h: 128,
    draw: (c, cx, cy) => {
      c.strokeStyle = 'rgba(255,255,255,0.35)';
      c.lineWidth = 14;
      c.beginPath();
      c.arc(cx, cy, 54, 0, Math.PI * 2);
      c.stroke();
      c.strokeStyle = '#fff';
      c.lineWidth = 6;
      c.stroke();
    },
  },
  shadow: { w: 72, h: 28, draw: (c, cx, cy) => softShadow(c, cx, cy, 34, 12, 0.4) },
  coin: {
    w: 40,
    h: 40,
    draw: (c, cx, cy) => {
      shape(c, circle(cx, cy + 1.5, 16), '#a8730f', INK, 2.5);
      shape(c, circle(cx, cy - 1, 15), radial(c, cx, cy, 16, [[0, '#fff3a8'], [0.5, '#ffd34d'], [1, '#e09a14']], cx - 5, cy - 7), INK, 0);
      c.strokeStyle = 'rgba(160,100,10,0.8)';
      c.lineWidth = 2.5;
      c.beginPath();
      c.arc(cx, cy - 1, 10, 0, Math.PI * 2);
      c.stroke();
      shape(c, star(c, cx, cy - 1, 6, 0.45), '#fff4b8', INK, 0);
      gloss(c, cx - 6, cy - 8, 6, 3, 0.9);
    },
  },
  heart: {
    w: 44,
    h: 40,
    draw: (c, cx, cy) => {
      const path = (k: Ctx) => {
        k.moveTo(cx, cy + 15);
        k.bezierCurveTo(cx - 24, cy, cx - 18, cy - 20, cx, cy - 9);
        k.bezierCurveTo(cx + 18, cy - 20, cx + 24, cy, cx, cy + 15);
      };
      shape(c, path, radial(c, cx, cy, 22, [[0, '#ff8a9a'], [0.6, '#ff4d5e'], [1, '#c22843']], cx - 8, cy - 8), INK, 3);
      gloss(c, cx - 8, cy - 6, 6, 4, 0.9);
    },
  },
  star: {
    w: 76,
    h: 76,
    draw: (c, cx, cy) => {
      glow(c, cx, cy, 36, 0xffd34d, 0.5);
      shape(c, star(c, cx, cy, 30), radial(c, cx, cy, 30, [[0, '#fff6c2'], [0.5, '#ffd34d'], [1, '#e8951a']], cx - 8, cy - 10), INK, 3.5);
      gloss(c, cx - 7, cy - 8, 8, 5, 0.9);
    },
  },
  starEmpty: {
    w: 76,
    h: 76,
    draw: (c, cx, cy) => shape(c, star(c, cx, cy, 30), linear(c, 0, cy - 30, 0, cy + 30, [[0, '#5d4f7d'], [1, '#3a2f55']]), INK, 3.5),
  },

  // ─────────── map ───────────
  slot: {
    w: 104,
    h: 96,
    draw: (c, cx, cy) => {
      softShadow(c, cx, cy + 14, 46, 18, 0.35);
      shape(c, ellipse(cx, cy + 8, 42, 30), '#4e4964', INK, 3);
      shape(c, ellipse(cx, cy, 42, 30), stoneGrad(c, cx - 30, cy - 30, cx + 30, cy + 30), INK, 3);
      c.strokeStyle = 'rgba(160,140,255,0.55)';
      c.lineWidth = 2.5;
      c.setLineDash([6, 5]);
      c.beginPath();
      c.ellipse(cx, cy, 30, 20, 0, 0, Math.PI * 2);
      c.stroke();
      c.setLineDash([]);
      c.fillStyle = 'rgba(255,255,255,0.85)';
      c.beginPath();
      c.roundRect(cx - 3, cy - 12, 6, 24, 3);
      c.roundRect(cx - 12, cy - 3, 24, 6, 3);
      c.fill();
      gloss(c, cx - 16, cy - 12, 14, 6, 0.4, -0.2);
    },
  },
  portal: {
    w: 150,
    h: 150,
    draw: (c, cx, cy) => {
      glow(c, cx, cy, 74, 0x9b5cff, 0.7);
      c.fillStyle = radial(c, cx, cy, 44, [[0, '#0a0418'], [0.7, '#2a0f55'], [1, 'rgba(90,47,194,0)']]);
      c.beginPath();
      c.arc(cx, cy, 46, 0, Math.PI * 2);
      c.fill();
      for (let i = 0; i < 5; i++) {
        c.strokeStyle = i % 2 ? 'rgba(200,160,255,0.9)' : 'rgba(120,70,230,0.95)';
        c.lineWidth = 7 - i;
        c.lineCap = 'round';
        c.beginPath();
        c.arc(cx, cy, 58 - i * 9, (i * Math.PI) / 2.5, (i * Math.PI) / 2.5 + Math.PI * 1.3);
        c.stroke();
      }
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        glow(c, cx + Math.cos(a) * 52, cy + Math.sin(a) * 52, 5, 0xe0c8ff, 1);
      }
    },
  },
  crystal: {
    w: 130,
    h: 180,
    draw: (c, cx, cy) => {
      glow(c, cx, cy, 64, 0xa77bff, 0.5);
      const top = cy - 78;
      const bot = cy + 80;
      shape(c, poly([[cx, top], [cx + 50, cy - 12], [cx, bot], [cx - 50, cy - 12]]), '#7d4dff', INK, 4);
      // facets
      c.fillStyle = linear(c, cx - 50, 0, cx, 0, [[0, '#b597ff'], [1, '#8d5cff']]);
      c.beginPath();
      c.moveTo(cx, top); c.lineTo(cx - 50, cy - 12); c.lineTo(cx - 14, cy - 12); c.closePath(); c.fill();
      c.fillStyle = '#e6d9ff';
      c.beginPath();
      c.moveTo(cx, top); c.lineTo(cx - 14, cy - 12); c.lineTo(cx + 14, cy - 12); c.closePath(); c.fill();
      c.fillStyle = '#6a3be0';
      c.beginPath();
      c.moveTo(cx, top); c.lineTo(cx + 14, cy - 12); c.lineTo(cx + 50, cy - 12); c.closePath(); c.fill();
      c.fillStyle = linear(c, 0, cy - 12, 0, bot, [[0, '#9a74ff'], [1, '#4a20b0']]);
      c.beginPath();
      c.moveTo(cx - 50, cy - 12); c.lineTo(cx - 14, cy - 12); c.lineTo(cx, bot); c.closePath(); c.fill();
      c.fillStyle = linear(c, 0, cy - 12, 0, bot, [[0, '#c2a8ff'], [1, '#6a3be0']]);
      c.beginPath();
      c.moveTo(cx - 14, cy - 12); c.lineTo(cx + 14, cy - 12); c.lineTo(cx, bot); c.closePath(); c.fill();
      c.fillStyle = linear(c, 0, cy - 12, 0, bot, [[0, '#7a4cf0'], [1, '#3a1590']]);
      c.beginPath();
      c.moveTo(cx + 14, cy - 12); c.lineTo(cx + 50, cy - 12); c.lineTo(cx, bot); c.closePath(); c.fill();
      gloss(c, cx - 18, cy - 34, 10, 5, 1, -1);
      glow(c, cx + 8, cy - 46, 6, 0xffffff, 1);
    },
  },
  tree: {
    w: 100,
    h: 116,
    draw: (c, cx, cy) => {
      softShadow(c, cx, cy + 46, 38, 12, 0.35);
      shape(c, roundRect(cx - 7, cy + 4, 14, 44, 5), linear(c, cx - 7, 0, cx + 7, 0, [[0, '#8a6038'], [1, '#5a3c20']]), INK, 3);
      const leaf = (x: number, y: number, r: number) =>
        shape(c, circle(x, y, r), radial(c, x, y, r * 1.2, [[0, '#86d36a'], [0.55, '#4fa04a'], [1, '#2f6b34']], x - r * 0.4, y - r * 0.5), INK, 3);
      leaf(cx - 22, cy + 2, 22);
      leaf(cx + 22, cy + 2, 22);
      leaf(cx, cy - 18, 30);
      leaf(cx - 6, cy + 10, 20);
      gloss(c, cx - 10, cy - 32, 12, 6, 0.45);
      for (const [x, y] of [[cx + 12, cy - 8], [cx - 20, cy - 4], [cx + 26, cy + 8]] as const) {
        shape(c, circle(x, y, 4), '#ff6b6b', INK, 1.5);
      }
    },
  },
  rock: {
    w: 60,
    h: 48,
    draw: (c, cx, cy) => {
      softShadow(c, cx, cy + 14, 26, 8, 0.35);
      shape(c, poly([[cx - 24, cy + 12], [cx - 20, cy - 6], [cx - 6, cy - 16], [cx + 14, cy - 12], [cx + 24, cy + 2], [cx + 20, cy + 14]]), stoneGrad(c, cx - 20, cy - 16, cx + 20, cy + 14), INK, 3);
      gloss(c, cx - 8, cy - 8, 9, 4, 0.5);
      c.fillStyle = 'rgba(95,158,74,0.9)';
      c.beginPath();
      c.ellipse(cx + 8, cy - 12, 8, 3.5, 0.2, 0, Math.PI * 2);
      c.fill();
    },
  },
  flower: {
    w: 24,
    h: 24,
    draw: (c, cx, cy) => {
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        shape(c, circle(cx + Math.cos(a) * 5.5, cy + Math.sin(a) * 5.5, 4.2), '#ffffff', 'rgba(29,21,48,0.5)', 1);
      }
      shape(c, circle(cx, cy, 3.5), '#ffd34d', 'rgba(29,21,48,0.5)', 1);
    },
  },

  // ─────────── enemies ───────────
  enemy_slime: {
    w: 76,
    h: 70,
    draw: (c, cx, cy) => {
      const body = (k: Ctx) => {
        k.moveTo(cx - 31, cy + 22);
        k.bezierCurveTo(cx - 36, cy - 6, cx - 18, cy - 24, cx - 2, cy - 25);
        k.quadraticCurveTo(cx + 2, cy - 36, cx + 10, cy - 30);
        k.quadraticCurveTo(cx + 4, cy - 28, cx + 6, cy - 24);
        k.bezierCurveTo(cx + 22, cy - 20, cx + 36, cy - 4, cx + 31, cy + 22);
        k.quadraticCurveTo(cx, cy + 31, cx - 31, cy + 22);
      };
      shape(c, body, bodyGrad(c, cx, cy, 34, 0x3fbf98), INK, 3.5);
      c.save();
      c.beginPath();
      body(c);
      c.clip();
      c.fillStyle = 'rgba(20,90,80,0.35)';
      c.beginPath();
      c.ellipse(cx, cy + 26, 34, 10, 0, 0, Math.PI * 2);
      c.fill();
      c.restore();
      gloss(c, cx - 14, cy - 10, 12, 6, 0.85);
      glow(c, cx + 16, cy - 4, 3, 0xffffff, 0.9);
      eyes(c, cx, cy + 4, 11, 7.5);
      blush(c, cx, cy + 14, 19, 5);
      smile(c, cx, cy + 17, 6);
    },
  },
  enemy_wolf: {
    w: 76,
    h: 70,
    draw: (c, cx, cy) => {
      for (const s of [-1, 1]) {
        shape(c, poly([[cx + s * 26, cy - 2], [cx + s * 15, cy - 32], [cx + s * 3, cy - 10]]), hex(0x8790a8), INK, 3);
        c.fillStyle = '#ffa3b8';
        c.beginPath();
        c.moveTo(cx + s * 20, cy - 6); c.lineTo(cx + s * 15, cy - 25); c.lineTo(cx + s * 8, cy - 10); c.closePath();
        c.fill();
      }
      shape(c, ellipse(cx, cy + 6, 28, 24), bodyGrad(c, cx, cy + 6, 28, 0x9aa3bd), INK, 3.5);
      // forehead tuft
      shape(c, poly([[cx - 8, cy - 16], [cx - 2, cy - 26], [cx + 2, cy - 17], [cx + 8, cy - 24], [cx + 9, cy - 13]]), hex(0xb7bfd6), INK, 2.5);
      shape(c, ellipse(cx, cy + 16, 14, 10), radial(c, cx, cy + 14, 14, [[0, '#ffffff'], [1, '#d6dbe8']]), INK, 2.5);
      shape(c, ellipse(cx, cy + 11, 4.5, 3.2), INK, INK, 0);
      gloss(c, cx - 1.5, cy + 10, 1.8, 1, 0.9, 0);
      c.strokeStyle = INK;
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(cx, cy + 14); c.lineTo(cx, cy + 18);
      c.moveTo(cx - 5, cy + 20); c.quadraticCurveTo(cx, cy + 23, cx + 5, cy + 20);
      c.stroke();
      eyes(c, cx, cy + 0, 11, 6, { angry: true, iris: 0x5a3a12 });
      gloss(c, cx - 14, cy - 6, 8, 4, 0.5);
    },
  },
  enemy_golem: {
    w: 92,
    h: 88,
    draw: (c, cx, cy) => {
      for (const s of [-1, 1]) shape(c, ellipse(cx + s * 36, cy + 12, 10, 14, s * 0.3), stoneGrad(c, cx - 40, cy, cx + 40, cy + 26), INK, 3);
      shape(c, roundRect(cx - 32, cy - 30, 64, 64, 20), radial(c, cx, cy, 44, [[0, '#c4ad92'], [0.6, '#957d64'], [1, '#5f4c3a']], cx - 14, cy - 18), INK, 3.5);
      // moss cap
      shape(c, (k) => {
        k.moveTo(cx - 30, cy - 14);
        k.bezierCurveTo(cx - 28, cy - 34, cx + 24, cy - 38, cx + 30, cy - 16);
        k.quadraticCurveTo(cx + 18, cy - 22, cx + 10, cy - 16);
        k.quadraticCurveTo(cx, cy - 24, cx - 10, cy - 16);
        k.quadraticCurveTo(cx - 20, cy - 22, cx - 30, cy - 14);
      }, radial(c, cx, cy - 30, 30, [[0, '#8fd36a'], [1, '#3f8a3a']], cx - 8, cy - 34), INK, 2.5);
      c.strokeStyle = 'rgba(60,40,25,0.8)';
      c.lineWidth = 2.5;
      c.beginPath();
      c.moveTo(cx - 22, cy + 22); c.lineTo(cx - 12, cy + 12); c.lineTo(cx - 14, cy + 4);
      c.moveTo(cx + 18, cy + 26); c.lineTo(cx + 24, cy + 12);
      c.stroke();
      glow(c, cx, cy + 20, 10, 0x6fe6ff, 0.8);
      shape(c, poly([[cx, cy + 13], [cx + 5, cy + 20], [cx, cy + 27], [cx - 5, cy + 20]]), '#bff4ff', INK, 1.5);
      eyes(c, cx, cy - 2, 12, 6.5);
      gloss(c, cx - 16, cy - 6, 10, 5, 0.35);
    },
  },
  enemy_bat: {
    w: 92,
    h: 64,
    draw: (c, cx, cy) => {
      for (const s of [-1, 1]) {
        shape(c, (k) => {
          k.moveTo(cx + s * 10, cy - 8);
          k.quadraticCurveTo(cx + s * 30, cy - 26, cx + s * 44, cy - 14);
          k.quadraticCurveTo(cx + s * 40, cy - 2, cx + s * 42, cy + 8);
          k.quadraticCurveTo(cx + s * 34, cy + 2, cx + s * 28, cy + 12);
          k.quadraticCurveTo(cx + s * 22, cy + 4, cx + s * 14, cy + 10);
          k.closePath();
        }, linear(c, cx, cy - 20, cx + s * 44, cy + 10, [[0, '#5a3a8c'], [1, '#2e1c50']]), INK, 3);
        c.strokeStyle = 'rgba(160,120,220,0.6)';
        c.lineWidth = 1.5;
        c.beginPath();
        c.moveTo(cx + s * 14, cy - 6); c.lineTo(cx + s * 28, cy + 8);
        c.moveTo(cx + s * 16, cy - 10); c.lineTo(cx + s * 40, cy + 4);
        c.stroke();
      }
      for (const s of [-1, 1]) shape(c, poly([[cx + s * 15, cy - 8], [cx + s * 11, cy - 28], [cx + s * 3, cy - 13]]), hex(0x7b5cb8), INK, 2.5);
      shape(c, circle(cx, cy, 19), bodyGrad(c, cx, cy, 19, 0x7b5cb8), INK, 3.5);
      eyes(c, cx, cy - 2, 7.5, 5.5, { iris: 0x8a1f3a });
      c.fillStyle = '#fff';
      c.strokeStyle = INK;
      c.lineWidth = 1.5;
      for (const s of [-1, 1]) {
        c.beginPath();
        c.moveTo(cx + s * 2, cy + 8); c.lineTo(cx + s * 6, cy + 8); c.lineTo(cx + s * 4, cy + 13); c.closePath();
        c.fill(); c.stroke();
      }
      blush(c, cx, cy + 7, 12, 3.5);
      gloss(c, cx - 7, cy - 9, 7, 4, 0.6);
    },
  },
  enemy_herald: {
    w: 140,
    h: 140,
    draw: (c, cx, cy) => {
      glow(c, cx, cy, 70, 0x9ff3ff, 0.45);
      shape(c, poly([[cx - 50, cy + 52], [cx + 50, cy + 52], [cx + 22, cy - 10], [cx - 22, cy - 10]]), linear(c, 0, cy - 10, 0, cy + 52, [[0, '#3a56a8'], [1, '#1b2a60']]), INK, 3.5);
      shape(c, circle(cx, cy + 6, 38), bodyGrad(c, cx, cy + 6, 38, 0x7ccfff), INK, 4);
      const spikes: [number, number][] = [[-26, 20], [-13, 30], [0, 42], [13, 30], [26, 20]];
      for (const [x, h] of spikes) {
        shape(c, poly([[cx + x - 8, cy - 24], [cx + x + 8, cy - 24], [cx + x, cy - 26 - h]]), linear(c, 0, cy - 26 - h, 0, cy - 24, [[0, '#ffffff'], [1, '#8fdcff']]), INK, 2.5);
      }
      shape(c, roundRect(cx - 32, cy - 28, 64, 10, 5), linear(c, 0, cy - 28, 0, cy - 18, [[0, '#ffe680'], [1, '#d6a020']]), INK, 2.5);
      glow(c, cx, cy - 23, 5, 0x6fe6ff, 1);
      c.fillStyle = '#0b1a3a';
      for (const s of [-1, 1]) {
        c.beginPath();
        c.ellipse(cx + s * 14, cy + 6, 9, 7, s * 0.25, 0, Math.PI * 2);
        c.fill();
        glow(c, cx + s * 14, cy + 6, 8, 0x7ff6ff, 1);
      }
      c.strokeStyle = INK;
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(cx - 8, cy + 24); c.quadraticCurveTo(cx, cy + 20, cx + 8, cy + 24);
      c.stroke();
      gloss(c, cx - 16, cy - 8, 14, 7, 0.7);
    },
  },

  // ─────────── statuses ───────────
  status_roots: {
    w: 92,
    h: 44,
    draw: (c, cx, cy) => {
      c.strokeStyle = '#4a3a1f';
      c.lineWidth = 7;
      c.beginPath();
      c.ellipse(cx, cy + 6, 36, 13, 0, 0, Math.PI * 2);
      c.stroke();
      c.strokeStyle = '#6fbf3f';
      c.lineWidth = 4;
      c.stroke();
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2;
        const x = cx + Math.cos(a) * 36;
        const y = cy + 6 + Math.sin(a) * 13;
        c.strokeStyle = INK;
        c.lineWidth = 6;
        c.lineCap = 'round';
        c.beginPath();
        c.moveTo(x, y); c.quadraticCurveTo(x - 6, y - 10, x + 2, y - 16);
        c.stroke();
        c.strokeStyle = '#5cbf3f';
        c.lineWidth = 3.5;
        c.stroke();
        shape(c, ellipse(x + 5, y - 17, 5, 2.8, -0.5), '#8fe060', INK, 1.5);
      }
    },
  },
  status_ice: {
    w: 76,
    h: 76,
    draw: (c, cx, cy) => {
      shape(c, poly([[cx - 30, cy - 22], [cx - 10, cy - 34], [cx + 26, cy - 28], [cx + 34, cy + 6], [cx + 20, cy + 32], [cx - 18, cy + 32], [cx - 34, cy + 8]]),
        linear(c, cx - 30, cy - 30, cx + 30, cy + 30, [[0, 'rgba(220,250,255,0.6)'], [0.5, 'rgba(110,210,255,0.35)'], [1, 'rgba(60,160,230,0.5)']]), 'rgba(40,140,210,0.95)', 2.5);
      c.strokeStyle = 'rgba(255,255,255,0.85)';
      c.lineWidth = 3;
      c.lineCap = 'round';
      c.beginPath();
      c.moveTo(cx - 22, cy - 20); c.lineTo(cx - 8, cy - 27);
      c.moveTo(cx + 18, cy - 18); c.lineTo(cx + 26, cy - 4);
      c.stroke();
      glow(c, cx + 20, cy - 22, 6, 0xffffff, 0.9);
    },
  },
  status_fragile: {
    w: 28,
    h: 28,
    draw: (c, cx, cy) => {
      shape(c, circle(cx, cy, 11), radial(c, cx, cy, 12, [[0, '#e6a8ff'], [1, '#9b3fd9']], cx - 3, cy - 4), INK, 2.5);
      c.strokeStyle = '#fff';
      c.lineWidth = 2.5;
      c.lineJoin = 'round';
      c.beginPath();
      c.moveTo(cx - 1, cy - 7); c.lineTo(cx + 3, cy - 1); c.lineTo(cx - 3, cy + 2); c.lineTo(cx + 1, cy + 7);
      c.stroke();
    },
  },

  // ─────────── towers ───────────
  tower_base: {
    w: 110,
    h: 90,
    draw: (c, cx, cy) => {
      softShadow(c, cx, cy + 22, 52, 18, 0.45);
      shape(c, (k) => {
        k.moveTo(cx - 42, cy - 2);
        k.lineTo(cx - 42, cy + 14);
        k.ellipse(cx, cy + 14, 42, 18, 0, Math.PI, 0, true);
        k.lineTo(cx + 42, cy - 2);
        k.closePath();
      }, linear(c, cx - 42, 0, cx + 42, 0, [[0, '#6e6888'], [0.4, '#9a95b2'], [1, '#4e4964']]), INK, 3);
      c.strokeStyle = 'rgba(40,30,60,0.45)';
      c.lineWidth = 2;
      for (const x of [-26, -6, 14, 32]) {
        c.beginPath();
        c.moveTo(cx + x, cy + 2); c.lineTo(cx + x, cy + 26);
        c.stroke();
      }
      c.beginPath();
      c.ellipse(cx, cy + 10, 42, 16, 0, 0.1, Math.PI - 0.1);
      c.stroke();
      shape(c, ellipse(cx, cy - 2, 42, 18), stoneGrad(c, cx - 30, cy - 18, cx + 30, cy + 14), INK, 3);
      gloss(c, cx - 14, cy - 8, 16, 6, 0.4, -0.1);
    },
  },
  tower_archer: {
    w: 92,
    h: 108,
    draw: (c, cx, cy) => {
      shape(c, roundRect(cx - 22, cy - 12, 44, 52, 6), linear(c, cx - 22, 0, cx + 22, 0, [[0, '#c48a52'], [0.5, '#a8743f'], [1, '#7a5028']]), INK, 3);
      c.strokeStyle = 'rgba(70,40,15,0.5)';
      c.lineWidth = 1.5;
      for (const y of [0, 12, 24]) {
        c.beginPath(); c.moveTo(cx - 22, cy + y); c.lineTo(cx + 22, cy + y); c.stroke();
      }
      shape(c, roundRect(cx - 8, cy + 2, 16, 20, 8), '#2b1d12', INK, 2);
      // bow in window
      c.strokeStyle = '#f2e2bc';
      c.lineWidth = 3;
      c.beginPath();
      c.arc(cx - 2, cy + 12, 10, -1.2, 1.2);
      c.stroke();
      c.strokeStyle = 'rgba(255,255,255,0.7)';
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(cx + 1.5, cy + 2.5); c.lineTo(cx + 1.5, cy + 21.5);
      c.stroke();
      // roof
      shape(c, poly([[cx - 34, cy - 10], [cx + 34, cy - 10], [cx, cy - 50]]), linear(c, cx - 34, 0, cx + 34, 0, [[0, '#e86a5a'], [0.5, '#c9504a'], [1, '#8f2f2f']]), INK, 3);
      c.strokeStyle = 'rgba(90,20,20,0.5)';
      c.lineWidth = 2;
      for (const t of [0.35, 0.65]) {
        c.beginPath();
        c.moveTo(cx - 34 * (1 - t) , cy - 10 - 40 * t); c.lineTo(cx + 34 * (1 - t), cy - 10 - 40 * t);
        c.stroke();
      }
      // flag
      c.strokeStyle = INK;
      c.lineWidth = 2.5;
      c.beginPath(); c.moveTo(cx, cy - 50); c.lineTo(cx, cy - 64); c.stroke();
      shape(c, poly([[cx, cy - 64], [cx + 16, cy - 60], [cx, cy - 55]]), '#ffd34d', INK, 1.5);
      gloss(c, cx - 12, cy - 24, 10, 4, 0.45);
    },
  },
  tower_brazier: {
    w: 92,
    h: 108,
    draw: (c, cx, cy) => {
      for (const s of [-1, 1]) {
        c.strokeStyle = INK; c.lineWidth = 7; c.lineCap = 'round';
        c.beginPath(); c.moveTo(cx + s * 10, cy + 12); c.lineTo(cx + s * 20, cy + 38); c.stroke();
        c.strokeStyle = '#5a5470'; c.lineWidth = 4; c.stroke();
      }
      shape(c, (k) => {
        k.moveTo(cx - 32, cy + 2);
        k.quadraticCurveTo(cx - 30, cy + 26, cx, cy + 26);
        k.quadraticCurveTo(cx + 30, cy + 26, cx + 32, cy + 2);
        k.closePath();
      }, linear(c, cx - 32, 0, cx + 32, 0, [[0, '#6a6380'], [0.45, '#9a92b5'], [1, '#3e3852']]), INK, 3);
      shape(c, ellipse(cx, cy + 2, 32, 8), radial(c, cx, cy + 2, 30, [[0, '#ffdd66'], [0.5, '#ff7a2e'], [1, '#7a2a10']]), INK, 2.5);
      glow(c, cx, cy - 18, 40, 0xff7a2e, 0.55);
      const flame = (s: number, stops: [number, string][]) =>
        shape(c, (k) => {
          k.moveTo(cx - 20 * s, cy);
          k.bezierCurveTo(cx - 26 * s, cy - 20 * s, cx - 6 * s, cy - 26 * s, cx - 4 * s, cy - 50 * s);
          k.bezierCurveTo(cx + 8 * s, cy - 34 * s, cx + 24 * s, cy - 28 * s, cx + 20 * s, cy);
          k.closePath();
        }, linear(c, 0, cy - 50 * s, 0, cy, stops), INK, s > 0.9 ? 2.5 : 0);
      flame(1, [[0, '#ffb347'], [1, '#ff4a1a']]);
      flame(0.7, [[0, '#fff0a0'], [1, '#ff9d2e']]);
      flame(0.4, [[0, '#ffffff'], [1, '#ffe27a']]);
      for (const [x, y] of [[cx - 18, cy - 44], [cx + 16, cy - 52], [cx + 4, cy - 62]] as const) glow(c, x, y, 4, 0xffd34d, 1);
    },
  },
  tower_frost: {
    w: 92,
    h: 116,
    draw: (c, cx, cy) => {
      glow(c, cx, cy - 6, 44, 0x6fe6ff, 0.45);
      const shard = (ox: number, oy: number, s: number) => {
        const top = cy + oy - 40 * s;
        const pts: [number, number][] = [[cx + ox, top], [cx + ox + 14 * s, cy + oy - 6 * s], [cx + ox, cy + oy + 24 * s], [cx + ox - 14 * s, cy + oy - 6 * s]];
        shape(c, poly(pts), linear(c, cx + ox - 14 * s, top, cx + ox + 14 * s, cy + oy + 24 * s, [[0, '#e8fdff'], [0.45, '#7fe8ff'], [1, '#2a8fd0']]), INK, 3);
        c.fillStyle = 'rgba(255,255,255,0.55)';
        c.beginPath();
        c.moveTo(cx + ox, top); c.lineTo(cx + ox - 14 * s, cy + oy - 6 * s); c.lineTo(cx + ox - 3 * s, cy + oy - 6 * s); c.closePath();
        c.fill();
      };
      shard(-22, 14, 0.62);
      shard(22, 16, 0.58);
      shard(0, 6, 1.15);
      glow(c, cx - 4, cy - 26, 6, 0xffffff, 1);
      glow(c, cx + 22, cy - 4, 4, 0xffffff, 1);
    },
  },
  tower_vine: {
    w: 92,
    h: 108,
    draw: (c, cx, cy) => {
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + (i * Math.PI * 2) / 5;
        const x = cx + Math.cos(a) * 28;
        const y = cy + Math.sin(a) * 24;
        shape(c, ellipse(x, y, 17, 10, a), linear(c, x - 15, y - 10, x + 15, y + 10, [[0, '#9ae66a'], [1, '#3f8f45']]), INK, 2.5);
        c.strokeStyle = 'rgba(40,100,40,0.7)';
        c.lineWidth = 1.5;
        c.beginPath();
        c.moveTo(x - Math.cos(a) * 12, y - Math.sin(a) * 7); c.lineTo(x + Math.cos(a) * 12, y + Math.sin(a) * 7);
        c.stroke();
      }
      shape(c, circle(cx, cy, 22), bodyGrad(c, cx, cy, 22, 0x4fa04a), INK, 3);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        shape(c, ellipse(cx + Math.cos(a) * 9, cy - 2 + Math.sin(a) * 9, 7, 5, a), radial(c, cx, cy - 2, 16, [[0, '#ffd6ea'], [1, '#ff6fb0']]), INK, 1.5);
      }
      shape(c, circle(cx, cy - 2, 5.5), '#ffd34d', INK, 1.5);
      gloss(c, cx - 8, cy - 10, 6, 3, 0.7);
    },
  },
  tower_storm: {
    w: 92,
    h: 120,
    draw: (c, cx, cy) => {
      shape(c, poly([[cx - 16, cy + 36], [cx + 16, cy + 36], [cx + 7, cy - 22], [cx - 7, cy - 22]]), linear(c, cx - 16, 0, cx + 16, 0, [[0, '#5c5778'], [0.5, '#8a85a8'], [1, '#3e3a55']]), INK, 3);
      for (const [y, w] of [[22, 22], [8, 18], [-6, 15]] as const) {
        shape(c, ellipse(cx, cy + y, w, 5.5), linear(c, cx - w, 0, cx + w, 0, [[0, '#a8501e'], [0.45, '#ffb36b'], [1, '#7a3410']]), INK, 2.5);
      }
      glow(c, cx, cy - 36, 36, 0xffe95c, 0.7);
      shape(c, circle(cx, cy - 36, 15), radial(c, cx, cy - 36, 16, [[0, '#ffffff'], [0.45, '#fff3a0'], [1, '#ffc21a']], cx - 4, cy - 41), INK, 3);
      c.strokeStyle = '#fffbd0';
      c.lineWidth = 2.5;
      c.lineJoin = 'round';
      for (const [dx, dy, s] of [[-1, -1, 1], [1, -0.4, -1], [0.4, 1, 1]] as const) {
        c.beginPath();
        c.moveTo(cx + dx * 16, cy - 36 + dy * 16);
        c.lineTo(cx + dx * 24 + s * 4, cy - 36 + dy * 22);
        c.lineTo(cx + dx * 28, cy - 36 + dy * 30 + s * 2);
        c.stroke();
      }
      gloss(c, cx - 5, cy - 41, 5, 3, 0.9);
    },
  },
  pip: {
    w: 18,
    h: 18,
    draw: (c, cx, cy) => {
      shape(c, star(c, cx, cy, 7.5, 0.5), radial(c, cx, cy, 8, [[0, '#fff3a8'], [1, '#f0a020']]), INK, 2);
    },
  },

  // ─────────── projectiles (pointing right) ───────────
  proj_physical: {
    w: 40,
    h: 12,
    draw: (c, cx, cy) => {
      c.strokeStyle = INK; c.lineWidth = 5; c.lineCap = 'round';
      c.beginPath(); c.moveTo(4, cy); c.lineTo(30, cy); c.stroke();
      c.strokeStyle = '#a8743f'; c.lineWidth = 2.5; c.stroke();
      shape(c, poly([[28, cy - 5], [39, cy], [28, cy + 5]]), '#e8eef8', INK, 1.5);
      shape(c, poly([[2, cy - 5], [9, cy], [2, cy + 5], [6, cy]]), '#ffffff', INK, 1.2);
      void cx;
    },
  },
  proj_fire: {
    w: 36,
    h: 36,
    draw: (c, cx, cy) => {
      glow(c, cx, cy, 18, 0xff5a1f, 0.8);
      shape(c, circle(cx, cy, 9), radial(c, cx, cy, 10, [[0, '#ffffff'], [0.4, '#ffe27a'], [1, '#ff7a2e']], cx - 2, cy - 2), 'rgba(122,42,16,0.9)', 1.5);
    },
  },
  proj_ice: {
    w: 34,
    h: 18,
    draw: (c, cx, cy) => {
      glow(c, cx, cy, 14, 0x6fe6ff, 0.6);
      shape(c, poly([[cx - 15, cy], [cx + 2, cy - 6], [cx + 15, cy], [cx + 2, cy + 6]]), linear(c, cx - 15, 0, cx + 15, 0, [[0, '#ffffff'], [1, '#4fc6e8']]), INK, 1.5);
    },
  },
  proj_nature: {
    w: 30,
    h: 20,
    draw: (c, cx, cy) => {
      glow(c, cx, cy, 12, 0x6ad44a, 0.5);
      shape(c, ellipse(cx, cy, 11, 6), linear(c, 0, cy - 6, 0, cy + 6, [[0, '#b6f08a'], [1, '#3f8f45']]), INK, 1.5);
      c.strokeStyle = '#2f6b34'; c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(cx - 8, cy); c.lineTo(cx + 8, cy); c.stroke();
    },
  },

  // ─────────── ui icons ───────────
  icon_pause: {
    w: 40,
    h: 40,
    draw: (c, cx, cy) => {
      shape(c, roundRect(cx - 12, cy - 14, 9, 28, 3), '#fff', 'rgba(29,21,48,0.6)', 1.5);
      shape(c, roundRect(cx + 3, cy - 14, 9, 28, 3), '#fff', 'rgba(29,21,48,0.6)', 1.5);
    },
  },
  icon_speed: {
    w: 48,
    h: 40,
    draw: (c, cx, cy) => {
      shape(c, poly([[cx - 20, cy - 13], [cx - 20, cy + 13], [cx, cy]]), '#fff', 'rgba(29,21,48,0.6)', 1.5);
      shape(c, poly([[cx, cy - 13], [cx, cy + 13], [cx + 20, cy]]), '#fff', 'rgba(29,21,48,0.6)', 1.5);
    },
  },
  icon_play: { w: 40, h: 40, draw: (c, cx, cy) => shape(c, poly([[cx - 10, cy - 14], [cx - 10, cy + 14], [cx + 14, cy]]), '#fff', 'rgba(29,21,48,0.6)', 1.5) },
};

/** Paint every procedural asset once into the texture cache. */
export function generateTextures(scene: Phaser.Scene): void {
  for (const key of Object.keys(ASSETS) as AssetKey[]) {
    const src = ASSETS[key];
    if (src.kind !== 'procedural' || scene.textures.exists(key)) continue;
    const d = DRAW[key];
    const tex = scene.textures.createCanvas(key, d.w, d.h);
    if (!tex) continue;
    const ctx = tex.getContext();
    ctx.clearRect(0, 0, d.w, d.h);
    d.draw(ctx, d.w / 2, d.h / 2);
    tex.refresh();
  }
}

/** Image-based assets (none yet). Call from a scene's preload(). */
export function preloadImages(scene: Phaser.Scene): void {
  for (const key of Object.keys(ASSETS) as AssetKey[]) {
    const src = ASSETS[key] as { kind: string; url?: string };
    if (src.kind === 'image' && src.url) scene.load.image(key, src.url);
  }
}

// Palette helper re-export for callers that tint by element.
export { hex };
