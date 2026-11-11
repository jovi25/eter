// Background music composed in code — no audio files.
// A tiny step sequencer (8th notes) with four layers: pad, bass, arpeggio and a generated melody,
// plus soft percussion. Each stage has its own theme (key, mode, tempo, chords, timbre).
// Intensity: 0 = between waves (calm), 1 = wave in progress, 2 = boss / deep in the Fenda.
import { getSettings } from '../settings';
import { audioNodes } from './sfx';

export type ThemeId = 'map' | 'v1' | 'v2' | 'v3' | 'v4' | 'v5' | 'rift';

interface Theme {
  bpm: number;
  root: number; // MIDI note of the tonic
  scale: number[]; // 7 semitone offsets
  prog: number[]; // scale degree of the chord in each bar (0 = I)
  arp: number[]; // 8 steps: index into chord tones (0..5, two octaves), -1 = rest
  pad: OscillatorType;
  lead: OscillatorType;
  drums: boolean;
  seed: number;
  bright: number; // pad filter cutoff (Hz)
}

const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const MINOR = [0, 2, 3, 5, 7, 8, 10];
const DORIAN = [0, 2, 3, 5, 7, 9, 10];
const LYDIAN = [0, 2, 4, 6, 7, 9, 11];
const HARMONIC = [0, 2, 3, 5, 7, 8, 11];
const PHRYGIAN = [0, 1, 3, 5, 7, 8, 10];

export const THEMES: Record<ThemeId, Theme> = {
  map: { bpm: 84, root: 62, scale: LYDIAN, prog: [0, 1, 0, 4], arp: [0, 2, 4, 2, 3, 2, 4, 2], pad: 'triangle', lead: 'sine', drums: false, seed: 11, bright: 1400 },
  v1: { bpm: 104, root: 55, scale: MAJOR, prog: [0, 4, 5, 3], arp: [0, 1, 2, 3, 2, 1, 2, 1], pad: 'triangle', lead: 'triangle', drums: true, seed: 21, bright: 1600 },
  v2: { bpm: 110, root: 57, scale: DORIAN, prog: [0, 3, 0, 6], arp: [0, 2, 1, 3, 2, 4, 3, 1], pad: 'triangle', lead: 'triangle', drums: true, seed: 37, bright: 1500 },
  v3: { bpm: 116, root: 52, scale: MINOR, prog: [0, 5, 2, 6], arp: [0, 1, 2, 1, 3, 1, 2, 1], pad: 'sawtooth', lead: 'triangle', drums: true, seed: 43, bright: 1100 },
  v4: { bpm: 98, root: 53, scale: PHRYGIAN, prog: [0, 1, 0, 6], arp: [0, -1, 2, 1, -1, 2, 3, -1], pad: 'sawtooth', lead: 'sine', drums: true, seed: 59, bright: 900 },
  v5: { bpm: 124, root: 50, scale: HARMONIC, prog: [0, 5, 3, 4], arp: [0, 1, 2, 3, 4, 3, 2, 1], pad: 'sawtooth', lead: 'triangle', drums: true, seed: 71, bright: 1300 },
  rift: { bpm: 128, root: 59, scale: MINOR, prog: [0, 5, 6, 4], arp: [0, 2, 4, 5, 4, 2, 3, 1], pad: 'sawtooth', lead: 'square', drums: true, seed: 97, bright: 1800 },
};

const STEPS_PER_BAR = 8;
const MELODY_BARS = 8;

const midiHz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Scale degree (can be negative / above 7) → MIDI note. */
function degree(th: Theme, d: number): number {
  const oct = Math.floor(d / 7);
  const i = ((d % 7) + 7) % 7;
  return th.root + th.scale[i]! + 12 * oct;
}

function chordTones(th: Theme, bar: number): number[] {
  const d = th.prog[bar % th.prog.length]!;
  return [d, d + 2, d + 4, d + 7, d + 9, d + 11].map((x) => degree(th, x));
}

interface Note {
  step: number;
  midi: number;
  len: number;
}

