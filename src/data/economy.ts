// Match economy and difficulty knobs.

export const ECONOMY = {
  startGold: 120,
  startLives: 20,
  sellRefund: 0.7, // of everything invested in the tower
  waveClearBonusBase: 20,
  waveClearBonusPerWave: 4,
  earlyCallGoldPerSecond: 2, // bonus for calling a wave early, per second skipped
};

export const DIFFICULTY = {
  hpGrowthPerWave: 1.15,
};

export const WAVE_TIMING = {
  firstWaveDelay: 20, // seconds of prep before wave 1 starts by itself
  timeBetweenWaves: 8, // countdown after a wave finishes spawning
};

/** Bonus events. */
export const BONUS = { treasureChance: 0.35 };

/** Stars by lives left at victory. */
export const STARS = { three: 18, two: 10 };
