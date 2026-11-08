import { describe, expect, it } from 'vitest';
import { ENEMIES } from '../../src/data/enemies';
import { STATUS } from '../../src/data/statuses';
import { dummy, newSim, record, runSeconds } from '../helpers';

const NATURE_ROOT = { element: 'nature' as const, damage: 1, rootChance: 1 };
const ICE = { element: 'ice' as const, damage: 1 };

describe('Enraizado', () => {
  it('stops the enemy for 1s, then grants 2s of root immunity', () => {
    const sim = newSim();
    const e = dummy(sim);
    sim.applyHit(e, NATURE_ROOT);
    const d0 = e.dist;
    runSeconds(sim, 0.9);
    expect(e.dist).toBe(d0); // did not move while rooted
    runSeconds(sim, 0.2);
    expect(e.rootTime).toBe(0);
    expect(e.rootImmuneTime).toBeGreaterThan(1.8);
    expect(e.dist).toBeGreaterThan(d0);

    // Immune: a guaranteed root does nothing.
    sim.applyHit(e, NATURE_ROOT);
    expect(e.rootTime).toBe(0);

    runSeconds(sim, 2);
    expect(e.rootImmuneTime).toBe(0);
    sim.applyHit(e, NATURE_ROOT);
    expect(e.rootTime).toBeGreaterThan(0);
  });

  it('consuming a root through a reaction also starts the immunity', () => {
    const sim = newSim();
    const e = dummy(sim);
    sim.applyHit(e, NATURE_ROOT);
    sim.applyHit(e, { element: 'fire', damage: 1 }); // wildfire
    expect(e.rootImmuneTime).toBeCloseTo(STATUS.rooted.immunityAfter);
    sim.applyHit(e, NATURE_ROOT);
    expect(e.rootTime).toBe(0);
  });

  it('flyers are never rooted, not even by GEADA ESPINHOSA', () => {
    const sim = newSim();
    const bat = dummy(sim, 500, 'bat');
    sim.applyHit(bat, NATURE_ROOT);
    expect(bat.rootTime).toBe(0);
    sim.applyHit(bat, ICE);
    const log = record(sim, 'reactionTriggered');
    sim.applyHit(bat, { element: 'nature', damage: 1 });
    expect(log.map((l) => l.payload.reaction)).toEqual(['thornfrost']);
    expect(bat.rootTime).toBe(0);
    expect(bat.fragileTime).toBeGreaterThan(0);
  });

  it('equipment bonus lengthens the root', () => {
    const sim = newSim({ rootDurationBonus: 0.3 });
    const e = dummy(sim);
    sim.applyHit(e, NATURE_ROOT);
    expect(e.rootTime).toBeCloseTo(1.3);
  });
});

describe('Resfriado / Congelado', () => {
  it('slows by 30% and the 3rd stack freezes for 1s', () => {
    const sim = newSim();
    const free = dummy(sim, 400);
    const cold = dummy(sim, 600);
    sim.applyHit(cold, ICE);
    const f0 = free.dist;
    const c0 = cold.dist;
    runSeconds(sim, 1);
    const freeMoved = free.dist - f0;
    const coldMoved = cold.dist - c0;
    expect(coldMoved / freeMoved).toBeCloseTo(0.7, 2);

    sim.applyHit(cold, ICE);
    sim.applyHit(cold, ICE);
    expect(cold.frozenTime).toBeCloseTo(1);
    const c1 = cold.dist;
    runSeconds(sim, 0.9);
    expect(cold.dist).toBe(c1);
  });

  it('chill expires after 2,5s', () => {
    const sim = newSim();
    const e = dummy(sim);
    sim.applyHit(e, ICE);
    runSeconds(sim, 2.4);
    expect(e.chillStacks).toBe(1);
    runSeconds(sim, 0.2);
    expect(e.chillStacks).toBe(0);
  });

  it('equipment can raise the stacks needed to freeze', () => {
    const sim = newSim({ chillMaxStacks: 4 });
    const e = dummy(sim);
    for (let i = 0; i < 3; i++) sim.applyHit(e, ICE);
    expect(e.frozenTime).toBe(0);
    sim.applyHit(e, ICE);
    expect(e.frozenTime).toBeGreaterThan(0);
  });
});

