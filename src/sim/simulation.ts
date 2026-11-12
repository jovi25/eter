import { SIM_DT } from '../data/config';
import { BONUS, ECONOMY, DIFFICULTY, STARS, WAVE_TIMING } from '../data/economy';
import { RELICS, type RelicDef, type RelicId } from '../data/relics';
import { ALTAR, BOON_IDS, BOON_RULES, BOONS, RARITY_WEIGHT, REROLL, type BoonDef, type BoonId, type BoonRarity } from '../data/boons';
import { ENEMIES, type EnemyId } from '../data/enemies';
import { HERO } from '../data/hero';
import { BEAR, DRUID_FURY, HEROES, KNIGHT_SPIN, PRIEST, type BlockerStats, type HeroDef } from '../data/heroes';
import type { Element } from '../data/elements';
import type { Vec2 } from '../data/maps';
import { MAPS } from '../data/maps';
import { defaultModifiers, type SimModifiers } from '../data/modifiers';
import { COMBO, REACTION_IDS, REACTION_TABLE, REACTIONS, type AuraKey, type ReactionId } from '../data/reactions';
import { STAGES, type StageDef, type StageId } from '../data/stages';
import { STATUS } from '../data/statuses';
import { RUNE_RULES, RUNES, type RuneKind } from '../data/runes';
import { EVOLUTIONS, evolvedLevel, type EvolutionId } from '../data/evolutions';
import { BOOST, MAX_LEVEL, TOWERS, type TowerAbility, type TowerId, type TowerLevel } from '../data/towers';
import { EventBus, type SimEvents } from './events';
import { Path } from './path';
import { Rng } from './rng';
import type { BlockerState, EnemyState, HeroState, HitSpec, ProjectileState, SimState, TowerState } from './types';

export interface SimOptions {
  stage: StageId;
  seed: number;
  modifiers?: Partial<SimModifiers>;
  /** Equipped Relíquias (Fase 7): applied once at the start. */
  relics?: { id: RelicId; level: number }[];
}

export interface SpawnOptions {
  dist?: number;
  wave?: number;
  path?: number;
  goldMult?: number;
  hp?: number; // override (tests)
}

interface PendingSpawn {
  at: number; // seconds after wave start
  enemy: EnemyId;
  path: number;
}

const DT = SIM_DT;

/**
 * The whole match, as pure data + rules. No Phaser, no clocks, no Math.random:
 * call step() at a fixed rate; same seed + same commands → same result.
 */
export class Simulation {
  readonly state: SimState;
  readonly events = new EventBus<SimEvents>();
  /** First path (single-path maps); see paths for all. */
  readonly path: Path;
  readonly paths: Path[];
  readonly stage: StageDef;
  readonly stageId: StageId;
  readonly slots: readonly Vec2[];
  readonly mods: SimModifiers;

  private readonly rng: Rng;
  /** Separate streams so boons/bonus spawns never disturb combat rolls. */
  private readonly boonRng: Rng;
  private readonly eventRng: Rng;
  private nextId = 1;
  private pending: PendingSpawn[] = [];
  private waveStartTime = 0;
  private readonly enemyById = new Map<number, EnemyState>();
  private readonly aliveByWave = new Map<number, number>();
  private readonly clearedWaves = new Set<number>();
  private readonly tmp: Vec2 = { x: 0, y: 0 };

  constructor(opts: SimOptions) {
    this.stageId = opts.stage;
    this.stage = STAGES[opts.stage];
    const map = MAPS[this.stage.map];
    this.paths = map.paths.map((pts) => new Path(pts));
    this.path = this.paths[0]!;
    this.slots = map.slots;
    this.mods = { ...defaultModifiers(), ...opts.modifiers };
    this.rng = new Rng(opts.seed);
    this.boonRng = new Rng((opts.seed ^ 0x9e3779b9) >>> 0);
    this.eventRng = new Rng((opts.seed ^ 0x51ed270b) >>> 0);
    this.state = {
      tick: 0,
      time: 0,
      seed: opts.seed,
      gold: this.stage.startGold ?? ECONOMY.startGold,
      lives: ECONOMY.startLives,
      wave: 0,
      totalWaves: this.stage.waves.length,
      wavePhase: 'prep',
      nextWaveTimer: WAVE_TIMING.firstWaveDelay,
      result: 'playing',
      enemies: [],
      towers: [],
      projectiles: [],
      zones: [],
      combo: { count: 0, mult: 1, timer: 0 },
      hero: {
        id: -1,
        cls: this.mods.heroClass,
        x: map.heroStart.x,
        y: map.heroStart.y,
        targetX: map.heroStart.x,
        targetY: map.heroStart.y,
        hp: HEROES[this.mods.heroClass].blocker?.hp ?? 0,
        maxHp: HEROES[this.mods.heroClass].blocker?.hp ?? 0,
        alive: true,
        respawnTimer: 0,
        blocking: [],
        attackCooldown: 0,
        catalyzeCooldown: 0,
        catalyzeMax: HEROES[this.mods.heroClass].skill.cooldown,
        facing: 1,
        moving: false,
      },
      summons: [],
      boonOffers: [],
      boons: [],
      altarBuys: 0,
      runes: this.stage.runes ? map.runes.map((p) => ({ x: p.x, y: p.y, kind: null })) : [],
      rerolls: 0,
      stats: {
        reactions: { wildfire: 0, melt: 0, thornfrost: 0, shatter: 0, overload: 0, superconduct: 0 },
        damageByTower: { archer: 0, brazier: 0, frost: 0, vine: 0, storm: 0 },
        kills: 0,
        livesLost: 0,
        heroDamage: 0,
        catalyzeCasts: 0,
        bestCatalyzeReactions: 0,
        skillCasts: 0,
        built: { archer: 0, brazier: 0, frost: 0, vine: 0, storm: 0 },
        peakTowers: 0,
        heroFalls: 0,
        bestCombo: 0,
      },
    };
    for (const r of opts.relics ?? []) {
      (RELICS[r.id] as RelicDef).apply(
        {
          mods: this.mods,
          state: this.state,
          addGold: (n) => (this.state.gold = Math.max(0, this.state.gold + n)),
          offerBoon: (rich) => this.state.boonOffers.push(rich ? this.rollBoons(ALTAR.weights, ALTAR.exclude) : this.rollBoons()),
        },
        r.level,
      );
    }
    if (this.mods.heroClass === 'druid') {
      this.state.summons.push({
        id: this.nextId++,
        kind: 'bear',
        x: map.heroStart.x + 40,
        y: map.heroStart.y + 10,
        postX: map.heroStart.x + 40,
        postY: map.heroStart.y + 10,
        hp: BEAR.hp,
        maxHp: BEAR.hp,
        alive: true,
        respawnTimer: 0,
        blocking: [],
        attackCooldown: 0,
        facing: 1,
        moving: false,
      });
    }
  }

  // ───────────────────────────── hero commands ─────────────────────────────

  get heroDef(): HeroDef {
    return HEROES[this.mods.heroClass];
  }

  /** Walk the hero to a spot (clamped to the playfield). For melee heroes this is also their post. */
  moveHero(x: number, y: number): void {
    const b = HERO.bounds;
    const h = this.state.hero;
    h.targetX = Math.max(b.minX, Math.min(b.maxX, x));
    h.targetY = Math.max(b.minY, Math.min(b.maxY, y));
    const bear = this.state.summons.find((s) => s.kind === 'bear');
    if (bear) {
      // The bear guards a spot just in front of the druid.
      bear.postX = h.targetX + 40;
      bear.postY = h.targetY + 10;
    }
  }

  catalyzeReady(): boolean {
    return this.state.result === 'playing' && this.state.hero.alive && this.state.hero.catalyzeCooldown <= 0;
  }

