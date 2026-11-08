import type { Element } from './elements';

export type TowerId = 'archer' | 'brazier' | 'frost' | 'vine';

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
}

export interface TowerDef {
  name: string;
  element: Element;
  projectileSpeed: number; // px/s
  hitsFlying: boolean;
  levels: [TowerLevel, TowerLevel, TowerLevel];
}

export const TOWERS: Record<TowerId, TowerDef> = {
  archer: {
    name: 'Arqueiro',
    element: 'physical',
    projectileSpeed: 900,
    hitsFlying: true,
    levels: [
      { cost: 50, damage: 10, rate: 1.5, range: 170, critChance: 0.1, critMult: 2 },
      { cost: 60, damage: 15, rate: 1.7, range: 180, critChance: 0.12, critMult: 2 },
      { cost: 90, damage: 22, rate: 1.9, range: 190, critChance: 0.15, critMult: 2.2 },
    ],
  },
  brazier: {
    name: 'Braseiro',
    element: 'fire',
    projectileSpeed: 500,
    hitsFlying: true,
    levels: [
      { cost: 70, damage: 20, rate: 0.8, range: 160, splashRadius: 50, splashFactor: 0.5, burnDps: 8 },
      { cost: 80, damage: 30, rate: 0.85, range: 170, splashRadius: 55, splashFactor: 0.5, burnDps: 12 },
      { cost: 110, damage: 44, rate: 0.9, range: 180, splashRadius: 60, splashFactor: 0.55, burnDps: 17 },
    ],
  },
  frost: {
    name: 'Cristal Gélido',
    element: 'ice',
    projectileSpeed: 700,
    hitsFlying: true,
    levels: [
      { cost: 70, damage: 13, rate: 1.0, range: 170 },
      { cost: 80, damage: 19, rate: 1.1, range: 175 },
      { cost: 110, damage: 27, rate: 1.2, range: 180 },
    ],
  },
  vine: {
    name: 'Vinha Ancestral',
    element: 'nature',
    projectileSpeed: 600,
    hitsFlying: false,
    levels: [
      { cost: 60, damage: 26, rate: 0.6, range: 170, rootChance: 0.3 },
      { cost: 70, damage: 38, rate: 0.65, range: 175, rootChance: 0.35 },
      { cost: 100, damage: 54, rate: 0.7, range: 185, rootChance: 0.4 },
    ],
  },
};

export const TOWER_IDS = Object.keys(TOWERS) as TowerId[];
