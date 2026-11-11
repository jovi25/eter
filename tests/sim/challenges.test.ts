import { describe, expect, it } from 'vitest';
import { CHALLENGES, challengeMet, challengeText, dailyScore, dailySetup, evaluateChallenges } from '../../src/data/challenges';
import { STAGE_ORDER } from '../../src/data/stages';
import { BOOST, TOWERS } from '../../src/data/towers';
import { SaveStore } from '../../src/meta/save';
import { dummy, newSim, record } from '../helpers';

function memStorage() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
}

describe('Reforço (gold sink after max level)', () => {
  it('is only available at level 3, costs more each time and raises damage', () => {
    const sim = newSim();
    sim.state.gold = 100_000;
    sim.state.hero.x = sim.state.hero.targetX = 680;
    sim.state.hero.y = sim.state.hero.targetY = 1140;
    const t = sim.build(1, 'archer')!;
    expect(sim.boostCost(t)).toBeNull();
    expect(sim.boost(t.id)).toBe(false);
    sim.upgrade(t.id);
    sim.upgrade(t.id);
    const c1 = sim.boostCost(t)!;
    expect(c1).toBe(BOOST.baseCost);
    expect(sim.boost(t.id)).toBe(true);
    expect(sim.boostCost(t)!).toBeGreaterThan(c1);
    for (let i = 0; i < 9; i++) sim.boost(t.id);
    expect(t.boost).toBe(10);
    const e = dummy(sim, 470);
    e.rootTime = 1e6;
    const hits = record(sim, 'enemyHit');
    for (let i = 0; i < 60 && hits.length === 0; i++) sim.step();
    const base = TOWERS.archer.levels[2].damage;
    const dmg = hits[0]!.payload.damage;
    const boosted = base * (1 + BOOST.damagePerLevel * 10);
    expect([Math.round(boosted), Math.round(boosted * (TOWERS.archer.levels[2].critMult ?? 2))]).toContain(dmg);
  });
});

describe('stage challenges', () => {
  it('every stage has 3 challenges with readable text', () => {
    for (const id of STAGE_ORDER) {
      expect(CHALLENGES[id]).toHaveLength(3);
      for (const c of CHALLENGES[id]) expect(challengeText(c).length).toBeGreaterThan(8);
    }
  });

  it('only count on a win, and check the right stats', () => {
    const sim = newSim();
    sim.state.gold = 1000;
    sim.build(0, 'archer');
    sim.build(1, 'vine');
    expect(challengeMet({ kind: 'maxTowers', max: 5 }, sim.state)).toBe(false); // still playing
    sim.state.result = 'won';
    expect(challengeMet({ kind: 'maxTowers', max: 5 }, sim.state)).toBe(true);
    expect(challengeMet({ kind: 'maxTowers', max: 1 }, sim.state)).toBe(false);
    expect(challengeMet({ kind: 'noTower', tower: 'brazier' }, sim.state)).toBe(true);
    expect(challengeMet({ kind: 'noTower', tower: 'vine' }, sim.state)).toBe(false);
    expect(challengeMet({ kind: 'lives', min: 20 }, sim.state)).toBe(true);
    expect(challengeMet({ kind: 'hero', cls: 'mage' }, sim.state)).toBe(true);
    expect(challengeMet({ kind: 'hero', cls: 'knight' }, sim.state)).toBe(false);
    sim.state.stats.reactions.overload = 8;
    expect(challengeMet({ kind: 'reaction', id: 'overload', min: 8 }, sim.state)).toBe(true);
    expect(challengeMet({ kind: 'reactions', min: 9 }, sim.state)).toBe(false);
    expect(evaluateChallenges('v1', sim.state)).toHaveLength(3);
  });

  it('selling does not hide that a tower was built or the peak count', () => {
    const sim = newSim();
    sim.state.gold = 1000;
    const a = sim.build(0, 'brazier')!;
    sim.build(1, 'archer');
    sim.sell(a.id);
    sim.state.result = 'won';
    expect(challengeMet({ kind: 'noTower', tower: 'brazier' }, sim.state)).toBe(false);
    expect(challengeMet({ kind: 'maxTowers', max: 1 }, sim.state)).toBe(false);
  });

  it('save keeps completed challenges and reports which are new', () => {
    const s = new SaveStore(memStorage());
    expect(s.recordChallenges('v1', [true, false, false])).toEqual([true, false, false]);
    expect(s.recordChallenges('v1', [true, true, false])).toEqual([false, true, false]);
    expect(s.recordChallenges('v1', [false, false, false])).toEqual([false, false, false]);
    expect(s.challengesDone('v1')).toBe(2);
    expect(s.challengesDone()).toBe(2);
  });
});

describe('daily challenge', () => {
  it('is the same for everyone on the same day and changes across days', () => {
    const a = dailySetup(new Date(2026, 10, 11));
    const b = dailySetup(new Date(2026, 10, 11, 23, 59));
    expect(a).toEqual(b);
    expect(a.key).toBe('2026-11-11');
    const setups = new Set<string>();
    for (let d = 1; d <= 28; d++) {
      const s = dailySetup(new Date(2026, 10, d));
      setups.add(`${s.stage}|${s.hero}|${s.boon}`);
      expect(STAGE_ORDER).toContain(s.stage);
    }
    expect(setups.size).toBeGreaterThan(10);
  });

  it('score rewards winning, lives and reactions; save keeps the best of the day', () => {
    const sim = newSim();
    sim.state.wave = 6;
    sim.state.stats.reactions.melt = 10;
    sim.state.result = 'lost';
    const lost = dailyScore(sim.state);
    sim.state.result = 'won';
    const won = dailyScore(sim.state);
    expect(won).toBeGreaterThan(lost);
    const s = new SaveStore(memStorage());
    expect(s.recordDaily('2026-11-11', 500)).toBe(true);
    expect(s.recordDaily('2026-11-11', 300)).toBe(false);
    expect(s.dailyBest('2026-11-11')).toBe(500);
    expect(s.dailyBest('2026-11-12')).toBe(0);
    expect(s.recordDaily('2026-11-12', 100)).toBe(true);
    expect(s.data.daily.plays).toBe(1);
  });
});
