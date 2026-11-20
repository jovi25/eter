// Bênçãos de Éter: during a match the player picks 1 of 3 boons every few waves; they stack.
// Since Fase 19 every Bênção is also a CARD of the Grimório (src/data/grimoire.ts): the offers come from the
// player's 9-card deck. All numbers live here.

import type { SimState } from '../sim/types';
import type { SimModifiers } from './modifiers';

export type BoonRarity = 'common' | 'rare' | 'epic' | 'legendary';

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
  /** Not in the classic pool (Desafio do dia, tests): only in the Grimório. */
  locked?: boolean;
  apply(ctx: BoonCtx): void;
}

/** A boon is offered when wave N finishes arriving, for N = 2, 5, 8, 11... */
export const BOON_RULES = { every: 3, offset: 2, choices: 3 };

/** Weights inside the deck: strong cards show up less often, so a deck full of them is not a sure thing. */
export const RARITY_WEIGHT: Record<BoonRarity, number> = { common: 6, rare: 3, epic: 1.2, legendary: 0.7 };

/**
 * Altar de Éter (Fenda Infinita only): trade piled-up gold for an extra Bênção.
 * Better odds than the free offers; each purchase costs more. Gold-for-gold boons are left out.
 */
export const ALTAR = {
  baseCost: 300,
  growth: 1.25,
  weights: { common: 3, rare: 3, epic: 2, legendary: 1 } as Record<BoonRarity, number>,
  exclude: ['treasure', 'bounty'] as string[],
};

/** "Trocar": re-roll the cards of an offer for gold (every mode). Price rises each use in the match. */
export const REROLL = { baseCost: 40, step: 40 };
export const RARITY_LABEL: Record<BoonRarity, string> = { common: 'Comum', rare: 'Rara', epic: 'Épica', legendary: 'Lendária' };
export const RARITY_COLOR: Record<BoonRarity, number> = { common: 0xb8b8c8, rare: 0x4aa3ff, epic: 0xb26bff, legendary: 0xffc93d };
export const RARITIES: BoonRarity[] = ['common', 'rare', 'epic', 'legendary'];

