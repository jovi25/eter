import * as Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../../data/config';
import type { EnemyId } from '../../data/enemies';
import { STAGE_ORDER, STAGES, type StageId } from '../../data/stages';
import { getSave } from '../../meta/save';
import { playSfx } from '../audio/sfx';
import { PAL } from '../art/palette';
import { animKey, ENEMY_SPRITES } from '../art/sprites';
import { paintTileBackground } from '../battle/MapView';
import { Button, uiText } from '../ui/Button';

const NODES: Record<StageId, { x: number; y: number; enemy: EnemyId }> = {
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
    const save = getSave();
    paintTileBackground(this, [TRAIL], Object.values(NODES), 'world_tiles');

    // Header
    const head = this.add.graphics();
    head.fillStyle(PAL.panel, 0.9);
    head.fillRoundedRect(-20, -20, GAME_WIDTH + 40, 140, 24);
    uiText(this, GAME_WIDTH / 2, 44, 'Campos de Vellmora', 40, '#f3e9ff', 8);
    uiText(this, GAME_WIDTH / 2, 92, `★ ${save.totalStars()} / ${STAGE_ORDER.length * 3}`, 28, PAL.goldCss, 6);

    STAGE_ORDER.forEach((id, i) => this.node(id, i, save.isUnlocked(id), save.stars(id)));

    // Footer: backup
    const foot = this.add.graphics();
    foot.fillStyle(PAL.panel, 0.9);
    foot.fillRoundedRect(-20, GAME_HEIGHT - 100, GAME_WIDTH + 40, 140, 24);
    new Button(this, 190, GAME_HEIGHT - 52, {
      width: 300,
      height: 68,
      label: 'Copiar backup',
      fontSize: 24,
      color: 0x3d7bd9,
      onClick: () => this.exportSave(),
    });
    new Button(this, 530, GAME_HEIGHT - 52, {
      width: 300,
      height: 68,
      label: 'Restaurar backup',
      fontSize: 24,
      color: 0x6b6480,
      onClick: () => this.importSave(),
    });
    this.cameras.main.fadeIn(250, 11, 7, 22);
  }

  private node(id: StageId, index: number, unlocked: boolean, stars: number): void {
    const n = NODES[id];
    const st = STAGES[id];
    const boss = id === 'v5';
    const c = this.add.container(n.x, n.y);
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
    const spr = ENEMY_SPRITES[n.enemy];
    const side = n.x < GAME_WIDTH / 2 ? 1 : -1;
    const mon = this.add.sprite(n.x + side * (r + 52), n.y + 24, 'dungeon', `${spr.frames}0`).setOrigin(0.5, 1).setScale(spr.scale);
    mon.play(animKey(spr.frames));
    if (spr.tint) mon.setTint(spr.tint);
    if (!unlocked) mon.setTint(0x222222).setAlpha(0.7);
    mon.setFlipX(side < 0);

    // Label + stars
    const label = this.add.container(n.x, n.y + r + 34);
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

  /** Small panel with the stage description and a big JOGAR button. */
  private showStageCard(id: StageId): void {
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
    g.fillRoundedRect(-280, -200, 560, 400, 30);
    g.fillStyle(0x2a1a4d, 1);
    g.fillRoundedRect(-275, -195, 550, 390, 26);
    c.add([shade, g]);
    c.add(uiText(this, 0, -150, st.name, 34, '#f3e9ff', 7));
    c.add(uiText(this, 0, -100, st.subtitle, 22, PAL.uiDim, 5).setWordWrapWidth(500));
    for (let s = 0; s < 3; s++) c.add(this.add.image((s - 1) * 70, -30, s < save.stars(id) ? 'star' : 'starEmpty').setScale(0.75));
    c.add(uiText(this, 0, 40, '10 ondas', 24, PAL.uiText, 5));
    c.add(
      new Button(this, 0, 120, {
        width: 360,
        height: 90,
        label: 'JOGAR',
        fontSize: 42,
        color: 0x3aa655,
        onClick: () => {
          this.cameras.main.fadeOut(220, 11, 7, 22);
          this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Battle', { stage: id }));
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
