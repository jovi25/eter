// Map layouts in world pixels (720×1280), aligned to a 48 px grid (16 px pixel-art tiles ×3).
// Top ~96 px and bottom ~104 px are HUD. A map may have several paths (enemies pick one per spawn group).

export interface Vec2 {
  x: number;
  y: number;
}

export interface MapDef {
  name: string;
  paths: Vec2[][]; // each from a portal (first point) to the crystal (last point)
  slots: Vec2[]; // fixed build spots
  heroStart: Vec2;
}

export type MapId = 'meadow' | 'twin' | 'ring' | 'corridor' | 'fork';

const P = (pts: [number, number][]): Vec2[] => pts.map(([x, y]) => ({ x, y }));
const S = P;

export const MAPS: Record<MapId, MapDef> = {
  // 1 — long zig-zag: teaches the basics.
  meadow: {
    name: 'Zigue-zague',
    paths: [P([[576, 144], [576, 288], [144, 288], [144, 576], [576, 576], [576, 816], [144, 816], [144, 1008], [384, 1008], [384, 1104]])],
    slots: S([[408, 192], [264, 432], [456, 432], [264, 696], [456, 696], [264, 912], [456, 912], [144, 696]]),
    heroStart: { x: 360, y: 696 },
  },
  // 2 — two portals merging into one road: the slots at the junction are gold.
  twin: {
    name: 'Duas Entradas',
    paths: [
      P([[144, 144], [144, 432], [384, 432], [384, 768], [576, 768], [576, 1008], [384, 1008], [384, 1104]]),
      P([[624, 144], [624, 432], [384, 432], [384, 768], [576, 768], [576, 1008], [384, 1008], [384, 1104]]),
    ],
    slots: S([[288, 288], [480, 288], [264, 576], [504, 576], [360, 888], [480, 888], [504, 1104], [288, 696]]),
    heroStart: { x: 624, y: 600 },
  },
  // 3 — a ring around a plateau; every slot covers two roads, so upgrading pays.
  ring: {
    name: 'O Anel',
    paths: [P([[96, 144], [96, 1104], [624, 1104], [624, 336], [384, 336], [384, 768]])],
    slots: S([[240, 360], [504, 600], [240, 480], [504, 480], [240, 720], [504, 720], [240, 960], [504, 960]]),
    heroStart: { x: 384, y: 912 },
  },
  // 4 — short road, only 5 slots: no room for spam, max-level towers and the hero decide it.
  corridor: {
    name: 'Corredor',
    paths: [P([[384, 144], [384, 432], [192, 432], [192, 720], [528, 720], [528, 1008], [384, 1008], [384, 1104]])],
    slots: S([[240, 288], [480, 312], [360, 576], [360, 864], [624, 864]]),
    heroStart: { x: 600, y: 480 },
  },
  // 5 — the road forks and rejoins; enemies alternate sides. The middle slots reach both branches.
  fork: {
    name: 'Bifurcação',
    paths: [
      P([[384, 144], [384, 288], [240, 288], [240, 864], [384, 864], [384, 1104]]),
      P([[384, 144], [384, 288], [528, 288], [528, 864], [384, 864], [384, 1104]]),
    ],
    slots: S([[240, 192], [528, 192], [144, 408], [384, 480], [384, 672], [624, 408], [240, 1008], [528, 1008]]),
    heroStart: { x: 384, y: 576 },
  },
};
