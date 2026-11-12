import * as Phaser from 'phaser';
import { GAME_WIDTH } from '../../data/config';
import { ELEMENTS, type Element } from '../../data/elements';
import { REACTIONS, type ReactionId } from '../../data/reactions';
import { FONT, PAL } from '../art/palette';
import { NUM_FONT } from '../art/textures';
import { LabelPool } from '../ui/LabelPool';
import { fxCount, quality } from '../quality';
import { DEPTH } from './layers';

const toCss = (c: number) => `#${c.toString(16).padStart(6, '0')}`;

/** All the "juice": particles, damage numbers, reaction names, shockwaves, flying coins, banners. */
export class FxLayer {
  private sparks: Phaser.GameObjects.Particles.ParticleEmitter;
  private hitSparks: Phaser.GameObjects.Particles.ParticleEmitter;
  private debris: Phaser.GameObjects.Particles.ParticleEmitter;
  private flames: Phaser.GameObjects.Particles.ParticleEmitter;
  private numbers: Phaser.GameObjects.BitmapText[] = [];
  private anim: { sx: number; sy: number; dx: number; dy: number; age: number; big: boolean; live: boolean }[] = [];
  readonly labels: LabelPool;
  private numberIdx = 0;
  private rings: Phaser.GameObjects.Image[] = [];
  private coins: Phaser.GameObjects.Image[] = [];
  private boltPool: Phaser.GameObjects.Image[] = [];
  private boltsLive: { segs: Phaser.GameObjects.Image[]; age: number }[] = [];
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

