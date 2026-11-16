import { describe, expect, it } from 'vitest';
import { BRIDGE, MAPS } from '../../src/data/maps';
import { REGIONS, STAGES } from '../../src/data/stages';
import { Simulation } from '../../src/sim/simulation';
import { record, runSeconds } from '../helpers';

describe('Região 3 — Cumes Nevados', () => {
  it('5 tall snow maps, each with a Ponte levadiça', () => {
    for (const id of REGIONS[2]!.stages) {
      const map = MAPS[STAGES[id].map];
      expect(map.theme).toBe('snow');
      expect(map.bridge, id).toBeDefined();
      expect(map.slots.length).toBeGreaterThanOrEqual(10);
    }
  });

  it('the raised bridge holds ground enemies, then lets them go; it has a cooldown', () => {
    const sim = new Simulation({ stage: 'c1', seed: 1 });
    const e = sim.spawnEnemy('golem', { dist: 0, hp: 1e6 });
    const bat = sim.spawnEnemy('bat', { dist: 0, hp: 1e6 });
    expect(sim.raiseBridge()).toBe(true);
    expect(sim.raiseBridge()).toBe(false);
    runSeconds(sim, BRIDGE.raise - 0.1);
    const held = e.dist;
    runSeconds(sim, 0.05);
    void held;
    // the golem is slow; walk it right up to the bridge and raise it again later
    const map = MAPS.peak;
    expect(map.bridge).toBeDefined();
    const sim2 = new Simulation({ stage: 'c1', seed: 1 });
    const g = sim2.spawnEnemy('wolf', { dist: 1600, hp: 1e6 });
    sim2.raiseBridge();
    runSeconds(sim2, 3);
    const stuck = g.dist;
    runSeconds(sim2, 0.5);
    expect(g.dist).toBe(stuck);
    runSeconds(sim2, BRIDGE.raise);
    expect(g.dist).toBeGreaterThan(stuck);
    expect(bat.dist).toBeGreaterThan(0);
  });

  it('the Monge do Gelo heals hurt enemies around it', () => {
    const sim = new Simulation({ stage: 'c1', seed: 1 });
    const monk = sim.spawnEnemy('monk', { dist: 600, hp: 1e6 });
    const hurt = sim.spawnEnemy('golem', { dist: 610, hp: 1000 });
    hurt.hp = 100;
    const ev = record(sim, 'enemyHealed');
    runSeconds(sim, 3.2);
    expect(ev.length).toBeGreaterThan(0);
    expect(hurt.hp).toBeGreaterThan(100);
    void monk;
  });
});
