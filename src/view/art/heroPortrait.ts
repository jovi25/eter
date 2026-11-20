import * as Phaser from 'phaser';
import { HEROES, type HeroClass } from '../../data/heroes';

/** A hero's picture for menus: the illustration when it is loaded (docs/ARTE_IA.md), otherwise the painted
 *  figure. `rigScale` is the scale the painted figure (120×160 frame) would use; the illustration gets the same height. */
export function heroPortrait(scene: Phaser.Scene, cls: HeroClass, x: number, y: number, rigScale: number): Phaser.GameObjects.Image {
  const key = `heropic_${cls}`;
  if (scene.textures.exists(key)) {
    const img = scene.add.image(x, y, key);
    return img.setScale((rigScale * 150) / img.height);
  }
  return scene.add.image(x, y, HEROES[cls].texture).setScale(rigScale);
}

/** Texture key of a hero's menu icon (illustration when loaded). */
export function heroIconKey(scene: Phaser.Scene, cls: HeroClass): string {
  return scene.textures.exists(`heropic_${cls}`) ? `heropic_${cls}` : HEROES[cls].texture;
}
