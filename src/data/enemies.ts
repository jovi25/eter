import type { Element } from './elements';

export type EnemyId =
  | 'slime'
  | 'wolf'
  | 'golem'
  | 'bat'
  | 'salamander'
  | 'yeti'
  | 'skeleton'
  | 'shaman'
  | 'mudling'
  | 'colossus'
  | 'herald';

export interface BossDef {
  cycle: number; // every N seconds...
  chillImmuneDuration: number; // ...becomes immune to Chilled for this long
  summon: { enemy: EnemyId; count: number; goldMult: number; hpMult: number; spacing: number }; // hpMult × base hp, no wave scaling
}

/**
 * Damage taken per element: 0.4 = takes 40% less, -0.5 = takes 50% MORE (weakness), 1 = immune.
 * Missing elements = neutral.
 */
export type Resistances = Partial<Record<Element, number>>;

export interface EnemyDef {
  name: string;
  hp: number;
  speed: number; // px/s along the path
  gold: number; // reward on kill
  livesCost: number; // lives lost if it reaches the crystal
  resist: Resistances;
  rootImmune?: boolean;
  flying: boolean;
  scalesWithWave: boolean; // hp × hpGrowthPerWave^wave
  radius: number; // body size in px (art + splash checks)
  boss?: BossDef;
}

export const ENEMIES: Record<EnemyId, EnemyDef> = {
  // ── Region 1 basics ──
  slime: { name: 'Gosma', hp: 60, speed: 80, gold: 9, livesCost: 1, resist: {}, flying: false, scalesWithWave: true, radius: 22 },
  wolf: { name: 'Goblin Ligeiro', hp: 35, speed: 140, gold: 8, livesCost: 1, resist: {}, flying: false, scalesWithWave: true, radius: 20 },
  golem: {
    name: 'Golem Musgoso',
    hp: 220,
    speed: 50,
    gold: 20,
    livesCost: 2,
    resist: { physical: 0.4 },
    flying: false,
    scalesWithWave: true,
    radius: 30,
  },
  bat: { name: 'Diabrete Alado', hp: 50, speed: 100, gold: 11, livesCost: 1, resist: {}, flying: true, scalesWithWave: true, radius: 20 },

  // ── Elemental specialists (stages 2+) ──
  salamander: {
    name: 'Chifrudo de Brasa',
    hp: 90,
    speed: 95,
    gold: 12,
    livesCost: 1,
    resist: { fire: 1, ice: -0.5 },
    flying: false,
    scalesWithWave: true,
    radius: 22,
  },
  yeti: {
    name: 'Zumbi Gélido',
    hp: 130,
    speed: 60,
    gold: 14,
    livesCost: 1,
    resist: { ice: 0.8, fire: -0.5 },
    flying: false,
    scalesWithWave: true,
    radius: 22,
  },
  skeleton: {
    name: 'Esqueleto',
    hp: 80,
    speed: 85,
    gold: 11,
    livesCost: 1,
    resist: { physical: 0.6, nature: 0.5, lightning: -0.5 },
    flying: false,
    scalesWithWave: true,
    radius: 20,
  },
  shaman: {
    name: 'Xamã Orc',
    hp: 110,
    speed: 70,
    gold: 14,
    livesCost: 1,
    resist: { lightning: 0.6, arcane: 0.5, physical: -0.3 },
    flying: false,
    scalesWithWave: true,
    radius: 22,
  },
  mudling: {
    name: 'Lamacento',
    hp: 120,
    speed: 65,
    gold: 13,
    livesCost: 1,
    resist: { nature: 0.7, physical: 0.2, fire: -0.4 },
    rootImmune: true,
    flying: false,
    scalesWithWave: true,
    radius: 22,
  },
  colossus: {
    name: 'Colosso do Pântano',
    hp: 900,
    speed: 38,
    gold: 60,
    livesCost: 5,
    resist: { physical: 0.3, ice: 0.3, lightning: -0.3 },
    flying: false,
    scalesWithWave: false,
    radius: 36,
  },

  // ── Boss ──
  herald: {
    name: 'Arauto da Geada',
    hp: 1300,
    speed: 45,
    gold: 100,
    livesCost: 20,
    resist: { physical: 0.15 },
    flying: false,
    scalesWithWave: false,
    radius: 42,
    boss: {
      cycle: 6,
      chillImmuneDuration: 2,
      summon: { enemy: 'slime', count: 3, goldMult: 0.3, hpMult: 1, spacing: 28 },
    },
  },
};
