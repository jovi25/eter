import * as Phaser from 'phaser';
import { bakeInPlace } from '../ui/bake';
import { GAME_HEIGHT, GAME_WIDTH } from '../../data/config';
import { ENEMIES } from '../../data/enemies';
import type { Simulation } from '../../sim/simulation';
import { PAL } from '../art/palette';
import { Button, uiText } from '../ui/Button';
import { DEPTH } from './layers';
import { NUM_FONT } from '../art/textures';
import { LabelPool } from '../ui/LabelPool';

export interface HudCallbacks {
  onSpeed: () => void;
  onPause: () => void;
  onCallWave: () => void;
  onAltar?: () => void; // Fenda Infinita only
}

/** Top bar (lives, gold, wave, 2×, pause), combo meter, boss bar, bottom "call wave" button. */
export class Hud {
  readonly goldIconPos = { x: 182, y: 48 };
  private livesText: Phaser.GameObjects.BitmapText;
  private goldText: Phaser.GameObjects.BitmapText;
  private labels: LabelPool;
  private waveText: Phaser.GameObjects.Text;
  private speedBtn: Button;
  private callBtn: Button;
  private callSub: Phaser.GameObjects.Text;
  private heart: Phaser.GameObjects.Image;
  private coin: Phaser.GameObjects.Image;
  private combo: Phaser.GameObjects.Container;
  private comboText: Phaser.GameObjects.BitmapText;
  private comboSub: Phaser.GameObjects.BitmapText;
  private boss: Phaser.GameObjects.Container;
  private bossFill: Phaser.GameObjects.Rectangle;
  private last = { gold: -1, lives: -1, wave: -1, call: '', altar: '' };
  private altarBtn: Button | null = null;
  private altarGlow: Phaser.GameObjects.Image | null = null;

