// Interval listener (music chapter 1): tap two keys, or pick a preset, to see
// how many half steps apart they are, hear them apart and together, and read
// the interval's name. Keys in between are numbered so the count is visible.

import { responsiveSvg, row, button, h, s, type Mount } from './lib';
import { keyboard, midiName, play, unlock, type Mark, type Keyboard } from './music-lib';
import type { Ev } from '../audio';

const FROM = 60; // C4
const TO = 84; // C6

const NAMES: Record<number, string> = {
  0: 'the same note',
  1: 'a half step',
  2: 'a whole step',
  3: 'a minor third',
  4: 'a major third',
  5: 'a fourth',
  6: 'a tritone',
  7: 'a fifth',
  8: 'a minor sixth',
  9: 'a major sixth',
  10: 'a minor seventh',
  11: 'a major seventh',
  12: 'an octave',
};
const SOUND: Record<number, string> = {
  1: 'The notes rub against each other.',
  2: 'A gentle rub.',
  3: 'Soft, a little sad.',
  4: 'Bright and sweet.',
  7: 'Open and strong.',
  12: 'The two notes almost merge into one.',
};
const PRESETS: [string, number][] = [['Half step', 1], ['Whole step', 2], ['Minor third', 3], ['Major third', 4], ['Fifth', 7], ['Octave', 12]];

const mount: Mount = (root) => {
  const info = h('div', { class: 'fig-row', 'aria-live': 'polite' }, root);
  const headEl = h('strong', { style: 'font-size:1.15rem' }, info);
  const soundEl = h('span', { class: 'fig-note' }, info);

  const view = responsiveSvg(root, { label: 'A piano keyboard. Tap two keys to hear the interval between them.', aspect: 0.28, minH: 170, maxH: 240 });
  const arcG = s('g', {}, view.el);
  let a = 60, b = 64;
  let waiting = false; // true after the first of two taps

  const kb: Keyboard = keyboard(view.el, {
    from: FROM,
    to: TO,
    names: 'c',
    onPress: (m) => {
      if (!waiting) {
        a = m; b = m; waiting = true;
        paint();
        headEl.textContent = `${midiName(m)}. Now tap a second key.`;
        soundEl.textContent = '';
      } else {
        b = m; waiting = false;
        paint();
        playBoth(0.35);
      }
    },
  });

  const r1 = row(root);
  const presetBtns = PRESETS.map(([label, n]) =>
    button(r1, label, () => {
      unlock();
      a = 60; b = 60 + n; waiting = false;
      paint();
      playBoth();
    }),
  );
  const r2 = row(root);
  button(r2, 'Play again', () => { unlock(); playBoth(); });

  const flash = (ev: Ev) => { if (ev.kind === 'notes') kb.flash(ev.midi, 380); };
  const lo = () => Math.min(a, b), hi = () => Math.max(a, b);
  function playBoth(delay = 0) {
    const events: Ev[] = [
      { kind: 'notes', midi: [lo()], beat: delay, beats: 1 },
      { kind: 'notes', midi: [hi()], beat: delay + 1, beats: 1 },
      { kind: 'notes', midi: [lo(), hi()], beat: delay + 2, beats: 2 },
    ];
    play({ bpm: 96, events, totalBeats: delay + 4 }, { onEvent: flash });
  }

  function paint() {
    const L = lo(), H = hi(), n = H - L;
    const marks = new Map<number, Mark>();
    for (let m = L + 1; m < H; m++) marks.set(m, { kind: 'soft', label: String(m - L) });
    marks.set(L, { kind: 'on', label: midiName(L, false, false) });
    if (n > 0) marks.set(H, { kind: 'on', label: midiName(H, false, false) });
    kb.mark(marks);
    presetBtns.forEach((btn, i) => btn.setAttribute('aria-pressed', String(L === 60 && n === PRESETS[i][1])));
    if (!waiting) {
      const nm = n <= 12 ? NAMES[n] : 'more than an octave';
      headEl.textContent = n === 0 ? `${midiName(L)} and ${midiName(H)}: the same key` : `${midiName(L)} to ${midiName(H)}: ${n} half step${n === 1 ? '' : 's'}, ${nm}`;
      soundEl.textContent = SOUND[n] ?? '';
    }
    drawArc(L, H, n);
  }

  function drawArc(L: number, H: number, n: number) {
    arcG.replaceChildren();
    if (n === 0 || waiting) return;
    const ka = kb.key(L), kz = kb.key(H);
    if (!ka || !kz) return;
    const y = ka.top - 4;
    const mid = (ka.cx + kz.cx) / 2;
    const lift = Math.min(30, 12 + (kz.cx - ka.cx) * 0.12);
    s('path', { d: `M ${ka.cx} ${y} Q ${mid} ${y - lift * 2} ${kz.cx} ${y}`, class: 'line-acc' }, arcG);
    const t = s('text', { x: mid, y: y - lift - 6, 'text-anchor': 'middle', class: 'lbl-acc' }, arcG);
    t.textContent = `${n}`;
  }

  const draw = () => {
    kb.layout(2, 46, view.W - 4, view.H - 50);
    paint();
  };
  view.onResize(draw);
  draw();
};

export default mount;
