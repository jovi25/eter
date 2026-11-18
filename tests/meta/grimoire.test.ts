import { describe, expect, it } from 'vitest';
import { BOON_IDS, BOONS, RARITIES, type BoonDef, type BoonId } from '../../src/data/boons';
import { DECK, DUST, FEATS, PACK, STARTER, cardsOf, craftCost, deckProblem, rollPack } from '../../src/data/grimoire';
import { migrate, SAVE_VERSION, SaveStore } from '../../src/meta/save';
import { Simulation } from '../../src/sim/simulation';

const mem = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
};
const rarity = (id: BoonId) => (BOONS[id] as BoonDef).rarity;

describe('Grimório — cards and deck', () => {
  it('every rarity has cards; Lendárias are few and each has a feat', () => {
    for (const r of RARITIES) expect(cardsOf(r).length, r).toBeGreaterThan(0);
    expect(cardsOf('legendary').length).toBe(FEATS.length);
    for (const f of FEATS) expect(rarity(f.card)).toBe('legendary');
  });

  it('the starter deck is 9 Comuns and is valid', () => {
    expect(STARTER.length).toBe(DECK.size);
    for (const id of STARTER) expect(rarity(id)).toBe('common');
    expect(deckProblem(STARTER, STARTER)).toBeNull();
  });

  it('deck limits: size, rarity caps, owned, unique', () => {
    const rares = cardsOf('rare');
    const epics = cardsOf('epic');
    const all = [...BOON_IDS];
    expect(deckProblem([...STARTER, rares[0]!], all)).toMatch(/máximo 9/);
    expect(deckProblem(rares.slice(0, 4), all)).toMatch(/Raras/);
    expect(deckProblem(epics.slice(0, 3), all)).toMatch(/Épicas/);
    expect(deckProblem(cardsOf('legendary').slice(0, 2), all)).toMatch(/Lendária/);
    expect(deckProblem([rares[0]!], STARTER)).toMatch(/não tem/);
    expect(deckProblem([STARTER[0]!, STARTER[0]!], all)).toMatch(/repetida/);
  });

  it('Lendárias cannot be made with dust; the rest can', () => {
    for (const id of cardsOf('legendary')) expect(craftCost(id)).toBe(0);
    expect(craftCost(cardsOf('epic')[0]!)).toBe(DUST.craft.epic);
  });
});

describe('Grimório — packs', () => {
  it('3 cards, deterministic, odds add up to 100%', () => {
    expect(Object.values(PACK.odds).reduce((a, b) => a + b, 0)).toBeCloseTo(1);
    expect(rollPack(42, 0)).toEqual(rollPack(42, 0));
    expect(rollPack(42, 0).cards.length).toBe(PACK.cards);
  });

  it('matches the advertised odds over many packs', () => {
    const count: Record<string, number> = {};
    let seed = 7;
    let n = 0;
    for (let i = 0; i < 4000; i++) {
      const r = rollPack(seed, 0); // no pity in the way
      for (const c of r.cards) count[rarity(c)] = (count[rarity(c)] ?? 0) + 1;
      n += r.cards.length;
      seed = r.seed;
    }
    for (const r of RARITIES) expect((count[r] ?? 0) / n, r).toBeCloseTo(PACK.odds[r], 1);
    expect((count.legendary ?? 0) / n).toBeLessThan(0.02); // strong cards are hard to get
  });

  it('pity: a long dry streak ends with an Épica or better', () => {
    for (let s = 0; s < 50; s++) {
      const r = rollPack(s, PACK.pity - 1);
      expect(r.cards.some((c) => rarity(c) === 'epic' || rarity(c) === 'legendary')).toBe(true);
      expect(r.sinceEpic).toBe(0);
    }
  });
});

