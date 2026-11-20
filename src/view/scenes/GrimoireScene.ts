import * as Phaser from 'phaser';
import { BOON_IDS, BOONS, RARITIES, RARITY_COLOR, RARITY_LABEL, type BoonDef, type BoonId, type BoonRarity } from '../../data/boons';
import { GAME_HEIGHT, GAME_WIDTH } from '../../data/config';
import { DECK, DUST, FEATS, PACK, craftCost, featOf } from '../../data/grimoire';
import { getSave } from '../../meta/save';
import { CARD_ART_BOTTOM, CARD_H, CARD_W, ensureCard, ensureCardBack, ensurePack } from '../art/cardArt';
import { PAL } from '../art/palette';
import { playSfx } from '../audio/sfx';
import { fitCamera, frameCap } from '../perf';
import { vibrate } from '../settings';
import { bakeInPlace } from '../ui/bake';
import { Button, uiText } from '../ui/Button';

type Tab = 'packs' | 'collection';
const css = (c: number) => `#${c.toString(16).padStart(6, '0')}`;
const PER_PAGE = 12;
/** The card being opened: where and how big. */
const CARD_Y = 560;
const CARD_S = 1.02;

/** The show behind a turned card, per rarity: colours, rays, vortex, particles. */
const RARITY_SHOW: Record<BoonRarity, { color: number; light: number; hint: number; tremble: number; glow: number; rays: number; spin: number; vortex: boolean; motes: number; burst: number; shake: number }> = {
  common: { color: 0xb8b2c8, light: 0xffffff, hint: 0.25, tremble: 0, glow: 9, rays: 0, spin: 0, vortex: false, motes: 8, burst: 14, shake: 0 },
  rare: { color: 0x4aa3ff, light: 0xcfe8ff, hint: 0.45, tremble: 0, glow: 12, rays: 10, spin: 16000, vortex: false, motes: 20, burst: 30, shake: 0 },
  epic: { color: 0xb26bff, light: 0xffd76a, hint: 0.65, tremble: 1.5, glow: 14, rays: 14, spin: 11000, vortex: true, motes: 35, burst: 55, shake: 0.004 },
  legendary: { color: 0xffc93d, light: 0xfff6c8, hint: 0.85, tremble: 3, glow: 17, rays: 20, spin: 8000, vortex: true, motes: 55, burst: 90, shake: 0.012 },
};

