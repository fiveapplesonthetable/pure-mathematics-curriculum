// Chapter 20, figure: contract-game
// The contract as three moves for a_n = 1/n with L = 0.
// Move 1: Challenger picks ε with a slider (0.02–0.5).
// Move 2: You pick N with a slider or a draggable vertical line on the plot.
// Move 3: Challenger tests: a draggable n marker restricted to n ≥ N,
//         plus a button 'Test the worst n' that moves n to N.

import katex from 'katex';
import {
  responsiveSvg,
  s,
  h,
  attr,
  handle,
  slider,
  row,
  button,
  formula,
  tween,
  clamp,
  scale,
  label,
  lerp,
  MACROS,
  type Mount,
} from './lib';

const E0 = 0.20;
const EMIN = 0.02;
const EMAX = 0.50;
const N0 = 4;
const MAX_N = 60;
const MAX_TERMS = 80;

// |1/n - 0| = 1/n < ε  ⇔  n > 1/ε, so least safe N is floor(1/ε) + 1.
const needSafeN = (e: number) => Math.floor(1 / e + 1e-9) + 1;

const wantShown = (e: number, curN: number, cur_n_val: number) => {
  const safe = needSafeN(e);
  const target = Math.max(curN, safe, cur_n_val);
  return clamp(Math.ceil((target * 1.45) / 5) * 5, 24, 75);
};

