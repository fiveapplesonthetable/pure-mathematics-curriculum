// Keyboard explorer (music chapter 1): tap any key to hear it and see its
// name and octave number, with the black-key landmark that finds it. Toggles
// show every name, or mark each C and F with the groups of two and three
// black keys above them.

import { responsiveSvg, row, button, h, s, type Mount } from './lib';
import { keyboard, isBlack, midiName, octaveOf, pcName, type Mark } from './music-lib';

// Where each white key sits relative to the groups of black keys (by pitch class).
const LANDMARK: Record<number, string> = {
  0: 'Directly left of a group of two black keys.',
  2: 'Between the two black keys of a group of two.',
  4: 'Directly right of a group of two black keys.',
  5: 'Directly left of a group of three black keys.',
  7: 'Between the first two black keys of a group of three.',
  9: 'Between the last two black keys of a group of three.',
  11: 'Directly right of a group of three black keys.',
};

const FROM = 48; // C3
const TO = 72; // C5

const mount: Mount = (root) => {
  const info = h('div', { class: 'fig-row', 'aria-live': 'polite' }, root);
  const nameEl = h('strong', { style: 'font-size:1.25rem;min-width:7.5em' }, info);
  const descEl = h('span', { class: 'fig-note' }, info);

  const view = responsiveSvg(root, { label: 'A piano keyboard from C3 to C5. Tap a key to hear it and see its name.', aspect: 0.3, minH: 160, maxH: 250 });
  const groupsG = s('g', {}, view.el);
  let selected: number | null = null;
  let allNames = false;
  let landmarks = false;

  const make = () =>
    keyboard(view.el, {
      from: FROM,
      to: TO,
      names: allNames ? 'all' : 'white',
      aria: 'Piano key',
      onPress: (m) => {
        selected = m;
        paint();
      },
    });
  let kb = make();

  const controls = row(root);
  const bNames = button(controls, 'Show all names', () => {
    allNames = !allNames;
    kb.g.remove();
    kb = make();
    draw();
  });
  const bLand = button(controls, 'Highlight every C and F', () => {
    landmarks = !landmarks;
    paint();
  });

  function describe(m: number) {
    const oct = octaveOf(m);
    if (isBlack(m)) {
      nameEl.textContent = `${midiName(m)} / ${midiName(m, true)}`;
      descEl.textContent = `A black key, between ${pcName(m - 1)} and ${pcName(m + 1)}. It takes its two names from them.`;
    } else {
      nameEl.textContent = midiName(m);
      descEl.textContent = `${m === 60 ? 'Middle C. ' : ''}${LANDMARK[m % 12]} Octave ${oct}.`;
    }
  }

  function paint() {
    const marks = new Map<number, Mark>();
    for (let m = FROM; m <= TO; m++) {
      const pc = m % 12;
      if (landmarks && (pc === 0 || pc === 5)) marks.set(m, { kind: 'soft', label: pc === 0 ? `C${octaveOf(m)}` : 'F' });
    }
    if (selected !== null) {
      const black = isBlack(selected);
      marks.set(selected, { kind: 'on', label: black ? midiName(selected, false, false) : midiName(selected, false, selected % 12 === 0) });
      describe(selected);
    } else {
      nameEl.textContent = 'Tap a key';
      descEl.textContent = 'Left is lower, right is higher.';
    }
    kb.mark(marks);
    bNames.setAttribute('aria-pressed', String(allNames));
    bLand.setAttribute('aria-pressed', String(landmarks));
    drawGroups();
  }

  function drawGroups() {
    groupsG.replaceChildren();
    if (!landmarks) return;
    // brackets over each group of two (C#, D#) and three (F#, G#, A#)
    for (let c = FROM; c < TO; c += 12) {
      for (const [a, b, t] of [[c + 1, c + 3, '2'], [c + 6, c + 10, '3']] as [number, number, string][]) {
        const ka = kb.key(a), kz = kb.key(b);
        if (!ka || !kz) continue;
        const y = ka.top - 6;
        s('path', { d: `M ${ka.x} ${y + 4} V ${y} H ${kz.x + kz.w} V ${y + 4}`, class: 'line-acc' }, groupsG);
        const tx = s('text', { x: (ka.x + kz.x + kz.w) / 2, y: y - 5, 'text-anchor': 'middle', class: 'lbl-acc' }, groupsG);
        tx.textContent = t;
      }
    }
  }

  const draw = () => {
    kb.layout(2, 30, view.W - 4, view.H - 34);
    paint();
  };
  view.onResize(draw);
  draw();
};

export default mount;
