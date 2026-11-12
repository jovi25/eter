// Performance & battery.
//
// 1. Adaptive resolution: the game world is always 720×1280, but the canvas it is drawn on can be smaller
//    (100% → 80% → 65% → 50%) and is stretched by the browser. When the phone can't hold the frame rate,
//    the game steps down one level by itself and remembers it for next time. Fewer pixels = less GPU work.
// 2. "Modo econômico" (Opções): Automático (adapt as needed), Ligado (start at 80% + light effects),
//    Desligado (always 100%, never adapt).
// The simulation is never touched (30 ticks/s).
import type * as Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../data/config';
import { getSettings } from './settings';

const LEVELS = [1, 0.8, 0.65, 0.5];
const LEVEL_KEY = 'eter.perf.level';

function weakDevice(): boolean {
  try {
    const nav = navigator as Navigator & { deviceMemory?: number };
    return (nav.hardwareConcurrency ?? 8) <= 4 || (nav.deviceMemory ?? 8) <= 3;
  } catch {
    return false;
  }
}

function loadLevel(): number {
  try {
    const raw = localStorage.getItem(LEVEL_KEY);
    if (raw !== null) return Math.max(0, Math.min(LEVELS.length - 1, Number(raw) | 0));
  } catch {
    /* ignore */
  }
  return weakDevice() ? 1 : 0;
}

/** Level found for this device (index into LEVELS). Ignored while the mode is "Desligado". */
let learned = loadLevel();

function levelNow(): number {
  const mode = getSettings().economy;
  if (mode === 'off') return 0;
  return mode === 'on' ? Math.max(1, learned) : learned;
}

/** Current canvas scale (1 = full 720×1280). */
export function renderScale(): number {
  return LEVELS[levelNow()]!;
}

/** Light effects: explicitly on, or the device already had to lower its resolution. */
export function economyOn(): boolean {
  return levelNow() > 0;
}

/** Every scene calls this first: shows the 720×1280 world in a possibly smaller canvas. */
export function fitCamera(scene: Phaser.Scene): void {
  scene.cameras.main.setZoom(renderScale()).centerOn(GAME_WIDTH / 2, GAME_HEIGHT / 2);
}

/** Resize the canvas to the current level and re-aim every running scene's camera. */
export function applyScale(game: Phaser.Game): void {
  const s = renderScale();
  const w = Math.round(GAME_WIDTH * s);
  const h = Math.round(GAME_HEIGHT * s);
  if (game.scale.width !== w || game.scale.height !== h) game.scale.setGameSize(w, h);
  for (const sc of game.scene.getScenes(true)) {
    sc.cameras.main.setSize(w, h);
    fitCamera(sc);
  }
}

/** The frame rate is too low: go one resolution level down. Returns false at the floor (or when disabled). */
export function dropResolution(game: Phaser.Game): boolean {
  if (getSettings().economy === 'off' || learned >= LEVELS.length - 1) return false;
  learned++;
  try {
    localStorage.setItem(LEVEL_KEY, String(learned));
  } catch {
    /* ignore */
  }
  applyScale(game);
  return true;
}

/** Forget what was learned (the game adapts again if it needs to). */
export function resetLearned(game: Phaser.Game): void {
  learned = 0;
  try {
    localStorage.removeItem(LEVEL_KEY);
  } catch {
    /* ignore */
  }
  applyScale(game);
}

/** No fps cap: a 30 fps limit made frames arrive unevenly on 60/90/120 Hz screens (stutter). */
export function frameCap(scene: Phaser.Scene, _kind: 'menu' | 'battle'): void {
  const loop = scene.game.loop as Phaser.Core.TimeStep & { setFPSLimit?: (n: number) => void; fpsLimit?: number };
  if (loop.fpsLimit) loop.setFPSLimit?.(0);
}

export const ECONOMY_LABEL: Record<'auto' | 'on' | 'off', string> = { auto: 'AUTOMÁTICO', on: 'LIGADO', off: 'DESLIGADO' };
