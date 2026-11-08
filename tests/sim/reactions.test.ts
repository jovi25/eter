import { describe, expect, it } from 'vitest';
import { dummy, newSim, record, runSeconds } from '../helpers';

const FIRE = { element: 'fire' as const, damage: 10, burnDps: 4 };
const ICE = { element: 'ice' as const, damage: 10 };
const NATURE_ROOT = { element: 'nature' as const, damage: 10, rootChance: 1 };
const NATURE = { element: 'nature' as const, damage: 10, rootChance: 0 };
const PHYS = { element: 'physical' as const, damage: 10 };

function hitsOf(log: ReturnType<typeof record<'enemyHit'>>) {
  return log.map((l) => l.payload);
}

describe('reaction table', () => {
  it('Enraizado + Fogo = INCÊNDIO: ×2 damage and burning spreads within 60px', () => {
    const sim = newSim();
    const e = dummy(sim, 500);
    const near = dummy(sim, 530); // 30px away on the same straight
    const far = dummy(sim, 700); // 200px away
    sim.applyHit(e, NATURE_ROOT);
    expect(e.rootTime).toBeGreaterThan(0);
    const log = record(sim, 'reactionTriggered', 'enemyHit');
    sim.applyHit(e, FIRE);
    expect(log[0]!.kind).toBe('reactionTriggered');
    expect((log[0]!.payload as { reaction: string }).reaction).toBe('wildfire');
    expect((log[1]!.payload as { damage: number }).damage).toBe(20);
    expect(e.rootTime).toBe(0); // aura consumed
    expect(e.burnTime).toBe(0); // the triggering hit does not apply its own aura
    expect(near.burnTime).toBeGreaterThan(0);
    expect(far.burnTime).toBe(0);
  });

  it('Queimando + Natureza = INCÊNDIO', () => {
    const sim = newSim();
    const e = dummy(sim);
    sim.applyHit(e, FIRE);
    expect(e.burnTime).toBeGreaterThan(0);
    const log = record(sim, 'reactionTriggered');
    sim.applyHit(e, NATURE);
    expect(log.map((l) => l.payload.reaction)).toEqual(['wildfire']);
    expect(e.burnTime).toBe(0);
  });

  it('Resfriado + Fogo = DERRETIMENTO: ×1,75 and removes the slow', () => {
    const sim = newSim();
    const e = dummy(sim);
    sim.applyHit(e, ICE);
    expect(e.chillStacks).toBe(1);
    const hits = record(sim, 'enemyHit', 'reactionTriggered');
    sim.applyHit(e, FIRE);
    expect(hits.find((h) => h.kind === 'reactionTriggered')!.payload).toMatchObject({ reaction: 'melt' });
    expect(hits.find((h) => h.kind === 'enemyHit')!.payload).toMatchObject({ damage: 18 }); // 17.5 rounded
    expect(e.chillStacks).toBe(0);
    expect(e.chillTime).toBe(0);
    expect(e.burnTime).toBe(0);
  });

  it('Congelado + Fogo = DERRETIMENTO', () => {
    const sim = newSim();
    const e = dummy(sim);
    sim.applyHit(e, ICE);
    sim.applyHit(e, ICE);
    sim.applyHit(e, ICE);
    expect(e.frozenTime).toBeGreaterThan(0);
    const log = record(sim, 'reactionTriggered');
    sim.applyHit(e, FIRE);
    expect(log.map((l) => l.payload.reaction)).toEqual(['melt']);
    expect(e.frozenTime).toBe(0);
  });

  it('Queimando + Gelo = DERRETIMENTO, and no chill is applied', () => {
    const sim = newSim();
    const e = dummy(sim);
    sim.applyHit(e, FIRE);
    const log = record(sim, 'reactionTriggered');
    sim.applyHit(e, ICE);
    expect(log.map((l) => l.payload.reaction)).toEqual(['melt']);
    expect(e.burnTime).toBe(0);
    expect(e.chillStacks).toBe(0);
  });

  it('Resfriado + Natureza = GEADA ESPINHOSA: double root ignoring immunity + Frágil', () => {
    const sim = newSim();
    const e = dummy(sim);
    e.rootImmuneTime = 1.5; // would normally block a root
    sim.applyHit(e, ICE);
    const log = record(sim, 'reactionTriggered');
    sim.applyHit(e, NATURE);
    expect(log.map((l) => l.payload.reaction)).toEqual(['thornfrost']);
    expect(e.rootTime).toBeCloseTo(2, 5);
    expect(e.fragileTime).toBeGreaterThan(0);
    expect(e.chillStacks).toBe(0);
  });

  it('Congelado + Natureza = GEADA ESPINHOSA', () => {
    const sim = newSim();
    const e = dummy(sim);
    for (let i = 0; i < 3; i++) sim.applyHit(e, ICE);
    const log = record(sim, 'reactionTriggered');
    sim.applyHit(e, NATURE);
    expect(log.map((l) => l.payload.reaction)).toEqual(['thornfrost']);
    expect(e.frozenTime).toBe(0);
    expect(e.rootTime).toBeCloseTo(2, 5);
  });

  it('Enraizado + Gelo = GEADA ESPINHOSA', () => {
    const sim = newSim();
    const e = dummy(sim);
    sim.applyHit(e, NATURE_ROOT);
    const log = record(sim, 'reactionTriggered');
    sim.applyHit(e, ICE);
    expect(log.map((l) => l.payload.reaction)).toEqual(['thornfrost']);
    expect(e.rootTime).toBeCloseTo(2, 5);
    expect(e.fragileTime).toBeGreaterThan(0);
  });

  it('Congelado + Físico = ESTILHAÇO ×1,5', () => {
    const sim = newSim();
    const e = dummy(sim);
    for (let i = 0; i < 3; i++) sim.applyHit(e, ICE);
    const log = record(sim, 'enemyHit', 'reactionTriggered');
    sim.applyHit(e, PHYS);
    expect(log[0]!.payload).toMatchObject({ reaction: 'shatter' });
    expect(log[1]!.payload).toMatchObject({ damage: 15 });
    expect(e.frozenTime).toBe(0);
  });

  it('Físico on a merely Resfriado enemy does not react and keeps the chill', () => {
    const sim = newSim();
    const e = dummy(sim);
    sim.applyHit(e, ICE);
    const log = record(sim, 'reactionTriggered');
    sim.applyHit(e, PHYS);
    expect(log).toHaveLength(0);
    expect(e.chillStacks).toBe(1);
  });

  it('same element only refreshes its aura, never reacts', () => {
    const sim = newSim();
    const e = dummy(sim);
    sim.applyHit(e, FIRE);
    runSeconds(sim, 1);
    const log = record(sim, 'reactionTriggered');
    sim.applyHit(e, FIRE);
    expect(log).toHaveLength(0);
    expect(e.burnTime).toBeCloseTo(3, 5);
  });

  it('Arcano never reacts and never applies auras', () => {
    const sim = newSim();
    const e = dummy(sim);
    sim.applyHit(e, FIRE);
    const log = record(sim, 'reactionTriggered');
    sim.applyHit(e, { element: 'arcane', damage: 10 });
    expect(log).toHaveLength(0);
    expect(e.burnTime).toBeGreaterThan(0);
  });

  it('Herald card: DERRETIMENTO also applies Frágil', () => {
    const plain = newSim();
    const a = dummy(plain);
    plain.applyHit(a, ICE);
    plain.applyHit(a, FIRE);
    expect(a.fragileTime).toBe(0);

    const carded = newSim({ meltAppliesFragile: true });
    const b = dummy(carded);
    carded.applyHit(b, ICE);
    carded.applyHit(b, FIRE);
    expect(b.fragileTime).toBeGreaterThan(0);
  });

  it('reactions are counted in match stats', () => {
    const sim = newSim();
    const e = dummy(sim);
    sim.applyHit(e, ICE);
    sim.applyHit(e, FIRE);
    expect(sim.state.stats.reactions.melt).toBe(1);
    void hitsOf;
  });
});

