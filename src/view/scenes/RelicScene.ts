import * as Phaser from 'phaser';
import { bakeInPlace } from '../ui/bake';
import { fitCamera, frameCap } from '../perf';
import { BOONS, type BoonDef } from '../../data/boons';
import { GAME_HEIGHT, GAME_WIDTH } from '../../data/config';
import {
  CHEST_ODDS, CHEST_PITY, COINS, LOCKED_BOONS, MAX_RELIC_LEVEL, RELIC_IDS, RELIC_RARITIES, RELIC_RARITY_COLOR, RELIC_RARITY_LABEL, RELIC_SLOTS, RELICS,
  type ChestReward, type RelicId, type RelicRarity,
} from '../../data/relics';
import { getSave } from '../../meta/save';
import { PAL } from '../art/palette';
import { playSfx } from '../audio/sfx';
import { paintMapBackground } from '../battle/MapView';
import { vibrate } from '../settings';
import { Button, uiText } from '../ui/Button';

const css = (c: number) => `#${c.toString(16).padStart(6, '0')}`;

/** Relicário: spend coins on chests, open them by tapping, equip up to 3 Relíquias. */
export class RelicScene extends Phaser.Scene {
  private detail: Phaser.GameObjects.Container | null = null;

  constructor() {
    super('Relics');
  }

  create(): void {
    fitCamera(this);
    frameCap(this, 'menu');
    this.detail = null;
    const save = getSave();
    paintMapBackground(this, [], 'relic_bg');
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0b0716, 0.6);

    // Header
    const head = this.add.graphics();
    head.fillStyle(PAL.panel, 0.92);
    head.fillRoundedRect(-20, -20, GAME_WIDTH + 40, 130, 24);
    bakeInPlace(head, { x0: -24, y0: -24, w: GAME_WIDTH + 48, h: 138 }, 'relic_head');
    uiText(this, GAME_WIDTH / 2, 42, 'Relicário', 44, '#f3e9ff', 8);
    this.add.image(GAME_WIDTH / 2 - 60, 88, 'eter_coin').setScale(0.9);
    uiText(this, GAME_WIDTH / 2 - 36, 88, `${save.data.coins} moedas`, 26, '#d6c4ff', 5).setOrigin(0, 0.5);

