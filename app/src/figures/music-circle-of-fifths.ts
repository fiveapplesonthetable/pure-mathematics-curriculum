// Circle of fifths (music chapter 2): the twelve major keys around a circle,
// relative minors inside. Tap a key to see its scale on a keyboard, its sharps
// or flats, and its relative minor; its two neighbors are highlighted.

import { responsiveSvg, row, button, h, s, type Mount } from './lib';
import { keyboard, spell, namePc, playMidi, unlock, tap, CIRCLE_MAJOR, CIRCLE_MINOR, MAJOR_SCALE, MINOR_SCALE, type Mark } from './music-lib';

const SHARPS = ['F♯', 'C♯', 'G♯', 'D♯', 'A♯', 'E♯'];
const FLATS = ['B♭', 'E♭', 'A♭', 'D♭', 'G♭', 'C♭'];
const STEPS8 = [0, 1, 2, 3, 4, 5, 6, 7];

function signature(i: number): string {
  if (i === 0) return 'No sharps or flats';
  if (i <= 6) return `${i} sharp${i > 1 ? 's' : ''}: ${SHARPS.slice(0, i).join(', ')}`;
  const n = 12 - i;
  return `${n} flat${n > 1 ? 's' : ''}: ${FLATS.slice(0, n).join(', ')}`;
}

