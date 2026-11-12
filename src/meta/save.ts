// Player progress, saved in localStorage as versioned JSON (with migrations) + manual text backup.
// Pure TypeScript (no Phaser) so it can be unit-tested.

import { HERO_ORDER, HEROES, type HeroClass } from '../data/heroes';
import { HERO_LEVELS, MAX_HERO_LEVEL, SKILL2, TALENTS, WEAPONS, heroLevel, type TalentId, type WeaponElement, type WeaponId } from '../data/talents';
import type { BoonId } from '../data/boons';
import { COINS, LOCKED_BOONS, MAX_RELIC_LEVEL, RELIC_IDS, RELIC_SLOTS, isHighRarity, nextChestSeed, rollChest, type ChestReward, type RelicId } from '../data/relics';
import { ENEMIES } from '../data/enemies';
import { REACTIONS } from '../data/reactions';
import { RIFT, STAGE_ORDER, type CampaignStageId, type StageId } from '../data/stages';

export const SAVE_VERSION = 7;
const KEY = 'eter.save';

export interface StageProgress {
  stars: number; // best stars (0 = never won)
  wins: number;
}

export interface SaveData {
  version: number;
  createdAt: number;
  stages: Partial<Record<StageId, StageProgress>>;
  hero: HeroClass; // last picked hero class (v2+)
  riftBest: number; // best wave reached in the Fenda Infinita (v3+)
  challenges: Partial<Record<CampaignStageId, boolean[]>>; // completed stage challenges (v4+)
  daily: { key: string; best: number; plays: number }; // today's daily challenge (v4+)
  codex: { enemies: string[]; reactions: string[] }; // Códice discoveries (v5+)
  // ── v6: Relicários ──
  coins: number;
  relics: Partial<Record<RelicId, number>>; // owned level 1..3
  equipped: RelicId[]; // up to RELIC_SLOTS
  unlockedBoons: BoonId[];
  chest: { seed: number; pending: ChestReward | null; opened: number; sinceEpic: number };
  // ── v7: hero levels, talents, Arcanista weapon ──
  heroes: Record<HeroClass, HeroProgress>;
  weapon: WeaponId;
}

export interface HeroProgress {
  xp: number;
  talent: TalentId | null;
}

function freshHeroes(xp = 0): Record<HeroClass, HeroProgress> {
  const out = {} as Record<HeroClass, HeroProgress>;
  for (const cls of HERO_ORDER) out[cls] = { xp, talent: null };
  return out;
}

export function newSave(now = Date.now()): SaveData {
  return { version: SAVE_VERSION, createdAt: now, stages: {}, hero: 'mage', riftBest: 0, challenges: {}, daily: { key: '', best: 0, plays: 0 }, codex: { enemies: [], reactions: [] }, coins: COINS.chestPrice, relics: {}, equipped: [], unlockedBoons: [], chest: { seed: (now % 2147483647) >>> 0, pending: null, opened: 0, sinceEpic: 0 }, heroes: freshHeroes(), weapon: 'ember' };
}

