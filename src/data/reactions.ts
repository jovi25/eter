import type { Element } from './elements';

export type ReactionId = 'wildfire' | 'melt' | 'thornfrost' | 'shatter' | 'overload' | 'superconduct';
export const REACTION_IDS: ReactionId[] = ['wildfire', 'melt', 'thornfrost', 'shatter', 'overload', 'superconduct'];

/** Auras that reactions can consume. 'chilled' and 'frozen' are both "cold". */
export type AuraKey = 'burning' | 'chilled' | 'frozen' | 'rooted';

export interface ReactionDef {
  name: string; // shown on screen
  color: number;
  damageMult: number; // multiplier on the triggering hit
  spreadRadius?: number; // wildfire: burning spreads to enemies within this radius
  spreadBurnDps?: number; // wildfire: dps of the spread burn
  rootDurationMult?: number; // thornfrost: root duration × this (ignores root immunity)
  appliesFragile?: boolean;
  splashRadius?: number; // overload: explosion hits neighbours
  splashFactor?: number; // share of the hit dealt to neighbours
  fragileRadius?: number; // superconduct: Frágil also spreads to neighbours
}

export const REACTIONS: Record<ReactionId, ReactionDef> = {
  wildfire: { name: 'INCÊNDIO', color: 0xff5a1f, damageMult: 2, spreadRadius: 60, spreadBurnDps: 8 },
  melt: { name: 'DERRETIMENTO', color: 0xffb347, damageMult: 1.75 },
  thornfrost: { name: 'GEADA ESPINHOSA', color: 0x7fffd4, damageMult: 1, rootDurationMult: 2, appliesFragile: true },
  shatter: { name: 'ESTILHAÇO', color: 0xd8f6ff, damageMult: 1.5 },
  overload: { name: 'SOBRECARGA', color: 0xffe95c, damageMult: 1.5, splashRadius: 75, splashFactor: 0.6 },
  superconduct: { name: 'SUPERCONDUÇÃO', color: 0x9fd8ff, damageMult: 1.25, appliesFragile: true, fragileRadius: 75 },
};

/**
 * Aura on the enemy + element of the hit → reaction.
 * Checked top to bottom; the first match wins (matters only if an enemy carries two auras).
 */
export const REACTION_TABLE: ReadonlyArray<{ aura: AuraKey; trigger: Element; reaction: ReactionId }> = [
  { aura: 'frozen', trigger: 'physical', reaction: 'shatter' },
  { aura: 'frozen', trigger: 'lightning', reaction: 'shatter' },
  { aura: 'frozen', trigger: 'fire', reaction: 'melt' },
  { aura: 'chilled', trigger: 'fire', reaction: 'melt' },
  { aura: 'burning', trigger: 'ice', reaction: 'melt' },
  { aura: 'burning', trigger: 'lightning', reaction: 'overload' },
  { aura: 'chilled', trigger: 'lightning', reaction: 'superconduct' },
  { aura: 'burning', trigger: 'nature', reaction: 'wildfire' },
  { aura: 'rooted', trigger: 'fire', reaction: 'wildfire' },
  { aura: 'frozen', trigger: 'nature', reaction: 'thornfrost' },
  { aura: 'chilled', trigger: 'nature', reaction: 'thornfrost' },
  { aura: 'rooted', trigger: 'ice', reaction: 'thornfrost' },
];

export const COMBO = {
  window: 2, // seconds between reactions to keep the chain
  perReaction: 0.05, // +5% reaction damage per chained reaction
  maxMult: 1.5,
};
