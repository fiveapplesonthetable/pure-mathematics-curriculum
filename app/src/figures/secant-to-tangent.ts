// Calculus Chapter 10: Secant to tangent.
// f(x) = 0.5 * x^2 at a = 1 (matching Figure 10.1 from the book).
// The reader drags Q = (a + h, f(a + h)) along the curve or clicks 'Shrink h'.
// The secant line pivots around P(1, 0.5) and rotates onto the faint tangent line.

import {
  responsiveSvg,
  s,
  h as hDom,
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
  type Mount,
} from './lib';

const A = 1;
const FA = 0.5; // f(1) = 0.5 * 1^2 = 0.5
const fn = (x: number) => 0.5 * x * x;
const F_PRIME_A = 1; // f'(1) = 1

const H_INIT = 2.0;
const H_MIN = -0.85; // so x_Q >= 0.15
const H_MAX = 2.0;  // so x_Q <= 3.0

const X_MIN = -0.3;
const X_MAX = 3.5;
const Y_MIN = -0.5;
const Y_MAX = 5.2;

/** Clamps h ensuring |h| >= 0.01 and within [H_MIN, H_MAX]. */
function clampH(v: number, prev = 0): number {
  const bounded = clamp(v, H_MIN, H_MAX);
  if (Math.abs(bounded) >= 0.01) return bounded;
  if (v > 0) return 0.01;
  if (v < 0) return -0.01;
  return prev >= 0 ? 0.01 : -0.01;
}

/** Formats an exact terminating decimal or integer cleanly. */
function formatExact(v: number): string {
  const r = Math.round(v * 100000) / 100000;
  const s = r.toFixed(4);
  return s.replace(/\.?0+$/, '') || '0';
}

/** Clips a line passing through (xP, yP) with slope m to the bounding box. */
function clipLine(
  xP: number,
  yP: number,
  m: number,
  x0: number,
  x1: number,
  y0: number,
  y1: number,
): [{ x: number; y: number }, { x: number; y: number }] | null {
  const pts: { x: number; y: number }[] = [];
  const add = (x: number, y: number) => {
    if (x >= x0 - 1e-5 && x <= x1 + 1e-5 && y >= y0 - 1e-5 && y <= y1 + 1e-5) {
      if (!pts.some((p) => Math.hypot(p.x - x, p.y - y) < 1e-4)) {
        pts.push({ x, y });
      }
    }
  };
  add(x0, yP + m * (x0 - xP));
  add(x1, yP + m * (x1 - xP));
  if (Math.abs(m) > 1e-9) {
    add(xP + (y0 - yP) / m, y0);
    add(xP + (y1 - yP) / m, y1);
  }
  if (pts.length >= 2) return [pts[0], pts[1]];
  return null;
}

