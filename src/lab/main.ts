// Laboratório de criaturas (lab.html): shows the art options animated, so the player can pick one
// before it goes into the game. Tap an option to see its attack. `?still=A` draws a fixed sheet
// (used to make the preview pictures).
import { ellipse, linear, shape, softShadow, type Ctx } from '../view/art/paint';
import { STYLES, type Form, type Pose, type Style } from './designs';
import { SKINS, drawDragon, type Skin } from './dragons';

const W = 720;
const H = 300;
const FEET = 262;
const SLOTS = [110, 340, 570];
const ATTACK = 0.9; // seconds

const root = document.getElementById('lab')!;
const still = new URLSearchParams(location.search).get('still');
const dpr = Math.min(2, window.devicePixelRatio || 1);

function canvas(h = H): Ctx {
  const el = document.createElement('canvas');
  el.width = W * dpr;
  el.height = h * dpr;
  const c = el.getContext('2d')!;
  c.scale(dpr, dpr);
  return c;
}

function ground(c: Ctx, slots: number[], h = H, feet = FEET): void {
  c.fillStyle = linear(c, 0, 0, 0, h, [[0, '#8dbb57'], [1, '#5e9038']]);
  c.fillRect(0, 0, W, h);
  c.strokeStyle = 'rgba(40,80,20,0.35)';
  c.lineWidth = 2;
  for (let i = 0; i < 70; i++) {
    const x = (i * 97) % W;
    const y = (i * 53) % h;
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x - 3, y - 7);
    c.moveTo(x + 4, y);
    c.lineTo(x + 6, y - 6);
    c.stroke();
  }
  for (const x of slots) {
    softShadow(c, x, feet + 8, 60, 16, 0.35);
    shape(c, ellipse(x, feet + 4, 50, 15), linear(c, 0, feet - 10, 0, feet + 20, [[0, '#8f8aa6'], [1, '#4c4864']]), '#1d1530', 3);
    shape(c, ellipse(x, feet - 1, 42, 11), linear(c, 0, feet - 12, 0, feet + 10, [[0, '#c4bfd8'], [1, '#8a86a2']]), '#1d1530', 0);
  }
}

function label(text: string, cls = 'tag'): HTMLElement {
  const el = document.createElement('p');
  el.className = cls;
  el.textContent = text;
  return el;
}

function names(forms: { name: string }[]): HTMLElement {
  const d = document.createElement('div');
  d.className = 'names';
  for (const f of forms) {
    const s = document.createElement('span');
    s.textContent = f.name;
    d.appendChild(s);
  }
  return d;
}

function header(s: Style, sec: HTMLElement): void {
  const h = document.createElement('h2');
  h.textContent = s.title;
  sec.append(h, label(s.blurb, ''));
}

// ── Dragões elementais: one row per element, the three growth stages side by side ──
const RH = 200;
const RFEET = 184;
const RSLOTS = [200, 404, 596];

function dragonRow(c: Ctx, sk: Skin, pose: (st: number) => Pose): void {
  c.fillStyle = linear(c, 0, 0, W, 0, [[0, sk.band[0]], [1, sk.band[1]]]);
  c.fillRect(0, 0, W, RH);
  c.fillStyle = 'rgba(0,0,0,0.18)';
  c.fillRect(0, RFEET - 6, W, RH - RFEET + 6);
  c.fillStyle = 'rgba(255,255,255,0.35)';
  for (const x of [300, 498]) {
    c.beginPath();
    c.moveTo(x - 12, RH / 2 - 8);
    c.lineTo(x + 4, RH / 2 - 8);
    c.lineTo(x + 4, RH / 2 - 16);
    c.lineTo(x + 18, RH / 2);
    c.lineTo(x + 4, RH / 2 + 16);
    c.lineTo(x + 4, RH / 2 + 8);
    c.lineTo(x - 12, RH / 2 + 8);
    c.fill();
  }
  c.font = 'bold 22px system-ui, sans-serif';
  c.lineWidth = 5;
  c.strokeStyle = 'rgba(20,10,30,0.8)';
  c.strokeText(sk.label, 14, RH / 2 + 8);
  c.fillStyle = '#ffffff';
  c.fillText(sk.label, 14, RH / 2 + 8);
  for (let st = 0; st < 3; st++) drawDragon(c, sk, st as 0 | 1 | 2, RSLOTS[st]!, RFEET, pose(st));
}

function stageHeader(): HTMLCanvasElement {
  const c = canvas(34);
  c.fillStyle = '#20163a';
  c.fillRect(0, 0, W, 34);
  c.font = 'bold 18px system-ui, sans-serif';
  c.textAlign = 'center';
  c.fillStyle = '#ffd06a';
  ['Fase 1', 'Fase 2', 'Fase 3'].forEach((t, i) => c.fillText(t, RSLOTS[i]!, 24));
  return c.canvas;
}

