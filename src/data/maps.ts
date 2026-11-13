// Map layouts in world pixels (720×1280), aligned to a 48 px grid (16 px pixel-art tiles ×3).
// Top ~96 px and bottom ~104 px are HUD. A map may have several paths (enemies pick one per spawn group).

export interface Vec2 {
  x: number;
  y: number;
}

export type MapTheme = 'meadow' | 'amber';

export interface MapDef {
  name: string;
  paths: Vec2[][]; // each from a portal (first point) to the crystal (last point)
  slots: Vec2[]; // fixed build spots
  runes: Vec2[]; // rune stones: boost nearby towers, never take a slot
  heroStart: Vec2;
  /** Comporta: tap it to send new enemies down one branch or the other (indexes into paths). */
  gate?: { x: number; y: number; paths: [number, number] };
  /** World height in px (default 1280 = one screen). Taller maps scroll by dragging. */
  height?: number;
  theme?: MapTheme;
}

export type MapId = 'meadow' | 'twin' | 'ring' | 'corridor' | 'fork' | 'canyon' | 'sluice' | 'stairs' | 'confluence' | 'abyss';

const P = (pts: [number, number][]): Vec2[] => pts.map(([x, y]) => ({ x, y }));
const S = P;

export const MAPS: Record<MapId, MapDef> = {
  // 1 — long zig-zag: teaches the basics.
  meadow: {
    name: 'Zigue-zague',
    paths: [P([[576, 144], [576, 288], [144, 288], [144, 576], [576, 576], [576, 816], [144, 816], [144, 1008], [384, 1008], [384, 1104]])],
    slots: S([[408, 192], [264, 432], [456, 432], [264, 696], [456, 696], [264, 912], [456, 912], [144, 696]]),
    runes: S([[384, 360], [336, 744]]),
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
    runes: S([[336, 360], [456, 672]]),
    heroStart: { x: 624, y: 600 },
  },
  // 3 — a ring around a plateau; every slot covers two roads, so upgrading pays.
  ring: {
    name: 'O Anel',
    paths: [P([[96, 144], [96, 1104], [624, 1104], [624, 336], [384, 336], [384, 768]])],
    slots: S([[240, 360], [504, 600], [240, 480], [504, 480], [240, 720], [504, 720], [240, 960], [504, 960]]),
    runes: S([[560, 840], [168, 408]]),
    heroStart: { x: 384, y: 912 },
  },
  // 4 — short road, only 5 slots: no room for spam, max-level towers and the hero decide it.
  corridor: {
    name: 'Corredor',
    paths: [P([[384, 144], [384, 432], [192, 432], [192, 720], [528, 720], [528, 1008], [384, 1008], [384, 1104]])],
    slots: S([[240, 288], [480, 312], [360, 576], [360, 864], [624, 864]]),
    runes: S([[312, 336], [456, 840]]),
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
    runes: S([[168, 288], [312, 576]]),
    heroStart: { x: 384, y: 576 },
  },
  // ───────────── Região 2: Ermos de Âmbar (tall maps: 1,5 screen, drag to scroll) ─────────────
  // 1 — long serpentine: 10 slots, 3 runes.
  canyon: {
    name: 'Cânion',
    theme: 'amber',
    height: 1920,
    paths: [P([[576, 144], [576, 384], [144, 384], [144, 720], [576, 720], [576, 1056], [144, 1056], [144, 1392], [576, 1392], [576, 1632], [384, 1632], [384, 1776]])],
    slots: S([[432, 264], [288, 504], [456, 624], [432, 840], [216, 960], [288, 1176], [456, 1296], [288, 1512], [480, 1512], [528, 1752]]),
    runes: S([[360, 552], [336, 888], [384, 1224]]),
    heroStart: { x: 456, y: 1700 },
  },
  // 2 — the road splits under a Comporta: a long zig-zag on the left, a straight run on the right.
  sluice: {
    name: 'Comporta',
    theme: 'amber',
    height: 1920,
    paths: [
      P([[360, 144], [360, 432], [144, 432], [144, 720], [360, 720], [360, 1008], [144, 1008], [144, 1296], [360, 1296], [360, 1776]]),
      P([[360, 144], [360, 432], [576, 432], [576, 1296], [360, 1296], [360, 1776]]),
    ],
    slots: S([[240, 264], [480, 264], [240, 576], [480, 576], [240, 864], [468, 864], [264, 1152], [468, 1152], [240, 1440], [480, 1440], [264, 1608], [456, 1608]]),
    runes: S([[360, 600], [360, 1152], [552, 1536]]),
    heroStart: { x: 432, y: 1536 },
    gate: { x: 360, y: 360, paths: [0, 1] },
  },
  // 3 — stairs up and down: the boss walks past every slot twice.
  stairs: {
    name: 'Escadaria',
    theme: 'amber',
    height: 1920,
    paths: [P([[144, 144], [144, 816], [360, 816], [360, 336], [576, 336], [576, 1392], [144, 1392], [144, 1632], [360, 1632], [360, 1776]])],
    slots: S([[264, 240], [468, 240], [252, 480], [252, 672], [468, 528], [468, 720], [456, 912], [480, 1152], [240, 1296], [264, 1512], [456, 1488], [240, 1728]]),
    runes: S([[360, 240], [360, 1056], [360, 1512]]),
    heroStart: { x: 384, y: 1560 },
  },
  // 4 — two portals meet in the middle, then a long tail.
  confluence: {
    name: 'Confluência',
    theme: 'amber',
    height: 1920,
    paths: [
      P([[144, 144], [144, 624], [360, 624], [360, 912], [144, 912], [144, 1296], [576, 1296], [576, 1632], [144, 1632], [144, 1776]]),
      P([[576, 144], [576, 624], [360, 624], [360, 912], [144, 912], [144, 1296], [576, 1296], [576, 1632], [144, 1632], [144, 1776]]),
    ],
    slots: S([[240, 360], [480, 360], [264, 768], [456, 768], [240, 1080], [456, 1200], [240, 1392], [456, 1464], [264, 1752], [432, 1728]]),
    runes: S([[360, 456], [360, 1104], [360, 1464]]),
    heroStart: { x: 360, y: 1560 },
  },
  // 5 — the final: a Comporta at the top, two long branches, a serpentine bottom. 14 slots, 4 runes.
  abyss: {
    name: 'Abismo',
    theme: 'amber',
    height: 1920,
    paths: [
      P([[360, 144], [360, 336], [144, 336], [144, 576], [288, 576], [288, 816], [144, 816], [144, 1056], [360, 1056], [360, 1248], [576, 1248], [576, 1488], [144, 1488], [144, 1680], [360, 1680], [360, 1776]]),
      P([[360, 144], [360, 336], [576, 336], [576, 1056], [360, 1056], [360, 1248], [576, 1248], [576, 1488], [144, 1488], [144, 1680], [360, 1680], [360, 1776]]),
    ],
    slots: S([[240, 216], [480, 216], [432, 480], [432, 696], [432, 912], [252, 924], [192, 696], [468, 1152], [240, 1152], [360, 1368], [216, 1392], [264, 1584], [480, 1608], [240, 1776]]),
    runes: S([[360, 600], [348, 936], [276, 1272], [372, 1584]]),
    heroStart: { x: 432, y: 1424 },
    gate: { x: 360, y: 264, paths: [0, 1] },
  },
};
