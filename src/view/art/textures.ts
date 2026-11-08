import * as Phaser from 'phaser';
import { ASSETS, type AssetKey } from '../../assets/manifest';
import { PAL } from './palette';

type G = Phaser.GameObjects.Graphics;
type Drawer = { w: number; h: number; draw: (g: G, cx: number, cy: number) => void };

const V = (x: number, y: number) => new Phaser.Math.Vector2(x, y);

function eyes(g: G, cx: number, cy: number, spread: number, size: number, look = 0): void {
  for (const sx of [-1, 1]) {
    const x = cx + sx * spread;
    g.fillStyle(0xffffff, 1);
    g.fillEllipse(x, cy, size * 1.6, size * 2);
    g.fillStyle(PAL.ink, 1);
    g.fillCircle(x + look, cy + size * 0.2, size * 0.62);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(x + look - size * 0.25, cy - size * 0.25, size * 0.24);
  }
}

function blush(g: G, cx: number, cy: number, spread: number): void {
  g.fillStyle(0xff8fa8, 0.55);
  g.fillEllipse(cx - spread, cy, 10, 6);
  g.fillEllipse(cx + spread, cy, 10, 6);
}

const DRAW: Record<AssetKey, Drawer> = {
  // ─────────── generic ───────────
  px: { w: 4, h: 4, draw: (g) => (g.fillStyle(0xffffff, 1), g.fillRect(0, 0, 4, 4)) },
  spark: {
    w: 32,
    h: 32,
    draw: (g, cx, cy) => {
      for (let r = 16; r > 0; r -= 2) {
        g.fillStyle(0xffffff, 0.12 + (1 - r / 16) * 0.5);
        g.fillCircle(cx, cy, r);
      }
    },
  },
  ring: { w: 128, h: 128, draw: (g, cx, cy) => (g.lineStyle(8, 0xffffff, 1), g.strokeCircle(cx, cy, 58)) },
  shadow: { w: 64, h: 24, draw: (g, cx, cy) => (g.fillStyle(0x000000, 0.28), g.fillEllipse(cx, cy, 60, 20)) },
  coin: {
    w: 36,
    h: 36,
    draw: (g, cx, cy) => {
      g.fillStyle(0x9c6a12, 1);
      g.fillCircle(cx, cy + 1, 16);
      g.fillStyle(PAL.gold, 1);
      g.fillCircle(cx, cy - 1, 15);
      g.fillStyle(0xfff0a8, 1);
      g.fillCircle(cx - 4, cy - 5, 5);
      g.lineStyle(3, 0xc8901c, 1);
      g.strokeCircle(cx, cy - 1, 10);
    },
  },
  heart: {
    w: 40,
    h: 36,
    draw: (g, cx, cy) => {
      const heart = (s: number, color: number) => {
        g.fillStyle(color, 1);
        g.fillCircle(cx - 8 * s, cy - 4 * s, 10 * s);
        g.fillCircle(cx + 8 * s, cy - 4 * s, 10 * s);
        g.fillTriangle(cx - 17.5 * s, cy, cx + 17.5 * s, cy, cx, cy + 16 * s);
      };
      heart(1.05, PAL.ink);
      heart(0.9, PAL.red);
      g.fillStyle(0xffffff, 0.7);
      g.fillCircle(cx - 9, cy - 7, 3.5);
    },
  },
  star: { w: 72, h: 72, draw: (g, cx, cy) => drawStar(g, cx, cy, PAL.gold, 0xfff3b0) },
  starEmpty: { w: 72, h: 72, draw: (g, cx, cy) => drawStar(g, cx, cy, 0x4a3d66, 0x5d4f7d) },

  // ─────────── map ───────────
  slot: {
    w: 96,
    h: 96,
    draw: (g, cx, cy) => {
      g.fillStyle(0x000000, 0.2);
      g.fillEllipse(cx, cy + 6, 84, 70);
      g.fillStyle(PAL.stoneDark, 1);
      g.fillEllipse(cx, cy + 2, 80, 66);
      g.fillStyle(PAL.stone, 1);
      g.fillEllipse(cx, cy - 2, 74, 58);
      g.fillStyle(0xb2adc6, 1);
      g.fillEllipse(cx - 8, cy - 8, 34, 18);
      g.fillStyle(0xffffff, 0.75);
      g.fillRoundedRect(cx - 3, cy - 14, 6, 24, 3);
      g.fillRoundedRect(cx - 12, cy - 5, 24, 6, 3);
    },
  },
  portal: {
    w: 140,
    h: 140,
    draw: (g, cx, cy) => {
      for (let i = 0; i < 6; i++) {
        g.lineStyle(10 - i, i % 2 ? 0x9b5cff : 0x5a2fc2, 0.9);
        g.beginPath();
        g.arc(cx, cy, 60 - i * 9, (i * Math.PI) / 3, (i * Math.PI) / 3 + Math.PI * 1.4);
        g.strokePath();
      }
      g.fillStyle(0x2a0f55, 0.85);
      g.fillCircle(cx, cy, 16);
    },
  },
  crystal: {
    w: 120,
    h: 170,
    draw: (g, cx, cy) => {
      const pts = (s: number, oy = 0) => [V(cx, cy - 75 * s + oy), V(cx + 48 * s, cy - 10 * s + oy), V(cx, cy + 78 * s + oy), V(cx - 48 * s, cy - 10 * s + oy)];
      g.fillStyle(PAL.ink, 1);
      g.fillPoints(pts(1.08), true);
      g.fillStyle(0x7d4dff, 1);
      g.fillPoints(pts(1), true);
      g.fillStyle(0xd9c6ff, 0.6);
      g.fillPoints([V(cx, cy - 75), V(cx + 15, cy - 10), V(cx, cy + 78), V(cx - 15, cy - 10)], true);
      g.fillStyle(0xffffff, 0.9);
      g.fillCircle(cx - 12, cy - 28, 6);
    },
  },
  tree: {
    w: 90,
    h: 100,
    draw: (g, cx, cy) => {
      g.fillStyle(0x000000, 0.18);
      g.fillEllipse(cx, cy + 40, 70, 20);
      g.fillStyle(0x6b4a2b, 1);
      g.fillRect(cx - 6, cy + 10, 12, 30);
      const blob = (x: number, y: number, r: number, c: number) => (g.fillStyle(c, 1), g.fillCircle(x, y, r));
      blob(cx, cy - 8, 34, PAL.ink);
      blob(cx - 16, cy + 2, 22, 0x2f6b34);
      blob(cx + 16, cy + 2, 22, 0x2f6b34);
      blob(cx, cy - 12, 28, 0x3f8f45);
      blob(cx - 8, cy - 20, 14, 0x63b55c);
    },
  },
  rock: {
    w: 56,
    h: 44,
    draw: (g, cx, cy) => {
      g.fillStyle(0x000000, 0.2);
      g.fillEllipse(cx, cy + 12, 48, 14);
      g.fillStyle(PAL.ink, 1);
      g.fillEllipse(cx, cy, 50, 36);
      g.fillStyle(0x8e8aa3, 1);
      g.fillEllipse(cx, cy - 2, 44, 30);
      g.fillStyle(0xbab6cc, 1);
      g.fillEllipse(cx - 8, cy - 8, 18, 9);
    },
  },
  flower: {
    w: 20,
    h: 20,
    draw: (g, cx, cy) => {
      g.fillStyle(0xffffff, 1);
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        g.fillCircle(cx + Math.cos(a) * 5, cy + Math.sin(a) * 5, 4);
      }
      g.fillStyle(PAL.gold, 1);
      g.fillCircle(cx, cy, 3.5);
    },
  },

  // ─────────── enemies (cute silhouettes: body + eyes) ───────────
  enemy_slime: {
    w: 64,
    h: 56,
    draw: (g, cx, cy) => {
      g.fillStyle(PAL.ink, 1);
      g.fillEllipse(cx, cy + 6, 54, 44);
      g.fillCircle(cx, cy - 8, 17);
      g.fillStyle(0x56c9a5, 1);
      g.fillEllipse(cx, cy + 6, 48, 38);
      g.fillCircle(cx, cy - 8, 13);
      g.fillStyle(0x9af0d0, 1);
      g.fillEllipse(cx - 12, cy - 2, 12, 8);
      eyes(g, cx, cy + 4, 9, 5);
      blush(g, cx, cy + 14, 15);
    },
  },
  enemy_wolf: {
    w: 64,
    h: 56,
    draw: (g, cx, cy) => {
      g.fillStyle(PAL.ink, 1);
      g.fillTriangle(cx - 24, cy - 2, cx - 12, cy - 28, cx - 2, cy - 6);
      g.fillTriangle(cx + 24, cy - 2, cx + 12, cy - 28, cx + 2, cy - 6);
      g.fillEllipse(cx, cy + 6, 52, 42);
      g.fillStyle(0x9aa3b5, 1);
      g.fillTriangle(cx - 21, cy - 3, cx - 12, cy - 23, cx - 4, cy - 6);
      g.fillTriangle(cx + 21, cy - 3, cx + 12, cy - 23, cx + 4, cy - 6);
      g.fillEllipse(cx, cy + 6, 46, 36);
      g.fillStyle(0xe7ebf3, 1);
      g.fillEllipse(cx, cy + 15, 22, 14);
      g.fillStyle(PAL.ink, 1);
      g.fillEllipse(cx, cy + 10, 7, 5);
      eyes(g, cx, cy + 1, 10, 4.5);
    },
  },
  enemy_golem: {
    w: 80,
    h: 76,
    draw: (g, cx, cy) => {
      g.fillStyle(PAL.ink, 1);
      g.fillRoundedRect(cx - 34, cy - 30, 68, 64, 18);
      g.fillStyle(0x8a7560, 1);
      g.fillRoundedRect(cx - 30, cy - 26, 60, 56, 15);
      g.fillStyle(0xa8937c, 1);
      g.fillRoundedRect(cx - 24, cy - 22, 30, 16, 7);
      g.fillStyle(0x5f9e4a, 1);
      g.fillCircle(cx + 16, cy - 20, 7);
      g.fillCircle(cx + 22, cy - 16, 5);
      g.lineStyle(3, 0x5b4a3a, 1);
      g.lineBetween(cx - 20, cy + 18, cx - 8, cy + 8);
      g.lineBetween(cx + 14, cy + 22, cx + 22, cy + 10);
      eyes(g, cx, cy + 2, 11, 5);
    },
  },
  enemy_bat: {
    w: 76,
    h: 56,
    draw: (g, cx, cy) => {
      const wing = (s: number, c: number, k: number) => {
        g.fillStyle(c, 1);
        g.fillTriangle(cx + s * 8, cy - 6 * k, cx + s * 36 * k, cy - 14 * k, cx + s * 30 * k, cy + 12 * k);
        g.fillTriangle(cx + s * 8, cy - 6 * k, cx + s * 30 * k, cy + 12 * k, cx + s * 12, cy + 10 * k);
      };
      wing(-1, PAL.ink, 1.05);
      wing(1, PAL.ink, 1.05);
      wing(-1, 0x3f2a66, 0.95);
      wing(1, 0x3f2a66, 0.95);
      g.fillStyle(PAL.ink, 1);
      g.fillCircle(cx, cy, 19);
      g.fillTriangle(cx - 14, cy - 8, cx - 8, cy - 26, cx - 2, cy - 12);
      g.fillTriangle(cx + 14, cy - 8, cx + 8, cy - 26, cx + 2, cy - 12);
      g.fillStyle(0x6b4fa3, 1);
      g.fillCircle(cx, cy, 16);
      g.fillTriangle(cx - 12, cy - 8, cx - 8, cy - 22, cx - 3, cy - 11);
      g.fillTriangle(cx + 12, cy - 8, cx + 8, cy - 22, cx + 3, cy - 11);
      eyes(g, cx, cy - 1, 7, 4);
      g.fillStyle(0xffffff, 1);
      g.fillTriangle(cx - 4, cy + 8, cx - 1, cy + 8, cx - 2.5, cy + 12);
      g.fillTriangle(cx + 4, cy + 8, cx + 1, cy + 8, cx + 2.5, cy + 12);
    },
  },
  enemy_herald: {
    w: 120,
    h: 120,
    draw: (g, cx, cy) => {
      // cape
      g.fillStyle(PAL.ink, 1);
      g.fillTriangle(cx - 48, cy + 46, cx + 48, cy + 46, cx, cy - 20);
      g.fillStyle(0x2b3f7a, 1);
      g.fillTriangle(cx - 42, cy + 42, cx + 42, cy + 42, cx, cy - 14);
      // body
      g.fillStyle(PAL.ink, 1);
      g.fillCircle(cx, cy + 4, 38);
      g.fillStyle(0x8fd8ff, 1);
      g.fillCircle(cx, cy + 4, 34);
      g.fillStyle(0xd8f6ff, 1);
      g.fillEllipse(cx - 12, cy - 10, 20, 12);
      // crown of ice
      for (const [x, h] of [[-22, 22], [-11, 30], [0, 40], [11, 30], [22, 22]] as const) {
        g.fillStyle(PAL.ink, 1);
        g.fillTriangle(cx + x - 8, cy - 22, cx + x + 8, cy - 22, cx + x, cy - 26 - h);
        g.fillStyle(0xeafcff, 1);
        g.fillTriangle(cx + x - 5, cy - 23, cx + x + 5, cy - 23, cx + x, cy - 22 - h);
      }
      // glowing eyes
      g.fillStyle(0x0b1a3a, 1);
      g.fillEllipse(cx - 13, cy + 6, 16, 12);
      g.fillEllipse(cx + 13, cy + 6, 16, 12);
      g.fillStyle(0x7ff6ff, 1);
      g.fillCircle(cx - 13, cy + 6, 4);
      g.fillCircle(cx + 13, cy + 6, 4);
    },
  },

  // ─────────── statuses ───────────
  status_roots: {
    w: 84,
    h: 40,
    draw: (g, cx, cy) => {
      g.lineStyle(6, 0x4a3a1f, 1);
      g.strokeEllipse(cx, cy + 4, 70, 24);
      g.lineStyle(4, 0x5cbf3f, 1);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const x = cx + Math.cos(a) * 34;
        const y = cy + 4 + Math.sin(a) * 12;
        g.beginPath();
        g.arc(x, y - 8, 7, Math.PI * 0.5, Math.PI * 1.6);
        g.strokePath();
        g.fillStyle(0x7fe05a, 1);
        g.fillEllipse(x + 3, y - 15, 7, 4);
      }
    },
  },
  status_ice: {
    w: 72,
    h: 72,
    draw: (g, cx, cy) => {
      g.fillStyle(0x5fd0ff, 0.32);
      g.fillRoundedRect(cx - 32, cy - 32, 64, 64, 10);
      g.lineStyle(4, 0x2fa8e0, 0.9);
      g.strokeRoundedRect(cx - 32, cy - 32, 64, 64, 10);
      g.fillStyle(0xffffff, 0.6);
      g.fillTriangle(cx - 26, cy - 26, cx - 10, cy - 26, cx - 26, cy - 10);
      g.lineStyle(3, 0xffffff, 0.7);
      g.lineBetween(cx + 10, cy - 22, cx + 24, cy - 8);
    },
  },
  status_fragile: {
    w: 26,
    h: 26,
    draw: (g, cx, cy) => {
      g.fillStyle(PAL.ink, 1);
      g.fillCircle(cx, cy, 12);
      g.fillStyle(0xc76bff, 1);
      g.fillCircle(cx, cy, 10);
      g.lineStyle(2.5, 0xffffff, 1);
      g.lineBetween(cx - 2, cy - 7, cx + 2, cy - 1);
      g.lineBetween(cx + 2, cy - 1, cx - 3, cy + 3);
      g.lineBetween(cx - 3, cy + 3, cx + 1, cy + 7);
    },
  },

  // ─────────── towers ───────────
  tower_base: {
    w: 100,
    h: 80,
    draw: (g, cx, cy) => {
      g.fillStyle(0x000000, 0.25);
      g.fillEllipse(cx, cy + 14, 90, 40);
      g.fillStyle(PAL.ink, 1);
      g.fillEllipse(cx, cy + 6, 86, 52);
      g.fillStyle(PAL.stoneDark, 1);
      g.fillEllipse(cx, cy + 6, 80, 46);
      g.fillStyle(PAL.stone, 1);
      g.fillEllipse(cx, cy, 80, 42);
      g.fillStyle(0xaaa5bf, 1);
      g.fillEllipse(cx - 10, cy - 6, 36, 14);
    },
  },
  tower_archer: {
    w: 84,
    h: 96,
    draw: (g, cx, cy) => {
      g.fillStyle(PAL.ink, 1);
      g.fillRoundedRect(cx - 24, cy - 14, 48, 54, 8);
      g.fillTriangle(cx - 34, cy - 10, cx + 34, cy - 10, cx, cy - 46);
      g.fillStyle(0xa8794a, 1);
      g.fillRoundedRect(cx - 20, cy - 12, 40, 50, 6);
      g.fillStyle(0xc9504a, 1);
      g.fillTriangle(cx - 29, cy - 13, cx + 29, cy - 13, cx, cy - 41);
      g.fillStyle(0x2b1d12, 1);
      g.fillRoundedRect(cx - 7, cy + 2, 14, 18, 7);
      g.lineStyle(4, 0xe8d6b0, 1);
      g.beginPath();
      g.arc(cx + 2, cy + 10, 16, -Math.PI * 0.45, Math.PI * 0.45);
      g.strokePath();
    },
  },
  tower_brazier: {
    w: 84,
    h: 96,
    draw: (g, cx, cy) => {
      g.fillStyle(PAL.ink, 1);
      g.fillRect(cx - 8, cy + 8, 16, 32);
      g.fillEllipse(cx, cy + 8, 62, 34);
      g.fillStyle(0x4a4458, 1);
      g.fillRect(cx - 5, cy + 10, 10, 28);
      g.fillEllipse(cx, cy + 8, 56, 28);
      g.fillStyle(0x6a6380, 1);
      g.fillEllipse(cx, cy + 2, 54, 14);
      const flame = (s: number, c: number) => {
        g.fillStyle(c, 1);
        g.fillEllipse(cx, cy - 10 * s, 40 * s, 36 * s);
        g.fillTriangle(cx - 18 * s, cy - 14 * s, cx + 18 * s, cy - 14 * s, cx + 2, cy - 46 * s);
      };
      flame(1, 0xff5a1f);
      flame(0.72, 0xff9d2e);
      flame(0.42, 0xffe27a);
    },
  },
  tower_frost: {
    w: 84,
    h: 104,
    draw: (g, cx, cy) => {
      const shard = (ox: number, oy: number, s: number, c: number, out: boolean) => {
        const pts = [V(cx + ox, cy + oy - 34 * s), V(cx + ox + 13 * s, cy + oy), V(cx + ox, cy + oy + 22 * s), V(cx + ox - 13 * s, cy + oy)];
        g.fillStyle(out ? PAL.ink : c, 1);
        g.fillPoints(out ? pts.map((p) => V(cx + ox + (p.x - cx - ox) * 1.15, cy + oy + (p.y - cy - oy) * 1.1)) : pts, true);
      };
      for (const out of [true, false]) {
        shard(-20, 10, 0.7, 0x4fc6e8, out);
        shard(20, 12, 0.65, 0x4fc6e8, out);
        shard(0, 0, 1.2, 0x6fe6ff, out);
      }
      g.fillStyle(0xe6fbff, 0.85);
      g.fillPoints([V(cx, cy - 40), V(cx + 5, cy), V(cx, cy + 24), V(cx - 5, cy)], true);
    },
  },
  tower_vine: {
    w: 84,
    h: 96,
    draw: (g, cx, cy) => {
      g.fillStyle(PAL.ink, 1);
      g.fillCircle(cx, cy, 28);
      g.fillStyle(0x3f8f45, 1);
      g.fillCircle(cx, cy, 24);
      const leaf = (a: number) => {
        const x = cx + Math.cos(a) * 30;
        const y = cy + Math.sin(a) * 30;
        g.fillStyle(PAL.ink, 1);
        g.fillEllipse(x, y, 26, 16);
        g.fillStyle(0x6ad44a, 1);
        g.fillEllipse(x, y, 21, 11);
      };
      for (let i = 0; i < 5; i++) leaf(-Math.PI / 2 + (i * Math.PI * 2) / 5);
      g.fillStyle(0xff7ab8, 1);
      g.fillCircle(cx, cy - 2, 10);
      g.fillStyle(PAL.gold, 1);
      g.fillCircle(cx, cy - 2, 4);
    },
  },
  pip: { w: 16, h: 16, draw: (g, cx, cy) => (g.fillStyle(PAL.ink, 1), g.fillCircle(cx, cy, 7), g.fillStyle(PAL.gold, 1), g.fillCircle(cx, cy, 5)) },

  // ─────────── projectiles (pointing right; the view rotates them) ───────────
  proj_physical: {
    w: 36,
    h: 10,
    draw: (g, cx, cy) => {
      g.fillStyle(0x7a5a35, 1);
      g.fillRect(2, cy - 1.5, 26, 3);
      g.fillStyle(0xe8d6b0, 1);
      g.fillTriangle(26, cy - 5, 26, cy + 5, 35, cy);
      g.fillStyle(0xffffff, 1);
      g.fillTriangle(2, cy - 4, 8, cy, 2, cy + 4);
      void cx;
    },
  },
  proj_fire: {
    w: 32,
    h: 32,
    draw: (g, cx, cy) => {
      g.fillStyle(0xff5a1f, 0.5);
      g.fillCircle(cx, cy, 15);
      g.fillStyle(0xff9d2e, 1);
      g.fillCircle(cx, cy, 10);
      g.fillStyle(0xffe27a, 1);
      g.fillCircle(cx + 2, cy - 1, 5);
    },
  },
  proj_ice: {
    w: 30,
    h: 16,
    draw: (g, cx, cy) => {
      g.fillStyle(0xffffff, 1);
      g.fillPoints([V(cx - 14, cy), V(cx + 2, cy - 7), V(cx + 14, cy), V(cx + 2, cy + 7)], true);
      g.fillStyle(0x6fe6ff, 1);
      g.fillPoints([V(cx - 10, cy), V(cx + 2, cy - 5), V(cx + 12, cy), V(cx + 2, cy + 5)], true);
    },
  },
  proj_nature: {
    w: 28,
    h: 18,
    draw: (g, cx, cy) => {
      g.fillStyle(PAL.ink, 1);
      g.fillEllipse(cx, cy, 26, 15);
      g.fillStyle(0x6ad44a, 1);
      g.fillEllipse(cx, cy, 22, 11);
      g.lineStyle(2, 0x2f6b34, 1);
      g.lineBetween(cx - 9, cy, cx + 9, cy);
    },
  },

  // ─────────── ui icons ───────────
  icon_pause: {
    w: 40,
    h: 40,
    draw: (g, cx, cy) => (g.fillStyle(0xffffff, 1), g.fillRoundedRect(cx - 12, cy - 14, 9, 28, 3), g.fillRoundedRect(cx + 3, cy - 14, 9, 28, 3)),
  },
  icon_speed: {
    w: 48,
    h: 40,
    draw: (g, cx, cy) => (
      g.fillStyle(0xffffff, 1), g.fillTriangle(cx - 20, cy - 13, cx - 20, cy + 13, cx, cy), g.fillTriangle(cx, cy - 13, cx, cy + 13, cx + 20, cy)
    ),
  },
  icon_play: { w: 40, h: 40, draw: (g, cx, cy) => (g.fillStyle(0xffffff, 1), g.fillTriangle(cx - 10, cy - 14, cx - 10, cy + 14, cx + 14, cy)) },
};