  /**
   * Catalisar (Arcanista): hit every enemy around the hero with the affinity element.
   * Enemies carrying a matching aura react; the rest get the element's aura.
   */
  castCatalyze(): boolean {
    if (!this.catalyzeReady()) return false;
    const h = this.state.hero;
    const c = HERO.catalyze;
    const element = this.mods.heroAffinity;
    h.catalyzeCooldown = h.catalyzeMax;
    const r2 = c.radius * c.radius;
    const before = this.totalReactions();
    let hits = 0;
    for (const e of this.state.enemies.slice()) {
      if (!e.alive || (e.x - h.x) ** 2 + (e.y - h.y) ** 2 > r2) continue;
      hits++;
      this.applyHit(e, {
        element,
        damage: c.damage * this.mods.heroDamageMult * this.mods.elementDamageMult[element],
        burnDps: c.burnDps,
        rootChance: c.rootChance,
        hero: true,
      });
    }
    const reactions = this.totalReactions() - before;
    this.state.stats.catalyzeCasts++;
    this.state.stats.skillCasts++;
    this.state.stats.bestCatalyzeReactions = Math.max(this.state.stats.bestCatalyzeReactions, reactions);
    this.events.emit('catalyzed', { x: h.x, y: h.y, radius: c.radius, element, hits, reactions });
    this.events.emit('heroSkill', { cls: 'mage', x: h.x, y: h.y, radius: c.radius, hits, reactions });
    return true;
  }

  private totalReactions(): number {
    const r = this.state.stats.reactions;
    return REACTION_IDS.reduce((sum, id) => sum + r[id], 0);
  }

  private enemiesNear(x: number, y: number, radius: number): EnemyState[] {
    const r2 = radius * radius;
    return this.state.enemies.filter((e) => e.alive && (e.x - x) ** 2 + (e.y - y) ** 2 <= r2);
  }

  /** The class skill fires on its own when it is ready and worth it. */
  private tryAutoSkill(): void {
    const h = this.state.hero;
    if (!this.catalyzeReady()) return;
    const sk = this.heroDef.skill;
    const cls = this.mods.heroClass;
    if (cls === 'priest') {
      // Bless when enemies are within reach of the towers around her.
      const towers = this.towersNear(h.x, h.y, sk.radius);
      const busy = towers.some((t) => this.findTarget(t));
      if (!busy) return;
      for (const t of towers) t.blessTime = PRIEST.blessDuration;
      this.skillDone(h, sk.radius, towers.length, 0);
      return;
    }
    const near = this.enemiesNear(h.x, h.y, sk.radius);
    if (near.length < sk.minTargets) return;
    if (cls === 'mage') {
      this.castCatalyze();
      return;
    }
    const before = this.totalReactions();
    if (cls === 'knight') {
      for (const e of near) this.applyHit(e, { element: 'physical', damage: KNIGHT_SPIN.damage * this.mods.heroDamageMult, hero: true });
    } else if (cls === 'druid') {
      for (const e of near) {
        this.applyHit(e, { element: 'nature', damage: DRUID_FURY.damage * this.mods.heroDamageMult, hero: true });
        if (e.alive && this.canBeRooted(e)) this.root(e, DRUID_FURY.rootDuration);
      }
      const bear = this.state.summons.find((s) => s.kind === 'bear' && s.alive);
      if (bear) bear.hp = Math.min(bear.maxHp, bear.hp + bear.maxHp * 0.3);
    }
    this.skillDone(h, sk.radius, near.length, this.totalReactions() - before);
  }

  private skillDone(h: HeroState, radius: number, hits: number, reactions: number): void {
    h.catalyzeCooldown = h.catalyzeMax;
    this.state.stats.skillCasts++;
    this.events.emit('heroSkill', { cls: this.mods.heroClass, x: h.x, y: h.y, radius, hits, reactions });
  }

  private towersNear(x: number, y: number, radius: number): TowerState[] {
    const r2 = radius * radius;
    return this.state.towers.filter((t) => (t.x - x) ** 2 + (t.y - y) ** 2 <= r2);
  }

  /** Towers near the Sacerdotisa attack faster. */
  private towerRateMult(t: TowerState): number {
    let m = this.runeMult(t, 'rateMult');
    if (this.mods.heroClass !== 'priest' || !this.state.hero.alive) return m;
    const h = this.state.hero;
    if ((t.x - h.x) ** 2 + (t.y - h.y) ** 2 <= PRIEST.auraRadius ** 2) m *= PRIEST.auraRateMult;
    return m;
  }

  private blessMult(t: TowerState): number {
    return (t.blessTime > 0 ? PRIEST.blessDamageMult : 1) * (1 + BOOST.damagePerLevel * t.boost) * this.runeMult(t, 'damageMult');
  }

  /** Product of the runes of one kind that reach this tower. */
  runeMult(t: { x: number; y: number }, key: 'rateMult' | 'damageMult'): number {
    let m = 1;
    for (const r of this.state.runes) {
      if (!r.kind) continue;
      if ((t.x - r.x) ** 2 + (t.y - r.y) ** 2 <= RUNE_RULES.radius ** 2) m *= RUNES[r.kind][key];
    }
    return m;
  }

  /** Build a rune on an empty rune stone. */
  buildRune(index: number, kind: RuneKind): boolean {
    const s = this.state;
    const r = s.runes[index];
    const cost = RUNES[kind].cost;
    if (!r || r.kind || s.result !== 'playing' || s.gold < cost) return false;
    r.kind = kind;
    this.addGold(-cost);
    this.events.emit('runeBuilt', { index, kind });
    return true;
  }

  sellRune(index: number): boolean {
    const s = this.state;
    const r = s.runes[index];
    if (!r?.kind || s.result !== 'playing') return false;
    const refund = Math.round(RUNES[r.kind].cost * RUNE_RULES.sellRefund);
    r.kind = null;
    this.addGold(refund);
    this.events.emit('runeSold', { index, refund });
    return true;
  }

  private updateHero(): void {
    const h = this.state.hero;
    if (h.catalyzeCooldown > 0) h.catalyzeCooldown = Math.max(0, h.catalyzeCooldown - DT);
    const def = this.heroDef;
    if (def.blocker) {
      // Knight: the hero itself holds the line around its post.
      this.updateBlocker(h, def.blocker, h.targetX, h.targetY, true);
    } else {
      this.walkTo(h, h.targetX, h.targetY, HERO.speed);
      this.heroRangedAttack();
    }
    for (const s of this.state.summons) this.updateBlocker(s, BEAR, s.postX, s.postY, false);
    if (h.alive) this.tryAutoSkill();
  }

  private walkTo(b: BlockerState, x: number, y: number, speed: number): boolean {
    const dx = x - b.x;
    const dy = y - b.y;
    const d = Math.hypot(dx, dy);
    const stepLen = speed * DT;
    if (d <= 0.01) {
      b.moving = false;
      return true;
    }
    if (Math.abs(dx) > 1) b.facing = dx > 0 ? 1 : -1;
    if (d <= stepLen) {
      b.x = x;
      b.y = y;
    } else {
      b.x += (dx / d) * stepLen;
      b.y += (dy / d) * stepLen;
    }
    b.moving = true;
    return false;
  }

