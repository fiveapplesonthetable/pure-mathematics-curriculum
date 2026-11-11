// Shared pieces for the music book's interactive figures: note names and
// spelling, and a tappable piano keyboard drawn in SVG.
//
// Colours come from CSS (style.css, "Piano keys"), so light and dark themes
// both show a real-looking keyboard: light keys stay light and dark keys stay
// dark in both themes. Never hard-code colours in a figure.
//
// Typical use inside a figure's mount(root):
//
//   const view = responsiveSvg(root, { label: '…', aspect: 0.32, minH: 150, maxH: 230 });
//   const kb = keyboard(view.el, { from: 60, to: 84, onPress: (m) => … });
//   const draw = () => { kb.layout(0, 30, view.W, view.H - 50); kb.mark(new Map([[60, { kind: 'on', label: 'C' }]])); };
//   view.onResize(draw); draw();

import { s } from './lib';
import { tap } from '../audio';

export { noteToMidi, playSpec, playMidi, play, tap, stopAll, unlock, parseSpec } from '../audio';

export const SHARP = '♯';
export const FLAT = '♭';

export const IS_BLACK = [false, true, false, true, false, false, true, false, true, false, true, false];
export const isBlack = (m: number) => IS_BLACK[((m % 12) + 12) % 12];

const SHARP_NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
const FLAT_NAMES = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'];

/** Name of a pitch class (0 = C). Black keys use sharps unless preferFlat. */
export function pcName(pc: number, preferFlat = false): string {
  const p = ((pc % 12) + 12) % 12;
  return (preferFlat ? FLAT_NAMES : SHARP_NAMES)[p];
}
/** Both names of a black key ("C♯ / D♭"), or the single name of a white key. */
export function bothNames(pc: number): string {
  const p = ((pc % 12) + 12) % 12;
  return IS_BLACK[p] ? `${SHARP_NAMES[p]} / ${FLAT_NAMES[p]}` : SHARP_NAMES[p];
}
export const octaveOf = (m: number) => Math.floor(m / 12) - 1;
/** "C4", "F♯3", "B♭2". */
export function midiName(m: number, preferFlat = false, withOctave = true): string {
  return pcName(m, preferFlat) + (withOctave ? String(octaveOf(m)) : '');
}

const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const LETTER_PC = [0, 2, 4, 5, 7, 9, 11];

/**
 * Spell notes properly (one letter per step), e.g. the F major scale gets B♭
 * not A♯, and F♯ major gets E♯.
 *   root: "F", "B♭", "F#"   semis: semitones above the root   steps: letter steps above the root
 * Major scale: spell('G', [0,2,4,5,7,9,11], [0,1,2,3,4,5,6]) -> G A B C D E F♯
 * Triad:       spell('D', [0,4,7], [0,2,4]) -> D F♯ A
 */
export function spell(root: string, semis: number[], steps: number[]): string[] {
  const letter = root[0].toUpperCase();
  const li = LETTERS.indexOf(letter);
  let rootPc = LETTER_PC[li];
  for (const ch of root.slice(1)) rootPc += ch === '#' || ch === '♯' ? 1 : ch === 'b' || ch === '♭' ? -1 : 0;
  return semis.map((semi, k) => {
    const L = (li + steps[k]) % 7;
    const natural = LETTER_PC[L];
    let diff = (((rootPc + semi - natural) % 12) + 12) % 12;
    if (diff > 6) diff -= 12;
    const acc = diff === 0 ? '' : diff === 1 ? '♯' : diff === 2 ? '𝄪' : diff === -1 ? '♭' : diff === -2 ? '𝄫' : '?';
    return LETTERS[L] + acc;
  });
}

export const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11];
export const MINOR_SCALE = [0, 2, 3, 5, 7, 8, 10];
export const SCALE_STEPS = [0, 1, 2, 3, 4, 5, 6];

/** The twelve major keys around the circle of fifths, with the spelling musicians use. */
export const CIRCLE_MAJOR = ['C', 'G', 'D', 'A', 'E', 'B', 'F♯', 'D♭', 'A♭', 'E♭', 'B♭', 'F'];
export const CIRCLE_MINOR = ['A', 'E', 'B', 'F♯', 'C♯', 'G♯', 'D♯', 'B♭', 'F', 'C', 'G', 'D'];

