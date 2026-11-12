import * as Phaser from 'phaser';
import { bakeInPlace } from '../ui/bake';
import type { HeroState } from '../../sim/types';
import { PAL } from '../art/palette';
import { uiText } from '../ui/Button';
import { DEPTH } from './layers';

const R = 58;

/**
 * Skill indicator (not a button: heroes cast on their own). Shows the class skill, its cooldown pie,
 * seconds left and a glow when ready; bumps when a reaction shortens the cooldown.
 */
export class CatalyzeButton {
  readonly x: number;
  readonly y: number;
  private root: Phaser.GameObjects.Container;
  private pie: Phaser.GameObjects.Graphics;
  private secs: Phaser.GameObjects.Text;
  private halo: Phaser.GameObjects.Image;
  private wasReady = true;
  private lastStep = -2;
  onReady?: () => void;

  constructor(private scene: Phaser.Scene, x: number, y: number, color: number, label: string, icon: string) {
    this.x = x;
    this.y = y;
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
    const bgImg = bakeInPlace(bg, { x0: -R - 8, y0: -R - 8, w: 2 * R + 16, h: 2 * R + 20 }, `skillbtn_${color}`);
    const img = scene.add.image(0, -6, icon).setScale(icon === 'icon_catalyze' ? 0.85 : 0.42);
    const text = uiText(scene, 0, 38, label.toUpperCase(), label.length > 12 ? 13 : 16, PAL.uiText, 4);
    const auto = uiText(scene, 0, -R + 4, 'AUTO', 13, PAL.goldCss, 4);
    this.pie = scene.add.graphics();
    this.secs = uiText(scene, 0, -4, '', 40, '#ffffff', 7);
    this.root = scene.add.container(x, y, [this.halo, bgImg, img, text, auto, this.pie, this.secs]).setDepth(DEPTH.hud + 2);
    scene.tweens.add({ targets: this.halo, scale: 8.5, alpha: 0.9, duration: 650, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  update(hero: HeroState): void {
    const ready = hero.catalyzeCooldown <= 0;
    const stepKey = ready ? -1 : Math.ceil(hero.catalyzeCooldown * 12);
    if (stepKey === this.lastStep) return;
    this.lastStep = stepKey;
    this.pie.clear();
    if (!ready) {
      const frac = hero.catalyzeCooldown / hero.catalyzeMax;
      this.pie.fillStyle(0x0b0716, 0.62);
      this.pie.slice(0, 0, R - 2, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2, false);
      this.pie.fillPath();
      this.secs.setText(`${Math.ceil(hero.catalyzeCooldown)}`);
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

  /** Little bump when a reaction shaves time off the cooldown, or when the skill fires. */
  bump(): void {
    this.scene.tweens.killTweensOf(this.root);
    this.root.setScale(1);
    this.scene.tweens.add({ targets: this.root, scale: 1.12, duration: 70, yoyo: true, ease: 'Quad.easeOut' });
  }
}
