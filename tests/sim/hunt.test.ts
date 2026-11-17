declare const process: { env: Record<string, string | undefined> };
import { describe, expect, it } from 'vitest';
import { SIM_TICKS_PER_SECOND } from '../../src/data/config';
import { ENEMIES } from '../../src/data/enemies';
import { TOWER_EVOLUTIONS } from '../../src/data/evolutions';
import { HUNT, huntTime } from '../../src/data/hunt';
import { MAPS } from '../../src/data/maps';
import { MUTATION_ORDER, MUTATIONS, MUTANT, daysLeft, weekIndex, weekMutation, weekStages, type MutationId } from '../../src/data/mutations';
import { STAGE_ORDER, STAGES, type StageId } from '../../src/data/stages';
import { TOWERS, type TowerId } from '../../src/data/towers';
import { SaveStore } from '../../src/meta/save';
import { Simulation } from '../../src/sim/simulation';
import { runSeconds } from '../helpers';

function memory(): Pick<Storage, 'getItem' | 'setItem'> {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) };
}

function killAll(sim: Simulation): void {
  for (const e of sim.state.enemies) if (e.alive) e.hp = 1;
  sim.state.towers.length = 0;
  // A strong hit on everyone ends the wave.
  for (const e of [...sim.state.enemies]) if (e.alive) (sim as unknown as { dealDamage: (e: unknown, d: number, el: string, o: object) => void }).dealDamage(e, 1e9, 'arcane', {});
}

describe('Caçada de Chefes', () => {
  it('one wave per boss, in campaign order, on the Arena', () => {
    const st = STAGES.hunt;
    expect(st.hunt).toBe(true);
    expect(st.waves.length).toBe(HUNT.bosses.length);
    st.waves.forEach((w, i) => expect(w.groups[0]!.enemy).toBe(HUNT.bosses[i]!.boss));
    for (const b of HUNT.bosses) expect(ENEMIES[b.boss].boss, b.boss).toBeDefined();
    expect(MAPS[st.map].slots.length).toBeGreaterThanOrEqual(10);
  });

  it('is cut to the bosses already beaten', () => {
    const sim = new Simulation({ stage: 'hunt', seed: 1, waves: 2 });
    expect(sim.state.totalWaves).toBe(2);
  });

  it('the next boss waits until the last one falls; then bounty, breather and shop', () => {
    const sim = new Simulation({ stage: 'hunt', seed: 3, waves: 3 });
    sim.callNextWave();
    while (sim.state.wavePhase === 'spawning') sim.step();
    expect(sim.state.wavePhase).toBe('fight');
    expect(sim.callNextWave()).toBe(false);
    runSeconds(sim, 1);
    expect(sim.state.wave).toBe(1);
    expect(sim.state.shop).toBeNull();
    const gold = sim.state.gold;
    killAll(sim);
    sim.step();
    expect(sim.state.wavePhase).toBe('countdown');
    expect(sim.state.nextWaveTimer).toBeGreaterThan(HUNT.breather - 1);
    expect(sim.state.gold).toBeGreaterThanOrEqual(gold + HUNT.bounty);
    expect(sim.state.shop?.items.length).toBe(3);
    expect(sim.state.boonOffers.length).toBe(0); // no free Bênçãos in the Caçada
  });

  it('the shop sells Bênçãos for gold, each once', () => {
    const sim = new Simulation({ stage: 'hunt', seed: 3, waves: 3 });
    sim.callNextWave();
    while (sim.state.wavePhase === 'spawning') sim.step();
    killAll(sim);
    sim.step();
    const item = sim.state.shop!.items[0]!;
    sim.state.gold = item.cost + 5;
    expect(sim.buyShop(0)).toBe(true);
    expect(sim.state.gold).toBeLessThanOrEqual(5 + 1000); // some boons give gold back, never the price
    expect(sim.state.boons).toContain(item.boon);
    expect(sim.buyShop(0)).toBe(false);
    sim.state.gold = 0;
    expect(sim.buyShop(1)).toBe(false);
    sim.closeShop();
    expect(sim.state.shop).toBeNull();
  });

  it('the clock starts with the first boss', () => {
    const sim = new Simulation({ stage: 'hunt', seed: 1, waves: 2 });
    runSeconds(sim, 2);
    expect(sim.state.runTime).toBe(0);
    sim.callNextWave();
    runSeconds(sim, 3);
    expect(sim.state.runTime).toBeCloseTo(3, 0);
    expect(huntTime(125.7)).toBe('2:05');
  });

  it('save: opens with 2 bosses beaten, record keeps the best time (more bosses always wins)', () => {
    const save = new SaveStore(memory());
    expect(save.isUnlocked('hunt')).toBe(false);
    save.recordResult('v5', true, 3);
    expect(save.huntBosses()).toBe(1);
    expect(save.isUnlocked('hunt')).toBe(false);
    save.recordResult('a3', true, 1);
    expect(save.huntBosses()).toBe(2);
    expect(save.isUnlocked('hunt')).toBe(true);
    expect(save.recordHunt(2, 200)).toBe(true);
    expect(save.recordHunt(2, 250)).toBe(false);
    expect(save.recordHunt(2, 180)).toBe(true);
    expect(save.recordHunt(3, 400)).toBe(true);
    expect(save.data.hunt).toEqual({ bosses: 3, best: 400 });
    expect(save.recordResult('hunt', true, 3)).toBe(false); // no stars for the Caçada
  });
});

