// Painted icons for Relíquias, the Relicário chest and the Éter coin (Canvas2D, same style as everything else).
import type { RelicShape } from '../../data/relics';
import { circle, ellipse, glow, gloss, hex, INK, linear, poly, radial, roundRect, shade, shape, star, type Ctx } from './paint';

export const RELIC_ICON = 96;

/** Draw one relic icon centred in a 96×96 canvas. */
export function drawRelic(c: Ctx, kind: RelicShape, color: number): void {
  const cx = 48;
  const cy = 50;
  const light = hex(shade(color, 0.45));
  const mid = hex(color);
  const dark = hex(shade(color, -0.35));
  const metal = linear(c, 0, 20, 0, 84, [[0, '#fff2b8'], [0.5, '#e6b84a'], [1, '#9a6a18']]);
  const gem = (x: number, y: number, r: number) => {
    shape(c, circle(x, y, r), radial(c, x, y, r, [[0, light], [0.6, mid], [1, dark]], x - r * 0.35, y - r * 0.4), INK, 2.5);
    gloss(c, x - r * 0.35, y - r * 0.4, r * 0.45, r * 0.25, 0.9);
  };
  glow(c, cx, cy, 46, color, 0.35);
  switch (kind) {
    case 'amulet': {
      c.strokeStyle = INK;
      c.lineWidth = 6;
      c.beginPath();
      c.arc(cx, cy - 24, 20, Math.PI * 1.05, Math.PI * 1.95);
      c.stroke();
      c.strokeStyle = '#d9b25a';
      c.lineWidth = 3;
      c.stroke();
      shape(c, poly([[cx, cy - 18], [cx + 22, cy + 2], [cx, cy + 32], [cx - 22, cy + 2]]), metal, INK, 3);
      gem(cx, cy + 4, 13);
      break;
    }
    case 'crown': {
      shape(c, poly([[cx - 32, cy + 22], [cx - 34, cy - 14], [cx - 16, cy + 2], [cx, cy - 26], [cx + 16, cy + 2], [cx + 34, cy - 14], [cx + 32, cy + 22]]), metal, INK, 3.5);
      shape(c, roundRect(cx - 34, cy + 14, 68, 14, 5), linear(c, 0, cy + 14, 0, cy + 28, [[0, '#f7d77a'], [1, '#a8781e']]), INK, 3);
      gem(cx, cy + 4, 9);
      gem(cx - 34, cy - 16, 5);
      gem(cx + 34, cy - 16, 5);
      gem(cx, cy - 27, 6);
      break;
    }
    case 'scroll': {
      shape(c, roundRect(cx - 26, cy - 26, 52, 54, 6), linear(c, cx - 26, 0, cx + 26, 0, [[0, '#d8c39a'], [0.5, '#fff4dc'], [1, '#cdb487']]), INK, 3);
      for (const y of [cy - 28, cy + 28]) shape(c, roundRect(cx - 32, y - 6, 64, 12, 6), linear(c, 0, y - 6, 0, y + 6, [[0, '#c89a5a'], [1, '#7a5428']]), INK, 3);
      c.strokeStyle = hex(shade(color, -0.5), 0.7);
      c.lineWidth = 2.5;
      for (let i = 0; i < 4; i++) {
        c.beginPath();
        c.moveTo(cx - 16, cy - 12 + i * 9);
        c.lineTo(cx + (i === 3 ? 4 : 16), cy - 12 + i * 9);
        c.stroke();
      }
      shape(c, circle(cx + 14, cy + 16, 8), '#c0392b', INK, 2.5);
      break;
    }
    case 'stone': {
      shape(c, poly([[cx, cy - 34], [cx + 26, cy - 12], [cx + 20, cy + 24], [cx, cy + 34], [cx - 20, cy + 24], [cx - 26, cy - 12]]), radial(c, cx, cy, 40, [[0, light], [0.55, mid], [1, dark]], cx - 10, cy - 14), INK, 3.5);
      c.strokeStyle = hex(shade(color, 0.6), 0.6);
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(cx, cy - 34);
      c.lineTo(cx, cy + 34);
      c.moveTo(cx - 26, cy - 12);
      c.lineTo(cx, cy);
      c.lineTo(cx + 26, cy - 12);
      c.stroke();
      gloss(c, cx - 9, cy - 16, 10, 5, 0.9);
      break;
    }
    case 'shield': {
      shape(c, (p) => {
        p.moveTo(cx, cy - 34);
        p.quadraticCurveTo(cx + 18, cy - 26, cx + 30, cy - 28);
        p.quadraticCurveTo(cx + 32, cy + 10, cx, cy + 36);
        p.quadraticCurveTo(cx - 32, cy + 10, cx - 30, cy - 28);
        p.quadraticCurveTo(cx - 18, cy - 26, cx, cy - 34);
      }, linear(c, cx - 30, 0, cx + 30, 0, [[0, '#a87b47'], [0.5, '#c99a5f'], [1, '#6e4c25']]), INK, 3.5);
      c.strokeStyle = '#d9b25a';
      c.lineWidth = 4;
      c.beginPath();
      c.moveTo(cx, cy - 30);
      c.lineTo(cx, cy + 30);
      c.moveTo(cx - 26, cy - 6);
      c.lineTo(cx + 26, cy - 6);
      c.stroke();
      gem(cx, cy - 6, 8);
      break;
    }
    case 'hourglass': {
      for (const y of [cy - 32, cy + 26]) shape(c, roundRect(cx - 26, y, 52, 8, 4), metal, INK, 3);
      shape(c, poly([[cx - 20, cy - 24], [cx + 20, cy - 24], [cx + 4, cy - 2], [cx + 20, cy + 26], [cx - 20, cy + 26], [cx - 4, cy - 2]]), 'rgba(220,240,255,0.55)', INK, 3);
      shape(c, poly([[cx - 12, cy - 16], [cx + 12, cy - 16], [cx, cy - 3]]), mid, INK, 0);
      shape(c, poly([[cx - 16, cy + 24], [cx + 16, cy + 24], [cx, cy + 8]]), mid, INK, 0);
      gloss(c, cx - 10, cy - 14, 5, 9, 0.6, 0);
      break;
    }
    case 'pouch': {
      shape(c, (p) => {
        p.moveTo(cx - 12, cy - 22);
        p.quadraticCurveTo(cx - 36, cy + 4, cx - 26, cy + 26);
        p.quadraticCurveTo(cx, cy + 38, cx + 26, cy + 26);
        p.quadraticCurveTo(cx + 36, cy + 4, cx + 12, cy - 22);
        p.closePath();
      }, radial(c, cx, cy + 6, 40, [[0, '#d9a465'], [1, '#7a4e22']], cx - 10, cy - 4), INK, 3.5);
      shape(c, ellipse(cx, cy - 25, 16, 7), '#8a5a2a', INK, 3);
      c.strokeStyle = '#ffd34d';
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(cx - 14, cy - 18);
      c.quadraticCurveTo(cx, cy - 12, cx + 14, cy - 18);
      c.stroke();
      shape(c, star(c, cx, cy + 8, 11, 0.45), '#ffd34d', INK, 2);
      break;
    }
    case 'lens': {
      shape(c, roundRect(cx + 12, cy + 12, 12, 30, 5), linear(c, 0, cy + 12, 0, cy + 42, [[0, '#8a5a2a'], [1, '#4a2e12']]), INK, 3);
      shape(c, circle(cx - 4, cy - 6, 26), metal, INK, 3.5);
      shape(c, circle(cx - 4, cy - 6, 19), radial(c, cx - 4, cy - 6, 20, [[0, 'rgba(255,255,255,0.9)'], [0.6, hex(color, 0.7)], [1, hex(shade(color, -0.3), 0.9)]], cx - 12, cy - 14), INK, 0);
      gloss(c, cx - 12, cy - 14, 8, 4, 1);
      break;
    }
    case 'idol': {
      shape(c, roundRect(cx - 24, cy + 18, 48, 14, 5), '#8a6a2a', INK, 3);
      shape(c, (p) => {
        p.moveTo(cx - 18, cy + 20);
        p.lineTo(cx - 14, cy - 4);
        p.quadraticCurveTo(cx - 22, cy - 34, cx, cy - 36);
        p.quadraticCurveTo(cx + 22, cy - 34, cx + 14, cy - 4);
        p.lineTo(cx + 18, cy + 20);
        p.closePath();
      }, metal, INK, 3.5);
      shape(c, circle(cx - 7, cy - 18, 3.5), INK, INK, 0);
      shape(c, circle(cx + 7, cy - 18, 3.5), INK, INK, 0);
      gem(cx, cy + 4, 7);
      gloss(c, cx - 8, cy - 26, 8, 4, 0.9);
      break;
    }
    case 'boots': {
      for (const dx of [-10, 12]) {
        shape(c, (p) => {
          p.moveTo(cx + dx - 10, cy - 28);
          p.lineTo(cx + dx + 6, cy - 28);
          p.lineTo(cx + dx + 6, cy + 10);
          p.quadraticCurveTo(cx + dx + 24, cy + 14, cx + dx + 22, cy + 28);
          p.lineTo(cx + dx - 12, cy + 28);
          p.closePath();
        }, linear(c, 0, cy - 28, 0, cy + 28, [[0, light], [1, dark]]), INK, 3);
        shape(c, roundRect(cx + dx - 12, cy - 30, 20, 8, 3), '#e6c27a', INK, 2.5);
      }
      break;
    }
  }
}

