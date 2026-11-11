// Inversions (music chapter 4): one chord at a time in root position, first or
// second inversion. Changing position moves the bottom note up to the top (the
// moving note glides across), the root stays highlighted, and the wider gap
// is marked.

import { responsiveSvg, row, button, h, s, tween, lerp, type Mount } from './lib';
import { keyboard, playMidi, unlock, type Mark, type Keyboard } from './music-lib';
import { choose } from './music-chord-kit';

const FROM = 60; // C4
const TO = 84; // C6

const CHORDS = [
  { name: 'C', root: 60, semis: [0, 4, 7], notes: ['C', 'E', 'G'] },
  { name: 'D', root: 62, semis: [0, 4, 7], notes: ['D', 'F♯', 'A'] },
  { name: 'F', root: 65, semis: [0, 4, 7], notes: ['F', 'A', 'C'] },
  { name: 'G', root: 67, semis: [0, 4, 7], notes: ['G', 'B', 'D'] },
  { name: 'Am', root: 69, semis: [0, 3, 7], notes: ['A', 'C', 'E'] },
];
const POS = ['Root position', '1st inversion', '2nd inversion'];
const FINGERS = [[1, 3, 5], [1, 2, 5], [1, 3, 5]];

/** Notes (low to high) and their chord-note index (0 root, 1 third, 2 fifth). */
function voicing(c: (typeof CHORDS)[number], inv: number) {
  const order = [0, 1, 2].map((k) => (k + inv) % 3);
  return order.map((k, i) => ({ midi: c.root + c.semis[k] + (i + inv > 2 ? 12 : 0), k }));
}

const mount: Mount = (root) => {
  const info = h('div', { class: 'fig-row', 'aria-live': 'polite' }, root);
  const titleEl = h('strong', { style: 'font-size:1.15rem;min-width:9em' }, info);
  const notesEl = h('span', {}, info);
  const noteEl = h('div', { class: 'fig-row fig-note', style: 'margin-top:0' }, root);

  const view = responsiveSvg(root, { label: 'A piano keyboard showing a chord and its inversions.', aspect: 0.3, minH: 178, maxH: 252 });
  const markG = s('g', {}, view.el);
  const kb: Keyboard = keyboard(view.el, { from: FROM, to: TO, names: 'c' });
  const glideG = s('g', {}, view.el);
  const fingerG = s('g', {}, view.el);

  const rc = row(root);
  rc.style.gap = '8px';
  const chordBtns = CHORDS.map((c, i) => button(rc, c.name, () => { ci = i; inv = 0; paint(); sound(); }));
  const rp = row(root);
  const posBtns = POS.map((p, i) => button(rp, p, () => go(i)));
  button(rp, 'Play', () => sound());

  let ci = 0;
  let inv = 0;
  let cancel: () => void = () => {};

  function sound() {
    unlock();
    const midi = voicing(CHORDS[ci], inv).map((v) => v.midi);
    playMidi(midi, 'chord', { beats: 1.8, onEvent: () => kb.flash(midi, 450) });
  }

  function go(next: number) {
    const before = voicing(CHORDS[ci], inv);
    const after = voicing(CHORDS[ci], next);
    inv = next;
    paint();
    sound();
    // Glide each note that changed key, from its old key to its new one, over the top.
    cancel();
    glideG.replaceChildren();
    const moves = before
      .map((b) => ({ from: kb.key(b.midi), to: kb.key(after.find((a) => a.k === b.k)!.midi) }))
      .filter((m) => m.from && m.to && m.from.midi !== m.to.midi);
    const dots = moves.map(() => s('circle', { r: 6, class: 'dot-acc' }, glideG));
    cancel = tween((t) => {
      moves.forEach((m, i) => {
        const a = m.from!, b = m.to!;
        const x = lerp(a.cx, b.cx, t);
        const y0 = a.top - 10;
        const y = y0 - Math.sin(Math.PI * t) * 26;
        dots[i].setAttribute('cx', String(x));
        dots[i].setAttribute('cy', String(y));
      });
    }, 600, () => glideG.replaceChildren());
  }

  function paint() {
    const c = CHORDS[ci];
    const v = voicing(c, inv);
    const marks = new Map<number, Mark>();
    v.forEach((n) => marks.set(n.midi, { kind: n.k === 0 ? 'on' : 'ring', label: c.notes[n.k] }));
    fingerG.replaceChildren();
    v.forEach((n, i) => {
      const k = kb.key(n.midi);
      if (!k) return;
      const tx = s('text', { x: k.cx, y: view.H - 4, 'text-anchor': 'middle', class: 'lbl' }, fingerG);
      tx.textContent = String(FINGERS[inv][i]);
    });
    kb.mark(marks);
    choose(chordBtns, ci);
    choose(posBtns, inv);
    titleEl.textContent = `${c.name}: ${POS[inv].toLowerCase()}`;
    notesEl.textContent = v.map((n) => c.notes[n.k]).join(' – ');
    noteEl.textContent = inv === 0
      ? `The root, ${c.notes[0]}, is at the bottom. Both gaps are small (3 or 4 keys).`
      : `The root, ${c.notes[0]}, sits directly above the wider gap (5 keys).`;
    markG.replaceChildren();
    if (inv > 0) {
      const lo = inv === 1 ? v[1] : v[0];
      const hi = inv === 1 ? v[2] : v[1];
      const a = kb.key(lo.midi), b = kb.key(hi.midi);
      if (a && b) {
        const y = a.top - 12;
        s('path', { d: `M ${a.cx} ${y + 5} V ${y} H ${b.cx} V ${y + 5}`, class: 'line-acc' }, markG);
        const t = s('text', { x: (a.cx + b.cx) / 2, y: y - 7, 'text-anchor': 'middle', class: 'lbl-acc' }, markG);
        t.textContent = 'wider gap';
      }
    }
  }

  const draw = () => {
    kb.layout(2, 40, view.W - 4, view.H - 62);
    paint();
  };
  view.onResize(draw);
  draw();
};

export default mount;