const FIRE = 0xff7a2e;
const ICE = 0x6fe6ff;
const NATURE = 0x6ad44a;
const BOLT = 0xffe95c;
const GOLD = 0xffd34d;
const ARCANE = 0xb57bff;
const WIND = 0x9ff0d0;

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
  windMastery: { name: 'Vento Cortante', desc: 'Vento: +30% de dano', rarity: 'common', color: WIND, locked: true,
    apply: ({ mods }) => { mods.elementDamageMult.wind *= 1.3; } },
  // ── Only in the Grimório ──
  tallVines: { name: 'Vinha Trepadeira', desc: 'A Vinha alcança inimigos voadores', rarity: 'common', color: NATURE, locked: true,
    apply: ({ mods }) => { mods.vineHitsFlying = true; } },
  heavyHand: { name: 'Mão Pesada', desc: 'Herói: +35% de dano', rarity: 'common', color: ARCANE, locked: true,
    apply: ({ mods }) => { mods.heroDamageMult *= 1.35; } },
  ironArrows: { name: 'Flechas de Ferro', desc: 'Físico ignora resistência e Arqueiros +15% de dano', rarity: 'rare', color: 0xe8d6b0, locked: true,
    apply: ({ mods }) => { mods.physicalIgnoresResist = true; mods.towerDamageMult.archer *= 1.15; } },
  deepRoots: { name: 'Raízes Eternas', desc: 'Enraizado dura +1 s', rarity: 'rare', color: NATURE, locked: true,
    apply: ({ mods }) => { mods.rootDurationBonus += 1; } },
  sharpMelt: { name: 'Derretimento Cortante', desc: 'DERRETIMENTO deixa Frágil e Fogo +10%', rarity: 'epic', color: 0xffb347, locked: true,
    apply: ({ mods }) => { mods.meltAppliesFragile = true; mods.elementDamageMult.fire *= 1.1; } },
  quickHands: { name: 'Mãos Ágeis', desc: 'Herói ataca 30% mais rápido', rarity: 'common', color: ARCANE, locked: true,
    apply: ({ mods }) => { mods.heroAttackSpeedMult *= 1.3; } },
  galeForce: { name: 'Rajada', desc: 'Vento: +40% de dano e todas as torres +5% de alcance', rarity: 'rare', color: WIND, locked: true,
    apply: ({ mods }) => { mods.elementDamageMult.wind *= 1.4; mods.rangeMult *= 1.05; } },
  goldPact: { name: 'Pacto de Ouro', desc: '+300 de ouro agora, mas −4 vidas', rarity: 'rare', color: GOLD, locked: true,
    apply: ({ addGold, state }) => { addGold(300); state.lives = Math.max(1, state.lives - 4); } },
  cyclone: { name: 'Olho do Ciclone', desc: 'Vento e Raio: +35% de dano', rarity: 'epic', color: WIND, locked: true,
    apply: ({ mods }) => { mods.elementDamageMult.wind *= 1.35; mods.elementDamageMult.lightning *= 1.35; } },
  goldRain: { name: 'Chuva de Ouro', desc: '+50% de ouro por abate', rarity: 'epic', color: GOLD, locked: true,
    apply: ({ mods }) => { mods.goldMult *= 1.5; } },
  // ── Lendárias: feitos difíceis (ou 1% num pacote). Uma por baralho. ──
  // ── Pacote de conteúdo 1 ──
  harvest: { name: 'Colheita', desc: 'Cada onda limpa: +4 de ouro por torre no mapa', rarity: 'common', color: GOLD, locked: true,
    apply: ({ mods }) => { mods.waveGoldPerTower += 4; } },
  trueShot: { name: 'Tiro Certeiro', desc: 'Torres de nível 3 ou evoluídas: +20% de dano', rarity: 'common', color: 0xe8d6b0, locked: true,
    apply: ({ mods }) => { mods.maxLevelDamageMult *= 1.2; } },
  livingWall: { name: 'Muralha Viva', desc: 'Herói: +60% de vida (agora e ao voltar)', rarity: 'common', color: 0x9ad06a, locked: true,
    apply: ({ state }) => { state.hero.maxHp = Math.round(state.hero.maxHp * 1.6); state.hero.hp = Math.min(state.hero.maxHp, Math.round(state.hero.hp * 1.6)); } },
  interest: { name: 'Juros de Éter', desc: 'Cada onda limpa: +10% do ouro guardado (até 50)', rarity: 'rare', color: GOLD, locked: true,
    apply: ({ mods }) => { mods.interestRate += 0.1; mods.interestCap += 50; } },
  emberBurst: { name: 'Faísca Final', desc: 'Inimigo que morre queimando explode em fogo', rarity: 'rare', color: FIRE, locked: true,
    apply: ({ mods }) => { mods.emberBurst += 45; } },
  stickyMud: { name: 'Lama Pegajosa', desc: 'Todos os monstros andam 10% mais devagar', rarity: 'rare', color: 0x9a7a4a, locked: true,
    apply: ({ mods }) => { mods.enemySpeedMult *= 0.9; } },
  secondChance: { name: 'Segunda Chance', desc: 'Na primeira vez que as vidas zerarem, o Cristal volta com 5', rarity: 'epic', color: 0xff8ab0, locked: true,
    apply: ({ mods }) => { mods.secondChance = Math.max(mods.secondChance, 5); } },
  bossHunter: { name: 'Caçador de Chefes', desc: 'Todo dano contra chefes: +50%', rarity: 'epic', color: 0xff5a3a, locked: true,
    apply: ({ mods }) => { mods.bossDamageMult *= 1.5; } },
  // ── Pacote de conteúdo 2 ──
  crystalShield: { name: 'Escudo do Cristal', desc: 'Cada onda limpa devolve 1 vida (até o máximo)', rarity: 'common', color: 0x8fd8ff, locked: true,
    apply: ({ mods }) => { mods.livesPerWave += 1; } },
  quickstart: { name: 'Largada Rápida', desc: 'Chamar uma onda antes da hora paga o dobro', rarity: 'common', color: GOLD, locked: true,
    apply: ({ mods }) => { mods.earlyCallMult *= 2; } },
  midas: { name: 'Toque de Midas', desc: 'Cada chefe derrotado: +150 de ouro', rarity: 'rare', color: GOLD, locked: true,
    apply: ({ mods }) => { mods.bossGoldBonus += 150; } },
  weatherWise: { name: 'Senhor do Clima', desc: 'O clima só ajuda: nenhum elemento perde força', rarity: 'rare', color: 0x8fb8ff, locked: true,
    apply: ({ mods }) => { mods.weatherNeverHurts = true; } },
  overcharge: { name: 'Sobrecarga', desc: 'Com combo 10 ou mais, torres causam +30% de dano', rarity: 'epic', color: 0xffe34d, locked: true,
    apply: ({ mods }) => { mods.overchargeAt = mods.overchargeAt > 0 ? Math.max(6, mods.overchargeAt - 2) : 10; mods.overchargeMult *= 1.3; } },
  frostNova: { name: 'Estilhaço Gélido', desc: 'Inimigo que morre congelado gela os vizinhos', rarity: 'epic', color: ICE, locked: true,
    apply: ({ mods }) => { mods.frostNova = true; } },
  sunOfEter: { name: 'Sol de Éter', desc: 'Todas as torres: +30% de dano e reações +30%', rarity: 'legendary', color: 0xffd34d, locked: true,
    apply: ({ mods }) => { for (const k of Object.keys(mods.towerDamageMult) as (keyof typeof mods.towerDamageMult)[]) mods.towerDamageMult[k] *= 1.3; mods.reactionDamageMult *= 1.3; } },
  phoenix: { name: 'Pena da Fênix', desc: '+10 vidas e Fogo +40% de dano', rarity: 'legendary', color: 0xff6a2a, locked: true,
    apply: ({ mods, state }) => { state.lives += 10; mods.elementDamageMult.fire *= 1.4; } },
  worldSeed: { name: 'Semente do Mundo', desc: 'Natureza +50%, Enraizado +1,5 s e a Vinha alcança voadores', rarity: 'legendary', color: 0x5ad46a, locked: true,
    apply: ({ mods }) => { mods.elementDamageMult.nature *= 1.5; mods.rootDurationBonus += 1.5; mods.vineHitsFlying = true; } },
  timeCrown: { name: 'Coroa do Tempo', desc: 'Combo dura +3 s, chega a +100% mais alto e reações +20%', rarity: 'legendary', color: 0xfff0a0, locked: true,
    apply: ({ mods }) => { mods.comboWindowBonus += 3; mods.comboMaxBonus += 1; mods.reactionDamageMult *= 1.2; } },
} satisfies Record<string, BoonDef>;

export type BoonId = keyof typeof BOONS;
export const BOON_IDS = Object.keys(BOONS) as BoonId[];
