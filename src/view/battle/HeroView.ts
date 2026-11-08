import * as Phaser from 'phaser';
import { ELEMENTS, type Element } from '../../data/elements';
import { HEROES, PRIEST } from '../../data/heroes';
import type { BlockerState, HeroState, SummonState } from '../../sim/types';
import { PAL } from '../art/palette';
import { DEPTH, unitDepth } from './layers';

// Hero art is 112×144 with feet at y=136 and the mage staff socket at (96,22); shown at 85%.
const HERO_SCALE = 0.85;
const ORB_OFFSET = { x: (96 - 56) * HERO_SCALE, y: (22 - 136) * HERO_SCALE };
const BAR_W = 56;

/** Small hp bar shown over melee units (knight, bear). */
class HpBar {
  readonly bg: Phaser.GameObjects.Rectangle;
  readonly fill: Phaser.GameObjects.Rectangle;
  constructor(scene: Phaser.Scene, y: number) {
    this.bg = scene.add.rectangle(0, y, BAR_W + 4, 9, PAL.ink);
    this.fill = scene.add.rectangle(-BAR_W / 2, y, BAR_W, 5, 0x6ee66e).setOrigin(0, 0.5);
  }
  set(b: BlockerState): void {
    const pct = b.maxHp > 0 ? Math.max(0, b.hp / b.maxHp) : 0;
    this.fill.width = BAR_W * pct;
    this.fill.fillColor = pct > 0.5 ? 0x6ee66e : pct > 0.25 ? 0xffd34d : 0xff4d5e;
    const show = b.alive && pct < 0.999;
    this.bg.setVisible(show);
    this.fill.setVisible(show);
  }
}

/** Shared look for anything walking around: interpolation, facing, walk bounce, "down" state. */
abstract class UnitView {
  protected root: Phaser.GameObjects.Container;
  protected body: Phaser.GameObjects.Image;
  protected prevX: number;
  protected prevY: number;
  protected walkT = Math.random() * 10;
  protected facing = 1;
  protected bar?: HpBar;
  private downText?: Phaser.GameObjects.Text;

  constructor(protected scene: Phaser.Scene, b: BlockerState, texture: string, protected scale: number, originY: number, barY?: number) {
    const shadow = scene.add.image(0, 2, 'shadow').setScale(0.9, 1);
    this.body = scene.add.image(0, 0, texture).setOrigin(0.5, originY).setScale(scale);
    this.root = scene.add.container(b.x, b.y, [shadow, this.body]);
    if (barY !== undefined) {
      this.bar = new HpBar(scene, barY);
      this.root.add([this.bar.bg, this.bar.fill]);
    }
    this.prevX = b.x;
    this.prevY = b.y;
  }

  get x(): number {
    return this.root.x;
  }

  get y(): number {
    return this.root.y;
  }

  snapshot(b: BlockerState): void {
    this.prevX = b.x;
    this.prevY = b.y;
  }

  /** Quick lunge toward the target when it lands a melee hit. */
  swing(): void {
    this.scene.tweens.add({ targets: this.body, x: 10 * this.facing, angle: 8 * this.facing, duration: 70, yoyo: true, ease: 'Quad.easeOut' });
  }

  protected syncUnit(b: BlockerState, alpha: number, dtMs: number): void {
    const x = this.prevX + (b.x - this.prevX) * alpha;
    const y = this.prevY + (b.y - this.prevY) * alpha;
    this.root.setPosition(x, y).setDepth(unitDepth(y) + 0.0005);
    if (b.facing !== this.facing) {
      this.facing = b.facing;
      this.body.setFlipX(this.facing < 0);
    }
    this.walkT += dtMs / 1000;
    if (b.moving) {
      this.body.setY(-Math.abs(Math.sin(this.walkT * 12)) * 6);
    } else {
      this.body.setY(0);
      this.body.setScale(this.scale, this.scale * (1 + Math.sin(this.walkT * 3) * 0.02));
    }
    this.bar?.set(b);
    // Knocked out: ghostly and a countdown until it's back.
    this.root.setAlpha(b.alive ? 1 : 0.35);
    if (!b.alive) {
      this.downText ??= this.scene.add
        .text(0, 0, '', { fontFamily: 'sans-serif', fontStyle: 'bold', fontSize: '22px', color: '#ffffff', stroke: PAL.inkCss, strokeThickness: 5 })
        .setOrigin(0.5)
        .setDepth(DEPTH.numbers);
      this.downText.setVisible(true).setPosition(x, y - 70).setText(`${Math.ceil(b.respawnTimer)}s`);
    } else this.downText?.setVisible(false);
  }
}

/** The hero on the field (any class). */
export class HeroView extends UnitView {
  private orb?: Phaser.GameObjects.Image;
  private marker: Phaser.GameObjects.Image;
  private aura?: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene, hero: HeroState, affinity: Element) {
    const def = HEROES[hero.cls];
    super(scene, hero, def.texture, HERO_SCALE, 136 / 144, def.blocker ? -128 : undefined);
    if (hero.cls === 'mage') {
      this.orb = scene.add.image(ORB_OFFSET.x, ORB_OFFSET.y, 'hero_orb').setTint(ELEMENTS[affinity].color).setBlendMode(Phaser.BlendModes.ADD);
      this.root.add(this.orb);
      scene.tweens.add({ targets: this.orb, scale: 1.3, alpha: 0.75, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    if (hero.cls === 'priest') {
      // Her support aura: a soft golden circle showing which towers get faster.
      this.aura = scene.add.image(0, 0, 'ring').setScale((PRIEST.auraRadius * 2) / 108).setTint(0xffe680).setAlpha(0.22).setDepth(DEPTH.range);
      scene.tweens.add({ targets: this.aura, alpha: 0.35, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    this.marker = scene.add.image(0, 0, 'move_marker').setDepth(DEPTH.groundFx).setVisible(false);
  }

  showMarker(x: number, y: number): void {
    this.scene.tweens.killTweensOf(this.marker);
    this.marker.setPosition(x, y).setVisible(true).setAlpha(1).setScale(1.6);
    this.scene.tweens.add({ targets: this.marker, scale: 1, duration: 200, ease: 'Back.easeOut' });
    this.scene.tweens.add({ targets: this.marker, alpha: 0, delay: 500, duration: 300, onComplete: () => this.marker.setVisible(false) });
  }

  /** Little hop + flash when the class skill goes off. */
  cast(): void {
    this.scene.tweens.add({ targets: this.body, scaleY: HERO_SCALE * 1.15, scaleX: HERO_SCALE * 0.92, duration: 90, yoyo: true, ease: 'Quad.easeOut' });
    if (this.orb) this.scene.tweens.add({ targets: this.orb, scale: 2.6, duration: 120, yoyo: true });
  }

  sync(hero: HeroState, alpha: number, dtMs: number): void {
    this.syncUnit(hero, alpha, dtMs);
    if (this.orb) this.orb.x = ORB_OFFSET.x * this.facing;
    this.aura?.setPosition(this.root.x, this.root.y);
  }
}

/** Druid's bear. */
export class SummonView extends UnitView {
  constructor(scene: Phaser.Scene, s: SummonState) {
    super(scene, s, 'summon_bear', 0.95, 0.92, -96);
  }

  sync(s: SummonState, alpha: number, dtMs: number): void {
    this.syncUnit(s, alpha, dtMs);
  }
}