const mount: Mount = (root) => {
  const view = responsiveSvg(root, { label: 'The circle of fifths: twelve major keys around a circle, with their relative minors inside.', aspect: 0.8, minH: 300, maxH: 380 });
  const ringG = s('g', {}, view.el);
  const keysG = s('g', { role: 'group', 'aria-label': 'Major keys' }, view.el);

  const info = h('div', { class: 'fig-row', 'aria-live': 'polite' }, root);
  const titleEl = h('strong', { style: 'font-size:1.15rem' }, info);
  const sigEl = h('span', {}, info);
  const minorEl = h('div', { class: 'fig-row fig-note', style: 'margin-top:0' }, root);

  const kview = responsiveSvg(root, { label: 'A keyboard showing the notes of the chosen major scale.', aspect: 0.22, minH: 130, maxH: 190 });
  const kb = keyboard(kview.el, { from: 60, to: 84, names: 'none' });

  const r = row(root);
  button(r, 'Play the scale', () => { unlock(); playScale(false); });
  button(r, 'Play its relative minor', () => { unlock(); playScale(true); });

  let sel = 0;
  const items: { g: SVGGElement; base: SVGCircleElement; disc: SVGCircleElement; maj: SVGTextElement; min: SVGTextElement }[] = [];
  for (let i = 0; i < 12; i++) {
    const label = i === 6 ? 'F♯ / G♭' : CIRCLE_MAJOR[i];
    const g = s('g', { class: 'key-g', role: 'button', tabindex: i === 0 ? 0 : -1, 'aria-label': `${label} major` }, keysG);
    const base = s('circle', { r: 21, class: 'dot-ring', style: 'stroke-width:0' }, g);
    const disc = s('circle', { r: 21, class: 'dot-ring' }, g);
    const maj = s('text', { 'text-anchor': 'middle', class: 'lbl-fg' }, g);
    maj.textContent = label;
    const min = s('text', { 'text-anchor': 'middle', class: 'lbl' }, ringG);
    min.textContent = `${CIRCLE_MINOR[i]}m`;
    g.addEventListener('pointerdown', (e) => { e.preventDefault(); choose(i, true); });
    g.addEventListener('keydown', (e) => {
      const k = (e as KeyboardEvent).key;
      if (k === 'Enter' || k === ' ') { e.preventDefault(); choose(i, true); }
      else if (k === 'ArrowRight' || k === 'ArrowDown' || k === 'ArrowLeft' || k === 'ArrowUp') {
        e.preventDefault();
        const n = (i + (k === 'ArrowRight' || k === 'ArrowDown' ? 1 : 11)) % 12;
        focusItem(n);
        choose(n, true);
      }
    });
    items.push({ g, base, disc, maj, min });
  }

  function focusItem(n: number) {
    items.forEach((it, j) => it.g.setAttribute('tabindex', j === n ? '0' : '-1'));
    (items[n].g as unknown as HTMLElement).focus();
  }

  function scaleOf(i: number, minor: boolean) {
    const tonic = minor ? CIRCLE_MINOR[i] : CIRCLE_MAJOR[i];
    const pc = namePc(tonic);
    const semis = [...(minor ? MINOR_SCALE : MAJOR_SCALE), 12];
    return { tonic, names: spell(tonic, semis, STEPS8), midi: semis.map((d) => 60 + pc + d) };
  }

  function playScale(minor: boolean) {
    const sc = scaleOf(sel, minor);
    playMidi(sc.midi, 'melody', { beats: 0.55, onEvent: (ev) => { if (ev.kind === 'notes') kb.flash(ev.midi, 300); } });
  }

  function choose(i: number, sound: boolean) {
    sel = i;
    items.forEach((it, j) => it.g.setAttribute('tabindex', j === i ? '0' : '-1'));
    if (sound) { unlock(); tap(60 + namePc(CIRCLE_MAJOR[i])); }
    paint();
  }

  function paint() {
    const W = view.W, H = view.H;
    const cx = W / 2, cy = H / 2;
    const R = Math.min(W, H) / 2 - 28;
    const Rm = R * 0.6;
    ringG.querySelectorAll('circle.ax').forEach((c) => c.remove());
    const ring = s('circle', { cx, cy, r: R, class: 'ax' });
    ringG.insertBefore(ring, ringG.firstChild);
    const fs = Math.max(13, Math.min(16, R / 9));
    items.forEach((it, j) => {
      const ang = (-90 + j * 30) * (Math.PI / 180);
      const x = cx + R * Math.cos(ang), y = cy + R * Math.sin(ang);
      it.g.setAttribute('transform', `translate(${x},${y})`);
      const near = (j - sel + 12) % 12 === 1 || (sel - j + 12) % 12 === 1;
      it.disc.setAttribute('r', String(j === 6 ? 25 : 21));
      it.base.setAttribute('r', String(j === 6 ? 25 : 21));
      it.disc.setAttribute('class', j === sel ? 'dot-ring' : near ? 'band-pos' : 'band-muted');
      it.maj.setAttribute('y', String(fs * 0.35));
      it.maj.setAttribute('class', j === sel ? 'lbl-acc' : 'lbl-fg');
      it.maj.style.fontSize = `${j === 6 ? fs * 0.8 : fs}px`;
      it.min.setAttribute('x', String(cx + Rm * Math.cos(ang)));
      it.min.setAttribute('y', String(cy + Rm * Math.sin(ang) + 5));
      it.min.setAttribute('class', j === sel ? 'lbl-acc' : 'lbl');
    });

    const sc = scaleOf(sel, false);
    const mi = CIRCLE_MINOR[sel];
    titleEl.textContent = sel === 6 ? 'F♯ major (same keys as G♭ major)' : `${CIRCLE_MAJOR[sel]} major`;
    sigEl.textContent = sel === 6 ? '6 sharps, or 6 flats as G♭ major' : signature(sel);
    const left = CIRCLE_MAJOR[(sel + 11) % 12], right = CIRCLE_MAJOR[(sel + 1) % 12];
    minorEl.textContent = `Relative minor: ${mi} minor. Neighbors: ${left} and ${right}, one note different each.`;
    const marks = new Map<number, Mark>();
    sc.midi.forEach((m, k) => marks.set(m, { kind: k === 0 || k === 7 ? 'on' : 'soft', label: sc.names[k] }));
    kb.mark(marks);
  }

  const draw = () => paint();
  const kdraw = () => { kb.layout(2, 4, kview.W - 4, kview.H - 8); paint(); };
  view.onResize(draw);
  kview.onResize(kdraw);
  kdraw();
};

export default mount;
