// Global technical constants. Balancing numbers live in other files in src/data/.

export const GAME_WIDTH = 720;
export const GAME_HEIGHT = 1280;

/** Simulation runs at a fixed rate, independent of the screen's frame rate. */
export const SIM_TICKS_PER_SECOND = 30;
export const SIM_DT = 1 / SIM_TICKS_PER_SECOND;

/** Safety cap so a long pause (tab in background) doesn't run thousands of ticks at once. */
export const SIM_MAX_TICKS_PER_FRAME = 8;

export const DEFAULT_SEED = 20261107;
