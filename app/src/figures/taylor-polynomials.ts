// Interactive Taylor polynomials about 0 for sin(x), e^x, and ln(1+x).
// Displays f(x) and P_n(x), the error at draggable point x_0,
// and the interval of convergence (-1, 1] for ln(1+x).

import {
  responsiveSvg,
  s,
  attr,
  handle,
  row,
  button,
  slider,
  formula,
  tween,
  clamp,
  scale,
  label,
  lerp,
  tex,
  type Mount,
} from './lib';

type FuncKey = 'sin' | 'exp' | 'ln';

interface FuncDef {
  key: FuncKey;
  label: string;
  tex: string;
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  defaultX0: number;
  minX0: number;
  maxX0: number;
  xTicks: number[];
  yTicks: number[];
}

const DEFS: Record<FuncKey, FuncDef> = {
  sin: {
    key: 'sin',
    label: 'sin x',
    tex: '\\sin x',
    xMin: -6.5,
    xMax: 6.5,
    yMin: -2.2,
    yMax: 2.2,
    defaultX0: 1.8,
    minX0: -6.0,
    maxX0: 6.0,
    xTicks: [-6, -4, -2, 2, 4, 6],
    yTicks: [-2, -1, 1, 2],
  },
  exp: {
    key: 'exp',
    label: 'e^x',
    tex: 'e^x',
    xMin: -3.0,
    xMax: 2.5,
    yMin: -1.0,
    yMax: 8.5,
    defaultX0: 1.0,
    minX0: -2.8,
    maxX0: 2.2,
    xTicks: [-3, -2, -1, 1, 2],
    yTicks: [2, 4, 6, 8],
  },
  ln: {
    key: 'ln',
    label: 'ln(1+x)',
    tex: '\\ln(1+x)',
    xMin: -1.6,
    xMax: 2.6,
    yMin: -2.4,
    yMax: 2.2,
    defaultX0: 0.6,
    minX0: -0.85,
    maxX0: 2.4,
    xTicks: [-1, 1, 2],
    yTicks: [-2, -1, 1, 2],
  },
};

const FACT: number[] = [
  1, 1, 2, 6, 24, 120, 720, 5040, 40320, 362880, 3628800, 39916800, 479001600, 6227020800, 87178291200, 1307674368000,
  20922789888000,
];

const SUBSCRIPTS = ['₀', '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉'];
function toSub(n: number): string {
  return String(n)
    .split('')
    .map((c) => SUBSCRIPTS[+c] ?? c)
    .join('');
}

function evalF(func: FuncKey, x: number): number {
  if (func === 'sin') return Math.sin(x);
  if (func === 'exp') return Math.exp(x);
  if (func === 'ln') return x > -1 ? Math.log(1 + x) : NaN;
  return 0;
}

function evalPn(func: FuncKey, n: number, x: number): number {
  if (n === 0) return func === 'exp' ? 1 : 0;
  if (func === 'sin') {
    let sum = 0;
    for (let k = 0; 2 * k + 1 <= n; k++) {
      const p = 2 * k + 1;
      sum += (Math.pow(x, p) / FACT[p]) * (k % 2 === 0 ? 1 : -1);
    }
    return sum;
  }
  if (func === 'exp') {
    let sum = 0;
    for (let k = 0; k <= n; k++) {
      sum += Math.pow(x, k) / FACT[k];
    }
    return sum;
  }
  if (func === 'ln') {
    let sum = 0;
    for (let k = 1; k <= n; k++) {
      sum += (Math.pow(x, k) / k) * (k % 2 === 1 ? 1 : -1);
    }
    return sum;
  }
  return 0;
}

function formatError(err: number): string {
  if (err < 1e-12) return '0';
  if (err < 1e-4) {
    return err.toExponential(1).replace('e', '\\times 10^{') + '}';
  }
  if (err < 10) return err.toFixed(3);
  if (err < 1000) return err.toFixed(2);
  return err.toExponential(2).replace('e', '\\times 10^{') + '}';
}