/** A long soft wedge of light (one ray of the reveal), painted once. */
function ensureRay(scene: Phaser.Scene): string {
  const key = 'reveal_ray';
  if (scene.textures.exists(key)) return key;
  const tex = scene.textures.createCanvas(key, 90, 620);
  if (!tex) return key;
  const c = tex.getContext();
  const g = c.createLinearGradient(0, 620, 0, 0);
  g.addColorStop(0, 'rgba(255,255,255,0.95)');
  g.addColorStop(0.5, 'rgba(255,255,255,0.35)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g;
  c.beginPath();
  c.moveTo(45, 620);
  c.lineTo(0, 0);
  c.lineTo(90, 0);
  c.closePath();
  c.fill();
  tex.refresh();
  return key;
}

/** Collection order: rarity, then name. */
const ORDER: BoonId[] = [...BOON_IDS].sort((a, b) => {
  const ra = RARITIES.indexOf((BOONS[a] as BoonDef).rarity);
  const rb = RARITIES.indexOf((BOONS[b] as BoonDef).rarity);
  return ra - rb || (BOONS[a] as BoonDef).name.localeCompare((BOONS[b] as BoonDef).name);
});

/**
 * A painted card with its live name (and, when `full`, rarity and text). Lendárias get a moving shine.
 * Scale 1 = 300×420.
 */
export function cardView(scene: Phaser.Scene, id: BoonId, x: number, y: number, scale: number, full = true, rarityLine = true): Phaser.GameObjects.Container {
  const def = BOONS[id] as BoonDef;
  const c = scene.add.container(x, y);
  const img = scene.add.image(0, 0, ensureCard(scene, id));
  c.add(img);
  const top = -CARD_H / 2;
  const name = uiText(scene, 0, top + CARD_ART_BOTTOM + 34, def.name, full ? 25 : 30, '#ffffff', 6).setWordWrapWidth(CARD_W - 40);
  c.add(name);
  if (full) {
    if (rarityLine) c.add(uiText(scene, 0, top + CARD_ART_BOTTOM + 62, RARITY_LABEL[def.rarity].toUpperCase(), 15, css(RARITY_COLOR[def.rarity]), 4));
    c.add(uiText(scene, 0, top + CARD_ART_BOTTOM + 104, def.desc, 17, PAL.uiText, 4).setWordWrapWidth(CARD_W - 44).setLineSpacing(-2));
  }
  if (def.rarity === 'legendary' || def.rarity === 'epic') {
    // A band of light sweeps across the card now and then.
    const shine = scene.add.image(-CARD_W / 2 + 30, -40, 'spark').setScale(1.6, 12).setAngle(18).setTint(def.rarity === 'legendary' ? 0xfff0a8 : 0xe0c8ff).setAlpha(0).setBlendMode(Phaser.BlendModes.ADD);
    c.add(shine);
    scene.tweens.add({ targets: shine, x: CARD_W / 2 - 30, duration: 1100, delay: 600, repeat: -1, repeatDelay: def.rarity === 'legendary' ? 1400 : 2600, ease: 'Sine.easeInOut' });
    scene.tweens.add({ targets: shine, alpha: { from: 0, to: 0.6 }, duration: 550, delay: 600, yoyo: true, repeat: -1, repeatDelay: def.rarity === 'legendary' ? 1400 : 2600 });
  }
  c.setScale(scale);
  c.setSize(CARD_W, CARD_H);
  return c;
}

/** Grimório: buy and open packs, see the collection, build the 9-card deck, make cards with Pó de Éter. */
export class GrimoireScene extends Phaser.Scene {
  private page: Phaser.GameObjects.Container | null = null;
  private overlay: Phaser.GameObjects.Container | null = null;
  private tabs: Record<Tab, Button> | null = null;
  private wallet!: Phaser.GameObjects.Text;
  private tab: Tab = 'packs';
  private pageIndex = 0;

  constructor() {
    super('Grimoire');
  }

  create(): void {
    fitCamera(this);
    frameCap(this, 'menu');
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x2a1858, 0x2a1858, 0x0b0716, 0x0b0716, 1);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    const head = this.add.graphics();
    head.fillStyle(PAL.panel, 0.92);
    head.fillRoundedRect(-20, -20, GAME_WIDTH + 40, 140, 24);
    bakeInPlace(head, { x0: -24, y0: -24, w: GAME_WIDTH + 48, h: 148 }, 'grim_head');
    uiText(this, GAME_WIDTH / 2, 44, 'Grimório', 44, '#f3e9ff', 8);
    this.wallet = uiText(this, GAME_WIDTH / 2, 94, '', 24, PAL.goldCss, 5);
    this.tabs = {
      packs: new Button(this, 190, 176, { width: 300, height: 64, label: 'Pacotes', fontSize: 26, onClick: () => this.show('packs') }),
      collection: new Button(this, 530, 176, { width: 300, height: 64, label: 'Coleção e baralho', fontSize: 24, onClick: () => this.show('collection') }),
    };
    const foot = this.add.graphics().setDepth(20);
    foot.fillStyle(PAL.panel, 0.96);
    foot.fillRoundedRect(-20, GAME_HEIGHT - 116, GAME_WIDTH + 40, 140, 24);
    new Button(this, GAME_WIDTH / 2, GAME_HEIGHT - 58, { width: 360, height: 80, label: '◀ Voltar ao mapa', fontSize: 28, color: 0x6b6480, onClick: () => this.scene.start('WorldMap') }).setDepth(21);
    this.show(this.tab);
    this.cameras.main.fadeIn(200, 11, 7, 22);
  }

  private refreshWallet(): void {
    const d = getSave().data;
    this.wallet.setText(`Moedas: ${d.coins}   •   Pó de Éter: ${d.dust}   •   Cartas: ${d.cards.length}/${BOON_IDS.length}`);
  }

  private show(tab: Tab): void {
    this.tab = tab;
    this.page?.destroy();
    this.page = this.add.container(0, 0);
    for (const [k, b] of Object.entries(this.tabs!)) b.setColor(k === tab ? 0x8a3fd0 : 0x4a3a66);
    this.refreshWallet();
    if (tab === 'packs') this.packsPage();
    else this.collectionPage();
  }

  // ───────────────────────────── packs ─────────────────────────────

  private packsPage(): void {
    const save = getSave();
    const p = this.page!;
    const pending = !!save.data.packs.pending;
    const glow = this.add.image(GAME_WIDTH / 2, 430, 'spark').setScale(16).setTint(0xb57bff).setAlpha(0.45).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: glow, scale: 18, alpha: 0.65, duration: 1300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    const pack = this.add.image(GAME_WIDTH / 2, 430, ensurePack(this)).setScale(0.85);
    this.tweens.add({ targets: pack, y: 418, angle: 2, duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    p.add([glow, pack]);
    p.add(uiText(this, GAME_WIDTH / 2, 612, PACK.cards === 1 ? 'Pacote de Éter: 1 carta, revelada com estilo' : `Pacote de Éter: ${PACK.cards} cartas`, 26, '#ffffff', 6));
    p.add(uiText(this, GAME_WIDTH / 2, 648, 'Repetidas viram Pó de Éter • com o Pó você cria a carta que quiser', 18, PAL.uiDim, 4).setWordWrapWidth(640));
    if (pending) {
      p.add(new Button(this, GAME_WIDTH / 2, 724, { width: 460, height: 92, label: 'ABRIR (já pago)', fontSize: 32, color: 0x3aa655, onClick: () => this.buy(1) }));
    } else {
      p.add(this.buyButton(GAME_WIDTH / 2 - 165, 724, 1));
      p.add(this.buyButton(GAME_WIDTH / 2 + 165, 724, PACK.bulk));
    }
    const odds = RARITIES.map((r) => `${RARITY_LABEL[r]} ${Math.round(PACK.odds[r] * 1000) / 10}%`).join('  •  ');
    p.add(uiText(this, GAME_WIDTH / 2, 800, `Chance de cada carta: ${odds}`, 17, PAL.uiDim, 4).setWordWrapWidth(660));
    p.add(uiText(this, GAME_WIDTH / 2, 828, `Garantia: uma Épica ou melhor a cada ${PACK.pity} cartas, no máximo`, 17, PAL.uiDim, 4));
    // Lendárias by feats.
    p.add(uiText(this, GAME_WIDTH / 2, 884, 'LENDÁRIAS POR FEITOS', 22, '#ffc93d', 5));
    FEATS.forEach((f, i) => {
      const done = save.data.feats.includes(f.card);
      p.add(uiText(this, GAME_WIDTH / 2, 924 + i * 32, `${done ? '✔' : '○'} ${BOONS[f.card].name}: ${f.text}`, 18, done ? '#9be89b' : PAL.uiText, 4).setWordWrapWidth(660));
    });
  }

  /** "Abrir 1" / "Abrir 10" button. */
  private buyButton(x: number, y: number, n: number): Button {
    const can = getSave().data.coins >= PACK.price * n;
    return new Button(this, x, y, {
      width: 310,
      height: 92,
      label: n === 1 ? `ABRIR 1 • ${PACK.price}` : `ABRIR ${n} • ${PACK.price * n}`,
      fontSize: 28,
      color: !can ? 0x4a4560 : n === 1 ? 0x3aa655 : 0xc77b1f,
      onClick: () => this.buy(n),
    });
  }

  private buy(n: number): void {
    const save = getSave();
    if (!save.data.packs.pending && save.data.coins < PACK.price * n) {
      playSfx('error');
      this.toast('Moedas insuficientes: jogue partidas para ganhar mais');
      return;
    }
    if (!save.buyPack(n)) return;
    this.openPack(save.claimPack());
  }

  /** The pack opens: one card at a time, face down and glowing in its rarity; a tap turns it over and the
   *  background bursts into that rarity's show (gold rays for a Lendária, a violet vortex for an Épica...). */
  private openPack(results: { id: BoonId; fresh: boolean; dust: number }[]): void {
    if (results.length === 0) return;
    this.refreshWallet();
    this.overlay?.destroy();
    const o = this.add.container(0, 0).setDepth(30);
    this.overlay = o;
    const shade = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x07040f, 0.9).setInteractive();
    o.add(shade);
    const pack = this.add.image(GAME_WIDTH / 2, CARD_Y, ensurePack(this)).setScale(0.9);
    o.add(pack);
    playSfx('boon');
    vibrate(30);
    this.tweens.add({ targets: pack, angle: { from: -4, to: 4 }, duration: 70, yoyo: true, repeat: 6 });
    this.time.delayedCall(650, () => {
      this.tweens.add({ targets: pack, scale: 1.6, alpha: 0, duration: 300, onComplete: () => pack.destroy() });
      playSfx('upgrade');
      this.revealCard(o, results, 0);
    });
  }

  /** Card `i` of the pack: its back glows a hint of the rarity; tap to turn it. */
  private revealCard(o: Phaser.GameObjects.Container, results: { id: BoonId; fresh: boolean; dust: number }[], i: number): void {
    const r = results[i]!;
    const def = BOONS[r.id] as BoonDef;
    const show = RARITY_SHOW[def.rarity];
    const stage = this.add.container(0, 0);
    o.add(stage);
    const fx = this.add.container(0, 0);
    stage.add(fx);
    const x = GAME_WIDTH / 2;
    const y = CARD_Y;
    // Before the turn: a soft halo in the rarity's colour (the higher, the stronger the hint).
    const halo = this.add.image(x, y, 'spark').setScale(0).setTint(show.color).setBlendMode(Phaser.BlendModes.ADD).setAlpha(show.hint);
    const back = this.add.image(x, y + 40, ensureCardBack(this)).setScale(0.2).setAlpha(0);
    stage.add([halo, back]);
    this.tweens.add({ targets: back, y, scale: CARD_S, alpha: 1, duration: 420, ease: 'Back.easeOut' });
    this.tweens.add({ targets: halo, scale: 15, duration: 600, delay: 200 });
    this.tweens.add({ targets: halo, alpha: show.hint * 0.45, duration: 650, yoyo: true, repeat: -1, delay: 800 });
    // Épicas and Lendárias make the card tremble: something big is coming.
    if (show.tremble) this.tweens.add({ targets: back, angle: { from: -show.tremble, to: show.tremble }, duration: 60, yoyo: true, repeat: -1, delay: 500, repeatDelay: 700 });
    const hint = uiText(this, x, CARD_Y + 290, results.length > 1 ? `Toque para revelar (${i + 1}/${results.length})` : 'Toque para revelar', 26, PAL.uiText, 6);
    stage.add(hint);
    this.tweens.add({ targets: hint, alpha: 0.45, duration: 700, yoyo: true, repeat: -1 });
    let all: Button | null = null;
    if (results.length - i > 1) {
      stage.add(
        (all = new Button(this, x, CARD_Y + 360, {
          width: 360,
          height: 74,
          label: `Revelar todas (${results.length - i})`,
          fontSize: 26,
          color: 0x5a3fb0,
          onClick: () => {
            stage.destroy();
            this.revealAll(o, results.slice(i));
          },
        })),
      );
    }
    back.setInteractive({ useHandCursor: true });
    back.once('pointerdown', () => {
      hint.destroy();
      all?.destroy();
      this.tweens.killTweensOf(back);
      back.setAngle(0);
      this.tweens.add({
        targets: back,
        scaleX: 0,
        duration: 150,
        onComplete: () => {
          back.destroy();
          this.tweens.killTweensOf(halo);
          halo.destroy();
          this.rarityShow(fx, def.rarity);
          const face = cardView(this, r.id, x, y, CARD_S, true, false);
          face.scaleX = 0;
          stage.add(face);
          this.tweens.add({ targets: face, scaleX: CARD_S, duration: 180, ease: 'Back.easeOut' });
          const big = def.rarity === 'legendary' || def.rarity === 'epic';
          playSfx(def.rarity === 'legendary' ? 'mvp' : big ? 'star' : 'coin', def.rarity === 'rare' ? 1.2 : 1);
          vibrate(def.rarity === 'legendary' ? [60, 40, 60, 40, 160] : big ? [40, 30, 80] : 20);
          // Rarity banner and what the card gave.
          const banner = uiText(this, x, CARD_Y - 285, `${RARITY_LABEL[def.rarity].toUpperCase()}${big ? '!' : ''}`, def.rarity === 'legendary' ? 54 : big ? 46 : 36, css(show.color), 8);
          banner.setScale(0);
          this.tweens.add({ targets: banner, scale: 1, duration: 380, ease: 'Back.easeOut', delay: 120 });
          const tag = uiText(this, x, CARD_Y + 262, r.fresh ? 'NOVA CARTA!' : `Repetida: +${r.dust} Pó de Éter`, 28, r.fresh ? PAL.goldCss : '#d6c4ff', 6);
          stage.add([banner, tag]);
          this.refreshWallet();
          this.time.delayedCall(500, () => {
            if (i + 1 < results.length) {
              stage.add(
                new Button(this, x, CARD_Y + 350, {
                  width: 420,
                  height: 84,
                  label: `Próxima carta (${i + 2}/${results.length})`,
                  fontSize: 28,
                  color: 0x5a3fb0,
                  onClick: () => {
                    stage.destroy();
                    this.revealCard(o, results, i + 1);
                  },
                }),
              );
            } else this.packDone(o);
          });
        },
      });
    });
  }

  /** All remaining cards at once, in a grid; the background plays the show of the best one. */
  private revealAll(o: Phaser.GameObjects.Container, results: { id: BoonId; fresh: boolean; dust: number }[]): void {
    const stage = this.add.container(0, 0);
    o.add(stage);
    const fx = this.add.container(0, 0);
    stage.add(fx);
    const rank = (r: { id: BoonId }) => RARITIES.indexOf((BOONS[r.id] as BoonDef).rarity);
    const best = (BOONS[results.reduce((a, b) => (rank(b) > rank(a) ? b : a)).id] as BoonDef).rarity;
    this.rarityShow(fx, best);
    const cols = Math.min(5, results.length);
    const S = 0.4;
    results.forEach((r, k) => {
      const def = BOONS[r.id] as BoonDef;
      const col = k % cols;
      const row = Math.floor(k / cols);
      const x = GAME_WIDTH / 2 + (col - (cols - 1) / 2) * 134;
      const y = 380 + row * 250;
      const halo = this.add.image(x, y, 'spark').setTint(RARITY_SHOW[def.rarity].color).setBlendMode(Phaser.BlendModes.ADD).setAlpha(def.rarity === 'common' ? 0.2 : 0.7).setScale(0);
      const face = cardView(this, r.id, x, y, S, false);
      face.setScale(0);
      const tag = uiText(this, x, y + 98, r.fresh ? 'NOVA!' : `+${r.dust} pó`, 18, r.fresh ? PAL.goldCss : '#d6c4ff', 4).setAlpha(0);
      stage.add([halo, face, tag]);
      this.tweens.add({ targets: face, scale: S, duration: 260, delay: k * 90, ease: 'Back.easeOut' });
      this.tweens.add({ targets: halo, scale: def.rarity === 'common' ? 4 : 6, duration: 300, delay: k * 90 });
      this.tweens.add({ targets: tag, alpha: 1, duration: 200, delay: k * 90 + 200 });
    });
    const top = results.some((r) => rank(r) >= 2);
    playSfx(best === 'legendary' ? 'mvp' : top ? 'star' : 'coin');
    vibrate(top ? [40, 30, 80] : 20);
    const banner = uiText(this, GAME_WIDTH / 2, 230, `Melhor carta: ${RARITY_LABEL[best].toUpperCase()}`, 36, css(RARITY_SHOW[best].color), 8);
    stage.add(banner);
    this.refreshWallet();
    this.time.delayedCall(results.length * 90 + 300, () => this.packDone(o));
  }

  /** The background show of a turned card, by rarity. Everything lives in `fx` (behind the card). */
  private rarityShow(fx: Phaser.GameObjects.Container, rarity: BoonRarity): void {
    const show = RARITY_SHOW[rarity];
    const x = GAME_WIDTH / 2;
    const y = CARD_Y;
    const add = Phaser.BlendModes.ADD;
    // A big soft glow.
    const glow = this.add.image(x, y, 'spark').setTint(show.color).setBlendMode(add).setScale(4).setAlpha(0);
    fx.add(glow);
    this.tweens.add({ targets: glow, scale: show.glow, alpha: 0.75, duration: 500, ease: 'Cubic.easeOut' });
    this.tweens.add({ targets: glow, alpha: 0.4, duration: 1300, yoyo: true, repeat: -1, delay: 500, ease: 'Sine.easeInOut' });
    // Turning rays of light.
    if (show.rays > 0) {
      const rays = this.add.container(x, y);
      fx.add(rays);
      const key = ensureRay(this);
      for (let k = 0; k < show.rays; k++) {
        const ray = this.add.image(0, 0, key).setOrigin(0.5, 1).setAngle((360 / show.rays) * k).setTint(k % 2 ? show.color : show.light).setBlendMode(add).setAlpha(k % 2 ? 0.55 : 0.8);
        ray.setScale(k % 2 ? 0.8 : 1.1, k % 2 ? 1.05 : 1.35);
        rays.add(ray);
      }
      rays.setScale(0);
      this.tweens.add({ targets: rays, scale: 1, duration: 500, ease: 'Back.easeOut' });
      this.tweens.add({ targets: rays, angle: 360, duration: show.spin, repeat: -1 });
    }
    // Épica / Lendária: a swirling vortex of rings.
    if (show.vortex) {
      for (let k = 0; k < 3; k++) {
        const ring = this.add.image(x, y, 'ring').setTint(k === 1 ? show.light : show.color).setBlendMode(add).setAlpha(0.7 - k * 0.15).setScale(0);
        fx.add(ring);
        this.tweens.add({ targets: ring, scale: 3 + k * 1.4, duration: 600 + k * 150, ease: 'Cubic.easeOut' });
        this.tweens.add({ targets: ring, angle: k % 2 ? -360 : 360, duration: 4000 + k * 1500, repeat: -1 });
        this.tweens.add({ targets: ring, alpha: 0.2, duration: 900 + k * 200, yoyo: true, repeat: -1, delay: 600 });
      }
    }
    // Motes of light rising behind the card, all the time.
    const motes = this.add.particles(0, 0, 'spark', {
      x: { min: 40, max: GAME_WIDTH - 40 },
      y: { min: y + 120, max: y + 420 },
      speedY: { min: -40 - show.motes, max: -90 - show.motes * 2 },
      speedX: { min: -20, max: 20 },
      lifespan: 2600,
      frequency: Math.max(18, 600 / show.motes),
      scale: { start: 0.5 + show.motes / 200, end: 0 },
      alpha: { start: 0.9, end: 0 },
      tint: [0xffffff, show.color, show.light],
      blendMode: 'ADD',
    });
    fx.add(motes);
    // The burst when the card turns.
    const burst = this.add.particles(x, y, 'spark', { speed: { min: 140, max: 420 + show.motes * 3 }, lifespan: 1000, quantity: show.burst, scale: { start: 1.1, end: 0 }, tint: [0xffffff, show.color, show.light], blendMode: 'ADD', emitting: false });
    fx.add(burst);
    burst.explode();
    // Lendária: a gold rain, stars twinkling around.
    if (rarity === 'legendary') {
      const rain = this.add.particles(0, 0, 'coin', { x: { min: 0, max: GAME_WIDTH }, y: -30, speedY: { min: 160, max: 320 }, speedX: { min: -30, max: 30 }, rotate: { min: 0, max: 360 }, lifespan: 4200, frequency: 90, scale: { start: 0.7, end: 0.4 }, alpha: { start: 1, end: 0.2 } });
      fx.add(rain);
      this.time.delayedCall(2600, () => rain.stop());
      for (let k = 0; k < 10; k++) {
        const a = (k / 10) * Math.PI * 2;
        const st = this.add.image(x + Math.cos(a) * 250, y + Math.sin(a) * 300, 'star').setTint(0xfff0a8).setBlendMode(add).setScale(0);
        fx.add(st);
        this.tweens.add({ targets: st, scale: { from: 0, to: 0.55 }, angle: 90, duration: 700, yoyo: true, repeat: -1, delay: k * 140, ease: 'Sine.easeInOut' });
      }
    }
    if (show.shake) this.cameras.main.shake(rarity === 'legendary' ? 500 : 250, show.shake);
  }

  private packDone(o: Phaser.GameObjects.Container): void {
    this.refreshWallet();
    o.add(
      new Button(this, GAME_WIDTH / 2, 912, {
        width: 420,
        height: 84,
        label: 'Pegar cartas',
        fontSize: 30,
        color: 0x3aa655,
        onClick: () => {
          o.destroy();
          this.overlay = null;
          this.show(this.tab);
        },
      }),
    );
    const coins = getSave().data.coins;
    if (coins >= PACK.price) o.add(this.buyButton(GAME_WIDTH / 2 - (coins >= PACK.price * PACK.bulk ? 165 : 0), 1008, 1));
    if (coins >= PACK.price * PACK.bulk) o.add(this.buyButton(GAME_WIDTH / 2 + 165, 1008, PACK.bulk));
  }

  // ───────────────────────────── collection & deck ─────────────────────────────

  private collectionPage(): void {
    const save = getSave();
    const p = this.page!;
    const deck = save.data.deck;
    // The deck strip.
    const count = (r: keyof typeof DECK.max) => deck.filter((d) => BOONS[d].rarity === r).length;
    p.add(uiText(this, GAME_WIDTH / 2, 236, `Seu baralho: ${deck.length}/${DECK.size}   •   Raras ${count('rare')}/${DECK.max.rare}   Épicas ${count('epic')}/${DECK.max.epic}   Lendária ${count('legendary')}/${DECK.max.legendary}`, 18, PAL.uiText, 4).setWordWrapWidth(680));
    for (let i = 0; i < DECK.size; i++) {
      const x = 52 + i * 77;
      const y = 316;
      const id = deck[i];
      if (id) {
        const img = this.add.image(x, y, ensureCard(this, id)).setScale(0.23).setInteractive({ useHandCursor: true });
        img.on('pointerdown', () => this.cardDetail(id));
        p.add(img);
      } else {
        const g = this.add.graphics();
        g.lineStyle(3, 0x6b6480, 1);
        g.strokeRoundedRect(x - 34, y - 48, 68, 96, 10);
        p.add(g);
      }
    }
    // The collection grid.
    const pages = Math.ceil(ORDER.length / PER_PAGE);
    this.pageIndex = Math.min(this.pageIndex, pages - 1);
    const list = ORDER.slice(this.pageIndex * PER_PAGE, (this.pageIndex + 1) * PER_PAGE);
    list.forEach((id, i) => {
      const x = 99 + (i % 4) * 174;
      const y = 492 + Math.floor(i / 4) * 214;
      const owned = save.data.cards.includes(id);
      const card = cardView(this, id, x, y, 0.5, false);
      if (!owned) {
        card.setAlpha(0.45);
        card.add(uiText(this, 0, -60, '🔒', 60, '#ffffff', 6));
      }
      if (deck.includes(id)) card.add([this.add.circle(CARD_W / 2 - 30, -CARD_H / 2 + 30, 30, 0x3aa655).setStrokeStyle(6, 0x140c24), uiText(this, CARD_W / 2 - 30, -CARD_H / 2 + 30, '✔', 36, '#ffffff', 4)]);
      card.setInteractive({ useHandCursor: true });
      card.on('pointerdown', () => this.cardDetail(id));
      p.add(card);
    });
    // Pages.
    const arrow = (x: number, label: string, d: number) =>
      p.add(
        new Button(this, x, 1108, {
          width: 120,
          height: 60,
          label,
          fontSize: 28,
          color: 0x4a3a66,
          onClick: () => {
            this.pageIndex = (this.pageIndex + d + pages) % pages;
            this.show('collection');
          },
        }),
      );
    arrow(120, '◀', -1);
    arrow(600, '▶', 1);
    p.add(uiText(this, GAME_WIDTH / 2, 1108, `Página ${this.pageIndex + 1}/${pages}   •   toque numa carta`, 20, PAL.uiDim, 4));
  }

  private cardDetail(id: BoonId): void {
    const save = getSave();
    const def = BOONS[id] as BoonDef;
    this.overlay?.destroy();
    const o = this.add.container(0, 0).setDepth(30);
    this.overlay = o;
    const shade = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x07040f, 0.85).setInteractive();
    shade.on('pointerdown', () => {
      o.destroy();
      this.overlay = null;
    });
    o.add(shade);
    if (def.rarity !== 'common') {
      const halo = this.add.image(GAME_WIDTH / 2, 520, 'spark').setScale(20).setTint(RARITY_COLOR[def.rarity]).setAlpha(0.35).setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({ targets: halo, alpha: 0.6, scale: 23, duration: 1200, yoyo: true, repeat: -1 });
      o.add(halo);
    }
    if (def.rarity === 'legendary' || def.rarity === 'epic') {
      const motes = this.add.particles(GAME_WIDTH / 2, 520, 'spark', { x: { min: -200, max: 200 }, y: { min: -260, max: 260 }, speedY: { min: -40, max: -15 }, lifespan: 1800, frequency: def.rarity === 'legendary' ? 60 : 140, scale: { start: 0.8, end: 0 }, alpha: { start: 0.9, end: 0 }, tint: [0xffffff, RARITY_COLOR[def.rarity]], blendMode: 'ADD' });
      o.add(motes);
    }
    const card = cardView(this, id, GAME_WIDTH / 2, 520, 1.25);
    o.add(card);
    card.setScale(0.9).setAlpha(0);
    this.tweens.add({ targets: card, scale: 1.25, alpha: 1, duration: 260, ease: 'Back.easeOut' });
    const owned = save.data.cards.includes(id);
    const inDeck = save.data.deck.includes(id);
    const y = 1000;
    if (owned) {
      o.add(
        new Button(this, GAME_WIDTH / 2, y, {
          width: 440,
          height: 84,
          label: inDeck ? 'Tirar do baralho' : 'Pôr no baralho',
          fontSize: 28,
          color: inDeck ? 0xc0504a : 0x3aa655,
          onClick: () => {
            const why = save.toggleDeck(id);
            if (why) {
              playSfx('error');
              this.toast(why);
              return;
            }
            playSfx('upgrade');
            o.destroy();
            this.overlay = null;
            this.show('collection');
          },
        }),
      );
    } else {
      const feat = featOf(id);
      const cost = craftCost(id);
      if (cost > 0) {
        const can = save.data.dust >= cost;
        o.add(
          new Button(this, GAME_WIDTH / 2, y, {
            width: 440,
            height: 84,
            label: `Criar • ${cost} pó`,
            fontSize: 28,
            color: can ? 0x8a3fd0 : 0x4a4560,
            onClick: () => {
              if (!save.craft(id)) {
                playSfx('error');
                this.toast(`Falta Pó de Éter: você tem ${save.data.dust}`);
                return;
              }
              playSfx('star');
              vibrate([30, 30, 60]);
              this.cardDetail(id);
              this.refreshWallet();
            },
          }),
        );
      }
      const how = feat ? `Feito: ${feat.text} (ou 1% num pacote)` : `Vem em pacotes, ou crie com ${cost} de Pó (repetidas dão ${DUST.fromDuplicate[def.rarity]})`;
      o.add(uiText(this, GAME_WIDTH / 2, cost > 0 ? y + 64 : y, how, 19, PAL.uiDim, 4).setWordWrapWidth(640));
    }
    o.add(uiText(this, GAME_WIDTH / 2, 1150, 'toque fora para fechar', 18, PAL.uiDim, 4));
  }

  private toast(msg: string): void {
    const t = uiText(this, GAME_WIDTH / 2, 260, msg, 24, '#ffffff', 6).setDepth(60).setWordWrapWidth(640);
    this.tweens.add({ targets: t, y: 230, alpha: 0, delay: 1400, duration: 400, onComplete: () => t.destroy() });
  }
}
