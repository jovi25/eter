// Player progress, saved in localStorage as versioned JSON (with migrations) + manual text backup.
// Pure TypeScript (no Phaser) so it can be unit-tested.

import { HEROES, type HeroClass } from '../data/heroes';
import { RIFT, STAGE_ORDER, type CampaignStageId, type StageId } from '../data/stages';

export const SAVE_VERSION = 4;
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
}

export function newSave(now = Date.now()): SaveData {
  return { version: SAVE_VERSION, createdAt: now, stages: {}, hero: 'mage', riftBest: 0, challenges: {}, daily: { key: '', best: 0, plays: 0 } };
}

/** Upgrade any older save shape to the current version. Add one step per future version. */
export function migrate(raw: unknown): SaveData {
  if (!raw || typeof raw !== 'object') return newSave();
  const data = raw as Partial<SaveData> & { version?: number };
  const v = typeof data.version === 'number' ? data.version : 0;
  if (v > SAVE_VERSION) throw new Error('Save de uma versão mais nova do jogo.');
  let out: SaveData = { ...newSave(data.createdAt), ...data, version: v } as SaveData;
  if (out.version < 1) {
    out = { version: 1, createdAt: out.createdAt ?? Date.now(), stages: out.stages ?? {}, hero: 'mage', riftBest: 0, challenges: {}, daily: { key: '', best: 0, plays: 0 } };
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
  if (!(out.hero in HEROES)) out.hero = 'mage';
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

  /** Record how far a Fenda run got. Returns true on a new record. */
  recordRift(wave: number): boolean {
    if (wave <= this.data.riftBest) return false;
    this.data.riftBest = wave;
    this.persist();
    return true;
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
