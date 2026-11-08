import * as Phaser from 'phaser';
import { registerSW } from 'virtual:pwa-register';
import { GAME_HEIGHT, GAME_WIDTH } from './data/config';
import { BattleScene } from './view/scenes/BattleScene';
import { BootScene } from './view/scenes/BootScene';
import { WorldMapScene } from './view/scenes/WorldMapScene';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#0b0716',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  input: { activePointers: 2 },
  scene: [BootScene, WorldMapScene, BattleScene],
});

// Handy while debugging in the browser console.
(window as unknown as { game: Phaser.Game }).game = game;

// Offline support (only active on HTTPS or localhost).
registerSW({ immediate: true });
