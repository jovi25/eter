import { describe, expect, it } from 'vitest';
import { REACTIONS } from '../../src/data/reactions';
import { STATUS } from '../../src/data/statuses';
import { TOWERS, WIND } from '../../src/data/towers';
import { Simulation } from '../../src/sim/simulation';
import { record, runSeconds } from '../helpers';

const sim = () => new Simulation({ stage: 'gale', seed: 1 });

describe('Torre do Vento (Fase 17)', () => {
  it('a gust pushes the monster back and leaves it Soprado; it cannot be pushed again right away', () => {
    const s = sim();
    const e = s.spawnEnemy('slime', { dist: 500, hp: 1e6 });
    s.applyHit(e, { element: 'wind', damage: 5, push: 30 });
    expect(e.dist).toBe(470);
    expect(e.gustTime).toBe(STATUS.gusted.duration);
    s.applyHit(e, { element: 'wind', damage: 5, push: 30 });
    expect(e.dist).toBe(470); // push lock
    e.pushLock = 0;
    s.applyHit(e, { element: 'wind', damage: 5, push: 30 });
    expect(e.dist).toBe(440);
  });

  it('bosses barely move; a monster held by the hero is not pushed', () => {
    const s = sim();
    const boss = s.spawnEnemy('herald', { dist: 500 });
    s.applyHit(boss, { element: 'wind', damage: 1, push: 40 });
    expect(boss.dist).toBe(500 - 40 * WIND.bossMult);
    const held = s.spawnEnemy('golem', { dist: 600, hp: 1e6 });
    held.blockedBy = -1;
    s.applyHit(held, { element: 'wind', damage: 1, push: 40 });
    expect(held.dist).toBe(600);
  });

  it('LABAREDA: wind on a burning monster blows the fire onto its neighbours', () => {
    const s = sim();
    const a = s.spawnEnemy('slime', { dist: 500, hp: 1e6 });
    const b = s.spawnEnemy('slime', { dist: 530, hp: 1e6 });
    s.applyHit(a, { element: 'fire', damage: 1, burnDps: 10 });
    expect(b.burnTime).toBe(0);
    const log = record(s, 'reactionTriggered');
    s.applyHit(a, { element: 'wind', damage: 10 });
    expect(log[0]!.payload.reaction).toBe('firestorm');
    expect(b.burnTime).toBeGreaterThan(0);
  });

  it('VENDAVAL GELADO: wind on a chilled monster spreads the cold', () => {
    const s = sim();
    const a = s.spawnEnemy('slime', { dist: 500, hp: 1e6 });
    const b = s.spawnEnemy('slime', { dist: 530, hp: 1e6 });
    s.applyHit(a, { element: 'ice', damage: 1 });
    const log = record(s, 'reactionTriggered');
    s.applyHit(a, { element: 'wind', damage: 10 });
    expect(log[0]!.payload.reaction).toBe('galefrost');
    expect(b.chillStacks).toBe(REACTIONS.galefrost.spreadChill);
  });

  it('TORMENTA: lightning on a Soprado monster hits hard and throws it back', () => {
    const s = sim();
    const e = s.spawnEnemy('slime', { dist: 500, hp: 1e6 });
    s.applyHit(e, { element: 'wind', damage: 1 });
    const d0 = e.dist;
    const log = record(s, 'enemyHit');
    s.applyHit(e, { element: 'lightning', damage: 100 });
    expect(log[0]!.payload).toMatchObject({ reaction: 'tempest', damage: 175 });
    expect(e.dist).toBe(d0 - (REACTIONS.tempest.pushBack ?? 0));
    expect(e.gustTime).toBe(0);
  });

  it('the tower fires gusts that push; at level 3 every 4th gust is a Tufão', () => {
    const s = sim();
    s.state.gold = 9999;
    const slot = 0;
    const t = s.build(slot, 'wind')!;
    expect(t).toBeTruthy();
    s.upgrade(t.id);
    s.upgrade(t.id);
    const log = record(s, 'towerAbility');
    const at = s.slots[slot]!;
    // a sturdy target in range, walking
    let near = 0;
    for (let d = 0; d < s.paths[0]!.length; d += 4) {
      const p = s.paths[0]!.pointAt(d);
      if (Math.hypot(p.x - at.x, p.y - at.y) < 130) { near = d; break; }
    }
    const e = s.spawnEnemy('golem', { dist: near + 40, hp: 1e7 });
    runSeconds(s, 6);
    expect(log.some((l) => l.payload.ability === 'gust')).toBe(true);
    expect(e.dist).toBeLessThan(near + 40 + 6 * 50); // pushed back at least a little
    expect(TOWERS.wind.levels[2].push).toBeGreaterThan(0);
  });

  it('Olho do Furacão throws everyone in range back', () => {
    const s = sim();
    s.state.gold = 99999;
    const t = s.build(0, 'wind')!;
    s.upgrade(t.id);
    s.upgrade(t.id);
    expect(s.evolve(t.id, 'hurricane')).toBe(true);
    const at = s.slots[0]!;
    let near = 0;
    for (let d = 0; d < s.paths[0]!.length; d += 4) {
      const p = s.paths[0]!.pointAt(d);
      if (Math.hypot(p.x - at.x, p.y - at.y) < 130) { near = d; break; }
    }
    const foes = [s.spawnEnemy('golem', { dist: near + 30, hp: 1e7 }), s.spawnEnemy('golem', { dist: near + 50, hp: 1e7 })];
    const log = record(s, 'towerUlt');
    runSeconds(s, 4);
    expect(log.length).toBeGreaterThan(0);
    for (const f of foes) expect(f.gustTime > 0 || f.dist < near + 120).toBe(true);
  });
});

describe('Vento always leaves Soprado', () => {
  it('Gelo → Vento → Raio: VENDAVAL GELADO, then TORMENTA', () => {
    const s = new Simulation({ stage: 'gale', seed: 1 });
    const e = s.spawnEnemy('slime', { dist: 500, hp: 1e6 });
    const log = record(s, 'reactionTriggered');
    s.applyHit(e, { element: 'ice', damage: 1 });
    s.applyHit(e, { element: 'wind', damage: 1 });
    expect(e.gustTime).toBeGreaterThan(0);
    s.applyHit(e, { element: 'lightning', damage: 10 });
    expect(log.map((l) => l.payload.reaction)).toEqual(['galefrost', 'tempest']);
  });
});
