import * as Phaser from 'phaser';
import { FUSIONS } from '../../data/fusions';
import { GateView, ShieldLayer } from '../battle/RegionTwoView';
import { MAPS } from '../../data/maps';
import { ScrollHint } from '../battle/ScrollHint';
import { asUi } from '../ui/uiLayer';
import { matchXp, SKILL2, unlockAt } from '../../data/talents';
import { economyOn, fitCamera, frameCap } from '../perf';
import { quality } from '../quality';
import { GAME_HEIGHT, GAME_WIDTH } from '../../data/config';
import { ECONOMY } from '../../data/economy';
import { ENEMIES, type EnemyId } from '../../data/enemies';
import { ELEMENTS, type Element } from '../../data/elements';
import { REACTION_IDS, REACTIONS } from '../../data/reactions';
import { regionOf, STAGE_ORDER, type CampaignStageId, type StageId } from '../../data/stages';
import { matchCoins } from '../../data/relics';
import { getSave } from '../../meta/save';
import { MAX_LEVEL, TOWER_IDS, TOWERS } from '../../data/towers';
import { FixedClock } from '../../sim/clock';
import { Simulation } from '../../sim/simulation';
import { playSfx } from '../audio/sfx';
import { playMusic, setMusicIntensity, type ThemeId } from '../audio/music';
import { PAL } from '../art/palette';
import { BoonPicker } from '../battle/BoonPicker';
import { BuildMenu } from '../battle/BuildMenu';
import { BOONS } from '../../data/boons';
import { CHALLENGES, challengeText, dailyScore, dailySetup, evaluateChallenges, type DailySetup } from '../../data/challenges';
import { CatalyzeButton } from '../battle/CatalyzeButton';
import { HeroView, SummonView } from '../battle/HeroView';
import { HEROES, type HeroClass } from '../../data/heroes';
import { EnemyLayer } from '../battle/EnemyLayer';
import { FxLayer } from '../battle/FxLayer';
import { Hud } from '../battle/Hud';
import { DEPTH } from '../battle/layers';
import { MapView, showRune } from '../battle/MapView';
import { RUNES } from '../../data/runes';
import { EVOLUTIONS } from '../../data/evolutions';
import { EndPanel, PausePanel, StatsPanel, type MatchReport } from '../battle/Panels';
import { ProjectileLayer } from '../battle/ProjectileLayer';
import { TowerLayer } from '../battle/TowerLayer';
import { DebugOverlay, logicMs } from '../DebugOverlay';
import { Tutorial } from '../battle/Tutorial';
import { getSettings, vibrate } from '../settings';
import { updateQuality } from '../quality';

const HITSTOP_MS = 70;
const HITSTOP_COOLDOWN_MS = 350;
const BOSS_SLOWMO = { factor: 0.2, ms: 500 };

const HERO_COLORS: Record<HeroClass, number> = { mage: 0xb57bff, knight: 0x6a9aff, priest: 0xffd34d, druid: 0x6ad44a };

const a11yDown = (id: number) => (id === -1 ? 'HERÓI CAIU!' : 'URSO CAIU!');

export interface BattleData {
  stage?: StageId;
  seed?: number;
  hero?: HeroClass;
  daily?: boolean; // desafio do dia: stage, hero, seed and starting boon come from the date
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
  private tutorial!: Tutorial;
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
  private daily: DailySetup | null = null;
  private altarOffer = false;

  private again(stage: StageId = this.stageId): BattleData {
    return this.daily ? { daily: true } : { stage, hero: this.heroClass };
  }
  private heroClass: HeroClass = 'mage';
  private seenTypes = new Set<EnemyId>();

  // ───────────────────────────── tutorial ─────────────────────────────

