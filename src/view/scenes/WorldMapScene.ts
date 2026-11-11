import * as Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../../data/config';
import type { EnemyId } from '../../data/enemies';
import { BOONS } from '../../data/boons';
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
    playMusic('map');
    setMusicIntensity(0);
    const save = getSave();
    paintMapBackground(this, [TRAIL], 'world_bg');
    placeDecor(this, [TRAIL], Object.values(NODES).flatMap((n) => [n, { x: n.x + (n.x < GAME_WIDTH / 2 ? 110 : -110), y: n.y }]), 99, 26);

    // Header
    const head = this.add.graphics();
    head.fillStyle(PAL.panel, 0.9);
    head.fillRoundedRect(-20, -20, GAME_WIDTH + 40, 140, 24);
    uiText(this, GAME_WIDTH / 2 - 50, 44, 'Campos de Vellmora', 38, '#f3e9ff', 8);
    new Button(this, 636, 46, {
      width: 132,
      height: 60,
      label: 'Códice',
      fontSize: 22,
      color: 0x8a3fd0,
      onClick: () => {
        this.cameras.main.fadeOut(180, 11, 7, 22);
        this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Codex'));
      },
    }).setDepth(45);
    uiText(this, GAME_WIDTH / 2, 92, `★ ${save.totalStars()}/${STAGE_ORDER.length * 3}     ✔ ${save.challengesDone()}/${TOTAL_CHALLENGES} desafios`, 28, PAL.goldCss, 6);

    STAGE_ORDER.forEach((id, i) => this.node(id, i, save.isUnlocked(id), save.stars(id)));
    this.riftNode();

    // Footer: backup
    const foot = this.add.graphics();
    foot.fillStyle(PAL.panel, 0.9);
    foot.fillRoundedRect(-20, GAME_HEIGHT - 100, GAME_WIDTH + 40, 140, 24);
    const today = dailySetup(new Date());
    const best = save.dailyBest(today.key);
    const dailyBtn = new Button(this, 176, GAME_HEIGHT - 52, {
      width: 316,
      height: 72,
      label: best > 0 ? `Desafio do dia ✔` : 'Desafio do dia',
      fontSize: 25,
      color: 0xb0479a,
      onClick: () => this.showDailyCard(),
    });
    if (best === 0) this.tweens.add({ targets: dailyBtn, scale: 1.05, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    new Button(this, 448, GAME_HEIGHT - 52, { width: 190, height: 64, label: 'Backup', fontSize: 22, color: 0x3d7bd9, onClick: () => this.exportSave() });
    new Button(this, 628, GAME_HEIGHT - 52, { width: 150, height: 64, label: 'Restaurar', fontSize: 20, color: 0x6b6480, onClick: () => this.importSave() });
    this.cameras.main.fadeIn(250, 11, 7, 22);
  }

  /** The Fenda Infinita: a swirling portal off the main trail, with the player's record. */
  private riftNode(): void {
    const save = getSave();
    const unlocked = save.isUnlocked('rift');
    const x = 588;
    const y = 1050;
    const portal = this.add.image(x, y, 'portal').setDepth(40).setScale(0.95);
    this.tweens.add({ targets: portal, angle: 360, duration: 5000, repeat: -1 });
    if (!unlocked) portal.setTint(0x555555).setAlpha(0.8);
    else this.tweens.add({ targets: portal, scale: 1.05, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    const label = this.add.container(x - 40, y + 86).setDepth(41);
    const lg = this.add.graphics();
    lg.fillStyle(PAL.ink, 0.88);
    lg.fillRoundedRect(-150, -32, 300, 64, 16);
    label.add(lg);
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
