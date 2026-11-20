import { describe, expect, it } from 'vitest';
import { challengeMet, challengeText, DAILY_TWISTS, dailyScore, dailySetup } from '../../src/data/challenges';
import { Simulation } from '../../src/sim/simulation';
import { newSim, runSeconds } from '../helpers';

describe('harder challenges', () => {
  it('time and max-level goals', () => {
    const sim = newSim();
    sim.state.gold = 10_000;
    const t = sim.build(0, 'archer')!;
    sim.upgrade(t.id);
    sim.state.result = 'won';
    sim.state.time = 150;
    expect(challengeMet({ kind: 'time', seconds: 155 }, sim.state)).toBe(true);
    expect(challengeMet({ kind: 'time', seconds: 140 }, sim.state)).toBe(false);
    expect(challengeMet({ kind: 'maxLevel', max: 2 }, sim.state)).toBe(true);
    sim.state.result = 'playing';
    sim.upgrade(t.id);
    sim.state.result = 'won';
    expect(challengeMet({ kind: 'maxLevel', max: 2 }, sim.state)).toBe(false);
    expect(challengeText({ kind: 'time', seconds: 155 })).toBe('Vença em até 2:35');
  });
});

describe('daily clock and rules', () => {
  it('the match is lost when the clock runs out', () => {
    const sim = new Simulation({ stage: 'v1', seed: 1, trial: { seconds: 5 } });
    runSeconds(sim, 4);
    expect(sim.state.result).toBe('playing');
    expect(sim.timeLeft()).toBeGreaterThan(0);
    runSeconds(sim, 2);
    expect(sim.state.result).toBe('lost');
    expect(sim.timeLeft()).toBe(0);
  });

  it('tower limits: count and level', () => {
    const sim = new Simulation({ stage: 'v1', seed: 1, trial: { maxTowers: 1, maxLevel: 2 } });
    sim.state.gold = 10_000;
    const t = sim.build(0, 'archer')!;
    expect(sim.build(1, 'archer')).toBeNull();
    expect(sim.upgrade(t.id)).toBe(true);
    expect(sim.upgrade(t.id)).toBe(false);
  });

  it('every day has a clock and a known rule; time left adds score', () => {
    const d = dailySetup(new Date(2026, 10, 20));
    expect(d.seconds).toBeGreaterThan(100);
    expect(DAILY_TWISTS[d.twist]).toBeDefined();
    const sim = newSim();
    sim.state.result = 'won';
    sim.state.time = 100;
    expect(dailyScore(sim.state, 120)).toBe(dailyScore(sim.state) + 20 * 15);
  });
});
