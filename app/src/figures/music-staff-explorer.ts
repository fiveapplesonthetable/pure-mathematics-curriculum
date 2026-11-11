// Staff explorer (music chapter 6): a grand staff above a keyboard. Tap a key
// and its note appears on the staff, right above the key; tap a line or space
// and the key lights. Landmark notes are marked. "Show me a note" puts a note
// on the staff without its name, for calm practice.

import { responsiveSvg, row, button, h, s, clamp, type Mount } from './lib';
import { keyboard, isBlack, midiName, tap, unlock, type Keyboard, type Mark } from './music-lib';
import { staffLines, clef, note, ledgers, accidental, diatonic, whiteMidi, dName, TREBLE_BOTTOM, BASS_BOTTOM } from './music-notation';

const LANDMARKS: [number, string][] = [
  [14, 'two ledger lines below the bass staff'],
  [18, 'the bottom line of the bass staff'],
  [21, 'the second space of the bass staff'],
  [24, 'the line between the dots of the bass clef'],
  [28, 'middle C, on its own short line'],
  [32, 'the line the treble clef curls around'],
  [35, 'the third space of the treble staff'],
  [38, 'the top line of the treble staff'],
  [42, 'two ledger lines above the treble staff'],
];
const KEY_LANDMARKS = [14, 21, 24, 28, 32, 35, 42];
const STEP_WORDS = ['', 'one step', 'two steps', 'three steps'];

