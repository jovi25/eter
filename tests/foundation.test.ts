import { describe, expect, it } from 'vitest';
import { Rng } from '../src/sim/rng';
import { FixedClock } from '../src/sim/clock';
import { SIM_DT, SIM_MAX_TICKS_PER_FRAME } from '../src/data/config';

describe('Rng', () => {
  it('same seed gives same sequence', () => {
    const a = new Rng(42);
    const b = new Rng(42);
    for (let i = 0; i < 100; i++) expect(a.next()).toBe(b.next());
  });

  it('different seeds diverge', () => {
    const a = new Rng(1);
    const b = new Rng(2);
    expect(a.next()).not.toBe(b.next());
  });

  it('int stays in range', () => {
    const r = new Rng(7);
    for (let i = 0; i < 1000; i++) {
      const v = r.int(3, 5);
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThanOrEqual(5);
    }
  });

  it('state can be saved and restored', () => {
    const r = new Rng(99);
    r.next();
    const saved = r.getState();
    const x = r.next();
    r.setState(saved);
    expect(r.next()).toBe(x);
  });
});

describe('FixedClock', () => {
  it('runs one tick per SIM_DT of elapsed time', () => {
    const c = new FixedClock();
    expect(c.advance(SIM_DT * 3 + SIM_DT / 2)).toBe(3);
    expect(c.advance(SIM_DT / 2)).toBe(1);
    expect(c.tick).toBe(4);
  });

  it('caps ticks after a long pause', () => {
    const c = new FixedClock();
    expect(c.advance(10)).toBe(SIM_MAX_TICKS_PER_FRAME);
  });
});
