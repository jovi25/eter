import { describe, expect, it } from 'vitest';
import { ALTAR, REROLL } from '../../src/data/boons';
import { Simulation } from '../../src/sim/simulation';
import { makeMelody, THEMES } from '../../src/view/audio/music';
import { newSim, record } from '../helpers';

describe('Altar de Éter (Fenda)', () => {
  it('only exists in the Fenda, costs more each time and opens an offer', () => {
    expect(newSim().altarCost()).toBeNull();
    const sim = new Simulation({ stage: 'rift', seed: 4 });
    const log = record(sim, 'altarUsed', 'boonOffered');
    sim.state.gold = 100;
    expect(sim.buyAltar()).toBe(false); // too poor
    sim.state.gold = 5000;
    const c1 = sim.altarCost()!;
    expect(c1).toBe(ALTAR.baseCost);
    expect(sim.buyAltar()).toBe(true);
    expect(sim.state.gold).toBe(5000 - c1);
    expect(sim.state.boonOffers).toHaveLength(1);
    expect(sim.buyAltar()).toBe(false); // must pick first
    for (const id of sim.state.boonOffers[0]!) expect(ALTAR.exclude).not.toContain(id);
    sim.chooseBoon(0);
    expect(sim.state.boons).toHaveLength(1);
    expect(sim.altarCost()!).toBeGreaterThan(c1);
    expect(log.filter((l) => l.kind === 'altarUsed')).toHaveLength(1);
  });

  it('re-roll swaps the cards for new ones and gets pricier', () => {
    const sim = new Simulation({ stage: 'rift', seed: 9 });
    sim.state.gold = 5000;
    sim.buyAltar();
    const before = [...sim.state.boonOffers[0]!];
    expect(sim.rerollCost()).toBe(REROLL.baseCost);
    expect(sim.rerollBoons()).toBe(true);
    const after = sim.state.boonOffers[0]!;
    expect(after).toHaveLength(3);
    for (const id of after) expect(before).not.toContain(id);
    expect(sim.rerollCost()).toBe(REROLL.baseCost + REROLL.step);
    expect(sim.state.boonOffers).toHaveLength(1);
  });

  it('cannot re-roll without an offer or without gold', () => {
    const sim = newSim();
    sim.state.gold = 1000;
    expect(sim.rerollBoons()).toBe(false);
  });
});

describe('music', () => {
  it('every theme has a melody inside 8 bars, the same every time', () => {
    for (const th of Object.values(THEMES)) {
      const m = makeMelody(th);
      expect(m.length).toBeGreaterThan(8);
      expect(makeMelody(th)).toEqual(m);
      for (const n of m) {
        expect(n.step).toBeLessThan(64);
        expect(n.len).toBeGreaterThan(0);
      }
    }
  });
});

import { SaveStore, migrate } from '../../src/meta/save';
import { enemyFacts, reactionRecipe } from '../../src/data/codex';

describe('Códice', () => {
  const mem = () => {
    const m = new Map<string, string>();
    return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
  };
  it('records each discovery once and drops unknown ids from old saves', () => {
    const s = new SaveStore(mem());
    expect(s.discover('enemies', 'slime')).toBe(true);
    expect(s.discover('enemies', 'slime')).toBe(false);
    expect(s.discover('reactions', 'melt')).toBe(true);
    expect(s.data.codex).toEqual({ enemies: ['slime'], reactions: ['melt'] });
    const old = migrate({ version: 4, createdAt: 1, stages: {}, hero: 'mage', riftBest: 3, challenges: {}, daily: { key: '', best: 0, plays: 0 } });
    expect(old.codex).toEqual({ enemies: [], reactions: [] });
    expect(old.riftBest).toBe(3);
    const bad = migrate({ ...old, codex: { enemies: ['slime', 'dragon', 'slime'], reactions: ['nope'] } });
    expect(bad.codex).toEqual({ enemies: ['slime'], reactions: [] });
  });
  it('has readable text for every enemy and reaction', () => {
    expect(reactionRecipe('overload')).toContain('Queimando + Raio');
    expect(enemyFacts('bat').join(' ')).toContain('Voa');
    expect(enemyFacts('treasure').join(' ')).toContain('Não tira vida');
  });
});