function drawStar(g: G, cx: number, cy: number, fill: number, shine: number): void {
  const star = (r: number) => {
    const pts: Phaser.Math.Vector2[] = [];
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const rr = i % 2 === 0 ? r : r * 0.48;
      pts.push(V(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr));
    }
    return pts;
  };
  g.fillStyle(PAL.ink, 1);
  g.fillPoints(star(34), true);
  g.fillStyle(fill, 1);
  g.fillPoints(star(28), true);
  g.fillStyle(shine, 1);
  g.fillCircle(cx - 6, cy - 6, 5);
}

/** Draw every procedural asset once into the texture cache. */
export function generateTextures(scene: Phaser.Scene): void {
  const g = scene.add.graphics();
  for (const key of Object.keys(ASSETS) as AssetKey[]) {
    const src = ASSETS[key];
    if (src.kind !== 'procedural' || scene.textures.exists(key)) continue;
    const d = DRAW[key];
    g.clear();
    d.draw(g, d.w / 2, d.h / 2);
    g.generateTexture(key, d.w, d.h);
  }
  g.destroy();
}

/** Image-based assets (none yet). Call from a scene's preload(). */
export function preloadImages(scene: Phaser.Scene): void {
  for (const key of Object.keys(ASSETS) as AssetKey[]) {
    const src = ASSETS[key] as { kind: string; url?: string };
    if (src.kind === 'image' && src.url) scene.load.image(key, src.url);
  }
}
