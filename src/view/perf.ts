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
const LEVEL_KEY = 'eter.perf.level.v2'; // v2: everyone re-learns after the draw-call fixes
const NO_RES_KEY = 'eter.perf.nores'; // lowering the resolution did not help on this device
const LOW_FX_KEY = 'eter.perf.lowfx'; // this device needs the light effects

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
  return 0;
}

function flag(key: string): boolean {
  try {
    return localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

function setFlag(key: string, on: boolean): void {
  try {
    if (on) localStorage.setItem(key, '1');
    else localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

/** Level found for this device (index into LEVELS). Ignored while the mode is "Desligado". */
let learned = loadLevel();
let resUseless = flag(NO_RES_KEY);
let lowFx = flag(LOW_FX_KEY) || weakDevice();

function levelNow(): number {
  const mode = getSettings().economy;
  if (mode === 'off') return 0;
  return mode === 'on' ? Math.max(1, learned) : learned;
}

/** Current canvas scale (1 = full 720×1280). */
export function renderScale(): number {
  return LEVELS[levelNow()]!;
}

/** Light effects: explicitly on, or this device showed it needs them. */
export function economyOn(): boolean {
  const mode = getSettings().economy;
  if (mode === 'off') return false;
  return mode === 'on' || lowFx || learned > 0;
}

/** The game had to switch to light effects: start that way next time. */
export function rememberLowFx(): void {
  if (lowFx) return;
  lowFx = true;
  setFlag(LOW_FX_KEY, true);
}

/**
 * Every scene calls this first: shows the 720-wide world in a possibly smaller canvas.
 * Origin top-left: world (0, scrollY) is the screen's top-left corner at any zoom, and objects pinned
 * with scroll factor 0 (HUD, panels) stay where they are when a tall map scrolls.
 */
export function fitCamera(scene: Phaser.Scene): void {
  const cam = scene.cameras.main;
  cam.setOrigin(0, 0).setZoom(renderScale());
  cam.scrollX = 0;
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
  if (getSettings().economy === 'off' || resUseless || learned >= LEVELS.length - 1) return false;
  learned++;
  try {
    localStorage.setItem(LEVEL_KEY, String(learned));
  } catch {
    /* ignore */
  }
  applyScale(game);
  return true;
}

/**
 * The last drop did not raise the frame rate: this phone is limited by its processor, not by pixels.
 * Go back up one level (sharper image for the same speed) and never lower the resolution again.
 */
export function undoDropResolution(game: Phaser.Game): void {
  if (learned > 0) learned--;
  resUseless = true;
  setFlag(NO_RES_KEY, true);
  try {
    localStorage.setItem(LEVEL_KEY, String(learned));
  } catch {
    /* ignore */
  }
  applyScale(game);
}

/** Forget what was learned (the game adapts again if it needs to). */
export function resetLearned(game: Phaser.Game): void {
  learned = 0;
  resUseless = false;
  lowFx = weakDevice();
  setFlag(NO_RES_KEY, false);
  setFlag(LOW_FX_KEY, false);
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
