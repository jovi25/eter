// Grimório card art (Fase 19): every Bênção is a painted card. The higher the rarity, the richer the card:
// Comum = stone frame and a calm backdrop; Rara = silver frame, corner gems, rays and sparkles;
// Épica = ornate violet-gold frame, a crest and a swirling vortex; Lendária = thick gold frame with a crown,
// sunburst, starfield and a rune halo. Painted once per card on demand (not in the atlas).
import * as Phaser from 'phaser';
import { BOONS, type BoonDef, type BoonId, type BoonRarity } from '../../data/boons';
import { circle, ellipse, glow, gloss, hex, INK, linear, poly, radial, roundRect, shade, shape, star, type Ctx } from './paint';

export const CARD_W = 300;
export const CARD_H = 420;
/** Where the art window ends; the name and text go below it (as live text). */
export const CARD_ART_BOTTOM = 270;

type Emblem =
  | 'flame' | 'snow' | 'leaf' | 'bolt' | 'eye' | 'lens' | 'chest' | 'heart' | 'bag' | 'hammer' | 'flask' | 'hourglass'
  | 'sword' | 'fist' | 'spiral' | 'gear' | 'arrows' | 'drop' | 'wind' | 'cloud' | 'crystal' | 'vine' | 'roots'
  | 'tree' | 'coins' | 'pact' | 'sun' | 'feather' | 'crown' | 'wing';

const EMBLEM: Record<BoonId, Emblem> = {
  fireMastery: 'flame', iceMastery: 'snow', natureMastery: 'leaf', boltMastery: 'bolt', eagleEye: 'eye', longReach: 'lens',
  treasure: 'chest', heart: 'heart', windMastery: 'wind', bounty: 'bag', bargain: 'hammer', catalyst: 'flask',
  eternalCombo: 'hourglass', heroFury: 'sword', echo: 'spiral', absoluteZero: 'crystal', stormHeart: 'cloud', overdrive: 'gear',
  tallVines: 'vine', heavyHand: 'fist', ironArrows: 'arrows', deepRoots: 'roots', sharpMelt: 'drop', quickHands: 'wing',
  galeForce: 'wind', goldPact: 'pact', cyclone: 'wind', goldRain: 'coins', sunOfEter: 'sun', phoenix: 'feather',
  worldSeed: 'tree', timeCrown: 'crown',
  harvest: 'leaf', trueShot: 'arrows', livingWall: 'heart', interest: 'coins', emberBurst: 'flame', stickyMud: 'drop', secondChance: 'heart', bossHunter: 'sword',
};

const FRAME: Record<BoonRarity, { a: string; b: string; c: string; line: string; gem: number }> = {
  common: { a: '#d8d4e2', b: '#8e88a2', c: '#5a5470', line: '#b8b2c8', gem: 0xb8b8c8 },
  rare: { a: '#f2fbff', b: '#7fb8e8', c: '#2f5f9a', line: '#cfe8ff', gem: 0x4aa3ff },
  epic: { a: '#ffe9a8', b: '#b26bff', c: '#4a1f8a', line: '#ffd76a', gem: 0xc77bff },
  legendary: { a: '#fffbe0', b: '#ffcf4a', c: '#9a6a12', line: '#fff0a8', gem: 0xff5a8a },
};

/** Paint (once) and return the texture key of a card. */
export function ensureCard(scene: Phaser.Scene, id: BoonId): string {
  const key = `card_${id}`;
  if (scene.textures.exists(key)) return key;
  const tex = scene.textures.createCanvas(key, CARD_W, CARD_H);
  if (!tex) return key;
  // An illustration made in an image AI (docs/ARTE_IA.md, section 6) fills the art window when it is loaded.
  const pic = `cardpic_${id}`;
  const art = scene.textures.exists(pic) ? (scene.textures.get(pic).getSourceImage() as CanvasImageSource & { width: number; height: number }) : undefined;
  paintCard(tex.getContext(), id, art);
  tex.refresh();
  return key;
}

/** Card back (face down while a pack opens), tinted by the rarity glow around it. */
export function ensureCardBack(scene: Phaser.Scene): string {
  const key = 'card_back';
  if (scene.textures.exists(key)) return key;
  const tex = scene.textures.createCanvas(key, CARD_W, CARD_H);
  if (!tex) return key;
  const c = tex.getContext();
  shape(c, roundRect(4, 4, CARD_W - 8, CARD_H - 8, 26), linear(c, 0, 0, 0, CARD_H, [[0, '#4a2a8a'], [1, '#1a0f33']]), INK, 6);
  c.strokeStyle = '#ffd76a';
  c.lineWidth = 3;
  c.strokeRect(22, 22, CARD_W - 44, CARD_H - 44);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    c.strokeStyle = 'rgba(255,215,106,0.35)';
    c.beginPath();
    c.moveTo(CARD_W / 2, CARD_H / 2);
    c.lineTo(CARD_W / 2 + Math.cos(a) * 200, CARD_H / 2 + Math.sin(a) * 200);
    c.stroke();
  }
  c.strokeStyle = '#ffd76a';
  c.lineWidth = 4;
  c.beginPath();
  c.arc(CARD_W / 2, CARD_H / 2, 70, 0, Math.PI * 2);
  c.stroke();
  crystalGem(c, CARD_W / 2, CARD_H / 2, 1.1);
  tex.refresh();
  return key;
}

