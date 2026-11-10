import * as Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../../data/config';
import { ECONOMY } from '../../data/economy';
import { ENEMIES, type EnemyId } from '../../data/enemies';
import { ELEMENTS, type Element } from '../../data/elements';
import { REACTIONS } from '../../data/reactions';
import { STAGE_ORDER, type StageId } from '../../data/stages';
import { getSave } from '../../meta/save';
import { MAX_LEVEL, TOWERS } from '../../data/towers';
import { FixedClock } from '../../sim/clock';
import { Simulation } from '../../sim/simulation';
import { playSfx } from '../audio/sfx';
import { PAL } from '../art/palette';
import { BoonPicker } from '../battle/BoonPicker';
import { BuildMenu } from '../battle/BuildMenu';
import { BOONS } from '../../data/boons';
import { CatalyzeButton } from '../battle/CatalyzeButton';
import { HeroView, SummonView } from '../battle/HeroView';
import { HEROES, type HeroClass } from '../../data/heroes';
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

const HERO_COLORS: Record<HeroClass, number> = { mage: 0xb57bff, knight: 0x6a9aff, priest: 0xffd34d, druid: 0x6ad44a };

const a11yDown = (id: number) => (id === -1 ? 'HERÓI CAIU!' : 'URSO CAIU!');

export interface BattleData {
  stage?: StageId;
  seed?: number;
  hero?: HeroClass;
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
  private hero!: HeroView;
  private catalyzeBtn!: CatalyzeButton;
  private summons: SummonView[] = [];
  private picker: BoonPicker | null = null;
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
  private stageId: StageId = 'v1';
  private heroClass: HeroClass = 'mage';
  private seenTypes = new Set<EnemyId>();

