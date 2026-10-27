// Chapter 20: delta depends on c.
// For f(x) = x², ε is fixed by a slider; the reader drags c along the x-axis.
// Shows the ε band around f(c), the largest symmetric δ window on the x-axis,
// and a companion plot of δ_max as a function of c showing it shrink as c grows.

import {
  responsiveSvg,
  s,
  attr,
  handle,
  row,
  slider,
  button,
  formula,
  tween,
  clamp,
  scale,
  label,
  lerp,
  type Mount,
} from './lib';

/**
 * Mathematical Derivation:
 * We seek the largest symmetric δ > 0 such that for all x with |x - c| < δ,
 * we have |f(x) - f(c)| < ε, where f(x) = x² and c ≥ 0, ε > 0.
 *
 * 1. Condition on x:
 *    |x² - c²| < ε  ⟺  c² - ε < x² < c² + ε.
 *
 * 2. Connected component containing c (for c ≥ 0):
 *    - Upper bound: x² < c² + ε  ⟺  x < √(c² + ε) (since x > 0 near c ≥ 0).
 *      Thus the right endpoint is always x_right = √(c² + ε).
 *      Distance to right endpoint: d_right = √(c² + ε) - c.
 *
 *    - Lower bound:
 *      Case A: c² ≥ ε.
 *        Then x² > c² - ε  ⟺  x > √(c² - ε).
 *        The left endpoint is x_left = √(c² - ε).
 *        Distance to left endpoint: d_left = c - √(c² - ε).
 *
 *      Case B: c² < ε.
 *        Then c² - ε < 0. Since x² ≥ 0 > c² - ε holds for all real x,
 *        the allowed interval extends continuously through 0 to -√(c² + ε).
 *        The left endpoint is x_left = -√(c² + ε).
 *        Distance to left endpoint: d_left = c - (-√(c² + ε)) = c + √(c² + ε).
 *
 * 3. Maximal symmetric δ:
 *    To ensure the symmetric interval (c - δ, c + δ) ⊆ (x_left, x_right), we need:
 *      c + δ ≤ x_right  ⟹  δ ≤ d_right = √(c² + ε) - c
 *      c - δ ≥ x_left   ⟹  δ ≤ d_left
 *    Therefore:
 *      δ_max(c) = min(d_right, d_left).
 *
 * 4. Analytical property:
 *    For all c ≥ 0:
 *    - When c² ≥ ε:
 *        d_right = √(c² + ε) - c = ε / (√(c² + ε) + c)
 *        d_left  = c - √(c² - ε) = ε / (c + √(c² - ε))
 *      Since √(c² + ε) + c > c + √(c² - ε), the denominator for d_right is larger,
 *      so d_right < d_left for all c > 0.
 *    - When c² < ε:
 *        d_left = c + √(c² + ε) ≥ √(c² + ε) - c = d_right.
 *    In all cases, d_right ≤ d_left, with equality only at c = 0 where d_right = d_left = √ε.
 *    Hence δ_max(c) = √(c² + ε) - c.
 *
 * 5. Numerical verification across [0, 3] × [0.1, 1.0]:
 *    - For any x ∈ (c - δ_max, c + δ_max), |x² - c²| < ε.
 *    - At x = c + δ_max, (c + δ_max)² - c² = (√(c² + ε))² - c² = ε exactly.
 *    - As c increases, the derivative f'(c) = 2c grows, forcing δ to shrink as ~ ε / (2c).
 */
function maxDelta(c: number, eps: number) {
  const xRight = Math.sqrt(c * c + eps);
  const xLeft = c * c >= eps ? Math.sqrt(c * c - eps) : -Math.sqrt(c * c + eps);
  const dRight = xRight - c;
  const dLeft = c - xLeft;
  const delta = Math.min(dRight, dLeft);
  return { delta, xLeft, xRight, dLeft, dRight };
}

const C0 = 1.5;
const E0 = 0.5;
const EMIN = 0.1;
const EMAX = 1.0;
const CMIN = 0.0;
const CMAX = 3.0;

