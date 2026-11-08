import { describe, expect, it } from 'vitest';
import { BEAR, HEROES, PRIEST } from '../../src/data/heroes';
import type { HeroClass } from '../../src/data/heroes';
import { Simulation } from '../../src/sim/simulation';
import { record, runSeconds } from '../helpers';

/** Stage 1 sim with the given class; hero parked next to the first long road (y=288). */
function sim(cls: HeroClass): Simulation {
  const s = new Simulation({ stage: 'v1', seed: 1, modifiers: { heroClass: cls } });
  s.moveHero(300, 340);
  s.state.hero.x = 300;
  s.state.hero.y = 340;
  return s;
}

describe('Cavaleiro (melee blocker)', () => {
  it('holds up to 2 ground enemies near its post; they stop walking', () => {
    const s = sim('knight');
    const a = s.spawnEnemy('slime', { dist: 400, hp: 10_000 }); // (320,288)
    const b = s.spawnEnemy('slime', { dist: 420, hp: 10_000 });
    const c = s.spawnEnemy('slime', { dist: 440, hp: 10_000 });
    runSeconds(s, 0.5);
    const held = [a, b, c].filter((e) => e.blockedBy === -1);
    expect(held).toHaveLength(2);
    const d0 = held.map((e) => e.dist);
    runSeconds(s, 1);
    expect(held.map((e) => e.dist)).toEqual(d0);
    expect([a, b, c].find((e) => e.blockedBy === 0)!.dist).toBeGreaterThan(440);
  });

  it('is hit back by what it holds, falls, frees them and comes back later', () => {
    const s = sim('knight');
    const boss = s.spawnEnemy('colossus', { dist: 400, hp: 1e6 });
    const died = record(s, 'blockerDied');
    const back = record(s, 'blockerRespawn');
    runSeconds(s, 30);
    expect(died.length).toBeGreaterThan(0);
    expect(boss.blockedBy === 0 || back.length > 0).toBe(true);
    runSeconds(s, HEROES.knight.blocker!.respawn + 1);
    expect(back.length).toBeGreaterThan(0);
  });

  it('never holds flyers', () => {
    const s = sim('knight');
    const bat = s.spawnEnemy('bat', { dist: 400, hp: 10_000 });
    runSeconds(s, 1);
    expect(bat.blockedBy).toBe(0);
  });

  it('Golpe Giratório fires by itself when 2+ enemies are close', () => {
    const s = sim('knight');
    s.spawnEnemy('slime', { dist: 400, hp: 10_000 });
    s.spawnEnemy('slime', { dist: 420, hp: 10_000 });
    const skills = record(s, 'heroSkill');
    runSeconds(s, 1);
    expect(skills[0]!.payload.cls).toBe('knight');
    expect(s.state.hero.catalyzeCooldown).toBeGreaterThan(0);
  });
});

describe('Druida (bear + roots)', () => {
  it('brings a bear that holds enemies', () => {
    const s = sim('druid');
    expect(s.state.summons).toHaveLength(1);
    const bear = s.state.summons[0]!;
    expect(bear.maxHp).toBe(BEAR.hp);
    const e = s.spawnEnemy('slime', { dist: 400, hp: 10_000 });
    runSeconds(s, 1);
    expect(e.blockedBy).toBe(bear.id);
  });

  it('Fúria da Natureza roots a group by itself', () => {
    const s = sim('druid');
    // Keep the bear away so it doesn't grab them first.
    s.state.summons[0]!.postX = 680;
    s.state.summons[0]!.postY = 1100;
    s.state.summons[0]!.x = 680;
    s.state.summons[0]!.y = 1100;
    const es = [380, 400, 420].map((d) => s.spawnEnemy('slime', { dist: d, hp: 10_000 }));
    const skills = record(s, 'heroSkill');
    s.step();
    expect(skills[0]!.payload.cls).toBe('druid');
    expect(es.every((e) => e.rootTime > 0)).toBe(true);
  });
});

describe('Sacerdotisa (tower support)', () => {
  it('towers near her attack faster', () => {
    const count = (cls: HeroClass) => {
      const s = sim(cls);
      s.build(1, 'archer'); // (264,432) — close to the hero at (300,340)
      const e = s.spawnEnemy('slime', { dist: 470, hp: 1e6 });
      e.rootTime = 1e6; // stay in range for the whole measurement
      const shots = record(s, 'towerFired');
      runSeconds(s, 10);
      return shots.length;
    };
    const withPriest = count('priest');
    const withMage = count('mage');
    // Cooldowns tick in 1/30 s steps, so the measured ratio is a bit below the nominal ×1,3.
    expect(withPriest / withMage).toBeGreaterThan(PRIEST.auraRateMult - 0.12);
  });

  it('Bênção blesses nearby towers (+50% damage) when they are fighting', () => {
    const s = sim('priest');
    const t = s.build(1, 'archer')!;
    s.spawnEnemy('slime', { dist: 470, hp: 1e6 });
    const skills = record(s, 'heroSkill');
    s.step();
    expect(skills[0]!.payload.cls).toBe('priest');
    expect(t.blessTime).toBeGreaterThan(0);
  });
});

describe('Arcanista', () => {
  it('casts Catalisar by itself when 2+ enemies are around', () => {
    const s = sim('mage');
    s.spawnEnemy('slime', { dist: 400, hp: 10_000 });
    s.spawnEnemy('slime', { dist: 420, hp: 10_000 });
    const cast = record(s, 'catalyzed');
    s.step();
    expect(cast).toHaveLength(1);
  });

  it('auto-attacks with the weapon element (Fire), which applies Burning', () => {
    const s = sim('mage');
    const e = s.spawnEnemy('slime', { dist: 400, hp: 10_000 });
    s.state.hero.catalyzeCooldown = 99; // keep the skill out of the way
    runSeconds(s, 1);
    expect(e.burnTime).toBeGreaterThan(0);
  });
});
