import { describe, expect, it } from 'vitest';
import { FUSION, FUSION_IDS, FUSIONS, fusionOf } from '../../src/data/fusions';
import { REACTION_TABLE } from '../../src/data/reactions';
import { TOWERS } from '../../src/data/towers';
import { Simulation } from '../../src/sim/simulation';
import { record, runSeconds } from '../helpers';

/** Stage 1 with two level-3 towers on neighbouring slots 1 (264,432) and 2 (456,432). */
function pair(a: 'brazier' | 'frost' | 'vine' | 'storm' | 'archer', b: 'brazier' | 'frost' | 'vine' | 'storm' | 'archer') {
  const sim = new Simulation({ stage: 'v1', seed: 1 });
  sim.state.gold = 5000;
  const t = sim.build(1, a)!;
  const u = sim.build(2, b)!;
  t.level = 3;
  u.level = 3;
  return { sim, t, u };
}

describe('Torres de fusão', () => {
  it('every fusion is a pair whose elements really react (first leaves the aura, second sets it off)', () => {
    for (const id of FUSION_IDS) {
      const f = FUSIONS[id];
      expect(fusionOf(f.towers[1], f.towers[0])).toBe(id);
      const els = f.towers.map((t) => TOWERS[t].element);
      expect(els).toContain(f.first);
      expect(els).toContain(f.second);
      const aura = f.first === 'fire' ? 'burning' : f.first === 'ice' ? 'chilled' : 'rooted';
      expect(REACTION_TABLE.find((r) => r.aura === aura && r.trigger === f.second)?.reaction, id).toBe(f.reaction);
    }
    expect(fusionOf('archer', 'brazier')).toBeNull();
  });

  it('needs two level-3 towers of reacting elements close together', () => {
    const { sim, t } = pair('brazier', 'frost');
    expect(sim.fusionCandidates(t).map((c) => c.fusion)).toEqual(['steam']);
    const other = pair('brazier', 'archer');
    expect(other.sim.fusionCandidates(other.t)).toHaveLength(0);
    const low = pair('brazier', 'frost');
    low.u.level = 2;
    expect(low.sim.fusionCandidates(low.t)).toHaveLength(0);
    expect(FUSION.maxDist).toBeGreaterThanOrEqual(192);
  });

  it('fusing frees the partner slot, costs gold and keeps the investment', () => {
    const { sim, t, u } = pair('brazier', 'frost');
    const gold = sim.state.gold;
    const invested = t.invested + u.invested;
    const ev = record(sim, 'towerFused');
    expect(sim.fuse(t.id, u.id)).toBe(true);
    expect(ev[0]!.payload).toMatchObject({ towerId: t.id, partnerSlot: 2, fusion: 'steam' });
    expect(sim.towerAt(2)).toBeUndefined();
    expect(sim.state.gold).toBe(gold - sim.fusionCost());
    expect(t.invested).toBe(invested + sim.fusionCost());
    expect(sim.evolveCost(t, 'inferno' as never)).toBeNull();
    expect(sim.build(2, 'vine')).not.toBeNull(); // the freed slot can be used again
  });

  it('every shot sets off its reaction on the target by itself', () => {
    const { sim, t, u } = pair('frost', 'storm');
    sim.fuse(t.id, u.id);
    sim.spawnEnemy('golem', { dist: 600, hp: 1e6 });
    const r = record(sim, 'reactionTriggered');
    runSeconds(sim, 3);
    expect(r.length).toBeGreaterThan(0);
    expect(r.every((x) => x.payload.reaction === 'superconduct')).toBe(true);
  });
});
