// Drawing helpers for written music in the music book's figures: staff lines,
// clefs, note and rest symbols, ledger lines and time signatures, all in SVG
// with theme classes (no hard-coded colours). Not a figure itself.
//
// Units: `sp` is the distance between two staff lines in px. A staff "step"
// (line to the next space) is sp / 2. Staff positions are diatonic numbers:
// d = 7 * octave + letter index (C = 0 ... B = 6), so C4 = 28, E4 = 30, G2 = 18.

import { s } from './lib';

export type Tone = '' | 'acc' | 'dim';
export type NoteKind = 'whole' | 'half' | 'quarter' | 'eighth' | 'sixteenth';
export type RestKind = 'whole' | 'half' | 'quarter' | 'eighth';

const LETTERS = 'CDEFGAB';
const WHITE_PC = [0, 2, 4, 5, 7, 9, 11];

/** Diatonic staff number of a MIDI note. Black keys use the letter below (sharp spelling). */
export function diatonic(midi: number): number {
  const oct = Math.floor(midi / 12) - 1;
  const pc = ((midi % 12) + 12) % 12;
  let li = 0;
  for (let i = 0; i < 7; i++) if (WHITE_PC[i] <= pc) li = i;
  return oct * 7 + li;
}
/** MIDI number of the white key at diatonic number d. */
export const whiteMidi = (d: number) => 12 * (Math.floor(d / 7) + 1) + WHITE_PC[((d % 7) + 7) % 7];
/** "C4" for a diatonic number. */
export const dName = (d: number) => `${LETTERS[((d % 7) + 7) % 7]}${Math.floor(d / 7)}`;

export const TREBLE_BOTTOM = 30; // E4
export const BASS_BOTTOM = 18; // G2

const fill = (t: Tone) => (t === 'acc' ? 'dot-acc' : t === 'dim' ? 'dot-dim' : 'dot');
const stroke = (t: Tone) => (t === 'acc' ? 'line-acc' : t === 'dim' ? 'curve-muted' : 'line');
const sw = (px: number) => `stroke-width:${px.toFixed(2)}px`;

/** Five staff lines from x0 to x1; yBottom is the bottom line. */
export function staffLines(g: SVGElement, x0: number, x1: number, yBottom: number, sp: number) {
  for (let i = 0; i < 5; i++) {
    const y = yBottom - i * sp;
    s('line', { x1: x0, x2: x1, y1: y, y2: y, class: 'line', style: sw(Math.max(1, sp * 0.09)) }, g);
  }
}

// Clef outlines, in staff spaces, y up from the bottom line.
const TREBLE: [string, ...number[]][] = [
  ['M', 0.32, 1.42],
  ['C', 0.32, 1.95, -0.5, 1.98, -0.52, 1.25],
  ['C', -0.55, 0.3, 0.98, 0.18, 1.02, 1.12],
  ['C', 1.06, 2.05, -0.1, 2.5, -0.62, 3.1],
  ['C', -1.1, 3.7, -0.6, 4.9, 0.2, 5.55],
  ['C', 0.5, 5.8, 0.66, 5.3, 0.42, 4.75],
  ['C', 0.22, 4.3, -0.02, 3.9, 0.02, 3.0],
  ['L', 0.2, -0.85],
  ['C', 0.24, -1.55, -0.5, -1.62, -0.62, -1.1],
];
const BASS: [string, ...number[]][] = [
  ['M', 0, 3],
  ['C', 0.05, 3.95, 1.55, 4.15, 1.62, 2.95],
  ['C', 1.68, 1.75, 0.6, 0.8, -0.35, 0.3],
];

function pathD(cmds: [string, ...number[]][], x: number, yBottom: number, sp: number) {
  return cmds
    .map(([c, ...a]) => {
      const pts: string[] = [];
      for (let i = 0; i < a.length; i += 2) pts.push(`${(x + a[i] * sp).toFixed(1)} ${(yBottom - a[i + 1] * sp).toFixed(1)}`);
      return `${c} ${pts.join(' ')}`;
    })
    .join(' ');
}

