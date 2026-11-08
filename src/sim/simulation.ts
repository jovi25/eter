import { SIM_DT } from '../data/config';
import { ECONOMY, DIFFICULTY, STARS, WAVE_TIMING } from '../data/economy';
import { ENEMIES, type EnemyId } from '../data/enemies';
import type { Element } from '../data/elements';
import type { Vec2 } from '../data/maps';
import { MAPS } from '../data/maps';
import { defaultModifiers, type SimModifiers } from '../data/modifiers';
import { COMBO, REACTION_TABLE, REACTIONS, type AuraKey, type ReactionId } from '../data/reactions';
import { STAGES, type StageDef, type StageId } from '../data/stages';
import { STATUS } from '../data/statuses';
import { TOWERS, type TowerId, type TowerLevel } from '../data/towers';
import { EventBus, type SimEvents } from './events';
import { Path } from './path';
import { Rng } from './rng';
import type { EnemyState, HitSpec, ProjectileState, SimState, TowerState } from './types';

export interface SimOptions {
  stage: StageId;
  seed: number;
  modifiers?: Partial<SimModifiers>;
}

export interface SpawnOptions {
  dist?: number;
  wave?: number;
  goldMult?: number;
  hp?: number; // override (tests)
}

interface PendingSpawn {
  at: number; // seconds after wave start
  enemy: EnemyId;
}

const DT = SIM_DT;

/**
 * The whole match, as pure data + rules. No Phaser, no clocks, no Math.random:
 * call step() at a fixed rate; same seed + same commands → same result.
 */
export class Simulation {
  readonly state: SimState;
  readonly events = new EventBus<SimEvents>();
  readonly path: Path;
  readonly stage: StageDef;
  readonly slots: readonly Vec2[];
  readonly mods: SimModifiers;

  private readonly rng: Rng;
  private nextId = 1;
  private pending: PendingSpawn[] = [];
  private waveStartTime = 0;
  private readonly enemyById = new Map<number, EnemyState>();
  private readonly aliveByWave = new Map<number, number>();
  private readonly clearedWaves = new Set<number>();
  private readonly tmp: Vec2 = { x: 0, y: 0 };

