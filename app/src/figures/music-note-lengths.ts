// Note lengths (music chapter 5): tap a note or rest symbol to hear it against
// four steady clicks. The bar underneath shows how much of the four beats each
// note (or silence) fills, lighting up as it plays.

import { responsiveSvg, h, s, label, type Mount } from './lib';
import { play, unlock, type Ev, type Handle } from '../audio';
import { note, rest, type NoteKind, type RestKind } from './music-notation';

interface Sym { name: string; beats: number; isRest: boolean; kind: NoteKind | RestKind; say: string }

const SYMS: Sym[] = [
  { name: 'whole', beats: 4, isRest: false, kind: 'whole', say: 'Whole note: 4 beats. One of them fills the whole bar.' },
  { name: 'half', beats: 2, isRest: false, kind: 'half', say: 'Half note: 2 beats. Two of them fill the bar.' },
  { name: 'quarter', beats: 1, isRest: false, kind: 'quarter', say: 'Quarter note: 1 beat. One on every click.' },
  { name: 'eighth', beats: 0.5, isRest: false, kind: 'eighth', say: 'Eighth note: half a beat. Two on every click.' },
  { name: 'sixteenth', beats: 0.25, isRest: false, kind: 'sixteenth', say: 'Sixteenth note: a quarter of a beat. Four on every click.' },
  { name: 'whole rest', beats: 4, isRest: true, kind: 'whole', say: 'Whole rest: a whole bar of silence. Keep counting.' },
  { name: 'half rest', beats: 2, isRest: true, kind: 'half', say: 'Half rest: 2 beats of silence (here after a half note).' },
  { name: 'quarter rest', beats: 1, isRest: true, kind: 'quarter', say: 'Quarter rest: 1 beat of silence (here: note, rest, note, rest).' },
  { name: 'eighth rest', beats: 0.5, isRest: true, kind: 'eighth', say: 'Eighth rest: half a beat of silence (note, rest, note, rest ...).' },
];

/** The bar pattern for a symbol: [start, length, silent]. */
function pattern(sym: Sym): [number, number, boolean][] {
  const out: [number, number, boolean][] = [];
  const n = Math.round(4 / sym.beats);
  for (let i = 0; i < n; i++) {
    const silent = sym.isRest && (sym.beats === 4 || i % 2 === 1);
    out.push([i * sym.beats, sym.beats, silent]);
  }
  return out;
}

