import * as Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../../data/config';
import { playSfx } from '../audio/sfx';
import { PAL } from '../art/palette';
import { getSettings, setSetting, type Settings } from '../settings';
import { Button, uiText } from '../ui/Button';
import { DEPTH } from './layers';

function backdrop(scene: Phaser.Scene): Phaser.GameObjects.Rectangle {
  const r = scene.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x07040f, 0.7).setDepth(DEPTH.panel);
  r.setInteractive(); // swallow taps behind the panel
  return r;
}

function panel(scene: Phaser.Scene, w: number, h: number, y = GAME_HEIGHT / 2): Phaser.GameObjects.Container {
  const g = scene.add.graphics();
  g.fillStyle(PAL.ink, 1);
  g.fillRoundedRect(-w / 2 - 5, -h / 2 - 5, w + 10, h + 14, 34);
  g.fillStyle(0x2a1a4d, 1);
  g.fillRoundedRect(-w / 2, -h / 2, w, h, 30);
  g.lineStyle(4, 0x7d5ce0, 1);
  g.strokeRoundedRect(-w / 2 + 8, -h / 2 + 8, w - 16, h - 16, 24);
  const c = scene.add.container(GAME_WIDTH / 2, y, [g]).setDepth(DEPTH.panel);
  c.setScale(0.6).setAlpha(0);
  scene.tweens.add({ targets: c, scale: 1, alpha: 1, duration: 260, ease: 'Back.easeOut' });
  return c;
}

const LABELS: Record<keyof Settings, string> = { sound: 'Som', vibration: 'Vibração', shake: 'Tremor de tela' };

export class PausePanel {
  private objs: Phaser.GameObjects.GameObject[] = [];

  constructor(scene: Phaser.Scene, cb: { onResume: () => void; onRestart: () => void; onExit: () => void }) {
    const bg = backdrop(scene);
    const p = panel(scene, 520, 740);
    p.add(uiText(scene, 0, -300, 'PAUSA', 56));
    p.add(new Button(scene, 0, 330, { width: 400, height: 64, label: 'Sair para o mapa', fontSize: 24, color: 0x6b6480, onClick: cb.onExit }));
    (Object.keys(LABELS) as (keyof Settings)[]).forEach((key, i) => {
      const y = -200 + i * 92;
      const label = () => `${LABELS[key]}: ${getSettings()[key] ? 'LIGADO' : 'DESLIGADO'}`;
      const btn = new Button(scene, 0, y, {
        width: 400,
        height: 72,
        label: label(),
        fontSize: 26,
        color: getSettings()[key] ? 0x3aa655 : 0x6b6480,
        onClick: () => {
          setSetting(key, !getSettings()[key]);
          btn.setLabel(label()).setColor(getSettings()[key] ? 0x3aa655 : 0x6b6480);
        },
      });
      p.add(btn);
    });
    p.add(new Button(scene, 0, 120, { width: 400, height: 80, label: 'CONTINUAR', fontSize: 32, color: 0x3d7bd9, onClick: cb.onResume }));
    p.add(new Button(scene, 0, 226, { width: 400, height: 68, label: 'Reiniciar fase', fontSize: 26, color: 0xc0504a, onClick: cb.onRestart }));
    this.objs = [bg, p];
  }

  destroy(): void {
    for (const o of this.objs) o.destroy();
  }
}

export interface EndStats {
  won: boolean;
  stars: number;
  lives: number;
  maxLives: number;
  reactions: number;
  bestCombo: number;
  seconds: number;
  kills: number;
  bestCatalyze: number;
  skillName: string;
  skillCasts: number;
  boons: number;
  rift?: { wave: number; best: number; record: boolean };
  challenges?: { text: string; done: boolean; fresh: boolean }[];
  daily?: { score: number; best: number; record: boolean };
}

