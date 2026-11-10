// Hero rigs: slim anime-chibi characters painted in three layers so they can be animated —
// cape (sways), body, and weapon arm (rotates around the shoulder for attacks).
// Original designs; the proportions are inspired by classic online-RPG sprites.
// Canvas 120×160, feet at y=150, head centered at (60,50), weapon-arm shoulder at (70,80).

import { animeEyes, circle, ellipse, glow, INK, linear, poly, radial, roundRect, shape, star, type Ctx } from './paint';

export const RIG = { w: 120, h: 160, feetY: 150, shoulder: { x: 70, y: 80 } };
const FY = RIG.feetY;
const HX = 60;
const HY = 50;
const SKIN = '#fde0c8';

export interface HeroStyle {
  hair: [string, string, string]; // light, mid, dark
  hairStyle: 'swept' | 'short' | 'long' | 'wild';
  eye: number;
  outfit: [string, string, string];
  trim: string;
  capeOut: [string, string];
  capeIn: string;
  pants: [string, string];
  boots: [string, string];
  robe?: boolean; // long robe instead of legs
  armor?: boolean;
  shield?: boolean;
  weapon: 'staff' | 'sword' | 'scepter' | 'leafstaff';
  headgear?: 'gem' | 'circlet' | 'leaves';
  /** Weapon tip in canvas coordinates (where attack flashes and the mage's orb go). */
  tip: { x: number; y: number };
}

const lw = 2.2; // outline weight: thinner than the monsters for a finer, more "drawn" look

function thickLine(c: Ctx, pts: [number, number][], width: number, color: string | CanvasGradient): void {
  c.lineCap = 'round';
  c.lineJoin = 'round';
  for (const [w, col] of [[width + lw * 2, INK], [width, color]] as const) {
    c.strokeStyle = col;
    c.lineWidth = w;
    c.beginPath();
    c.moveTo(pts[0]![0], pts[0]![1]);
    for (const p of pts.slice(1)) c.lineTo(p[0], p[1]);
    c.stroke();
  }
}

// ───────────────────────── cape ─────────────────────────
export function drawCape(c: Ctx, st: HeroStyle): void {
  const hem: [number, number][] = [[-31, 141], [-24, 135], [-17, 143], [-9, 136], [0, 144], [9, 136], [17, 143], [24, 135], [31, 141]];
  shape(c, (k) => {
    k.moveTo(HX - 12, 76);
    k.bezierCurveTo(HX - 22, 92, HX - 33, 118, HX + hem[0]![0], hem[0]![1]);
    for (const [x, y] of hem.slice(1)) k.lineTo(HX + x, y);
    k.bezierCurveTo(HX + 33, 118, HX + 22, 92, HX + 12, 76);
    k.closePath();
  }, linear(c, 0, 76, 0, 144, [[0, st.capeOut[0]], [1, st.capeOut[1]]]), INK, lw);
  // inner lining showing at the sides + gold piping above the hem
  c.save();
  c.globalAlpha = 0.85;
  for (const s of [-1, 1]) {
    c.fillStyle = st.capeIn;
    c.beginPath();
    c.moveTo(HX + s * 14, 100);
    c.quadraticCurveTo(HX + s * 20, 122, HX + s * 17, 141);
    c.lineTo(HX + s * 9, 135);
    c.quadraticCurveTo(HX + s * 12, 118, HX + s * 9, 100);
    c.closePath();
    c.fill();
  }
  c.restore();
  c.strokeStyle = st.trim;
  c.lineWidth = 1.6;
  c.lineJoin = 'round';
  c.beginPath();
  c.moveTo(HX + hem[0]![0] + 1, hem[0]![1] - 5);
  for (const [x, y] of hem.slice(1)) c.lineTo(HX + x, y - 5);
  c.stroke();
  // soft folds
  c.strokeStyle = 'rgba(0,0,0,0.18)';
  c.lineWidth = 1.4;
  for (const x of [-20, 20]) {
    c.beginPath();
    c.moveTo(HX + x * 0.6, 92);
    c.quadraticCurveTo(HX + x * 1.1, 116, HX + x * 1.15, 134);
    c.stroke();
  }
}

