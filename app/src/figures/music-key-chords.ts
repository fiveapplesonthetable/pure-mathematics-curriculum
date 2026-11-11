// Chords in a key (music chapter 3): choose a key; the seven chords of that key
// appear as buttons with their Roman numerals. Tap one to see and hear it, or
// play a famous progression and watch the chords light up in time.

import { responsiveSvg, row, button, h, type Mount } from './lib';
import { keyboard, namePc, play, stopAll, unlock, type Mark, type Keyboard } from './music-lib';
import type { Ev } from '../audio';
import { keyChords, choose, twoLine, type KeyChord } from './music-chord-kit';

const FROM = 55; // G3
const TO = 74; // D5
const KEYS = ['C', 'G', 'D', 'A', 'F', 'B♭', 'E♭'];
const PROGS: { label: string; steps: number[] }[] = [
  { label: 'I–V–vi–IV', steps: [0, 4, 5, 3] },
  { label: 'vi–IV–I–V', steps: [5, 3, 0, 4] },
  { label: 'I–vi–IV–V', steps: [0, 5, 3, 4] },
  { label: 'ii–V–I', steps: [1, 4, 0] },
];
const BPM = 92;

const mount: Mount = (root) => {
  const info = h('div', { class: 'fig-row', 'aria-live': 'polite' }, root);
  const titleEl = h('strong', { style: 'font-size:1.15rem;min-width:5em' }, info);
  const notesEl = h('span', {}, info);

  const rk = row(root);
  h('span', { class: 'fig-note' }, rk, 'Key of');
  const keyBtns = KEYS.map((k, i) => button(rk, k, () => setKey(i)));

  const view = responsiveSvg(root, { label: 'A piano keyboard showing a chord of the chosen key.', aspect: 0.24, minH: 140, maxH: 200 });
  const kb: Keyboard = keyboard(view.el, { from: FROM, to: TO, names: 'c' });

  const rc = row(root);
  rc.style.display = 'grid';
  rc.style.gridTemplateColumns = 'repeat(7, minmax(0, 1fr))';
  rc.style.gap = '5px';
  const chordBtns = Array.from({ length: 7 }, (_, i) =>
    button(rc, '', () => {
      unlock();
      stopAll();
      show(i);
      const midi = midiOf(chords[i]);
      play({ bpm: BPM, totalBeats: 2, events: [{ kind: 'notes', midi, beat: 0, beats: 2 }] }, { onEvent: () => kb.flash(midi, 400) });
    }),
  );
  chordBtns.forEach((b) => { b.style.padding = '2px 0'; b.style.maxWidth = '5.5em'; });

  const rp = row(root);
  const progBtns = PROGS.map((p, i) => button(rp, p.label, () => playProg(i)));
  const stopBtn = button(rp, 'Stop', () => stopAll());
  stopBtn.disabled = true;

  let keyIdx = 0;
  let chords: KeyChord[] = keyChords(KEYS[0]);
  let current = 0;

  /** Root between G3 and F♯4, so every chord sits near middle C. */
  function midiOf(c: KeyChord) {
    const tonic = namePc(KEYS[keyIdx]);
    const rootPc = (tonic + c.semis[0]) % 12;
    const rootMidi = FROM + ((rootPc - 7 + 12) % 12);
    return c.semis.map((d) => rootMidi + d - c.semis[0]);
  }

  function setKey(i: number) {
    stopAll();
    keyIdx = i;
    chords = keyChords(KEYS[i]);
    choose(keyBtns, i);
    chords.forEach((c, k) => twoLine(chordBtns[k], c.numeral, c.name.replace('dim', '°')));
    show(0);
  }

  function show(i: number) {
    current = i;
    const c = chords[i];
    const midi = midiOf(c);
    const marks = new Map<number, Mark>();
    midi.forEach((m, k) => marks.set(m, { kind: 'on', label: c.notes[k] }));
    kb.mark(marks);
    titleEl.textContent = `${c.numeral}  =  ${c.name}`;
    notesEl.textContent = `${c.notes.join(', ')}  (key of ${KEYS[keyIdx]})`;
    chordBtns.forEach((b, k) => b.setAttribute('aria-pressed', String(k === i)));
  }

  function playProg(p: number) {
    unlock();
    stopAll();
    const steps = PROGS[p].steps;
    const seq = [...steps, ...(steps.length === 4 ? steps : []), 0];
    const events: Ev[] = seq.map((ci, k) => ({ kind: 'notes', midi: midiOf(chords[ci]), beat: k * 2, beats: k === seq.length - 1 ? 4 : 2 }));
    const totalBeats = (seq.length - 1) * 2 + 4;
    choose(progBtns, p);
    stopBtn.disabled = false;
    play({ bpm: BPM, events, totalBeats }, {
      onEvent: (ev, k) => {
        if (!root.isConnected) { stopAll(); return; }
        show(seq[k]);
        if (ev.kind === 'notes') kb.flash(ev.midi, 400);
      },
      onEnd: () => {
        progBtns.forEach((b) => b.setAttribute('aria-pressed', 'false'));
        stopBtn.disabled = true;
      },
    });
  }

  const draw = () => {
    kb.layout(2, 6, view.W - 4, view.H - 10);
    show(current);
  };
  view.onResize(draw);
  setKey(0);
  draw();
};

export default mount;
