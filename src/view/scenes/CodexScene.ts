import * as Phaser from 'phaser';
import { ENEMY_PIC, enemyKey } from '../../assets/manifest';
import { bakeInPlace } from '../ui/bake';
import { fitCamera, frameCap } from '../perf';
import { CODEX_ENEMIES, enemyFacts, REACTION_EFFECT, reactionName, reactionRecipe } from '../../data/codex';
import { GAME_HEIGHT, GAME_WIDTH } from '../../data/config';
import { ENEMIES, type EnemyId } from '../../data/enemies';
import { REACTION_IDS, REACTIONS } from '../../data/reactions';
import { getSave } from '../../meta/save';
import { PAL } from '../art/palette';
import { paintMapBackground } from '../battle/MapView';
import { playSfx } from '../audio/sfx';
import { Button, uiText } from '../ui/Button';

type Tab = 'enemies' | 'reactions';

/** Códice: a book filled by playing — enemies met and reactions caused. */
export class CodexScene extends Phaser.Scene {
  private page: Phaser.GameObjects.Container | null = null;
  private detail: Phaser.GameObjects.Container | null = null;
  private tabs: Record<Tab, Button> | null = null;

  constructor() {
    super('Codex');
  }

  create(): void {
    fitCamera(this);
    frameCap(this, 'menu');
    paintMapBackground(this, [], 'codex_bg');
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0b0716, 0.55);
    const save = getSave();
    const head = this.add.graphics();
    head.fillStyle(PAL.panel, 0.92);
    head.fillRoundedRect(-20, -20, GAME_WIDTH + 40, 140, 24);
    bakeInPlace(head, { x0: -24, y0: -24, w: GAME_WIDTH + 48, h: 148 }, 'codex_head');
    uiText(this, GAME_WIDTH / 2, 44, 'Códice', 44, '#f3e9ff', 8);
    const ne = save.data.codex.enemies.length;
    const nr = save.data.codex.reactions.length;
    uiText(this, GAME_WIDTH / 2, 94, `Inimigos ${ne}/${CODEX_ENEMIES.length}   •   Reações ${nr}/${REACTION_IDS.length}`, 24, PAL.goldCss, 5);