// ───────────────────────── body ─────────────────────────
export function drawBody(c: Ctx, st: HeroStyle): void {
  const hairG = (y0: number, y1: number) => linear(c, 0, y0, 0, y1, [[0, st.hair[0]], [0.55, st.hair[1]], [1, st.hair[2]]]);
  const cloth = linear(c, HX - 12, 0, HX + 12, 0, [[0, st.outfit[0]], [0.5, st.outfit[1]], [1, st.outfit[2]]]);

  // back hair
  if (st.hairStyle === 'long') {
    shape(c, (k) => {
      k.moveTo(HX - 23, HY - 6);
      k.bezierCurveTo(HX - 30, HY + 20, HX - 26, HY + 50, HX - 20, HY + 66);
      k.lineTo(HX - 12, HY + 58);
      k.lineTo(HX - 6, HY + 68);
      k.lineTo(HX, HY + 58);
      k.lineTo(HX + 6, HY + 68);
      k.lineTo(HX + 12, HY + 58);
      k.lineTo(HX + 20, HY + 66);
      k.bezierCurveTo(HX + 26, HY + 50, HX + 30, HY + 20, HX + 23, HY - 6);
      k.quadraticCurveTo(HX, HY - 34, HX - 23, HY - 6);
    }, hairG(HY - 30, HY + 68), INK, lw);
  } else {
    const spikes: [number, number][] =
      st.hairStyle === 'wild'
        ? [[-25, 6], [-33, -2], [-26, -9], [-33, -20], [-22, -22], [-22, -34], [-9, -28], [-2, -40], [8, -29], [20, -36], [21, -23], [33, -22], [26, -10], [32, -1], [25, 7]]
        : st.hairStyle === 'swept'
          ? [[-24, 8], [-29, -4], [-25, -14], [-22, -25], [-10, -30], [4, -33], [16, -29], [25, -22], [33, -24], [29, -12], [34, -4], [27, -2], [25, 8]]
          : [[-24, 6], [-28, -6], [-24, -16], [-20, -26], [-8, -30], [0, -34], [9, -29], [20, -26], [25, -15], [28, -5], [24, 6]];
    shape(c, (k) => {
      k.moveTo(HX + spikes[0]![0], HY + spikes[0]![1]);
      for (const [x, y] of spikes.slice(1)) k.lineTo(HX + x, HY + y);
      k.quadraticCurveTo(HX, HY + 16, HX + spikes[0]![0], HY + spikes[0]![1]);
    }, hairG(HY - 40, HY + 10), INK, lw);
  }

  // legs or robe
  if (st.robe) {
    for (const s of [-1, 1]) shape(c, ellipse(HX + s * 5, FY - 2, 5.5, 3), st.boots[1], INK, 1.6);
    shape(c, (k) => {
      k.moveTo(HX - 8, 99);
      k.quadraticCurveTo(HX - 13, 124, HX - 16, 145);
      k.quadraticCurveTo(HX, 150, HX + 16, 145);
      k.quadraticCurveTo(HX + 13, 124, HX + 8, 99);
      k.closePath();
    }, linear(c, HX - 16, 0, HX + 16, 0, [[0, st.outfit[0]], [0.5, st.outfit[1]], [1, st.outfit[2]]]), INK, lw);
    c.strokeStyle = st.trim;
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(HX - 15, 140); c.quadraticCurveTo(HX, 145, HX + 15, 140);
    c.moveTo(HX, 102); c.lineTo(HX, 142);
    c.stroke();
  } else {
    for (const s of [-1, 1]) {
      const x = HX + s * 4.5;
      shape(c, roundRect(x - 3.4, 102, 6.8, 34, 3), linear(c, 0, 102, 0, 136, [[0, st.pants[0]], [1, st.pants[1]]]), INK, lw);
      shape(c, roundRect(x - 4.4, 130, 8.8, 18, 3), linear(c, 0, 130, 0, 148, [[0, st.boots[0]], [1, st.boots[1]]]), INK, lw);
      shape(c, ellipse(x + s * 1.2, FY - 2, 5.6, 3), st.boots[1], INK, 1.6);
      c.fillStyle = st.trim;
      c.fillRect(x - 4.4, 131, 8.8, 2);
    }
    // coat tails / tassets
    for (const s of [-1, 1]) {
      shape(c, poly([[HX + s * 0.5, 100], [HX + s * 8.5, 100], [HX + s * 13, 125], [HX + s * 3, 121]]),
        st.armor ? linear(c, 0, 100, 0, 125, [[0, '#e6ecf8'], [1, '#8a96b8']]) : cloth, INK, lw);
      c.strokeStyle = st.trim;
      c.lineWidth = 1.5;
      c.beginPath();
      c.moveTo(HX + s * 12.2, 122.5); c.lineTo(HX + s * 3.6, 119);
      c.stroke();
    }
  }

  // torso
  shape(c, poly([[HX - 10, 78], [HX + 10, 78], [HX + 7.5, 102], [HX - 7.5, 102]]), cloth, INK, lw);
  if (st.armor) {
    shape(c, (k) => {
      k.moveTo(HX - 10, 79);
      k.quadraticCurveTo(HX, 75, HX + 10, 79);
      k.lineTo(HX + 8, 96);
      k.quadraticCurveTo(HX, 101, HX - 8, 96);
      k.closePath();
    }, linear(c, HX - 10, 78, HX + 10, 100, [[0, '#ffffff'], [0.45, '#c2cce2'], [1, '#77839f']]), INK, 1.8);
    shape(c, poly([[HX - 2.2, 83], [HX + 2.2, 83], [HX + 1.6, 94], [HX - 1.6, 94]]), st.outfit[1], INK, 1);
  } else {
    c.strokeStyle = st.trim;
    c.lineWidth = 1.6;
    c.beginPath();
    c.moveTo(HX, 82); c.lineTo(HX, 99);
    c.stroke();
    c.fillStyle = st.trim;
    for (const y of [88, 94]) {
      c.beginPath(); c.arc(HX + 3.2, y, 1.2, 0, Math.PI * 2); c.fill();
    }
  }
  shape(c, roundRect(HX - 8.5, 98.5, 17, 4.5, 2), '#3a2a1c', INK, 1.4);
  shape(c, roundRect(HX - 2.4, 98, 4.8, 5.5, 1), st.trim, INK, 1);

  // off-hand arm (screen left)
  thickLine(c, [[HX - 10, 81], [HX - 15.5, 93], [HX - 15, 104]], 5.4, st.outfit[1]);
  c.fillStyle = st.trim;
  c.fillRect(HX - 18.4, 101.5, 6.8, 2);
  shape(c, circle(HX - 15, 107.5, 3.5), SKIN, INK, 1.6);
  if (st.shield) {
    shape(c, (k) => {
      k.moveTo(HX - 30, 92);
      k.quadraticCurveTo(HX - 20, 88, HX - 10, 92);
      k.quadraticCurveTo(HX - 10, 112, HX - 20, 122);
      k.quadraticCurveTo(HX - 30, 112, HX - 30, 92);
    }, linear(c, HX - 30, 90, HX - 10, 120, [[0, '#7fa8ff'], [1, '#2a4a9a']]), INK, lw);
    c.strokeStyle = st.trim;
    c.lineWidth = 1.8;
    c.beginPath();
    c.moveTo(HX - 28, 94); c.quadraticCurveTo(HX - 20, 91, HX - 12, 94);
    c.quadraticCurveTo(HX - 12, 110, HX - 20, 118.5);
    c.quadraticCurveTo(HX - 28, 110, HX - 28, 94);
    c.stroke();
    shape(c, star(c, HX - 20, 104, 5, 0.45), st.trim, INK, 1);
  }

  // shoulder mantle + clasp + collar
  shape(c, (k) => {
    k.moveTo(HX - 17, 81);
    k.quadraticCurveTo(HX, 71, HX + 17, 81);
    k.lineTo(HX + 15, 89);
    k.lineTo(HX + 8, 93);
    k.lineTo(HX, 89.5);
    k.lineTo(HX - 8, 93);
    k.lineTo(HX - 15, 89);
    k.closePath();
  }, linear(c, 0, 74, 0, 93, [[0, st.capeOut[0]], [1, st.capeOut[1]]]), INK, lw);
  c.strokeStyle = st.trim;
  c.lineWidth = 1.5;
  c.lineJoin = 'round';
  c.beginPath();
  c.moveTo(HX - 14, 87); c.lineTo(HX - 8, 90.5); c.lineTo(HX, 87); c.lineTo(HX + 8, 90.5); c.lineTo(HX + 14, 87);
  c.stroke();
  for (const s of [-1, 1]) shape(c, poly([[HX + s * 4, 77], [HX + s * 11, 67], [HX + s * 12, 79]]), st.capeIn, INK, 1.6);
  shape(c, circle(HX, 81, 3.2), st.trim, INK, 1.4);
  glow(c, HX - 0.8, 80.2, 1.6, 0xffffff, 0.9);

  // neck + head
  c.fillStyle = '#f2c4a0';
  c.fillRect(HX - 3, 68, 6, 8);
  shape(c, (k) => {
    k.moveTo(HX - 21, HY - 2);
    k.quadraticCurveTo(HX - 22, HY + 12, HX - 9, HY + 19.5);
    k.quadraticCurveTo(HX, HY + 23.5, HX + 9, HY + 19.5);
    k.quadraticCurveTo(HX + 22, HY + 12, HX + 21, HY - 2);
    k.quadraticCurveTo(HX + 20, HY - 21, HX, HY - 21);
    k.quadraticCurveTo(HX - 20, HY - 21, HX - 21, HY - 2);
  }, radial(c, HX - 5, HY, 28, [[0, '#fff5ec'], [0.7, SKIN], [1, '#f0bf9a']]), INK, lw);
  animeEyes(c, HX, HY + 7.5, 9.5, 6.4, st.eye);
  c.strokeStyle = INK;
  c.lineWidth = 1.5;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(HX - 2.4, HY + 18); c.quadraticCurveTo(HX, HY + 19.2, HX + 2.4, HY + 18);
  c.stroke();
  c.fillStyle = 'rgba(255,120,130,0.3)';
  for (const s of [-1, 1]) {
    c.beginPath(); c.ellipse(HX + s * 14, HY + 14.5, 3.6, 1.8, 0, 0, Math.PI * 2); c.fill();
  }

  // front hair
  const bangs: [number, number][] =
    st.hairStyle === 'swept'
      ? [[-24, 7], [-22, -9], [-16, 0], [-10, -9], [-3, 1], [4, -8], [12, 3], [17, -7], [22, 9], [26, -6]]
      : st.hairStyle === 'long'
        ? [[-24, 8], [-22, -8], [-15, -1], [-9, -9], [-3, -1], [3, -9], [9, -1], [15, -9], [22, -1], [24, 8]]
        : st.hairStyle === 'wild'
          ? [[-25, 8], [-22, -10], [-16, -2], [-11, -12], [-5, -3], [0, -13], [6, -3], [11, -12], [17, -2], [22, -10], [25, 8]]
          : [[-23, 5], [-21, -10], [-14, -4], [-8, -11], [-1, -4], [5, -11], [12, -4], [19, -10], [23, 5]];
  shape(c, (k) => {
    k.moveTo(HX + bangs[0]![0], HY + bangs[0]![1]);
    for (const [x, y] of bangs.slice(1)) k.lineTo(HX + x, HY + y);
    k.quadraticCurveTo(HX + 25, HY - 28, HX, HY - 28);
    k.quadraticCurveTo(HX - 25, HY - 28, HX + bangs[0]![0], HY + bangs[0]![1]);
  }, hairG(HY - 28, HY + 6), INK, lw);
  if (st.hairStyle === 'long') {
    for (const s of [-1, 1]) {
      shape(c, (k) => {
        k.moveTo(HX + s * 19, HY - 2);
        k.quadraticCurveTo(HX + s * 27, HY + 22, HX + s * 21, HY + 44);
        k.quadraticCurveTo(HX + s * 18, HY + 24, HX + s * 16, HY + 6);
        k.closePath();
      }, hairG(HY - 2, HY + 44), INK, 1.8);
    }
  }
  c.strokeStyle = 'rgba(255,255,255,0.45)';
  c.lineWidth = 2.4;
  c.beginPath();
  c.moveTo(HX - 13, HY - 20); c.quadraticCurveTo(HX - 2, HY - 25, HX + 9, HY - 20);
  c.stroke();

  // headgear
  if (st.headgear === 'gem') {
    shape(c, poly([[HX - 2.6, HY - 12], [HX, HY - 15.5], [HX + 2.6, HY - 12], [HX, HY - 8.5]]), '#7fe8ff', INK, 1.1);
  } else if (st.headgear === 'circlet') {
    c.strokeStyle = INK;
    c.lineWidth = 3.6;
    c.beginPath(); c.arc(HX, HY + 4, 24, Math.PI * 1.2, Math.PI * 1.8); c.stroke();
    c.strokeStyle = st.trim;
    c.lineWidth = 2;
    c.stroke();
    shape(c, star(c, HX, HY - 20, 4.6, 0.45), '#fff3a8', INK, 1.1);
  } else if (st.headgear === 'leaves') {
    for (const [x, a] of [[-16, -0.9], [-7, -0.35], [4, 0.2], [14, 0.8]] as const) {
      c.save();
      c.translate(HX + x, HY - 23);
      c.rotate(a);
      shape(c, ellipse(0, -4.5, 3.8, 7), linear(c, 0, -11, 0, 3, [[0, '#b6f08a'], [1, '#3f8f45']]), INK, 1.3);
      c.restore();
    }
    shape(c, circle(HX - 2, HY - 25, 2.6), '#ff6fb0', INK, 1.1);
  }
}

