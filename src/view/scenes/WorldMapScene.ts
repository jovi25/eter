import { dragonArt, isCreature } from '../art/creatures';
import { THREAT } from '../../data/threat';
import * as Phaser from 'phaser';
import { ENEMY_PIC } from '../../assets/manifest';
import { bakeInPlace } from '../ui/bake';
import { getSettings, setSetting } from '../settings';
import { refreshMusic } from '../audio/music';
import { economyButton } from '../battle/Panels';
import { menuTip, resetTips, tipSeen } from '../battle/Tutorial';
import { fitCamera, frameCap } from '../perf';
import { GAME_HEIGHT, GAME_WIDTH } from '../../data/config';
import type { EnemyId } from '../../data/enemies';
import { BOONS } from '../../data/boons';
import { playMusic, setMusicIntensity } from '../audio/music';
import { CHALLENGES, challengeText, clock, DAILY_TWISTS, dailySetup, TOTAL_CHALLENGES } from '../../data/challenges';
import { HERO_ORDER, HEROES } from '../../data/heroes';
import { regionOf, REGIONS, STAGE_ORDER, STAGES, type CampaignStageId, type StageId } from '../../data/stages';
import { ENEMIES } from '../../data/enemies';
import { REACTIONS } from '../../data/reactions';
import { getSave } from '../../meta/save';
import { playSfx } from '../audio/sfx';
import { PAL } from '../art/palette';
import { paintMapBackground, placeDecor } from '../battle/MapView';
import { Button, uiText } from '../ui/Button';
import { PACK } from '../../data/grimoire';
import { HUNT, huntTime } from '../../data/hunt';
import { MUTANT, MUTATIONS, daysLeft } from '../../data/mutations';
import { HeroPanel } from '../ui/HeroPanel';
import { TALENTS, WEAPONS } from '../../data/talents';
import { canVisit, EXPEDITION, newRun, PACTS, REST_INFO } from '../../data/expedition';
import type { Vec2 } from '../../data/maps';
import { TOWERS } from '../../data/towers';
import { Rng } from '../../sim/rng';
import { MODE_SPOTS, paintWorldMap, REGION_AT, WORLD_TRAIL } from '../art/worldmap';
import { heroPortrait } from '../art/heroPortrait';

const NODES: Record<CampaignStageId, { x: number; y: number; enemy: EnemyId }> = {
  v1: { x: 192, y: 1008, enemy: 'slime' },
  v2: { x: 528, y: 864, enemy: 'salamander' },
  v3: { x: 192, y: 672, enemy: 'yeti' },
  v4: { x: 528, y: 480, enemy: 'shaman' },
  v5: { x: 360, y: 288, enemy: 'herald' },
  // Região 2: the same climb, mirrored.
  a1: { x: 528, y: 1008, enemy: 'golem' },
  a2: { x: 192, y: 864, enemy: 'wolf' },
  a3: { x: 528, y: 672, enemy: 'sentinel' },
  a4: { x: 192, y: 480, enemy: 'bat' },
  a5: { x: 360, y: 288, enemy: 'devourer' },
  // Região 3: same climb as Vellmora, other monsters.
  c1: { x: 192, y: 1008, enemy: 'monk' },
  c2: { x: 528, y: 864, enemy: 'gargoyle' },
  c3: { x: 192, y: 672, enemy: 'yeti' },
  c4: { x: 528, y: 480, enemy: 'golem' },
  c5: { x: 360, y: 288, enemy: 'titan' },
  // Região 4: the mirrored climb again.
  i1: { x: 528, y: 1008, enemy: 'imp' },
  i2: { x: 192, y: 864, enemy: 'bat' },
  i3: { x: 528, y: 672, enemy: 'monk' },
  i4: { x: 192, y: 480, enemy: 'gargoyle' },
  i5: { x: 360, y: 288, enemy: 'prism' },
};

const TRAIL = [
  { x: 192, y: 1104 },
  { x: 192, y: 864 },
  { x: 528, y: 864 },
  { x: 528, y: 672 },
  { x: 192, y: 672 },
  { x: 192, y: 480 },
  { x: 528, y: 480 },
  { x: 528, y: 288 },
  { x: 360, y: 288 },
];
const MIRROR = TRAIL.map((p) => ({ x: GAME_WIDTH - p.x, y: p.y }));
const TRAILS = [TRAIL, MIRROR, TRAIL, MIRROR];

/** Region shown last (the map opens there again). -1 = the Mapa de Éter (hub). */
let lastRegion = -1;

/** Hub art per region: theme and the monster on its card. */
const REGION_LOOK: { theme: 'meadow' | 'amber' | 'snow' | 'void'; enemy: EnemyId; tag: string }[] = [
  { theme: 'meadow', enemy: 'herald', tag: 'Tutorial: aprenda cada torre' },
  { theme: 'amber', enemy: 'devourer', tag: 'Mapas grandes, Comporta e escudos' },
  { theme: 'snow', enemy: 'titan', tag: 'Ponte levadiça, monges que curam' },
  { theme: 'void', enemy: 'prism', tag: 'Clima que muda, ladrões de ouro' },
];

/** Region 1 map: 5 stages along a trail; stars; locked stages; save backup. */
export class WorldMapScene extends Phaser.Scene {
  constructor() {
    super('WorldMap');
  }



  create(data?: { region?: number; openStage?: CampaignStageId; mode?: 'expedition' | 'hunt' | 'mutant' }): void {
    fitCamera(this);
    frameCap(this, 'menu');
    const save = getSave();
    if (save.tutorialDone()) menuTip(this, 'map', 600);
    // Open where the player was: the region asked for, the last one seen, or the Mapa de Éter.
    let region = data?.region ?? lastRegion;
    if (region >= 0 && !save.isRegionOpen(region)) region = -1;
    lastRegion = region;
    if (region < 0) {
      this.hub(data?.mode);
      return;
    }
    const theme = REGION_LOOK[region]?.theme ?? 'meadow';
    const amber = theme !== 'meadow'; // later regions: their own ground and map music
    playMusic(amber ? 'map2' : 'map');
    setMusicIntensity(0);
    const trail = TRAILS[region]!;
    const nodes = REGIONS[region]!.stages.map((id) => NODES[id]);
    paintMapBackground(this, [trail], 'world_bg', GAME_HEIGHT, theme);
    placeDecor(this, [trail], nodes.flatMap((n) => [n, { x: n.x + (n.x < GAME_WIDTH / 2 ? 110 : -110), y: n.y }]).concat(amber ? [] : [{ x: 588, y: 1016 }, { x: 548, y: 1100 }]), 99 + region, 26, GAME_HEIGHT, theme);

    // Header
    const head = this.add.graphics();
    head.fillStyle(PAL.panel, 0.9);
    head.fillRoundedRect(-20, -20, GAME_WIDTH + 40, 140, 24);
    bakeInPlace(head, { x0: -24, y0: -24, w: GAME_WIDTH + 48, h: 148 }, 'map_head');
    uiText(this, GAME_WIDTH / 2, 42, region === 0 ? 'Campos de Vellmora' : REGIONS[region]!.name, 38, '#f3e9ff', 8);
    // Back to the Mapa de Éter.
    this.regionArrow(44, '◀', true, false, () => this.scene.restart({ region: -1 }));
    // Progress chips: stars, challenges, coins
    const chip = (x: number, icon: string, text: string, color: string, scale = 0.8) => {
      const g = this.add.graphics();
      g.fillStyle(0x0b0716, 0.55);
      g.fillRoundedRect(x - 92, 74, 184, 40, 20);
      bakeInPlace(g, { x0: x - 94, y0: 72, w: 188, h: 44 }, `map_chip_${x}`);
      this.add.image(x - 66, 94, icon).setScale(scale);
      uiText(this, x - 44, 94, text, 24, color, 5).setOrigin(0, 0.5);
    };
    chip(150, 'star', `${save.totalStars()}/${STAGE_ORDER.length * 3}`, PAL.goldCss, 0.4);
    chip(360, 'icon_check', `${save.challengesDone()}/${TOTAL_CHALLENGES}`, '#9be89b', 0.7);
    chip(570, 'eter_coin', `${save.data.coins}`, '#d6c4ff', 0.75);

    REGIONS[region]!.stages.forEach((id, i) => this.node(id, i, save.isUnlocked(id), save.stars(id)));
    if (region === 0) this.bonusNode();

    // Bottom navigation: big painted icons, a dot when something is waiting.
    const foot = this.add.graphics().setDepth(44);
    foot.fillStyle(PAL.panel, 0.94);
    foot.fillRoundedRect(-20, GAME_HEIGHT - 128, GAME_WIDTH + 40, 160, 28);
    foot.lineStyle(4, 0x5a3fb0, 1);
    foot.strokeRoundedRect(-20, GAME_HEIGHT - 128, GAME_WIDTH + 40, 160, 28);
    bakeInPlace(foot, { x0: -24, y0: GAME_HEIGHT - 132, w: GAME_WIDTH + 48, h: 168 }, 'map_foot');
    this.navBar(true);
    this.cameras.main.fadeIn(250, 11, 7, 22);
    if (data?.openStage && save.isUnlocked(data.openStage)) this.showStageCard(data.openStage);
  }

