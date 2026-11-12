import type { Element } from './elements';
import type { HeroClass } from './heroes';
import type { TalentId } from './talents';
import type { TowerId } from './towers';

/**
 * Everything outside the match that changes it: tower collection levels, equipment resonance, monster cards.
 * Built by the meta layer (Phase 4) and handed to the simulation. Defaults = fresh account.
 */
export interface SimModifiers {
  towerDamageMult: Record<TowerId, number>;
  elementDamageMult: Record<Element, number>;
  rootDurationBonus: number; // seconds
  chillMaxStacks: number;
  physicalIgnoresResist: boolean; // Golem card
  vineHitsFlying: boolean; // Bat card
  meltAppliesFragile: boolean; // Herald card
  unlockedTowers: TowerId[];
  /** Element of the equipped weapon — what Catalisar hits with. Starts as Fire (Cajado de Brasa). */
  heroAffinity: Exclude<Element, 'arcane' | 'physical'>;
  heroDamageMult: number; // equipment / level
  heroAttackSpeedMult: number; // Wolf card
  heroClass: HeroClass;
  /** Fase 8: the equipped talent (null = none) and the level-5 second skill. */
  heroTalent: TalentId | null;
  heroSkill2: boolean;
  // Run-time knobs changed by Bênçãos (src/data/boons.ts)
  burnDpsMult: number;
  chainBonus: number; // extra lightning jumps
  reactionDamageMult: number;
  comboWindowBonus: number; // seconds
  comboMaxBonus: number; // added to the combo multiplier cap
  goldMult: number; // kill gold
  upgradeCostMult: number;
  rangeMult: number;
  unlockedBoons: string[]; // locked Bênçãos revealed by Relicários (Fase 7)
}

export function defaultModifiers(): SimModifiers {
  return {
    towerDamageMult: { archer: 1, brazier: 1, frost: 1, vine: 1, storm: 1 },
    elementDamageMult: { physical: 1, fire: 1, ice: 1, nature: 1, lightning: 1, arcane: 1 },
    rootDurationBonus: 0,
    chillMaxStacks: 3,
    physicalIgnoresResist: false,
    vineHitsFlying: false,
    meltAppliesFragile: false,
    unlockedTowers: ['archer', 'brazier', 'frost', 'vine', 'storm'],
    heroAffinity: 'fire',
    heroDamageMult: 1,
    heroAttackSpeedMult: 1,
    heroClass: 'mage',
    heroTalent: null,
    heroSkill2: false,
    burnDpsMult: 1,
    chainBonus: 0,
    reactionDamageMult: 1,
    comboWindowBonus: 0,
    comboMaxBonus: 0,
    goldMult: 1,
    upgradeCostMult: 1,
    rangeMult: 1,
    unlockedBoons: [],
  };
}
