import * as Phaser from 'phaser';
import { ELEMENTS, type Element } from '../../data/elements';
import type { HeroState } from '../../sim/types';
import { animKey, HERO_SPRITE } from '../art/sprites';
import { DEPTH, unitDepth } from './layers';

const ORB_OFFSET = { x: 26, y: -60 };

/** The Arcanista on the field: pixel-art wizard (idle/run), facing, an affinity-colored orb by its hand. */
export class HeroView {
  private root: Phaser.GameObjects.Container;
  private body: Phaser.GameObjects.Sprite;
  private orb: Phaser.GameObjects.Image;
  private marker: Phaser.GameObjects.Image;
  private prevX: number;
  private prevY: number;
  private facing = 1;
  private moving = false;

  constructor(private scene: Phaser.Scene, hero: HeroState, affinity: Element) {
    const shadow = scene.add.image(0, 2, 'shadow').setScale(0.75, 0.9);
    this.body = scene.add.sprite(0, 6, 'dungeon', `${HERO_SPRITE.idle}0`).setOrigin(0.5, 1).setScale(HERO_SPRITE.scale);
    this.body.play(animKey(HERO_SPRITE.idle));
    this.orb = scene.add.image(ORB_OFFSET.x, ORB_OFFSET.y, 'hero_orb').setTint(ELEMENTS[affinity].color).setBlendMode(Phaser.BlendModes.ADD).setScale(0.8);
    this.root = scene.add.container(hero.x, hero.y, [shadow, this.body, this.orb]);
    this.marker = scene.add.image(0, 0, 'move_marker').setDepth(DEPTH.groundFx).setVisible(false);
    this.prevX = hero.x;
    this.prevY = hero.y;
    scene.tweens.add({ targets: this.orb, scale: 1.1, alpha: 0.7, y: ORB_OFFSET.y - 6, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  get x(): number {
    return this.root.x;
  }

  get y(): number {
    return this.root.y;
  }

  snapshot(hero: HeroState): void {
    this.prevX = hero.x;
    this.prevY = hero.y;
  }

  showMarker(x: number, y: number): void {
    this.scene.tweens.killTweensOf(this.marker);
    this.marker.setPosition(x, y).setVisible(true).setAlpha(1).setScale(1.6);
    this.scene.tweens.add({ targets: this.marker, scale: 1, duration: 200, ease: 'Back.easeOut' });
    this.scene.tweens.add({ targets: this.marker, alpha: 0, delay: 500, duration: 300, onComplete: () => this.marker.setVisible(false) });
  }

  /** Jump + orb flash for Catalisar. */
  cast(): void {
    this.scene.tweens.add({ targets: this.body, y: -10, duration: 90, yoyo: true, ease: 'Quad.easeOut' });
    this.scene.tweens.add({ targets: this.orb, scale: 2.6, duration: 120, yoyo: true });
  }

  sync(hero: HeroState, alpha: number, _dtMs: number): void {
    const x = this.prevX + (hero.x - this.prevX) * alpha;
    const y = this.prevY + (hero.y - this.prevY) * alpha;
    this.root.setPosition(x, y).setDepth(unitDepth(y) + 0.0005);
    if (hero.facing !== this.facing) {
      this.facing = hero.facing;
      this.body.setFlipX(this.facing < 0);
      this.orb.x = ORB_OFFSET.x * this.facing;
    }
    if (hero.moving !== this.moving) {
      this.moving = hero.moving;
      this.body.play(animKey(this.moving ? HERO_SPRITE.run : HERO_SPRITE.idle));
    }
  }
}