// ───────────────────────── weapon arm ─────────────────────────
export function drawArm(c: Ctx, st: HeroStyle): void {
  const hand: [number, number] = [HX + 26, 102];
  c.lineCap = 'round';
  if (st.weapon === 'staff' || st.weapon === 'leafstaff') {
    const wood: [string, string] = st.weapon === 'staff' ? ['#f2cf6a', '#9a6a1e'] : ['#b88350', '#5a3a1e'];
    thickLine(c, [[HX + 28, 147], [st.tip.x + 0.5, st.tip.y + 12]], 3.4, linear(c, 0, 30, 0, 147, [[0, wood[0]], [1, wood[1]]]));
    if (st.weapon === 'staff') {
      // crescent cradle + small wings
      for (const s of [-1, 1]) {
        shape(c, (k) => {
          k.moveTo(st.tip.x, st.tip.y + 13);
          k.quadraticCurveTo(st.tip.x + s * 15, st.tip.y + 10, st.tip.x + s * 11, st.tip.y - 9);
          k.quadraticCurveTo(st.tip.x + s * 7, st.tip.y + 3, st.tip.x + s * 2.5, st.tip.y + 5);
          k.closePath();
        }, linear(c, 0, st.tip.y - 9, 0, st.tip.y + 13, [[0, '#fff3b0'], [1, '#c8902a']]), INK, 1.8);
      }
      shape(c, circle(st.tip.x, st.tip.y, 5.2), radial(c, st.tip.x - 1.5, st.tip.y - 1.5, 6, [[0, '#ffffff'], [1, '#b9c6ff']]), INK, 1.6);
    } else {
      c.strokeStyle = INK;
      c.lineWidth = 6.5;
      c.beginPath(); c.arc(st.tip.x - 5, st.tip.y + 8, 7, Math.PI * 0.15, Math.PI * 1.55); c.stroke();
      c.strokeStyle = '#b88350';
      c.lineWidth = 3.4;
      c.stroke();
      for (const [x, y, a] of [[6, -2, 0.7], [-13, -1, -0.7], [8, 12, 1.4]] as const) {
        c.save();
        c.translate(st.tip.x + x, st.tip.y + y);
        c.rotate(a);
        shape(c, ellipse(0, 0, 3.8, 7), linear(c, 0, -7, 0, 7, [[0, '#b6f08a'], [1, '#3f8f45']]), INK, 1.3);
        c.restore();
      }
      glow(c, st.tip.x - 5, st.tip.y + 8, 6, 0xb6f08a, 1);
    }
  } else if (st.weapon === 'scepter') {
    thickLine(c, [[HX + 27, 128], [st.tip.x + 0.5, st.tip.y + 9]], 3, linear(c, 0, 50, 0, 128, [[0, '#fff3b0'], [1, '#c8902a']]));
    glow(c, st.tip.x, st.tip.y, 13, 0xfff3a8, 0.55);
    shape(c, star(c, st.tip.x, st.tip.y, 9.5, 0.5, 8), linear(c, 0, st.tip.y - 9, 0, st.tip.y + 9, [[0, '#fff8d0'], [1, '#e8a820']]), INK, 1.6);
    shape(c, circle(st.tip.x, st.tip.y, 3.6), '#bfe6ff', INK, 1.2);
  } else {
    // sword: blade from the hand toward the tip
    const ang = Math.atan2(st.tip.x - hand[0], -(st.tip.y - hand[1]));
    const len = Math.hypot(st.tip.x - hand[0], st.tip.y - hand[1]);
    c.save();
    c.translate(hand[0], hand[1]);
    c.rotate(ang);
    shape(c, poly([[-3, -5], [3, -5], [3, -len + 7], [0, -len], [-3, -len + 7]]), linear(c, -3, 0, 3, 0, [[0, '#ffffff'], [0.5, '#dfe7f5'], [1, '#8a96b8']]), INK, 1.8);
    c.strokeStyle = 'rgba(120,140,180,0.9)';
    c.lineWidth = 1;
    c.beginPath(); c.moveTo(0, -8); c.lineTo(0, -len + 9); c.stroke();
    shape(c, roundRect(-8.5, -7, 17, 4.2, 2), st.trim, INK, 1.4);
    shape(c, roundRect(-2, -3, 4, 10, 1.6), '#5a3a1e', INK, 1.3);
    shape(c, circle(0, 8.5, 2.6), st.trim, INK, 1.1);
    c.restore();
  }
  // sleeve + cuff + hand (over the weapon)
  thickLine(c, [[RIG.shoulder.x, RIG.shoulder.y + 1], [HX + 20, 92], [hand[0] - 0.5, hand[1] - 3]], 5.4, st.outfit[1]);
  c.fillStyle = st.trim;
  c.fillRect(hand[0] - 4, hand[1] - 5.5, 7, 2);
  shape(c, circle(hand[0], hand[1], 3.7), SKIN, INK, 1.6);
}

