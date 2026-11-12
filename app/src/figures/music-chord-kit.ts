// Chord helpers shared by the chord figures of music chapters 3 and 4
// (not a figure itself; never placed on a page).

import { spell, MAJOR_SCALE, SCALE_STEPS } from './music-lib';
import { h } from './lib';

export interface ChordType {
  id: string;
  /** Button label. */
  label: string;
  /** Symbol suffix: '' for major, 'm', 'dim', 'sus4', 'maj7', '7', 'm7'. */
  suffix: string;
  /** Words after the root, e.g. "major", "minor seven". */
  words: string;
  semis: number[];
  steps: number[];
  fingers: number[];
  /** How to name the root on each of the 12 keys (0 = C). */
  roots: string[];
}

const MAJ_ROOTS = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'];
const MIN_ROOTS = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'B♭', 'B'];
const DIM_ROOTS = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
const SUS_ROOTS = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];

export const CHORD_TYPES: ChordType[] = [
  { id: 'maj', label: 'Major', suffix: '', words: 'major', semis: [0, 4, 7], steps: [0, 2, 4], fingers: [1, 3, 5], roots: MAJ_ROOTS },
  { id: 'min', label: 'Minor', suffix: 'm', words: 'minor', semis: [0, 3, 7], steps: [0, 2, 4], fingers: [1, 3, 5], roots: MIN_ROOTS },
  { id: 'dim', label: 'dim', suffix: 'dim', words: 'diminished', semis: [0, 3, 6], steps: [0, 2, 4], fingers: [1, 3, 5], roots: DIM_ROOTS },
  { id: 'sus4', label: 'sus4', suffix: 'sus4', words: 'sus four', semis: [0, 5, 7], steps: [0, 3, 4], fingers: [1, 4, 5], roots: SUS_ROOTS },
  { id: 'sus2', label: 'sus2', suffix: 'sus2', words: 'sus two', semis: [0, 2, 7], steps: [0, 1, 4], fingers: [1, 2, 5], roots: SUS_ROOTS },
  { id: 'maj7', label: 'maj7', suffix: 'maj7', words: 'major seven', semis: [0, 4, 7, 11], steps: [0, 2, 4, 6], fingers: [1, 2, 3, 5], roots: MAJ_ROOTS },
  { id: '7', label: '7', suffix: '7', words: 'seven', semis: [0, 4, 7, 10], steps: [0, 2, 4, 6], fingers: [1, 2, 3, 5], roots: MAJ_ROOTS },
  { id: 'm7', label: 'm7', suffix: 'm7', words: 'minor seven', semis: [0, 3, 7, 10], steps: [0, 2, 4, 6], fingers: [1, 2, 3, 5], roots: MIN_ROOTS },
];

/** "4, then 3" style recipe from the semitone offsets. */
export function recipe(semis: number[]): string {
  const gaps = semis.slice(1).map((d, i) => d - semis[i]);
  if (gaps.length === 2) return `count up ${gaps[0]} half steps, then ${gaps[1]} more`;
  return `count up ${gaps.slice(0, -1).join(', ')}, then ${gaps[gaps.length - 1]} half steps`;
}

export const NUMERALS = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'];
const QUALITY = ['', 'm', 'm', '', '', 'm', 'dim'];

export interface KeyChord { numeral: string; name: string; notes: string[]; semis: number[] }

/** The seven chords of a major key, as semitone offsets above the key note. */
export function keyChords(key: string): KeyChord[] {
  const scale = spell(key, MAJOR_SCALE, SCALE_STEPS);
  return NUMERALS.map((numeral, i) => {
    const idx = [i, i + 2, i + 4];
    const semis = idx.map((k) => MAJOR_SCALE[k % 7] + (k >= 7 ? 12 : 0));
    return { numeral, name: scale[i] + QUALITY[i], notes: idx.map((k) => scale[k % 7]), semis };
  });
}

/** Sum of the distances each finger travels between two chords (both sorted low to high). */
export function moved(a: number[], b: number[]): number {
  return a.reduce((t, m, i) => t + Math.abs(m - b[i]), 0);
}

/** Mark a group of buttons as a single choice. */
export function choose(btns: HTMLButtonElement[], on: number) {
  btns.forEach((b, i) => b.setAttribute('aria-pressed', String(i === on)));
}

/** A two-line button: a bold top line and a smaller second line. */
export function twoLine(b: HTMLButtonElement, top: string, bottom: string) {
  b.replaceChildren();
  h('span', { style: 'display:block;font-weight:600' }, b, top);
  h('span', { style: 'display:block;font-size:0.85em' }, b, bottom);
  b.setAttribute('aria-label', `${top}: ${bottom}`);
}
