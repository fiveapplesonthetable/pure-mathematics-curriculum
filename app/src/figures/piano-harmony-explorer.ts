// Interactive Two-Octave Piano Explorer: chords (4+3 vs 3+4), inversions, and scales.
// Uses only theme CSS variables (--bg, --fg, --muted, --acc, --rule) so light and dark
// modes render natively at both 360px phone and desktop widths.

import {
  responsiveSvg,
  s,
  attr,
  row,
  slider,
  button,
  formula,
  type Mount,
} from './lib';

type ModeId = 'maj' | 'min' | 'sus4' | 'maj7' | 'dom7' | 'scale-maj' | 'scale-min';

interface HarmonyMode {
  id: ModeId;
  label: string;
  offsets: number[];
  isChord: boolean;
  recipeTex: string;
}

const MODES: HarmonyMode[] = [
  { id: 'maj', label: 'Major (4+3)', offsets: [0, 4, 7], isChord: true, recipeTex: '\\text{Major } (4{+}3)' },
  { id: 'min', label: 'Minor (3+4)', offsets: [0, 3, 7], isChord: true, recipeTex: '\\text{Minor } (3{+}4)' },
  { id: 'sus4', label: 'Sus4 (5+2)', offsets: [0, 5, 7], isChord: true, recipeTex: '\\text{Sus4 } (5{+}2)' },
  { id: 'maj7', label: 'Maj7 (4+3+4)', offsets: [0, 4, 7, 11], isChord: true, recipeTex: '\\text{Maj7 } (4{+}3{+}4)' },
  { id: 'dom7', label: 'Dom7 (4+3+3)', offsets: [0, 4, 7, 10], isChord: true, recipeTex: '\\text{Dom7 } (4{+}3{+}3)' },
  { id: 'scale-maj', label: 'Major scale', offsets: [0, 2, 4, 5, 7, 9, 11, 12], isChord: false, recipeTex: '\\text{Major scale}' },
  { id: 'scale-min', label: 'Natural minor', offsets: [0, 2, 3, 5, 7, 8, 10, 12], isChord: false, recipeTex: '\\text{Minor scale}' },
];

const NOTE_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const NOTE_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const NOTE_TEX_SHARP = ['C', 'C\\sharp', 'D', 'D\\sharp', 'E', 'F', 'F\\sharp', 'G', 'G\\sharp', 'A', 'A\\sharp', 'B'];
const NOTE_TEX_FLAT = ['C', 'D\\flat', 'D', 'E\\flat', 'E', 'F', 'G\\flat', 'G', 'A\\flat', 'A', 'B\\flat', 'B'];
const FLAT_ROOTS = new Set([1, 3, 5, 8, 10]); // Db, Eb, F, Ab, Bb
const IS_BLACK = [false, true, false, true, false, false, true, false, true, false, true, false];

// Two octaves + top C = 25 semitones (0..24), 15 white keys.
const TOTAL_KEYS = 25;

function useFlats(root: number, mode: ModeId): boolean {
  if (FLAT_ROOTS.has(root)) return true;
  if ((mode === 'min' || mode === 'scale-min' || mode === 'dom7') && (root === 0 || root === 2 || root === 7)) return true;
  return false;
}

function playNotesAudio(semitones: number[], asChord: boolean) {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    semitones.forEach((semi, idx) => {
      const freq = 261.6256 * Math.pow(2, semi / 12); // C4 = 261.63 Hz
      const start = asChord ? now + idx * 0.045 : now + idx * 0.22;
      const dur = asChord ? 1.15 : 0.34;
      const osc = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc2.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);
      osc2.frequency.setValueAtTime(freq * 2, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.linearRampToValueAtTime(asChord ? 0.14 : 0.18, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0008, start + dur);
      const g2 = ctx.createGain();
      g2.gain.value = 0.18;
      osc.connect(gain);
      osc2.connect(g2);
      g2.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc2.start(start);
      osc.stop(start + dur + 0.04);
      osc2.stop(start + dur + 0.04);
    });
    const totalMs = (asChord ? 1400 : semitones.length * 240 + 500);
    setTimeout(() => { ctx.close().catch(() => {}); }, totalMs);
  } catch {
    // Audio optional; visual explorer always works without Web Audio.
  }
}

