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
import { RIFT, STAGE_ORDER, STAGES, type CampaignStageId, type StageId } from '../../data/stages';
import { getSave } from '../../meta/save';
import { playSfx } from '../audio/sfx';
import { PAL } from '../art/palette';
import { paintMapBackground, placeDecor } from '../battle/MapView';
import { Button, uiText } from '../ui/Button';

const NODES: Record<CampaignStageId, { x: number; y: number; enemy: EnemyId }> = {
  v1: { x: 192, y: 1008, enemy: 'slime' },
  v2: { x: 528, y: 864, enemy: 'salamander' },
  v3: { x: 192, y: 672, enemy: 'yeti' },
  v4: { x: 528, y: 480, enemy: 'shaman' },
  v5: { x: 360, y: 288, enemy: 'herald' },
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

/** Region 1 map: 5 stages along a trail; stars; locked stages; save backup. */
export class WorldMapScene extends Phaser.Scene {
  constructor() {
    super('WorldMap');
  }

  create(): void {
    fitCamera(this);
    frameCap(this, 'menu');
    playMusic('map');
    setMusicIntensity(0);
    const save = getSave();
    paintMapBackground(this, [TRAIL], 'world_bg');
    placeDecor(this, [TRAIL], Object.values(NODES).flatMap((n) => [n, { x: n.x + (n.x < GAME_WIDTH / 2 ? 110 : -110), y: n.y }]), 99, 26);

    // Header
    const head = this.add.graphics();
    head.fillStyle(PAL.panel, 0.9);
    head.fillRoundedRect(-20, -20, GAME_WIDTH + 40, 140, 24);
    bakeInPlace(head, { x0: -24, y0: -24, w: GAME_WIDTH + 48, h: 148 }, 'map_head');
    uiText(this, GAME_WIDTH / 2, 42, 'Campos de Vellmora', 38, '#f3e9ff', 8);
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

    STAGE_ORDER.forEach((id, i) => this.node(id, i, save.isUnlocked(id), save.stars(id)));
    this.riftNode();

    // Bottom navigation: big painted icons, a dot when something is waiting.
    const foot = this.add.graphics().setDepth(44);
    foot.fillStyle(PAL.panel, 0.94);
    foot.fillRoundedRect(-20, GAME_HEIGHT - 128, GAME_WIDTH + 40, 160, 28);
    foot.lineStyle(4, 0x5a3fb0, 1);
    foot.strokeRoundedRect(-20, GAME_HEIGHT - 128, GAME_WIDTH + 40, 160, 28);
    bakeInPlace(foot, { x0: -24, y0: GAME_HEIGHT - 132, w: GAME_WIDTH + 48, h: 168 }, 'map_foot');
    const today = dailySetup(new Date());
    const playedToday = save.dailyBest(today.key) > 0;
    const chestReady = save.data.coins >= COINS.chestPrice || !!save.data.chest.pending;
    this.navItem(90, 'nav_pink', 'icon_daily', 'Desafio do dia', !playedToday, () => this.showDailyCard());
    this.navItem(270, 'nav_purple', 'chest', 'Relicário', chestReady, () => this.go('Relics'), 0.34);
    this.navItem(450, 'nav_blue', 'icon_codex', 'Códice', false, () => this.go('Codex'));
    this.navItem(630, 'nav_gray', 'icon_gear', 'Opções', false, () => this.showOptionsCard());
    this.cameras.main.fadeIn(250, 11, 7, 22);
  }

  /** The Fenda Infinita: a swirling portal off the main trail, with the player's record. */
  private riftNode(): void {
    const save = getSave();
    const unlocked = save.isUnlocked('rift');
    const x = 588;
    const y = 1016;
    const portal = this.add.image(x, y, 'portal').setDepth(40).setScale(0.95);
    this.tweens.add({ targets: portal, angle: 360, duration: 5000, repeat: -1 });
    if (!unlocked) portal.setTint(0x555555).setAlpha(0.8);
    else this.tweens.add({ targets: portal, scale: 1.05, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    const label = this.add.container(x - 40, y + 86).setDepth(41);
    const lg = this.add.graphics();
    lg.fillStyle(PAL.ink, 0.88);
    lg.fillRoundedRect(-150, -32, 300, 64, 16);
    label.add(lg);
    bakeInPlace(lg, { x0: -152, y0: -34, w: 304, h: 68 }, 'rift_label');
    label.add(uiText(this, 0, -12, 'Fenda Infinita', 22, unlocked ? '#e0c8ff' : PAL.uiDim, 4));
    const n = STAGE_ORDER.indexOf(RIFT.unlockAfter) + 1;
    label.add(uiText(this, 0, 14, unlocked ? (save.data.riftBest > 0 ? `Recorde: onda ${save.data.riftBest}` : 'Até onde você aguenta?') : `🔒 Vença a fase ${n}`, 17, unlocked ? PAL.goldCss : PAL.uiDim, 4));
    if (!unlocked) return;
    const zone = this.add.zone(x, y, 150, 150).setDepth(42).setInteractive({ useHandCursor: true });
    zone.on('pointerdown', () => {
      playSfx('ui');
      this.showStageCard('rift');
    });
  }

  private node(id: CampaignStageId, index: number, unlocked: boolean, stars: number): void {
    const n = NODES[id];
    const st = STAGES[id];
    const boss = id === 'v5';
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
    const role = uiText(this, 0, 92, HEROES[save.data.hero].role, 18, PAL.uiDim, 4).setWordWrapWidth(560);
    c.add(role);
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
      if (!unlocked && def.unlockAfter) {
        const n = STAGE_ORDER.indexOf(def.unlockAfter) + 1;
        slot.add(uiText(this, 0, -10, `🔒\nVença a\nfase ${n}`, 15, '#ffffff', 4));
      }
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

    // Equipped Relíquias (they apply to every mode except the daily challenge).
    const eq = save.data.equipped;
    c.add(uiText(this, eq.length ? -130 : 0, 252, eq.length ? 'Relíquias:' : 'Sem relíquias equipadas', 19, PAL.uiDim, 4));
    eq.forEach((rid, i) => c.add(this.add.image(-30 + i * 56, 252, `relic_${rid}`).setScale(0.5)));

    c.add(
      new Button(this, 0, 316, {
        width: 360,
        height: 90,
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

  private go(scene: string): void {
    this.cameras.main.fadeOut(180, 11, 7, 22);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(scene));
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
    const toggles: [('sound' | 'music' | 'vibration' | 'shake'), string][] = [
      ['sound', 'Efeitos sonoros'],
      ['music', 'Música'],
      ['vibration', 'Vibração'],
      ['shake', 'Tremor de tela'],
    ];
    toggles.forEach(([key, name], i) => {
      const label = () => `${name}: ${getSettings()[key] ? 'LIGADO' : 'DESLIGADO'}`;
      const btn = new Button(this, 0, -262 + i * 74, {
        width: 440,
        height: 60,
        label: label(),
        fontSize: 22,
        color: getSettings()[key] ? 0x3aa655 : 0x6b6480,
        onClick: () => {
          setSetting(key, !getSettings()[key]);
          if (key === 'music') refreshMusic();
          btn.setLabel(label()).setColor(getSettings()[key] ? 0x3aa655 : 0x6b6480);
        },
      });
      c.add(btn);
    });
    c.add(economyButton(this, 0, 34, 440));
    c.add(uiText(this, 0, 82, 'Automático baixa a resolução sozinho se o jogo ficar lento.', 16, PAL.uiDim, 4).setWordWrapWidth(500));
    c.add(uiText(this, 0, 150, 'Backup do progresso', 24, PAL.goldCss, 5));
    c.add(new Button(this, -112, 214, { width: 214, height: 62, label: 'Copiar', fontSize: 22, color: 0x3d7bd9, onClick: () => { close(); this.exportSave(); } }));
    c.add(new Button(this, 112, 214, { width: 214, height: 62, label: 'Restaurar', fontSize: 22, color: 0x6b6480, onClick: () => { close(); this.importSave(); } }));
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
