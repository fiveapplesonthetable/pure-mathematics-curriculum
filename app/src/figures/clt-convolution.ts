// Chapter 21: Central Limit Theorem via exact convolution.
// Standardizes the sum of n independent discrete variables and plots its pmf
// against the standard normal density, tracking the Kolmogorov distance max |F_n - Φ|.

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

interface Distribution {
  id: string;
  name: string;
  minVal: number;
  mu: number;
  sigma: number;
  pmfs: Float64Array[]; // pmfs[n-1] for n = 1..40
}

function makeDist(name: string, id: string, basePmf: number[], minVal: number): Distribution {
  const b = new Float64Array(basePmf);
  let mu = 0;
  let ex2 = 0;
  for (let i = 0; i < b.length; i++) {
    const val = minVal + i;
    mu += val * b[i];
    ex2 += val * val * b[i];
  }
  const variance = ex2 - mu * mu;
  const sigma = Math.sqrt(variance);

  // Precompute exact repeated convolutions for n = 1..40
  const pmfs: Float64Array[] = [b];
  for (let n = 2; n <= 40; n++) {
    const prev = pmfs[n - 2];
    const cur = new Float64Array(prev.length + b.length - 1);
    for (let i = 0; i < prev.length; i++) {
      const p = prev[i];
      if (p === 0) continue;
      for (let j = 0; j < b.length; j++) {
        cur[i + j] += p * b[j];
      }
    }
    pmfs.push(cur);
  }

  return { id, name, minVal, mu, sigma, pmfs };
}

// 1. Fair 6-sided die: values 1..6, p = 1/6
const dieDist = makeDist('Fair die', 'die', [1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6], 1);

// 2. Skewed discrete distribution: Bernoulli(0.1), values {0, 1}
const skewDist = makeDist('Skewed', 'skew', [0.9, 0.1], 0);

// 3. Uniform-ish discrete distribution: discrete uniform on {0, 1, ..., 9}
const unifDist = makeDist('Uniform-ish', 'unif', Array(10).fill(0.1), 0);

const dists = [dieDist, skewDist, unifDist];

const SQRT_2PI_INV = 1 / Math.sqrt(2 * Math.PI);

function normalPdf(x: number): number {
  return SQRT_2PI_INV * Math.exp(-0.5 * x * x);
}

function normalCdf(x: number): number {
  if (x === 0) return 0.5;
  const z = Math.abs(x);
  const t = 1 / (1 + 0.2316419 * z);
  const d = SQRT_2PI_INV * Math.exp(-0.5 * z * z);
  const p = d * t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return x > 0 ? 1 - p : p;
}

function computeKolmogorovDistance(dist: Distribution, n: number): number {
  const pmf = dist.pmfs[n - 1];
  const sMu = n * dist.mu;
  const sSigma = dist.sigma * Math.sqrt(n);
  let cdf = 0;
  let ks = 0;
  for (let i = 0; i < pmf.length; i++) {
    const p = pmf[i];
    const prevCdf = cdf;
    cdf += p;
    if (p === 0) continue;
    const sVal = dist.minVal * n + i;
    const z = (sVal - sMu) / sSigma;
    const phi = normalCdf(z);
    const d1 = Math.abs(cdf - phi);
    const d2 = Math.abs(prevCdf - phi);
    if (d1 > ks) ks = d1;
    if (d2 > ks) ks = d2;
  }
  return ks;
}