  /** Bottom navigation. In a region the first button goes back to the Mapa de Éter. */
  private navBar(inRegion: boolean): void {
    const save = getSave();
    const foot = this.add.graphics().setDepth(44);
    foot.fillStyle(PAL.panel, 0.94);
    foot.fillRoundedRect(-20, GAME_HEIGHT - 128, GAME_WIDTH + 40, 160, 28);
    foot.lineStyle(4, 0x5a3fb0, 1);
    foot.strokeRoundedRect(-20, GAME_HEIGHT - 128, GAME_WIDTH + 40, 160, 28);
    bakeInPlace(foot, { x0: -24, y0: GAME_HEIGHT - 132, w: GAME_WIDTH + 48, h: 168 }, 'map_foot');
    const done = save.tutorialDone();
    const packReady = done && (save.data.coins >= PACK.price || !!save.data.packs.pending);
    const grimoire = () => (done ? this.go('Grimoire') : this.lockedMsg('Termine o tutorial para abrir o Grimório'));
    const xs = inRegion ? [90, 270, 450, 630] : [150, 360, 570];
    let i = 0;
    if (inRegion) this.navItem(xs[i++]!, 'nav_pink', 'portal', 'Mapa de Éter', false, () => this.go('WorldMap', { region: -1 }), 0.42);
    this.navItem(xs[i++]!, 'nav_purple', 'icon_grimoire', done ? 'Grimório' : '🔒 Grimório', packReady, grimoire, 0.8);
    this.navItem(xs[i++]!, 'nav_blue', 'icon_codex', 'Códice', false, () => this.go('Codex'));
    this.navItem(xs[i++]!, 'nav_gray', 'icon_gear', 'Opções', false, () => this.showOptionsCard());
  }

  private lockedMsg(text: string): void {
    playSfx('error');
    const msg = uiText(this, GAME_WIDTH / 2, 170, text, 22, '#ffffff', 5).setDepth(60).setWordWrapWidth(620);
    this.tweens.add({ targets: msg, alpha: 0, y: 140, delay: 1400, duration: 400, onComplete: () => msg.destroy() });
  }