const mount: Mount = (root) => {
  let h = H_INIT;

  const view = responsiveSvg(root, {
    label: 'Secant line through P(1, 0.5) and Q(1+h, f(1+h)) rotating onto the tangent line as h approaches 0',
    aspect: 0.62,
    minH: 260,
    maxH: 380,
  });
  const svgEl = view.el;

  // Visual layers
  const gridG = s('g', { class: 'grid' }, svgEl);
  const axesG = s('g', {}, svgEl);
  const axisX = s('line', { class: 'ax' }, axesG);
  const axisY = s('line', { class: 'ax' }, axesG);

  // Reference lines: drop lines and difference quotient triangle
  const dropP = s('line', { class: 'line-muted' }, svgEl);
  const dropQ = s('line', { class: 'line-muted' }, svgEl);
  const runLine = s('line', { class: 'edge' }, svgEl);
  const riseLine = s('line', { class: 'edge' }, svgEl);

  // Curve: y = 0.5 * x^2
  const curve = s('path', { class: 'curve' }, svgEl);

  // Tangent line (faint reference)
  const tangentLine = s('line', { class: 'line-muted' }, svgEl);
  const tangentLbl = label(svgEl, 0, 0, 'tangent', 'lbl', 'start');

  // Secant line (active accent line)
  const secantLine = s('line', { class: 'line-acc' }, svgEl);

  // Ticks and labels
  const ticksG = s('g', {}, svgEl);
  const labelsG = s('g', {}, svgEl);
  const runLbl = label(svgEl, 0, 0, '', 'lbl', 'middle');
  const riseLbl = label(svgEl, 0, 0, '', 'lbl', 'end');

  // Fixed point P
  const dotP = s('circle', { class: 'dot', r: 4.5 }, svgEl);
  const lblP = label(svgEl, 0, 0, 'P(1, 0.5)', 'lbl-fg', 'end');

  // Draggable handle Q on the curve
  let toX = scale(X_MIN, X_MAX, 0, 1);
  let toY = scale(Y_MIN, Y_MAX, 1, 0);

  const hd = handle(svgEl, {
    label: 'Point Q on curve at 1 + h',
    x: 0,
    y: 0,
    valueText: () => {
      const slope = 1 + h / 2;
      return `h ${formatExact(h)}, secant slope ${formatExact(slope)}`;
    },
    onDrag: (px) => {
      const curX = toX.invert(px);
      const rawH = curX - A;
      // Step to increments of 0.02 for clean numbers during drag
      const stepped = Math.round(rawH * 50) / 50;
      setH(clampH(stepped, h));
    },
    onKey: (dx, dy, big) => {
      const step = big ? 0.2 : 0.02;
      const delta = (dx !== 0 ? dx : dy) * step;
      setH(clampH(h + delta, h));
    },
  });
  hd.el.setAttribute('aria-valuemin', String(H_MIN));
  hd.el.setAttribute('aria-valuemax', String(H_MAX));

  const lblQ = label(svgEl, 0, 0, 'Q', 'lbl-acc', 'start');

  // Controls row: 'Shrink h' and 'Reset'
  const f = formula(root);
  const note = hDom('div', { class: 'fig-note' }, root);
  note.style.margin = '0.25rem 8px 0';
  const r = row(root);

  let cancelTween = () => {};

  button(r, 'Shrink h', () => {
    cancelTween();
    const fromH = h;
    let targetH = fromH / 2;
    if (Math.abs(targetH) < 0.01) {
      targetH = Math.sign(fromH) * 0.01;
    }
    cancelTween = tween((k) => {
      setH(lerp(fromH, targetH, k));
    }, 280);
  });

  button(r, 'Reset', () => {
    cancelTween();
    const fromH = h;
    cancelTween = tween((k) => {
      setH(lerp(fromH, H_INIT, k));
    }, 300);
  });

  function setH(newH: number) {
    h = clampH(newH, h);
    draw();
  }

  function draw() {
    const { W, H } = view;
    const pad = {
      l: clamp(Math.round(W * 0.08), 34, 44),
      r: clamp(Math.round(W * 0.06), 24, 34),
      t: 20,
      b: 32,
    };

    toX = scale(X_MIN, X_MAX, pad.l, W - pad.r);
    toY = scale(Y_MIN, Y_MAX, H - pad.b, pad.t);

    const x0 = toX(0);
    const y0 = toY(0);

    // Axes
    attr(axisX, { x1: toX(X_MIN), x2: toX(X_MAX), y1: y0, y2: y0 });
    attr(axisY, { x1: x0, x2: x0, y1: toY(Y_MIN), y2: toY(Y_MAX) });

    // Grid lines and ticks
    gridG.replaceChildren();
    ticksG.replaceChildren();
    labelsG.replaceChildren();

    for (let gx = 1; gx <= 3; gx++) {
      const px = toX(gx);
      s('line', { x1: px, x2: px, y1: toY(Y_MIN), y2: toY(Y_MAX) }, gridG);
      label(ticksG, px, y0 + 16, String(gx), 'lbl', 'middle');
    }
    for (let gy = 1; gy <= 4; gy++) {
      const py = toY(gy);
      s('line', { x1: toX(X_MIN), x2: toX(X_MAX), y1: py, y2: py }, gridG);
      label(ticksG, x0 - 6, py + 4, String(gy), 'lbl', 'end');
    }

    // Axis labels
    label(labelsG, toX(X_MAX) - 4, y0 + 16, 'x', 'lbl', 'end');
    label(labelsG, x0 - 10, toY(Y_MAX) + 4, 'y', 'lbl', 'end');

    // Curve: y = 0.5 * x^2
    const nSteps = 50;
    let dCurve = '';
    for (let i = 0; i <= nSteps; i++) {
      const cx = (i / nSteps) * 3.2;
      const cy = fn(cx);
      const px = toX(cx);
      const py = toY(cy);
      dCurve += (i === 0 ? 'M ' : ' L ') + px.toFixed(1) + ' ' + py.toFixed(1);
    }
    attr(curve, { d: dCurve });

    // Curve label
    label(labelsG, toX(2.8) - 10, toY(fn(2.8)) - 10, 'y = ½x²', 'lbl', 'end');

    // Tangent line through (1, 0.5) with slope 1
    const tSeg = clipLine(A, FA, F_PRIME_A, X_MIN, X_MAX, Y_MIN, Y_MAX);
    if (tSeg) {
      attr(tangentLine, {
        x1: toX(tSeg[0].x),
        y1: toY(tSeg[0].y),
        x2: toX(tSeg[1].x),
        y2: toY(tSeg[1].y),
      });
      // Position tangent label along the line in clear open region
      const tLblX = 1.8;
      attr(tangentLbl, {
        x: toX(tLblX) + 6,
        y: toY(FA + F_PRIME_A * (tLblX - A)) + 16,
      });
    }

    // Secant line through P(1, 0.5) and Q(1+h, f(1+h))
    const slope = 1 + h / 2;
    const sSeg = clipLine(A, FA, slope, X_MIN, X_MAX, Y_MIN, Y_MAX);
    if (sSeg) {
      const pLeft = sSeg[0].x < sSeg[1].x ? sSeg[0] : sSeg[1];
      const pRight = sSeg[0].x < sSeg[1].x ? sSeg[1] : sSeg[0];
      attr(secantLine, {
        x1: toX(pLeft.x),
        y1: toY(pLeft.y),
        x2: toX(pRight.x),
        y2: toY(pRight.y),
      });
    }

    // Fixed Point P: label placed above and left so lines never cross it
    const pxP = toX(A);
    const pyP = toY(FA);
    attr(dotP, { cx: pxP, cy: pyP });
    attr(lblP, { x: pxP - 12, y: pyP - 12 });

    // Moving Point Q
    const xQ = A + h;
    const yQ = fn(xQ);
    const pxQ = toX(xQ);
    const pyQ = toY(yQ);

    hd.move(pxQ, pyQ);
    attr(lblQ, {
      x: pxQ - 14,
      y: pyQ - 8,
      'text-anchor': 'end',
    });

    // Drop lines from P and Q to x-axis
    attr(dropP, { x1: pxP, x2: pxP, y1: pyP, y2: y0 });
    attr(dropQ, { x1: pxQ, x2: pxQ, y1: pyQ, y2: y0 });

    // Difference quotient triangle legs
    attr(runLine, { x1: pxP, x2: pxQ, y1: pyP, y2: pyP });
    attr(riseLine, { x1: pxQ, x2: pxQ, y1: pyP, y2: pyQ });

    // Triangle labels
    if (Math.abs(h) >= 0.35) {
      attr(runLbl, {
        x: (pxP + pxQ) / 2,
        y: pyP + (h > 0 ? 16 : -8),
        opacity: 1,
      });
      runLbl.textContent = `h = ${h > 0 ? '+' : ''}${formatExact(h)}`;

      attr(riseLbl, {
        x: pxQ + (h > 0 ? -10 : 10),
        y: (pyP + pyQ) / 2 + 4,
        'text-anchor': h > 0 ? 'end' : 'start',
        opacity: 1,
      });
      riseLbl.textContent = 'Δy';
    } else {
      attr(runLbl, { opacity: 0 });
      attr(riseLbl, { opacity: 0 });
    }

    // Live formula readout
    const mStr = formatExact(slope);
    const hStr = (h > 0 ? '+' : '') + formatExact(h);
    if (W >= 560) {
      f.set(
        `h = ${hStr}: \\quad \\text{slope} = \\frac{f(a+h) - f(a)}{h} = ${mStr}, \\quad \\lim_{h \\to 0} \\frac{f(a+h)-f(a)}{h} = f'(a) = 1`,
      );
    } else {
      f.set(
        `\\text{slope} = \\frac{f(a+h) - f(a)}{h} = ${mStr}, \\quad f'(a) = 1`,
      );
    }
    const errSlope = Math.abs(slope - F_PRIME_A);
    note.textContent = `For f(x) = ½x² at a = 1, the difference quotient simplifies algebraically to 1 + h/2 = ${mStr}. Shrinking |h| = ${formatExact(Math.abs(h))} toward 0 makes the discrepancy |h|/2 = ${formatExact(errSlope)} vanish as the secant line pivots onto the tangent slope f′(1) = 1.`;
  }

  view.onResize(draw);
  draw();
};

export default mount;
