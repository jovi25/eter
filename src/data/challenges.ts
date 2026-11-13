// Stage challenges (3 per stage, on top of the stars) and the daily challenge rules.
// Pure data + pure checks, so they are unit-tested.

import type { SimState } from '../sim/types';
import { BOON_IDS, type BoonId } from './boons';
import { HERO_ORDER, HEROES, type HeroClass } from './heroes';
import { REACTION_IDS, REACTIONS, type ReactionId } from './reactions';
import { REGIONS, STAGE_ORDER, type CampaignStageId } from './stages';
import { TOWERS, type TowerId } from './towers';

export type Challenge =
  | { kind: 'reactions'; min: number }
  | { kind: 'reaction'; id: ReactionId; min: number }
  | { kind: 'lives'; min: number }
  | { kind: 'maxTowers'; max: number }
  | { kind: 'noTower'; tower: TowerId }
  | { kind: 'hero'; cls: HeroClass };

export const CHALLENGES: Record<CampaignStageId, [Challenge, Challenge, Challenge]> = {
  v1: [{ kind: 'reactions', min: 15 }, { kind: 'lives', min: 20 }, { kind: 'maxTowers', max: 5 }],
  v2: [{ kind: 'noTower', tower: 'brazier' }, { kind: 'reactions', min: 25 }, { kind: 'hero', cls: 'knight' }],
  v3: [{ kind: 'reaction', id: 'overload', min: 8 }, { kind: 'noTower', tower: 'vine' }, { kind: 'lives', min: 15 }],
  v4: [{ kind: 'maxTowers', max: 4 }, { kind: 'hero', cls: 'druid' }, { kind: 'reactions', min: 30 }],
  v5: [{ kind: 'lives', min: 15 }, { kind: 'hero', cls: 'priest' }, { kind: 'noTower', tower: 'archer' }],
  a1: [{ kind: 'reactions', min: 40 }, { kind: 'lives', min: 18 }, { kind: 'maxTowers', max: 7 }],
  a2: [{ kind: 'noTower', tower: 'storm' }, { kind: 'reaction', id: 'wildfire', min: 12 }, { kind: 'hero', cls: 'knight' }],
  a3: [{ kind: 'reaction', id: 'melt', min: 15 }, { kind: 'lives', min: 15 }, { kind: 'hero', cls: 'mage' }],
  a4: [{ kind: 'maxTowers', max: 6 }, { kind: 'hero', cls: 'druid' }, { kind: 'reactions', min: 50 }],
  a5: [{ kind: 'lives', min: 15 }, { kind: 'reaction', id: 'shatter', min: 10 }, { kind: 'hero', cls: 'priest' }],
};

export function challengeText(c: Challenge): string {
  switch (c.kind) {
    case 'reactions':
      return `Cause ${c.min} reações`;
    case 'reaction':
      return `Cause ${c.min}× ${REACTIONS[c.id].name}`;
    case 'lives':
      return c.min >= 20 ? 'Vença sem perder vidas' : `Vença com ${c.min}+ vidas`;
    case 'maxTowers':
      return `Vença com no máximo ${c.max} torres`;
    case 'noTower':
      return `Vença sem construir ${TOWERS[c.tower].name}`;
    case 'hero':
      return `Vença com ${HEROES[c.cls].name}`;
  }
}

/** A challenge only counts on a win. */
export function challengeMet(c: Challenge, s: SimState): boolean {
  if (s.result !== 'won') return false;
  switch (c.kind) {
    case 'reactions':
      return REACTION_IDS.reduce((sum, id) => sum + s.stats.reactions[id], 0) >= c.min;
    case 'reaction':
      return s.stats.reactions[c.id] >= c.min;
    case 'lives':
      return s.lives >= c.min;
    case 'maxTowers':
      return s.stats.peakTowers <= c.max;
    case 'noTower':
      return s.stats.built[c.tower] === 0;
    case 'hero':
      return s.hero.cls === c.cls;
  }
}

export function evaluateChallenges(stage: CampaignStageId, s: SimState): boolean[] {
  return CHALLENGES[stage].map((c) => challengeMet(c, s));
}

export const TOTAL_CHALLENGES = STAGE_ORDER.length * 3;

// ───────────────────────── daily challenge ─────────────────────────

export interface DailySetup {
  key: string; // YYYY-MM-DD
  seed: number;
  stage: CampaignStageId;
  hero: HeroClass;
  boon: BoonId; // you start the match with this one
}

/** Same day → same stage, hero, starting boon and seed for everyone. */
export function dailySetup(date: Date): DailySetup {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const key = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  // Small integer hash of the date.
  let h = (y * 10000 + m * 100 + d) >>> 0;
  const next = () => {
    h = (Math.imul(h ^ (h >>> 15), 0x2c1b3c6d) + 0x9e3779b9) >>> 0;
    return h;
  };
  const seed = next();
  return {
    key,
    seed,
    stage: REGIONS[0]!.stages[next() % REGIONS[0]!.stages.length]!, // the daily stays in Região 1 (anyone can play it)
    hero: HERO_ORDER[next() % HERO_ORDER.length]!,
    boon: BOON_IDS[next() % BOON_IDS.length]!,
  };
}

export const DAILY_SCORE = { perLife: 100, perReaction: 10, winBonus: 1000, perWaveOnLoss: 60 };

export function dailyScore(s: SimState): number {
  const reactions = REACTION_IDS.reduce((sum, id) => sum + s.stats.reactions[id], 0);
  const base = reactions * DAILY_SCORE.perReaction;
  if (s.result === 'won') return DAILY_SCORE.winBonus + s.lives * DAILY_SCORE.perLife + base;
  return Math.max(0, s.wave - 1) * DAILY_SCORE.perWaveOnLoss + base;
}
