import * as Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../../data/config';
import { BOONS, RARITY_COLOR, RARITY_LABEL, type BoonDef, type BoonId } from '../../data/boons';
import { playSfx } from '../audio/sfx';
import { PAL } from '../art/palette';
import { vibrate } from '../settings';
import { uiText } from '../ui/Button';
import { DEPTH } from './layers';

const CARD_W = 620;
const CARD_H = 170;

/** "Bênção de Éter": the match pauses and the player picks 1 of 3 cards. */
export class BoonPicker {
  private objs: Phaser.GameObjects.GameObject[] = [];
  private done = false;

  constructor(scene: Phaser.Scene, options: BoonId[], onPick: (index: number) => void) {
    const shade = scene.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x07040f, 0).setDepth(DEPTH.panel).setInteractive();
    scene.tweens.add({ targets: shade, fillAlpha: 0.78, duration: 200 });
    const rays = scene.add.image(GAME_WIDTH / 2, 300, 'spark').setDepth(DEPTH.panel).setScale(24).setTint(0xb57bff).setAlpha(0.35).setBlendMode(Phaser.BlendModes.ADD);
    scene.tweens.add({ targets: rays, scale: 28, alpha: 0.5, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    const title = uiText(scene, GAME_WIDTH / 2, 250, 'BÊNÇÃO DE ÉTER', 58, '#f3e9ff', 10).setDepth(DEPTH.panel + 1).setScale(0);
    const sub = uiText(scene, GAME_WIDTH / 2, 312, 'Escolha 1 poder para esta partida', 26, PAL.uiDim, 5).setDepth(DEPTH.panel + 1).setAlpha(0);
    scene.tweens.add({ targets: title, scale: 1, duration: 320, ease: 'Back.easeOut' });
    scene.tweens.add({ targets: sub, alpha: 1, delay: 200, duration: 250 });
    this.objs.push(shade, rays, title, sub);
    playSfx('boon');
    vibrate(25);

    options.forEach((id, i) => {
      const def = BOONS[id] as BoonDef;
      const y = 470 + i * (CARD_H + 26);
      const rc = RARITY_COLOR[def.rarity];
      const card = scene.add.container(GAME_WIDTH / 2, y).setDepth(DEPTH.panel + 1);
      const g = scene.add.graphics();
      g.fillStyle(PAL.ink, 1);
      g.fillRoundedRect(-CARD_W / 2 - 5, -CARD_H / 2 - 5, CARD_W + 10, CARD_H + 14, 28);
      g.fillStyle(rc, 1);
      g.fillRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 24);
      g.fillStyle(0x241640, 1);
      g.fillRoundedRect(-CARD_W / 2 + 6, -CARD_H / 2 + 6, CARD_W - 12, CARD_H - 12, 19);
      g.fillStyle(def.color, 0.16);
      g.fillRoundedRect(-CARD_W / 2 + 6, -CARD_H / 2 + 6, CARD_W - 12, CARD_H - 12, 19);
      // emblem
      g.fillStyle(PAL.ink, 1);
      g.fillCircle(-CARD_W / 2 + 84, 0, 54);
      g.fillStyle(def.color, 1);
      g.fillCircle(-CARD_W / 2 + 84, 0, 48);
      g.fillStyle(0xffffff, 0.25);
      g.fillEllipse(-CARD_W / 2 + 76, -18, 56, 26);
      const icon = scene.add.image(-CARD_W / 2 + 84, 0, 'icon_catalyze').setScale(0.95);
      const name = uiText(scene, -CARD_W / 2 + 160, -40, def.name, 32, '#ffffff', 6).setOrigin(0, 0.5);
      const rarity = uiText(scene, CARD_W / 2 - 24, -CARD_H / 2 + 26, RARITY_LABEL[def.rarity].toUpperCase(), 17, `#${rc.toString(16).padStart(6, '0')}`, 4).setOrigin(1, 0.5);
      const desc = uiText(scene, -CARD_W / 2 + 160, 22, def.desc, 23, PAL.uiText, 4).setOrigin(0, 0.5).setAlign('left').setWordWrapWidth(CARD_W - 190);
      card.add([g, icon, name, rarity, desc]);
      card.setSize(CARD_W, CARD_H).setInteractive({ useHandCursor: true });
      card.setX(GAME_WIDTH + CARD_W);
      scene.tweens.add({ targets: card, x: GAME_WIDTH / 2, delay: 220 + i * 110, duration: 380, ease: 'Back.easeOut' });
      scene.tweens.add({ targets: icon, angle: 360, duration: 6000, repeat: -1 });
      card.on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, ev: Phaser.Types.Input.EventData) => {
        ev.stopPropagation();
        if (this.done) return;
        this.done = true;
        playSfx('upgrade');
        vibrate([20, 30, 40]);
        scene.tweens.add({ targets: card, scale: 1.08, duration: 140, yoyo: true, ease: 'Quad.easeOut' });
        scene.time.delayedCall(320, () => {
          this.destroy();
          onPick(i);
        });
      });
      this.objs.push(card);
    });
  }

  destroy(): void {
    for (const o of this.objs) o.destroy();
    this.objs = [];
  }
}