describe('combo meter', () => {
  it('chained reactions raise the multiplier by 5% each, capped at ×1,5', () => {
    const sim = newSim();
    const e = dummy(sim);
    const mults: number[] = [];
    sim.events.on('reactionTriggered', (r) => mults.push(r.comboMult));
    for (let i = 0; i < 14; i++) {
      sim.applyHit(e, ICE);
      sim.applyHit(e, FIRE); // melt
    }
    expect(mults[0]).toBeCloseTo(1);
    expect(mults[1]).toBeCloseTo(1.05);
    expect(mults[2]).toBeCloseTo(1.1);
    expect(Math.max(...mults)).toBeCloseTo(1.5);
    expect(mults.at(-1)).toBeCloseTo(1.5);
  });

  it('combo damage multiplies reaction damage', () => {
    const sim = newSim();
    const e = dummy(sim);
    const dmg: number[] = [];
    sim.events.on('enemyHit', (h) => h.reaction && dmg.push(h.damage));
    sim.applyHit(e, ICE);
    sim.applyHit(e, { element: 'fire', damage: 100 });
    sim.applyHit(e, ICE);
    sim.applyHit(e, { element: 'fire', damage: 100 });
    expect(dmg).toEqual([175, 184]); // 175 × 1.05 = 183.75
  });

  it('resets after the 2s window passes', () => {
    const sim = newSim();
    const e = dummy(sim);
    const ended = record(sim, 'comboEnded');
    sim.applyHit(e, ICE);
    sim.applyHit(e, FIRE);
    sim.applyHit(e, ICE);
    sim.applyHit(e, FIRE);
    expect(sim.state.combo.count).toBe(2);
    runSeconds(sim, 1.9);
    expect(sim.state.combo.count).toBe(2);
    runSeconds(sim, 0.2);
    expect(sim.state.combo.count).toBe(0);
    expect(ended.map((l) => l.payload.count)).toEqual([2]);
  });
});
