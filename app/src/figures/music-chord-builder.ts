// Chord builder (music chapter 3): tap a key to choose the root, pick major or
// minor (or another chord type under "More"), and see the counts between the
// notes, the spelled note names and the fingers. Play the chord together or
// one note at a time.

import { responsiveSvg, row, button, h, s, type Mount } from './lib';
import { keyboard, spell, playMidi, unlock, type Mark, type Keyboard } from './music-lib';
import { CHORD_TYPES, recipe, choose } from './music-chord-kit';

const FROM = 60; // C4
const TO = 84; // C6

const mount: Mount = (root) => {
  const info = h('div', { class: 'fig-row', 'aria-live': 'polite' }, root);
  const titleEl = h('strong', { style: 'font-size:1.15rem;min-width:4em' }, info);
  const notesEl = h('span', {}, info);
  const recipeEl = h('div', { class: 'fig-row fig-note', style: 'margin-top:0' }, root);

  const view = responsiveSvg(root, { label: 'A piano keyboard showing the chosen chord, with the number of keys between its notes.', aspect: 0.32, minH: 190, maxH: 260 });
  const arcG = s('g', {}, view.el);
  const fingerG = s('g', {}, view.el);

  let pc = 0;
  let type = 0;

  const kb: Keyboard = keyboard(view.el, {
    from: FROM,
    to: TO,
    names: 'c',
    aria: 'Choose root',
    onPress: (m) => {
      pc = m % 12;
      paint();
      playMidi(cur().midi, 'chord', { beats: 1.6 });
    },
  });

  const r1 = row(root);
  const main = CHORD_TYPES.slice(0, 2).map((t, i) => button(r1, t.label, () => pick(i)));
  const r2 = row(root);
  h('span', { class: 'fig-note' }, r2, 'More:');
  const more = CHORD_TYPES.slice(2).map((t, i) => button(r2, t.label, () => pick(i + 2)));
  const all = [...main, ...more];
  const r3 = row(root);
  button(r3, 'Play together', () => {
    unlock();
    const { midi } = cur();
    playMidi(midi, 'chord', { beats: 2, onEvent: () => kb.flash(midi, 500) });
  });
  button(r3, 'One at a time', () => {
    unlock();
    playMidi(cur().midi, 'melody', { beats: 0.6, onEvent: (ev) => { if (ev.kind === 'notes') kb.flash(ev.midi, 300); } });
  });

  function pick(i: number) {
    unlock();
    type = i;
    paint();
    playMidi(cur().midi, 'chord', { beats: 1.6 });
  }

  function cur() {
    const t = CHORD_TYPES[type];
    const rootName = t.roots[pc];
    const names = spell(rootName, t.semis, t.steps);
    const midi = t.semis.map((d) => FROM + pc + d);
    return { t, rootName, names, midi };
  }

  function paint() {
    const { t, rootName, names, midi } = cur();
    const marks = new Map<number, Mark>();
    midi.forEach((m, i) => marks.set(m, { kind: 'on', label: names[i] }));
    kb.mark(marks);
    titleEl.textContent = `${rootName}${t.suffix}`;
    notesEl.textContent = `${rootName} ${t.words}: ${names.join(', ')}`;
    recipeEl.textContent = `From the root, ${recipe(t.semis)}. Fingers ${t.fingers.join("–")}, shown under the keys.`;
    choose(all, type);
    fingerG.replaceChildren();
    midi.forEach((m, i) => {
      const k = kb.key(m);
      if (!k) return;
      const tx = s('text', { x: k.cx, y: view.H - 4, 'text-anchor': 'middle', class: 'lbl' }, fingerG);
      tx.textContent = String(t.fingers[i]);
    });
    arcG.replaceChildren();
    for (let i = 1; i < midi.length; i++) {
      const a = kb.key(midi[i - 1]), b = kb.key(midi[i]);
      if (!a || !b) continue;
      const y = a.top - 4;
      const mid = (a.cx + b.cx) / 2;
      const lift = Math.min(14, Math.max(8, (b.cx - a.cx) * 0.3));
      s('path', { d: `M ${a.cx + 2} ${y} Q ${mid} ${y - lift * 2} ${b.cx - 2} ${y}`, class: 'line-acc' }, arcG);
      const tx = s('text', { x: mid, y: y - lift - 6, 'text-anchor': 'middle', class: 'lbl-acc' }, arcG);
      tx.textContent = String(t.semis[i] - t.semis[i - 1]);
    }
  }

  const draw = () => {
    kb.layout(2, 44, view.W - 4, view.H - 66);
    paint();
  };
  view.onResize(draw);
  draw();
};

export default mount;
