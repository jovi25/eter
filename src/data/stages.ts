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
  runes?: boolean; // rune stones available (taught from stage 3 on)
  waves: WaveDef[];
}

export type CampaignStageId = 'v1' | 'v2' | 'v3' | 'v4' | 'v5' | 'a1' | 'a2' | 'a3' | 'a4' | 'a5';
export type StageId = CampaignStageId | 'rift';
/** Campaign order; each stage unlocks the next. Região 2 (a1..a5) opens after v5. */
export const STAGE_ORDER: CampaignStageId[] = ['v1', 'v2', 'v3', 'v4', 'v5', 'a1', 'a2', 'a3', 'a4', 'a5'];
export const REGIONS: { name: string; stages: CampaignStageId[] }[] = [
  { name: 'Vellmora', stages: ['v1', 'v2', 'v3', 'v4', 'v5'] },
  { name: 'Ermos de Âmbar', stages: ['a1', 'a2', 'a3', 'a4', 'a5'] },
];
export function regionOf(id: StageId): number {
  return REGIONS.findIndex((r) => r.stages.includes(id as CampaignStageId));
}

/** Endless-style mode: how far can you get? Unlocked by winning this stage. */
export const RIFT = { unlockAfter: 'v2' as CampaignStageId, waves: 40 };

/** Wave N of the Rift, built by formula (no randomness, so everyone faces the same Rift). */
function riftWave(n: number): WaveDef {
  const pool: EnemyId[] = ['slime', 'wolf'];
  if (n >= 3) pool.push('golem', 'bat');
  if (n >= 5) pool.push('salamander', 'skeleton');
  if (n >= 8) pool.push('yeti', 'mudling', 'shaman');
  const count = Math.min(14, 5 + Math.floor(n / 2));
  const interval = Math.max(0.4, 1.0 - n * 0.02);
  const groups: SpawnGroup[] = [];
  const kinds = n >= 6 ? 3 : 2;
  for (let k = 0; k < kinds; k++) {
    const enemy = pool[(n * 7 + k * 3) % pool.length]!;
    const heavy = enemy === 'golem';
    groups.push({ enemy, count: heavy ? Math.ceil(count / 2) : count, interval: heavy ? interval * 1.8 : interval, delay: k * 2 });
  }
  if (n % 5 === 0) groups.push({ enemy: 'colossus', count: Math.floor(n / 10) + 1, interval: 5, delay: 1 });
  if (n % 10 === 0) groups.push({ enemy: 'herald', count: 1, interval: 0, delay: 3 });
  return { groups };
}

const g = (enemy: EnemyId, count: number, interval: number, delay = 0, path?: number): SpawnGroup => ({ enemy, count, interval, delay, path });

