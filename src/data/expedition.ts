// Expedição de Éter: a short roguelike run along a trail of 5 stops:
// battle → rest stop → battle → rest stop → final boss. Lives and Bênçãos carry over, monsters get tougher,
// and at every stop the player picks 1 of 2 ways (a stage + a pact, or a camp / merchant / shrine).
// All numbers live here.

import { Rng } from '../sim/rng';
import { BOON_IDS, BOONS, type BoonDef, type BoonId, type BoonRarity } from './boons';
import { ECONOMY } from './economy';
import type { HeroClass } from './heroes';
import type { SimModifiers } from './modifiers';
import type { CampaignStageId } from './stages';
import { CLASSIC_TOWERS, type TowerId } from './towers';

export type StepKind = 'battle' | 'rest' | 'boss';

export const EXPEDITION = {
  /** What each stop of the trail is. */
  steps: ['battle', 'rest', 'battle', 'rest', 'boss'] as StepKind[],
  legs: 5,
  /** Monster life per stop (the carried Bênçãos make the party stronger each battle). */
  hpMult: [1, 1, 1.2, 1.2, 1.45],
  /** Moedas paid when the battle of each stop is won. */
  coins: [40, 0, 70, 0, 160],
  /** Region 1 stages that can appear (the first two are too small to be fun here). */
  basePool: ['v3', 'v4', 'v5'] as CampaignStageId[],
  /** Stages with a boss: one of the open ones closes the expedition. */
  bossPool: ['v5', 'a3', 'a5', 'c5', 'i5'] as CampaignStageId[],
  /** Acampamento: lives back (never above the maximum). */
  camp: { lives: 5 },
  /** Mercador: 1 of these Bênçãos for moedas (or walk past for free). */
  merchant: { choices: 3, cost: 40, weights: { common: 5, rare: 3, epic: 0, legendary: 0 } as Record<BoonRarity, number> },
  /** Santuário: 1 strong Bênção for an offering of lives (or walk past). */
  shrine: { choices: 2, lives: 3, weights: { common: 0, rare: 3, epic: 2, legendary: 1 } as Record<BoonRarity, number> },
};

export type PactId = 'calm' | 'horde' | 'purse' | 'vow' | 'greed' | 'arcane' | 'skies' | 'final';

export interface PactDef {
  name: string;
  good: string;
  bad: string;
  color: number;
  hpMult?: number;
  gold?: number; // extra starting gold
  lives?: number; // added (or taken) when the battle starts
  goldMult?: number;
  extraBoon?: boolean; // one Bênção to pick before wave 1
  towerKinds?: number; // only this many kinds of tower can be built...
  towerDamage?: number; // ...and they hit this much harder
  reactionMult?: number; // reaction damage
  enemySpeed?: number; // monster speed
  wildWeather?: boolean; // a random weather every wave
}

export const PACTS: Record<PactId, PactDef> = {
  calm: { name: 'Trilha Tranquila', good: '+3 vidas ao chegar', bad: 'Sem risco, sem prêmio extra', color: 0x6ad44a, lives: 3 },
  horde: { name: 'Trilha da Horda', good: 'Começa com 1 Bênção extra', bad: 'Monstros com +25% de vida', color: 0xff5a4a, hpMult: 1.25, extraBoon: true },
  purse: { name: 'Trilha do Mercador', good: '+200 de ouro inicial', bad: 'Custa 4 vidas', color: 0xffd34d, gold: 200, lives: -4 },
  vow: { name: 'Trilha do Voto', good: 'Suas torres causam +35% de dano', bad: 'Só 3 tipos de torre', color: 0xb57bff, towerKinds: 3, towerDamage: 1.35 },
  arcane: { name: 'Trilha Arcana', good: 'Reações causam +40% de dano', bad: 'Monstros 12% mais rápidos', color: 0xc77bff, reactionMult: 1.4, enemySpeed: 1.12 },
  skies: { name: 'Trilha dos Céus', good: '+30% de ouro por abate', bad: 'O clima muda a cada onda', color: 0x8fb8ff, goldMult: 1.3, wildWeather: true },
  greed: { name: 'Trilha do Tesouro', good: '+40% de ouro por abate', bad: 'Monstros com +15% de vida', color: 0xffa23a, goldMult: 1.4, hpMult: 1.15 },
  // The last stop: no pact, just the boss.
  final: { name: 'Chefe final', good: 'Vença para completar a expedição', bad: 'Os monstros mais fortes da trilha', color: 0xff4d9a },
};
/** Pacts that can be rolled for an ordinary battle. */
export const PACT_IDS: PactId[] = ['calm', 'horde', 'purse', 'vow', 'greed', 'arcane', 'skies'];

