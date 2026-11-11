// Sound effects synthesized in code — no audio files.
// Engine: layered voices (oscillators with unison detune / FM, filtered noise), per-voice filter sweeps,
// a shared convolution reverb send and a master compressor. Each play gets a little random pitch variation.
import { getSettings } from '../settings';

type Osc = OscillatorType;

interface FilterSpec {
  type: BiquadFilterType;
  freq: number;
  freqEnd?: number;
  q?: number;
}

interface Voice {
  wave: Osc | 'noise';
  freq?: number; // Hz (oscillators)
  freqEnd?: number; // pitch sweep target
  dur: number; // seconds until silent
  vol: number;
  attack?: number;
  delay?: number;
  detune?: number[]; // cents; extra unison voices
  fm?: { ratio: number; depth: number }; // frequency modulation (metallic / buzzy)
  filter?: FilterSpec;
}

interface Sound {
  voices: Voice[];
  reverb?: number; // 0..1 send
  jitter?: number; // random pitch variation (0.05 = ±5%)
  gap?: number; // min seconds between plays
}

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let comp: DynamicsCompressorNode | null = null;
let reverbIn: GainNode | null = null;
let noiseBuf: AudioBuffer | null = null;
const lastPlayed = new Map<string, number>();

function makeImpulse(ac: AudioContext, seconds: number, decay: number): AudioBuffer {
  const len = Math.floor(ac.sampleRate * seconds);
  const buf = ac.createBuffer(2, len, ac.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
  }
  return buf;
}

/** Shared audio graph for the music player (null until audio is unlocked). */
export function audioNodes(): { ctx: AudioContext; out: AudioNode; reverb: AudioNode | null; noise: AudioBuffer | null } | null {
  if (!ctx || !comp) return null;
  return { ctx, out: comp, reverb: reverbIn, noise: noiseBuf };
}

/** Must be called from a user gesture (tap) before sounds can play on mobile. */
export function unlockAudio(): void {
  try {
    if (!ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      ctx = new Ctor();
      comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -18;
      comp.ratio.value = 4;
      comp.attack.value = 0.003;
      comp.release.value = 0.15;
      comp.connect(ctx.destination);
      master = ctx.createGain();
      master.gain.value = 0.7;
      master.connect(comp);
      const conv = ctx.createConvolver();
      conv.buffer = makeImpulse(ctx, 1.6, 3);
      const wet = ctx.createGain();
      wet.gain.value = 0.35;
      reverbIn = ctx.createGain();
      reverbIn.connect(conv).connect(wet).connect(comp);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const data = noiseBuf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      // Save battery and avoid stray notes when the game is in the background.
      document.addEventListener('visibilitychange', () => {
        if (!ctx) return;
        if (document.hidden) void ctx.suspend();
        else void ctx.resume();
      });
    }
    if (ctx.state === 'suspended') void ctx.resume();
  } catch {
    ctx = null;
  }
}

