import * as Phaser from 'phaser';
import { GAME_WIDTH } from '../../data/config';
import { ELEMENTS, type Element } from '../../data/elements';
import { REACTIONS, type ReactionId } from '../../data/reactions';
import { FONT, PAL } from '../art/palette';
import { DEPTH } from './layers';

const toCss = (c: number) => `#${c.toString(16).padStart(6, '0')}`;

/** All the "juice": particles, damage numbers, reaction names, shockwaves, flying coins, banners. */
export class FxLayer {
  private sparks: Phaser.GameObjects.Particles.ParticleEmitter;
  private hitSparks: Phaser.GameObjects.Particles.ParticleEmitter;
  private debris: Phaser.GameObjects.Particles.ParticleEmitter;
  private flames: Phaser.GameObjects.Particles.ParticleEmitter;
  private numbers: Phaser.GameObjects.Text[] = [];
  private numberIdx = 0;
  private banners: Phaser.GameObjects.Text[] = [];
  private bannerIdx = 0;
  private rings: Phaser.GameObjects.Image[] = [];
  private coins: Phaser.GameObjects.Image[] = [];
  private bolts: Phaser.GameObjects.Graphics[] = [];
  private orbs: Phaser.GameObjects.Image[] = [];
  private lastBannerAt = -9999;
  private bannerFreeAt = 0;

  constructor(private scene: Phaser.Scene) {
    this.sparks = scene.add
      .particles(0, 0, 'spark', {
        emitting: false,
        speed: { min: 120, max: 380 },
        lifespan: { min: 250, max: 550 },
        scale: { start: 0.9, end: 0 },
        alpha: { start: 1, end: 0 },
        blendMode: Phaser.BlendModes.ADD,
      })
      .setDepth(DEPTH.fx);
    this.hitSparks = scene.add
      .particles(0, 0, 'spark', {
        emitting: false,
        speed: { min: 50, max: 150 },
        lifespan: 180,
        scale: { start: 0.4, end: 0 },
        alpha: { start: 0.8, end: 0 },
      })
      .setDepth(DEPTH.fx);
    this.debris = scene.add
      .particles(0, 0, 'px', {
        emitting: false,
        speed: { min: 80, max: 260 },
        angle: { min: 200, max: 340 },
        gravityY: 700,
        lifespan: { min: 350, max: 650 },
        scale: { start: 2, end: 0.5 },
      })
      .setDepth(DEPTH.fx);
    this.flames = scene.add
      .particles(0, 0, 'spark', {
        emitting: false,
        speedY: { min: -90, max: -40 },
        speedX: { min: -15, max: 15 },
        lifespan: 380,
        scale: { start: 0.55, end: 0 },
        alpha: { start: 0.9, end: 0 },
        tint: [0xff5a1f, 0xff9d2e, 0xffe27a],
        blendMode: Phaser.BlendModes.ADD,
      })
      .setDepth(DEPTH.fx);

    for (let i = 0; i < 48; i++) {
      this.numbers.push(
        scene.add
          .text(0, 0, '', { fontFamily: FONT, fontStyle: 'bold', fontSize: '26px', color: '#ffffff', stroke: PAL.inkCss, strokeThickness: 6 })
          .setOrigin(0.5)
          .setDepth(DEPTH.numbers)
          .setVisible(false),
      );
    }
    for (let i = 0; i < 6; i++) {
      this.banners.push(
        scene.add
          .text(0, 0, '', { fontFamily: FONT, fontStyle: 'bold', fontSize: '44px', color: '#ffffff', stroke: PAL.inkCss, strokeThickness: 10 })
          .setOrigin(0.5)
          .setDepth(DEPTH.banner)
          .setVisible(false),
      );
    }
  }

  /** Jagged chain-lightning bolt through the given points, with glow, flicker and fade. */
  lightning(points: { x: number; y: number }[]): void {
    if (points.length < 2) return;
    const g = this.bolts.find((b) => !b.visible) ?? this.newBolt();
    const drawBolt = () => {
      g.clear();
      const path: { x: number; y: number }[] = [points[0]!];
      for (let i = 1; i < points.length; i++) {
        const a = points[i - 1]!;
        const b = points[i]!;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const len = Math.hypot(dx, dy) || 1;
        const nx = -dy / len;
        const ny = dx / len;
        const steps = Math.max(3, Math.round(len / 22));
        for (let s = 1; s < steps; s++) {
          const t = s / steps;
          const off = (Math.random() - 0.5) * Math.min(26, len * 0.25);
          path.push({ x: a.x + dx * t + nx * off, y: a.y + dy * t + ny * off });
        }
        path.push(b);
      }
      for (const [w, color, alpha] of [
        [12, 0xffe95c, 0.28],
        [6, 0xfff3a0, 0.75],
        [2.5, 0xffffff, 1],
      ] as const) {
        g.lineStyle(w, color, alpha);
        g.beginPath();
        g.moveTo(path[0]!.x, path[0]!.y);
        for (const p of path.slice(1)) g.lineTo(p.x, p.y);
        g.strokePath();
      }
    };
    drawBolt();
    g.setAlpha(1).setVisible(true);
    this.scene.time.delayedCall(60, () => g.visible && drawBolt());
    this.scene.tweens.add({ targets: g, alpha: 0, delay: 90, duration: 160, onComplete: () => g.setVisible(false).clear() });
    for (const p of points.slice(1)) {
      this.sparks.setParticleTint(0xffe95c);
      this.sparks.explode(4, p.x, p.y);
    }
  }