const mount: Mount = (root) => {
  let curDist = dieDist;
  let n = 1;

  const pad = { l: 44, r: 28, t: 28, b: 36 };
  const zMin = -3.6;
  const zMax = 3.6;
  const yMin = 0;
  const yMax = 0.46;

  const view = responsiveSvg(root, {
    label: 'Standardized sum distribution converging to standard normal curve',
    aspect: 0.54,
    minH: 260,
    maxH: 380,
  });
  const svgEl = view.el;

  // Grid lines
  const gridG = s('g', {}, svgEl);

  // Bars group
  const barsG = s('g', {}, svgEl);
  const barPool: SVGRectElement[] = [];

  // Axes
  const axesG = s('g', {}, svgEl);
  const xAxis = s('line', { class: 'ax' }, axesG);
  const yAxis = s('line', { class: 'ax' }, axesG);
  const ticksG = s('g', {}, svgEl);

  // Normal curve
  const curvePath = s('path', { class: 'curve-acc' }, svgEl);

  // Legend
  const legG = s('g', {}, svgEl);
  const legLine = s('line', { class: 'curve-acc' }, legG);
  const legLineLbl = label(legG, 0, 0, 'Normal curve', 'lbl-acc', 'start');
  attr(legLineLbl, { 'font-size': '12' });
  const legRect = s('rect', { class: 'bar' }, legG);
  const legRectLbl = label(legG, 0, 0, 'Sum pmf', 'lbl', 'start');
  attr(legRectLbl, { 'font-size': '12' });

  // Controls row 1: distribution selector buttons
  const btnRow = row(root);
  const buttons: HTMLButtonElement[] = [];

  dists.forEach((d) => {
    const btn = button(btnRow, d.name, () => {
      setDist(d.id);
    });
    btn.setAttribute('aria-pressed', d.id === curDist.id ? 'true' : 'false');
    buttons.push(btn);
  });

  // Controls row 2: slider for n + Reset
  const sliderRow = row(root);
  const nSlider = slider(sliderRow, {
    label: 'Number of terms n',
    texLabel: 'n',
    min: 1,
    max: 40,
    step: 1,
    value: 1,
    onInput: (val) => {
      n = Math.round(val);
      draw();
    },
  });

  button(sliderRow, 'Reset', () => {
    const fromN = n;
    setDist('die');
    if (fromN !== 1) {
      tween((k) => {
        setN(Math.round(lerp(fromN, 1, k)));
      }, 250);
    }
  });

  // Controls row 3: live formula
  const f = formula(root);

  function setDist(id: string) {
    const d = dists.find((item) => item.id === id);
    if (!d || d.id === curDist.id) return;
    curDist = d;
    buttons.forEach((b, idx) => {
      b.setAttribute('aria-pressed', dists[idx].id === curDist.id ? 'true' : 'false');
    });
    draw();
  }

  function setN(val: number) {
    n = clamp(val, 1, 40);
    nSlider.set(n);
    draw();
  }

  function draw() {
    const { W, H } = view;
    const x = scale(zMin, zMax, pad.l, W - pad.r);
    const y = scale(yMin, yMax, H - pad.b, pad.t);

    const xLeft = x(zMin);
    const xRight = x(zMax);
    const yBottom = y(0);
    const yTop = y(yMax);

    // Axes
    attr(xAxis, { x1: xLeft, x2: xRight, y1: yBottom, y2: yBottom });
    attr(yAxis, { x1: xLeft, x2: xLeft, y1: yBottom, y2: yTop });

    // Grid and ticks
    gridG.replaceChildren();
    ticksG.replaceChildren();

    // Horizontal ticks at z = -3, -2, -1, 0, 1, 2, 3
    for (let zTick = -3; zTick <= 3; zTick++) {
      const tx = x(zTick);
      s('line', { class: 'ax', x1: tx, x2: tx, y1: yBottom, y2: yBottom + 4 }, ticksG);
      const text = zTick === 0 ? '0' : zTick > 0 ? `+${zTick}` : `${zTick}`;
      label(ticksG, tx, yBottom + 18, text, 'lbl', 'middle');
    }
    label(ticksG, xRight + 6, yBottom + 4, 'z', 'lbl-fg', 'start');

    // Vertical ticks at y = 0.1, 0.2, 0.3, 0.4
    const yTicks = [0.1, 0.2, 0.3, 0.4];
    for (const yt of yTicks) {
      const ty = y(yt);
      s('line', { class: 'grid', x1: xLeft, x2: xRight, y1: ty, y2: ty }, gridG);
      s('line', { class: 'ax', x1: xLeft - 4, x2: xLeft, y1: ty, y2: ty }, ticksG);
      label(ticksG, xLeft - 6, ty + 4, yt.toFixed(1), 'lbl', 'end');
    }
    label(ticksG, xLeft, pad.t - 10, 'density', 'lbl', 'start');

    // Target normal curve
    let curveD = '';
    const SAMPLES = 140;
    for (let sIdx = 0; sIdx <= SAMPLES; sIdx++) {
      const zVal = zMin + ((zMax - zMin) * sIdx) / SAMPLES;
      const px = x(zVal);
      const py = y(normalPdf(zVal));
      curveD += (sIdx === 0 ? 'M ' : ' L ') + px.toFixed(1) + ' ' + py.toFixed(1);
    }
    curvePath.setAttribute('d', curveD);

    // Compute standardized pmf and render bars
    const pmf = curDist.pmfs[n - 1];
    const sMu = n * curDist.mu;
    const sSigma = curDist.sigma * Math.sqrt(n);
    const dz = 1 / sSigma;

    interface BarData {
      px: number;
      py: number;
      pw: number;
      ph: number;
    }
    const visibleBars: BarData[] = [];

    for (let i = 0; i < pmf.length; i++) {
      const p = pmf[i];
      if (p < 1e-6) continue;
      const sVal = curDist.minVal * n + i;
      const zVal = (sVal - sMu) / sSigma;
      const height = p / dz;

      const zL = zVal - dz / 2;
      const zR = zVal + dz / 2;
      if (zR < zMin || zL > zMax) continue;

      const pxL = Math.max(xLeft, x(zL));
      const pxR = Math.min(xRight, x(zR));
      if (pxR <= pxL) continue;

      const barTop = y(height);
      const barH = Math.max(0, yBottom - barTop);

      visibleBars.push({
        px: pxL,
        py: barTop,
        pw: Math.max(0.5, pxR - pxL),
        ph: barH,
      });
    }

    while (barPool.length < visibleBars.length) {
      const rectEl = s('rect', { class: 'bar' }, barsG);
      barPool.push(rectEl);
    }
    for (let k = 0; k < barPool.length; k++) {
      if (k < visibleBars.length) {
        const b = visibleBars[k];
        barPool[k].style.display = '';
        attr(barPool[k], {
          x: b.px.toFixed(1),
          y: b.py.toFixed(1),
          width: b.pw.toFixed(1),
          height: b.ph.toFixed(1),
        });
      } else {
        barPool[k].style.display = 'none';
      }
    }

    // Position legend in upper right, comfortably inside the plot area
    const legLeft = xRight - 124;
    attr(legG, { transform: `translate(${legLeft}, ${pad.t + 4})` });
    attr(legLine, { x1: 0, y1: 0, x2: 18, y2: 0 });
    attr(legLineLbl, { x: 24, y: 4 });
    attr(legRect, { x: 0, y: 12, width: 18, height: 10 });
    attr(legRectLbl, { x: 24, y: 21 });

    // Live formula update
    const ks = computeKolmogorovDistance(curDist, n);
    f.set(`n = ${n}, \\quad \\max |F_n - \\Phi| = ${ks.toFixed(4)}`);
  }

  view.onResize(draw);
  draw();
};

export default mount;
