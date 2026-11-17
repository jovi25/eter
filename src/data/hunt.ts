// Caçada de Chefes (Fase 18): every boss already beaten in the campaign, one after the other, on the Arena.
// Between bosses a short shop sells Bênçãos for match gold. The record is the time from the first boss to the last.
// All numbers live here.

import type { BoonRarity } from './boons';
import type { EnemyId } from './enemies';
import type { CampaignStageId } from './stages';

export const HUNT = {
  /** Hunting order and the stage where each boss is first beaten (campaign order: the open ones are always the first N). */
  bosses: [
    { boss: 'herald', stage: 'v5' },
    { boss: 'sentinel', stage: 'a3' },
    { boss: 'devourer', stage: 'a5' },
    { boss: 'titan', stage: 'c5' },
    { boss: 'prism', stage: 'i5' },
  ] as { boss: EnemyId; stage: CampaignStageId }[],
  /** The Caçada opens once this many bosses were beaten. */
  minBosses: 2,
  /** Seconds between a boss's wave being cleared and the next boss (can be called early: the clock is running!). */
  breather: 12,
  /** Gold paid when a boss's wave is cleared (on top of the usual wave bonus). */
  bounty: 450,
  /** The shop between bosses: Bênçãos for match gold (no free Bênçãos in the Caçada). */
  shop: {
    cost: { common: 90, rare: 150, epic: 230 } as Record<BoonRarity, number>,
    weights: { common: 4, rare: 3, epic: 2 } as Record<BoonRarity, number>,
    exclude: ['treasure', 'bounty'] as string[], // gold-for-gold Bênçãos make no sense here
  },
  /** Moedas: each boss down, a full clear, and a new record. */
  coins: { perBoss: 25, clear: 60, record: 40 },
};

/** "m:ss" for the hunt clock. */
export function huntTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
