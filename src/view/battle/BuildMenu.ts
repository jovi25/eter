import * as Phaser from 'phaser';
import { bakeInPlace } from '../ui/bake';
import { GAME_WIDTH } from '../../data/config';
import { ELEMENTS } from '../../data/elements';
import { BOOST, MAX_LEVEL, TOWER_IDS, TOWERS, type TowerId } from '../../data/towers';
import type { Simulation } from '../../sim/simulation';
import type { TowerState } from '../../sim/types';
import { RUNE_KINDS, RUNE_RULES, RUNES, type RuneKind } from '../../data/runes';
import { EVOLUTIONS, TOWER_EVOLUTIONS, type EvolutionId } from '../../data/evolutions';
import { playSfx } from '../audio/sfx';
import { PAL } from '../art/palette';
import { uiText } from '../ui/Button';
import { DEPTH } from './layers';

interface Option {
  root: Phaser.GameObjects.Container;
  cost: Phaser.GameObjects.Text;
  costValue: number | null;
  locked: boolean;
}

/**
 * Radial menu. Empty slot → 4 towers around it. Built tower → range circle + upgrade / sell.
 * Taps on the options are handled here; the scene closes the menu on a background tap.
 */
export class BuildMenu {
  private root: Phaser.GameObjects.Container | null = null;
  private range: Phaser.GameObjects.Graphics;
  private options: Option[] = [];
  private openTowerId: number | null = null;

  constructor(
    private scene: Phaser.Scene,
    private sim: Simulation,
    private actions: {
      build: (slot: number, type: TowerId) => void;
      upgrade: (id: number) => void;
      boost: (id: number) => void;
      sell: (id: number) => void;
      evolve: (id: number, evo: EvolutionId) => void;
      buildRune: (index: number, kind: RuneKind) => void;
      sellRune: (index: number) => void;
    },
  ) {
    this.range = scene.add.graphics().setDepth(DEPTH.range).setVisible(false);
  }

  get isOpen(): boolean {
    return this.root !== null;
  }

  close(): void {
    if (!this.root) return;
    const r = this.root;
    this.root = null;
    this.options = [];
    this.openTowerId = null;
    this.range.clear().setVisible(false);
    this.scene.tweens.add({ targets: r, scale: 0.5, alpha: 0, duration: 120, onComplete: () => r.destroy() });
  }

  openSlot(slot: number): void {
    this.close();
    const pos = this.sim.slots[slot]!;
    const root = this.makeRoot(pos.x, pos.y, 156, pos.y < 320 ? 221 : 240, 995);
    // Options on a circle; near the top of the map the arc is flipped so nothing hides under the HUD.
    const n = TOWER_IDS.length;
    const start = pos.y < 320 ? Math.PI / 2 : -Math.PI / 2;
    const offsets = TOWER_IDS.map((_, i) => {
      const a = start + (i * Math.PI * 2) / n;
      return { x: Math.cos(a) * 106, y: Math.sin(a) * 100 };
    });
    TOWER_IDS.forEach((type, i) => {
      const off = offsets[i]!;
      const def = TOWERS[type];
      const locked = !this.sim.mods.unlockedTowers.includes(type);
      const opt = this.option(off.x, off.y, ELEMENTS[def.element].color, `tower_${type}`, def.levels[0].cost, locked, () => {
        if (this.sim.state.gold < def.levels[0].cost || locked) {
          playSfx('error');
          this.shake(opt.root);
          return;
        }
        this.actions.build(slot, type);
        this.close();
      });
      root.add(opt.root);
      this.options.push(opt);
      const name = uiText(this.scene, off.x, off.y + 66, def.short, 18, PAL.uiText, 4);
      root.add(name);
    });
    this.refresh();
  }

