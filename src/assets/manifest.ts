// Every visual is referenced by key. Today they are procedural (drawn in src/view/art/textures.ts);
// to swap one for a CC0 image, change its entry to { kind: 'image', url } and drop the file in public/assets/.

export type AssetSource =
  | { kind: 'procedural' } // drawn by the routine with the same key in src/view/art/textures.ts
  | { kind: 'image'; url: string };

const P = { kind: 'procedural' } as const;

export const ASSETS = {
  // generic
  px: P,
  spark: P,
  ring: P,
  shadow: P,
  coin: P,
  heart: P,
  star: P,
  starEmpty: P,
  // map
  slot: P,
  portal: P,
  crystal: P,
  tree: P,
  rock: P,
  flower: P,
  // enemies
  enemy_slime: P,
  enemy_wolf: P,
  enemy_golem: P,
  enemy_bat: P,
  enemy_herald: P,
  // statuses
  status_roots: P,
  status_ice: P,
  status_fragile: P,
  // towers
  tower_base: P,
  tower_archer: P,
  tower_brazier: P,
  tower_frost: P,
  tower_vine: P,
  tower_storm: P,
  pip: P,
  // projectiles
  proj_physical: P,
  proj_fire: P,
  proj_ice: P,
  proj_nature: P,
  // ui
  icon_pause: P,
  icon_speed: P,
  icon_play: P,
} as const satisfies Record<string, AssetSource>;

export type AssetKey = keyof typeof ASSETS;
