import { describe, expect, it } from 'vitest';
import { MAPS } from '../../src/data/maps';
import { RUNE_RULES, RUNES } from '../../src/data/runes';
import { STAGES } from '../../src/data/stages';
import { Simulation } from '../../src/sim/simulation';
import { record } from '../helpers';

describe('Runas', () => {
  it('rune stones never sit on the road or a tower slot', () => {
    for (const m of Object.values(MAPS)) {
      expect(m.runes.length).toBe(2);
      for (const r of m.runes) {
        for (const s of m.slots) expect(Math.hypot(s.x - r.x, s.y - r.y)).toBeGreaterThan(80);
        for (const p of m.paths) for (const q of p) expect(Math.hypot(q.x - r.x, q.y - r.y)).toBeGreaterThan(40);
        const crystal = m.paths[0]!.at(-1)!;
        expect(Math.hypot(crystal.x - r.x, crystal.y - r.y)).toBeGreaterThan(130); // the Cristal sprite is big
        expect(Math.hypot(m.heroStart.x - r.x, m.heroStart.y - r.y)).toBeGreaterThan(50);
      }
    }
  });

  it('only exist from stage 3 on (and in the Fenda)', () => {
    expect(new Simulation({ stage: 'v1', seed: 1 }).state.runes).toHaveLength(0);
    expect(new Simulation({ stage: 'v2', seed: 1 }).state.runes).toHaveLength(0);
    expect(new Simulation({ stage: 'v3', seed: 1 }).state.runes).toHaveLength(2);
    expect(new Simulation({ stage: 'rift', seed: 1 }).state.runes).toHaveLength(2);
    expect(STAGES.v4.runes).toBe(true);
  });

  it('cost gold, boost only towers in reach, and sell back for 70%', () => {
    const sim = new Simulation({ stage: 'v3', seed: 1 });
    const log = record(sim, 'runeBuilt', 'runeSold');
    sim.state.gold = 1000;
    const r = sim.state.runes[0]!;
    const near = { x: r.x + RUNE_RULES.radius - 10, y: r.y };
    const far = { x: r.x + RUNE_RULES.radius + 10, y: r.y };
    expect(sim.runeMult(near, 'damageMult')).toBe(1);
    expect(sim.buildRune(0, 'power')).toBe(true);
    expect(sim.state.gold).toBe(1000 - RUNES.power.cost);
    expect(sim.buildRune(0, 'haste')).toBe(false); // occupied
    expect(sim.runeMult(near, 'damageMult')).toBeCloseTo(RUNES.power.damageMult);
    expect(sim.runeMult(far, 'damageMult')).toBe(1);
    expect(sim.runeMult(near, 'rateMult')).toBe(1);
    expect(sim.sellRune(0)).toBe(true);
    expect(sim.state.gold).toBe(1000 - RUNES.power.cost + Math.round(RUNES.power.cost * RUNE_RULES.sellRefund));
    expect(sim.state.runes[0]!.kind).toBeNull();
    expect(log.map((l) => l.kind)).toEqual(['runeBuilt', 'runeSold']);
  });

  it('a haste rune makes a nearby tower attack more often', () => {
    const shots = (withRune: boolean) => {
      const sim = new Simulation({ stage: 'v3', seed: 5 });
      sim.state.gold = 5000;
      const r = sim.state.runes[0]!;
      // nearest slot to the rune
      const slot = sim.slots.map((s, i) => ({ i, d: Math.hypot(s.x - r.x, s.y - r.y) })).sort((a, b) => a.d - b.d)[0]!.i;
      const t = sim.build(slot, 'archer')!;
      if (withRune) sim.buildRune(0, 'haste');
      const e = sim.spawnEnemy('slime', { hp: 1e6 });
      e.x = t.x;
      e.y = t.y + 60;
      e.rootTime = 1e6;
      const log = record(sim, 'towerFired');
      for (let i = 0; i < 300; i++) {
        e.x = t.x;
        e.y = t.y + 60;
        sim.step();
      }
      return log.length;
    };
    expect(shots(true)).toBeGreaterThan(shots(false));
  });
});