function playVoice(v: Voice, pitch: number, out: AudioNode, send: AudioNode | null): void {
  const ac = ctx!;
  const t0 = ac.currentTime + (v.delay ?? 0) + 0.005;
  const end = t0 + v.dur;
  const env = ac.createGain();
  const attack = v.attack ?? 0.004;
  env.gain.setValueAtTime(0.0001, t0);
  env.gain.exponentialRampToValueAtTime(v.vol, t0 + attack);
  env.gain.exponentialRampToValueAtTime(0.0001, end);

  let head: AudioNode = env;
  if (v.filter) {
    const f = ac.createBiquadFilter();
    f.type = v.filter.type;
    f.Q.value = v.filter.q ?? 1;
    f.frequency.setValueAtTime(v.filter.freq * pitch, t0);
    if (v.filter.freqEnd) f.frequency.exponentialRampToValueAtTime(v.filter.freqEnd * pitch, end);
    f.connect(env);
    head = f;
  }
  env.connect(out);
  if (send) env.connect(send);

  if (v.wave === 'noise') {
    const src = ac.createBufferSource();
    src.buffer = noiseBuf;
    src.connect(head);
    src.start(t0, Math.random() * 1.5, v.dur + 0.05);
    return;
  }
  const detunes = [0, ...(v.detune ?? [])];
  const gainPer = 1 / Math.sqrt(detunes.length);
  for (const cents of detunes) {
    const osc = ac.createOscillator();
    osc.type = v.wave;
    const f0 = (v.freq ?? 440) * pitch;
    osc.frequency.setValueAtTime(f0, t0);
    if (v.freqEnd) osc.frequency.exponentialRampToValueAtTime(v.freqEnd * pitch, end);
    osc.detune.value = cents;
    if (v.fm) {
      const mod = ac.createOscillator();
      const modGain = ac.createGain();
      mod.frequency.value = f0 * v.fm.ratio;
      modGain.gain.value = f0 * v.fm.depth;
      mod.connect(modGain).connect(osc.frequency);
      mod.start(t0);
      mod.stop(end + 0.05);
    }
    const g = ac.createGain();
    g.gain.value = gainPer;
    osc.connect(g).connect(head);
    osc.start(t0);
    osc.stop(end + 0.05);
  }
}

const bell = (freq: number, dur: number, vol: number, delay = 0): Voice[] => [
  { wave: 'sine', freq, dur, vol, delay, attack: 0.002 },
  { wave: 'sine', freq: freq * 2.76, dur: dur * 0.5, vol: vol * 0.35, delay, attack: 0.002 },
  { wave: 'sine', freq: freq * 5.4, dur: dur * 0.25, vol: vol * 0.15, delay, attack: 0.002 },
];

