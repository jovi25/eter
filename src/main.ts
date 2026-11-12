import * as Phaser from 'phaser';
import { registerSW } from 'virtual:pwa-register';
import { GAME_HEIGHT, GAME_WIDTH } from './data/config';
import { RENDER_SCALE } from './view/perf';
import { BattleScene } from './view/scenes/BattleScene';
import { BootScene } from './view/scenes/BootScene';
import { CodexScene } from './view/scenes/CodexScene';
import { RelicScene } from './view/scenes/RelicScene';
import { WorldMapScene } from './view/scenes/WorldMapScene';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#0b0716',
  width: Math.round(GAME_WIDTH * RENDER_SCALE),
  height: Math.round(GAME_HEIGHT * RENDER_SCALE),
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  input: { activePointers: 2 },
  render: { powerPreference: 'default', antialias: true },
  scene: [BootScene, WorldMapScene, BattleScene, CodexScene, RelicScene],
});

// Handy while debugging in the browser console.
(window as unknown as { game: Phaser.Game }).game = game;

// Offline support (only active on HTTPS or localhost).
registerSW({ immediate: true });
