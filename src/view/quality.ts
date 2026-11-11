// Adaptive effects quality: when the phone can't keep up, trim the eye candy (never the gameplay).
// "high" = everything; "low" = fewer particles, no damage-over-time numbers, fewer numbers per frame.

export const quality = {
  low: false,
  /** Damage numbers allowed in the current frame. */
  numbersLeft: 8,
};

const LOW_FPS = 48;
const HIGH_FPS = 57;
let belowMs = 0;
let aboveMs = 0;

/** Call once per frame with the measured fps and the frame time. */
export function updateQuality(fps: number, dtMs: number): void {
  quality.numbersLeft = quality.low ? 3 : 8;
  if (fps < LOW_FPS) {
    belowMs += dtMs;
    aboveMs = 0;
  } else if (fps > HIGH_FPS) {
    aboveMs += dtMs;
    belowMs = 0;
  }
  // Drop fast (2 s of struggle), recover slowly (10 s of smooth play) so it doesn't flip-flop.
  if (!quality.low && belowMs > 2000) quality.low = true;
  if (quality.low && aboveMs > 10000) quality.low = false;
}

/** Scale a particle count for the current quality. */
export function fxCount(n: number): number {
  return quality.low ? Math.max(1, Math.ceil(n / 2)) : n;
}
