import { describe, expect, it } from 'vitest';
import { BOONS, type BoonDef } from '../../src/data/boons';
import { ECONOMY } from '../../src/data/economy';
import { advanceRun, canVisit, EXPEDITION, legSetup, newRun, PACT_IDS, PACTS, rollNodes, visitRest, type BattleNode, type ExpeditionRun, type TrailCtx } from '../../src/data/expedition';
import { defaultModifiers } from '../../src/data/modifiers';
import { STAGES } from '../../src/data/stages';
import { migrate, SaveStore } from '../../src/meta/save';
import { Simulation } from '../../src/sim/simulation';

const CTX: TrailCtx = { pool: ['v3', 'v4', 'v5', 'a1', 'a2'], bosses: ['v5', 'a3'], unlockedBoons: [] };
const battle = (stage: BattleNode['stage'], pact: BattleNode['pact'], towers?: BattleNode['towers']): BattleNode => ({ kind: 'battle', stage, pact, towers });

function memStorage() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
}

/** A run standing on a rest stop that offers exactly these two kinds. */
function atRest(a: string, b: string): ExpeditionRun {
  for (let seed = 1; seed < 500; seed++) {
    const nodes = rollNodes(seed, 1, CTX);
    if (nodes[0]!.kind === a && nodes[1]!.kind === b) return { seed, leg: 1, lives: 10, boons: [], hero: 'mage', nodes };
  }
  throw new Error('no such rest stop');
}