  /** Ranged auto-attack of the Arcanista / Druida / Sacerdotisa: nearest enemy in range. */
  private heroRangedAttack(): void {
    const h = this.state.hero;
    if (h.attackCooldown > 0) h.attackCooldown = Math.max(0, h.attackCooldown - DT);
    if (h.attackCooldown > 0) return;
    const a = this.heroDef.attack;
    let best: EnemyState | null = null;
    let bestD = a.range * a.range;
    for (const e of this.state.enemies) {
      if (!e.alive) continue;
      const d2 = (e.x - h.x) ** 2 + (e.y - h.y) ** 2;
      if (d2 <= bestD) {
        bestD = d2;
        best = e;
      }
    }
    if (!best) return;
    const element = a.element === 'affinity' ? this.mods.heroAffinity : a.element;
    this.state.projectiles.push({
      id: this.nextId++,
      towerId: 0,
      targetId: best.id,
      x: h.x,
      y: h.y - 84,
      tx: best.x,
      ty: best.y,
      speed: a.projectileSpeed,
      damage: a.damage * this.mods.heroDamageMult * this.mods.elementDamageMult[element],
      element,
      crit: false,
      splashRadius: 0,
      splashFactor: 0,
      burnDps: a.burnDps ?? 0,
      rootChance: a.rootChance ?? 0,
      chillStacks: 1,
      alive: true,
    });
    h.facing = best.x >= h.x ? 1 : -1;
    h.attackCooldown = 1 / (a.rate * this.mods.heroAttackSpeedMult);
    this.events.emit('heroFired', { targetId: best.id });
  }

  /**
   * Melee holder (Knight hero or bear): grabs up to N ground enemies near its post, they stop and hit back.
   * Falls when out of hp, frees what it was holding, comes back after a while.
   */
  private updateBlocker(b: BlockerState, stats: BlockerStats, postX: number, postY: number, isHero: boolean): void {
    if (!b.alive) {
      b.respawnTimer -= DT;
      if (b.respawnTimer <= 0) {
        b.alive = true;
        b.hp = b.maxHp;
        b.x = postX;
        b.y = postY;
        this.events.emit('blockerRespawn', { blockerId: b.id });
      }
      return;
    }
    // Drop enemies that died, leaked or got away.
    b.blocking = b.blocking.filter((id) => {
      const e = this.enemyById.get(id);
      return !!e && e.alive && e.blockedBy === b.id;
    });
    // Grab new ones near the post.
    if (b.blocking.length < stats.maxBlock) {
      const r2 = stats.aggroRadius ** 2;
      const free = this.state.enemies
        .filter((e) => e.alive && !e.flying && e.blockedBy === 0 && (e.x - postX) ** 2 + (e.y - postY) ** 2 <= r2)
        .sort((a, c) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2 - ((c.x - b.x) ** 2 + (c.y - b.y) ** 2));
      for (const e of free) {
        if (b.blocking.length >= stats.maxBlock) break;
        e.blockedBy = b.id;
        b.blocking.push(e.id);
      }
    }
    const target = b.blocking.length ? this.enemyById.get(b.blocking[0]!) : undefined;
    if (target) {
      // Walk up to the first one and fight.
      const dx = target.x - b.x;
      const dy = target.y - b.y;
      const d = Math.hypot(dx, dy);
      if (d > 34) this.walkTo(b, target.x - (dx / d) * 30, target.y - (dy / d) * 30, stats.speed);
      else {
        b.moving = false;
        b.facing = dx >= 0 ? 1 : -1;
      }
      if (b.attackCooldown > 0) b.attackCooldown = Math.max(0, b.attackCooldown - DT);
      if (d <= 52 && b.attackCooldown <= 0) {
        b.attackCooldown = 1 / stats.rate;
        const dmg = stats.damage * (isHero ? this.mods.heroDamageMult : 1);
        this.applyHit(target, { element: 'physical', damage: dmg, hero: isHero });
        this.events.emit('blockerAttack', { blockerId: b.id, targetId: target.id });
      }
      // Held enemies that are close enough hit back.
      let incoming = 0;
      for (const id of b.blocking) {
        const e = this.enemyById.get(id);
        if (e && e.alive && (e.x - b.x) ** 2 + (e.y - b.y) ** 2 <= 70 * 70) incoming += ENEMIES[e.type].attack;
      }
      b.hp -= incoming * DT;
      if (b.hp <= 0) {
        b.hp = 0;
        b.alive = false;
        b.respawnTimer = stats.respawn;
        for (const id of b.blocking) {
          const e = this.enemyById.get(id);
          if (e) e.blockedBy = 0;
        }
        b.blocking = [];
        if (isHero) this.state.stats.heroFalls++;
        this.events.emit('blockerDied', { blockerId: b.id, x: b.x, y: b.y });
      }
    } else {
      this.walkTo(b, postX, postY, stats.speed);
      b.hp = Math.min(b.maxHp, b.hp + b.maxHp * stats.regen * DT);
    }
  }

  // ───────────────────────────── player commands ─────────────────────────────

  towerAt(slot: number): TowerState | undefined {
    return this.state.towers.find((t) => t.slot === slot);
  }

  getTower(id: number): TowerState | undefined {
    return this.state.towers.find((t) => t.id === id);
  }

  /** Cost of the next upgrade, or null if maxed. */
  upgradeCost(tower: TowerState): number | null {
    const next = TOWERS[tower.type].levels[tower.level];
    return next ? Math.round(next.cost * this.mods.upgradeCostMult) : null;
  }

  sellValue(tower: TowerState): number {
    return Math.floor(tower.invested * ECONOMY.sellRefund);
  }

  build(slot: number, type: TowerId): TowerState | null {
    const s = this.state;
    const pos = this.slots[slot];
    if (s.result !== 'playing' || !pos || this.towerAt(slot)) return null;
    if (!this.mods.unlockedTowers.includes(type)) return null;
    const cost = TOWERS[type].levels[0].cost;
    if (s.gold < cost) return null;
    const tower: TowerState = { id: this.nextId++, slot, type, level: 1, x: pos.x, y: pos.y, cooldown: 0, invested: cost, shots: 0, blessTime: 0, boost: 0, evo: null, ultTimer: 0 };
    s.towers.push(tower);
    s.stats.built[type]++;
    s.stats.peakTowers = Math.max(s.stats.peakTowers, s.towers.length);
    this.addGold(-cost);
    this.events.emit('towerBuilt', { towerId: tower.id, slot, type });
    return tower;
  }

  upgrade(towerId: number): boolean {
    const s = this.state;
    const t = this.getTower(towerId);
    if (s.result !== 'playing' || !t) return false;
    const cost = this.upgradeCost(t);
    if (cost === null || s.gold < cost) return false;
    t.level++;
    t.invested += cost;
    this.addGold(-cost);
    this.events.emit('towerUpgraded', { towerId: t.id, level: t.level });
    return true;
  }

  /** Cost of the next Reforço, or null while the tower is not at max level. */
  boostCost(tower: TowerState): number | null {
    if (tower.level < MAX_LEVEL) return null;
    return Math.round(BOOST.baseCost * Math.pow(BOOST.growth, tower.boost) * this.mods.upgradeCostMult);
  }

  /** Reforço: +damage, repeatable, each one pricier than the last. */
  boost(towerId: number): boolean {
    const s = this.state;
    const t = this.getTower(towerId);
    if (s.result !== 'playing' || !t) return false;
    const cost = this.boostCost(t);
    if (cost === null || s.gold < cost) return false;
    t.boost++;
    t.invested += cost;
    this.addGold(-cost);
    this.events.emit('towerBoosted', { towerId: t.id, boost: t.boost });
    return true;
  }

  sell(towerId: number): boolean {
    const s = this.state;
    const i = s.towers.findIndex((t) => t.id === towerId);
    if (s.result !== 'playing' || i < 0) return false;
    const t = s.towers[i]!;
    const refund = this.sellValue(t);
    s.towers.splice(i, 1);
    this.addGold(refund);
    this.events.emit('towerSold', { towerId: t.id, slot: t.slot, refund });
    return true;
  }

  /** Start the next wave now. Pays a bonus for the time skipped. */
  callNextWave(): boolean {
    const s = this.state;
    if (s.result !== 'playing') return false;
    if (s.wavePhase !== 'prep' && s.wavePhase !== 'countdown') return false;
    this.startWave(true);
    return true;
  }

  earlyCallBonus(): number {
    const s = this.state;
    if (s.wavePhase !== 'prep' && s.wavePhase !== 'countdown') return 0;
    return Math.round(s.nextWaveTimer * ECONOMY.earlyCallGoldPerSecond);
  }