const mount: Mount = (root) => {
  let eps = E0;
  let N = N0;
  let cur_n = N0;
  let shown = 26;

  const pad = { l: 38, r: 24, t: 34, b: 34 };
  let x = scale(1, shown, pad.l, 360 - pad.r);
  let y = scale(-0.04, 1.25, 260 - pad.b, pad.t);

  const view = responsiveSvg(root, {
    label:
      'Contract game for sequence a_n = 1/n converging to 0. Challenger sets epsilon, you choose N, and challenger tests n ≥ N',
    aspect: 0.52,
    minH: 260,
    maxH: 350,
  });
  const svgEl = view.el;

  // Background regions
  const band = s('rect', { class: 'band' }, svgEl);
  const tail = s('rect', { class: 'band-muted' }, svgEl);

  // Axes and reference lines
  const axis = s('line', { class: 'ax' }, svgEl);
  const topEdge = s('line', { class: 'edge' }, svgEl);
  const safeLine = s('line', { class: 'grid' }, svgEl);
  safeLine.setAttribute('stroke-dasharray', '3 3');
  const safeTick = s('line', { class: 'ax' }, svgEl);
  const safeLbl = label(svgEl, 0, 0, '', 'lbl', 'middle');

  // N cutoff line and label
  const nLine = s('line', { class: 'line-acc' }, svgEl);
  const nLbl = label(svgEl, 0, 0, '', 'lbl-acc', 'middle');

  // Challenger test marker drop line and labels
  const curNDrop = s('line', { class: 'line-muted' }, svgEl);
  const limLbl = label(svgEl, 0, 0, 'L = 0', 'lbl-fg', 'start');
  const epsLbl = label(svgEl, 0, 0, '', 'lbl-acc', 'end');
  const curNLbl = label(svgEl, 0, 0, '', 'lbl-acc', 'middle');

  // Terms (dots)
  const dotsG = s('g', {}, svgEl);
  const dots: SVGCircleElement[] = [];
  for (let k = 1; k <= MAX_TERMS; k++) {
    dots.push(s('circle', { r: 3.5 }, dotsG));
  }
  const curNRing = s('circle', { class: 'dot-ring', r: 7.5 }, svgEl);

  // Ticks group
  const ticksG = s('g', {}, svgEl);

  // Handle for N (Move 2)
  const hdN = handle(svgEl, {
    label: 'You: N',
    x: 0,
    y: 0,
    r: 8,
    valueText: () => `N = ${N}`,
    onDrag: (px) => setN(Math.round(x.invert(px))),
    onKey: (dx, _dy, big) => setN(N + dx * (big ? 5 : 1)),
  });
  hdN.el.setAttribute('aria-valuemin', '1');
  hdN.el.setAttribute('aria-valuemax', String(MAX_N));

  // Handle for test n (Move 3)
  const hd_n = handle(svgEl, {
    label: 'Challenger: n ≥ N',
    x: 0,
    y: 0,
    r: 7,
    valueText: () => `n = ${cur_n}, 1/n = ${(1 / cur_n).toFixed(3)}`,
    onDrag: (px) => set_n(Math.round(x.invert(px))),
    onKey: (dx, _dy, big) => set_n(cur_n + dx * (big ? 5 : 1)),
  });

  // Formula display right below the diagram
  const f = formula(root);
  const note = h('div', { class: 'fig-note' }, root);
  note.style.margin = '0.25rem 8px 0';

  // Move 1 and Move 2 controls
  const r1 = row(root);
  const sEps = slider(r1, {
    label: 'Challenger: ε',
    texLabel: '\\text{Challenger: }\\varepsilon',
    min: EMIN,
    max: EMAX,
    step: 0.01,
    value: eps,
    format: (v) => v.toFixed(2),
    onInput: (v) => setEps(v),
  });

  const sN = slider(r1, {
    label: 'You: N',
    texLabel: '\\text{You: }N',
    min: 1,
    max: MAX_N,
    step: 1,
    value: N,
    format: (v) => String(v),
    onInput: (v) => setN(v),
  });

  // Move 3 controls: test n, test worst n button, and Reset button
  const r2 = row(root);
  const s_n = slider(r2, {
    label: 'Challenger: n ≥ N',
    texLabel: '\\text{Challenger: }n \\ge N',
    min: N,
    max: Math.ceil(shown),
    step: 1,
    value: cur_n,
    format: (v) => String(v),
    onInput: (v) => set_n(v),
  });

  const testWorstBtn = button(r2, 'Test the worst n', () => testWorstN());
  h('span', { class: 'spacer' }, r2);
  button(r2, 'Reset', () => reset());

  let zoomCancel = () => {};

  function setEps(v: number) {
    eps = clamp(v, EMIN, EMAX);
    sEps.set(eps);
    const want = wantShown(eps, N, cur_n);
    if (Math.abs(want - shown) > 2) {
      zoomCancel();
      const from = shown;
      zoomCancel = tween((k) => {
        shown = lerp(from, want, k);
        draw();
      }, 280);
    } else {
      draw();
    }
  }

  function setN(v: number) {
    N = clamp(Math.round(v), 1, MAX_N);
    sN.set(N);
    s_n.input.min = String(N);
    if (cur_n < N) {
      cur_n = N;
      s_n.set(cur_n);
    }
    if (N > shown - 3) {
      shown = Math.min(75, N + 8);
    }
    draw();
  }

  function set_n(v: number) {
    cur_n = clamp(Math.round(v), N, Math.max(N, Math.ceil(shown)));
    s_n.set(cur_n);
    draw();
  }

  function testWorstN() {
    if (cur_n === N) return;
    const from = cur_n;
    tween((k) => {
      cur_n = Math.round(lerp(from, N, k));
      s_n.set(cur_n);
      draw();
    }, 220);
  }

  function reset() {
    zoomCancel();
    const fromEps = eps;
    const fromN = N;
    const from_n = cur_n;
    const fromShown = shown;
    tween((k) => {
      eps = lerp(fromEps, E0, k);
      N = Math.round(lerp(fromN, N0, k));
      cur_n = Math.round(lerp(from_n, N0, k));
      shown = lerp(fromShown, 26, k);
      sEps.set(eps);
      sN.set(N);
      s_n.input.min = String(N);
      s_n.set(cur_n);
      draw();
    }, 280);
  }

  function draw() {
    const { W, H } = view;
    x = scale(1, shown, pad.l, W - pad.r);
    y = scale(-0.04, 1.25, H - pad.b, pad.t);

    const safeN = needSafeN(eps);
    const x0 = pad.l - 12;
    const x1 = W - pad.r + 12;
    const y0 = y(0);
    const yEps = y(eps);
    const xN = x(N);
    const xCur = x(cur_n);
    const yCur = y(1 / cur_n);

    // Epsilon tolerance band (horizontal)
    attr(band, { x: x0, width: x1 - x0, y: yEps, height: Math.max(0, y0 - yEps) });
    attr(topEdge, { x1: x0, x2: x1, y1: yEps, y2: yEps });

    // Shaded region for n ≥ N (vertical)
    attr(tail, {
      x: Math.min(xN, x1),
      width: Math.max(0, x1 - xN),
      y: pad.t,
      height: Math.max(0, y0 - pad.t),
    });

    // Limit and horizontal axis
    attr(axis, { x1: x0, x2: x1, y1: y0, y2: y0 });
    attr(limLbl, { x: x0 + 2, y: y0 - 6 });
    attr(epsLbl, { x: x1 - 4, y: yEps - 6 });
    epsLbl.textContent = `ε = ${eps.toFixed(2)}`;

    // Smallest safe N faint tick and vertical guideline
    const xSafe = x(safeN);
    const safeVisible = safeN <= shown;
    attr(safeLine, {
      x1: xSafe,
      x2: xSafe,
      y1: pad.t,
      y2: y0,
      opacity: safeVisible ? 0.35 : 0,
    });
    attr(safeTick, {
      x1: xSafe,
      x2: xSafe,
      y1: y0 - 5,
      y2: y0 + 5,
      opacity: safeVisible ? 1 : 0,
    });
    attr(safeLbl, {
      x: xSafe,
      y: y0 + 18,
      opacity: safeVisible ? 1 : 0,
    });
    safeLbl.textContent = W < 420 ? `safe N = ${safeN}` : `smallest safe N = ${safeN}`;

    // N vertical cutoff line, label, and handle
    const nVisible = N <= shown;
    attr(nLine, { x1: xN, x2: xN, y1: pad.t, y2: y0, opacity: nVisible ? 1 : 0 });
    attr(nLbl, {
      x: clamp(xN, pad.l + 16, W - pad.r - 16),
      y: pad.t - 14,
      opacity: nVisible ? 1 : 0,
    });
    nLbl.textContent = `N = ${N}`;
    hdN.move(xN, pad.t);
    hdN.el.setAttribute('aria-valuenow', String(N));

    // Sequence dots
    const rad = clamp((W - pad.l - pad.r) / shown / 3, 2, 4.2);
    dots.forEach((d, i) => {
      const k = i + 1;
      const on = k <= Math.ceil(shown);
      d.style.display = on ? '' : 'none';
      if (!on) return;
      const termY = y(1 / k);
      attr(d, {
        cx: x(k),
        cy: termY,
        r: rad,
        class: k < N ? 'dot-dim' : 'dot',
      });
    });

    // Active test index marker
    attr(curNDrop, { x1: xCur, x2: xCur, y1: yCur, y2: y0 });
    attr(curNRing, { cx: xCur, cy: yCur, r: rad + 4 });
    attr(curNLbl, {
      x: clamp(xCur, pad.l + 14, W - pad.r - 14),
      y: yCur - rad - 7,
    });
    curNLbl.textContent = `n = ${cur_n}`;

    hd_n.move(xCur, yCur);
    hd_n.el.setAttribute('aria-valuemin', String(N));
    hd_n.el.setAttribute('aria-valuemax', String(Math.ceil(shown)));
    hd_n.el.setAttribute('aria-valuenow', String(cur_n));

    // Update test slider max and worst button state
    s_n.input.max = String(Math.max(N, Math.ceil(shown)));
    testWorstBtn.disabled = cur_n === N;

    // Bottom axis ticks for n
    ticksG.replaceChildren();
    const stepT = shown > 50 ? 20 : shown > 25 ? 10 : 5;
    for (let k = stepT; k <= shown; k += stepT) {
      if (Math.abs(k - safeN) >= 5) {
        label(ticksG, x(k), y0 + 18, String(k), 'lbl', 'middle');
      }
    }
    if (safeN > 3) {
      label(ticksG, x(1), y0 + 18, '1', 'lbl', 'middle');
    }

    // Formula: live values and holds/fails status
    const val = 1 / cur_n;
    const holds = val < eps;
    const isExact = Number.isInteger(Math.round(val * 1000) / 10) || val === 1;
    const sym = isExact ? '=' : '\\approx';
    const numStr = isExact ? (val === 1 ? '1' : val.toFixed(2)) : val.toFixed(3);
    const rel = holds ? '<' : '\\ge';
    const status = holds ? 'holds' : 'fails';
    const mathTex = `\\left|a_{${cur_n}} - 0\\right| = \\tfrac{1}{${cur_n}} ${sym} ${numStr} ${rel} \\varepsilon = ${eps.toFixed(2)}`;

    const mathHtml = katex.renderToString(mathTex, {
      throwOnError: false,
      macros: { ...MACROS },
    });
    f.el.innerHTML = `${mathHtml} <span class="fig-note">— ${status}</span>`;
    if (N >= safeN) {
      note.textContent = `Your cutoff N = ${N} ≥ smallest safe N = ${safeN} wins the contract: because 1/n decreases, even the challenger's worst allowed index n = ${N} has 1/${N} = ${(1 / N).toFixed(3)} < ε = ${eps.toFixed(2)}.`;
    } else if (holds) {
      note.textContent = `Term n = ${cur_n} happens to lie inside the band, but your cutoff N = ${N} < ${safeN} is unsafe — click "Test the worst n" (n = ${N}) to see where 1/${N} = ${(1 / N).toFixed(3)} ≥ ε breaks the contract.`;
    } else {
      note.textContent = `Contract broken at n = ${cur_n} ≥ N: 1/${cur_n} = ${(1 / cur_n).toFixed(3)} ≥ ε = ${eps.toFixed(2)}. Increase N to at least ${safeN} so every n ≥ N lies below ε.`;
    }
  }

  view.onResize(draw);
  draw();
};

export default mount;
