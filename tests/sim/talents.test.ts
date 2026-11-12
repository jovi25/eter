import { describe, expect, it } from 'vitest';
import { HEROES, PRIEST } from '../../src/data/heroes';
import type { HeroClass } from '../../src/data/heroes';
import { HERO_LEVELS, heroLevel, matchXp, TALENT_IDS, TALENT_NUM, TALENTS, talentsOf, type TalentId } from '../../src/data/talents';
import { migrate, SaveStore } from '../../src/meta/save';
import { Simulation } from '../../src/sim/simulation';
import { record, runSeconds } from '../helpers';

function sim(cls: HeroClass, talent: TalentId | null = null, skill2 = false): Simulation {
  const s = new Simulation({ stage: 'v1', seed: 1, modifiers: { heroClass: cls, heroTalent: talent, heroSkill2: skill2 } });
  s.moveHero(300, 340);
  s.state.hero.x = 300;
  s.state.hero.y = 340;
  return s;
}

function memStore(): SaveStore {
  const mem = new Map<string, string>();
  return new SaveStore({ getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => void mem.set(k, v) });
}

describe('hero levels and save (v7)', () => {
  it('levels follow the XP table; a won 10-wave stage gives 15 XP', () => {
    expect(heroLevel(0)).toBe(1);
    expect(heroLevel(HERO_LEVELS.xp[1]!)).toBe(2);
    expect(heroLevel(1e6)).toBe(HERO_LEVELS.xp.length);
    expect(matchXp(10, true)).toBe(15);
  });

  it('every hero has 3 talents, unlocked at levels 2, 3 and 4', () => {
    for (const cls of Object.keys(HEROES) as HeroClass[]) expect(talentsOf(cls).map((id) => TALENTS[id].level)).toEqual([2, 3, 4]);
    expect(TALENT_IDS).toHaveLength(12);
  });

  it('veterans start with XP from their stars; locked talents cannot be equipped', () => {
    const s = migrate({ version: 6, createdAt: 1, stages: { v1: { stars: 3, wins: 1 } }, hero: 'mage' });
    expect(s.heroes.knight.xp).toBe(21); // 3 stars × 7
    const store = memStore();
    expect(store.setTalent('knight', 'wall')).toBe(false); // level 1
    store.addHeroXp('knight', HERO_LEVELS.xp[1]!);
    expect(store.setTalent('knight', 'wall')).toBe(true);
    expect(store.setTalent('knight', 'duelist')).toBe(false); // level 3 talent
    expect(store.setTalent('knight', 'choir')).toBe(false); // other hero's talent
    expect(store.heroMods('knight').heroTalent).toBe('wall');
    expect(store.heroMods('knight').heroSkill2).toBe(false);
    expect(store.setWeapon('sap')).toBe(false);
  });

  it('a saved talent above the hero level is dropped on load', () => {
    const s = migrate({ version: 7, createdAt: 1, stages: {}, hero: 'mage', heroes: { mage: { xp: 0, talent: 'comboPact' } } });
    expect(s.heroes.mage.talent).toBeNull();
  });
});

