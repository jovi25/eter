import type { Element } from './elements';
import type { ReactionId } from './reactions';

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
  | 'treasure'
  | 'herald'
  | 'sentinel'
  | 'devourer'
  | 'monk'
  | 'gargoyle'
  | 'titan'
  | 'imp'
  | 'prism'
  | 'broodmother'
  | 'beetle'
  | 'wraith'
  | 'hare';

export interface BossDef {
  cycle: number; // every N seconds...
  chillImmuneDuration: number; // ...becomes immune to Chilled for this long
  summon: { enemy: EnemyId; count: number; goldMult: number; hpMult: number; spacing: number }; // hpMult × base hp, no wave scaling
  /**
   * Região 2: elemental shields. Shield i rises when hp falls to at[i] (at[0] = 1: on arrival). While it is up the
   * boss takes only `taken` of the damage; `hits` reactions of the named kind on the boss break it.
   */
  shields?: { reactions: ReactionId[]; at: number[]; hits: number; taken: number; grace: number };
  /**
   * Região 4: elemental forms. Form i takes over when hp falls to at[i] (at[0] = 1: on arrival); the order of the
   * forms is shuffled per match. Each form resists one element (armor) and is weak to another (weak).
   */
  forms?: { list: { armor: Element; weak: Element }[]; at: number[]; armor: number; weak: number };
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
  attack: number; // damage per second dealt to a hero/summon holding it (flyers are never held)
  resist: Resistances;
  rootImmune?: boolean;
  flying: boolean;
  scalesWithWave: boolean; // hp × hpGrowthPerWave^wave
  radius: number; // body size in px (art + splash checks)
  boss?: BossDef;
  /** Healer: every `every` seconds restores `pct` of max life to the others within `radius`. */
  heal?: { every: number; radius: number; pct: number };
  /** Gold thief: at this share of the road it grabs gold and runs (speed × fleeMult). Killed: gives it back twice. */
  thief?: { at: number; steal: number; fleeMult: number };
  /** Bolhão: when it dies it splits into `count` of `into` (they pay `goldMult` of their gold). */
  splits?: { into: EnemyId; count: number; goldMult: number };
  /** Besouro Couraçado: takes only `taken` of the damage until a reaction hits it (then the shell is gone). */
  shell?: { taken: number };
  /** Espectro: every `every` s it fades for `duration` s and takes only `taken` of the damage. */
  phase?: { every: number; duration: number; taken: number };
  /** Lebre-Relâmpago: every `every` s it dashes at `mult`× speed for `duration` s. */
  dash?: { every: number; duration: number; mult: number };
}

