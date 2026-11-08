import { describe, expect, it } from 'vitest';
import { TOWERS, type TowerId } from '../../src/data/towers';
import type { Simulation } from '../../src/sim/simulation';
import { dummy, newSim, record, runSeconds } from '../helpers';

/** Build a tower on slot 1 (250,430) and upgrade it to the given level. */
function tower(sim: Simulation, type: TowerId, level = 3) {
  sim.state.gold = 10_000;
  const t = sim.build(1, type)!;
  for (let l = 1; l < level; l++) sim.upgrade(t.id);
  // Park the hero far away so it doesn't interfere.
  sim.state.hero.x = sim.state.hero.targetX = 680;
  sim.state.hero.y = sim.state.hero.targetY = 1140;
  return t;
}

describe('max-level tower abilities', () => {
  it('abilities are only active at level 3', () => {
    const sim = newSim();
    const t = tower(sim, 'archer', 2);
    expect(sim.abilityOf(t)).toBeNull();
    sim.upgrade(t.id);
    expect(sim.abilityOf(t)?.id).toBe('volley');
  });

  it('Arqueiro — Rajada: every 4th attack also shoots 2 other enemies', () => {
    const sim = newSim();
    tower(sim, 'archer');
    dummy(sim, 560);
    dummy(sim, 520);
    dummy(sim, 480);
    const abilities = record(sim, 'towerAbility');
    let launched = 0;
    sim.events.on('towerFired', () => launched++);
    const before = () => sim.state.projectiles.length;
    for (let i = 0; i < 3; i++) {
      runSeconds(sim, 1 / TOWERS.archer.levels[2].rate);
    }
    expect(abilities).toHaveLength(0);
    // 4th shot
    let maxProj = 0;
    for (let i = 0; i < 40 && abilities.length === 0; i++) {
      sim.step();
      maxProj = Math.max(maxProj, before());
    }
    expect(abilities[0]!.payload.ability).toBe('volley');
    expect(maxProj).toBeGreaterThanOrEqual(3);
    expect(launched).toBe(4);
  });

  it('Braseiro — Chão em Chamas: impact leaves burning ground that ignites enemies walking in', () => {
    const sim = newSim();
    tower(sim, 'brazier');
    dummy(sim, 560);
    const zones = record(sim, 'zoneCreated');
    runSeconds(sim, 0.6);
    expect(zones.length).toBeGreaterThan(0);
    const z = zones[0]!.payload;
    // A fresh enemy placed inside the zone starts burning without being shot.
    const walker = sim.spawnEnemy('slime', { dist: 0, hp: 100_000 });
    walker.x = z.x;
    walker.y = z.y;
    walker.rootTime = 5; // keep it in place
    runSeconds(sim, 0.6);
    expect(walker.burnTime).toBeGreaterThan(0);
    runSeconds(sim, TOWERS.brazier.ability.id === 'firefield' ? 4 : 0);
    expect(sim.state.zones.every((zz) => zz.id !== z.zoneId)).toBe(true);
  });

  it('Cristal Gélido — Frio Profundo: 2 stacks per hit, freezes in 2 hits', () => {
    const sim = newSim();
    const e = dummy(sim);
    sim.applyHit(e, { element: 'ice', damage: 1, chillStacks: 2 });
    expect(e.chillStacks).toBe(2);
    sim.applyHit(e, { element: 'ice', damage: 1, chillStacks: 2 });
    expect(e.frozenTime).toBeGreaterThan(0);
  });

  it('Cristal Gélido nv3 projectiles carry 2 stacks', () => {
    const sim = newSim();
    tower(sim, 'frost');
    const e = dummy(sim, 560);
    runSeconds(sim, 0.4);
    expect(e.chillStacks).toBe(2);
  });

  it('Vinha — Raízes Profundas: a root also grabs up to 2 neighbours', () => {
    const sim = newSim();
    const e = dummy(sim, 500);
    const n1 = dummy(sim, 530);
    const n2 = dummy(sim, 470);
    const n3 = dummy(sim, 560);
    const far = dummy(sim, 700);
    const abilities = record(sim, 'towerAbility');
    sim.applyHit(e, { element: 'nature', damage: 1, rootChance: 1, entangle: { extra: 2, radius: 75 } });
    expect(e.rootTime).toBeGreaterThan(0);
    expect(n1.rootTime).toBeGreaterThan(0);
    expect(n2.rootTime).toBeGreaterThan(0);
    expect(n3.rootTime).toBe(0); // only 2 extra, the closest ones
    expect(far.rootTime).toBe(0);
    expect(abilities[0]!.payload.ability).toBe('entangle');
  });

  it('Trovão — Supertensão: every 3rd bolt doubles the jumps with no falloff', () => {
    const sim = newSim();
    tower(sim, 'storm');
    for (let d = 300; d <= 900; d += 40) dummy(sim, d);
    const bolts = record(sim, 'chainLightning');
    const abilities = record(sim, 'towerAbility');
    runSeconds(sim, 3 / TOWERS.storm.levels[2].rate + 0.2);
    expect(bolts.length).toBeGreaterThanOrEqual(3);
    const lvl = TOWERS.storm.levels[2];
    expect(bolts[0]!.payload.points.length - 1).toBe(lvl.chainCount);
    expect(bolts[2]!.payload.points.length - 1).toBe((lvl.chainCount ?? 0) * 2);
    expect(abilities.map((a) => a.payload.ability)).toContain('supercharge');
  });
});
