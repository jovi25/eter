// Ameaça (Fase 20): after 3 stars, the player picks how hard the stage gets, from 1 to 5.
// Each level keeps the rules of the ones below and adds one more. The first win of each level pays a crown and moedas.
// All numbers live here.

import type { SimModifiers } from './modifiers';

export interface ThreatLevel {
  rule: string; // UI, short
  apply: (m: SimModifiers) => void;
}

export const THREAT = {
  max: 5,
  levels: [
    { rule: 'Monstros +20% de vida', apply: (m) => { m.enemyHpMult *= 1.2; } },
    { rule: 'Chefes e Colossos +40% de vida', apply: (m) => { m.bossHpMult *= 1.4; } },
    { rule: 'Monstros 10% mais rápidos', apply: (m) => { m.enemySpeedMult *= 1.1; } },
    { rule: 'Torres custam 15% mais', apply: (m) => { m.towerCostMult *= 1.15; } },
    { rule: 'Monstros +15% de vida a mais', apply: (m) => { m.enemyHpMult *= 1.15; } },
  ] as ThreatLevel[],
  /** Moedas for the first win of each level (index 0 = Ameaça 1). */
  coins: [40, 60, 80, 110, 150],
  color: 0xff5a4a,
};

/** Apply Ameaça 1..level (0 = nothing). */
export function applyThreat(m: SimModifiers, level: number): void {
  for (let i = 0; i < Math.min(level, THREAT.max); i++) THREAT.levels[i]!.apply(m);
}
