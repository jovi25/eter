import type { EnemyId } from './enemies';
import type { MapId } from './maps';

export interface SpawnGroup {
  enemy: EnemyId;
  count: number;
  interval: number; // seconds between spawns in this group
  delay?: number; // seconds after the wave starts
  path?: number; // which map path; omitted = alternate between all paths
}

export interface WaveDef {
  groups: SpawnGroup[];
}

export interface StageDef {
  name: string;
  subtitle: string; // shown on the world map
  map: MapId;
  hpMult: number; // extra difficulty multiplier for the whole stage
  startGold?: number; // overrides ECONOMY.startGold
  waves: WaveDef[];
}

export type StageId = 'v1' | 'v2' | 'v3' | 'v4' | 'v5';
export const STAGE_ORDER: StageId[] = ['v1', 'v2', 'v3', 'v4', 'v5'];

const g = (enemy: EnemyId, count: number, interval: number, delay = 0, path?: number): SpawnGroup => ({ enemy, count, interval, delay, path });

export const STAGES: Record<StageId, StageDef> = {
  v1: {
    name: 'Campos de Vellmora I',
    subtitle: 'O primeiro portal',
    map: 'meadow',
    hpMult: 1,
    waves: [
      { groups: [g('slime', 6, 1.2)] },
      { groups: [g('slime', 8, 1.0)] },
      { groups: [g('slime', 5, 1.0), g('wolf', 4, 0.8, 3)] },
      { groups: [g('golem', 3, 2.5), g('slime', 4, 1.0, 1)] },
      { groups: [g('bat', 6, 1.0)] },
      { groups: [g('wolf', 8, 0.6), g('slime', 4, 1.0, 2)] },
      { groups: [g('golem', 4, 2.0), g('bat', 4, 1.0, 2)] },
      { groups: [g('slime', 10, 0.6), g('wolf', 4, 0.6, 4)] },
      { groups: [g('golem', 5, 1.8), g('bat', 6, 0.8, 2), g('wolf', 6, 0.5, 5)] },
      { groups: [g('herald', 1, 0), g('slime', 6, 1.0, 2)] },
    ],
  },
  v2: {
    name: 'Campos de Vellmora II',
    subtitle: 'Duas entradas — chifrudos imunes a fogo',
    map: 'twin',
    hpMult: 0.8,
    startGold: 150,
    waves: [
      { groups: [g('slime', 5, 1.1, 0, 0), g('slime', 5, 1.1, 0.5, 1)] },
      { groups: [g('salamander', 6, 1.2)] },
      { groups: [g('wolf', 6, 0.6, 0, 0), g('skeleton', 4, 1.2, 1, 1)] },
      { groups: [g('salamander', 5, 1.0, 0, 1), g('slime', 6, 0.8, 1, 0)] },
      { groups: [g('skeleton', 8, 0.9)] },
      { groups: [g('golem', 4, 2.0), g('bat', 6, 0.8, 2)] },
      { groups: [g('salamander', 8, 0.7), g('wolf', 6, 0.5, 3)] },
      { groups: [g('skeleton', 6, 0.8, 0, 0), g('salamander', 6, 0.8, 0, 1)] },
      { groups: [g('golem', 5, 1.5), g('skeleton', 6, 0.7, 2), g('bat', 6, 0.7, 4)] },
      { groups: [g('colossus', 1, 0, 0, 0), g('salamander', 8, 0.6, 1, 1), g('skeleton', 6, 0.8, 3)] },
    ],
  },
  v3: {
    name: 'Pântano de Vellmora',
    subtitle: 'O Anel — gelo e lama',
    map: 'ring',
    hpMult: 0.95,
    startGold: 170,
    waves: [
      { groups: [g('slime', 10, 0.8)] },
      { groups: [g('yeti', 6, 1.4)] },
      { groups: [g('mudling', 6, 1.2), g('wolf', 6, 0.6, 2)] },
      { groups: [g('yeti', 5, 1.2), g('salamander', 5, 1.2, 1)] },
      { groups: [g('bat', 10, 0.6)] },
      { groups: [g('mudling', 8, 0.9), g('skeleton', 4, 1.0, 3)] },
      { groups: [g('golem', 5, 1.6), g('yeti', 5, 1.2, 2)] },
      { groups: [g('wolf', 12, 0.4), g('mudling', 5, 1.0, 3)] },
      { groups: [g('yeti', 8, 0.8), g('salamander', 8, 0.8, 1), g('bat', 6, 0.7, 4)] },
      { groups: [g('colossus', 2, 6), g('mudling', 8, 0.8, 1), g('yeti', 6, 0.9, 4)] },
    ],
  },
  v4: {
    name: 'Desfiladeiro de Vellmora',
    subtitle: 'Corredor curto — poucos espaços',
    map: 'corridor',
    hpMult: 0.95,
    startGold: 200,
    waves: [
      { groups: [g('wolf', 8, 0.7)] },
      { groups: [g('shaman', 5, 1.4)] },
      { groups: [g('skeleton', 6, 1.0), g('wolf', 6, 0.5, 2)] },
      { groups: [g('shaman', 6, 1.0), g('bat', 6, 0.8, 1)] },
      { groups: [g('golem', 4, 1.8), g('shaman', 4, 1.0, 2)] },
      { groups: [g('wolf', 14, 0.35)] },
      { groups: [g('skeleton', 8, 0.8), g('shaman', 6, 0.8, 2)] },
      { groups: [g('mudling', 6, 1.0), g('bat', 8, 0.6, 2)] },
      { groups: [g('shaman', 8, 0.7), g('golem', 4, 1.5, 2), g('wolf', 8, 0.4, 4)] },
      { groups: [g('colossus', 1, 0), g('shaman', 8, 0.7, 1), g('skeleton', 8, 0.7, 3)] },
    ],
  },
  v5: {
    name: 'Trono da Geada',
    subtitle: 'Bifurcação — o Arauto da Geada',
    map: 'fork',
    hpMult: 0.75,
    startGold: 200,
    waves: [
      { groups: [g('slime', 10, 0.7)] },
      { groups: [g('salamander', 4, 1.0), g('yeti', 4, 1.0, 0.5)] },
      { groups: [g('skeleton', 6, 0.9), g('shaman', 4, 1.0, 1)] },
      { groups: [g('mudling', 6, 0.9), g('bat', 6, 0.7, 2)] },
      { groups: [g('golem', 6, 1.2), g('wolf', 10, 0.4, 2)] },
      { groups: [g('yeti', 8, 0.7), g('salamander', 8, 0.7, 0.3)] },
      { groups: [g('colossus', 2, 5), g('skeleton', 8, 0.6, 2)] },
      { groups: [g('shaman', 10, 0.6), g('mudling', 8, 0.7, 2), g('bat', 8, 0.5, 4)] },
      { groups: [g('golem', 6, 1.0), g('yeti', 8, 0.6, 1), g('salamander', 8, 0.6, 2), g('wolf', 10, 0.35, 4)] },
      { groups: [g('herald', 1, 0, 0, 0), g('slime', 10, 0.6, 2), g('skeleton', 6, 0.8, 4), g('yeti', 6, 0.8, 6)] },
    ],
  },
};
