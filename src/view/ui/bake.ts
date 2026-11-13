import * as Phaser from 'phaser';

/**
 * Baking: static shapes and labels are drawn ONCE into a shared texture (the "UI atlas") and shown as Images.
 *
 * Two measured reasons:
 *  1. Vector shapes (Graphics) are re-triangulated every frame (6.6 ms → 0.3 ms without them).
 *  2. Every separate texture (and every Graphics) starts a new draw call. On low-end phones the draw calls,
 *     not the pixels, are what limits the frame rate. Sharing one texture lets a whole scene go out in a few calls.
 */

export interface Box {
  x0: number; // left edge of the drawing, in the shape's local coordinates (can be negative)
  y0: number;
  w: number;
  h: number;
}

export const UI_ATLAS = 'atlas_ui';
const SIZE = 2048;
const PAD = 2;
const MAX_AREA = 420_000; // bigger than this (full-screen panels) gets its own texture
const TRANSLATE = 16; // Phaser.GameObjects.Graphics Commands.TRANSLATE
/** Scene background column, reserved when the atlas is created (tall maps are up to this size). */
export const BG_KEY = 'scene_bg';
export const BG_MAX = { w: 720, h: 1920 };
const LEFT = PAD + BG_MAX.w + PAD; // everything else is packed to the right of the background

let uid = 0;
let atlas: Phaser.Textures.CanvasTexture | null = null;
const cursor = { x: LEFT, y: PAD, shelf: 0 };
let dirty = false;
let scratch: HTMLCanvasElement | null = null;
const regions = new Map<string, { x: number; y: number; w: number; h: number }>();

function getAtlas(scene: Phaser.Scene): Phaser.Textures.CanvasTexture | null {
  if (atlas) return atlas;
  atlas = scene.textures.createCanvas(UI_ATLAS, SIZE, SIZE);
  regions.set(BG_KEY, { x: PAD, y: PAD, w: BG_MAX.w, h: BG_MAX.h });
  return atlas;
}

function alloc(w: number, h: number, big: boolean): { x: number; y: number } | null {
  if ((!big && w * h > MAX_AREA) || LEFT + w + PAD > SIZE) return null;
  if (cursor.x + w + PAD > SIZE) {
    cursor.x = LEFT;
    cursor.y += cursor.shelf + PAD;
    cursor.shelf = 0;
  }
  if (cursor.y + h + PAD > SIZE) return null;
  const at = { x: cursor.x, y: cursor.y };
  cursor.x += w + PAD;
  cursor.shelf = Math.max(cursor.shelf, h);
  return at;
}

/** Upload the atlas once, right before the next frame is drawn (many bakes → one upload). */
function markDirty(scene: Phaser.Scene): void {
  if (dirty) return;
  dirty = true;
  scene.game.events.once('prerender', () => {
    dirty = false;
    atlas?.refresh();
  });
}

function registerFrame(scene: Phaser.Scene, key: string, x: number, y: number, w: number, h: number): void {
  const tex = new Phaser.Textures.Texture(scene.textures, key, [], 0, 0);
  tex.source.push(atlas!.source[0]!);
  tex.add('__BASE', 0, x, y, w, h);
  (scene.textures.list as Record<string, Phaser.Textures.Texture>)[key] = tex;
}

/**
 * Put a ready-made picture (canvas) into the UI atlas under `key`.
 * With `reuse`, a key that already exists is painted over in place (used for the scene background).
 * Returns false when it does not fit (the caller then keeps a texture of its own).
 */
export function stamp(scene: Phaser.Scene, key: string, src: HTMLCanvasElement, w: number, h: number, reuse = false): boolean {
  const a = getAtlas(scene);
  if (!a) return false;
  let at = reuse ? regions.get(key) : undefined;
  if (at && (w > at.w || h > at.h)) return false; // the reserved place is too small
  if (!at) {
    const p = alloc(w, h, reuse);
    if (!p) return false;
    at = { ...p, w, h };
    regions.set(key, at);
  }
  // (Re)register: a reused place can hold a smaller picture this time (e.g. a one-screen map after a tall one).
  if (!scene.textures.exists(key) || reuse) registerFrame(scene, key, at.x, at.y, w, h);
  const ctx = a.getContext();
  ctx.clearRect(at.x - 1, at.y - 1, w + 2, h + 2);
  ctx.drawImage(src, 0, 0, w, h, at.x, at.y, w, h);
  markDirty(scene);
  return true;
}

function scratchCanvas(w: number, h: number): HTMLCanvasElement {
  scratch ??= document.createElement('canvas');
  scratch.width = w; // also clears it
  scratch.height = h;
  return scratch;
}

/** Render an already-drawn Graphics under `key` (no-op if the key exists). */
function renderTo(g: Phaser.GameObjects.Graphics, box: Box, key: string): void {
  const scene = g.scene;
  if (scene.textures.exists(key)) return;
  const w = Math.ceil(box.w);
  const h = Math.ceil(box.h);
  // Shift the drawing into view: prepend a TRANSLATE command, render, remove it again.
  const buf = (g as unknown as { commandBuffer: number[] }).commandBuffer;
  buf.unshift(TRANSLATE, -box.x0, -box.y0);
  const canvas = scratchCanvas(w, h);
  g.generateTexture(canvas as unknown as string, w, h);
  if (!stamp(scene, key, canvas, w, h)) {
    // too big for the atlas: a texture of its own
    const own = scene.textures.createCanvas(key, w, h);
    own?.getContext().drawImage(canvas, 0, 0);
    own?.refresh();
  }
  buf.splice(0, 3);
}

/**
 * Replace a static Graphics by an Image of itself, keeping position, depth, alpha, visibility and
 * its place in the parent container / display list.
 */
export function bakeInPlace(g: Phaser.GameObjects.Graphics, box: Box, key = `baked_${++uid}`): Phaser.GameObjects.Image {
  renderTo(g, box, key);
  const img = g.scene.make.image({ x: g.x, y: g.y, key } as Phaser.Types.GameObjects.Sprite.SpriteConfig, false);
  img.setOrigin(-box.x0 / box.w, -box.y0 / box.h);
  return swap(g, img);
}

/**
 * Replace a Text whose content will never change by an Image of it (texts each have a texture of their own,
 * i.e. one draw call each).
 */
export function bakeText(t: Phaser.GameObjects.Text): Phaser.GameObjects.Image | Phaser.GameObjects.Text {
  const scene = t.scene;
  const key = `txt_${t.style.fontSize}_${t.style.color}_${t.style.strokeThickness}_${t.text}`;
  const w = t.canvas.width;
  const h = t.canvas.height;
  if (!scene.textures.exists(key) && !stamp(scene, key, t.canvas, w, h)) return t;
  const img = scene.make.image({ x: t.x, y: t.y, key } as Phaser.Types.GameObjects.Sprite.SpriteConfig, false);
  img.setOrigin(t.originX, t.originY).setDisplaySize(t.width * t.scaleX, t.height * t.scaleY);
  return swap(t, img);
}

function swap(old: Phaser.GameObjects.Graphics | Phaser.GameObjects.Text, img: Phaser.GameObjects.Image): Phaser.GameObjects.Image {
  const scene = old.scene;
  img.setDepth(old.depth).setAlpha(old.alpha).setVisible(old.visible);
  const parent = old.parentContainer;
  if (parent) parent.replace(old as unknown as Phaser.GameObjects.GameObject, img, true);
  else {
    // Same place in the draw order (same-depth siblings keep their order).
    const index = scene.children.getIndex(old);
    scene.add.existing(img);
    if (index >= 0) scene.children.moveTo(img, index);
    old.destroy();
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
