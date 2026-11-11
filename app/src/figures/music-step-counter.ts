// Step counter (music chapter 1): pick a starting key, then move by half steps
// and whole steps. Each move is drawn as an arc, named and played. Moves
// across E-F and B-C get a short note, since there is no black key there.

import { responsiveSvg, row, button, h, s, type Mount } from './lib';
import { keyboard, isBlack, pcName, playMidi, unlock, type Mark, type Keyboard } from './music-lib';

const FROM = 60; // C4
const TO = 79; // G5
const MAX_MOVES = 6;

interface Pt { midi: number; flat: boolean }

const mount: Mount = (root) => {
  const info = h('div', { class: 'fig-row', 'aria-live': 'polite' }, root);
  const pathEl = h('strong', { style: 'font-size:1.15rem' }, info);
  const noteEl = h('div', { class: 'fig-row fig-note', style: 'min-height:2.8em;margin-top:0' }, root);

  const view = responsiveSvg(root, { label: 'A piano keyboard. Choose a starting key, then step by half steps or whole steps.', aspect: 0.3, minH: 170, maxH: 250 });
  const arcsG = s('g', {}, view.el);
  let path: Pt[] = [{ midi: 64, flat: false }]; // start on E4

  const name = (p: Pt) => pcName(p.midi, p.flat);

  const kb: Keyboard = keyboard(view.el, {
    from: FROM,
    to: TO,
    names: 'white',
    octaves: false,
    onPress: (m) => {
      path = [{ midi: m, flat: false }];
      noteEl.textContent = `Starting on ${pcName(m)}${isBlack(m) ? ` (also called ${pcName(m, true)})` : ''}. Now take a step.`;
      paint();
    },
  });

  const r1 = row(root);
  const moves: [string, number][] = [['Half step up', 1], ['Whole step up', 2], ['Half step down', -1], ['Whole step down', -2]];
  const btns = moves.map(([label, d]) => [button(r1, label, () => step(d)), d] as const);
  const r2 = row(root);
  button(r2, 'Start again', () => {
    path = [path[0]];
    noteEl.textContent = 'Tap any key to start somewhere else.';
    paint();
  });

  function explain(a: Pt, b: Pt, d: number) {
    const lo = Math.min(a.midi, b.midi), hi = Math.max(a.midi, b.midi);
    const dir = d > 0 ? 'up' : 'down';
    const kind = Math.abs(d) === 1 ? 'half step' : 'whole step';
    let msg = `${name(a)} to ${name(b)}: a ${kind} ${dir}.`;
    if (Math.abs(d) === 1 && !isBlack(lo) && !isBlack(hi)) {
      msg += ` Both keys are white, but there is no black key between ${pcName(lo)} and ${pcName(hi)}, so this is only a half step.`;
    } else if (Math.abs(d) === 2 && !isBlack(lo + 1)) {
      const skipped = (lo + 1) % 12;
      const pair = skipped === 4 || skipped === 5 ? 'E and F' : 'B and C';
      msg += ` It skips the white key ${pcName(skipped)}: there is no black key between ${pair}.`;
    } else if (Math.abs(d) === 2) {
      msg += ` It skips one key, the black key between them.`;
    } else if (isBlack(b.midi)) {
      msg += d > 0 ? ` One key to the right is a sharp: ${pcName(b.midi)}.` : ` One key to the left is a flat: ${pcName(b.midi, true)}.`;
    }
    return msg;
  }

  function step(d: number) {
    unlock();
    const last = path[path.length - 1];
    const m = last.midi + d;
    if (m < FROM || m > TO) {
      noteEl.textContent = 'That goes off the end of this keyboard. Try the other direction.';
      return;
    }
    // Black keys reached by going up get sharp names, going down flat names.
    const next: Pt = { midi: m, flat: d < 0 };
    path.push(next);
    if (path.length > MAX_MOVES + 1) path = path.slice(path.length - MAX_MOVES - 1);
    noteEl.textContent = explain(last, next, d);
    paint();
    playMidi([last.midi, m], 'melody', { beats: 0.6, onEvent: (ev) => { if (ev.kind === 'notes') kb.flash(ev.midi, 300); } });
  }

  function paint() {
    const marks = new Map<number, Mark>();
    path.forEach((p, i) => {
      const last = i === path.length - 1;
      marks.set(p.midi, { kind: last ? 'on' : 'soft', label: name(p) });
    });
    kb.mark(marks);
    pathEl.textContent = path.map(name).join(' → ');
    const last = path[path.length - 1].midi;
    for (const [b, d] of btns) b.disabled = last + d < FROM || last + d > TO;
    drawArcs();
  }

  function drawArcs() {
    arcsG.replaceChildren();
    const n = path.length;
    for (let i = 1; i < n; i++) {
      const a = kb.key(path[i - 1].midi), b = kb.key(path[i].midi);
      if (!a || !b) continue;
      const d = path[i].midi - path[i - 1].midi;
      const lo = a.cx < b.cx ? a : b, hi = a.cx < b.cx ? b : a;
      const y = a.top - 4;
      const lift = Math.max(14, Math.abs(b.cx - a.cx) * 0.45);
      const recent = i === n - 1;
      const mid = (lo.cx + hi.cx) / 2;
      s('path', { d: `M ${a.cx} ${y} Q ${mid} ${y - lift * 1.6} ${b.cx} ${y}`, class: recent ? 'line-acc' : 'line-muted' }, arcsG);
      // arrow head at the end
      const dir = Math.sign(b.cx - a.cx);
      s('path', { d: `M ${b.cx} ${y} l ${-dir * 7} -5 M ${b.cx} ${y} l ${-dir * 2} -8`, class: recent ? 'line-acc' : 'line-muted' }, arcsG);
      if (recent) {
        const t = s('text', { x: mid, y: y - lift * 0.8 - 6, 'text-anchor': 'middle', class: 'lbl-acc' }, arcsG);
        t.textContent = Math.abs(d) === 1 ? 'half' : 'whole';
      }
    }
  }

  const draw = () => {
    kb.layout(2, 52, view.W - 4, view.H - 56);
    paint();
  };
  view.onResize(draw);
  noteEl.textContent = 'You are on E. Try a half step up, then a whole step up from E.';
  draw();
};

export default mount;