/** A sealed pack of 3 cards (foil envelope with the Éter crystal). */
export function ensurePack(scene: Phaser.Scene): string {
  const key = 'card_pack';
  if (scene.textures.exists(key)) return key;
  const W = 260;
  const H = 360;
  const tex = scene.textures.createCanvas(key, W, H);
  if (!tex) return key;
  const c = tex.getContext();
  const crimp = (y: number, dir: number) => {
    const pts: [number, number][] = [];
    for (let x = 10; x <= W - 10; x += 16) pts.push([x, y], [x + 8, y + dir * 10]);
    return pts;
  };
  shape(c, poly([...crimp(14, -1), [W - 10, H - 14], ...crimp(H - 14, 1).reverse()]), linear(c, 0, 0, W, H, [[0, '#8a5ad8'], [0.35, '#5a2aa8'], [0.6, '#b07aff'], [1, '#2a1260']]), INK, 5);
  // foil shine
  c.save();
  c.globalAlpha = 0.35;
  c.fillStyle = linear(c, 0, 0, W, H, [[0, 'rgba(255,255,255,0)'], [0.45, 'rgba(255,255,255,0.9)'], [0.55, 'rgba(255,255,255,0)'], [1, 'rgba(255,255,255,0)']]);
  c.fillRect(10, 20, W - 20, H - 40);
  c.restore();
  c.fillStyle = 'rgba(20,10,40,0.55)';
  c.fillRect(10, 40, W - 20, 18);
  c.fillRect(10, H - 58, W - 20, 18);
  glow(c, W / 2, H / 2, 110, 0xd8c4ff, 0.6);
  crystalGem(c, W / 2, H / 2 - 6, 1.35);
  tex.refresh();
  return key;
}

function crystalGem(c: Ctx, x: number, y: number, s: number): void {
  shape(c, poly([[x, y - 60 * s], [x + 34 * s, y], [x, y + 60 * s], [x - 34 * s, y]]), linear(c, x - 34 * s, 0, x + 34 * s, 0, [[0, '#c9a8ff'], [0.5, '#7a4fd0'], [1, '#3a1f80']]), INK, 4);
  shape(c, poly([[x, y - 60 * s], [x + 10 * s, y], [x, y + 60 * s], [x - 10 * s, y]]), 'rgba(255,255,255,0.35)', INK, 0);
  gloss(c, x - 12 * s, y - 24 * s, 6 * s, 14 * s, 0.8);
}

