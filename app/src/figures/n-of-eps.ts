// Chapter 20, figure: n-of-eps
// N is a function of epsilon for the sequence a_n = 1/n.
// N(ε) = floor(1/ε) + 1. The reader drags the tolerance ε on a log-scaled axis;
// a dot tracks the staircase function with dashed guide lines to both axes.
// 'Halve ε' tweens ε to ε/2, demonstrating how N roughly doubles.

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
  type Mount,
} from './lib';

const E0 = 0.4;
const EMIN = 0.02;
const EMAX = 1.0;
const MAX_N = 54;

// |1/n - 0| = 1/n < ε  ⇔  n > 1/ε, so least N is floor(1/ε) + 1.
const needN = (e: number) => Math.floor(1 / e + 1e-9) + 1;

function formatEps(e: number): string {
  if (Math.abs(e - Math.round(e * 100) / 100) < 1e-4) {
    return e.toFixed(2);
  }
  return e.toFixed(3);
}

const mount: Mount = (root) => {
  let eps = E0;
  const pad = { l: 42, r: 28, t: 26, b: 38 };

  const view = responsiveSvg(root, {
    label: 'Staircase graph of N as a function of epsilon for the sequence 1/n',
    aspect: 0.65,
    minH: 260,
    maxH: 360,
  });
  const svgEl = view.el;

  // Background grid and staircase path
  const gridG = s('g', {}, svgEl);
  const staircase = s('path', { class: 'curve' }, svgEl);

  // Guide lines and active point
  const vGuide = s('line', { class: 'edge' }, svgEl);
  const hGuide = s('line', { class: 'edge' }, svgEl);
  const nAxisDot = s('circle', { class: 'dot-acc', r: 3.5 }, svgEl);
  const pointRing = s('circle', { class: 'dot-ring', r: 7.5 }, svgEl);
  const pointDot = s('circle', { class: 'dot-acc', r: 4.5 }, svgEl);
  const pointLbl = label(svgEl, 0, 0, '', 'lbl-acc', 'start');

  // Axes lines and labels
  const xAxis = s('line', { class: 'ax' }, svgEl);
  const yAxis = s('line', { class: 'ax' }, svgEl);
  const xTitle = label(svgEl, 0, 0, 'ε', 'lbl-fg', 'start');
  const yTitle = label(svgEl, 0, 0, 'N', 'lbl-fg', 'middle');
  const ticksG = s('g', {}, svgEl);

  let xSc = scale(Math.log10(EMIN), Math.log10(EMAX), 0, 1);
  let ySc = scale(1, MAX_N, 1, 0);

  const hd = handle(svgEl, {
    label: 'Tolerance epsilon',
    x: 0,
    y: 0,
    r: 7.5,
    valueText: () => `epsilon ${formatEps(eps)}, N ${needN(eps)}`,
    onDrag: (px) => {
      const logVal = clamp(xSc.invert(px), Math.log10(EMIN), Math.log10(EMAX));
      setEps(Math.pow(10, logVal));
    },
    onKey: (dx, dy, big) => {
      const step = dx !== 0 ? dx : dy;
      const factor = big ? 1.15 : 1.03;
      if (step > 0) setEps(eps * factor);
      else if (step < 0) setEps(eps / factor);
    },
  });
  hd.el.setAttribute('aria-valuemin', String(EMIN));
  hd.el.setAttribute('aria-valuemax', String(EMAX));

  const f = formula(root);
  const r = row(root);
  const halveBtn = button(r, 'Halve ε', () => halve());
  button(r, 'Reset', () => reset());

  let animCancel = () => {};

  function halve() {
    animCancel();
    const from = eps;
    const target = Math.max(EMIN, eps / 2);
    const fromLog = Math.log10(from);
    const targetLog = Math.log10(target);
    animCancel = tween((k) => {
      setEps(Math.pow(10, lerp(fromLog, targetLog, k)));
    }, 350);
  }

  function reset() {
    animCancel();
    const from = eps;
    const fromLog = Math.log10(from);
    const targetLog = Math.log10(E0);
    animCancel = tween((k) => {
      setEps(Math.pow(10, lerp(fromLog, targetLog, k)));
    }, 350);
  }

  function setEps(v: number) {
    eps = clamp(v, EMIN, EMAX);
    halveBtn.disabled = eps <= EMIN + 1e-4;
    draw();
  }

  function draw() {
    const { W, H } = view;
    const axisY = H - pad.b;
    const plotBottom = axisY - 14;
    const plotTop = pad.t;

    xSc = scale(Math.log10(EMIN), Math.log10(EMAX), pad.l, W - pad.r);
    ySc = scale(1, MAX_N, plotBottom, plotTop);

    const xPos = (e: number) => xSc(Math.log10(e));
    const yPos = (n: number) => ySc(n);

    // Grid lines and ticks
    gridG.replaceChildren();
    ticksG.replaceChildren();

    // Horizontal grid & ticks for N (10, 20, 30, 40, 50)
    for (let n = 10; n <= 50; n += 10) {
      const y = yPos(n);
      s('line', { class: 'grid', x1: pad.l, x2: W - pad.r, y1: y, y2: y }, gridG);
      label(ticksG, pad.l - 8, y + 4, String(n), 'lbl', 'end');
    }

    // Vertical grid & ticks for ε (0.02, 0.05, 0.1, 0.2, 0.5, 1.0)
    const epsTicks = [0.02, 0.05, 0.1, 0.2, 0.5, 1];
    for (const e of epsTicks) {
      const x = xPos(e);
      s('line', { class: 'grid', x1: x, x2: x, y1: plotTop, y2: axisY }, gridG);
      s('line', { class: 'ax', x1: x, x2: x, y1: axisY, y2: axisY + 4 }, ticksG);
      label(ticksG, x, axisY + 18, String(e), 'lbl', 'middle');
    }

    // Axes
    attr(xAxis, { x1: pad.l, x2: W - pad.r, y1: axisY, y2: axisY });
    attr(yAxis, { x1: pad.l, x2: pad.l, y1: plotTop, y2: axisY });
    attr(xTitle, { x: W - pad.r + 12, y: axisY + 4 });
    attr(yTitle, { x: pad.l, y: plotTop - 10 });

    // Staircase path:
    // For each integer k from 2 to 50, N = k on (1/k, 1/(k-1)].
    // At ε = 1/k, the function jumps to k + 1.
    // At ε = 0.02, N = 51.
    let d = `M ${xPos(1)} ${yPos(2)}`;
    for (let k = 2; k <= 50; k++) {
      const epsLeft = Math.max(EMIN, 1 / k);
      d += ` H ${xPos(epsLeft)} V ${yPos(k + 1)}`;
    }
    staircase.setAttribute('d', d);

    // Active state
    const N = needN(eps);
    const curX = xPos(eps);
    const curY = yPos(N);

    // Guides
    attr(vGuide, { x1: curX, x2: curX, y1: curY, y2: axisY });
    attr(hGuide, { x1: pad.l, x2: curX, y1: curY, y2: curY });
    attr(nAxisDot, { cx: pad.l, cy: curY });
    attr(pointRing, { cx: curX, cy: curY });
    attr(pointDot, { cx: curX, cy: curY });

    // Point label: display N = value next to dot, avoiding clip
    const isNearRight = curX > W - pad.r - 50;
    const lblX = isNearRight ? curX - 10 : curX + 10;
    const anchor = isNearRight ? 'end' : 'start';
    attr(pointLbl, { x: lblX, y: curY - 9, 'text-anchor': anchor });
    pointLbl.textContent = `N = ${N}`;

    // Handle on epsilon axis
    hd.move(curX, axisY);
    hd.el.setAttribute('aria-valuenow', eps.toFixed(3));

    // Live formula
    const epsStr = formatEps(eps);
    f.set(
      `N(\\varepsilon) = \\lfloor 1/\\varepsilon \\rfloor + 1 = \\lfloor 1/${epsStr} \\rfloor + 1 = ${N}`,
    );
  }

  view.onResize(draw);
  draw();

  return () => {
    animCancel();
  };
};

export default mount;
