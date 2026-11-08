import * as Phaser from 'phaser';
import { ELEMENTS, type Element } from '../../data/elements';
import type { HeroState } from '../../sim/types';
import { DEPTH, unitDepth } from './layers';

// Hero art is 112×144 with feet at y=136 and the staff socket at (96,22); shown at 85%.
const HERO_SCALE = 0.85;
const ORB_OFFSET = { x: (96 - 56) * HERO_SCALE, y: (22 - 136) * HERO_SCALE };

/** The Arcanista on the field: idle bob, walking bounce, facing, staff orb in the affinity color. */
export class HeroView {
  private root: Phaser.GameObjects.Container;
  private body: Phaser.GameObjects.Image;
  private orb: Phaser.GameObjects.Image;
  private marker: Phaser.GameObjects.Image;
  private prevX: number;
  private prevY: number;
  private walkT = 0;
  private facing = 1;

  constructor(private scene: Phaser.Scene, hero: HeroState, affinity: Element) {
    const shadow = scene.add.image(0, 2, 'shadow').setScale(0.9, 1);
    this.body = scene.add.image(0, 0, 'hero_arcanist').setOrigin(0.5, 136 / 144).setScale(HERO_SCALE);
    this.orb = scene.add.image(ORB_OFFSET.x, ORB_OFFSET.y, 'hero_orb').setTint(ELEMENTS[affinity].color).setBlendMode(Phaser.BlendModes.ADD);
    this.root = scene.add.container(hero.x, hero.y, [shadow, this.body, this.orb]);
    this.marker = scene.add.image(0, 0, 'move_marker').setDepth(DEPTH.groundFx).setVisible(false);
    this.prevX = hero.x;
    this.prevY = hero.y;
    scene.tweens.add({ targets: this.orb, scale: 1.3, alpha: 0.75, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
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

  /** Raise the staff and flash for Catalisar. */
  cast(): void {
    this.scene.tweens.add({ targets: this.body, scaleY: HERO_SCALE * 1.15, scaleX: HERO_SCALE * 0.92, duration: 90, yoyo: true, ease: 'Quad.easeOut' });
    this.scene.tweens.add({ targets: this.orb, scale: 2.6, duration: 120, yoyo: true });
  }

  sync(hero: HeroState, alpha: number, dtMs: number): void {
    const x = this.prevX + (hero.x - this.prevX) * alpha;
    const y = this.prevY + (hero.y - this.prevY) * alpha;
    this.root.setPosition(x, y).setDepth(unitDepth(y) + 0.0005);
    if (hero.facing !== this.facing) {
      this.facing = hero.facing;
      this.body.setFlipX(this.facing < 0);
    }
    this.orb.x = ORB_OFFSET.x * this.facing;
    if (hero.moving) {
      this.walkT += dtMs / 1000;
      const bounce = Math.abs(Math.sin(this.walkT * 12));
      this.body.setY(-bounce * 7);
      this.body.setAngle(Math.sin(this.walkT * 12) * 4);
    } else {
      this.walkT += dtMs / 1000;
      this.body.setY(0);
      this.body.setAngle(0);
      this.body.setScale(HERO_SCALE, HERO_SCALE * (1 + Math.sin(this.walkT * 3) * 0.02));
    }
  }
}