const mount: Mount = (root) => {
  let c = C0;
  let eps = E0;

  const view = responsiveSvg(root, {
    label: 'Demonstration of f(x) = x² showing how the largest valid delta depends on c',
    aspect: 0.54,
    minH: 260,
    maxH: 380,
  });
  const svgEl = view.el;

  // --- SVG Elements: Left Plot (f(x) = x²) ---
  const leftG = s('g', {}, svgEl);
  const gridL = s('g', { class: 'grid' }, leftG);
  const epsBand = s('rect', { class: 'band' }, leftG);
  const deltaBand = s('rect', { class: 'band-muted' }, leftG);
  const epsTop = s('line', { class: 'edge' }, leftG);
  const epsBot = s('line', { class: 'edge' }, leftG);
  const deltaLeftLine = s('line', { class: 'edge' }, leftG);
  const deltaRightLine = s('line', { class: 'edge' }, leftG);
  const axisXL = s('line', { class: 'ax' }, leftG);
  const axisYL = s('line', { class: 'ax' }, leftG);
  const curveFull = s('path', { class: 'curve-muted' }, leftG);
  const curveActive = s('path', { class: 'line-acc', 'stroke-width': 2.5 }, leftG);
  const deltaSpanLine = s('line', { class: 'line-acc', 'stroke-width': 3 }, leftG);
  const deltaCapL = s('line', { class: 'line-acc', 'stroke-width': 2 }, leftG);
  const deltaCapR = s('line', { class: 'line-acc', 'stroke-width': 2 }, leftG);
  const projY = s('line', { class: 'line-muted' }, leftG);
  const projX = s('line', { class: 'line-muted' }, leftG);
  const ptOnCurve = s('circle', { class: 'dot-acc', r: 4.5 }, leftG);
  const ptOnCurveRing = s('circle', { class: 'dot-ring', r: 7.5 }, leftG);
  const ticksL = s('g', {}, leftG);
  const labelsL = s('g', {}, leftG);

  // --- SVG Elements: Right Plot (δ_max vs c) ---
  const rightG = s('g', {}, svgEl);
  const gridR = s('g', { class: 'grid' }, rightG);
  const axisXR = s('line', { class: 'ax' }, rightG);
  const axisYR = s('line', { class: 'ax' }, rightG);
  const curveDelta = s('path', { class: 'curve' }, rightG);
  const deltaProjX = s('line', { class: 'line-muted' }, rightG);
  const deltaProjY = s('line', { class: 'line-muted' }, rightG);
  const dotDelta = s('circle', { class: 'dot-acc', r: 4.5 }, rightG);
  const dotDeltaRing = s('circle', { class: 'dot-ring', r: 7.5 }, rightG);
  const ticksR = s('g', {}, rightG);
  const labelsR = s('g', {}, rightG);

  // Draggable handle for c along the x-axis
  const hd = handle(svgEl, {
    label: 'Point c on horizontal axis',
    x: 0,
    y: 0,
    valueText: () => `c ${c.toFixed(2)}, largest delta ${maxDelta(c, eps).delta.toFixed(3)}`,
    onDrag: (px) => {
      const curXL = scale(-0.8, 3.2, curLayout.xL0, curLayout.xL1);
      setC(curXL.invert(px));
    },
    onKey: (dx, _dy, big) => {
      setC(c + dx * (big ? 0.2 : 0.05));
    },
  });
  hd.el.setAttribute('aria-valuemin', String(CMIN));
  hd.el.setAttribute('aria-valuemax', String(CMAX));

  // Controls row: slider for ε, Reset button
  const r = row(root);
  const epsSlider = slider(r, {
    label: 'Tolerance ε',
    texLabel: '\\text{Tolerance }\\varepsilon',
    min: EMIN,
    max: EMAX,
    step: 0.05,
    value: E0,
    format: (v) => v.toFixed(2),
    onInput: (v) => {
      eps = clamp(v, EMIN, EMAX);
      draw();
    },
  });

  button(r, 'Reset', () => {
    const fromC = c;
    const fromEps = eps;
    tween((k) => {
      c = lerp(fromC, C0, k);
      eps = lerp(fromEps, E0, k);
      epsSlider.set(eps);
      draw();
    }, 300);
  });

  // Formula display below
  const f = formula(root);

  let curLayout = { xL0: 0, xL1: 1, xR0: 2, xR1: 3, y0: 0, y1: 1 };

  function setC(v: number) {
    c = clamp(v, CMIN, CMAX);
    draw();
  }

  function draw() {
    const { W, H } = view;
    const padT = 32;
    const padB = 36;
    const padL = 34;
    const padR = 20;
    const gap = clamp(Math.round(W * 0.07), 26, 44);

    const availW = W - padL - padR - gap;
    const wRight = clamp(Math.round(availW * 0.35), 88, 200);
    const wLeft = availW - wRight;

    const xL0 = padL;
    const xL1 = xL0 + wLeft;
    const xR0 = xL1 + gap;
    const xR1 = xR0 + wRight;
    const y0 = H - padB;
    const y1 = padT;

    curLayout = { xL0, xL1, xR0, xR1, y0, y1 };

    // Left coordinate scales: domain x ∈ [-0.8, 3.2], range y ∈ [0, 9.8]
    const xDomMin = -0.8;
    const xDomMax = 3.2;
    const yDomMin = 0.0;
    const yDomMax = 9.8;

    const xL = scale(xDomMin, xDomMax, xL0, xL1);
    const yL = scale(yDomMin, yDomMax, y0, y1);

    // Right coordinate scales: domain c ∈ [0, 3], range δ ∈ [0, 1.0]
    const xR = scale(0, 3, xR0, xR1);
    const yR = scale(0, 1.0, y0, y1);

    const { delta } = maxDelta(c, eps);
    const fc = c * c;
    const yTopVal = fc + eps;
    const yBotVal = Math.max(0, fc - eps);

    const cx = xL(c);
    const cy = yL(fc);
    const yTopPx = yL(yTopVal);
    const yBotPx = yL(yBotVal);
    const xLeftDelta = xL(c - delta);
    const xRightDelta = xL(c + delta);
    const xZero = xL(0);

    // --- Draw Left Plot ---
    // Background subtle grid
    gridL.replaceChildren();
    for (const gy of [2, 4, 6, 8]) {
      s('line', { x1: xL0, x2: xL1, y1: yL(gy), y2: yL(gy) }, gridL);
    }
    for (const gx of [0, 1, 2, 3]) {
      s('line', { x1: xL(gx), x2: xL(gx), y1: y0, y2: y1 }, gridL);
    }

    // Axes
    attr(axisXL, { x1: xL0, x2: xL1, y1: y0, y2: y0 });
    attr(axisYL, { x1: xZero, x2: xZero, y1: y0, y2: y1 });

    // Epsilon horizontal band (starts at x=0 so it does not shade over y-axis labels)
    attr(epsBand, {
      x: xZero,
      width: xL1 - xZero,
      y: yTopPx,
      height: Math.max(0, yBotPx - yTopPx),
    });
    attr(epsTop, { x1: xZero, x2: xL1, y1: yTopPx, y2: yTopPx });
    attr(epsBot, { x1: xZero, x2: xL1, y1: yBotPx, y2: yBotPx });

    // Delta vertical window (stops at yTopPx so it does not clutter the upper graph)
    attr(deltaBand, {
      x: xLeftDelta,
      width: Math.max(0, xRightDelta - xLeftDelta),
      y: yTopPx,
      height: y0 - yTopPx,
    });
    attr(deltaLeftLine, { x1: xLeftDelta, x2: xLeftDelta, y1: y0, y2: yTopPx });
    attr(deltaRightLine, { x1: xRightDelta, x2: xRightDelta, y1: y0, y2: yTopPx });

    // Delta interval segment on x-axis
    attr(deltaSpanLine, { x1: xLeftDelta, x2: xRightDelta, y1: y0, y2: y0 });
    attr(deltaCapL, { x1: xLeftDelta, x2: xLeftDelta, y1: y0 - 5, y2: y0 + 5 });
    attr(deltaCapR, { x1: xRightDelta, x2: xRightDelta, y1: y0 - 5, y2: y0 + 5 });

    // Full parabola curve (capped at x = 3.05 so it stays nicely inside the frame)
    let dFull = '';
    const stepsCurve = 50;
    const curveMaxX = 3.05;
    for (let i = 0; i <= stepsCurve; i++) {
      const u = xDomMin + (i / stepsCurve) * (curveMaxX - xDomMin);
      const px = xL(u);
      const py = yL(u * u);
      dFull += (i === 0 ? 'M ' : ' L ') + px.toFixed(1) + ' ' + py.toFixed(1);
    }
    attr(curveFull, { d: dFull });

    // Active curve segment inside [c - delta, c + delta]
    let dActive = '';
    const stepsActive = 24;
    for (let i = 0; i <= stepsActive; i++) {
      const u = c - delta + (i / stepsActive) * (2 * delta);
      const px = xL(u);
      const py = yL(u * u);
      dActive += (i === 0 ? 'M ' : ' L ') + px.toFixed(1) + ' ' + py.toFixed(1);
    }
    attr(curveActive, { d: dActive });

    // Point on curve and dashed projections
    attr(projX, { x1: cx, x2: cx, y1: y0, y2: cy });
    attr(projY, { x1: xZero, x2: cx, y1: cy, y2: cy });
    attr(ptOnCurve, { cx, cy });
    attr(ptOnCurveRing, { cx, cy });

    // Handle moved to (cx, y0) on x-axis
    hd.move(cx, y0);

    // Left labels and ticks
    ticksL.replaceChildren();
    labelsL.replaceChildren();

    // X ticks on left (suppress if too close to handle)
    for (const gx of [0, 1, 2, 3]) {
      if (Math.abs(xL(gx) - cx) > 14) {
        label(ticksL, xL(gx), y0 + 16, String(gx));
      }
    }
    label(labelsL, cx, y0 + 17, 'c', 'lbl-acc', 'middle');

    // Y ticks on left (suppress if too close to f(c))
    for (const gy of [2, 4, 6, 8]) {
      if (Math.abs(yL(gy) - cy) > 13) {
        label(ticksL, xZero - 6, yL(gy) + 4, String(gy), 'lbl', 'end');
      }
    }
    label(labelsL, xZero - 6, cy + 4, 'f(c)', 'lbl-acc', 'end');

    // Graph title / axis indicators
    label(labelsL, xZero + 10, y1 + 12, 'f(x) = x²', 'lbl-fg', 'start');
    label(labelsL, xZero - 6, y1 + 12, 'y', 'lbl', 'end');
    label(labelsL, xL1 - 2, y0 - 6, 'x', 'lbl', 'end');

    // Epsilon band annotations at right edge of band
    label(labelsL, xL1 - 4, Math.max(y1 + 12, yTopPx - 4), '+ε', 'lbl-acc', 'end');
    if (yBotPx < y0 - 8 && yBotPx > yTopPx + 14) {
      label(labelsL, xL1 - 4, yBotPx + 12, '−ε', 'lbl', 'end');
    }

    // --- Draw Right Plot (δ_max vs c) ---
    // Grid
    gridR.replaceChildren();
    for (const gd of [0.5, 1.0]) {
      s('line', { x1: xR0, x2: xR1, y1: yR(gd), y2: yR(gd) }, gridR);
    }
    for (const gc of [1, 2, 3]) {
      s('line', { x1: xR(gc), x2: xR(gc), y1: y0, y2: y1 }, gridR);
    }

    // Axes
    attr(axisXR, { x1: xR0, x2: xR1, y1: y0, y2: y0 });
    attr(axisYR, { x1: xR0, x2: xR0, y1: y0, y2: y1 });

    // Curve of δ_max(u) for u ∈ [0, 3]
    let dDelta = '';
    const stepsDelta = 36;
    for (let i = 0; i <= stepsDelta; i++) {
      const u = (i / stepsDelta) * 3;
      const dVal = maxDelta(u, eps).delta;
      const px = xR(u);
      const py = yR(dVal);
      dDelta += (i === 0 ? 'M ' : ' L ') + px.toFixed(1) + ' ' + py.toFixed(1);
    }
    attr(curveDelta, { d: dDelta });

    // Dot at current (c, delta)
    const dotX = xR(c);
    const dotY = yR(delta);
    attr(deltaProjX, { x1: dotX, x2: dotX, y1: y0, y2: dotY });
    attr(deltaProjY, { x1: xR0, x2: dotX, y1: dotY, y2: dotY });
    attr(dotDelta, { cx: dotX, cy: dotY });
    attr(dotDeltaRing, { cx: dotX, cy: dotY });

    // Right ticks and labels
    ticksR.replaceChildren();
    labelsR.replaceChildren();

    // X ticks on right
    for (const gc of [0, 1, 2, 3]) {
      label(ticksR, xR(gc), y0 + 16, String(gc));
    }
    // Y ticks on right
    label(ticksR, xR0 - 5, yR(0.5) + 4, '0.5', 'lbl', 'end');
    label(ticksR, xR0 - 5, yR(1.0) + 4, '1', 'lbl', 'end');

    // Right plot titles
    label(labelsR, (xR0 + xR1) / 2, y1 - 10, 'largest δ', 'lbl-fg', 'middle');
    label(labelsR, xR1 - 2, y0 - 6, 'c', 'lbl', 'end');

    // Live value readout in empty top-right quadrant of right plot
    label(labelsR, xR1 - 4, y1 + 14, `δ = ${delta.toFixed(3)}`, 'lbl-acc', 'end');

    // Formula text
    f.set(
      `c = ${c.toFixed(2)},\\; \\varepsilon = ${eps.toFixed(2)} \\implies \\delta_{\\max} = ${delta.toFixed(3)}` +
        (W >= 600 ? `\\quad\\left(\\text{for } 3x+2,\\; \\delta = \\tfrac{\\varepsilon}{3} = ${(eps / 3).toFixed(2)}\\right)` : ''),
    );
  }

  view.onResize(draw);
  draw();
};

export default mount;
