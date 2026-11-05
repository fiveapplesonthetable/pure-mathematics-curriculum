// Interactive Beat Subdivision & Two-Hand Rhythm Grid.
// Lets a beginner pianist see and hear 4/4, dotted quarters, 3/4 waltz, and 6/8 sway
// as a single shared Right-Hand / Left-Hand timeline ("Together - Right - Left").

import {
  responsiveSvg,
  s,
  row,
  slider,
  button,
  formula,
  type Mount,
} from './lib';

interface RhythmPreset {
  id: string;
  label: string;
  meterTex: string;
  slots: string[];
  accentEvery: number;
  rh: boolean[];
  lh: boolean[];
  noteTex: string;
}

const PRESETS: RhythmPreset[] = [
  {
    id: 'straight-44',
    label: '4/4 Eighths (1 + 2 +)',
    meterTex: '\\tfrac{4}{4}',
    slots: ['1', '+', '2', '+', '3', '+', '4', '+'],
    accentEvery: 2,
    rh: [true, true, true, true, true, true, true, true],
    lh: [true, false, false, false, true, false, false, false],
    noteTex: '1{+}2{+}3{+}4{+}:\\; \\text{Both on } 1, 3',
  },
  {
    id: 'dotted-44',
    label: 'Dotted Quarter + Eighth',
    meterTex: '\\tfrac{4}{4}',
    slots: ['1', '+', '2', '+', '3', '+', '4', '+'],
    accentEvery: 2,
    rh: [true, false, false, true, true, false, true, false],
    lh: [true, false, true, false, true, false, true, false],
    noteTex: '\\text{Dot-qtr holds } \\mathbf{1\\,{+}\\,2},\\; \\text{RH on } \\mathbf{+}',
  },
  {
    id: 'waltz-34',
    label: '3/4 Waltz (3 beats)',
    meterTex: '\\tfrac{3}{4}',
    slots: ['1', '+', '2', '+', '3', '+'],
    accentEvery: 2,
    rh: [false, false, true, false, true, false],
    lh: [true, false, false, false, false, false],
    noteTex: '\\text{Waltz: } \\mathbf{1}\\text{ LH bass},\\; \\mathbf{2,3}\\text{ RH chords}',
  },
  {
    id: 'sway-68',
    label: '6/8 Sway (2 macro-beats)',
    meterTex: '\\tfrac{6}{8}',
    slots: ['1', '2', '3', '4', '5', '6'],
    accentEvery: 3,
    rh: [true, true, true, true, true, true],
    lh: [true, false, false, true, false, false],
    noteTex: '\\text{Two beats: } (\\mathbf{1}\\text{-2-3}) + (\\mathbf{4}\\text{-5-6})',
  },
];

function clickTickAudio(rhHit: boolean, lhHit: boolean, accented: boolean) {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    const playTone = (freq: number, vol: number, dur: number) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      g.gain.setValueAtTime(0.0001, now);
      g.gain.linearRampToValueAtTime(vol, now + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0008, now + dur);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + dur + 0.02);
    };
    if (rhHit) playTone(accented ? 523.25 : 440, 0.14, 0.14); // C5 / A4
    if (lhHit) playTone(accented ? 196.0 : 164.81, 0.16, 0.18); // G3 / E3
    if (!rhHit && !lhHit) playTone(880, 0.025, 0.035); // subtle subdivision ghost tick
    setTimeout(() => { ctx.close().catch(() => {}); }, 280);
  } catch {
    // Web Audio optional
  }
}