const mount: Mount = (root) => {
  const view = responsiveSvg(root, { label: 'Grand staff above a piano keyboard', aspect: 0.5, minH: 240, maxH: 420 });
  const info = h('p', { class: 'fig-note', 'aria-live': 'polite', style: 'margin:0.3rem 8px;min-height:2.8em' }, root);
  const ctl = row(root);
  const quizBtn = button(ctl, 'Show me a note', () => quiz());

  let cur = 67; // G4
  let hidden = false;
  let from = 48, to = 72;
  let kb: Keyboard | null = null;
  let noteG: SVGGElement | null = null;
  let hit: SVGRectElement | null = null;
  let geom = { yG2: 0, sp: 10 };

  const yOf = (d: number) => geom.yG2 - (d - BASS_BOTTOM) * (geom.sp / 2);
  const dMin = () => diatonic(from);
  const dMax = () => diatonic(to);

  function describe(m: number): string {
    const d = diatonic(m);
    if (isBlack(m)) {
      return `${midiName(m)} / ${midiName(m, true)}: a black key. It is written on the ${dName(d)} position with a sharp sign, or on the ${dName(d + 1)} position with a flat sign.`;
    }
    const lm = LANDMARKS.find(([ld]) => ld === d);
    if (lm) return `${dName(d)}: a landmark, ${lm[1]}.`;
    let best = LANDMARKS[0];
    for (const l of LANDMARKS) if (Math.abs(l[0] - d) < Math.abs(best[0] - d) || (Math.abs(l[0] - d) === Math.abs(best[0] - d) && KEY_LANDMARKS.includes(l[0]))) best = l;
    const diff = d - best[0];
    return `${dName(d)}: ${STEP_WORDS[Math.abs(diff)] ?? `${Math.abs(diff)} steps`} ${diff > 0 ? 'above' : 'below'} the landmark ${dName(best[0])}.`;
  }

  function build() {
    if (view.W < 160) return; // not laid out yet; the resize observer redraws
    const svg = view.el;
    while (svg.firstChild) svg.firstChild.remove();
    const W = view.W;
    const wide = W >= 560;
    from = wide ? 36 : 48;
    to = wide ? 84 : 72;
    cur = clamp(cur, from, to);
    const kbH = clamp(W * 0.15, 86, 120);
    const L = 46;
    const lo = Math.min(dMin(), BASS_BOTTOM) - 2, hi = Math.max(dMax(), TREBLE_BOTTOM + 8) + 2;
    const sp = wide ? 13 : 11;
    const staffTop = 14;
    const staffBot = staffTop + ((hi - lo) / 2) * sp;
    const H = Math.round(staffBot + 16 + kbH);
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('height', String(H));
    geom = { sp, yG2: staffBot - (BASS_BOTTOM - lo) * (sp / 2) };

    // staves
    staffLines(svg, 8, W - 6, yOf(TREBLE_BOTTOM), sp);
    staffLines(svg, 8, W - 6, yOf(BASS_BOTTOM), sp);
    s('line', { x1: 8, x2: 8, y1: yOf(TREBLE_BOTTOM + 8), y2: yOf(BASS_BOTTOM), class: 'line', style: 'stroke-width:2px' }, svg);
    clef(svg, 'treble', 26, yOf(TREBLE_BOTTOM), sp);
    clef(svg, 'bass', 27, yOf(BASS_BOTTOM), sp);

    kb = keyboard(svg, { from, to, onPress: (m) => select(m, false) });
    kb.layout(L, H - kbH, W - L - 6, kbH);

    // landmark ghosts
    const ghosts = s('g', {}, svg);
    for (const d of KEY_LANDMARKS) {
      if (d < dMin() || d > dMax()) continue;
      const k = kb.key(whiteMidi(d))!;
      ledgers(ghosts, k.cx, d, d >= 28 ? TREBLE_BOTTOM : BASS_BOTTOM, sp, yOf, 'dim');
      note(ghosts, { x: k.cx, y: yOf(d), sp, kind: 'whole', tone: 'dim' });
    }
    noteG = s('g', {}, svg);

    // tap layer over the staff (also keyboard-operable with the arrow keys)
    hit = s('rect', {
      x: L, y: yOf(dMax()) - sp, width: W - L - 6, height: yOf(dMin()) - yOf(dMax()) + 2 * sp, fill: 'transparent',
      tabindex: 0, role: 'slider', 'aria-label': 'Staff position (arrow keys move up and down a step)', style: 'cursor:pointer;outline:none',
    }, svg);
    hit.addEventListener('pointerdown', (e) => {
      const r = svg.getBoundingClientRect();
      const y = ((e.clientY - r.top) / r.height) * H;
      const d = clamp(Math.round((geom.yG2 - y) / (sp / 2)) + BASS_BOTTOM, dMin(), dMax());
      select(whiteMidi(d), true);
    });
    hit.addEventListener('keydown', (e) => {
      const k = e.key;
      if (k === 'ArrowUp' || k === 'ArrowDown') {
        e.preventDefault();
        const d = clamp(diatonic(cur) + (k === 'ArrowUp' ? 1 : -1), dMin(), dMax());
        select(whiteMidi(d), true);
      } else if (k === 'Enter' || k === ' ') {
        e.preventDefault();
        select(cur, true);
      }
    });
    paint();
  }

  function paint() {
    if (!kb || !noteG) return;
    const marks = new Map<number, Mark>();
    for (const d of KEY_LANDMARKS) {
      const m = whiteMidi(d);
      if (m >= from && m <= to) marks.set(m, { kind: 'soft', label: dName(d) });
    }
    if (!hidden) marks.set(cur, { kind: 'on', label: isBlack(cur) ? undefined : midiName(cur) });
    kb.mark(marks);

    while (noteG.firstChild) noteG.firstChild.remove();
    const sp = geom.sp;
    const d = diatonic(cur);
    const k = kb.key(isBlack(cur) ? cur - 1 : cur)!;
    const x = isBlack(cur) ? kb.key(cur)!.cx + sp * 0.5 : k.cx;
    const y = yOf(d);
    const bottom = d >= 28 ? TREBLE_BOTTOM : BASS_BOTTOM;
    ledgers(noteG, x, d, bottom, sp, yOf, 'acc');
    note(noteG, { x, y, sp, kind: 'whole', tone: 'acc' });
    if (isBlack(cur)) accidental(noteG, '♯', x - sp * 1.9, y, sp, 'acc');
    hit?.setAttribute('aria-valuetext', hidden ? 'A note to name' : midiName(cur));
    info.textContent = hidden ? 'Which note is this? Find the nearest landmark and count the steps, then tap Show the name.' : describe(cur);
  }

  function select(m: number, sound: boolean) {
    unlock();
    hidden = false;
    quizBtn.textContent = 'Show me a note';
    cur = m;
    if (sound) {
      tap(m);
      kb?.flash(m);
    }
    paint();
  }

  function quiz() {
    unlock();
    if (hidden) {
      select(cur, true);
      return;
    }
    let m = cur;
    while (m === cur || isBlack(m)) m = from + Math.floor(Math.random() * (to - from + 1));
    cur = m;
    hidden = true;
    quizBtn.textContent = 'Show the name';
    paint();
  }

  view.onResize(build);
  build();
};

export default mount;