/** Upgrade any older save shape to the current version. Add one step per future version. */
export function migrate(raw: unknown): SaveData {
  if (!raw || typeof raw !== 'object') return newSave();
  const data = raw as Partial<SaveData> & { version?: number };
  const v = typeof data.version === 'number' ? data.version : 0;
  if (v > SAVE_VERSION) throw new Error('Save de uma versão mais nova do jogo.');
  let out: SaveData = { ...newSave(data.createdAt), ...data, version: v } as SaveData;
  if (out.version < 1) {
    out = { version: 1, createdAt: out.createdAt ?? Date.now(), stages: out.stages ?? {}, hero: 'mage', riftBest: 0, challenges: {}, daily: { key: '', best: 0, plays: 0 }, codex: { enemies: [], reactions: [] }, coins: COINS.chestPrice, relics: {}, equipped: [], unlockedBoons: [], chest: { seed: (Date.now() % 2147483647) >>> 0, pending: null, opened: 0, sinceEpic: 0 }, heroes: freshHeroes(), weapon: 'ember' };
  }
  if (out.version < 2) {
    // v2: hero classes. Everyone starts as the Arcanista.
    out = { ...out, version: 2, hero: 'mage' };
  }
  if (out.version < 3) {
    // v3: Fenda Infinita record.
    out = { ...out, version: 3, riftBest: 0 };
  }
  if (out.version < 4) {
    // v4: stage challenges + daily challenge.
    out = { ...out, version: 4, challenges: {}, daily: { key: '', best: 0, plays: 0 } };
  }
  if (out.version < 5) {
    // v5: Códice.
    out = { ...out, version: 5, codex: { enemies: [], reactions: [] } };
  }
  if (out.version < 6) {
    // v6: Relicários. Everyone gets enough coins for a first chest.
    out = { ...out, version: 6, coins: COINS.chestPrice, relics: {}, equipped: [], unlockedBoons: [], chest: { seed: (Date.now() % 2147483647) >>> 0, pending: null, opened: 0, sinceEpic: 0 } };
  }
  if (out.version < 7) {
    // v7: hero levels. Veterans start where their campaign progress says (7 XP per star earned).
    const stars = STAGE_ORDER.reduce((s, id) => s + clampInt(out.stages?.[id]?.stars, 0, 3), 0);
    out = { ...out, version: 7, heroes: freshHeroes(Math.min(HERO_LEVELS.xp[MAX_HERO_LEVEL - 1]!, stars * 7)), weapon: 'ember' };
  }
  if (!(out.hero in HEROES)) out.hero = 'mage';
  const hs = freshHeroes();
  for (const cls of HERO_ORDER) {
    const p = out.heroes?.[cls];
    const xp = clampInt(p?.xp, 0, 1e9);
    const t = p?.talent;
    const okTalent = typeof t === 'string' && t in TALENTS && TALENTS[t].cls === cls && TALENTS[t].level <= heroLevel(xp);
    hs[cls] = { xp, talent: okTalent ? t : null };
  }
  out.heroes = hs;
  if (!(typeof out.weapon === 'string' && out.weapon in WEAPONS && WEAPONS[out.weapon].level <= heroLevel(hs.mage.xp))) out.weapon = 'ember';
  out.coins = clampInt(out.coins, 0, 1e9);
  const rel: SaveData['relics'] = {};
  for (const id of RELIC_IDS) {
    const lv = out.relics?.[id];
    if (typeof lv === 'number' && lv >= 1) rel[id] = clampInt(lv, 1, MAX_RELIC_LEVEL);
  }
  out.relics = rel;
  out.equipped = Array.isArray(out.equipped) ? [...new Set(out.equipped)].filter((id) => !!rel[id]).slice(0, RELIC_SLOTS) : [];
  out.unlockedBoons = Array.isArray(out.unlockedBoons) ? [...new Set(out.unlockedBoons)].filter((id) => LOCKED_BOONS.includes(id)) : [];
  const chs = out.chest;
  out.chest = {
    seed: typeof chs?.seed === 'number' ? chs.seed >>> 0 : 12345,
    pending: chs?.pending && typeof chs.pending === 'object' && 'kind' in chs.pending ? chs.pending : null,
    opened: clampInt(chs?.opened, 0, 1e9),
    sinceEpic: clampInt(chs?.sinceEpic, 0, 1e9),
  };
  const cx = out.codex;
  out.codex = {
    enemies: Array.isArray(cx?.enemies) ? [...new Set(cx.enemies.filter((e) => typeof e === 'string' && e in ENEMIES))] : [],
    reactions: Array.isArray(cx?.reactions) ? [...new Set(cx.reactions.filter((r) => typeof r === 'string' && r in REACTIONS))] : [],
  };
  const ch: SaveData['challenges'] = {};
  for (const id of STAGE_ORDER) {
    const list = out.challenges?.[id];
    if (Array.isArray(list)) ch[id] = [0, 1, 2].map((i) => !!list[i]);
  }
  out.challenges = ch;
  const dl = out.daily;
  out.daily = dl && typeof dl.key === 'string' ? { key: dl.key, best: clampInt(dl.best, 0, 1e9), plays: clampInt(dl.plays, 0, 1e9) } : { key: '', best: 0, plays: 0 };
  out.riftBest = clampInt(out.riftBest, 0, 999);
  // Sanitize
  const stages: SaveData['stages'] = {};
  for (const id of STAGE_ORDER) {
    const s = out.stages?.[id];
    if (s) stages[id] = { stars: clampInt(s.stars, 0, 3), wins: clampInt(s.wins, 0, 1e9) };
  }
  out.stages = stages;
  return out;
}