describe('Semana Mutante', () => {
  it('weeks start on Monday and the rule rotates without repeating', () => {
    const mon = new Date(2026, 10, 16); // Monday
    const sun = new Date(2026, 10, 22);
    const nextMon = new Date(2026, 10, 23);
    expect(weekIndex(sun)).toBe(weekIndex(mon));
    expect(weekIndex(nextMon)).toBe(weekIndex(mon) + 1);
    expect(weekMutation(weekIndex(mon))).not.toBe(weekMutation(weekIndex(nextMon)));
    expect(daysLeft(mon)).toBe(7);
    expect(daysLeft(sun)).toBe(1);
    expect(new Set(MUTATION_ORDER).size).toBe(Object.keys(MUTATIONS).length);
  });

  it('3 stages from the won ones, spread over regions, same week → same stages', () => {
    const won = STAGE_ORDER.slice(0, 12);
    const a = weekStages(100, won, STAGE_ORDER);
    expect(a.length).toBe(MUTANT.stages);
    expect(new Set(a.map((s) => s[0])).size).toBe(3);
    expect(weekStages(100, won, STAGE_ORDER)).toEqual(a);
    for (const s of a) expect(won).toContain(s);
  });

  it('save: the week is fixed when first seen; each stage pays once per week', () => {
    const save = new SaveStore(memory());
    for (const id of STAGE_ORDER.slice(0, 5)) save.recordResult(id, true, 3);
    const now = new Date(2026, 10, 17);
    const w = save.mutantWeek(now);
    expect(w.stages.length).toBe(3);
    save.recordResult('a1', true, 3); // winning more stages mid-week does not change the list
    expect(save.mutantWeek(now).stages).toEqual(w.stages);
    expect(save.recordMutant(w.stages[0]!, now)).toBe(true);
    expect(save.recordMutant(w.stages[0]!, now)).toBe(false);
    expect(save.mutantWeek(now).won).toEqual([w.stages[0]]);
    const next = new Date(2026, 10, 24);
    expect(save.mutantWeek(next).won).toEqual([]);
  });

  it('Liquidação: half price, no selling', () => {
    const sim = new Simulation({ stage: 'v3', seed: 1, mutation: 'sale' });
    expect(sim.buildCost('archer')).toBe(Math.round(TOWERS.archer.levels[0].cost / 2));
    const t = sim.build(0, 'archer')!;
    expect(sim.upgradeCost(t)).toBe(Math.round(TOWERS.archer.levels[1]!.cost / 2));
    expect(sim.canSell()).toBe(false);
    expect(sim.sell(t.id)).toBe(false);
  });

  it('Gigantes and Enxame change the monsters; Pressa speeds everyone up', () => {
    const base = new Simulation({ stage: 'v3', seed: 1 });
    const big = new Simulation({ stage: 'v3', seed: 1, mutation: 'giants' });
    const hp = (s: Simulation) => s.spawnEnemy('slime', { wave: 1 }).maxHp;
    expect(hp(big)).toBeGreaterThan(hp(base) * 1.8);
    expect(big.mods.enemyScale).toBeGreaterThan(1);
    const count = (s: Simulation) => {
      s.callNextWave();
      while (s.state.wavePhase === 'spawning') s.step();
      return s.state.enemies.filter((e) => e.type !== 'treasure').length + s.state.stats.kills;
    };
    const swarm = new Simulation({ stage: 'v3', seed: 1, mutation: 'swarm' });
    expect(count(swarm)).toBe(count(new Simulation({ stage: 'v3', seed: 1 })) * 2);
    const fast = new Simulation({ stage: 'v3', seed: 1, mutation: 'haste' });
    expect(fast.mods.enemySpeedMult).toBeGreaterThan(1);
    expect(fast.mods.towerRateMult).toBeGreaterThan(1);
  });

  it('Alquimia Pura: plain hits are weak, reactions hit much harder', () => {
    const sim = new Simulation({ stage: 'v3', seed: 1, mutation: 'alchemy' });
    const e = sim.spawnEnemy('golem', { wave: 1, hp: 10000 });
    sim.applyHit(e, { damage: 100, element: 'fire' });
    expect(10000 - e.hp).toBeCloseTo(25, 0);
  });

  it('Céu Louco: every wave has a weather', () => {
    const sim = new Simulation({ stage: 'v3', seed: 7, mutation: 'wildsky' });
    for (let w = 1; w <= sim.state.totalWaves; w++) expect(sim.stage.weather?.[w], `wave ${w}`).toBeDefined();
  });
});

