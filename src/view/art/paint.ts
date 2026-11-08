// Tiny painting toolkit over Canvas2D: gradients, soft outlines, glossy highlights, cute eyes.
// Used to draw every procedural sprite with smooth anti-aliased shapes.

export type Ctx = CanvasRenderingContext2D;

export const INK = '#1d1530';

export function hex(c: number, a = 1): string {
  const r = (c >> 16) & 255;
  const g = (c >> 8) & 255;
  const b = c & 255;
  return a >= 1 ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${a})`;
}

/** Lighten (amt>0) or darken (amt<0) a 0xRRGGBB color. amt in -1..1 */
export function shade(c: number, amt: number): number {
  const f = (v: number) => Math.round(amt >= 0 ? v + (255 - v) * amt : v * (1 + amt));
  return (f((c >> 16) & 255) << 16) | (f((c >> 8) & 255) << 8) | f(c & 255);
}

export function radial(ctx: Ctx, x: number, y: number, r: number, stops: [number, string][], fx = x, fy = y): CanvasGradient {
  const g = ctx.createRadialGradient(fx, fy, 0, x, y, r);
  for (const [o, c] of stops) g.addColorStop(o, c);
  return g;
}

export function linear(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, stops: [number, string][]): CanvasGradient {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  for (const [o, c] of stops) g.addColorStop(o, c);
  return g;
}

/** Fill a path with an outline drawn *outside* it (stroke double width under the fill). */
export function shape(ctx: Ctx, path: (c: Ctx) => void, fill: string | CanvasGradient, outline = INK, lw = 3.5): void {
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.beginPath();
  path(ctx);
  if (lw > 0) {
    ctx.lineWidth = lw * 2;
    ctx.strokeStyle = outline;
    ctx.stroke();
  }
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.restore();
}

export function ellipse(cx: number, cy: number, rx: number, ry: number, rot = 0): (c: Ctx) => void {
  return (c) => c.ellipse(cx, cy, rx, ry, rot, 0, Math.PI * 2);
}

export function circle(cx: number, cy: number, r: number): (c: Ctx) => void {
  return (c) => c.arc(cx, cy, r, 0, Math.PI * 2);
}

export function poly(pts: [number, number][]): (c: Ctx) => void {
  return (c) => {
    c.moveTo(pts[0]![0], pts[0]![1]);
    for (const p of pts.slice(1)) c.lineTo(p[0], p[1]);
    c.closePath();
  };
}

export function roundRect(x: number, y: number, w: number, h: number, r: number): (c: Ctx) => void {
  return (c) => c.roundRect(x, y, w, h, r);
}

/** Soft glossy highlight. */
export function gloss(ctx: Ctx, x: number, y: number, rx: number, ry: number, alpha = 0.7, rot = -0.4): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(1, ry / rx);
  ctx.fillStyle = radial(ctx, 0, 0, rx, [
    [0, `rgba(255,255,255,${alpha})`],
    [1, 'rgba(255,255,255,0)'],
  ]);
  ctx.beginPath();
  ctx.arc(0, 0, rx, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function softShadow(ctx: Ctx, x: number, y: number, rx: number, ry: number, alpha = 0.35): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, ry / rx);
  ctx.fillStyle = radial(ctx, 0, 0, rx, [
    [0, `rgba(0,0,0,${alpha})`],
    [0.6, `rgba(0,0,0,${alpha * 0.6})`],
    [1, 'rgba(0,0,0,0)'],
  ]);
  ctx.beginPath();
  ctx.arc(0, 0, rx, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function glow(ctx: Ctx, x: number, y: number, r: number, color: number, alpha = 0.8): void {
  ctx.fillStyle = radial(ctx, x, y, r, [
    [0, hex(color, alpha)],
    [0.4, hex(color, alpha * 0.4)],
    [1, hex(color, 0)],
  ]);
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

/** Big shiny cartoon eyes. */
export function eyes(ctx: Ctx, cx: number, cy: number, spread: number, size: number, opts: { look?: number; iris?: number; angry?: boolean } = {}): void {
  const look = opts.look ?? 0;
  for (const sx of [-1, 1]) {
    const x = cx + sx * spread;
    shape(ctx, ellipse(x, cy, size * 0.82, size), '#ffffff', INK, 2);
    const iris = opts.iris ?? 0x2a1f45;
    ctx.fillStyle = radial(ctx, x + look, cy + size * 0.25, size * 0.7, [
      [0, hex(shade(iris, 0.35))],
      [1, hex(iris)],
    ]);
    ctx.beginPath();
    ctx.ellipse(x + look, cy + size * 0.18, size * 0.58, size * 0.68, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x + look - size * 0.22, cy - size * 0.2, size * 0.26, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + look + size * 0.22, cy + size * 0.38, size * 0.12, 0, Math.PI * 2);
    ctx.fill();
    if (opts.angry) {
      ctx.strokeStyle = INK;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x - sx * size * 0.9, cy - size * 1.25);
      ctx.lineTo(x + sx * size * 0.6, cy - size * 0.85);
      ctx.stroke();
    }
  }
}

/** Anime-style eyes: almond shape, thick upper lash, tall gradient iris, two highlights, brows. */
export function animeEyes(ctx: Ctx, cx: number, cy: number, spread: number, size: number, iris: number, look = 0): void {
  for (const sx of [-1, 1]) {
    const x = cx + sx * spread;
    const w = size * 0.95;
    const h = size * 1.15;
    // white of the eye (almond)
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(x - w, cy);
    ctx.quadraticCurveTo(x, cy - h * 1.05, x + w, cy - h * 0.1);
    ctx.quadraticCurveTo(x, cy + h * 0.95, x - w, cy);
    ctx.fill();
    // iris (tall ellipse, darker on top)
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x - w, cy);
    ctx.quadraticCurveTo(x, cy - h * 1.05, x + w, cy - h * 0.1);
    ctx.quadraticCurveTo(x, cy + h * 0.95, x - w, cy);
    ctx.clip();
    ctx.fillStyle = linear(ctx, 0, cy - h, 0, cy + h, [
      [0, hex(shade(iris, -0.55))],
      [0.55, hex(iris)],
      [1, hex(shade(iris, 0.45))],
    ]);
    ctx.beginPath();
    ctx.ellipse(x + look + sx * 0.6, cy + h * 0.05, w * 0.62, h * 0.82, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = hex(shade(iris, -0.7));
    ctx.beginPath();
    ctx.ellipse(x + look + sx * 0.6, cy + h * 0.02, w * 0.28, h * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // highlights
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(x + look - w * 0.25, cy - h * 0.35, w * 0.22, h * 0.2, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + look + w * 0.25, cy + h * 0.35, w * 0.1, 0, Math.PI * 2);
    ctx.fill();
    // thick upper lash with a small flick at the outer corner
    ctx.strokeStyle = INK;
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(2.5, size * 0.42);
    ctx.beginPath();
    ctx.moveTo(x - w * 1.05, cy + h * 0.02);
    ctx.quadraticCurveTo(x, cy - h * 1.12, x + w * 1.05, cy - h * 0.12);
    ctx.stroke();
    ctx.lineWidth = Math.max(1.5, size * 0.22);
    ctx.beginPath();
    const ox = sx > 0 ? x + w * 1.05 : x - w * 1.05;
    const oy = sx > 0 ? cy - h * 0.12 : cy + h * 0.02;
    ctx.moveTo(ox, oy);
    ctx.lineTo(ox + sx * w * 0.35, oy - h * 0.25);
    ctx.stroke();
    // lower lid hint
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = 'rgba(29,21,48,0.5)';
    ctx.beginPath();
    ctx.moveTo(x - w * 0.5, cy + h * 0.72);
    ctx.quadraticCurveTo(x, cy + h * 0.9, x + w * 0.5, cy + h * 0.66);
    ctx.stroke();
    // brow (slightly determined)
    ctx.strokeStyle = '#3a2210';
    ctx.lineWidth = Math.max(2, size * 0.3);
    ctx.beginPath();
    ctx.moveTo(x - sx * w * 0.9, cy - h * 1.45);
    ctx.quadraticCurveTo(x, cy - h * 1.75, x + sx * w * 1.1, cy - h * 1.4);
    ctx.stroke();
  }
}

export function blush(ctx: Ctx, cx: number, cy: number, spread: number, r = 6): void {
  for (const sx of [-1, 1]) {
    ctx.fillStyle = radial(ctx, cx + sx * spread, cy, r * 1.4, [
      [0, 'rgba(255,120,150,0.65)'],
      [1, 'rgba(255,120,150,0)'],
    ]);
    ctx.beginPath();
    ctx.ellipse(cx + sx * spread, cy, r * 1.4, r, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function smile(ctx: Ctx, cx: number, cy: number, w: number): void {
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(cx, cy - w * 0.4, w * 0.6, Math.PI * 0.2, Math.PI * 0.8);
  ctx.stroke();
}

export function star(ctx: Ctx, cx: number, cy: number, r: number, inner = 0.48, points = 5): (c: Ctx) => void {
  return (c) => {
    for (let i = 0; i < points * 2; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / points;
      const rr = i % 2 === 0 ? r : r * inner;
      const x = cx + Math.cos(a) * rr;
      const y = cy + Math.sin(a) * rr;
      if (i === 0) c.moveTo(x, y);
      else c.lineTo(x, y);
    }
    c.closePath();
    void ctx;
  };
}