/** A treble or bass clef. x is roughly the clef's centre line. */
export function clef(g: SVGElement, kind: 'treble' | 'bass', x: number, yBottom: number, sp: number, tone: Tone = '') {
  const grp = s('g', { 'aria-hidden': 'true' }, g);
  if (kind === 'treble') {
    s('path', { d: pathD(TREBLE, x, yBottom, sp), class: stroke(tone), style: `${sw(sp * 0.17)};stroke-linecap:round` }, grp);
    s('circle', { cx: x - 0.42 * sp, cy: yBottom + 1.02 * sp, r: 0.26 * sp, class: fill(tone) }, grp);
  } else {
    const bx = x - 0.7 * sp;
    s('path', { d: pathD(BASS, bx, yBottom, sp), class: stroke(tone), style: `${sw(sp * 0.2)};stroke-linecap:round` }, grp);
    for (const [cx, cy, r] of [[0, 3, 0.3], [2.05, 3.5, 0.16], [2.05, 2.5, 0.16]]) s('circle', { cx: bx + cx * sp, cy: yBottom - cy * sp, r: r * sp, class: fill(tone) }, grp);
  }
  return grp;
}

/** A time signature such as 4 over 4, centred at x. */
export function timeSig(g: SVGElement, top: number, bottom: number, x: number, yBottom: number, sp: number) {
  const fs = sp * 2.1;
  for (const [n, y] of [[top, yBottom - 3 * sp], [bottom, yBottom - sp]] as const) {
    const t = s('text', { x, y: y + fs * 0.35, 'text-anchor': 'middle', class: 'lbl-fg', style: `font-size:${fs}px;font-weight:700` }, g);
    t.textContent = String(n);
  }
}

export interface NoteOpts {
  x: number;
  /** y of the notehead centre */
  y: number;
  sp: number;
  kind: NoteKind;
  dotted?: boolean;
  /** stem direction; default up */
  stem?: 'up' | 'down' | 'none';
  /** the head sits on a line (moves the dot up into the space) */
  onLine?: boolean;
  tone?: Tone;
  /** stem length in spaces (default 3.3) */
  stemLen?: number;
}

/** A note symbol. Returns the group and the stem tip (for beams). */
export function note(g: SVGElement, o: NoteOpts) {
  const grp = s('g', { 'aria-hidden': 'true' }, g);
  const tone = o.tone ?? '';
  const rx = o.sp * 0.62, ry = o.sp * 0.43;
  const hollow = o.kind === 'whole' || o.kind === 'half';
  const head = s('ellipse', { cx: o.x, cy: o.y, rx: hollow ? rx * 0.93 : rx, ry: hollow ? ry * 0.88 : ry, transform: `rotate(-20 ${o.x} ${o.y})` }, grp);
  if (hollow) {
    head.setAttribute('class', stroke(tone));
    head.setAttribute('style', sw(o.sp * (o.kind === 'whole' ? 0.2 : 0.17)));
  } else head.setAttribute('class', fill(tone));
  let tip = { x: o.x, y: o.y };
  const dir = o.kind === 'whole' ? 'none' : (o.stem ?? 'up');
  if (dir !== 'none') {
    const len = (o.stemLen ?? 3.3) * o.sp;
    const sx = dir === 'up' ? o.x + rx * 0.92 : o.x - rx * 0.92;
    const ty = dir === 'up' ? o.y - len : o.y + len;
    s('line', { x1: sx, x2: sx, y1: o.y + (dir === 'up' ? -ry * 0.3 : ry * 0.3), y2: ty, class: stroke(tone), style: sw(Math.max(1.1, o.sp * 0.11)) }, grp);
    tip = { x: sx, y: ty };
    const flags = o.kind === 'eighth' ? 1 : o.kind === 'sixteenth' ? 2 : 0;
    for (let f = 0; f < flags; f++) {
      const k = dir === 'up' ? 1 : -1;
      const y0 = ty + k * f * o.sp * 0.8;
      const p = `M ${sx} ${y0} C ${sx + 0.15 * o.sp} ${y0 + k * 0.9 * o.sp}, ${sx + 1.25 * o.sp} ${y0 + k * 1.2 * o.sp}, ${sx + 0.85 * o.sp} ${y0 + k * 2.4 * o.sp} C ${sx + 1.0 * o.sp} ${y0 + k * 1.5 * o.sp}, ${sx + 0.4 * o.sp} ${y0 + k * 1.25 * o.sp}, ${sx} ${y0 + k * 1.0 * o.sp} Z`;
      s('path', { d: p, class: fill(tone) }, grp);
    }
  }
  if (o.dotted) s('circle', { cx: o.x + rx + o.sp * 0.45, cy: o.y - (o.onLine ? o.sp * 0.4 : 0), r: o.sp * 0.21, class: fill(tone) }, grp);
  return { g: grp, tip };
}

