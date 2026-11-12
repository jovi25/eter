import { describe, expect, it } from 'vitest';
import { BOONS, type BoonDef } from '../../src/data/boons';
import {
  CHEST_ODDS, CHEST_PITY, COINS, LOCKED_BOONS, MAX_RELIC_LEVEL, RELIC_IDS, RELICS, matchCoins, nextChestSeed, rollChest, type Collection,
} from '../../src/data/relics';
import { migrate, SAVE_VERSION, SaveStore } from '../../src/meta/save';
import { Simulation } from '../../src/sim/simulation';

const mem = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
};
const empty = (): Collection => ({ relics: {}, unlockedBoons: [], sinceEpic: 0 });

describe('chest roll', () => {
  it('is deterministic and the odds add up to 100%', () => {
    expect(Object.values(CHEST_ODDS).reduce((a, b) => a + b, 0)).toBeCloseTo(1);
    expect(rollChest(42, empty())).toEqual(rollChest(42, empty()));
  });

  it('matches the advertised odds over many chests', () => {
    const count: Record<string, number> = {};
    let seed = 7;
    const N = 4000;
    for (let i = 0; i < N; i++) {
      const r = rollChest(seed, empty());
      count[r.rarity] = (count[r.rarity] ?? 0) + 1;
      seed = nextChestSeed(seed);
    }
    for (const [r, p] of Object.entries(CHEST_ODDS)) expect((count[r] ?? 0) / N).toBeCloseTo(p, 1);
  });

  it('pity guarantees Épica or better', () => {
    for (let s = 0; s < 50; s++) {
      const r = rollChest(s, { ...empty(), sinceEpic: CHEST_PITY - 1 });
      expect(['epic', 'legendary']).toContain(r.rarity);
    }
  });

  it('never gives a maxed relic or an already unlocked boon; refunds when nothing is left', () => {
    const full: Collection = { relics: Object.fromEntries(RELIC_IDS.map((id) => [id, MAX_RELIC_LEVEL])), unlockedBoons: [...LOCKED_BOONS], sinceEpic: 0 };
    for (let s = 0; s < 30; s++) expect(rollChest(s, full)).toMatchObject({ kind: 'coins', amount: COINS.duplicateRefund });
  });
});

describe('coins', () => {
  it('pay more for wins, stars, first wins, challenges and deep Fenda runs', () => {
    const base = { mode: 'stage' as const, won: true, stars: 3, firstWin: false, newChallenges: 0, riftWave: 0, firstDailyToday: false };
    expect(matchCoins(base)).toBe(COINS.win + 3 * COINS.perStar);
    expect(matchCoins({ ...base, won: false, stars: 0 })).toBe(COINS.loss);
    expect(matchCoins({ ...base, firstWin: true, newChallenges: 2 })).toBe(COINS.win + 30 + COINS.firstWinBonus + 2 * COINS.perChallenge);
    expect(matchCoins({ ...base, won: false, mode: 'rift', riftWave: 20 })).toBe(20 * COINS.riftPerWave + 2 * COINS.riftMilestone);
    expect(matchCoins({ ...base, won: true, mode: 'rift', riftWave: 40 })).toBeGreaterThanOrEqual(500); // beating the Fenda ≈ 3 chests
  });
});

describe('save v6 (Relicários)', () => {
  it('old saves get coins for a first chest', () => {
    const s = migrate({ version: 5, createdAt: 1, stages: {}, hero: 'mage', riftBest: 0, challenges: {}, daily: { key: '', best: 0, plays: 0 }, codex: { enemies: [], reactions: [] } });
    expect(s.version).toBe(SAVE_VERSION);
    expect(s.coins).toBe(COINS.chestPrice);
  });

  it('buy → pending survives a reload → claim adds it and auto-equips a new relic', () => {
    const storage = mem();
    const a = new SaveStore(storage);
    const r = a.buyChest()!;
    expect(a.data.coins).toBe(0);
    expect(a.buyChest()).toEqual(r); // same pending, no extra charge
    const b = new SaveStore(storage); // "closed the game"
    expect(b.data.chest.pending).toEqual(r);
    b.claimChest();
    expect(b.data.chest.pending).toBeNull();
    if (r.kind === 'relic') {
      expect(b.data.relics[r.id]).toBe(1);
      expect(b.data.equipped).toContain(r.id);
    }
    if (r.kind === 'boon') expect(b.data.unlockedBoons).toContain(r.id);
    expect(b.buyChest()).toBeNull(); // no coins left
  });

  it('only 3 relics equipped at once', () => {
    const s = new SaveStore(mem());
    s.data.relics = { emberCharm: 1, frostCharm: 1, leafCharm: 1, sparkCharm: 2 };
    s.data.equipped = [];
    expect(s.toggleEquip('emberCharm')).toBe(true);
    expect(s.toggleEquip('frostCharm')).toBe(true);
    expect(s.toggleEquip('leafCharm')).toBe(true);
    expect(s.toggleEquip('sparkCharm')).toBe(false);
    expect(s.toggleEquip('emberCharm')).toBe(true); // unequip
    expect(s.toggleEquip('sparkCharm')).toBe(true);
    expect(s.loadout()).toContainEqual({ id: 'sparkCharm', level: 2 });
    expect(s.toggleEquip('riftHeart')).toBe(false); // not owned
  });
});

describe('relics in the match', () => {
  it('apply at the start: gold, lives, starting boon', () => {
    const plain = new Simulation({ stage: 'v1', seed: 1 });
    const sim = new Simulation({ stage: 'v1', seed: 1, relics: [{ id: 'merchantPurse', level: 3 }, { id: 'oakShield', level: 1 }, { id: 'ancientScroll', level: 3 }] });
    expect(sim.state.gold).toBe(plain.state.gold + 100 - 40);
    expect(sim.state.lives).toBe(plain.state.lives + 5);
    expect(sim.state.boonOffers).toHaveLength(2);
  });

  it('every relic has text for each level and applies without errors', () => {
    for (const id of RELIC_IDS) {
      for (let l = 1; l <= 3; l++) {
        expect(RELICS[id].desc(l).length).toBeGreaterThan(5);
        expect(() => new Simulation({ stage: 'v1', seed: 2, relics: [{ id, level: l }] })).not.toThrow();
      }
    }
  });

  it('locked Bênçãos only show up after being unlocked', () => {
    expect(LOCKED_BOONS.length).toBeGreaterThanOrEqual(5);
    const seen = (unlocked: string[]) => {
      const sim = new Simulation({ stage: 'rift', seed: 3, modifiers: { unlockedBoons: unlocked } });
      sim.state.gold = 1e6;
      const ids = new Set<string>();
      for (let i = 0; i < 80; i++) {
        sim.buyAltar();
        for (const id of sim.state.boonOffers[0] ?? []) ids.add(id);
        sim.chooseBoon(0);
      }
      return ids;
    };
    const locked = seen([]);
    for (const id of LOCKED_BOONS) expect(locked.has(id)).toBe(false);
    expect(seen(['tallVines', 'ironArrows']).has('tallVines') || seen(['tallVines', 'ironArrows']).has('ironArrows')).toBe(true);
    for (const id of LOCKED_BOONS) expect((BOONS[id] as BoonDef).locked).toBe(true);
  });
});
