import * as Phaser from 'phaser';
import { bakeInPlace } from '../ui/bake';
import { getSettings, setSetting } from '../settings';
import { refreshMusic } from '../audio/music';
import { economyButton } from '../battle/Panels';
import { resetTips } from '../battle/Tutorial';
import { fitCamera, frameCap } from '../perf';
import { GAME_HEIGHT, GAME_WIDTH } from '../../data/config';
import type { EnemyId } from '../../data/enemies';
import { BOONS } from '../../data/boons';
import { COINS } from '../../data/relics';
import { playMusic, setMusicIntensity } from '../audio/music';
import { CHALLENGES, challengeText, dailySetup, TOTAL_CHALLENGES } from '../../data/challenges';
import { HERO_ORDER, HEROES } from '../../data/heroes';
import { REGIONS, STAGE_ORDER, STAGES, type CampaignStageId, type StageId } from '../../data/stages';
import { ENEMIES } from '../../data/enemies';
import { REACTIONS } from '../../data/reactions';
import { getSave } from '../../meta/save';
import { playSfx } from '../audio/sfx';
import { PAL } from '../art/palette';
import { paintMapBackground, placeDecor } from '../battle/MapView';
import { Button, uiText } from '../ui/Button';
import { HeroPanel } from '../ui/HeroPanel';
import { TALENTS, WEAPONS } from '../../data/talents';

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
const TRAILS = [TRAIL, TRAIL.map((p) => ({ x: GAME_WIDTH - p.x, y: p.y })), TRAIL];

/** Region shown last (the map opens there again). -1 = the Mapa de Éter (hub). */
let lastRegion = -1;

/** Hub art per region: theme and the monster on its card. */
const REGION_LOOK: { theme: 'meadow' | 'amber' | 'snow'; enemy: EnemyId; tag: string }[] = [
  { theme: 'meadow', enemy: 'herald', tag: 'Tutorial: aprenda cada torre' },
  { theme: 'amber', enemy: 'devourer', tag: 'Mapas grandes, Comporta e escudos' },
  { theme: 'snow', enemy: 'titan', tag: 'Ponte levadiça, monges que curam' },
];

/** Region 1 map: 5 stages along a trail; stars; locked stages; save backup. */
export class WorldMapScene extends Phaser.Scene {
  constructor() {
    super('WorldMap');
  }



