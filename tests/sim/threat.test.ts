import { describe, expect, it } from 'vitest';
import { Simulation } from '../../src/sim/simulation';
import { THREAT } from '../../src/data/threat';
import { DIFFICULTY } from '../../src/data/economy';
import { ENEMIES } from '../../src/data/enemies';
import { STAGES } from '../../src/data/stages';
import { SaveStore } from '../../src/meta/save';

describe('chefes crescem com as ondas', () => {
  it('a boss on wave 12 has more life than on wave 1, but grows slower than common monsters', () => {
    const sim = new Simulation({ stage: 'a3', seed: 1 });
    const b1 = sim.spawnEnemy('sentinel', { wave: 1 });
    const b12 = sim.spawnEnemy('sentinel', { wave: 12 });
    expect(b12.maxHp / b1.maxHp).toBeCloseTo(DIFFICULTY.bossGrowthPerWave ** 11, 1);
    const g12 = sim.spawnEnemy('golem', { wave: 12 });
    expect(b12.maxHp).toBeGreaterThan(g12.maxHp * 4);
    // The Colosso too: never weaker than a Golem of its wave.
    const c12 = sim.spawnEnemy('colossus', { wave: 12 });
    expect(c12.maxHp).toBeGreaterThan(g12.maxHp * 1.5);
  });
});

describe('Ameaça', () => {
  it('each level keeps the rules below and adds one', () => {
    expect(THREAT.levels.length).toBe(THREAT.max);
    expect(THREAT.coins.length).toBe(THREAT.max);
    const base = new Simulation({ stage: 'v3', seed: 1 });
    const t2 = new Simulation({ stage: 'v3', seed: 1, threat: 2 });
    const t5 = new Simulation({ stage: 'v3', seed: 1, threat: 5 });
    const hp = (s: Simulation, type: 'slime' | 'colossus') => s.spawnEnemy(type, { wave: 5 }).maxHp;
    expect(hp(t2, 'slime')).toBeGreaterThan(hp(base, 'slime'));
    expect(hp(t2, 'colossus') / hp(base, 'colossus')).toBeCloseTo(1.2 * 1.4, 1);
    expect(t5.mods.enemySpeedMult).toBeGreaterThan(base.mods.enemySpeedMult);
    expect(t5.mods.towerCostMult).toBeGreaterThan(1);
    expect(hp(t5, 'slime')).toBeGreaterThan(hp(t2, 'slime'));
  });

  it('opens only after 3 stars, one level at a time, and pays once per level', () => {
    const save = new SaveStore(null);
    expect(save.maxThreat('v2')).toBe(0);
    save.recordResult('v2', true, 2);
    expect(save.maxThreat('v2')).toBe(0);
    save.recordResult('v2', true, 3);
    expect(save.maxThreat('v2')).toBe(1);
    expect(save.recordThreat('v2', 2)).toBe(0); // not open yet
    expect(save.recordThreat('v2', 1)).toBe(THREAT.coins[0]);
    expect(save.recordThreat('v2', 1)).toBe(0); // already crowned
    expect(save.crowns('v2')).toBe(1);
    expect(save.maxThreat('v2')).toBe(2);
    save.recordResult('v2', true, 3); // a later plain win keeps the crown
    expect(save.crowns('v2')).toBe(1);
    expect(save.totalCrowns()).toBe(1);
  });

  it('every campaign boss is at least 3 times the toughest common monster of its wave', () => {
    for (const [id, st] of Object.entries(STAGES)) {
      if (id === 'rift' || id === 'hunt' || id === 'gale') continue;
      st.waves.forEach((w, i) => {
        const sim = new Simulation({ stage: id as never, seed: 1 });
        const boss = w.groups.find((g) => ENEMIES[g.enemy].boss);
        if (!boss) return;
        const b = sim.spawnEnemy(boss.enemy, { wave: i + 1 }).maxHp;
        const top = Math.max(...w.groups.filter((g) => !ENEMIES[g.enemy].boss).map((g) => sim.spawnEnemy(g.enemy, { wave: i + 1 }).maxHp));
        expect(b, `${id} ${boss.enemy}`).toBeGreaterThan(top * 3);
      });
    }
  });
});
