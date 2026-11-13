import * as Phaser from 'phaser';
import { REACTIONS, type ReactionId } from '../../data/reactions';
import type { Simulation } from '../../sim/simulation';
import { playSfx } from '../audio/sfx';
import { ensureBaked } from '../ui/bake';
import type { EnemyLayer } from './EnemyLayer';
import type { FxLayer } from './FxLayer';
import { DEPTH, unitDepth } from './layers';
import { FONT, PAL } from '../art/palette';

/**
 * Região 2 on screen: the Comporta (a sign to tap + a fence across the closed branch)
 * and the elemental shields of the bosses (a coloured ring + the reaction that breaks it).
 */
export class GateView {
  private fence: Phaser.GameObjects.Image;
  private sign: Phaser.GameObjects.Image;
  private arrow: Phaser.GameObjects.Text;
  /** Fence spot and side of each gate branch. */
  private spots: { x: number; y: number; angle: number; side: string }[] = [];

  constructor(
    private scene: Phaser.Scene,
    private sim: Simulation,
    private fx: FxLayer,
    canTap: () => boolean,
  ) {
    const gate = sim.gateDef!;
    ensureBaked(scene, 'gate_fence', { x0: -46, y0: -22, w: 92, h: 44 }, (g) => {
      g.fillStyle(PAL.ink, 1);
      g.fillRoundedRect(-44, -12, 88, 12, 5);
      g.fillRoundedRect(-44, 6, 88, 12, 5);
      g.fillStyle(0xd94a3a, 1);
      g.fillRoundedRect(-42, -10, 84, 8, 4);
      g.fillRoundedRect(-42, 8, 84, 8, 4);
      g.fillStyle(0xfff3e0, 1);
      for (let x = -30; x <= 30; x += 20) {
        g.fillRect(x, -10, 8, 8);
        g.fillRect(x + 10, 8, 8, 8);
      }
      g.fillStyle(PAL.ink, 1);
      g.fillRoundedRect(-46, -20, 14, 40, 5);
      g.fillRoundedRect(32, -20, 14, 40, 5);
      g.fillStyle(0x8a5a2a, 1);
      g.fillRoundedRect(-44, -18, 10, 36, 4);
      g.fillRoundedRect(34, -18, 10, 36, 4);
    });
    ensureBaked(scene, 'gate_sign', { x0: -40, y0: -40, w: 80, h: 80 }, (g) => {
      g.fillStyle(PAL.ink, 1);
      g.fillCircle(0, 0, 38);
      g.fillStyle(0x8a5a2a, 1);
      g.fillCircle(0, 0, 34);
      g.fillStyle(0xc98a4a, 1);
      g.fillCircle(0, -3, 29);
      g.fillStyle(0xffe9a8, 0.35);
      g.fillEllipse(-8, -14, 30, 12);
    });
    // Where each branch leaves the shared road.
    const [a, b] = gate.paths;
    const pa = sim.paths[a]!.points;
    const pb = sim.paths[b]!.points;
    let k = 1;
    while (k < pa.length && k < pb.length && pa[k]!.x === pb[k]!.x && pa[k]!.y === pb[k]!.y) k++;
    const fork = pa[k - 1]!;
    for (const pts of [pa, pb]) {
      const next = pts[k]!;
      const d = Math.hypot(next.x - fork.x, next.y - fork.y) || 1;
      const dx = (next.x - fork.x) / d;
      const dy = (next.y - fork.y) / d;
      this.spots.push({ x: fork.x + dx * 70, y: fork.y + dy * 70, angle: Math.abs(dx) > 0.5 ? 90 : 0, side: dx < -0.5 ? 'ESQUERDA' : dx > 0.5 ? 'DIREITA' : 'BAIXO' });
    }
    this.fence = scene.add.image(0, 0, 'gate_fence');
    this.sign = scene.add.image(gate.x, gate.y, 'gate_sign').setDepth(unitDepth(gate.y) + 1);
    this.arrow = scene.add
      .text(gate.x, gate.y - 2, '', { fontFamily: FONT, fontStyle: 'bold', fontSize: '34px', color: '#ffffff', stroke: PAL.inkCss, strokeThickness: 6 })
      .setOrigin(0.5)
      .setDepth(unitDepth(gate.y) + 2);
    const zone = scene.add.zone(gate.x, gate.y, 96, 96).setInteractive({ useHandCursor: true });
    let armed = false;
    zone.on('pointerdown', () => (armed = true));
    zone.on('pointerup', (_p: Phaser.Input.Pointer, _x: number, _y: number, ev: Phaser.Types.Input.EventData) => {
      ev.stopPropagation();
      if (!armed || !canTap()) return;
      armed = false;
      sim.toggleGate();
    });
    sim.events.on('gateToggled', () => {
      this.refresh(true);
      playSfx('upgrade', 0.8);
    });
    this.refresh(false);
  }

