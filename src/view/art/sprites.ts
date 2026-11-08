import * as Phaser from 'phaser';
import type { EnemyId } from '../../data/enemies';

// Pixel-art sprites from CC0 packs (see public/assets/CREDITS.txt).
// 'dungeon' = 0x72 DungeonTileset II atlas, 'town' = Kenney Tiny Town 16×16 sheet.

export const PIXEL_SCALE = 3; // 16 px art → 48 px on the 720×1280 canvas

export interface SpriteDef {
  frames: string; // atlas frame prefix; frames are `${prefix}0..3`
  scale: number;
  fps: number;
  tint?: number;
}

export const ENEMY_SPRITES: Record<EnemyId, SpriteDef> = {
  slime: { frames: 'swampy_anim_f', scale: 3, fps: 7 },
  wolf: { frames: 'goblin_run_anim_f', scale: 3, fps: 12 },
  golem: { frames: 'ogre_run_anim_f', scale: 2, fps: 6 },
  bat: { frames: 'imp_run_anim_f', scale: 3, fps: 12 },
  salamander: { frames: 'chort_run_anim_f', scale: 3, fps: 10 },
  yeti: { frames: 'ice_zombie_anim_f', scale: 3, fps: 6 },
  skeleton: { frames: 'skelet_run_anim_f', scale: 3, fps: 10 },
  shaman: { frames: 'orc_shaman_run_anim_f', scale: 3, fps: 8 },
  mudling: { frames: 'muddy_anim_f', scale: 3, fps: 6 },
  colossus: { frames: 'big_zombie_run_anim_f', scale: 3, fps: 6 },
  herald: { frames: 'big_demon_run_anim_f', scale: 3, fps: 7, tint: 0xa8e4ff },
};

export const HERO_SPRITE = {
  idle: 'wizzard_m_idle_anim_f',
  run: 'wizzard_m_run_anim_f',
  scale: 3,
};

/** Kenney Tiny Town frame indices (12 per row). */
export const TOWN = {
  grass: [0, 0, 0, 0, 0, 1, 1, 2],
  dirt: { tl: 12, t: 13, tr: 14, l: 24, c: 25, r: 26, bl: 36, b: 37, br: 38, itl: 39, itr: 40, ibr: 41, ibl: 42 },
  decor: [15, 16, 27, 28, 5, 16, 28, 17, 29],
  stones: 43,
};

export function animKey(prefix: string): string {
  return `anim_${prefix}`;
}

/** Loads the pixel-art sheets (call in preload). */
export function preloadPixelArt(scene: Phaser.Scene): void {
  scene.load.atlas('dungeon', 'assets/dungeon.png', 'assets/dungeon.json');
  scene.load.spritesheet('town', 'assets/town.png', { frameWidth: 16, frameHeight: 16 });
}

/** Crisp pixels + animations (call once in create, after loading). */
export function setupPixelArt(scene: Phaser.Scene): void {
  for (const key of ['dungeon', 'town']) scene.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
  const make = (prefix: string, fps: number) => {
    const key = animKey(prefix);
    if (scene.anims.exists(key)) return;
    scene.anims.create({
      key,
      frames: [0, 1, 2, 3].map((i) => ({ key: 'dungeon', frame: `${prefix}${i}` })),
      frameRate: fps,
      repeat: -1,
    });
  };
  for (const s of Object.values(ENEMY_SPRITES)) make(s.frames, s.fps);
  make(HERO_SPRITE.idle, 6);
  make(HERO_SPRITE.run, 10);
  make('coin_anim_f', 10);
}