  /** Tips that belong to a stage show at its start; the rest wait for the moment they explain. */
  private setupTutorial(): void {
    this.tutorial = new Tutorial(this);
    this.events.once('shutdown', () => this.tutorial.destroy());
    const t = this.tutorial;
    const sim = this.sim;
    const slot = (i: number) => () => sim.slots[i] ?? null;
    switch (this.daily ? 'daily' : this.stageId) {
      case 'v1':
        t.request('build', slot(1));
        break;
      case 'v2':
        t.request('twoPaths', () => (this.map.portals[1] ? { x: this.map.portals[1].x, y: this.map.portals[1].y } : null));
        break;
      case 'v3':
        t.request('runes', () => sim.state.runes[0] ?? null);
        t.request('skill', () => ({ x: GAME_WIDTH - 82, y: GAME_HEIGHT - 76 + this.cameras.main.scrollY }));
        break;
      case 'v4':
        t.request('fewSlots');
        break;
      case 'rift':
        t.request('rift');
        break;
      case 'a1':
        t.request('scroll');
        break;
      case 'a2':
        t.request('gate', () => (sim.gateDef ? { x: sim.gateDef.x, y: sim.gateDef.y } : null));
        break;
    }
    const ev = sim.events;
    ev.on('towerBuilt', () => {
      t.request('elements');
      t.request('hero', () => ({ x: sim.state.hero.x, y: sim.state.hero.y - 40 }));
    });
    ev.on('reactionTriggered', (r) => {
      t.request('reaction', () => ({ x: r.x, y: r.y }));
      if (r.comboCount >= 3) t.request('combo');
    });
    ev.on('enemySpawned', (s) => {
      const def = ENEMIES[s.type];
      const where = () => {
        const e = sim.state.enemies.find((x) => x.id === s.enemyId);
        return e ? { x: e.x, y: e.y } : null;
      };
      if (s.isBoss) t.request('boss', where);
      else if (def.flying) t.request('flying', where);
      else if (Object.keys(def.resist).length > 0) t.request('resist', where);
    });
    ev.on('boonChosen', () => t.request('boon'));
    ev.on('shieldUp', (sh) => {
      const where = () => {
        const e = sim.state.enemies.find((x) => x.id === sh.enemyId);
        return e ? { x: e.x, y: e.y } : null;
      };
      t.request('shield', where);
    });
    ev.on('towerUpgraded', (u) => {
      if (u.level < MAX_LEVEL) return;
      const tw = sim.getTower(u.towerId);
      t.request('maxLevel', () => (tw ? { x: tw.x, y: tw.y } : null));
    });
  }

  /** State-based tips (checked every frame, cheap). */
  private checkTips(): void {
    const s = this.sim.state;
    const t = this.tutorial;
    if (s.wavePhase === 'countdown' && s.wave === 1) t.request('callWave', () => ({ x: this.stageId === 'rift' ? 222 : 290, y: GAME_HEIGHT - 58 + this.cameras.main.scrollY }));
    if (s.wave >= 2 && s.wavePhase !== 'prep') {
      const tw = s.towers.find((x) => x.level < MAX_LEVEL && (this.sim.upgradeCost(x) ?? Infinity) <= s.gold);
      if (tw) t.request('upgrade', () => ({ x: tw.x, y: tw.y }));
    }
    const altar = this.sim.altarCost();
    if (altar !== null && s.gold >= altar) t.request('altar', () => ({ x: 452, y: GAME_HEIGHT - 58 + this.cameras.main.scrollY }));
  }

  /** Rows for the stats screen. */
  private matchReport(): MatchReport {
    const s = this.sim.state;
    const damage = TOWER_IDS.map((id) => ({ label: TOWERS[id].name, value: Math.round(s.stats.damageByTower[id]), color: id === 'archer' ? 0xe8d6b0 : ELEMENTS[TOWERS[id].element].color }));
    damage.push({ label: HEROES[this.heroClass].name, value: Math.round(s.stats.heroDamage), color: HERO_COLORS[this.heroClass] });
    const reactions = REACTION_IDS.map((id) => ({ label: REACTIONS[id].name, value: s.stats.reactions[id], color: REACTIONS[id].color }));
    return { damage, reactions };
  }