  stars(): number {
    const s = this.state;
    if (s.result !== 'won') return 0;
    if (s.lives >= STARS.three) return 3;
    if (s.lives >= STARS.two) return 2;
    return 1;
  }

  // ───────────────────────────── Bênçãos de Éter ─────────────────────────────

  /** Roll a "pick 1 of 3" offer (weighted by rarity, no repeats inside one offer). */
  private rollBoons(weights: Record<BoonRarity, number> = RARITY_WEIGHT, exclude: readonly string[] = []): BoonId[] {
    const pool = BOON_IDS.filter((id) => !exclude.includes(id) && (!(BOONS[id] as BoonDef).locked || this.mods.unlockedBoons.includes(id)));
    const options: BoonId[] = [];
    while (options.length < BOON_RULES.choices && pool.length > 0) {
      const total = pool.reduce((sum, id) => sum + weights[(BOONS[id] as BoonDef).rarity], 0);
      let roll = this.boonRng.next() * total;
      let pick = 0;
      for (let i = 0; i < pool.length; i++) {
        roll -= weights[(BOONS[pool[i]!] as BoonDef).rarity];
        if (roll <= 0) {
          pick = i;
          break;
        }
      }
      options.push(pool.splice(pick, 1)[0]!);
    }
    return options;
  }

  private offerBoons(): void {
    const options = this.rollBoons();
    this.state.boonOffers.push(options);
    this.events.emit('boonOffered', { options });
  }

  /** Price of the next Altar de Éter purchase, or null when the Altar does not exist in this mode. */
  altarCost(): number | null {
    if (this.stageId !== 'rift') return null;
    return Math.round(ALTAR.baseCost * Math.pow(ALTAR.growth, this.state.altarBuys));
  }

  /** Altar de Éter: pay gold for an extra "pick 1 of 3" with better odds. */
  buyAltar(): boolean {
    const s = this.state;
    const cost = this.altarCost();
    if (cost === null || s.result !== 'playing' || s.boonOffers.length > 0 || s.gold < cost) return false;
    this.addGold(-cost);
    s.altarBuys++;
    const options = this.rollBoons(ALTAR.weights, ALTAR.exclude);
    s.boonOffers.unshift(options);
    this.events.emit('altarUsed', { cost, buys: s.altarBuys });
    this.events.emit('boonOffered', { options, altar: true });
    return true;
  }

  rerollCost(): number {
    return REROLL.baseCost + REROLL.step * this.state.rerolls;
  }

  /** "Trocar": swap the cards of the pending offer for new ones. */
  rerollBoons(): boolean {
    const s = this.state;
    const offer = s.boonOffers[0];
    const cost = this.rerollCost();
    if (!offer || s.result !== 'playing' || s.gold < cost) return false;
    this.addGold(-cost);
    s.rerolls++;
    // New cards never repeat the ones just shown.
    const options = this.rollBoons(RARITY_WEIGHT, [...offer]);
    s.boonOffers[0] = options;
    this.events.emit('boonsRerolled', { options, cost });
    return true;
  }

  /** Take one boon from the oldest pending offer. */
  chooseBoon(index: number): boolean {
    const offer = this.state.boonOffers[0];
    const id = offer?.[index];
    if (!offer || !id || this.state.result !== 'playing') return false;
    this.state.boonOffers.shift();
    this.state.boons.push(id);
    const livesBefore = this.state.lives;
    (BOONS[id] as BoonDef).apply({ mods: this.mods, state: this.state, addGold: (n) => this.addGold(n) });
    if (this.state.lives !== livesBefore) this.events.emit('livesChanged', { lives: this.state.lives, delta: this.state.lives - livesBefore });
    this.events.emit('boonChosen', { id });
    return true;
  }

  // ───────────────────────────── main loop ─────────────────────────────

  /** Advance exactly one fixed tick. */
  step(): void {
    const s = this.state;
    if (s.result !== 'playing') return;
    s.tick++;
    s.time += DT;
    this.updateWaves();
    this.updateEnemies();
    this.updateHero();
    this.updateTowers();
    this.updateProjectiles();
    this.updateZones();
    this.updateCombo();
    this.cleanup();
    this.checkVictory();
  }

  // ───────────────────────────── waves ─────────────────────────────

  private startWave(early: boolean): void {
    const s = this.state;
    const bonus = early ? this.earlyCallBonus() : 0;
    s.wave++;
    s.wavePhase = 'spawning';
    s.nextWaveTimer = 0;
    this.waveStartTime = s.time;
    const def = this.stage.waves[s.wave - 1]!;
    this.pending = [];
    for (const g of def.groups) {
      for (let i = 0; i < g.count; i++) {
        const path = g.path !== undefined ? Math.min(g.path, this.paths.length - 1) : i % this.paths.length;
        this.pending.push({ at: (g.delay ?? 0) + i * g.interval, enemy: g.enemy, path });
      }
    }
    // Sometimes a Gosma Dourada sneaks in: no lives at stake, lots of gold if you catch it.
    if (s.wave >= 2 && s.wave < s.totalWaves && this.eventRng.chance(BONUS.treasureChance)) {
      this.pending.push({ at: 2 + this.eventRng.next() * 5, enemy: 'treasure', path: this.eventRng.int(0, this.paths.length - 1) });
    }
    this.pending.sort((a, b) => a.at - b.at);
    if (bonus > 0) this.addGold(bonus);
    this.events.emit('waveStarted', { wave: s.wave, early, bonus });
  }

  private updateWaves(): void {
    const s = this.state;
    if (s.wavePhase === 'prep' || s.wavePhase === 'countdown') {
      s.nextWaveTimer -= DT;
      if (s.nextWaveTimer <= 0) this.startWave(false);
      return;
    }
    if (s.wavePhase !== 'spawning') return;
    const elapsed = s.time - this.waveStartTime;
    while (this.pending.length > 0 && this.pending[0]!.at <= elapsed + 1e-9) {
      const p = this.pending.shift()!;
      this.spawnEnemy(p.enemy, { wave: s.wave, path: p.path });
    }
    if (this.pending.length === 0) {
      if (s.wave < s.totalWaves) {
        s.wavePhase = 'countdown';
        s.nextWaveTimer = WAVE_TIMING.timeBetweenWaves;
        if (s.wave % BOON_RULES.every === BOON_RULES.offset) this.offerBoons();
      } else {
        s.wavePhase = 'done';
      }
      this.checkWaveCleared(s.wave);
    }
  }

  private waveFinishedSpawning(wave: number): boolean {
    const s = this.state;
    return wave < s.wave || (wave === s.wave && s.wavePhase !== 'spawning');
  }

  private checkWaveCleared(wave: number): void {
    const s = this.state;
    if (s.result !== 'playing' || this.clearedWaves.has(wave)) return;
    if (!this.waveFinishedSpawning(wave) || (this.aliveByWave.get(wave) ?? 0) > 0) return;
    this.clearedWaves.add(wave);
    const bonus = ECONOMY.waveClearBonusBase + ECONOMY.waveClearBonusPerWave * wave;
    this.addGold(bonus);
    this.events.emit('waveCleared', { wave, bonus });
  }

  // ───────────────────────────── enemies ─────────────────────────────