export type RestKind = 'camp' | 'merchant' | 'shrine';
export const REST_KINDS: RestKind[] = ['camp', 'merchant', 'shrine'];
export const REST_INFO: Record<RestKind, { name: string; desc: string; color: number }> = {
  camp: { name: 'Acampamento', desc: `Descanse: +${EXPEDITION.camp.lives} vidas`, color: 0x6ad44a },
  merchant: { name: 'Mercador', desc: `Uma Bênção por ${EXPEDITION.merchant.cost} moedas`, color: 0xffd34d },
  shrine: { name: 'Santuário', desc: `Uma Bênção forte por ${EXPEDITION.shrine.lives} vidas`, color: 0xb57bff },
};

export interface BattleNode {
  kind: 'battle';
  stage: CampaignStageId;
  pact: PactId;
  towers?: TowerId[]; // Trilha do Voto: the kinds allowed
}
export type RestNode = { kind: 'camp' } | { kind: 'merchant'; boons: BoonId[] } | { kind: 'shrine'; boons: BoonId[] };
export type TrailNode = BattleNode | RestNode;

export interface ExpeditionRun {
  seed: number;
  leg: number; // 0-based stop; === EXPEDITION.legs when finished
  lives: number;
  boons: string[];
  hero: HeroClass;
  nodes: TrailNode[]; // the ways offered at this stop
}

/** What the player has open: decides which stages, bosses and Bênçãos can appear. */
export interface TrailCtx {
  pool: readonly CampaignStageId[];
  bosses?: readonly CampaignStageId[];
  /** The player's Grimório deck: the Bênçãos sold on the trail come from it. */
  deck?: readonly string[];
}

function pick<T>(rng: Rng, list: readonly T[], not?: T): T {
  const pool = list.length > 1 && not !== undefined ? list.filter((x) => x !== not) : list;
  return pool[rng.int(0, pool.length - 1)]!;
}

/** Three kinds of tower that can still make reactions (Vinha + Trovão alone cannot). */
function vowTowers(rng: Rng): TowerId[] {
  for (;;) {
    const left = [...CLASSIC_TOWERS];
    const out: TowerId[] = [];
    while (out.length < 3) out.push(left.splice(rng.int(0, left.length - 1), 1)[0]!);
    const dead = out.includes('archer') && out.includes('vine') && out.includes('storm');
    if (!dead) return CLASSIC_TOWERS.filter((t) => out.includes(t));
  }
}

/** Different Bênçãos, weighted by rarity; locked ones only if a Relicário revealed them. */
function rollBoons(rng: Rng, n: number, weights: Record<BoonRarity, number>, deck: readonly string[]): BoonId[] {
  // From the deck when there is one (falls back to the classic Bênçãos if the deck has nothing of these rarities).
  const pick = (fromDeck: boolean) => BOON_IDS.filter((id) => {
    const b = BOONS[id] as BoonDef;
    return weights[b.rarity] > 0 && (fromDeck ? deck.includes(id) : !b.locked);
  });
  let pool = deck.length ? pick(true) : pick(false);
  if (pool.length === 0) pool = pick(false);
  const out: BoonId[] = [];
  while (out.length < n && pool.length > 0) {
    const total = pool.reduce((sum, id) => sum + weights[(BOONS[id] as BoonDef).rarity], 0);
    let roll = rng.next() * total;
    let at = 0;
    for (; at < pool.length - 1; at++) {
      roll -= weights[(BOONS[pool[at]!] as BoonDef).rarity];
      if (roll <= 0) break;
    }
    out.push(pool.splice(at, 1)[0]!);
  }
  return out;
}

/** The ways offered at a stop. Same seed → same trail. */
export function rollNodes(seed: number, leg: number, ctx: TrailCtx): TrailNode[] {
  const rng = new Rng((seed + leg * 7919) >>> 0);
  const kind = EXPEDITION.steps[leg];
  const stages = ctx.pool.length > 0 ? ctx.pool : EXPEDITION.basePool;
  if (kind === 'boss') {
    const bosses = ctx.bosses && ctx.bosses.length > 0 ? ctx.bosses : [EXPEDITION.bossPool[0]!];
    return [{ kind: 'battle', stage: pick(rng, bosses), pact: 'final' }];
  }
  if (kind === 'rest') {
    const a = pick(rng, REST_KINDS);
    const b = pick(rng, REST_KINDS, a);
    const unlocked = ctx.deck ?? [];
    return [a, b].map((k): RestNode => {
      if (k === 'merchant') return { kind: k, boons: rollBoons(rng, EXPEDITION.merchant.choices, EXPEDITION.merchant.weights, unlocked) };
      if (k === 'shrine') return { kind: k, boons: rollBoons(rng, EXPEDITION.shrine.choices, EXPEDITION.shrine.weights, unlocked) };
      return { kind: 'camp' };
    });
  }
  const s1 = pick(rng, stages);
  const s2 = pick(rng, stages, s1);
  const p1 = pick(rng, PACT_IDS);
  const p2 = pick(rng, PACT_IDS, p1);
  const nodes: BattleNode[] = [
    { kind: 'battle', stage: s1, pact: p1 },
    { kind: 'battle', stage: s2, pact: p2 },
  ];
  return nodes.map((r) => (PACTS[r.pact].towerKinds ? { ...r, towers: vowTowers(rng) } : r));
}

