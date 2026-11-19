// Every visual is referenced by key. Today they are procedural (drawn in src/view/art/textures.ts);
// to swap one for a CC0 image, change its entry to { kind: 'image', url } and drop the file in public/assets/.

export type AssetSource =
  | { kind: 'procedural' } // drawn by the routine with the same key in src/view/art/textures.ts
  | { kind: 'image'; url: string };

const P = { kind: 'procedural' } as const;
/** Illustrations made by the player in an image AI, cut out by tools/cutout.py (see docs/ARTE_IA.md). */
const art = (path: string) => ({ kind: 'image', url: `${import.meta.env.BASE_URL}assets/${path}` }) as const;

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
  slot: art('objects/slot.webp'),
  portal: art('objects/portal.webp'),
  crystal: art('objects/crystal.webp'),
  tree: P,
  tree_amber: P,
  tree_snow: P,
  tree_void: P,
  rock: P,
  flower: P,
  // enemies
  enemy_slime: P,
  enemy_wolf: P,
  enemy_golem: P,
  enemy_bat: P,
  enemy_herald: P,
  enemy_salamander: P,
  enemy_yeti: P,
  enemy_skeleton: P,
  enemy_shaman: P,
  enemy_mudling: P,
  enemy_colossus: P,
  enemy_treasure: P,
  enemy_sentinel: P,
  enemy_devourer: P,
  enemy_monk: P,
  enemy_gargoyle: P,
  enemy_titan: P,
  enemy_imp: P,
  enemy_prism: P,
  // statuses
  status_roots: P,
  status_ice: P,
  status_fragile: P,
  status_burn: P,
  // towers
  tower_base: art('objects/pedestal.webp'),
  tower_archer: P,
  tower_brazier: P,
  tower_frost: P,
  tower_vine: P,
  tower_storm: P,
  tower_wind: P,
  pip: P,
  fire_zone: P,
  // hero
  hero_arcanist: P,
  hero_knight: P,
  hero_priest: P,
  hero_druid: P,
  summon_bear: P,
  hero_orb: P,
  move_marker: P,
  icon_catalyze: P,
  // projectiles
  proj_arcane: P,
  proj_physical: P,
  proj_fire: P,
  proj_ice: P,
  proj_nature: P,
  proj_wind: P,
  // ui
  icon_pause: P,
  icon_speed: P,
  icon_play: P,
  // illustrated art (player-made, see docs/ARTE_IA.md): dragon lines, map grounds
  creature_fire_1: art('creatures/fire_1.webp'),
  creature_fire_1_atk: art('creatures/fire_1_atk.webp'),
  creature_fire_2: art('creatures/fire_2.webp'),
  creature_fire_2_atk: art('creatures/fire_2_atk.webp'),
  creature_fire_3: art('creatures/fire_3.webp'),
  creature_fire_3_atk: art('creatures/fire_3_atk.webp'),
  creature_ice_1: art('creatures/ice_1.webp'),
  creature_ice_1_atk: art('creatures/ice_1_atk.webp'),
  creature_ice_2: art('creatures/ice_2.webp'),
  creature_ice_2_atk: art('creatures/ice_2_atk.webp'),
  creature_ice_3: art('creatures/ice_3.webp'),
  creature_ice_3_atk: art('creatures/ice_3_atk.webp'),
  creature_nature_1: art('creatures/nature_1.webp'),
  creature_nature_1_atk: art('creatures/nature_1_atk.webp'),
  creature_nature_2: art('creatures/nature_2.webp'),
  creature_nature_2_atk: art('creatures/nature_2_atk.webp'),
  creature_nature_3: art('creatures/nature_3.webp'),
  creature_nature_3_atk: art('creatures/nature_3_atk.webp'),
  creature_storm_1: art('creatures/storm_1.webp'),
  creature_storm_1_atk: art('creatures/storm_1_atk.webp'),
  creature_storm_2: art('creatures/storm_2.webp'),
  creature_storm_2_atk: art('creatures/storm_2_atk.webp'),
  creature_storm_3: art('creatures/storm_3.webp'),
  creature_storm_3_atk: art('creatures/storm_3_atk.webp'),
  creature_wind_1: art('creatures/wind_1.webp'),
  creature_wind_1_atk: art('creatures/wind_1_atk.webp'),
  creature_wind_2: art('creatures/wind_2.webp'),
  creature_wind_2_atk: art('creatures/wind_2_atk.webp'),
  creature_wind_3: art('creatures/wind_3.webp'),
  creature_wind_3_atk: art('creatures/wind_3_atk.webp'),
  creature_normal_1: art('creatures/normal_1.webp'),
  creature_normal_1_atk: art('creatures/normal_1_atk.webp'),
  creature_normal_2: art('creatures/normal_2.webp'),
  creature_normal_2_atk: art('creatures/normal_2_atk.webp'),
  creature_normal_3: art('creatures/normal_3.webp'),
  creature_normal_3_atk: art('creatures/normal_3_atk.webp'),
  map_meadow: art('maps/meadow.webp'),
  map_amber: art('maps/amber.webp'),
  map_snow: art('maps/snow.webp'),
  map_void: art('maps/void.webp'),
} as const satisfies Record<string, AssetSource>;

export type AssetKey = keyof typeof ASSETS;
/** Keys drawn in code (the rest are picture files). */
export type ProceduralKey = { [K in AssetKey]: (typeof ASSETS)[K]['kind'] extends 'procedural' ? K : never }[AssetKey];