/** Pitch class of a name like "B♭" or "F#". */
export function namePc(name: string): number {
  let pc = LETTER_PC[LETTERS.indexOf(name[0].toUpperCase())];
  for (const ch of name.slice(1)) pc += ch === '#' || ch === '♯' ? 1 : ch === 'b' || ch === '♭' ? -1 : ch === '𝄪' ? 2 : ch === '𝄫' ? -2 : 0;
  return ((pc % 12) + 12) % 12;
}

// ---------------------------------------------------------------- keyboard

export type MarkKind = 'on' | 'soft' | 'ring' | 'dim';
export interface Mark {
  /** on = accent fill (the notes that matter); soft = light tint; ring = outlined; dim = greyed */
  kind: MarkKind;
  /** Text drawn on the key (e.g. "C", "E♭", "1"). */
  label?: string;
  /** Second, smaller line under the label (e.g. a finger number "RH 1"). */
  sub?: string;
}

export interface KeyboardOpts {
  /** First and last MIDI note shown (use white keys at both ends). 60 = middle C. */
  from: number;
  to: number;
  /** Called when a key is tapped or activated by keyboard. */
  onPress?: (midi: number) => void;
  /** Play the key's sound on tap (default true). */
  sound?: boolean;
  /** Which keys get a faint name when unmarked: 'none', 'c' (every C, default), 'white', 'all'. */
  names?: 'none' | 'c' | 'white' | 'all';
  /** Show the octave number on C labels ("C4"). Default true. */
  octaves?: boolean;
  /** Accessible name prefix for keys, default "Piano key". */
  aria?: string;
}

export interface KeyGeom { midi: number; x: number; w: number; cx: number; top: number; bottom: number; black: boolean }

export interface Keyboard {
  /** Position the keyboard inside the SVG (call from your draw/resize). */
  layout(x: number, y: number, w: number, h: number): void;
  /** Replace all marks. Keys not in the map are drawn plain. */
  mark(marks: Map<number, Mark>): void;
  /** Geometry of a key, for drawing arcs and labels around it. */
  key(midi: number): KeyGeom | undefined;
  /** Briefly show a key as pressed (for playback). */
  flash(midi: number | number[], ms?: number): void;
  /** The <g> that holds the keyboard. */
  g: SVGGElement;
}