  private refresh(animate: boolean): void {
    const open = this.sim.state.gate;
    const closed = this.spots[open === 0 ? 1 : 0]!;
    const openSpot = this.spots[open]!;
    this.fence.setPosition(closed.x, closed.y).setAngle(closed.angle).setDepth(unitDepth(closed.y));
    this.arrow.setText(openSpot.side === 'ESQUERDA' ? '◀' : openSpot.side === 'DIREITA' ? '▶' : '▼');
    if (!animate) return;
    this.scene.tweens.add({ targets: [this.sign, this.arrow], scale: { from: 1.3, to: 1 }, duration: 220, ease: 'Back.easeOut' });
    this.fx.burst(closed.x, closed.y, 0xd94a3a, 10);
    this.fx.popLabel(this.sim.gateDef!.x, this.sim.gateDef!.y - 70, `COMPORTA: ${openSpot.side}`, PAL.goldCss);
  }
}

interface ShieldView {
  ring: Phaser.GameObjects.Image;
  label: Phaser.GameObjects.Text;
}

/** Elemental shields on Região 2 bosses. */
export class ShieldLayer {
  private views = new Map<number, ShieldView>();

  constructor(
    private scene: Phaser.Scene,
    private enemies: EnemyLayer,
  ) {}

  up(enemyId: number, reaction: ReactionId, hits: number, radius: number): void {
    this.down(enemyId);
    const def = REACTIONS[reaction];
    const ring = this.scene.add.image(0, 0, 'ring').setTint(def.color).setScale(radius / 22).setAlpha(0.85);
    const label = this.scene.add
      .text(0, 0, '', { fontFamily: FONT, fontStyle: 'bold', fontSize: '22px', color: `#${def.color.toString(16).padStart(6, '0')}`, stroke: PAL.inkCss, strokeThickness: 5 })
      .setOrigin(0.5);
    this.views.set(enemyId, { ring, label });
    this.setHits(enemyId, reaction, hits);
    this.scene.tweens.add({ targets: ring, alpha: 0.5, scale: (radius / 22) * 1.08, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  setHits(enemyId: number, reaction: ReactionId, left: number): void {
    const v = this.views.get(enemyId);
    if (!v) return;
    v.label.setText(`🛡 ${REACTIONS[reaction].name} ×${left}`);
    this.scene.tweens.add({ targets: v.label, scale: { from: 1.35, to: 1 }, duration: 200, ease: 'Back.easeOut' });
  }

  down(enemyId: number): void {
    const v = this.views.get(enemyId);
    if (!v) return;
    this.scene.tweens.killTweensOf([v.ring, v.label]);
    v.ring.destroy();
    v.label.destroy();
    this.views.delete(enemyId);
  }

  /** Follow the bosses; drop shields of bosses that are gone. */
  update(sim: Simulation): void {
    for (const [id, v] of this.views) {
      const e = sim.state.enemies.find((x) => x.id === id);
      const ev = this.enemies.get(id);
      if (!e || !e.alive || !ev) {
        this.down(id);
        continue;
      }
      const x = ev.root.x;
      const y = ev.root.y;
      v.ring.setPosition(x, y - 30).setDepth(unitDepth(y) + 1);
      v.label.setPosition(x, y - 150).setDepth(DEPTH.fx);
    }
  }
}