/** Closed chest (Relicário), 200×170. The glow behind it is a separate tinted sprite. */
export function drawChest(c: Ctx): void {
  const cx = 100;
  const wood = linear(c, 0, 60, 0, 160, [[0, '#9a6a3a'], [1, '#5a3a1a']]);
  const gold = linear(c, 0, 40, 0, 160, [[0, '#fff2b8'], [0.5, '#e6b84a'], [1, '#9a6a18']]);
  // body
  shape(c, roundRect(cx - 80, 76, 160, 84, 10), wood, INK, 4);
  // lid
  shape(c, (p) => {
    p.moveTo(cx - 84, 82);
    p.lineTo(cx - 84, 48);
    p.quadraticCurveTo(cx, 4, cx + 84, 48);
    p.lineTo(cx + 84, 82);
    p.closePath();
  }, linear(c, 0, 10, 0, 82, [[0, '#7a4fd0'], [1, '#3c2470']]), INK, 4);
  // gold bands
  for (const x of [cx - 58, cx + 46]) {
    shape(c, roundRect(x, 30, 12, 130, 4), gold, INK, 3);
  }
  shape(c, roundRect(cx - 86, 74, 172, 14, 5), gold, INK, 3);
  // lock
  shape(c, roundRect(cx - 18, 70, 36, 40, 8), gold, INK, 3.5);
  shape(c, circle(cx, 86, 6), INK, INK, 0);
  shape(c, roundRect(cx - 2.5, 86, 5, 14, 2), INK, INK, 0);
  // éter gem on the lid
  shape(c, poly([[cx, 22], [cx + 12, 40], [cx, 58], [cx - 12, 40]]), radial(c, cx, 40, 18, [[0, '#f3e9ff'], [0.5, '#b57bff'], [1, '#5a2aa0']], cx - 4, 32), INK, 3);
  gloss(c, cx - 40, 40, 22, 6, 0.5, -0.2);
}