const mount: Mount = (root) => {
  let sel = 2;
  let lit = -1;
  let litBeat = -1;
  let handle: Handle | null = null;
  let focusIdx = 2;
  const cells: SVGGElement[] = [];

  const view = responsiveSvg(root, { label: 'Note and rest symbols with a four-beat bar', aspect: 0.7, minH: 330, maxH: 340 });
  const say = h('p', { class: 'fig-note', 'aria-live': 'polite', style: 'margin:0.3rem 8px' }, root);

  let barG: SVGGElement | null = null;
  let barGeom = { x0: 20, x1: 300, by: 222 };
  const cellParts: { bg: SVGRectElement; sym: SVGGElement; lbl: SVGTextElement; cx: number; y: number; sp: number }[] = [];

  function drawSym(i: number) {
    const p = cellParts[i];
    const sym = SYMS[i];
    const on = i === sel;
    while (p.sym.firstChild) p.sym.firstChild.remove();
    if (sym.isRest) rest(p.sym, sym.kind as RestKind, p.cx, sym.kind === 'whole' ? p.y - 10 + p.sp : p.y - 10, p.sp, on ? 'acc' : '');
    else note(p.sym, { x: p.cx - p.sp * 0.4, y: p.y - 2, sp: p.sp, kind: sym.kind as NoteKind, tone: on ? 'acc' : '' });
    p.bg.setAttribute('class', on ? 'band-pos' : 'band-muted');
    p.bg.setAttribute('style', on ? '' : 'opacity:0.06');
    p.lbl.setAttribute('class', on ? 'lbl-acc' : 'lbl');
    cells[i].setAttribute('aria-pressed', String(on));
    cells[i].setAttribute('tabindex', i === focusIdx ? '0' : '-1');
  }

  function draw() {
    if (view.W < 160) return; // not laid out yet; the resize observer redraws
    const svg = view.el;
    while (svg.firstChild) svg.firstChild.remove();
    cells.length = 0;
    cellParts.length = 0;
    const W = view.W;
    const sp = W < 480 ? 8 : 9.5;
    const cw = Math.min(96, (W - 16) / 5);
    const rowY = [82, 204];
    label(svg, W / 2, 16, 'Notes', 'lbl');
    label(svg, W / 2, 138, 'Rests', 'lbl');
    SYMS.forEach((sym, i) => {
      const col = sym.isRest ? i - 5 : i;
      const ncol = sym.isRest ? 4 : 5;
      const cx = W / 2 + (col - (ncol - 1) / 2) * cw;
      const y = rowY[sym.isRest ? 1 : 0];
      const g = s('g', { class: 'key-g', role: 'button', 'aria-label': `${sym.name}${sym.isRest ? '' : ' note'}, ${sym.beats === 0.5 ? 'half a beat' : sym.beats === 0.25 ? 'a quarter of a beat' : `${sym.beats} beat${sym.beats > 1 ? 's' : ''}`}` }, svg);
      const bg = s('rect', { x: cx - cw / 2 + 3, y: y - 52, width: cw - 6, height: 86, rx: 8 }, g);
      const symG = s('g', {}, g);
      const lbl = label(g, cx, y + 26, sym.name.replace(' rest', ''), 'lbl');
      g.addEventListener('click', () => choose(i));
      g.addEventListener('keydown', (e) => {
        const k = (e as KeyboardEvent).key;
        if (k === 'Enter' || k === ' ') { e.preventDefault(); choose(i); }
        else if (k === 'ArrowRight' || k === 'ArrowLeft') {
          e.preventDefault();
          focusIdx = (i + (k === 'ArrowRight' ? 1 : SYMS.length - 1)) % SYMS.length;
          cells.forEach((c, j) => c.setAttribute('tabindex', j === focusIdx ? '0' : '-1'));
          cells[focusIdx].focus();
        }
      });
      cells.push(g);
      cellParts.push({ bg, sym: symG, lbl, cx, y, sp });
    });
    barGeom = { x0: 20, x1: W - 20, by: 262 };
    barG = s('g', {}, svg);
    paint();
  }

  function paint() {
    SYMS.forEach((_, i) => drawSym(i));
    if (!barG) return;
    while (barG.firstChild) barG.firstChild.remove();
    const { x0, x1, by } = barGeom;
    const bw = (x1 - x0) / 4;
    pattern(SYMS[sel]).forEach(([st, len, silent], k) => {
      const x = x0 + (st / 4) * (x1 - x0) + 1.5, w = (len / 4) * (x1 - x0) - 3;
      s('rect', { x, y: by, width: Math.max(2, w), height: 24, rx: 4, class: silent ? (k === lit ? 'band' : 'line-muted') : k === lit ? 'area-tp' : 'bar', style: silent ? 'stroke-width:1px' : '' }, barG!);
    });
    for (let b = 0; b <= 4; b++) s('line', { x1: x0 + b * bw, x2: x0 + b * bw, y1: by - 5, y2: by + 29, class: 'ax' }, barG);
    for (let b = 0; b < 4; b++) {
      const cx = x0 + (b + 0.5) * bw;
      if (b === litBeat) s('circle', { cx, cy: by + 46, r: 12, class: 'band-pos' }, barG);
      label(barG, cx, by + 51, String(b + 1), b === litBeat ? 'lbl-acc' : 'lbl-fg');
    }
    say.textContent = SYMS[sel].say;
  }

  function choose(i: number) {
    sel = focusIdx = i;
    unlock();
    handle?.stop();
    const events: Ev[] = [];
    const meta: { box?: number; beat?: number }[] = [];
    for (let b = 0; b < 4; b++) {
      events.push({ kind: 'click', beat: b, beats: 1, accent: b === 0 });
      meta.push({ beat: b });
    }
    pattern(SYMS[i]).forEach(([st, len, silent], k) => {
      events.push(silent ? { kind: 'rest', beat: st, beats: len } : { kind: 'notes', midi: [67], beat: st, beats: len });
      meta.push({ box: k });
    });
    const hd = play({ bpm: 72, events, totalBeats: 4 }, {
      onEvent: (_e, j) => {
        const m = meta[j];
        if (m.box !== undefined) lit = m.box;
        if (m.beat !== undefined) litBeat = m.beat;
        paint();
      },
      onEnd: () => {
        if (handle === hd) handle = null;
        lit = litBeat = -1;
        paint();
      },
    });
    handle = hd;
    paint();
  }

  view.onResize(draw);
  draw();
  return () => handle?.stop();
};

export default mount;