export function newRun(seed: number, hero: HeroClass, ctx: TrailCtx): ExpeditionRun {
  return { seed, leg: 0, lives: ECONOMY.startLives, boons: [], hero, nodes: rollNodes(seed, 0, ctx) };
}

/** What the simulation needs to play the battle of a stop. */
export interface LegSetup {
  hpMult: number;
  gold: number;
  lives: number;
  boons: string[];
  extraBoon: boolean;
  modifiers: Partial<SimModifiers>;
}

export function legSetup(run: ExpeditionRun, node: BattleNode, base: SimModifiers): LegSetup {
  const pact = PACTS[node.pact];
  const mods: Partial<SimModifiers> = {};
  if (pact.goldMult) mods.goldMult = base.goldMult * pact.goldMult;
  if (pact.reactionMult) mods.reactionDamageMult = base.reactionDamageMult * pact.reactionMult;
  if (pact.enemySpeed) mods.enemySpeedMult = base.enemySpeedMult * pact.enemySpeed;
  if (pact.wildWeather) mods.wildWeather = true;
  if (node.towers && pact.towerDamage) {
    const dmg = { ...base.towerDamageMult };
    for (const t of node.towers) dmg[t] *= pact.towerDamage;
    mods.unlockedTowers = node.towers;
    mods.towerDamageMult = dmg;
  }
  return {
    hpMult: (EXPEDITION.hpMult[run.leg] ?? EXPEDITION.hpMult.at(-1)!) * (pact.hpMult ?? 1),
    gold: pact.gold ?? 0,
    lives: Math.max(1, Math.min(ECONOMY.startLives, run.lives + (pact.lives ?? 0))),
    boons: run.boons,
    extraBoon: !!pact.extraBoon,
    modifiers: mods,
  };
}

function next(run: ExpeditionRun, lives: number, boons: string[], ctx: TrailCtx): ExpeditionRun {
  const leg = run.leg + 1;
  return { ...run, leg, lives, boons, nodes: leg >= EXPEDITION.legs ? [] : rollNodes(run.seed, leg, ctx) };
}

/** After a won battle: lives and Bênçãos carry on, the next stop is rolled. */
export function advanceRun(run: ExpeditionRun, lives: number, boons: string[], ctx: TrailCtx): ExpeditionRun {
  return next(run, lives, [...boons], ctx);
}

/** Can this rest stop's offer be taken? (`choice` = which Bênção; -1 = walk past.) */
export function canVisit(run: ExpeditionRun, node: RestNode, choice: number, coins: number): boolean {
  if (node.kind === 'camp' || choice < 0) return true;
  if (!node.boons[choice]) return false;
  return node.kind === 'merchant' ? coins >= EXPEDITION.merchant.cost : run.lives > EXPEDITION.shrine.lives;
}

/**
 * Use a rest stop and move on. Returns the new run and the moedas spent.
 * Camp: lives back. Merchant: a Bênção for moedas. Shrine: a strong Bênção for lives. choice -1 = walk past.
 */
export function visitRest(run: ExpeditionRun, index: number, choice: number, coins: number, ctx: TrailCtx): { run: ExpeditionRun; spent: number } | null {
  const node = run.nodes[index];
  if (!node || node.kind === 'battle' || !canVisit(run, node, choice, coins)) return null;
  if (node.kind === 'camp') return { run: next(run, Math.min(ECONOMY.startLives, run.lives + EXPEDITION.camp.lives), run.boons, ctx), spent: 0 };
  if (choice < 0) return { run: next(run, run.lives, run.boons, ctx), spent: 0 };
  const boons = [...run.boons, node.boons[choice]!];
  if (node.kind === 'merchant') return { run: next(run, run.lives, boons, ctx), spent: EXPEDITION.merchant.cost };
  return { run: next(run, run.lives - EXPEDITION.shrine.lives, boons, ctx), spent: 0 };
}
