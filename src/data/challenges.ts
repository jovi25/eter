// Stage challenges (3 per stage, on top of the stars) and the daily challenge rules.
// Pure data + pure checks, so they are unit-tested.

import type { TrialRules } from '../sim/simulation';
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
  | { kind: 'hero'; cls: HeroClass }
  /** Win within this many seconds of match time (calling waves early is the way). */
  | { kind: 'time'; seconds: number }
  /** Win without any tower above this level (no evolutions or fusions either). */
  | { kind: 'maxLevel'; max: number };

// Time goals ≈ 86% of the stage's natural length (robots, `npm run balance`): you have to call waves early.
export const CHALLENGES: Record<CampaignStageId, [Challenge, Challenge, Challenge]> = {
  // Tutorial: goals that use only what the stage teaches.
  v1: [{ kind: 'lives', min: 20 }, { kind: 'maxTowers', max: 4 }, { kind: 'time', seconds: 155 }],
  v2: [{ kind: 'reaction', id: 'wildfire', min: 10 }, { kind: 'noTower', tower: 'archer' }, { kind: 'maxLevel', max: 2 }],
  v3: [{ kind: 'reaction', id: 'superconduct', min: 6 }, { kind: 'reaction', id: 'shatter', min: 4 }, { kind: 'time', seconds: 180 }],
  v4: [{ kind: 'maxTowers', max: 4 }, { kind: 'reactions', min: 30 }, { kind: 'time', seconds: 145 }],
  v5: [{ kind: 'lives', min: 15 }, { kind: 'noTower', tower: 'archer' }, { kind: 'time', seconds: 140 }],
  a1: [{ kind: 'reactions', min: 40 }, { kind: 'lives', min: 18 }, { kind: 'time', seconds: 195 }],
  a2: [{ kind: 'noTower', tower: 'storm' }, { kind: 'reaction', id: 'wildfire', min: 12 }, { kind: 'time', seconds: 185 }],
  a3: [{ kind: 'reaction', id: 'melt', min: 15 }, { kind: 'lives', min: 15 }, { kind: 'time', seconds: 245 }],
  a4: [{ kind: 'maxTowers', max: 6 }, { kind: 'time', seconds: 195 }, { kind: 'reactions', min: 50 }],
  c1: [{ kind: 'reactions', min: 45 }, { kind: 'lives', min: 18 }, { kind: 'time', seconds: 220 }],
  c2: [{ kind: 'reaction', id: 'superconduct', min: 12 }, { kind: 'noTower', tower: 'archer' }, { kind: 'time', seconds: 190 }],
  c3: [{ kind: 'maxTowers', max: 7 }, { kind: 'time', seconds: 195 }, { kind: 'reaction', id: 'overload', min: 12 }],
  c4: [{ kind: 'reactions', min: 60 }, { kind: 'noTower', tower: 'brazier' }, { kind: 'time', seconds: 235 }],
  c5: [{ kind: 'lives', min: 15 }, { kind: 'reaction', id: 'thornfrost', min: 12 }, { kind: 'time', seconds: 230 }],
  i1: [{ kind: 'reaction', id: 'superconduct', min: 15 }, { kind: 'lives', min: 15 }, { kind: 'time', seconds: 190 }],
  i2: [{ kind: 'noTower', tower: 'archer' }, { kind: 'reactions', min: 55 }, { kind: 'time', seconds: 175 }],
  i3: [{ kind: 'reactions', min: 70 }, { kind: 'maxTowers', max: 7 }, { kind: 'time', seconds: 210 }],
  i4: [{ kind: 'lives', min: 18 }, { kind: 'noTower', tower: 'brazier' }, { kind: 'time', seconds: 205 }],
  i5: [{ kind: 'lives', min: 15 }, { kind: 'reaction', id: 'wildfire', min: 12 }, { kind: 'time', seconds: 215 }],
  a5: [{ kind: 'lives', min: 15 }, { kind: 'reaction', id: 'shatter', min: 10 }, { kind: 'time', seconds: 240 }],
};

/** 155 → "2:35". */
export function clock(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

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
    case 'time':
      return `Vença em até ${clock(c.seconds)}`;
    case 'maxLevel':
      return `Vença sem torres acima do nível ${c.max}`;
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
    case 'time':
      return s.time <= c.seconds;
    case 'maxLevel':
      return s.stats.peakLevel <= c.max;
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
  twist: DailyTwistId; // the rule of the day
  seconds: number; // the clock: win before it runs out
}

export type DailyTwistId = 'clock' | 'fewTowers' | 'glass' | 'tough' | 'poor';

/** The rule of the day (one per day, on top of the clock). `extra` = seconds added to the clock for it. */
export const DAILY_TWISTS: Record<DailyTwistId, { name: string; desc: string; extra: number; trial?: TrialRules; run?: { hpMult?: number; lives?: number; gold?: number } }> = {
  clock: { name: 'Contra o relógio', desc: 'Só o relógio, mas sem folga', extra: 0 },
  fewTowers: { name: 'Poucas torres', desc: 'No máximo 5 torres', extra: 10, trial: { maxTowers: 5 } },
  glass: { name: 'Cristal rachado', desc: 'Só 8 vidas', extra: 5, run: { lives: 8 } },
  tough: { name: 'Monstros robustos', desc: 'Monstros com +20% de vida', extra: 10, run: { hpMult: 1.2 } },
  poor: { name: 'Bolso vazio', desc: 'Começa com 40 de ouro a menos', extra: 5, run: { gold: -40 } },
};

/** The clock of the daily (seconds), per Região 1 stage: ≈ 90% of the stage's natural length. */
export const DAILY_TIME: Partial<Record<CampaignStageId, number>> = { v1: 165, v2: 145, v3: 195, v4: 155, v5: 150 };

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
  const setup: DailySetup = {
    key,
    seed,
    stage: REGIONS[0]!.stages[next() % REGIONS[0]!.stages.length]!, // the daily stays in Região 1 (anyone can play it)
    hero: HERO_ORDER[next() % HERO_ORDER.length]!,
    boon: BOON_IDS[next() % BOON_IDS.length]!,
    twist: 'clock',
    seconds: 0,
  };
  const ids = Object.keys(DAILY_TWISTS) as DailyTwistId[];
  setup.twist = ids[next() % ids.length]!;
  setup.seconds = (DAILY_TIME[setup.stage] ?? 180) + DAILY_TWISTS[setup.twist].extra;
  return setup;
}

export const DAILY_SCORE = { perLife: 100, perReaction: 10, winBonus: 1000, perWaveOnLoss: 60, perSecondLeft: 15 };

export function dailyScore(s: SimState, limit?: number): number {
  const reactions = REACTION_IDS.reduce((sum, id) => sum + s.stats.reactions[id], 0);
  const base = reactions * DAILY_SCORE.perReaction;
  // Winning with time to spare is worth more.
  const left = limit ? Math.max(0, Math.floor(limit - s.time)) * DAILY_SCORE.perSecondLeft : 0;
  if (s.result === 'won') return DAILY_SCORE.winBonus + s.lives * DAILY_SCORE.perLife + base + left;
  return Math.max(0, s.wave - 1) * DAILY_SCORE.perWaveOnLoss + base;
}