function clampInt(v: unknown, min: number, max: number): number {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : min;
}

/** Storage wrapper — every access is guarded (private mode, blocked storage). */
export class SaveStore {
  data: SaveData;

  constructor(private storage: Pick<Storage, 'getItem' | 'setItem'> | null = safeLocalStorage()) {
    this.data = this.read();
  }

  private read(): SaveData {
    try {
      const raw = this.storage?.getItem(KEY);
      return raw ? migrate(JSON.parse(raw)) : newSave();
    } catch {
      return newSave();
    }
  }

  persist(): void {
    try {
      this.storage?.setItem(KEY, JSON.stringify(this.data));
    } catch {
      /* storage full or blocked: progress stays in memory for this session */
    }
  }

  isUnlocked(id: StageId): boolean {
    if (id === 'rift') return this.stars(RIFT.unlockAfter) > 0;
    const i = STAGE_ORDER.indexOf(id);
    if (i <= 0) return true;
    return (this.data.stages[STAGE_ORDER[i - 1]!]?.stars ?? 0) > 0;
  }

  stars(id: CampaignStageId): number {
    return this.data.stages[id]?.stars ?? 0;
  }

  totalStars(): number {
    return STAGE_ORDER.reduce((s, id) => s + this.stars(id), 0);
  }

  /** Merge newly met challenges into the save. Returns which ones are new. */
  recordChallenges(id: CampaignStageId, met: boolean[]): boolean[] {
    const prev = this.data.challenges[id] ?? [false, false, false];
    const fresh = met.map((ok, i) => ok && !prev[i]);
    this.data.challenges[id] = prev.map((ok, i) => ok || !!met[i]);
    if (fresh.some(Boolean)) this.persist();
    return fresh;
  }

  challengesDone(id?: CampaignStageId): number {
    const count = (s: CampaignStageId) => (this.data.challenges[s] ?? []).filter(Boolean).length;
    return id ? count(id) : STAGE_ORDER.reduce((sum, s) => sum + count(s), 0);
  }

  /** Daily challenge: keeps the best score of the given day. Returns true on a new best. */
  recordDaily(key: string, score: number): boolean {
    if (this.data.daily.key !== key) this.data.daily = { key, best: 0, plays: 0 };
    this.data.daily.plays++;
    const better = score > this.data.daily.best;
    if (better) this.data.daily.best = score;
    this.persist();
    return better;
  }

  dailyBest(key: string): number {
    return this.data.daily.key === key ? this.data.daily.best : 0;
  }

  // ───────────── Relicários (v6) ─────────────

  addCoins(n: number): void {
    if (n <= 0) return;
    this.data.coins += Math.round(n);
    this.persist();
  }

  /** Pay for a chest and pre-roll its content (saved, so closing the game can't re-roll it). */
  buyChest(): ChestReward | null {
    const d = this.data;
    if (d.chest.pending) return d.chest.pending;
    if (d.coins < COINS.chestPrice) return null;
    d.coins -= COINS.chestPrice;
    d.chest.pending = rollChest(d.chest.seed, { relics: d.relics, unlockedBoons: d.unlockedBoons, sinceEpic: d.chest.sinceEpic });
    d.chest.seed = nextChestSeed(d.chest.seed);
    this.persist();
    return d.chest.pending;
  }

  /** Put the opened chest's content into the collection. */
  claimChest(): ChestReward | null {
    const d = this.data;
    const r = d.chest.pending;
    if (!r) return null;
    if (r.kind === 'relic') {
      d.relics[r.id] = Math.min(MAX_RELIC_LEVEL, (d.relics[r.id] ?? 0) + 1);
      if (r.isNew && d.equipped.length < RELIC_SLOTS) d.equipped.push(r.id);
    } else if (r.kind === 'boon') {
      if (!d.unlockedBoons.includes(r.id)) d.unlockedBoons.push(r.id);
    } else d.coins += r.amount;
    d.chest.opened++;
    d.chest.sinceEpic = isHighRarity(r.rarity) ? 0 : d.chest.sinceEpic + 1;
    d.chest.pending = null;
    this.persist();
    return r;
  }

