// Performance & battery: "Modo econômico".
// When on: the game renders at 75% resolution (scaled up by the browser),
// uses lighter effects and skips the costly echo (reverb) in the audio. The simulation is unchanged (30 ticks/s).
// "Automático" turns it on for weak phones, or after the game noticed it struggling on this device.
import type * as Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../data/config';
import { getSettings } from './settings';

const STRUGGLE_KEY = 'eter.perf.struggled';

function weakDevice(): boolean {
  try {
    const nav = navigator as Navigator & { deviceMemory?: number };
    const cores = nav.hardwareConcurrency ?? 8;
    const mem = nav.deviceMemory ?? 8;
    return cores <= 4 || mem <= 3;
  } catch {
    return false;
  }
}

function struggledBefore(): boolean {
  try {
    return localStorage.getItem(STRUGGLE_KEY) === '1';
  } catch {
    return false;
  }
}

/** Remember that this device couldn't keep up, so "Automático" switches to economy next time. */
let marked = false;

export function markStruggled(): void {
  if (marked) return; // write once, never every frame
  marked = true;
  try {
    localStorage.setItem(STRUGGLE_KEY, '1');
  } catch {
    /* ignore */
  }
}

let cached: { mode: string; on: boolean } | null = null;

/** Cached: it is asked often (audio, effects), and reading storage every time is slow on phones. */
export function economyOn(): boolean {
  const mode = getSettings().economy;
  if (cached && cached.mode === mode) return cached.on;
  const on = mode === 'on' ? true : mode === 'off' ? false : weakDevice() || struggledBefore();
  cached = { mode, on };
  return on;
}

/** Decided once at startup (the canvas size can't change while running). */
export const RENDER_SCALE = economyOn() ? 0.75 : 1;

/** Every scene calls this first: shows the 720×1280 world in a possibly smaller canvas. */
export function fitCamera(scene: Phaser.Scene): void {
  if (RENDER_SCALE === 1) return;
  scene.cameras.main.setZoom(RENDER_SCALE).centerOn(GAME_WIDTH / 2, GAME_HEIGHT / 2);
}

/**
 * Kept as a no-op hook: an fps cap (30) made frames arrive at uneven intervals on 60/90/120 Hz phones,
 * which looked like stutter. The game always follows the screen's refresh now; economy saves work in other ways.
 */
export function frameCap(scene: Phaser.Scene, _kind: 'menu' | 'battle'): void {
  const loop = scene.game.loop as Phaser.Core.TimeStep & { setFPSLimit?: (n: number) => void; fpsLimit?: number };
  if (loop.fpsLimit) loop.setFPSLimit?.(0);
}

export const ECONOMY_LABEL: Record<'auto' | 'on' | 'off', string> = { auto: 'AUTOMÁTICO', on: 'LIGADO', off: 'DESLIGADO' };
