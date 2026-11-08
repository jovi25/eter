import { describe, expect, it } from 'vitest';
import { migrate, SAVE_VERSION, SaveStore } from '../../src/meta/save';

function memStorage() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), m };
}

describe('save', () => {
  it('starts empty with only stage 1 unlocked', () => {
    const s = new SaveStore(memStorage());
    expect(s.isUnlocked('v1')).toBe(true);
    expect(s.isUnlocked('v2')).toBe(false);
    expect(s.totalStars()).toBe(0);
  });

  it('winning unlocks the next stage, keeps best stars and persists', () => {
    const st = memStorage();
    const s = new SaveStore(st);
    expect(s.recordResult('v1', true, 2)).toBe(true);
    expect(s.recordResult('v1', true, 1)).toBe(false);
    expect(s.stars('v1')).toBe(2);
    expect(s.isUnlocked('v2')).toBe(true);
    const again = new SaveStore(st);
    expect(again.stars('v1')).toBe(2);
    expect(again.data.stages.v1?.wins).toBe(2);
  });

  it('losing changes nothing', () => {
    const s = new SaveStore(memStorage());
    s.recordResult('v1', false, 0);
    expect(s.isUnlocked('v2')).toBe(false);
  });

  it('export → import round-trips', () => {
    const a = new SaveStore(memStorage());
    a.recordResult('v1', true, 3);
    a.recordResult('v2', true, 1);
    const text = a.exportText();
    const b = new SaveStore(memStorage());
    b.importText(text);
    expect(b.stars('v1')).toBe(3);
    expect(b.stars('v2')).toBe(1);
  });

  it('rejects garbage imports', () => {
    const s = new SaveStore(memStorage());
    expect(() => s.importText('hello')).toThrow();
  });

  it('migrates an old unversioned save and sanitizes values', () => {
    const m = migrate({ stages: { v1: { stars: 9, wins: 'x' }, nope: { stars: 3 } } });
    expect(m.version).toBe(SAVE_VERSION);
    expect(m.stages.v1).toEqual({ stars: 3, wins: 0 });
    expect(Object.keys(m.stages)).toEqual(['v1']);
  });

  it('heroes unlock by winning stages; locked heroes cannot be selected', () => {
    const s = new SaveStore(memStorage());
    expect(s.data.hero).toBe('mage');
    expect(s.isHeroUnlocked('knight')).toBe(false);
    s.selectHero('knight');
    expect(s.data.hero).toBe('mage');
    s.recordResult('v1', true, 1);
    expect(s.isHeroUnlocked('knight')).toBe(true);
    s.selectHero('knight');
    expect(s.data.hero).toBe('knight');
  });

  it('v1 saves migrate to v2 with the Arcanista selected', () => {
    const m = migrate({ version: 1, createdAt: 1, stages: { v1: { stars: 2, wins: 1 } } });
    expect(m.version).toBe(2);
    expect(m.hero).toBe('mage');
    expect(m.stages.v1?.stars).toBe(2);
  });

  it('survives corrupt storage', () => {
    const st = memStorage();
    st.setItem('eter.save', '{not json');
    const s = new SaveStore(st);
    expect(s.totalStars()).toBe(0);
  });
});
