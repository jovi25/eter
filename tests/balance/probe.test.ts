declare const process: { env: Record<string, string | undefined> };
import { describe, it } from 'vitest';
import { SIM_TICKS_PER_SECOND } from '../../src/data/config';
import { TOWER_EVOLUTIONS } from '../../src/data/evolutions';
import { HERO } from '../../src/data/hero';
import type { StageId } from '../../src/data/stages';
import type { TowerId } from '../../src/data/towers';
import { Simulation } from '../../src/sim/simulation';

/**
 * A robot that plays like a person who found the easy way: few towers, all the way up (level 3 + evolution),
 * every Bênção taken. Reports the gold left over — the measure of "too easy".
 */
export function fewTowers(stage: StageId, plan: TowerId[], seed: number, hpMult = 1, branch: 0 | 1 = 0, carry: { boons?: string[]; lives?: number } = {}, heroClass: 'mage' | 'priest' = 'mage', tallFirst = false) {
  const sim = new Simulation({ stage, seed, modifiers: { heroClass }, run: { hpMult, ...carry } });
  const cov = sim.slots
    .map((s, i) => {
      let n = 0;
      for (const p of sim.paths) for (let d = 0; d < p.length; d += 8) if (Math.hypot(p.pointAt(d).x - s.x, p.pointAt(d).y - s.y) <= 170) n++;
      return { i, n };
    })
    .sort((a, b) => b.n - a.n)
    .map((c) => c.i);
  let peak = 0;
  while (sim.state.result === 'playing' && sim.state.tick < 900 * SIM_TICKS_PER_SECOND) {
    const n = sim.state.towers.length;
    // tallFirst: 3 towers, then finish every tower (level 3 + evolution) before adding the next one.
    const pending = sim.state.towers.some((t) => !t.evo);
    if (n < plan.length && (!tallFirst || n < 3 || !pending)) sim.build(cov[n]!, plan[n]!);
    else
      for (const t of sim.state.towers) {
        if (sim.upgrade(t.id)) break;
        if (t.level >= 3 && !t.evo && sim.evolve(t.id, TOWER_EVOLUTIONS[t.type][branch])) break;
      }
    if (sim.catalyzeReady()) {
      const h = sim.state.hero;
      if (sim.state.enemies.filter((e) => (e.x - h.x) ** 2 + (e.y - h.y) ** 2 < HERO.catalyze.radius ** 2).length >= 3) sim.castCatalyze();
    }
    if (sim.state.boonOffers.length) sim.chooseBoon(0);
    peak = Math.max(peak, sim.state.gold);
    sim.step();
  }
  return { sim, peak };
}

/** The build the player reported (nov/2026): Trovão golpe final + Nevasca constante + 1 extra, Sacerdotisa. */
describe.runIf(process.env.npm_lifecycle_event === 'probe')('player build probe', () => {
  it('thunder lord + blizzard', () => {
    const builds: Record<string, [TowerId, 0 | 1][]> = {
      'raio+nevasca+fogo': [['storm', 0], ['frost', 1], ['brazier', 0]],
      'raio+nevasca': [['storm', 0], ['frost', 1]],
      'tesla+nevasca+fogo': [['storm', 1], ['frost', 1], ['brazier', 1]],
      'fogo+vinha+gelo(golpes)': [['brazier', 0], ['vine', 0], ['frost', 0]],
    };
    for (const [name, build] of Object.entries(builds)) {
      for (const st of ['v5', 'a1', 'a2', 'a3', 'a4', 'a5', 'c1', 'c2', 'c3', 'c4', 'c5'] as StageId[]) {
        const sim = new Simulation({ stage: st, seed: 1, modifiers: { heroClass: (process.env.HERO ?? 'priest') as 'priest' }, run: { hpMult: Number(process.env.HP_SCALE ?? '1') } });
        const cov = sim.slots
          .map((s, i) => {
            let n = 0;
            for (const p of sim.paths) for (let d = 0; d < p.length; d += 8) if (Math.hypot(p.pointAt(d).x - s.x, p.pointAt(d).y - s.y) <= 170) n++;
            return { i, n };
          })
          .sort((a, b) => b.n - a.n);
        // Neighbouring slots, as a person would place a combo.
        const first = sim.slots[cov[0]!.i]!;
        const near = cov.map((c) => c.i).sort((a, b) => Math.hypot(sim.slots[a]!.x - first.x, sim.slots[a]!.y - first.y) - Math.hypot(sim.slots[b]!.x - first.x, sim.slots[b]!.y - first.y));
        let earned = sim.state.gold;
        let last = sim.state.gold;
        while (sim.state.result === 'playing' && sim.state.tick < 900 * SIM_TICKS_PER_SECOND) {
          const n = sim.state.towers.length;
          if (n < build.length) {
            if (sim.build(near[n]!, build[n]![0]) && n === 0) sim.moveHero(first.x + 40, first.y + 40);
          } else
            for (const t of sim.state.towers) {
              const b = build.find((x) => x[0] === t.type)!;
              if (sim.upgrade(t.id)) break;
              if (t.level >= 3 && !t.evo && sim.evolve(t.id, TOWER_EVOLUTIONS[t.type][b[1]])) break;
            }
          if (sim.state.boonOffers.length) sim.chooseBoon(0);
          sim.step();
          if (sim.state.gold > last) earned += sim.state.gold - last;
          last = sim.state.gold;
        }
        const s = sim.state;
        const dmg = Object.entries(s.stats.damageByTower).filter(([, v]) => v > 0).map(([k, v]) => `${k}:${Math.round(v / 1000)}k`).join(' ');
        const reac = Object.entries(s.stats.reactions).filter(([, v]) => v > 0).map(([k, v]) => `${k}:${v}`).join(' ');
        console.log('BUILD', name, st, s.result === 'won' ? `W${s.lives}` : `L${s.wave}`, `sobra $${Math.round(s.gold)} de $${Math.round(earned)}`, '|', dmg, '|', reac);
      }
    }
  });
});

