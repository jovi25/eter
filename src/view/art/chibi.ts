// Anime-chibi hero template (original designs, inspired by classic online-RPG chibi sprites).
// Canvas 112×144, feet at y=136, head centered at (52,46). Weapon held on the right.

import { animeEyes, circle, ellipse, glow, INK, linear, poly, radial, roundRect, shape, star, type Ctx } from './paint';

export interface ChibiStyle {
  hair: [string, string, string]; // light, mid, dark
  hairStyle: 'spiky' | 'long' | 'messy';
  eye: number;
  coat: [string, string, string]; // light → shadow
  trim: string;
  piping: string;
  inner: [string, string];
  scarf?: [string, string];
  armor?: boolean; // silver chest plate over the coat
  weapon: 'staff' | 'sword' | 'scepter' | 'leafstaff';
  shield?: boolean;
  headgear?: 'gem' | 'leaves' | 'circlet';
}

const FY = 136;
const HX = 52;
const HY = 46;

export function drawChibi(c: Ctx, st: ChibiStyle): void {
  const hairG = (y0: number, y1: number) => linear(c, 0, y0, 0, y1, [[0, st.hair[0]], [0.5, st.hair[1]], [1, st.hair[2]]]);
  const coat = linear(c, 20, 0, 92, 0, [[0, st.coat[0]], [0.55, st.coat[1]], [1, st.coat[2]]]);
  const skin = radial(c, HX - 6, HY - 4, 30, [[0, '#fff4ea'], [0.7, '#fde0c8'], [1, '#f2c4a0']]);

  weaponBack(c, st);

  // back hair
  if (st.hairStyle === 'long') {
    shape(c, (k) => {
      k.moveTo(HX - 28, HY - 10);
      k.quadraticCurveTo(HX - 40, HY + 40, HX - 30, HY + 66);
      k.lineTo(HX + 30, HY + 66);
      k.quadraticCurveTo(HX + 40, HY + 40, HX + 28, HY - 10);
      k.quadraticCurveTo(HX, HY - 40, HX - 28, HY - 10);
      k.closePath();
    }, hairG(HY - 40, HY + 66), INK, 3);
  } else {
    shape(c, (k) => {
      const pts: [number, number][] = st.hairStyle === 'messy'
        ? [[-30, 8], [-38, -2], [-31, -12], [-38, -22], [-24, -30], [-20, -42], [-6, -36], [4, -46], [14, -36], [30, -40], [29, -24], [38, -12], [31, -2], [31, 10]]
        : [[-30, 8], [-36, -4], [-30, -14], [-34, -24], [-22, -30], [-18, -40], [-4, -36], [6, -44], [14, -34], [28, -36], [28, -22], [36, -14], [30, -2], [30, 10]];
      k.moveTo(HX + pts[0]![0], HY + pts[0]![1]);
      for (const [x, y] of pts.slice(1)) k.lineTo(HX + x, HY + y);
      k.quadraticCurveTo(HX, HY + 18, HX - 30, HY + 8);
      k.closePath();
    }, hairG(HY - 44, HY + 14), INK, 3);
  }

  // boots
  for (const s of [-1, 1]) {
    shape(c, roundRect(HX + s * 9 - 6, FY - 14, 13, 14, 4), linear(c, 0, FY - 14, 0, FY, [[0, '#6b4426'], [1, '#3a2210']]), INK, 2.5);
    shape(c, ellipse(HX + s * 9 + s * 2, FY - 1, 8, 3.5), '#2a1a0c', INK, 1.5);
  }
  // coat
  shape(c, (k) => {
    k.moveTo(HX - 14, HY + 22);
    k.quadraticCurveTo(HX - 30, HY + 50, HX - 32, FY - 10);
    k.lineTo(HX - 8, FY - 14);
    k.lineTo(HX, HY + 40);
    k.lineTo(HX + 8, FY - 14);
    k.lineTo(HX + 32, FY - 10);
    k.quadraticCurveTo(HX + 30, HY + 50, HX + 14, HY + 22);
    k.closePath();
  }, coat, INK, 3);
  c.strokeStyle = st.trim;
  c.lineWidth = 4;
  c.beginPath();
  c.moveTo(HX - 31, FY - 12); c.lineTo(HX - 8, FY - 16);
  c.moveTo(HX + 8, FY - 16); c.lineTo(HX + 31, FY - 12);
  c.stroke();
  c.strokeStyle = st.piping;
  c.lineWidth = 1.5;
  c.beginPath();
  c.moveTo(HX - 30, FY - 16); c.lineTo(HX - 8, FY - 19);
  c.moveTo(HX + 8, FY - 19); c.lineTo(HX + 30, FY - 16);
  c.stroke();
  // inner tunic + belt
  shape(c, poly([[HX - 9, HY + 26], [HX + 9, HY + 26], [HX + 7, FY - 16], [HX - 7, FY - 16]]), linear(c, 0, HY + 26, 0, FY, [[0, st.inner[0]], [1, st.inner[1]]]), INK, 2);
  if (st.armor) {
    shape(c, (k) => {
      k.moveTo(HX - 15, HY + 22);
      k.quadraticCurveTo(HX, HY + 18, HX + 15, HY + 22);
      k.lineTo(HX + 13, HY + 44);
      k.quadraticCurveTo(HX, HY + 50, HX - 13, HY + 44);
      k.closePath();
    }, linear(c, HX - 15, 0, HX + 15, 0, [[0, '#f2f6ff'], [0.5, '#b8c4dc'], [1, '#7a86a8']]), INK, 2.5);
    shape(c, poly([[HX - 3, HY + 28], [HX + 3, HY + 28], [HX + 2, HY + 40], [HX - 2, HY + 40]]), '#4a7ad0', INK, 1.2);
    for (const s of [-1, 1]) shape(c, ellipse(HX + s * 16, HY + 24, 8, 5.5), linear(c, 0, HY + 18, 0, HY + 30, [[0, '#f2f6ff'], [1, '#8a96b8']]), INK, 2);
  }
  shape(c, roundRect(HX - 11, HY + 44, 22, 5, 2), st.trim, INK, 1.5);
  shape(c, roundRect(HX - 3, HY + 43, 6, 7, 1.5), '#f0c050', INK, 1.2);
  if (!st.armor) {
    for (const s of [-1, 1]) {
      shape(c, poly([[HX + s * 12, HY + 22], [HX + s * 3, HY + 38], [HX + s * 10, HY + 40]]), st.coat[2], INK, 1.5);
      shape(c, circle(HX + s * 10, HY + 48, 2), '#f0c050', INK, 1);
      shape(c, circle(HX + s * 11, HY + 56, 2), '#f0c050', INK, 1);
    }
  }
  // sleeves + hands
  shape(c, (k) => {
    k.moveTo(HX + 12, HY + 24);
    k.quadraticCurveTo(HX + 30, HY + 34, HX + 34, HY + 50);
    k.lineTo(HX + 26, HY + 54);
    k.quadraticCurveTo(HX + 20, HY + 40, HX + 10, HY + 34);
    k.closePath();
  }, coat, INK, 2.5);
  shape(c, circle(HX + 32, HY + 54, 5.5), '#fde0c8', INK, 2);
  shape(c, (k) => {
    k.moveTo(HX - 12, HY + 24);
    k.quadraticCurveTo(HX - 26, HY + 36, HX - 26, HY + 52);
    k.lineTo(HX - 18, HY + 54);
    k.quadraticCurveTo(HX - 16, HY + 40, HX - 8, HY + 34);
    k.closePath();
  }, coat, INK, 2.5);
  shape(c, circle(HX - 22, HY + 56, 5), '#fde0c8', INK, 2);
  if (st.shield) {
    shape(c, (k) => {
      k.moveTo(HX - 36, HY + 36);
      k.quadraticCurveTo(HX - 24, HY + 32, HX - 12, HY + 36);
      k.quadraticCurveTo(HX - 12, HY + 62, HX - 24, HY + 72);
      k.quadraticCurveTo(HX - 36, HY + 62, HX - 36, HY + 36);
      k.closePath();
    }, linear(c, HX - 36, 0, HX - 12, 0, [[0, '#5a8ae8'], [1, '#2a4a9a']]), INK, 2.5);
    c.strokeStyle = '#f0c050';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(HX - 34, HY + 38); c.quadraticCurveTo(HX - 24, HY + 35, HX - 14, HY + 38);
    c.stroke();
    shape(c, star(c, HX - 24, HY + 50, 6, 0.45), '#f0c050', INK, 1.2);
  }
  if (st.scarf) {
    shape(c, (k) => {
      k.moveTo(HX - 15, HY + 18);
      k.quadraticCurveTo(HX, HY + 26, HX + 15, HY + 18);
      k.lineTo(HX + 14, HY + 25);
      k.quadraticCurveTo(HX, HY + 32, HX - 14, HY + 25);
      k.closePath();
    }, linear(c, 0, HY + 18, 0, HY + 32, [[0, st.scarf[0]], [1, st.scarf[1]]]), INK, 2);
    shape(c, poly([[HX + 8, HY + 26], [HX + 15, HY + 27], [HX + 17, HY + 42], [HX + 10, HY + 40]]), linear(c, 0, HY + 26, 0, HY + 42, [[0, st.scarf[0]], [1, st.scarf[1]]]), INK, 1.8);
  }

  weaponFront(c, st);

  // head
  shape(c, (k) => {
    k.moveTo(HX - 22, HY - 6);
    k.quadraticCurveTo(HX - 23, HY + 12, HX - 8, HY + 20);
    k.quadraticCurveTo(HX, HY + 24, HX + 8, HY + 20);
    k.quadraticCurveTo(HX + 23, HY + 12, HX + 22, HY - 6);
    k.quadraticCurveTo(HX, HY - 22, HX - 22, HY - 6);
  }, skin, INK, 2.5);
  for (const s of [-1, 1]) shape(c, ellipse(HX + s * 22, HY + 4, 3.5, 5.5), '#f6cfae', INK, 1.5);
  animeEyes(c, HX, HY + 9, 10, 7.4, st.eye);
  c.strokeStyle = 'rgba(160,90,60,0.7)';
  c.lineWidth = 1.5;
  c.beginPath(); c.moveTo(HX + 1, HY + 15); c.lineTo(HX, HY + 16.5); c.stroke();
  c.strokeStyle = INK;
  c.lineWidth = 1.8;
  c.beginPath(); c.moveTo(HX - 3, HY + 19.5); c.quadraticCurveTo(HX, HY + 21, HX + 3, HY + 19.5); c.stroke();
  c.fillStyle = 'rgba(255,130,130,0.35)';
  for (const s of [-1, 1]) {
    c.beginPath(); c.ellipse(HX + s * 14, HY + 16, 4, 2, 0, 0, Math.PI * 2); c.fill();
  }

  // front hair
  if (st.hairStyle === 'long') {
    // side locks over the shoulders
    for (const s of [-1, 1]) {
      shape(c, (k) => {
        k.moveTo(HX + s * 18, HY - 4);
        k.quadraticCurveTo(HX + s * 28, HY + 24, HX + s * 22, HY + 52);
        k.quadraticCurveTo(HX + s * 18, HY + 30, HX + s * 14, HY + 6);
        k.closePath();
      }, hairG(HY - 4, HY + 52), INK, 2);
    }
  }
  shape(c, (k) => {
    k.moveTo(HX - 25, HY + 6);
    k.lineTo(HX - 23, HY - 12);
    k.lineTo(HX - 15, HY - 4);
    k.lineTo(HX - 12, HY - 12);
    k.lineTo(HX - 5, HY - 3);
    k.lineTo(HX - 1, HY - 11);
    k.lineTo(HX + 5, HY - 3);
    k.lineTo(HX + 10, HY - 12);
    k.lineTo(HX + 15, HY - 4);
    k.lineTo(HX + 22, HY - 11);
    k.lineTo(HX + 25, HY + 6);
    k.lineTo(HX + 28, HY - 14);
    k.quadraticCurveTo(HX + 20, HY - 30, HX, HY - 30);
    k.quadraticCurveTo(HX - 22, HY - 30, HX - 29, HY - 14);
    k.closePath();
  }, hairG(HY - 30, HY + 4), INK, 2.5);
  c.strokeStyle = 'rgba(255,240,220,0.5)';
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(HX - 14, HY - 22); c.quadraticCurveTo(HX - 2, HY - 27, HX + 10, HY - 22);
  c.stroke();

  // headgear
  if (st.headgear === 'gem') {
    shape(c, poly([[HX - 3, HY - 13], [HX, HY - 17], [HX + 3, HY - 13], [HX, HY - 9]]), linear(c, 0, HY - 17, 0, HY - 9, [[0, '#d8f6ff'], [1, '#4aa3ff']]), INK, 1.2);
  } else if (st.headgear === 'circlet') {
    c.strokeStyle = INK;
    c.lineWidth = 4;
    c.beginPath(); c.arc(HX, HY + 2, 24, Math.PI * 1.18, Math.PI * 1.82); c.stroke();
    c.strokeStyle = '#f0c050';
    c.lineWidth = 2.2;
    c.stroke();
    shape(c, star(c, HX, HY - 22, 5, 0.45), '#fff3a8', INK, 1.2);
  } else if (st.headgear === 'leaves') {
    for (const [x, a] of [[-18, -0.8], [-8, -0.3], [4, 0.2], [16, 0.7]] as const) {
      c.save();
      c.translate(HX + x, HY - 24);
      c.rotate(a);
      shape(c, ellipse(0, -5, 4.5, 8), linear(c, 0, -13, 0, 3, [[0, '#9ae66a'], [1, '#3f8f45']]), INK, 1.5);
      c.restore();
    }
    shape(c, circle(HX - 2, HY - 26, 3), '#ff6fb0', INK, 1.2);
  }
}