/** Coins earned by playing (Éter coin, silver-violet so it never reads as match gold). */
export function drawEterCoin(c: Ctx): void {
  const cx = 20;
  const cy = 20;
  shape(c, circle(cx, cy + 1.5, 16), '#5a3f8a', INK, 2.5);
  shape(c, circle(cx, cy - 1, 15), radial(c, cx, cy, 16, [[0, '#ffffff'], [0.5, '#d6c4ff'], [1, '#8a6ad0']], cx - 5, cy - 7), INK, 0);
  c.strokeStyle = 'rgba(90,60,150,0.8)';
  c.lineWidth = 2.5;
  c.beginPath();
  c.arc(cx, cy - 1, 10, 0, Math.PI * 2);
  c.stroke();
  shape(c, poly([[cx, cy - 9], [cx + 6, cy - 1], [cx, cy + 7], [cx - 6, cy - 1]]), '#b57bff', INK, 1.5);
  gloss(c, cx - 6, cy - 8, 6, 3, 0.9);
}

// ───────────── Menu icons (72×72) ─────────────

export function drawIconCheck(c: Ctx): void {
  shape(c, circle(24, 24, 18), radial(c, 24, 24, 19, [[0, '#b6f5b6'], [1, '#3aa655']], 18, 18), INK, 2.5);
  c.strokeStyle = '#ffffff';
  c.lineWidth = 5;
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.beginPath();
  c.moveTo(15, 24);
  c.lineTo(22, 31);
  c.lineTo(33, 17);
  c.stroke();
}

export function drawIconDaily(c: Ctx): void {
  const cx = 36;
  const cy = 38;
  // calendar page with a sun
  shape(c, roundRect(cx - 26, cy - 24, 52, 50, 8), linear(c, 0, cy - 24, 0, cy + 26, [[0, '#ffffff'], [1, '#e6dcf5']]), INK, 3);
  shape(c, roundRect(cx - 26, cy - 24, 52, 14, [8, 8, 0, 0] as unknown as number), '#e0477a', INK, 0);
  for (const x of [cx - 13, cx + 13]) shape(c, roundRect(x - 3, cy - 32, 6, 14, 3), '#8a8aa0', INK, 2);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    shape(c, poly([[cx + Math.cos(a) * 9, cy + 9 + Math.sin(a) * 9], [cx + Math.cos(a + 0.25) * 15, cy + 9 + Math.sin(a + 0.25) * 15], [cx + Math.cos(a - 0.25) * 15, cy + 9 + Math.sin(a - 0.25) * 15]]), '#ffb02e', INK, 0);
  }
  shape(c, circle(cx, cy + 9, 8), radial(c, cx, cy + 9, 9, [[0, '#fff3a8'], [1, '#ffb02e']], cx - 3, cy + 6), INK, 2);
}

