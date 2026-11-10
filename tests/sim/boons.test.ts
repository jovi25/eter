import { describe, expect, it } from 'vitest';
import { BOON_IDS, BOONS, type BoonId } from '../../src/data/boons';
import { RIFT, STAGES } from '../../src/data/stages';
import { TOWERS } from '../../src/data/towers';
import { Simulation } from '../../src/sim/simulation';
import { dummy, newSim, record, runSeconds } from '../helpers';

function finishSpawning(sim: Simulation): void {
  while (sim.state.wavePhase === 'spawning') sim.step();
}

/** Force a specific boon as the only pending offer and take it. */
function give(sim: Simulation, id: BoonId): void {
  sim.state.boonOffers.unshift([id]);
  expect(sim.chooseBoon(0)).toBe(true);
}

describe('Bênçãos de Éter', () => {
  it('offers 3 distinct boons when waves 2, 5 and 8 finish arriving', () => {
    const sim = newSim();
    const offers = record(sim, 'boonOffered');
    for (let w = 1; w <= 8; w++) {
      sim.callNextWave();
      finishSpawning(sim);
    }
    expect(offers).toHaveLength(3);
    for (const o of offers) {
      expect(o.payload.options).toHaveLength(3);
      expect(new Set(o.payload.options).size).toBe(3);
    }
    expect(sim.state.boonOffers).toHaveLength(3);
  });

  it('same seed → same offers; choosing removes the offer and records the boon', () => {
    const roll = (seed: number) => {
      const sim = newSim({}, seed);
      sim.callNextWave();
      finishSpawning(sim);
      sim.callNextWave();
      finishSpawning(sim);
      return sim;
    };
    const a = roll(5);
    const b = roll(5);
    expect(a.state.boonOffers).toEqual(b.state.boonOffers);
    const picked = a.state.boonOffers[0]![1]!;
    expect(a.chooseBoon(1)).toBe(true);
    expect(a.state.boons).toEqual([picked]);
    expect(a.state.boonOffers).toHaveLength(0);
    expect(a.chooseBoon(0)).toBe(false);
  });

  it('every boon applies without breaking the match', () => {
    for (const id of BOON_IDS) {
      const sim = newSim();
      give(sim, id);
      sim.state.gold = 5000;
      sim.build(1, 'storm');
      sim.build(2, 'brazier');
      sim.callNextWave();
      runSeconds(sim, 12);
      expect(sim.state.result, id).toBe('playing');
      expect(BOONS[id].desc.length, id).toBeGreaterThan(5);
    }
  });

  it('instant boons: gold and lives', () => {
    const sim = newSim();
    give(sim, 'treasure');
    expect(sim.state.gold).toBe(120 + 150);
    give(sim, 'heart');
    expect(sim.state.lives).toBe(24);
  });

  it('stacking and specific effects', () => {
    const sim = newSim();
    give(sim, 'stormHeart');
    give(sim, 'boltMastery');
    expect(sim.mods.chainBonus).toBe(4);
    sim.state.gold = 1000;
    const t = sim.build(1, 'storm')!;
    for (let d = 300; d <= 620; d += 40) dummy(sim, d);
    const bolts = record(sim, 'chainLightning');
    sim.step();
    expect(bolts[0]!.payload.points.length - 1).toBe((TOWERS.storm.levels[0].chainCount ?? 0) + 4);

    give(sim, 'bargain');
    expect(sim.upgradeCost(t)).toBe(Math.round(TOWERS.storm.levels[1].cost * 0.75));

    give(sim, 'absoluteZero');
    const e = dummy(sim, 900);
    sim.applyHit(e, { element: 'ice', damage: 1 });
    sim.applyHit(e, { element: 'ice', damage: 1 });
    expect(e.frozenTime).toBeGreaterThan(0);
  });

  it('bounty raises kill gold', () => {
    const sim = newSim();
    give(sim, 'bounty');
    const e = sim.spawnEnemy('slime', { dist: 300, hp: 1 });
    const before = sim.state.gold;
    sim.applyHit(e, { element: 'arcane', damage: 5 });
    expect(sim.state.gold - before).toBe(Math.round(e.gold * 1.3));
  });
});

describe('lightning reactions', () => {
  it('Queimando + Raio = SOBRECARGA: ×1,5 and 60% splash to neighbours', () => {
    const sim = newSim();
    const e = dummy(sim, 500);
    const near = dummy(sim, 540);
    const far = dummy(sim, 800);
    sim.applyHit(e, { element: 'fire', damage: 1, burnDps: 1 });
    const hits = record(sim, 'enemyHit');
    const reacts = record(sim, 'reactionTriggered');
    sim.applyHit(e, { element: 'lightning', damage: 100 });
    expect(reacts.map((r) => r.payload.reaction)).toEqual(['overload']);
    expect(hits.find((h) => h.payload.enemyId === e.id)!.payload.damage).toBe(150);
    expect(hits.find((h) => h.payload.enemyId === near.id)!.payload.damage).toBe(90);
    expect(far.hp).toBe(far.maxHp);
    expect(e.burnTime).toBe(0);
  });

  it('Resfriado + Raio = SUPERCONDUÇÃO: Frágil on the target and neighbours', () => {
    const sim = newSim();
    const e = dummy(sim, 500);
    const near = dummy(sim, 540);
    sim.applyHit(e, { element: 'ice', damage: 1 });
    const reacts = record(sim, 'reactionTriggered');
    sim.applyHit(e, { element: 'lightning', damage: 10 });
    expect(reacts.map((r) => r.payload.reaction)).toEqual(['superconduct']);
    expect(e.fragileTime).toBeGreaterThan(0);
    expect(near.fragileTime).toBeGreaterThan(0);
    expect(e.chillStacks).toBe(0);
  });
});

describe('Gosma Dourada', () => {
  it('costs no lives when it escapes and pays well when caught', () => {
    const sim = newSim();
    const t = sim.spawnEnemy('treasure', { dist: sim.path.length - 5 });
    runSeconds(sim, 0.3);
    expect(t.alive).toBe(false);
    expect(sim.state.lives).toBe(20);
    const t2 = sim.spawnEnemy('treasure', { dist: 300, hp: 1 });
    const before = sim.state.gold;
    sim.applyHit(t2, { element: 'arcane', damage: 5 });
    expect(sim.state.gold - before).toBeGreaterThanOrEqual(40);
  });
});

describe('Fenda Infinita', () => {
  it('has many formula-built waves that get harder, with bosses on a schedule', () => {
    const waves = STAGES.rift.waves;
    expect(waves).toHaveLength(RIFT.waves);
    const size = (i: number) => waves[i]!.groups.reduce((s, g) => s + g.count, 0);
    expect(size(19)).toBeGreaterThan(size(0));
    expect(waves[9]!.groups.some((g) => g.enemy === 'herald')).toBe(true);
    expect(waves[4]!.groups.some((g) => g.enemy === 'colossus')).toBe(true);
  });

  it('runs: an undefended Rift is lost within the first waves', () => {
    const sim = new Simulation({ stage: 'rift', seed: 1 });
    for (let i = 0; i < 30 * 400 && sim.state.result === 'playing'; i++) sim.step();
    expect(sim.state.result).toBe('lost');
    expect(sim.state.wave).toBeLessThan(10);
  });
});