const mount: Mount = (root) => {
  let presetIdx = 0;
  let rh = [...PRESETS[0].rh];
  let lh = [...PRESETS[0].lh];
  let stepCursor = -1;
  let bpm = 84;
  let timer: number | null = null;

  const view = responsiveSvg(root, {
    label: 'Interactive beat subdivision and two-hand coordination grid showing Together, Right, and Left hand hits',
    aspect: 0.44,
    minH: 205,
    maxH: 270,
  });

  const gridG = s('g', {}, view.el);
  const fml = formula(root);

  const rTop = row(root);
  const playBtn = button(rTop, 'Play pulse', () => {
    if (timer !== null) {
      stopPulse();
    } else {
      startPulse();
    }
  });

  slider(rTop, {
    label: 'Tempo',
    min: 56,
    max: 124,
    step: 2,
    value: bpm,
    format: (v) => `${v} BPM`,
    onInput: (v) => {
      bpm = v;
      if (timer !== null) {
        stopPulse(false);
        startPulse();
      }
    },
  });

  const rPresets = row(root);
  const presetBtns = PRESETS.map((p, idx) =>
    button(rPresets, p.label, () => {
      stopPulse();
      presetIdx = idx;
      rh = [...p.rh];
      lh = [...p.lh];
      syncBtns();
      draw();
    }),
  );

  function syncBtns() {
    presetBtns.forEach((b, idx) => b.setAttribute('aria-pressed', String(idx === presetIdx)));
    playBtn.setAttribute('aria-pressed', String(timer !== null));
    playBtn.textContent = timer !== null ? 'Stop pulse' : 'Play pulse';
  }

  function stepIntervalMs() {
    const p = PRESETS[presetIdx];
    // For 6/8, BPM = dotted-quarter macro-beat, so 3 eighth-slots per macro-beat; else 2 eighth-slots per quarter beat.
    const slotsPerBeat = p.id === 'sway-68' ? 3 : 2;
    return Math.round(60000 / (bpm * slotsPerBeat));
  }

  function startPulse() {
    const p = PRESETS[presetIdx];
    stepCursor = 0;
    syncBtns();
    clickTickAudio(rh[0], lh[0], true);
    draw();
    timer = window.setInterval(() => {
      stepCursor = (stepCursor + 1) % p.slots.length;
      clickTickAudio(rh[stepCursor], lh[stepCursor], stepCursor % p.accentEvery === 0);
      draw();
    }, stepIntervalMs());
  }

  function stopPulse(resetCursor = true) {
    if (timer !== null) {
      clearInterval(timer);
      timer = null;
    }
    if (resetCursor) stepCursor = -1;
    syncBtns();
    draw();
  }

  function draw() {
    const W = view.W;
    const H = view.H;
    gridG.replaceChildren();

    const p = PRESETS[presetIdx];
    const n = p.slots.length;
    const leftLabelW = W < 460 ? 44 : 96;
    const padR = 12;
    const cellGap = 5;
    const cellW = (W - leftLabelW - padR - cellGap * (n - 1)) / n;

    const topCountY = 26;
    const rhY = 40;
    const rowH = Math.max(40, Math.round((H - 102) / 2));
    const lhY = rhY + rowH + 8;
    const cueY = lhY + rowH + 22;

    // Row titles on left
    const rhTitle = s('text', { x: leftLabelW - 10, y: rhY + rowH / 2 + 5, 'text-anchor': 'end', class: 'lbl-fg', style: 'font-size: 13px; font-weight: 600;' }, gridG);
    rhTitle.textContent = W < 460 ? 'RH' : 'Right hand';

    const lhTitle = s('text', { x: leftLabelW - 10, y: lhY + rowH / 2 + 5, 'text-anchor': 'end', class: 'lbl-fg', style: 'font-size: 13px; font-weight: 600;' }, gridG);
    lhTitle.textContent = W < 460 ? 'LH' : 'Left hand';

    const cueTitle = s('text', { x: leftLabelW - 10, y: cueY, 'text-anchor': 'end', class: 'lbl', style: 'font-size: 11px;' }, gridG);
    cueTitle.textContent = W < 460 ? 'Cue' : 'Combined';

    for (let i = 0; i < n; i++) {
      const x = leftLabelW + i * (cellW + cellGap);
      const isMainBeat = i % p.accentEvery === 0;
      const isActiveStep = i === stepCursor;

      // Active column highlight band
      if (isActiveStep) {
        s(
          'rect',
          {
            x: x - 2,
            y: 8,
            width: cellW + 4,
            height: H - 14,
            rx: 6,
            class: 'band-pos',
          },
          gridG,
        );
      }

      // Count header ("1", "+", "2", ...)
      const ct = s(
        'text',
        {
          x: x + cellW / 2,
          y: topCountY,
          'text-anchor': 'middle',
          class: isActiveStep || isMainBeat ? 'lbl-acc' : 'lbl',
          style: `font-size: ${isMainBeat ? 14 : 12}px; font-weight: ${isMainBeat ? 700 : 400};`,
        },
        gridG,
      );
      ct.textContent = p.slots[i];

      // RH interactive cell
      const rhBox = s(
        'rect',
        {
          x,
          y: rhY,
          width: cellW,
          height: rowH,
          rx: 5,
          style: rh[i]
            ? 'fill: color-mix(in srgb, var(--acc) 26%, var(--bg)); stroke: var(--acc); stroke-width: 1.8; cursor: pointer;'
            : `fill: color-mix(in srgb, var(--muted) ${isMainBeat ? '12%' : '6%'}, transparent); stroke: color-mix(in srgb, var(--muted) 42%, transparent); stroke-width: 1; cursor: pointer;`,
        },
        gridG,
      );
      rhBox.addEventListener('click', () => {
        rh[i] = !rh[i];
        draw();
      });
      if (rh[i]) {
        s('circle', { cx: x + cellW / 2, cy: rhY + rowH / 2, r: Math.min(7, cellW * 0.22), class: 'dot-acc', style: 'pointer-events: none;' }, gridG);
      }

      // LH interactive cell
      const lhBox = s(
        'rect',
        {
          x,
          y: lhY,
          width: cellW,
          height: rowH,
          rx: 5,
          style: lh[i]
            ? 'fill: color-mix(in srgb, var(--fg) 18%, var(--bg)); stroke: var(--fg); stroke-width: 1.8; cursor: pointer;'
            : `fill: color-mix(in srgb, var(--muted) ${isMainBeat ? '12%' : '6%'}, transparent); stroke: color-mix(in srgb, var(--muted) 42%, transparent); stroke-width: 1; cursor: pointer;`,
        },
        gridG,
      );
      lhBox.addEventListener('click', () => {
        lh[i] = !lh[i];
        draw();
      });
      if (lh[i]) {
        s('circle', { cx: x + cellW / 2, cy: lhY + rowH / 2, r: Math.min(7, cellW * 0.22), class: 'dot', style: 'pointer-events: none;' }, gridG);
      }

      // Combined single-brain coordination cue ("Both" / "R" / "L" / "·")
      const comb = rh[i] && lh[i] ? (W < 460 ? 'B' : 'Both') : rh[i] ? 'R' : lh[i] ? 'L' : '·';
      const cueTxt = s(
        'text',
        {
          x: x + cellW / 2,
          y: cueY,
          'text-anchor': 'middle',
          class: rh[i] && lh[i] ? 'lbl-acc' : rh[i] || lh[i] ? 'lbl-fg' : 'lbl',
          style: 'font-size: 11px;',
        },
        gridG,
      );
      cueTxt.textContent = comb;
    }

    fml.set(`${p.meterTex}:\\; ${p.noteTex}`);
  }

  syncBtns();
  view.onResize(draw);
  draw();

  return () => {
    if (timer !== null) clearInterval(timer);
  };
};

export default mount;