  /**
   * Mapa de Éter: a painted world crossed by a dashed trail. Each stop is a region (a sub-map of 5 stages)
   * that opens when the previous one has 3 stars everywhere; side paths lead to the game modes.
   */
  private hub(open?: 'expedition' | 'hunt' | 'mutant'): void {
    const save = getSave();
    playMusic('map');
    setMusicIntensity(0);
    const done = save.tutorialDone();
    const reached = REGIONS.filter((_, r) => save.isRegionOpen(r)).length;
    paintWorldMap(this, reached, done);

    // Trees of each land, away from the trail and the stops.
    const stops: Vec2[] = [...WORLD_TRAIL, ...Object.values(MODE_SPOTS)];
    // Keep the name plates and the side paths clear too.
    for (const p of [...REGION_AT.map((i) => WORLD_TRAIL[i]!), ...Object.values(MODE_SPOTS)]) stops.push({ x: p.x, y: p.y + 95 });
    for (const sp of Object.values(MODE_SPOTS)) stops.push({ x: (sp.x + WORLD_TRAIL[sp.from]!.x) / 2, y: (sp.y + WORLD_TRAIL[sp.from]!.y) / 2 - 15 });
    const rng = new Rng(31);
    for (let placed = 0, tries = 0; placed < 26 && tries < 500; tries++) {
      const x = rng.int(30, GAME_WIDTH - 30);
      const y = rng.int(390, GAME_HEIGHT - 190);
      if (stops.some((p) => Math.hypot(p.x - x, p.y - y) < 105) || (y > 840 && y < 960)) continue;
      const key = y > 870 ? 'tree' : y > 640 ? 'tree_amber' : 'tree_snow';
      this.add.image(x, y, key).setScale(0.5 + rng.next() * 0.2).setDepth(10 + y / 100);
      placed++;
    }

    const head = this.add.graphics();
    head.fillStyle(PAL.panel, 0.9);
    head.fillRoundedRect(-20, -20, GAME_WIDTH + 40, 140, 24);
    bakeInPlace(head, { x0: -24, y0: -24, w: GAME_WIDTH + 48, h: 148 }, 'map_head');
    uiText(this, GAME_WIDTH / 2, 42, 'Mapa de Éter', 40, '#f3e9ff', 8);
    const chip = (x: number, icon: string, text: string, color: string, scale = 0.8) => {
      const g = this.add.graphics();
      g.fillStyle(0x0b0716, 0.55);
      g.fillRoundedRect(x - 92, 74, 184, 40, 20);
      bakeInPlace(g, { x0: x - 94, y0: 72, w: 188, h: 44 }, `map_chip_${x}`);
      this.add.image(x - 66, 94, icon).setScale(scale);
      uiText(this, x - 44, 94, text, 24, color, 5).setOrigin(0, 0.5);
    };
    chip(150, 'star', `${save.totalStars()}/${STAGE_ORDER.length * 3}`, PAL.goldCss, 0.4);
    chip(360, 'icon_check', `${save.challengesDone()}/${TOTAL_CHALLENGES}`, '#9be89b', 0.7);
    chip(570, 'eter_coin', `${save.data.coins}`, '#d6c4ff', 0.75);

    /** One stop on the map: a medallion with a picture, a name plate and one line under it. */
    const stop = (x: number, y: number, r: number, color: number, icon: string, iconScale: number, title: string, sub: string, open: boolean, onTap: () => void, lockMsg: string, pulse = false, dot = false) => {
      const c = this.add.container(x, y).setDepth(40);
      const g = this.add.graphics();
      const col = open ? color : 0x4a4560;
      g.fillStyle(PAL.ink, 1);
      g.fillCircle(0, 5, r + 6);
      g.fillStyle(Phaser.Display.Color.ValueToColor(col).darken(35).color, 1);
      g.fillCircle(0, 5, r);
      g.fillStyle(col, 1);
      g.fillCircle(0, 0, r - 2);
      g.fillStyle(0xffffff, 0.2);
      g.fillEllipse(-r * 0.15, -r * 0.45, r * 1.2, r * 0.5);
      c.add(g);
      bakeInPlace(g, { x0: -r - 8, y0: -r - 8, w: 2 * r + 16, h: 2 * r + 22 }, `hub_stop_${r}_${col}`);
      const img = this.add.image(0, -2, icon).setScale(iconScale);
      if (!open) img.setTint(0x1a1626).setAlpha(0.75);
      c.add(img);
      if (!open) c.add(uiText(this, 0, 0, '🔒', Math.round(r * 0.6), '#ffffff', 5));
      if (dot) {
        const d = this.add.circle(r * 0.72, -r * 0.72, 13, 0xff4d5e).setStrokeStyle(3, PAL.ink);
        c.add([d, uiText(this, r * 0.72, -r * 0.72 - 1, '!', 20, '#ffffff', 3)]);
      }
      // Name plate.
      const plate = this.add.container(x, y + r + 34).setDepth(41);
      const t = uiText(this, 0, -9, title, r > 56 ? 21 : 18, open ? '#ffffff' : PAL.uiDim, 5);
      const s = uiText(this, 0, 14, sub, 15, open ? PAL.goldCss : PAL.uiDim, 4);
      const w = Math.max(t.width, s.width) + 28;
      const pg = this.add.graphics();
      pg.fillStyle(PAL.ink, 0.82);
      pg.fillRoundedRect(-w / 2, -26, w, 54, 14);
      plate.add([pg, t, s]);
      c.setSize(r * 2 + 20, r * 2 + 20).setInteractive({ useHandCursor: true });
      c.on('pointerdown', () => {
        if (!open) {
          this.lockedMsg(lockMsg);
          return;
        }
        playSfx('ui');
        this.tweens.add({ targets: c, scale: 0.92, duration: 70, yoyo: true });
        onTap();
      });
      if (open && pulse) this.tweens.add({ targets: c, scale: 1.07, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      return c;
    };

    // Regions: the stops of the main trail.
    const COLORS = { meadow: 0x4fa84a, amber: 0xd9903a, snow: 0x6fa3d9, void: 0x8a5fd0 } as const;
    // The frontier: the last open region that still has stars to earn (the hero waits there).
    let frontier = 0;
    REGIONS.forEach((reg, r) => {
      if (save.isRegionOpen(r) && (save.regionStars(r) < reg.stages.length * 3 || r === reached - 1)) frontier = r;
    });
    REGIONS.forEach((reg, r) => {
      const at = WORLD_TRAIL[REGION_AT[r]!]!;
      const open = save.isRegionOpen(r);
      const look = REGION_LOOK[r] ?? REGION_LOOK[0]!;
      const max = reg.stages.length * 3;
      const sub = open ? `★ ${save.regionStars(r)}/${max}${r === 0 && !done ? '  •  COMECE AQUI' : ''}` : `3★ em tudo em ${REGIONS[r - 1]!.name}`;
      const bonus = r === 0 && done && !save.data.galeWon; // the Vale dos Ventos is waiting
      stop(at.x, at.y, 64, COLORS[look.theme], `enemy_${look.enemy}`, 0.6 * ENEMY_PIC, `${r + 1}. ${reg.name}`, bonus ? 'NOVO: fase bônus!' : sub, open, () => this.go('WorldMap', { region: r }), `Faça 3 estrelas em todas as fases de ${REGIONS[r - 1]?.name ?? ''}`, r === frontier, bonus);
    });
    // What comes after the last region.
    const far = WORLD_TRAIL[REGION_AT[REGIONS.length]!];
    if (far) stop(far.x, far.y, 50, 0x6a4fc0, 'portal', 0.5, '???', 'Terras por descobrir', false, () => undefined, 'Uma nova região está a caminho!');

    // The hero waits at the frontier.
    const fa = WORLD_TRAIL[REGION_AT[frontier]!]!;
    const hero = heroPortrait(this, done ? save.data.hero : 'mage', fa.x + (fa.x < GAME_WIDTH / 2 ? 96 : -96), fa.y + 14, 0.5).setDepth(42);
    hero.setFlipX(fa.x < GAME_WIDTH / 2);
    this.tweens.add({ targets: hero, scaleY: hero.scaleY * 1.04, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // Game modes: the side paths.
    const today = dailySetup(new Date());
    const lockTip = 'Termine o tutorial (Campos de Vellmora) para abrir';
    const run = save.data.expedition;
    const m = MODE_SPOTS;
    stop(m.rift.x, m.rift.y, 46, 0x7a4fd0, 'portal', 0.5, 'Fenda Infinita', done ? (save.data.riftBest > 0 ? `Recorde: onda ${save.data.riftBest}` : '40 ondas sem fim') : 'Fim do tutorial', done, () => this.showStageCard('rift'), lockTip);
    stop(m.daily.x, m.daily.y, 46, 0xb0479a, 'icon_daily', 0.8, 'Desafio do dia', done ? 'Igual para todos' : 'Fim do tutorial', done, () => this.showDailyCard(), lockTip, false, done && save.dailyBest(today.key) === 0);
    const huntOpen = save.isUnlocked('hunt');
    const hb = save.huntBosses();
    const huntSub = !huntOpen ? `Vença ${HUNT.minBosses} chefes` : save.data.hunt.best > 0 && save.data.hunt.bosses === hb ? `Recorde: ${huntTime(save.data.hunt.best)}` : `${hb} chefes em fila`;
    stop(m.hunt.x, m.hunt.y, 46, 0xc0504a, 'enemy_herald', 0.42 * ENEMY_PIC, 'Caçada', huntSub, huntOpen, () => this.showStageCard('hunt'), `Vença o chefe de ${STAGES[HUNT.bosses[HUNT.minBosses - 1]!.stage].name} para abrir`, false, huntOpen && save.data.hunt.best === 0);
    const week = done ? save.mutantWeek() : null;
    const mut = week ? MUTATIONS[week.mutation] : null;
    stop(m.mutant.x, m.mutant.y, 46, mut?.color ?? 0x8a5fd0, 'icon_mutant', 0.8, 'Semana Mutante', week && mut ? `${mut.name} • ${week.won.length}/${week.stages.length}` : 'Fim do tutorial', done, () => this.showMutantCard(), lockTip, false, !!week && week.won.length === 0);
    stop(m.expedition.x, m.expedition.y, 46, 0x2f9a8a, 'chest', 0.3, 'Expedição', done ? (run ? `Parada ${run.leg + 1} de ${EXPEDITION.legs}` : 'Trilha de 5 paradas') : 'Fim do tutorial', done, () => this.showExpeditionCard(), lockTip, false, done && save.data.expeditionWins === 0 && !run);

    this.navBar(false);
    this.cameras.main.fadeIn(250, 11, 7, 22);
    if (open === 'expedition' && done) this.showExpeditionCard();
    if (open === 'hunt' && save.isUnlocked('hunt')) this.showStageCard('hunt');
    if (open === 'mutant' && done) this.showMutantCard();
  }

  /**
   * Expedição de Éter: a trail of 5 stops (battle, rest stop, battle, rest stop, final boss).
   * Lives and Bênçãos carry over; at each stop the player picks 1 of 2 ways.
   */
  private showExpeditionCard(animate = true): void {
    this.card?.destroy();
    menuTip(this, 'expedition');
    const save = getSave();
    const run = save.data.expedition;
    const c = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2).setDepth(50);
    const shade = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x07040f, 0.6).setInteractive();
    shade.on('pointerdown', () => {
      c.destroy();
      this.card = null;
    });
    const g = this.add.graphics();
    g.fillStyle(PAL.ink, 1);
    g.fillRoundedRect(-340, -430, 680, 860, 30);
    g.fillStyle(0x163a40, 1);
    g.fillRoundedRect(-335, -425, 670, 850, 26);
    // The card itself swallows taps (only the dark area around it closes).
    const body = this.add.rectangle(0, 0, 680, 860, 0, 0).setInteractive();
    c.add([shade, body, g]);
    c.add(uiText(this, 0, -386, 'Expedição de Éter', 38, '#c8fff2', 8));

    // The trail: 5 stops joined by a dashed line; done ones are green, the current one pulses.
    const ICON: Record<string, string> = { battle: '⚔', rest: '⛺', boss: '👑' };
    const at = run ? run.leg : -1;
    const tg = this.add.graphics();
    c.add(tg);
    EXPEDITION.steps.forEach((kind, i) => {
      const x = (i - 2) * 130;
      const y = -312;
      if (i > 0) {
        tg.fillStyle(i <= at ? 0xfff1c9 : 0x5a7a80, 1);
        for (let d = 0; d < 4; d++) tg.fillRoundedRect(x - 98 + d * 18, y - 3, 11, 6, 3);
      }
      const done = i < at;
      const here = i === at;
      tg.fillStyle(PAL.ink, 1);
      tg.fillCircle(x, y + 3, 31);
      tg.fillStyle(done ? 0x3aa655 : here ? 0xffd34d : kind === 'boss' ? 0x7a2f5a : 0x2a5a62, 1);
      tg.fillCircle(x, y, 27);
      const ic = uiText(this, x, y - 1, done ? '✔' : ICON[kind]!, 26, '#ffffff', 5);
      c.add(ic);
      if (here) this.tweens.add({ targets: ic, scale: 1.25, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      c.add(uiText(this, x, y + 46, kind === 'battle' ? 'Batalha' : kind === 'rest' ? 'Parada' : 'Chefe', 15, here ? PAL.goldCss : PAL.uiDim, 3));
    });

    const restart = () => this.showExpeditionCard(false);
    if (!run) {
      c.add(uiText(this, 0, -196, 'Uma trilha de 5 paradas: 2 batalhas, 2 descansos e um chefe final. As vidas e as Bênçãos seguem com você, e os monstros ficam mais fortes.', 19, PAL.uiText, 4).setWordWrapWidth(600));
      c.add(uiText(this, 0, -112, 'Em cada parada você escolhe 1 de 2 caminhos. Perdeu uma batalha? A expedição acaba.', 19, PAL.goldCss, 4).setWordWrapWidth(600));
      c.add(uiText(this, 0, -44, 'Quem vai?', 24, PAL.uiText, 5));
      HERO_ORDER.forEach((cls, i) => {
        const def = HEROES[cls];
        const selected = save.data.hero === cls;
        const slot = this.add.container((i - 1.5) * 146, 64);
        const bg = this.add.graphics();
        bg.fillStyle(selected ? 0xffd34d : PAL.ink, 1);
        bg.fillRoundedRect(-64, -78, 128, 160, 18);
        bg.fillStyle(0x1f5560, 1);
        bg.fillRoundedRect(-59, -73, 118, 150, 15);
        slot.add([bg, heroPortrait(this, cls, 0, -6, 0.62), uiText(this, 0, 62, def.name, 16, PAL.uiText, 4)]);
        slot.setSize(128, 160).setInteractive({ useHandCursor: true });
        slot.on('pointerdown', () => {
          playSfx('ui');
          save.selectHero(cls);
          restart();
        });
        c.add(slot);
      });
      c.add(uiText(this, 0, 184, `Moedas por batalha vencida: ${EXPEDITION.coins.filter((n) => n > 0).join(' → ')}`, 20, '#d6c4ff', 4));
      c.add(uiText(this, 0, 220, `Completas: ${save.data.expeditionWins}   •   Sequência: ${save.data.expeditionStreak}   •   Melhor: ${save.data.expeditionBest}`, 18, PAL.uiDim, 4));
      c.add(
        new Button(this, 0, 320, {
          width: 400,
          height: 90,
          label: 'PARTIR',
          fontSize: 42,
          color: 0x2f9a8a,
          onClick: () => {
            save.setExpedition(newRun(Math.floor(Math.random() * 1e9), save.data.hero, save.expeditionCtx()));
            restart();
          },
        }),
      );
    } else {
      c.add(uiText(this, 0, -228, `❤ ${run.lives} vidas   •   ${run.boons.length} ${run.boons.length === 1 ? "Bênção" : "Bênçãos"}   •   ${HEROES[run.hero].name}   •   ${save.data.coins} moedas`, 19, PAL.uiText, 4));
      const single = run.nodes.length === 1;
      run.nodes.forEach((node, i) => {
        const x = single ? 0 : (i - 0.5) * 326;
        const p = this.add.container(x, 76);
        const pg = this.add.graphics();
        const color = node.kind === 'battle' ? PACTS[node.pact].color : REST_INFO[node.kind].color;
        const css = `#${color.toString(16).padStart(6, '0')}`;
        const w = single ? 420 : 310;
        pg.fillStyle(color, 1);
        pg.fillRoundedRect(-w / 2, -270, w, 540, 22);
        pg.fillStyle(0x10262c, 1);
        pg.fillRoundedRect(-w / 2 + 6, -264, w - 12, 528, 18);
        p.add(pg);
        const wrap = w - 36;
        if (node.kind === 'battle') {
          const pact = PACTS[node.pact];
          p.add(uiText(this, 0, -230, pact.name, 23, css, 5).setWordWrapWidth(wrap));
          p.add(uiText(this, 0, -184, STAGES[node.stage].name, 19, '#ffffff', 4).setWordWrapWidth(wrap));
          p.add(uiText(this, 0, -156, REGIONS[regionOf(node.stage)]?.name ?? '', 15, PAL.uiDim, 3));
          p.add(uiText(this, 0, -90, `▲ ${pact.good}`, 19, '#9be89b', 4).setWordWrapWidth(wrap));
          p.add(uiText(this, 0, -10, `▼ ${pact.bad}`, 19, '#ff9a8a', 4).setWordWrapWidth(wrap));
          if (node.towers) p.add(uiText(this, 0, 64, node.towers.map((t) => TOWERS[t].name).join(', '), 16, PAL.goldCss, 4).setWordWrapWidth(wrap));
          p.add(uiText(this, 0, 126, `Monstros ×${(EXPEDITION.hpMult[run.leg]! * (pact.hpMult ?? 1)).toFixed(2)}`, 16, PAL.uiDim, 3));
          p.add(
            new Button(this, 0, 208, {
              width: 240,
              height: 76,
              label: node.pact === 'final' ? 'LUTAR' : 'IR',
              fontSize: 36,
              color: node.pact === 'final' ? 0xb0479a : 0x3aa655,
              onClick: () => {
                this.cameras.main.fadeOut(220, 11, 7, 22);
                this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Battle', { expedition: i }));
              },
            }),
          );
        } else {
          const info = REST_INFO[node.kind];
          p.add(uiText(this, 0, -230, info.name, 25, css, 5));
          p.add(uiText(this, 0, -192, info.desc, 17, PAL.uiText, 4).setWordWrapWidth(wrap));
          const visit = (choice: number) => {
            if (!save.visitExpedition(i, choice)) {
              this.lockedMsg(node.kind === 'merchant' ? 'Moedas insuficientes' : 'Vidas insuficientes para a oferenda');
              return;
            }
            playSfx(choice >= 0 || node.kind === 'camp' ? 'boon' : 'ui');
            restart();
          };
          if (node.kind === 'camp') {
            p.add(uiText(this, 0, -60, '⛺', 90, '#ffffff', 6));
            p.add(uiText(this, 0, 60, `Vidas: ${run.lives} → ${Math.min(20, run.lives + EXPEDITION.camp.lives)}`, 20, '#9be89b', 4));
            p.add(new Button(this, 0, 208, { width: 250, height: 76, label: 'DESCANSAR', fontSize: 28, color: 0x3aa655, onClick: () => visit(-1) }));
          } else {
            node.boons.forEach((id, k) => {
              const boon = BOONS[id];
              const y = -128 + k * (node.boons.length > 2 ? 104 : 130);
              const ok = canVisit(run, node, k, save.data.coins);
              p.add(new Button(this, 0, y, { width: w - 40, height: 52, label: boon.name, fontSize: 19, color: ok ? 0x5a3fb0 : 0x4a4560, onClick: () => visit(k) }));
              p.add(uiText(this, 0, y + 46, boon.desc, 14, PAL.uiDim, 3).setWordWrapWidth(wrap));
            });
            p.add(new Button(this, 0, 222, { width: 220, height: 50, label: 'Passar direto', fontSize: 19, color: 0x6b6480, onClick: () => visit(-1) }));
          }
        }
        c.add(p);
      });
      let sure = false;
      const quit = new Button(this, 0, 388, {
        width: 300,
        height: 46,
        label: 'Desistir da expedição',
        fontSize: 18,
        color: 0x6b6480,
        onClick: () => {
          if (!sure) {
            sure = true;
            quit.setLabel('Toque de novo para desistir').setColor(0xb03a3a);
            return;
          }
          save.failExpedition();
          this.scene.restart({ region: -1 });
        },
      });
      c.add(quit);
    }
    if (animate) {
      c.setScale(0.7).setAlpha(0);
      this.tweens.add({ targets: c, scale: 1, alpha: 1, duration: 220, ease: 'Back.easeOut' });
    }
    this.card = c;
  }

  /** Header arrow to the other region; locked until the previous region's last stage is won. */
  private regionArrow(x: number, label: string, open: boolean, fresh: boolean, go: () => void): void {
    const t = uiText(this, x, 42, open ? label : '🔒', 40, open ? PAL.goldCss : PAL.uiDim, 7).setDepth(45);
    const zone = this.add.zone(x, 42, 90, 90).setDepth(46).setInteractive({ useHandCursor: true });
    if (fresh) {
      const tag = uiText(this, x - 50, 92, 'Nova região!', 18, PAL.goldCss, 5).setOrigin(1, 0.5).setDepth(45);
      this.tweens.add({ targets: [t, tag], scale: 1.15, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    zone.on('pointerdown', () => {
      if (!open) {
        playSfx('error');
        const last = REGIONS[0]!.stages.at(-1)!;
        const msg = uiText(this, GAME_WIDTH / 2, 160, `Vença ${STAGES[last].name} para abrir`, 22, '#ffffff', 5).setDepth(60);
        this.tweens.add({ targets: msg, alpha: 0, y: 130, delay: 1200, duration: 400, onComplete: () => msg.destroy() });
        return;
      }
      playSfx('ui');
      this.cameras.main.fadeOut(160, 11, 7, 22);
      this.cameras.main.once('camerafadeoutcomplete', go);
    });
  }

  private node(id: CampaignStageId, index: number, unlocked: boolean, stars: number): void {
    const n = NODES[id];
    const st = STAGES[id];
    const boss = !!ENEMIES[n.enemy].boss;
    const c = this.add.container(n.x, n.y).setDepth(40);
    const g = this.add.graphics();
    const r = boss ? 62 : 52;
    const color = !unlocked ? 0x5c5772 : stars > 0 ? 0x3aa655 : 0xe0862f;
    g.fillStyle(PAL.ink, 1);
    g.fillCircle(0, 4, r + 5);
    g.fillStyle(Phaser.Display.Color.ValueToColor(color).darken(30).color, 1);
    g.fillCircle(0, 4, r);
    g.fillStyle(color, 1);
    g.fillCircle(0, 0, r - 2);
    g.fillStyle(0xffffff, 0.22);
    g.fillEllipse(-8, -r * 0.4, r * 1.2, r * 0.5);
    c.add(g);
    bakeInPlace(g, { x0: -r - 8, y0: -r - 8, w: 2 * r + 16, h: 2 * r + 20 }, `node_${r}_${color}`);
    c.add(uiText(this, 0, -2, unlocked ? `${index + 1}` : '🔒', boss ? 52 : 44, '#ffffff', 8));

    // Featured monster next to the node.
    const side = n.x < GAME_WIDTH / 2 ? 1 : -1;
    const mon = this.add.image(n.x + side * (r + 56), n.y + 10, `enemy_${n.enemy}`).setScale((boss ? 0.9 : 1) * ENEMY_PIC);
    mon.setDepth(39);
    if (!unlocked) mon.setTint(0x222222).setAlpha(0.7);
    else this.tweens.add({ targets: mon, scaleY: mon.scaleY * 1.06, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    mon.setFlipX(side < 0);

    // Label + stars
    const label = this.add.container(n.x, n.y + r + 34).setDepth(41);
    const lg = this.add.graphics();
    lg.fillStyle(PAL.ink, 0.85);
    lg.fillRoundedRect(-150, -22, 300, 44, 16);
    label.add(lg);
    bakeInPlace(lg, { x0: -152, y0: -24, w: 304, h: 48 }, 'node_label');
    label.add(uiText(this, 0, 0, st.name, 21, unlocked ? PAL.uiText : PAL.uiDim, 4));
    for (let s = 0; s < 3; s++) {
      label.add(this.add.image((s - 1) * 30, -2 * r - 56, s < stars ? 'star' : 'starEmpty').setScale(0.4));
    }
    const crowns = STAGE_ORDER.includes(id as CampaignStageId) ? getSave().crowns(id as CampaignStageId) : 0;
    if (crowns > 0) label.add(uiText(this, 62, -2 * r - 56, `👑${crowns}`, 18, '#ff9a7a', 4).setOrigin(0, 0.5));

    if (unlocked) {
      c.setSize(r * 2, r * 2).setInteractive({ useHandCursor: true });
      c.on('pointerdown', () => {
        playSfx('ui');
        this.tweens.add({ targets: c, scale: 0.9, duration: 70, yoyo: true });
        this.showStageCard(id);
      });
      if (stars === 0) this.tweens.add({ targets: c, scale: 1.08, duration: 650, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
  }

  /** Vellmora's bonus stop: the Vale dos Ventos (opens after the tutorial, gives the Torre do Vento). */
  private bonusNode(): void {
    const save = getSave();
    const open = save.isUnlocked('gale');
    const x = 560;
    const y = 1024;
    const c = this.add.container(x, y).setDepth(40);
    const g = this.add.graphics();
    const color = !open ? 0x5c5772 : save.data.galeWon ? 0x3aa655 : 0x2f9a8a;
    g.fillStyle(PAL.ink, 1);
    g.fillCircle(0, 4, 50);
    g.fillStyle(Phaser.Display.Color.ValueToColor(color).darken(30).color, 1);
    g.fillCircle(0, 4, 45);
    g.fillStyle(color, 1);
    g.fillCircle(0, 0, 43);
    g.fillStyle(0xffffff, 0.22);
    g.fillEllipse(-6, -17, 52, 20);
    c.add(g);
    const wind = isCreature('wind', this.textures) ? dragonArt(this.textures, 'wind', 1, null) : null;
    const icon = this.add.image(0, -4, wind ? wind.key : 'tower_wind');
    icon.setScale(wind ? Math.min(76 / icon.width, 66 / icon.height) : 0.62);
    if (!open) icon.setTint(0x222222).setAlpha(0.7);
    c.add(icon);
    if (!open) c.add(uiText(this, 0, 0, '🔒', 30, '#ffffff', 5));
    const label = this.add.container(x, y + 74).setDepth(41);
    const lg = this.add.graphics();
    lg.fillStyle(PAL.ink, 0.85);
    lg.fillRoundedRect(-110, -26, 220, 52, 16);
    label.add([lg, uiText(this, 0, -9, 'BÔNUS', 15, '#9ff0d0', 4), uiText(this, 0, 11, 'Vale dos Ventos', 19, open ? PAL.uiText : PAL.uiDim, 4)]);
    c.setSize(100, 100).setInteractive({ useHandCursor: true });
    c.on('pointerdown', () => {
      if (!open) {
        this.lockedMsg('Termine o tutorial (vença o Trono da Geada) para abrir');
        return;
      }
      playSfx('ui');
      this.tweens.add({ targets: c, scale: 0.9, duration: 70, yoyo: true });
      this.showStageCard('gale');
    });
    if (open && !save.data.galeWon) this.tweens.add({ targets: c, scale: 1.08, duration: 650, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  private card: Phaser.GameObjects.Container | null = null;

  /** Panel with the stage description, the hero picker and a big JOGAR button. */
  private showStageCard(id: StageId, animate = true): void {
    this.card?.destroy();
    const st = STAGES[id];
    const save = getSave();
    const c = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2).setDepth(50);
    const shade = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x07040f, 0.6).setInteractive();
    shade.on('pointerdown', () => {
      c.destroy();
      this.card = null;
    });
    const g = this.add.graphics();
    g.fillStyle(PAL.ink, 1);
    // Ameaça (Fase 20): on a 3-star stage, an extra row to pick the difficulty.
    const cid = id as CampaignStageId;
    const maxT = STAGE_ORDER.includes(cid) && save.tutorialDone() ? save.maxThreat(cid) : 0;
    const extra = maxT > 0 ? 112 : 0;
    g.fillRoundedRect(-320, -330, 640, 720 + extra, 30);
    g.fillStyle(0x2a1a4d, 1);
    g.fillRoundedRect(-315, -325, 630, 710 + extra, 26);
    c.add([shade, g]);
    c.add(uiText(this, 0, -282, st.name, 34, '#f3e9ff', 7));
    c.add(uiText(this, 0, -236, st.subtitle, 21, PAL.uiDim, 5).setWordWrapWidth(560));
    if (id === 'rift') {
      c.add(uiText(this, 0, -178, save.data.riftBest > 0 ? `Seu recorde: onda ${save.data.riftBest}` : 'Sem recorde ainda', 26, PAL.goldCss, 5));
    } else if (id === 'hunt') {
      const hb = save.huntBosses();
      const h = save.data.hunt;
      c.add(uiText(this, 0, -178, h.best > 0 ? `Recorde: ${huntTime(h.best)} (${h.bosses} chefes)` : `${hb} chefes • sem recorde ainda`, 24, PAL.goldCss, 5));
    } else if (id === 'gale') {
      c.add(uiText(this, 0, -178, save.data.galeWon ? '✔ Torre do Vento liberada' : 'Vença para liberar a Torre do Vento', 24, '#9ff0d0', 5));
    } else {
      for (let s = 0; s < 3; s++) c.add(this.add.image((s - 1) * 64, -178, s < save.stars(id) ? 'star' : 'starEmpty').setScale(0.6));
    }

    // Hero picker
    c.add(uiText(this, 0, -122, 'Escolha o herói', 24, PAL.uiText, 5));
    // Hero sheet: level, talent, second skill, weapon (Fase 8).
    const hc = save.data.hero;
    const talent = save.data.heroes[hc].talent;
    // Talents and weapons open with the rest of the game (after the tutorial).
    if (save.tutorialDone())
      c.add(
      new Button(this, 0, 104, {
        width: 560,
        height: 56,
        label: `Nv ${save.heroLevel(hc)} • ${talent ? TALENTS[talent].name : 'Talentos'}${hc === 'mage' ? ' • ' + WEAPONS[save.data.weapon].name.split(' ').pop() : ''}  ▸`,
        fontSize: 22,
        color: 0x5a3fb0,
        onClick: () => new HeroPanel(this, hc, () => this.showStageCard(id, false)),
      }),
    );
    HERO_ORDER.forEach((cls, i) => {
      const def = HEROES[cls];
      const x = (i - 1.5) * 146;
      const unlocked = save.isHeroUnlocked(cls);
      const selected = save.data.hero === cls;
      const slot = this.add.container(x, -10);
      const bg = this.add.graphics();
      bg.fillStyle(selected ? 0xffd34d : PAL.ink, 1);
      bg.fillRoundedRect(-64, -78, 128, 160, 18);
      bg.fillStyle(unlocked ? 0x3d2a6a : 0x241a3a, 1);
      bg.fillRoundedRect(-59, -73, 118, 150, 15);
      const img = heroPortrait(this, cls, 0, -6, 0.62);
      if (!unlocked) img.setTint(0x111111).setAlpha(0.6);
      if (!animate && selected) this.tweens.add({ targets: img, scale: { from: img.scale * 1.19, to: img.scale }, duration: 220, ease: 'Back.easeOut' });
      slot.add([bg, img, uiText(this, 0, 62, def.name, 16, unlocked ? PAL.uiText : PAL.uiDim, 4)]);
      if (!unlocked) slot.add(uiText(this, 0, -10, '🔒\nFim do\ntutorial', 15, '#ffffff', 4));
      slot.setSize(128, 160).setInteractive({ useHandCursor: true });
      slot.on('pointerdown', () => {
        if (!unlocked) {
          playSfx('error');
          return;
        }
        playSfx('ui');
        save.selectHero(cls);
        this.showStageCard(id, false);
      });
      c.add(slot);
    });

    // Stage challenges (extra goals on top of the stars).
    if (id === 'hunt') {
      const list = HUNT.bosses.slice(0, save.huntBosses()).map((b) => ENEMIES[b.boss].name).join(' → ');
      c.add(uiText(this, 0, 150, list, 18, '#ffb38a', 4).setWordWrapWidth(580));
      c.add(uiText(this, 0, 196, 'Sem Bênçãos de graça: a loja entre os chefes vende por ouro', 17, PAL.uiDim, 4).setWordWrapWidth(580));
    } else if (STAGE_ORDER.includes(id as CampaignStageId)) {
      const cid = id as CampaignStageId;
      const done = save.data.challenges[cid] ?? [];
      CHALLENGES[cid].forEach((ch, i) => {
        c.add(uiText(this, 0, 150 + i * 30, `${done[i] ? '✔' : '○'} ${challengeText(ch)}`, 20, done[i] ? '#9be89b' : PAL.uiText, 4));
      });
    }

    // Região 2 bosses: show the shields in advance, so the build can be planned.
    const bossId = st.waves.flatMap((w) => w.groups.map((gr) => gr.enemy)).find((e) => ENEMIES[e].boss?.shields);
    const shields = bossId ? ENEMIES[bossId].boss!.shields! : null;
    if (shields) c.add(uiText(this, 0, 232, `Escudos do chefe: ${shields.reactions.map((r) => REACTIONS[r].name).join(' → ')}`, 17, '#ffb38a', 4).setWordWrapWidth(580));

    // The Grimório deck: the Bênçãos of the match come from it.
    const ry = shields ? 268 : 252;
    const dk = save.data.deck;
    const strong = dk.filter((d) => BOONS[d].rarity !== 'common').length;
    if (save.tutorialDone()) c.add(uiText(this, 0, ry, `Baralho: ${dk.length} cartas (${strong} raras ou melhores)`, 19, PAL.uiDim, 4));

    if (maxT > 0) this.threatRow(c, cid, maxT, shields ? 320 : 312);
    // First visits after the tutorial: what the card is for, then (on a 3-star stage) the Ameaça.
    if (save.totalStars() > 0 && STAGE_ORDER.includes(cid)) {
      if (!tipSeen('stageCard')) menuTip(this, 'stageCard');
      else if (maxT > 0) menuTip(this, 'threat');
    }
    const threat = maxT > 0 ? Math.min(this.threatPick.get(cid) ?? 0, maxT) : 0;
    c.add(
      new Button(this, 0, (shields ? 332 : 316) + extra, {
        width: 360,
        height: shields ? 80 : 90,
        label: threat > 0 ? `JOGAR • 👑${threat}` : 'JOGAR',
        fontSize: 42,
        color: 0x3aa655,
        onClick: () => {
          this.cameras.main.fadeOut(220, 11, 7, 22);
          this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Battle', { stage: id, hero: getSave().data.hero, threat }));
        },
      }),
    );
    if (animate) {
      c.setScale(0.7).setAlpha(0);
      this.tweens.add({ targets: c, scale: 1, alpha: 1, duration: 220, ease: 'Back.easeOut' });
    }
    this.card = c;
  }

  /** Ameaça picked per stage while the map is open. */
  private threatPick = new Map<CampaignStageId, number>();

  /** Ameaça 0-5 buttons and the rule of the picked level. */
  private threatRow(c: Phaser.GameObjects.Container, id: CampaignStageId, maxT: number, y: number): void {
    const save = getSave();
    const crowns = save.crowns(id);
    const pick = Math.min(this.threatPick.get(id) ?? 0, maxT);
    c.add(uiText(this, -246, y, 'Ameaça', 22, '#ff9a7a', 4));
    for (let k = 0; k <= THREAT.max; k++) {
      const open = k <= maxT;
      const x = -110 + k * 96;
      const b = this.add.graphics();
      b.fillStyle(k === pick ? 0xffd34d : PAL.ink, 1);
      b.fillRoundedRect(x - 32, y - 28, 64, 56, 14);
      b.fillStyle(!open ? 0x241a3a : k === 0 ? 0x3d2a6a : k <= crowns ? 0x8a3a2a : 0x5a2a3a, 1);
      b.fillRoundedRect(x - 28, y - 24, 56, 48, 11);
      const t = uiText(this, x, y, open ? (k === 0 ? '–' : k <= crowns ? `👑${k}` : `${k}`) : '🔒', k <= crowns && k > 0 ? 18 : 24, open ? '#ffffff' : PAL.uiDim, 4);
      const hit = this.add.rectangle(x, y, 68, 60, 0, 0).setInteractive({ useHandCursor: true });
      hit.on('pointerdown', () => {
        if (!open) {
          playSfx('error');
          return;
        }
        playSfx('ui');
        this.threatPick.set(id, k);
        this.showStageCard(id, false);
      });
      c.add([b, t, hit]);
    }
    const text =
      pick === 0
        ? maxT > crowns ? `Vença a Ameaça ${maxT} para ganhar uma coroa (+${THREAT.coins[maxT - 1]} moedas)` : 'Todas as coroas desta fase!'
        : `${THREAT.levels[pick - 1]!.rule}${pick > 1 ? ` + ${pick - 1} regra${pick > 2 ? 's' : ''} de antes` : ''}${pick > crowns ? `  →  👑 +${THREAT.coins[pick - 1]}` : ''}`;
    c.add(uiText(this, 0, y + 50, text, 16, pick === 0 ? PAL.uiDim : '#ffb3a0', 4).setWordWrapWidth(600));
  }

  /** Semana Mutante: this week's rule on 3 stages already won. Each win of the week pays moedas. */
  private showMutantCard(): void {
    this.card?.destroy();
    const save = getSave();
    const w = save.mutantWeek();
    const m = MUTATIONS[w.mutation];
    const css = '#' + m.color.toString(16).padStart(6, '0');
    const c = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2).setDepth(50);
    const shade = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x07040f, 0.6).setInteractive();
    shade.on('pointerdown', () => {
      c.destroy();
      this.card = null;
    });
    const g = this.add.graphics();
    g.fillStyle(PAL.ink, 1);
    g.fillRoundedRect(-320, -380, 640, 760, 30);
    g.fillStyle(0x2a1a3a, 1);
    g.fillRoundedRect(-315, -375, 630, 750, 26);
    g.fillStyle(m.color, 0.18);
    g.fillRoundedRect(-290, -270, 580, 170, 22);
    c.add([shade, g]);
    c.add(uiText(this, 0, -330, 'Semana Mutante', 40, '#f3e9ff', 8));
    const left = daysLeft(new Date());
    c.add(uiText(this, 0, -292, left <= 1 ? 'A regra muda amanhã!' : `A regra muda em ${left} dias (toda segunda)`, 19, PAL.uiDim, 4));
    c.add(uiText(this, 0, -232, `${m.icon} ${m.name}`, 40, css, 8));
    c.add(uiText(this, 0, -164, m.desc, 21, PAL.uiText, 5).setWordWrapWidth(540));
    c.add(uiText(this, 0, -66, `Vitórias desta semana: ${w.won.length} de ${w.stages.length}`, 24, PAL.goldCss, 5));
    c.add(uiText(this, 0, -30, `+${MUTANT.coinsPerWin} moedas por fase • +${MUTANT.allBonus} pelas 3`, 18, PAL.uiDim, 4));
    w.stages.forEach((id, i) => {
      const won = w.won.includes(id);
      const y = 50 + i * 104;
      c.add(
        new Button(this, 0, y, {
          width: 540,
          height: 84,
          label: `${won ? '✔ ' : ''}${STAGES[id].name}`,
          fontSize: 26,
          color: won ? 0x3a5a3a : 0x6a3fb0,
          onClick: () => {
            this.cameras.main.fadeOut(220, 11, 7, 22);
            this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Battle', { stage: id, hero: getSave().data.hero, mutant: true }));
          },
        }),
      );
    });
    c.add(uiText(this, 0, 352, `Herói: ${HEROES[save.data.hero].name} (troque no cartão de qualquer fase)`, 17, PAL.uiDim, 4));
    c.setScale(0.7).setAlpha(0);
    this.tweens.add({ targets: c, scale: 1, alpha: 1, duration: 220, ease: 'Back.easeOut' });
    this.card = c;
  }

  /** Today's challenge: fixed stage, hero, starting boon and seed — the same for everyone. */
  private showDailyCard(): void {
    this.card?.destroy();
    menuTip(this, 'daily');
    const d = dailySetup(new Date());
    const save = getSave();
    const boon = BOONS[d.boon];
    const hero = HEROES[d.hero];
    const c = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2).setDepth(50);
    const shade = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x07040f, 0.6).setInteractive();
    shade.on('pointerdown', () => {
      c.destroy();
      this.card = null;
    });
    const g = this.add.graphics();
    g.fillStyle(PAL.ink, 1);
    g.fillRoundedRect(-320, -330, 640, 660, 30);
    g.fillStyle(0x3a1a4a, 1);
    g.fillRoundedRect(-315, -325, 630, 650, 26);
    c.add([shade, g]);
    c.add(uiText(this, 0, -280, 'Desafio do dia', 40, '#ffd9f4', 8));
    c.add(uiText(this, 0, -232, 'Igual para todo mundo hoje. Quantos pontos você faz?', 20, PAL.uiDim, 4).setWordWrapWidth(560));
    c.add(heroPortrait(this, d.hero, -170, -80, 1.25));
    c.add(uiText(this, 80, -150, `Herói: ${hero.name}`, 26, PAL.uiText, 5));
    c.add(uiText(this, 80, -108, STAGES[d.stage].name, 22, PAL.goldCss, 5));
    c.add(uiText(this, 80, -58, `Começa com: ${boon.name}`, 22, '#e0c8ff', 5).setWordWrapWidth(330));
    c.add(uiText(this, 80, -8, boon.desc, 18, PAL.uiDim, 4).setWordWrapWidth(330));
    // The clock and the rule of the day.
    const tw = DAILY_TWISTS[d.twist];
    c.add(uiText(this, 0, 40, `⏱ Vença em até ${clock(d.seconds)}  •  ${tw.name}: ${tw.desc}`, 22, '#ffb3e6', 5).setWordWrapWidth(580));
    const best = save.dailyBest(d.key);
    c.add(uiText(this, 0, 100, best > 0 ? `Melhor de hoje: ${best} pontos` : 'Você ainda não jogou hoje', 26, best > 0 ? PAL.goldCss : PAL.uiText, 5));
    c.add(uiText(this, 0, 140, 'Vitória +1000 • vida +100 • reação +10 • segundo que sobrar +15', 18, PAL.uiDim, 4));
    c.add(
      new Button(this, 0, 240, {
        width: 360,
        height: 90,
        label: 'JOGAR',
        fontSize: 42,
        color: 0xb0479a,
        onClick: () => {
          this.cameras.main.fadeOut(220, 11, 7, 22);
          this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Battle', { daily: true }));
        },
      }),
    );
    c.setScale(0.7).setAlpha(0);
    this.tweens.add({ targets: c, scale: 1, alpha: 1, duration: 220, ease: 'Back.easeOut' });
    this.card = c;
  }

  private go(scene: string, data?: object): void {
    this.cameras.main.fadeOut(180, 11, 7, 22);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(scene, data));
  }

  /** One button of the bottom bar: glossy badge + icon + label, with an optional "!" dot. */
  private navItem(x: number, badge: string, icon: string, label: string, dot: boolean, onClick: () => void, iconScale = 0.82): void {
    const y = GAME_HEIGHT - 84;
    const c = this.add.container(x, y).setDepth(45);
    const b = this.add.image(0, 0, badge).setScale(0.86);
    const ic = this.add.image(0, -2, icon).setScale(iconScale);
    const t = uiText(this, 0, 58, label, 19, PAL.uiText, 5);
    c.add([b, ic, t]);
    if (dot) {
      const d = this.add.circle(30, -30, 13, 0xff4d5e).setStrokeStyle(3, PAL.ink);
      const ex = uiText(this, 30, -31, '!', 20, '#ffffff', 3);
      c.add([d, ex]);
      this.tweens.add({ targets: [d, ex], scale: 1.25, duration: 520, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    c.setSize(150, 140).setInteractive({ useHandCursor: true });
    c.on('pointerdown', () => {
      playSfx('ui');
      this.tweens.add({ targets: c, scale: 0.9, duration: 70, yoyo: true });
      onClick();
    });
  }

  /** Options: sound, music, vibration, shake, Modo econômico and backup — reachable from the map too. */
  private showOptionsCard(): void {
    this.card?.destroy();
    const c = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2).setDepth(50);
    const shade = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x07040f, 0.6).setInteractive();
    const close = () => {
      c.destroy();
      this.card = null;
    };
    shade.on('pointerdown', close);
    const g = this.add.graphics();
    g.fillStyle(PAL.ink, 1);
    g.fillRoundedRect(-290, -400, 580, 800, 30);
    g.fillStyle(0x2a1a4d, 1);
    g.fillRoundedRect(-285, -395, 570, 790, 26);
    c.add([shade, g, this.add.image(-170, -346, 'icon_gear').setScale(0.6), uiText(this, 20, -346, 'Opções', 38, '#f3e9ff', 7)]);
    const toggles: [('sound' | 'music' | 'vibration' | 'shake' | 'bigText' | 'creatures'), string][] = [
      ['sound', 'Efeitos sonoros'],
      ['music', 'Música'],
      ['vibration', 'Vibração'],
      ['shake', 'Tremor de tela'],
      ['bigText', 'Textos maiores'],
      ['creatures', 'Braseiro-criatura (amostra)'],
    ];
    toggles.forEach(([key, name], i) => {
      const label = () => `${name}: ${getSettings()[key] ? 'LIGADO' : 'DESLIGADO'}`;
      const btn = new Button(this, 0, -276 + i * 64, {
        width: 440,
        height: 54,
        label: label(),
        fontSize: 22,
        color: getSettings()[key] ? 0x3aa655 : 0x6b6480,
        onClick: () => {
          setSetting(key, !getSettings()[key]);
          if (key === 'music') refreshMusic();
          if (key === 'bigText') {
            // Redraw the map with the new text size.
            this.scene.restart();
            return;
          }
          btn.setLabel(label()).setColor(getSettings()[key] ? 0x3aa655 : 0x6b6480);
        },
      });
      c.add(btn);
    });
    c.add(economyButton(this, 0, 76, 440));
    c.add(uiText(this, 0, 116, 'Automático baixa a resolução sozinho se o jogo ficar lento.', 16, PAL.uiDim, 4).setWordWrapWidth(500));
    c.add(uiText(this, 0, 162, 'Backup do progresso', 24, PAL.goldCss, 5));
    c.add(new Button(this, -112, 222, { width: 214, height: 62, label: 'Copiar', fontSize: 22, color: 0x3d7bd9, onClick: () => { close(); this.exportSave(); } }));
    c.add(new Button(this, 112, 222, { width: 214, height: 62, label: 'Restaurar', fontSize: 22, color: 0x6b6480, onClick: () => { close(); this.importSave(); } }));
    const tipsBtn = new Button(this, 0, 290, {
      width: 300,
      height: 54,
      label: 'Rever dicas',
      fontSize: 21,
      color: 0xc08a1e,
      onClick: () => {
        resetTips();
        tipsBtn.setLabel('Dicas reativadas ✔');
      },
    });
    c.add(tipsBtn);
    c.add(new Button(this, 0, 352, { width: 300, height: 58, label: 'Fechar', fontSize: 24, color: 0x5a3fb0, onClick: close }));
    c.setScale(0.8).setAlpha(0);
    this.tweens.add({ targets: c, scale: 1, alpha: 1, duration: 200, ease: 'Back.easeOut' });
    this.card = c;
  }

  private exportSave(): void {
    const text = getSave().exportText();
    const done = () => this.toast('Backup copiado! Guarde esse texto num lugar seguro.');
    try {
      void navigator.clipboard.writeText(text).then(done, () => window.prompt('Copie este texto:', text));
    } catch {
      window.prompt('Copie este texto:', text);
    }
  }

  private importSave(): void {
    const text = window.prompt('Cole o texto do backup:');
    if (!text) return;
    try {
      getSave().importText(text);
      this.scene.restart();
    } catch (e) {
      this.toast(e instanceof Error ? e.message : 'Backup inválido.');
    }
  }

  private toast(msg: string): void {
    const t = uiText(this, GAME_WIDTH / 2, GAME_HEIGHT - 150, msg, 22, PAL.uiText, 5).setDepth(60).setWordWrapWidth(640);
    this.tweens.add({ targets: t, alpha: 0, delay: 2200, duration: 400, onComplete: () => t.destroy() });
  }
}
