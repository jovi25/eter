import type * as Phaser from 'phaser';
import { dropResolution, economyOn, rememberLowFx, undoDropResolution } from './perf';

// Adaptive quality: when the phone can't keep up, first trim the eye candy, then lower the resolution
// (never the gameplay). "low" = fewer particles, no glows/shadows, no damage-over-time numbers.

export const quality = {
  low: false,
  /** Damage numbers allowed in the current frame. */
  numbersLeft: 8,
};

const LOW_FPS = 50; // below this: light effects
const DROP_FPS = 45; // below this for a while: one resolution level down (goal: never under 30)
const HIGH_FPS = 57;
let belowMs = 0;
let aboveMs = 0;
let slowMs = 0;
/** After a resolution drop: the fps before it and how long we have been watching the result. */
let trial: { before: number; ms: number } | null = null;

/** Call once per frame with the measured fps and the real frame time. */
export function updateQuality(game: Phaser.Game, fps: number, dtMs: number): void {
  quality.numbersLeft = quality.low ? 2 : 8;
  // Ignore frames from a hidden / throttled tab: they say nothing about the phone's speed.
  if ((typeof document !== 'undefined' && document.hidden) || dtMs > 400) return;
  if (fps < LOW_FPS) {
    belowMs += dtMs;
    aboveMs = 0;
  } else if (fps > HIGH_FPS) {
    aboveMs += dtMs;
    belowMs = 0;
  }
  // Effects: drop fast (1.5 s of struggle), recover slowly (10 s of smooth play) so it doesn't flip-flop.
  if (!quality.low && belowMs > 1500) {
    quality.low = true;
    rememberLowFx();
  }
  if (quality.low && aboveMs > 10000 && !economyOn()) quality.low = false;
  // Resolution: still slow → fewer pixels. Then wait a few seconds before judging again.
  // Each drop is a trial: if 4 s later the fps is not clearly better, pixels were not the problem → undo it.
  if (trial) {
    trial.ms += dtMs;
    if (trial.ms > 4000) {
      if (fps < trial.before * 1.2) undoDropResolution(game);
      trial = null;
      slowMs = -3000;
    }
    return;
  }
  slowMs = fps < DROP_FPS ? slowMs + dtMs : Math.min(slowMs, 0);
  if (slowMs > 2500) {
    quality.low = true;
    rememberLowFx();
    if (dropResolution(game)) trial = { before: fps, ms: 0 };
    slowMs = -3000;
  }
}

/** Scale a particle count for the current quality. */
export function fxCount(n: number): number {
  return quality.low ? Math.max(1, Math.ceil(n / 3)) : n;
}

/**
 * Blend mode for glows and sparks. Additive looks best, but every switch between normal and additive
 * sprites forces the renderer to start a new batch (a draw call) — dozens per frame in a busy fight.
 * On devices in economy mode everything uses the normal blend, so the whole fight batches together.
 */
export function addBlend(): number {
  return economyOn() ? 0 /* NORMAL */ : 1 /* ADD */;
}
