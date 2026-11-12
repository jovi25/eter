import type * as Phaser from 'phaser';

/**
 * Vector shapes (Graphics) are re-triangulated by the renderer EVERY frame — measured as the biggest cost
 * of a frame (6.6 ms → 0.3 ms without them). Static shapes are drawn once into a texture and shown as a
 * plain Image instead (cached by key, so identical shapes share one texture).
 */

export interface Box {
  x0: number; // left edge of the drawing, in the Graphics' local coordinates (can be negative)
  y0: number;
  w: number;
  h: number;
}

let uid = 0;
const TRANSLATE = 16; // Phaser.GameObjects.Graphics Commands.TRANSLATE

/** Render an already-drawn Graphics into a texture (no-op if the key exists). */
function renderTo(g: Phaser.GameObjects.Graphics, box: Box, key: string): void {
  if (g.scene.textures.exists(key)) return;
  // Shift the drawing into the texture: prepend a TRANSLATE command (Phaser Graphics command id 16),
  // render, then remove it again. (generateTexture cancels the object's own position.)
  const buf = (g as unknown as { commandBuffer: number[] }).commandBuffer;
  buf.unshift(TRANSLATE, -box.x0, -box.y0);
  g.generateTexture(key, Math.ceil(box.w), Math.ceil(box.h));
  buf.splice(0, 3);
}

/**
 * Replace a static Graphics by an Image of itself, keeping position, depth, alpha, visibility and
 * its place in the parent container / display list.
 */
export function bakeInPlace(g: Phaser.GameObjects.Graphics, box: Box, key = `baked_${++uid}`): Phaser.GameObjects.Image {
  const scene = g.scene;
  renderTo(g, box, key);
  const img = scene.make.image({ x: g.x, y: g.y, key } as Phaser.Types.GameObjects.Sprite.SpriteConfig, false);
  img.setOrigin(-box.x0 / box.w, -box.y0 / box.h).setDepth(g.depth).setAlpha(g.alpha).setVisible(g.visible);
  const parent = g.parentContainer;
  if (parent) parent.replace(g as unknown as Phaser.GameObjects.GameObject, img, true);
  else {
    // Same place in the draw order (same-depth siblings keep their order).
    const index = scene.children.getIndex(g);
    scene.add.existing(img);
    if (index >= 0) scene.children.moveTo(img, index);
    g.destroy();
  }
  return img;
}

/** Draw a shape once (cached by key) and return an Image of it at (x, y). */
export function baked(scene: Phaser.Scene, key: string, box: Box, draw: (g: Phaser.GameObjects.Graphics) => void, x = 0, y = 0): Phaser.GameObjects.Image {
  ensureBaked(scene, key, box, draw);
  return scene.add.image(x, y, key).setOrigin(-box.x0 / box.w, -box.y0 / box.h);
}

export function ensureBaked(scene: Phaser.Scene, key: string, box: Box, draw: (g: Phaser.GameObjects.Graphics) => void): void {
  if (scene.textures.exists(key)) return;
  const g = scene.make.graphics({}, false);
  draw(g);
  renderTo(g, box, key);
  g.destroy();
}
