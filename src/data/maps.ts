// Map layouts in world pixels (720×1280). Top ~120px and bottom ~170px are reserved for HUD.

export interface Vec2 {
  x: number;
  y: number;
}

export interface MapDef {
  path: Vec2[]; // from portal (first) to crystal (last)
  slots: Vec2[]; // fixed build spots
}

export type MapId = 'meadow';

export const MAPS: Record<MapId, MapDef> = {
  meadow: {
    path: [
      { x: 600, y: 130 },
      { x: 600, y: 300 },
      { x: 130, y: 300 },
      { x: 130, y: 560 },
      { x: 590, y: 560 },
      { x: 590, y: 820 },
      { x: 130, y: 820 },
      { x: 130, y: 1000 },
      { x: 360, y: 1000 },
      { x: 360, y: 1100 },
    ],
    slots: [
      { x: 420, y: 195 },
      { x: 250, y: 430 },
      { x: 470, y: 430 },
      { x: 250, y: 690 },
      { x: 470, y: 690 },
      { x: 250, y: 910 },
      { x: 470, y: 910 },
      { x: 480, y: 1050 },
    ],
  },
};
