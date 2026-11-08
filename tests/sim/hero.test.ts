import { describe, expect, it } from 'vitest';
import { HERO } from '../../src/data/hero';
import { dummy, newSim, record, runSeconds } from '../helpers';

describe('Arcanista — movement and auto-attack', () => {
  it('walks to a tapped spot at its speed, clamped to the playfield', () => {
    const sim = newSim();
    const h = sim.state.hero;
    sim.moveHero(h.x + HERO.speed, h.y);
    runSeconds(sim, 0.5);
    expect(h.x).toBeCloseTo(HERO.start.x + HERO.speed * 0.5, 0);
    runSeconds(sim, 1);
    expect(h.x).toBeCloseTo(HERO.start.x + HERO.speed, 0);
    expect(h.moving).toBe(false);
    sim.moveHero(-500, 99999);
    expect(h.targetX).toBe(HERO.bounds.minX);
    expect(h.targetY).toBe(HERO.bounds.maxY);
  });

  it('auto-attacks the nearest enemy in range with arcane damage (never reacts)', () => {
    const sim = newSim();
    sim.moveHero(270, 400); // near the y=300 lane
    runSeconds(sim, 1.5);
    const near = dummy(sim, 500); // (270,300)
    dummy(sim, 700); // farther
    sim.applyHit(near, { element: 'fire', damage: 1, burnDps: 1 }); // give it an aura
    const fired = record(sim, 'heroFired');
    const reactions = record(sim, 'reactionTriggered');
    runSeconds(sim, 1);
    expect(fired.length).toBeGreaterThan(0);
    expect(fired[0]!.payload.targetId).toBe(near.id);
    expect(reactions).toHaveLength(0);
    expect(sim.state.stats.heroDamage).toBeGreaterThan(0);
  });

  it('ignores enemies out of range', () => {
    const sim = newSim();
    dummy(sim, 100); // near the portal, far from the hero
    const fired = record(sim, 'heroFired');
    runSeconds(sim, 1);
    expect(fired).toHaveLength(0);
  });
});

describe('Catalisar', () => {
  /** Put the hero on the y=300 lane next to a group of enemies. */
  function setup() {
    const sim = newSim();
    const h = sim.state.hero;
    h.x = h.targetX = 270;
    h.y = h.targetY = 300;
    return sim;
  }

  it('fires reactions on every aura-carrying enemy in the radius (Fire affinity)', () => {
    const sim = setup();
    const rooted = dummy(sim, 500);
    const chilled = dummy(sim, 540);
    const plain = dummy(sim, 460);
    const far = dummy(sim, 900);
    sim.applyHit(rooted, { element: 'nature', damage: 1, rootChance: 1 });
    sim.applyHit(chilled, { element: 'ice', damage: 1 });
    const log = record(sim, 'reactionTriggered');
    const cast = record(sim, 'catalyzed');
    expect(sim.castCatalyze()).toBe(true);
    expect(log.map((l) => l.payload.reaction).sort()).toEqual(['melt', 'wildfire']);
    expect(cast[0]!.payload).toMatchObject({ element: 'fire', hits: 3, reactions: 2 });
    expect(plain.burnTime).toBeGreaterThan(0); // no aura → gets Burning
    expect(far.hp).toBe(far.maxHp);
    expect(sim.state.stats.bestCatalyzeReactions).toBe(2);
  });

  it('has a 12s cooldown', () => {
    const sim = setup();
    expect(sim.castCatalyze()).toBe(true);
    expect(sim.castCatalyze()).toBe(false);
    runSeconds(sim, HERO.catalyze.cooldown - 0.1);
    expect(sim.catalyzeReady()).toBe(false);
    runSeconds(sim, 0.2);
    expect(sim.catalyzeReady()).toBe(true);
  });

  it('every reaction anywhere on the map shortens the cooldown by 0,5s', () => {
    const sim = setup();
    sim.castCatalyze();
    const cd = sim.state.hero.catalyzeCooldown;
    const e = dummy(sim, 1500); // far away, a tower combo there
    for (let i = 0; i < 4; i++) {
      sim.applyHit(e, { element: 'ice', damage: 1 });
      sim.applyHit(e, { element: 'fire', damage: 1 }); // melt
    }
    expect(sim.state.hero.catalyzeCooldown).toBeCloseTo(cd - 4 * HERO.catalyze.cooldownPerReaction, 5);
  });

  it('the reactions Catalisar causes also shorten its own cooldown (the loop)', () => {
    const sim = setup();
    for (const d of [470, 500, 530, 560]) {
      const e = dummy(sim, d);
      sim.applyHit(e, { element: 'ice', damage: 1 });
    }
    sim.castCatalyze();
    expect(sim.state.hero.catalyzeCooldown).toBeCloseTo(HERO.catalyze.cooldown - 4 * HERO.catalyze.cooldownPerReaction, 5);
  });

  it('uses the weapon affinity: Ice Catalisar on burning enemies = DERRETIMENTO', () => {
    const sim = newSim({ heroAffinity: 'ice' });
    const h = sim.state.hero;
    h.x = h.targetX = 270;
    h.y = h.targetY = 300;
    const e = dummy(sim, 500);
    sim.applyHit(e, { element: 'fire', damage: 1, burnDps: 1 });
    const log = record(sim, 'reactionTriggered');
    sim.castCatalyze();
    expect(log.map((l) => l.payload.reaction)).toEqual(['melt']);
  });
});
