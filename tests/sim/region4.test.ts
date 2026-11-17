import { describe, expect, it } from 'vitest';
import { ENEMIES } from '../../src/data/enemies';
import { MAPS } from '../../src/data/maps';
import { REGIONS, STAGES } from '../../src/data/stages';
import { WEATHER } from '../../src/data/weather';
import { Simulation } from '../../src/sim/simulation';
import { record, runSeconds } from '../helpers';

/** Start waves until `wave` is the current one (the wave timer does the rest). */
function goToWave(sim: Simulation, wave: number): void {
  while (sim.state.wave < wave) if (!sim.callNextWave()) sim.step();
}

describe('Região 4 — Ilhas do Vazio', () => {
  it('5 tall void maps, each stage with weather', () => {
    for (const id of REGIONS[3]!.stages) {
      const map = MAPS[STAGES[id].map];
      expect(map.theme).toBe('void');
      expect(map.slots.length).toBeGreaterThanOrEqual(10);
      expect(Object.keys(STAGES[id].weather ?? {}).length, id).toBeGreaterThanOrEqual(3);
    }
  });

  it('the forecast shows the next wave weather; it arrives with that wave and ends on its own', () => {
    const sim = new Simulation({ stage: 'i1', seed: 1 }); // rain on waves 3, 7, 10
    const log = record(sim, 'weatherForecast', 'weatherChanged');
    goToWave(sim, 2);
    expect(sim.state.weather.next).toBe('rain');
    expect(log.some((l) => l.kind === 'weatherForecast')).toBe(true);
    goToWave(sim, 3);
    expect(sim.state.weather.kind).toBe('rain');
    expect(sim.state.weather.next).toBeNull();
    runSeconds(sim, WEATHER.rain.duration + 0.1);
    expect(sim.state.weather.kind).toBeNull();
    expect(log.filter((l) => l.kind === 'weatherChanged').map((l) => l.payload.kind)).toEqual(['rain', null]);
  });

  it('rain: fire hits weaker, lightning stronger, nothing burns', () => {
    const sim = new Simulation({ stage: 'i1', seed: 1 });
    goToWave(sim, 3);
    const e = sim.spawnEnemy('slime', { dist: 300, hp: 1e6 });
    const log = record(sim, 'enemyHit');
    sim.applyHit(e, { element: 'fire', damage: 100, burnDps: 20 });
    sim.applyHit(e, { element: 'lightning', damage: 100 });
    expect(log.map((l) => l.payload.damage)).toEqual([60, 130]);
    expect(e.burnTime).toBe(0);
  });

  it('wind: flyers move faster; eclipse: reactions hit twice as hard', () => {
    const calm = new Simulation({ stage: 'i2', seed: 1 });
    const windy = new Simulation({ stage: 'i2', seed: 1 });
    goToWave(windy, 4); // wind on wave 4
    goToWave(calm, 3);
    expect(windy.state.weather.kind).toBe('wind');
    const a = calm.spawnEnemy('bat', { dist: 100, hp: 1e6 });
    const b = windy.spawnEnemy('bat', { dist: 100, hp: 1e6 });
    runSeconds(calm, 1);
    runSeconds(windy, 1);
    expect(b.dist - 100).toBeCloseTo((a.dist - 100) * (WEATHER.wind.flyerSpeed ?? 1), 0);

    const plain = new Simulation({ stage: 'i3', seed: 1 });
    const dark = new Simulation({ stage: 'i3', seed: 1 });
    goToWave(dark, 3); // eclipse on wave 3
    expect(dark.state.weather.kind).toBe('eclipse');
    const hit = (sim: Simulation) => {
      const e = sim.spawnEnemy('slime', { dist: 300, hp: 1e6 });
      for (let i = 0; i < 3; i++) sim.applyHit(e, { element: 'ice', damage: 1 }); // frozen
      const log = record(sim, 'enemyHit');
      sim.applyHit(e, { element: 'lightning', damage: 100 }); // SHATTER
      return log[0]!.payload.damage;
    };
    expect(hit(dark)).toBe(hit(plain) * 2);
  });

  it('Diabrete Ladrão steals gold halfway and runs; caught, it gives back twice as much', () => {
    const sim = new Simulation({ stage: 'i1', seed: 1 });
    const steal = ENEMIES.imp.thief!;
    const len = sim.paths[0]!.length;
    const imp = sim.spawnEnemy('imp', { dist: len * steal.at - 5, hp: 1e6 });
    const gold = sim.state.gold;
    const log = record(sim, 'goldStolen', 'goldRecovered');
    runSeconds(sim, 0.5);
    expect(imp.fleeing).toBe(true);
    expect(imp.stolen).toBe(steal.steal);
    expect(sim.state.gold).toBe(gold - steal.steal);
    // it runs faster now
    const d0 = imp.dist;
    runSeconds(sim, 1);
    expect(imp.dist - d0).toBeCloseTo(ENEMIES.imp.speed * steal.fleeMult, 0);
    // caught: the stolen gold comes back twice, plus its normal bounty
    const before = sim.state.gold;
    sim.applyHit(imp, { element: 'physical', damage: 1e7 });
    expect(sim.state.gold).toBe(before + steal.steal * 2 + ENEMIES.imp.gold);
    expect(log.map((l) => l.kind)).toEqual(['goldStolen', 'goldRecovered']);
  });

  it('a thief that escapes keeps the gold', () => {
    const sim = new Simulation({ stage: 'i1', seed: 1 });
    const len = sim.paths[0]!.length;
    const imp = sim.spawnEnemy('imp', { dist: len * 0.5, hp: 1e6 });
    imp.fleeing = true;
    imp.stolen = 30;
    const gold = sim.state.gold;
    runSeconds(sim, 20);
    expect(imp.alive).toBe(false);
    expect(sim.state.gold).toBe(gold);
  });

  it('Prisma do Vazio changes form at its thresholds: armor resists, weakness hurts', () => {
    const sim = new Simulation({ stage: 'i5', seed: 3 });
    const log = record(sim, 'bossShift');
    const boss = sim.spawnEnemy('prism', { dist: 200 });
    expect(boss.form).toBeGreaterThanOrEqual(0);
    expect(log).toHaveLength(1);
    const fm = ENEMIES.prism.boss!.forms!;
    const f = fm.list[boss.form]!;
    expect(sim.damageMultiplier(boss, f.armor)).toBeCloseTo(1 - fm.armor);
    expect(sim.damageMultiplier(boss, f.weak)).toBeCloseTo(1 + fm.weak);
    expect(sim.damageMultiplier(boss, 'physical')).toBe(1);
    // drop below 75%: the next form takes over (all four are different)
    const seen = new Set([boss.form]);
    for (const at of fm.at.slice(1)) {
      boss.hp = Math.floor(boss.maxHp * at) - 1;
      runSeconds(sim, 0.1);
      seen.add(boss.form);
    }
    expect(seen.size).toBe(4);
    expect(log).toHaveLength(4);
  });

  it('the order of the forms changes from match to match', () => {
    const orders = new Set<string>();
    for (let seed = 1; seed <= 8; seed++) {
      const sim = new Simulation({ stage: 'i5', seed });
      orders.add(sim.spawnEnemy('prism', { dist: 200 }).formOrder.join(''));
    }
    expect(orders.size).toBeGreaterThan(2);
  });
});
