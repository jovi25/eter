// Background music composed in code — no audio files.
// A small step sequencer (8th notes): warm pad, walking bass, harp arpeggio, a bell / flute melody built
// from a motif (A A' B ...), a stereo echo and a light drum kit. Each stage has its own theme (key, mode, tempo, chords, timbre).
// Intensity: 0 = between waves (calm), 1 = wave in progress, 2 = boss / deep in the Fenda.
import { getSettings } from '../settings';
import { audioNodes } from './sfx';
import { economyOn } from '../perf';

export type ThemeId = 'map' | 'map2' | 'v1' | 'v2' | 'v3' | 'v4' | 'v5' | 'a1' | 'a2' | 'a3' | 'a4' | 'a5' | 'c1' | 'c2' | 'c3' | 'c4' | 'c5' | 'i1' | 'i2' | 'i3' | 'i4' | 'i5' | 'gale' | 'hunt' | 'rift';

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
  // Região 2: warmer, desert-like modes.
  map2: { bpm: 80, root: 57, scale: DORIAN, prog: [0, 3, 4, 0], arp: [0, 2, 4, 2, 1, 2, 4, 2], pad: 'triangle', lead: 'sine', drums: false, seed: 13, bright: 1300 },
  a1: { bpm: 108, root: 52, scale: DORIAN, prog: [0, 6, 3, 4], arp: [0, 2, 1, 3, 2, 4, 2, 1], pad: 'triangle', lead: 'triangle', drums: true, seed: 101, bright: 1500 },
  a2: { bpm: 112, root: 54, scale: HARMONIC, prog: [0, 3, 4, 0], arp: [0, 1, 2, 4, 2, 1, 3, 1], pad: 'triangle', lead: 'triangle', drums: true, seed: 113, bright: 1400 },
  a3: { bpm: 118, root: 50, scale: PHRYGIAN, prog: [0, 1, 6, 0], arp: [0, 2, -1, 3, 2, 4, 1, -1], pad: 'sawtooth', lead: 'triangle', drums: true, seed: 127, bright: 1200 },
  a4: { bpm: 114, root: 55, scale: MINOR, prog: [0, 3, 6, 4], arp: [0, 1, 3, 2, 4, 3, 1, 2], pad: 'triangle', lead: 'sine', drums: true, seed: 131, bright: 1500 },
  a5: { bpm: 126, root: 49, scale: HARMONIC, prog: [0, 5, 1, 4], arp: [0, 2, 4, 6, 4, 2, 3, 1], pad: 'sawtooth', lead: 'square', drums: true, seed: 149, bright: 1400 },
  // Região 3: cold, airy, a bit solemn.
  c1: { bpm: 100, root: 57, scale: LYDIAN, prog: [0, 4, 5, 1], arp: [0, 2, 4, 6, 4, 2, 1, 2], pad: 'triangle', lead: 'sine', drums: true, seed: 151, bright: 1900 },
  c2: { bpm: 106, root: 55, scale: DORIAN, prog: [0, 6, 4, 3], arp: [0, 4, 2, 5, 3, 1, 2, 4], pad: 'triangle', lead: 'sine', drums: true, seed: 163, bright: 1800 },
  c3: { bpm: 112, root: 52, scale: MINOR, prog: [0, 3, 5, 4], arp: [0, 2, 3, 5, 3, 2, 1, 2], pad: 'sawtooth', lead: 'triangle', drums: true, seed: 173, bright: 1500 },
  c4: { bpm: 110, root: 54, scale: LYDIAN, prog: [0, 1, 4, 5], arp: [0, 1, 2, 4, 2, 1, 3, 2], pad: 'triangle', lead: 'triangle', drums: true, seed: 181, bright: 1700 },
  c5: { bpm: 128, root: 50, scale: PHRYGIAN, prog: [0, 1, 5, 4], arp: [0, 2, 4, 2, 5, 4, 2, 1], pad: 'sawtooth', lead: 'square', drums: true, seed: 191, bright: 1300 },
  // Região 4: floating, strange, a bit dreamy.
  i1: { bpm: 104, root: 53, scale: DORIAN, prog: [0, 5, 3, 4], arp: [0, 3, 5, 7, 5, 3, 2, 4], pad: 'triangle', lead: 'sine', drums: true, seed: 197, bright: 1600 },
  i2: { bpm: 116, root: 56, scale: MINOR, prog: [0, 6, 5, 4], arp: [0, 4, 2, 6, 4, 2, 3, 1], pad: 'sawtooth', lead: 'triangle', drums: true, seed: 211, bright: 1700 },
  i3: { bpm: 110, root: 51, scale: PHRYGIAN, prog: [0, 1, 4, 3], arp: [0, 2, 1, 4, 3, 5, 2, 1], pad: 'triangle', lead: 'sine', drums: true, seed: 223, bright: 1400 },
  i4: { bpm: 120, root: 54, scale: HARMONIC, prog: [0, 3, 4, 0], arp: [0, 1, 4, 2, 5, 4, 2, 1], pad: 'sawtooth', lead: 'triangle', drums: true, seed: 227, bright: 1500 },
  i5: { bpm: 132, root: 49, scale: HARMONIC, prog: [0, 1, 6, 4], arp: [0, 3, 4, 7, 4, 3, 1, 2], pad: 'sawtooth', lead: 'square', drums: true, seed: 233, bright: 1300 },
  gale: { bpm: 112, root: 57, scale: LYDIAN, prog: [0, 4, 1, 5], arp: [0, 2, 4, 5, 4, 2, 1, 3], pad: 'triangle', lead: 'sine', drums: true, seed: 241, bright: 2000 },
  hunt: { bpm: 136, root: 52, scale: MINOR, prog: [0, 6, 5, 4], arp: [0, 3, 4, 7, 4, 3, 2, 1], pad: 'sawtooth', lead: 'square', drums: true, seed: 517, bright: 2200 },
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

