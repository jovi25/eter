import { describe, expect, it } from 'vitest';
import { TOWERS } from '../../src/data/towers';
import { dummy, newSim, record, runSeconds } from '../helpers';

describe('Torre do Trovão (chain lightning)', () => {
  it('hits the target, then jumps to nearby enemies in sequence with falloff', () => {
    const sim = newSim();
    const tower = sim.build(1, 'storm')!; // (264,432), lanes y=288 and y=576 in range
    const lvl = TOWERS.storm.levels[0];
    // A line of enemies 60px apart on the y=288 lane (dist 480 → x=240).
    const a = dummy(sim, 480);
    const b = dummy(sim, 420);
    const c = dummy(sim, 360);
    const d = dummy(sim, 300);
    const hits = record(sim, 'enemyHit');
    const bolts = record(sim, 'chainLightning');
    sim.step();
    expect(sim.findTarget(tower)).not.toBeNull();
    const byEnemy = hits.map((h) => [h.payload.enemyId, h.payload.damage]);
    expect(byEnemy.map((x) => x[0])).toEqual([a.id, b.id, c.id]); // chainCount 3, d not hit
    expect(byEnemy.map((x) => x[1])).toEqual([
      Math.round(lvl.damage),
      Math.round(lvl.damage * 0.7),
      Math.round(lvl.damage * 0.7 * 0.7),
    ]);
    expect(bolts[0]!.payload.points).toHaveLength(4); // tower + 3 enemies
    expect(d.hp).toBe(d.maxHp);
  });

  it('does not jump further than chainRange', () => {
    const sim = newSim();
    sim.build(1, 'storm');
    dummy(sim, 480);
    const far = dummy(sim, 220); // 260px away on the path
    sim.step();
    expect(far.hp).toBe(far.maxHp);
  });

  it('never hits the same enemy twice in one chain', () => {
    const sim = newSim();
    sim.state.gold = 1000;
    const t = sim.build(1, 'storm')!;
    sim.upgrade(t.id);
    sim.upgrade(t.id); // chainCount 5
    dummy(sim, 480);
    dummy(sim, 440);
    const hits = record(sim, 'enemyHit');
    sim.step();
    expect(hits).toHaveLength(2);
  });

  it('hits flyers', () => {
    const sim = newSim();
    const t = sim.build(1, 'storm')!;
    dummy(sim, 480, 'bat');
    expect(sim.findTarget(t)).not.toBeNull();
  });

  it('Congelado + Raio = ESTILHAÇO, and lightning applies no aura', () => {
    const sim = newSim();
    const e = dummy(sim);
    for (let i = 0; i < 3; i++) sim.applyHit(e, { element: 'ice', damage: 1 });
    const log = record(sim, 'reactionTriggered');
    sim.applyHit(e, { element: 'lightning', damage: 10 });
    expect(log.map((l) => l.payload.reaction)).toEqual(['shatter']);

    const plain = dummy(sim, 700);
    sim.applyHit(plain, { element: 'lightning', damage: 10 });
    expect(plain.burnTime + plain.chillTime + plain.rootTime + plain.frozenTime).toBe(0);
  });

  it('fires again after its cooldown', () => {
    const sim = newSim();
    sim.build(1, 'storm');
    dummy(sim, 480);
    const bolts = record(sim, 'chainLightning');
    runSeconds(sim, 1 / TOWERS.storm.levels[0].rate + 0.1);
    expect(bolts).toHaveLength(2);
  });
});