const mount: Mount = (root) => {
  let rootSemi = 0; // C
  let mode: ModeId = 'maj';
  let inversion = 0; // 0 = root, 1 = 1st inv, 2 = 2nd inv

  const view = responsiveSvg(root, {
    label: 'Interactive two-octave piano keyboard showing chord shapes, semitone intervals, inversions, and scales',
    aspect: 0.46,
    minH: 215,
    maxH: 300,
  });

  const arcLayer = s('g', {}, view.el);
  const whiteLayer = s('g', {}, view.el);
  const blackLayer = s('g', {}, view.el);
  const badgeLayer = s('g', {}, view.el);

  const fml = formula(root);

  // Row 1: Root slider + Play button
  const rTop = row(root);
  const rootSlider = slider(rTop, {
    label: 'Starting key',
    min: 0,
    max: 11,
    step: 1,
    value: rootSemi,
    format: (v) => (FLAT_ROOTS.has(v) ? `${NOTE_FLAT[v]}` : `${NOTE_SHARP[v]}`),
    onInput: (v) => {
      rootSemi = v;
      draw();
    },
  });

  button(rTop, 'Hear notes', () => {
    const active = computeActiveNotes();
    const curMode = MODES.find((m) => m.id === mode)!;
    playNotesAudio(active, curMode.isChord);
  });

  // Row 2: Mode selector buttons
  const rModes = row(root);
  const modeBtns = new Map<ModeId, HTMLButtonElement>();
  for (const m of MODES) {
    const b = button(rModes, m.label, () => {
      mode = m.id;
      if (!m.isChord) inversion = 0;
      syncButtons();
      draw();
    });
    modeBtns.set(m.id, b);
  }

  // Row 3: Inversion buttons (enabled for chords)
  const rInv = row(root);
  const invLabels = ['Root position', '1st inversion (flip bottom +12)', '2nd inversion (flip two +12)'];
  const invBtns = invLabels.map((txt, idx) =>
    button(rInv, txt, () => {
      inversion = idx;
      syncButtons();
      draw();
    }),
  );

  function syncButtons() {
    const curMode = MODES.find((m) => m.id === mode)!;
    modeBtns.forEach((btn, id) => {
      btn.setAttribute('aria-pressed', String(id === mode));
    });
    invBtns.forEach((btn, idx) => {
      btn.disabled = !curMode.isChord;
      btn.setAttribute('aria-pressed', String(curMode.isChord && inversion === idx));
    });
  }

  function computeActiveNotes(): number[] {
    const curMode = MODES.find((m) => m.id === mode)!;
    let notes = curMode.offsets.map((off) => rootSemi + off);
    if (curMode.isChord) {
      for (let i = 0; i < inversion; i++) {
        notes[i] += 12;
      }
      notes.sort((a, b) => a - b);
      // Keep within 0..24 two-octave display if shifted past top C5
      while (notes[notes.length - 1] >= TOTAL_KEYS) {
        notes = notes.map((n) => n - 12);
      }
      if (notes[0] < 0) {
        notes = notes.map((n) => n + 12);
      }
    } else {
      // If scale goes past 24, keep within 2-octave keyboard where possible
      if (notes[notes.length - 1] >= TOTAL_KEYS) {
        notes = notes.filter((n) => n < TOTAL_KEYS);
      }
    }
    return notes;
  }

  function fingerForTriad(inv: number): string[] {
    if (inv === 1) return ['1', '2', '5'];
    return ['1', '3', '5'];
  }

  function draw() {
    const W = view.W;
    const H = view.H;
    whiteLayer.replaceChildren();
    blackLayer.replaceChildren();
    arcLayer.replaceChildren();
    badgeLayer.replaceChildren();

    const curMode = MODES.find((m) => m.id === mode)!;
    const flats = useFlats(rootSemi, mode);
    const names = flats ? NOTE_FLAT : NOTE_SHARP;
    const texNames = flats ? NOTE_TEX_FLAT : NOTE_TEX_SHARP;

    const active = computeActiveNotes();
    const activeSet = new Set(active);
    const trueRootMod = rootSemi % 12;

    const padX = Math.max(8, Math.round(W * 0.02));
    const topBannerH = 44;
    const bottomFooterH = 34;
    const keyTop = topBannerH;
    const keyH = Math.max(115, H - topBannerH - bottomFooterH);
    const blackH = Math.round(keyH * 0.61);

    // Count white keys in 0..24 (15 white keys: C4..C6)
    const whiteSemis: number[] = [];
    for (let k = 0; k < TOTAL_KEYS; k++) {
      if (!IS_BLACK[k % 12]) whiteSemis.push(k);
    }
    const whiteW = (W - 2 * padX) / whiteSemis.length;
    const blackW = whiteW * 0.62;

    // Map each semitone 0..24 to its visual x-center
    const keyCenter = new Map<number, { x: number; isBlack: boolean }>();

    whiteSemis.forEach((semi, wi) => {
      const x = padX + wi * whiteW;
      const isAct = activeSet.has(semi);
      const isRootTone = isAct && semi % 12 === trueRootMod;
      keyCenter.set(semi, { x: x + whiteW / 2, isBlack: false });

      const rect = s(
        'rect',
        {
          x: x + 0.6,
          y: keyTop,
          width: Math.max(4, whiteW - 1.2),
          height: keyH,
          rx: 4,
          style: isAct
            ? `fill: color-mix(in srgb, var(--acc) ${isRootTone ? '28%' : '16%'}, var(--bg)); stroke: var(--acc); stroke-width: ${isRootTone ? 2.2 : 1.6}; cursor: pointer;`
            : 'fill: var(--bg); stroke: color-mix(in srgb, var(--muted) 55%, transparent); stroke-width: 1.1; cursor: pointer;',
        },
        whiteLayer,
      );
      rect.addEventListener('click', () => {
        rootSemi = semi % 12;
        rootSlider.set(rootSemi);
        draw();
      });

      // Landmark C / F subtle labels when inactive, or bold note label when active
      const noteName = names[semi % 12];
      if (isAct || semi % 12 === 0 || semi % 12 === 5) {
        const lbl = s(
          'text',
          {
            x: x + whiteW / 2,
            y: keyTop + keyH - 10,
            'text-anchor': 'middle',
            class: isAct ? 'lbl-acc' : 'lbl',
            style: `font-size: ${W < 420 ? 10 : 12}px; pointer-events: none;`,
          },
          whiteLayer,
        );
        lbl.textContent = noteName;
      }

      if (isAct) {
        s(
          'circle',
          {
            cx: x + whiteW / 2,
            cy: keyTop + keyH - 30,
            r: Math.min(8, whiteW * 0.24),
            class: isRootTone ? 'dot-acc' : 'dot-ring',
            style: 'pointer-events: none;',
          },
          badgeLayer,
        );
      }
    });

    // Draw black keys on top
    let whiteIdx = -1;
    for (let semi = 0; semi < TOTAL_KEYS; semi++) {
      if (!IS_BLACK[semi % 12]) {
        whiteIdx++;
        continue;
      }
      const cx = padX + (whiteIdx + 1) * whiteW;
      const bx = cx - blackW / 2;
      const isAct = activeSet.has(semi);
      const isRootTone = isAct && semi % 12 === trueRootMod;
      keyCenter.set(semi, { x: cx, isBlack: true });

      const rect = s(
        'rect',
        {
          x: bx,
          y: keyTop,
          width: blackW,
          height: blackH,
          rx: 3,
          style: isAct
            ? 'fill: var(--acc); stroke: var(--bg); stroke-width: 1.5; cursor: pointer;'
            : 'fill: color-mix(in srgb, var(--fg) 86%, var(--bg)); stroke: var(--bg); stroke-width: 1.2; cursor: pointer;',
        },
        blackLayer,
      );
      rect.addEventListener('click', () => {
        rootSemi = semi % 12;
        rootSlider.set(rootSemi);
        draw();
      });

      if (isAct) {
        s(
          'circle',
          {
            cx,
            cy: keyTop + blackH - 14,
            r: Math.min(6.5, blackW * 0.28),
            style: `fill: var(--bg); stroke: ${isRootTone ? 'var(--bg)' : 'none'}; pointer-events: none;`,
          },
          badgeLayer,
        );
        if (W >= 400) {
          const bl = s(
            'text',
            {
              x: cx,
              y: keyTop + blackH - 25,
              'text-anchor': 'middle',
              style: 'fill: var(--bg); font-size: 10px; font-weight: 600; pointer-events: none;',
            },
            badgeLayer,
          );
          bl.textContent = names[semi % 12];
        }
      }
    }

    // Draw interval arcs above the active keys so the reader sees +4, +3 (or W-W-H) without counting!
    for (let i = 0; i < active.length - 1; i++) {
      const a = active[i];
      const b = active[i + 1];
      const pa = keyCenter.get(a);
      const pb = keyCenter.get(b);
      if (!pa || !pb) continue;
      const diff = b - a;
      const midX = (pa.x + pb.x) / 2;
      const yBase = keyTop - 6;
      const arcPeak = curMode.isChord ? keyTop - 26 : keyTop - 20;
      s(
        'path',
        {
          d: `M ${pa.x + 2} ${yBase} Q ${midX} ${arcPeak} ${pb.x - 2} ${yBase}`,
          class: curMode.isChord ? 'line-acc' : 'line-muted',
        },
        arcLayer,
      );
      if (curMode.isChord || W >= 460) {
        const stepText = curMode.isChord ? `+${diff}` : diff === 2 ? 'W' : diff === 1 ? 'H' : `+${diff}`;
        const t = s(
          'text',
          {
            x: midX,
            y: curMode.isChord ? keyTop - 21 : keyTop - 16,
            'text-anchor': 'middle',
            class: curMode.isChord ? 'lbl-acc' : 'lbl',
            style: `font-size: ${W < 420 ? 10 : 12}px;`,
          },
          arcLayer,
        );
        t.textContent = stepText;
      }
    }

    // Footer: right-hand fingering & root-gap cue for chords
    if (curMode.isChord && active.length === 3) {
      const fingers = fingerForTriad(inversion);
      active.forEach((semi, idx) => {
        const pos = keyCenter.get(semi);
        if (!pos) return;
        const compact = W < 480;
        const clampedX = compact ? Math.max(12, Math.min(W - 12, pos.x)) : Math.max(26, Math.min(W - 26, pos.x));
        const ft = s(
          'text',
          {
            x: clampedX,
            y: keyTop + keyH + 19,
            'text-anchor': 'middle',
            class: semi % 12 === trueRootMod ? 'lbl-acc' : 'lbl-fg',
            style: `font-size: ${compact ? 11 : 12}px;`,
          },
          badgeLayer,
        );
        ft.textContent = compact ? `f${fingers[idx]}` : `RH ${fingers[idx]}`;
      });
    } else {
      const hint = s(
        'text',
        {
          x: W / 2,
          y: keyTop + keyH + 20,
          'text-anchor': 'middle',
          class: 'lbl',
          style: `font-size: ${W < 480 ? 11 : 12}px;`,
        },
        badgeLayer,
      );
      hint.textContent = W < 480 ? 'Tap any piano key to change root' : 'Tap any piano key to move this pattern to a new starting note';
    }

    // Update live KaTeX formula line (compact enough to fit 360px phone cleanly)
    const spelledTex = active.map((n) => texNames[n % 12]).join('\\text{-}');
    const invNote = curMode.isChord && inversion > 0 ? `\\text{ (${inversion === 1 ? '1st' : '2nd'} inv)}` : '';
    attr(view.el, {});
    fml.set(`${curMode.recipeTex}${invNote}:\\; \\mathbf{${spelledTex}}`);
  }

  syncButtons();
  view.onResize(draw);
  draw();
};

export default mount;