export function keyboard(parent: SVGElement, opts: KeyboardOpts): Keyboard {
  const g = s('g', { class: 'piano' }, parent);
  const whiteG = s('g', {}, g);
  const blackG = s('g', {}, g);
  const geom = new Map<number, KeyGeom>();
  const els = new Map<number, { rect: SVGRectElement; label: SVGTextElement; sub: SVGTextElement; grp: SVGGElement }>();
  let marks = new Map<number, Mark>();
  let focusMidi = opts.from;
  const names = opts.names ?? 'c';
  const showOct = opts.octaves ?? true;

  const press = (m: number) => {
    if (opts.sound !== false) tap(m);
    flash(m);
    opts.onPress?.(m);
  };

  for (let m = opts.from; m <= opts.to; m++) {
    const black = isBlack(m);
    const grp = s('g', { class: 'key-g', role: 'button', tabindex: m === focusMidi ? 0 : -1, 'aria-label': `${opts.aria ?? 'Piano key'} ${midiName(m)}${black ? ` (${midiName(m, true)})` : ''}` }, black ? blackG : whiteG);
    const rect = s('rect', { class: black ? 'key key-b' : 'key key-w', rx: black ? 2.5 : 4 }, grp);
    const label = s('text', { class: black ? 'key-lbl key-lbl-b' : 'key-lbl', 'text-anchor': 'middle' }, grp);
    const sub = s('text', { class: 'key-sub', 'text-anchor': 'middle' }, grp);
    grp.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      focusMidi = m;
      press(m);
    });
    grp.addEventListener('keydown', (e) => {
      const k = (e as KeyboardEvent).key;
      if (k === 'Enter' || k === ' ') { e.preventDefault(); press(m); }
      else if (k === 'ArrowRight' || k === 'ArrowLeft') {
        e.preventDefault();
        const n = Math.max(opts.from, Math.min(opts.to, m + (k === 'ArrowRight' ? 1 : -1)));
        const next = els.get(n);
        if (next) {
          els.get(focusMidi)?.grp.setAttribute('tabindex', '-1');
          next.grp.setAttribute('tabindex', '0');
          focusMidi = n;
          next.grp.focus();
        }
      }
    });
    els.set(m, { rect, label, sub, grp });
  }

  function layout(x: number, y: number, w: number, h: number) {
    let whites = 0;
    for (let m = opts.from; m <= opts.to; m++) if (!isBlack(m)) whites++;
    const ww = w / whites;
    const bw = ww * 0.6;
    const bh = h * 0.62;
    let wi = 0;
    for (let m = opts.from; m <= opts.to; m++) {
      const e = els.get(m)!;
      if (!isBlack(m)) {
        const kx = x + wi * ww;
        geom.set(m, { midi: m, x: kx, w: ww, cx: kx + ww / 2, top: y, bottom: y + h, black: false });
        e.rect.setAttribute('x', String(kx + 0.5));
        e.rect.setAttribute('y', String(y));
        e.rect.setAttribute('width', String(Math.max(2, ww - 1)));
        e.rect.setAttribute('height', String(h));
        wi++;
      } else {
        const cx = x + wi * ww;
        geom.set(m, { midi: m, x: cx - bw / 2, w: bw, cx, top: y, bottom: y + bh, black: true });
        e.rect.setAttribute('x', String(cx - bw / 2));
        e.rect.setAttribute('y', String(y - 0.5));
        e.rect.setAttribute('width', String(bw));
        e.rect.setAttribute('height', String(bh));
      }
    }
    const fs = Math.max(9, Math.min(14, ww * 0.36));
    g.style.setProperty('--key-fs', `${fs}px`);
    paint();
  }

  function paint() {
    for (const [m, e] of els) {
      const k = geom.get(m);
      if (!k) continue;
      const mk = marks.get(m);
      const black = k.black;
      e.rect.setAttribute('class', `key ${black ? 'key-b' : 'key-w'}${mk ? ` ${mk.kind}` : ''}`);
      let text = mk?.label;
      if (text === undefined && !black) {
        const pc = ((m % 12) + 12) % 12;
        if (names === 'all' || names === 'white' || (names === 'c' && pc === 0)) text = pc === 0 && showOct ? `C${octaveOf(m)}` : pcName(pc);
      }
      if (text === undefined && black && names === 'all') text = pcName(m);
      e.label.textContent = text ?? '';
      e.label.setAttribute('x', String(k.cx));
      e.label.setAttribute('y', String(black ? k.bottom - 8 : k.bottom - (mk?.sub ? 22 : 9)));
      e.label.setAttribute('class', `key-lbl${black ? ' key-lbl-b' : ''}${mk && mk.kind !== 'dim' ? ' marked' : ''}`);
      e.sub.textContent = mk?.sub ?? '';
      e.sub.setAttribute('x', String(k.cx));
      e.sub.setAttribute('y', String(black ? k.bottom + 14 : k.bottom - 8));
    }
  }

  function mark(m: Map<number, Mark>) {
    marks = m;
    paint();
  }

  function flash(midi: number | number[], ms = 260) {
    for (const m of Array.isArray(midi) ? midi : [midi]) {
      const e = els.get(m);
      if (!e) continue;
      e.rect.classList.add('pressed');
      window.setTimeout(() => e.rect.classList.remove('pressed'), ms);
    }
  }

  return { layout, mark, key: (m) => geom.get(m), flash, g };
}

/** Draw an arc with a label between two keys (e.g. "+4", "W", "H"), above the keyboard. */
export function arc(parent: SVGElement, a: KeyGeom, b: KeyGeom, text: string, y: number, cls = 'line-acc', lblCls = 'lbl-acc') {
  const mid = (a.cx + b.cx) / 2;
  const lift = Math.min(18, Math.abs(b.cx - a.cx) * 0.35 + 6);
  s('path', { d: `M ${a.cx + 2} ${y} Q ${mid} ${y - lift} ${b.cx - 2} ${y}`, class: cls }, parent);
  const t = s('text', { x: mid, y: y - lift / 2 - 6, 'text-anchor': 'middle', class: lblCls }, parent);
  t.textContent = text;
  return t;
}