const SOUNDS = {
  ui: { voices: [{ wave: 'sine', freq: 900, freqEnd: 1300, dur: 0.07, vol: 0.18 }, { wave: 'noise', dur: 0.03, vol: 0.08, filter: { type: 'highpass', freq: 4000 } }], gap: 0.03 },

  // Tower shots
  shoot_physical: {
    voices: [
      { wave: 'noise', dur: 0.11, vol: 0.32, filter: { type: 'bandpass', freq: 5200, freqEnd: 900, q: 2.5 } },
      { wave: 'triangle', freq: 1600, freqEnd: 500, dur: 0.05, vol: 0.06 },
    ],
    jitter: 0.08,
    gap: 0.05,
  },
  shoot_fire: {
    voices: [
      { wave: 'noise', dur: 0.32, vol: 0.38, attack: 0.03, filter: { type: 'lowpass', freq: 600, freqEnd: 2600, q: 1.5 } },
      { wave: 'sine', freq: 140, freqEnd: 55, dur: 0.22, vol: 0.3 },
    ],
    jitter: 0.06,
    gap: 0.08,
  },
  shoot_ice: {
    voices: [...bell(1760, 0.45, 0.12), { wave: 'noise', dur: 0.08, vol: 0.06, filter: { type: 'highpass', freq: 7000 } }],
    reverb: 0.6,
    jitter: 0.06,
    gap: 0.06,
  },
  shoot_nature: {
    voices: [
      { wave: 'sine', freq: 260, freqEnd: 110, dur: 0.16, vol: 0.32 },
      { wave: 'noise', dur: 0.06, vol: 0.15, filter: { type: 'bandpass', freq: 900, q: 4 } },
    ],
    jitter: 0.1,
    gap: 0.08,
  },
  shoot_lightning: {
    voices: [
      { wave: 'sawtooth', freq: 90, freqEnd: 60, dur: 0.28, vol: 0.18, fm: { ratio: 0.53, depth: 6 }, filter: { type: 'lowpass', freq: 3500, freqEnd: 800 } },
      { wave: 'noise', dur: 0.22, vol: 0.28, filter: { type: 'highpass', freq: 2500, freqEnd: 6000 } },
      { wave: 'square', freq: 2400, freqEnd: 600, dur: 0.09, vol: 0.05 },
    ],
    reverb: 0.4,
    jitter: 0.1,
    gap: 0.07,
  },

  hit: { voices: [{ wave: 'noise', dur: 0.04, vol: 0.12, filter: { type: 'bandpass', freq: 1800, q: 3 } }], jitter: 0.15, gap: 0.04 },
  kill: {
    voices: [
      { wave: 'sine', freq: 420, freqEnd: 1300, dur: 0.09, vol: 0.28 },
      { wave: 'noise', dur: 0.12, vol: 0.18, filter: { type: 'bandpass', freq: 2200, freqEnd: 600, q: 2 } },
    ],
    jitter: 0.12,
    gap: 0.04,
  },
  coin: { voices: [...bell(1976, 0.25, 0.1), ...bell(2637, 0.35, 0.1, 0.06)], reverb: 0.3, jitter: 0.03, gap: 0.05 },

  // Reactions — each with its own character
  reaction_wildfire: {
    voices: [
      { wave: 'noise', dur: 0.7, vol: 0.55, attack: 0.02, filter: { type: 'lowpass', freq: 300, freqEnd: 4200, q: 2 } },
      { wave: 'sine', freq: 90, freqEnd: 38, dur: 0.6, vol: 0.5 },
      { wave: 'sawtooth', freq: 180, freqEnd: 90, dur: 0.4, vol: 0.12, detune: [-14, 14], filter: { type: 'lowpass', freq: 1200 } },
    ],
    reverb: 0.5,
  },
  reaction_melt: {
    voices: [
      { wave: 'noise', dur: 0.6, vol: 0.4, filter: { type: 'highpass', freq: 3500, freqEnd: 7000 } },
      { wave: 'sine', freq: 700, freqEnd: 180, dur: 0.35, vol: 0.2 },
      { wave: 'triangle', freq: 1400, freqEnd: 350, dur: 0.3, vol: 0.1, delay: 0.04 },
    ],
    reverb: 0.4,
  },
  reaction_thornfrost: {
    voices: [
      ...bell(2350, 0.35, 0.09),
      ...bell(3140, 0.3, 0.08, 0.05),
      ...bell(2790, 0.4, 0.08, 0.1),
      { wave: 'noise', dur: 0.25, vol: 0.22, filter: { type: 'bandpass', freq: 1400, q: 6 } },
      { wave: 'sine', freq: 160, freqEnd: 80, dur: 0.25, vol: 0.3 },
    ],
    reverb: 0.6,
  },
  reaction_shatter: {
    voices: [
      { wave: 'noise', dur: 0.4, vol: 0.45, filter: { type: 'highpass', freq: 4500, freqEnd: 2500 } },
      ...bell(2493, 0.5, 0.1),
      ...bell(3729, 0.45, 0.08, 0.02),
      ...bell(5274, 0.3, 0.06, 0.04),
    ],
    reverb: 0.7,
  },
  reaction_overload: {
    voices: [
      { wave: 'noise', dur: 0.45, vol: 0.5, attack: 0.005, filter: { type: 'bandpass', freq: 5000, freqEnd: 600, q: 1.5 } },
      { wave: 'sawtooth', freq: 140, freqEnd: 50, dur: 0.35, vol: 0.22, fm: { ratio: 0.51, depth: 5 }, filter: { type: 'lowpass', freq: 2500 } },
      { wave: 'sine', freq: 80, freqEnd: 35, dur: 0.5, vol: 0.5 },
    ],
    reverb: 0.5,
  },
  reaction_superconduct: {
    voices: [
      ...bell(3136, 0.4, 0.09),
      ...bell(4186, 0.35, 0.07, 0.04),
      { wave: 'square', freq: 1800, freqEnd: 300, dur: 0.18, vol: 0.06 },
      { wave: 'noise', dur: 0.3, vol: 0.25, filter: { type: 'highpass', freq: 5000 } },
    ],
    reverb: 0.6,
  },
  boon: {
    voices: [
      ...bell(784, 0.5, 0.1),
      ...bell(1175, 0.5, 0.1, 0.08),
      ...bell(1568, 0.9, 0.12, 0.16),
      { wave: 'noise', dur: 0.8, vol: 0.14, delay: 0.1, filter: { type: 'highpass', freq: 6000, freqEnd: 10000 } },
    ],
    reverb: 0.7,
  },
  hero_swing: {
    voices: [{ wave: 'noise', dur: 0.14, vol: 0.3, attack: 0.02, filter: { type: 'bandpass', freq: 900, freqEnd: 3200, q: 1.2 } }],
    jitter: 0.1,
    gap: 0.08,
  },

  build: {
    voices: [
      { wave: 'sine', freq: 170, freqEnd: 55, dur: 0.25, vol: 0.5 },
      { wave: 'noise', dur: 0.12, vol: 0.3, filter: { type: 'bandpass', freq: 700, q: 2 } },
      ...bell(1047, 0.4, 0.08, 0.12),
      ...bell(1319, 0.4, 0.08, 0.18),
      ...bell(1568, 0.6, 0.08, 0.24),
    ],
    reverb: 0.35,
  },
  upgrade: {
    voices: [
      ...bell(784, 0.3, 0.09),
      ...bell(988, 0.3, 0.09, 0.07),
      ...bell(1175, 0.3, 0.09, 0.14),
      ...bell(1568, 0.7, 0.11, 0.21),
      { wave: 'noise', dur: 0.6, vol: 0.12, delay: 0.2, filter: { type: 'highpass', freq: 6000, freqEnd: 9000 } },
    ],
    reverb: 0.5,
  },
  sell: { voices: [...bell(1568, 0.2, 0.09), ...bell(1319, 0.2, 0.09, 0.07), ...bell(1047, 0.35, 0.09, 0.14)], reverb: 0.3 },
  wave: {
    voices: [
      { wave: 'sawtooth', freq: 147, dur: 0.35, vol: 0.18, attack: 0.05, detune: [-10, 10], filter: { type: 'lowpass', freq: 900 } },
      { wave: 'sawtooth', freq: 220, dur: 0.7, vol: 0.2, attack: 0.06, delay: 0.3, detune: [-10, 10], filter: { type: 'lowpass', freq: 600, freqEnd: 1800 } },
      { wave: 'sine', freq: 73, dur: 0.9, vol: 0.25, delay: 0.3 },
    ],
    reverb: 0.5,
  },
  leak: {
    voices: [
      { wave: 'sine', freq: 110, freqEnd: 45, dur: 0.45, vol: 0.5 },
      { wave: 'sawtooth', freq: 233, freqEnd: 110, dur: 0.35, vol: 0.1, detune: [30], filter: { type: 'lowpass', freq: 900 } },
      { wave: 'noise', dur: 0.2, vol: 0.2, filter: { type: 'lowpass', freq: 500 } },
    ],
  },
  hero_shoot: {
    voices: [
      { wave: 'sine', freq: 880, freqEnd: 1500, dur: 0.12, vol: 0.12 },
      { wave: 'triangle', freq: 1760, freqEnd: 2600, dur: 0.1, vol: 0.05, delay: 0.02 },
    ],
    reverb: 0.3,
    jitter: 0.06,
    gap: 0.08,
  },
  catalyze: {
    voices: [
      { wave: 'noise', dur: 0.7, vol: 0.5, attack: 0.01, filter: { type: 'bandpass', freq: 400, freqEnd: 5000, q: 1.2 } },
      { wave: 'sine', freq: 110, freqEnd: 45, dur: 0.5, vol: 0.55 },
      { wave: 'sawtooth', freq: 220, freqEnd: 880, dur: 0.35, vol: 0.12, detune: [-12, 12], filter: { type: 'lowpass', freq: 2500 } },
      ...bell(1047, 0.8, 0.1, 0.05),
      ...bell(1568, 0.8, 0.08, 0.1),
    ],
    reverb: 0.6,
  },
  cd_tick: { voices: [...bell(2093, 0.18, 0.06)], jitter: 0.08, gap: 0.05 },
  ready: { voices: [...bell(1319, 0.3, 0.1), ...bell(1976, 0.5, 0.1, 0.08)], reverb: 0.5 },
  error: { voices: [{ wave: 'square', freq: 180, freqEnd: 140, dur: 0.14, vol: 0.08, filter: { type: 'lowpass', freq: 900 } }], gap: 0.1 },
  boss: {
    voices: [
      { wave: 'sawtooth', freq: 55, freqEnd: 41, dur: 1.4, vol: 0.32, attack: 0.15, detune: [-18, 18], filter: { type: 'lowpass', freq: 380 } },
      { wave: 'noise', dur: 1.2, vol: 0.25, attack: 0.2, filter: { type: 'lowpass', freq: 250, freqEnd: 900 } },
      ...bell(587, 1.0, 0.06, 0.2),
      ...bell(554, 1.0, 0.06, 0.2),
    ],
    reverb: 0.7,
  },
  boss_cast: {
    voices: [
      { wave: 'noise', dur: 0.6, vol: 0.25, filter: { type: 'bandpass', freq: 3000, freqEnd: 800, q: 3 } },
      ...bell(1661, 0.6, 0.06),
    ],
    reverb: 0.6,
    gap: 0.3,
  },
  mvp: {
    voices: [
      ...bell(523, 0.4, 0.12),
      ...bell(659, 0.4, 0.12, 0.12),
      ...bell(784, 0.4, 0.12, 0.24),
      ...bell(1047, 1.2, 0.15, 0.36),
      { wave: 'sawtooth', freq: 262, dur: 1.2, vol: 0.12, delay: 0.36, attack: 0.05, detune: [-12, 12], filter: { type: 'lowpass', freq: 1500 } },
      { wave: 'noise', dur: 1.2, vol: 0.2, filter: { type: 'highpass', freq: 5000, freqEnd: 9000 } },
    ],
    reverb: 0.7,
  },
  victory: {
    voices: [
      ...bell(523, 0.35, 0.14),
      ...bell(659, 0.35, 0.14, 0.15),
      ...bell(784, 0.35, 0.14, 0.3),
      ...bell(1047, 1.4, 0.16, 0.45),
      { wave: 'triangle', freq: 262, dur: 1.6, vol: 0.18, delay: 0.45, attack: 0.04, detune: [-8, 8] },
      { wave: 'triangle', freq: 392, dur: 1.6, vol: 0.12, delay: 0.45, attack: 0.04 },
    ],
    reverb: 0.6,
  },
  defeat: {
    voices: [
      ...bell(392, 0.5, 0.12),
      ...bell(349, 0.5, 0.12, 0.3),
      ...bell(311, 0.5, 0.12, 0.6),
      { wave: 'triangle', freq: 131, dur: 1.8, vol: 0.2, delay: 0.9, attack: 0.05, detune: [-10, 10] },
    ],
    reverb: 0.7,
  },
  star: { voices: [...bell(1568, 0.6, 0.12), { wave: 'noise', dur: 0.4, vol: 0.12, filter: { type: 'highpass', freq: 7000 } }], reverb: 0.6 },
} satisfies Record<string, Sound>;

export type SfxName = keyof typeof SOUNDS;

/** @param pitch 1 = normal; >1 higher (used to make chained reactions climb) */
export function playSfx(name: SfxName, pitch = 1): void {
  if (!ctx || !master || !getSettings().sound) return;
  const s = SOUNDS[name] as Sound;
  const now = ctx.currentTime;
  if (now - (lastPlayed.get(name) ?? -1) < (s.gap ?? 0.02)) return;
  lastPlayed.set(name, now);
  const p = pitch * (1 + (Math.random() * 2 - 1) * (s.jitter ?? 0));
  let send: GainNode | null = null;
  if (s.reverb && reverbIn) {
    send = ctx.createGain();
    send.gain.value = s.reverb;
    send.connect(reverbIn);
  }
  for (const v of s.voices) playVoice(v, p, master, send);
}
