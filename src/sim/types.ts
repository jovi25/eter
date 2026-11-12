import type { Element } from '../data/elements';
import type { EvolutionId } from '../data/evolutions';
import type { RuneKind } from '../data/runes';
import type { EnemyId } from '../data/enemies';
import type { HeroClass } from '../data/heroes';
import type { BoonId } from '../data/boons';
import type { ReactionId } from '../data/reactions';
import type { TowerAbility, TowerId } from '../data/towers';

export interface EnemyState {
  id: number;
  type: EnemyId;
  wave: number; // 1-based wave it belongs to
  pathIndex: number; // which map path it walks
  blockedBy: number; // 0 = free; -1 = held by the hero; >0 = held by that summon
  hp: number;
  maxHp: number;
  dist: number; // distance walked along the path
  x: number;
  y: number;
  alive: boolean;
  isBoss: boolean;
  flying: boolean;
  gold: number;
  // statuses (seconds remaining; 0 = inactive)
  burnTime: number;
  burnDps: number;
  burnTickTimer: number;
  chillStacks: number;
  chillTime: number;
  frozenTime: number;
  rootTime: number;
  rootImmuneTime: number;
  fragileTime: number;
  // boss only
  bossCycleTimer: number;
  chillImmuneTime: number;
}

export interface TowerState {
  id: number;
  slot: number;
  type: TowerId;
  level: number; // 1..3
  x: number;
  y: number;
  cooldown: number;
  invested: number;
  shots: number; // attacks fired (drives every-Nth-shot abilities)
  blessTime: number; // Sacerdotisa blessing: +damage while > 0
  boost: number; // Reforços bought after max level
  evo: EvolutionId | null; // chosen final form (after level 3)
  ultTimer: number; // seconds until the next ultimate / storm tick
}

export interface ProjectileState {
  id: number;
  towerId: number; // 0 for the hero
  towerType?: TowerId; // undefined for the hero
  targetId: number;
  x: number;
  y: number;
  tx: number; // last known target position
  ty: number;
  speed: number;
  damage: number;
  element: Element;
  crit: boolean;
  splashRadius: number;
  splashFactor: number;
  burnDps: number;
  rootChance: number;
  chillStacks: number;
  ability?: TowerAbility; // max-level ability riding on this projectile
  alive: boolean;
}

/** Burning ground left by a max-level Braseiro. */
export interface ZoneState {
  id: number;
  x: number;
  y: number;
  radius: number;
  time: number; // seconds left
  burnDps: number;
  tickTimer: number;
}

export type WavePhase = 'prep' | 'spawning' | 'countdown' | 'done';
export type MatchResult = 'playing' | 'won' | 'lost';

export interface MatchStats {
  reactions: Record<ReactionId, number>;
  damageByTower: Record<TowerId, number>;
  kills: number;
  livesLost: number;
  heroDamage: number;
  catalyzeCasts: number;
  bestCatalyzeReactions: number; // most reactions from a single Catalisar
  skillCasts: number;
  built: Record<TowerId, number>; // towers built, by type
  peakTowers: number; // most towers standing at once
  heroFalls: number;
  bestCombo: number;
}

export interface SimState {
  tick: number;
  time: number; // seconds of simulated time
  seed: number;
  gold: number;
  lives: number;
  wave: number; // waves started so far (0 before the first)
  totalWaves: number;
  wavePhase: WavePhase;
  nextWaveTimer: number; // seconds until the next wave starts by itself
  result: MatchResult;
  enemies: EnemyState[];
  towers: TowerState[];
  projectiles: ProjectileState[];
  zones: ZoneState[];
  summons: SummonState[];
  boonOffers: BoonId[][]; // pending "pick 1 of 3" offers, oldest first
  boons: BoonId[]; // picked so far (repeats stack)
  altarBuys: number; // Altar de Éter purchases this match
  runes: { x: number; y: number; kind: RuneKind | null }[]; // rune stones of this map (empty when the stage has none)
  rerolls: number; // offers re-rolled this match
  combo: { count: number; mult: number; timer: number };
  hero: HeroState;
  stats: MatchStats;
}

/** Anything that holds enemies in melee (Knight hero, Druid's bear). */
export interface BlockerState {
  id: number; // -1 for the hero, >0 for summons
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  alive: boolean;
  respawnTimer: number;
  blocking: number[]; // enemy ids held right now
  attackCooldown: number;
  facing: 1 | -1;
  moving: boolean;
}

export interface HeroState extends BlockerState {
  cls: HeroClass;
  targetX: number; // where it walks to / its post
  targetY: number;
  catalyzeCooldown: number; // seconds until the class skill is ready (0 = ready) — name kept from Phase 3
  catalyzeMax: number;
}

export interface SummonState extends BlockerState {
  kind: 'bear';
  postX: number;
  postY: number;
}

/** One hit on one enemy. Towers, splash, the hero and reactions all go through this. */
export interface HitSpec {
  element: Element;
  damage: number;
  crit?: boolean;
  burnDps?: number; // fire: dps of the burn it applies
  rootChance?: number; // nature: chance to root (1 = always)
  towerId?: number;
  towerType?: TowerId;
  hero?: boolean; // dealt by the hero (stats)
  chillStacks?: number; // ice: stacks added per hit (default 1)
  entangle?: { extra: number; radius: number }; // nature: a root spreads to neighbours
}
