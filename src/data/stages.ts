import type { EnemyId } from './enemies';
import type { MapId } from './maps';

export interface SpawnGroup {
  enemy: EnemyId;
  count: number;
  interval: number; // seconds between spawns in this group
  delay?: number; // seconds after the wave starts
}

export interface WaveDef {
  groups: SpawnGroup[];
}

export interface StageDef {
  name: string;
  map: MapId;
  hpMult: number; // extra difficulty multiplier for the whole stage
  waves: WaveDef[];
}

export type StageId = 'v1';

export const STAGES: Record<StageId, StageDef> = {
  v1: {
    name: 'Campos de Vellmora I',
    map: 'meadow',
    hpMult: 1,
    waves: [
      { groups: [{ enemy: 'slime', count: 6, interval: 1.2 }] },
      { groups: [{ enemy: 'slime', count: 8, interval: 1.0 }] },
      { groups: [{ enemy: 'slime', count: 5, interval: 1.0 }, { enemy: 'wolf', count: 4, interval: 0.8, delay: 3 }] },
      { groups: [{ enemy: 'golem', count: 3, interval: 2.5 }, { enemy: 'slime', count: 4, interval: 1.0, delay: 1 }] },
      { groups: [{ enemy: 'bat', count: 6, interval: 1.0 }] },
      { groups: [{ enemy: 'wolf', count: 8, interval: 0.6 }, { enemy: 'slime', count: 4, interval: 1.0, delay: 2 }] },
      { groups: [{ enemy: 'golem', count: 4, interval: 2.0 }, { enemy: 'bat', count: 4, interval: 1.0, delay: 2 }] },
      { groups: [{ enemy: 'slime', count: 10, interval: 0.6 }, { enemy: 'wolf', count: 4, interval: 0.6, delay: 4 }] },
      {
        groups: [
          { enemy: 'golem', count: 5, interval: 1.8 },
          { enemy: 'bat', count: 6, interval: 0.8, delay: 2 },
          { enemy: 'wolf', count: 6, interval: 0.5, delay: 5 },
        ],
      },
      { groups: [{ enemy: 'herald', count: 1, interval: 0 }, { enemy: 'slime', count: 6, interval: 1.0, delay: 2 }] },
    ],
  },
};