  spawnEnemy(type: EnemyId, opts: SpawnOptions = {}): EnemyState {
    const s = this.state;
    const def = ENEMIES[type];
    const wave = opts.wave ?? Math.max(1, s.wave);
    const growth = def.scalesWithWave ? Math.pow(DIFFICULTY.hpGrowthPerWave, wave - 1) : 1;
    const hp = opts.hp ?? Math.round(def.hp * growth * this.stage.hpMult);
    const dist = opts.dist ?? 0;
    const pathIndex = Math.min(opts.path ?? 0, this.paths.length - 1);
    const pos = this.paths[pathIndex]!.pointAt(dist, this.tmp);
    const e: EnemyState = {
      id: this.nextId++,
      type,
      wave,
      pathIndex,
      hp,
      maxHp: hp,
      dist,
      x: pos.x,
      y: pos.y,
      alive: true,
      isBoss: !!def.boss,
      flying: def.flying,
      gold: Math.round(def.gold * (opts.goldMult ?? 1)),
      blockedBy: 0,
      burnTime: 0,
      burnDps: 0,
      burnTickTimer: 0,
      chillStacks: 0,
      chillTime: 0,
      frozenTime: 0,
      rootTime: 0,
      rootImmuneTime: 0,
      fragileTime: 0,
      bossCycleTimer: def.boss?.cycle ?? 0,
      chillImmuneTime: 0,
    };
    s.enemies.push(e);
    this.enemyById.set(e.id, e);
    this.aliveByWave.set(wave, (this.aliveByWave.get(wave) ?? 0) + 1);
    this.events.emit('enemySpawned', { enemyId: e.id, type, isBoss: e.isBoss });
    return e;
  }

  getEnemy(id: number): EnemyState | undefined {
    return this.enemyById.get(id);
  }

  private updateEnemies(): void {
    const s = this.state;
    for (const e of s.enemies) {
      if (!e.alive) continue;
      this.tickStatuses(e);
      if (!e.alive) continue;
      if (e.isBoss) this.tickBoss(e);
      if (e.rootTime > 0 || e.frozenTime > 0 || e.blockedBy !== 0) continue;
      const def = ENEMIES[e.type];
      const slow = e.chillStacks > 0 && e.chillTime > 0 ? STATUS.chilled.slow : 0;
      e.dist += def.speed * (1 - slow) * DT;
      const path = this.paths[e.pathIndex]!;
      path.pointAt(e.dist, this.tmp);
      e.x = this.tmp.x;
      e.y = this.tmp.y;
      if (e.dist >= path.length) this.leak(e);
    }
  }

  private tickStatuses(e: EnemyState): void {
    if (e.burnTime > 0) {
      e.burnTime -= DT;
      e.burnTickTimer -= DT;
      if (e.burnTickTimer <= 1e-9) {
        e.burnTickTimer += STATUS.burning.tickInterval;
        // Burn damage is plain damage: it never triggers reactions. Credited to the Braseiro in stats.
        this.dealDamage(e, e.burnDps * STATUS.burning.tickInterval, 'fire', { dot: true, towerType: 'brazier' });
      }
      if (e.burnTime <= 0) e.burnTime = 0;
    }
    if (e.chillTime > 0) {
      e.chillTime -= DT;
      if (e.chillTime <= 0) {
        e.chillTime = 0;
        e.chillStacks = 0;
      }
    }
    if (e.frozenTime > 0) e.frozenTime = Math.max(0, e.frozenTime - DT);
    if (e.rootTime > 0) {
      e.rootTime -= DT;
      if (e.rootTime <= 0) {
        e.rootTime = 0;
        e.rootImmuneTime = STATUS.rooted.immunityAfter;
      }
    } else if (e.rootImmuneTime > 0) {
      e.rootImmuneTime = Math.max(0, e.rootImmuneTime - DT);
    }
    if (e.fragileTime > 0) e.fragileTime = Math.max(0, e.fragileTime - DT);
  }

  private tickBoss(e: EnemyState): void {
    const boss = ENEMIES[e.type].boss;
    if (!boss) return;
    if (e.chillImmuneTime > 0) e.chillImmuneTime = Math.max(0, e.chillImmuneTime - DT);
    e.bossCycleTimer -= DT;
    if (e.bossCycleTimer > 0) return;
    e.bossCycleTimer += boss.cycle;
    e.chillImmuneTime = boss.chillImmuneDuration;
    // Shake off the cold when the immunity kicks in.
    e.chillStacks = 0;
    e.chillTime = 0;
    e.frozenTime = 0;
    for (let i = 0; i < boss.summon.count; i++) {
      this.spawnEnemy(boss.summon.enemy, {
        wave: e.wave,
        path: e.pathIndex,
        dist: Math.max(0, e.dist - boss.summon.spacing * (i + 1)),
        goldMult: boss.summon.goldMult,
        // Summons don't scale with the wave: they are fodder, not a wall in front of the boss.
        hp: Math.round(ENEMIES[boss.summon.enemy].hp * boss.summon.hpMult * this.stage.hpMult),
      });
    }
    this.events.emit('bossAbility', { enemyId: e.id, x: e.x, y: e.y });
  }

  private leak(e: EnemyState): void {
    const s = this.state;
    e.alive = false;
    const cost = ENEMIES[e.type].livesCost;
    const lost = Math.min(cost, s.lives);
    s.lives -= lost;
    s.stats.livesLost += lost;
    this.events.emit('enemyLeaked', { enemyId: e.id, livesLost: lost });
    this.events.emit('livesChanged', { lives: s.lives, delta: -lost });
    this.onEnemyGone(e);
    if (s.lives <= 0 && s.result === 'playing') {
      s.result = 'lost';
      this.events.emit('gameOver', { won: false, stars: 0 });
    }
  }

  private kill(e: EnemyState): void {
    const s = this.state;
    e.alive = false;
    s.stats.kills++;
    const gold = Math.round(e.gold * this.mods.goldMult);
    this.addGold(gold);
    this.events.emit('enemyKilled', { enemyId: e.id, type: e.type, x: e.x, y: e.y, gold, isBoss: e.isBoss });
    this.onEnemyGone(e);
  }

  private onEnemyGone(e: EnemyState): void {
    this.aliveByWave.set(e.wave, (this.aliveByWave.get(e.wave) ?? 1) - 1);
    this.checkWaveCleared(e.wave);
  }

  // ───────────────────────────── towers & projectiles ─────────────────────────────

  levelOf(t: TowerState): TowerLevel {
    if (t.evo) return evolvedLevel(t.type, t.evo);
    return TOWERS[t.type].levels[t.level - 1]!;
  }

  private canTarget(t: TowerState, e: EnemyState): boolean {
    if (!e.alive) return false;
    if (e.flying && !TOWERS[t.type].hitsFlying && !(t.type === 'vine' && this.mods.vineHitsFlying)) return false;
    return true;
  }

  /** "First" targeting: the enemy in range that walked the furthest. */
  findTarget(t: TowerState): EnemyState | null {
    const range = this.levelOf(t).range * this.mods.rangeMult;
    const r2 = range * range;
    const strongest = !!(t.evo && EVOLUTIONS[t.evo].targetStrongest);
    let best: EnemyState | null = null;
    for (const e of this.state.enemies) {
      if (!this.canTarget(t, e)) continue;
      const dx = e.x - t.x;
      const dy = e.y - t.y;
      if (dx * dx + dy * dy > r2) continue;
      if (!best || (strongest ? e.hp > best.hp : e.dist > best.dist)) best = e;
    }
    return best;
  }

  private updateTowers(): void {
    for (const t of this.state.towers) {
      if (t.blessTime > 0) t.blessTime = Math.max(0, t.blessTime - DT);
      if (t.evo) {
        const evo = EVOLUTIONS[t.evo];
        if (evo.ult || evo.aura) {
          t.ultTimer -= DT * this.towerRateMult(t);
          if (t.ultTimer <= 0) {
            if (evo.aura) {
              this.stormTick(t, t.evo);
              t.ultTimer += evo.aura.tick;
            } else if (this.castUlt(t, t.evo)) t.ultTimer = evo.ult!.every;
            else t.ultTimer = 0;
          }
          if (evo.aura) continue; // the storm replaces normal shots
        }
      }
      if (t.cooldown > 0) t.cooldown = Math.max(0, t.cooldown - DT * this.towerRateMult(t));
      if (t.cooldown > 0) continue;
      const target = this.findTarget(t);
      if (!target) continue;
      this.fire(t, target);
    }
  }