  private newBolt(): Phaser.GameObjects.Graphics {
    const g = this.scene.add.graphics().setDepth(DEPTH.fx + 1).setBlendMode(Phaser.BlendModes.ADD).setVisible(false);
    this.bolts.push(g);
    return g;
  }

  /** Tiny, short spark for ordinary hits (kept subtle so many towers don't white-out the screen). */
  hit(x: number, y: number, color: number): void {
    this.hitSparks.setParticleTint(color);
    this.hitSparks.explode(2, x, y);
  }

  burst(x: number, y: number, color: number, count = 12): void {
    this.sparks.setParticleTint(color);
    this.sparks.explode(count, x, y);
  }

  dust(x: number, y: number, color = 0xd8c39a, count = 10): void {
    this.debris.setParticleTint(color);
    this.debris.explode(count, x, y);
  }

  flame(x: number, y: number): void {
    this.flames.emitParticleAt(x, y, 1);
  }

  shockwave(x: number, y: number, color: number, size = 1.4, duration = 380): void {
    const ring = this.rings.find((r) => !r.visible) ?? this.newRing();
    ring.setPosition(x, y).setTint(color).setScale(0.1).setAlpha(1).setVisible(true);
    this.scene.tweens.add({
      targets: ring,
      scale: size,
      alpha: 0,
      duration,
      ease: 'Cubic.easeOut',
      onComplete: () => ring.setVisible(false),
    });
  }

  private newRing(): Phaser.GameObjects.Image {
    const r = this.scene.add.image(0, 0, 'ring').setDepth(DEPTH.fx).setBlendMode(Phaser.BlendModes.ADD).setVisible(false);
    this.rings.push(r);
    return r;
  }

  /** MMO-style bouncing damage number. */
  damage(x: number, y: number, amount: number, element: Element, opts: { crit?: boolean; reaction?: ReactionId; dot?: boolean }): void {
    const t = this.numbers[this.numberIdx]!;
    this.numberIdx = (this.numberIdx + 1) % this.numbers.length;
    this.scene.tweens.killTweensOf(t);
    let size = 26;
    let color = element === 'physical' ? '#ffffff' : toCss(ELEMENTS[element].color);
    let text = `${amount}`;
    if (opts.dot) size = 20;
    if (opts.crit) {
      size = 38;
      color = '#ffe34d';
      text = `${amount}!`;
    }
    if (opts.reaction) {
      size = 42;
      color = toCss(REACTIONS[opts.reaction].color);
    }
    const jitter = (Math.random() - 0.5) * 30;
    t.setText(text)
      .setFontSize(size)
      .setColor(color)
      .setPosition(x + jitter, y)
      .setAlpha(1)
      .setScale(opts.crit || opts.reaction ? 1.6 : 1)
      .setVisible(true);
    this.scene.tweens.add({ targets: t, scale: 1, duration: 180, ease: 'Back.easeOut' });
    this.scene.tweens.add({ targets: t, y: y - (opts.dot ? 34 : 70), duration: 650, ease: 'Cubic.easeOut' });
    this.scene.tweens.add({ targets: t, x: x + jitter * 2, duration: 650 });
    this.scene.tweens.add({ targets: t, alpha: 0, delay: 420, duration: 260, onComplete: () => t.setVisible(false) });
  }

  /**
   * Big reaction name popping above the enemy. Names are rate-limited (a burst of reactions shows one name,
   * the rest show only sparks + colored numbers) so the screen stays readable.
   */
  reaction(x: number, y: number, reaction: ReactionId, combo: number): void {
    const def = REACTIONS[reaction];
    this.burst(x, y, def.color, 14);
    this.shockwave(x, y, def.color, reaction === 'wildfire' ? 1.3 : 1.0);
    const now = this.scene.time.now;
    if (now - this.lastBannerAt < 700) return;
    this.lastBannerAt = now;
    const b = this.banners[this.bannerIdx]!;
    this.bannerIdx = (this.bannerIdx + 1) % this.banners.length;
    this.scene.tweens.killTweensOf(b);
    const bx = Phaser.Math.Clamp(x, 170, GAME_WIDTH - 170);
    const by = Math.max(250, y - 40);
    b.setText(def.name)
      .setColor(toCss(def.color))
      .setFontSize(combo >= 5 ? 46 : 40)
      .setPosition(bx, by)
      .setScale(0)
      .setAlpha(1)
      .setAngle((Math.random() - 0.5) * 10)
      .setVisible(true);
    this.scene.tweens.add({ targets: b, scale: 1, duration: 260, ease: 'Back.easeOut' });
    this.scene.tweens.add({ targets: b, y: by - 60, duration: 900, ease: 'Cubic.easeOut' });
    this.scene.tweens.add({ targets: b, alpha: 0, delay: 650, duration: 300, onComplete: () => b.setVisible(false) });
  }