describe('talents change how heroes play', () => {
  it('Muralha: 4 held, more hp, weaker hits', () => {
    const s = sim('knight', 'wall');
    expect(s.state.hero.maxHp).toBe(HEROES.knight.blocker!.hp * TALENT_NUM.wall.hpMult);
    const es = [400, 415, 430, 445, 460].map((d) => s.spawnEnemy('slime', { dist: d, hp: 10_000 }));
    runSeconds(s, 0.6);
    expect(es.filter((e) => e.blockedBy === -1)).toHaveLength(4);
  });

  it('Duelista: holds only 1', () => {
    const s = sim('knight', 'duelist');
    const es = [400, 420].map((d) => s.spawnEnemy('slime', { dist: d, hp: 10_000 }));
    runSeconds(s, 0.6);
    expect(es.filter((e) => e.blockedBy === -1)).toHaveLength(1);
  });

  it('Disparo Triplo: one attack, three projectiles', () => {
    const s = sim('mage', 'tripleShot');
    s.state.hero.catalyzeCooldown = 99;
    [400, 430, 460].forEach((d) => s.spawnEnemy('slime', { dist: d, hp: 10_000 }));
    s.step();
    expect(s.state.projectiles.filter((p) => p.towerId === 0)).toHaveLength(3);
  });

  it('Catalisador Distante: goes off on the far group, not around the hero', () => {
    const s = sim('mage', 'farCatalyst');
    s.state.hero.x = s.state.hero.targetX = 650;
    s.state.hero.y = s.state.hero.targetY = 1100;
    const es = [400, 415, 430].map((d) => s.spawnEnemy('slime', { dist: d, hp: 10_000 }));
    const ev = record(s, 'catalyzed');
    s.step();
    expect(ev).toHaveLength(1);
    expect(Math.hypot(ev[0]!.payload.x - es[1]!.x, ev[0]!.payload.y - es[1]!.y)).toBeLessThan(40);
  });

  it('Pacto do Combo: each reaction gives back 1.2 s', () => {
    const s = sim('mage', 'comboPact');
    s.state.hero.catalyzeCooldown = 10;
    const e = s.spawnEnemy('slime', { dist: 2000, hp: 10_000 });
    s.applyHit(e, { element: 'fire', damage: 1, burnDps: 1 });
    s.applyHit(e, { element: 'nature', damage: 1 });
    expect(s.state.hero.catalyzeCooldown).toBeCloseTo(10 - TALENT_NUM.comboPact.cooldownPerReaction);
  });

  it('Solo Sedento: rooted enemies take +25%', () => {
    const hit = (t: TalentId | null) => {
      const s = sim('druid', t);
      const e = s.spawnEnemy('slime', { dist: 2000, hp: 10_000 });
      e.rootTime = 5;
      s.applyHit(e, { element: 'physical', damage: 100 });
      return 10_000 - e.hp;
    };
    expect(hit('hungrySoil') / hit(null)).toBeCloseTo(TALENT_NUM.hungrySoil.rootedDamageTaken, 1);
  });

  it('Luz Punitiva removes the speed aura; Coro reaches farther', () => {
    const rateNear = (t: TalentId | null, dx: number) => {
      const s = sim('priest', t);
      const tower = s.build(0, 'archer')!;
      s.state.hero.x = tower.x + dx;
      s.state.hero.y = tower.y;
      return (s as unknown as { towerRateMult(t: unknown): number }).towerRateMult(tower);
    };
    expect(rateNear(null, 50)).toBeCloseTo(PRIEST.auraRateMult);
    expect(rateNear('smite', 50)).toBe(1);
    expect(rateNear(null, 250)).toBe(1);
    expect(rateNear('choir', 250)).toBeCloseTo(TALENT_NUM.choir.auraRateMult);
  });
});

describe('second skill (level 5)', () => {
  it('Graça gives the crystal a life back', () => {
    const s = sim('priest', null, true);
    s.state.lives = 15;
    const ev = record(s, 'heroSkill2');
    runSeconds(s, 20);
    expect(ev.length).toBeGreaterThan(0);
    expect(s.state.lives).toBe(16);
  });

  it('Grito de Guerra makes the enemies around Fragile', () => {
    const s = sim('knight', null, true);
    s.state.hero.skill2Cooldown = 0;
    const es = [400, 420].map((d) => s.spawnEnemy('slime', { dist: d, hp: 10_000 }));
    s.step();
    expect(es.every((e) => e.fragileTime > 0)).toBe(true);
  });

  it('Chuva Elemental hits with the weapon element; nothing without level 5', () => {
    const s = sim('mage', null, true);
    s.state.hero.skill2Cooldown = 0;
    s.state.hero.catalyzeCooldown = 99;
    [400, 420].forEach((d) => s.spawnEnemy('slime', { dist: d, hp: 10_000 }));
    const ev = record(s, 'heroSkill2');
    s.step();
    expect(ev.filter((e) => e.payload.drop)).toHaveLength(6);
    const plain = sim('mage');
    expect(plain.state.hero.skill2Max).toBe(0);
  });
});
