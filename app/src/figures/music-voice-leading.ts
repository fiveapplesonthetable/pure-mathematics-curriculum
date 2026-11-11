// Smooth vs jumpy (music chapter 4): the same progression played with every
// chord in root position, or with smooth inversions. Keys light as it plays,
// the previous chord stays outlined, and a counter adds up how many keys the
// fingers travel.

import { responsiveSvg, row, button, h, type Mount } from './lib';
import { keyboard, play, stopAll, unlock, type Mark, type Keyboard } from './music-lib';
import type { Ev } from '../audio';
import { moved, choose } from './music-chord-kit';

const FROM = 57; // A3
const TO = 76; // E5
const BPM = 76;

interface Prog { label: string; names: string[]; jumpy: number[][]; smooth: number[][] }
const N: Record<string, number> = { B3: 59, C4: 60, D4: 62, E4: 64, F4: 65, G4: 67, A4: 69, B4: 71, C5: 72, D5: 74, E5: 76 };
const v = (s: string) => s.split(' ').map((n) => N[n]);
const PROGS: Prog[] = [
  {
    label: 'C, F, G, C',
    names: ['C', 'F', 'G', 'C'],
    jumpy: [v('C4 E4 G4'), v('F4 A4 C5'), v('G4 B4 D5'), v('C4 E4 G4')],
    smooth: [v('C4 E4 G4'), v('C4 F4 A4'), v('B3 D4 G4'), v('C4 E4 G4')],
  },
  {
    label: 'C, G, Am, F, C',
    names: ['C', 'G', 'Am', 'F', 'C'],
    jumpy: [v('C4 E4 G4'), v('G4 B4 D5'), v('A4 C5 E5'), v('F4 A4 C5'), v('C4 E4 G4')],
    smooth: [v('C4 E4 G4'), v('B3 D4 G4'), v('C4 E4 A4'), v('C4 F4 A4'), v('C4 E4 G4')],
  },
];
const NAMES: Record<number, string> = { 59: 'B', 60: 'C', 62: 'D', 64: 'E', 65: 'F', 67: 'G', 69: 'A', 71: 'B', 72: 'C', 74: 'D', 76: 'E' };

const total = (ch: number[][]) => ch.slice(1).reduce((t, c, i) => t + moved(ch[i], c), 0);

const mount: Mount = (root) => {
  const info = h('div', { class: 'fig-row', 'aria-live': 'polite' }, root);
  const titleEl = h('strong', { style: 'font-size:1.15rem;min-width:5em' }, info);
  const countEl = h('span', {}, info);

  const view = responsiveSvg(root, { label: 'A piano keyboard showing a chord progression played in root position or with smooth inversions.', aspect: 0.24, minH: 140, maxH: 200 });
  const kb: Keyboard = keyboard(view.el, { from: FROM, to: TO, names: 'c' });

  const chips = row(root);
  chips.style.gap = '8px';
  const totalsEl = h('div', { class: 'fig-row fig-note', style: 'margin-top:0' }, root);

  const rp = row(root);
  const progBtns = PROGS.map((p, i) => button(rp, p.label, () => { stopAll(); pi = i; step = 0; buildChips(); paint(); }));
  const rv = row(root);
  const verBtns = ['Root position', 'Smooth'].map((l, i) => button(rv, l, () => { stopAll(); smooth = i === 1; step = 0; paint(); }));
  const playBtn = button(rv, 'Play', () => toggle());

  let pi = 0;
  let smooth = false;
  let step = 0;
  let handle: { stop(): void } | null = null;
  let chipBtns: HTMLButtonElement[] = [];

  const chordsOf = () => (smooth ? PROGS[pi].smooth : PROGS[pi].jumpy);

  function buildChips() {
    chips.replaceChildren();
    chipBtns = PROGS[pi].names.map((n, i) => button(chips, n, () => { stopAll(); step = i; paint(); }));
  }

  function paint() {
    const ch = chordsOf();
    const cur = ch[step];
    const prev = step > 0 ? ch[step - 1] : null;
    const marks = new Map<number, Mark>();
    if (prev) prev.forEach((m) => { if (!cur.includes(m)) marks.set(m, { kind: 'ring' }); });
    cur.forEach((m) => marks.set(m, { kind: 'on', label: NAMES[m] }));
    kb.mark(marks);
    let sofar = 0;
    for (let i = 1; i <= step; i++) sofar += moved(ch[i - 1], ch[i]);
    titleEl.textContent = `${PROGS[pi].names[step]}${prev ? ` (from ${PROGS[pi].names[step - 1]})` : ''}`;
    countEl.textContent = `Keys moved so far: ${sofar}`;
    totalsEl.textContent = `Whole progression: root position ${total(PROGS[pi].jumpy)} keys, smooth ${total(PROGS[pi].smooth)} keys. Outlined keys show where the fingers were a moment ago.`;
    choose(progBtns, pi);
    choose(verBtns, smooth ? 1 : 0);
    choose(chipBtns, step);
  }

  function toggle() {
    if (handle) { stopAll(); return; }
    unlock();
    const ch = chordsOf();
    const events: Ev[] = ch.map((midi, k) => ({ kind: 'notes', midi, beat: k * 2, beats: k === ch.length - 1 ? 3 : 2 }));
    playBtn.textContent = 'Stop';
    handle = play({ bpm: BPM, events, totalBeats: (ch.length - 1) * 2 + 3 }, {
      onEvent: (ev, k) => {
        if (!root.isConnected) { stopAll(); return; }
        step = k;
        paint();
        if (ev.kind === 'notes') kb.flash(ev.midi, 400);
      },
      onEnd: () => { handle = null; playBtn.textContent = 'Play'; },
    });
  }

  const draw = () => {
    kb.layout(2, 6, view.W - 4, view.H - 10);
    paint();
  };
  view.onResize(draw);
  buildChips();
  draw();
};

export default mount;
