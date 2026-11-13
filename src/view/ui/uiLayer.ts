import * as Phaser from 'phaser';

/**
 * Tall maps scroll under a fixed interface. Everything that belongs to the screen (HUD, panels, banners)
 * is pinned with scroll factor 0. The camera's origin is its top-left corner (see perf.fitCamera), so a
 * pinned object at (x, y) is always drawn at screen (x, y), with any zoom.
 */
export function pin<T extends Phaser.GameObjects.GameObject>(o: T): T {
  const any = o as unknown as { setScrollFactor?: (x: number, y?: number) => unknown; list?: Phaser.GameObjects.GameObject[] };
  any.setScrollFactor?.(0, 0);
  if (o instanceof Phaser.GameObjects.Container) for (const child of o.list) pin(child);
  return o;
}

/** Run `build` and pin every top-level object it added to the scene. */
export function asUi<T>(scene: Phaser.Scene, build: () => T): T {
  const before = new Set(scene.children.list);
  const out = build();
  for (const o of scene.children.list) if (!before.has(o)) pin(o);
  return out;
}
