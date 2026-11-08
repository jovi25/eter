import * as Phaser from 'phaser';
import { ELEMENTS } from '../../data/elements';
import { TOWER_IDS, TOWERS, type TowerId } from '../../data/towers';
import type { Simulation } from '../../sim/simulation';
import type { TowerState } from '../../sim/types';
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

const OFFSETS = [
  { x: -78, y: -78 },
  { x: 78, y: -78 },
  { x: -78, y: 78 },
  { x: 78, y: 78 },
];

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
    private actions: { build: (slot: number, type: TowerId) => void; upgrade: (id: number) => void; sell: (id: number) => void },
  ) {
    this.range = scene.add.graphics().setDepth(DEPTH.range);
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
    this.range.clear();
    this.scene.tweens.add({ targets: r, scale: 0.5, alpha: 0, duration: 120, onComplete: () => r.destroy() });
  }

  openSlot(slot: number): void {
    this.close();
    const pos = this.sim.slots[slot]!;
    const root = this.makeRoot(pos.x, pos.y);
    TOWER_IDS.forEach((type, i) => {
      const off = OFFSETS[i]!;
      const def = TOWERS[type];
      const locked = !this.sim.mods.unlockedTowers.includes(type);
      const opt = this.option(off.x, off.y, ELEMENTS[def.element].color, `tower_${type}`, def.levels[0].cost, locked, () => {
        if (this.sim.state.gold < def.levels[0].cost || locked) {
          playSfx('leak', 2);
          this.shake(opt.root);
          return;
        }
        this.actions.build(slot, type);
        this.close();
      });
      root.add(opt.root);
      this.options.push(opt);
      const name = uiText(this.scene, off.x, off.y - 56, def.name, 18, PAL.uiText, 4);
      root.add(name);
    });
    this.refresh();
  }

  openTower(tower: TowerState): void {
    this.close();
    this.openTowerId = tower.id;
    const root = this.makeRoot(tower.x, tower.y);
    const def = TOWERS[tower.type];
    const lvl = this.sim.levelOf(tower);
    this.range.clear();
    this.range.fillStyle(ELEMENTS[def.element].color, 0.12);
    this.range.fillCircle(tower.x, tower.y, lvl.range);
    this.range.lineStyle(3, ELEMENTS[def.element].color, 0.7);
    this.range.strokeCircle(tower.x, tower.y, lvl.range);

    const upCost = this.sim.upgradeCost(tower);
    const up = this.option(0, -96, 0x3aa655, 'icon_play', upCost, false, () => {
      const cost = this.sim.upgradeCost(tower);
      if (cost === null || this.sim.state.gold < cost) {
        playSfx('leak', 2);
        this.shake(up.root);
        return;
      }
      this.actions.upgrade(tower.id);
      this.close();
    });
    (up.root.list[2] as Phaser.GameObjects.Image).setAngle(-90).setScale(1);
    if (upCost === null) up.cost.setText('MÁX');
    const sell = this.option(0, 96, 0xc0504a, 'coin', null, false, () => {
      this.actions.sell(tower.id);
      this.close();
    });
    sell.cost.setText(`+${this.sim.sellValue(tower)}`).setColor(PAL.goldCss);
    root.add([up.root, sell.root]);
    this.options.push(up);
    root.add(uiText(this.scene, 0, -150, `${def.name}  nv ${tower.level}`, 22, PAL.uiText, 5));
    this.refresh();
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

  private makeRoot(x: number, y: number): Phaser.GameObjects.Container {
    const root = this.scene.add.container(x, y).setDepth(DEPTH.menu);
    const ring = this.scene.add.image(0, 0, 'ring').setScale(1.45).setTint(0xffffff).setAlpha(0.35);
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
    const img = this.scene.add.image(0, -4, icon).setScale(icon.startsWith('tower_') ? 0.62 : 1.1);
    const costBg = this.scene.add.graphics();
    costBg.fillStyle(PAL.ink, 0.9);
    costBg.fillRoundedRect(-34, 26, 68, 28, 14);
    const costText = uiText(this.scene, 0, 40, cost === null ? '' : `${cost}`, 22, PAL.goldCss, 4);
    const root = this.scene.add.container(x, y, [g, costBg, img, costText]);
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