    // Chest
    const pending = save.data.chest.pending;
    const glow = this.add.image(GAME_WIDTH / 2, 290, 'spark').setScale(14).setTint(0xb57bff).setAlpha(0.45).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: glow, scale: 16, alpha: 0.7, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    const chest = this.add.image(GAME_WIDTH / 2, 290, 'chest').setScale(1.15);
    this.tweens.add({ targets: chest, y: 282, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    const can = !!pending || save.data.coins >= COINS.chestPrice;
    const open = new Button(this, GAME_WIDTH / 2, 438, {
      width: 380,
      height: 84,
      label: pending ? 'CONTINUAR ABERTURA' : `ABRIR • ${COINS.chestPrice} moedas`,
      fontSize: pending ? 28 : 30,
      color: can ? 0x8a3fd0 : 0x4a3a66,
      onClick: () => {
        const r = save.buyChest();
        if (!r) {
          playSfx('error');
          this.toast(`Faltam ${COINS.chestPrice - save.data.coins} moedas. Jogue partidas, desafios e a Fenda!`);
          return;
        }
        new ChestOpening(this, r, () => this.scene.restart());
      },
    });
    if (can) this.tweens.add({ targets: open, scale: 1.04, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    const odds = RELIC_RARITIES.map((r) => `${RELIC_RARITY_LABEL[r]} ${Math.round(CHEST_ODDS[r] * 100)}%`).join('  •  ');
    uiText(this, GAME_WIDTH / 2, 506, `Chances: ${odds}`, 18, PAL.uiDim, 4);
    const left = CHEST_PITY - save.data.chest.sinceEpic;
    uiText(this, GAME_WIDTH / 2, 534, `Épica ou melhor garantida em até ${left} ${left === 1 ? 'baú' : 'baús'}`, 18, '#e0c8ff', 4);

    // Collection
    const owned = RELIC_IDS.filter((id) => save.data.relics[id]).length;
    const boons = save.data.unlockedBoons.length;
    uiText(this, GAME_WIDTH / 2, 586, `Relíquias ${owned}/${RELIC_IDS.length}  •  Equipadas ${save.data.equipped.length}/${RELIC_SLOTS}  •  Bênçãos novas ${boons}/${LOCKED_BOONS.length}`, 20, PAL.goldCss, 5);
    uiText(this, GAME_WIDTH / 2, 614, 'Toque numa relíquia para ver e equipar', 17, PAL.uiDim, 4);
    RELIC_IDS.forEach((id, i) => this.relicCard(id, 105 + (i % 4) * 170, 700 + Math.floor(i / 4) * 140));

    new Button(this, GAME_WIDTH / 2, GAME_HEIGHT - 50, {
      width: 320,
      height: 70,
      label: 'Voltar ao mapa',
      fontSize: 26,
      color: 0x6b6480,
      onClick: () => this.scene.start('WorldMap'),
    });
    this.cameras.main.fadeIn(200, 11, 7, 22);
    // A chest bought but not opened (game closed mid-opening) resumes right away.
    if (pending) this.time.delayedCall(250, () => new ChestOpening(this, pending, () => this.scene.restart()));
  }

  private relicCard(id: RelicId, x: number, y: number): void {
    const save = getSave();
    const def = RELICS[id];
    const level = save.data.relics[id] ?? 0;
    const on = save.data.equipped.includes(id);
    const rc = RELIC_RARITY_COLOR[def.rarity];
    const c = this.add.container(x, y);
    const g = this.add.graphics();
    g.fillStyle(on ? 0x6ee66e : PAL.ink, 1);
    g.fillRoundedRect(-77, -64, 154, 130, 16);
    g.fillStyle(level ? rc : 0x3a3350, 1);
    g.fillRoundedRect(-73, -60, 146, 122, 13);
    g.fillStyle(level ? 0x2a1a4d : 0x1e1830, 1);
    g.fillRoundedRect(-69, -56, 138, 114, 11);
    const gImg = bakeInPlace(g, { x0: -79, y0: -66, w: 158, h: 134 }, `relcard_${on}_${level ? rc : 0}`);
    const icon = this.add.image(0, -10, `relic_${id}`).setScale(0.82);
    if (!level) icon.setTint(0x141020).setAlpha(0.8);
    c.add([gImg, icon, uiText(this, 0, 44, level ? def.name : '???', 14, level ? PAL.uiText : PAL.uiDim, 3).setWordWrapWidth(136)]);
    if (level) {
      c.add(uiText(this, 58, -44, `${level}`, 18, '#ffffff', 4));
      if (on) c.add(uiText(this, -56, -44, '✔', 20, '#6ee66e', 4));
    }
    c.setSize(154, 130).setInteractive({ useHandCursor: true });
    c.on('pointerdown', () => {
      playSfx('ui');
      this.relicDetail(id);
    });
  }

  private relicDetail(id: RelicId): void {
    this.detail?.destroy();
    const save = getSave();
    const def = RELICS[id];
    const level = save.data.relics[id] ?? 0;
    const on = save.data.equipped.includes(id);
    const rc = RELIC_RARITY_COLOR[def.rarity];
    const c = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2).setDepth(10);
    const shade = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x07040f, 0.7).setInteractive();
    shade.on('pointerdown', () => {
      c.destroy();
      this.detail = null;
    });
    const g = this.add.graphics();
    g.fillStyle(PAL.ink, 1);
    g.fillRoundedRect(-300, -280, 600, 560, 30);
    g.fillStyle(rc, 1);
    g.fillRoundedRect(-295, -275, 590, 550, 26);
    g.fillStyle(0x2a1a4d, 1);
    g.fillRoundedRect(-288, -268, 576, 536, 22);
    c.add([shade, g]);
    const icon = this.add.image(0, -170, `relic_${id}`).setScale(1.6);
    if (!level) icon.setTint(0x141020).setAlpha(0.85);
    c.add(icon);
    c.add(uiText(this, 0, -76, def.name, 34, '#ffffff', 7));
    c.add(uiText(this, 0, -38, `${RELIC_RARITY_LABEL[def.rarity].toUpperCase()}${level ? `  •  NÍVEL ${level}/${MAX_RELIC_LEVEL}` : ''}`, 20, css(rc), 5));
    c.add(uiText(this, 0, 12, def.desc(Math.max(1, level)), 24, PAL.uiText, 5).setWordWrapWidth(540));
    if (level && level < MAX_RELIC_LEVEL) c.add(uiText(this, 0, 76, `Próximo nível: ${def.desc(level + 1)}`, 18, PAL.uiDim, 4).setWordWrapWidth(540));
    if (!level) {
      c.add(uiText(this, 0, 150, 'Ainda não encontrada. Pode sair num Relicário.', 20, PAL.uiDim, 4).setWordWrapWidth(540));
    } else {
      c.add(
        new Button(this, 0, 186, {
          width: 320,
          height: 76,
          label: on ? 'Tirar' : 'Equipar',
          fontSize: 30,
          color: on ? 0x6b6480 : 0x3aa655,
          onClick: () => {
            if (!save.toggleEquip(id)) {
              playSfx('error');
              this.toast(`Só ${RELIC_SLOTS} relíquias por vez. Tire uma antes.`);
              return;
            }
            this.scene.restart();
          },
        }),
      );
    }
    c.setScale(0.85).setAlpha(0);
    this.tweens.add({ targets: c, scale: 1, alpha: 1, duration: 200, ease: 'Back.easeOut' });
    this.detail = c;
  }

  private toast(text: string): void {
    const t = uiText(this, GAME_WIDTH / 2, GAME_HEIGHT - 130, text, 22, '#ffffff', 6).setDepth(60).setWordWrapWidth(620);
    this.tweens.add({ targets: t, alpha: 0, delay: 2200, duration: 400, onComplete: () => t.destroy() });
  }
}

/**
 * The opening: 4 taps. The rarity can climb on the first three (flash, shake, colour change),
 * the 4th bursts the chest open and reveals the pre-rolled reward.
 */
class ChestOpening {
  private objs: Phaser.GameObjects.GameObject[] = [];
  private taps = 0;
  private shown = 0; // rarity index currently displayed
  private readonly target: number;
  private readonly rises: Set<number>;
  private revealed = false;
  private chest: Phaser.GameObjects.Image;
  private glow: Phaser.GameObjects.Image;
  private label: Phaser.GameObjects.Text;
  private hint: Phaser.GameObjects.Text;
  private skip: Button;

