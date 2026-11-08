// Depth ordering for the battle scene.
export const DEPTH = {
  ground: 0,
  path: 1,
  decor: 2,
  slot: 3,
  range: 4,
  groundFx: 5,
  units: 10, // + y/1000 so things lower on screen draw in front
  projectiles: 40,
  fx: 50,
  numbers: 60,
  banner: 70,
  hud: 100,
  menu: 110,
  panel: 120,
  debug: 1000,
};

export function unitDepth(y: number): number {
  return DEPTH.units + y / 1000;
}
