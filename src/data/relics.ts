// Moedas (coins earned by playing) and the old Relíquias.
// The Relicário closed in Fase 19 (Grimório): Relíquias are no longer won or equipped — owned ones became Pó de Éter.
// RELICS stays because the simulation can still apply them (tests, and the save migration reads their rarity).

import type { SimState } from '../sim/types';
import type { SimModifiers } from './modifiers';

export type RelicRarity = 'common' | 'rare' | 'epic' | 'legendary';
export const RELIC_RARITIES: RelicRarity[] = ['common', 'rare', 'epic', 'legendary'];
export const RELIC_RARITY_LABEL: Record<RelicRarity, string> = { common: 'Comum', rare: 'Rara', epic: 'Épica', legendary: 'Lendária' };
export const RELIC_RARITY_COLOR: Record<RelicRarity, number> = { common: 0xb8b8c8, rare: 0x4aa3ff, epic: 0xb26bff, legendary: 0xffc93d };

export type RelicShape = 'amulet' | 'crown' | 'scroll' | 'stone' | 'shield' | 'hourglass' | 'pouch' | 'lens' | 'idol' | 'boots';

export interface RelicCtx {
  mods: SimModifiers;
  state: SimState;
  addGold(n: number): void;
  /** Queue a "pick 1 of 3" at the very start of the match (better odds when `rich`). */
  offerBoon(rich: boolean): void;
}

export interface RelicDef {
  name: string;
  rarity: RelicRarity;
  shape: RelicShape;
  color: number;
  /** Text for level 1..3 (UI). */
  desc(level: number): string;
  apply(ctx: RelicCtx, level: number): void;
}

const L = (level: number, a: number, b: number, c: number) => (level >= 3 ? c : level === 2 ? b : a);
const pct = (x: number) => `${Math.round(x * 100)}%`;
const allTowers = (mods: SimModifiers, mult: number) => {
  for (const k of Object.keys(mods.towerDamageMult) as (keyof SimModifiers['towerDamageMult'])[]) mods.towerDamageMult[k] *= mult;
};

export const MAX_RELIC_LEVEL = 3;
export const RELIC_SLOTS = 3;

