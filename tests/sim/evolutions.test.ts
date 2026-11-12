import { describe, expect, it } from 'vitest';
import { EVOLUTIONS, TOWER_EVOLUTIONS, evolvedLevel } from '../../src/data/evolutions';
import { TOWER_IDS, TOWERS, type TowerId } from '../../src/data/towers';
import { Simulation } from '../../src/sim/simulation';
import { record } from '../helpers';

/** A level-3 tower of the given type on the slot closest to the middle of the v3 ring, plenty of gold. */
function setup(type: TowerId) {
  const sim = new Simulation({ stage: 'v1', seed: 2 });
  sim.state.gold = 100_000;
  const t = sim.build(1, type)!;
  sim.upgrade(t.id);
  sim.upgrade(t.id);
  return { sim, t };
}

function foe(sim: Simulation, x: number, y: number, hp = 1e6) {
  const e = sim.spawnEnemy('slime', { hp });
  e.x = x;
  e.y = y;
  e.rootTime = 1e6; // stand still
  return e;
}

/** n slimes walking on the road right next to the tower (closest path points). */
function onRoadNear(sim: Simulation, t: { x: number; y: number }, n: number) {
  const path = sim.paths[0]!;
  let bestD = 0;
  let best = Infinity;
  for (let d = 0; d < path.length; d += 4) {
    const p = path.pointAt(d);
    const dd = Math.hypot(p.x - t.x, p.y - t.y);
    if (dd < best) {
      best = dd;
      bestD = d;
    }
  }
  return Array.from({ length: n }, (_, i) => sim.spawnEnemy('slime', { dist: bestD - 30 + i * 15, hp: 1e6 }));
}

describe('Evoluções', () => {
  it('every tower has two branches with text, and evolved stats are derived from level 3', () => {
    for (const id of TOWER_IDS) {
      const [a, b] = TOWER_EVOLUTIONS[id];
      for (const evo of [a, b]) {
        expect(EVOLUTIONS[evo].tower).toBe(id);
        expect(EVOLUTIONS[evo].desc.length).toBeGreaterThan(10);
        const lvl = evolvedLevel(id, evo);
        expect(lvl.damage).toBeCloseTo(TOWERS[id].levels[2].damage * (EVOLUTIONS[evo].stats.damageMult ?? 1));
      }
      // branch A = slow & devastating (an ultimate, or a much slower attack)
      expect(!!EVOLUTIONS[a].ult || (EVOLUTIONS[a].stats.rateMult ?? 1) < 1).toBe(true);
    }
  });

  it('only from level 3, only once, and it costs gold', () => {
    const sim = new Simulation({ stage: 'v1', seed: 2 });
    sim.state.gold = 10_000;
    const t = sim.build(1, 'frost')!;
    expect(sim.evolve(t.id, 'winterCrown')).toBe(false); // level 1
    sim.upgrade(t.id);
    sim.upgrade(t.id);
    expect(sim.evolve(t.id, 'volcano')).toBe(false); // wrong tower
    const gold = sim.state.gold;
    expect(sim.evolve(t.id, 'blizzard')).toBe(true);
    expect(sim.state.gold).toBe(gold - EVOLUTIONS.blizzard.cost);
    expect(sim.evolve(t.id, 'winterCrown')).toBe(false); // already evolved
    expect(t.evo).toBe('blizzard');
    expect(sim.boost(t.id)).toBe(true); // Reforço still works after evolving
  });

  it('Coroa do Inverno freezes everyone in range with a big hit', () => {
    const { sim, t } = setup('frost');
    sim.evolve(t.id, 'winterCrown');
    const a = foe(sim, t.x + 60, t.y);
    const b = foe(sim, t.x - 60, t.y + 30);
    const ults = record(sim, 'towerUlt');
    for (let i = 0; i < 30 * 5 && ults.length === 0; i++) sim.step();
    expect(ults.length).toBe(1);
    expect(a.frozenTime > 0 || a.hp < 1e6).toBe(true);
    expect(b.hp).toBeLessThan(1e6 - TOWERS.frost.levels[2].damage * 3);
  });

  it('Nevasca Eterna chills everyone in range without shooting', () => {
    const { sim, t } = setup('frost');
    sim.evolve(t.id, 'blizzard');
    const a = foe(sim, t.x + 60, t.y);
    const b = foe(sim, t.x - 50, t.y - 40);
    const shots = record(sim, 'towerFired');
    for (let i = 0; i < 30; i++) sim.step();
    expect(shots.length).toBe(0);
    expect(a.hp).toBeLessThan(1e6);
    expect(b.hp).toBeLessThan(1e6);
  });

  it('Vulcão drops a meteor on the biggest group and leaves fire', () => {
    const { sim, t } = setup('brazier');
    sim.evolve(t.id, 'volcano');
    onRoadNear(sim, t, 5);
    const ults = record(sim, 'towerUlt');
    t.ultTimer = 0;
    sim.step();
    expect(ults[0]!.payload.targets.length).toBeGreaterThanOrEqual(4);
    expect(sim.state.zones.length).toBeGreaterThan(0);
  });

  it('Árvore Anciã roots every ground enemy in range at once', () => {
    const { sim, t } = setup('vine');
    sim.evolve(t.id, 'elderTree');
    const es = onRoadNear(sim, t, 3);
    const ults = record(sim, 'towerUlt');
    t.ultTimer = 0;
    sim.step();
    expect(ults.length).toBe(1);
    expect(ults[0]!.payload.targets.length).toBe(3);
    for (const e of es) expect(e.rootTime).toBeGreaterThan(0);
  });

  it('constant branches attack much faster; the sniper hits harder and aims at the strongest', () => {
    expect(evolvedLevel('brazier', 'furnace').rate).toBeGreaterThan(TOWERS.brazier.levels[2].rate * 2);
    expect(evolvedLevel('storm', 'tesla').chainCount).toBe((TOWERS.storm.levels[2].chainCount ?? 0) + 2);
    const { sim, t } = setup('archer');
    sim.evolve(t.id, 'sniper');
    const weak = foe(sim, t.x + 40, t.y, 100);
    const strong = foe(sim, t.x - 40, t.y, 5000);
    weak.dist = 9999; // in front
    expect(sim.findTarget(t)).toBe(strong);
  });

  it('Chuva de Flechas shoots 3 enemies per attack', () => {
    const { sim, t } = setup('archer');
    sim.evolve(t.id, 'arrowRain');
    for (let i = 0; i < 4; i++) foe(sim, t.x + 30 * i - 45, t.y + 50);
    sim.state.projectiles.length = 0;
    t.cooldown = 0;
    sim.step();
    expect(sim.state.projectiles.length).toBeGreaterThanOrEqual(3);
  });
});
