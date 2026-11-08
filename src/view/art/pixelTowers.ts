import * as Phaser from 'phaser';

// Procedural pixel art for things the CC0 packs don't have (towers, build slot marker).
// Drawn on a tiny grid with integer shapes, then auto-outlined — shown at ×3 with nearest filtering.

const OUT = 0x2a1d3a;

class PixelGrid {
  readonly px: number[];
  constructor(readonly w: number, readonly h: number) {
    this.px = new Array(w * h).fill(-1);
  }
  set(x: number, y: number, c: number): void {
    x = Math.round(x);
    y = Math.round(y);
    if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.px[y * this.w + x] = c;
  }
  get(x: number, y: number): number {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return -1;
    return this.px[y * this.w + x]!;
  }
  rect(x: number, y: number, w: number, h: number, c: number): this {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c);
    return this;
  }
  ellipse(cx: number, cy: number, rx: number, ry: number, c: number): this {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x + 0.5 - cx) / rx;
        const dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) this.set(x, y, c);
      }
    return this;
  }
  /** Filled triangle via scanlines. */
  tri(ax: number, ay: number, bx: number, by: number, cx: number, cy: number, c: number): this {
    const minY = Math.floor(Math.min(ay, by, cy));
    const maxY = Math.ceil(Math.max(ay, by, cy));
    const edges: [number, number, number, number][] = [
      [ax, ay, bx, by],
      [bx, by, cx, cy],
      [cx, cy, ax, ay],
    ];
    for (let y = minY; y <= maxY; y++) {
      const xs: number[] = [];
      for (const [x0, y0, x1, y1] of edges) {
        if ((y + 0.5 >= y0 && y + 0.5 < y1) || (y + 0.5 >= y1 && y + 0.5 < y0)) xs.push(x0 + ((y + 0.5 - y0) * (x1 - x0)) / (y1 - y0));
      }
      if (xs.length >= 2) {
        const [l, r] = [Math.min(...xs), Math.max(...xs)];
        for (let x = Math.round(l); x < Math.round(r); x++) this.set(x, y, c);
      }
    }
    return this;
  }
  /** Replace color a with b where predicate(x,y) holds (used for shading halves). */
  recolor(a: number, b: number, pred: (x: number, y: number) => boolean): this {
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) if (this.get(x, y) === a && pred(x, y)) this.set(x, y, b);
    return this;
  }
  /** 1 px dark outline around everything. */
  outline(c = OUT): this {
    const add: [number, number][] = [];
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        if (this.get(x, y) !== -1) continue;
        if (this.get(x + 1, y) >= 0 || this.get(x - 1, y) >= 0 || this.get(x, y + 1) >= 0 || this.get(x, y - 1) >= 0) add.push([x, y]);
      }
    for (const [x, y] of add) this.set(x, y, c);
    return this;
  }
  toTexture(scene: Phaser.Scene, key: string): void {
    if (scene.textures.exists(key)) scene.textures.remove(key);
    const tex = scene.textures.createCanvas(key, this.w, this.h)!;
    const ctx = tex.getContext();
    const img = ctx.createImageData(this.w, this.h);
    this.px.forEach((c, i) => {
      if (c < 0) return;
      img.data[i * 4] = (c >> 16) & 255;
      img.data[i * 4 + 1] = (c >> 8) & 255;
      img.data[i * 4 + 2] = c & 255;
      img.data[i * 4 + 3] = 255;
    });
    ctx.putImageData(img, 0, 0);
    tex.refresh();
    tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
  }
}

const W = 22;
const H = 30;

/** Stone pedestal shared by all towers (bottom of the grid). */
function base(g: PixelGrid): void {
  g.ellipse(11, 26, 9, 3.2, 0x5c5772);
  g.rect(2, 22, 18, 4, 0x6e6888);
  g.ellipse(11, 22, 9, 3.2, 0x9a95b2);
  g.ellipse(9, 21.5, 4, 1.2, 0xc4c0d8);
  for (const x of [5, 10, 15]) g.rect(x, 24, 1, 2, 0x4e4964);
}

type Painter = (g: PixelGrid, frame: number) => void;