/** Long weapons drawn behind the body. */
function weaponBack(c: Ctx, st: ChibiStyle): void {
  c.lineCap = 'round';
  if (st.weapon === 'staff' || st.weapon === 'leafstaff' || st.weapon === 'scepter') {
    const wood = st.weapon === 'staff' || st.weapon === 'scepter';
    const top = st.weapon === 'scepter' ? 52 : 30;
    c.strokeStyle = INK;
    c.lineWidth = 8;
    c.beginPath(); c.moveTo(84, FY - (st.weapon === 'scepter' ? 40 : 4)); c.lineTo(96, top); c.stroke();
    c.strokeStyle = wood
      ? linear(c, 0, top, 0, FY, [[0, '#f0c050'], [0.5, '#c8902a'], [1, '#8a5a1a']])
      : linear(c, 0, top, 0, FY, [[0, '#a8743f'], [1, '#5a3a1e']]);
    c.lineWidth = 4.5;
    c.stroke();
  }
  if (st.weapon === 'staff') {
    for (const s of [-1, 1]) {
      shape(c, (k) => {
        k.moveTo(96, 32);
        k.quadraticCurveTo(96 + s * 18, 30, 96 + s * 14, 12);
        k.quadraticCurveTo(96 + s * 8, 22, 96 + s * 3, 22);
        k.closePath();
      }, linear(c, 0, 10, 0, 34, [[0, '#fff1a8'], [1, '#c8902a']]), INK, 2);
    }
    shape(c, circle(96, 32, 4), '#c8902a', INK, 1.5);
  } else if (st.weapon === 'leafstaff') {
    // curled top with leaves and a little glowing seed
    c.strokeStyle = INK;
    c.lineWidth = 7;
    c.beginPath(); c.arc(92, 26, 8, Math.PI * 0.2, Math.PI * 1.6); c.stroke();
    c.strokeStyle = '#a8743f';
    c.lineWidth = 4;
    c.stroke();
    for (const [x, y, a] of [[100, 18, 0.6], [84, 18, -0.6], [104, 30, 1.2]] as const) {
      c.save();
      c.translate(x, y);
      c.rotate(a);
      shape(c, ellipse(0, 0, 4.5, 8), linear(c, 0, -8, 0, 8, [[0, '#9ae66a'], [1, '#3f8f45']]), INK, 1.5);
      c.restore();
    }
    glow(c, 92, 26, 7, 0x9ae66a, 1);
  } else if (st.weapon === 'scepter') {
    shape(c, circle(96, 46, 9), radial(c, 96, 46, 10, [[0, '#ffffff'], [1, '#bfe6ff']]), INK, 2);
    shape(c, star(c, 96, 46, 7, 0.45), '#f0c050', INK, 1.2);
    glow(c, 96, 46, 14, 0xfff3a8, 0.6);
  }
}

