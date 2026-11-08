import * as Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../../data/config';
import type { EnemyId } from '../../data/enemies';
import { unlockAudio } from '../audio/sfx';
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

    const glow = this.add.image(cx, 440, 'spark').setScale(14).setTint(0xa77bff).setAlpha(0.4).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: glow, scale: 16, alpha: 0.6, duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    const crystal = this.add.image(cx, 440, 'crystal').setScale(1.8);
    this.tweens.add({ targets: crystal, y: 415, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    uiText(this, cx, 680, 'ÉTER', 140, '#f3e9ff', 14);
    uiText(this, cx, 770, 'Defenda o Cristal com combos elementais', 28, PAL.uiDim, 5);

    // The hero facing a little parade of monsters.
    const hero = this.add.image(120, 1030, 'hero_arcanist').setOrigin(0.5, 0.9).setScale(1.25);
    this.tweens.add({ targets: hero, scaleY: 1.29, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    (['slime', 'wolf', 'skeleton', 'salamander'] as EnemyId[]).forEach((id, i) => {
      const m = this.add.image(290 + i * 120, 1020, `enemy_${id}`).setOrigin(0.5, 0.85).setScale(1.25).setFlipX(true);
      this.tweens.add({ targets: m, y: 1008, scaleY: 1.18, duration: 380 + i * 60, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    });

    const play = new Button(this, cx, 1160, {
      width: 420,
      height: 100,
      label: 'JOGAR',
      fontSize: 46,
      color: 0x3aa655,
      onClick: () => {
        unlockAudio();
        this.cameras.main.fadeOut(250, 11, 7, 22);
        this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('WorldMap'));
      },
    });
    this.tweens.add({ targets: play, scale: 1.05, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }
}
