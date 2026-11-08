import type { SimModifiers } from '../src/data/modifiers';
import type { TowerId } from '../src/data/towers';
import type { SimEvents } from '../src/sim/events';
import { Simulation } from '../src/sim/simulation';
import { SIM_TICKS_PER_SECOND } from '../src/data/config';

export function newSim(modifiers?: Partial<SimModifiers>, seed = 1): Simulation {
  return new Simulation({ stage: 'v1', seed, modifiers });
}

/** A sturdy dummy standing on the long horizontal stretch of the path (y = 300). */
export function dummy(sim: Simulation, dist = 500, type: 'slime' | 'golem' | 'bat' | 'wolf' = 'slime') {
  return sim.spawnEnemy(type, { dist, hp: 100_000 });
}

export function runSeconds(sim: Simulation, seconds: number): void {
  const ticks = Math.round(seconds * SIM_TICKS_PER_SECOND);
  for (let i = 0; i < ticks; i++) sim.step();
}

/** Records every event of the given kinds. */
export function record<K extends keyof SimEvents>(sim: Simulation, ...kinds: K[]): Array<{ kind: K; payload: SimEvents[K] }> {
  const log: Array<{ kind: K; payload: SimEvents[K] }> = [];
  for (const kind of kinds) sim.events.on(kind, (payload) => log.push({ kind, payload }));
  return log;
}

/**
 * Simple scripted player used for determinism and pacing checks:
 * builds the given towers slot by slot as soon as it can afford them, then upgrades them in order.
 */
/** Slots ordered by how much of the path they cover (best first). */
export const SLOT_ORDER = [1, 4, 5, 2, 3, 6, 7, 0];

export function autoPlay(sim: Simulation, plan: TowerId[], maxSeconds = 600): void {
  const maxTicks = maxSeconds * SIM_TICKS_PER_SECOND;
  while (sim.state.result === 'playing' && sim.state.tick < maxTicks) {
    const built = sim.state.towers.length;
    const nextType = plan[built];
    const nextSlot = SLOT_ORDER[built];
    if (nextType && nextSlot !== undefined) {
      sim.build(nextSlot, nextType);
    } else {
      for (const t of sim.state.towers) if (sim.upgrade(t.id)) break;
    }
    sim.step();
  }
}