/** The whole card face (frame + backdrop + emblem). Name and text are drawn live on top. */
export function paintCard(c: Ctx, id: BoonId, art?: CanvasImageSource & { width: number; height: number }): void {
  const def = BOONS[id] as BoonDef;
  const r = def.rarity;
  const f = FRAME[r];
  const col = def.color;
  const W = CARD_W;
  const H = CARD_H;
  const lvl = r === 'common' ? 0 : r === 'rare' ? 1 : r === 'epic' ? 2 : 3;
  const border = 12 + lvl * 3;

  // Outer frame.
  shape(c, roundRect(4, 4, W - 8, H - 8, 28), linear(c, 0, 0, W, H, [[0, f.a], [0.5, f.b], [1, f.c]]), INK, 6);
  if (lvl >= 2) {
    // Embossed pattern on the frame.
    c.save();
    c.globalAlpha = 0.35;
    c.strokeStyle = f.a;
    c.lineWidth = 2;
    for (let i = 0; i < 26; i++) {
      c.beginPath();
      c.arc(lvl === 3 ? 4 + i * 12 : W / 2, lvl === 3 ? 4 : H / 2, 8 + i * 9, 0, Math.PI * 2);
      c.stroke();
    }
    c.restore();
  }
  // Art window.
  const ax = border;
  const ay = border;
  const aw = W - border * 2;
  const ah = CARD_ART_BOTTOM - border;
  c.save();
  c.beginPath();
  c.roundRect(ax, ay, aw, ah, 18);
  c.clip();
  if (art) {
    // Cover the window with the picture (cropped to fit, centred), then a soft vignette in the card's colour.
    const k = Math.max(aw / art.width, ah / art.height);
    const dw = art.width * k;
    const dh = art.height * k;
    c.drawImage(art, ax + (aw - dw) / 2, ay + (ah - dh) / 2, dw, dh);
    const v = c.createRadialGradient(W / 2, ay + ah / 2, Math.min(aw, ah) * 0.35, W / 2, ay + ah / 2, Math.max(aw, ah) * 0.75);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, hex(shade(col, -0.6), 0.55));
    c.fillStyle = v;
    c.fillRect(ax, ay, aw, ah);
  } else {
    backdrop(c, ax, ay, aw, ah, col, lvl);
    emblem(c, EMBLEM[id], W / 2, ay + ah * 0.53, 0.95 + lvl * 0.08, col);
  }
  c.restore();
  c.strokeStyle = INK;
  c.lineWidth = 4;
  c.beginPath();
  c.roundRect(ax, ay, aw, ah, 18);
  c.stroke();
  c.strokeStyle = f.line;
  c.lineWidth = 2;
  c.beginPath();
  c.roundRect(ax + 4, ay + 4, aw - 8, ah - 8, 15);
  c.stroke();

  // Text panel.
  const ty = CARD_ART_BOTTOM + 8;
  shape(c, roundRect(border, ty, W - border * 2, H - ty - border, 16), linear(c, 0, ty, 0, H, [[0, '#2c1d4a'], [1, '#160d2a']]), INK, 3);
  c.fillStyle = hex(col, 0.14);
  c.fillRect(border + 3, ty + 3, W - border * 2 - 6, H - ty - border - 6);

  // Rarity ornaments.
  const gem = (x: number, y: number, rad: number, color = f.gem) => {
    shape(c, circle(x, y, rad), radial(c, x, y, rad, [[0, hex(shade(color, 0.6))], [0.6, hex(color)], [1, hex(shade(color, -0.4))]], x - rad * 0.3, y - rad * 0.35), INK, 2.5);
    gloss(c, x - rad * 0.3, y - rad * 0.4, rad * 0.4, rad * 0.22, 0.9);
  };
  if (lvl === 0) {
    for (const [x, y] of [[18, 18], [W - 18, 18], [18, H - 18], [W - 18, H - 18]] as const) shape(c, circle(x, y, 4), f.line, INK, 2);
  }
  if (lvl >= 1) for (const [x, y] of [[20, 20], [W - 20, 20], [20, H - 20], [W - 20, H - 20]] as const) gem(x, y, 7 + lvl);
  if (lvl >= 2) {
    // Filigree curls in the corners.
    c.strokeStyle = f.a;
    c.lineWidth = 3;
    c.lineCap = 'round';
    for (const [x, y, sx, sy] of [[ax + 6, ay + 6, 1, 1], [ax + aw - 6, ay + 6, -1, 1], [ax + 6, ay + ah - 6, 1, -1], [ax + aw - 6, ay + ah - 6, -1, -1]] as const) {
      c.beginPath();
      c.moveTo(x, y + sy * 34);
      c.quadraticCurveTo(x, y, x + sx * 34, y);
      c.stroke();
      c.beginPath();
      c.arc(x + sx * 12, y + sy * 12, 6, 0, Math.PI * 2);
      c.stroke();
    }
    // Crest on top.
    shape(c, poly([[W / 2 - 34, 6], [W / 2 + 34, 6], [W / 2 + 22, 28], [W / 2 - 22, 28]]), linear(c, 0, 6, 0, 28, [[0, f.a], [1, f.c]]), INK, 3);
    gem(W / 2, 16, 9, lvl === 3 ? 0xff5a8a : 0xc77bff);
  }
  if (lvl === 3) {
    // Crown over the crest and gems on the sides.
    shape(c, poly([[W / 2 - 30, 4], [W / 2 - 30, -0], [W / 2 - 18, 0]]), f.a, INK, 0);
    for (const y of [H * 0.32, H * 0.62]) {
      gem(8, y, 8, 0x5ad4ff);
      gem(W - 8, y, 8, 0x5ad4ff);
    }
    gem(W / 2, H - 10, 9, 0x6ad44a);
  }
}

