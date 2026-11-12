// Rhythm player (music chapter 5). One bar on a count line ("1 & 2 & ..."):
// each note is a box on the grid and a note symbol above it. Play sounds a
// click on every beat and a pitched note for every note; the current count
// lights up as it plays.

import { responsiveSvg, row, button, slider, h, s, label, type Mount } from './lib';
import { play, unlock, type Ev, type Handle } from '../audio';
import { note, rest, beam, type NoteKind, type Tone } from './music-notation';

interface Item { at: number; len: number; rest?: boolean }
interface Preset { name: string; meter: '4/4' | '3/4' | '6/8'; items: Item[]; say: string }

const q = (at: number, len = 2, r = false): Item => ({ at, len, rest: r });

export const PRESETS: Preset[] = [
  { name: 'Quarter notes', meter: '4/4', items: [q(0), q(2), q(4), q(6)], say: 'One note on every beat.' },
  { name: 'Half notes', meter: '4/4', items: [q(0, 4), q(4, 4)], say: 'Each note lasts two beats.' },
  { name: 'Eighth notes', meter: '4/4', items: [0, 1, 2, 3, 4, 5, 6, 7].map((i) => q(i, 1)), say: 'Two notes in every beat: on the number and on the “and”.' },
  { name: 'Dotted quarter and eighth', meter: '4/4', items: [q(0, 3), q(3, 1), q(4), q(6)], say: 'Hold through “1 & 2”, then play on the “and” of 2.' },
  { name: 'Quarter rests', meter: '4/4', items: [q(0), q(2, 2, true), q(4), q(6, 2, true)], say: 'Silent on beats 2 and 4, but the beat goes on.' },
  { name: 'Syncopation', meter: '4/4', items: [q(0, 1), q(1, 2), q(3, 1), q(4), q(6)], say: 'Notes on 1, the “and” of 1 and the “and” of 2: beat 2 is skipped.' },
  { name: '3/4: half and quarter', meter: '3/4', items: [q(0, 4), q(4)], say: 'Three beats in a bar, the first one strongest.' },
  { name: '3/4: six eighths', meter: '3/4', items: [0, 1, 2, 3, 4, 5].map((i) => q(i, 1)), say: 'Six eighths in three pairs; your foot taps on 1, 2 and 3.' },
  { name: '6/8: six eighths', meter: '6/8', items: [0, 1, 2, 3, 4, 5].map((i) => q(i, 1)), say: 'Six eighths in two groups of three; your foot taps on 1 and 4.' },
];

const METER = {
  '4/4': { slots: 8, count: ['1', '&', '2', '&', '3', '&', '4', '&'], beats: [0, 2, 4, 6], group: 2, perBeat: 2, sig: [4, 4] },
  '3/4': { slots: 6, count: ['1', '&', '2', '&', '3', '&'], beats: [0, 2, 4], group: 2, perBeat: 2, sig: [3, 4] },
  '6/8': { slots: 6, count: ['1', '2', '3', '4', '5', '6'], beats: [0, 3], group: 3, perBeat: 3, sig: [6, 8] },
} as const;

/** Note symbol for a length in eighth-note slots. */
function kindOf(len: number): { kind: NoteKind; dotted: boolean } {
  switch (len) {
    case 1: return { kind: 'eighth', dotted: false };
    case 2: return { kind: 'quarter', dotted: false };
    case 3: return { kind: 'quarter', dotted: true };
    case 4: return { kind: 'half', dotted: false };
    case 6: return { kind: 'half', dotted: true };
    default: return { kind: 'whole', dotted: false };
  }
}
const restOf = (len: number) => (len >= 8 ? 'whole' : len >= 4 ? 'half' : len >= 2 ? 'quarter' : 'eighth') as 'whole' | 'half' | 'quarter' | 'eighth';

const PITCH = 67; // G4