  /**
   * Instant chain lightning: hits the target, then jumps to the nearest enemy not yet hit
   * (within chainRange of the last one), losing damage on every jump.
   */
  private fireChain(t: TowerState, target: EnemyState): void {
    const def = TOWERS[t.type];
    const lvl = this.levelOf(t);
    let count = (lvl.chainCount ?? 1) + this.mods.chainBonus;
    let falloff = lvl.chainFalloff ?? 1;
    const ab = this.abilityOf(t);
    if (ab?.id === 'supercharge' && t.shots % ab.every === 0) {
      count *= ab.chainMult;
      falloff = 1;
      this.events.emit('towerAbility', { towerId: t.id, ability: 'supercharge', x: t.x, y: t.y });
    }
    const jump2 = (lvl.chainRange ?? 0) ** 2;
    const base = lvl.damage * this.mods.towerDamageMult[t.type] * this.mods.elementDamageMult[def.element] * this.blessMult(t);
    const points = [{ x: t.x, y: t.y }];
    const hit = new Set<number>();
    let current: EnemyState | null = target;
    for (let i = 0; i < count && current; i++) {
      hit.add(current.id);
      const from: EnemyState = current;
      points.push({ x: from.x, y: from.y });
      this.applyHit(from, {
        element: def.element,
        damage: base * Math.pow(falloff, i),
        towerId: t.id,
        towerType: t.type,
      });
      current = null;
      let best = Infinity;
      for (const e of this.state.enemies) {
        if (hit.has(e.id) || !this.canTarget(t, e)) continue;
        const d2 = (e.x - from.x) ** 2 + (e.y - from.y) ** 2;
        if (d2 <= jump2 && d2 < best) {
          best = d2;
          current = e;
        }
      }
    }
    t.cooldown = 1 / lvl.rate;
    this.events.emit('towerFired', { towerId: t.id, targetId: target.id });
    this.events.emit('chainLightning', { towerId: t.id, points });
  }

  /** The tower's special ability, if it is at max level. */
  abilityOf(t: TowerState): TowerAbility | null {
    if (t.evo && !EVOLUTIONS[t.evo].keepAbility) return null;
    return t.level >= MAX_LEVEL ? TOWERS[t.type].ability : null;
  }

  // ───────────────────────────── Evoluções ─────────────────────────────

  /** Price of evolving this tower, or null if it can't (not level 3 yet, or already evolved). */
  evolveCost(t: TowerState, evo: EvolutionId): number | null {
    if (t.level < MAX_LEVEL || t.evo || EVOLUTIONS[evo].tower !== t.type) return null;
    return Math.round(EVOLUTIONS[evo].cost * this.mods.upgradeCostMult);
  }

  evolve(towerId: number, evo: EvolutionId): boolean {
    const s = this.state;
    const t = this.getTower(towerId);
    if (!t || s.result !== 'playing') return false;
    const cost = this.evolveCost(t, evo);
    if (cost === null || s.gold < cost) return false;
    t.evo = evo;
    t.invested += cost;
    const def = EVOLUTIONS[evo];
    t.ultTimer = def.ult ? def.ult.every * 0.4 : 0; // first ultimate comes a bit sooner
    this.addGold(-cost);
    this.events.emit('towerEvolved', { towerId: t.id, evo });
    return true;
  }

  private inRange(t: TowerState, range = this.levelOf(t).range * this.mods.rangeMult): EnemyState[] {
    const r2 = range * range;
    return this.state.enemies.filter((e) => this.canTarget(t, e) && (e.x - t.x) ** 2 + (e.y - t.y) ** 2 <= r2);
  }

  /** Damage base for ultimates/storms: the level-3 hit, with every bonus (relics, boons, runes, Reforço). */
  private ultBase(t: TowerState): number {
    const def = TOWERS[t.type];
    return def.levels[MAX_LEVEL - 1]!.damage * this.mods.towerDamageMult[t.type] * this.mods.elementDamageMult[def.element] * this.blessMult(t);
  }

  /** Branch A. Returns false when nobody is in range (it waits, fully charged). */
  private castUlt(t: TowerState, evo: EvolutionId): boolean {
    const def = EVOLUTIONS[evo];
    const ult = def.ult!;
    const range = this.levelOf(t).range * this.mods.rangeMult;
    const foes = this.inRange(t, range);
    if (foes.length === 0) return false;
    const base = this.ultBase(t) * ult.damageMult;
    const el = TOWERS[t.type].element;
    const targets: { x: number; y: number }[] = [];
    const hit = (e: EnemyState, spec: Partial<HitSpec>) => {
      targets.push({ x: e.x, y: e.y });
      this.applyHit(e, { element: el, damage: base, towerId: t.id, towerType: t.type, ...spec });
    };
    let cx = t.x;
    let cy = t.y;
    let radius = range;
    if (ult.kind === 'tomb') {
      for (const e of foes) hit(e, { chillStacks: ult.freeze ?? 6 });
    } else if (ult.kind === 'massRoot') {
      for (const e of foes) if (!e.flying) hit(e, { rootChance: 1 });
    } else if (ult.kind === 'skyStrike') {
      const n = ult.targets ?? 6;
      for (const e of [...foes].sort((a, b) => b.hp - a.hp).slice(0, n)) hit(e, {});
    } else if (ult.kind === 'meteor') {
      // Aim where the most enemies are bunched up.
      const r = ult.radius ?? 110;
      let best = foes[0]!;
      let bestN = -1;
      for (const a of foes) {
        let n = 0;
        for (const b of foes) if ((a.x - b.x) ** 2 + (a.y - b.y) ** 2 <= r * r) n++;
        if (n > bestN) {
          bestN = n;
          best = a;
        }
      }
      cx = best.x;
      cy = best.y;
      radius = r;
      const lvl3 = TOWERS[t.type].levels[MAX_LEVEL - 1]!;
      for (const e of this.state.enemies) {
        if (!e.alive || (e.x - cx) ** 2 + (e.y - cy) ** 2 > r * r) continue;
        hit(e, { damage: e === best ? base : base * 0.7, burnDps: (lvl3.burnDps ?? 0) * this.mods.burnDpsMult });
      }
      this.createZone(cx, cy, 90, 4, (lvl3.burnDps ?? 10) * this.mods.burnDpsMult);
    }
    this.events.emit('towerUlt', { towerId: t.id, evo, x: cx, y: cy, radius, targets });
    return true;
  }

  /** Branch B of the ice tower: a constant storm instead of shots. */
  private stormTick(t: TowerState, evo: EvolutionId): void {
    const aura = EVOLUTIONS[evo].aura!;
    const dmg = this.ultBase(t) * aura.damageMult;
    for (const e of this.inRange(t)) {
      this.applyHit(e, { element: TOWERS[t.type].element, damage: dmg, chillStacks: aura.chillStacks, towerId: t.id, towerType: t.type });
    }
  }

  private fire(t: TowerState, target: EnemyState): void {
    const def = TOWERS[t.type];
    const lvl = this.levelOf(t);
    t.shots++;
    if (def.projectileSpeed <= 0) {
      this.fireChain(t, target);
      return;
    }
    const ab = this.abilityOf(t);
    this.launch(t, target);
    const multishot = t.evo ? EVOLUTIONS[t.evo].multishot ?? 0 : 0;
    if (multishot > 1) {
      const r2 = (lvl.range * this.mods.rangeMult) ** 2;
      const others = this.state.enemies
        .filter((e) => e !== target && this.canTarget(t, e) && (e.x - t.x) ** 2 + (e.y - t.y) ** 2 <= r2)
        .sort((a, b) => b.dist - a.dist)
        .slice(0, multishot - 1);
      for (const e of others) this.launch(t, e);
    }
    if (ab?.id === 'volley' && t.shots % ab.every === 0) {
      // Rajada: extra arrows at the next-furthest enemies in range.
      const r2 = (lvl.range * this.mods.rangeMult) ** 2;
      const others = this.state.enemies
        .filter((e) => e !== target && this.canTarget(t, e) && (e.x - t.x) ** 2 + (e.y - t.y) ** 2 <= r2)
        .sort((a, b) => b.dist - a.dist)
        .slice(0, ab.targets - 1);
      for (const e of others) this.launch(t, e);
      this.events.emit('towerAbility', { towerId: t.id, ability: 'volley', x: t.x, y: t.y });
    }
    t.cooldown = 1 / lvl.rate;
    this.events.emit('towerFired', { towerId: t.id, targetId: target.id });
  }