  openTower(tower: TowerState): void {
    this.close();
    this.openTowerId = tower.id;
    const fork = tower.level >= MAX_LEVEL && !tower.evo;
    const root = this.makeRoot(tower.x, tower.y, fork ? 230 : 215, fork ? 350 : 286, 1026);
    const def = TOWERS[tower.type];
    const lvl = this.sim.levelOf(tower);
    this.range.clear().setVisible(true);
    this.range.fillStyle(ELEMENTS[def.element].color, 0.12);
    const range = lvl.range * this.sim.mods.rangeMult;
    this.range.fillCircle(tower.x, tower.y, range);
    this.range.lineStyle(3, ELEMENTS[def.element].color, 0.7);
    this.range.strokeCircle(tower.x, tower.y, range);

    const maxed = tower.level >= MAX_LEVEL;
    const evolving = maxed && !tower.evo; // the fork: choose 1 of 2 final forms
    // Below max level: upgrade. At max level: Reforço (repeatable, pricier each time).
    const costNow = () => (maxed ? this.sim.boostCost(tower) : this.sim.upgradeCost(tower));
    const upPos = evolving ? { x: -110, y: 96 } : { x: 0, y: -96 };
    const up = this.option(upPos.x, upPos.y, maxed ? 0xe0862f : 0x3aa655, 'icon_play', costNow(), false, () => {
      const cost = costNow();
      if (cost === null || this.sim.state.gold < cost) {
        playSfx('error');
        this.shake(up.root);
        return;
      }
      if (maxed) this.actions.boost(tower.id);
      else this.actions.upgrade(tower.id);
      this.close();
    });
    (up.root.list[2] as Phaser.GameObjects.Image).setAngle(-90).setScale(1);
    if (maxed) {
      const lx = evolving ? upPos.x - 52 : 78;
      root.add(uiText(this.scene, lx, upPos.y + (evolving ? 64 : 0), `Reforço +${Math.round(BOOST.damagePerLevel * 100)}%`, 16, '#ffd9a8', 4).setOrigin(evolving ? 0 : 0, 0.5).setAlign('left'));
    }
    const sellPos = evolving ? { x: 110, y: 96 } : { x: 0, y: 96 };
    const sell = this.option(sellPos.x, sellPos.y, 0xc0504a, 'coin', null, false, () => {
      this.actions.sell(tower.id);
      this.close();
    });
    sell.cost.setText(`+${this.sim.sellValue(tower)}`).setColor(PAL.goldCss);
    root.add([up.root, sell.root]);
    this.options.push(up);
    const evoDef = tower.evo ? EVOLUTIONS[tower.evo] : null;
    const title = evoDef ? `${evoDef.name}${tower.boost > 0 ? `  +${tower.boost}` : ''}` : `${def.name}  nv ${tower.level}${tower.boost > 0 ? `  +${tower.boost}` : ''}`;
    root.add(uiText(this.scene, 0, evolving ? -238 : -172, title, 22, evoDef ? `#${evoDef.color.toString(16).padStart(6, '0')}` : PAL.uiText, 5));
    const info = def.abilityInfo;
    let abilityText: string;
    if (evoDef) abilityText = `★ ${evoDef.desc}`;
    else if (maxed) abilityText = 'EVOLUÇÃO: escolha um caminho (toque 2× para confirmar)';
    else abilityText = `No nível 3: ${info.name} — ${info.desc}`;
    const ab = uiText(this.scene, 0, evolving ? -212 : -146, abilityText, 17, maxed ? PAL.goldCss : PAL.uiDim, 4);
    ab.setWordWrapWidth(440).setAlign('center');
    root.add(ab);
    if (evolving) this.evolutionChoices(root, tower, ab);
    this.refresh();
  }

  /** Rune stone: pick Pressa or Poder (or sell the one that is there). Shows the reach and the towers it boosts. */
  openRune(index: number): void {
    this.close();
    const r = this.sim.state.runes[index];
    if (!r) return;
    const root = this.makeRoot(r.x, r.y, 190, 250, 1000);
    this.range.clear().setVisible(true);
    const color = r.kind ? RUNES[r.kind].color : 0xd8d0ff;
    this.range.fillStyle(color, 0.1);
    this.range.fillCircle(r.x, r.y, RUNE_RULES.radius);
    this.range.lineStyle(3, color, 0.8);
    this.range.strokeCircle(r.x, r.y, RUNE_RULES.radius);
    for (const t of this.sim.state.towers) {
      if ((t.x - r.x) ** 2 + (t.y - r.y) ** 2 <= RUNE_RULES.radius ** 2) {
        this.range.lineStyle(4, 0x6ee66e, 0.9);
        this.range.strokeCircle(t.x, t.y, 44);
      }
    }
    if (r.kind) {
      const def = RUNES[r.kind];
      const sell = this.option(0, 96, 0xc0504a, 'coin', null, false, () => {
        this.actions.sellRune(index);
        this.close();
      });
      sell.cost.setText(`+${Math.round(def.cost * RUNE_RULES.sellRefund)}`).setColor(PAL.goldCss);
      root.add(sell.root);
      root.add(uiText(this.scene, 0, -150, def.name, 24, PAL.uiText, 5));
      root.add(uiText(this.scene, 0, -120, def.desc, 18, PAL.goldCss, 4).setWordWrapWidth(360));
    } else {
      root.add(uiText(this.scene, 0, -190, 'Pedra rúnica', 24, PAL.uiText, 5));
      root.add(uiText(this.scene, 0, -142, 'Não ocupa espaço de torre. Fortalece as torres no círculo.', 17, PAL.uiDim, 4).setWordWrapWidth(380));
      RUNE_KINDS.forEach((kind, i) => {
        const def = RUNES[kind];
        const x = i === 0 ? -100 : 100;
        const opt = this.option(x, -30, def.color, `rune_${kind}`, def.cost, false, () => {
          if (this.sim.state.gold < def.cost) {
            playSfx('error');
            this.shake(opt.root);
            return;
          }
          this.actions.buildRune(index, kind);
          this.close();
        });
        (opt.root.list[2] as Phaser.GameObjects.Image).setScale(0.62).setY(4);
        root.add(opt.root);
        this.options.push(opt);
        root.add(uiText(this.scene, x, 36, kind === 'haste' ? 'Pressa\n+25% velocidade' : 'Poder\n+25% dano', 16, PAL.uiText, 4));
      });
    }
    this.refresh();
  }

