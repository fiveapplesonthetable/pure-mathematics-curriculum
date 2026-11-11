// Song player (music chapter 7): plays a piece while a keyboard lights each
// note and a strip of letters and finger numbers shows where you are.
// Right hand alone, or both hands.

import { row, button, slider, h, s, label, type Mount } from './lib';
import { keyboard, noteToMidi, isBlack, play, unlock, type Keyboard, type Mark } from './music-lib';
import type { Ev, Handle } from '../audio';

interface Cell { top: string; sub: string; notes: string[]; b: number; strikes?: number }
interface LH { n: string[]; b: number; name?: string }
interface Song { name: string; meter: number; pickup: number; bpm: number; cells: Cell[]; lh: LH[]; wide?: boolean; /** start a new row before these bar indices */ breaks?: number[] }

const n = (top: string, octave: number, finger: number, b = 1): Cell => ({ top, sub: String(finger), notes: [`${top}${octave}`], b });
const C = ['C3', 'E3', 'G3'], G = ['B2', 'D3', 'G3'];

const ODE_PHRASE = (end: Cell[]): Cell[] => [
  n('E', 4, 3), n('E', 4, 3), n('F', 4, 4), n('G', 4, 5),
  n('G', 4, 5), n('F', 4, 4), n('E', 4, 3), n('D', 4, 2),
  n('C', 4, 1), n('C', 4, 1), n('D', 4, 2), n('E', 4, 3),
  ...end,
];

export const SONGS: Song[] = [
  {
    name: 'Ode to Joy',
    meter: 4,
    pickup: 0,
    bpm: 100,
    cells: [
      ...ODE_PHRASE([n('E', 4, 3, 1.5), n('D', 4, 2, 0.5), n('D', 4, 2, 2)]),
      ...ODE_PHRASE([n('D', 4, 2, 1.5), n('C', 4, 1, 0.5), n('C', 4, 1, 2)]),
    ],
    lh: [
      { n: C, b: 4, name: 'C' }, { n: G, b: 4, name: 'G' }, { n: C, b: 4, name: 'C' }, { n: C, b: 2, name: 'C' }, { n: G, b: 2, name: 'G' },
      { n: C, b: 4, name: 'C' }, { n: G, b: 4, name: 'G' }, { n: C, b: 4, name: 'C' }, { n: G, b: 2, name: 'G' }, { n: C, b: 2, name: 'C' },
    ],
    breaks: [4],
  },
  {
    name: 'Amazing Grace (first line)',
    meter: 3,
    pickup: 1,
    bpm: 84,
    cells: [
      n('D', 4, 1),
      n('G', 4, 3, 2), n('B', 4, 5, 0.5), n('G', 4, 3, 0.5),
      n('B', 4, 5, 2), n('A', 4, 4),
      n('G', 4, 3, 2), n('E', 4, 2),
      n('D', 4, 1, 2), n('D', 4, 1),
      n('G', 4, 3, 2), n('B', 4, 5, 0.5), n('G', 4, 3, 0.5),
      n('B', 4, 5, 2), n('A', 4, 4),
      n('D', 5, 5, 3),
    ],
    lh: [
      { n: [], b: 1 },
      { n: ['G2', 'B2', 'D3'], b: 3, name: 'G' }, { n: ['G2', 'B2', 'D3'], b: 3, name: 'G' }, { n: ['G2', 'C3', 'E3'], b: 3, name: 'C' },
      { n: ['G2', 'B2', 'D3'], b: 3, name: 'G' }, { n: ['G2', 'B2', 'D3'], b: 3, name: 'G' }, { n: ['G2', 'B2', 'D3'], b: 3, name: 'G' },
      { n: ['F#2', 'A2', 'D3'], b: 3, name: 'D' },
    ],
    breaks: [5],
  },
  {
    name: 'Four chords: C G Am F',
    meter: 4,
    pickup: 0,
    bpm: 92,
    wide: true,
    cells: [
      { top: 'C', sub: 'G C E', notes: ['G3', 'C4', 'E4'], b: 4, strikes: 4 },
      { top: 'G', sub: 'G B D', notes: ['G3', 'B3', 'D4'], b: 4, strikes: 4 },
      { top: 'Am', sub: 'A C E', notes: ['A3', 'C4', 'E4'], b: 4, strikes: 4 },
      { top: 'F', sub: 'A C F', notes: ['A3', 'C4', 'F4'], b: 4, strikes: 4 },
      { top: 'C', sub: 'G C E', notes: ['G3', 'C4', 'E4'], b: 4 },
    ],
    lh: [{ n: ['C3'], b: 4 }, { n: ['G2'], b: 4 }, { n: ['A2'], b: 4 }, { n: ['F2'], b: 4 }, { n: ['C3'], b: 4 }],
  },
];

