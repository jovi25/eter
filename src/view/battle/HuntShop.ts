import * as Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../../data/config';
import { BOONS, RARITY_COLOR, RARITY_LABEL, type BoonDef, type BoonId } from '../../data/boons';
import { playSfx } from '../audio/sfx';
import { PAL } from '../art/palette';
import { vibrate } from '../settings';
import { Button, uiText } from '../ui/Button';
import { DEPTH } from './layers';

const CARD_W = 620;
const CARD_H = 158;

/** Caçada de Chefes: the short shop between bosses. Bênçãos for match gold; buy any, then move on. */
export class HuntShop {
  private objs: Phaser.GameObjects.GameObject[] = [];
  private done = false;

  constructor(
    private scene: Phaser.Scene,
    items: { boon: BoonId; cost: number; sold: boolean }[],
    cb: { gold: () => number; onBuy: (index: number) => boolean; onClose: () => void; next: number },
  ) {
    const shade = scene.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x07040f, 0).setDepth(DEPTH.panel).setInteractive();
    scene.tweens.add({ targets: shade, fillAlpha: 0.8, duration: 200 });
    const title = uiText(scene, GAME_WIDTH / 2, 236, 'LOJA DA CAÇADA', 54, '#ffd34d', 10).setDepth(DEPTH.panel + 1).setScale(0);
    const sub = uiText(scene, GAME_WIDTH / 2, 296, `Chefe derrotado! Próximo: chefe ${cb.next}. O relógio está parado.`, 23, PAL.uiDim, 5).setDepth(DEPTH.panel + 1);
    const goldText = uiText(scene, GAME_WIDTH / 2, 344, '', 30, PAL.goldCss, 6).setDepth(DEPTH.panel + 1);
    const showGold = () => goldText.setText(`Seu ouro: ${cb.gold()}`);
    showGold();
    scene.tweens.add({ targets: title, scale: 1, duration: 320, ease: 'Back.easeOut' });
    this.objs.push(shade, title, sub, goldText);
    playSfx('boon');
    vibrate(25);

    const cards: { root: Phaser.GameObjects.Container; price: Phaser.GameObjects.Text; cost: number; sold: boolean }[] = [];
    const refresh = () => {
      showGold();
      for (const c of cards) {
        if (c.sold) {
          c.price.setText('COMPRADO').setColor('#9be89b');
          c.root.setAlpha(0.55);
        } else c.price.setColor(cb.gold() >= c.cost ? PAL.goldCss : PAL.redCss);
      }
    };
    items.forEach((it, i) => {
      const def = BOONS[it.boon] as BoonDef;
      const y = 470 + i * (CARD_H + 22);
      const rc = RARITY_COLOR[def.rarity];
      const card = scene.add.container(GAME_WIDTH / 2, y).setDepth(DEPTH.panel + 1);
      const g = scene.add.graphics();
      g.fillStyle(PAL.ink, 1);
      g.fillRoundedRect(-CARD_W / 2 - 5, -CARD_H / 2 - 5, CARD_W + 10, CARD_H + 14, 26);
      g.fillStyle(rc, 1);
      g.fillRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 22);
      g.fillStyle(0x2a1a2a, 1);
      g.fillRoundedRect(-CARD_W / 2 + 6, -CARD_H / 2 + 6, CARD_W - 12, CARD_H - 12, 18);
      g.fillStyle(def.color, 0.16);
      g.fillRoundedRect(-CARD_W / 2 + 6, -CARD_H / 2 + 6, CARD_W - 12, CARD_H - 12, 18);
      // price tag on the left
      g.fillStyle(PAL.ink, 1);
      g.fillRoundedRect(-CARD_W / 2 + 18, -36, 120, 72, 18);
      g.fillStyle(0x3a2a14, 1);
      g.fillRoundedRect(-CARD_W / 2 + 22, -32, 112, 64, 15);
      const coin = scene.add.image(-CARD_W / 2 + 50, -6, 'coin').setScale(0.7);
      const price = uiText(scene, -CARD_W / 2 + 78, 18, `${it.cost}`, 24, PAL.goldCss, 5);
      const name = uiText(scene, -CARD_W / 2 + 160, -38, def.name, 30, '#ffffff', 6).setOrigin(0, 0.5);
      const rarity = uiText(scene, CARD_W / 2 - 24, -CARD_H / 2 + 24, RARITY_LABEL[def.rarity].toUpperCase(), 16, `#${rc.toString(16).padStart(6, '0')}`, 4).setOrigin(1, 0.5);
      const desc = uiText(scene, -CARD_W / 2 + 160, 20, def.desc, 21, PAL.uiText, 4).setOrigin(0, 0.5).setAlign('left').setWordWrapWidth(CARD_W - 190);
      card.add([g, coin, price, name, rarity, desc]);
      card.setSize(CARD_W, CARD_H).setInteractive({ useHandCursor: true });
      card.setX(GAME_WIDTH + CARD_W);
      scene.tweens.add({ targets: card, x: GAME_WIDTH / 2, delay: 200 + i * 100, duration: 360, ease: 'Back.easeOut' });
      const entry = { root: card, price, cost: it.cost, sold: it.sold };
      cards.push(entry);
      card.on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, ev: Phaser.Types.Input.EventData) => {
        ev.stopPropagation();
        if (this.done || entry.sold) return;
        if (!cb.onBuy(i)) {
          playSfx('error');
          scene.tweens.add({ targets: card, x: GAME_WIDTH / 2 + 10, duration: 50, yoyo: true, repeat: 2 });
          return;
        }
        entry.sold = true;
        playSfx('coin', 1.1);
        vibrate([20, 30, 40]);
        scene.tweens.add({ targets: card, scale: 1.06, duration: 140, yoyo: true, ease: 'Quad.easeOut' });
        refresh();
      });
      this.objs.push(card);
    });
    refresh();

    const btn = new Button(scene, GAME_WIDTH / 2, 1060, {
      width: 440,
      height: 84,
      label: 'SEGUIR A CAÇADA ▶',
      fontSize: 30,
      color: 0x3aa655,
      onClick: () => {
        if (this.done) return;
        this.done = true;
        playSfx('ui');
        this.destroy();
        cb.onClose();
      },
    });
    btn.setDepth(DEPTH.panel + 1).setAlpha(0);
    scene.tweens.add({ targets: btn, alpha: 1, delay: 450, duration: 250 });
    this.objs.push(btn);
  }

  destroy(): void {
    for (const o of this.objs) {
      this.scene.tweens.killTweensOf(o);
      if (o instanceof Phaser.GameObjects.Container) this.scene.tweens.killTweensOf(o.list);
      o.destroy();
    }
    this.objs = [];
  }
}