function getFormulaTex(func: FuncKey, n: number, x0: number): string {
  let pTex = '';
  if (func === 'sin') {
    if (n === 0) pTex = '0';
    else if (n <= 2) pTex = 'x';
    else if (n <= 4) pTex = 'x - \\tfrac{x^3}{6}';
    else if (n <= 6) pTex = 'x - \\tfrac{x^3}{6} + \\tfrac{x^5}{120}';
    else pTex = 'x - \\tfrac{x^3}{6} + \\tfrac{x^5}{120} - \\cdots';
  } else if (func === 'exp') {
    if (n === 0) pTex = '1';
    else if (n === 1) pTex = '1 + x';
    else if (n === 2) pTex = '1 + x + \\tfrac{x^2}{2}';
    else pTex = '1 + x + \\tfrac{x^2}{2} + \\cdots';
  } else if (func === 'ln') {
    if (n === 0) pTex = '0';
    else if (n === 1) pTex = 'x';
    else if (n === 2) pTex = 'x - \\tfrac{x^2}{2}';
    else if (n === 3) pTex = 'x - \\tfrac{x^2}{2} + \\tfrac{x^3}{3}';
    else pTex = 'x - \\tfrac{x^2}{2} + \\tfrac{x^3}{3} - \\cdots';
  }

  const fVal = evalF(func, x0);
  const pnVal = evalPn(func, n, x0);
  const err = Math.abs(fVal - pnVal);
  const errStr = formatError(err);

  return `P_{${n}}(x) = ${pTex},\\; |f(x_0) - P_n(x_0)| = ${errStr}`;
}

