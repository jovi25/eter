import { describe, expect, it } from 'vitest';
import { BOONS } from '../../src/data/boons';
import { newSim, runSeconds } from '../helpers';

describe('Pacote de conteúdo 1 — monsters', () => {
  it('Bolhão splits into Gosmas of the same wave when it dies', () => {
    const sim = newSim();
    const b = sim.spawnEnemy('broodmother', { dist: 300, wave: 1, hp: 1 });
    (sim as any).dealDamage(b, 10, 'physical', {});
    expect(b.alive).toBe(false);
    expect(sim.state.enemies.filter((e) => e.alive && e.type === 'slime')).toHaveLength(2);
  });

  it('Besouro: the shell halves damage until a reaction cracks it', () => {
    const sim = newSim();
    const a = sim.spawnEnemy('beetle', { dist: 300, hp: 1000 });
    (sim as any).dealDamage(a, 100, 'fire', {});
    expect(a.maxHp - a.hp).toBe(50);
    a.shell = false;
    (sim as any).dealDamage(a, 100, 'fire', {});
    expect(a.maxHp - a.hp).toBe(150);
  });

  it('Espectro fades on a timer and takes little damage meanwhile', () => {
    const sim = newSim();
    const w = sim.spawnEnemy('wraith', { dist: 100, hp: 1000 });
    runSeconds(sim, 5.2);
    expect(w.phaseTime).toBeGreaterThan(0);
    const before = w.hp;
    (sim as any).dealDamage(w, 100, 'fire', {});
    expect(before - w.hp).toBe(30);
  });

  it('Lebre dashes: it covers more ground than its plain speed', () => {
    const sim = newSim();
    const h = sim.spawnEnemy('hare', { dist: 0, hp: 1e6 });
    runSeconds(sim, 5);
    expect(h.dist).toBeGreaterThan(95 * 5 + 30);
  });
});

describe('Pacote de conteúdo 1 — cards', () => {
  it('Segunda Chance brings the crystal back once', () => {
    const sim = newSim();
    BOONS.secondChance.apply({ mods: sim.mods, state: sim.state, addGold: () => {} });
    sim.state.lives = 1;
    const e = sim.spawnEnemy('golem', { dist: 1e6 });
    runSeconds(sim, 0.1);
    expect(e.alive).toBe(false);
    expect(sim.state.lives).toBe(5);
    expect(sim.state.result).toBe('playing');
  });

  it('Caçador de Chefes and Juros de Éter', () => {
    const sim = newSim();
    BOONS.bossHunter.apply({ mods: sim.mods, state: sim.state, addGold: () => {} });
    const boss = sim.spawnEnemy('herald', { dist: 300, hp: 10_000 });
    (sim as any).dealDamage(boss, 100, 'physical', {});
    expect(boss.maxHp - boss.hp).toBeGreaterThan(100);
    BOONS.interest.apply({ mods: sim.mods, state: sim.state, addGold: () => {} });
    expect(sim.mods.interestRate).toBeCloseTo(0.1);
  });
});