export function drawHero(c: Ctx, st: HeroStyle): void {
  drawCape(c, st);
  drawBody(c, st);
  drawArm(c, st);
}

export type HeroTexture = 'hero_arcanist' | 'hero_knight' | 'hero_priest' | 'hero_druid';

export const HERO_STYLES: Record<HeroTexture, HeroStyle> = {
  // Arcanista: silver hair, midnight robes, wine cape with gold filigree.
  hero_arcanist: {
    hair: ['#f4f1ff', '#c9c2e8', '#8f86bd'],
    hairStyle: 'swept',
    eye: 0x7a3fd0,
    outfit: ['#4a4f9a', '#2f3272', '#1c1d4a'],
    trim: '#f0c050',
    capeOut: ['#8a2f5a', '#4a1436'],
    capeIn: '#f3e2c0',
    pants: ['#2a2c5a', '#17183a'],
    boots: ['#5a3a2a', '#2e1c12'],
    weapon: 'staff',
    headgear: 'gem',
    tip: { x: 90, y: 22 },
  },
  // Cavaleiro: blond, steel breastplate over royal blue, crimson cape.
  hero_knight: {
    hair: ['#fff0b0', '#e8c060', '#a8802c'],
    hairStyle: 'short',
    eye: 0x2a5aa8,
    outfit: ['#5a8af0', '#3458c0', '#1f3884'],
    trim: '#f0c050',
    capeOut: ['#d0423c', '#7a1c22'],
    capeIn: '#f3e2c0',
    pants: ['#3a4468', '#232a44'],
    boots: ['#b8c4dc', '#6a7696'],
    armor: true,
    shield: true,
    weapon: 'sword',
    tip: { x: 103, y: 58 },
  },
  // Sacerdotisa: long rose hair, white-and-gold robes, sky cape.
  hero_priest: {
    hair: ['#ffd9ec', '#f79ac4', '#c2608f'],
    hairStyle: 'long',
    eye: 0x3a78c8,
    outfit: ['#ffffff', '#f1ecf8', '#cfc4e2'],
    trim: '#e8b030',
    capeOut: ['#8fc4ff', '#4a78c8'],
    capeIn: '#fff6e0',
    pants: ['#ffffff', '#d8d0e8'],
    boots: ['#e8b030', '#9a6a1e'],
    robe: true,
    weapon: 'scepter',
    headgear: 'circlet',
    tip: { x: 89, y: 50 },
  },
  // Druida: wild green hair, leather and moss, bark-brown cape.
  hero_druid: {
    hair: ['#c8f59a', '#62c044', '#2f7a34'],
    hairStyle: 'wild',
    eye: 0x2f7a34,
    outfit: ['#a88a58', '#7c6238', '#4e3c20'],
    trim: '#9ae66a',
    capeOut: ['#5f8a4a', '#2c4a28'],
    capeIn: '#d9c79a',
    pants: ['#5a4428', '#33260f'],
    boots: ['#6b4426', '#3a2210'],
    weapon: 'leafstaff',
    headgear: 'leaves',
    tip: { x: 92, y: 30 },
  },
};

