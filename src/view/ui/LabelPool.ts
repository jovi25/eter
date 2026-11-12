import type * as Phaser from 'phaser';
import { FONT, PAL } from '../art/palette';

/**
 * Re-usable outlined labels ("INCÊNDIO", "RAJADA!", "+12 ouro"...).
 * Creating a Text draws it on a canvas and uploads a new texture — slow on phones. Here a label with the same
 * text, size and colour is drawn once and reused forever; only position/alpha/scale change.
 */
export class LabelPool {
  private free = new Map<string, Phaser.GameObjects.Text[]>();
  private count = 0;
  private static readonly MAX = 120; // safety cap on distinct live labels

  constructor(private scene: Phaser.Scene) {}

  get(text: string, size: number, color: string, stroke = Math.max(4, Math.round(size / 5))): Phaser.GameObjects.Text {
    const key = `${size}|${color}|${text}`;
    const list = this.free.get(key);
    const t = list?.pop();
    if (t) return t.setVisible(true).setAlpha(1).setScale(1).setAngle(0);
    this.count++;
    const made = this.scene.add
      .text(0, 0, text, { fontFamily: FONT, fontStyle: 'bold', fontSize: `${size}px`, color, stroke: PAL.inkCss, strokeThickness: stroke, align: 'center' })
      .setOrigin(0.5);
    made.setData('poolKey', key);
    return made;
  }

  /** Hide and keep for next time (or destroy when the pool is already big). */
  release(t: Phaser.GameObjects.Text): void {
    const key = t.getData('poolKey') as string;
    t.setVisible(false);
    if (this.count > LabelPool.MAX) {
      this.count--;
      t.destroy();
      return;
    }
    const list = this.free.get(key) ?? [];
    list.push(t);
    this.free.set(key, list);
  }
}
