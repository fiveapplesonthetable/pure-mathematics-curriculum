// Chapter 20, Riemann sums for f(x) = x² on [0, 2].
// Approximates the exact area 8/3 using Left, Midpoint, or Right Riemann sums.
// The reader adjusts the number of subintervals n (1 to 64) and selects the
// sampling method to observe how the rectangles exhaust the area under the curve
// and how the error shrinks.

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
  h,
  type Mount,
} from './lib';

type Method = 'left' | 'midpoint' | 'right';

const N0 = 4;
const METHOD0: Method = 'left';
const EXACT_AREA = 8 / 3;

const mount: Mount = (root) => {
  let n = N0;
  let method: Method = METHOD0;
  let animCancel = () => {};

  const pad = { l: 36, r: 26, t: 24, b: 30 };

  const view = responsiveSvg(root, {
    label: 'Riemann sums approximating the area under f(x) = x² on [0, 2]',
    aspect: 0.55,
    minH: 240,
    maxH: 340,
  });
  const svgEl = view.el;

  // Background grid
  const gridG = s('g', {}, svgEl);
  const gridH = [1, 2, 3, 4].map(() => s('line', { class: 'grid' }, gridG));
  const gridV = [1, 2].map(() => s('line', { class: 'grid' }, gridG));

  // Rectangles (fill + thin stroke)
  const rectsG = s('g', {}, svgEl);
  const rectBands: SVGRectElement[] = [];
  const rectEdges: SVGRectElement[] = [];
  for (let i = 0; i < 64; i++) {
    rectBands.push(s('rect', { class: 'band' }, rectsG));
    rectEdges.push(s('rect', { class: 'rect-edge' }, rectsG));
  }

  // Parabola curve
  const curve = s('path', { class: 'curve' }, svgEl);
  const curveLbl = label(svgEl, 0, 0, 'y = x²', 'lbl-fg', 'end');

  // Sample points on the curve (shown for n <= 16)
  const dotsG = s('g', {}, svgEl);
  const dots: SVGCircleElement[] = [];
  for (let i = 0; i < 64; i++) {
    dots.push(s('circle', { class: 'dot-acc', r: 2.5 }, dotsG));
  }

  // Axes
  const xAxis = s('line', { class: 'ax' }, svgEl);
  const yAxis = s('line', { class: 'ax' }, svgEl);
  const xTitle = label(svgEl, 0, 0, 'x', 'lbl-fg', 'start');
  const yTitle = label(svgEl, 0, 0, 'y', 'lbl-fg', 'middle');

  // Ticks
  const ticksG = s('g', {}, svgEl);

  // Live KaTeX formula
  const f = formula(root);
  f.el.style.fontSize = 'clamp(0.82rem, 3.8vw, 1rem)';

  // Live error explanation note
  const rNote = row(root);
  const note = h('span', { class: 'fig-note' }, rNote);

  // Controls: Segmented method buttons and Reset
  const rControls = row(root);
  const seg = h('div', { role: 'group', 'aria-label': 'Sampling method' }, rControls);
  seg.style.display = 'inline-flex';
  seg.style.gap = '6px';

  const btnLeft = button(seg, 'Left', () => setMethod('left'));
  const btnMid = button(seg, 'Midpoint', () => setMethod('midpoint'));
  const btnRight = button(seg, 'Right', () => setMethod('right'));
  btnLeft.style.padding = '0 11px';
  btnMid.style.padding = '0 11px';
  btnRight.style.padding = '0 11px';

  h('span', { class: 'spacer' }, rControls);
  const btnReset = button(rControls, 'Reset', () => reset());
  btnReset.style.padding = '0 12px';

  function updateButtons() {
    btnLeft.setAttribute('aria-pressed', String(method === 'left'));
    btnMid.setAttribute('aria-pressed', String(method === 'midpoint'));
    btnRight.setAttribute('aria-pressed', String(method === 'right'));
  }
  updateButtons();

  // Slider for n
  const rSlider = row(root);
  const sl = slider(rSlider, {
    label: 'Subintervals n',
    texLabel: 'n',
    min: 1,
    max: 64,
    step: 1,
    value: n,
    format: (v) => String(Math.round(v)),
    onInput: (v) => {
      animCancel();
      n = Math.round(clamp(v, 1, 64));
      draw();
    },
  });

  function setMethod(m: Method) {
    if (method === m) return;
    animCancel();
    method = m;
    updateButtons();
    draw();
  }

  function reset() {
    animCancel();
    const fromN = n;
    const toN = N0;
    method = METHOD0;
    updateButtons();
    animCancel = tween((k) => {
      n = Math.round(lerp(fromN, toN, k));
      sl.set(n);
      draw();
    }, 280);
  }

  function draw() {
    const { W, H } = view;
    const xSc = scale(0, 2, pad.l, W - pad.r);
    const ySc = scale(0, 4.3, H - pad.b, pad.t);

    const x0 = xSc(0);
    const xEnd = xSc(2);
    const y0 = ySc(0);
    const yTop = ySc(4.3);

    // Axes
    attr(xAxis, { x1: x0 - 6, x2: xEnd + 10, y1: y0, y2: y0 });
    attr(yAxis, { x1: x0, x2: x0, y1: y0 + 6, y2: yTop - 6 });
    attr(xTitle, { x: xEnd + 12, y: y0 + 4 });
    attr(yTitle, { x: x0, y: yTop - 10 });

    // Grid lines
    [1, 2, 3, 4].forEach((val, idx) => {
      const yPos = ySc(val);
      attr(gridH[idx], { x1: x0, x2: xEnd, y1: yPos, y2: yPos });
    });
    [1, 2].forEach((val, idx) => {
      const xPos = xSc(val);
      attr(gridV[idx], { x1: xPos, x2: xPos, y1: y0, y2: ySc(4) });
    });

    // Ticks and tick labels
    ticksG.replaceChildren();
    // x ticks: 0, 1, 2
    [0, 1, 2].forEach((val) => {
      const xp = xSc(val);
      s('line', { class: 'ax', x1: xp, x2: xp, y1: y0, y2: y0 + 4 }, ticksG);
      label(ticksG, xp, y0 + 17, String(val), 'lbl', 'middle');
    });
    // y ticks: 1, 2, 3, 4
    [1, 2, 3, 4].forEach((val) => {
      const yp = ySc(val);
      s('line', { class: 'ax', x1: x0 - 4, x2: x0, y1: yp, y2: yp }, ticksG);
      label(ticksG, x0 - 8, yp + 4, String(val), 'lbl', 'end');
    });

    // Parabola curve path
    const numCurvePts = 60;
    const curveD: string[] = [];
    for (let i = 0; i <= numCurvePts; i++) {
      const cxVal = (2 * i) / numCurvePts;
      const cyVal = cxVal * cxVal;
      curveD.push(`${i === 0 ? 'M' : 'L'} ${xSc(cxVal).toFixed(1)} ${ySc(cyVal).toFixed(1)}`);
    }
    attr(curve, { d: curveD.join(' ') });
    attr(curveLbl, { x: xSc(1.55) - 6, y: ySc(1.55 * 1.55) - 10 });

    // Rectangles & sample points
    const dx = 2 / n;
    const showDots = n <= 16;

    for (let i = 0; i < 64; i++) {
      if (i < n) {
        const xLeft = i * dx;
        const xRight = (i + 1) * dx;
        let xSample = xLeft;
        if (method === 'midpoint') xSample = (xLeft + xRight) / 2;
        else if (method === 'right') xSample = xRight;

        const ySample = xSample * xSample;
        const rx = xSc(xLeft);
        const rw = Math.max(0.5, xSc(xRight) - rx);
        const ry = ySc(ySample);
        const rh = Math.max(0, y0 - ry);

        const rectAttrs = { x: rx, y: ry, width: rw, height: rh };
        attr(rectBands[i], rectAttrs);
        attr(rectEdges[i], rectAttrs);
        rectBands[i].style.display = '';
        rectEdges[i].style.display = '';

        if (showDots) {
          attr(dots[i], { cx: xSc(xSample), cy: ry });
          dots[i].style.display = '';
        } else {
          dots[i].style.display = 'none';
        }
      } else {
        rectBands[i].style.display = 'none';
        rectEdges[i].style.display = 'none';
        dots[i].style.display = 'none';
      }
    }

    // Exact closed-form mathematics
    let sum = 0;
    let sym = `L_{${n}}`;
    if (method === 'left') {
      sym = `L_{${n}}`;
      sum = EXACT_AREA - 4 / n + 4 / (3 * n * n);
    } else if (method === 'right') {
      sym = `R_{${n}}`;
      sum = EXACT_AREA + 4 / n + 4 / (3 * n * n);
    } else {
      sym = `M_{${n}}`;
      sum = EXACT_AREA - 2 / (3 * n * n);
    }

    const err = sum - EXACT_AREA;
    const errSign = err > 0 ? '+' : '';
    const errStr = `${errSign}${err.toFixed(4)}`;

    f.set(
      `${sym} = ${sum.toFixed(4)} \\quad \\int_0^2 x^2\\,dx \\approx 2.6667 \\quad \\text{error: } ${errStr}`,
    );

    if (method === 'left') {
      note.textContent = `Left sum underestimates: at n = ${n}, error is ${errStr}. Doubling n roughly halves the error (~1/n).`;
    } else if (method === 'right') {
      note.textContent = `Right sum overestimates: at n = ${n}, error is ${errStr}. Doubling n roughly halves the error (~1/n).`;
    } else {
      note.textContent = `Midpoint sum balances errors: at n = ${n}, error is ${errStr}. Doubling n cuts error by 4× (~1/n²).`;
    }
  }

  view.onResize(draw);
  draw();
};

export default mount;