/** A memorable 8-bar phrase, generated once per theme from its seed (so it repeats like a real tune). */
export function makeMelody(th: Theme): Note[] {
  const r = rng(th.seed);
  const notes: Note[] = [];
  let cur = 9; // scale degree, roughly an octave above the tonic
  for (let bar = 0; bar < MELODY_BARS; bar++) {
    const chord = th.prog[bar % th.prog.length]!;
    // Bars 3 and 7 breathe (long note), the last bar resolves to the tonic.
    for (let s = 0; s < STEPS_PER_BAR; s++) {
      const strong = s === 0 || s === 4;
      const p = strong ? 0.85 : s % 2 === 0 ? 0.45 : 0.18;
      if (bar === 7 && s > 0) break;
      if ((bar === 3 || bar === 7) && s > 0 && s !== 4) continue;
      if (r() > p) continue;
      if (bar === 7) cur = 7;
      else if (strong) {
        const targets = [chord + 7, chord + 9, chord + 11];
        cur = targets.reduce((best, t) => (Math.abs(t - cur) < Math.abs(best - cur) ? t : best), targets[0]!);
      } else cur += r() < 0.5 ? -1 : 1;
      cur = Math.max(5, Math.min(14, cur));
      notes.push({ step: bar * STEPS_PER_BAR + s, midi: degree(th, cur), len: 1 });
    }
  }
  // Each note lasts until the next one (max half a bar).
  for (let i = 0; i < notes.length; i++) {
    const next = notes[i + 1]?.step ?? MELODY_BARS * STEPS_PER_BAR;
    notes[i]!.len = Math.min(4, next - notes[i]!.step);
  }
  return notes;
}

// ───────────────────────────── player ─────────────────────────────

let theme: Theme | null = null;
let themeId: ThemeId | null = null;
let melody: Note[] = [];
let bus: GainNode | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
let step = 0;
let nextTime = 0;
let intensity = 0;

const VOLUME = 0.5;

function tone(
  ac: AudioContext,
  out: AudioNode,
  wave: OscillatorType,
  midi: number,
  t: number,
  dur: number,
  vol: number,
  opts: { attack?: number; cutoff?: number; detune?: number[]; glideFrom?: number } = {},
): void {
  const env = ac.createGain();
  const attack = opts.attack ?? 0.01;
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(vol, t + attack);
  env.gain.setValueAtTime(vol, Math.max(t + attack, t + dur * 0.6));
  env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  let head: AudioNode = env;
  if (opts.cutoff) {
    const f = ac.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = opts.cutoff;
    f.connect(env);
    head = f;
  }
  env.connect(out);
  const dets = [0, ...(opts.detune ?? [])];
  for (const d of dets) {
    const o = ac.createOscillator();
    o.type = wave;
    o.frequency.setValueAtTime(opts.glideFrom ?? midiHz(midi), t);
    if (opts.glideFrom) o.frequency.exponentialRampToValueAtTime(midiHz(midi), t + 0.08);
    o.detune.value = d;
    o.connect(head);
    o.start(t);
    o.stop(t + dur + 0.05);
  }
}

function noise(ac: AudioContext, out: AudioNode, buf: AudioBuffer, t: number, dur: number, vol: number, hp: number): void {
  const src = ac.createBufferSource();
  src.buffer = buf;
  const f = ac.createBiquadFilter();
  f.type = 'highpass';
  f.frequency.value = hp;
  const g = ac.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(out);
  src.start(t, Math.random() * 1.5, dur + 0.02);
}

function kick(ac: AudioContext, out: AudioNode, t: number, vol: number): void {
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.frequency.setValueAtTime(130, t);
  o.frequency.exponentialRampToValueAtTime(42, t + 0.16);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
  o.connect(g).connect(out);
  o.start(t);
  o.stop(t + 0.25);
}

