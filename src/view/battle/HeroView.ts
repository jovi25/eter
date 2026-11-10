import * as Phaser from 'phaser';
import { ELEMENTS, type Element } from '../../data/elements';
import { HEROES, PRIEST, type HeroClass } from '../../data/heroes';
import type { BlockerState, HeroState, SummonState } from '../../sim/types';
import { HERO_STYLES, RIG, type HeroTexture } from '../art/chibi';
import { PAL } from '../art/palette';
import { DEPTH, unitDepth } from './layers';

const S = 0.9; // on-screen scale of the hero rig
const BAR_W = 56;

export const HERO_COLORS: Record<HeroClass, number> = { mage: 0xb57bff, knight: 0x9fc4ff, priest: 0xffe680, druid: 0x9ae66a };

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

class DownTimer {
  private text?: Phaser.GameObjects.Text;
  constructor(private scene: Phaser.Scene) {}
  set(b: BlockerState, x: number, y: number): void {
    if (b.alive) {
      this.text?.setVisible(false);
      return;
    }
    this.text ??= this.scene.add
      .text(0, 0, '', { fontFamily: 'sans-serif', fontStyle: 'bold', fontSize: '22px', color: '#ffffff', stroke: PAL.inkCss, strokeThickness: 5 })
      .setOrigin(0.5)
      .setDepth(DEPTH.numbers);
    this.text.setVisible(true).setPosition(x, y).setText(`${Math.ceil(b.respawnTimer)}s`);
  }
}

/**
 * The hero on the field. Layered rig: cape (sways, trails when moving), body, and a weapon arm that
 * rotates around the shoulder for attack / cast animations. It glides (no hopping) and leans into the move.
 */
export class HeroView {
  private root: Phaser.GameObjects.Container;
  private rig: Phaser.GameObjects.Container; // flipped to face left/right
  private shadow: Phaser.GameObjects.Image;
  private cape: Phaser.GameObjects.Image;
  private armC: Phaser.GameObjects.Container;
  private flash: Phaser.GameObjects.Image;
  private orb?: Phaser.GameObjects.Image;
  private marker: Phaser.GameObjects.Image;
  private aura?: Phaser.GameObjects.Image;
  private bar?: HpBar;
  private down: DownTimer;
  private prevX: number;
  private prevY: number;
  private t = 0;
  private facing = 1;
  private lean = 0;
  private glide = 0;
  private animating = false;
  private melee: boolean;
  private color: number;