export const STAGES: Record<StageId, StageDef> = {
  rift: {
    runes: true,
    name: 'Fenda Infinita',
    subtitle: 'Até onde você aguenta? Uma bênção a cada 3 ondas.',
    map: 'twin',
    hpMult: 0.9,
    startGold: 220,
    waves: Array.from({ length: RIFT.waves }, (_, i) => riftWave(i + 1)),
  },
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
    hpMult: 0.9,
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
    runes: true,
    name: 'Pântano de Vellmora',
    subtitle: 'O Anel — gelo e lama',
    map: 'ring',
    hpMult: 1.2,
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
    runes: true,
    name: 'Desfiladeiro de Vellmora',
    subtitle: 'Corredor curto — poucos espaços',
    map: 'corridor',
    hpMult: 1.08,
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
    runes: true,
    name: 'Trono da Geada',
    subtitle: 'Bifurcação — o Arauto da Geada',
    map: 'fork',
    hpMult: 0.9,
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
  // ───────────── Região 2: Ermos de Âmbar (tall maps, drag to scroll) ─────────────
  a1: {
    runes: true,
    name: 'Ermos de Âmbar I',
    subtitle: 'Cânion — o mapa agora rola: arraste para cima e para baixo',
    map: 'canyon',
    hpMult: 1.15,
    startGold: 230,
    waves: [
      { groups: [g('slime', 10, 0.7)] },
      { groups: [g('wolf', 10, 0.5)] },
      { groups: [g('golem', 4, 1.8), g('salamander', 5, 1.0, 2)] },
      { groups: [g('bat', 8, 0.7), g('slime', 6, 0.8, 2)] },
      { groups: [g('skeleton', 8, 0.8), g('yeti', 4, 1.2, 3)] },
      { groups: [g('mudling', 6, 1.0), g('wolf', 8, 0.4, 2)] },
      { groups: [g('shaman', 6, 0.9), g('golem', 4, 1.6, 2)] },
      { groups: [g('salamander', 8, 0.6), g('yeti', 6, 0.8, 1)] },
      { groups: [g('bat', 10, 0.5), g('skeleton', 8, 0.7, 3)] },
      { groups: [g('golem', 6, 1.2), g('shaman', 6, 0.8, 2), g('wolf', 10, 0.35, 4)] },
      { groups: [g('yeti', 8, 0.6), g('mudling', 8, 0.7, 2), g('bat', 6, 0.6, 4)] },
      { groups: [g('colossus', 2, 5), g('slime', 12, 0.5, 1), g('skeleton', 8, 0.6, 4)] },
    ],
  },
  a2: {
    runes: true,
    name: 'Ermos de Âmbar II',
    subtitle: 'Comporta — toque nela para mandar os inimigos para o outro lado',
    map: 'sluice',
    hpMult: 1.1,
    startGold: 230,
    waves: [
      { groups: [g('slime', 12, 0.6)] },
      { groups: [g('wolf', 12, 0.45)] },
      { groups: [g('salamander', 6, 0.9), g('skeleton', 6, 0.9, 2)] },
      { groups: [g('golem', 5, 1.5), g('bat', 6, 0.8, 2)] },
      { groups: [g('yeti', 8, 0.8), g('wolf', 8, 0.4, 3)] },
      { groups: [g('shaman', 8, 0.8), g('mudling', 6, 0.9, 2)] },
      { groups: [g('skeleton', 10, 0.6), g('salamander', 8, 0.6, 3)] },
      { groups: [g('golem', 6, 1.2), g('bat', 10, 0.5, 2)] },
      { groups: [g('wolf', 16, 0.3), g('yeti', 6, 0.8, 4)] },
      { groups: [g('mudling', 10, 0.6), g('shaman', 8, 0.6, 2), g('salamander', 8, 0.6, 4)] },
      { groups: [g('golem', 8, 1.0), g('skeleton', 10, 0.5, 2), g('bat', 8, 0.5, 5)] },
      { groups: [g('colossus', 3, 4), g('yeti', 10, 0.5, 2), g('wolf', 12, 0.3, 5)] },
    ],
  },
  a3: {
    runes: true,
    name: 'Ermos de Âmbar III',
    subtitle: 'Escadaria — a Sentinela de Âmbar e seus escudos',
    map: 'stairs',
    hpMult: 1.15,
    startGold: 240,
    waves: [
      { groups: [g('slime', 12, 0.6)] },
      { groups: [g('salamander', 8, 0.8)] },
      { groups: [g('yeti', 6, 1.0), g('wolf', 8, 0.45, 2)] },
      { groups: [g('skeleton', 8, 0.8), g('bat', 6, 0.8, 2)] },
      { groups: [g('golem', 5, 1.4), g('salamander', 6, 0.8, 2)] },
      { groups: [g('mudling', 8, 0.8), g('shaman', 6, 0.9, 2)] },
      { groups: [g('wolf', 14, 0.35), g('yeti', 6, 0.8, 3)] },
      { groups: [g('bat', 12, 0.5), g('skeleton', 8, 0.6, 3)] },
      { groups: [g('golem', 6, 1.1), g('salamander', 10, 0.5, 2)] },
      { groups: [g('shaman', 10, 0.6), g('mudling', 8, 0.6, 2), g('wolf', 10, 0.3, 4)] },
      { groups: [g('colossus', 2, 5), g('yeti', 10, 0.5, 2), g('bat', 8, 0.5, 4)] },
      { groups: [g('sentinel', 1, 0), g('slime', 10, 0.6, 2), g('skeleton', 8, 0.7, 5)] },
    ],
  },
  a4: {
    runes: true,
    name: 'Ermos de Âmbar IV',
    subtitle: 'Confluência — dois portais que se encontram no meio',
    map: 'confluence',
    hpMult: 1,
    startGold: 250,
    waves: [
      { groups: [g('slime', 8, 0.7, 0, 0), g('slime', 8, 0.7, 0.4, 1)] },
      { groups: [g('wolf', 8, 0.5, 0, 0), g('salamander', 6, 0.8, 0, 1)] },
      { groups: [g('golem', 4, 1.6, 0, 0), g('bat', 8, 0.6, 1, 1)] },
      { groups: [g('skeleton', 8, 0.7), g('yeti', 6, 0.9, 2)] },
      { groups: [g('shaman', 8, 0.8, 0, 1), g('mudling', 8, 0.8, 0, 0)] },
      { groups: [g('wolf', 16, 0.3), g('golem', 4, 1.4, 3)] },
      { groups: [g('salamander', 10, 0.5, 0, 0), g('yeti', 10, 0.5, 0, 1)] },
      { groups: [g('bat', 14, 0.4), g('skeleton', 10, 0.5, 3)] },
      { groups: [g('colossus', 1, 0, 0, 0), g('colossus', 1, 0, 2, 1), g('wolf', 12, 0.3, 4)] },
      { groups: [g('mudling', 10, 0.5), g('shaman', 10, 0.5, 2), g('bat', 8, 0.5, 4)] },
      { groups: [g('golem', 8, 0.9), g('yeti', 10, 0.5, 2), g('salamander', 10, 0.5, 4)] },
      { groups: [g('colossus', 3, 3), g('skeleton', 12, 0.4, 2), g('wolf', 14, 0.3, 5)] },
    ],
  },
  a5: {
    runes: true,
    name: 'Coração do Âmbar',
    subtitle: 'Abismo — o Devorador de Éter',
    map: 'abyss',
    hpMult: 1.1,
    startGold: 260,
    waves: [
      { groups: [g('slime', 14, 0.5)] },
      { groups: [g('salamander', 8, 0.7), g('yeti', 6, 0.8, 2)] },
      { groups: [g('skeleton', 10, 0.6), g('shaman', 6, 0.8, 2)] },
      { groups: [g('golem', 6, 1.2), g('bat', 8, 0.6, 2)] },
      { groups: [g('wolf', 18, 0.3)] },
      { groups: [g('mudling', 10, 0.6), g('salamander', 8, 0.6, 2)] },
      { groups: [g('colossus', 2, 5), g('skeleton', 10, 0.5, 2)] },
      { groups: [g('yeti', 12, 0.5), g('bat', 10, 0.5, 3)] },
      { groups: [g('shaman', 12, 0.5), g('golem', 6, 1.0, 2), g('wolf', 12, 0.3, 4)] },
      { groups: [g('salamander', 12, 0.4), g('mudling', 10, 0.5, 2), g('skeleton', 10, 0.5, 4)] },
      { groups: [g('colossus', 3, 3), g('yeti', 12, 0.4, 2), g('bat', 12, 0.4, 4)] },
      { groups: [g('devourer', 1, 0), g('golem', 6, 1.2, 3), g('wolf', 14, 0.35, 6), g('shaman', 8, 0.6, 9)] },
    ],
  },
};
