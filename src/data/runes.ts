// Runas: built on fixed rune stones on the ground (never on a tower slot).
// A rune boosts every tower within its radius — so where you put your towers starts to matter.

export type RuneKind = 'haste' | 'power';

export interface RuneDef {
  name: string;
  desc: string;
  cost: number;
  color: number;
  rateMult: number; // attack speed of towers in range
  damageMult: number; // damage of towers in range
}

export const RUNES: Record<RuneKind, RuneDef> = {
  haste: { name: 'Runa de Pressa', desc: 'Torres por perto atacam 25% mais rápido', cost: 100, color: 0x6fe6ff, rateMult: 1.25, damageMult: 1 },
  power: { name: 'Runa de Poder', desc: 'Torres por perto causam 25% mais dano', cost: 100, color: 0xff7a2e, rateMult: 1, damageMult: 1.25 },
};

export const RUNE_KINDS: RuneKind[] = ['haste', 'power'];
export const RUNE_RULES = { radius: 175, sellRefund: 0.7 };
