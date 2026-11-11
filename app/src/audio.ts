// Small piano-like synth shared by the music book: inline "listen" buttons in
// the text and every interactive music figure use this one module, so there is
// a single AudioContext (browsers limit how many a page may open).
//
// Spec strings (used by \listen{...} in the LaTeX and by figures):
//   "C4 D4 E4"          a melody, one beat each
//   "C4+E4+G4"          a chord (notes struck together)
//   "C4+E4+G4:2 F4:0.5" ":n" sets the length in beats (default 1)
//   "- r"               rests ("-" or "r"), also take ":n"
//   "x X"               a soft click / an accented click (for rhythm)
//   "@80 ..."           tempo in beats per minute (default 96)
//   "~ C4+E4+G4"        "~" at the start rolls chords (strummed) instead of striking together
//   "=C3:4 E4 G4 C5 G4" a leading "=" holds a note without moving time on: here the bass C3
//                       rings for 4 beats while the melody plays over it
// Note names: letter, optional accidental (# b ♯ ♭, doubled for double sharp/flat), octave.
// Middle C is C4.

const LETTER: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** "C#4" -> 61. Returns NaN if the name is not a note. */
export function noteToMidi(name: string): number {
  const m = /^([A-Ga-g])((?:#|b|♯|♭|x|𝄪|𝄫)*)(-?\d)$/.exec(name.trim());
  if (!m) return NaN;
  let pc = LETTER[m[1].toUpperCase()];
  for (const ch of m[2]) {
    if (ch === '#' || ch === '♯') pc += 1;
    else if (ch === 'b' || ch === '♭') pc -= 1;
    else if (ch === 'x' || ch === '𝄪') pc += 2;
    else if (ch === '𝄫') pc -= 2;
  }
  return 12 * (Number(m[3]) + 1) + pc;
}

export const midiToFreq = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

export type Ev =
  | { kind: 'notes'; midi: number[]; beat: number; beats: number; roll?: boolean; vel?: number }
  | { kind: 'click'; beat: number; beats: number; accent: boolean }
  | { kind: 'rest'; beat: number; beats: number };

export interface Parsed { bpm: number; events: Ev[]; totalBeats: number }

/** Parse a spec string into timed events (beats from 0). Throws on a bad token. */
export function parseSpec(spec: string): Parsed {
  let bpm = 96;
  let roll = false;
  let beat = 0;
  const events: Ev[] = [];
  for (let raw of spec.trim().split(/\s+/).filter(Boolean)) {
    if (/^@\d+$/.test(raw)) { bpm = Number(raw.slice(1)); continue; }
    if (raw === '~') { roll = true; continue; }
    const hold = raw.startsWith('=');
    if (hold) raw = raw.slice(1);
    const [body, durS] = raw.split(':');
    const beats = durS === undefined ? 1 : Number(durS);
    if (!(beats > 0)) throw new Error(`bad length in "${raw}"`);
    if (body === '-' || body === 'r') events.push({ kind: 'rest', beat, beats });
    else if (body === 'x' || body === 'X') events.push({ kind: 'click', beat, beats, accent: body === 'X' });
    else {
      const midi = body.split('+').map(noteToMidi);
      if (midi.some((n) => Number.isNaN(n))) throw new Error(`bad note in "${raw}"`);
      events.push({ kind: 'notes', midi, beat, beats, roll });
    }
    if (!hold) beat += beats;
    else if (events.length) events[events.length - 1].beats = beats;
  }
  return { bpm, events, totalBeats: Math.max(beat, ...events.map((e) => e.beat + e.beats)) };
}

// ---------------------------------------------------------------- engine

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let wave: PeriodicWave | null = null;

function audio(): AudioContext | null {
  try {
    if (!ctx) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return null;
      ctx = new Ctx();
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -14;
      comp.ratio.value = 4;
      master = ctx.createGain();
      master.gain.value = 0.55;
      master.connect(comp);
      comp.connect(ctx.destination);
      // A soft, piano-ish harmonic recipe.
      const amps = [0, 1, 0.42, 0.22, 0.12, 0.07, 0.04, 0.025, 0.012];
      wave = ctx.createPeriodicWave(new Float32Array(amps.length), new Float32Array(amps));
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

/** Call from a click handler before playing, so iOS unlocks audio. */
export function unlock() { audio(); }

interface Voice { stop(at: number): void }

function strike(c: AudioContext, midi: number, t: number, len: number, vel = 1): Voice {
  const f = midiToFreq(midi);
  const osc = c.createOscillator();
  osc.setPeriodicWave(wave!);
  osc.frequency.setValueAtTime(f, t);
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(Math.min(9000, f * 7), t);
  lp.frequency.exponentialRampToValueAtTime(Math.max(400, f * 2.2), t + 1.2);
  const g = c.createGain();
  // Low notes ring longer, high notes die away faster, like strings.
  const decay = Math.max(0.5, Math.min(2.4, 2.6 - (midi - 48) * 0.035));
  const peak = 0.32 * vel * Math.max(0.45, Math.min(1, 1.25 - (midi - 60) * 0.012));
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(peak, t + 0.006);
  g.gain.setTargetAtTime(peak * 0.45, t + 0.006, 0.09);
  g.gain.setTargetAtTime(0.0001, t + 0.12, decay / 3);
  osc.connect(lp);
  lp.connect(g);
  g.connect(master!);
  osc.start(t);
  const end = t + Math.max(0.12, len);
  const stop = (at: number) => {
    try {
      g.gain.cancelScheduledValues(at);
      g.gain.setTargetAtTime(0.0001, at, 0.06);
      osc.stop(at + 0.4);
    } catch { /* already stopped */ }
  };
  stop(end);
  return { stop };
}

function click(c: AudioContext, t: number, accent: boolean): Voice {
  const osc = c.createOscillator();
  osc.type = 'square';
  osc.frequency.setValueAtTime(accent ? 1760 : 1175, t);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(accent ? 0.22 : 0.12, t + 0.002);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
  const hp = c.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 600;
  osc.connect(hp);
  hp.connect(g);
  g.connect(master!);
  osc.start(t);
  osc.stop(t + 0.08);
  return { stop: () => {} };
}

export interface Handle {
  stop(): void;
  /** Resolves when playback ends or is stopped. */
  done: Promise<void>;
}

export interface PlayOpts {
  /** Called as each event starts (for lighting keys). index is the event index. */
  onEvent?: (ev: Ev, index: number) => void;
  /** Called when playback finishes or is stopped. */
  onEnd?: () => void;
  bpm?: number;
}

let currentStop: (() => void) | null = null;

/** Stop whatever is playing (text button or figure). */
export function stopAll() { currentStop?.(); }

/** Play parsed events. Only one thing plays at a time; starting a new one stops the old one. */
export function play(parsed: Parsed, opts: PlayOpts = {}): Handle {
  stopAll();
  const c = audio();
  const bpm = opts.bpm ?? parsed.bpm;
  const spb = 60 / bpm;
  const voices: Voice[] = [];
  const timers: number[] = [];
  let finished = false;
  let resolve!: () => void;
  const done = new Promise<void>((r) => (resolve = r));
  const finish = () => {
    if (finished) return;
    finished = true;
    timers.forEach(clearTimeout);
    if (c) voices.forEach((v) => v.stop(c.currentTime));
    if (currentStop === stopper) currentStop = null;
    opts.onEnd?.();
    resolve();
  };
  const stopper = () => finish();
  currentStop = stopper;
  const t0 = (c?.currentTime ?? 0) + 0.06;
  parsed.events.forEach((ev, i) => {
    const t = t0 + ev.beat * spb;
    const len = ev.beats * spb;
    if (c) {
      if (ev.kind === 'notes') {
        const sorted = [...ev.midi].sort((a, b) => a - b);
        sorted.forEach((m, k) => {
          const off = ev.roll ? k * 0.07 : k * 0.012;
          voices.push(strike(c, m, t + off, len * 0.96 - off, ev.vel ?? (ev.midi.length > 1 ? 0.8 : 1)));
        });
      } else if (ev.kind === 'click') voices.push(click(c, t, ev.accent));
    }
    if (opts.onEvent) timers.push(window.setTimeout(() => opts.onEvent!(ev, i), Math.max(0, (t - (c?.currentTime ?? 0)) * 1000)));
  });
  const endMs = ((t0 - (c?.currentTime ?? 0)) + parsed.totalBeats * spb) * 1000 + 80;
  timers.push(window.setTimeout(finish, endMs));
  return { stop: finish, done };
}

/** Parse and play a spec string. */
export function playSpec(spec: string, opts: PlayOpts = {}): Handle {
  return play(parseSpec(spec), opts);
}

/** Play MIDI numbers: together as a chord (default) or one after another. */
export function playMidi(midi: number[], how: 'chord' | 'melody' | 'roll' = 'chord', opts: PlayOpts & { beats?: number } = {}): Handle {
  const beats = opts.beats ?? (how === 'chord' ? 2 : 0.75);
  const events: Ev[] =
    how === 'melody'
      ? midi.map((m, i) => ({ kind: 'notes', midi: [m], beat: i * beats, beats }))
      : [{ kind: 'notes', midi, beat: 0, beats, roll: how === 'roll' }];
  return play({ bpm: opts.bpm ?? 96, events, totalBeats: how === 'melody' ? midi.length * beats : beats }, opts);
}

/** Sound one key immediately without stopping anything else (for tapping keys). */
export function tap(midi: number | number[], beats = 1.2) {
  const c = audio();
  if (!c) return;
  const list = Array.isArray(midi) ? midi : [midi];
  list.forEach((m, k) => strike(c, m, c.currentTime + 0.01 + k * 0.012, beats * 0.625, list.length > 1 ? 0.8 : 1));
}

// ---------------------------------------------------------------- inline buttons

const PLAY_ICON = '<svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true"><path d="M4 2.5v11l9-5.5z" fill="currentColor"/></svg>';
const STOP_ICON = '<svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true"><rect x="3.5" y="3.5" width="9" height="9" rx="1" fill="currentColor"/></svg>';

/**
 * Wire every <button class="listen" data-notes="..."> under root. The build
 * script emits these for \listen{...} in the LaTeX.
 */
export function wireListenButtons(root: ParentNode) {
  root.querySelectorAll<HTMLButtonElement>('button.listen').forEach((b) => {
    if (b.dataset.wired) return;
    b.dataset.wired = '1';
    b.innerHTML = PLAY_ICON;
    let handle: Handle | null = null;
    const reset = () => {
      b.classList.remove('playing');
      b.innerHTML = PLAY_ICON;
      b.setAttribute('aria-pressed', 'false');
      handle = null;
    };
    b.setAttribute('aria-pressed', 'false');
    b.addEventListener('click', () => {
      if (handle) { handle.stop(); return; }
      try {
        unlock();
        b.classList.add('playing');
        b.innerHTML = STOP_ICON;
        b.setAttribute('aria-pressed', 'true');
        handle = playSpec(b.dataset.notes || '', { onEnd: reset });
      } catch (e) {
        console.warn('listen', e);
        reset();
      }
    });
  });
}