const mount: Mount = (root) => {
  let song = SONGS[0];
  let both = false;
  let bpm = song.bpm;
  let handle: Handle | null = null;
  let curCell = -1;
  let rhNow: number[] = [];
  let lhNow: number[] = [];
  let kb: Keyboard | null = null;
  let kbFrom = 0, kbTo = 0;

  const top = row(root);
  const lab = h('label', { class: 'slider' }, top);
  h('span', { class: 'slider-name' }, lab, 'Piece');
  const sel = h('select', {
    'aria-label': 'Piece',
    style: 'font:inherit;font-size:0.95rem;min-height:40px;padding:0 8px;border-radius:6px;border:1px solid color-mix(in srgb, var(--muted) 70%, transparent);background:var(--bg);color:var(--fg);min-width:0;flex:1',
  }, lab);
  SONGS.forEach((sg, i) => h('option', { value: String(i) }, sel, sg.name));

  const svg = s('svg', { role: 'img', 'aria-label': 'Letters and finger numbers of the piece above a piano keyboard' }, root);
  const strip = s('g', {}, svg);
  const kbG = s('g', {}, svg);

  const ctl = row(root);
  const playBtn = button(ctl, 'Play', () => (handle ? handle.stop() : start()));
  const rhBtn = button(ctl, 'Right hand', () => setHands(false));
  const bothBtn = button(ctl, 'Both hands', () => setHands(true));
  const tempo = slider(ctl, {
    label: 'Tempo', min: 40, max: 132, step: 4, value: bpm, format: (v) => `${v} beats per minute`,
    onInput: (v) => {
      bpm = v;
      if (handle) start();
    },
  });

  function setHands(v: boolean) {
    both = v;
    rhBtn.setAttribute('aria-pressed', String(!v));
    bothBtn.setAttribute('aria-pressed', String(v));
    if (handle) start();
    else paint();
  }

  let W = 0;
  let cellGeom: { x: number; y: number; w: number }[] = [];
  let stripH = 0;

  function layout() {
    const w = Math.round(root.clientWidth || 600);
    if (w < 160) return; // not laid out yet; the resize observer lays out again
    W = w;
    while (strip.firstChild) strip.firstChild.remove();
    // bars
    const bars: number[][] = [];
    let beat = 0, bar: number[] = [];
    const barEnd = (b: number) => (b < song.pickup ? song.pickup : song.pickup + Math.ceil((b - song.pickup + 1e-6) / song.meter) * song.meter);
    let end = barEnd(0);
    song.cells.forEach((c, i) => {
      if (beat >= end - 1e-6) { bars.push(bar); bar = []; end = barEnd(beat); }
      bar.push(i);
      beat += c.b;
    });
    if (bar.length) bars.push(bar);
    const cw = song.wide ? Math.min(78, (W - 24) / 4) : Math.min(40, Math.max(16, (W - 66) / 17));
    const gap = 10, rowH = 64;
    let x = 8, y = 24;
    cellGeom = [];
    const barStarts: { x: number; y: number }[] = [];
    const wOf = (ci: number) => (song.wide ? cw : cw * Math.min(2, Math.max(0.9, song.cells[ci].b)));
    bars.forEach((b, bi) => {
      const bw = b.reduce((a, ci) => a + wOf(ci), 0);
      if ((x + bw > W - 8 || song.breaks?.includes(bi)) && x > 8) { x = 8; y += rowH; }
      barStarts.push({ x, y });
      let cx = x;
      b.forEach((ci) => { cellGeom[ci] = { x: cx, y, w: wOf(ci) }; cx += wOf(ci); });
      x += bw;
      s('line', { x1: x + gap / 2, x2: x + gap / 2, y1: y - 4, y2: y + 40, class: 'ax' }, strip);
      x += gap;
    });
    stripH = y + rowH - 10;
    // chord names above the bars (left hand)
    let lb = 0;
    for (const l of song.lh) {
      if (l.name) {
        let acc = 0;
        const ci = song.cells.findIndex((c) => { const hit = Math.abs(acc - lb) < 1e-6; acc += c.b; return hit; });
        if (ci >= 0) label(strip, cellGeom[ci].x + 2, cellGeom[ci].y - 8, l.name, 'lbl', 'start');
      }
      lb += l.b;
    }
    // keyboard range from the notes used
    const all = [...song.cells.flatMap((c) => c.notes), ...song.lh.flatMap((l) => l.n)].map(noteToMidi);
    let lo = Math.min(...all) - 1, hi = Math.max(...all) + 1;
    while (isBlack(lo)) lo--;
    while (isBlack(hi)) hi++;
    const kbH = Math.min(120, Math.max(84, W * 0.15));
    const H = stripH + kbH + 8;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('width', String(W));
    svg.setAttribute('height', String(H));
    if (!kb || lo !== kbFrom || hi !== kbTo) {
      while (kbG.firstChild) kbG.firstChild.remove();
      kb = keyboard(kbG, { from: lo, to: hi });
      kbFrom = lo; kbTo = hi;
    }
    let whites = 0;
    for (let m = lo; m <= hi; m++) if (!isBlack(m)) whites++;
    const kw = Math.min(W - 16, whites * 42);
    kb.layout((W - kw) / 2, stripH, kw, kbH);
    void barStarts;
    paint();
  }

  const cellText: { bg: SVGRectElement; t: SVGTextElement; f: SVGTextElement }[] = [];
  function paint() {
    // strip cells
    strip.querySelectorAll('.cell').forEach((e) => e.remove());
    cellText.length = 0;
    song.cells.forEach((c, i) => {
      const g = cellGeom[i];
      if (!g) return;
      const on = i === curCell;
      const grp = s('g', { class: 'cell' }, strip);
      if (on) s('rect', { x: g.x + 1, y: g.y - 2, width: g.w - 2, height: 42, rx: 5, class: 'band-pos' }, grp);
      const t = label(grp, g.x + g.w / 2, g.y + 16, c.top, on ? 'lbl-acc' : 'lbl-fg');
      t.setAttribute('style', 'font-size:15px');
      label(grp, g.x + g.w / 2, g.y + 34, c.sub, on ? 'lbl-acc' : 'lbl');
    });
    // keys
    const marks = new Map<number, Mark>();
    for (const m of lhNow) marks.set(m, { kind: 'soft' });
    for (const m of rhNow) marks.set(m, { kind: 'on' });
    kb?.mark(marks);
  }

  function start() {
    unlock();
    const events: Ev[] = [];
    const meta: { cell?: number; hand: 'R' | 'L'; midi: number[] }[] = [];
    let beat = 0;
    song.cells.forEach((c, i) => {
      const k = c.strikes ?? 1;
      for (let j = 0; j < k; j++) {
        const midi = c.notes.map(noteToMidi);
        events.push({ kind: 'notes', midi, beat: beat + (j * c.b) / k, beats: c.b / k });
        meta.push({ cell: i, hand: 'R', midi });
      }
      beat += c.b;
    });
    const total = beat;
    if (both) {
      let lb = 0;
      for (const l of song.lh) {
        if (l.n.length) {
          const midi = l.n.map(noteToMidi);
          events.push({ kind: 'notes', midi, beat: lb, beats: l.b, vel: 0.7 });
          meta.push({ hand: 'L', midi });
        }
        lb += l.b;
      }
    }
    const hd = play({ bpm, events, totalBeats: total }, {
      bpm,
      onEvent: (_e, i) => {
        const m = meta[i];
        if (m.hand === 'R') { rhNow = m.midi; curCell = m.cell!; kb?.flash(m.midi, 160); }
        else lhNow = m.midi;
        paint();
      },
      onEnd: () => {
        if (handle !== hd) return;
        handle = null;
        curCell = -1;
        rhNow = lhNow = [];
        playBtn.textContent = 'Play';
        playBtn.setAttribute('aria-pressed', 'false');
        paint();
      },
    });
    handle = hd;
    lhNow = [];
    playBtn.textContent = 'Stop';
    playBtn.setAttribute('aria-pressed', 'true');
  }

  sel.addEventListener('change', () => {
    handle?.stop();
    song = SONGS[Number(sel.value)];
    bpm = song.bpm;
    tempo.set(bpm);
    curCell = -1;
    layout();
  });

  rhBtn.setAttribute('aria-pressed', 'true');
  bothBtn.setAttribute('aria-pressed', 'false');
  new ResizeObserver(() => {
    if (Math.round(root.clientWidth) !== W) layout();
  }).observe(root);
  layout();
  return () => handle?.stop();
};

export default mount;
