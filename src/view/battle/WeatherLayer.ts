import * as Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../../data/config';
import { WEATHER, type WeatherId } from '../../data/weather';
import type { Simulation } from '../../sim/simulation';
import { PAL } from '../art/palette';
import { uiText } from '../ui/Button';
import { pin } from '../ui/uiLayer';
import { economyOn } from '../perf';
import { DEPTH } from './layers';

const DROPS = 70;
const STREAKS = 24;

/**
 * Clima (Região 4): rain, wind or eclipse drawn over the battlefield (pinned to the screen), and a small chip
 * under the top bar with the weather now (and how long it lasts) or the forecast for the next wave.
 */
export class WeatherLayer {
  private readonly tint: Phaser.GameObjects.Rectangle;
  private readonly fx: Phaser.GameObjects.Graphics;
  private readonly chip: Phaser.GameObjects.Container;
  private readonly chipBg: Phaser.GameObjects.Graphics;
  private readonly chipText: Phaser.GameObjects.Text;
  private readonly chipBar: Phaser.GameObjects.Rectangle;
  private readonly parts: { x: number; y: number; v: number; len: number }[] = [];
  private shown: WeatherId | null = null;
  private strength = 0; // 0..1 fade of the overlay
  private chipKey = '';

  constructor(private scene: Phaser.Scene) {
    this.tint = pin(scene.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0).setOrigin(0).setDepth(DEPTH.banner - 2));
    this.fx = pin(scene.add.graphics().setDepth(DEPTH.banner - 1));
    this.chipBg = scene.add.graphics();
    this.chipText = uiText(scene, 0, 0, '', 18, '#ffffff', 4).setOrigin(0, 0.5);
    this.chipBar = scene.add.rectangle(0, 13, 108, 4, 0xffffff, 0.9).setOrigin(0, 0.5);
    this.chip = pin(scene.add.container(12, 122, [this.chipBg, this.chipText, this.chipBar]).setDepth(DEPTH.hud).setVisible(false));
    for (let i = 0; i < Math.max(DROPS, STREAKS); i++) this.parts.push({ x: Math.random() * GAME_WIDTH, y: Math.random() * GAME_HEIGHT, v: 0.7 + Math.random() * 0.6, len: 0.6 + Math.random() * 0.8 });
  }

  update(sim: Simulation, dtMs: number): void {
    const w = sim.state.weather;
    if (w.kind) this.shown = w.kind;
    const target = w.kind ? 1 : 0;
    this.strength += Math.sign(target - this.strength) * Math.min(Math.abs(target - this.strength), dtMs / 600);
    this.drawOverlay(dtMs);
    this.drawChip(w.kind, w.left, w.next);
  }

  private drawOverlay(dtMs: number): void {
    const g = this.fx;
    g.clear();
    const kind = this.shown;
    if (!kind || this.strength <= 0) {
      this.tint.setFillStyle(0x000000, 0);
      return;
    }
    const a = this.strength;
    const dt = dtMs / 1000;
    const few = economyOn();
    if (kind === 'rain') {
      this.tint.setFillStyle(0x2a4a8a, 0.14 * a);
      g.lineStyle(2, 0xbfd8ff, 0.55 * a);
      const n = few ? DROPS / 2 : DROPS;
      for (let i = 0; i < n; i++) {
        const p = this.parts[i]!;
        p.y += 1300 * p.v * dt;
        p.x -= 260 * p.v * dt;
        if (p.y > GAME_HEIGHT) {
          p.y -= GAME_HEIGHT + 40;
          p.x = Math.random() * (GAME_WIDTH + 200);
        }
        if (p.x < -40) p.x += GAME_WIDTH + 80;
        g.lineBetween(p.x, p.y, p.x + 9 * p.len, p.y - 34 * p.len);
      }
    } else if (kind === 'wind') {
      this.tint.setFillStyle(0xc8f0d8, 0.06 * a);
      g.lineStyle(3, 0xffffff, 0.35 * a);
      const n = few ? STREAKS / 2 : STREAKS;
      for (let i = 0; i < n; i++) {
        const p = this.parts[i]!;
        p.x += 1100 * p.v * dt;
        if (p.x > GAME_WIDTH + 120) {
          p.x = -160;
          p.y = 120 + Math.random() * (GAME_HEIGHT - 240);
        }
        const wave = Math.sin((p.x + i * 40) / 60) * 6;
        g.lineBetween(p.x, p.y + wave, p.x + 110 * p.len, p.y + wave * 0.4);
      }
    } else {
      // Eclipse: the sky darkens to violet; a pale ring pulses at the edges.
      this.tint.setFillStyle(0x1a0838, 0.26 * a);
      const pulse = 0.5 + 0.5 * Math.sin(this.scene.time.now / 260);
      g.lineStyle(14, 0xb57bff, (0.18 + 0.14 * pulse) * a);
      g.strokeRect(7, 7, GAME_WIDTH - 14, GAME_HEIGHT - 14);
    }
  }

  private drawChip(now: WeatherId | null, left: number, next: WeatherId | null): void {
    const kind = now ?? next;
    if (!kind) {
      this.chip.setVisible(false);
      this.chipKey = '';
      return;
    }
    const def = WEATHER[kind];
    const label = now ? `${def.icon} ${def.name}` : `Próxima: ${def.icon}`;
    const key = `${now ? 1 : 0}${kind}`;
    if (key !== this.chipKey) {
      this.chipKey = key;
      this.chipText.setText(label);
      const w = this.chipText.width + 24;
      this.chipBg.clear();
      this.chipBg.fillStyle(PAL.ink, 0.8);
      this.chipBg.fillRoundedRect(0, -20, w, 42, 14);
      this.chipBg.lineStyle(3, def.color, 1);
      this.chipBg.strokeRoundedRect(0, -20, w, 42, 14);
      this.chipText.setPosition(12, -3);
      this.chipBar.setPosition(12, 13).setFillStyle(def.color, 0.95);
      this.chipBar.width = w - 24;
      this.chip.setData('w', w - 24);
      this.chip.setVisible(true);
    }
    this.chipBar.setVisible(!!now);
    if (now) this.chipBar.setScale(Math.max(0, left / def.duration), 1);
  }
}