  constructor(private scene: Phaser.Scene, private reward: ChestReward, private onDone: () => void) {
    this.target = RELIC_RARITIES.indexOf(reward.rarity);
    // Which of taps 1..3 raise the rarity (exactly `target` of them, at random).
    const taps = [1, 2, 3].sort(() => Math.random() - 0.5).slice(0, this.target);
    this.rises = new Set(taps);
    const W = GAME_WIDTH;
    const H = GAME_HEIGHT;
    const shade = scene.add.rectangle(W / 2, H / 2, W, H, 0x07040f, 0.88).setDepth(100).setInteractive();
    shade.on('pointerdown', () => this.tap());
    this.glow = scene.add.image(W / 2, 600, 'spark').setScale(18).setTint(RELIC_RARITY_COLOR.common).setAlpha(0.6).setBlendMode(Phaser.BlendModes.ADD).setDepth(101);
    scene.tweens.add({ targets: this.glow, scale: 20, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.chest = scene.add.image(W / 2, 620, 'chest').setScale(1.7).setDepth(102);
    this.label = uiText(scene, W / 2, 380, RELIC_RARITY_LABEL.common.toUpperCase(), 52, css(RELIC_RARITY_COLOR.common), 10).setDepth(103);
    this.hint = uiText(scene, W / 2, 880, 'Toque no baú!  (4 toques)', 30, '#ffffff', 6).setDepth(103);
    scene.tweens.add({ targets: this.hint, alpha: 0.4, duration: 600, yoyo: true, repeat: -1 });
    const skip = (this.skip = new Button(scene, W - 110, 160, { width: 170, height: 60, label: 'Pular', fontSize: 24, color: 0x6b6480, onClick: () => this.reveal() }));
    skip.setDepth(104);
    this.objs.push(shade, this.glow, this.chest, this.label, this.hint, skip);
    this.chest.setScale(0);
    scene.tweens.add({ targets: this.chest, scale: 1.7, duration: 420, ease: 'Back.easeOut' });
  }

  private tap(): void {
    if (this.revealed) return;
    this.taps++;
    const s = this.scene;
    s.tweens.killTweensOf(this.chest);
    this.chest.setScale(1.7).setAngle(0);
    if (this.taps >= 4) {
      this.reveal();
      return;
    }
    const intensity = 1 + this.taps * 0.5;
    s.tweens.add({ targets: this.chest, angle: { from: -6 * intensity, to: 6 * intensity }, duration: 50, yoyo: true, repeat: 2, onComplete: () => this.chest.setAngle(0) });
    s.tweens.add({ targets: this.chest, scale: 1.7 + 0.08 * this.taps, duration: 90, yoyo: true });
    if (this.rises.has(this.taps)) {
      this.shown++;
      const r = RELIC_RARITIES[this.shown] as RelicRarity;
      const color = RELIC_RARITY_COLOR[r];
      s.cameras.main.flash(160, 255, 255, 255);
      s.cameras.main.shake(180, 0.006 * intensity);
      playSfx('star', 1 + this.shown * 0.2);
      vibrate([30, 40, 60]);
      this.glow.setTint(color);
      this.label.setText(RELIC_RARITY_LABEL[r].toUpperCase()).setColor(css(color)).setScale(1.8);
      s.tweens.add({ targets: this.label, scale: 1, duration: 320, ease: 'Back.easeOut' });
    } else {
      playSfx('ui', 0.8 + this.taps * 0.15);
      vibrate(15);
    }
  }

  private reveal(): void {
    if (this.revealed) return;
    this.revealed = true;
    const s = this.scene;
    const save = getSave();
    save.claimChest();
    const r = this.reward;
    const color = RELIC_RARITY_COLOR[r.rarity];
    this.glow.setTint(color);
    this.label.setText(RELIC_RARITY_LABEL[r.rarity].toUpperCase()).setColor(css(color));
    this.hint.destroy();
    this.skip.setVisible(false);
    s.cameras.main.flash(260, 255, 255, 255);
    playSfx(r.rarity === 'legendary' ? 'mvp' : r.rarity === 'epic' ? 'victory' : 'upgrade');
    vibrate([40, 30, 80]);
    s.tweens.add({ targets: this.chest, scale: 2.4, alpha: 0, duration: 260, ease: 'Quad.easeIn' });
    // burst
    const burst = s.add.particles(GAME_WIDTH / 2, 620, 'spark', {
      speed: { min: 200, max: 700 },
      lifespan: 900,
      scale: { start: 1.2, end: 0 },
      tint: [color, 0xffffff],
      blendMode: Phaser.BlendModes.ADD,
      emitting: false,
    }).setDepth(103);
    burst.explode(r.rarity === 'legendary' ? 90 : 50);
    this.objs.push(burst);
    if (r.rarity === 'legendary') {
      const band = uiText(s, GAME_WIDTH / 2, 250, '★ RELÍQUIA LENDÁRIA ★', 40, '#ffc93d', 9).setDepth(105).setScale(0);
      s.tweens.add({ targets: band, scale: 1, duration: 400, ease: 'Back.easeOut' });
      this.objs.push(band);
    }

    // Reward card
    const c = s.add.container(GAME_WIDTH / 2, 700).setDepth(104).setScale(0);
    const g = s.add.graphics();
    g.fillStyle(0x1d1530, 1);
    g.fillRoundedRect(-290, -230, 580, 470, 30);
    g.fillStyle(color, 1);
    g.fillRoundedRect(-285, -225, 570, 460, 26);
    g.fillStyle(0x241640, 1);
    g.fillRoundedRect(-278, -218, 556, 446, 22);
    c.add(g);
    let title = '';
    let name = '';
    let desc = '';
    if (r.kind === 'relic') {
      const def = RELICS[r.id];
      c.add(s.add.image(0, -120, `relic_${r.id}`).setScale(1.5));
      title = r.isNew ? 'NOVA RELÍQUIA!' : r.level >= MAX_RELIC_LEVEL ? `NÍVEL ${r.level} (MÁXIMO)!` : `NÍVEL ${r.level}!`;
      name = def.name;
      desc = def.desc(r.level) + (r.isNew && save.data.equipped.includes(r.id) ? '\nJá equipada.' : '');
    } else if (r.kind === 'boon') {
      const def = BOONS[r.id] as BoonDef;
      const em = s.add.graphics();
      em.fillStyle(0x1d1530, 1);
      em.fillCircle(0, -120, 62);
      em.fillStyle(def.color, 1);
      em.fillCircle(0, -120, 55);
      c.add([em, s.add.image(0, -120, 'icon_catalyze').setScale(1.1)]);
      title = 'NOVA BÊNÇÃO NO BARALHO!';
      name = def.name;
      desc = `${def.desc}\nAgora pode aparecer nas suas partidas.`;
    } else {
      c.add(s.add.image(0, -120, 'eter_coin').setScale(3));
      title = 'TUDO COMPLETO!';
      name = `+${r.amount} moedas`;
      desc = 'Você já tem tudo desta raridade no máximo.';
    }
    c.add(uiText(s, 0, -24, title, 26, css(color), 6));
    c.add(uiText(s, 0, 20, name, 36, '#ffffff', 7));
    c.add(uiText(s, 0, 92, desc, 22, PAL.uiText, 5).setWordWrapWidth(520));
    c.add(
      new Button(s, 0, 180, {
        width: 260,
        height: 72,
        label: 'OK',
        fontSize: 32,
        color: 0x3aa655,
        onClick: () => {
          for (const o of this.objs) o.destroy();
          c.destroy();
          this.onDone();
        },
      }),
    );
    s.tweens.add({ targets: c, scale: 1, delay: 220, duration: 380, ease: 'Back.easeOut' });
  }
}