  private launch(t: TowerState, target: EnemyState): void {
    const def = TOWERS[t.type];
    const lvl = this.levelOf(t);
    const ab = this.abilityOf(t);
    const crit = lvl.critChance ? this.rng.chance(lvl.critChance) : false;
    const damage =
      lvl.damage * this.mods.towerDamageMult[t.type] * this.mods.elementDamageMult[def.element] * this.blessMult(t) * (crit ? (lvl.critMult ?? 2) : 1);
    const p: ProjectileState = {
      id: this.nextId++,
      towerId: t.id,
      towerType: t.type,
      targetId: target.id,
      x: t.x,
      y: t.y,
      tx: target.x,
      ty: target.y,
      speed: def.projectileSpeed,
      damage,
      element: def.element,
      crit,
      splashRadius: lvl.splashRadius ?? 0,
      splashFactor: lvl.splashFactor ?? 0,
      burnDps: lvl.burnDps ?? 0,
      rootChance: lvl.rootChance ?? 0,
      chillStacks: ab?.id === 'deepfreeze' ? ab.stacks : 1,
      ability: ab ?? undefined,
      alive: true,
    };
    this.state.projectiles.push(p);
  }

  // ───────────────────────────── burning ground (max-level Braseiro) ─────────────────────────────

  private createZone(x: number, y: number, radius: number, duration: number, burnDps: number): void {
    const z = { id: this.nextId++, x, y, radius, time: duration, burnDps, tickTimer: 0 };
    this.state.zones.push(z);
    this.events.emit('zoneCreated', { zoneId: z.id, x, y, radius, duration });
  }

  private updateZones(): void {
    const s = this.state;
    if (s.zones.length === 0) return;
    for (const z of s.zones) {
      z.time -= DT;
      z.tickTimer -= DT;
      if (z.tickTimer > 0) continue;
      z.tickTimer += STATUS.burning.tickInterval;
      const r2 = z.radius * z.radius;
      for (const e of s.enemies) {
        if (!e.alive || e.flying) continue;
        if ((e.x - z.x) ** 2 + (e.y - z.y) ** 2 <= r2) this.applyBurn(e, z.burnDps);
      }
    }
    s.zones = s.zones.filter((z) => z.time > 0);
  }

  private updateProjectiles(): void {
    for (const p of this.state.projectiles) {
      if (!p.alive) continue;
      const target = this.enemyById.get(p.targetId);
      if (target && target.alive) {
        p.tx = target.x;
        p.ty = target.y;
      }
      const dx = p.tx - p.x;
      const dy = p.ty - p.y;
      const d = Math.hypot(dx, dy);
      const stepLen = p.speed * DT;
      if (d <= stepLen) {
        p.x = p.tx;
        p.y = p.ty;
        this.impact(p, target && target.alive ? target : null);
      } else {
        p.x += (dx / d) * stepLen;
        p.y += (dy / d) * stepLen;
      }
    }
  }

  private impact(p: ProjectileState, target: EnemyState | null): void {
    p.alive = false;
    const base: HitSpec = {
      element: p.element,
      damage: p.damage,
      crit: p.crit,
      burnDps: p.burnDps,
      rootChance: p.rootChance,
      towerId: p.towerId,
      towerType: p.towerType,
      hero: p.towerId === 0,
      chillStacks: p.chillStacks,
      entangle: p.ability?.id === 'entangle' ? { extra: p.ability.extra, radius: p.ability.radius } : undefined,
    };
    if (target) this.applyHit(target, base);
    if (p.ability?.id === 'firefield') this.createZone(p.tx, p.ty, p.ability.radius, p.ability.duration, p.ability.burnDps);
    if (p.splashRadius > 0) {
      const r2 = p.splashRadius * p.splashRadius;
      for (const e of this.state.enemies.slice()) {
        if (!e.alive || e === target) continue;
        const dx = e.x - p.tx;
        const dy = e.y - p.ty;
        if (dx * dx + dy * dy > r2) continue;
        this.applyHit(e, { ...base, damage: p.damage * p.splashFactor, crit: false });
      }
    }
  }

  // ───────────────────────────── combat: auras & reactions ─────────────────────────────

  hasAura(e: EnemyState, aura: AuraKey): boolean {
    switch (aura) {
      case 'burning':
        return e.burnTime > 0;
      case 'chilled':
        return e.chillStacks > 0 && e.chillTime > 0;
      case 'frozen':
        return e.frozenTime > 0;
      case 'rooted':
        return e.rootTime > 0;
    }
  }

  findReaction(e: EnemyState, element: Element): { aura: AuraKey; reaction: ReactionId } | null {
    if (element === 'arcane') return null;
    for (const row of REACTION_TABLE) {
      if (row.trigger === element && this.hasAura(e, row.aura)) return row;
    }
    return null;
  }

  /**
   * Resolve one hit: if the enemy carries an aura that reacts with this element, the aura is consumed and
   * the reaction fires (the hit does NOT apply its own aura). Otherwise the hit applies its element's aura.
   */
  applyHit(e: EnemyState, hit: HitSpec): void {
    if (!e.alive) return;
    const found = this.findReaction(e, hit.element);
    let mult = 1;
    if (found) {
      this.consumeAura(e, found.aura);
      const comboMult = this.bumpCombo();
      mult = REACTIONS[found.reaction].damageMult * comboMult * this.mods.reactionDamageMult;
      this.state.stats.reactions[found.reaction]++;
      const h = this.state.hero;
      h.catalyzeCooldown = Math.max(0, h.catalyzeCooldown - HERO.catalyze.cooldownPerReaction);
      this.events.emit('reactionTriggered', {
        enemyId: e.id,
        reaction: found.reaction,
        x: e.x,
        y: e.y,
        comboCount: this.state.combo.count,
        comboMult,
      });
    }
    this.dealDamage(e, hit.damage * mult, hit.element, {
      crit: hit.crit,
      reaction: found?.reaction,
      towerId: hit.towerId,
      towerType: hit.towerType,
      hero: hit.hero,
    });
    if (found) this.applyReactionEffects(e, found.reaction, hit, mult);
    else if (e.alive) this.applyAura(e, hit);
  }

  private consumeAura(e: EnemyState, aura: AuraKey): void {
    switch (aura) {
      case 'burning':
        e.burnTime = 0;
        break;
      case 'chilled':
      case 'frozen':
        e.chillStacks = 0;
        e.chillTime = 0;
        e.frozenTime = 0;
        break;
      case 'rooted':
        e.rootTime = 0;
        e.rootImmuneTime = STATUS.rooted.immunityAfter;
        break;
    }
  }