  /** The two final forms, side by side. First tap shows what it does; second tap evolves. */
  private evolutionChoices(root: Phaser.GameObjects.Container, tower: TowerState, info: Phaser.GameObjects.Text): void {
    let picked: EvolutionId | null = null;
    TOWER_EVOLUTIONS[tower.type].forEach((evo, i) => {
      const def = EVOLUTIONS[evo];
      const x = i === 0 ? -110 : 110;
      const cost = this.sim.evolveCost(tower, evo);
      const opt = this.option(x, -104, def.color, `tower_${tower.type}`, cost, false, () => {
        const c = this.sim.evolveCost(tower, evo);
        if (picked !== evo) {
          picked = evo;
          playSfx('ui', 1.2);
          info.setText(`${def.name}: ${def.desc}\nToque de novo para evoluir`);
          for (const o of this.options) if (o.root !== opt.root) this.scene.tweens.killTweensOf(o.root);
          this.scene.tweens.add({ targets: opt.root, scale: 1.12, duration: 300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
          return;
        }
        if (c === null || this.sim.state.gold < c) {
          playSfx('error');
          this.shake(opt.root);
          return;
        }
        this.actions.evolve(tower.id, evo);
        this.close();
      });
      (opt.root.list[2] as Phaser.GameObjects.Image).setTint(def.color);
      root.add(opt.root);
      this.options.push(opt);
      root.add(uiText(this.scene, x, -170, i === 0 ? 'GOLPE FINAL' : 'CONSTANTE', 14, i === 0 ? '#ffb36b' : '#9fe8ff', 4));
      root.add(uiText(this.scene, x, -38, def.name, 16, PAL.uiText, 4).setWordWrapWidth(170));
    });
  }

  /** Keep "can I afford it?" colors live while the menu is open. */
  refresh(): void {
    if (!this.root) return;
    if (this.openTowerId !== null && !this.sim.getTower(this.openTowerId)) {
      this.close();
      return;
    }
    for (const o of this.options) {
      if (o.costValue === null) continue;
      const ok = !o.locked && this.sim.state.gold >= o.costValue;
      o.root.setAlpha(ok ? 1 : 0.55);
      o.cost.setColor(ok ? PAL.goldCss : PAL.redCss);
    }
  }

  /**
   * The menu is kept fully on screen and clear of the HUD: near an edge it slides inward,
   * while the highlight ring stays on the spot that was tapped.
   */
  private makeRoot(x: number, y: number, halfWidth: number, minY: number, maxY: number): Phaser.GameObjects.Container {
    const cx = Phaser.Math.Clamp(x, halfWidth, GAME_WIDTH - halfWidth);
    const cy = Phaser.Math.Clamp(y, minY, maxY);
    const root = this.scene.add.container(cx, cy).setDepth(DEPTH.menu);
    const ring = this.scene.add.image(x - cx, y - cy, 'ring').setScale(1.8).setTint(0xffffff).setAlpha(0.3);
    root.add(ring);
    root.setScale(0.4).setAlpha(0);
    this.scene.tweens.add({ targets: root, scale: 1, alpha: 1, duration: 180, ease: 'Back.easeOut' });
    this.root = root;
    return root;
  }

  private option(x: number, y: number, color: number, icon: string, cost: number | null, locked: boolean, onTap: () => void): Option {
    const g = this.scene.add.graphics();
    g.fillStyle(PAL.ink, 1);
    g.fillCircle(0, 0, 44);
    g.fillStyle(color, 1);
    g.fillCircle(0, 0, 39);
    g.fillStyle(0xffffff, 0.2);
    g.fillEllipse(-8, -14, 44, 22);
    const gImg = bakeInPlace(g, { x0: -46, y0: -46, w: 92, h: 92 }, `opt_${color}`);
    const img = this.scene.add.image(0, -4, icon).setScale(icon.startsWith('tower_') ? 0.62 : 1.1);
    const costBg = this.scene.add.graphics();
    costBg.fillStyle(PAL.ink, 0.9);
    costBg.fillRoundedRect(-34, 26, 68, 28, 14);
    const costImg = bakeInPlace(costBg, { x0: -36, y0: 24, w: 72, h: 32 }, 'opt_cost');
    const costText = uiText(this.scene, 0, 40, cost === null ? '' : `${cost}`, 22, PAL.goldCss, 4);
    const root = this.scene.add.container(x, y, [gImg, costImg, img, costText]);
    if (locked) root.add(uiText(this.scene, 0, -4, '🔒', 30));
    root.setSize(96, 96);
    root.setInteractive({ useHandCursor: true });
    root.on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, ev: Phaser.Types.Input.EventData) => {
      ev.stopPropagation();
      onTap();
    });
    return { root, cost: costText, costValue: cost, locked };
  }

  private shake(obj: Phaser.GameObjects.Container): void {
    this.scene.tweens.add({ targets: obj, x: obj.x + 8, duration: 40, yoyo: true, repeat: 2 });
  }
}
