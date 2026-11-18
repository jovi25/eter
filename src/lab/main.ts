// Laboratório de criaturas (lab.html): shows the art options animated, so the player can pick one
// before it goes into the game. Tap an option to see its attack. `?still=A` draws a fixed sheet
// (used to make the preview pictures).
import { ellipse, linear, shape, softShadow, type Ctx } from '../view/art/paint';
import { STYLES, type Form, type Style } from './designs';

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

if (still) {
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
  const xs = [90, 320, 550];
  ground(seq, xs);
  steps.forEach(([a], i) => big.draw(seq, xs[i]!, FEET, { t: 0.5, atk: a }));
  sec.append(label(`Ataque do ${big.name}, passo a passo`), seq.canvas, names(steps.map(([, n]) => ({ name: n }))));
  root.append(sec);
} else {
  const title = document.createElement('h1');
  title.textContent = 'Laboratório de criaturas';
  root.append(title, label('Três estilos para o Braseiro virar bicho. Cada um cresce do nível 1 ao 3 e ataca sozinho a cada 2 segundos. Toque numa opção para ver o ataque na hora.', ''));
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
