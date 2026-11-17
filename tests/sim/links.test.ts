import { describe, expect, it } from 'vitest';
import { MAPS } from '../../src/data/maps';
import { STAGE_ORDER, STAGES } from '../../src/data/stages';
import { LINK, TOWERS } from '../../src/data/towers';
import { Simulation } from '../../src/sim/simulation';
import { dummy, record, runSeconds } from '../helpers';

/** Stage 1, neighbouring slots 1 (264,432) and 2 (456,432): 192 px apart. */
function field(limits = false) {
  const sim = new Simulation({ stage: limits ? 'v1' : 'v5', seed: 1, limits });
  sim.state.gold = 5000;
  return sim;
}

describe('Vínculos de Éter', () => {
  it('links neighbouring towers of different kinds only', () => {
    const sim = new Simulation({ stage: 'v1', seed: 1 });
    sim.state.gold = 5000;
    const a = sim.build(1, 'archer')!;
    const b = sim.build(2, 'brazier')!;
    expect(sim.linksOf(a)).toEqual([b]);
    expect(sim.linksOf(b)).toEqual([a]);
    expect(sim.linkPairs()).toEqual([[a, b]]);
    // Same kind: no link.
    const sim2 = new Simulation({ stage: 'v1', seed: 1 });
    sim2.state.gold = 5000;
    const c = sim2.build(1, 'archer')!;
    sim2.build(2, 'archer');
    expect(sim2.linksOf(c)).toEqual([]);
    // Far away: no link.
    const far = sim.build(0, 'frost')!;
    const d = Math.hypot(far.x - a.x, far.y - a.y);
    expect(sim.linksOf(far).includes(a)).toBe(d <= LINK.maxDist);
  });

  it('the build menu can ask which neighbours a slot would link with', () => {
    const sim = new Simulation({ stage: 'v1', seed: 1 });
    sim.state.gold = 5000;
    const a = sim.build(1, 'archer')!;
    expect(sim.linkPreview(2)).toEqual([a]);
    expect(sim.linkPreview(2, 'archer')).toEqual([]);
    expect(sim.linkPreview(2, 'frost')).toEqual([a]);
  });

  it("every 4th shot also hits with the neighbour's element and leaves its state", () => {
    const sim = new Simulation({ stage: 'v1', seed: 1 });
    sim.state.gold = 5000;
    const archer = sim.build(1, 'archer')!;
    const brazier = sim.build(2, 'brazier')!;
    const log = record(sim, 'linkEcho');
    let e = dummy(sim, 380);
    for (let i = 0; i < 8; i++) {
      e = dummy(sim, 380);
      runSeconds(sim, 3);
    }
    const fromArcher = log.filter((l) => l.payload.towerId === archer.id);
    expect(fromArcher.length).toBeGreaterThan(0);
    expect(fromArcher.every((l) => l.payload.element === 'fire' && l.payload.fromId === brazier.id)).toBe(true);
    expect(Math.floor(archer.shots / LINK.every)).toBe(fromArcher.length);
    // The brazier borrows the archer's arrow too.
    expect(log.some((l) => l.payload.towerId === brazier.id && l.payload.element === 'physical')).toBe(true);
    expect(e.alive).toBe(true);
  });

  it('an archer between fire and ice takes turns and makes reactions by itself', () => {
    const sim = new Simulation({ stage: 'v1', seed: 3 });
    sim.state.gold = 5000;
    // Slots 3 (264,696), 4 (456,696) and 7 (144,696): the middle one is the archer.
    const mid = sim.build(3, 'archer')!;
    const fire = sim.build(4, 'brazier')!;
    const ice = sim.build(7, 'frost')!;
    expect(sim.linksOf(mid).map((t) => t.id).sort()).toEqual([fire.id, ice.id].sort());
    const log = record(sim, 'linkEcho');
    for (let i = 0; i < 10; i++) {
      dummy(sim, 640);
      runSeconds(sim, 3);
    }
    const els = new Set(log.filter((l) => l.payload.towerId === mid.id).map((l) => l.payload.element));
    expect(els).toEqual(new Set(['fire', 'ice']));
  });

  it('the first tutorial stages have no links; from stage 4 on they are there', () => {
    const sim = field(true);
    const a = sim.build(1, 'archer')!;
    sim.mods.unlockedTowers.push('brazier');
    sim.build(2, 'brazier');
    expect(sim.linksOf(a)).toEqual([]);
    expect(sim.linkPairs()).toEqual([]);
    expect(sim.linkPreview(4)).toEqual([]);
    for (const id of ['v1', 'v2', 'v3'] as const) expect(STAGES[id].links).toBe(false);
    for (const id of STAGE_ORDER.slice(3)) expect(STAGES[id].links).toBeUndefined();
  });

  it('every map from stage 4 on has at least one pair of slots close enough to link', () => {
    for (const id of STAGE_ORDER.slice(3)) {
      const s = MAPS[STAGES[id].map].slots;
      let pairs = 0;
      for (let i = 0; i < s.length; i++) for (let j = i + 1; j < s.length; j++) if (Math.hypot(s[i]!.x - s[j]!.x, s[i]!.y - s[j]!.y) <= LINK.maxDist) pairs++;
      expect(pairs, id).toBeGreaterThanOrEqual(1);
    }
  });

  it('the borrowed hit is weaker than the neighbour itself', () => {
    expect(LINK.damageMult).toBeLessThan(1);
    expect(LINK.every).toBeGreaterThanOrEqual(3);
    expect(TOWERS.brazier.levels[0].burnDps! * LINK.burnMult).toBeLessThan(TOWERS.brazier.levels[0].burnDps!);
  });
});