/** Short weapons drawn in front (sword held by the right hand). */
function weaponFront(c: Ctx, st: ChibiStyle): void {
  if (st.weapon !== 'sword') return;
  c.save();
  c.translate(HX + 32, HY + 54);
  c.rotate(-0.35);
  // blade
  shape(c, poly([[-3.5, -6], [3.5, -6], [3.5, -50], [0, -58], [-3.5, -50]]), linear(c, -4, 0, 4, 0, [[0, '#ffffff'], [0.5, '#d8e2f2'], [1, '#8a96b8']]), INK, 2);
  c.strokeStyle = 'rgba(255,255,255,0.8)';
  c.lineWidth = 1;
  c.beginPath(); c.moveTo(-1, -10); c.lineTo(-1, -48); c.stroke();
  // guard + grip
  shape(c, roundRect(-10, -8, 20, 5, 2), '#f0c050', INK, 1.5);
  shape(c, roundRect(-2.5, -3, 5, 12, 2), '#6b4426', INK, 1.5);
  shape(c, circle(0, 10, 3), '#f0c050', INK, 1.2);
  c.restore();
}

export const CHIBI_STYLES: Record<'hero_arcanist' | 'hero_knight' | 'hero_priest' | 'hero_druid', ChibiStyle> = {
  hero_arcanist: {
    hair: ['#7a4a2a', '#5a3218', '#3a200e'],
    hairStyle: 'spiky',
    eye: 0x7a4220,
    coat: ['#fbf3e2', '#e8d9bb', '#c4ad85'],
    trim: '#7a4a24',
    piping: '#e8b84a',
    inner: ['#4a3020', '#2a1a10'],
    scarf: ['#e0504a', '#9a2a2a'],
    weapon: 'staff',
    headgear: 'gem',
  },
  hero_knight: {
    hair: ['#ffe9a0', '#e8c060', '#b08a30'],
    hairStyle: 'spiky',
    eye: 0x2a5aa8,
    coat: ['#6a9aff', '#3a64c8', '#22408a'],
    trim: '#22408a',
    piping: '#f0c050',
    inner: ['#3a3a52', '#22222e'],
    armor: true,
    weapon: 'sword',
    shield: true,
  },
  hero_priest: {
    hair: ['#9ad0ff', '#5a90e0', '#3a5aa8'],
    hairStyle: 'long',
    eye: 0x3a5aa8,
    coat: ['#ffffff', '#f2eef8', '#d6cce8'],
    trim: '#c8902a',
    piping: '#6a9aff',
    inner: ['#bfe0ff', '#7aaae0'],
    weapon: 'scepter',
    headgear: 'circlet',
  },
  hero_druid: {
    hair: ['#b6f08a', '#5cbf3f', '#2f7a34'],
    hairStyle: 'messy',
    eye: 0x2f7a34,
    coat: ['#c9a46a', '#9c7a47', '#6b5030'],
    trim: '#3f6b3a',
    piping: '#9ae66a',
    inner: ['#3f6b3a', '#22401f'],
    scarf: ['#7fcf5a', '#3f8f45'],
    weapon: 'leafstaff',
    headgear: 'leaves',
  },
};

