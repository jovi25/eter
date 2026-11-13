import * as Phaser from 'phaser';
import { pin } from '../ui/uiLayer';
import { GAME_HEIGHT, GAME_WIDTH } from '../../data/config';
import { TIPS, type TipId } from '../../data/tutorial';
import { playSfx } from '../audio/sfx';
import { PAL } from '../art/palette';
import { Button, uiText } from '../ui/Button';
import { DEPTH } from './layers';

const KEY = 'eter.tips.v1';

function loadSeen(): Set<string> {
  try {
    const raw = localStorage.getItem(KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

let seen = loadSeen();

export function tipSeen(id: TipId): boolean {
  return seen.has(id);
}

function markSeen(id: TipId): void {
  seen.add(id);
  try {
    localStorage.setItem(KEY, JSON.stringify([...seen]));
  } catch {
    /* ignore */
  }
}

/** "Rever dicas" in Opções. */
export function resetTips(): void {
  seen = new Set();
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

interface Pending {
  id: TipId;
  target?: () => { x: number; y: number } | null;
}

/**
 * Shows each tutorial tip once, one at a time, pausing the match while it is on screen.
 * An optional bouncing arrow points at what the tip talks about.
 */
export class Tutorial {
  private queue: Pending[] = [];
  private objs: Phaser.GameObjects.GameObject[] = [];
  private gapMs = 0;

  constructor(private scene: Phaser.Scene) {}

  /** True while a tip is on screen (the scene doesn't advance the simulation). */
  get blocking(): boolean {
    return this.objs.length > 0;
  }

  request(id: TipId, target?: () => { x: number; y: number } | null): void {
    if (tipSeen(id) || this.queue.some((q) => q.id === id)) return;
    this.queue.push({ id, target });
  }

  /** Call every frame; `canShow` is false while another overlay (Bênção, pause, end) is up. */
  update(dtMs: number, canShow: boolean): void {
    if (this.gapMs > 0) this.gapMs -= dtMs;
    if (this.blocking || !canShow || this.gapMs > 0 || this.queue.length === 0) return;
    const next = this.queue.shift()!;
    if (tipSeen(next.id)) return;
    this.show(next);
  }

  private show(p: Pending): void {
    const s = this.scene;
    const tip = TIPS[p.id];
    markSeen(p.id);
    const target = p.target?.() ?? null;
    // Tall maps: scroll the target into view first (targets are in world coordinates).
    if (target) (s as Phaser.Scene & { focusOn?: (y: number) => void }).focusOn?.(target.y);
    const scrollY = s.cameras.main.scrollY;
    // Card on the half of the screen away from the target.
    const cardY = target && target.y - scrollY < GAME_HEIGHT / 2 ? 900 : 300;
    const shade = s.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x07040f, 0.35).setDepth(DEPTH.panel - 2).setInteractive();
    const c = s.add.container(GAME_WIDTH / 2, cardY).setDepth(DEPTH.panel - 1);
    const g = s.add.graphics();
    g.fillStyle(PAL.ink, 1);
    g.fillRoundedRect(-310, -120, 620, 250, 26);
    g.fillStyle(0xffd34d, 1);
    g.fillRoundedRect(-305, -115, 610, 240, 22);
    g.fillStyle(0x2a1a4d, 1);
    g.fillRoundedRect(-299, -109, 598, 228, 18);
    const bulb = s.add.image(-250, -70, 'star').setScale(0.42);
    const title = uiText(s, -222, -70, tip.title, 30, '#ffe34d', 6).setOrigin(0, 0.5);
    const text = uiText(s, -270, -36, tip.text, 21, PAL.uiText, 4).setOrigin(0, 0).setAlign('left').setWordWrapWidth(540);
    const ok = new Button(s, 200, 82, { width: 170, height: 58, label: 'Entendi', fontSize: 24, color: 0x3aa655, onClick: () => this.close() });
    const tag = uiText(s, -270, 84, 'Dica', 18, PAL.uiDim, 4).setOrigin(0, 0.5);
    c.add([g, bulb, title, text, ok, tag]);
    pin(shade);
    pin(c);
    c.setScale(0.6).setAlpha(0);
    s.tweens.add({ targets: c, scale: 1, alpha: 1, duration: 220, ease: 'Back.easeOut' });
    this.objs.push(shade, c);
    if (target) {
      const ring = s.add.image(target.x, target.y, 'ring').setDepth(DEPTH.panel - 1).setScale(1.6).setTint(0xffe34d).setAlpha(0.9);
      s.tweens.add({ targets: ring, scale: 2.1, alpha: 0.3, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      const above = target.y - scrollY > 200;
      const arrow = uiText(s, target.x, target.y + (above ? -86 : 86), above ? '▼' : '▲', 56, '#ffe34d', 8).setDepth(DEPTH.panel - 1);
      s.tweens.add({ targets: arrow, y: arrow.y + (above ? 16 : -16), duration: 420, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.objs.push(ring, arrow);
    }
    playSfx('star', 1.3);
  }

  private close(): void {
    for (const o of this.objs) {
      this.scene.tweens.killTweensOf(o);
      o.destroy();
    }
    this.objs = [];
    this.gapMs = 1500;
  }

  destroy(): void {
    this.close();
    this.queue = [];
  }
}
