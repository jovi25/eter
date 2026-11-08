import * as Phaser from 'phaser';
import { playSfx } from '../audio/sfx';
import { FONT, PAL } from '../art/palette';

export interface ButtonOptions {
  width: number;
  height: number;
  label?: string;
  fontSize?: number;
  color?: number; // fill
  icon?: string; // texture key
  iconScale?: number;
  radius?: number;
  sound?: boolean;
  onClick: () => void;
}

/** Rounded, chunky, touch-friendly button (min 48 px) with a press squash. */
export class Button extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Graphics;
  readonly text?: Phaser.GameObjects.Text;
  readonly iconImg?: Phaser.GameObjects.Image;
  private enabled = true;
  private color: number;

  constructor(scene: Phaser.Scene, x: number, y: number, private opts: ButtonOptions) {
    super(scene, x, y);
    this.color = opts.color ?? 0x5a3fb0;
    this.bg = scene.add.graphics();
    this.add(this.bg);
    if (opts.icon) {
      this.iconImg = scene.add.image(opts.label ? -opts.width / 2 + 36 : 0, 0, opts.icon).setScale(opts.iconScale ?? 1);
      this.add(this.iconImg);
    }
    if (opts.label !== undefined) {
      this.text = scene.add
        .text(opts.icon ? 16 : 0, 0, opts.label, {
          fontFamily: FONT,
          fontSize: `${opts.fontSize ?? 30}px`,
          fontStyle: 'bold',
          color: PAL.uiText,
          stroke: PAL.inkCss,
          strokeThickness: 6,
          align: 'center',
        })
        .setOrigin(0.5);
      this.add(this.text);
    }
    this.redraw();
    this.setSize(Math.max(48, opts.width), Math.max(48, opts.height));
    this.setInteractive({ useHandCursor: true });
    this.on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, ev: Phaser.Types.Input.EventData) => {
      ev.stopPropagation();
      if (!this.enabled) return;
      this.scene.tweens.add({ targets: this, scaleX: 0.92, scaleY: 0.92, duration: 60, yoyo: true, ease: 'Quad.easeOut' });
      if (opts.sound !== false) playSfx('ui');
      opts.onClick();
    });
    scene.add.existing(this);
  }

  private redraw(): void {
    const { width: w, height: h } = this.opts;
    const r = this.opts.radius ?? Math.min(22, h / 2);
    const c = this.enabled ? this.color : 0x4a4458;
    this.bg.clear();
    this.bg.fillStyle(PAL.ink, 1);
    this.bg.fillRoundedRect(-w / 2 - 3, -h / 2 - 3, w + 6, h + 9, r + 3);
    this.bg.fillStyle(Phaser.Display.Color.ValueToColor(c).darken(25).color, 1);
    this.bg.fillRoundedRect(-w / 2, -h / 2 + 4, w, h, r);
    this.bg.fillStyle(c, 1);
    this.bg.fillRoundedRect(-w / 2, -h / 2, w, h - 2, r);
    this.bg.fillStyle(0xffffff, 0.18);
    this.bg.fillRoundedRect(-w / 2 + 6, -h / 2 + 4, w - 12, h * 0.35, Math.max(4, r - 6));
  }

  setEnabled(on: boolean): this {
    if (on === this.enabled) return this;
    this.enabled = on;
    this.redraw();
    this.setAlpha(on ? 1 : 0.75);
    return this;
  }

  setColor(color: number): this {
    this.color = color;
    this.redraw();
    return this;
  }

  setLabel(label: string): this {
    this.text?.setText(label);
    return this;
  }
}

export function uiText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  size: number,
  color: string = PAL.uiText,
  stroke = 6,
): Phaser.GameObjects.Text {
  return scene.add
    .text(x, y, text, { fontFamily: FONT, fontSize: `${size}px`, fontStyle: 'bold', color, stroke: PAL.inkCss, strokeThickness: stroke, align: 'center' })
    .setOrigin(0.5);
}
