import * as Phaser from 'phaser';
import { ELEMENTS, type Element } from '../../data/elements';
import type { HeroState } from '../../sim/types';
import { PAL } from '../art/palette';
import { uiText } from '../ui/Button';
import { DEPTH } from './layers';

const R = 58;

/** Big round Catalisar button with a cooldown pie, seconds left and a "ready" glow. */
export class CatalyzeButton {
  readonly x: number;
  readonly y: number;
  private root: Phaser.GameObjects.Container;
  private pie: Phaser.GameObjects.Graphics;
  private secs: Phaser.GameObjects.Text;
  private halo: Phaser.GameObjects.Image;
  private wasReady = true;
  onReady?: () => void;

  constructor(private scene: Phaser.Scene, x: number, y: number, affinity: Element, onPress: () => void) {
    this.x = x;
    this.y = y;
    const color = ELEMENTS[affinity].color;
    this.halo = scene.add.image(0, 0, 'spark').setScale(7).setTint(color).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.6);
    const bg = scene.add.graphics();
    bg.fillStyle(PAL.ink, 1);
    bg.fillCircle(0, 2, R + 5);
    bg.fillStyle(Phaser.Display.Color.ValueToColor(color).darken(35).color, 1);
    bg.fillCircle(0, 4, R);
    bg.fillStyle(color, 1);
    bg.fillCircle(0, 0, R - 2);
    bg.fillStyle(0xffffff, 0.25);
    bg.fillEllipse(-10, -22, 70, 34);
    const icon = scene.add.image(0, -6, 'icon_catalyze').setScale(0.85).setTint(0xffffff);
    const label = uiText(scene, 0, 36, 'CATALISAR', 17, PAL.uiText, 4);
    this.pie = scene.add.graphics();
    this.secs = uiText(scene, 0, -4, '', 40, '#ffffff', 7);
    this.root = scene.add.container(x, y, [this.halo, bg, icon, label, this.pie, this.secs]).setDepth(DEPTH.hud + 2);
    this.root.setSize(R * 2 + 10, R * 2 + 10);
    this.root.setInteractive({ useHandCursor: true });
    this.root.on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, ev: Phaser.Types.Input.EventData) => {
      ev.stopPropagation();
      onPress();
    });
    scene.tweens.add({ targets: this.halo, scale: 8.5, alpha: 0.9, duration: 650, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  update(hero: HeroState): void {
    const ready = hero.catalyzeCooldown <= 0;
    this.pie.clear();
    if (!ready) {
      const frac = hero.catalyzeCooldown / hero.catalyzeMax;
      this.pie.fillStyle(0x0b0716, 0.62);
      this.pie.slice(0, 0, R - 2, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2, false);
      this.pie.fillPath();
      this.secs.setText(hero.catalyzeCooldown >= 1 ? `${Math.ceil(hero.catalyzeCooldown)}` : hero.catalyzeCooldown.toFixed(1));
    } else {
      this.secs.setText('');
    }
    this.halo.setVisible(ready);
    if (ready && !this.wasReady) {
      this.scene.tweens.add({ targets: this.root, scale: { from: 1.3, to: 1 }, duration: 380, ease: 'Back.easeOut' });
      this.onReady?.();
    }
    this.wasReady = ready;
  }

  /** Little bump when a reaction shaves time off the cooldown. */
  bump(): void {
    this.scene.tweens.killTweensOf(this.root);
    this.root.setScale(1);
    this.scene.tweens.add({ targets: this.root, scale: 1.12, duration: 70, yoyo: true, ease: 'Quad.easeOut' });
  }

  denied(): void {
    this.scene.tweens.add({ targets: this.root, x: this.x + 8, duration: 40, yoyo: true, repeat: 2, onComplete: () => this.root.setX(this.x) });
  }
}