/** Chord of a bar (scale degree). 8-bar form: the progression twice, the last bar on V to pull back to the start. */
function chordDegree(th: Theme, bar: number): number {
  const b = bar % MELODY_BARS;
  if (b === 7) return 4;
  return th.prog[b % th.prog.length]!;
}

function chordTones(th: Theme, bar: number): number[] {
  const d = chordDegree(th, bar);
  // Two octaves and a bit: some arpeggios reach index 7 (it used to be missing and cut the whole step).
  return [d, d + 2, d + 4, d + 7, d + 9, d + 11, d + 14, d + 16].map((x) => degree(th, x));
}

interface Note {
  step: number;
  midi: number;
  len: number;
}

/** Rhythms of one bar (8th notes): 1 = a note starts here. Hand-picked so a motif sounds sung, not random. */
const RHYTHMS = [
  [1, 0, 1, 0, 1, 0, 0, 0],
  [1, 0, 0, 1, 0, 0, 1, 0],
  [1, 0, 1, 1, 1, 0, 0, 0],
  [1, 0, 0, 0, 1, 0, 1, 0],
  [1, 1, 1, 0, 1, 0, 0, 0],
  [1, 0, 1, 0, 1, 0, 1, 0],
  [0, 0, 1, 0, 1, 1, 1, 0],
  [1, 0, 0, 1, 1, 0, 1, 0],
];

/**
 * An 8-bar tune built like a real one: a 1-bar motif (A), the same motif on the next chord, an answer (B),
 * a long note to breathe, A again, the motif upside down, a climb and the final note.
 * Strong beats land on chord tones, the rest move by step. Same seed → same tune, every time.
 */
export function makeMelody(th: Theme): Note[] {
  const r = rng(th.seed);
  const pick = <T>(a: T[]): T => a[Math.floor(r() * a.length)]!;
  const rhA = pick(RHYTHMS);
  const rhB = pick(RHYTHMS);
  const rhC = pick(RHYTHMS);
  const contour = () => Array.from({ length: 8 }, () => pick([-1, -1, 1, 1, 2, -2, 0, 1]));
  const cA = contour();
  const cB = contour();
  const hold = [1, 0, 0, 0, 0, 0, 0, 0];
  const plan: { rh: number[]; c: number[] | null; up: number }[] = [
    { rh: rhA, c: cA, up: 0 },
    { rh: rhA, c: cA, up: 0 },
    { rh: rhB, c: cB, up: 1 },
    { rh: hold, c: null, up: 0 },
    { rh: rhA, c: cA, up: 0 },
    { rh: rhC, c: cA.map((x) => -x), up: 0 },
    { rh: rhB, c: cB.map((x) => Math.abs(x) || 1), up: 1 },
    { rh: hold, c: null, up: 0 },
  ];
  const notes: Note[] = [];
  let cur = 9;
  plan.forEach((bar, b) => {
    const chord = chordDegree(th, b);
    const tones = [chord + 7, chord + 9, chord + 11, chord + 14];
    const nearest = (x: number) => tones.reduce((best, t) => (Math.abs(t - x) < Math.abs(best - x) ? t : best), tones[0]!);
    let k = 0;
    for (let s = 0; s < STEPS_PER_BAR; s++) {
      if (!bar.rh[s]) continue;
      if (b === 7) cur = cur > 10 ? 14 : 7; // home: the tonic
      else if (s === 0 || !bar.c) cur = nearest(cur + bar.up);
      else {
        cur += bar.c[k % bar.c.length]!;
        if (s === 4) cur = nearest(cur);
      }
      k++;
      cur = Math.max(5, Math.min(15, cur));
      notes.push({ step: b * STEPS_PER_BAR + s, midi: degree(th, cur), len: 1 });
    }
  });
  for (let i = 0; i < notes.length; i++) {
    const next = notes[i + 1]?.step ?? MELODY_BARS * STEPS_PER_BAR;
    notes[i]!.len = Math.max(1, Math.min(8, next - notes[i]!.step));
  }
  return notes;
}

