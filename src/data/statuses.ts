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
  },
  rooted: {
    duration: 1,
    immunityAfter: 2, // can't be rooted again for this long after a root ends
  },
  fragile: {
    duration: 3,
    damageTakenBonus: 0.25,
  },
} as const;
