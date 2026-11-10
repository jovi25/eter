// Bênçãos de Éter: during a match the player picks 1 of 3 random boons every few waves.
// They stack, so every run builds a different "deck" of powers. All numbers live here.

import type { SimState } from '../sim/types';
import type { SimModifiers } from './modifiers';

export type BoonRarity = 'common' | 'rare' | 'epic';

export interface BoonCtx {
  mods: SimModifiers;
  state: SimState;
  addGold(amount: number): void;
}

export interface BoonDef {
  name: string;
  desc: string;
  rarity: BoonRarity;
  color: number;
  apply(ctx: BoonCtx): void;
}

/** A boon is offered when wave N finishes arriving, for N = 2, 5, 8, 11... */
export const BOON_RULES = { every: 3, offset: 2, choices: 3 };

export const RARITY_WEIGHT: Record<BoonRarity, number> = { common: 6, rare: 3, epic: 1 };
export const RARITY_LABEL: Record<BoonRarity, string> = { common: 'Comum', rare: 'Rara', epic: 'Épica' };
export const RARITY_COLOR: Record<BoonRarity, number> = { common: 0xb8b8c8, rare: 0x4aa3ff, epic: 0xb26bff };

const FIRE = 0xff7a2e;
const ICE = 0x6fe6ff;
const NATURE = 0x6ad44a;
const BOLT = 0xffe95c;
const GOLD = 0xffd34d;
const ARCANE = 0xb57bff;

export const BOONS = {
  fireMastery: { name: 'Brasas Vivas', desc: 'Fogo: +25% de dano e Queimando dói 40% mais', rarity: 'common', color: FIRE,
    apply: ({ mods }) => { mods.elementDamageMult.fire *= 1.25; mods.burnDpsMult *= 1.4; } },
  iceMastery: { name: 'Inverno Longo', desc: 'Gelo: +30% de dano', rarity: 'common', color: ICE,
    apply: ({ mods }) => { mods.elementDamageMult.ice *= 1.3; } },
  natureMastery: { name: 'Seiva Antiga', desc: 'Natureza: +25% de dano e Enraizado dura +0,5 s', rarity: 'common', color: NATURE,
    apply: ({ mods }) => { mods.elementDamageMult.nature *= 1.25; mods.rootDurationBonus += 0.5; } },
  boltMastery: { name: 'Céu Carregado', desc: 'Raio: +25% de dano e +1 salto na corrente', rarity: 'common', color: BOLT,
    apply: ({ mods }) => { mods.elementDamageMult.lightning *= 1.25; mods.chainBonus += 1; } },
  eagleEye: { name: 'Olho de Águia', desc: 'Arqueiros: +40% de dano', rarity: 'common', color: 0xe8d6b0,
    apply: ({ mods }) => { mods.towerDamageMult.archer *= 1.4; } },
  longReach: { name: 'Lentes de Éter', desc: 'Todas as torres: +12% de alcance', rarity: 'common', color: ARCANE,
    apply: ({ mods }) => { mods.rangeMult *= 1.12; } },
  treasure: { name: 'Baú Esquecido', desc: '+150 de ouro agora', rarity: 'common', color: GOLD,
    apply: ({ addGold }) => { addGold(150); } },
  heart: { name: 'Coração de Éter', desc: '+4 vidas', rarity: 'common', color: 0xff4d5e,
    apply: ({ state }) => { state.lives += 4; } },
  bounty: { name: 'Caçador de Recompensas', desc: '+30% de ouro por abate', rarity: 'rare', color: GOLD,
    apply: ({ mods }) => { mods.goldMult *= 1.3; } },
  bargain: { name: 'Mestre de Obras', desc: 'Melhorias de torre custam 25% menos', rarity: 'rare', color: 0x9a95b2,
    apply: ({ mods }) => { mods.upgradeCostMult *= 0.75; } },
  catalyst: { name: 'Catalisador Instável', desc: 'Reações causam +35% de dano', rarity: 'rare', color: 0xff5a1f,
    apply: ({ mods }) => { mods.reactionDamageMult *= 1.35; } },
  eternalCombo: { name: 'Combo Eterno', desc: 'Combo dura +2 s e pode chegar a +50% mais alto', rarity: 'rare', color: 0xffe34d,
    apply: ({ mods }) => { mods.comboWindowBonus += 2; mods.comboMaxBonus += 0.5; } },
  heroFury: { name: 'Fúria do Guardião', desc: 'Herói: +50% de dano e ataca 25% mais rápido', rarity: 'rare', color: ARCANE,
    apply: ({ mods }) => { mods.heroDamageMult *= 1.5; mods.heroAttackSpeedMult *= 1.25; } },
  echo: { name: 'Eco Arcano', desc: 'A habilidade do herói recarrega 30% mais rápido', rarity: 'rare', color: ARCANE,
    apply: ({ state }) => { state.hero.catalyzeMax *= 0.7; state.hero.catalyzeCooldown *= 0.7; } },
  absoluteZero: { name: 'Zero Absoluto', desc: 'Inimigos congelam com 1 acúmulo de Resfriado a menos', rarity: 'epic', color: ICE,
    apply: ({ mods }) => { mods.chillMaxStacks = Math.max(1, mods.chillMaxStacks - 1); } },
  stormHeart: { name: 'Coração da Tempestade', desc: 'Corrente de raio: +3 saltos', rarity: 'epic', color: BOLT,
    apply: ({ mods }) => { mods.chainBonus += 3; } },
  overdrive: { name: 'Sobremarcha', desc: 'Todas as torres: +20% de dano', rarity: 'epic', color: 0xffffff,
    apply: ({ mods }) => { for (const k of Object.keys(mods.towerDamageMult) as (keyof typeof mods.towerDamageMult)[]) mods.towerDamageMult[k] *= 1.2; } },
} satisfies Record<string, BoonDef>;

export type BoonId = keyof typeof BOONS;
export const BOON_IDS = Object.keys(BOONS) as BoonId[];