function backdrop(c: Ctx, x: number, y: number, w: number, h: number, col: number, lvl: number): void {
  const cx = x + w / 2;
  const cy = y + h * 0.53;
  c.fillStyle = linear(c, 0, y, 0, y + h, [[0, hex(shade(col, -0.35 - lvl * 0.05))], [0.55, hex(shade(col, -0.62))], [1, hex(shade(col, -0.82))]]);
  c.fillRect(x, y, w, h);
  if (lvl === 0) {
    // Calm: a soft pool of light and a horizon line.
    c.fillStyle = radial(c, cx, cy, h * 0.6, [[0, hex(col, 0.35)], [1, hex(col, 0)]]);
    c.fillRect(x, y, w, h);
    c.fillStyle = 'rgba(0,0,0,0.18)';
    c.fillRect(x, y + h * 0.78, w, h * 0.22);
    return;
  }
  if (lvl === 3) {
    // Starfield + nebula.
    for (let i = 0; i < 70; i++) {
      const sx = x + ((i * 97) % w);
      const sy = y + ((i * 53) % h);
      c.fillStyle = `rgba(255,255,255,${0.25 + ((i * 37) % 60) / 100})`;
      c.fillRect(sx, sy, 2, 2);
    }
    c.fillStyle = radial(c, cx - 50, cy - 40, 120, [[0, hex(shade(col, 0.3), 0.45)], [1, hex(col, 0)]]);
    c.fillRect(x, y, w, h);
    c.fillStyle = radial(c, cx + 60, cy + 50, 110, [[0, 'rgba(255,90,160,0.35)'], [1, 'rgba(255,90,160,0)']]);
    c.fillRect(x, y, w, h);
  }
  // Rays (more and brighter with rarity).
  const rays = lvl === 1 ? 10 : lvl === 2 ? 16 : 24;
  c.save();
  c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < rays; i++) {
    const a = (i / rays) * Math.PI * 2;
    const spread = lvl === 3 ? 0.07 : 0.05;
    c.fillStyle = hex(lvl === 3 ? 0xffe9a0 : col, lvl === 3 ? 0.16 : 0.1);
    c.beginPath();
    c.moveTo(cx, cy);
    c.lineTo(cx + Math.cos(a - spread) * 320, cy + Math.sin(a - spread) * 320);
    c.lineTo(cx + Math.cos(a + spread) * 320, cy + Math.sin(a + spread) * 320);
    c.closePath();
    c.fill();
  }
  c.restore();
  if (lvl >= 2) {
    // Vortex arcs.
    c.save();
    c.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 6; i++) {
      c.strokeStyle = hex(lvl === 3 ? 0xfff0a8 : shade(col, 0.4), 0.22);
      c.lineWidth = 3;
      c.beginPath();
      c.arc(cx, cy, 70 + i * 16, i * 1.1, i * 1.1 + Math.PI * 0.9);
      c.stroke();
    }
    c.restore();
    // Rune halo.
    c.strokeStyle = hex(lvl === 3 ? 0xffe27a : shade(col, 0.5), 0.7);
    c.lineWidth = 3;
    c.beginPath();
    c.arc(cx, cy, 82, 0, Math.PI * 2);
    c.stroke();
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      c.beginPath();
      c.moveTo(cx + Math.cos(a) * 82, cy + Math.sin(a) * 82);
      c.lineTo(cx + Math.cos(a) * (i % 2 ? 88 : 94), cy + Math.sin(a) * (i % 2 ? 88 : 94));
      c.stroke();
    }
  }
  glow(c, cx, cy, 70 + lvl * 18, lvl === 3 ? 0xfff0a8 : col, 0.55 + lvl * 0.1);
  // Sparkles.
  const n = lvl * 6;
  for (let i = 0; i < n; i++) {
    const sx = x + 20 + ((i * 71) % (w - 40));
    const sy = y + 16 + ((i * 43) % (h - 32));
    const s = 3 + (i % 3) * 2;
    shape(c, star(c, sx, sy, s, 0.35, 4), 'rgba(255,255,255,0.9)', INK, 0);
  }
}

