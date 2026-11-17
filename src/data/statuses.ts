// Status (aura) numbers. Durations in seconds.

export const STATUS = {
  burning: {
    duration: 3,
    tickInterval: 0.5, // burn damage is dealt in discrete ticks (readable damage numbers)
  },
  chilled: {
    duration: 2.5,
    slow: 0.3, // flat −30% speed while chilled (stacks only count toward Frozen)
    maxStacks: 3, // reaching this many stacks turns into Frozen
  },
  frozen: {
    duration: 1,
    immunityAfter: 3, // classic diminishing returns: can't be frozen again for this long (still chilled)
  },
  rooted: {
    duration: 1,
    immunityAfter: 2, // can't be rooted again for this long after a root ends
  },
  /** Soprado (Torre do Vento): a short aura that Raio turns into TORMENTA. */
  gusted: {
    duration: 2.5,
  },
  fragile: {
    duration: 3,
    damageTakenBonus: 0.25,
  },
} as const;
