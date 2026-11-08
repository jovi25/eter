import { describe, expect, it } from 'vitest';
import { ECONOMY, WAVE_TIMING } from '../../src/data/economy';
import { TOWERS } from '../../src/data/towers';
import { autoPlay, newSim, record, runSeconds } from '../helpers';

describe('economy', () => {
  it('starts with 120 gold and 20 lives', () => {
    const sim = newSim();
    expect(sim.state.gold).toBe(120);
    expect(sim.state.lives).toBe(20);
  });

  it('building costs gold; occupied slots and missing gold are refused', () => {
    const sim = newSim();
    expect(sim.build(0, 'archer')).not.toBeNull();
    expect(sim.state.gold).toBe(70);
    expect(sim.build(0, 'vine')).toBeNull();
    expect(sim.build(1, 'brazier')).not.toBeNull(); // 70 → 0
    expect(sim.build(2, 'archer')).toBeNull();
    expect(sim.build(99, 'archer')).toBeNull();
  });

  it('locked towers cannot be built', () => {
    const sim = newSim({ unlockedTowers: ['archer', 'brazier', 'vine'] });
    expect(sim.build(0, 'frost')).toBeNull();
  });

  it('upgrades up to level 3 and sells for 70% of everything invested', () => {
    const sim = newSim();
    sim.state.gold = 1000;
    const t = sim.build(0, 'archer')!;
    expect(sim.upgrade(t.id)).toBe(true);
    expect(sim.upgrade(t.id)).toBe(true);
    expect(sim.upgrade(t.id)).toBe(false);
    expect(t.level).toBe(3);
    const invested = TOWERS.archer.levels.reduce((s, l) => s + l.cost, 0);
    expect(t.invested).toBe(invested);
    const before = sim.state.gold;
    expect(sim.sell(t.id)).toBe(true);
    expect(sim.state.gold - before).toBe(Math.floor(invested * ECONOMY.sellRefund));
    expect(sim.towerAt(0)).toBeUndefined();
  });

  it('calling a wave early pays gold for the time skipped', () => {
    const sim = newSim();
    runSeconds(sim, 5);
    const expected = Math.round(sim.state.nextWaveTimer * ECONOMY.earlyCallGoldPerSecond);
    const log = record(sim, 'waveStarted');
    expect(sim.callNextWave()).toBe(true);
    expect(log[0]!.payload).toMatchObject({ wave: 1, early: true, bonus: expected });
    expect(sim.state.gold).toBe(120 + expected);
    expect(sim.callNextWave()).toBe(false); // can't call while a wave is still spawning
  });

  it('the first wave starts by itself after the prep time', () => {
    const sim = newSim();
    runSeconds(sim, WAVE_TIMING.firstWaveDelay - 0.1);
    expect(sim.state.wave).toBe(0);
    runSeconds(sim, 0.2);
    expect(sim.state.wave).toBe(1);
  });

  it('clearing a wave pays the wave bonus', () => {
    const sim = newSim();
    const cleared = record(sim, 'waveCleared');
    sim.callNextWave();
    runSeconds(sim, 10); // wave 1 finished spawning
    for (const e of sim.state.enemies) if (e.wave === 1) sim.applyHit(e, { element: 'arcane', damage: 9999 });
    expect(cleared[0]!.payload).toMatchObject({ wave: 1, bonus: ECONOMY.waveClearBonusBase + ECONOMY.waveClearBonusPerWave });
  });
});

describe('lives and match end', () => {
  it('an enemy that reaches the crystal costs lives', () => {
    const sim = newSim();
    sim.spawnEnemy('golem', { dist: sim.path.length - 5 });
    runSeconds(sim, 0.5);
    expect(sim.state.lives).toBe(18);
  });

  it('without towers the match is lost', () => {
    const sim = newSim();
    const over = record(sim, 'gameOver');
    autoPlay(sim, []);
    expect(sim.state.result).toBe('lost');
    expect(over[0]!.payload).toEqual({ won: false, stars: 0 });
  });

  it('a full defense reaches the end of all 10 waves', () => {
    const sim = newSim();
    autoPlay(sim, ['archer', 'vine', 'brazier', 'frost', 'brazier', 'vine', 'archer', 'frost']);
    expect(sim.state.result).not.toBe('playing');
    expect(sim.state.wave).toBe(10);
  });

  it('design check: a combo build wins stage 1 in about 3 minutes', () => {
    const sim = newSim();
    autoPlay(sim, ['vine', 'brazier', 'frost', 'archer', 'brazier', 'vine', 'frost', 'archer']);
    expect(sim.state.result).toBe('won');
    expect(sim.stars()).toBeGreaterThanOrEqual(2);
    expect(sim.state.time).toBeGreaterThan(150);
    expect(sim.state.time).toBeLessThan(240);
    const reactions = Object.values(sim.state.stats.reactions).reduce((a, b) => a + b, 0);
    expect(reactions).toBeGreaterThan(20);
  });

  it('stars follow lives left: 18+ = 3, 10+ = 2, otherwise 1', () => {
    const sim = newSim();
    sim.state.result = 'won';
    sim.state.lives = 18;
    expect(sim.stars()).toBe(3);
    sim.state.lives = 10;
    expect(sim.stars()).toBe(2);
    sim.state.lives = 3;
    expect(sim.stars()).toBe(1);
  });
});

describe('determinism', () => {
  const plan = ['vine', 'brazier', 'archer', 'frost', 'archer', 'vine', 'brazier', 'frost'] as const;

  it('same seed + same commands → identical match', () => {
    const a = newSim({}, 12345);
    const b = newSim({}, 12345);
    autoPlay(a, [...plan]);
    autoPlay(b, [...plan]);
    expect(JSON.stringify(a.state)).toBe(JSON.stringify(b.state));
  });

  it('different seeds diverge (crits and root rolls change)', () => {
    const a = newSim({}, 1);
    const b = newSim({}, 2);
    autoPlay(a, [...plan], 120);
    autoPlay(b, [...plan], 120);
    expect(JSON.stringify(a.state)).not.toBe(JSON.stringify(b.state));
  });
});