function scheduleStep(ac: AudioContext, out: AudioNode, buf: AudioBuffer | null, th: Theme, n: number, t: number): void {
  const stepDur = 60 / th.bpm / 2;
  const bar = Math.floor(n / STEPS_PER_BAR);
  const s = n % STEPS_PER_BAR;
  const chord = chordTones(th, bar);
  const lvl = intensity;

  // Pad: whole bar, soft and wide.
  if (s === 0) {
    for (const m of chord.slice(0, 3)) tone(ac, out, th.pad, m, t, stepDur * 8.4, 0.03, { attack: 0.35, cutoff: th.bright * (lvl > 0 ? 1.2 : 0.8), detune: [-7, 7] });
  }
  // Bass: root on 1 and 3; driving 8ths when intense.
  const bassHit = s === 0 || s === 4 || (lvl >= 1 && s === 6) || (lvl >= 2 && s % 2 === 0);
  if (bassHit) tone(ac, out, 'triangle', chord[0]! - 12, t, stepDur * (lvl >= 2 ? 0.9 : 1.6), 0.13, { cutoff: 700 });
  // Arpeggio (always on the map, during waves in battle).
  if (lvl >= 1 || !th.drums) {
    const idx = th.arp[s]!;
    if (idx >= 0) tone(ac, out, 'triangle', chord[idx]! + 12, t, stepDur * 0.9, th.drums ? 0.035 : 0.028, { cutoff: 2400 });
  }
  // Melody: plays on alternate 8-bar phrases so it doesn't get tiring.
  const phrase = Math.floor(bar / MELODY_BARS);
  if ((lvl >= 1 || !th.drums) && phrase % 2 === 0) {
    const local = n % (MELODY_BARS * STEPS_PER_BAR);
    for (const note of melody) {
      if (note.step === local) tone(ac, out, th.lead, note.midi, t, stepDur * note.len * 0.95, th.lead === 'square' ? 0.022 : 0.05, { attack: 0.02, cutoff: 3000 });
    }
  }
  // Percussion.
  if (th.drums && buf) {
    if (lvl >= 1 && s % 2 === 1) noise(ac, out, buf, t, 0.04, 0.05, 7000);
    if (lvl >= 1 && (s === 0 || s === 4)) kick(ac, out, t, lvl >= 2 ? 0.32 : 0.22);
    if (lvl >= 2 && (s === 2 || s === 6)) noise(ac, out, buf, t, 0.12, 0.09, 1800);
    if (lvl === 0 && s === 0 && bar % 2 === 0) noise(ac, out, buf, t, 0.3, 0.025, 6000);
  }
}

function tick(): void {
  const a = audioNodes();
  if (!a || !theme || !bus) return;
  const ac = a.ctx;
  const stepDur = 60 / theme.bpm / 2;
  // After the tab was asleep, don't try to catch up — restart from now.
  if (nextTime < ac.currentTime - 0.2) nextTime = ac.currentTime + 0.05;
  while (nextTime < ac.currentTime + 0.25) {
    scheduleStep(ac, bus, a.noise, theme, step, nextTime);
    step++;
    nextTime += stepDur;
  }
}

function fadeOutBus(): void {
  const a = audioNodes();
  if (!a || !bus) return;
  const old = bus;
  const t = a.ctx.currentTime;
  old.gain.cancelScheduledValues(t);
  old.gain.setValueAtTime(old.gain.value, t);
  old.gain.linearRampToValueAtTime(0, t + 0.6);
  setTimeout(() => old.disconnect(), 800);
  bus = null;
}

/** Start (or switch to) a theme. Safe to call before audio is unlocked: it starts once possible. */
export function playMusic(id: ThemeId): void {
  if (themeId === id && bus) return;
  themeId = id;
  startIfPossible();
}

function startIfPossible(): void {
  const a = audioNodes();
  if (!a || !themeId || !getSettings().music) return;
  fadeOutBus();
  theme = THEMES[themeId];
  melody = makeMelody(theme);
  bus = a.ctx.createGain();
  const t = a.ctx.currentTime;
  bus.gain.setValueAtTime(0, t);
  bus.gain.linearRampToValueAtTime(VOLUME, t + 1.2);
  bus.connect(a.out);
  if (a.reverb) {
    const send = a.ctx.createGain();
    send.gain.value = 0.25;
    bus.connect(send).connect(a.reverb);
  }
  step = 0;
  nextTime = t + 0.1;
  if (!timer) timer = setInterval(tick, 60);
}

export function stopMusic(): void {
  fadeOutBus();
  if (timer) clearInterval(timer);
  timer = null;
}

/** 0 = calm, 1 = wave in progress, 2 = boss / late Fenda. */
export function setMusicIntensity(level: number): void {
  intensity = Math.max(0, Math.min(2, level));
}

/** Called when the player flips the music option or audio is unlocked. */
export function refreshMusic(): void {
  if (!getSettings().music) stopMusic();
  else if (themeId && !bus) startIfPossible();
}
