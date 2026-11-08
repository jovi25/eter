declare const process: { env: Record<string, string | undefined> };
import { describe, expect, it } from 'vitest';
import { Simulation } from '../../src/sim/simulation';
import { SIM_TICKS_PER_SECOND } from '../../src/data/config';
import { STAGE_ORDER, type StageId } from '../../src/data/stages';
import type { TowerId } from '../../src/data/towers';
import { HERO } from '../../src/data/hero';

function slotOrder(sim: Simulation): number[] {
  const cov = sim.slots.map((s, i) => {
    let n = 0;
    for (const p of sim.paths) for (let d = 0; d < p.length; d += 8) { const q = p.pointAt(d); if (Math.hypot(q.x - s.x, q.y - s.y) <= 170) n++; }
    return { i, n };
  });
  return cov.sort((a, b) => b.n - a.n).map((c) => c.i);
}

export function play(stage: StageId, plan: TowerId[], seed: number) {
  const sim = new Simulation({ stage, seed });
  const order = slotOrder(sim);
  while (sim.state.result === 'playing' && sim.state.tick < 600 * SIM_TICKS_PER_SECOND) {
    const n = sim.state.towers.length;
    if (n < plan.length) sim.build(order[n]!, plan[n]!);
    else for (const t of sim.state.towers) if (sim.upgrade(t.id)) break;
    if (sim.catalyzeReady()) {
      const h = sim.state.hero;
      const near = sim.state.enemies.filter((e) => (e.x - h.x) ** 2 + (e.y - h.y) ** 2 < HERO.catalyze.radius ** 2).length;
      if (near >= 3) sim.castCatalyze();
    }
    sim.step();
  }
  return sim;
}

// Full report: npm run balance (60 simulated matches, ~30 s). Skipped in the normal test run.
describe.runIf(process.env.npm_lifecycle_event === 'balance')('balance report', () => {
it('all stages × strategies × seeds', () => {
  const plans: Record<string, TowerId[]> = {
    archers: Array(8).fill('archer'),
    combo8: ['vine', 'brazier', 'frost', 'storm', 'brazier', 'vine', 'frost', 'archer'],
    focus5: ['vine', 'brazier', 'frost', 'storm', 'brazier'],
  };
  const smart: Record<StageId, TowerId[]> = {
    v1: ['vine', 'brazier', 'frost', 'storm', 'brazier', 'vine', 'frost', 'archer'],
    v2: ['frost', 'storm', 'vine', 'frost', 'storm', 'vine', 'archer', 'storm'],
    v3: ['brazier', 'storm', 'brazier', 'frost', 'archer', 'brazier', 'storm', 'vine'],
    v4: ['archer', 'brazier', 'frost', 'vine', 'archer'],
    v5: ['vine', 'brazier', 'frost', 'storm', 'brazier', 'frost', 'storm', 'archer'],
  };
  for (const st of STAGE_ORDER) {
    const out: string[] = [];
    for (const [name, plan] of [...Object.entries(plans), ['smart', smart[st]] as [string, TowerId[]]]) {
      const res = [1, 2, 3].map((s) => { const sim = play(st, plan, s); return sim.state.result === 'won' ? `W${sim.state.lives}` : `L(w${sim.state.wave})`; });
      out.push(`${name}:${res.join(',')}`);
    }
    console.log(st, out.join('  '));
  }
});
});

// Fast design checks that always run.
describe('design checks (stages)', () => {
  it('stage 5 cannot be won with archers only, but a combo build wins', () => {
    expect(play('v5', Array(8).fill('archer'), 1).state.result).toBe('lost');
    expect(play('v5', ['vine', 'brazier', 'frost', 'storm', 'brazier', 'vine', 'frost', 'archer'], 1).state.result).toBe('won');
  });
});