const TOWER_PAINTERS: Record<string, Painter> = {
  archer: (g) => {
    g.rect(6, 9, 10, 13, 0xa8743f);
    g.recolor(0xa8743f, 0x7a5028, (x) => x >= 13);
    for (const y of [12, 15, 18]) g.rect(6, y, 10, 1, 0x6b4426);
    g.rect(9, 13, 4, 6, 0x2b1d12);
    g.rect(10, 14, 1, 4, 0xe8d6b0);
    g.tri(3, 10, 19, 10, 11, 1, 0xc9504a);
    g.recolor(0xc9504a, 0x8f2f2f, (x) => x >= 12);
    g.rect(5, 9, 12, 1, 0x8f2f2f);
    g.rect(11, 0, 1, 2, 0x4a3a2a);
    g.rect(12, 0, 3, 1, 0xffd34d);
  },
  brazier: (g, f) => {
    g.rect(7, 17, 1, 5, 0x3e3852);
    g.rect(14, 17, 1, 5, 0x3e3852);
    g.ellipse(11, 16, 7, 3, 0x6a6380);
    g.recolor(0x6a6380, 0x4a4460, (_x, y) => y >= 17);
    g.ellipse(11, 14.5, 6, 1.5, 0xff7a2e);
    const s = f === 0 ? 0 : 1;
    g.tri(5, 14, 17, 14, 11 - s, 2 + s, 0xff4a1a);
    g.tri(7, 14, 15, 14, 11 + s, 5, 0xff9d2e);
    g.tri(9, 14, 13, 14, 11 - s, 8, 0xffe27a);
    g.set(6 + s, 6, 0xffd34d);
    g.set(16 - s, 4, 0xffd34d);
  },
  frost: (g) => {
    const shard = (cx: number, top: number, bottom: number, half: number) => {
      const mid = top + (bottom - top) * 0.6;
      g.tri(cx - half, mid, cx + half, mid, cx, top, 0x9ff3ff);
      g.tri(cx - half, mid, cx + half, mid, cx, bottom, 0x4fc6e8);
      g.recolor(0x9ff3ff, 0x6fe6ff, (x) => x >= cx);
      g.recolor(0x4fc6e8, 0x2a8fd0, (x) => x >= cx);
    };
    shard(6, 9, 22, 3);
    shard(16, 10, 22, 3);
    shard(11, 1, 22, 4.5);
    g.rect(10, 4, 1, 4, 0xffffff);
    g.set(5, 12, 0xffffff);
  },
  vine: (g) => {
    for (const [x, y] of [[4, 14], [18, 14], [6, 8], [16, 8], [11, 5]] as const) g.ellipse(x, y, 3.5, 2.2, 0x6ad44a);
    g.recolor(0x6ad44a, 0x3f8f45, (_x, y) => y >= 14);
    g.rect(10, 15, 2, 7, 0x3f8f45);
    g.ellipse(11, 12, 5, 4.5, 0x4fa04a);
    g.recolor(0x4fa04a, 0x2f6b34, (x, y) => x + y > 26);
    g.ellipse(11, 11, 2.6, 2.6, 0xff6fb0);
    g.set(11, 11, 0xffd34d);
    g.set(10, 10, 0xffd6ea);
  },
  storm: (g, f) => {
    g.rect(9, 8, 4, 14, 0x8a85a8);
    g.recolor(0x8a85a8, 0x5c5778, (x) => x >= 11);
    for (const [y, w] of [[19, 10], [15, 8], [11, 6]] as const) {
      g.rect(11 - w / 2, y, w, 2, 0xffb36b);
      g.recolor(0xffb36b, 0xa8501e, (x, yy) => yy === y + 1 || x >= 11 + w / 2 - 2);
    }
    g.ellipse(11, 4.5, 3.6, 3.6, f === 0 ? 0xffe95c : 0xfff6b0);
    g.set(10, 3, 0xffffff);
    g.set(11, 3, 0xffffff);
    if (f === 1) {
      g.set(5, 2, 0xffe95c);
      g.set(6, 3, 0xffe95c);
      g.set(17, 6, 0xffe95c);
      g.set(16, 7, 0xffe95c);
    }
  },
};

export const TOWER_FRAMES: Record<string, number> = { archer: 1, brazier: 2, frost: 1, vine: 1, storm: 2 };

/** Generate tower textures `ptower_<type>_<frame>` and the build slot marker `pslot`. */
export function generatePixelTowers(scene: Phaser.Scene): void {
  for (const [type, paint] of Object.entries(TOWER_PAINTERS)) {
    for (let f = 0; f < (TOWER_FRAMES[type] ?? 1); f++) {
      const g = new PixelGrid(W, H);
      base(g);
      paint(g, f);
      g.outline().toTexture(scene, `ptower_${type}_${f}`);
    }
  }
  // Build slot: flat stone circle with a "+".
  const s = new PixelGrid(22, 14);
  s.ellipse(11, 7.5, 10, 5.5, 0x6e6888);
  s.ellipse(11, 6.5, 10, 5, 0x9a95b2);
  s.ellipse(9, 5, 4, 1.5, 0xc4c0d8);
  s.rect(10, 4, 2, 6, 0xffffff);
  s.rect(8, 6, 6, 2, 0xffffff);
  s.outline().toTexture(scene, 'pslot');
}