  private toMap(): void {
    this.cameras.main.fadeOut(220, 11, 7, 22);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('WorldMap', { region: Math.max(0, regionOf(this.stageId)) }));
  }

  /** First time a specialist enemy shows up in a match: a short card with its weaknesses. */
  private introduceEnemy(type: EnemyId): void {
    if (this.seenTypes.has(type)) return;
    this.seenTypes.add(type);
    if (getSave().discover('enemies', type)) this.hud.floatText(GAME_WIDTH / 2, 250, 'Novo no Códice!', '#e0c8ff');
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
    fitCamera(this);
    frameCap(this, 'battle');
    quality.low = economyOn();
    this.daily = data.daily ? dailySetup(new Date()) : null;
    const seed = this.daily?.seed ?? data.seed ?? Math.floor(Math.random() * 1e9);
    this.stageId = this.daily?.stage ?? data.stage ?? 'v1';
    this.heroClass = this.daily?.hero ?? data.hero ?? getSave().data.hero ?? 'mage';
    // Relíquias and revealed Bênçãos count everywhere except the daily challenge (same for everyone).
    const save = getSave();
    this.sim = new Simulation({
      stage: this.stageId,
      seed,
      // Talents, level-5 skill and the Arcanista's weapon: also left out of the daily challenge.
      modifiers: { heroClass: this.heroClass, unlockedBoons: this.daily ? [] : [...save.data.unlockedBoons], ...(this.daily ? {} : save.heroMods(this.heroClass)) },
      relics: this.daily ? [] : save.loadout(),
    });
    if (this.daily) {
      // The daily run starts with one boon already in hand.
      this.sim.state.boonOffers.unshift([this.daily.boon]);
      this.sim.chooseBoon(0);
    }
    this.seenTypes = new Set();
    this.picker = null;
    this.altarOffer = false;
    playMusic(this.stageId as ThemeId);
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
    // Região 2: Comporta and boss shields.
    this.shields = new ShieldLayer(this, this.enemies);
    if (this.sim.gateDef) new GateView(this, this.sim, this.fx, () => !this.paused && !this.ended && !this.picker && !this.dragging);
    this.enemies.onBurning = (x, y) => this.fx.flame(x, y);
    this.hud = asUi(this, () => new Hud(this, {
      onSpeed: () => {
        this.speed = this.speed === 1 ? 2 : 1;
        this.hud.setSpeed(this.speed);
      },
      onPause: () => this.setPaused(true),
      onAltar:
        this.stageId === 'rift'
          ? () => {
              if (this.paused || this.ended || this.picker) return;
              if (this.sim.buyAltar()) this.altarOffer = true;
              else playSfx('error');
            }
          : undefined,
      onCallWave: () => {
        this.menu.close();
        this.sim.callNextWave();
      },
    }));
    this.menu = new BuildMenu(this, this.sim, {
      build: (slot, type) => this.sim.build(slot, type),
      upgrade: (id) => this.sim.upgrade(id),
      boost: (id) => this.sim.boost(id),
      evolve: (id, evo) => this.sim.evolve(id, evo),
      fuse: (id, partner) => this.sim.fuse(id, partner),
      sell: (id) => this.sim.sell(id),
      buildRune: (i, kind) => this.sim.buildRune(i, kind),
      sellRune: (i) => this.sim.sellRune(i),
    });
    // Skill indicator (heroes cast on their own).
    const cls = this.sim.mods.heroClass;
    const skillColor = cls === 'mage' ? ELEMENTS[this.sim.mods.heroAffinity].color : HERO_COLORS[cls];
    this.catalyzeBtn = asUi(this, () => new CatalyzeButton(
      this,
      GAME_WIDTH - 82,
      GAME_HEIGHT - 76,
      skillColor,
      HEROES[cls].skill.name,
      cls === 'mage' ? 'icon_catalyze' : HEROES[cls].texture,
    ));
    this.summons = this.sim.state.summons.map((s) => new SummonView(this, s));
    this.debug = asUi(this, () => new DebugOverlay(this, () => ({ tick: this.sim.state.tick, seed: this.sim.state.seed }), 8, GAME_HEIGHT - 150, DEPTH.debug));
    this.setupScroll();

    this.setupInput();
    this.wireEvents();
    this.setupTutorial();
    this.cameras.main.fadeIn(300, 11, 7, 22);
  }

  // ───────────────────────────── input ─────────────────────────────

  private setupInput(): void {
    // A tap counts only where it started (a release after a drag, or after closing a card, does nothing).
    this.input.on('pointerdown', (_p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      this.downOn = this.paused || this.ended || !!this.picker || !!this.tutorial?.blocking ? 'blocked' : (over[0] ?? null);
    });
    this.sim.slots.forEach((s, i) => {
      const zone = this.add.zone(s.x, s.y, 110, 110).setInteractive({ useHandCursor: true });
      zone.on('pointerup', (_p: Phaser.Input.Pointer, _x: number, _y: number, ev: Phaser.Types.Input.EventData) => {
        ev.stopPropagation();
        if (this.paused || this.ended || this.picker || this.dragging || this.downOn !== zone) return;
        const tower = this.sim.towerAt(i);
        if (tower && this.menu.pickPartner(tower)) return;
        playSfx('ui', 0.8);
        if (tower) this.menu.openTower(tower);
        else this.menu.openSlot(i);
      });
    });
    this.sim.state.runes.forEach((r, i) => {
      const zone = this.add.zone(r.x, r.y - 10, 84, 84).setInteractive({ useHandCursor: true });
      zone.on('pointerup', (_p: Phaser.Input.Pointer, _x: number, _y: number, ev: Phaser.Types.Input.EventData) => {
        ev.stopPropagation();
        if (this.paused || this.ended || this.picker || this.dragging || this.downOn !== zone) return;
        playSfx('ui', 0.9);
        this.menu.openRune(i);
      });
    });
    // Tap on free ground: closes an open menu, otherwise walks the hero there.
    this.input.on('pointerup', (p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (over.length > 0 || this.paused || this.ended || this.picker || this.dragging || this.downOn !== null) return;
      if (this.menu.isOpen) {
        this.menu.close();
        return;
      }
      const screenY = p.worldY - this.cameras.main.scrollY;
      if (screenY < 110 || screenY > GAME_HEIGHT - 110) return; // HUD bars
      this.sim.moveHero(p.worldX, p.worldY);
      const h = this.sim.state.hero;
      this.hero.showMarker(h.targetX, h.targetY);
    });
  }

  // ───────────────────────────── tall maps: drag to scroll ─────────────────────────────

  private shields!: ShieldLayer;
  private downOn: Phaser.GameObjects.GameObject | 'blocked' | null = null;
  private dragging = false;
  private dragFrom: { y: number; scroll: number } | null = null;
  private scrollMax = 0;
  private scrollHint: ScrollHint | null = null;

  private setupScroll(): void {
    const cam = this.cameras.main;
    this.dragging = false;
    this.dragFrom = null;
    this.scrollMax = Math.max(0, (MAPS[this.sim.stage.map].height ?? GAME_HEIGHT) - GAME_HEIGHT);
    this.scrollHint = null;
    if (this.scrollMax <= 0) {
      cam.scrollY = 0;
      return;
    }
    // Start looking at the crystal end, where the hero stands.
    this.scrollTo(this.sim.state.hero.y - GAME_HEIGHT * 0.55);
    this.scrollHint = asUi(this, () => new ScrollHint(this, (dir) => this.scrollTo(cam.scrollY + dir * GAME_HEIGHT * 0.6, true)));
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      this.dragging = false;
      this.dragFrom = { y: p.y, scroll: cam.scrollY };
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!p.isDown || !this.dragFrom || this.picker || this.ended) return;
      const dy = (p.y - this.dragFrom.y) / cam.zoom;
      if (!this.dragging && Math.abs(dy) > 14) this.dragging = true;
      if (this.dragging) this.scrollTo(this.dragFrom.scroll - dy);
    });
    // A drag ends after the taps of this release were ignored.
    this.input.on('pointerup', () => this.time.delayedCall(0, () => (this.dragging = false)));
  }

  scrollTo(y: number, smooth = false): void {
    const cam = this.cameras.main;
    const to = Phaser.Math.Clamp(y, 0, this.scrollMax);
    this.tweens.killTweensOf(cam);
    if (smooth) this.tweens.add({ targets: cam, scrollY: to, duration: 350, ease: 'Cubic.easeOut' });
    else cam.scrollY = to;
  }

  /** Bring a world point into view (used by tips). */
  focusOn(y: number): void {
    const cam = this.cameras.main;
    if (this.scrollMax <= 0) return;
    if (y < cam.scrollY + 160 || y > cam.scrollY + GAME_HEIGHT - 200) this.scrollTo(y - GAME_HEIGHT / 2);
  }

  private setPaused(on: boolean): void {
    if (this.ended) return;
    this.paused = on;
    this.menu.close();
    if (on) {
      this.pausePanel = asUi(this, () => new PausePanel(this, {
        onResume: () => this.setPaused(false),
        onRestart: () => this.scene.restart(this.again()),
        onExit: () => this.toMap(),
      }));
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
      if (getSave().discover('reactions', r.reaction)) {
        this.fx.bigBanner(`NOVA REAÇÃO!\n${REACTIONS[r.reaction].name}`, '#e0c8ff', 46, 900);
      }
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

    // Second skill (hero level 5).
    ev.on('heroSkill2', (sk) => {
      const color = sk.cls === 'mage' ? ELEMENTS[this.sim.mods.heroAffinity].color : HERO_COLORS[sk.cls];
      if (sk.drop) {
        // One hit of the Chuva Elemental.
        this.fx.shockwave(sk.x, sk.y - 10, color, 0.9, 300);
        this.fx.burst(sk.x, sk.y - 30, color, 8);
        return;
      }
      this.hero.cast();
      if (sk.radius > 0) this.fx.shockwave(sk.x, sk.y - 20, color, sk.radius / 54, 500);
      this.fx.popLabel(this.hero.x, this.hero.y - 140, `${SKILL2[sk.cls].name.toUpperCase()}!`, `#${color.toString(16).padStart(6, '0')}`);
      if (sk.cls === 'priest') this.fx.popLabel(this.hero.x, this.hero.y - 96, '+1 VIDA', '#9be89b');
      playSfx(sk.cls === 'priest' ? 'upgrade' : 'catalyze', 1.25);
      vibrate(20);
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
      this.fx.coinsTo(k.x, k.y - 20, this.hud.goldIconPos.x, this.hud.goldIconPos.y + this.cameras.main.scrollY, coins, () => {
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
      this.fx.bigBanner(`CHEFE MVP\n${ENEMIES[s.type].name.toUpperCase()}`, '#bff4ff', 52, 1300);
      playSfx('boss');
      this.shake(500, 0.008);
      vibrate([60, 60, 120]);
    });

    ev.on('shieldUp', (sh) => {
      const e = this.sim.state.enemies.find((x) => x.id === sh.enemyId);
      this.shields.up(sh.enemyId, sh.reaction, sh.hits, (e ? ENEMIES[e.type].radius : 44) * 1.3);
      const name = REACTIONS[sh.reaction].name;
      this.fx.bigBanner(`ESCUDO: ${name}`, `#${REACTIONS[sh.reaction].color.toString(16).padStart(6, '0')}`, 54, 1100);
      if (e) this.fx.shockwave(e.x, e.y - 30, REACTIONS[sh.reaction].color, 2.4, 600);
      playSfx('boss_cast');
    });
    ev.on('shieldHit', (sh) => {
      this.shields.setHits(sh.enemyId, sh.reaction, sh.left);
      this.fx.shockwave(sh.x, sh.y - 30, REACTIONS[sh.reaction].color, 1.6, 350);
      playSfx('reaction_melt', 1.3);
      vibrate(15);
    });
    ev.on('shieldBroken', (sh) => {
      this.shields.down(sh.enemyId);
      this.fx.bigBanner('ESCUDO QUEBRADO!', PAL.goldCss, 64, 900, true);
      for (let i = 0; i < 3; i++) this.fx.shockwave(sh.x, sh.y - 30, i % 2 ? 0xffffff : REACTIONS[sh.reaction].color, 1.8 + i, 500);
      this.fx.burst(sh.x, sh.y - 30, REACTIONS[sh.reaction].color, 30);
      this.shake(300, 0.01);
      playSfx('mvp', 1.3);
      vibrate([40, 30, 60]);
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
      if (t && !quality.low) this.fx.popLabel(t.x, t.y - 110, `${name}!`, color);
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

    ev.on('runeBuilt', (r) => {
      const st = this.sim.state.runes[r.index]!;
      showRune(this.map, this, r.index, st.x, st.y, r.kind);
      this.fx.burst(st.x, st.y - 30, RUNES[r.kind].color, 20);
      this.fx.shockwave(st.x, st.y, RUNES[r.kind].color, 2.6, 600);
      this.fx.popLabel(st.x, st.y - 100, RUNES[r.kind].name.toUpperCase(), '#ffffff');
      playSfx('upgrade', 1.25);
    });

    ev.on('runeSold', (r) => {
      const st = this.sim.state.runes[r.index]!;
      showRune(this.map, this, r.index, st.x, st.y, null);
      this.fx.coinsTo(st.x, st.y, this.hud.goldIconPos.x, this.hud.goldIconPos.y + this.cameras.main.scrollY, 3, () => this.hud.pulseGold());
      playSfx('sell');
    });

    ev.on('towerEvolved', (u) => {
      const t = this.sim.getTower(u.towerId);
      if (!t) return;
      const def = EVOLUTIONS[u.evo];
      this.towers.evolve(t);
      this.fx.burst(t.x, t.y - 30, def.color, 34);
      this.fx.shockwave(t.x, t.y, def.color, 3, 700);
      this.fx.bigBanner(`EVOLUÇÃO!\n${def.name.toUpperCase()}`, `#${def.color.toString(16).padStart(6, '0')}`, 54, 800, true);
      this.shake(220, 0.006);
      playSfx('mvp');
      vibrate([40, 30, 90]);
    });

    ev.on('towerUlt', (u) => {
      const def = EVOLUTIONS[u.evo];
      const t = this.sim.getTower(u.towerId);
      if (t) this.fx.popLabel(t.x, t.y - 120, `${def.name.toUpperCase()}!`, `#${def.color.toString(16).padStart(6, '0')}`);
      switch (def.ult?.kind) {
        case 'tomb':
          this.fx.shockwave(u.x, u.y, 0x9fe8ff, u.radius / 40, 700);
          for (const p of u.targets) this.fx.burst(p.x, p.y - 20, 0xd8f6ff, 10);
          this.shake(260, 0.007);
          playSfx('reaction_shatter');
          break;
        case 'meteor':
          this.fx.meteor(u.x, u.y, def.color, () => {
            this.fx.shockwave(u.x, u.y, 0xff7a2e, u.radius / 40, 500);
            this.fx.burst(u.x, u.y, 0xff5a1f, 30);
            this.fx.dust(u.x, u.y, 0x8a5a2a, 14);
            this.shake(240, 0.008);
            playSfx('reaction_wildfire');
          });
          break;
        case 'massRoot':
          this.fx.shockwave(u.x, u.y, 0x6ad44a, u.radius / 40, 650);
          for (const p of u.targets) this.fx.burst(p.x, p.y, 0x6ad44a, 8);
          playSfx('reaction_thornfrost');
          break;
        case 'skyStrike':
          for (const p of u.targets) this.fx.lightning([{ x: p.x + 20, y: p.y - 420 }, { x: p.x, y: p.y }]);
          this.shake(200, 0.006);
          playSfx('reaction_overload');
          break;
      }
    });

    ev.on('towerBoosted', (u) => {
      const t = this.sim.getTower(u.towerId);
      if (!t) return;
      this.towers.fired(t.id);
      this.fx.burst(t.x, t.y - 20, 0xffb36b, 18);
      this.fx.shockwave(t.x, t.y, 0xffb36b, 1.2);
      this.fx.popLabel(t.x, t.y - 110, `REFORÇO +${u.boost}`, '#ffd9a8');
      playSfx('upgrade', 1.15);
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

    ev.on('towerFused', (f) => {
      const t = this.sim.getTower(f.towerId);
      if (!t) return;
      const def = FUSIONS[f.fusion];
      this.towers.absorb(f.partnerId, t.x, t.y);
      this.map.slotImages[f.partnerSlot]?.setVisible(true);
      this.time.delayedCall(380, () => {
        this.towers.fuse(t);
        this.fx.burst(t.x, t.y - 30, def.color, 34);
        this.fx.shockwave(t.x, t.y, def.color, 3, 700);
        this.shake(220, 0.006);
      });
      this.fx.bigBanner(`FUSÃO!\n${def.name.toUpperCase()}`, `#${def.color.toString(16).padStart(6, '0')}`, 54, 800, true);
      playSfx('mvp');
      vibrate([40, 30, 90]);
    });

    ev.on('towerSold', (s) => {
      this.towers.remove(s.towerId);
      this.map.slotImages[s.slot]?.setVisible(true);
      const pos = this.sim.slots[s.slot]!;
      this.fx.coinsTo(pos.x, pos.y, this.hud.goldIconPos.x, this.hud.goldIconPos.y + this.cameras.main.scrollY, 3, () => this.hud.pulseGold());
      playSfx('sell');
    });

    ev.on('altarUsed', (a) => {
      this.fx.coinsTo(this.hud.goldIconPos.x, this.hud.goldIconPos.y + this.cameras.main.scrollY, 452, GAME_HEIGHT - 58 + this.cameras.main.scrollY, 5, () => undefined);
      this.hud.floatText(452, GAME_HEIGHT - 150, `-${a.cost}`, PAL.goldCss);
      playSfx('boon');
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
      const save = getSave();
      const isRift = this.stageId === 'rift';
      const firstWin = !isRift && !this.daily && g.won && save.stars(this.stageId as CampaignStageId) === 0;
      let newChallenges = 0;
      let firstDailyToday = false;
      let challenges: { text: string; done: boolean; fresh: boolean }[] | undefined;
      let daily: { score: number; best: number; record: boolean } | undefined;
      if (this.daily) {
        const score = dailyScore(this.sim.state);
        firstDailyToday = save.data.daily.key !== this.daily.key || save.data.daily.plays === 0;
        const record = save.recordDaily(this.daily.key, score);
        daily = { score, record, best: save.dailyBest(this.daily.key) };
      } else {
        save.recordResult(this.stageId, g.won, g.stars);
        if (this.stageId !== 'rift') {
          const id = this.stageId;
          const fresh = save.recordChallenges(id, evaluateChallenges(id, this.sim.state));
          newChallenges = fresh.filter(Boolean).length;
          const done = save.data.challenges[id] ?? [];
          challenges = CHALLENGES[id].map((c, i) => ({ text: challengeText(c), done: !!done[i], fresh: !!fresh[i] }));
        }
      }
      const riftWave = g.won ? this.sim.state.totalWaves : Math.max(0, this.sim.state.wave - 1);
      const rift = isRift ? { wave: riftWave, record: getSave().recordRift(riftWave), best: getSave().data.riftBest } : undefined;
      // Hero XP: waves cleared with this hero (+ a bonus for winning).
      const xp = matchXp(riftWave, g.won);
      const lv = save.addHeroXp(this.heroClass, xp);
      const unlocked = lv.after > lv.before ? unlockAt(this.heroClass, lv.after) : undefined;
      const heroXp = { name: HEROES[this.heroClass].name, gained: xp, level: lv.after, levelUp: lv.after > lv.before, unlock: unlocked };
      const coins = matchCoins({
        mode: this.daily ? 'daily' : isRift ? 'rift' : 'stage',
        won: g.won,
        stars: g.stars,
        firstWin,
        newChallenges,
        riftWave: rift?.wave ?? 0,
        firstDailyToday,
      });
      save.addCoins(coins);
      const next = this.stageId === 'rift' || this.daily ? undefined : STAGE_ORDER[STAGE_ORDER.indexOf(this.stageId) + 1];
      const onNext = g.won && next ? () => this.scene.restart(this.again(next)) : undefined;
      this.time.delayedCall(g.won ? 1400 : 700, () => {
        playSfx(g.won ? 'victory' : 'defeat');
        asUi(this, () => new EndPanel(
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
            challenges,
            daily,
            coins,
            heroXp,
          },
          { onStats: () => asUi(this, () => new StatsPanel(this, this.matchReport())), onReplay: () => this.scene.restart(this.again()), onMap: () => this.toMap(), onNext },
        ));
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
    const t0 = performance.now();
    const dtMs = Math.min(delta, 100);
    updateQuality(this.game, this.game.loop.actualFps, delta);
    // A pending Bênção pauses the match until the player picks a card.
    this.tutorial.update(dtMs, !this.picker && !this.paused && !this.ended);
    this.checkTips();
    if (!this.picker && !this.paused && !this.ended && !this.tutorial.blocking && this.sim.state.boonOffers.length > 0) {
      this.menu.close();
      const fromAltar = this.altarOffer;
      const cost = this.sim.rerollCost();
      this.picker = asUi(this, () => new BoonPicker(
        this,
        this.sim.state.boonOffers[0]!,
        (i) => {
          this.sim.chooseBoon(i);
          this.picker = null;
          this.altarOffer = false;
        },
        {
          title: fromAltar ? 'ALTAR DE ÉTER' : undefined,
          sub: fromAltar ? 'Sua oferenda foi aceita. Escolha 1 poder' : undefined,
          reroll: {
            cost,
            affordable: this.sim.state.gold >= cost,
            onReroll: () => {
              if (this.sim.rerollBoons()) {
                playSfx('coin', 0.8);
                this.picker?.destroy();
                this.picker = null; // a fresh picker opens next frame with the new cards
              }
            },
          },
        },
      ));
    }
    if (!this.paused && !this.picker && !this.tutorial.blocking && this.sim.state.result === 'playing') {
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
    // Music follows the action: calm between waves, fuller during a wave, driving on bosses / deep in the Fenda.
    const st = this.sim.state;
    const fighting = st.wavePhase === 'spawning' || st.enemies.length > 0;
    setMusicIntensity(!fighting ? 0 : st.enemies.some((e) => e.isBoss) || (this.stageId === 'rift' && st.wave >= 20) ? 2 : 1);

    const alpha = this.clock.alpha;
    this.enemies.sync(this.sim, alpha, dtMs);
    this.projectiles.sync(this.sim, alpha);
    this.hero.sync(this.sim.state.hero, alpha, dtMs);
    this.sim.state.summons.forEach((sm, i) => this.summons[i]?.sync(sm, alpha, dtMs));
    this.fx.update(dtMs);
    this.catalyzeBtn.update(this.sim.state.hero);
    this.hud.update(this.sim);
    this.shields.update(this.sim);
    this.scrollHint?.update(this.sim, this.cameras.main.scrollY);
    this.menu.refresh();
    logicMs.value = logicMs.value * 0.9 + (performance.now() - t0) * 0.1;
    this.debug.update();
  }
}