const mount: Mount = (root) => {
  let preset = PRESETS[0];
  let bpm = 80;
  let loop = true;
  let handle: Handle | null = null;
  let litSlot = -1;
  let litItem = -1;

  const top = row(root);
  const lab = h('label', { class: 'slider' }, top);
  h('span', { class: 'slider-name' }, lab, 'Rhythm');
  const sel = h('select', {
    'aria-label': 'Rhythm',
    style: 'font:inherit;font-size:0.95rem;min-height:40px;padding:0 8px;border-radius:6px;border:1px solid color-mix(in srgb, var(--muted) 70%, transparent);background:var(--bg);color:var(--fg);min-width:0;flex:1',
  }, lab);
  PRESETS.forEach((p, i) => h('option', { value: String(i) }, sel, p.name));

  const view = responsiveSvg(root, { label: 'One bar of rhythm: note symbols above boxes on a count line', aspect: 0.3, minH: 176, maxH: 196 });
  const say = h('p', { class: 'fig-note', 'aria-live': 'polite', style: 'margin:0.3rem 8px' }, root);

  const ctl = row(root);
  const playBtn = button(ctl, 'Play', () => (handle ? stop() : start()));
  const loopBtn = button(ctl, 'Loop', () => {
    loop = !loop;
    loopBtn.setAttribute('aria-pressed', String(loop));
  });
  loopBtn.setAttribute('aria-pressed', 'true');
  slider(ctl, {
    label: 'Tempo', min: 40, max: 160, step: 4, value: bpm, format: (v) => `${v} beats per minute`,
    onInput: (v) => {
      bpm = v;
      if (handle) start();
    },
  });

  function draw() {
    if (view.W < 160) return; // not laid out yet; the resize observer redraws
    const svg = view.el;
    while (svg.firstChild) svg.firstChild.remove();
    const W = view.W, H = view.H;
    const m = METER[preset.meter];
    const sp = W < 480 ? 8.5 : 10;
    const lineY = Math.round(H * 0.4);
    const x0 = 46, x1 = W - 10;
    const sw = (x1 - x0) / m.slots;
    const boxY = lineY + 24, boxH = 26;
    const countY = boxY + boxH + 30;

    // time signature and the one-line "staff"
    for (const [n, y] of [[m.sig[0], lineY - 3], [m.sig[1], lineY + 21]] as const) {
      const ts = label(svg, 22, y, String(n), 'lbl-fg');
      ts.setAttribute('style', 'font-size:20px;font-weight:700');
    }
    s('line', { x1: x0 - 6, x2: x1, y1: lineY, y2: lineY, class: 'line', style: 'stroke-width:1px' }, svg);
    s('line', { x1: x1, x2: x1, y1: lineY - 2 * sp, y2: lineY + 2 * sp, class: 'line', style: 'stroke-width:1.5px' }, svg);

    // count line
    for (let i = 0; i < m.slots; i++) {
      const cx = x0 + (i + 0.5) * sw;
      const onBeat = (m.beats as readonly number[]).includes(i);
      if (i === litSlot) s('rect', { x: x0 + i * sw + 1, y: countY - 19, width: sw - 2, height: 26, rx: 5, class: 'band-pos' }, svg);
      const t = label(svg, cx, countY, m.count[i], i === litSlot ? 'lbl-acc' : onBeat ? 'lbl-fg' : 'lbl');
      if (onBeat) t.setAttribute('style', 'font-weight:600');
    }
    // grid ticks
    for (let i = 0; i <= m.slots; i++) {
      const x = x0 + i * sw;
      s('line', { x1: x, x2: x, y1: boxY - 4, y2: boxY + boxH + 4, class: (m.beats as readonly number[]).includes(i % m.slots) || i === m.slots ? 'ax' : 'grid' }, svg);
    }
    // boxes and symbols
    const tips: { slot: number; tip: { x: number; y: number }; tone: Tone }[] = [];
    preset.items.forEach((it, k) => {
      const bx = x0 + it.at * sw + 3, bw = it.len * sw - 6;
      const lit = k === litItem;
      const tone: Tone = lit ? 'acc' : '';
      if (it.rest) {
        s('rect', { x: bx, y: boxY, width: bw, height: boxH, rx: 5, class: 'line-muted', style: 'stroke-width:1px' }, svg);
        const kind = restOf(it.len);
        rest(svg, kind, x0 + (it.at + 0.5) * sw, kind === 'whole' ? lineY + sp : lineY, sp, tone);
      } else {
        s('rect', { x: bx, y: boxY, width: bw, height: boxH, rx: 5, class: lit ? 'area-tp' : 'bar' }, svg);
        const { kind, dotted } = kindOf(it.len);
        const beamed = it.len === 1 && preset.items.some((o, j) => j !== k && !o.rest && o.len === 1 && Math.floor(o.at / m.group) === Math.floor(it.at / m.group));
        const r = note(svg, { x: x0 + (it.at + 0.5) * sw - sp * 0.3, y: lineY, sp, kind: beamed ? 'quarter' : kind, dotted, onLine: true, tone });
        if (beamed) tips.push({ slot: it.at, tip: r.tip, tone });
      }
    });
    // beams over eighth-note groups
    const groups = new Map<number, typeof tips>();
    for (const t of tips) {
      const gk = Math.floor(t.slot / m.group);
      if (!groups.has(gk)) groups.set(gk, []);
      groups.get(gk)!.push(t);
    }
    for (const g of groups.values()) beam(svg, g.map((t) => t.tip), sp);
    say.textContent = preset.say;
  }

  function stop() {
    handle?.stop();
  }

  function start() {
    unlock();
    const m = METER[preset.meter];
    const reps = loop ? 16 : 1;
    const events: Ev[] = [];
    const meta: { slot?: number; item?: number }[] = [];
    for (let r = 0; r < reps; r++) {
      const off = r * m.slots;
      for (let i = 0; i < m.slots; i++) {
        events.push({ kind: 'rest', beat: off + i, beats: 1 });
        meta.push({ slot: i });
      }
      for (const b of m.beats) {
        events.push({ kind: 'click', beat: off + b, beats: 1, accent: b === 0 });
        meta.push({});
      }
      preset.items.forEach((it, k) => {
        if (it.rest) return;
        events.push({ kind: 'notes', midi: [PITCH], beat: off + it.at, beats: it.len });
        meta.push({ item: k });
      });
    }
    const totalBeats = reps * m.slots;
    const eighthBpm = bpm * m.perBeat;
    const t0 = performance.now();
    const expectMs = (totalBeats * 60000) / eighthBpm;
    const thisPreset = preset;
    const hd = play({ bpm: eighthBpm, events, totalBeats }, {
      bpm: eighthBpm,
      onEvent: (_ev, i) => {
        const mt = meta[i];
        if (mt.slot !== undefined) {
          litSlot = mt.slot;
          // the item covering this slot (if it is a rest, nothing is lit)
          litItem = thisPreset.items.findIndex((it) => !it.rest && mt.slot! >= it.at && mt.slot! < it.at + it.len);
          draw();
        }
      },
      onEnd: () => {
        if (handle !== hd) return;
        handle = null;
        litSlot = litItem = -1;
        playBtn.textContent = 'Play';
        playBtn.setAttribute('aria-pressed', 'false');
        draw();
        const natural = performance.now() - t0 > expectMs - 150;
        if (natural && loop && preset === thisPreset) start();
      },
    });
    handle = hd;
    playBtn.textContent = 'Stop';
    playBtn.setAttribute('aria-pressed', 'true');
  }

  sel.addEventListener('change', () => {
    const wasPlaying = !!handle;
    stop();
    preset = PRESETS[Number(sel.value)];
    draw();
    if (wasPlaying) start();
  });

  view.onResize(draw);
  draw();
  return () => stop();
};

export default mount;
