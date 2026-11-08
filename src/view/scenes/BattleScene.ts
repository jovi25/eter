import * as Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../../data/config';
import { ECONOMY } from '../../data/economy';
import { ENEMIES } from '../../data/enemies';
import { ELEMENTS } from '../../data/elements';
import type { StageId } from '../../data/stages';
import { TOWERS } from '../../data/towers';
import { FixedClock } from '../../sim/clock';
import { Simulation } from '../../sim/simulation';
import { playSfx } from '../audio/sfx';
import { PAL } from '../art/palette';
import { BuildMenu } from '../battle/BuildMenu';
import { EnemyLayer } from '../battle/EnemyLayer';
import { FxLayer } from '../battle/FxLayer';
import { Hud } from '../battle/Hud';
import { DEPTH } from '../battle/layers';
import { MapView } from '../battle/MapView';
import { EndPanel, PausePanel } from '../battle/Panels';
import { ProjectileLayer } from '../battle/ProjectileLayer';
import { TowerLayer } from '../battle/TowerLayer';
import { DebugOverlay } from '../DebugOverlay';
import { getSettings, vibrate } from '../settings';

const HITSTOP_MS = 70;
const HITSTOP_COOLDOWN_MS = 350;
const BOSS_SLOWMO = { factor: 0.2, ms: 500 };

export interface BattleData {
  stage?: StageId;
  seed?: number;
}

/** One match: owns the simulation, steps it at a fixed rate and turns its events into visuals and sound. */
export class BattleScene extends Phaser.Scene {
  private sim!: Simulation;
  private clock!: FixedClock;
  private map!: MapView;
  private enemies!: EnemyLayer;
  private towers!: TowerLayer;
  private projectiles!: ProjectileLayer;
  private fx!: FxLayer;
  private hud!: Hud;
  private menu!: BuildMenu;
  private debug!: DebugOverlay;
  private pausePanel: PausePanel | null = null;

  private speed = 1;
  private paused = false;
  private hitstopMs = 0;
  private lastHitstopAt = -9999;
  private slowmoMs = 0;
  private bestCombo = 0;
  private totalReactions = 0;
  private ended = false;
  private dotAcc = new Map<number, { sum: number; shownAt: number }>();

  constructor() {
    super('Battle');
  }

  create(data: BattleData): void {
    const seed = data.seed ?? Math.floor(Math.random() * 1e9);
    this.sim = new Simulation({ stage: data.stage ?? 'v1', seed });
    this.clock = new FixedClock();
    this.speed = 1;
    this.paused = false;
    this.hitstopMs = 0;
    this.slowmoMs = 0;
    this.bestCombo = 0;
    this.totalReactions = 0;
    this.ended = false;
    this.dotAcc = new Map();
    this.pausePanel = null;
    this.tweens.timeScale = 1;

    this.map = new MapView(this, this.sim);
    this.enemies = new EnemyLayer(this);
    this.towers = new TowerLayer(this);
    this.projectiles = new ProjectileLayer(this);
    this.fx = new FxLayer(this);
    this.enemies.onBurning = (x, y) => this.fx.flame(x, y);
    this.hud = new Hud(this, {
      onSpeed: () => {
        this.speed = this.speed === 1 ? 2 : 1;
        this.hud.setSpeed(this.speed);
      },
      onPause: () => this.setPaused(true),
      onCallWave: () => {
        this.menu.close();
        this.sim.callNextWave();
      },
    });
    this.menu = new BuildMenu(this, this.sim, {
      build: (slot, type) => this.sim.build(slot, type),
      upgrade: (id) => this.sim.upgrade(id),
      sell: (id) => this.sim.sell(id),
    });
    this.debug = new DebugOverlay(this, () => ({ tick: this.sim.state.tick, seed: this.sim.state.seed }), 8, GAME_HEIGHT - 150, DEPTH.debug);

    this.setupInput();
    this.wireEvents();
    this.cameras.main.fadeIn(300, 11, 7, 22);
  }

  // ───────────────────────────── input ─────────────────────────────