export const ENEMIES: Record<EnemyId, EnemyDef> = {
  // ── Region 1 basics ──
  slime: { name: 'Gosma', hp: 60, speed: 80, gold: 9, livesCost: 1, attack: 6, resist: {}, flying: false, scalesWithWave: true, radius: 22 },
  wolf: { name: 'Lobo Ligeiro', hp: 35, speed: 140, gold: 8, livesCost: 1, attack: 5, resist: {}, flying: false, scalesWithWave: true, radius: 20 },
  golem: {
    name: 'Golem de Casca',
    hp: 220,
    speed: 50,
    gold: 20,
    livesCost: 2, attack: 16,
    resist: { physical: 0.4 },
    flying: false,
    scalesWithWave: true,
    radius: 30,
  },
  bat: { name: 'Morcego Sombrio', hp: 50, speed: 100, gold: 11, livesCost: 1, attack: 0, resist: {}, flying: true, scalesWithWave: true, radius: 20 },

  // ── Elemental specialists (stages 2+) ──
  salamander: {
    name: 'Chifrudo de Brasa',
    hp: 90,
    speed: 95,
    gold: 12,
    livesCost: 1, attack: 9,
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
    livesCost: 1, attack: 10,
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
    livesCost: 1, attack: 8,
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
    livesCost: 1, attack: 9,
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
    livesCost: 1, attack: 8,
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
    livesCost: 5, attack: 35,
    resist: { physical: 0.3, ice: 0.3, lightning: -0.3 },
    flying: false,
    scalesWithWave: false,
    radius: 36,
  },

  // ── Pacote de conteúdo 1: four monsters, each with something to learn ──
  /** Splits into two Gosmas when it dies: kill it where your towers can finish the little ones. */
  broodmother: { name: 'Bolhão', hp: 150, speed: 55, gold: 14, livesCost: 2, attack: 12, resist: {}, flying: false, scalesWithWave: true, radius: 30, splits: { into: 'slime', count: 2, goldMult: 0.4 } },
  /** Hard shell: plain hits barely scratch it until a reaction cracks it open. */
  beetle: { name: 'Besouro Couraçado', hp: 125, speed: 60, gold: 16, livesCost: 1, attack: 12, resist: { physical: 0.2 }, flying: false, scalesWithWave: true, radius: 24, shell: { taken: 0.5 } },
  /** Fades out now and then: almost immune while translucent. */
  wraith: { name: 'Espectro', hp: 120, speed: 75, gold: 15, livesCost: 1, attack: 9, resist: { physical: 0.3, arcane: -0.4 }, rootImmune: true, flying: false, scalesWithWave: true, radius: 22, phase: { every: 5, duration: 1.2, taken: 0.3 } },
  /** Sudden dashes: slow it (ice, roots) or it races past the towers. */
  hare: { name: 'Lebre-Relâmpago', hp: 55, speed: 95, gold: 10, livesCost: 1, attack: 5, resist: { lightning: 0.5 }, flying: false, scalesWithWave: true, radius: 20, dash: { every: 4, duration: 0.6, mult: 2.5 } },

  // ── Bonus: runs fast, costs no lives, pays a lot if you catch it ──
  treasure: { name: 'Gosma Dourada', hp: 110, speed: 135, gold: 45, livesCost: 0, attack: 0, resist: {}, flying: false, scalesWithWave: true, radius: 20 },

  // ── Boss ──
  herald: {
    name: 'Arauto da Geada',
    hp: 1300,
    speed: 45,
    gold: 100,
    livesCost: 20, attack: 45,
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

  // ── Região 2 bosses: elemental shields that only the right reaction breaks ──
  sentinel: {
    name: 'Sentinela de Âmbar',
    hp: 2600,
    speed: 40,
    gold: 120,
    livesCost: 20, attack: 50,
    resist: { physical: 0.2 },
    rootImmune: true,
    flying: false,
    scalesWithWave: false,
    radius: 44,
    boss: {
      cycle: 8,
      chillImmuneDuration: 0,
      summon: { enemy: 'wolf', count: 2, goldMult: 0.3, hpMult: 1.5, spacing: 30 },
      shields: { reactions: ['melt', 'overload', 'wildfire'], at: [1, 0.66, 0.33], hits: 3, taken: 0.3, grace: 3 },
    },
  },
  devourer: {
    name: 'Devorador de Éter',
    hp: 3000,
    speed: 36,
    gold: 200,
    livesCost: 20, attack: 60,
    resist: {},
    rootImmune: true,
    flying: false,
    scalesWithWave: false,
    radius: 48,
    boss: {
      cycle: 7,
      chillImmuneDuration: 0,
      summon: { enemy: 'bat', count: 3, goldMult: 0.3, hpMult: 1.5, spacing: 26 },
      shields: { reactions: ['superconduct', 'wildfire', 'shatter', 'melt'], at: [1, 0.75, 0.5, 0.25], hits: 3, taken: 0.3, grace: 3 },
    },
  },

  // ── Região 3 ──
  /** Heals everyone around: kill it first (a classic tower-defense priority target). */
  monk: { name: 'Monge do Gelo', hp: 150, speed: 60, gold: 18, livesCost: 1, attack: 8, resist: { ice: 0.5 }, flying: false, scalesWithWave: true, radius: 24, heal: { every: 3, radius: 100, pct: 0.06 } },
  /** Stone wings: flies (Vinha can't reach it), shrugs off arrows and fire, cracks with lightning. */
  gargoyle: { name: 'Gárgula de Pedra', hp: 110, speed: 70, gold: 16, livesCost: 1, attack: 0, resist: { physical: 0.4, fire: 0.3, lightning: -0.5 }, flying: true, scalesWithWave: true, radius: 26 },
  titan: {
    name: 'Titã de Obsidiana',
    hp: 3000,
    speed: 34,
    gold: 220,
    livesCost: 20, attack: 70,
    resist: { fire: 0.5 },
    rootImmune: true,
    flying: false,
    scalesWithWave: false,
    radius: 50,
    boss: {
      cycle: 7,
      chillImmuneDuration: 0,
      summon: { enemy: 'gargoyle', count: 2, goldMult: 0.3, hpMult: 1.5, spacing: 34 },
      shields: { reactions: ['superconduct', 'thornfrost', 'overload', 'shatter'], at: [1, 0.75, 0.5, 0.25], hits: 3, taken: 0.35, grace: 3 },
    },
  },

  // ── Região 4 ──
  /** Grabs gold halfway down the road and runs for the exit. Catch it to get the gold back twice over. */
  imp: { name: 'Diabrete Ladrão', hp: 80, speed: 90, gold: 10, livesCost: 1, attack: 6, resist: { arcane: 0.3 }, flying: false, scalesWithWave: true, radius: 20, thief: { at: 0.4, steal: 20, fleeMult: 1.6 } },
  /** Changes element four times: what worked a moment ago barely scratches it now. */
  prism: {
    name: 'Prisma do Vazio',
    hp: 3200,
    speed: 32,
    gold: 240,
    livesCost: 20, attack: 70,
    resist: {},
    rootImmune: true,
    flying: false,
    scalesWithWave: false,
    radius: 50,
    boss: {
      cycle: 9,
      chillImmuneDuration: 0,
      summon: { enemy: 'imp', count: 2, goldMult: 0.3, hpMult: 1.5, spacing: 34 },
      forms: {
        list: [
          { armor: 'fire', weak: 'ice' },
          { armor: 'ice', weak: 'fire' },
          { armor: 'lightning', weak: 'nature' },
          { armor: 'nature', weak: 'lightning' },
        ],
        at: [1, 0.75, 0.5, 0.25],
        armor: 0.85,
        weak: 0.5,
      },
    },
  },
};
