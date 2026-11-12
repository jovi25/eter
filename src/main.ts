import * as Phaser from 'phaser';
import { registerSW } from 'virtual:pwa-register';
import { GAME_HEIGHT, GAME_WIDTH } from './data/config';
import { renderScale } from './view/perf';
import { BattleScene } from './view/scenes/BattleScene';
import { BootScene } from './view/scenes/BootScene';
import { CodexScene } from './view/scenes/CodexScene';
import { RelicScene } from './view/scenes/RelicScene';
import { WorldMapScene } from './view/scenes/WorldMapScene';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#0b0716',
  width: Math.round(GAME_WIDTH * renderScale()),
  height: Math.round(GAME_HEIGHT * renderScale()),
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  input: { activePointers: 2 },
  render: {
    powerPreference: 'high-performance',
    antialias: true, // smooth texture filtering (cheap)
    antialiasGL: false, // no MSAA on the screen buffer: expensive on phones, invisible with this art
    maxTextures: 8, // few textures per batch: short pixel program, and texts/UI still batch with the atlas
  },
  scene: [BootScene, WorldMapScene, BattleScene, CodexScene, RelicScene],
});

// Handy while debugging in the browser console.
(window as unknown as { game: Phaser.Game }).game = game;

// Offline support (only active on HTTPS or localhost).
registerSW({ immediate: true });
