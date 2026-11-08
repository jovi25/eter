import type { Element } from '../data/elements';
import type { EnemyId } from '../data/enemies';
import type { ReactionId } from '../data/reactions';
import type { TowerId } from '../data/towers';

/** Everything the simulation tells the outside world. The view turns these into juice. */
export interface SimEvents {
  enemySpawned: { enemyId: number; type: EnemyId; isBoss: boolean };
  enemyHit: { enemyId: number; x: number; y: number; damage: number; element: Element; crit: boolean; reaction?: ReactionId; dot: boolean; towerId?: number };
  enemyKilled: { enemyId: number; type: EnemyId; x: number; y: number; gold: number; isBoss: boolean };
  enemyLeaked: { enemyId: number; livesLost: number };
  statusApplied: { enemyId: number; status: 'burning' | 'chilled' | 'frozen' | 'rooted' | 'fragile' };
  reactionTriggered: { enemyId: number; reaction: ReactionId; x: number; y: number; comboCount: number; comboMult: number };
  comboEnded: { count: number };
  towerBuilt: { towerId: number; slot: number; type: TowerId };
  towerUpgraded: { towerId: number; level: number };
  towerSold: { towerId: number; slot: number; refund: number };
  towerFired: { towerId: number; targetId: number };
  /** Lightning bolt path: tower first, then every enemy hit in order. */
  chainLightning: { towerId: number; points: { x: number; y: number }[] };
  heroFired: { targetId: number };
  /** Catalisar went off: everything within radius was hit with the affinity element. */
  catalyzed: { x: number; y: number; radius: number; element: Element; hits: number; reactions: number };
  waveStarted: { wave: number; early: boolean; bonus: number };
  waveCleared: { wave: number; bonus: number };
  bossAbility: { enemyId: number; x: number; y: number };
  goldChanged: { gold: number; delta: number };
  livesChanged: { lives: number; delta: number };
  gameOver: { won: boolean; stars: number };
}

type Handler<T> = (payload: T) => void;

export class EventBus<E extends object> {
  private handlers: { [K in keyof E]?: Handler<E[K]>[] } = {};

  /** Subscribe; returns an unsubscribe function. */
  on<K extends keyof E>(event: K, handler: Handler<E[K]>): () => void {
    const list = (this.handlers[event] ??= []);
    list.push(handler);
    return () => {
      const i = list.indexOf(handler);
      if (i >= 0) list.splice(i, 1);
    };
  }

  emit<K extends keyof E>(event: K, payload: E[K]): void {
    const list = this.handlers[event];
    if (!list) return;
    for (const h of list.slice()) h(payload);
  }

  clear(): void {
    this.handlers = {};
  }
}
