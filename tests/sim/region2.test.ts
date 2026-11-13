import { describe, expect, it } from 'vitest';
import { ENEMIES } from '../../src/data/enemies';
import { MAPS } from '../../src/data/maps';
import { REGIONS, STAGES } from '../../src/data/stages';
import { Simulation } from '../../src/sim/simulation';
import { SaveStore } from '../../src/meta/save';
import { record, runSeconds } from '../helpers';

describe('Região 2', () => {
  it('has 5 stages on tall maps with 10–14 slots and 3–4 rune stones', () => {
    for (const id of REGIONS[1]!.stages) {
      const map = MAPS[STAGES[id].map];
      expect(map.height, id).toBeGreaterThan(1280);
      expect(map.slots.length, id).toBeGreaterThanOrEqual(10);
      expect(map.slots.length, id).toBeLessThanOrEqual(14);
      expect(map.runes.length, id).toBeGreaterThanOrEqual(3);
    }
  });

  it('opens after the last stage of Região 1', () => {
    const mem = new Map<string, string>();
    const save = new SaveStore({ getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => void mem.set(k, v) });
    expect(save.isUnlocked('a1')).toBe(false);
    save.recordResult('v5', true, 1);
    expect(save.isUnlocked('a1')).toBe(true);
    expect(save.isUnlocked('a2')).toBe(false);
  });
});

describe('Comporta', () => {
  it('sends new enemies down the open branch; tapping switches it', () => {
    const sim = new Simulation({ stage: 'a2', seed: 1 });
    sim.callNextWave();
    runSeconds(sim, 2);
    expect(new Set(sim.state.enemies.map((e) => e.pathIndex))).toEqual(new Set([0]));
    const ev = record(sim, 'gateToggled');
    expect(sim.toggleGate()).toBe(true);
    expect(ev[0]!.payload.path).toBe(1);
    const before = new Set(sim.state.enemies.map((e) => e.id));
    runSeconds(sim, 3);
    const fresh = sim.state.enemies.filter((e) => !before.has(e.id));
    expect(fresh.length).toBeGreaterThan(0);
    expect(fresh.every((e) => e.pathIndex === 1)).toBe(true);
    // enemies already walking keep their road
    expect(sim.state.enemies.filter((e) => before.has(e.id)).every((e) => e.pathIndex === 0)).toBe(true);
  });

  it('maps without a Comporta ignore the command', () => {
    expect(new Simulation({ stage: 'a1', seed: 1 }).toggleGate()).toBe(false);
  });
});

describe('boss shields', () => {
  const shields = ENEMIES.sentinel.boss!.shields!;

  it('the boss arrives shielded and takes reduced damage', () => {
    const sim = new Simulation({ stage: 'a3', seed: 1 });
    const up = record(sim, 'shieldUp');
    const boss = sim.spawnEnemy('sentinel', { dist: 300 });
    expect(boss.shield).toBe(shields.reactions[0]);
    expect(up).toHaveLength(1);
    const hp = boss.hp;
    sim.applyHit(boss, { element: 'arcane', damage: 100 });
    expect(hp - boss.hp).toBe(Math.round(100 * shields.taken));
  });

  it('only the named reaction cracks it; the breaking hit lands in full', () => {
    const sim = new Simulation({ stage: 'a3', seed: 1 });
    const boss = sim.spawnEnemy('sentinel', { dist: 300 });
    const broken = record(sim, 'shieldBroken');
    // wrong reaction (INCÊNDIO: burning + nature) does nothing to the shield
    sim.applyHit(boss, { element: 'fire', damage: 1, burnDps: 1 });
    sim.applyHit(boss, { element: 'nature', damage: 1 });
    expect(boss.shieldHits).toBe(shields.hits);
    // DERRETIMENTO (burning + ice) × hits
    for (let i = 0; i < shields.hits; i++) {
      sim.applyHit(boss, { element: 'fire', damage: 1, burnDps: 1 });
      sim.applyHit(boss, { element: 'ice', damage: 1 });
    }
    expect(broken).toHaveLength(1);
    expect(boss.shield).toBeNull();
    const hp = boss.hp;
    sim.applyHit(boss, { element: 'arcane', damage: 100 });
    expect(hp - boss.hp).toBe(100);
  });

  it('the next shield rises when hp falls to its threshold', () => {
    const sim = new Simulation({ stage: 'a3', seed: 1 });
    const boss = sim.spawnEnemy('sentinel', { dist: 300 });
    boss.shield = null;
    boss.shieldGrace = 0;
    boss.hp = boss.maxHp * (shields.at[1]! - 0.01);
    sim.step();
    expect(boss.shield).toBe(shields.reactions[1]);
  });
});
