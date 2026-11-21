import * as Phaser from 'phaser';
import { fitCamera, frameCap } from '../perf';
import { GAME_HEIGHT, GAME_WIDTH } from '../../data/config';
import { unlockAudio } from '../audio/sfx';
import { refreshMusic } from '../audio/music';
import { PAL } from '../art/palette';
import { generateTextures, preloadImages } from '../art/textures';
import { Button, uiText } from '../ui/Button';

/** Loads the pixel-art sheets, builds procedural art, then shows the title. The first tap unlocks audio. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    preloadImages(this);
  }

  create(): void {
    fitCamera(this);
    frameCap(this, 'menu');
    generateTextures(this);
    const cx = GAME_WIDTH / 2;

    const bg = this.add.graphics();
    for (let i = 0; i < 32; i++) {
      const t = i / 31;
      const c = Phaser.Display.Color.Interpolate.ColorWithColor(
        Phaser.Display.Color.ValueToColor(0x2a1858),
        Phaser.Display.Color.ValueToColor(0x0b0716),
        100,
        t * 100,
      );
      bg.fillStyle(Phaser.Display.Color.GetColor(c.r, c.g, c.b), 1);
      bg.fillRect(0, (GAME_HEIGHT / 32) * i, GAME_WIDTH, GAME_HEIGHT / 32 + 1);
    }

    // Only the Éter: a big floating crystal, its glow and a few motes of light drifting up.
    const glow = this.add.image(cx, 520, 'spark').setScale(18).setTint(0xa77bff).setAlpha(0.4).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: glow, scale: 21, alpha: 0.6, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    for (let i = 0; i < 14; i++) {
      const mote = this.add.image(cx - 260 + Math.random() * 520, 900, 'spark').setScale(0.6 + Math.random()).setTint(0xd8c4ff).setAlpha(0).setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({ targets: mote, y: 180 + Math.random() * 200, alpha: { from: 0.8, to: 0 }, duration: 4000 + Math.random() * 3000, delay: i * 450, repeat: -1 });
    }
    const crystal = this.add.image(cx, 520, 'crystal').setScale(2.6);
    this.tweens.add({ targets: crystal, y: 490, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    const logo = this.add.image(cx, 830, 'logo').setScale(0.75);
    this.tweens.add({ targets: logo, scale: 0.78, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    uiText(this, cx, 1005, 'Defenda o Cristal com combos elementais', 28, PAL.uiDim, 5);

    const play = new Button(this, cx, 1160, {
      width: 420,
      height: 100,
      label: 'JOGAR',
      fontSize: 46,
      color: 0x3aa655,
      onClick: () => {
        unlockAudio();
        refreshMusic();
        this.cameras.main.fadeOut(250, 11, 7, 22);
        this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('WorldMap'));
      },
    });
    this.tweens.add({ targets: play, scale: 1.05, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }
}