describe('Grimório — save', () => {
  it('new save: starter cards and deck, coins for one pack', () => {
    const save = new SaveStore(mem());
    expect(save.data.cards).toEqual(STARTER);
    expect(save.data.deck).toEqual(STARTER);
    expect(save.data.coins).toBe(PACK.price);
  });

  it('buy → pending (no re-roll) → claim; repeats become dust', () => {
    const save = new SaveStore(mem());
    save.data.coins = 1000;
    const a = save.buyPack()!;
    expect(save.buyPack()).toEqual(a); // already paid: the same cards
    expect(save.data.coins).toBe(1000 - PACK.price);
    const res = save.claimPack();
    expect(res.map((r) => r.id)).toEqual(a);
    for (const r of res) {
      expect(save.data.cards).toContain(r.id);
      if (!r.fresh) expect(r.dust).toBe(DUST.fromDuplicate[rarity(r.id)]);
    }
    expect(save.data.packs.pending).toBeNull();
  });

  it('craft with dust; deck toggling respects the rules', () => {
    const save = new SaveStore(mem());
    const rare = cardsOf('rare')[0]!;
    expect(save.craft(rare)).toBe(false);
    save.data.dust = DUST.craft.rare;
    expect(save.craft(rare)).toBe(true);
    expect(save.data.dust).toBe(0);
    expect(save.toggleDeck(rare)).toMatch(/máximo 9/); // deck full
    expect(save.toggleDeck(STARTER[0]!)).toBeNull(); // take one out
    expect(save.toggleDeck(rare)).toBeNull(); // put the rare in
    expect(save.data.deck).toContain(rare);
    expect(save.craft(cardsOf('legendary')[0]!)).toBe(false);
  });

  it('feats grant their Lendária once', () => {
    const save = new SaveStore(mem());
    expect(save.checkFeats()).toEqual([]);
    save.data.riftBest = 40;
    expect(save.checkFeats()).toEqual(['phoenix']);
    expect(save.data.cards).toContain('phoenix');
    expect(save.checkFeats()).toEqual([]);
  });

  it('v7 → v8: Relíquias become dust, revealed Bênçãos become cards, a paid chest becomes a pack', () => {
    const old = new SaveStore(mem()).data as unknown as Record<string, unknown>;
    const v7: Record<string, unknown> = { ...old, version: 7, coins: 10, relics: { riftHeart: 3, emberCharm: 1 }, equipped: ['riftHeart'], unlockedBoons: ['tallVines'], chest: { seed: 1, pending: { kind: 'coins', amount: 50, rarity: 'common' }, opened: 2, sinceEpic: 0 } };
    delete v7.cards;
    delete v7.deck;
    delete v7.dust;
    const m = migrate(JSON.parse(JSON.stringify(v7)));
    expect(m.version).toBe(SAVE_VERSION);
    expect(m.dust).toBe(DUST.fromRelic.legendary * 3 + DUST.fromRelic.common);
    expect(m.cards).toContain('tallVines');
    expect(m.deck).toEqual(STARTER);
    expect(m.coins).toBe(10 + PACK.price);
    expect('relics' in m).toBe(false);
  });
});

describe('Grimório — in the match', () => {
  it('offers come only from the deck', () => {
    const deck = ['heart', 'treasure', 'eagleEye'];
    const sim = new Simulation({ stage: 'v3', seed: 3, modifiers: { boonDeck: deck } });
    for (let i = 0; i < 30; i++) {
      sim.state.boonOffers = [];
      (sim as unknown as { offerBoons(): void }).offerBoons();
      for (const id of sim.state.boonOffers[0]!) expect(deck).toContain(id);
    }
  });

  it('no deck → the classic Bênçãos (never Lendárias)', () => {
    const sim = new Simulation({ stage: 'v3', seed: 3 });
    for (let i = 0; i < 40; i++) {
      sim.state.boonOffers = [];
      (sim as unknown as { offerBoons(): void }).offerBoons();
      for (const id of sim.state.boonOffers[0]!) expect(rarity(id)).not.toBe('legendary');
    }
  });
});