// ───────────────────────────── player ─────────────────────────────

let theme: Theme | null = null;
let themeId: ThemeId | null = null;
let melody: Note[] = [];
let bus: GainNode | null = null;
let echo: AudioNode | null = null; // stereo echo send of the current bus (melody and harp)
let timer: ReturnType<typeof setInterval> | null = null;
let step = 0;
let nextTime = 0;
let intensity = 0;

const VOLUME = 0.55;

/** Left/right placement (−1..1); plain connection when the browser has no StereoPanner. */
function panned(ac: AudioContext, out: AudioNode, pan: number): AudioNode {
  if (!pan || !ac.createStereoPanner) return out;
  const p = ac.createStereoPanner();
  p.pan.value = pan;
  p.connect(out);
  return p;
}

function envelope(ac: AudioContext, out: AudioNode, t: number, dur: number, vol: number, attack: number, release: number): GainNode {
  const env = ac.createGain();
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(vol, t + attack);
  env.gain.setValueAtTime(vol, Math.max(t + attack, t + dur - release));
  env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  env.connect(out);
  return env;
}

function osc(ac: AudioContext, wave: OscillatorType, hz: number, t: number, end: number, out: AudioNode, detune = 0): OscillatorNode {
  const o = ac.createOscillator();
  o.type = wave;
  o.frequency.setValueAtTime(hz, t);
  o.detune.value = detune;
  o.connect(out);
  o.start(t);
  o.stop(end + 0.05);
  return o;
}

/** Warm pad: detuned saws (or triangles) under a lowpass that slowly opens and closes. */
function pad(ac: AudioContext, out: AudioNode, wave: OscillatorType, midi: number, t: number, dur: number, vol: number, cutoff: number, pan: number): void {
  const f = ac.createBiquadFilter();
  f.type = 'lowpass';
  f.Q.value = 0.6;
  f.frequency.setValueAtTime(cutoff * 0.55, t);
  f.frequency.linearRampToValueAtTime(cutoff, t + dur * 0.5);
  f.frequency.linearRampToValueAtTime(cutoff * 0.7, t + dur);
  const env = envelope(ac, panned(ac, out, pan), t, dur, vol, Math.min(0.6, dur * 0.3), dur * 0.35);
  f.connect(env);
  const hz = midiHz(midi);
  for (const d of economyOn() ? [0] : [-9, 9]) osc(ac, wave, hz, t, t + dur, f, d);
}

/** Round bass: a sine with a soft triangle on top, plucked. */
function bass(ac: AudioContext, out: AudioNode, midi: number, t: number, dur: number, vol: number): void {
  const f = ac.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.setValueAtTime(900, t);
  f.frequency.exponentialRampToValueAtTime(260, t + Math.min(dur, 0.4));
  const env = envelope(ac, out, t, dur, vol, 0.008, dur * 0.5);
  f.connect(env);
  const hz = midiHz(midi);
  osc(ac, 'sine', hz, t, t + dur, env);
  osc(ac, 'triangle', hz, t, t + dur, f);
}