/** Druid's bear companion (100×100, feet at y=92). */
export function drawBear(c: Ctx): void {
  const cx = 50;
  const fur = (r: number, x: number, y: number) =>
    radial(c, x, y, r * 1.2, [[0, '#c48a52'], [0.6, '#9a6232'], [1, '#6a3e1a']], x - r * 0.35, y - r * 0.45);
  // legs
  for (const s of [-1, 1]) shape(c, ellipse(cx + s * 16, 86, 11, 8), fur(11, cx + s * 16, 86), INK, 2.5);
  // body
  shape(c, ellipse(cx, 66, 30, 24), fur(30, cx, 66), INK, 3);
  shape(c, ellipse(cx, 70, 17, 14), '#e8c896', INK, 0);
  // arms
  for (const s of [-1, 1]) shape(c, ellipse(cx + s * 28, 66, 9, 13, s * 0.4), fur(13, cx + s * 28, 66), INK, 2.5);
  // ears
  for (const s of [-1, 1]) {
    shape(c, circle(cx + s * 19, 18, 9), fur(9, cx + s * 19, 18), INK, 2.5);
    shape(c, circle(cx + s * 19, 18, 4.5), '#e8a8a0', INK, 0);
  }
  // head
  shape(c, ellipse(cx, 36, 26, 22), fur(26, cx, 36), INK, 3);
  shape(c, ellipse(cx, 44, 12, 9), '#efd2a6', INK, 2);
  shape(c, ellipse(cx, 40, 5, 3.5), '#2a1a10', INK, 0);
  c.strokeStyle = INK;
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(cx, 43); c.lineTo(cx, 47);
  c.moveTo(cx - 5, 49); c.quadraticCurveTo(cx, 51, cx + 5, 49);
  c.stroke();
  for (const s of [-1, 1]) {
    shape(c, circle(cx + s * 10, 32, 3.6), '#2a1a10', INK, 0);
    c.fillStyle = '#fff';
    c.beginPath(); c.arc(cx + s * 10 - 1, 31, 1.3, 0, Math.PI * 2); c.fill();
  }
  // red bandana
  shape(c, (k) => {
    k.moveTo(cx - 20, 54);
    k.quadraticCurveTo(cx, 60, cx + 20, 54);
    k.lineTo(cx + 18, 60);
    k.quadraticCurveTo(cx, 66, cx - 18, 60);
    k.closePath();
  }, linear(c, 0, 54, 0, 66, [[0, '#e0504a'], [1, '#9a2a2a']]), INK, 2);
  shape(c, poly([[cx - 4, 62], [cx + 4, 62], [cx, 72]]), '#c03a3a', INK, 1.5);
}