  /** Coins fly from (x,y) to the gold counter, then call onArrive. */
  coinsTo(x: number, y: number, tx: number, ty: number, count: number, onArrive: () => void): void {
    for (let i = 0; i < count; i++) {
      const c = this.coins.find((k) => !k.visible) ?? this.newCoin();
      c.setPosition(x, y).setScale(0.8).setAlpha(1).setVisible(true);
      const ox = x + (Math.random() - 0.5) * 80;
      const oy = y - 30 - Math.random() * 50;
      this.scene.tweens.chain({
        targets: c,
        tweens: [
          { x: ox, y: oy, duration: 220, ease: 'Quad.easeOut' },
          { x: tx, y: ty, scale: 0.55, duration: 420 + i * 60, ease: 'Cubic.easeIn' },
        ],
        onComplete: () => {
          c.setVisible(false);
          if (i === 0) onArrive();
        },
      });
    }
  }

  /** A glowing orb flies from (x,y) to (tx,ty) — used to show reactions feeding the Catalisar cooldown. */
  orbTo(x: number, y: number, tx: number, ty: number, color: number, onArrive: () => void): void {
    if (this.orbs.filter((o) => o.visible).length >= 8) {
      onArrive();
      return;
    }
    const o = this.orbs.find((k) => !k.visible) ?? this.newOrb();
    o.setPosition(x, y).setTint(color).setScale(1.2).setAlpha(1).setVisible(true);
    const mx = (x + tx) / 2 + (Math.random() - 0.5) * 200;
    const my = Math.min(y, ty) - 80;
    const curve = new Phaser.Curves.QuadraticBezier(new Phaser.Math.Vector2(x, y), new Phaser.Math.Vector2(mx, my), new Phaser.Math.Vector2(tx, ty));
    const tmp = new Phaser.Math.Vector2();
    this.scene.tweens.addCounter({
      from: 0,
      to: 1,
      duration: 550,
      ease: 'Cubic.easeIn',
      onUpdate: (tw) => {
        curve.getPoint(tw.getValue() ?? 0, tmp);
        o.setPosition(tmp.x, tmp.y);
      },
      onComplete: () => {
        o.setVisible(false);
        onArrive();
      },
    });
  }

  private newOrb(): Phaser.GameObjects.Image {
    const o = this.scene.add.image(0, 0, 'hero_orb').setDepth(DEPTH.hud + 3).setBlendMode(Phaser.BlendModes.ADD).setVisible(false);
    this.orbs.push(o);
    return o;
  }

  private newCoin(): Phaser.GameObjects.Image {
    const c = this.scene.add.image(0, 0, 'coin').setDepth(DEPTH.hud + 1).setVisible(false);
    this.coins.push(c);
    return c;
  }

  /**
   * Full-width banner in the middle of the screen (wave start, boss, MVP!). Queued so two never overlap;
   * `urgent` skips the queue (used for MVP!).
   */
  bigBanner(text: string, color: string, size = 72, hold = 900, urgent = false): void {
    const now = this.scene.time.now;
    const start = urgent ? now : Math.max(now, this.bannerFreeAt);
    const total = 280 + hold + 300;
    this.bannerFreeAt = start + total;
    if (start > now) {
      this.scene.time.delayedCall(start - now, () => this.showBigBanner(text, color, size, hold));
    } else {
      this.showBigBanner(text, color, size, hold);
    }
  }

  private showBigBanner(text: string, color: string, size: number, hold: number): void {
    const b = this.scene.add
      .text(GAME_WIDTH / 2, 560, text, { fontFamily: FONT, fontStyle: 'bold', fontSize: `${size}px`, color, stroke: PAL.inkCss, strokeThickness: 12, align: 'center' })
      .setOrigin(0.5)
      .setDepth(DEPTH.banner + 1)
      .setScale(3)
      .setAlpha(0);
    this.scene.tweens.add({ targets: b, scale: 1, alpha: 1, duration: 280, ease: 'Back.easeOut' });
    this.scene.tweens.add({ targets: b, alpha: 0, y: 520, delay: 280 + hold, duration: 300, onComplete: () => b.destroy() });
  }
}
