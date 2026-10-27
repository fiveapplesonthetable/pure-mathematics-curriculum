// Chapter 12: The Normal Distribution — normal-areas.
// Live density curve with sliders for mean μ and standard deviation σ.
// Draggable handles for interval bounds a < b, shading the area between.
// Exact Φ via Cody (1969) rational Chebyshev approximation.
// Quick buttons for the empirical 68–95–99.7 rule (±1σ, ±2σ, ±3σ).

import {
  responsiveSvg,
  s,
  h,
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
 * Cody (1969) rational Chebyshev approximations for erf and erfc.
 * Reference: W. J. Cody, "Rational Chebyshev Approximations for the Error Function",
 * Mathematics of Computation, 23(107): 631-637, 1969.
 * Accuracy: ~1e-16 across all floating-point inputs.
 */
function codyErfSmall(x: number): number {
  const A = [
    3.1611237438705656e0,
    1.1386415415105016e2,
    3.77485237685302e2,
    3.2093775891384695e3,
    1.8577770618460315e-1,
  ];
  const B = [
    2.360129095234412e1,
    2.4402463793444417e2,
    1.2826165260773723e3,
    2.844236833439171e3,
  ];
  const x2 = x * x;
  const num = (((A[4] * x2 + A[0]) * x2 + A[1]) * x2 + A[2]) * x2 + A[3];
  const den = (((x2 + B[0]) * x2 + B[1]) * x2 + B[2]) * x2 + B[3];
  return x * (num / den);
}

function codyErfcPositive(y: number): number {
  if (!Number.isFinite(y)) return 0;
  let scaled: number;
  if (y <= 4.0) {
    const C = [
      5.641884969886701e-1,
      8.883149794388376e0,
      6.611919063714163e1,
      2.986351381974001e2,
      8.81952221241769e2,
      1.7120476126340706e3,
      2.0510783778260715e3,
      1.2303393547979972e3,
      2.1531153547440385e-8,
    ];
    const D = [
      1.5744926110709835e1,
      1.176939508913125e2,
      5.371811018620099e2,
      1.6213895745666902e3,
      3.2907992357334596e3,
      4.362619090143247e3,
      3.4393676741437216e3,
      1.2303393548037494e3,
    ];
    let num = C[8] * y;
    let den = y;
    for (let i = 0; i < 7; i++) {
      num = (num + C[i]) * y;
      den = (den + D[i]) * y;
    }
    scaled = (num + C[7]) / (den + D[7]);
  } else {
    const P = [
      3.0532663496123234e-1,
      3.6034489994980444e-1,
      1.2578172611122925e-1,
      1.608378514874228e-2,
      6.587491615298378e-4,
      1.6315387137302098e-2,
    ];
    const Q = [
      2.568520192289822e0,
      1.8729528499234605e0,
      5.279051029514284e-1,
      6.051834131244132e-2,
      2.335204976268692e-3,
    ];
    const RECIPROCAL_SQRT_PI = 1 / Math.sqrt(Math.PI);
    const invY2 = 1.0 / (y * y);
    let num = P[5] * invY2;
    let den = invY2;
    for (let i = 0; i < 4; i++) {
      num = (num + P[i]) * invY2;
      den = (den + Q[i]) * invY2;
    }
    const ratio = (invY2 * (num + P[4])) / (den + Q[4]);
    scaled = (RECIPROCAL_SQRT_PI - ratio) / y;
  }
  const yRounded = Math.floor(y * 16.0) / 16.0;
  const delta = (y - yRounded) * (y + yRounded);
  return Math.exp(-yRounded * yRounded) * Math.exp(-delta) * scaled;
}

function erfc(x: number): number {
  if (Number.isNaN(x)) return NaN;
  const y = Math.abs(x);
  if (y <= 0.46875) return 1.0 - codyErfSmall(x);
  if (x > 0) return codyErfcPositive(y);
  return 2.0 - codyErfcPositive(y);
}

/** Standard normal CDF: Φ(z) = P(Z ≤ z) */
export function phi(z: number): number {
  return 0.5 * erfc(-z / Math.SQRT2);
}

const SQRT_2PI = Math.sqrt(2 * Math.PI);
function normalPdf(x: number, mu: number, sigma: number): number {
  const z = (x - mu) / sigma;
  return Math.exp(-0.5 * z * z) / (sigma * SQRT_2PI);
}

const mount: Mount = (root) => {
  let mu = 0.0;
  let sigma = 1.0;
  let a = -1.0;
  let b = 1.0;

  const pad = { l: 42, r: 24, t: 24, b: 36 };

  const view = responsiveSvg(root, {
    label: 'Normal density curve with draggable bounds a and b and sliders for mean and standard deviation',
    aspect: 0.52,
    minH: 240,
    maxH: 340,
  });
  const svgEl = view.el;

  // Background grid and structural groups
  const gridG = s('g', {}, svgEl);
  const bandPath = s('path', { class: 'band' }, svgEl);
  const curvePath = s('path', { class: 'curve' }, svgEl);
  const centerLine = s('line', { class: 'line-muted' }, svgEl);
  const edgeA = s('line', { class: 'edge' }, svgEl);
  const edgeB = s('line', { class: 'edge' }, svgEl);
  const axisX = s('line', { class: 'ax' }, svgEl);
  const axisY = s('line', { class: 'ax' }, svgEl);
  const originLine = s('line', { class: 'grid' }, svgEl);
  const xTicksG = s('g', {}, svgEl);
  const yTicksG = s('g', {}, svgEl);

  // Labels
  const lblMu = label(svgEl, 0, 0, 'μ', 'lbl-fg', 'middle');
  const lblA = label(svgEl, 0, 0, 'a', 'lbl-acc', 'end');
  const lblB = label(svgEl, 0, 0, 'b', 'lbl-acc', 'start');

  let xScale = scale(-7, 7, pad.l, view.W - pad.r);
  let yScale = scale(0, 1.45, view.H - pad.b, pad.t);

  function getXMax(): number {
    return Math.max(7, Math.ceil(Math.max(Math.abs(a), Math.abs(b), Math.abs(mu) + 3.2 * sigma)));
  }

  // Draggable handles for interval bounds a and b
  const handleA = handle(svgEl, {
    label: 'Left bound a',
    x: 0,
    y: 0,
    r: 7,
    valueText: () => `a = ${a.toFixed(2)}, z = ${((a - mu) / sigma).toFixed(2)}`,
    onDrag: (px) => {
      const xMax = getXMax();
      const val = xScale.invert(px);
      a = clamp(val, -xMax, b - 0.05);
      draw();
    },
    onKey: (dx, _dy, big) => {
      const xMax = getXMax();
      const step = big ? 0.5 : 0.05;
      a = clamp(a + dx * step, -xMax, b - 0.05);
      draw();
    },
  });

  const handleB = handle(svgEl, {
    label: 'Right bound b',
    x: 0,
    y: 0,
    r: 7,
    valueText: () => `b = ${b.toFixed(2)}, z = ${((b - mu) / sigma).toFixed(2)}`,
    onDrag: (px) => {
      const xMax = getXMax();
      const val = xScale.invert(px);
      b = clamp(val, a + 0.05, xMax);
      draw();
    },
    onKey: (dx, _dy, big) => {
      const xMax = getXMax();
      const step = big ? 0.5 : 0.05;
      b = clamp(b + dx * step, a + 0.05, xMax);
      draw();
    },
  });

  // Controls row 1: Sliders for μ and σ
  const rSliders = row(root);
  const muSlider = slider(rSliders, {
    label: 'Mean mu',
    texLabel: '\\mu',
    min: -3,
    max: 3,
    step: 0.1,
    value: mu,
    format: (v) => v.toFixed(1),
    onInput: (v) => {
      cancelAnim();
      mu = v;
      draw();
    },
  });

  const sigmaSlider = slider(rSliders, {
    label: 'Standard deviation sigma',
    texLabel: '\\sigma',
    min: 0.3,
    max: 3.0,
    step: 0.1,
    value: sigma,
    format: (v) => v.toFixed(1),
    onInput: (v) => {
      cancelAnim();
      sigma = v;
      draw();
    },
  });

  // Controls row 2: Buttons for empirical rule and reset
  const rButtons = row(root);
  button(rButtons, '±1σ', () => tweenToSigma(1));
  button(rButtons, '±2σ', () => tweenToSigma(2));
  button(rButtons, '±3σ', () => tweenToSigma(3));
  h('span', { class: 'spacer' }, rButtons);
  button(rButtons, 'Reset', () => reset());

  // Formula readout
  const f = formula(root);
  f.el.style.fontSize = '0.9rem';

  let cancelAnim = () => {};

  function tweenToSigma(k: number) {
    cancelAnim();
    const startA = a;
    const startB = b;
    const targetA = mu - k * sigma;
    const targetB = mu + k * sigma;
    cancelAnim = tween((t) => {
      a = lerp(startA, targetA, t);
      b = lerp(startB, targetB, t);
      draw();
    }, 300);
  }

  function reset() {
    cancelAnim();
    const startMu = mu;
    const startSigma = sigma;
    const startA = a;
    const startB = b;
    cancelAnim = tween((t) => {
      mu = lerp(startMu, 0.0, t);
      sigma = lerp(startSigma, 1.0, t);
      a = lerp(startA, -1.0, t);
      b = lerp(startB, 1.0, t);
      muSlider.set(mu);
      sigmaSlider.set(sigma);
      draw();
    }, 300);
  }

  function draw() {
    const { W, H } = view;
    const xMax = getXMax();
    xScale = scale(-xMax, xMax, pad.l, W - pad.r);
    yScale = scale(0, 1.45, H - pad.b, pad.t);

    const py0 = yScale(0);
    const px0 = xScale(0);

    // Axes
    attr(axisX, {
      x1: pad.l - 6,
      x2: W - pad.r + 6,
      y1: py0,
      y2: py0,
    });
    attr(axisY, {
      x1: pad.l,
      x2: pad.l,
      y1: py0,
      y2: pad.t - 4,
    });

    // Subtle origin line if x=0 is not at the margin
    attr(originLine, {
      x1: px0,
      x2: px0,
      y1: py0,
      y2: pad.t,
    });

    // Y ticks and grid lines at 0.4, 0.8, 1.2
    gridG.innerHTML = '';
    yTicksG.innerHTML = '';
    const yTicks = [0.4, 0.8, 1.2];
    for (const yt of yTicks) {
      const py = yScale(yt);
      s('line', { class: 'grid', x1: pad.l, x2: W - pad.r + 6, y1: py, y2: py }, gridG);
      s('line', { class: 'ax', x1: pad.l - 4, x2: pad.l, y1: py, y2: py }, yTicksG);
      label(yTicksG, pad.l - 6, py + 4, yt.toFixed(1), 'lbl', 'end');
    }

    // X ticks: step chosen based on span
    xTicksG.innerHTML = '';
    const xStep = xMax > 10 ? 4 : 2;
    for (let t = -xMax + (xMax % xStep); t <= xMax; t += xStep) {
      if (Math.abs(t) < 0.01) continue; // 0 already marked by grid line
      const px = xScale(t);
      if (px < pad.l + 10 || px > W - pad.r - 10) continue;
      s('line', { class: 'ax', x1: px, x2: px, y1: py0, y2: py0 + 4 }, xTicksG);
      label(xTicksG, px, py0 + 17, String(t), 'lbl', 'middle');
    }
    // Tick at 0
    s('line', { class: 'ax', x1: px0, x2: px0, y1: py0, y2: py0 + 4 }, xTicksG);
    label(xTicksG, px0, py0 + 17, '0', 'lbl', 'middle');

    // Density curve
    const curveSamples = 160;
    let curveD = '';
    for (let i = 0; i <= curveSamples; i++) {
      const xv = -xMax + (i / curveSamples) * (2 * xMax);
      const yv = normalPdf(xv, mu, sigma);
      const px = xScale(xv);
      const py = yScale(yv);
      curveD += (i === 0 ? 'M' : ' L') + `${px.toFixed(1)},${py.toFixed(1)}`;
    }
    attr(curvePath, { d: curveD });

    // Shaded band between a and b
    const pxA = xScale(a);
    const pyA = yScale(normalPdf(a, mu, sigma));
    const pxB = xScale(b);
    const pyB = yScale(normalPdf(b, mu, sigma));

    const bandSamples = 80;
    let bandD = `M${pxA.toFixed(1)},${py0.toFixed(1)} L${pxA.toFixed(1)},${pyA.toFixed(1)}`;
    for (let i = 1; i < bandSamples; i++) {
      const xv = a + (i / bandSamples) * (b - a);
      const yv = normalPdf(xv, mu, sigma);
      bandD += ` L${xScale(xv).toFixed(1)},${yScale(yv).toFixed(1)}`;
    }
    bandD += ` L${pxB.toFixed(1)},${pyB.toFixed(1)} L${pxB.toFixed(1)},${py0.toFixed(1)} Z`;
    attr(bandPath, { d: bandD });

    // Edge lines
    attr(edgeA, { x1: pxA, y1: py0, x2: pxA, y2: pyA });
    attr(edgeB, { x1: pxB, y1: py0, x2: pxB, y2: pyB });

    // Centerline at mean μ
    const pxMu = xScale(mu);
    const pyMu = yScale(normalPdf(mu, mu, sigma));
    attr(centerLine, { x1: pxMu, y1: py0, x2: pxMu, y2: pyMu });
    attr(lblMu, { x: pxMu, y: pyMu - 8 });

    // Move handles
    handleA.move(pxA, py0);
    handleB.move(pxB, py0);

    // Position handle labels clearly outside the vertical edge lines
    const canShowFull = pxA - pad.l >= 55 && W - pad.r - pxB >= 55 && pxB - pxA >= 40;
    attr(lblA, { x: pxA - 8, y: py0 - 13 });
    lblA.textContent = canShowFull ? `a = ${a.toFixed(1)}` : 'a';

    attr(lblB, { x: pxB + 8, y: py0 - 13 });
    lblB.textContent = canShowFull ? `b = ${b.toFixed(1)}` : 'b';

    // Exact probability via Cody-based phi
    const za = (a - mu) / sigma;
    const zb = (b - mu) / sigma;
    const prob = phi(zb) - phi(za);

    f.set(
      `P(a < X < b) = \\Phi\\bigl(\\tfrac{b-\\mu}{\\sigma}\\bigr) - \\Phi\\bigl(\\tfrac{a-\\mu}{\\sigma}\\bigr) = ${prob.toFixed(4)}`,
    );
  }

  view.onResize(draw);
  draw();
};

export default mount;
