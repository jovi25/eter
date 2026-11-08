import * as Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../../data/config';
import { unlockAudio } from '../audio/sfx';
import { PAL } from '../art/palette';
import { generateTextures, preloadImages } from '../art/textures';
import { Button, uiText } from '../ui/Button';

/** Builds all procedural art, then shows the title. The first tap also unlocks audio on mobile. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    preloadImages(this);
  }

  create(): void {
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

    const glow = this.add.image(cx, 480, 'spark').setScale(14).setTint(0xa77bff).setAlpha(0.4).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: glow, scale: 16, alpha: 0.6, duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    const crystal = this.add.image(cx, 480, 'crystal').setScale(2);
    this.tweens.add({ targets: crystal, y: 455, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // A few cute enemies parading at the bottom.
    ['enemy_slime', 'enemy_wolf', 'enemy_golem', 'enemy_bat'].forEach((key, i) => {
      const e = this.add.image(140 + i * 150, 1010, key).setScale(1.3);
      this.tweens.add({ targets: e, y: 995, scaleY: 1.2, duration: 400 + i * 60, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    });

    uiText(this, cx, 720, 'ÉTER', 140, '#f3e9ff', 14);
    uiText(this, cx, 810, 'Defenda o Cristal com combos elementais', 28, PAL.uiDim, 5);

    const play = new Button(this, cx, 1150, {
      width: 420,
      height: 100,
      label: 'JOGAR',
      fontSize: 46,
      color: 0x3aa655,
      onClick: () => {
        unlockAudio();
        this.cameras.main.fadeOut(250, 11, 7, 22);
        this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Battle', { stage: 'v1' }));
      },
    });
    this.tweens.add({ targets: play, scale: 1.05, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }
}
