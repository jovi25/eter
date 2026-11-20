import { describe, expect, it } from 'vitest';
import { BOONS } from '../../src/data/boons';
import { MUTATIONS, NINE_RULES_FROM, weekMutation } from '../../src/data/mutations';
import { PACT_IDS, PACTS } from '../../src/data/expedition';
import { WEATHER } from '../../src/data/weather';
import { Simulation } from '../../src/sim/simulation';
import { newSim } from '../helpers';

const give = (sim: Simulation, id: keyof typeof BOONS) => BOONS[id].apply({ mods: sim.mods, state: sim.state, addGold: () => {} });

describe('Pacote de conteúdo 2', () => {
  it('Cristal de Vidro starts with 5 lives; Blitz halves the pauses', () => {
    const glass = new Simulation({ stage: 'v1', seed: 1, mutation: 'glass' });
    expect(glass.state.lives).toBe(5);
    const blitz = new Simulation({ stage: 'v1', seed: 1, mutation: 'blitz' });
    expect(blitz.mods.waveGapMult).toBe(0.5);
    expect(MUTATIONS.goldrush.name).toBeTruthy();
  });

  it('the rule of the current week does not change; the new ones come later', () => {
    expect(['giants', 'sale', 'wildsky', 'alchemy', 'swarm', 'haste']).toContain(weekMutation(NINE_RULES_FROM - 1));
    const later = new Set(Array.from({ length: 9 }, (_, i) => weekMutation(NINE_RULES_FROM + i)));
    expect(later.has('glass') && later.has('goldrush') && later.has('blitz')).toBe(true);
  });

  it('new weather and pacts are well formed', () => {
    expect(WEATHER.blizzard.enemySpeed).toBeLessThan(1);
    expect(WEATHER.heatwave.damage?.fire).toBeGreaterThan(1);
    expect(PACT_IDS).toContain('arcane');
    expect(PACTS.skies.wildWeather).toBe(true);
  });

  it('Toque de Midas, Senhor do Clima and Sobrecarga', () => {
    const sim = newSim();
    give(sim, 'midas');
    const gold = sim.state.gold;
    const boss = sim.spawnEnemy('herald', { dist: 300, hp: 1 });
    (sim as any).dealDamage(boss, 10, 'physical', {});
    expect(sim.state.gold - gold).toBeGreaterThanOrEqual(150);
    give(sim, 'overcharge');
    expect(sim.mods.overchargeAt).toBe(10);
    give(sim, 'weatherWise');
    expect(sim.mods.weatherNeverHurts).toBe(true);
  });

  it('Estilhaço Gélido chills the neighbours of a frozen enemy that dies', () => {
    const sim = newSim();
    give(sim, 'frostNova');
    const a = sim.spawnEnemy('slime', { dist: 300, hp: 1 });
    const b = sim.spawnEnemy('slime', { dist: 310, hp: 1000 });
    a.frozenTime = 2;
    (sim as any).dealDamage(a, 10, 'physical', {});
    expect(b.chillStacks > 0 || b.frozenTime > 0).toBe(true);
  });
});