const mount: Mount = (root) => {
  let currentFunc: FuncKey = 'sin';
  let n = 3;
  let x0 = DEFS.sin.defaultX0;

  const pad = { l: 36, r: 24, t: 22, b: 28 };
  const clipId = 'taylor-clip-' + Math.random().toString(36).slice(2, 9);

  const view = responsiveSvg(root, {
    label: 'Taylor polynomial approximations about zero',
    aspect: 0.55,
    minH: 260,
    maxH: 380,
  });
  const svgEl = view.el;

  // Defs & ClipPath to clip polynomial and curve to the plot box
  const defsEl = s('defs', {}, svgEl);
  const clipPathEl = s('clipPath', { id: clipId }, defsEl);
  const clipRect = s('rect', {}, clipPathEl);

  // Interval of convergence group for ln(1+x)
  const convG = s('g', {}, svgEl);
  const convBand = s('rect', { class: 'band' }, convG);
  const convLeftLine = s('line', { class: 'edge' }, convG);
  const convRightLine = s('line', { class: 'edge' }, convG);
  const convLeftCircle = s('circle', { class: 'dot-ring', r: 4 }, convG);
  const convRightCircle = s('circle', { class: 'dot-acc', r: 4 }, convG);
  const convLabel = label(convG, 0, 0, 'converges', 'lbl-acc', 'middle');
  const divLabel = label(convG, 0, 0, 'diverges', 'lbl', 'middle');

  // Axes and Grid
  const gridG = s('g', {}, svgEl);
  const axX = s('line', { class: 'ax' }, svgEl);
  const axY = s('line', { class: 'ax' }, svgEl);
  const ticksG = s('g', {}, svgEl);

  // Curves clipped to plot area
  const plotG = s('g', { 'clip-path': `url(#${clipId})` }, svgEl);
  const fPath = s('path', { class: 'curve' }, plotG);
  const pPath = s('path', { class: 'line-acc' }, plotG);

  // Point x0 markers & error line
  const pointG = s('g', {}, svgEl);
  const guideLine = s('line', { class: 'line-muted' }, pointG);
  const errorLine = s('line', { class: 'edge' }, pointG);
  const fDot = s('circle', { class: 'dot', r: 4 }, pointG);
  const pDot = s('circle', { class: 'dot-acc', r: 4 }, pointG);
  const x0Lbl = label(pointG, 0, 0, 'x₀', 'lbl-acc', 'middle');

  // Legend vertically stacked at top-left
  const legG = s('g', {}, svgEl);
  const legFLine = s('line', { class: 'curve' }, legG);
  const legFLbl = label(legG, 0, 0, 'f(x)', 'lbl-fg', 'start');
  const legPLine = s('line', { class: 'line-acc' }, legG);
  const legPLbl = label(legG, 0, 0, 'P_n(x)', 'lbl-acc', 'start');

  // Draggable handle along x-axis
  const hdX = handle(svgEl, {
    label: 'Point x₀',
    x: 0,
    y: 0,
    r: 7,
    valueText: () => `x₀ = ${x0.toFixed(2)}, |f(x₀) - P_${n}(x₀)| = ${Math.abs(evalF(currentFunc, x0) - evalPn(currentFunc, n, x0)).toFixed(4)}`,
    onDrag: (px, _py) => {
      const def = DEFS[currentFunc];
      const curXScale = scale(def.xMin, def.xMax, pad.l, view.W - pad.r);
      setX0(curXScale.invert(px));
    },
    onKey: (dx, _dy, big) => {
      setX0(x0 + dx * (big ? 0.2 : 0.05));
    },
  });

  // Formula readout
  const fFormula = formula(root);
  fFormula.el.style.fontSize = '0.86rem';

  // Controls row
  const rControls = row(root);

  // Function buttons
  const btnSin = button(rControls, '', () => selectFunc('sin'));
  tex(btnSin, '\\sin x');
  btnSin.setAttribute('aria-label', 'sin x');

  const btnExp = button(rControls, '', () => selectFunc('exp'));
  tex(btnExp, 'e^x');
  btnExp.setAttribute('aria-label', 'e^x');

  const btnLn = button(rControls, '', () => selectFunc('ln'));
  tex(btnLn, '\\ln(1+x)');
  btnLn.setAttribute('aria-label', 'ln(1+x)');

  function updateButtons() {
    btnSin.setAttribute('aria-pressed', String(currentFunc === 'sin'));
    btnExp.setAttribute('aria-pressed', String(currentFunc === 'exp'));
    btnLn.setAttribute('aria-pressed', String(currentFunc === 'ln'));
  }
  updateButtons();

  // Degree slider n = 0..15
  const degSlider = slider(rControls, {
    label: 'Degree n',
    texLabel: 'n',
    min: 0,
    max: 15,
    step: 1,
    value: n,
    format: (v) => String(v),
    onInput: (v) => {
      n = Math.round(v);
      draw();
    },
  });

  // Reset button
  button(rControls, 'Reset', () => {
    const fromN = n;
    const fromX0 = x0;
    const targetN = 3;
    const targetX0 = DEFS[currentFunc].defaultX0;
    tween((k) => {
      n = Math.round(lerp(fromN, targetN, k));
      degSlider.set(n);
      x0 = lerp(fromX0, targetX0, k);
      draw();
    }, 300);
  });

  function setX0(val: number) {
    const def = DEFS[currentFunc];
    x0 = clamp(val, def.minX0, def.maxX0);
    draw();
  }

  function selectFunc(key: FuncKey) {
    if (currentFunc === key) return;
    currentFunc = key;
    updateButtons();
    x0 = DEFS[key].defaultX0;
    draw();
  }

  function draw() {
    const { W, H } = view;
    const def = DEFS[currentFunc];

    const xLeft = pad.l;
    const xRight = W - pad.r;
    const yTop = pad.t;
    const yBottom = H - pad.b;

    attr(clipRect, {
      x: xLeft,
      y: yTop,
      width: Math.max(0, xRight - xLeft),
      height: Math.max(0, yBottom - yTop),
    });

    const xScale = scale(def.xMin, def.xMax, xLeft, xRight);
    const yScale = scale(def.yMin, def.yMax, yBottom, yTop);

    const xAx = xScale(0);
    const yAx = yScale(0);

    // Axes lines
    attr(axX, { x1: xLeft, x2: xRight, y1: yAx, y2: yAx });
    attr(axY, { x1: xAx, x2: xAx, y1: yTop, y2: yBottom });

    // Grid and ticks
    gridG.replaceChildren();
    ticksG.replaceChildren();

    // Use sparser x-ticks on small screens
    const xTicks =
      currentFunc === 'sin' && W < 500 ? [-4, -2, 2, 4] : def.xTicks;

    for (const gx of xTicks) {
      const px = xScale(gx);
      if (px >= xLeft + 16 && px <= xRight - 16) {
        s('line', { class: 'grid', x1: px, x2: px, y1: yTop, y2: yBottom }, gridG);
        label(ticksG, px, yAx + 14, String(gx), 'lbl', 'middle');
      }
    }

    for (const gy of def.yTicks) {
      const py = yScale(gy);
      if (py >= yTop + 8 && py <= yBottom - 8) {
        s('line', { class: 'grid', x1: xLeft, x2: xRight, y1: py, y2: py }, gridG);
        label(ticksG, xAx - 6, py + 4, String(gy), 'lbl', 'end');
      }
    }
    // Origin 0
    label(ticksG, xAx - 6, yAx + 14, '0', 'lbl', 'end');

    // Interval of convergence for ln(1+x)
    if (currentFunc === 'ln') {
      convG.style.display = '';
      const xConvL = xScale(-1);
      const xConvR = xScale(1);
      attr(convBand, {
        x: xConvL,
        y: yTop,
        width: Math.max(0, xConvR - xConvL),
        height: yBottom - yTop,
      });
      attr(convLeftLine, { x1: xConvL, x2: xConvL, y1: yTop, y2: yBottom });
      attr(convRightLine, { x1: xConvR, x2: xConvR, y1: yTop, y2: yBottom });
      attr(convLeftCircle, { cx: xConvL, cy: yAx });
      attr(convRightCircle, { cx: xConvR, cy: yAx });
      attr(convLabel, { x: xScale(0.55), y: yTop + 26 });
      attr(divLabel, { x: xScale(1.8), y: yTop + 26 });
    } else {
      convG.style.display = 'none';
    }

    // Sample curves
    const steps = 180;
    const dx = (def.xMax - def.xMin) / steps;

    // True curve f(x)
    let fD = '';
    const startX = currentFunc === 'ln' ? Math.max(def.xMin, -0.96) : def.xMin;
    let startedF = false;

    for (let i = 0; i <= steps; i++) {
      const xVal = def.xMin + i * dx;
      if (xVal < startX) continue;
      const yVal = evalF(currentFunc, xVal);
      if (isNaN(yVal)) continue;
      const px = xScale(xVal);
      const py = clamp(yScale(yVal), yTop - 400, yBottom + 400);
      if (!startedF) {
        fD += `M ${px.toFixed(1)} ${py.toFixed(1)}`;
        startedF = true;
      } else {
        fD += ` L ${px.toFixed(1)} ${py.toFixed(1)}`;
      }
    }
    attr(fPath, { d: fD });

    // Polynomial curve P_n(x)
    let pD = '';
    let startedP = false;
    for (let i = 0; i <= steps; i++) {
      const xVal = def.xMin + i * dx;
      const yVal = evalPn(currentFunc, n, xVal);
      const px = xScale(xVal);
      const py = clamp(yScale(yVal), yTop - 400, yBottom + 400);
      if (!startedP) {
        pD += `M ${px.toFixed(1)} ${py.toFixed(1)}`;
        startedP = true;
      } else {
        pD += ` L ${px.toFixed(1)} ${py.toFixed(1)}`;
      }
    }
    attr(pPath, { d: pD });

    // Point x0 markers & error line
    const x0Clamped = clamp(x0, def.minX0, def.maxX0);
    const px0 = xScale(x0Clamped);
    const fVal0 = evalF(currentFunc, x0Clamped);
    const pnVal0 = evalPn(currentFunc, n, x0Clamped);
    const pyF = yScale(fVal0);
    const pyPn = yScale(pnVal0);

    hdX.move(px0, yAx);
    hdX.el.setAttribute('aria-valuemin', String(def.minX0));
    hdX.el.setAttribute('aria-valuemax', String(def.maxX0));
    hdX.el.setAttribute('aria-valuenow', x0Clamped.toFixed(2));

    attr(x0Lbl, { x: px0, y: yAx - 12 });

    // Guideline from axis to points
    const minPy = Math.min(yAx, pyF, clamp(pyPn, yTop, yBottom));
    const maxPy = Math.max(yAx, pyF, clamp(pyPn, yTop, yBottom));
    attr(guideLine, { x1: px0, x2: px0, y1: minPy, y2: maxPy });

    // Error line between f(x0) and P_n(x0)
    const errY1 = clamp(pyF, yTop, yBottom);
    const errY2 = clamp(pyPn, yTop, yBottom);
    attr(errorLine, { x1: px0, x2: px0, y1: errY1, y2: errY2 });

    // Dots at f(x0) and P_n(x0)
    attr(fDot, { cx: px0, cy: pyF });
    const pnInView = pyPn >= yTop && pyPn <= yBottom;
    attr(pDot, { cx: px0, cy: clamp(pyPn, yTop, yBottom), opacity: pnInView ? 1 : 0.3 });

    // Legend vertically stacked at top-left
    const legX = xLeft + 8;
    const legY = yTop + 14;
    attr(legFLine, { x1: legX, x2: legX + 16, y1: legY - 4, y2: legY - 4 });
    attr(legFLbl, { x: legX + 22, y: legY });
    legFLbl.textContent = `f(x)`;

    attr(legPLine, { x1: legX, x2: legX + 16, y1: legY + 12, y2: legY + 12 });
    attr(legPLbl, { x: legX + 22, y: legY + 16 });
    legPLbl.textContent = `P${toSub(n)}(x)`;

    // Update formula
    fFormula.set(getFormulaTex(currentFunc, n, x0Clamped));
  }

  view.onResize(draw);
  draw();
};

export default mount;
