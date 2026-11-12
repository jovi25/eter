// Performance & battery: "Modo econômico".
// When on: the game renders at 75% resolution (scaled up by the browser), runs at 30 fps,
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
export function markStruggled(): void {
  try {
    localStorage.setItem(STRUGGLE_KEY, '1');
  } catch {
    /* ignore */
  }
}

export function economyOn(): boolean {
  const mode = getSettings().economy;
  if (mode === 'on') return true;
  if (mode === 'off') return false;
  return weakDevice() || struggledBefore();
}

/** Decided once at startup (the canvas size can't change while running). */
export const RENDER_SCALE = economyOn() ? 0.75 : 1;

/** Every scene calls this first: shows the 720×1280 world in a possibly smaller canvas. */
export function fitCamera(scene: Phaser.Scene): void {
  if (RENDER_SCALE === 1) return;
  scene.cameras.main.setZoom(RENDER_SCALE).centerOn(GAME_WIDTH / 2, GAME_HEIGHT / 2);
}

/** Menus never need more than 30 fps; battles get 60 unless economy is on. */
export function frameCap(scene: Phaser.Scene, kind: 'menu' | 'battle'): void {
  const limit = kind === 'menu' || economyOn() ? 30 : 0;
  const loop = scene.game.loop as Phaser.Core.TimeStep & { setFPSLimit?: (n: number) => void; fpsLimit?: number };
  if (loop.fpsLimit !== limit) loop.setFPSLimit?.(limit);
}

export const ECONOMY_LABEL: Record<'auto' | 'on' | 'off', string> = { auto: 'AUTOMÁTICO', on: 'LIGADO', off: 'DESLIGADO' };
