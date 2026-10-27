// Chapter 20, figure: lln-running-mean
// The Law of Large Numbers demonstrated by fair coin flips.
// A seeded PRNG (mulberry32) provides a reproducible sequence.
// The reader appends flips with 'Flip 10', 'Flip 100', 'Flip 1000' buttons
// plotted on a logarithmic scale from 1 to 10,000.
// An adjustable ε tolerance band highlights the last flip where the path
// was outside the band, showing almost-sure convergence into the corridor.

import {
  responsiveSvg,
  s,
  attr,
  row,
  button,
  slider,
  formula,
  tween,
  clamp,
  scale,
  label,
  lerp,
  type Mount,
} from './lib';

const MAX_FLIPS = 10000;
const INITIAL_FLIPS = 20;
const INITIAL_SEED = 777;
const DEFAULT_EPS = 0.05;
const EMIN = 0.01;
const EMAX = 0.2;
const ESTEP = 0.01;

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const HALO = 'paint-order: stroke fill; stroke: var(--bg); stroke-width: 4px; stroke-linejoin: round;';

const mount: Mount = (root) => {
  let currentSeed = INITIAL_SEED;
  const heads = new Uint16Array(MAX_FLIPS + 1);

  function generateFlips(seed: number) {
    const prng = mulberry32(seed);
    let h = 0;
    heads[0] = 0;
    for (let i = 1; i <= MAX_FLIPS; i++) {
      if (prng() < 0.5) h++;
      heads[i] = h;
    }
  }

  generateFlips(currentSeed);

  let eps = DEFAULT_EPS;
  let displayN = INITIAL_FLIPS;
  let targetN = INITIAL_FLIPS;
  let cancelTween = () => {};

  const pad = { l: 42, r: 24, t: 32, b: 34 };

  const view = responsiveSvg(root, {
    label: 'Running proportion of heads for fair coin flips converging to 0.5 on a logarithmic scale',
    aspect: 0.52,
    minH: 260,
    maxH: 360,
  });
  const svgEl = view.el;

  // Background elements
  const gridG = s('g', {}, svgEl);
  const band = s('rect', { class: 'band' }, svgEl);
  const trappedTail = s('rect', { class: 'band-muted' }, svgEl);
  const topEdge = s('line', { class: 'edge' }, svgEl);
  const botEdge = s('line', { class: 'edge' }, svgEl);
  const topEdgeLbl = label(svgEl, 0, 0, '', 'lbl-acc', 'end');
  const botEdgeLbl = label(svgEl, 0, 0, '', 'lbl-acc', 'end');
  attr(topEdgeLbl, { style: HALO });
  attr(botEdgeLbl, { style: HALO });

  // Reference line p = 0.5
  const centerLine = s('line', { class: 'line-muted' }, svgEl);
  const centerLbl = label(svgEl, 0, 0, 'p = 0.5', 'lbl-fg', 'start');
  attr(centerLbl, { style: HALO });

  // Axes and ticks
  const yAxis = s('line', { class: 'ax' }, svgEl);
  const xAxis = s('line', { class: 'ax' }, svgEl);
  const ticksG = s('g', {}, svgEl);

  // Running mean curve
  const pathEl = s('path', { class: 'curve' }, svgEl);

  // Last escape marker
  const lastLine = s('line', { class: 'line-acc' }, svgEl);
  const lastRing = s('circle', { class: 'dot-ring', r: 6.5 }, svgEl);
  const lastDot = s('circle', { class: 'dot-acc', r: 3.5 }, svgEl);
  const lastLbl = label(svgEl, 0, 0, '', 'lbl-acc', 'middle');
  attr(lastLbl, { style: HALO });

  // Current tip dot
  const tipDot = s('circle', { class: 'dot', r: 3.5 }, svgEl);

  // KaTeX formula line under the figure
  const f = formula(root);
  f.el.style.fontSize = '0.92rem';

  // Controls: row 1 (action buttons)
  const rActions = row(root);
  const btnFlip10 = button(rActions, 'Flip 10', () => appendFlips(10));
  const btnFlip100 = button(rActions, 'Flip 100', () => appendFlips(100));
  const btnFlip1000 = button(rActions, 'Flip 1000', () => appendFlips(1000));

  // Controls: row 2 (parameters and reset)
  const rParams = row(root);
  const epsSlider = slider(rParams, {
    label: 'Tolerance ε',
    texLabel: '\\text{Tolerance }\\varepsilon',
    min: EMIN,
    max: EMAX,
    step: ESTEP,
    value: DEFAULT_EPS,
    format: (v) => v.toFixed(2),
    onInput: (v) => {
      eps = clamp(v, EMIN, EMAX);
      draw();
    },
  });

  button(rParams, 'New sequence', () => newSequence());
  button(rParams, 'Reset', () => reset());

  function updateButtonStates() {
    btnFlip10.disabled = targetN >= MAX_FLIPS;
    btnFlip100.disabled = targetN >= MAX_FLIPS;
    btnFlip1000.disabled = targetN >= MAX_FLIPS;
  }

  function appendFlips(count: number) {
    if (targetN >= MAX_FLIPS) return;
    cancelTween();
    const from = displayN;
    targetN = Math.min(MAX_FLIPS, targetN + count);
    updateButtonStates();
    cancelTween = tween((k) => {
      displayN = Math.round(lerp(from, targetN, k));
      draw();
    }, 300);
  }

  function newSequence() {
    cancelTween();
    currentSeed = (currentSeed * 1664525 + 1013904223) >>> 0;
    generateFlips(currentSeed);
    targetN = INITIAL_FLIPS;
    displayN = INITIAL_FLIPS;
    updateButtonStates();
    draw();
  }

  function reset() {
    cancelTween();
    currentSeed = INITIAL_SEED;
    generateFlips(currentSeed);
    const fromN = displayN;
    const fromEps = eps;
    targetN = INITIAL_FLIPS;
    updateButtonStates();
    cancelTween = tween((k) => {
      displayN = Math.round(lerp(fromN, INITIAL_FLIPS, k));
      eps = lerp(fromEps, DEFAULT_EPS, k);
      epsSlider.set(eps);
      draw();
    }, 300);
  }

  function draw() {
    const { W, H } = view;
    const x0 = pad.l;
    const x1 = W - pad.r;
    const y0 = H - pad.b;
    const y1 = pad.t;

    // Log-10 scale for n from 1 to 10,000 (4 orders of magnitude)
    const xLog = (n: number) => x0 + (Math.log10(clamp(n, 1, MAX_FLIPS)) / 4) * (x1 - x0);
    // Linear scale for running mean proportion in [0, 1]
    const yVal = scale(0, 1, y0, y1);

    // Axes
    attr(yAxis, { x1: x0, x2: x0, y1: y0, y2: y1 });
    attr(xAxis, { x1: x0, x2: x1, y1: y0, y2: y0 });

    // Grid and ticks
    gridG.replaceChildren();
    ticksG.replaceChildren();

    // Horizontal grid lines and Y ticks at 0, 0.25, 0.5, 0.75, 1
    const yTicks = [
      { val: 0, text: '0.0' },
      { val: 0.25, text: '0.25' },
      { val: 0.5, text: '0.5' },
      { val: 0.75, text: '0.75' },
      { val: 1, text: '1.0' },
    ];
    for (const { val, text } of yTicks) {
      const yPos = yVal(val);
      if (val !== 0 && val !== 0.5) {
        s('line', { class: 'grid', x1: x0, x2: x1, y1: yPos, y2: yPos }, gridG);
      }
      const yLabelOffset = val === 0 ? -2 : 4;
      label(ticksG, x0 - 6, yPos + yLabelOffset, text, 'lbl', 'end');
    }

    // Reference center line p = 0.5
    const yMid = yVal(0.5);
    attr(centerLine, { x1: x0, x2: x1, y1: yMid, y2: yMid });
    attr(centerLbl, { x: x0 + 8, y: yMid - 6 });

    // Vertical grid lines and X ticks at decades 1, 10, 100, 1000, 10000
    const decades = [1, 10, 100, 1000, 10000];
    for (const d of decades) {
      const xPos = xLog(d);
      if (d !== 1) {
        s('line', { class: 'grid', x1: xPos, x2: xPos, y1: y1, y2: y0 }, gridG);
      }
      const tickText = d === 1 ? 'n = 1' : d.toLocaleString('en-US');
      label(ticksG, xPos, y0 + 17, tickText, 'lbl', 'middle');
    }

    // Subtle intermediate decade marks
    const subDecades = [2, 5, 20, 50, 200, 500, 2000, 5000];
    for (const sub of subDecades) {
      const xPos = xLog(sub);
      s('line', { class: 'grid', x1: xPos, x2: xPos, y1: y0 - 3, y2: y0 }, gridG);
    }

    // Epsilon tolerance band
    const yTop = yVal(0.5 + eps);
    const yBot = yVal(0.5 - eps);
    attr(band, { x: x0, width: x1 - x0, y: yTop, height: yBot - yTop });
    attr(topEdge, { x1: x0, x2: x1, y1: yTop, y2: yTop });
    attr(botEdge, { x1: x0, x2: x1, y1: yBot, y2: yBot });

    attr(topEdgeLbl, { x: x1 - 4, y: yTop - 4 });
    topEdgeLbl.textContent = `+ε`;
    attr(botEdgeLbl, { x: x1 - 4, y: yBot + 12 });
    botEdgeLbl.textContent = `−ε`;

    // Running mean curve
    let d = `M ${xLog(1).toFixed(1)} ${yVal(heads[1]).toFixed(1)}`;
    let lastX = xLog(1);
    let lastY = yVal(heads[1]);
    for (let i = 2; i <= displayN; i++) {
      const xi = xLog(i);
      const yi = yVal(heads[i] / i);
      if (i < displayN && Math.abs(xi - lastX) < 0.4 && Math.abs(yi - lastY) < 0.4) {
        continue;
      }
      d += ` L ${xi.toFixed(1)} ${yi.toFixed(1)}`;
      lastX = xi;
      lastY = yi;
    }
    attr(pathEl, { d });

    // Find the last index where |mean - 0.5| >= eps
    let lastOutside = 1;
    for (let i = displayN; i >= 1; i--) {
      if (Math.abs(heads[i] / i - 0.5) >= eps) {
        lastOutside = i;
        break;
      }
    }

    const xLast = xLog(lastOutside);
    const yLast = yVal(heads[lastOutside] / lastOutside);

    // Trapped tail (shaded corridor where path remains inside band)
    if (lastOutside < displayN) {
      const xCurr = xLog(displayN);
      attr(trappedTail, {
        x: xLast,
        width: Math.max(0, xCurr - xLast),
        y: yTop,
        height: yBot - yTop,
        style: 'display: block;',
      });
    } else {
      attr(trappedTail, { style: 'display: none;' });
    }

    // Last outside marker line & point
    attr(lastLine, {
      x1: xLast,
      x2: xLast,
      y1: y1,
      y2: y0,
      'stroke-dasharray': '3 3',
    });
    attr(lastRing, { cx: xLast, cy: yLast });
    attr(lastDot, { cx: xLast, cy: yLast });

    // Anchor and position last-outside label cleanly
    const lblX = clamp(xLast, x0 + 55, x1 - 55);
    attr(lastLbl, { x: lblX, y: y1 - 10 });
    lastLbl.textContent = `last outside: n = ${lastOutside}`;

    // Tip dot at current flip
    const xTip = xLog(displayN);
    const yTip = yVal(heads[displayN] / displayN);
    attr(tipDot, { cx: xTip, cy: yTip });

    // Update live formula
    const h = heads[displayN];
    const mean = h / displayN;
    const diff = Math.abs(mean - 0.5);
    const meanStr = mean.toFixed(displayN >= 10000 ? 4 : 3);
    const diffStr = diff.toFixed(displayN >= 10000 ? 4 : 3);
    f.set(
      `\\text{heads}/n = \\tfrac{${h}}{${displayN}} = ${meanStr},\\quad |\\bar X_n - 0.5| = ${diffStr}`,
    );
  }

  updateButtonStates();
  view.onResize(draw);
  draw();
};

export default mount;
