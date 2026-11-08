import { SIM_DT, SIM_MAX_TICKS_PER_FRAME } from '../data/config';

/**
 * Fixed-timestep accumulator. The view feeds real elapsed time;
 * the clock answers how many fixed simulation ticks to run.
 */
export class FixedClock {
  private accumulator = 0;
  tick = 0;

  /** @param elapsedSeconds real time since last frame, already multiplied by game speed */
  advance(elapsedSeconds: number): number {
    this.accumulator += elapsedSeconds;
    let steps = 0;
    while (this.accumulator >= SIM_DT && steps < SIM_MAX_TICKS_PER_FRAME) {
      this.accumulator -= SIM_DT;
      steps++;
      this.tick++;
    }
    // Drop leftover time beyond the cap instead of spiraling.
    if (steps === SIM_MAX_TICKS_PER_FRAME) this.accumulator = Math.min(this.accumulator, SIM_DT);
    return steps;
  }
}