  create(data?: { region?: number; openStage?: CampaignStageId }): void {
    fitCamera(this);
    frameCap(this, 'menu');
    const save = getSave();
    // Open where the player was: the region asked for, the last one seen, or the Mapa de Éter.
    let region = data?.region ?? lastRegion;
    if (region >= 0 && !save.isRegionOpen(region)) region = -1;
    lastRegion = region;
    if (region < 0) {
      this.hub();
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
    const chestReady = done && (save.data.coins >= COINS.chestPrice || !!save.data.chest.pending);
    const relics = () => (done ? this.go('Relics') : this.lockedMsg('Termine o tutorial para abrir o Relicário'));
    const xs = inRegion ? [90, 270, 450, 630] : [150, 360, 570];
    let i = 0;
    if (inRegion) this.navItem(xs[i++]!, 'nav_pink', 'portal', 'Mapa de Éter', false, () => this.go('WorldMap', { region: -1 }), 0.42);
    this.navItem(xs[i++]!, 'nav_purple', 'chest', done ? 'Relicário' : '🔒 Relicário', chestReady, relics, 0.34);
    this.navItem(xs[i++]!, 'nav_blue', 'icon_codex', 'Códice', false, () => this.go('Codex'));
    this.navItem(xs[i++]!, 'nav_gray', 'icon_gear', 'Opções', false, () => this.showOptionsCard());
  }

  private lockedMsg(text: string): void {
    playSfx('error');
    const msg = uiText(this, GAME_WIDTH / 2, 170, text, 22, '#ffffff', 5).setDepth(60).setWordWrapWidth(620);
    this.tweens.add({ targets: msg, alpha: 0, y: 140, delay: 1400, duration: 400, onComplete: () => msg.destroy() });
  }

  /**
   * Mapa de Éter: every region (each opens when the previous one has 3 stars everywhere),
   * plus the game modes (Fenda Infinita, Desafio do dia and what comes next).
   */
  private hub(): void {
    const save = getSave();
    playMusic('map');
    setMusicIntensity(0);
    paintMapBackground(this, [], 'world_bg', GAME_HEIGHT, 'meadow');
    placeDecor(this, [], [{ x: 360, y: 640 }], 7, 18);
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

    // Regions
    REGIONS.forEach((reg, r) => {
      const y = 236 + r * 178;
      const open = save.isRegionOpen(r);
      const look = REGION_LOOK[r] ?? REGION_LOOK[0]!;
      const stars = save.regionStars(r);
      const max = reg.stages.length * 3;
      const c = this.add.container(GAME_WIDTH / 2, y).setDepth(40);
      const g = this.add.graphics();
      g.fillStyle(PAL.ink, 1);
      g.fillRoundedRect(-320, -76, 640, 152, 26);
      g.fillStyle(!open ? 0x3a3450 : look.theme === 'amber' ? 0x8a5a2a : look.theme === 'snow' ? 0x4a6a96 : 0x3f7a3a, 1);
      g.fillRoundedRect(-315, -71, 630, 142, 22);
      g.fillStyle(0xffffff, 0.12);
      g.fillRoundedRect(-305, -64, 610, 46, 18);
      c.add(g);
      bakeInPlace(g, { x0: -324, y0: -80, w: 648, h: 160 }, `hub_region_${open ? look.theme : 'locked'}`);
      const mon = this.add.image(-238, 6, `enemy_${look.enemy}`).setScale(0.82);
      if (!open) mon.setTint(0x222222).setAlpha(0.7);
      c.add(mon);
      c.add(uiText(this, -150, -36, `${r + 1}. ${reg.name}`, 28, open ? '#ffffff' : PAL.uiDim, 6).setOrigin(0, 0.5));
      c.add(uiText(this, -150, 2, look.tag, 18, open ? '#f3e9ff' : PAL.uiDim, 4).setOrigin(0, 0.5));
      if (open) {
        c.add(this.add.image(-136, 42, 'star').setScale(0.4));
        c.add(uiText(this, -112, 42, `${stars}/${max}`, 22, PAL.goldCss, 5).setOrigin(0, 0.5));
        if (stars < max && r < REGIONS.length - 1) c.add(uiText(this, 290, 42, '3★ em tudo abre a próxima', 15, '#ffe9a8', 4).setOrigin(1, 0.5));
        if (r === 0 && !save.tutorialDone()) {
          const tag = uiText(this, 290, -36, 'COMECE AQUI', 18, PAL.goldCss, 5).setOrigin(1, 0.5);
          c.add(tag);
          this.tweens.add({ targets: tag, alpha: 0.4, duration: 600, yoyo: true, repeat: -1 });
        }
      } else {
        const prev = REGIONS[r - 1]!;
        c.add(uiText(this, -150, 42, `🔒 3 estrelas em todas as fases de ${prev.name}`, 17, PAL.uiDim, 4).setOrigin(0, 0.5));
      }
      c.setSize(640, 152).setInteractive({ useHandCursor: true });
      c.on('pointerdown', () => {
        if (!open) {
          this.lockedMsg(`Faça 3 estrelas em todas as fases de ${REGIONS[r - 1]!.name}`);
          return;
        }
        playSfx('ui');
        this.tweens.add({ targets: c, scale: 0.96, duration: 70, yoyo: true });
        this.go('WorldMap', { region: r });
      });
    });

    // Game modes
    const done = save.tutorialDone();
    const my = 236 + REGIONS.length * 178 + 10;
    uiText(this, GAME_WIDTH / 2, my, 'Modos de jogo', 28, PAL.goldCss, 6).setDepth(40);
    const tile = (x: number, icon: string, scale: number, title: string, sub: string, open: boolean, onTap: () => void, dot = false) => {
      const c = this.add.container(x, my + 112).setDepth(40);
      const g = this.add.graphics();
      g.fillStyle(PAL.ink, 1);
      g.fillRoundedRect(-104, -84, 208, 168, 22);
      g.fillStyle(open ? 0x3d2a6a : 0x2a2438, 1);
      g.fillRoundedRect(-99, -79, 198, 158, 18);
      c.add(g);
      bakeInPlace(g, { x0: -108, y0: -88, w: 216, h: 176 }, `hub_tile_${open}`);
      const img = this.add.image(0, -28, icon).setScale(scale);
      if (!open) img.setTint(0x333333).setAlpha(0.7);
      c.add([img, uiText(this, 0, 34, title, 19, open ? '#ffffff' : PAL.uiDim, 4), uiText(this, 0, 60, sub, 14, open ? PAL.goldCss : PAL.uiDim, 3).setWordWrapWidth(190)]);
      if (dot) {
        const d = this.add.circle(76, -62, 13, 0xff4d5e).setStrokeStyle(3, PAL.ink);
        c.add([d, uiText(this, 76, -63, '!', 20, '#ffffff', 3)]);
      }
      c.setSize(208, 168).setInteractive({ useHandCursor: true });
      c.on('pointerdown', () => {
        if (!open) {
          this.lockedMsg(done ? 'Em breve!' : 'Termine o tutorial (Campos de Vellmora) para abrir');
          return;
        }
        playSfx('ui');
        this.tweens.add({ targets: c, scale: 0.94, duration: 70, yoyo: true });
        onTap();
      });
    };
    const today = dailySetup(new Date());
    const rift = save.data.riftBest > 0 ? `Recorde: onda ${save.data.riftBest}` : '40 ondas sem fim';
    tile(130, 'portal', 0.7, 'Fenda Infinita', done ? rift : '🔒 Fim do tutorial', done, () => this.showStageCard('rift'));
    tile(360, 'icon_daily', 0.8, 'Desafio do dia', done ? 'Igual para todos' : '🔒 Fim do tutorial', done, () => this.showDailyCard(), done && save.dailyBest(today.key) === 0);
    tile(590, 'icon_codex', 0.7, 'Novo modo', 'Em breve', false, () => undefined);

    this.navBar(false);
    this.cameras.main.fadeIn(250, 11, 7, 22);
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
    const mon = this.add.image(n.x + side * (r + 56), n.y + 10, `enemy_${n.enemy}`).setScale(boss ? 0.9 : 1);
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
    g.fillRoundedRect(-320, -330, 640, 720, 30);
    g.fillStyle(0x2a1a4d, 1);
    g.fillRoundedRect(-315, -325, 630, 710, 26);
    c.add([shade, g]);
    c.add(uiText(this, 0, -282, st.name, 34, '#f3e9ff', 7));
    c.add(uiText(this, 0, -236, st.subtitle, 21, PAL.uiDim, 5).setWordWrapWidth(560));
    if (id === 'rift') {
      c.add(uiText(this, 0, -178, save.data.riftBest > 0 ? `Seu recorde: onda ${save.data.riftBest}` : 'Sem recorde ainda', 26, PAL.goldCss, 5));
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
      const img = this.add.image(0, -6, def.texture).setScale(0.62);
      if (!unlocked) img.setTint(0x111111).setAlpha(0.6);
      if (!animate && selected) this.tweens.add({ targets: img, scale: { from: 0.74, to: 0.62 }, duration: 220, ease: 'Back.easeOut' });
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
    if (id !== 'rift') {
      const done = save.data.challenges[id] ?? [];
      CHALLENGES[id].forEach((ch, i) => {
        c.add(uiText(this, 0, 150 + i * 30, `${done[i] ? '✔' : '○'} ${challengeText(ch)}`, 20, done[i] ? '#9be89b' : PAL.uiText, 4));
      });
    }

    // Região 2 bosses: show the shields in advance, so the build can be planned.
    const bossId = st.waves.flatMap((w) => w.groups.map((gr) => gr.enemy)).find((e) => ENEMIES[e].boss?.shields);
    const shields = bossId ? ENEMIES[bossId].boss!.shields! : null;
    if (shields) c.add(uiText(this, 0, 232, `Escudos do chefe: ${shields.reactions.map((r) => REACTIONS[r].name).join(' → ')}`, 17, '#ffb38a', 4).setWordWrapWidth(580));

    // Equipped Relíquias (they apply to every mode except the daily challenge).
    const eq = save.data.equipped;
    const ry = shields ? 268 : 252;
    c.add(uiText(this, eq.length ? -130 : 0, ry, eq.length ? 'Relíquias:' : 'Sem relíquias equipadas', 19, PAL.uiDim, 4));
    eq.forEach((rid, i) => c.add(this.add.image(-30 + i * 56, ry, `relic_${rid}`).setScale(0.5)));

    c.add(
      new Button(this, 0, shields ? 332 : 316, {
        width: 360,
        height: shields ? 80 : 90,
        label: 'JOGAR',
        fontSize: 42,
        color: 0x3aa655,
        onClick: () => {
          this.cameras.main.fadeOut(220, 11, 7, 22);
          this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Battle', { stage: id, hero: getSave().data.hero }));
        },
      }),
    );
    if (animate) {
      c.setScale(0.7).setAlpha(0);
      this.tweens.add({ targets: c, scale: 1, alpha: 1, duration: 220, ease: 'Back.easeOut' });
    }
    this.card = c;
  }

  /** Today's challenge: fixed stage, hero, starting boon and seed — the same for everyone. */
  private showDailyCard(): void {
    this.card?.destroy();
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
    c.add(this.add.image(-170, -80, hero.texture).setScale(1.25));
    c.add(uiText(this, 80, -150, `Herói: ${hero.name}`, 26, PAL.uiText, 5));
    c.add(uiText(this, 80, -108, STAGES[d.stage].name, 22, PAL.goldCss, 5));
    c.add(uiText(this, 80, -58, `Começa com: ${boon.name}`, 22, '#e0c8ff', 5).setWordWrapWidth(330));
    c.add(uiText(this, 80, -8, boon.desc, 18, PAL.uiDim, 4).setWordWrapWidth(330));
    const best = save.dailyBest(d.key);
    c.add(uiText(this, 0, 96, best > 0 ? `Melhor de hoje: ${best} pontos` : 'Você ainda não jogou hoje', 26, best > 0 ? PAL.goldCss : PAL.uiText, 5));
    c.add(uiText(this, 0, 140, 'Vitória +1000 • cada vida +100 • cada reação +10', 18, PAL.uiDim, 4));
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
    const toggles: [('sound' | 'music' | 'vibration' | 'shake' | 'bigText'), string][] = [
      ['sound', 'Efeitos sonoros'],
      ['music', 'Música'],
      ['vibration', 'Vibração'],
      ['shake', 'Tremor de tela'],
      ['bigText', 'Textos maiores'],
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
    c.add(economyButton(this, 0, 52, 440));
    c.add(uiText(this, 0, 96, 'Automático baixa a resolução sozinho se o jogo ficar lento.', 16, PAL.uiDim, 4).setWordWrapWidth(500));
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