/** A beam joining stem tips (all stems up). */
export function beam(g: SVGElement, tips: { x: number; y: number }[], sp: number, tone: Tone = '', count = 1) {
  if (tips.length < 2) return;
  const a = tips[0], b = tips[tips.length - 1];
  const th = sp * 0.5;
  for (let k = 0; k < count; k++) {
    const dy = k * sp * 0.8;
    s('path', { d: `M ${a.x - 0.5} ${a.y + dy} L ${b.x + 0.5} ${b.y + dy} L ${b.x + 0.5} ${b.y + dy + th} L ${a.x - 0.5} ${a.y + dy + th} Z`, class: fill(tone) }, g);
  }
}

/** A rest symbol centred at (x, yMid); yMid is the middle staff line (or the rhythm line). */
export function rest(g: SVGElement, kind: RestKind, x: number, yMid: number, sp: number, tone: Tone = '') {
  const grp = s('g', { 'aria-hidden': 'true' }, g);
  const w = sp * 1.1;
  if (kind === 'whole') {
    // hangs down from the line above the middle
    s('line', { x1: x - w, x2: x + w, y1: yMid - sp, y2: yMid - sp, class: stroke(tone), style: sw(Math.max(1, sp * 0.1)) }, grp);
    s('rect', { x: x - w * 0.6, y: yMid - sp, width: w * 1.2, height: sp * 0.55, class: fill(tone) }, grp);
  } else if (kind === 'half') {
    // sits on the middle line, like a hat
    s('line', { x1: x - w, x2: x + w, y1: yMid, y2: yMid, class: stroke(tone), style: sw(Math.max(1, sp * 0.1)) }, grp);
    s('rect', { x: x - w * 0.6, y: yMid - sp * 0.55, width: w * 1.2, height: sp * 0.55, class: fill(tone) }, grp);
  } else if (kind === 'quarter') {
    const u = sp;
    const p = `M ${x - 0.25 * u} ${yMid - 1.5 * u} L ${x + 0.45 * u} ${yMid - 0.6 * u} L ${x - 0.15 * u} ${yMid + 0.15 * u} L ${x + 0.4 * u} ${yMid + 0.85 * u} C ${x - 0.2 * u} ${yMid + 0.55 * u}, ${x - 0.55 * u} ${yMid + 1.05 * u}, ${x - 0.05 * u} ${yMid + 1.45 * u}`;
    s('path', { d: p, class: stroke(tone), style: `${sw(sp * 0.26)};stroke-linejoin:round;stroke-linecap:round` }, grp);
  } else {
    const u = sp;
    s('circle', { cx: x - 0.35 * u, cy: yMid - 0.55 * u, r: 0.26 * u, class: fill(tone) }, grp);
    s('path', { d: `M ${x - 0.4 * u} ${yMid - 0.4 * u} C ${x - 0.1 * u} ${yMid - 0.25 * u}, ${x + 0.25 * u} ${yMid - 0.4 * u}, ${x + 0.45 * u} ${yMid - 0.75 * u} L ${x - 0.05 * u} ${yMid + 1.1 * u}`, class: stroke(tone), style: `${sw(sp * 0.16)};stroke-linecap:round;stroke-linejoin:round` }, grp);
  }
  return grp;
}

/**
 * Ledger lines for a note at staff number d on a staff whose bottom line is
 * `bottom` (top line = bottom + 8). yOf maps a staff number to y.
 */
export function ledgers(g: SVGElement, x: number, d: number, bottom: number, sp: number, yOf: (d: number) => number, tone: Tone = '') {
  const w = sp * 1.05;
  const draw = (ld: number) => s('line', { x1: x - w, x2: x + w, y1: yOf(ld), y2: yOf(ld), class: tone === 'acc' ? 'line-acc' : 'line', style: sw(Math.max(1, sp * 0.1)) }, g);
  for (let ld = bottom - 2; ld >= d; ld -= 2) draw(ld);
  for (let ld = bottom + 10; ld <= d; ld += 2) draw(ld);
}

/** A sharp, flat or natural sign drawn as text, centred at (x, y). */
export function accidental(g: SVGElement, acc: '♯' | '♭' | '♮', x: number, y: number, sp: number, tone: Tone = '') {
  const fs = sp * 2.6;
  const t = s('text', { x, y: y + fs * (acc === '♭' ? 0.22 : 0.33), 'text-anchor': 'middle', class: tone === 'acc' ? 'lbl-acc' : 'lbl-fg', style: `font-size:${fs}px` }, g);
  t.textContent = acc;
  return t;
}