describe('Expedição de Éter', () => {
  it('the trail is battle, rest, battle, rest, boss', () => {
    expect(EXPEDITION.steps).toEqual(['battle', 'rest', 'battle', 'rest', 'boss']);
    expect(EXPEDITION.legs).toBe(EXPEDITION.steps.length);
    expect(EXPEDITION.hpMult).toHaveLength(EXPEDITION.legs);
    expect(EXPEDITION.coins).toHaveLength(EXPEDITION.legs);
  });

  it('battle stops offer 2 different trails, the same for the same seed', () => {
    for (let seed = 1; seed < 200; seed++) {
      for (const leg of [0, 2]) {
        const r = rollNodes(seed, leg, CTX) as BattleNode[];
        expect(r).toHaveLength(2);
        expect(r.every((n) => n.kind === 'battle')).toBe(true);
        expect(r[0]!.pact).not.toBe(r[1]!.pact);
        expect(r[0]!.stage).not.toBe(r[1]!.stage);
        expect(r.some((n) => n.pact === 'final')).toBe(false);
        expect(rollNodes(seed, leg, CTX)).toEqual(r);
        for (const route of r) {
          if (route.pact !== 'vow') continue;
          expect(route.towers).toHaveLength(3);
          // Never a set that cannot make a reaction.
          expect(['archer', 'storm', 'vine'].every((t) => route.towers!.includes(t as never))).toBe(false);
        }
      }
    }
  });

  it('rest stops offer 2 different kinds; merchants and shrines show different Bênçãos that are not locked', () => {
    for (let seed = 1; seed < 200; seed++) {
      for (const leg of [1, 3]) {
        const r = rollNodes(seed, leg, CTX);
        expect(r).toHaveLength(2);
        expect(r[0]!.kind).not.toBe(r[1]!.kind);
        for (const n of r) {
          expect(n.kind).not.toBe('battle');
          if (n.kind !== 'merchant' && n.kind !== 'shrine') continue;
          expect(n.boons).toHaveLength(n.kind === 'merchant' ? EXPEDITION.merchant.choices : EXPEDITION.shrine.choices);
          expect(new Set(n.boons).size).toBe(n.boons.length);
          for (const id of n.boons) {
            const b = BOONS[id] as BoonDef;
            expect(b.locked ?? false, id).toBe(false);
            if (n.kind === 'shrine') expect(b.rarity).not.toBe('common');
            else expect(b.rarity).not.toBe('epic');
          }
        }
      }
    }
  });

  it('the last stop is one boss stage among the open ones', () => {
    for (let seed = 1; seed < 50; seed++) {
      const r = rollNodes(seed, 4, CTX) as BattleNode[];
      expect(r).toHaveLength(1);
      expect(r[0]!.pact).toBe('final');
      expect(CTX.bosses).toContain(r[0]!.stage);
    }
    expect((rollNodes(1, 4, { pool: [] })[0] as BattleNode).stage).toBe('v5');
    for (const id of EXPEDITION.bossPool) expect(STAGES[id].waves.at(-1)!.groups.length).toBeGreaterThan(0);
  });

  it('works with a single stage in the pool', () => {
    const r = rollNodes(7, 0, { pool: ['v5'] }) as BattleNode[];
    expect(r.map((x) => x.stage)).toEqual(['v5', 'v5']);
  });

  it('every pact has a prize and a price in words', () => {
    for (const id of [...PACT_IDS, 'final' as const]) {
      expect(PACTS[id].good.length).toBeGreaterThan(3);
      expect(PACTS[id].bad.length).toBeGreaterThan(3);
    }
  });

  it('carries lives and Bênçãos into the next battle and makes monsters tougher', () => {
    let run: ExpeditionRun = newRun(5, 'mage', CTX);
    run = advanceRun(run, 13, ['fireMastery', 'overdrive'], CTX);
    expect(run.leg).toBe(1);
    const leg = legSetup(run, battle('v5', 'horde'), defaultModifiers());
    expect(leg.hpMult).toBeCloseTo(EXPEDITION.hpMult[1]! * PACTS.horde.hpMult!);
    const sim = new Simulation({ stage: 'v5', seed: 1, modifiers: leg.modifiers, run: leg });
    expect(sim.state.lives).toBe(13);
    expect(sim.state.boons).toEqual(['fireMastery', 'overdrive']);
    expect(sim.mods.elementDamageMult.fire).toBeGreaterThan(1);
    expect(sim.stage.hpMult).toBeCloseTo(STAGES.v5.hpMult * leg.hpMult);
    // Trilha da Horda: one Bênção to pick before the first wave.
    expect(sim.state.boonOffers).toHaveLength(1);
  });

  it('pacts change gold, lives and the towers allowed', () => {
    const run = newRun(5, 'mage', CTX);
    const purse = legSetup({ ...run, lives: 3 }, battle('v5', 'purse'), defaultModifiers());
    expect(purse.lives).toBe(1); // never below 1
    const base = new Simulation({ stage: 'v5', seed: 1 }).state.gold;
    expect(new Simulation({ stage: 'v5', seed: 1, run: purse }).state.gold).toBe(base + PACTS.purse.gold!);
    const calm = legSetup(run, battle('v5', 'calm'), defaultModifiers());
    expect(calm.lives).toBe(ECONOMY.startLives); // never above the maximum
    const vow = legSetup(run, battle('v5', 'vow', ['brazier', 'frost', 'storm']), defaultModifiers());
    const sim = new Simulation({ stage: 'v5', seed: 1, modifiers: vow.modifiers, run: vow });
    expect(sim.mods.unlockedTowers).toEqual(['brazier', 'frost', 'storm']);
    expect(sim.mods.towerDamageMult.frost).toBeCloseTo(PACTS.vow.towerDamage!);
    expect(sim.mods.towerDamageMult.archer).toBe(1);
  });

  it('Acampamento gives lives back, never above the maximum', () => {
    const run = atRest('camp', 'merchant');
    const res = visitRest(run, 0, -1, 0, CTX)!;
    expect(res.run.lives).toBe(10 + EXPEDITION.camp.lives);
    expect(res.run.leg).toBe(2);
    expect(res.spent).toBe(0);
    expect(visitRest({ ...run, lives: 19 }, 0, -1, 0, CTX)!.run.lives).toBe(ECONOMY.startLives);
  });

  it('Mercador sells one Bênção for moedas, or lets you walk past', () => {
    const run = atRest('camp', 'merchant');
    const node = run.nodes[1]!;
    if (node.kind !== 'merchant') throw new Error('merchant expected');
    expect(canVisit(run, node, 0, EXPEDITION.merchant.cost - 1)).toBe(false);
    expect(visitRest(run, 1, 0, EXPEDITION.merchant.cost - 1, CTX)).toBeNull();
    const res = visitRest(run, 1, 2, EXPEDITION.merchant.cost, CTX)!;
    expect(res.spent).toBe(EXPEDITION.merchant.cost);
    expect(res.run.boons).toEqual([node.boons[2]]);
    expect(res.run.lives).toBe(10);
    const past = visitRest(run, 1, -1, 0, CTX)!;
    expect(past.spent).toBe(0);
    expect(past.run.boons).toEqual([]);
    expect(past.run.leg).toBe(2);
  });

  it('Santuário trades lives for a strong Bênção, never the last lives', () => {
    const run = atRest('shrine', 'camp');
    const node = run.nodes[0]!;
    if (node.kind !== 'shrine') throw new Error('shrine expected');
    const res = visitRest(run, 0, 1, 0, CTX)!;
    expect(res.run.lives).toBe(10 - EXPEDITION.shrine.lives);
    expect(res.run.boons).toEqual([node.boons[1]]);
    expect(visitRest({ ...run, lives: EXPEDITION.shrine.lives }, 0, 0, 0, CTX)).toBeNull();
    // A battle stop cannot be "visited".
    expect(visitRest(newRun(1, 'mage', CTX), 0, -1, 999, CTX)).toBeNull();
  });

  it('ends after the last stop', () => {
    let run = newRun(9, 'knight', CTX);
    for (let i = 0; i < EXPEDITION.legs; i++) run = advanceRun(run, 20, [], CTX);
    expect(run.leg).toBe(EXPEDITION.legs);
    expect(run.nodes).toEqual([]);
  });

  it('is saved, survives a reload, keeps a streak; old saves and old runs are handled', () => {
    const st = memStorage();
    const s = new SaveStore(st);
    expect(s.data.expedition).toBeNull();
    s.setExpedition(newRun(3, 'mage', CTX));
    const again = new SaveStore(st);
    expect(again.data.expedition?.nodes).toHaveLength(2);
    again.finishExpedition();
    again.finishExpedition();
    expect(again.data.expedition).toBeNull();
    expect(again.data.expeditionWins).toBe(2);
    expect(again.data.expeditionStreak).toBe(2);
    again.failExpedition();
    expect(again.data.expeditionStreak).toBe(0);
    expect(new SaveStore(st).data.expeditionBest).toBe(2);
    const old = migrate({ version: 7, stages: {} });
    expect(old.expedition).toBeNull();
    expect(old.expeditionWins).toBe(0);
    expect(old.expeditionStreak).toBe(0);
    // A run saved by the 3-battle version (it had "routes") is dropped, not crashed on.
    expect(migrate({ version: 7, expedition: { seed: 1, leg: 1, lives: 9, boons: [], hero: 'mage', routes: [{ stage: 'v5', pact: 'calm' }] } }).expedition).toBeNull();
    expect(migrate({ version: 7, expedition: { seed: 1, nodes: 'x' } }).expedition).toBeNull();
  });

  it('the save pays the merchant with moedas', () => {
    const s = new SaveStore(memStorage());
    for (const id of ['v1', 'v2', 'v3', 'v4', 'v5'] as const) s.recordResult(id, true, 3);
    const run = atRest('camp', 'merchant');
    s.setExpedition(run);
    s.data.coins = EXPEDITION.merchant.cost + 5;
    expect(s.visitExpedition(1, 0)).toBe(true);
    expect(s.data.coins).toBe(5);
    expect(s.data.expedition!.leg).toBe(2);
    expect(s.data.expedition!.boons).toHaveLength(1);
    expect(s.visitExpedition(0, -1)).toBe(false); // now a battle stop
  });

  it('only visits open stages, never the first tutorial ones', () => {
    const s = new SaveStore(memStorage());
    expect(s.expeditionPool()).toEqual([]);
    for (const id of ['v1', 'v2', 'v3', 'v4', 'v5'] as const) s.recordResult(id, true, 3);
    const pool = s.expeditionPool();
    expect(pool).toContain('v5');
    expect(pool).toContain('a1');
    expect(pool).not.toContain('v1');
    expect(pool).not.toContain('c1');
    expect(s.expeditionCtx().bosses).toEqual(['v5']);
  });
});