  constructor(opts: SimOptions) {
    this.stage = STAGES[opts.stage];
    const map = MAPS[this.stage.map];
    this.path = new Path(map.path);
    this.slots = map.slots;
    this.mods = { ...defaultModifiers(), ...opts.modifiers };
    this.rng = new Rng(opts.seed);
    this.state = {
      tick: 0,
      time: 0,
      seed: opts.seed,
      gold: ECONOMY.startGold,
      lives: ECONOMY.startLives,
      wave: 0,
      totalWaves: this.stage.waves.length,
      wavePhase: 'prep',
      nextWaveTimer: WAVE_TIMING.firstWaveDelay,
      result: 'playing',
      enemies: [],
      towers: [],
      projectiles: [],
      combo: { count: 0, mult: 1, timer: 0 },
      stats: {
        reactions: { wildfire: 0, melt: 0, thornfrost: 0, shatter: 0 },
        damageByTower: { archer: 0, brazier: 0, frost: 0, vine: 0, storm: 0 },
        kills: 0,
        livesLost: 0,
      },
    };
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
    return next ? next.cost : null;
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
    const tower: TowerState = { id: this.nextId++, slot, type, level: 1, x: pos.x, y: pos.y, cooldown: 0, invested: cost };
    s.towers.push(tower);
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

  // ───────────────────────────── main loop ─────────────────────────────

  /** Advance exactly one fixed tick. */
  step(): void {
    const s = this.state;
    if (s.result !== 'playing') return;
    s.tick++;
    s.time += DT;
    this.updateWaves();
    this.updateEnemies();
    this.updateTowers();
    this.updateProjectiles();
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
      for (let i = 0; i < g.count; i++) this.pending.push({ at: (g.delay ?? 0) + i * g.interval, enemy: g.enemy });
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
      this.spawnEnemy(p.enemy, { wave: s.wave });
    }
    if (this.pending.length === 0) {
      if (s.wave < s.totalWaves) {
        s.wavePhase = 'countdown';
        s.nextWaveTimer = WAVE_TIMING.timeBetweenWaves;
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
    const pos = this.path.pointAt(dist, this.tmp);
    const e: EnemyState = {
      id: this.nextId++,
      type,
      wave,
      hp,
      maxHp: hp,
      dist,
      x: pos.x,
      y: pos.y,
      alive: true,
      isBoss: !!def.boss,
      flying: def.flying,
      gold: Math.round(def.gold * (opts.goldMult ?? 1)),
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
      if (e.rootTime > 0 || e.frozenTime > 0) continue;
      const def = ENEMIES[e.type];
      const slow = e.chillStacks > 0 && e.chillTime > 0 ? STATUS.chilled.slow : 0;
      e.dist += def.speed * (1 - slow) * DT;
      this.path.pointAt(e.dist, this.tmp);
      e.x = this.tmp.x;
      e.y = this.tmp.y;
      if (e.dist >= this.path.length) this.leak(e);
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
    this.addGold(e.gold);
    this.events.emit('enemyKilled', { enemyId: e.id, type: e.type, x: e.x, y: e.y, gold: e.gold, isBoss: e.isBoss });
    this.onEnemyGone(e);
  }

  private onEnemyGone(e: EnemyState): void {
    this.aliveByWave.set(e.wave, (this.aliveByWave.get(e.wave) ?? 1) - 1);
    this.checkWaveCleared(e.wave);
  }

  // ───────────────────────────── towers & projectiles ─────────────────────────────

  levelOf(t: TowerState): TowerLevel {
    return TOWERS[t.type].levels[t.level - 1]!;
  }

  private canTarget(t: TowerState, e: EnemyState): boolean {
    if (!e.alive) return false;
    if (e.flying && !TOWERS[t.type].hitsFlying && !(t.type === 'vine' && this.mods.vineHitsFlying)) return false;
    return true;
  }

  /** "First" targeting: the enemy in range that walked the furthest. */
  findTarget(t: TowerState): EnemyState | null {
    const range = this.levelOf(t).range;
    const r2 = range * range;
    let best: EnemyState | null = null;
    for (const e of this.state.enemies) {
      if (!this.canTarget(t, e)) continue;
      const dx = e.x - t.x;
      const dy = e.y - t.y;
      if (dx * dx + dy * dy > r2) continue;
      if (!best || e.dist > best.dist) best = e;
    }
    return best;
  }

  private updateTowers(): void {
    for (const t of this.state.towers) {
      if (t.cooldown > 0) t.cooldown = Math.max(0, t.cooldown - DT);
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
    const count = lvl.chainCount ?? 1;
    const jump2 = (lvl.chainRange ?? 0) ** 2;
    const base = lvl.damage * this.mods.towerDamageMult[t.type] * this.mods.elementDamageMult[def.element];
    const points = [{ x: t.x, y: t.y }];
    const hit = new Set<number>();
    let current: EnemyState | null = target;
    for (let i = 0; i < count && current; i++) {
      hit.add(current.id);
      const from: EnemyState = current;
      points.push({ x: from.x, y: from.y });
      this.applyHit(from, {
        element: def.element,
        damage: base * Math.pow(lvl.chainFalloff ?? 1, i),
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

  private fire(t: TowerState, target: EnemyState): void {
    const def = TOWERS[t.type];
    const lvl = this.levelOf(t);
    if (def.projectileSpeed <= 0) {
      this.fireChain(t, target);
      return;
    }
    const crit = lvl.critChance ? this.rng.chance(lvl.critChance) : false;
    const damage =
      lvl.damage * this.mods.towerDamageMult[t.type] * this.mods.elementDamageMult[def.element] * (crit ? (lvl.critMult ?? 2) : 1);
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
      alive: true,
    };
    this.state.projectiles.push(p);
    t.cooldown = 1 / lvl.rate;
    this.events.emit('towerFired', { towerId: t.id, targetId: target.id });
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
    };
    if (target) this.applyHit(target, base);
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
      mult = REACTIONS[found.reaction].damageMult * comboMult;
      this.state.stats.reactions[found.reaction]++;
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
    });
    if (found) this.applyReactionEffects(e, found.reaction);
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

  private applyReactionEffects(e: EnemyState, reaction: ReactionId): void {
    const def = REACTIONS[reaction];
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
      if (!e.flying) this.root(e, (STATUS.rooted.duration + this.mods.rootDurationBonus) * def.rootDurationMult);
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
        this.applyChill(e);
        break;
      case 'nature':
        if (hit.rootChance && this.canBeRooted(e) && this.rng.chance(hit.rootChance)) {
          this.root(e, STATUS.rooted.duration + this.mods.rootDurationBonus);
        }
        break;
      case 'physical':
      case 'lightning':
      case 'arcane':
        break;
    }
  }

  canBeRooted(e: EnemyState): boolean {
    return !e.flying && e.rootTime <= 0 && e.rootImmuneTime <= 0;
  }

  private root(e: EnemyState, duration: number): void {
    e.rootTime = duration;
    e.rootImmuneTime = 0;
    this.events.emit('statusApplied', { enemyId: e.id, status: 'rooted' });
  }

  private applyBurn(e: EnemyState, dps: number): void {
    if (dps <= 0) return;
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

  private dealDamage(
    e: EnemyState,
    amount: number,
    element: Element,
    opts: { crit?: boolean; reaction?: ReactionId; dot?: boolean; towerId?: number; towerType?: TowerId },
  ): void {
    if (!e.alive || amount <= 0) return;
    let dmg = amount;
    if (element === 'physical' && !this.mods.physicalIgnoresResist) dmg *= 1 - ENEMIES[e.type].physicalResist;
    if (e.fragileTime > 0) dmg *= 1 + STATUS.fragile.damageTakenBonus;
    const final = Math.max(1, Math.round(dmg));
    e.hp -= final;
    if (opts.towerType) this.state.stats.damageByTower[opts.towerType] += final;
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
    });
    if (e.hp <= 0) this.kill(e);
  }

  // ───────────────────────────── combo, economy, bookkeeping ─────────────────────────────

  private bumpCombo(): number {
    const c = this.state.combo;
    c.count = c.count > 0 && c.timer > 0 ? c.count + 1 : 1;
    c.mult = Math.min(COMBO.maxMult, 1 + COMBO.perReaction * (c.count - 1));
    c.timer = COMBO.window;
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
