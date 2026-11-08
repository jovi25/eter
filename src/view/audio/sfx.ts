// Sound effects synthesized in code (sfxr-style): oscillators + noise + envelopes. No audio files.
import { getSettings } from '../settings';

type Wave = OscillatorType | 'noise';

interface Voice {
  wave: Wave;
  freq: number;
  freqEnd?: number;
  dur: number;
  vol: number;
  attack?: number;
  delay?: number;
  filter?: number; // lowpass cutoff for noise
}

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noiseBuf: AudioBuffer | null = null;
const lastPlayed = new Map<string, number>();

/** Must be called from a user gesture (tap) before sounds can play on mobile. */
export function unlockAudio(): void {
  try {
    if (!ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      ctx = new Ctor();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const data = noiseBuf.getChannelData(0);
      let seed = 1234567;
      for (let i = 0; i < data.length; i++) {
        seed = (seed * 16807) % 2147483647;
        data[i] = (seed / 2147483647) * 2 - 1;
      }
    }
    if (ctx.state === 'suspended') void ctx.resume();
  } catch {
    ctx = null;
  }
}

function voice(v: Voice, pitch: number): void {
  if (!ctx || !master) return;
  const t0 = ctx.currentTime + (v.delay ?? 0);
  const gain = ctx.createGain();
  const attack = v.attack ?? 0.005;
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(v.vol, t0 + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + v.dur);
  gain.connect(master);
  if (v.wave === 'noise') {
    if (!noiseBuf) return;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime((v.filter ?? 3000) * pitch, t0);
    if (v.freqEnd) filter.frequency.exponentialRampToValueAtTime(v.freqEnd * pitch, t0 + v.dur);
    src.connect(filter).connect(gain);
    src.start(t0, Math.random() * 0.5, v.dur + 0.05);
    return;
  }
  const osc = ctx.createOscillator();
  osc.type = v.wave;
  osc.frequency.setValueAtTime(v.freq * pitch, t0);
  if (v.freqEnd) osc.frequency.exponentialRampToValueAtTime(v.freqEnd * pitch, t0 + v.dur);
  osc.connect(gain);
  osc.start(t0);
  osc.stop(t0 + v.dur + 0.05);
}

