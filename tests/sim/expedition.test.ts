import { describe, expect, it } from 'vitest';
import { ECONOMY } from '../../src/data/economy';
import { advanceRun, EXPEDITION, legSetup, newRun, PACT_IDS, PACTS, rollRoutes, type ExpeditionRun } from '../../src/data/expedition';
import { defaultModifiers } from '../../src/data/modifiers';
import { STAGES } from '../../src/data/stages';
import { migrate, SaveStore } from '../../src/meta/save';
import { Simulation } from '../../src/sim/simulation';

const POOL = ['v3', 'v4', 'v5', 'a1', 'a2'] as const;

function memStorage() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
}

describe('Expedição de Éter', () => {
  it('offers 2 different trails, the same for the same seed', () => {
    for (let seed = 1; seed < 200; seed++) {
      for (let leg = 0; leg < EXPEDITION.legs; leg++) {
        const r = rollRoutes(seed, leg, POOL);
        expect(r).toHaveLength(2);
        expect(r[0]!.pact).not.toBe(r[1]!.pact);
        expect(r[0]!.stage).not.toBe(r[1]!.stage);
        expect(rollRoutes(seed, leg, POOL)).toEqual(r);
        for (const route of r) {
          if (route.pact !== 'vow') continue;
          expect(route.towers).toHaveLength(3);
          // Never a set that cannot make a reaction.
          expect(['archer', 'storm', 'vine'].every((t) => route.towers!.includes(t as never))).toBe(false);
        }
      }
    }
  });

  it('works with a single stage in the pool', () => {
    const r = rollRoutes(7, 0, ['v5']);
    expect(r.map((x) => x.stage)).toEqual(['v5', 'v5']);
  });

  it('every pact has a prize and a price in words', () => {
    for (const id of PACT_IDS) {
      expect(PACTS[id].good.length).toBeGreaterThan(3);
      expect(PACTS[id].bad.length).toBeGreaterThan(3);
    }
  });

  it('carries lives and Bênçãos into the next battle and makes monsters tougher', () => {
    let run: ExpeditionRun = newRun(5, 'mage', POOL);
    run = advanceRun(run, 13, ['fireMastery', 'overdrive'], POOL);
    expect(run.leg).toBe(1);
    const route = { stage: 'v5', pact: 'horde' } as const;
    const leg = legSetup(run, route, defaultModifiers());
    expect(leg.hpMult).toBeCloseTo(EXPEDITION.hpMult[1]! * PACTS.horde.hpMult!);
    const sim = new Simulation({ stage: 'v5', seed: 1, modifiers: leg.modifiers, run: leg });
    expect(sim.state.lives).toBe(13);
    expect(sim.state.boons).toEqual(['fireMastery', 'overdrive']);
    expect(sim.mods.elementDamageMult.fire).toBeGreaterThan(1);
    expect(sim.stage.hpMult).toBeCloseTo(STAGES.v5.hpMult * leg.hpMult);
    // Trilha da Horda: one Bênção to pick before the first wave.
    expect(sim.state.boonOffers).toHaveLength(1);
  });

  it('pacts change gold, lives and the towers allowed', () => {
    const run = newRun(5, 'mage', POOL);
    const purse = legSetup({ ...run, lives: 3 }, { stage: 'v5', pact: 'purse' }, defaultModifiers());
    expect(purse.lives).toBe(1); // never below 1
    const base = new Simulation({ stage: 'v5', seed: 1 }).state.gold;
    expect(new Simulation({ stage: 'v5', seed: 1, run: purse }).state.gold).toBe(base + PACTS.purse.gold!);
    const calm = legSetup(run, { stage: 'v5', pact: 'calm' }, defaultModifiers());
    expect(calm.lives).toBe(ECONOMY.startLives); // never above the maximum
    const vow = legSetup(run, { stage: 'v5', pact: 'vow', towers: ['brazier', 'frost', 'storm'] }, defaultModifiers());
    const sim = new Simulation({ stage: 'v5', seed: 1, modifiers: vow.modifiers, run: vow });
    expect(sim.mods.unlockedTowers).toEqual(['brazier', 'frost', 'storm']);
    expect(sim.mods.towerDamageMult.frost).toBeCloseTo(PACTS.vow.towerDamage!);
    expect(sim.mods.towerDamageMult.archer).toBe(1);
  });

  it('ends after the last leg', () => {
    let run = newRun(9, 'knight', POOL);
    for (let i = 0; i < EXPEDITION.legs; i++) run = advanceRun(run, 20, [], POOL);
    expect(run.leg).toBe(EXPEDITION.legs);
    expect(run.routes).toEqual([]);
  });

  it('is saved, survives a reload and old saves get the new fields', () => {
    const st = memStorage();
    const s = new SaveStore(st);
    expect(s.data.expedition).toBeNull();
    s.setExpedition(newRun(3, 'mage', POOL));
    const again = new SaveStore(st);
    expect(again.data.expedition?.routes).toHaveLength(2);
    again.finishExpedition();
    expect(again.data.expedition).toBeNull();
    expect(again.data.expeditionWins).toBe(1);
    const old = migrate({ version: 7, stages: {} });
    expect(old.expedition).toBeNull();
    expect(old.expeditionWins).toBe(0);
    expect(migrate({ version: 7, expedition: { seed: 1, routes: 'x' } }).expedition).toBeNull();
  });

  it('only visits open stages, never the first tutorial ones', () => {
    const s = new SaveStore(memStorage());
    expect(s.expeditionPool()).toEqual([]);
    for (const id of ['v1', 'v2', 'v3', 'v4', 'v5'] as const) s.recordResult(id, true, 3);
    const pool = s.expeditionPool();
    expect(pool).toContain('v5');
    expect(pool).toContain('a1');
    expect(pool).not.toContain('v1');
    expect(pool).not.toContain('c1');
  });
});