/** Harp pluck: a bright tone whose filter closes fast. */
function pluck(ac: AudioContext, out: AudioNode, midi: number, t: number, vol: number, pan: number): void {
  const dur = 0.55;
  const f = ac.createBiquadFilter();
  f.type = 'lowpass';
  f.Q.value = 2;
  f.frequency.setValueAtTime(3200, t);
  f.frequency.exponentialRampToValueAtTime(380, t + 0.3);
  const env = ac.createGain();
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(vol, t + 0.004);
  env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  env.connect(panned(ac, out, pan));
  f.connect(env);
  const hz = midiHz(midi);
  osc(ac, 'sawtooth', hz, t, t + dur, f);
  osc(ac, 'triangle', hz * 2, t, t + dur, f);
}

/** Bell / celesta (FM): a bright strike that rings out. */
function bell(ac: AudioContext, out: AudioNode, midi: number, t: number, dur: number, vol: number, pan: number): void {
  const hz = midiHz(midi);
  const ring = Math.max(0.5, Math.min(1.8, dur * 1.4));
  const env = ac.createGain();
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(vol, t + 0.005);
  env.gain.exponentialRampToValueAtTime(vol * 0.35, t + 0.25);
  env.gain.exponentialRampToValueAtTime(0.0001, t + ring);
  env.connect(panned(ac, out, pan));
  const car = osc(ac, 'sine', hz, t, t + ring, env);
  const mod = ac.createOscillator();
  mod.frequency.value = hz * 3.5;
  const idx = ac.createGain();
  idx.gain.setValueAtTime(hz * 2.2, t);
  idx.gain.exponentialRampToValueAtTime(hz * 0.05, t + 0.5);
  mod.connect(idx).connect(car.frequency);
  mod.start(t);
  mod.stop(t + ring + 0.05);
  osc(ac, 'triangle', hz / 2, t, t + ring, env, 3); // a soft octave below gives it a body
}

/** Flute-like lead: soft attack, a breath of vibrato on long notes. */
function flute(ac: AudioContext, out: AudioNode, midi: number, t: number, dur: number, vol: number, wave: OscillatorType): void {
  const f = ac.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = wave === 'square' ? 1800 : 3200;
  const env = envelope(ac, out, t, dur, vol, 0.045, Math.min(0.2, dur * 0.4));
  f.connect(env);
  const hz = midiHz(midi);
  const o = osc(ac, wave === 'square' ? 'square' : 'triangle', hz, t, t + dur, f);
  const o2 = osc(ac, 'sine', hz * 2, t, t + dur, f, 4);
  if (dur > 0.35 && !economyOn()) {
    const lfo = ac.createOscillator();
    lfo.frequency.value = 5.2;
    const depth = ac.createGain();
    depth.gain.setValueAtTime(0, t);
    depth.gain.linearRampToValueAtTime(hz * 0.006, t + 0.3);
    lfo.connect(depth);
    depth.connect(o.frequency);
    depth.connect(o2.frequency);
    lfo.start(t);
    lfo.stop(t + dur + 0.05);
  }
}

function noise(ac: AudioContext, out: AudioNode, buf: AudioBuffer, t: number, dur: number, vol: number, type: BiquadFilterType, hz: number, pan = 0): void {
  const src = ac.createBufferSource();
  src.buffer = buf;
  const f = ac.createBiquadFilter();
  f.type = type;
  f.frequency.value = hz;
  const g = ac.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(panned(ac, out, pan));
  src.start(t, Math.random() * 1.5, dur + 0.02);
}

function kick(ac: AudioContext, out: AudioNode, t: number, vol: number): void {
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.frequency.setValueAtTime(150, t);
  o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
  o.connect(g).connect(out);
  o.start(t);
  o.stop(t + 0.32);
}

