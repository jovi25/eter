import * as Phaser from 'phaser';
import { BOON_IDS, BOONS, RARITIES, RARITY_COLOR, RARITY_LABEL, type BoonDef, type BoonId } from '../../data/boons';
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
export function cardView(scene: Phaser.Scene, id: BoonId, x: number, y: number, scale: number, full = true): Phaser.GameObjects.Container {
  const def = BOONS[id] as BoonDef;
  const c = scene.add.container(x, y);
  const img = scene.add.image(0, 0, ensureCard(scene, id));
  c.add(img);
  const top = -CARD_H / 2;
  const name = uiText(scene, 0, top + CARD_ART_BOTTOM + 34, def.name, full ? 25 : 30, '#ffffff', 6).setWordWrapWidth(CARD_W - 40);
  c.add(name);
  if (full) {
    c.add(uiText(scene, 0, top + CARD_ART_BOTTOM + 62, RARITY_LABEL[def.rarity].toUpperCase(), 15, css(RARITY_COLOR[def.rarity]), 4));
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
    p.add(uiText(this, GAME_WIDTH / 2, 612, `Pacote de Éter: ${PACK.cards} cartas`, 26, '#ffffff', 6));
    p.add(uiText(this, GAME_WIDTH / 2, 648, 'Repetidas viram Pó de Éter • com o Pó você cria a carta que quiser', 18, PAL.uiDim, 4).setWordWrapWidth(640));
    const can = pending || save.data.coins >= PACK.price;
    p.add(
      new Button(this, GAME_WIDTH / 2, 724, {
        width: 460,
        height: 92,
        label: pending ? 'ABRIR PACOTE (já pago)' : `ABRIR • ${PACK.price} moedas`,
        fontSize: 32,
        color: can ? 0x3aa655 : 0x4a4560,
        onClick: () => {
          if (!can) {
            playSfx('error');
            this.toast('Moedas insuficientes: jogue partidas para ganhar mais');
            return;
          }
          if (!save.buyPack()) return;
          this.openPack(save.claimPack());
        },
      }),
    );
    const odds = RARITIES.map((r) => `${RARITY_LABEL[r]} ${Math.round(PACK.odds[r] * 1000) / 10}%`).join('  •  ');
    p.add(uiText(this, GAME_WIDTH / 2, 800, `Chance de cada carta: ${odds}`, 17, PAL.uiDim, 4).setWordWrapWidth(660));
    p.add(uiText(this, GAME_WIDTH / 2, 828, `Garantia: uma Épica ou melhor a cada ${PACK.pity} pacotes, no máximo`, 17, PAL.uiDim, 4));
    // Lendárias by feats.
    p.add(uiText(this, GAME_WIDTH / 2, 884, 'LENDÁRIAS POR FEITOS', 22, '#ffc93d', 5));
    FEATS.forEach((f, i) => {
      const done = save.data.feats.includes(f.card);
      p.add(uiText(this, GAME_WIDTH / 2, 924 + i * 32, `${done ? '✔' : '○'} ${BOONS[f.card].name}: ${f.text}`, 18, done ? '#9be89b' : PAL.uiText, 4).setWordWrapWidth(660));
    });
  }

  /** The pack opens: three cards face down, each glowing in its rarity; tap to turn them. */
  private openPack(results: { id: BoonId; fresh: boolean; dust: number }[]): void {
    this.refreshWallet();
    this.overlay?.destroy();
    const o = this.add.container(0, 0).setDepth(30);
    this.overlay = o;
    const shade = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x07040f, 0.88).setInteractive();
    o.add(shade);
    const pack = this.add.image(GAME_WIDTH / 2, 560, ensurePack(this)).setScale(0.9);
    o.add(pack);
    playSfx('boon');
    vibrate(30);
    this.tweens.add({ targets: pack, angle: { from: -4, to: 4 }, duration: 70, yoyo: true, repeat: 6 });
    const flash = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0xffffff, 0);
    o.add(flash);
    this.time.delayedCall(650, () => {
      this.tweens.add({ targets: flash, fillAlpha: { from: 0.9, to: 0 }, duration: 380 });
      this.tweens.add({ targets: pack, scale: 1.6, alpha: 0, duration: 300 });
      playSfx('upgrade');
      let left = results.length;
      const S = 0.62;
      results.forEach((r, i) => {
        const def = BOONS[r.id] as BoonDef;
        const x = GAME_WIDTH / 2 + (i - 1) * 222;
        const y = 560;
        const halo = this.add.image(x, y, 'spark').setScale(0).setTint(RARITY_COLOR[def.rarity]).setBlendMode(Phaser.BlendModes.ADD).setAlpha(def.rarity === 'common' ? 0.35 : 0.8);
        const back = this.add.image(GAME_WIDTH / 2, 560, ensureCardBack(this)).setScale(0.1);
        o.add([halo, back]);
        this.tweens.add({ targets: back, x, scale: S, duration: 420, delay: i * 120, ease: 'Back.easeOut' });
        this.tweens.add({ targets: halo, scale: def.rarity === 'legendary' ? 13 : def.rarity === 'epic' ? 11 : 9, duration: 500, delay: 300 + i * 120 });
        this.tweens.add({ targets: halo, alpha: { from: halo.alpha, to: halo.alpha * 0.5 }, duration: 700, yoyo: true, repeat: -1, delay: 900 });
        back.setInteractive({ useHandCursor: true });
        back.once('pointerdown', () => {
          this.tweens.add({
            targets: back,
            scaleX: 0,
            duration: 140,
            onComplete: () => {
              back.destroy();
              const face = cardView(this, r.id, x, y, S);
              face.scaleX = 0;
              o.add(face);
              this.tweens.add({ targets: face, scaleX: S, duration: 160, ease: 'Back.easeOut' });
              const big = def.rarity === 'legendary' || def.rarity === 'epic';
              playSfx(def.rarity === 'legendary' ? 'mvp' : big ? 'star' : 'coin', def.rarity === 'rare' ? 1.2 : 1);
              vibrate(big ? [40, 30, 80] : 20);
              if (big) {
                const burst = this.add.particles(x, y, 'spark', { speed: { min: 120, max: 380 }, lifespan: 900, quantity: def.rarity === 'legendary' ? 60 : 30, scale: { start: 1, end: 0 }, tint: [0xffffff, RARITY_COLOR[def.rarity]], blendMode: 'ADD', emitting: false });
                o.add(burst);
                burst.explode();
              }
              const tag = r.fresh ? 'NOVA!' : `+${r.dust} pó`;
              o.add(uiText(this, x, y - 160, tag, 26, r.fresh ? PAL.goldCss : '#d6c4ff', 6));
              left--;
              if (left === 0) this.packDone(o);
            },
          });
        });
      });
      o.add(uiText(this, GAME_WIDTH / 2, 330, 'Toque nas cartas para virar', 26, PAL.uiText, 6));
    });
  }

  private packDone(o: Phaser.GameObjects.Container): void {
    this.refreshWallet();
    const again = getSave().data.coins >= PACK.price;
    o.add(
      new Button(this, GAME_WIDTH / 2, 860, {
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
    if (again)
      o.add(
        new Button(this, GAME_WIDTH / 2, 960, {
          width: 420,
          height: 70,
          label: `Abrir outro • ${PACK.price}`,
          fontSize: 24,
          color: 0x5a3fb0,
          onClick: () => {
            const save = getSave();
            if (!save.buyPack()) return;
            this.openPack(save.claimPack());
          },
        }),
      );
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