  /** Equip / unequip a relic. Returns false when all slots are full. */
  toggleEquip(id: RelicId): boolean {
    const d = this.data;
    if (!d.relics[id]) return false;
    const i = d.equipped.indexOf(id);
    if (i >= 0) d.equipped.splice(i, 1);
    else if (d.equipped.length >= RELIC_SLOTS) return false;
    else d.equipped.push(id);
    this.persist();
    return true;
  }

  /** What the match receives. */
  loadout(): { id: RelicId; level: number }[] {
    return this.data.equipped.map((id) => ({ id, level: this.data.relics[id] ?? 1 }));
  }

  /** Códice: mark an enemy or reaction as seen. Returns true the first time. */
  discover(kind: 'enemies' | 'reactions', id: string): boolean {
    const list = this.data.codex[kind];
    if (list.includes(id)) return false;
    list.push(id);
    this.persist();
    return true;
  }

  /** Record how far a Fenda run got. Returns true on a new record. */
  recordRift(wave: number): boolean {
    if (wave <= this.data.riftBest) return false;
    this.data.riftBest = wave;
    this.persist();
    return true;
  }

  // ───────────── Heróis (v7) ─────────────

  heroLevel(cls: HeroClass): number {
    return heroLevel(this.data.heroes[cls].xp);
  }

  /** Add XP after a match. Returns the level before and after. */
  addHeroXp(cls: HeroClass, n: number): { before: number; after: number } {
    const before = this.heroLevel(cls);
    if (n > 0) {
      this.data.heroes[cls].xp += Math.round(n);
      this.persist();
    }
    return { before, after: this.heroLevel(cls) };
  }

  /** Equip a talent (null = none). Only talents of that hero, already unlocked. */
  setTalent(cls: HeroClass, id: TalentId | null): boolean {
    if (id && (TALENTS[id].cls !== cls || TALENTS[id].level > this.heroLevel(cls))) return false;
    this.data.heroes[cls].talent = id;
    this.persist();
    return true;
  }

  setWeapon(id: WeaponId): boolean {
    if (WEAPONS[id].level > this.heroLevel('mage')) return false;
    this.data.weapon = id;
    this.persist();
    return true;
  }

  /** What the match receives for this hero (talent, second skill, weapon element). */
  heroMods(cls: HeroClass): { heroTalent: TalentId | null; heroSkill2: boolean; heroAffinity: WeaponElement } {
    return {
      heroTalent: this.data.heroes[cls].talent,
      heroSkill2: this.heroLevel(cls) >= HERO_LEVELS.skill2Level && !!SKILL2[cls],
      heroAffinity: WEAPONS[this.data.weapon].element,
    };
  }

  /** A hero class is available once its unlock stage has been won. */
  isHeroUnlocked(cls: HeroClass): boolean {
    const req = HEROES[cls].unlockAfter;
    return !req || this.stars(req) > 0;
  }

  selectHero(cls: HeroClass): void {
    if (!this.isHeroUnlocked(cls)) return;
    this.data.hero = cls;
    this.persist();
  }

  /** Record a finished match. Returns true if this was the first win of the stage. */
  recordResult(id: StageId, won: boolean, stars: number): boolean {
    if (!won || id === 'rift') return false;
    const prev = this.data.stages[id];
    const first = !prev || prev.wins === 0;
    this.data.stages[id] = { stars: Math.max(prev?.stars ?? 0, stars), wins: (prev?.wins ?? 0) + 1 };
    this.persist();
    return first;
  }

  /** Text backup: base64 of the JSON (safe to paste in a note or chat). */
  exportText(): string {
    const json = JSON.stringify(this.data);
    return 'ETER1:' + btoa(unescape(encodeURIComponent(json)));
  }

  importText(text: string): void {
    const t = text.trim();
    if (!t.startsWith('ETER1:')) throw new Error('Texto de save inválido.');
    const json = decodeURIComponent(escape(atob(t.slice(6))));
    this.data = migrate(JSON.parse(json));
    this.persist();
  }

  reset(): void {
    this.data = newSave();
    this.persist();
  }
}

function safeLocalStorage(): Storage | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

/** Shared instance for the game. */
let shared: SaveStore | null = null;
export function getSave(): SaveStore {
  shared ??= new SaveStore();
  return shared;
}
