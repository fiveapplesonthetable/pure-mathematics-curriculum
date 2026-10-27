// Chapter 20: epsilon-delta definition of continuity for f(x) = 3x + 2.
// The challenger chooses the tolerance band f(c) ± ε; the reader chooses the
// window c ± δ. The segment of the line over (c - δ, c + δ) stays inside the band
// iff δ ≤ ε/3; any parts escaping the band are highlighted with a thick accent.

import {
  responsiveSvg,
  s,
  attr,
  handle,
  row,
  button,
  formula,
  tween,
  clamp,
  scale,
  label,
  lerp,
  h,
  type Mount,
} from './lib';

const f = (x: number) => 3 * x + 2;

const C0 = 1.0;
const CMIN = 0.2;
const CMAX = 1.8;

const E0 = 1.5;
const EMIN = 0.4;
const EMAX = 2.5;

const D0 = 0.7;
const DMIN = 0.1;
const DMAX = 0.9;

const XMIN = -1.0;
const XMAX = 3.0;
const YMIN = -2.0;
const YMAX = 12.0;

const mount: Mount = (root) => {
  let c = C0;
  let eps = E0;
  let delta = D0;

  const pad = { l: 44, r: 44, t: 28, b: 44 };
  let x = scale(XMIN, XMAX, 0, 1);
  let y = scale(YMIN, YMAX, 1, 0);

  const view = responsiveSvg(root, {
    label: 'Epsilon-delta window around (c, f(c)) for f(x) = 3x + 2',
    aspect: 0.68,
    minH: 260,
    maxH: 380,
  });
  const svgEl = view.el;

  // Background grid
  const gridG = s('g', {}, svgEl);

  // Epsilon horizontal band
  const epsBand = s('rect', { class: 'band-muted' }, svgEl);
  const epsTop = s('line', { class: 'edge' }, svgEl);
  const epsBot = s('line', { class: 'edge' }, svgEl);

  // Delta vertical window guidelines
  const winLeft = s('line', { class: 'line-muted' }, svgEl);
  const winRight = s('line', { class: 'line-muted' }, svgEl);

  // The box [c - δ, c + δ] × [f(c) - ε, f(c) + ε]
  const box = s('rect', { class: 'band' }, svgEl);
  const boxBorder = s('rect', { class: 'edge' }, svgEl);

  // Coordinate axes
  const xAxis = s('line', { class: 'ax' }, svgEl);
  const yAxis = s('line', { class: 'ax' }, svgEl);
  const ticksG = s('g', {}, svgEl);

  // Center point projections
  const projX = s('line', { class: 'line-muted' }, svgEl);
  const projY = s('line', { class: 'line-muted' }, svgEl);

  // Full function graph (muted)
  const fullCurve = s('line', { class: 'curve-muted' }, svgEl);

  // Graph segments over (c - delta, c + delta)
  const insideCurve = s('line', { class: 'curve' }, svgEl);
  const leftEscape = s('line', { class: 'curve-acc' }, svgEl);
  const rightEscape = s('line', { class: 'curve-acc' }, svgEl);

  // Dots
  const dotLeft = s('circle', { r: 3.5 }, svgEl);
  const dotRight = s('circle', { r: 3.5 }, svgEl);
  const dotC = s('circle', { class: 'dot', r: 4.5 }, svgEl);

  // Labels
  const fnLbl = label(svgEl, 0, 0, 'f(x) = 3x + 2', 'lbl', 'start');
  const epsLbl = label(svgEl, 0, 0, '', 'lbl-acc', 'middle');
  const deltaLbl = label(svgEl, 0, 0, '', 'lbl-acc', 'middle');
  const cAxisLbl = label(svgEl, 0, 0, '', 'lbl-fg', 'end');
  const fcAxisLbl = label(svgEl, 0, 0, 'f(c)', 'lbl-fg', 'end');

  // Animation helper
  let cancelTween = () => {};
  function startTween(onFrame: (k: number) => void, ms = 300) {
    cancelTween();
    cancelTween = tween(onFrame, ms);
  }

  function setC(v: number) {
    c = clamp(v, CMIN, CMAX);
    draw();
  }

  function setEps(v: number) {
    eps = clamp(v, EMIN, EMAX);
    draw();
  }

  function setDelta(v: number) {
    delta = clamp(v, DMIN, DMAX);
    draw();
  }

  // Handles
  const hdC = handle(svgEl, {
    label: 'Center point c on x axis',
    x: 0,
    y: 0,
    valueText: () => `c = ${c.toFixed(2)}`,
    onDrag: (px) => {
      cancelTween();
      setC(x.invert(px));
    },
    onKey: (dx, _, big) => {
      cancelTween();
      setC(c + dx * (big ? 0.1 : 0.02));
    },
  });
  hdC.el.setAttribute('aria-valuemin', String(CMIN));
  hdC.el.setAttribute('aria-valuemax', String(CMAX));

  const hdEps = handle(svgEl, {
    label: 'Tolerance epsilon',
    x: 0,
    y: 0,
    valueText: () => `epsilon = ${eps.toFixed(2)}`,
    onDrag: (_, py) => {
      cancelTween();
      setEps(y.invert(py) - f(c));
    },
    onKey: (_, dy, big) => {
      cancelTween();
      setEps(eps + dy * (big ? 0.1 : 0.02));
    },
  });
  hdEps.el.setAttribute('aria-valuemin', String(EMIN));
  hdEps.el.setAttribute('aria-valuemax', String(EMAX));

  const hdDelta = handle(svgEl, {
    label: 'Window half-width delta',
    x: 0,
    y: 0,
    valueText: () => `delta = ${delta.toFixed(2)}`,
    onDrag: (px) => {
      cancelTween();
      setDelta(x.invert(px) - c);
    },
    onKey: (dx, _, big) => {
      cancelTween();
      setDelta(delta + dx * (big ? 0.05 : 0.01));
    },
  });
  hdDelta.el.setAttribute('aria-valuemin', String(DMIN));
  hdDelta.el.setAttribute('aria-valuemax', String(DMAX));

  // Controls below figure
  const fFormula = formula(root);
  const r = row(root);
  button(r, 'Use δ = ε/3', () => {
    const fromD = delta;
    const targetD = eps / 3;
    startTween((k) => {
      delta = lerp(fromD, targetD, k);
      draw();
    });
  });
  h('span', { class: 'spacer' }, r);
  button(r, 'Reset', () => {
    const fromC = c,
      fromE = eps,
      fromD = delta;
    startTween((k) => {
      c = lerp(fromC, C0, k);
      eps = lerp(fromE, E0, k);
      delta = lerp(fromD, D0, k);
      draw();
    });
  });

  function draw() {
    const { W, H } = view;
    x = scale(XMIN, XMAX, pad.l, W - pad.r);
    y = scale(YMIN, YMAX, H - pad.b, pad.t);

    const fc = f(c);
    const x0 = pad.l;
    const x1 = W - pad.r;
    const yAxisLine = y(0);
    const xAxisLine = x(0);

    const yTop = fc + eps;
    const yBot = fc - eps;
    const xLeft = c - delta;
    const xRight = c + delta;

    const pyTop = y(yTop);
    const pyBot = y(yBot);
    const pxLeft = x(xLeft);
    const pxRight = x(xRight);
    const pxC = x(c);
    const pyFc = y(fc);

    // Grid lines
    gridG.replaceChildren();
    for (const gVal of [2, 4, 6, 8, 10]) {
      s('line', { class: 'grid', x1: x0, x2: x1, y1: y(gVal), y2: y(gVal) }, gridG);
    }
    for (const gVal of [-1, 1, 2, 3]) {
      s('line', { class: 'grid', x1: x(gVal), x2: x(gVal), y1: pad.t, y2: H - pad.b }, gridG);
    }

    // Axes
    attr(xAxis, { x1: x0, x2: x1, y1: yAxisLine, y2: yAxisLine });
    attr(yAxis, { x1: xAxisLine, x2: xAxisLine, y1: H - pad.b, y2: pad.t });

    // Axis ticks & numbers
    ticksG.replaceChildren();
    for (const tVal of [-1, 1, 2, 3]) {
      const tx = x(tVal);
      s('line', { class: 'ax', x1: tx, x2: tx, y1: yAxisLine - 3, y2: yAxisLine + 3 }, ticksG);
      // Suppress tick label if it lies under the c handle
      if (Math.abs(tVal - c) > 0.22) {
        label(ticksG, tx, yAxisLine + 17, String(tVal), 'lbl', 'middle');
      }
    }
    for (const tVal of [2, 4, 6, 8, 10]) {
      const ty = y(tVal);
      s('line', { class: 'ax', x1: xAxisLine - 3, x2: xAxisLine + 3, y1: ty, y2: ty }, ticksG);
      label(ticksG, xAxisLine - 6, ty + 4, String(tVal), 'lbl', 'end');
    }
    label(ticksG, xAxisLine - 8, yAxisLine + 17, '0', 'lbl', 'end');

    // Horizontal epsilon band
    attr(epsBand, { x: x0, width: x1 - x0, y: pyTop, height: pyBot - pyTop });
    attr(epsTop, { x1: x0, x2: x1, y1: pyTop, y2: pyTop });
    attr(epsBot, { x1: x0, x2: x1, y1: pyBot, y2: pyBot });

    // Vertical delta window lines
    attr(winLeft, { x1: pxLeft, x2: pxLeft, y1: pad.t, y2: H - pad.b });
    attr(winRight, { x1: pxRight, x2: pxRight, y1: pad.t, y2: H - pad.b });

    // Target box [c - δ, c + δ] × [f(c) - ε, f(c) + ε]
    attr(box, { x: pxLeft, width: pxRight - pxLeft, y: pyTop, height: pyBot - pyTop });
    attr(boxBorder, { x: pxLeft, width: pxRight - pxLeft, y: pyTop, height: pyBot - pyTop });

    // Center projections
    attr(projX, { x1: pxC, x2: pxC, y1: yAxisLine, y2: pyFc });
    attr(projY, { x1: xAxisLine, x2: pxC, y1: pyFc, y2: pyFc });
    attr(dotC, { cx: pxC, cy: pyFc });

    // Full function curve
    attr(fullCurve, { x1: x(XMIN), y1: y(f(XMIN)), x2: x(XMAX), y2: y(f(XMAX)) });

    // Graph segments over (c - delta, c + delta)
    const deltaStar = eps / 3;
    if (delta <= deltaStar + 1e-5) {
      attr(insideCurve, {
        x1: pxLeft,
        y1: y(f(xLeft)),
        x2: pxRight,
        y2: y(f(xRight)),
        style: '',
      });
      attr(leftEscape, { style: 'display: none' });
      attr(rightEscape, { style: 'display: none' });
      attr(dotLeft, { cx: pxLeft, cy: y(f(xLeft)), class: 'dot' });
      attr(dotRight, { cx: pxRight, cy: y(f(xRight)), class: 'dot' });
    } else {
      const xEscLeft = c - deltaStar;
      const xEscRight = c + deltaStar;
      const pxEscLeft = x(xEscLeft);
      const pxEscRight = x(xEscRight);

      // Left escape: below band
      attr(leftEscape, {
        x1: pxLeft,
        y1: y(f(xLeft)),
        x2: pxEscLeft,
        y2: pyBot,
        style: '',
      });
      // Inside band
      attr(insideCurve, {
        x1: pxEscLeft,
        y1: pyBot,
        x2: pxEscRight,
        y2: pyTop,
        style: '',
      });
      // Right escape: above band
      attr(rightEscape, {
        x1: pxEscRight,
        y1: pyTop,
        x2: pxRight,
        y2: y(f(xRight)),
        style: '',
      });

      attr(dotLeft, { cx: pxLeft, cy: y(f(xLeft)), class: 'dot-acc' });
      attr(dotRight, { cx: pxRight, cy: y(f(xRight)), class: 'dot-acc' });
    }

    // Dynamic labels
    // Clean label above the plot area on the left
    attr(fnLbl, { x: pad.l, y: pad.t - 10 });

    attr(cAxisLbl, { x: pxC - 14, y: yAxisLine - 10 });
    cAxisLbl.textContent = `c = ${c.toFixed(2)}`;

    attr(fcAxisLbl, { x: xAxisLine - 8, y: pyFc + 4 });

    epsLbl.textContent = `ε = ${eps.toFixed(2)}`;
    attr(epsLbl, {
      x: clamp(x1 - 10, pad.l + 30, x1 - 10),
      y: Math.max(pad.t + 14, pyTop - 14),
    });

    deltaLbl.textContent = `δ = ${delta.toFixed(2)}`;
    attr(deltaLbl, {
      x: clamp(pxRight, pad.l + 30, x1 - 25),
      y: H - pad.b + 24,
    });

    // Move handles
    hdC.move(pxC, yAxisLine);
    hdEps.move(x1 - 10, pyTop);
    hdDelta.move(pxRight, H - pad.b);

    // Update live KaTeX formula
    const threeDelta = 3 * delta;
    const works = threeDelta <= eps + 1e-4;
    const cmp = works ? '\\le' : '>';
    const verdict = works ? '\\text{works}' : '\\text{fails}';
    fFormula.set(`3\\delta = ${threeDelta.toFixed(2)} ${cmp} \\varepsilon = ${eps.toFixed(2)}:\\ \\delta = ${delta.toFixed(2)}\\ ${verdict}`);
  }

  view.onResize(draw);
  draw();
};

export default mount;
