import * as Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../../data/config';
import { ELEMENTS } from '../../data/elements';
import { HEROES, type HeroClass } from '../../data/heroes';
import { HERO_LEVELS, MAX_HERO_LEVEL, SKILL2, TALENTS, WEAPON_IDS, WEAPONS, talentsOf } from '../../data/talents';
import { getSave } from '../../meta/save';
import { PAL } from '../art/palette';
import { playSfx } from '../audio/sfx';
import { Button, uiText } from './Button';

const W = 660;
const H = 1160;

/**
 * Hero sheet (Fase 8): level + XP, the 3 talents (equip one), the level-5 second skill and,
 * for the Arcanista, the weapon (element of every spell).
 */
export class HeroPanel {
  private root: Phaser.GameObjects.Container | null = null;

  constructor(
    private scene: Phaser.Scene,
    private cls: HeroClass,
    private onClose: () => void,
  ) {
    this.build(true);
  }

  private close(): void {
    this.root?.destroy();
    this.root = null;
    this.onClose();
  }

  private build(animate: boolean): void {
    this.root?.destroy();
    const scene = this.scene;
    const save = getSave();
    const cls = this.cls;
    const def = HEROES[cls];
    const level = save.heroLevel(cls);
    const xp = save.data.heroes[cls].xp;
    const equipped = save.data.heroes[cls].talent;
    const c = scene.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2).setDepth(80);
    const shade = scene.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x07040f, 0.75).setInteractive();
    const g = scene.add.graphics();
    g.fillStyle(PAL.ink, 1);
    g.fillRoundedRect(-W / 2, -H / 2, W, H, 30);
    g.fillStyle(0x2a1a4d, 1);
    g.fillRoundedRect(-W / 2 + 5, -H / 2 + 5, W - 10, H - 10, 26);
    c.add([shade, g]);

    // Header: portrait, name, level, XP bar.
    const top = -H / 2;
    c.add(scene.add.image(-W / 2 + 92, top + 98, def.texture).setScale(0.7));
    c.add(uiText(scene, 40, top + 50, def.name, 36, '#f3e9ff', 7));
    c.add(uiText(scene, 40, top + 94, `Nível ${level}${level >= MAX_HERO_LEVEL ? ' (máximo)' : ''}`, 24, PAL.goldCss, 5));
    const next = HERO_LEVELS.xp[level];
    const prev = HERO_LEVELS.xp[level - 1]!;
    const frac = next === undefined ? 1 : (xp - prev) / (next - prev);
    g.fillStyle(PAL.ink, 1);
    g.fillRoundedRect(-120, top + 120, 320, 22, 11);
    g.fillStyle(0xffd34d, 1);
    if (frac > 0) g.fillRoundedRect(-117, top + 123, Math.max(16, 314 * Math.min(1, frac)), 16, 8);
    c.add(uiText(scene, 40, top + 160, next === undefined ? `${xp} XP` : `${xp} / ${next} XP  •  1 XP por onda vencida`, 17, PAL.uiDim, 4));
    c.add(uiText(scene, 0, top + 206, def.role, 18, PAL.uiText, 4).setWordWrapWidth(W - 60));

    // Talents.
    let y = top + 262;
    c.add(uiText(scene, 0, y, 'TALENTO (escolha 1)', 22, PAL.uiDim, 5));
    y += 30;
    for (const id of talentsOf(cls)) {
      const t = TALENTS[id];
      const open = level >= t.level;
      const on = equipped === id;
      const card = scene.add.container(0, y + 62);
      const bg = scene.add.graphics();
      bg.fillStyle(on ? 0xffd34d : PAL.ink, 1);
      bg.fillRoundedRect(-W / 2 + 24, -58, W - 48, 116, 18);
      bg.fillStyle(open ? (on ? 0x4a3380 : 0x3d2a6a) : 0x241a3a, 1);
      bg.fillRoundedRect(-W / 2 + 29, -53, W - 58, 106, 15);
      const name = uiText(scene, -W / 2 + 48, -30, `${on ? '✔ ' : ''}${t.name}`, 24, open ? (on ? PAL.goldCss : '#f3e9ff') : PAL.uiDim, 5).setOrigin(0, 0.5);
      const text = uiText(scene, -W / 2 + 48, 16, open ? t.text : `🔒 Nível ${t.level}`, 17, open ? PAL.uiText : PAL.uiDim, 4)
        .setOrigin(0, 0.5)
        .setAlign('left')
        .setWordWrapWidth(W - 110);
      card.add([bg, name, text]);
      card.setSize(W - 48, 116).setInteractive({ useHandCursor: true });
      card.on('pointerdown', () => {
        if (!open) {
          playSfx('error');
          return;
        }
        playSfx('ui');
        save.setTalent(cls, on ? null : id);
        this.build(false);
      });
      c.add(card);
      y += 128;
    }

    // Second skill.
    const s2 = SKILL2[cls];
    const s2open = level >= HERO_LEVELS.skill2Level;
    y += 18;
    c.add(uiText(scene, 0, y, `2ª HABILIDADE ${s2open ? '(ativa)' : `(nível ${HERO_LEVELS.skill2Level})`}`, 22, s2open ? '#9be89b' : PAL.uiDim, 5));
    c.add(uiText(scene, 0, y + 34, s2.name, 24, s2open ? '#f3e9ff' : PAL.uiDim, 5));
    c.add(uiText(scene, 0, y + 68, s2.text, 17, s2open ? PAL.uiText : PAL.uiDim, 4).setWordWrapWidth(W - 70));
    y += 108;

    // Arcanista weapon.
    if (cls === 'mage') {
      y += 10;
      c.add(uiText(scene, 0, y, 'ARMA (elemento das magias)', 22, PAL.uiDim, 5));
      const cur = save.data.weapon;
      WEAPON_IDS.forEach((wid, i) => {
        const w = WEAPONS[wid];
        const open = level >= w.level;
        const on = cur === wid;
        const x = (i - 1.5) * 150;
        const color = ELEMENTS[w.element].color;
        const slot = scene.add.container(x, y + 72);
        const bg = scene.add.graphics();
        bg.fillStyle(on ? 0xffd34d : PAL.ink, 1);
        bg.fillRoundedRect(-68, -50, 136, 100, 16);
        bg.fillStyle(open ? 0x3d2a6a : 0x241a3a, 1);
        bg.fillRoundedRect(-63, -45, 126, 90, 13);
        bg.fillStyle(open ? color : 0x4a4458, 1);
        bg.fillCircle(0, -14, 18);
        bg.lineStyle(3, PAL.ink, 1);
        bg.strokeCircle(0, -14, 18);
        const label = uiText(scene, 0, 26, open ? w.name.split(' ').pop()! : `🔒 Nv ${w.level}`, 17, open ? '#f3e9ff' : PAL.uiDim, 4);
        slot.add([bg, label]);
        slot.setSize(136, 100).setInteractive({ useHandCursor: true });
        slot.on('pointerdown', () => {
          if (!open) {
            playSfx('error');
            return;
          }
          playSfx('ui');
          save.setWeapon(wid);
          this.build(false);
        });
        c.add(slot);
      });
      const w = WEAPONS[cur];
      c.add(uiText(scene, 0, y + 150, `${w.name}: ${w.text}`, 17, PAL.uiText, 4).setWordWrapWidth(W - 70));
    }

    c.add(new Button(scene, 0, H / 2 - 62, { width: 300, height: 76, label: 'PRONTO', fontSize: 32, color: 0x3aa655, onClick: () => this.close() }));
    if (animate) {
      c.setScale(0.8).setAlpha(0);
      scene.tweens.add({ targets: c, scale: 1, alpha: 1, duration: 200, ease: 'Back.easeOut' });
    }
    this.root = c;
  }
}