/** Druid's bear companion (100×100, feet at y=92). */
export function drawBear(c: Ctx): void {
  const cx = 50;
  const fur = (r: number, x: number, y: number) =>
    radial(c, x, y, r * 1.2, [[0, '#c48a52'], [0.6, '#9a6232'], [1, '#6a3e1a']], x - r * 0.35, y - r * 0.45);
  for (const s of [-1, 1]) shape(c, ellipse(cx + s * 13, 86, 9, 7), fur(9, cx + s * 13, 86), INK, lw);
  shape(c, ellipse(cx, 66, 24, 22), fur(24, cx, 66), INK, 2.6);
  shape(c, ellipse(cx, 70, 13, 12), '#e8c896', INK, 0);
  for (const s of [-1, 1]) shape(c, ellipse(cx + s * 23, 64, 7.5, 12, s * 0.4), fur(12, cx + s * 23, 64), INK, lw);
  for (const s of [-1, 1]) {
    shape(c, circle(cx + s * 17, 18, 8), fur(8, cx + s * 17, 18), INK, lw);
    shape(c, circle(cx + s * 17, 18, 4), '#e8a8a0', INK, 0);
  }
  shape(c, ellipse(cx, 34, 23, 20), fur(23, cx, 34), INK, 2.6);
  shape(c, ellipse(cx, 42, 10.5, 8), '#efd2a6', INK, 1.6);
  shape(c, ellipse(cx, 38.5, 4.4, 3), '#2a1a10', INK, 0);
  c.strokeStyle = INK;
  c.lineWidth = 1.8;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(cx, 41); c.lineTo(cx, 45);
  c.moveTo(cx - 4.5, 46.5); c.quadraticCurveTo(cx, 48.5, cx + 4.5, 46.5);
  c.stroke();
  for (const s of [-1, 1]) {
    shape(c, circle(cx + s * 9, 31, 3.2), '#2a1a10', INK, 0);
    c.fillStyle = '#fff';
    c.beginPath(); c.arc(cx + s * 9 - 1, 30, 1.2, 0, Math.PI * 2); c.fill();
  }
  shape(c, (k) => {
    k.moveTo(cx - 17, 51);
    k.quadraticCurveTo(cx, 57, cx + 17, 51);
    k.lineTo(cx + 15, 57);
    k.quadraticCurveTo(cx, 63, cx - 15, 57);
    k.closePath();
  }, linear(c, 0, 51, 0, 63, [[0, '#e0504a'], [1, '#9a2a2a']]), INK, 1.8);
  shape(c, poly([[cx - 3.5, 59], [cx + 3.5, 59], [cx, 68]]), '#c03a3a', INK, 1.3);
}
