// Evoluções: at level 3 a tower can evolve into ONE of two final forms (level "4").
// Branch A = a slow, devastating ultimate. Branch B = a constant effect with lower damage.
// All numbers live here; the simulation reads them.
import { TOWERS, type TowerId, type TowerLevel } from './towers';

export type EvolutionId =
  | 'winterCrown'
  | 'blizzard'
  | 'volcano'
  | 'furnace'
  | 'elderTree'
  | 'hungryRoots'
  | 'thunderLord'
  | 'tesla'
  | 'sniper'
  | 'arrowRain';

export type UltKind = 'tomb' | 'meteor' | 'massRoot' | 'skyStrike';

export interface EvolutionDef {
  tower: TowerId;
  name: string;
  desc: string; // UI, short
  color: number;
  cost: number;
  /** Changes to the level-3 stats. */
  stats: { damageMult?: number; rateMult?: number; rangeMult?: number; chainBonus?: number; rootChance?: number; critChance?: number; critMult?: number; burnMult?: number };
  /** Keeps the level-3 special ability (Rajada, Chão em Chamas...). */
  keepAbility: boolean;
  /** Branch A: an ultimate every N seconds (only fires when an enemy is in range). */
  ult?: { kind: UltKind; every: number; damageMult: number; radius?: number; targets?: number; freeze?: number };
  /** Ice branch B: no projectiles; a constant storm hits everyone in range every `tick` seconds. */
  aura?: { tick: number; damageMult: number; chillStacks: number };
  /** Archer branch B: every shot hits this many enemies. */
  multishot?: number;
  /** Archer branch A: aims at the enemy with the most life instead of the one in front. */
  targetStrongest?: boolean;
}

export const EVOLUTIONS: Record<EvolutionId, EvolutionDef> = {
  // ── Cristal Gélido ──
  winterCrown: {
    tower: 'frost', name: 'Coroa do Inverno', color: 0x9fe8ff, cost: 240,
    desc: 'A cada 9 s: Tumba Glacial congela todos no alcance e causa dano enorme',
    stats: { rateMult: 0.8 }, keepAbility: true,
    ult: { kind: 'tomb', every: 9, damageMult: 6, freeze: 6 },
  },
  blizzard: {
    tower: 'frost', name: 'Nevasca Eterna', color: 0xd8f6ff, cost: 220,
    desc: 'Nevasca sem parar: todos no alcance são resfriados e machucados',
    stats: { rangeMult: 1.1 }, keepAbility: false,
    aura: { tick: 0.6, damageMult: 0.4, chillStacks: 1 },
  },
  // ── Braseiro ──
  volcano: {
    tower: 'brazier', name: 'Vulcão', color: 0xff4d1f, cost: 240,
    desc: 'A cada 7 s: meteoro no maior grupo, explosão e chão em chamas',
    stats: {}, keepAbility: true,
    ult: { kind: 'meteor', every: 7, damageMult: 4, radius: 115 },
  },
  furnace: {
    tower: 'brazier', name: 'Fornalha', color: 0xffa02e, cost: 220,
    desc: 'Lança-chamas: ataca 2,5× mais rápido, menos dano, queima mais',
    stats: { rateMult: 2.5, damageMult: 0.45, burnMult: 1.6 }, keepAbility: false,
  },
  // ── Vinha Ancestral ──
  elderTree: {
    tower: 'vine', name: 'Árvore Anciã', color: 0x3fae3a, cost: 230,
    desc: 'A cada 8 s: prende TODOS os inimigos no alcance de uma vez',
    stats: {}, keepAbility: true,
    ult: { kind: 'massRoot', every: 8, damageMult: 1.5 },
  },
  hungryRoots: {
    tower: 'vine', name: 'Raiz Faminta', color: 0x8ad44a, cost: 220,
    desc: 'Todo golpe enraíza; ataca mais rápido com menos dano',
    stats: { rootChance: 1, rateMult: 1.3, damageMult: 0.7 }, keepAbility: true,
  },
  // ── Torre do Trovão ──
  thunderLord: {
    tower: 'storm', name: 'Senhor do Trovão', color: 0xfff27a, cost: 240,
    desc: 'A cada 7 s: raios caem do céu em até 6 inimigos no alcance',
    stats: {}, keepAbility: true,
    ult: { kind: 'skyStrike', every: 7, damageMult: 3, targets: 6 },
  },
  tesla: {
    tower: 'storm', name: 'Bobina Tesla', color: 0x9fd8ff, cost: 220,
    desc: 'Arcos contínuos: 2,5× mais rápido, +2 saltos, menos dano',
    stats: { rateMult: 2.5, damageMult: 0.42, chainBonus: 2 }, keepAbility: false,
  },
  // ── Arqueiro ──
  sniper: {
    tower: 'archer', name: 'Atirador de Elite', color: 0xe8d6b0, cost: 230,
    desc: 'Tiro lento e devastador no inimigo com mais vida; alcance enorme',
    stats: { rateMult: 0.45, damageMult: 3.4, rangeMult: 1.45, critChance: 0.35, critMult: 2.5 }, keepAbility: false,
    targetStrongest: true,
  },
  arrowRain: {
    tower: 'archer', name: 'Chuva de Flechas', color: 0xc9a46a, cost: 220,
    desc: 'Todo disparo acerta 3 inimigos, com um pouco menos de dano',
    stats: { damageMult: 0.75 }, keepAbility: false,
    multishot: 3,
  },
};

/** The two branches of each tower: [ultimate, constant]. */
export const TOWER_EVOLUTIONS: Record<TowerId, [EvolutionId, EvolutionId]> = {
  frost: ['winterCrown', 'blizzard'],
  brazier: ['volcano', 'furnace'],
  vine: ['elderTree', 'hungryRoots'],
  storm: ['thunderLord', 'tesla'],
  archer: ['sniper', 'arrowRain'],
};


const cache = new Map<EvolutionId, TowerLevel>();

/** Level-3 stats with the evolution's changes applied. */
export function evolvedLevel(tower: TowerId, evo: EvolutionId): TowerLevel {
  const hit = cache.get(evo);
  if (hit) return hit;
  const base = TOWERS[tower].levels[2];
  const s = EVOLUTIONS[evo].stats;
  const lvl: TowerLevel = {
    ...base,
    damage: base.damage * (s.damageMult ?? 1),
    rate: base.rate * (s.rateMult ?? 1),
    range: base.range * (s.rangeMult ?? 1),
  };
  if (base.chainCount !== undefined) lvl.chainCount = base.chainCount + (s.chainBonus ?? 0);
  if (s.rootChance !== undefined) lvl.rootChance = s.rootChance;
  if (s.critChance !== undefined) lvl.critChance = s.critChance;
  if (s.critMult !== undefined) lvl.critMult = s.critMult;
  if (base.burnDps !== undefined) lvl.burnDps = base.burnDps * (s.burnMult ?? 1);
  cache.set(evo, lvl);
  return lvl;
}
