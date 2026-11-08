export type EnemyId = 'slime' | 'wolf' | 'golem' | 'bat' | 'herald';

export interface BossDef {
  cycle: number; // every N seconds...
  chillImmuneDuration: number; // ...becomes immune to Chilled for this long
  summon: { enemy: EnemyId; count: number; goldMult: number; hpMult: number; spacing: number }; // hpMult × base hp, no wave scaling
}

export interface EnemyDef {
  name: string;
  hp: number;
  speed: number; // px/s along the path
  gold: number; // reward on kill
  livesCost: number; // lives lost if it reaches the crystal
  physicalResist: number; // 0.4 = takes 40% less physical damage
  flying: boolean;
  scalesWithWave: boolean; // hp × hpGrowthPerWave^wave
  radius: number; // body size in px (art + splash checks)
  boss?: BossDef;
}

export const ENEMIES: Record<EnemyId, EnemyDef> = {
  slime: { name: 'Gosma', hp: 60, speed: 80, gold: 9, livesCost: 1, physicalResist: 0, flying: false, scalesWithWave: true, radius: 22 },
  wolf: { name: 'Lobo Ligeiro', hp: 35, speed: 140, gold: 8, livesCost: 1, physicalResist: 0, flying: false, scalesWithWave: true, radius: 20 },
  golem: { name: 'Golem de Casca', hp: 220, speed: 50, gold: 20, livesCost: 2, physicalResist: 0.4, flying: false, scalesWithWave: true, radius: 30 },
  bat: { name: 'Morcego Sombrio', hp: 50, speed: 100, gold: 11, livesCost: 1, physicalResist: 0, flying: true, scalesWithWave: true, radius: 20 },
  herald: {
    name: 'Arauto da Geada',
    hp: 1300,
    speed: 45,
    gold: 100,
    livesCost: 20,
    physicalResist: 0.15,
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