/** One emblem, centred on (x, y); s ≈ 1 means about 120 px tall. */
function emblem(c: Ctx, kind: Emblem, x: number, y: number, s: number, col: number): void {
  const light = hex(shade(col, 0.55));
  const mid = hex(col);
  const dark = hex(shade(col, -0.45));
  const grad = (x0: number, y0: number, x1: number, y1: number) => linear(c, x0, y0, x1, y1, [[0, light], [0.55, mid], [1, dark]]);
  const gold = linear(c, x - 50 * s, y - 50 * s, x + 50 * s, y + 50 * s, [[0, '#fff3b8'], [0.5, '#e6b84a'], [1, '#8a5a12']]);
  const steel = linear(c, x - 40 * s, 0, x + 40 * s, 0, [[0, '#f2f6ff'], [0.5, '#a8b4cc'], [1, '#5a6480']]);
  const S = (v: number) => v * s;
  const flame = (fx: number, fy: number, k: number) => {
    const path = (sc: number) => (p: Ctx) => {
      p.moveTo(fx - S(30) * sc * k, fy + S(30) * k);
      p.bezierCurveTo(fx - S(46) * sc * k, fy - S(10) * k, fx - S(10) * k, fy - S(20) * k, fx - S(4) * k, fy - S(62) * sc * k);
      p.bezierCurveTo(fx + S(18) * k, fy - S(30) * k, fx + S(44) * sc * k, fy - S(18) * k, fx + S(30) * sc * k, fy + S(30) * k);
      p.closePath();
    };
    shape(c, path(1), linear(c, 0, fy - S(62) * k, 0, fy + S(30) * k, [[0, '#ffd06a'], [1, '#ff3a10']]), INK, 3.5);
    shape(c, path(0.62), linear(c, 0, fy - S(40) * k, 0, fy + S(30) * k, [[0, '#fff7c0'], [1, '#ffa02e']]), INK, 0);
  };
  switch (kind) {
    case 'flame':
      flame(x, y + S(10), 1.2);
      break;
    case 'snow': {
      c.lineCap = 'round';
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const ex = x + Math.cos(a) * S(58);
        const ey = y + Math.sin(a) * S(58);
        for (const [w, st] of [[11, INK], [6, light]] as const) {
          c.strokeStyle = st;
          c.lineWidth = S(w);
          c.beginPath();
          c.moveTo(x, y);
          c.lineTo(ex, ey);
          for (const t of [0.5, 0.75]) {
            const bx = x + Math.cos(a) * S(58) * t;
            const by = y + Math.sin(a) * S(58) * t;
            c.moveTo(bx, by);
            c.lineTo(bx + Math.cos(a + 0.7) * S(16), by + Math.sin(a + 0.7) * S(16));
            c.moveTo(bx, by);
            c.lineTo(bx + Math.cos(a - 0.7) * S(16), by + Math.sin(a - 0.7) * S(16));
          }
          c.stroke();
        }
      }
      shape(c, circle(x, y, S(12)), '#ffffff', INK, 3);
      break;
    }
    case 'leaf':
    case 'vine': {
      const leaf = (lx: number, ly: number, a: number, k: number) => {
        c.save();
        c.translate(lx, ly);
        c.rotate(a);
        shape(c, (p) => {
          p.moveTo(0, S(40) * k);
          p.quadraticCurveTo(S(-36) * k, 0, 0, S(-46) * k);
          p.quadraticCurveTo(S(36) * k, 0, 0, S(40) * k);
        }, grad(-S(30), -S(40), S(30), S(40)), INK, 3.5);
        c.strokeStyle = 'rgba(20,60,10,0.6)';
        c.lineWidth = 2.5;
        c.beginPath();
        c.moveTo(0, S(38) * k);
        c.lineTo(0, S(-40) * k);
        c.stroke();
        gloss(c, -S(10) * k, -S(14) * k, S(6), S(14), 0.5);
        c.restore();
      };
      if (kind === 'leaf') {
        leaf(x - S(18), y, -0.5, 1);
        leaf(x + S(18), y + S(4), 0.45, 0.9);
      } else {
        c.strokeStyle = INK;
        c.lineWidth = S(12);
        c.beginPath();
        c.moveTo(x - S(40), y + S(60));
        c.bezierCurveTo(x + S(50), y + S(30), x - S(50), y - S(20), x + S(30), y - S(60));
        c.stroke();
        c.strokeStyle = '#4a9a3a';
        c.lineWidth = S(7);
        c.stroke();
        leaf(x + S(22), y + S(20), 1.1, 0.55);
        leaf(x - S(22), y - S(10), -1.2, 0.55);
        leaf(x + S(30), y - S(56), 0.4, 0.5);
      }
      break;
    }
    case 'bolt':
      shape(c, poly([[x + S(10), y - S(66)], [x - S(34), y + S(6)], [x - S(4), y + S(6)], [x - S(16), y + S(66)], [x + S(36), y - S(14)], [x + S(6), y - S(14)]]), linear(c, 0, y - S(66), 0, y + S(66), [[0, '#fffbd0'], [0.5, '#ffe95c'], [1, '#e6a01a']]), INK, 4);
      gloss(c, x - S(6), y - S(30), S(5), S(14), 0.8);
      break;
    case 'eye':
      shape(c, (p) => {
        p.moveTo(x - S(64), y);
        p.quadraticCurveTo(x, y - S(56), x + S(64), y);
        p.quadraticCurveTo(x, y + S(56), x - S(64), y);
      }, '#fff8ea', INK, 4);
      shape(c, circle(x, y, S(26)), radial(c, x, y, S(26), [[0, light], [0.6, mid], [1, dark]]), INK, 3);
      shape(c, circle(x, y, S(11)), '#140c24', INK, 0);
      gloss(c, x - S(9), y - S(10), S(6), S(4), 1);
      break;
    case 'lens':
      shape(c, roundRect(x + S(24), y + S(22), S(16), S(54), S(6)), '#8a5a2a', INK, 3);
      shape(c, circle(x - S(6), y - S(8), S(46)), gold, INK, 4);
      shape(c, circle(x - S(6), y - S(8), S(34)), radial(c, x - S(6), y - S(8), S(34), [[0, 'rgba(255,255,255,0.9)'], [1, hex(col, 0.7)]]), INK, 3);
      gloss(c, x - S(20), y - S(24), S(12), S(6), 0.9);
      break;
    case 'chest':
      shape(c, roundRect(x - S(56), y - S(10), S(112), S(62), S(8)), linear(c, 0, y, 0, y + S(52), [[0, '#b07a44'], [1, '#6a4020']]), INK, 4);
      shape(c, (p) => {
        p.moveTo(x - S(56), y - S(8));
        p.quadraticCurveTo(x, y - S(70), x + S(56), y - S(8));
        p.closePath();
      }, linear(c, 0, y - S(50), 0, y, [[0, '#d09a5a'], [1, '#8a5a2a']]), INK, 4);
      shape(c, roundRect(x - S(10), y - S(18), S(20), S(30), S(4)), gold, INK, 3);
      glow(c, x, y - S(14), S(50), 0xffd34d, 0.6);
      break;
    case 'heart':
      shape(c, (p) => {
        p.moveTo(x, y + S(56));
        p.bezierCurveTo(x - S(80), y, x - S(44), y - S(64), x, y - S(26));
        p.bezierCurveTo(x + S(44), y - S(64), x + S(80), y, x, y + S(56));
      }, radial(c, x - S(14), y - S(14), S(70), [[0, '#ffb0b8'], [0.5, '#ff4d5e'], [1, '#9a1a2a']]), INK, 4);
      gloss(c, x - S(26), y - S(22), S(12), S(7), 0.9);
      break;
    case 'bag':
    case 'coins':
    case 'pact': {
      const coin = (cx2: number, cy2: number, r2: number) => {
        shape(c, circle(cx2, cy2, r2), gold, INK, 3);
        shape(c, circle(cx2, cy2, r2 * 0.65), 'rgba(255,240,170,0.6)', INK, 0);
        gloss(c, cx2 - r2 * 0.35, cy2 - r2 * 0.4, r2 * 0.3, r2 * 0.18, 0.9);
      };
      if (kind === 'bag') {
        shape(c, (p) => {
          p.moveTo(x - S(20), y - S(40));
          p.quadraticCurveTo(x - S(70), y + S(10), x - S(40), y + S(54));
          p.lineTo(x + S(40), y + S(54));
          p.quadraticCurveTo(x + S(70), y + S(10), x + S(20), y - S(40));
          p.closePath();
        }, linear(c, 0, y - S(40), 0, y + S(54), [[0, '#c89a5a'], [1, '#7a5020']]), INK, 4);
        shape(c, roundRect(x - S(26), y - S(50), S(52), S(14), S(6)), '#5a3a18', INK, 3);
        coin(x, y + S(14), S(20));
      } else if (kind === 'coins') {
        for (let i = 0; i < 7; i++) coin(x - S(50) + ((i * 37) % 100) * s, y - S(50) + ((i * 29) % 100) * s, S(14 + (i % 3) * 4));
      } else {
        coin(x - S(16), y, S(34));
        shape(c, (p) => {
          p.moveTo(x + S(30), y + S(40));
          p.bezierCurveTo(x - S(10), y + S(10), x + S(10), y - S(30), x + S(30), y - S(10));
          p.bezierCurveTo(x + S(50), y - S(30), x + S(70), y + S(10), x + S(30), y + S(40));
        }, '#ff4d5e', INK, 3);
        c.strokeStyle = INK;
        c.lineWidth = 3;
        c.beginPath();
        c.moveTo(x + S(30), y - S(8));
        c.lineTo(x + S(24), y + S(10));
        c.lineTo(x + S(34), y + S(20));
        c.stroke();
      }
      break;
    }
    case 'hammer':
      c.save();
      c.translate(x, y);
      c.rotate(-0.6);
      shape(c, roundRect(-S(7), -S(10), S(14), S(80), S(5)), '#8a5a2a', INK, 3);
      shape(c, roundRect(-S(40), -S(46), S(80), S(36), S(6)), steel, INK, 4);
      gloss(c, -S(20), -S(38), S(14), S(5), 0.8);
      c.restore();
      break;
    case 'flask':
      shape(c, roundRect(x - S(10), y - S(66), S(20), S(26), S(4)), '#cfd8e8', INK, 3);
      shape(c, poly([[x - S(12), y - S(42)], [x + S(12), y - S(42)], [x + S(46), y + S(42)], [x - S(46), y + S(42)]]), 'rgba(230,240,255,0.85)', INK, 4);
      shape(c, poly([[x - S(26), y], [x + S(26), y], [x + S(42), y + S(38)], [x - S(42), y + S(38)]]), radial(c, x, y + S(20), S(40), [[0, light], [0.6, mid], [1, dark]]), INK, 0);
      for (const [bx, by, br] of [[x - S(12), y + S(14), 5], [x + S(10), y + S(24), 4], [x + S(4), y - S(14), 4], [x - S(4), y - S(56), 5]] as const) shape(c, circle(bx, by, S(br)), 'rgba(255,255,255,0.85)', INK, 1.5);
      break;
    case 'hourglass':
    case 'crown': {
      if (kind === 'crown') {
        shape(c, poly([[x - S(54), y - S(10)], [x - S(40), y - S(56)], [x - S(16), y - S(26)], [x, y - S(66)], [x + S(16), y - S(26)], [x + S(40), y - S(56)], [x + S(54), y - S(10)]]), gold, INK, 4);
        for (const gx of [-40, 0, 40]) shape(c, circle(x + S(gx), y - S(gx === 0 ? 66 : 56), S(7)), '#ff5a8a', INK, 2);
        y += S(26);
        s *= 0.72;
      }
      const T = (v: number) => v * s;
      shape(c, roundRect(x - T(44), y - T(64), T(88), T(12), T(4)), gold, INK, 3);
      shape(c, roundRect(x - T(44), y + T(52), T(88), T(12), T(4)), gold, INK, 3);
      shape(c, (p) => {
        p.moveTo(x - T(34), y - T(52));
        p.lineTo(x + T(34), y - T(52));
        p.quadraticCurveTo(x + T(30), y - T(8), x + T(5), y);
        p.quadraticCurveTo(x + T(30), y + T(8), x + T(34), y + T(52));
        p.lineTo(x - T(34), y + T(52));
        p.quadraticCurveTo(x - T(30), y + T(8), x - T(5), y);
        p.quadraticCurveTo(x - T(30), y - T(8), x - T(34), y - T(52));
      }, 'rgba(230,245,255,0.75)', INK, 3.5);
      shape(c, poly([[x - T(22), y - T(30)], [x + T(22), y - T(30)], [x, y - T(4)]]), '#ffd34d', INK, 0);
      shape(c, poly([[x - T(28), y + T(50)], [x + T(28), y + T(50)], [x, y + T(26)]]), '#ffd34d', INK, 0);
      break;
    }
    case 'sword':
      c.save();
      c.translate(x, y);
      c.rotate(0.6);
      shape(c, poly([[-S(9), S(18)], [S(9), S(18)], [S(9), -S(56)], [0, -S(72)], [-S(9), -S(56)]]), steel, INK, 3.5);
      shape(c, roundRect(-S(30), S(14), S(60), S(12), S(5)), gold, INK, 3);
      shape(c, roundRect(-S(6), S(24), S(12), S(32), S(4)), '#6a3fb0', INK, 3);
      shape(c, circle(0, S(60), S(8)), gold, INK, 3);
      c.restore();
      glow(c, x, y - S(20), S(40), col, 0.5);
      break;
    case 'fist':
    case 'wing': {
      if (kind === 'wing') {
        for (let i = 0; i < 4; i++) {
          shape(c, (p) => {
            p.moveTo(x - S(40), y + S(30));
            p.quadraticCurveTo(x - S(10) + i * S(10), y - S(40) - i * S(6), x + S(50) - i * S(6), y - S(50) + i * S(22));
            p.quadraticCurveTo(x, y + S(10), x - S(40), y + S(30));
          }, i % 2 ? '#ffffff' : light, INK, 3);
        }
        break;
      }
      shape(c, roundRect(x - S(42), y - S(36), S(84), S(70), S(22)), linear(c, 0, y - S(36), 0, y + S(34), [[0, '#f2d6b8'], [1, '#b0805a']]), INK, 4);
      for (let i = 0; i < 4; i++) {
        c.strokeStyle = INK;
        c.lineWidth = 3;
        c.beginPath();
        c.moveTo(x - S(30) + i * S(20), y - S(36));
        c.lineTo(x - S(30) + i * S(20), y - S(12));
        c.stroke();
      }
      shape(c, roundRect(x - S(38), y + S(30), S(76), S(32), S(8)), steel, INK, 3.5);
      glow(c, x, y - S(20), S(30), col, 0.6);
      break;
    }
    case 'spiral':
      c.lineCap = 'round';
      for (const [w, st] of [[12, INK], [7, light]] as const) {
        c.strokeStyle = st;
        c.lineWidth = S(w);
        c.beginPath();
        for (let t = 0; t < Math.PI * 5; t += 0.1) {
          const rr = S(6) + t * S(3.6);
          const px = x + Math.cos(t) * rr;
          const py = y + Math.sin(t) * rr;
          if (t === 0) c.moveTo(px, py);
          else c.lineTo(px, py);
        }
        c.stroke();
      }
      break;
    case 'gear':
    case 'sun': {
      const teeth = kind === 'gear' ? 10 : 16;
      shape(c, (p) => {
        for (let i = 0; i < teeth * 2; i++) {
          const a = (i / (teeth * 2)) * Math.PI * 2;
          const rr = i % 2 ? S(kind === 'sun' ? 46 : 50) : S(kind === 'sun' ? 70 : 62);
          if (i === 0) p.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
          else p.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
        }
        p.closePath();
      }, kind === 'sun' ? linear(c, 0, y - S(70), 0, y + S(70), [[0, '#fffbd0'], [1, '#ffb02e']]) : steel, INK, 4);
      shape(c, circle(x, y, S(kind === 'sun' ? 38 : 26)), kind === 'sun' ? radial(c, x, y, S(38), [[0, '#ffffff'], [0.5, '#fff3a8'], [1, '#ffcf4a']]) : gold, INK, 3.5);
      if (kind === 'sun') glow(c, x, y, S(90), 0xfff0a8, 0.9);
      break;
    }
    case 'arrows':
      for (const [dx, a] of [[-18, -0.25], [0, 0], [18, 0.25]] as const) {
        c.save();
        c.translate(x + S(dx), y + S(10));
        c.rotate(a);
        shape(c, roundRect(-S(4), -S(50), S(8), S(90), S(3)), '#8a5a2a', INK, 3);
        shape(c, poly([[0, -S(76)], [S(13), -S(48)], [-S(13), -S(48)]]), steel, INK, 3);
        shape(c, poly([[-S(4), S(34)], [-S(16), S(50)], [-S(4), S(44)]]), '#ff5a5a', INK, 2);
        shape(c, poly([[S(4), S(34)], [S(16), S(50)], [S(4), S(44)]]), '#ff5a5a', INK, 2);
        c.restore();
      }
      break;
    case 'drop':
      shape(c, (p) => {
        p.moveTo(x, y - S(66));
        p.bezierCurveTo(x + S(16), y - S(30), x + S(52), y, x + S(40), y + S(30));
        p.bezierCurveTo(x + S(24), y + S(70), x - S(24), y + S(70), x - S(40), y + S(30));
        p.bezierCurveTo(x - S(52), y, x - S(16), y - S(30), x, y - S(66));
      }, linear(c, 0, y - S(66), 0, y + S(60), [[0, '#d8f6ff'], [0.5, '#ffb347'], [1, '#ff5a1f']]), INK, 4);
      gloss(c, x - S(16), y + S(4), S(8), S(16), 0.8);
      break;
    case 'wind':
      c.lineCap = 'round';
      for (const [dy, len, curl] of [[-34, 90, 20], [0, 110, 26], [34, 76, 16]] as const) {
        for (const [w, st] of [[12, INK], [7, '#eafff6']] as const) {
          c.strokeStyle = st;
          c.lineWidth = S(w);
          c.beginPath();
          c.moveTo(x - S(len) / 2 - S(10), y + S(dy));
          c.lineTo(x + S(len) / 2 - S(curl), y + S(dy));
          c.arc(x + S(len) / 2 - S(curl), y + S(dy) - S(curl), S(curl), Math.PI / 2, -Math.PI * 0.9, true);
          c.stroke();
        }
      }
      break;
    case 'cloud':
      shape(c, (p) => {
        p.moveTo(x - S(60), y + S(10));
        p.arc(x - S(34), y - S(4), S(28), Math.PI * 0.8, Math.PI * 1.7);
        p.arc(x + S(4), y - S(22), S(36), Math.PI * 1.1, Math.PI * 1.95);
        p.arc(x + S(40), y, S(26), Math.PI * 1.4, Math.PI * 0.4);
        p.lineTo(x - S(50), y + S(26));
        p.closePath();
      }, linear(c, 0, y - S(60), 0, y + S(26), [[0, '#e6e2f2'], [1, '#6a6480']]), INK, 4);
      shape(c, poly([[x + S(6), y + S(14)], [x - S(18), y + S(46)], [x, y + S(46)], [x - S(12), y + S(76)], [x + S(22), y + S(36)], [x + S(4), y + S(36)]]), '#ffe95c', INK, 3);
      break;
    case 'crystal':
      for (const [dx, h, w] of [[-28, 70, 22], [26, 60, 20], [0, 96, 28]] as const) {
        shape(c, poly([[x + S(dx), y - S(h) + S(20)], [x + S(dx) + S(w), y + S(30)], [x + S(dx), y + S(50)], [x + S(dx) - S(w), y + S(30)]]), linear(c, x + S(dx) - S(w), 0, x + S(dx) + S(w), 0, [[0, '#ffffff'], [0.5, light], [1, dark]]), INK, 3.5);
      }
      gloss(c, x - S(6), y - S(30), S(5), S(18), 0.9);
      break;
    case 'roots':
      c.lineCap = 'round';
      for (const [w, st] of [[11, INK], [6, '#8a5a2a']] as const) {
        c.strokeStyle = st;
        c.lineWidth = S(w);
        for (const [ex, ey] of [[-60, 60], [-20, 70], [24, 66], [62, 54], [-50, 20], [52, 18]] as const) {
          c.beginPath();
          c.moveTo(x, y - S(20));
          c.quadraticCurveTo(x + S(ex) * 0.3, y + S(ey) * 0.3, x + S(ex), y + S(ey));
          c.stroke();
        }
      }
      shape(c, circle(x, y - S(30), S(22)), grad(x - S(20), y - S(50), x + S(20), y - S(10)), INK, 3.5);
      break;
    case 'tree':
      shape(c, roundRect(x - S(10), y, S(20), S(62), S(5)), '#8a5a2a', INK, 3.5);
      shape(c, circle(x, y - S(20), S(48)), radial(c, x - S(14), y - S(34), S(54), [[0, '#d8ffb0'], [0.5, '#5ad46a'], [1, '#1f7a3a']]), INK, 4);
      for (const [fx, fy] of [[-22, -36], [18, -44], [26, -6], [-28, 0], [0, -20]] as const) shape(c, circle(x + S(fx), y + S(fy), S(6)), '#fff3a8', INK, 2);
      glow(c, x, y - S(20), S(70), 0xd8ffb0, 0.5);
      break;
    case 'feather':
      c.save();
      c.translate(x, y);
      c.rotate(0.5);
      shape(c, (p) => {
        p.moveTo(0, S(70));
        p.bezierCurveTo(-S(50), S(20), -S(30), -S(50), 0, -S(76));
        p.bezierCurveTo(S(30), -S(50), S(50), S(20), 0, S(70));
      }, linear(c, 0, -S(76), 0, S(70), [[0, '#fff3a8'], [0.4, '#ff9a2e'], [1, '#d0201a']]), INK, 4);
      c.strokeStyle = 'rgba(80,10,0,0.7)';
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(0, S(80));
      c.lineTo(0, -S(66));
      for (let i = 0; i < 6; i++) {
        const fy = S(40) - i * S(18);
        c.moveTo(0, fy);
        c.lineTo(-S(22), fy - S(12));
        c.moveTo(0, fy);
        c.lineTo(S(22), fy - S(12));
      }
      c.stroke();
      c.restore();
      flame(x + S(30), y + S(44), 0.45);
      break;
  }
  void ellipse;
}

/** Nav icon of the Grimório: three cards fanned out. */
export function drawIconGrimoire(c: Ctx): void {
  const cards: [number, number, string, string][] = [[-0.35, 0, '#4aa3ff', '#1f4a8a'], [0.35, 0, '#ffc93d', '#8a5a12'], [0, 0, '#b26bff', '#4a1f8a']];
  for (const [a, , l, d] of cards) {
    c.save();
    c.translate(36, 46);
    c.rotate(a);
    shape(c, roundRect(-15, -30, 30, 42, 5), linear(c, 0, -30, 0, 12, [[0, l], [1, d]]), INK, 3);
    shape(c, star(c, 0, -10, 7, 0.45, 4), '#ffffff', INK, 1.5);
    c.restore();
  }
}
