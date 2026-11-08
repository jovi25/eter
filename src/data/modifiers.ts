import type { Element } from './elements';
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
}

export function defaultModifiers(): SimModifiers {
  return {
    towerDamageMult: { archer: 1, brazier: 1, frost: 1, vine: 1 },
    elementDamageMult: { physical: 1, fire: 1, ice: 1, nature: 1, arcane: 1 },
    rootDurationBonus: 0,
    chillMaxStacks: 3,
    physicalIgnoresResist: false,
    vineHitsFlying: false,
    meltAppliesFragile: false,
    unlockedTowers: ['archer', 'brazier', 'frost', 'vine'],
  };
}
