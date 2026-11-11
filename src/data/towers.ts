import type { Element } from './elements';

export type TowerId = 'archer' | 'brazier' | 'frost' | 'vine' | 'storm';

export interface TowerLevel {
  cost: number; // build cost (level 1) or upgrade cost (levels 2-3)
  damage: number;
  rate: number; // attacks per second
  range: number; // px
  critChance?: number;
  critMult?: number;
  splashRadius?: number;
  splashFactor?: number; // damage share for enemies hit by splash
  burnDps?: number;
  rootChance?: number;
  chainCount?: number; // lightning: total enemies hit (target + jumps)
  chainRange?: number; // lightning: max jump distance between enemies
  chainFalloff?: number; // lightning: damage × this per jump
}

/** Special power a tower gains at max level (level 3) — rewards upgrading over spamming towers. */
export type TowerAbility =
  | { id: 'volley'; every: number; targets: number } // Arqueiro: every Nth attack hits N different enemies
  | { id: 'firefield'; radius: number; duration: number; burnDps: number } // Braseiro: impact leaves burning ground
  | { id: 'deepfreeze'; stacks: number } // Cristal Gélido: each hit adds N Chilled stacks
  | { id: 'entangle'; extra: number; radius: number } // Vinha: a root also roots N neighbours
  | { id: 'supercharge'; every: number; chainMult: number }; // Trovão: every Nth bolt has ×N jumps and no falloff

export interface AbilityInfo {
  name: string; // UI
  desc: string; // UI, short
}

export interface TowerDef {
  name: string;
  short: string; // label in the radial menu
  element: Element;
  projectileSpeed: number; // px/s; 0 = instant hit (lightning)
  hitsFlying: boolean;
  levels: [TowerLevel, TowerLevel, TowerLevel];
  ability: TowerAbility; // active only at level 3
  abilityInfo: AbilityInfo;
}

export const MAX_LEVEL = 3;

/** Reforço: after max level a tower can be reinforced forever (gold sink for long runs). */
export const BOOST = { baseCost: 90, growth: 1.3, damagePerLevel: 0.12 };

export const TOWERS: Record<TowerId, TowerDef> = {
  archer: {
    name: 'Arqueiro',
    short: 'Arqueiro',
    element: 'physical',
    projectileSpeed: 900,
    hitsFlying: true,
    levels: [
      { cost: 50, damage: 10, rate: 1.5, range: 170, critChance: 0.1, critMult: 2 },
      { cost: 60, damage: 15, rate: 1.7, range: 180, critChance: 0.12, critMult: 2 },
      { cost: 90, damage: 22, rate: 1.9, range: 190, critChance: 0.15, critMult: 2.2 },
    ],
    ability: { id: 'volley', every: 4, targets: 3 },
    abilityInfo: { name: 'Rajada', desc: 'A cada 4º disparo, acerta 3 inimigos' },
  },
  brazier: {
    name: 'Braseiro',
    short: 'Braseiro',
    element: 'fire',
    projectileSpeed: 500,
    hitsFlying: true,
    levels: [
      { cost: 70, damage: 20, rate: 0.8, range: 160, splashRadius: 50, splashFactor: 0.5, burnDps: 8 },
      { cost: 80, damage: 30, rate: 0.85, range: 170, splashRadius: 55, splashFactor: 0.5, burnDps: 12 },
      { cost: 110, damage: 44, rate: 0.9, range: 180, splashRadius: 60, splashFactor: 0.55, burnDps: 17 },
    ],
    ability: { id: 'firefield', radius: 55, duration: 3, burnDps: 12 },
    abilityInfo: { name: 'Chão em Chamas', desc: 'O impacto deixa o chão queimando por 3 s' },
  },
  frost: {
    name: 'Cristal Gélido',
    short: 'Gélido',
    element: 'ice',
    projectileSpeed: 700,
    hitsFlying: true,
    levels: [
      { cost: 70, damage: 13, rate: 1.0, range: 170 },
      { cost: 80, damage: 19, rate: 1.1, range: 175 },
      { cost: 110, damage: 27, rate: 1.2, range: 180 },
    ],
    ability: { id: 'deepfreeze', stacks: 2 },
    abilityInfo: { name: 'Frio Profundo', desc: 'Cada acerto dá 2 acúmulos de Resfriado' },
  },
  vine: {
    name: 'Vinha Ancestral',
    short: 'Vinha',
    element: 'nature',
    projectileSpeed: 600,
    hitsFlying: false,
    levels: [
      { cost: 60, damage: 26, rate: 0.6, range: 170, rootChance: 0.3 },
      { cost: 70, damage: 38, rate: 0.65, range: 175, rootChance: 0.35 },
      { cost: 100, damage: 54, rate: 0.7, range: 185, rootChance: 0.4 },
    ],
    ability: { id: 'entangle', extra: 2, radius: 75 },
    abilityInfo: { name: 'Raízes Profundas', desc: 'Ao enraizar, prende também 2 vizinhos' },
  },
  storm: {
    name: 'Torre do Trovão',
    short: 'Trovão',
    element: 'lightning',
    projectileSpeed: 0, // instant chain
    hitsFlying: true,
    levels: [
      { cost: 80, damage: 13, rate: 0.65, range: 165, chainCount: 3, chainRange: 120, chainFalloff: 0.7 },
      { cost: 90, damage: 19, rate: 0.7, range: 170, chainCount: 4, chainRange: 130, chainFalloff: 0.72 },
      { cost: 120, damage: 28, rate: 0.75, range: 180, chainCount: 5, chainRange: 140, chainFalloff: 0.75 },
    ],
    ability: { id: 'supercharge', every: 3, chainMult: 2 },
    abilityInfo: { name: 'Supertensão', desc: 'A cada 3º raio: dobro de saltos, sem perda' },
  },
};

export const TOWER_IDS = Object.keys(TOWERS) as TowerId[];