const SOUNDS = {
  ui: [{ wave: 'square', freq: 880, freqEnd: 1320, dur: 0.06, vol: 0.12 }],
  shoot_physical: [{ wave: 'noise', freq: 0, filter: 5000, freqEnd: 1500, dur: 0.07, vol: 0.12 }],
  shoot_fire: [{ wave: 'noise', freq: 0, filter: 900, freqEnd: 300, dur: 0.18, vol: 0.2 }],
  shoot_ice: [{ wave: 'sine', freq: 1700, freqEnd: 2400, dur: 0.09, vol: 0.09 }],
  shoot_nature: [{ wave: 'triangle', freq: 220, freqEnd: 140, dur: 0.12, vol: 0.18 }],
  hit: [{ wave: 'square', freq: 300, freqEnd: 120, dur: 0.04, vol: 0.05 }],
  kill: [
    { wave: 'square', freq: 520, freqEnd: 260, dur: 0.08, vol: 0.12 },
    { wave: 'noise', freq: 0, filter: 2500, dur: 0.1, vol: 0.12 },
  ],
  coin: [
    { wave: 'square', freq: 988, dur: 0.06, vol: 0.08 },
    { wave: 'square', freq: 1319, dur: 0.12, vol: 0.08, delay: 0.06 },
  ],
  reaction: [
    { wave: 'sawtooth', freq: 220, freqEnd: 660, dur: 0.25, vol: 0.14 },
    { wave: 'triangle', freq: 440, freqEnd: 1320, dur: 0.3, vol: 0.14 },
    { wave: 'noise', freq: 0, filter: 4000, freqEnd: 500, dur: 0.3, vol: 0.15 },
  ],
  shatter: [
    { wave: 'noise', freq: 0, filter: 8000, freqEnd: 2000, dur: 0.25, vol: 0.25 },
    { wave: 'sine', freq: 2600, freqEnd: 1800, dur: 0.2, vol: 0.1 },
  ],
  build: [
    { wave: 'triangle', freq: 120, freqEnd: 60, dur: 0.15, vol: 0.3 },
    { wave: 'square', freq: 660, dur: 0.08, vol: 0.08, delay: 0.08 },
    { wave: 'square', freq: 990, dur: 0.12, vol: 0.08, delay: 0.14 },
  ],
  upgrade: [
    { wave: 'square', freq: 523, dur: 0.08, vol: 0.09 },
    { wave: 'square', freq: 659, dur: 0.08, vol: 0.09, delay: 0.07 },
    { wave: 'square', freq: 784, dur: 0.08, vol: 0.09, delay: 0.14 },
    { wave: 'square', freq: 1047, dur: 0.18, vol: 0.09, delay: 0.21 },
  ],
  sell: [
    { wave: 'square', freq: 784, dur: 0.07, vol: 0.08 },
    { wave: 'square', freq: 523, dur: 0.12, vol: 0.08, delay: 0.07 },
  ],
  wave: [
    { wave: 'sawtooth', freq: 196, dur: 0.25, vol: 0.12, attack: 0.03 },
    { wave: 'sawtooth', freq: 294, dur: 0.45, vol: 0.12, attack: 0.03, delay: 0.22 },
  ],
  leak: [{ wave: 'sawtooth', freq: 110, freqEnd: 55, dur: 0.35, vol: 0.2 }],
  boss: [
    { wave: 'sawtooth', freq: 70, freqEnd: 45, dur: 1.0, vol: 0.25, attack: 0.1 },
    { wave: 'noise', freq: 0, filter: 400, dur: 1.0, vol: 0.2, attack: 0.1 },
  ],
  mvp: [
    { wave: 'square', freq: 523, dur: 0.15, vol: 0.1 },
    { wave: 'square', freq: 659, dur: 0.15, vol: 0.1, delay: 0.12 },
    { wave: 'square', freq: 784, dur: 0.15, vol: 0.1, delay: 0.24 },
    { wave: 'square', freq: 1047, dur: 0.6, vol: 0.12, delay: 0.36 },
    { wave: 'noise', freq: 0, filter: 6000, freqEnd: 800, dur: 0.8, vol: 0.15 },
  ],
  victory: [
    { wave: 'triangle', freq: 523, dur: 0.18, vol: 0.18 },
    { wave: 'triangle', freq: 659, dur: 0.18, vol: 0.18, delay: 0.16 },
    { wave: 'triangle', freq: 784, dur: 0.18, vol: 0.18, delay: 0.32 },
    { wave: 'triangle', freq: 1047, dur: 0.7, vol: 0.2, delay: 0.48 },
  ],
  defeat: [
    { wave: 'triangle', freq: 392, dur: 0.25, vol: 0.18 },
    { wave: 'triangle', freq: 330, dur: 0.25, vol: 0.18, delay: 0.25 },
    { wave: 'triangle', freq: 262, dur: 0.7, vol: 0.18, delay: 0.5 },
  ],
  star: [
    { wave: 'square', freq: 1319, dur: 0.1, vol: 0.1 },
    { wave: 'sine', freq: 2637, dur: 0.3, vol: 0.08, delay: 0.05 },
  ],
} satisfies Record<string, Voice[]>;

export type SfxName = keyof typeof SOUNDS;

/** Minimum gap between two plays of the same sound (avoids a wall of noise from many towers). */
const MIN_GAP: Partial<Record<SfxName, number>> = {
  shoot_physical: 0.06,
  shoot_fire: 0.08,
  shoot_ice: 0.06,
  shoot_nature: 0.08,
  hit: 0.05,
  kill: 0.04,
  coin: 0.05,
};

/** @param pitch 1 = normal; >1 higher (used to make chained reactions climb) */
export function playSfx(name: SfxName, pitch = 1): void {
  if (!ctx || !getSettings().sound) return;
  const now = ctx.currentTime;
  const gap = MIN_GAP[name] ?? 0.02;
  if (now - (lastPlayed.get(name) ?? -1) < gap) return;
  lastPlayed.set(name, now);
  for (const v of SOUNDS[name] as Voice[]) voice(v, pitch);
}
