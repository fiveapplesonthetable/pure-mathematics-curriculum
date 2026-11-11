// Accompaniment patterns (music chapter 4): two keyboards, left hand (bass,
// around C2-C3) and right hand (chords near middle C). Choose block chords,
// broken chords or the pop bounce, and play C, G, Am, F on a loop with the
// keys lighting as they sound.

import { responsiveSvg, row, button, h, s, type Mount } from './lib';
import { keyboard, play, stopAll, unlock, type Mark, type Keyboard } from './music-lib';
import type { Ev } from '../audio';
import { choose } from './music-chord-kit';

const BPM = 92;
const CHORDS = [
  { name: 'C', bass: 48, low: 36, fifth: 43, rh: [60, 64, 67], rhNames: ['C', 'E', 'G'] },
  { name: 'G', bass: 43, low: 43, fifth: 50, rh: [59, 62, 67], rhNames: ['B', 'D', 'G'] },
  { name: 'Am', bass: 45, low: 45, fifth: 52, rh: [60, 64, 69], rhNames: ['C', 'E', 'A'] },
  { name: 'F', bass: 41, low: 41, fifth: 48, rh: [60, 65, 69], rhNames: ['C', 'F', 'A'] },
];
const LH_NAMES: Record<number, string> = { 36: 'C2', 41: 'F2', 43: 'G2', 45: 'A2', 48: 'C3', 50: 'D3', 52: 'E3' };
const PATTERNS = ['Block chords', 'Broken chords', 'Pop bounce'];

function events(pattern: number): { evs: Ev[]; chordOf: number[] } {
  const evs: Ev[] = [];
  const chordOf: number[] = [];
  const add = (ci: number, midi: number[], beat: number, beats = 1) => { evs.push({ kind: 'notes', midi, beat, beats }); chordOf.push(ci); };
  CHORDS.forEach((c, ci) => {
    const b = ci * 4;
    if (pattern === 0) {
      for (let j = 0; j < 4; j++) add(ci, [c.bass, ...c.rh], b + j);
    } else if (pattern === 1) {
      add(ci, [c.bass], b, 4);
      [0, 1, 2, 1].forEach((k, j) => add(ci, [c.rh[k]], b + j));
    } else {
      add(ci, [c.low, ...c.rh], b);
      add(ci, c.rh, b + 1);
      add(ci, [c.fifth], b + 2);
      add(ci, c.rh, b + 3);
    }
  });
  return { evs, chordOf };
}

const mount: Mount = (root) => {
  const info = h('div', { class: 'fig-row', 'aria-live': 'off' }, root);
  const nowEl = h('span', {}, info);
  const view = responsiveSvg(root, { label: 'Two piano keyboards: the left hand plays bass notes, the right hand plays chords.', aspect: 0.25, minH: 150, maxH: 220 });
  const lhLbl = s('text', { class: 'lbl', 'text-anchor': 'start' }, view.el);
  lhLbl.textContent = 'Left hand';
  const rhLbl = s('text', { class: 'lbl', 'text-anchor': 'start' }, view.el);
  rhLbl.textContent = 'Right hand';
  const lh: Keyboard = keyboard(view.el, { from: 36, to: 52, names: 'c', aria: 'Left-hand key' });
  const rh: Keyboard = keyboard(view.el, { from: 57, to: 72, names: 'c', aria: 'Right-hand key' });

  const rp = row(root);
  const patBtns = PATTERNS.map((p, i) => button(rp, p, () => { pattern = i; choose(patBtns, i); if (playing) start(); }));
  const playBtn = button(rp, 'Play', () => (playing ? stop() : start()));

  let pattern = 0;
  let ci = 0;
  let playing = false;
  let t0 = 0;
  let run = 0;
  let expected = 0;

  function show(i: number) {
    ci = i;
    const c = CHORDS[i];
    const lm = new Map<number, Mark>();
    const notes = pattern === 2 ? [c.low, c.fifth] : [c.bass];
    notes.forEach((m) => lm.set(m, { kind: 'soft', label: LH_NAMES[m] }));
    lh.mark(lm);
    const rm = new Map<number, Mark>();
    c.rh.forEach((m, k) => rm.set(m, { kind: 'soft', label: c.rhNames[k] }));
    rh.mark(rm);
    nowEl.replaceChildren();
    h('span', { class: 'fig-note' }, nowEl, 'Chords: ');
    CHORDS.forEach((cc, k) => {
      const el = h(k === i ? 'strong' : 'span', {}, nowEl, cc.name);
      el.style.marginRight = '0.9em';
    });
  }

  function start() {
    unlock();
    const id = ++run;
    const { evs, chordOf } = events(pattern);
    playing = true;
    playBtn.textContent = 'Stop';
    playBtn.setAttribute('aria-pressed', 'true');
    const spb = 60 / BPM;
    expected = 16 * spb * 1000;
    t0 = performance.now();
    play({ bpm: BPM, events: evs, totalBeats: 16 }, {
      onEvent: (ev, k) => {
        if (!root.isConnected) { stopAll(); return; }
        if (chordOf[k] !== ci) show(chordOf[k]);
        if (ev.kind === 'notes') { lh.flash(ev.midi, 220); rh.flash(ev.midi, 220); }
      },
      onEnd: () => {
        if (id !== run) return; // replaced by a newer run
        // Loop only if this run finished by itself (not stopped by another player).
        const natural = performance.now() - t0 >= expected - 120;
        if (playing && natural && root.isConnected) start();
        else finish();
      },
    });
    show(0);
  }

  function finish() {
    playing = false;
    playBtn.textContent = 'Play';
    playBtn.setAttribute('aria-pressed', 'false');
    show(ci);
  }

  function stop() {
    run++;
    playing = false;
    stopAll();
    finish();
  }

  const draw = () => {
    const W = view.W;
    const stacked = W < 560;
    const lblH = 20;
    if (stacked) {
      const kh = Math.round(Math.min(130, Math.max(96, W * 0.3)));
      const H = 2 * (kh + lblH) + 14;
      view.el.setAttribute('viewBox', `0 0 ${W} ${H}`);
      view.el.setAttribute('height', String(H));
      rhLbl.setAttribute('x', '4'); rhLbl.setAttribute('y', '15');
      rh.layout(2, lblH, W - 4, kh);
      const y2 = lblH + kh + 14;
      lhLbl.setAttribute('x', '4'); lhLbl.setAttribute('y', String(y2 + 15));
      lh.layout(2, y2 + lblH, W - 4, kh);
    } else {
      const half = (W - 20) / 2;
      const kh = Math.round(Math.min(150, Math.max(110, half * 0.36)));
      const H = kh + lblH + 4;
      view.el.setAttribute('viewBox', `0 0 ${W} ${H}`);
      view.el.setAttribute('height', String(H));
      lhLbl.setAttribute('x', '4'); lhLbl.setAttribute('y', '15');
      lh.layout(2, lblH, half, kh);
      rhLbl.setAttribute('x', String(half + 20)); rhLbl.setAttribute('y', '15');
      rh.layout(half + 18, lblH, half, kh);
    }
    show(ci);
  };
  view.onResize(draw);
  choose(patBtns, 0);
  draw();
};

export default mount;