  private toMap(): void {
    this.cameras.main.fadeOut(220, 11, 7, 22);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('WorldMap'));
  }

  /** First time a specialist enemy shows up in a match: a short card with its weaknesses. */
  private introduceEnemy(type: EnemyId): void {
    if (this.seenTypes.has(type)) return;
    this.seenTypes.add(type);
    const def = ENEMIES[type];
    const entries = Object.entries(def.resist) as [Element, number][];
    if (entries.length === 0 && !def.rootImmune && !def.flying) return;
    const parts: string[] = [];
    for (const [el, r] of entries) {
      const name = ELEMENTS[el].name;
      if (r >= 1) parts.push(`imune a ${name}`);
      else if (r > 0) parts.push(`resiste a ${name}`);
      else parts.push(`fraco a ${name}`);
    }
    if (def.rootImmune) parts.push('não pode ser enraizado');
    if (def.flying) parts.push('voa (Vinha não alcança)');
    this.fx.enemyCard(def.name, parts.join(' • '));
  }

  constructor() {
    super('Battle');
  }

  create(data: BattleData): void {
    const seed = data.seed ?? Math.floor(Math.random() * 1e9);
    this.stageId = data.stage ?? 'v1';
    this.heroClass = data.hero ?? getSave().data.hero ?? 'mage';
    this.sim = new Simulation({ stage: this.stageId, seed, modifiers: { heroClass: this.heroClass } });
    this.seenTypes = new Set();
    this.picker = null;
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
    this.hero = new HeroView(this, this.sim.state.hero, this.sim.mods.heroAffinity);
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
    // Skill indicator (heroes cast on their own).
    const cls = this.sim.mods.heroClass;
    const skillColor = cls === 'mage' ? ELEMENTS[this.sim.mods.heroAffinity].color : HERO_COLORS[cls];
    this.catalyzeBtn = new CatalyzeButton(
      this,
      GAME_WIDTH - 82,
      GAME_HEIGHT - 76,
      skillColor,
      HEROES[cls].skill.name,
      cls === 'mage' ? 'icon_catalyze' : HEROES[cls].texture,
    );
    this.summons = this.sim.state.summons.map((s) => new SummonView(this, s));
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
        if (this.paused || this.ended || this.picker) return;
        const tower = this.sim.towerAt(i);
        playSfx('ui', 0.8);
        if (tower) this.menu.openTower(tower);
        else this.menu.openSlot(i);
      });
    });
    // Tap on free ground: closes an open menu, otherwise walks the hero there.
    this.input.on('pointerdown', (p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (over.length > 0 || this.paused || this.ended || this.picker) return;
      if (this.menu.isOpen) {
        this.menu.close();
        return;
      }
      if (p.worldY < 110 || p.worldY > GAME_HEIGHT - 110) return; // HUD bars
      this.sim.moveHero(p.worldX, p.worldY);
      const h = this.sim.state.hero;
      this.hero.showMarker(h.targetX, h.targetY);
    });
  }

  private setPaused(on: boolean): void {
    if (this.ended) return;
    this.paused = on;
    this.menu.close();
    if (on) {
      this.pausePanel = new PausePanel(this, {
        onResume: () => this.setPaused(false),
        onRestart: () => this.scene.restart({ stage: this.stageId, hero: this.heroClass }),
        onExit: () => this.toMap(),
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
      this.fx.damage(p.x, p.y, h.damage, h.element, { crit: h.crit, reaction: h.reaction, eff: h.eff });
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

    // The loop made visible: every reaction sends an orb to the Catalisar button.
    ev.on('reactionTriggered', (r) => {
      if (this.sim.state.hero.catalyzeCooldown <= 0) return;
      this.fx.orbTo(r.x, r.y - 30, this.catalyzeBtn.x, this.catalyzeBtn.y, REACTIONS[r.reaction].color, () => {
        this.catalyzeBtn.bump();
        playSfx('cd_tick');
      });
    });

    ev.on('heroFired', () => {
      this.hero.shoot();
      playSfx('hero_shoot');
    });

    ev.on('boonChosen', (b) => {
      const def = BOONS[b.id];
      this.fx.bigBanner(def.name.toUpperCase(), '#f3e9ff', 50, 700, true);
      this.fx.burst(this.hero.x, this.hero.y - 60, def.color, 30);
      this.fx.shockwave(this.hero.x, this.hero.y - 40, def.color, 2.4, 600);
    });

    // Non-mage class skills (the mage's Catalisar has its own handler below).
    ev.on('heroSkill', (sk) => {
      this.catalyzeBtn.bump();
      if (sk.cls === 'mage') return;
      const color = HERO_COLORS[sk.cls];
      this.hero.cast();
      this.fx.shockwave(sk.x, sk.y - 20, color, sk.radius / 54, 450);
      this.fx.burst(sk.x, sk.y - 40, color, 24);
      this.fx.popLabel(sk.x, sk.y - 120, `${HEROES[sk.cls].skill.name.toUpperCase()}!`, `#${color.toString(16).padStart(6, '0')}`);
      playSfx(sk.cls === 'priest' ? 'upgrade' : 'catalyze', sk.cls === 'knight' ? 0.8 : 1);
      if (sk.cls === 'knight') this.shake(150, 0.006);
      if (sk.cls === 'priest') {
        // Sparkle on each blessed tower.
        for (const t of this.sim.state.towers) if (t.blessTime > 0) this.fx.burst(t.x, t.y - 30, 0xffe680, 10);
      }
      vibrate(20);
    });

    // Melee: the knight / bear land hits; they fall and come back.
    const unitOf = (id: number) => (id === -1 ? this.hero : this.summons[this.sim.state.summons.findIndex((s) => s.id === id)]);
    ev.on('blockerAttack', (a) => {
      unitOf(a.blockerId)?.swing();
      playSfx('hero_swing');
    });
    ev.on('blockerDied', (d) => {
      this.fx.burst(d.x, d.y - 40, 0xffffff, 14);
      this.fx.popLabel(d.x, d.y - 100, a11yDown(d.blockerId), PAL.redCss);
      playSfx('leak', 1.4);
    });
    ev.on('blockerRespawn', (r) => {
      const u = unitOf(r.blockerId);
      if (u) this.fx.shockwave(u.x, u.y, 0xffffff, 1.2);
      playSfx('ready');
    });

    ev.on('catalyzed', (c) => {
      const color = ELEMENTS[c.element].color;
      this.hero.cast();
      this.fx.shockwave(c.x, c.y - 20, color, c.radius / 54, 450);
      this.fx.shockwave(c.x, c.y - 20, 0xffffff, (c.radius / 54) * 0.7, 300);
      this.fx.burst(c.x, c.y - 40, color, 30);
      playSfx('catalyze');
      this.shake(200, 0.008);
      this.hitstopMs = 90;
      vibrate(30);
      if (c.reactions >= 3) {
        this.fx.bigBanner(`CATÁLISE ×${c.reactions}!`, '#ffe34d', 64, 500, true);
        vibrate([40, 40, 80]);
      }
    });

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
      if (l.livesLost <= 0) return; // Gosma Dourada got away: no harm done
      playSfx('leak');
      this.shake(220, 0.012);
      vibrate(80);
      this.map.crystal.setTint(PAL.red);
      this.time.delayedCall(160, () => this.map.crystal.clearTint());
      this.fx.burst(this.map.crystal.x, this.map.crystal.y, PAL.red, 16);
      this.hud.floatText(this.map.crystal.x + 70, this.map.crystal.y - 60, `-${l.livesLost}`, PAL.redCss);
    });

    ev.on('enemySpawned', (s) => {
      this.introduceEnemy(s.type);
      if (s.type === 'treasure') {
        this.fx.bigBanner('GOSMA DOURADA!', PAL.goldCss, 50, 600);
        playSfx('coin', 1.3);
      }
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

    ev.on('zoneCreated', (z) => this.fx.fireZone(z.x, z.y, z.radius, z.duration));

    ev.on('towerAbility', (a) => {
      const t = this.sim.getTower(a.towerId);
      const name = t ? TOWERS[t.type].abilityInfo.name.toUpperCase() : '';
      const color = t ? `#${ELEMENTS[TOWERS[t.type].element].color.toString(16).padStart(6, '0')}` : '#ffffff';
      if (a.ability === 'entangle') {
        this.fx.burst(a.x, a.y - 10, 0x6ad44a, 16);
        this.fx.shockwave(a.x, a.y, 0x6ad44a, 1.4);
      }
      if (a.ability === 'supercharge') this.shake(90, 0.003);
      if (t) this.fx.popLabel(t.x, t.y - 110, `${name}!`, color);
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
      if (t.level >= MAX_LEVEL) {
        const info = TOWERS[t.type].abilityInfo;
        this.fx.bigBanner(`HABILIDADE\n${info.name.toUpperCase()}`, PAL.goldCss, 52, 700, true);
        this.fx.shockwave(t.x, t.y, ELEMENTS[TOWERS[t.type].element].color, 2.2, 600);
        playSfx('ready');
        vibrate([30, 30, 60]);
      }
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
      getSave().recordResult(this.stageId, g.won, g.stars);
      const isRift = this.stageId === 'rift';
      const riftWave = g.won ? this.sim.state.totalWaves : Math.max(0, this.sim.state.wave - 1);
      const rift = isRift ? { wave: riftWave, record: getSave().recordRift(riftWave), best: getSave().data.riftBest } : undefined;
      const next = this.stageId === 'rift' ? undefined : STAGE_ORDER[STAGE_ORDER.indexOf(this.stageId) + 1];
      const onNext = g.won && next ? () => this.scene.restart({ stage: next, hero: this.heroClass }) : undefined;
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
            bestCatalyze: this.sim.state.stats.bestCatalyzeReactions,
            skillName: HEROES[this.heroClass].skill.name,
            skillCasts: this.sim.state.stats.skillCasts,
            boons: this.sim.state.boons.length,
            rift,
          },
          { onReplay: () => this.scene.restart({ stage: this.stageId, hero: this.heroClass }), onMap: () => this.toMap(), onNext },
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
    // A pending Bênção pauses the match until the player picks a card.
    if (!this.picker && !this.paused && !this.ended && this.sim.state.boonOffers.length > 0) {
      this.menu.close();
      this.picker = new BoonPicker(this, this.sim.state.boonOffers[0]!, (i) => {
        this.sim.chooseBoon(i);
        this.picker = null;
      });
    }
    if (!this.paused && !this.picker && this.sim.state.result === 'playing') {
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
          this.hero.snapshot(this.sim.state.hero);
          this.sim.state.summons.forEach((sm, i) => this.summons[i]?.snapshot(sm));
          this.projectiles.snapshot(this.sim);
          this.sim.step();
          if (this.sim.state.result !== 'playing') break;
        }
      }
    }
    const alpha = this.clock.alpha;
    this.enemies.sync(this.sim, alpha, dtMs);
    this.projectiles.sync(this.sim, alpha);
    this.hero.sync(this.sim.state.hero, alpha, dtMs);
    this.sim.state.summons.forEach((sm, i) => this.summons[i]?.sync(sm, alpha, dtMs));
    this.catalyzeBtn.update(this.sim.state.hero);
    this.hud.update(this.sim);
    this.menu.refresh();
    this.debug.update();
  }
}