/** Robot for the Caçada: builds the plan, levels it up, buys the cheapest Bênção it can, calls the next boss at once. */
export function huntRobot(plan: TowerId[], bosses: number, seed: number, branch: 0 | 1 = 0, mutation?: MutationId, stage: StageId = 'hunt') {
  const sim = new Simulation({ stage, seed, waves: stage === 'hunt' ? bosses : undefined, mutation, modifiers: { heroClass: 'priest' } });
  const order = sim.slots
    .map((s, i) => {
      let n = 0;
      for (const p of sim.paths) for (let d = 0; d < p.length; d += 8) if (Math.hypot(p.pointAt(d).x - s.x, p.pointAt(d).y - s.y) <= 170) n++;
      return { i, n };
    })
    .sort((a, b) => b.n - a.n)
    .map((c) => c.i);
  while (sim.state.result === 'playing' && sim.state.tick < 1200 * SIM_TICKS_PER_SECOND) {
    const n = sim.state.towers.length;
    if (n < plan.length) sim.build(order[n]!, plan[n]!);
    else
      for (const t of sim.state.towers) {
        if (sim.upgrade(t.id)) break;
        if (t.level >= 3 && !t.evo && sim.evolve(t.id, TOWER_EVOLUTIONS[t.type][branch])) break;
      }
    if (sim.state.shop) {
      const items = sim.state.shop.items.map((it, i) => ({ ...it, i })).sort((a, b) => a.cost - b.cost);
      if (items[0] && sim.state.towers.every((t) => t.evo)) sim.buyShop(items[0].i);
      sim.closeShop();
      if (stage === 'hunt') sim.callNextWave();
    }
    if (sim.state.boonOffers.length) sim.chooseBoon(0);
    sim.step();
  }
  return sim;
}

describe.runIf(process.env.npm_lifecycle_event === 'probe')('Caçada + Mutante probe', () => {
  it('hunt by boss count', () => {
    const plans: Record<string, [TowerId[], 0 | 1]> = {
      '3 torres': [['storm', 'frost', 'brazier'], 0],
      '6 combo': [['frost', 'brazier', 'storm', 'vine', 'frost', 'brazier'], 0],
      '8 combo': [['frost', 'brazier', 'storm', 'vine', 'frost', 'brazier', 'storm', 'archer'], 0],
      '8 constante': [['frost', 'brazier', 'storm', 'vine', 'frost', 'brazier', 'storm', 'archer'], 1],
    };
    for (let bosses = 2; bosses <= 5; bosses++) {
      for (const [name, [plan, br]] of Object.entries(plans)) {
        const res = [1, 2, 3].map((seed) => {
          const s = huntRobot(plan, bosses, seed, br).state;
          return s.result === 'won' ? `W ${huntTime(s.runTime)}` : `L${s.wave}`;
        });
        console.log(`hunt ${bosses} chefes | ${name.padEnd(12)} | ${res.join('  ')}`);
      }
    }
  });
  it('mutations on sample stages', () => {
    const plan: TowerId[] = ['frost', 'brazier', 'storm', 'vine', 'frost', 'brazier', 'storm', 'archer'];
    for (const m of [undefined, ...MUTATION_ORDER]) {
      const row = (['v3', 'v5', 'a2', 'a5', 'c3', 'i2'] as StageId[]).map((st) => {
        const s = huntRobot(plan, 0, 1, 0, m, st).state;
        return `${st}:${s.result === 'won' ? 'W' + s.lives : 'L' + s.wave}`;
      });
      console.log(`${(m ?? 'normal').padEnd(8)} | ${row.join(' ')}`);
    }
  });
});
