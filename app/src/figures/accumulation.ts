// Chapter 21, Fundamental Theorem of Calculus: accumulation function A(x)
// and its derivative A'(x) = f(x).
//
// Top panel: f(t) = sin(t) on [0, 2π] with area shaded from a = 0 to x.
// Positive and negative signed areas are distinguished by opacity.
// Bottom panel: A(x) = ∫_0^x f(t) dt = 1 - cos(x) drawn up to x, with a dot at
// (x, A(x)) and a tangent line of slope f(x).

import {
  responsiveSvg,
  s,
  h,
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

const X0 = 3.8;
const XMIN = 0;
const XMAX = 2 * Math.PI;

const fixZero = (v: number) => (Math.abs(v) < 1e-4 ? 0 : v);

const mount: Mount = (root) => {
  let xVal = X0;
  const pad = { l: 42, r: 24, t: 24, b: 26 };

  const view = responsiveSvg(root, {
    label:
      'Fundamental Theorem of Calculus: accumulation function A(x) = integral of sin(t) from 0 to x and its derivative A prime of x = sin(x)',
    aspect: 0.82,
    minH: 320,
    maxH: 420,
  });
  const svgEl = view.el;

  // Clip path to keep the tangent line strictly inside the bottom panel
  const defs = s('defs', {}, svgEl);
  const clipId = 'accum-bot-clip-' + Math.random().toString(36).slice(2, 8);
  const clip = s('clipPath', { id: clipId }, defs);
  const clipRect = s('rect', {}, clip);

  // --- Top panel (f(t) = sin t) elements ---
  const topTitle = label(svgEl, 0, 0, 'f(t) = sin t', 'lbl-fg', 'start');
  const axTopX = s('line', { class: 'ax' }, svgEl);
  const axTopY = s('line', { class: 'ax' }, svgEl);
  const topTicksG = s('g', {}, svgEl);

  const areaPos = s('path', { class: 'band-pos' }, svgEl);
  const areaNeg = s('path', { class: 'band-neg' }, svgEl);
  const curveTop = s('path', { class: 'curve' }, svgEl);

  // --- Connecting wall (x) ---
  const wallLine = s('line', { class: 'line-muted' }, svgEl);
  const wallLabel = label(svgEl, 0, 0, 'x', 'lbl-acc', 'middle');

  // --- Bottom panel (A(x) = 1 - cos x) elements ---
  const botTitle = label(svgEl, 0, 0, 'A(x) = ∫₀ˣ f(t) dt', 'lbl-fg', 'start');
  const axBotX = s('line', { class: 'ax' }, svgEl);
  const axBotY = s('line', { class: 'ax' }, svgEl);
  const botTicksG = s('g', {}, svgEl);

  const curveBotGuide = s('path', { class: 'curve-muted' }, svgEl);
  const curveBotAcc = s('path', { class: 'curve-acc' }, svgEl);
  const tangentLine = s('line', { class: 'line-acc', 'clip-path': `url(#${clipId})` }, svgEl);
  const dotRing = s('circle', { class: 'dot-ring', r: 7 }, svgEl);
  const dotA = s('circle', { class: 'dot-acc', r: 4 }, svgEl);

  // Draggable handle at (x, f(x)) on top panel
  const hd = handle(svgEl, {
    label: 'Sliding wall x',
    x: 0,
    y: 0,
    valueText: () =>
      `x = ${xVal.toFixed(2)}, A(x) = ${(1 - Math.cos(xVal)).toFixed(2)}, f(x) = ${Math.sin(xVal).toFixed(2)}`,
    onDrag: (px) => setX(scale(pad.l, view.W - pad.r, XMIN, XMAX)(px)),
    onKey: (dx, _dy, big) => setX(xVal + dx * (big ? 0.2 : 0.05)),
  });
  hd.el.setAttribute('aria-valuemin', '0');
  hd.el.setAttribute('aria-valuemax', XMAX.toFixed(2));

  // Controls & Formula
  const f = formula(root);
  const r = row(root);
  h('span', { class: 'spacer' }, r);
  button(r, 'Reset', () => {
    const from = xVal;
    tween((k) => setX(lerp(from, X0, k)));
  });

  function setX(v: number) {
    xVal = clamp(v, XMIN, XMAX);
    draw();
  }

  function draw() {
    const { W, H } = view;
    const x0 = pad.l;
    const x1 = W - pad.r;

    const xScale = scale(XMIN, XMAX, x0, x1);

    // Top panel vertical coordinates: y in [-1.25, 1.25]
    const Y_top0 = pad.t + 6;
    const Y_top1 = Math.round(H * 0.44);
    const yTop = scale(-1.25, 1.25, Y_top1, Y_top0);
    const yTopZero = yTop(0);

    // Bottom panel vertical coordinates: A in [-0.2, 2.25]
    const Y_bot0 = Math.round(H * 0.56);
    const Y_bot1 = H - pad.b;
    const yBot = scale(-0.2, 2.25, Y_bot1, Y_bot0);
    const yBotZero = yBot(0);

    attr(clipRect, {
      x: x0 - 4,
      y: Y_bot0 - 4,
      width: x1 - x0 + 8,
      height: Y_bot1 - Y_bot0 + 8,
    });

    // --- Titles ---
    attr(topTitle, { x: x0, y: Y_top0 - 10 });
    attr(botTitle, { x: x0, y: Y_bot0 - 10 });

    // --- Top axes & ticks ---
    attr(axTopX, { x1: x0 - 8, x2: x1 + 8, y1: yTopZero, y2: yTopZero });
    attr(axTopY, { x1: x0, x2: x0, y1: Y_top0 - 4, y2: Y_top1 + 4 });

    topTicksG.replaceChildren();
    // Y ticks on top panel
    label(topTicksG, x0 - 8, yTop(1) + 4, '+1', 'lbl', 'end');
    label(topTicksG, x0 - 8, yTop(0) + 4, '0', 'lbl', 'end');
    label(topTicksG, x0 - 8, yTop(-1) + 4, '−1', 'lbl', 'end');
    s('line', { class: 'ax', x1: x0 - 4, x2: x0, y1: yTop(1), y2: yTop(1) }, topTicksG);
    s('line', { class: 'ax', x1: x0 - 4, x2: x0, y1: yTop(-1), y2: yTop(-1) }, topTicksG);

    // --- Top curve f(t) = sin t ---
    const topPts: string[] = [];
    const N_STEPS = 80;
    for (let i = 0; i <= N_STEPS; i++) {
      const t = (i / N_STEPS) * XMAX;
      topPts.push(`${xScale(t).toFixed(1)},${yTop(Math.sin(t)).toFixed(1)}`);
    }
    attr(curveTop, { d: 'M ' + topPts.join(' L ') });

    // --- Shaded areas ---
    // Positive area: [0, min(xVal, π)]
    const tPosEnd = Math.min(xVal, Math.PI);
    if (tPosEnd > 0.02) {
      const nPos = Math.max(8, Math.ceil(tPosEnd * 15));
      const posPts: string[] = [`${xScale(0).toFixed(1)},${yTopZero.toFixed(1)}`];
      for (let i = 0; i <= nPos; i++) {
        const t = (i / nPos) * tPosEnd;
        posPts.push(`${xScale(t).toFixed(1)},${yTop(Math.sin(t)).toFixed(1)}`);
      }
      posPts.push(`${xScale(tPosEnd).toFixed(1)},${yTopZero.toFixed(1)}`);
      attr(areaPos, { d: 'M ' + posPts.join(' L ') + ' Z' });
    } else {
      attr(areaPos, { d: '' });
    }

    // Negative area: [π, xVal] when xVal > π
    if (xVal > Math.PI + 0.02) {
      const nNeg = Math.max(8, Math.ceil((xVal - Math.PI) * 15));
      const negPts: string[] = [`${xScale(Math.PI).toFixed(1)},${yTopZero.toFixed(1)}`];
      for (let i = 0; i <= nNeg; i++) {
        const t = Math.PI + (i / nNeg) * (xVal - Math.PI);
        negPts.push(`${xScale(t).toFixed(1)},${yTop(Math.sin(t)).toFixed(1)}`);
      }
      negPts.push(`${xScale(xVal).toFixed(1)},${yTopZero.toFixed(1)}`);
      attr(areaNeg, { d: 'M ' + negPts.join(' L ') + ' Z' });
    } else {
      attr(areaNeg, { d: '' });
    }

    // --- Bottom axes & ticks ---
    attr(axBotX, { x1: x0 - 8, x2: x1 + 8, y1: yBotZero, y2: yBotZero });
    attr(axBotY, { x1: x0, x2: x0, y1: Y_bot0 - 4, y2: Y_bot1 + 4 });

    botTicksG.replaceChildren();
    // Y ticks on bottom panel
    label(botTicksG, x0 - 8, yBot(2) + 4, '2', 'lbl', 'end');
    label(botTicksG, x0 - 8, yBot(1) + 4, '1', 'lbl', 'end');
    label(botTicksG, x0 - 8, yBot(0) + 4, '0', 'lbl', 'end');
    s('line', { class: 'ax', x1: x0 - 4, x2: x0, y1: yBot(2), y2: yBot(2) }, botTicksG);
    s('line', { class: 'ax', x1: x0 - 4, x2: x0, y1: yBot(1), y2: yBot(1) }, botTicksG);

    // X ticks on bottom panel
    const xPi = xScale(Math.PI);
    const x2Pi = xScale(2 * Math.PI);
    s('line', { class: 'ax', x1: xPi, x2: xPi, y1: yBotZero, y2: yBotZero + 4 }, botTicksG);
    label(botTicksG, xPi, yBotZero + 18, 'π', 'lbl', 'middle');
    s('line', { class: 'ax', x1: x2Pi, x2: x2Pi, y1: yBotZero, y2: yBotZero + 4 }, botTicksG);
    label(botTicksG, x2Pi, yBotZero + 18, '2π', 'lbl', 'middle');

    // --- Bottom curves ---
    // Full guide curve A(t) = 1 - cos(t)
    const botGuidePts: string[] = [];
    for (let i = 0; i <= N_STEPS; i++) {
      const t = (i / N_STEPS) * XMAX;
      botGuidePts.push(`${xScale(t).toFixed(1)},${yBot(1 - Math.cos(t)).toFixed(1)}`);
    }
    attr(curveBotGuide, { d: 'M ' + botGuidePts.join(' L ') });

    // Accumulated curve up to xVal
    const curA = 1 - Math.cos(xVal);
    const curF = Math.sin(xVal);
    const nAcc = Math.max(6, Math.ceil(xVal * 15));
    const botAccPts: string[] = [];
    for (let i = 0; i <= nAcc; i++) {
      const t = (i / nAcc) * xVal;
      botAccPts.push(`${xScale(t).toFixed(1)},${yBot(1 - Math.cos(t)).toFixed(1)}`);
    }
    attr(curveBotAcc, { d: 'M ' + botAccPts.join(' L ') });

    // --- Dot and Tangent line at (x, A(x)) ---
    const xPx = xScale(xVal);
    const yDot = yBot(curA);
    attr(dotA, { cx: xPx, cy: yDot });
    attr(dotRing, { cx: xPx, cy: yDot });

    // Tangent line: slope is curF = sin(xVal)
    // In math coordinates: y - curA = curF * (t - xVal)
    const dt = 0.85;
    const tL = xVal - dt;
    const tR = xVal + dt;
    const yL = curA - curF * dt;
    const yR = curA + curF * dt;
    attr(tangentLine, {
      x1: xScale(tL).toFixed(1),
      y1: yBot(yL).toFixed(1),
      x2: xScale(tR).toFixed(1),
      y2: yBot(yR).toFixed(1),
    });

    // --- Vertical wall at x ---
    attr(wallLine, {
      x1: xPx,
      x2: xPx,
      y1: Y_top0 - 2,
      y2: yBotZero,
    });
    attr(wallLabel, { x: xPx, y: Y_top0 - 10 });

    // --- Move handle on top panel ---
    hd.move(xPx, yTop(curF));

    // --- Live formula ---
    const fShown = fixZero(curF);
    const aShown = fixZero(curA);
    f.set(
      `A(x) = ${aShown.toFixed(2)}, \\quad A'(x) = f(x) = ${fShown.toFixed(2)}`,
    );
  }

  view.onResize(draw);
  draw();
};

export default mount;