export const RELICS = {
  // ── Comuns: pequenos empurrões sem custo ──
  merchantPurse: {
    name: 'Bolsa do Mercador', rarity: 'common', shape: 'pouch', color: 0xd9a441,
    desc: (l) => `Começa com +${L(l, 50, 75, 100)} de ouro`,
    apply: ({ addGold }, l) => addGold(L(l, 50, 75, 100)),
  },
  emberCharm: {
    name: 'Amuleto de Brasa', rarity: 'common', shape: 'amulet', color: 0xff7a2e,
    desc: (l) => `Fogo: +${pct(L(l, 0.1, 0.15, 0.2))} de dano`,
    apply: ({ mods }, l) => { mods.elementDamageMult.fire *= 1 + L(l, 0.1, 0.15, 0.2); },
  },
  frostCharm: {
    name: 'Amuleto de Geada', rarity: 'common', shape: 'amulet', color: 0x6fe6ff,
    desc: (l) => `Gelo: +${pct(L(l, 0.1, 0.15, 0.2))} de dano`,
    apply: ({ mods }, l) => { mods.elementDamageMult.ice *= 1 + L(l, 0.1, 0.15, 0.2); },
  },
  leafCharm: {
    name: 'Amuleto de Seiva', rarity: 'common', shape: 'amulet', color: 0x6ad44a,
    desc: (l) => `Natureza: +${pct(L(l, 0.1, 0.15, 0.2))} de dano`,
    apply: ({ mods }, l) => { mods.elementDamageMult.nature *= 1 + L(l, 0.1, 0.15, 0.2); },
  },
  sparkCharm: {
    name: 'Amuleto Faiscante', rarity: 'common', shape: 'amulet', color: 0xffe95c,
    desc: (l) => `Raio: +${pct(L(l, 0.1, 0.15, 0.2))} de dano`,
    apply: ({ mods }, l) => { mods.elementDamageMult.lightning *= 1 + L(l, 0.1, 0.15, 0.2); },
  },
  travelBoots: {
    name: 'Botas de Viagem', rarity: 'common', shape: 'boots', color: 0xa77b4f,
    desc: (l) => `Herói ataca ${pct(L(l, 0.12, 0.18, 0.25))} mais rápido`,
    apply: ({ mods }, l) => { mods.heroAttackSpeedMult *= 1 + L(l, 0.12, 0.18, 0.25); },
  },
  // ── Raras: mudam o começo da partida, às vezes com um preço ──
  ancientScroll: {
    name: 'Pergaminho Antigo', rarity: 'rare', shape: 'scroll', color: 0xe8d6b0,
    desc: (l) => (l >= 3 ? 'Começa a partida com 2 Bênçãos (cartas melhores)' : l === 2 ? 'Começa a partida com 1 Bênção (cartas melhores)' : 'Começa a partida com 1 Bênção'),
    apply: ({ offerBoon }, l) => { offerBoon(l >= 2); if (l >= 3) offerBoon(true); },
  },
  crystalLens: {
    name: 'Lente de Cristal', rarity: 'rare', shape: 'lens', color: 0x9fe8ff,
    desc: (l) => `Torres: +${pct(L(l, 0.18, 0.24, 0.3))} de dano, mas −10% de alcance`,
    apply: ({ mods }, l) => { allTowers(mods, 1 + L(l, 0.18, 0.24, 0.3)); mods.rangeMult *= 0.9; },
  },
  comboGlass: {
    name: 'Ampulheta do Combo', rarity: 'rare', shape: 'hourglass', color: 0xffe34d,
    desc: (l) => `Combo dura +${L(l, 1, 1.5, 2)} s e vai ${pct(L(l, 0.1, 0.2, 0.3))} mais alto`,
    apply: ({ mods }, l) => { mods.comboWindowBonus += L(l, 1, 1.5, 2); mods.comboMaxBonus += L(l, 0.1, 0.2, 0.3); },
  },
  oakShield: {
    name: 'Escudo de Carvalho', rarity: 'rare', shape: 'shield', color: 0x8a6a3f,
    desc: (l) => `+${L(l, 5, 7, 10)} vidas, mas começa com −40 de ouro`,
    apply: ({ state, addGold }, l) => { state.lives += L(l, 5, 7, 10); addGold(-40); },
  },
  // ── Épicas: escolhas fortes que pedem uma estratégia ──
  stormCrown: {
    name: 'Coroa da Tempestade', rarity: 'epic', shape: 'crown', color: 0xffe95c,
    desc: (l) => `Corrente de raio: +${L(l, 2, 3, 4)} saltos, mas Fogo −15%`,
    apply: ({ mods }, l) => { mods.chainBonus += L(l, 2, 3, 4); mods.elementDamageMult.fire *= 0.85; },
  },
  alchemistStone: {
    name: 'Pedra do Alquimista', rarity: 'epic', shape: 'stone', color: 0xff5a1f,
    desc: (l) => `Reações: +${pct(L(l, 0.3, 0.4, 0.5))} de dano, mas golpes comuns −10%`,
    apply: ({ mods }, l) => { mods.reactionDamageMult *= (1 + L(l, 0.3, 0.4, 0.5)) / 0.9; allTowers(mods, 0.9); },
  },
  // ── Lendárias ──
  riftHeart: {
    name: 'Coração da Fenda', rarity: 'legendary', shape: 'stone', color: 0xb57bff,
    desc: (l) => `Torres: +${pct(L(l, 0.15, 0.2, 0.25))} de dano e +10% de alcance`,
    apply: ({ mods }, l) => { allTowers(mods, 1 + L(l, 0.15, 0.2, 0.25)); mods.rangeMult *= 1.1; },
  },
  goldenIdol: {
    name: 'Ídolo Dourado', rarity: 'legendary', shape: 'idol', color: 0xffd34d,
    desc: (l) => `+${pct(L(l, 0.3, 0.4, 0.5))} de ouro por abate, mas melhorias custam 15% mais`,
    apply: ({ mods }, l) => { mods.goldMult *= 1 + L(l, 0.3, 0.4, 0.5); mods.upgradeCostMult *= 1.15; },
  },
} satisfies Record<string, RelicDef>;

export type RelicId = keyof typeof RELICS;
export const RELIC_IDS = Object.keys(RELICS) as RelicId[];


// ───────────────────────────── coins ─────────────────────────────

/** All coin numbers. A pack of the Grimório costs ~2–3 matches. */
export const COINS = {
  win: 30,
  loss: 10,
  perStar: 10,
  firstWinBonus: 60, // first time a stage is beaten
  perChallenge: 40, // each challenge completed for the first time
  riftPerWave: 5,
  riftMilestone: 40, // every 10 waves reached
  riftClear: 150, // all 40 waves
  dailyFirstPlay: 50, // first daily challenge of the day
};

export interface MatchCoinInput {
  mode: 'stage' | 'rift' | 'daily';
  won: boolean;
  stars: number;
  firstWin: boolean;
  newChallenges: number;
  riftWave: number;
  firstDailyToday: boolean;
}

export function matchCoins(m: MatchCoinInput): number {
  if (m.mode === 'rift') return m.riftWave * COINS.riftPerWave + Math.floor(m.riftWave / 10) * COINS.riftMilestone + (m.won ? COINS.riftClear : 0);
  let c = m.won ? COINS.win + m.stars * COINS.perStar : COINS.loss;
  if (m.mode === 'daily') return c + (m.firstDailyToday ? COINS.dailyFirstPlay : 0);
  if (m.firstWin) c += COINS.firstWinBonus;
  return c + m.newChallenges * COINS.perChallenge;
}