    this.labels = new LabelPool(scene);
    for (let i = 0; i < 48; i++) {
      this.anim.push({ sx: 0, sy: 0, dx: 0, dy: 0, age: 0, big: false, live: false });
      this.numbers.push(
        scene.add.bitmapText(0, 0, NUM_FONT, '', 32).setLetterSpacing(-7).setOrigin(0.5).setDepth(DEPTH.numbers).setVisible(false),
      );
    }
  }

  /** Jagged chain-lightning bolt through the given points, with glow, flicker and fade. */
  lightning(points: { x: number; y: number }[]): void {
    if (points.length < 2) return;
    // Jagged path through the points…
    const path: { x: number; y: number }[] = [points[0]!];
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1]!;
      const b = points[i]!;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len;
      const ny = dx / len;
      const steps = Math.max(2, Math.min(8, Math.round(len / 34)));
      for (let s = 1; s < steps; s++) {
        const t = s / steps;
        const off = (Math.random() - 0.5) * Math.min(26, len * 0.25);
        path.push({ x: a.x + dx * t + nx * off, y: a.y + dy * t + ny * off });
      }
      path.push(b);
    }
    // …drawn as pre-painted glowing segments (images), not a vector shape redrawn every frame.
    const segs: Phaser.GameObjects.Image[] = [];
    const wide = quality.low ? 16 : 22;
    for (let i = 1; i < path.length; i++) {
      const a = path[i - 1]!;
      const b = path[i]!;
      const img = this.boltPool.pop() ?? this.scene.add.image(0, 0, 'bolt').setOrigin(0, 0.5).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.fx + 1);
      img
        .setPosition(a.x, a.y)
        .setRotation(Math.atan2(b.y - a.y, b.x - a.x))
        .setDisplaySize(Math.hypot(b.x - a.x, b.y - a.y) + 3, wide)
        .setAlpha(1)
        .setVisible(true);
      segs.push(img);
    }
    this.boltsLive.push({ segs, age: 0 });
    for (const p of points.slice(1)) {
      this.sparks.setParticleTint(0xffe95c);
      this.sparks.explode(fxCount(4), p.x, p.y);
    }
  }

  /** Fade bolts (called from update). */
  private updateBolts(dtMs: number): void {
    for (let i = this.boltsLive.length - 1; i >= 0; i--) {
      const b = this.boltsLive[i]!;
      b.age += dtMs;
      const alpha = b.age < 90 ? 1 : 1 - (b.age - 90) / 160;
      if (alpha <= 0) {
        for (const s of b.segs) {
          s.setVisible(false);
          this.boltPool.push(s);
        }
        this.boltsLive.splice(i, 1);
        continue;
      }
      // a quick flicker, like a real discharge
      const a = b.age > 40 && b.age < 70 ? alpha * 0.45 : alpha;
      for (const s of b.segs) s.setAlpha(a);
    }
  }

  /** Burning ground patch that fades over its duration while emitting flames. */
  fireZone(x: number, y: number, radius: number, duration: number): void {
    const img = this.scene.add.image(x, y, 'fire_zone').setDepth(DEPTH.groundFx).setScale(radius / 55).setAlpha(0);
    this.scene.tweens.add({ targets: img, alpha: 0.95, duration: 150 });
    this.scene.tweens.add({ targets: img, alpha: 0, delay: duration * 1000 - 400, duration: 400, onComplete: () => img.destroy() });
    const ticker = this.scene.time.addEvent({
      delay: 140,
      repeat: Math.floor((duration * 1000) / 140) - 2,
      callback: () => this.flame(x + (Math.random() - 0.5) * radius * 1.6, y + (Math.random() - 0.5) * radius * 0.8),
    });
    void ticker;
  }

  /** Small label popping above something (ability names). */
  popLabel(x: number, y: number, text: string, color: string): void {
    const t = this.labels.get(text, 28, color, 7).setPosition(Phaser.Math.Clamp(x, 110, GAME_WIDTH - 110), y).setDepth(DEPTH.banner).setScale(0.3);
    this.scene.tweens.add({ targets: t, scale: 1, duration: 200, ease: 'Back.easeOut' });
    this.scene.tweens.add({ targets: t, y: y - 40, alpha: 0, delay: 450, duration: 400, onComplete: () => this.labels.release(t) });
  }

  /** "New enemy" card sliding in under the HUD: name + its weaknesses/resistances. */
  enemyCard(name: string, info: string): void {
    // One card at a time; the rest wait in line.
    if (this.cardBusy) {
      this.cardQueue.push([name, info]);
      return;
    }
    this.cardBusy = true;
    this.scene.time.delayedCall(3000, () => {
      this.cardBusy = false;
      const next = this.cardQueue.shift();
      if (next) this.enemyCard(next[0], next[1]);
    });
    const c = this.scene.add.container(GAME_WIDTH / 2, 170).setDepth(DEPTH.hud + 4);
    const g = this.scene.add.graphics();
    g.fillStyle(PAL.ink, 0.92);
    g.fillRoundedRect(-320, -42, 640, 84, 18);
    g.lineStyle(3, 0xffd34d, 1);
    g.strokeRoundedRect(-320, -42, 640, 84, 18);
    const t1 = this.scene.add
      .text(0, -16, `NOVO INIMIGO: ${name.toUpperCase()}`, { fontFamily: FONT, fontStyle: 'bold', fontSize: '24px', color: PAL.goldCss, stroke: PAL.inkCss, strokeThickness: 5 })
      .setOrigin(0.5);
    const t2 = this.scene.add
      .text(0, 16, info, { fontFamily: FONT, fontStyle: 'bold', fontSize: '19px', color: PAL.uiText, stroke: PAL.inkCss, strokeThickness: 4, align: 'center', wordWrap: { width: 610 } })
      .setOrigin(0.5);
    c.add([g, t1, t2]);
    c.setAlpha(0).setY(130);
    this.scene.tweens.add({ targets: c, alpha: 1, y: 170, duration: 250, ease: 'Back.easeOut' });
    this.scene.tweens.add({ targets: c, alpha: 0, delay: 2600, duration: 350, onComplete: () => c.destroy() });
  }

  private cardBusy = false;
  private cardQueue: [string, string][] = [];

  /** Tiny, short spark for ordinary hits (kept subtle so many towers don't white-out the screen). */
  hit(x: number, y: number, color: number): void {
    if (quality.low) return;
    this.hitSparks.setParticleTint(color);
    this.hitSparks.explode(2, x, y);
  }

  burst(x: number, y: number, color: number, count = 12): void {
    this.sparks.setParticleTint(color);
    this.sparks.explode(fxCount(count), x, y);
  }

  dust(x: number, y: number, color = 0xd8c39a, count = 10): void {
    this.debris.setParticleTint(color);
    this.debris.explode(fxCount(count), x, y);
  }

  private flameFlip = false;

  /** A burning rock falling from the sky onto (x, y). */
  meteor(x: number, y: number, color: number, onImpact: () => void): void {
    const rock = this.scene.add.image(x + 140, y - 520, 'spark').setTint(color).setScale(2.6).setDepth(DEPTH.fx).setBlendMode(Phaser.BlendModes.ADD);
    const core = this.scene.add.image(x + 140, y - 520, 'spark').setTint(0xfff3a8).setScale(1.2).setDepth(DEPTH.fx + 1);
    this.scene.tweens.add({
      targets: [rock, core],
      x,
      y,
      duration: 380,
      ease: 'Quad.easeIn',
      onUpdate: () => this.flames.emitParticleAt(rock.x, rock.y, 1),
      onComplete: () => {
        rock.destroy();
        core.destroy();
        onImpact();
      },
    });
  }

  flame(x: number, y: number): void {
    this.flameFlip = !this.flameFlip;
    if (quality.low && this.flameFlip) return;
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
  damage(x: number, y: number, amount: number, element: Element, opts: { crit?: boolean; reaction?: ReactionId; dot?: boolean; eff?: number }): void {
    // Big moments always show; small ones are capped per frame (and DoT ticks hidden on slow phones).
    const important = !!(opts.crit || opts.reaction);
    if (!important) {
      if (quality.numbersLeft <= 0 || (opts.dot && quality.low)) return;
      quality.numbersLeft--;
    }
    const i = this.numberIdx;
    const t = this.numbers[i]!;
    this.numberIdx = (this.numberIdx + 1) % this.numbers.length;
    let size = 30;
    let color = element === 'physical' ? 0xffffff : ELEMENTS[element].color;
    let text = `${amount}`;
    if (opts.dot) size = 24;
    // Resistances: show it clearly so players learn matchups ('<' = weak arrow up, '>' = resisted arrow down).
    const eff = opts.eff ?? 1;
    if (eff === 0) {
      text = 'IMUNE';
      color = 0x9a95b2;
      size = 24;
    } else if (eff > 1.05) {
      text += '<';
      size += 4;
    } else if (eff < 0.95) {
      text += '>';
      color = 0xb9b4cf;
      size -= 2;
    }
    if (opts.crit) {
      size = 44;
      color = 0xffe34d;
      text = `${amount}!`;
    }
    if (opts.reaction) {
      size = 48;
      color = REACTIONS[opts.reaction].color;
    }
    const jitter = (Math.random() - 0.5) * 30;
    t.setText(text).setFontSize(size).setTint(color).setPosition(x + jitter, y).setAlpha(1).setScale(important ? 1.6 : 1).setVisible(true);
    const a = this.anim[i]!;
    a.sx = x + jitter;
    a.sy = y;
    a.dx = jitter;
    a.dy = -(opts.dot ? 34 : 70);
    a.age = 0;
    a.big = important;
    a.live = true;
  }

  /** Moves/fades the damage numbers (one loop instead of 2–3 tweens per number). */
  update(dtMs: number): void {
    if (this.boltsLive.length) this.updateBolts(dtMs);
    const LIFE = 680;
    for (let i = 0; i < this.anim.length; i++) {
      const a = this.anim[i]!;
      if (!a.live) continue;
      a.age += dtMs;
      const t = this.numbers[i]!;
      if (a.age >= LIFE) {
        a.live = false;
        t.setVisible(false);
        continue;
      }
      const k = a.age / 650;
      const p = 1 - Math.pow(1 - Math.min(1, k), 3);
      t.setPosition(a.sx + a.dx * p, a.sy + a.dy * p);
      t.setAlpha(a.age < 420 ? 1 : Math.max(0, 1 - (a.age - 420) / 260));
      if (a.big) t.setScale(a.age < 180 ? 1.6 - 0.6 * (a.age / 180) : 1);
    }
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
    const b = this.labels.get(def.name, combo >= 5 ? 46 : 40, toCss(def.color), 10);
    const bx = Phaser.Math.Clamp(x, 170, GAME_WIDTH - 170);
    const by = Math.max(250, y - 40);
    b.setPosition(bx, by).setDepth(DEPTH.banner).setScale(0).setAngle((Math.random() - 0.5) * 10);
    this.scene.tweens.add({ targets: b, scale: 1, duration: 260, ease: 'Back.easeOut' });
    this.scene.tweens.add({ targets: b, y: by - 60, duration: 900, ease: 'Cubic.easeOut' });
    this.scene.tweens.add({ targets: b, alpha: 0, delay: 650, duration: 300, onComplete: () => this.labels.release(b) });
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

  private currentBanner: Phaser.GameObjects.Text | null = null;

  private showBigBanner(text: string, color: string, size: number, hold: number): void {
    // Only one big banner at a time: a newer one (urgent or queued) clears whatever is still on screen.
    const old = this.currentBanner;
    if (old && old.active && old.visible) {
      this.scene.tweens.killTweensOf(old);
      this.scene.tweens.add({ targets: old, alpha: 0, duration: 90, onComplete: () => this.labels.release(old) });
    }
    const b = this.labels.get(text, size, color, 12).setPosition(GAME_WIDTH / 2, 560).setDepth(DEPTH.banner + 1).setScale(3).setAlpha(0);
    this.scene.tweens.add({ targets: b, scale: 1, alpha: 1, duration: 280, ease: 'Back.easeOut' });
    this.scene.tweens.add({ targets: b, alpha: 0, y: 520, delay: 280 + hold, duration: 300, onComplete: () => this.labels.release(b) });
    this.currentBanner = b;
  }
}
