import { describe, expect, it } from 'vitest';
import { ENEMIES } from '../../src/data/enemies';
import { MAPS, type MapId } from '../../src/data/maps';
import { STAGE_ORDER, STAGES } from '../../src/data/stages';
import { Path } from '../../src/sim/path';
import { Simulation } from '../../src/sim/simulation';
import { dummy, newSim, record, runSeconds } from '../helpers';

function distToPath(pts: { x: number; y: number }[], x: number, y: number): number {
  let best = Infinity;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]!;
    const b = pts[i]!;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / (dx * dx + dy * dy)));
    best = Math.min(best, Math.hypot(a.x + dx * t - x, a.y + dy * t - y));
  }
  return best;
}

describe('resistances and weaknesses', () => {
  it('immune element deals 0 and reports eff 0 (Chifrudo de Brasa vs Fogo)', () => {
    const sim = newSim();
    const e = sim.spawnEnemy('salamander', { dist: 400, hp: 1000 });
    const log = record(sim, 'enemyHit');
    sim.applyHit(e, { element: 'fire', damage: 100, burnDps: 10 });
    expect(e.hp).toBe(1000);
    expect(log[0]!.payload).toMatchObject({ damage: 0, eff: 0 });
    expect(e.burnTime).toBeGreaterThan(0); // still gets the aura → can still be comboed
  });

  it('weakness multiplies damage (Chifrudo takes +50% from Gelo)', () => {
    const sim = newSim();
    const e = sim.spawnEnemy('salamander', { dist: 400, hp: 1000 });
    const log = record(sim, 'enemyHit');
    sim.applyHit(e, { element: 'ice', damage: 100 });
    expect(log[0]!.payload).toMatchObject({ damage: 150, eff: 1.5 });
  });

  it('reaction damage uses the triggering element resistance', () => {
    const sim = newSim();
    const e = sim.spawnEnemy('skeleton', { dist: 400, hp: 10_000 });
    for (let i = 0; i < 3; i++) sim.applyHit(e, { element: 'ice', damage: 1 });
    const log = record(sim, 'enemyHit');
    sim.applyHit(e, { element: 'lightning', damage: 100 }); // shatter ×1.5, weak to lightning ×1.5
    expect(log[0]!.payload.damage).toBe(225);
  });

  it('Lamacento cannot be rooted, not even by GEADA ESPINHOSA', () => {
    const sim = newSim();
    const e = sim.spawnEnemy('mudling', { dist: 400, hp: 1000 });
    sim.applyHit(e, { element: 'nature', damage: 1, rootChance: 1 });
    expect(e.rootTime).toBe(0);
    sim.applyHit(e, { element: 'ice', damage: 1 });
    sim.applyHit(e, { element: 'nature', damage: 1 });
    expect(e.rootTime).toBe(0);
  });

  it('every enemy has sane data', () => {
    for (const [id, d] of Object.entries(ENEMIES)) {
      expect(d.hp, id).toBeGreaterThan(0);
      expect(d.speed, id).toBeGreaterThan(0);
      for (const r of Object.values(d.resist)) expect(r, id).toBeLessThanOrEqual(1);
    }
  });
});

describe('maps', () => {
  for (const id of Object.keys(MAPS) as MapId[]) {
    const map = MAPS[id];
    it(`${id}: slots sit on grass, reach a road, and don't overlap`, () => {
      for (const [i, s] of map.slots.entries()) {
        const nearest = Math.min(...map.paths.map((p) => distToPath(p, s.x, s.y)));
        expect(nearest, `slot ${i} too close to the road`).toBeGreaterThanOrEqual(80);
        expect(nearest, `slot ${i} can't reach any road`).toBeLessThanOrEqual(160);
        for (const o of map.slots.slice(i + 1)) expect(Math.hypot(o.x - s.x, o.y - s.y)).toBeGreaterThanOrEqual(96);
      }
    });
    it(`${id}: all paths end at the same crystal and stay on screen`, () => {
      const end = map.paths[0]!.at(-1)!;
      for (const p of map.paths) {
        expect(p.at(-1)).toEqual(end);
        expect(new Path(p).length).toBeGreaterThan(600);
        for (const pt of p) {
          expect(pt.x).toBeGreaterThanOrEqual(48);
          expect(pt.x).toBeLessThanOrEqual(672);
          expect(pt.y).toBeGreaterThanOrEqual(96);
          expect(pt.y).toBeLessThanOrEqual(1150);
        }
      }
    });
  }
});

describe('multi-path stages', () => {
  it('groups without a path alternate between the map paths', () => {
    const sim = new Simulation({ stage: 'v5', seed: 1 });
    sim.callNextWave();
    runSeconds(sim, 3);
    const paths = new Set(sim.state.enemies.map((e) => e.pathIndex));
    expect(paths).toEqual(new Set([0, 1]));
  });

  it('enemies on the second path leak at the shared crystal', () => {
    const sim = new Simulation({ stage: 'v2', seed: 1 });
    const e = sim.spawnEnemy('slime', { path: 1, dist: sim.paths[1]!.length - 5 });
    runSeconds(sim, 0.3);
    expect(e.alive).toBe(false);
    expect(sim.state.lives).toBe(19);
  });

  it('every stage has 10 waves and starts the hero on its map', () => {
    for (const id of STAGE_ORDER) {
      const st = STAGES[id];
      expect(st.waves, id).toHaveLength(10);
      const sim = new Simulation({ stage: id, seed: 1 });
      expect(sim.state.hero.x).toBe(MAPS[st.map].heroStart.x);
    }
  });
});

// keep dummy helper referenced (used by other suites)
void dummy;
