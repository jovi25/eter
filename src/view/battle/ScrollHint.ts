import * as Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../../data/config';
import { MAPS } from '../../data/maps';
import type { Simulation } from '../../sim/simulation';
import { FONT, PAL } from '../art/palette';
import { DEPTH } from './layers';

const TOP = 120; // below the top HUD bar
const BOTTOM = GAME_HEIGHT - 124; // above the bottom bar

/**
 * Tall maps: a slim bar on the right edge shows which part of the map is on screen, and two tabs
 * ("▲ 4" / "▼ 2") count the enemies out of view. Tapping a tab scrolls that way.
 */
export class ScrollHint {
  private thumb: Phaser.GameObjects.Image;
  private up: { root: Phaser.GameObjects.Container; text: Phaser.GameObjects.Text; n: number };
  private down: { root: Phaser.GameObjects.Container; text: Phaser.GameObjects.Text; n: number };
  constructor(scene: Phaser.Scene, onTab: (dir: -1 | 1) => void) {
    const track = scene.add.image(GAME_WIDTH - 7, TOP, 'px').setOrigin(0.5, 0).setDisplaySize(6, BOTTOM - TOP).setTint(PAL.ink).setAlpha(0.45).setDepth(DEPTH.hud);
    this.thumb = scene.add.image(GAME_WIDTH - 7, TOP, 'px').setOrigin(0.5, 0).setDisplaySize(6, 100).setTint(0xffe9a8).setAlpha(0.85).setDepth(DEPTH.hud);
    void track;
    const tab = (y: number, dir: -1 | 1) => {
      const bg = scene.add.image(0, 0, 'px').setDisplaySize(96, 44).setTint(PAL.ink).setAlpha(0.8);
      const text = scene.add
        .text(0, 0, '', { fontFamily: FONT, fontStyle: 'bold', fontSize: '22px', color: '#ff8a7a', stroke: PAL.inkCss, strokeThickness: 4 })
        .setOrigin(0.5);
      const root = scene.add.container(GAME_WIDTH / 2, y, [bg, text]).setDepth(DEPTH.hud + 1).setVisible(false);
      root.setSize(96, 44).setInteractive({ useHandCursor: true });
      root.on('pointerup', () => onTab(dir));
      return { root, text, n: -1 };
    };
    this.up = tab(TOP + 30, -1);
    this.down = tab(BOTTOM - 30, 1);
  }

  update(sim: Simulation, scrollY: number): void {
    const mapH = MAPS[sim.stage.map].height ?? GAME_HEIGHT;
    const span = BOTTOM - TOP;
    this.thumb.setY(TOP + (scrollY / mapH) * span).setDisplaySize(6, (GAME_HEIGHT / mapH) * span);
    let above = 0;
    let below = 0;
    for (const e of sim.state.enemies) {
      if (!e.alive) continue;
      if (e.y < scrollY + TOP - 10) above++;
      else if (e.y > scrollY + BOTTOM + 10) below++;
    }
    this.setTab(this.up, above, '▲');
    this.setTab(this.down, below, '▼');
  }

  private setTab(t: { root: Phaser.GameObjects.Container; text: Phaser.GameObjects.Text; n: number }, n: number, arrow: string): void {
    if (n === t.n) return;
    t.n = n;
    t.root.setVisible(n > 0);
    if (n > 0) t.text.setText(`${arrow} ${n}`);
  }
}