export class EndPanel {
  constructor(scene: Phaser.Scene, s: EndStats, cb: { onReplay: () => void; onMap: () => void; onNext?: () => void }) {
    backdrop(scene);
    const p = panel(scene, 600, 800);
    const title = uiText(scene, 0, -300, s.rift ? 'FIM DA FENDA' : s.won ? 'VITÓRIA!' : 'DERROTA', s.rift ? 60 : 72, s.won || s.rift ? PAL.goldCss : PAL.redCss, 12);
    p.add(title);
    scene.tweens.add({ targets: title, scale: { from: 1.08, to: 1 }, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // Stars pop in one by one.
    if (s.rift) {
      p.add(uiText(scene, 0, -200, `Onda ${s.rift.wave}`, 76, '#ffffff', 12));
      p.add(uiText(scene, 0, -132, s.rift.record ? '★ NOVO RECORDE! ★' : `Recorde: onda ${s.rift.best}`, 28, s.rift.record ? PAL.goldCss : PAL.uiDim, 6));
      if (s.rift.record) playSfx('star');
    }
    for (let i = 0; i < (s.rift ? 0 : 3); i++) {
      const x = (i - 1) * 140;
      const y = i === 1 ? -170 : -150;
      p.add(scene.add.image(x, y, 'starEmpty').setScale(1.4));
      if (i < s.stars) {
        const star = scene.add.image(x, y, 'star').setScale(0).setAngle(-30);
        p.add(star);
        scene.tweens.add({
          targets: star,
          scale: 1.4,
          angle: 0,
          delay: 500 + i * 380,
          duration: 380,
          ease: 'Back.easeOut',
          onStart: () => playSfx('star', 1 + i * 0.15),
        });
      }
    }

    const mm = Math.floor(s.seconds / 60);
    const ss = String(Math.floor(s.seconds % 60)).padStart(2, '0');
    const lines = [
      `Vidas: ${s.lives}/${s.maxLives}   •   Tempo: ${mm}:${ss}`,
      `Reações: ${s.reactions}   •   Maior combo: ×${s.bestCombo}`,
      s.skillName === 'Catalisar' ? `Melhor Catalisar: ${s.bestCatalyze} reações` : `${s.skillName}: ${s.skillCasts}×`,
      `Bênçãos: ${s.boons}   •   Abates: ${s.kills}`,
    ];
    lines.forEach((l, i) => p.add(uiText(scene, 0, -88 + i * 34, l, 22, i === 1 ? '#ffe34d' : PAL.uiText, 5)));
    if (s.daily) {
      p.add(uiText(scene, 0, 66, 'PONTUAÇÃO DO DIA', 22, PAL.uiDim, 5));
      p.add(uiText(scene, 0, 108, `${s.daily.score}`, 54, '#ffffff', 9));
      p.add(uiText(scene, 0, 154, s.daily.record ? '★ MELHOR DE HOJE! ★' : `Melhor de hoje: ${s.daily.best}`, 22, s.daily.record ? PAL.goldCss : PAL.uiDim, 5));
    } else if (s.challenges) {
      p.add(uiText(scene, 0, 58, 'DESAFIOS', 22, PAL.uiDim, 5));
      s.challenges.forEach((c, i) => {
        const mark = c.done ? '✔' : '○';
        const t = uiText(scene, 0, 92 + i * 32, `${mark} ${c.text}${c.fresh ? '  NOVO!' : ''}`, 21, c.fresh ? PAL.goldCss : c.done ? '#9be89b' : PAL.uiDim, 5);
        p.add(t);
        if (c.fresh) {
          t.setScale(0);
          scene.tweens.add({ targets: t, scale: 1, delay: 1700 + i * 300, duration: 300, ease: 'Back.easeOut', onStart: () => playSfx('star', 1.2) });
        }
      });
    }
    if (cb.onNext) {
      p.add(new Button(scene, 0, 222, { width: 440, height: 80, label: 'PRÓXIMA FASE ▶', fontSize: 32, color: 0x3aa655, onClick: cb.onNext }));
      p.add(new Button(scene, -112, 320, { width: 216, height: 64, label: 'Repetir', fontSize: 24, color: 0x3d7bd9, onClick: cb.onReplay }));
      p.add(new Button(scene, 112, 320, { width: 216, height: 64, label: 'Mapa', fontSize: 24, color: 0x6b6480, onClick: cb.onMap }));
    } else {
      p.add(new Button(scene, 0, 222, { width: 440, height: 80, label: s.won ? 'JOGAR DE NOVO' : 'TENTAR DE NOVO', fontSize: 32, color: 0x3aa655, onClick: cb.onReplay }));
      p.add(new Button(scene, 0, 320, { width: 300, height: 64, label: 'Mapa', fontSize: 24, color: 0x6b6480, onClick: cb.onMap }));
    }
  }
}
