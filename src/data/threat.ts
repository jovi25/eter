// Ameaça (Fase 20): after 3 stars, the player picks how hard the stage gets, from 1 to 5.
// Each level keeps the rules of the ones below and adds one more. The first win of each level pays a crown and moedas.
// All numbers live here.

import type { SimModifiers } from './modifiers';

export interface ThreatLevel {
  rule: string; // UI, short
  apply: (m: SimModifiers) => void;
}

export const THREAT = {
  max: 3,
  // 3 levels (the player found 5 too many): they match the old Ameaça 1, 3 and 5.
  levels: [
    { rule: 'Monstros +20% de vida', apply: (m) => { m.enemyHpMult *= 1.2; } },
    { rule: 'Chefes +40% de vida e monstros 10% mais rápidos', apply: (m) => { m.bossHpMult *= 1.4; m.enemySpeedMult *= 1.1; } },
    { rule: 'Torres 15% mais caras e monstros +15% de vida', apply: (m) => { m.towerCostMult *= 1.15; m.enemyHpMult *= 1.15; } },
  ] as ThreatLevel[],
  /** Moedas for the first win of each level (index 0 = Ameaça 1). */
  coins: [60, 140, 250],
  color: 0xff5a4a,
};

/** Save v9: crowns won under the old 5 levels, mapped to the 3 levels (1→1, 2→1, 3→2, 4→2, 5→3). */
export const OLD_THREAT_TO_NEW = [0, 1, 1, 2, 2, 3];

/** Apply Ameaça 1..level (0 = nothing). */
export function applyThreat(m: SimModifiers, level: number): void {
  for (let i = 0; i < Math.min(level, THREAT.max); i++) THREAT.levels[i]!.apply(m);
}
