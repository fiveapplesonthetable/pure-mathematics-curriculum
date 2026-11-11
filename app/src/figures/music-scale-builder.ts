// Scale builder (music chapter 2): choose a starting key (tap it) and a scale
// type, then climb the step pattern one step at a time, or play it all. Each
// step is drawn as an arc labelled W or H, and the notes are spelled with one
// letter per note.

import { responsiveSvg, row, button, h, s, type Mount } from './lib';
import { keyboard, spell, playMidi, unlock, type Mark, type Keyboard } from './music-lib';

const FROM = 60; // C4
const TO = 84; // C6

type Kind = 'major' | 'minor' | 'penta';
const SCALES: Record<Kind, { label: string; semis: number[]; steps: number[]; names: string[] }> = {
  major: { label: 'Major', semis: [0, 2, 4, 5, 7, 9, 11, 12], steps: [0, 1, 2, 3, 4, 5, 6, 7], names: ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'] },
  minor: { label: 'Natural minor', semis: [0, 2, 3, 5, 7, 8, 10, 12], steps: [0, 1, 2, 3, 4, 5, 6, 7], names: ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'B♭', 'B'] },
  penta: { label: 'Major pentatonic', semis: [0, 2, 4, 7, 9, 12], steps: [0, 1, 2, 4, 5, 7], names: ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'] },
};
// Major and minor steps are W or H; the pentatonic's gaps are shown as half-step counts.
const stepName = (d: number, k: Kind) => (k === 'penta' ? String(d) : d === 1 ? 'H' : d === 2 ? 'W' : String(d));

const mount: Mount = (root) => {
  const info = h('div', { class: 'fig-row', 'aria-live': 'polite' }, root);
  const titleEl = h('strong', { style: 'font-size:1.15rem;min-width:10em' }, info);
  const notesEl = h('span', {}, info);
  const patEl = h('div', { class: 'fig-row fig-note', style: 'margin-top:0' }, root);

  const view = responsiveSvg(root, { label: 'A piano keyboard showing a scale built step by step.', aspect: 0.28, minH: 175, maxH: 245 });
  const arcG = s('g', {}, view.el);

  let pc = 0;
  let kind: Kind = 'major';
  let shown = 1;

  const kb: Keyboard = keyboard(view.el, {
    from: FROM,
    to: TO,
    names: 'none',
    onPress: (m) => {
      pc = m % 12;
      shown = 1;
      paint();
    },
  });

  const r1 = row(root);
  const kindBtns = (Object.keys(SCALES) as Kind[]).map((k) => {
    const b = button(r1, SCALES[k].label, () => {
      kind = k;
      shown = 1;
      paint();
    });
    return [b, k] as const;
  });
  const r2 = row(root);
  const nextBtn = button(r2, 'Next step', () => {
    unlock();
    const sc = cur();
    if (shown >= sc.midi.length) shown = 1;
    else shown++;
    paint();
    const m = sc.midi[shown - 1];
    playMidi(shown > 1 ? [sc.midi[shown - 2], m] : [m], 'melody', { beats: 0.6, onEvent: (ev) => { if (ev.kind === 'notes') kb.flash(ev.midi, 300); } });
  });
  button(r2, 'Play the scale', () => {
    unlock();
    const sc = cur();
    shown = 1;
    paint();
    playMidi(sc.midi, 'melody', {
      beats: 0.6,
      onEvent: (ev, i) => {
        shown = Math.max(shown, i + 1);
        paint();
        if (ev.kind === 'notes') kb.flash(ev.midi, 300);
      },
    });
  });

  function cur() {
    const sc = SCALES[kind];
    const tonic = sc.names[pc];
    const names = spell(tonic, sc.semis, sc.steps);
    const midi = sc.semis.map((d) => FROM + pc + d);
    return { sc, tonic, names, midi };
  }

  function paint() {
    const { sc, tonic, names, midi } = cur();
    const marks = new Map<number, Mark>();
    midi.forEach((m, i) => {
      if (i < shown) marks.set(m, { kind: i === shown - 1 ? 'on' : 'soft', label: names[i] });
    });
    kb.mark(marks);
    titleEl.textContent = `${tonic} ${sc.label.toLowerCase()}`;
    notesEl.textContent = names.slice(0, shown).join('  ');
    const pattern = sc.semis.slice(1).map((d, i) => stepName(d - sc.semis[i], kind));
    const acc = names.slice(0, -1).filter((n) => n.length > 1);
    const accText = acc.length ? `Uses ${acc.join(', ')}.` : 'All white keys.';
    patEl.textContent = `${kind === 'penta' ? 'Steps, in half steps' : 'Pattern'}: ${pattern.join(' ')}. ${shown === midi.length ? accText : `Step ${shown} of ${midi.length}.`}`;
    nextBtn.textContent = shown >= midi.length ? 'Start over' : 'Next step';
    kindBtns.forEach(([b, k]) => b.setAttribute('aria-pressed', String(k === kind)));
    drawArcs(midi, pattern);
  }

  function drawArcs(midi: number[], pattern: string[]) {
    arcG.replaceChildren();
    for (let i = 1; i < shown; i++) {
      const a = kb.key(midi[i - 1]), b = kb.key(midi[i]);
      if (!a || !b) continue;
      const y = a.top - 4;
      const mid = (a.cx + b.cx) / 2;
      const lift = Math.max(10, (b.cx - a.cx) * 0.35);
      const recent = i === shown - 1;
      s('path', { d: `M ${a.cx + 2} ${y} Q ${mid} ${y - lift * 2} ${b.cx - 2} ${y}`, class: recent ? 'line-acc' : 'line-muted' }, arcG);
      const t = s('text', { x: mid, y: y - lift - 6, 'text-anchor': 'middle', class: recent ? 'lbl-acc' : 'lbl' }, arcG);
      t.textContent = pattern[i - 1];
    }
  }

  const draw = () => {
    kb.layout(2, 44, view.W - 4, view.H - 48);
    paint();
  };
  view.onResize(draw);
  draw();
};

export default mount;