  constructor(private scene: Phaser.Scene, cb: HudCallbacks) {
    const top = scene.add.graphics().setDepth(DEPTH.hud);
    top.fillStyle(PAL.panel, 0.88);
    top.fillRoundedRect(-20, -20, GAME_WIDTH + 40, 116, 24);
    top.lineStyle(4, 0x5a3fb0, 1);
    top.strokeRoundedRect(-20, -20, GAME_WIDTH + 40, 116, 24);
    bakeInPlace(top, { x0: -24, y0: -24, w: GAME_WIDTH + 48, h: 124 }, 'hud_top');

    this.heart = scene.add.image(42, 48, 'heart').setDepth(DEPTH.hud);
    this.labels = new LabelPool(scene);
    // Numbers that change all the time use the pre-drawn digit font (no canvas re-draw per change).
    this.livesText = scene.add.bitmapText(70, 50, NUM_FONT, '20', 40).setLetterSpacing(-7).setOrigin(0, 0.5).setDepth(DEPTH.hud);
    this.coin = scene.add.image(this.goldIconPos.x, this.goldIconPos.y, 'coin').setDepth(DEPTH.hud).setScale(1.1);
    this.goldText = scene.add.bitmapText(206, 50, NUM_FONT, '120', 40).setLetterSpacing(-7).setTint(0xffd34d).setOrigin(0, 0.5).setDepth(DEPTH.hud);
    this.waveText = uiText(scene, 448, 48, 'Onda 0/10', 30).setDepth(DEPTH.hud);

    this.speedBtn = new Button(scene, 588, 48, { width: 76, height: 60, label: '1×', fontSize: 30, color: 0x3d7bd9, onClick: cb.onSpeed });
    this.speedBtn.setDepth(DEPTH.hud);
    new Button(scene, 674, 48, { width: 64, height: 60, icon: 'icon_pause', iconScale: 0.8, color: 0x5a3fb0, onClick: cb.onPause }).setDepth(DEPTH.hud);

    // bottom bar
    const bottom = scene.add.graphics().setDepth(DEPTH.hud);
    bottom.fillStyle(PAL.panel, 0.88);
    bottom.fillRoundedRect(-20, GAME_HEIGHT - 104, GAME_WIDTH + 40, 140, 24);
    bakeInPlace(bottom, { x0: -24, y0: GAME_HEIGHT - 108, w: GAME_WIDTH + 48, h: 148 }, 'hud_bottom');
    const compact = !!cb.onAltar;
    const callX = compact ? 222 : 290;
    this.callBtn = new Button(scene, callX, GAME_HEIGHT - 58, {
      width: compact ? 270 : 400,
      height: 78,
      label: 'COMEÇAR',
      fontSize: compact ? 24 : 32,
      color: 0x3aa655,
      onClick: cb.onCallWave,
    });
    this.callBtn.setDepth(DEPTH.hud);
    this.callSub = uiText(scene, callX, GAME_HEIGHT - 116, '', 20, PAL.goldCss, 5).setDepth(DEPTH.hud);
    if (cb.onAltar) {
      this.altarGlow = scene.add.image(452, GAME_HEIGHT - 58, 'spark').setScale(5).setTint(0xc77dff).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0).setDepth(DEPTH.hud);
      this.altarBtn = new Button(scene, 452, GAME_HEIGHT - 58, { width: 150, height: 78, label: 'ALTAR', fontSize: 22, color: 0x8a3fd0, onClick: cb.onAltar });
      this.altarBtn.setDepth(DEPTH.hud);
      scene.tweens.add({ targets: this.altarGlow, scale: 6.5, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }

    // combo meter
    const comboWord = uiText(scene, -6, 0, 'COMBO', 40, '#ffe34d', 8).setOrigin(1, 0.5);
    this.comboText = scene.add.bitmapText(0, 2, NUM_FONT, '', 52).setLetterSpacing(-9).setTint(0xffe34d).setOrigin(0, 0.5);
    this.comboSub = scene.add.bitmapText(-6, 36, NUM_FONT, '', 28).setLetterSpacing(-6).setOrigin(1, 0.5);
    const comboSubWord = uiText(scene, 0, 36, 'dano de reação', 22, PAL.uiText, 5).setOrigin(0, 0.5);
    this.combo = scene.add.container(GAME_WIDTH / 2 - 10, 196, [comboWord, this.comboText, this.comboSub, comboSubWord]).setDepth(DEPTH.hud).setVisible(false);

    // boss bar
    const bossName = uiText(scene, 0, -22, ENEMIES.herald.name.toUpperCase(), 24, '#bff4ff', 5);
    const bossBg = scene.add.rectangle(0, 8, 460, 24, PAL.ink).setStrokeStyle(3, 0xffffff);
    this.bossFill = scene.add.rectangle(-226, 8, 452, 16, 0x6fe6ff).setOrigin(0, 0.5);
    const mvp = uiText(scene, -262, 8, 'MVP', 22, '#ffd34d', 5);
    this.boss = scene.add.container(GAME_WIDTH / 2 + 20, 132, [bossBg, this.bossFill, bossName, mvp]).setDepth(DEPTH.hud).setVisible(false);
  }

  setSpeed(speed: number): void {
    this.speedBtn.setLabel(`${speed}×`).setColor(speed > 1 ? 0xe0862f : 0x3d7bd9);
  }

  update(sim: Simulation): void {
    const s = sim.state;
    if (s.gold !== this.last.gold) {
      this.goldText.setText(`${s.gold}`);
      this.last.gold = s.gold;
    }
    if (s.lives !== this.last.lives) {
      this.livesText.setText(`${s.lives}`);
      if (this.last.lives > s.lives) this.pulse(this.heart, 1.5);
      this.last.lives = s.lives;
    }
    if (s.wave !== this.last.wave) {
      this.waveText.setText(`Onda ${s.wave}/${s.totalWaves}`);
      this.pulse(this.waveText, 1.3);
      this.last.wave = s.wave;
    }

    let label: string;
    let sub = '';
    let enabled = false;
    const bonus = sim.earlyCallBonus();
    if (s.wavePhase === 'prep') {
      label = 'COMEÇAR';
      sub = `Começa em ${Math.ceil(s.nextWaveTimer)}s • chamar já: +${bonus} ouro`;
      enabled = true;
    } else if (s.wavePhase === 'countdown') {
      label = `CHAMAR ONDA ${s.wave + 1}`;
      sub = `Chega em ${Math.ceil(s.nextWaveTimer)}s • chamar já: +${bonus} ouro`;
      enabled = true;
    } else if (s.wavePhase === 'spawning') {
      label = `ONDA ${s.wave} CHEGANDO...`;
    } else {
      label = s.result === 'playing' ? 'ONDA FINAL!' : s.result === 'won' ? 'VITÓRIA!' : 'FIM';
    }
    const key = `${label}|${sub}|${enabled}`;
    if (key !== this.last.call) {
      this.callBtn.setLabel(label).setEnabled(enabled);
      this.callSub.setText(sub);
      this.last.call = key;
    }

    const altarCost = sim.altarCost();
    if (this.altarBtn && altarCost !== null) {
      const ready = s.gold >= altarCost && s.boonOffers.length === 0 && s.result === 'playing';
      const akey = `${altarCost}|${ready}`;
      if (akey !== this.last.altar) {
        this.altarBtn.setLabel(`ALTAR\n${altarCost}`).setColor(ready ? 0x8a3fd0 : 0x4a3a66);
        this.altarGlow?.setAlpha(ready ? 0.8 : 0);
        this.last.altar = akey;
      }
    }

    const boss = s.enemies.find((e) => e.isBoss);
    this.boss.setVisible(!!boss);
    if (boss) this.bossFill.width = 452 * Math.max(0, boss.hp / boss.maxHp);
  }

  pulseGold(): void {
    this.pulse(this.coin, 1.4);
    this.pulse(this.goldText, 1.2);
  }

  setCombo(count: number, mult: number): void {
    if (count < 2) {
      this.combo.setVisible(false);
      return;
    }
    this.combo.setVisible(true).setAlpha(1);
    this.comboText.setText(`x${count}`);
    this.comboSub.setText(`+${Math.round((mult - 1) * 100)}%`);
    this.scene.tweens.killTweensOf(this.combo);
    this.combo.setScale(1.5);
    this.scene.tweens.add({ targets: this.combo, scale: 1, duration: 220, ease: 'Back.easeOut' });
  }

  endCombo(): void {
    this.scene.tweens.add({ targets: this.combo, alpha: 0, duration: 300, onComplete: () => this.combo.setVisible(false) });
  }

  floatText(x: number, y: number, text: string, color: string): void {
    const t = this.labels.get(text, 30, color, 6).setPosition(x, y).setDepth(DEPTH.hud + 2);
    this.scene.tweens.add({ targets: t, y: y - 50, alpha: 0, duration: 1100, ease: 'Cubic.easeOut', onComplete: () => this.labels.release(t) });
  }

  private pulse(obj: Phaser.GameObjects.Components.Transform & Phaser.GameObjects.GameObject, to: number): void {
    this.scene.tweens.killTweensOf(obj);
    obj.setScale(1);
    this.scene.tweens.add({ targets: obj, scale: to, duration: 90, yoyo: true, ease: 'Quad.easeOut' });
  }
}