/**
 * Calibration: a stage is right when 3 evolved towers LOSE and a full evolved defence wins with some scars
 * and little gold left. HP_SCALE tries a multiplier on monster life before it goes into src/data/stages.ts.
 */
describe.runIf(process.env.npm_lifecycle_event === 'probe')('calibration', () => {
  it('3 towers vs full defence', () => {
    const scale = Number(process.env.HP_SCALE ?? '1');
    const three: TowerId[][] = [['storm', 'frost', 'brazier'], ['brazier', 'vine', 'frost'], ['frost', 'storm', 'archer']];
    const full: TowerId[] = ['frost', 'storm', 'brazier', 'vine', 'frost', 'storm', 'brazier', 'vine', 'archer', 'storm', 'frost', 'brazier', 'vine', 'archer'];
    for (const st of ['v5', 'a1', 'a2', 'a3', 'a4', 'a5', 'c1', 'c2', 'c3', 'c4', 'c5'] as StageId[]) {
      const few = three.flatMap((plan) => [0, 1].map((br) => fewTowers(st, plan, 1, scale, br as 0 | 1, {}, 'priest').sim.state));
      const fewTxt = few.map((s) => (s.result === 'won' ? `W${s.lives}` : `L${s.wave}`)).join(',');
      const fl = [1, 2].map((seed) => fewTowers(st, full, seed, scale, 0, {}, 'mage', true).sim.state);
      const flTxt = fl.map((s) => (s.result === 'won' ? `W${s.lives}` : `L${s.wave}`) + `/$${Math.round(s.gold)}/t${s.towers.length}`).join(' ');
      console.log('CAL', st, '3 torres:', fewTxt, '| cheio:', flTxt);
    }
  });
});

describe.runIf(process.env.npm_lifecycle_event === 'probe')('expedition probe', () => {
  it('3 legs with carried boons', () => {
    const plans: Record<string, TowerId[]> = {
      tres: ['frost', 'brazier', 'storm'],
      cheio: ['vine', 'brazier', 'frost', 'storm', 'brazier', 'vine', 'frost', 'storm', 'archer', 'brazier'],
    };
    const routes: StageId[][] = [['v5', 'a1', 'a3'], ['a1', 'a3', 'c3'], ['v3', 'v4', 'v5'], ['a3', 'c3', 'c5']];
    const mults = (process.env.EXP_HP ?? '1,1.2,1.45').split(',').map(Number);
    for (const [name, plan] of Object.entries(plans)) {
      for (const route of routes) {
        for (const seed of [1, 2]) {
          let boons: string[] = [];
          let lives = 20;
          const out: string[] = [];
          for (let leg = 0; leg < 3; leg++) {
            const { sim } = fewTowers(route[leg]!, plan, seed + leg, mults[leg]!, 0, { boons, lives });
            out.push(`${route[leg]}:${sim.state.result === 'won' ? 'W' + sim.state.lives : 'L' + sim.state.wave}/$${Math.round(sim.state.gold)}/b${sim.state.boons.length}`);
            if (sim.state.result !== 'won') break;
            boons = [...sim.state.boons];
            lives = sim.state.lives;
          }
          console.log('EXP', name, out.join('  ->  '));
        }
      }
    }
  });
});

describe.runIf(process.env.npm_lifecycle_event === 'probe')('few towers probe', () => {
  it('3 evolved towers', () => {
    const plans: TowerId[][] = [
      ['frost', 'brazier', 'storm'],
      ['vine', 'brazier', 'frost'],
      ['frost', 'storm', 'archer'],
    ];
    for (const st of ['v5', 'a1', 'a2', 'a3', 'a4', 'a5', 'c1', 'c3', 'c5'] as StageId[]) {
      for (const hp of [1, 1.45]) {
        const out = plans.map((plan) => {
          const r = [1, 2].map((seed) => {
            const { sim, peak } = fewTowers(st, plan, seed, hp);
            return (sim.state.result === 'won' ? `W${sim.state.lives}` : `L${sim.state.wave}`) + `/$${Math.round(sim.state.gold)}(pico ${Math.round(peak)})`;
          });
          return plan.map((p) => p[0]).join('') + ':' + r.join(' ');
        });
        console.log(st, '×' + hp, out.join('  |  '));
      }
    }
  });
});
