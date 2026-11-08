export type Element = 'physical' | 'fire' | 'ice' | 'nature' | 'arcane';

export interface ElementDef {
  name: string; // UI (pt-BR)
  color: number; // main color used by procedural art and damage numbers
}

export const ELEMENTS: Record<Element, ElementDef> = {
  physical: { name: 'Físico', color: 0xe8d6b0 },
  fire: { name: 'Fogo', color: 0xff7a2e },
  ice: { name: 'Gelo', color: 0x6fe6ff },
  nature: { name: 'Natureza', color: 0x6ad44a },
  arcane: { name: 'Arcano', color: 0xb57bff },
};