describe('Queimando, Frágil, resistances', () => {
  it('burn deals dps over 3s in 0,5s ticks', () => {
    const sim = newSim();
    const e = dummy(sim);
    const ticks = record(sim, 'enemyHit');
    sim.applyHit(e, { element: 'fire', damage: 1, burnDps: 10 });
    runSeconds(sim, 4);
    const dots = ticks.filter((t) => t.payload.dot);
    expect(dots).toHaveLength(6);
    expect(dots.reduce((s, t) => s + t.payload.damage, 0)).toBe(30);
  });

  it('Frágil makes the enemy take 25% more damage', () => {
    const sim = newSim();
    const e = dummy(sim);
    e.fragileTime = 1;
    const log = record(sim, 'enemyHit');
    sim.applyHit(e, { element: 'arcane', damage: 100 });
    expect(log[0]!.payload.damage).toBe(125);
  });

  it('Golem takes 40% less physical damage, unless the Golem card is equipped', () => {
    const sim = newSim();
    const g = dummy(sim, 500, 'golem');
    const log = record(sim, 'enemyHit');
    sim.applyHit(g, { element: 'physical', damage: 100 });
    sim.applyHit(g, { element: 'fire', damage: 100 });
    expect(log.map((l) => l.payload.damage)).toEqual([60, 100]);

    const carded = newSim({ physicalIgnoresResist: true });
    const g2 = dummy(carded, 500, 'golem');
    const log2 = record(carded, 'enemyHit');
    carded.applyHit(g2, { element: 'physical', damage: 100 });
    expect(log2[0]!.payload.damage).toBe(100);
  });
});

describe('targeting', () => {
  it('Vinha cannot target flyers unless the Bat card is equipped', () => {
    const sim = newSim();
    const vine = sim.build(1, 'vine')!; // slot at (250,430)
    dummy(sim, 600, 'bat'); // on y=300 near x=170
    expect(sim.findTarget(vine)).toBeNull();

    const carded = newSim({ vineHitsFlying: true });
    const v2 = carded.build(1, 'vine')!;
    dummy(carded, 600, 'bat');
    expect(carded.findTarget(v2)).not.toBeNull();
  });

  it('towers pick the enemy furthest along the path', () => {
    const sim = newSim();
    const archer = sim.build(1, 'archer')!;
    dummy(sim, 440);
    const ahead = dummy(sim, 480);
    expect(sim.findTarget(archer)!.id).toBe(ahead.id);
  });

  it('a tower actually kills an enemy with projectiles', () => {
    const sim = newSim();
    sim.build(1, 'archer');
    const e = sim.spawnEnemy('slime', { dist: 520, hp: 30 });
    const killed = record(sim, 'enemyKilled');
    runSeconds(sim, 3);
    expect(e.alive).toBe(false);
    expect(killed).toHaveLength(1);
  });

  it('Braseiro splash burns nearby enemies too', () => {
    const sim = newSim();
    sim.build(1, 'brazier');
    const a = dummy(sim, 520);
    const b = dummy(sim, 540);
    runSeconds(sim, 1);
    expect(a.burnTime).toBeGreaterThan(0);
    expect(b.burnTime).toBeGreaterThan(0);
  });
});

describe('Chefe MVP — Arauto da Geada', () => {
  it('every 6s becomes immune to Resfriado for 2s and summons 3 Gosmas', () => {
    const sim = newSim();
    const boss = sim.spawnEnemy('herald', { dist: 300 });
    const abilities = record(sim, 'bossAbility');
    runSeconds(sim, 5.9);
    expect(sim.state.enemies).toHaveLength(1);
    runSeconds(sim, 0.2);
    expect(abilities).toHaveLength(1);
    expect(sim.state.enemies.filter((e) => e.type === 'slime')).toHaveLength(ENEMIES.herald.boss!.summon.count);
    sim.applyHit(boss, ICE);
    expect(boss.chillStacks).toBe(0);
    runSeconds(sim, 2);
    sim.applyHit(boss, ICE);
    expect(boss.chillStacks).toBe(1);
  });
});