function snare(ac: AudioContext, out: AudioNode, buf: AudioBuffer, t: number, vol: number): void {
  noise(ac, out, buf, t, 0.16, vol, 'bandpass', 2200);
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = 'triangle';
  o.frequency.setValueAtTime(220, t);
  o.frequency.exponentialRampToValueAtTime(140, t + 0.08);
  g.gain.setValueAtTime(vol * 0.8, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
  o.connect(g).connect(out);
  o.start(t);
  o.stop(t + 0.12);
}

/** Stereo echo (dotted 8th left, quarter right): makes thin synths sound like they are in a room. */
function makeEcho(ac: AudioContext, out: AudioNode, bpm: number): AudioNode | null {
  if (economyOn() || !ac.createStereoPanner) return null;
  const input = ac.createGain();
  input.gain.value = 0.3;
  const beat = 60 / bpm;
  const tap = (time: number, pan: number) => {
    const d = ac.createDelay(2);
    d.delayTime.value = time;
    const fb = ac.createGain();
    fb.gain.value = 0.3;
    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 2600;
    d.connect(lp).connect(fb).connect(d);
    lp.connect(panned(ac, out, pan));
    input.connect(d);
  };
  tap(beat * 0.75, -0.6);
  tap(beat * 1.5, 0.6);
  return input;
}

function scheduleStep(ac: AudioContext, out: AudioNode, buf: AudioBuffer | null, th: Theme, n: number, t: number): void {
  const stepDur = 60 / th.bpm / 2;
  const bar = Math.floor(n / STEPS_PER_BAR);
  const s = n % STEPS_PER_BAR;
  const chord = chordTones(th, bar);
  const lvl = intensity;
  const calm = lvl === 0 && th.drums; // battle, between waves
  const lively = lvl >= 1 || !th.drums; // a wave is on, or the map

  // Pad: the chord held for the whole bar (with its octave when calm, for a fuller sound).
  if (s === 0) {
    const tones = calm || !th.drums ? chord.slice(0, 4) : chord.slice(0, 3);
    tones.forEach((m, i) => pad(ac, out, th.pad, m, t, stepDur * 8.6, 0.022, th.bright * (lvl > 0 ? 1.15 : 0.8), (i - 1) * 0.35));
  }
  // Bass: root on 1, fifth on 3; in the wave it walks to the next chord at the end of the bar.
  if (s === 0) bass(ac, out, chord[0]! - 12, t, stepDur * (lvl >= 1 ? 1.8 : 3.6), 0.16);
  if (s === 4) bass(ac, out, (lvl >= 1 ? chord[2]! : chord[0]!) - 12, t, stepDur * (lvl >= 1 ? 1.6 : 3.6), lvl >= 1 ? 0.13 : 0.1);
  if (lvl >= 1 && (s === 6 || s === 7 || (lvl >= 2 && s % 2 === 1))) {
    const next = chordTones(th, bar + 1)[0]! - 12;
    const root = chord[0]! - 12;
    bass(ac, out, s === 7 ? next + (next > root ? -2 : 2) : root, t, stepDur * 0.9, 0.1);
  }
  // Arpeggio: a harp in the wave and on the map, a slow music box between waves.
  const idx = th.arp[s]!;
  if (idx >= 0) {
    if (lively) {
      pluck(ac, out, chord[idx]! + 12, t, th.drums ? 0.05 : 0.04, s % 2 ? 0.45 : -0.45);
      if (echo) pluck(ac, echo, chord[idx]! + 12, t, 0.025, 0);
    } else if (s % 2 === 0) bell(ac, out, chord[idx]! + 24, t, stepDur * 2, 0.018, s % 4 ? 0.4 : -0.4);
  }
  // Melody: every other 8-bar phrase in battle (the other leaves room for the harp); on the map, always.
  const phrase = Math.floor(bar / MELODY_BARS);
  if ((lvl >= 1 && phrase % 2 === 0) || !th.drums) {
    const local = n % (MELODY_BARS * STEPS_PER_BAR);
    for (const note of melody) {
      if (note.step !== local) continue;
      const dur = stepDur * note.len * 0.95;
      if (th.lead === 'triangle') bell(ac, out, note.midi, t, dur, 0.06, 0.1);
      else flute(ac, out, note.midi, t, dur, th.lead === 'square' ? 0.03 : 0.055, th.lead);
      if (echo) flute(ac, echo, note.midi, t, dur, 0.03, th.lead);
    }
  }
  // Percussion.
  if (th.drums && buf) {
    if (lvl >= 1) {
      noise(ac, out, buf, t, s % 2 ? 0.03 : 0.05, s % 2 ? 0.03 : 0.045, 'highpass', 8000, 0.3);
      if (s === 0 || (lvl >= 2 && s === 4) || (s === 5 && bar % 2 === 1)) kick(ac, out, t, lvl >= 2 ? 0.34 : 0.26);
      if (s === 4 || (lvl >= 2 && s === 7 && bar % 4 === 3)) snare(ac, out, buf, t, lvl >= 2 ? 0.1 : 0.07);
      if (lvl >= 2 && s === 0 && bar % MELODY_BARS === 0) noise(ac, out, buf, t, 1.2, 0.05, 'highpass', 5000);
    } else if (s === 0 || s === 4) {
      noise(ac, out, buf, t, 0.09, 0.012, 'highpass', 7000, s ? 0.5 : -0.5); // shaker
    }
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
  echo = makeEcho(a.ctx, bus, theme.bpm);
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