  private applyReactionEffects(e: EnemyState, reaction: ReactionId, hit: HitSpec, mult: number): void {
    const def = REACTIONS[reaction];
    if (def.splashRadius && def.splashFactor) {
      // SOBRECARGA: the blast also hurts everything around (plain damage, no chain reactions).
      const r2 = def.splashRadius ** 2;
      for (const o of this.state.enemies.slice()) {
        if (o === e || !o.alive) continue;
        if ((o.x - e.x) ** 2 + (o.y - e.y) ** 2 > r2) continue;
        this.dealDamage(o, hit.damage * mult * def.splashFactor, hit.element, { towerId: hit.towerId, towerType: hit.towerType, hero: hit.hero });
      }
    }
    if (def.fragileRadius) {
      const r2 = def.fragileRadius ** 2;
      for (const o of this.state.enemies) {
        if (o === e || !o.alive) continue;
        if ((o.x - e.x) ** 2 + (o.y - e.y) ** 2 <= r2) o.fragileTime = STATUS.fragile.duration;
      }
    }
    if (reaction === 'wildfire' && def.spreadRadius) {
      const r2 = def.spreadRadius * def.spreadRadius;
      for (const o of this.state.enemies) {
        if (o === e || !o.alive) continue;
        const dx = o.x - e.x;
        const dy = o.y - e.y;
        if (dx * dx + dy * dy <= r2) this.applyBurn(o, def.spreadBurnDps ?? 0);
      }
    }
    if (!e.alive) return;
    if (reaction === 'thornfrost' && def.rootDurationMult) {
      // Ignores root immunity. Flyers can never be rooted.
      if (!e.flying && !ENEMIES[e.type].rootImmune) {
        this.root(e, (STATUS.rooted.duration + this.mods.rootDurationBonus) * def.rootDurationMult);
      }
    }
    if (def.appliesFragile || (reaction === 'melt' && this.mods.meltAppliesFragile)) {
      e.fragileTime = STATUS.fragile.duration;
      this.events.emit('statusApplied', { enemyId: e.id, status: 'fragile' });
    }
  }

  private applyAura(e: EnemyState, hit: HitSpec): void {
    switch (hit.element) {
      case 'fire':
        if (hit.burnDps && hit.burnDps > 0) this.applyBurn(e, hit.burnDps);
        break;
      case 'ice':
        for (let i = 0; i < (hit.chillStacks ?? 1) && e.frozenTime <= 0; i++) this.applyChill(e);
        break;
      case 'nature':
        if (hit.rootChance && this.canBeRooted(e) && this.rng.chance(hit.rootChance)) {
          const dur = STATUS.rooted.duration + this.mods.rootDurationBonus;
          this.root(e, dur);
          if (hit.entangle) {
            // Raízes Profundas: the root grabs the nearest neighbours too.
            const r2 = hit.entangle.radius ** 2;
            const near = this.state.enemies
              .filter((o) => o !== e && o.alive && this.canBeRooted(o) && (o.x - e.x) ** 2 + (o.y - e.y) ** 2 <= r2)
              .sort((a, b) => (a.x - e.x) ** 2 + (a.y - e.y) ** 2 - ((b.x - e.x) ** 2 + (b.y - e.y) ** 2))
              .slice(0, hit.entangle.extra);
            for (const o of near) this.root(o, dur);
            if (near.length > 0) this.events.emit('towerAbility', { towerId: hit.towerId ?? 0, ability: 'entangle', x: e.x, y: e.y });
          }
        }
        break;
      case 'physical':
      case 'lightning':
      case 'arcane':
        break;
    }
  }

  canBeRooted(e: EnemyState): boolean {
    return !e.flying && !ENEMIES[e.type].rootImmune && e.rootTime <= 0 && e.rootImmuneTime <= 0;
  }

  private root(e: EnemyState, duration: number): void {
    e.rootTime = duration;
    e.rootImmuneTime = 0;
    this.events.emit('statusApplied', { enemyId: e.id, status: 'rooted' });
  }

  private applyBurn(e: EnemyState, baseDps: number): void {
    if (baseDps <= 0) return;
    const dps = baseDps * this.mods.burnDpsMult;
    if (e.burnTime <= 0) {
      e.burnTickTimer = STATUS.burning.tickInterval;
      e.burnDps = dps;
    } else {
      e.burnDps = Math.max(e.burnDps, dps);
    }
    e.burnTime = STATUS.burning.duration;
    this.events.emit('statusApplied', { enemyId: e.id, status: 'burning' });
  }

  private applyChill(e: EnemyState): void {
    if (e.chillImmuneTime > 0 || e.frozenTime > 0) return;
    e.chillStacks++;
    if (e.chillStacks >= this.mods.chillMaxStacks) {
      e.chillStacks = 0;
      e.chillTime = 0;
      e.frozenTime = STATUS.frozen.duration;
      this.events.emit('statusApplied', { enemyId: e.id, status: 'frozen' });
    } else {
      e.chillTime = STATUS.chilled.duration;
      this.events.emit('statusApplied', { enemyId: e.id, status: 'chilled' });
    }
  }

  /** Element multiplier from the enemy's resistances (1 = neutral, 0 = immune, >1 = weakness). */
  damageMultiplier(e: EnemyState, element: Element): number {
    let r = ENEMIES[e.type].resist[element] ?? 0;
    if (element === 'physical' && r > 0 && this.mods.physicalIgnoresResist) r = 0;
    return Math.max(0, 1 - r);
  }

  private dealDamage(
    e: EnemyState,
    amount: number,
    element: Element,
    opts: { crit?: boolean; reaction?: ReactionId; dot?: boolean; towerId?: number; towerType?: TowerId; hero?: boolean },
  ): void {
    if (!e.alive || amount <= 0) return;
    let dmg = amount;
    const eff = this.damageMultiplier(e, element);
    if (eff <= 0) {
      this.events.emit('enemyHit', { enemyId: e.id, x: e.x, y: e.y, damage: 0, element, crit: false, reaction: opts.reaction, dot: !!opts.dot, towerId: opts.towerId, eff: 0 });
      return;
    }
    dmg *= eff;
    if (e.fragileTime > 0) dmg *= 1 + STATUS.fragile.damageTakenBonus;
    const final = Math.max(1, Math.round(dmg));
    e.hp -= final;
    if (opts.towerType) this.state.stats.damageByTower[opts.towerType] += final;
    if (opts.hero) this.state.stats.heroDamage += final;
    this.events.emit('enemyHit', {
      enemyId: e.id,
      x: e.x,
      y: e.y,
      damage: final,
      element,
      crit: !!opts.crit,
      reaction: opts.reaction,
      dot: !!opts.dot,
      towerId: opts.towerId,
      eff,
    });
    if (e.hp <= 0) this.kill(e);
  }

  // ───────────────────────────── combo, economy, bookkeeping ─────────────────────────────

  private bumpCombo(): number {
    const c = this.state.combo;
    c.count = c.count > 0 && c.timer > 0 ? c.count + 1 : 1;
    c.mult = Math.min(COMBO.maxMult + this.mods.comboMaxBonus, 1 + COMBO.perReaction * (c.count - 1));
    c.timer = COMBO.window + this.mods.comboWindowBonus;
    this.state.stats.bestCombo = Math.max(this.state.stats.bestCombo, c.count);
    return c.mult;
  }

  private updateCombo(): void {
    const c = this.state.combo;
    if (c.timer <= 0) return;
    c.timer -= DT;
    if (c.timer <= 0) {
      this.events.emit('comboEnded', { count: c.count });
      c.timer = 0;
      c.count = 0;
      c.mult = 1;
    }
  }

  private addGold(delta: number): void {
    if (delta === 0) return;
    this.state.gold += delta;
    this.events.emit('goldChanged', { gold: this.state.gold, delta });
  }

  private cleanup(): void {
    const s = this.state;
    if (s.enemies.some((e) => !e.alive)) {
      s.enemies = s.enemies.filter((e) => {
        if (!e.alive) this.enemyById.delete(e.id);
        return e.alive;
      });
    }
    if (s.projectiles.some((p) => !p.alive)) s.projectiles = s.projectiles.filter((p) => p.alive);
  }

  private checkVictory(): void {
    const s = this.state;
    if (s.result !== 'playing') return;
    if (s.wave === s.totalWaves && s.wavePhase === 'done' && s.enemies.length === 0) {
      s.result = 'won';
      this.events.emit('gameOver', { won: true, stars: this.stars() });
    }
  }
}
