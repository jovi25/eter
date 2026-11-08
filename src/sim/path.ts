import type { Vec2 } from '../data/maps';

/** A polyline the enemies walk along, addressed by distance from the start. */
export class Path {
  readonly length: number;
  private readonly cumulative: number[];

  constructor(readonly points: readonly Vec2[]) {
    if (points.length < 2) throw new Error('Path needs at least 2 points');
    this.cumulative = [0];
    let total = 0;
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1]!;
      const b = points[i]!;
      total += Math.hypot(b.x - a.x, b.y - a.y);
      this.cumulative.push(total);
    }
    this.length = total;
  }

  /** Position at a distance along the path (clamped to the ends). */
  pointAt(distance: number, out: Vec2 = { x: 0, y: 0 }): Vec2 {
    const d = Math.max(0, Math.min(this.length, distance));
    let i = 1;
    while (i < this.cumulative.length - 1 && this.cumulative[i]! < d) i++;
    const a = this.points[i - 1]!;
    const b = this.points[i]!;
    const start = this.cumulative[i - 1]!;
    const seg = this.cumulative[i]! - start;
    const t = seg > 0 ? (d - start) / seg : 0;
    out.x = a.x + (b.x - a.x) * t;
    out.y = a.y + (b.y - a.y) * t;
    return out;
  }
}