export function drawIconCodex(c: Ctx): void {
  const cx = 36;
  const cy = 36;
  shape(c, roundRect(cx - 24, cy - 26, 48, 54, 6), '#f3ead8', INK, 3);
  shape(c, roundRect(cx - 28, cy - 28, 46, 54, 6), linear(c, cx - 28, 0, cx + 18, 0, [[0, '#4a2a8a'], [1, '#7a4fd0']]), INK, 3);
  shape(c, roundRect(cx - 28, cy - 28, 8, 54, 3), '#2e1a5a', INK, 0);
  shape(c, poly([[cx - 4, cy - 14], [cx + 6, cy - 2], [cx - 4, cy + 12], [cx - 14, cy - 2]]), radial(c, cx - 4, cy - 2, 14, [[0, '#f3e9ff'], [0.5, '#b57bff'], [1, '#5a2aa0']], cx - 7, cy - 6), INK, 2);
  gloss(c, cx - 12, cy - 20, 10, 4, 0.5);
}

export function drawIconGear(c: Ctx): void {
  const cx = 36;
  const cy = 36;
  const teeth = 8;
  shape(c, (p) => {
    for (let i = 0; i < teeth * 2; i++) {
      const a = (i / (teeth * 2)) * Math.PI * 2;
      const r = i % 2 === 0 ? 28 : 21;
      const a2 = a + Math.PI / (teeth * 2);
      if (i === 0) p.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      else p.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      p.lineTo(cx + Math.cos(a2) * r, cy + Math.sin(a2) * r);
    }
    p.closePath();
  }, radial(c, cx, cy, 30, [[0, '#ffffff'], [0.6, '#c8c6d8'], [1, '#7a7890']], cx - 8, cy - 8), INK, 3);
  shape(c, circle(cx, cy, 9), '#3a3350', INK, 2.5);
}

export function drawNavBadge(c: Ctx, color: number): void {
  // round, glossy badge behind a menu icon (96×96)
  shape(c, circle(48, 50, 42), hex(shade(color, -0.45)), INK, 3.5);
  shape(c, circle(48, 46, 40), radial(c, 48, 46, 42, [[0, hex(shade(color, 0.35))], [0.7, hex(color)], [1, hex(shade(color, -0.2))]], 36, 30), INK, 0);
  gloss(c, 34, 26, 18, 8, 0.55);
}

/** Rune stone on the ground (120×120): empty (kind null) or with a glowing rune crystal. */
export function drawRuneStone(c: Ctx, kind: 'haste' | 'power' | null): void {
  const cx = 60;
  const cy = 74;
  // flat carved stone disc
  shape(c, ellipse(cx, cy + 4, 46, 22), '#5c5872', INK, 3.5);
  shape(c, ellipse(cx, cy, 44, 20), linear(c, 0, cy - 20, 0, cy + 20, [[0, '#b9b4cf'], [1, '#7d7896']]), INK, 0);
  c.strokeStyle = 'rgba(40,30,70,0.55)';
  c.lineWidth = 2.5;
  c.beginPath();
  c.ellipse(cx, cy, 30, 13, 0, 0, Math.PI * 2);
  c.stroke();
  // carved glyph
  c.beginPath();
  c.moveTo(cx - 12, cy - 4);
  c.lineTo(cx, cy + 6);
  c.lineTo(cx + 12, cy - 4);
  c.moveTo(cx, cy - 8);
  c.lineTo(cx, cy + 6);
  c.stroke();
  if (!kind) {
    gloss(c, cx - 14, cy - 8, 14, 4, 0.5, 0);
    return;
  }
  const color = kind === 'haste' ? 0x6fe6ff : 0xff7a2e;
  glow(c, cx, cy - 30, 40, color, 0.55);
  // floating crystal obelisk
  shape(c, poly([[cx, cy - 66], [cx + 14, cy - 34], [cx, cy - 6], [cx - 14, cy - 34]]), radial(c, cx, cy - 36, 34, [[0, '#ffffff'], [0.4, hex(shade(color, 0.3))], [1, hex(shade(color, -0.35))]], cx - 5, cy - 46), INK, 3);
  c.strokeStyle = 'rgba(255,255,255,0.7)';
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(cx, cy - 62);
  c.lineTo(cx, cy - 10);
  c.stroke();
  if (kind === 'haste') {
    // speed chevrons
    for (const dy of [-44, -30]) {
      c.strokeStyle = INK;
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(cx - 6, dy + cy - 4);
      c.lineTo(cx, dy + cy - 10);
      c.lineTo(cx + 6, dy + cy - 4);
      c.stroke();
    }
  } else {
    shape(c, star(c, cx, cy - 36, 7, 0.45), '#fff3a8', INK, 1.5);
  }
}
