// Expedição de Éter: a short roguelike run. Three battles in a row; lives and Bênçãos carry over,
// monsters get tougher each leg, and before each battle the player picks 1 of 2 trails (a stage + a pact).
// All numbers live here.

import { Rng } from '../sim/rng';
import { ECONOMY } from './economy';
import type { HeroClass } from './heroes';
import type { SimModifiers } from './modifiers';
import type { CampaignStageId } from './stages';
import { TOWER_IDS, type TowerId } from './towers';

export const EXPEDITION = {
  legs: 3,
  /** Monster life per leg (the carried Bênçãos make the party stronger each battle). */
  hpMult: [1, 1.2, 1.45],
  /** Moedas paid when each leg is won. */
  coins: [40, 70, 140],
  /** Region 1 stages that can appear (the first two are too small to be fun here). */
  basePool: ['v3', 'v4', 'v5'] as CampaignStageId[],
};

export type PactId = 'calm' | 'horde' | 'purse' | 'vow' | 'greed';

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
}

export const PACTS: Record<PactId, PactDef> = {
  calm: { name: 'Trilha Tranquila', good: '+3 vidas ao chegar', bad: 'Sem risco, sem prêmio extra', color: 0x6ad44a, lives: 3 },
  horde: { name: 'Trilha da Horda', good: 'Começa com 1 Bênção extra', bad: 'Monstros com +25% de vida', color: 0xff5a4a, hpMult: 1.25, extraBoon: true },
  purse: { name: 'Trilha do Mercador', good: '+200 de ouro inicial', bad: 'Custa 4 vidas', color: 0xffd34d, gold: 200, lives: -4 },
  vow: { name: 'Trilha do Voto', good: 'Suas torres causam +35% de dano', bad: 'Só 3 tipos de torre', color: 0xb57bff, towerKinds: 3, towerDamage: 1.35 },
  greed: { name: 'Trilha do Tesouro', good: '+40% de ouro por abate', bad: 'Monstros com +15% de vida', color: 0xffa23a, goldMult: 1.4, hpMult: 1.15 },
};
export const PACT_IDS = Object.keys(PACTS) as PactId[];

export interface Route {
  stage: CampaignStageId;
  pact: PactId;
  towers?: TowerId[]; // Trilha do Voto: the kinds allowed
}

export interface ExpeditionRun {
  seed: number;
  leg: number; // 0-based; === EXPEDITION.legs when finished
  lives: number;
  boons: string[];
  hero: HeroClass;
  routes: Route[]; // the 2 trails offered for this leg
}

function pick<T>(rng: Rng, list: readonly T[], not?: T): T {
  const pool = list.length > 1 && not !== undefined ? list.filter((x) => x !== not) : list;
  return pool[rng.int(0, pool.length - 1)]!;
}

/** Three kinds of tower that can still make reactions (Vinha + Trovão alone cannot). */
function vowTowers(rng: Rng): TowerId[] {
  for (;;) {
    const left = [...TOWER_IDS];
    const out: TowerId[] = [];
    while (out.length < 3) out.push(left.splice(rng.int(0, left.length - 1), 1)[0]!);
    const dead = out.includes('archer') && out.includes('vine') && out.includes('storm');
    if (!dead) return TOWER_IDS.filter((t) => out.includes(t));
  }
}

/** The 2 trails of a leg: different pacts, different stages when the pool allows. Same seed → same trails. */
export function rollRoutes(seed: number, leg: number, pool: readonly CampaignStageId[]): Route[] {
  const rng = new Rng((seed + leg * 7919) >>> 0);
  const stages = pool.length > 0 ? pool : EXPEDITION.basePool;
  const s1 = pick(rng, stages);
  const s2 = pick(rng, stages, s1);
  const p1 = pick(rng, PACT_IDS);
  const p2 = pick(rng, PACT_IDS, p1);
  const routes: Route[] = [
    { stage: s1, pact: p1 },
    { stage: s2, pact: p2 },
  ];
  return routes.map((r) => (PACTS[r.pact].towerKinds ? { ...r, towers: vowTowers(rng) } : r));
}

export function newRun(seed: number, hero: HeroClass, pool: readonly CampaignStageId[]): ExpeditionRun {
  return { seed, leg: 0, lives: ECONOMY.startLives, boons: [], hero, routes: rollRoutes(seed, 0, pool) };
}

/** What the simulation needs to play one leg down one trail. */
export interface LegSetup {
  hpMult: number;
  gold: number;
  lives: number;
  boons: string[];
  extraBoon: boolean;
  modifiers: Partial<SimModifiers>;
}

export function legSetup(run: ExpeditionRun, route: Route, base: SimModifiers): LegSetup {
  const pact = PACTS[route.pact];
  const mods: Partial<SimModifiers> = {};
  if (pact.goldMult) mods.goldMult = base.goldMult * pact.goldMult;
  if (route.towers && pact.towerDamage) {
    const dmg = { ...base.towerDamageMult };
    for (const t of route.towers) dmg[t] *= pact.towerDamage;
    mods.unlockedTowers = route.towers;
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

/** After a won leg: lives and Bênçãos carry on, new trails are rolled. */
export function advanceRun(run: ExpeditionRun, lives: number, boons: string[], pool: readonly CampaignStageId[]): ExpeditionRun {
  const leg = run.leg + 1;
  return { ...run, leg, lives, boons: [...boons], routes: leg >= EXPEDITION.legs ? [] : rollRoutes(run.seed, leg, pool) };
}
