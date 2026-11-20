// Grimório (Fase 19): every Bênção is a card. The player owns a collection, builds a 9-card deck, and the
// in-match offers come only from that deck. Cards come from packs (bought with moedas — never with gems),
// from Pó de Éter (made from repeated cards) and from hard feats (the Lendárias).
// All numbers live here.

import { Rng } from '../sim/rng';
import { BOON_IDS, BOONS, RARITIES, type BoonDef, type BoonId, type BoonRarity } from './boons';

export const DECK = {
  size: 9,
  /** At most this many cards of each rarity in the deck (the rest are Comuns): strong decks stay balanced. */
  max: { common: 9, rare: 3, epic: 2, legendary: 1 } as Record<BoonRarity, number>,
};

/** Everyone starts with these 9 Comuns, already in the deck. */
export const STARTER: BoonId[] = ['fireMastery', 'iceMastery', 'natureMastery', 'boltMastery', 'eagleEye', 'longReach', 'treasure', 'heart', 'windMastery'];

export const PACK = {
  price: 100, // moedas per card (each card gets a reveal of its own)
  /** The big buy: this many cards at once. */
  bulk: 10,
  cards: 1,
  /** Chance of each card's rarity (shown to the player in "Ver chances"). */
  odds: { common: 0.62, rare: 0.28, epic: 0.09, legendary: 0.01 } as Record<BoonRarity, number>,
  /** At most this many packs in a row without an Épica or better (36 cards, as with the old 3-card packs). */
  pity: 36,
};

/** Pó de Éter: a repeated card turns into dust; dust makes the exact card you want (Lendárias: only feats/packs). */
export const DUST = {
  fromDuplicate: { common: 5, rare: 20, epic: 80, legendary: 300 } as Record<BoonRarity, number>,
  craft: { common: 40, rare: 160, epic: 640, legendary: 0 } as Record<BoonRarity, number>,
  /** Old Relíquias become dust when the Relicário closes (per level). */
  fromRelic: { common: 40, rare: 110, epic: 260, legendary: 520 } as Record<'common' | 'rare' | 'epic' | 'legendary', number>,
};

export function cardsOf(r: BoonRarity): BoonId[] {
  return BOON_IDS.filter((id) => (BOONS[id] as BoonDef).rarity === r);
}

export function craftCost(id: BoonId): number {
  return DUST.craft[(BOONS[id] as BoonDef).rarity];
}

/** Is this deck allowed? (size and rarity limits; every card owned and unique) */
export function deckProblem(deck: readonly BoonId[], owned: readonly BoonId[]): string | null {
  if (new Set(deck).size !== deck.length) return 'Carta repetida no baralho';
  if (deck.length > DECK.size) return `No máximo ${DECK.size} cartas`;
  if (deck.some((id) => !owned.includes(id))) return 'Carta que você não tem';
  for (const r of RARITIES) {
    const n = deck.filter((id) => (BOONS[id] as BoonDef).rarity === r).length;
    if (n > DECK.max[r]) return `No máximo ${DECK.max[r]} ${r === 'legendary' ? 'Lendária' : r === 'epic' ? 'Épicas' : 'Raras'}`;
  }
  return null;
}

export interface PackRoll {
  cards: BoonId[];
  seed: number; // next seed
  sinceEpic: number;
}

/** Open a pack: same seed → same cards (the roll is saved, so closing the game can't re-roll it). */
export function rollPack(seed: number, sinceEpic: number): PackRoll {
  const rng = new Rng(seed >>> 0);
  const cards: BoonId[] = [];
  let since = sinceEpic;
  for (let i = 0; i < PACK.cards; i++) {
    let rarity: BoonRarity = 'common';
    let roll = rng.next();
    for (const r of RARITIES) {
      roll -= PACK.odds[r];
      if (roll < 0) {
        rarity = r;
        break;
      }
    }
    // Pity: the last card of a long dry streak is at least Épica.
    if (i === PACK.cards - 1 && since >= PACK.pity - 1 && !cards.some((c) => high(c)) && (rarity === 'common' || rarity === 'rare')) rarity = 'epic';
    const pool = cardsOf(rarity);
    cards.push(pool[rng.int(0, pool.length - 1)]!);
  }
  since = cards.some(high) ? 0 : since + 1;
  return { cards, seed: (Math.imul(seed ^ 0x9e3779b9, 0x85ebca6b) + 1) >>> 0, sinceEpic: since };
}

function high(id: BoonId): boolean {
  const r = (BOONS[id] as BoonDef).rarity;
  return r === 'epic' || r === 'legendary';
}

// ───────────────────────── Feitos (Troféus) ─────────────────────────

export interface FeatState {
  riftBest: number;
  hunt: { bosses: number; best: number };
  expeditionBest: number;
  mutantWeekDone: boolean; // all 3 stages of a Semana Mutante won
}

export interface FeatDef {
  card: BoonId;
  text: string;
  done: (s: FeatState) => boolean;
}

/** Each Lendária has a feat that grants it (packs can also drop them at 1%). */
export const FEATS: FeatDef[] = [
  { card: 'phoenix', text: 'Chegue ao fim da Fenda Infinita (onda 40)', done: (s) => s.riftBest >= 40 },
  { card: 'timeCrown', text: 'Caçada com os 5 chefes em menos de 5:00', done: (s) => s.hunt.bosses >= 5 && s.hunt.best > 0 && s.hunt.best < 300 },
  { card: 'worldSeed', text: 'Complete 3 Expedições seguidas', done: (s) => s.expeditionBest >= 3 },
  { card: 'sunOfEter', text: 'Vença as 3 fases de uma Semana Mutante', done: (s) => s.mutantWeekDone },
];

export function featOf(id: BoonId): FeatDef | undefined {
  return FEATS.find((f) => f.card === id);
}