function rowCanvas(): Ctx {
  const c = canvas(RH);
  c.canvas.style.borderRadius = '0';
  return c;
}

if (still === 'dragons' || still === 'dragons-atk') {
  const atk = still === 'dragons-atk';
  const sec = document.createElement('section');
  const h = document.createElement('h2');
  h.textContent = atk ? 'Dragões elementais — atacando' : 'Dragões elementais';
  sec.append(h, stageHeader());
  for (const sk of SKINS) {
    const c = rowCanvas();
    dragonRow(c, sk, () => ({ t: 0.5, atk: atk ? 0.58 : -1 }));
    sec.append(c.canvas);
  }
  root.append(sec);
} else if (still) {
  // A fixed sheet for one option: the three forms resting, attacking, and the attack step by step.
  const s = STYLES.find((x) => x.id === still) ?? STYLES[0]!;
  const sec = document.createElement('section');
  header(s, sec);
  const rest = canvas();
  ground(rest, SLOTS);
  s.forms.forEach((f, i) => f.draw(rest, SLOTS[i]!, FEET, { t: 0.5, atk: -1 }));
  sec.append(label('Nível 1 → Nível 2 → Nível 3 (parados)'), rest.canvas, names(s.forms));
  const atk = canvas();
  ground(atk, SLOTS);
  s.forms.forEach((f, i) => f.draw(atk, SLOTS[i]!, FEET, { t: 0.5, atk: 0.5 }));
  sec.append(label('Atacando'), atk.canvas);
  const big = s.forms[2]!;
  const steps: [number, string][] = [[0.25, 'carrega'], [0.41, 'solta'], [0.56, 'dispara']];
  const seq = canvas();
  const xs = [130, 345, 560];
  ground(seq, xs);
  steps.forEach(([a], i) => big.draw(seq, xs[i]!, FEET, { t: 0.5, atk: a }));
  sec.append(label(`Ataque do ${big.name}, passo a passo`), seq.canvas, names(steps.map(([, n]) => ({ name: n }))));
  root.append(sec);
} else {
  const title = document.createElement('h1');
  title.textContent = 'Laboratório de criaturas';
  root.append(title, label('Dragões elementais: cada elemento cresce da fase 1 à 3 e ataca sozinho a cada 2 segundos. Toque numa linha para ver o ataque na hora.', ''));
  const dsec = document.createElement('section');
  dsec.append(stageHeader());
  const drows: { c: Ctx; sk: Skin; starts: number[] }[] = [];
  SKINS.forEach((sk, si) => {
    const c = rowCanvas();
    dsec.append(c.canvas);
    const entry = { c, sk, starts: [0, 1, 2].map((i) => -10 + i * 0.45 + si * 0.25) };
    c.canvas.addEventListener('pointerdown', () => {
      const now = performance.now() / 1000;
      entry.starts = entry.starts.map((_, i) => now + i * 0.12);
    });
    drows.push(entry);
  });
  root.append(dsec);
  const old = document.createElement('h2');
  old.textContent = 'Opções anteriores (A–D)';
  old.style.marginTop = '28px';
  root.append(old);
  const live: { c: Ctx; forms: Form[]; starts: number[] }[] = [];
  STYLES.forEach((s, si) => {
    const sec = document.createElement('section');
    header(s, sec);
    const c = canvas();
    sec.append(c.canvas, names(s.forms));
    root.append(sec);
    const entry = { c, forms: s.forms, starts: s.forms.map((_, i) => -10 + i * 0.45 + si * 0.2) };
    c.canvas.addEventListener('pointerdown', () => {
      const now = performance.now() / 1000;
      entry.starts = entry.starts.map((_, i) => now + i * 0.12);
    });
    live.push(entry);
  });
  const frame = () => {
    const t = performance.now() / 1000;
    for (const e of drows) {
      dragonRow(e.c, e.sk, (st) => {
        if (t - e.starts[st]! > 2.2) e.starts[st] = t + st * 0.15;
        const a = (t - e.starts[st]!) / ATTACK;
        return { t: t + st, atk: a >= 0 && a <= 1 ? a : -1 };
      });
    }
    for (const e of live) {
      ground(e.c, SLOTS);
      e.forms.forEach((f, i) => {
        if (t - e.starts[i]! > 2.2) e.starts[i] = t + i * 0.15;
        const a = (t - e.starts[i]!) / ATTACK;
        f.draw(e.c, SLOTS[i]!, FEET, { t: t + i, atk: a >= 0 && a <= 1 ? a : -1 });
      });
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