  constructor(private scene: Phaser.Scene, hero: HeroState, affinity: Element) {
    const def = HEROES[hero.cls];
    const key = def.texture as HeroTexture;
    const st = HERO_STYLES[key];
    this.melee = !!def.blocker;
    this.color = hero.cls === 'mage' ? ELEMENTS[affinity].color : HERO_COLORS[hero.cls];
    const ox = RIG.w / 2;
    const origin = { x: 0.5, y: RIG.feetY / RIG.h };

    this.shadow = scene.add.image(0, 2, 'shadow').setScale(0.7, 0.8);
    this.cape = scene.add.image(0, 0, `${key}_cape`).setOrigin(origin.x, 76 / RIG.h).setScale(S);
    this.cape.setPosition(0, (76 - RIG.feetY) * S);
    const body = scene.add.image(0, 0, `${key}_body`).setOrigin(origin.x, origin.y).setScale(S);
    // Arm container sits on the shoulder; everything inside rotates with the arm.
    const arm = scene.add.image(0, 0, `${key}_arm`).setOrigin(RIG.shoulder.x / RIG.w, RIG.shoulder.y / RIG.h).setScale(S);
    const tip = { x: (st.tip.x - RIG.shoulder.x) * S, y: (st.tip.y - RIG.shoulder.y) * S };
    this.flash = scene.add.image(tip.x, tip.y, 'spark').setTint(this.color).setBlendMode(Phaser.BlendModes.ADD).setScale(0).setAlpha(0);
    this.armC = scene.add.container((RIG.shoulder.x - ox) * S, (RIG.shoulder.y - RIG.feetY) * S, [arm, this.flash]);
    if (hero.cls === 'mage') {
      this.orb = scene.add.image(tip.x, tip.y, 'hero_orb').setTint(this.color).setBlendMode(Phaser.BlendModes.ADD).setScale(0.8);
      this.armC.add(this.orb);
      scene.tweens.add({ targets: this.orb, scale: 1.05, alpha: 0.75, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    this.rig = scene.add.container(0, 0, [this.cape, body, this.armC]);
    this.root = scene.add.container(hero.x, hero.y, [this.shadow, this.rig]);
    if (this.melee) {
      this.bar = new HpBar(scene, -RIG.feetY * S - 4);
      this.root.add([this.bar.bg, this.bar.fill]);
    }
    this.down = new DownTimer(scene);
    if (hero.cls === 'priest') {
      this.aura = scene.add.image(0, 0, 'ring').setScale((PRIEST.auraRadius * 2) / 108).setTint(0xffe680).setAlpha(0.22).setDepth(DEPTH.range);
      scene.tweens.add({ targets: this.aura, alpha: 0.35, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    this.marker = scene.add.image(0, 0, 'move_marker').setDepth(DEPTH.groundFx).setVisible(false);
    this.prevX = hero.x;
    this.prevY = hero.y;
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

  /** Arm animation: wind up → strike → settle. Angles in degrees (negative = raise the weapon back). */
  private armAnim(windup: number, strike: number, t1: number, t2: number, t3: number, flashScale: number): void {
    this.scene.tweens.killTweensOf(this.armC);
    this.animating = true;
    this.scene.tweens.chain({
      targets: this.armC,
      tweens: [
        { angle: windup, duration: t1, ease: 'Quad.easeOut' },
        {
          angle: strike,
          duration: t2,
          ease: 'Quad.easeIn',
          onComplete: () => {
            if (flashScale <= 0) return;
            this.scene.tweens.killTweensOf(this.flash);
            this.flash.setScale(flashScale * 0.4).setAlpha(1);
            this.scene.tweens.add({ targets: this.flash, scale: flashScale, alpha: 0, duration: 220, ease: 'Cubic.easeOut' });
          },
        },
        { angle: 0, duration: t3, ease: 'Sine.easeOut' },
      ],
      onComplete: () => (this.animating = false),
    });
  }

  /** Ranged attack: the staff snaps forward and flashes as the spell leaves. */
  shoot(): void {
    this.armAnim(-26, 20, 70, 60, 200, 1.6);
  }

  /** Melee attack: a wide slash plus a small lunge. */
  swing(): void {
    this.armAnim(-85, 70, 80, 70, 220, 0);
    this.scene.tweens.add({ targets: this.rig, x: 9 * this.facing, duration: 80, yoyo: true, ease: 'Quad.easeOut' });
  }

  /** Class skill: raise the weapon high, big flash. */
  cast(): void {
    this.armAnim(-70, -62, 110, 260, 260, 4);
    this.scene.tweens.add({ targets: this.rig, y: -8, duration: 110, yoyo: true, hold: 200, ease: 'Quad.easeOut' });
  }

  sync(hero: HeroState, alpha: number, dtMs: number): void {
    const dt = dtMs / 1000;
    this.t += dt;
    const x = this.prevX + (hero.x - this.prevX) * alpha;
    const y = this.prevY + (hero.y - this.prevY) * alpha;
    this.root.setPosition(x, y).setDepth(unitDepth(y) + 0.0005);
    if (hero.facing !== this.facing) {
      this.facing = hero.facing;
      this.rig.setScale(this.facing, 1);
    }
    // Glide: lean into the move, cape trails behind, feet hover a little. Everything eases in and out.
    const k = Math.min(1, dt * 9);
    this.lean += ((hero.moving ? 7 : 0) - this.lean) * k;
    this.glide += ((hero.moving ? 1 : 0) - this.glide) * k;
    this.rig.setAngle(this.lean * this.facing);
    const breathe = 1 + Math.sin(this.t * 2.4) * 0.012;
    this.rig.setScale(this.facing, breathe);
    this.cape.setScale(S * (1 + this.glide * 0.14 + Math.sin(this.t * 2) * 0.025), S * (1 - this.glide * 0.05));
    this.cape.setX(-6 * this.glide);
    this.cape.setAngle(8 * this.glide + Math.sin(this.t * 1.7) * 1.5);
    this.shadow.setScale(0.7 - this.glide * 0.08, 0.8 - this.glide * 0.1);
    if (!this.animating) this.armC.setAngle(Math.sin(this.t * 2.1) * 2 - this.glide * 10);
    this.bar?.set(hero);
    this.root.setAlpha(hero.alive ? 1 : 0.35);
    this.down.set(hero, x, y - 80);
    this.aura?.setPosition(x, y);
  }
}

/** Druid's bear: slides around, lunges when it bites. */
export class SummonView {
  private root: Phaser.GameObjects.Container;
  private body: Phaser.GameObjects.Image;
  private bar: HpBar;
  private down: DownTimer;
  private prevX: number;
  private prevY: number;
  private t = Math.random() * 10;
  private facing = 1;

  constructor(private scene: Phaser.Scene, s: SummonState) {
    const shadow = scene.add.image(0, 2, 'shadow').setScale(0.8, 0.9);
    this.body = scene.add.image(0, 0, 'summon_bear').setOrigin(0.5, 0.92).setScale(0.95);
    this.bar = new HpBar(scene, -96);
    this.root = scene.add.container(s.x, s.y, [shadow, this.body, this.bar.bg, this.bar.fill]);
    this.down = new DownTimer(scene);
    this.prevX = s.x;
    this.prevY = s.y;
  }

  get x(): number {
    return this.root.x;
  }

  get y(): number {
    return this.root.y;
  }

  snapshot(s: SummonState): void {
    this.prevX = s.x;
    this.prevY = s.y;
  }

  swing(): void {
    this.scene.tweens.add({ targets: this.body, x: 12 * this.facing, angle: 10 * this.facing, duration: 80, yoyo: true, ease: 'Quad.easeOut' });
  }

  sync(s: SummonState, alpha: number, dtMs: number): void {
    this.t += dtMs / 1000;
    const x = this.prevX + (s.x - this.prevX) * alpha;
    const y = this.prevY + (s.y - this.prevY) * alpha;
    this.root.setPosition(x, y).setDepth(unitDepth(y) + 0.0005);
    if (s.facing !== this.facing) {
      this.facing = s.facing;
      this.body.setFlipX(this.facing < 0);
    }
    this.body.setScale(0.95, 0.95 * (1 + Math.sin(this.t * 3) * 0.02));
    this.bar.set(s);
    this.root.setAlpha(s.alive ? 1 : 0.35);
    this.down.set(s, x, y - 70);
  }
}