  private setupInput(): void {
    this.sim.slots.forEach((s, i) => {
      const zone = this.add.zone(s.x, s.y, 110, 110).setInteractive({ useHandCursor: true });
      zone.on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, ev: Phaser.Types.Input.EventData) => {
        ev.stopPropagation();
        if (this.paused || this.ended) return;
        const tower = this.sim.towerAt(i);
        playSfx('ui', 0.8);
        if (tower) this.menu.openTower(tower);
        else this.menu.openSlot(i);
      });
    });
    this.input.on('pointerdown', (_p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (over.length === 0) this.menu.close();
    });
  }

  private setPaused(on: boolean): void {
    if (this.ended) return;
    this.paused = on;
    this.menu.close();
    if (on) {
      this.pausePanel = new PausePanel(this, {
        onResume: () => this.setPaused(false),
        onRestart: () => this.scene.restart({ stage: 'v1' }),
      });
    } else {
      this.pausePanel?.destroy();
      this.pausePanel = null;
    }
  }

  // ───────────────────────────── events → juice ─────────────────────────────

  private shake(ms: number, intensity: number): void {
    if (getSettings().shake) this.cameras.main.shake(ms, intensity);
  }

  private hitstop(): void {
    const now = this.time.now;
    if (now - this.lastHitstopAt < HITSTOP_COOLDOWN_MS) return;
    this.lastHitstopAt = now;
    this.hitstopMs = HITSTOP_MS;
  }

  private wireEvents(): void {
    const ev = this.sim.events;
    const head = (id: number, x: number, y: number) => this.enemies.headOf(id) ?? { x, y: y - 40 };

    ev.on('enemyHit', (h) => {
      const p = head(h.enemyId, h.x, h.y);
      if (h.dot) {
        // Burn ticks are summed and shown once per second per enemy, to keep the screen readable.
        const acc = this.dotAcc.get(h.enemyId) ?? { sum: 0, shownAt: 0 };
        acc.sum += h.damage;
        const now = this.time.now;
        if (now - acc.shownAt >= 1000) {
          this.fx.damage(p.x, p.y, acc.sum, h.element, { dot: true });
          acc.sum = 0;
          acc.shownAt = now;
        }
        this.dotAcc.set(h.enemyId, acc);
        return;
      }
      this.fx.damage(p.x, p.y, h.damage, h.element, { crit: h.crit, reaction: h.reaction });
      this.enemies.flash(h.enemyId);
      if (h.crit) this.fx.burst(p.x, p.y + 20, 0xffe34d, 6);
      else this.fx.hit(p.x, p.y + 20, ELEMENTS[h.element].color);
    });

    ev.on('reactionTriggered', (r) => {
      const p = head(r.enemyId, r.x, r.y);
      this.totalReactions++;
      this.bestCombo = Math.max(this.bestCombo, r.comboCount);
      this.fx.reaction(r.x, p.y, r.reaction, r.comboCount);
      this.hud.setCombo(r.comboCount, r.comboMult);
      playSfx(`reaction_${r.reaction}`, 1 + Math.min(r.comboCount - 1, 10) * 0.04);
      this.hitstop();
      if (r.reaction === 'wildfire' || r.reaction === 'shatter') this.shake(120, 0.004);
      if (r.comboCount >= 3) vibrate(15);
    });
    ev.on('comboEnded', () => this.hud.endCombo());

    ev.on('enemyKilled', (k) => {
      this.enemies.markDying(k.enemyId, 'kill');
      this.dotAcc.delete(k.enemyId);
      const p = head(k.enemyId, k.x, k.y);
      this.fx.dust(k.x, k.y - 10, 0xffffff, 8);
      this.fx.burst(p.x, p.y + 20, 0xffffff, 8);
      playSfx('kill');
      const coins = Math.min(4, Math.max(1, Math.round(k.gold / 6)));
      this.fx.coinsTo(k.x, k.y - 20, this.hud.goldIconPos.x, this.hud.goldIconPos.y, coins, () => {
        this.hud.pulseGold();
        playSfx('coin');
      });
      if (k.isBoss) this.onBossKilled(k.x, k.y);
    });

    ev.on('enemyLeaked', (l) => {
      this.enemies.markDying(l.enemyId, 'leak');
      playSfx('leak');
      this.shake(220, 0.012);
      vibrate(80);
      this.map.crystal.setTint(PAL.red);
      this.time.delayedCall(160, () => this.map.crystal.clearTint());
      this.fx.burst(this.map.crystal.x, this.map.crystal.y, PAL.red, 16);
      this.hud.floatText(this.map.crystal.x + 70, this.map.crystal.y - 60, `-${l.livesLost}`, PAL.redCss);
    });

    ev.on('enemySpawned', (s) => {
      if (!s.isBoss) return;
      this.fx.bigBanner(`CHEFE MVP\n${ENEMIES.herald.name.toUpperCase()}`, '#bff4ff', 52, 1300);
      playSfx('boss');
      this.shake(500, 0.008);
      vibrate([60, 60, 120]);
    });

    ev.on('bossAbility', (b) => {
      this.fx.shockwave(b.x, b.y - 30, 0x9ff3ff, 2.4, 600);
      this.fx.burst(b.x, b.y - 30, 0xbff4ff, 18);
      playSfx('boss_cast');
    });

    ev.on('towerFired', (f) => {
      this.towers.fired(f.towerId);
      const t = this.sim.getTower(f.towerId);
      if (t) playSfx(`shoot_${TOWERS[t.type].element as 'fire'}`);
    });

    ev.on('chainLightning', (l) => {
      const pts = l.points.map((p, i) => (i === 0 ? { x: p.x, y: p.y - 70 } : { x: p.x, y: p.y - 22 }));
      this.fx.lightning(pts);
    });

    ev.on('towerBuilt', (b) => {
      const t = this.sim.getTower(b.towerId)!;
      this.towers.add(t);
      this.map.slotImages[b.slot]?.setVisible(false);
      this.time.delayedCall(300, () => {
        this.fx.dust(t.x, t.y + 20, 0xd8c39a, 14);
        this.fx.shockwave(t.x, t.y + 10, ELEMENTS[TOWERS[t.type].element].color, 1.1);
      });
      playSfx('build');
      vibrate(15);
    });

    ev.on('towerUpgraded', (u) => {
      const t = this.sim.getTower(u.towerId)!;
      this.towers.upgrade(t);
      this.fx.burst(t.x, t.y - 20, PAL.gold, 20);
      this.fx.shockwave(t.x, t.y, PAL.gold, 1.2);
      playSfx('upgrade');
    });

    ev.on('towerSold', (s) => {
      this.towers.remove(s.towerId);
      this.map.slotImages[s.slot]?.setVisible(true);
      const pos = this.sim.slots[s.slot]!;
      this.fx.coinsTo(pos.x, pos.y, this.hud.goldIconPos.x, this.hud.goldIconPos.y, 3, () => this.hud.pulseGold());
      playSfx('sell');
    });

    ev.on('waveStarted', (w) => {
      this.fx.bigBanner(w.wave === this.sim.state.totalWaves ? 'ONDA FINAL' : `ONDA ${w.wave}`, PAL.uiText, 64, 500);
      playSfx('wave');
      if (w.bonus > 0) {
        this.hud.floatText(GAME_WIDTH / 2, GAME_HEIGHT - 150, `+${w.bonus} ouro`, PAL.goldCss);
        this.hud.pulseGold();
      }
    });

    ev.on('waveCleared', (w) => {
      this.hud.floatText(260, 110, `+${w.bonus} onda limpa`, PAL.goldCss);
    });

    ev.on('gameOver', (g) => {
      this.ended = true;
      this.menu.close();
      this.time.delayedCall(g.won ? 1400 : 700, () => {
        playSfx(g.won ? 'victory' : 'defeat');
        new EndPanel(
          this,
          {
            won: g.won,
            stars: g.stars,
            lives: this.sim.state.lives,
            maxLives: ECONOMY.startLives,
            reactions: this.totalReactions,
            bestCombo: this.bestCombo,
            seconds: this.sim.state.time,
            kills: this.sim.state.stats.kills,
          },
          { onReplay: () => this.scene.restart({ stage: 'v1' }) },
        );
      });
    });
  }

  private onBossKilled(x: number, y: number): void {
    this.slowmoMs = BOSS_SLOWMO.ms;
    this.tweens.timeScale = 0.4;
    this.time.delayedCall(BOSS_SLOWMO.ms, () => (this.tweens.timeScale = 1));
    this.fx.bigBanner('MVP!', PAL.goldCss, 120, 1200, true);
    for (let i = 0; i < 3; i++) {
      this.time.delayedCall(i * 120, () => {
        this.fx.shockwave(x, y - 40, i % 2 ? PAL.gold : 0xffffff, 2.5 + i, 700);
        this.fx.burst(x, y - 40, i % 2 ? PAL.gold : 0x9ff3ff, 30);
      });
    }
    playSfx('mvp');
    this.shake(600, 0.015);
    vibrate([100, 50, 100, 50, 200]);
  }

  // ───────────────────────────── loop ─────────────────────────────

  update(_time: number, delta: number): void {
    const dtMs = Math.min(delta, 100);
    if (!this.paused && this.sim.state.result === 'playing') {
      if (this.hitstopMs > 0) {
        this.hitstopMs -= dtMs;
      } else {
        let scale = this.speed;
        if (this.slowmoMs > 0) {
          this.slowmoMs -= dtMs;
          scale *= BOSS_SLOWMO.factor;
        }
        const steps = this.clock.advance((dtMs / 1000) * scale);
        for (let i = 0; i < steps; i++) {
          this.enemies.snapshot(this.sim);
          this.projectiles.snapshot(this.sim);
          this.sim.step();
          if (this.sim.state.result !== 'playing') break;
        }
      }
    }
    const alpha = this.clock.alpha;
    this.enemies.sync(this.sim, alpha, dtMs);
    this.projectiles.sync(this.sim, alpha);
    this.hud.update(this.sim);
    this.menu.refresh();
    this.debug.update();
  }
}
