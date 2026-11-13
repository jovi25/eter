// Fase 9b — Torres de fusão.
// Two level-3 towers of elements that react with each other, close enough, fuse into one: it stays in the
// first tower's slot and frees the other. Every shot hits twice: the first hit leaves the aura, the second
// sets off the reaction on the same enemy. Costs gold, can't evolve, can still be reinforced.

import type { Element } from './elements';
import type { ReactionId } from './reactions';
import type { TowerId } from './towers';

export type FusionId = 'steam' | 'blaze' | 'forge' | 'frostGarden' | 'polar';

export interface FusionDef {
  name: string;
  towers: [TowerId, TowerId];
  first: Element; // leaves the aura
  second: Element; // sets off the reaction
  reaction: ReactionId;
  color: number;
  desc: string;
  firstDamage: number;
  secondDamage: number;
  rate: number;
  range: number;
  burnDps?: number; // when the first hit is fire
  chillStacks?: number; // when the first hit is ice
}

export const FUSION = {
  cost: 150,
  maxDist: 280, // between the two towers
  projectileSpeed: 650,
};

export const FUSIONS: Record<FusionId, FusionDef> = {
  steam: { name: 'Gêiser de Vapor', towers: ['brazier', 'frost'], first: 'fire', second: 'ice', reaction: 'melt', color: 0xffc27a, desc: 'Queima e congela no mesmo alvo: DERRETIMENTO a cada disparo', firstDamage: 20, secondDamage: 34, rate: 1.0, range: 185, burnDps: 12 },
  blaze: { name: 'Coração da Queimada', towers: ['brazier', 'vine'], first: 'fire', second: 'nature', reaction: 'wildfire', color: 0xff6a2a, desc: 'Fogo e espinhos: INCÊNDIO que espalha chamas', firstDamage: 20, secondDamage: 30, rate: 0.95, range: 185, burnDps: 12 },
  forge: { name: 'Fornalha Elétrica', towers: ['brazier', 'storm'], first: 'fire', second: 'lightning', reaction: 'overload', color: 0xffe95c, desc: 'Fogo e raio: SOBRECARGA que explode em volta', firstDamage: 18, secondDamage: 30, rate: 0.95, range: 185, burnDps: 12 },
  frostGarden: { name: 'Jardim de Geada', towers: ['frost', 'vine'], first: 'ice', second: 'nature', reaction: 'thornfrost', color: 0x7fffd4, desc: 'Gelo e espinhos: GEADA ESPINHOSA prende e deixa Frágil', firstDamage: 16, secondDamage: 26, rate: 1.0, range: 185, chillStacks: 1 },
  polar: { name: 'Agulha Polar', towers: ['frost', 'storm'], first: 'ice', second: 'lightning', reaction: 'superconduct', color: 0x9fd8ff, desc: 'Gelo e raio: SUPERCONDUÇÃO deixa todos em volta Frágeis', firstDamage: 16, secondDamage: 28, rate: 1.05, range: 185, chillStacks: 1 },
};

export const FUSION_IDS = Object.keys(FUSIONS) as FusionId[];

/** Which fusion two tower types make (order doesn't matter), if any. */
export function fusionOf(a: TowerId, b: TowerId): FusionId | null {
  for (const id of FUSION_IDS) {
    const [x, y] = FUSIONS[id].towers;
    if ((x === a && y === b) || (x === b && y === a)) return id;
  }
  return null;
}
