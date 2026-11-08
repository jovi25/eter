// Hero classes. Every hero fights on its own: auto-attack + an automatic signature skill.
// Reactions anywhere on the map shorten the skill cooldown (the core loop), for every class.

import type { Element } from './elements';
import type { StageId } from './stages';

export type HeroClass = 'mage' | 'knight' | 'priest' | 'druid';
export const HERO_ORDER: HeroClass[] = ['mage', 'knight', 'druid', 'priest'];

export interface BlockerStats {
  hp: number;
  damage: number; // physical, per hit
  rate: number; // hits per second
  maxBlock: number; // enemies held at once
  aggroRadius: number; // from its post
  speed: number;
  respawn: number; // seconds after falling
  regen: number; // fraction of max hp per second when not fighting
}

export interface HeroDef {
  name: string;
  role: string; // one-line description for the picker
  texture: string;
  unlockAfter?: StageId; // win this stage to unlock
  attack: {
    element: Element | 'affinity'; // 'affinity' = the weapon element (mage)
    damage: number;
    rate: number;
    range: number;
    projectileSpeed: number; // 0 = melee (hits instantly)
    burnDps?: number;
    rootChance?: number;
  };
  /** Melee heroes hold enemies in place (they stop and fight back). */
  blocker?: BlockerStats;
  skill: {
    name: string;
    cooldown: number;
    radius: number;
    minTargets: number; // auto-cast when at least this many enemies are in reach
  };
}

export const HEROES: Record<HeroClass, HeroDef> = {
  mage: {
    name: 'Arcanista',
    role: 'Magias do elemento da arma que alimentam combos. Habilidade: Catalisar.',
    texture: 'hero_arcanist',
    attack: { element: 'affinity', damage: 11, rate: 1.0, range: 170, projectileSpeed: 650, burnDps: 5 },
    skill: { name: 'Catalisar', cooldown: 12, radius: 140, minTargets: 2 },
  },
  knight: {
    name: 'Cavaleiro',
    role: 'Corpo a corpo: segura até 2 inimigos e apanha no lugar do cristal. Habilidade: Golpe Giratório.',
    texture: 'hero_knight',
    unlockAfter: 'v1',
    attack: { element: 'physical', damage: 20, rate: 1.2, range: 46, projectileSpeed: 0 },
    blocker: { hp: 420, damage: 20, rate: 1.2, maxBlock: 2, aggroRadius: 150, speed: 170, respawn: 8, regen: 0.06 },
    skill: { name: 'Golpe Giratório', cooldown: 9, radius: 95, minTargets: 2 },
  },
  druid: {
    name: 'Druida',
    role: 'Espinhos que enraízam + um urso que segura os inimigos. Habilidade: Fúria da Natureza.',
    texture: 'hero_druid',
    unlockAfter: 'v2',
    attack: { element: 'nature', damage: 11, rate: 0.9, range: 170, projectileSpeed: 600, rootChance: 0.3 },
    skill: { name: 'Fúria da Natureza', cooldown: 12, radius: 150, minTargets: 3 },
  },
  priest: {
    name: 'Sacerdotisa',
    role: 'Torres perto dela atacam 20% mais rápido. Habilidade: Bênção (torres +35% de dano).',
    texture: 'hero_priest',
    unlockAfter: 'v3',
    attack: { element: 'arcane', damage: 7, rate: 1.0, range: 160, projectileSpeed: 700 },
    skill: { name: 'Bênção', cooldown: 10, radius: 190, minTargets: 1 },
  },
};

/** Druid's summoned bear. */
export const BEAR: BlockerStats = { hp: 620, damage: 16, rate: 1.0, maxBlock: 2, aggroRadius: 150, speed: 150, respawn: 10, regen: 0.06 };

export const PRIEST = {
  auraRadius: 190, // towers within this distance attack faster
  auraRateMult: 1.2,
  blessDamageMult: 1.35,
  blessDuration: 5,
};

export const KNIGHT_SPIN = { damage: 45 }; // physical, to every enemy in the skill radius
export const DRUID_FURY = { rootDuration: 1.6, damage: 20 }; // nature hit + root (respects immunities)
