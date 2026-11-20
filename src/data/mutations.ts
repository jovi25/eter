// Semana Mutante (Fase 18): every week one crazy rule, the same for everyone (it comes from the date).
// It is played on 3 stages the player has already won; each win of the week pays moedas.
// All numbers live here.

import { Rng } from '../sim/rng';
import type { SimModifiers } from './modifiers';
import type { CampaignStageId } from './stages';

export type MutationId = 'giants' | 'sale' | 'wildsky' | 'alchemy' | 'swarm' | 'haste' | 'glass' | 'goldrush' | 'blitz';

export interface MutationDef {
  name: string;
  desc: string; // UI, one line
  color: number;
  icon: string; // emoji on the card
  apply: (m: SimModifiers) => void;
}

export const MUTATIONS: Record<MutationId, MutationDef> = {
  giants: {
    name: 'Gigantes', desc: 'Monstros enormes: quase o dobro de vida, mas bem mais lentos', color: 0xd9903a, icon: '🦣',
    apply: (m) => {
      m.enemyHpMult *= 1.9;
      m.enemySpeedMult *= 0.62;
      m.enemyScale = 1.35;
    },
  },
  sale: {
    name: 'Liquidação', desc: 'Torres e melhorias custam metade, mas nada pode ser vendido', color: 0xffd34d, icon: '🏷️',
    apply: (m) => {
      m.towerCostMult *= 0.5;
      m.noSell = true;
    },
  },
  wildsky: {
    name: 'Céu Louco', desc: 'O clima muda a cada onda: chuva, ventania ou eclipse', color: 0x8a5fd0, icon: '🌪️',
    apply: (m) => {
      m.wildWeather = true;
    },
  },
  alchemy: {
    name: 'Alquimia Pura', desc: 'Golpes comuns causam só 25% do dano; reações causam o triplo', color: 0xb57bff, icon: '⚗️',
    apply: (m) => {
      m.plainHitMult *= 0.25;
      m.reactionDamageMult *= 3;
    },
  },
  swarm: {
    name: 'Enxame', desc: 'O dobro de monstros, cada um com metade da vida e do ouro', color: 0x6ad44a, icon: '🐝',
    apply: (m) => {
      m.enemyCountMult *= 2;
      m.enemyHpMult *= 0.55;
      m.goldMult *= 0.55;
    },
  },
  glass: {
    name: 'Cristal de Vidro', desc: 'Só 5 vidas, mas +60% de ouro por abate', color: 0xbfe8ff, icon: '💎',
    apply: (m) => {
      m.startLives = 5;
      m.goldMult *= 1.6;
    },
  },
  goldrush: {
    name: 'Corrida do Ouro', desc: 'Abates dão o dobro de ouro, mas tudo custa 50% mais', color: 0xffc93d, icon: '💰',
    apply: (m) => {
      m.goldMult *= 2;
      m.towerCostMult *= 1.5;
    },
  },
  blitz: {
    name: 'Blitz', desc: 'Pausas entre ondas pela metade, e chamar cedo paga o dobro', color: 0xff6a4a, icon: '⏩',
    apply: (m) => {
      m.waveGapMult *= 0.5;
      m.earlyCallMult *= 2;
    },
  },
  haste: {
    name: 'Pressa', desc: 'Monstros 35% mais rápidos, mas as torres também atiram 35% mais rápido', color: 0x6fe6ff, icon: '⚡',
    apply: (m) => {
      m.enemySpeedMult *= 1.35;
      m.towerRateMult *= 1.35;
    },
  },
};

/** Fixed rotation (never the same rule two weeks in a row). */
export const MUTATION_ORDER: MutationId[] = ['giants', 'sale', 'wildsky', 'alchemy', 'swarm', 'haste', 'glass', 'goldrush', 'blitz'];

export const MUTANT = {
  stages: 3, // stages of the week
  coinsPerWin: 50, // first win of each stage of the week
  allBonus: 100, // all three won
};

/** Week number (weeks start on Monday, local date). */
export function weekIndex(d: Date): number {
  const days = Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
  return Math.floor((days + 3) / 7); // 1970-01-01 was a Thursday
}

/** The rule weeks used before the Pacote de conteúdo 2 (kept so that week's rule did not change midway). */
const FIRST_SIX = MUTATION_ORDER.slice(0, 6);
/** First week with the 9 rules. */
export const NINE_RULES_FROM = 2969;

export function weekMutation(week: number): MutationId {
  const order = week < NINE_RULES_FROM ? FIRST_SIX : MUTATION_ORDER;
  const n = order.length;
  return order[((week % n) + n) % n]!;
}

/** Days until the rule changes (1 = it changes tomorrow). */
export function daysLeft(d: Date): number {
  return 7 - ((d.getDay() + 6) % 7);
}

/** The week's stages: picked from the ones already won, spread over the regions, in campaign order. */
export function weekStages(week: number, won: readonly CampaignStageId[], order: readonly CampaignStageId[]): CampaignStageId[] {
  const rng = new Rng((Math.imul(week, 2654435761) ^ 0x6d2b79f5) >>> 0);
  const pool = [...won];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [pool[i], pool[j]] = [pool[j]!, pool[i]!];
  }
  // Prefer different regions (first letter of the id) before repeating one.
  const out: CampaignStageId[] = [];
  for (const id of pool) if (out.length < MUTANT.stages && !out.some((o) => o[0] === id[0])) out.push(id);
  for (const id of pool) if (out.length < MUTANT.stages && !out.includes(id)) out.push(id);
  return out.sort((a, b) => order.indexOf(a) - order.indexOf(b));
}