    this.tabs = {
      enemies: new Button(this, 190, 176, { width: 300, height: 64, label: 'Inimigos', fontSize: 26, onClick: () => this.show('enemies') }),
      reactions: new Button(this, 530, 176, { width: 300, height: 64, label: 'Reações', fontSize: 26, onClick: () => this.show('reactions') }),
    };
    // Footer: always on top of the pages, with its own solid bar.
    const foot = this.add.graphics().setDepth(20);
    foot.fillStyle(PAL.panel, 0.96);
    foot.fillRoundedRect(-20, GAME_HEIGHT - 116, GAME_WIDTH + 40, 140, 24);
    foot.setInteractive(new Phaser.Geom.Rectangle(0, GAME_HEIGHT - 116, GAME_WIDTH, 116), Phaser.Geom.Rectangle.Contains);
    new Button(this, GAME_WIDTH / 2, GAME_HEIGHT - 58, {
      width: 360,
      height: 80,
      label: '◀ Voltar ao mapa',
      fontSize: 28,
      color: 0x6b6480,
      onClick: () => this.scene.start('WorldMap'),
    }).setDepth(21);
    this.show('enemies');
    this.cameras.main.fadeIn(200, 11, 7, 22);
  }

  private show(tab: Tab): void {
    this.page?.destroy();
    this.detail?.destroy();
    this.detail = null;
    for (const [k, b] of Object.entries(this.tabs!)) b.setColor(k === tab ? 0x8a3fd0 : 0x4a3a66);
    this.page = this.add.container(0, 0);
    if (tab === 'enemies') this.enemyGrid();
    else this.reactionList();
  }

  private enemyGrid(): void {
    const known = new Set(getSave().data.codex.enemies);
    CODEX_ENEMIES.forEach((id, i) => {
      // 4 per row so every monster fits above the footer.
      const col = i % 4;
      const row = Math.floor(i / 4);
      const x = 99 + col * 174;
      const y = 316 + row * 172;
      const seen = known.has(id);
      const c = this.add.container(x, y);
      const g = this.add.graphics();
      g.fillStyle(PAL.ink, 1);
      g.fillRoundedRect(-82, -80, 164, 162, 18);
      g.fillStyle(seen ? 0x3d2a6a : 0x241a3a, 1);
      g.fillRoundedRect(-78, -76, 156, 154, 15);
      const img = this.add.image(0, -14, enemyKey(this.textures, id)).setScale((ENEMIES[id].boss ? 0.55 : 0.9) * ENEMY_PIC);
      if (!seen) img.setTint(0x0d0a16).setAlpha(0.85);
      c.add([g, img, uiText(this, 0, 58, seen ? ENEMIES[id].name : '???', 16, seen ? PAL.uiText : PAL.uiDim, 4).setWordWrapWidth(150)]);
      c.setSize(164, 162).setInteractive({ useHandCursor: true });
      c.on('pointerdown', () => {
        playSfx(seen ? 'ui' : 'error');
        if (seen) this.enemyDetail(id);
      });
      this.page!.add(c);
    });
  }

  private enemyDetail(id: EnemyId): void {
    this.detail?.destroy();
    const c = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2).setDepth(10);
    const shade = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x07040f, 0.65).setInteractive();
    shade.on('pointerdown', () => {
      c.destroy();
      this.detail = null;
    });
    const g = this.add.graphics();
    g.fillStyle(PAL.ink, 1);
    g.fillRoundedRect(-300, -260, 600, 520, 30);
    g.fillStyle(0x2a1a4d, 1);
    g.fillRoundedRect(-295, -255, 590, 510, 26);
    c.add([shade, g]);
    c.add(this.add.image(0, -150, enemyKey(this.textures, id)).setScale((ENEMIES[id].boss ? 1.1 : 1.8) * ENEMY_PIC));
    c.add(uiText(this, 0, -50, ENEMIES[id].name, 36, '#ffffff', 7));
    enemyFacts(id).forEach((f, i) => c.add(uiText(this, 0, -6 + i * 40, f, 23, i === 0 ? PAL.goldCss : PAL.uiText, 5)));
    c.add(uiText(this, 0, 228, 'toque fora para fechar', 18, PAL.uiDim, 4));
    c.setScale(0.8).setAlpha(0);
    this.tweens.add({ targets: c, scale: 1, alpha: 1, duration: 200, ease: 'Back.easeOut' });
    this.detail = c;
  }

  private reactionList(): void {
    const known = new Set(getSave().data.codex.reactions);
    REACTION_IDS.forEach((id, i) => {
      const y = 280 + i * 100; // compact rows: all reactions fit above the footer
      const seen = known.has(id);
      const color = REACTIONS[id].color;
      const g = this.add.graphics();
      g.fillStyle(PAL.ink, 1);
      g.fillRoundedRect(30, y - 46, GAME_WIDTH - 60, 92, 18);
      g.fillStyle(seen ? 0x3d2a6a : 0x241a3a, 1);
      g.fillRoundedRect(35, y - 41, GAME_WIDTH - 70, 82, 15);
      g.fillStyle(seen ? color : 0x3a3350, 1);
      g.fillRoundedRect(35, y - 41, 14, 82, { tl: 15, bl: 15, tr: 0, br: 0 });
      const css = `#${color.toString(16).padStart(6, '0')}`;
      this.page!.add(g);
      this.page!.add(uiText(this, 70, y - 22, seen ? reactionName(id) : '???', 24, seen ? css : PAL.uiDim, 6).setOrigin(0, 0.5));
      this.page!.add(
        uiText(this, 70, y + 2, seen ? reactionRecipe(id) : 'Combine elementos para descobrir', 16, seen ? PAL.uiText : PAL.uiDim, 4)
          .setOrigin(0, 0.5)
          .setAlign('left')
          .setWordWrapWidth(610),
      );
      if (seen) this.page!.add(uiText(this, 70, y + 24, REACTION_EFFECT[id], 16, '#ffe34d', 4).setOrigin(0, 0.5).setAlign('left'));
    });
  }
}
