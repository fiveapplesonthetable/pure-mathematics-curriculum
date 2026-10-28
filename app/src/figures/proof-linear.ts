// Chapter 20, figure: proof-linear.
// Proof that f(x) = 3x + 2 is continuous at every c.
// Contains the full proof faithfully as stepper lines, accompanied by
// an interactive plot of the line with c and ε sliders, the ε band,
// the δ = ε/3 window, a draggable sample x, and the vertical distance
// |f(x) - f(c)| as an accent segment.

import {
  responsiveSvg,
  s,
  attr,
  h,
  handle,
  slider,
  button,
  row,
  formula,
  tween,
  stepper,
  texHtml,
  scale,
  label,
  lerp,
  clamp,
  type Mount,
  type Step,
} from './lib';

const C0 = 1.0;
const E0 = 0.90;
const ALPHA0 = 0.60;

const X_MIN = -0.1;
const X_MAX = 2.5;
const Y_MIN = -0.5;
const Y_MAX = 9.5;

const fVal = (x: number) => 3 * x + 2;

const mount: Mount = (root) => {
  let c = C0;
  let eps = E0;
  let delta = eps / 3;
  let alpha = ALPHA0; // relative position in delta window: x = c + alpha * delta, alpha in (-1, 1)
  let x = c + alpha * delta;
  let currentStep = 0;

  const pad = { l: 46, r: 20, t: 18, b: 36 };
  let xScale = scale(X_MIN, X_MAX, pad.l, 300);
  let yScale = scale(Y_MIN, Y_MAX, 200, pad.t);

  // 1. Plot view
  const view = responsiveSvg(root, {
    label: 'Plot of f(x) = 3x + 2 showing epsilon tolerance band and delta window around c',
    aspect: 0.55,
    minH: 240,
    maxH: 340,
  });
  const svgEl = view.el;

  // Background bands
  const epsBand = s('rect', { class: 'band' }, svgEl);
  const deltaBand = s('rect', { class: 'band-muted' }, svgEl);
  const deltaBox = s('rect', { class: 'band' }, svgEl);

  // Grid and Axes
  const gridG = s('g', {}, svgEl);
  const axX = s('line', { class: 'ax' }, svgEl);
  const axY = s('line', { class: 'ax' }, svgEl);
  const ticksX = s('g', {}, svgEl);
  const ticksY = s('g', {}, svgEl);

  // Edges of epsilon band
  const epsTop = s('line', { class: 'edge' }, svgEl);
  const epsBot = s('line', { class: 'edge' }, svgEl);
  const epsTopLbl = label(svgEl, 0, 0, '', 'lbl-acc', 'end');
  const epsBotLbl = label(svgEl, 0, 0, '', 'lbl-acc', 'end');

  // Delta window elements
  const deltaLeft = s('line', { class: 'edge' }, svgEl);
  const deltaRight = s('line', { class: 'edge' }, svgEl);
  const deltaAxisSeg = s('line', { class: 'line-acc' }, svgEl);
  const deltaLeftLbl = label(svgEl, 0, 0, '', 'lbl-acc', 'middle');
  const deltaRightLbl = label(svgEl, 0, 0, '', 'lbl-acc', 'middle');

  // Curve f(x) = 3x + 2
  const curve = s('line', { class: 'curve' }, svgEl);
  const curveLbl = label(svgEl, 0, 0, 'f(x) = 3x + 2', 'lbl-fg', 'end');

  // Point c projections and markers
  const cLineV = s('line', { class: 'line-muted' }, svgEl);
  const cLineH = s('line', { class: 'line-muted' }, svgEl);
  const cDot = s('circle', { class: 'dot', r: 4 }, svgEl);
  const cLbl = label(svgEl, 0, 0, 'c', 'lbl-fg', 'middle');
  const fcLbl = label(svgEl, 0, 0, 'f(c)', 'lbl-fg', 'end');

  // Triangle for steps 4-7: horizontal run |x - c|, vertical rise 3|x - c|
  const triH = s('line', { class: 'line-muted' }, svgEl);
  const triHLbl = label(svgEl, 0, 0, '|x − c|', 'lbl', 'middle');
  const triV = s('line', { class: 'line-acc' }, svgEl);
  const triVLbl = label(svgEl, 0, 0, '', 'lbl-acc', 'start');

  // Sample x projections and markers
  const xLineV = s('line', { class: 'line-muted' }, svgEl);
  const xLineH = s('line', { class: 'line-muted' }, svgEl);
  const xDot = s('circle', { class: 'dot-acc', r: 4 }, svgEl);
  const xLbl = label(svgEl, 0, 0, 'x', 'lbl-acc', 'middle');
  const fxLbl = label(svgEl, 0, 0, 'f(x)', 'lbl-acc', 'end');

  // Draggable handle for sample x
  const hdX = handle(svgEl, {
    label: 'Sample x',
    x: 0,
    y: 0,
    r: 8,
    valueText: () => `x = ${x.toFixed(2)}, |x - c| = ${Math.abs(x - c).toFixed(2)}`,
    onDrag: (px, _py) => setX(xScale.invert(px)),
    onKey: (dx, _dy, big) => setX(x + dx * (big ? 0.05 : 0.01)),
  });

  // 2. Controls row (sliders + Reset button)
  const rControls = row(root);
  const sc = slider(rControls, {
    label: 'Point c',
    texLabel: 'c',
    min: 0.6,
    max: 1.6,
    step: 0.1,
    value: c,
    format: (v) => v.toFixed(1),
    onInput: (v) => setC(v),
  });
  const se = slider(rControls, {
    label: 'Tolerance epsilon',
    texLabel: '\\varepsilon',
    min: 0.3,
    max: 1.5,
    step: 0.03,
    value: eps,
    format: (v) => v.toFixed(2),
    onInput: (v) => setEps(v),
  });
  h('span', { class: 'spacer' }, rControls);
  button(rControls, 'Reset', () => {
    const fromC = c, fromE = eps, fromA = alpha;
    tween((k) => {
      c = lerp(fromC, C0, k);
      eps = lerp(fromE, E0, k);
      alpha = lerp(fromA, ALPHA0, k);
      sc.set(c);
      se.set(eps);
      delta = eps / 3;
      x = c + alpha * delta;
      draw();
    });
  });

  // 3. Formula readout and step explanation on full-width lines
  const f = formula(root);
  const note = h('div', { class: 'fig-note' }, root);
  note.style.margin = '0.2rem 8px 0.35rem';

  // 4. Proof label
  h('p', { class: 'env-label' }, root, 'Proof');

  // 5. Proof stepper
  const steps: Step[] = [
    {
      html: `Let ${texHtml('c \\in \\R')} and ${texHtml('\\eps > 0')}.`,
    },
    {
      html: `Choose ${texHtml('\\delta = \\eps / 3')}.`,
    },
    {
      html: `Suppose ${texHtml('|x - c| < \\delta')}.`,
    },
    {
      html: `${texHtml('|f(x) - f(c)| = |(3x + 2) - (3c + 2)|')}`,
    },
    {
      html: `${texHtml('{} = 3|x - c|')}`,
    },
    {
      html: `${texHtml('{} < 3\\delta')}`,
      uses: [2],
      why: 'uses step 3',
    },
    {
      html: `${texHtml('{} = \\eps')}`,
      uses: [1],
      why: 'uses step 2',
    },
    {
      html: `Thus ${texHtml('f')} is continuous at ${texHtml('c')}. <span class="qed" aria-label="End of proof" style="float:right;">∎</span>`,
    },
  ];

  stepper(root, steps, (stepIdx) => {
    currentStep = stepIdx;
    draw();
  });

  function setC(v: number) {
    c = clamp(v, 0.6, 1.6);
    x = c + alpha * delta;
    draw();
  }

  function setEps(v: number) {
    eps = clamp(v, 0.3, 1.5);
    delta = eps / 3;
    x = c + alpha * delta;
    draw();
  }

  function setX(newX: number) {
    const minX = c - 0.94 * delta;
    const maxX = c + 0.94 * delta;
    x = clamp(newX, minX, maxX);
    alpha = delta > 0 ? (x - c) / delta : 0;
    draw();
  }

  function draw() {
    const { W, H } = view;
    xScale = scale(X_MIN, X_MAX, pad.l, W - pad.r);
    yScale = scale(Y_MIN, Y_MAX, H - pad.b, pad.t);

    const fc = fVal(c);
    const fx = fVal(x);
    const yAx = yScale(0);
    const xAx = xScale(0);

    const showDelta = currentStep >= 1;
    const showX = currentStep >= 2;
    const showTri = currentStep >= 3;

    // Axes
    attr(axX, { x1: xScale(X_MIN), x2: xScale(X_MAX), y1: yAx, y2: yAx });
    attr(axY, { x1: xAx, x2: xAx, y1: yScale(Y_MIN), y2: yScale(Y_MAX) });

    // Grid & Axis ticks (avoid colliding with c, delta, or fc labels)
    gridG.replaceChildren();
    ticksX.replaceChildren();
    ticksY.replaceChildren();

    for (let gx = 1; gx <= 2; gx++) {
      s('line', { class: 'grid', x1: xScale(gx), x2: xScale(gx), y1: yScale(Y_MIN), y2: yScale(Y_MAX) }, gridG);
      const nearC = Math.abs(c - gx) < 0.22;
      const nearDelta = showDelta && (Math.abs(c - delta - gx) < 0.18 || Math.abs(c + delta - gx) < 0.18);
      if (!nearC && !nearDelta) {
        label(ticksX, xScale(gx), yAx + 14, String(gx));
      }
    }
    label(ticksX, xAx - 8, yAx + 14, '0', 'lbl', 'end');

    for (let gy = 2; gy <= 8; gy += 2) {
      s('line', { class: 'grid', x1: xScale(X_MIN), x2: xScale(X_MAX), y1: yScale(gy), y2: yScale(gy) }, gridG);
      const nearFc = Math.abs(fc - gy) < 0.5;
      const nearFx = showX && Math.abs(fx - gy) < 0.5;
      if (!nearFc && !nearFx) {
        label(ticksY, xAx - 6, yScale(gy) + 4, String(gy), 'lbl', 'end');
      }
    }

    // Curve f(x) = 3x + 2
    const x1Curve = Math.max(X_MIN, (Y_MIN - 2) / 3);
    const x2Curve = Math.min(X_MAX, (Y_MAX - 2) / 3);
    attr(curve, {
      x1: xScale(x1Curve),
      y1: yScale(fVal(x1Curve)),
      x2: xScale(x2Curve),
      y2: yScale(fVal(x2Curve)),
    });
    attr(curveLbl, {
      x: xScale(2.2) - 6,
      y: yScale(fVal(2.2)) - 10,
    });

    // Step 1: c and ε band
    const yTop = yScale(fc + eps);
    const yBot = yScale(fc - eps);
    const xLeft = pad.l;
    const xRight = W - pad.r;
    attr(epsBand, {
      x: xLeft,
      y: yTop,
      width: xRight - xLeft,
      height: Math.max(0, yBot - yTop),
    });
    attr(epsTop, { x1: xLeft, x2: xRight, y1: yTop, y2: yTop });
    attr(epsBot, { x1: xLeft, x2: xRight, y1: yBot, y2: yBot });

    // Put epsilon band labels away from the line to avoid collisions:
    // f(c) + ε on top-left (line is far to the right), f(c) - ε on bottom-right (line is far to the left)
    attr(epsTopLbl, { x: xAx + 8, y: yTop - 4, 'text-anchor': 'start' });
    epsTopLbl.textContent = 'f(c) + ε';
    attr(epsBotLbl, { x: xRight - 8, y: yBot + 14, 'text-anchor': 'end' });
    epsBotLbl.textContent = 'f(c) − ε';

    // Point c
    attr(cLineV, { x1: xScale(c), x2: xScale(c), y1: yAx, y2: yScale(fc) });
    attr(cLineH, { x1: xAx, x2: xScale(c), y1: yScale(fc), y2: yScale(fc) });
    attr(cDot, { cx: xScale(c), cy: yScale(fc) });
    attr(cLbl, { x: xScale(c), y: yAx + 14 });

    // Step 2: δ window
    const xdLeft = xScale(c - delta);
    const xdRight = xScale(c + delta);

    deltaBand.style.display = showDelta ? '' : 'none';
    deltaBox.style.display = showDelta ? '' : 'none';
    deltaLeft.style.display = showDelta ? '' : 'none';
    deltaRight.style.display = showDelta ? '' : 'none';
    deltaAxisSeg.style.display = showDelta ? '' : 'none';
    deltaLeftLbl.style.display = showDelta ? '' : 'none';
    deltaRightLbl.style.display = showDelta ? '' : 'none';

    if (showDelta) {
      attr(deltaBand, {
        x: xdLeft,
        y: pad.t,
        width: Math.max(0, xdRight - xdLeft),
        height: yAx - pad.t,
      });
      attr(deltaBox, {
        x: xdLeft,
        y: yTop,
        width: Math.max(0, xdRight - xdLeft),
        height: Math.max(0, yBot - yTop),
      });
      attr(deltaLeft, { x1: xdLeft, x2: xdLeft, y1: pad.t, y2: yAx });
      attr(deltaRight, { x1: xdRight, x2: xdRight, y1: pad.t, y2: yAx });
      attr(deltaAxisSeg, { x1: xdLeft, x2: xdRight, y1: yAx, y2: yAx });
      attr(deltaLeftLbl, { x: xdLeft, y: yAx + 27 });
      deltaLeftLbl.textContent = 'c − δ';
      attr(deltaRightLbl, { x: xdRight, y: yAx + 27 });
      deltaRightLbl.textContent = 'c + δ';
    }

    // Step 3: sample x inside window
    hdX.el.style.display = showX ? '' : 'none';
    xLineV.style.display = showX ? '' : 'none';
    xLineH.style.display = showX ? '' : 'none';
    xDot.style.display = showX ? '' : 'none';
    xLbl.style.display = showX ? '' : 'none';
    fxLbl.style.display = showX ? '' : 'none';

    // Stagger y-axis labels f(c) and f(x) if they get too close
    let pyFcLbl = yScale(fc) + 4;
    let pyFxLbl = yScale(fx) + 4;
    if (showX && Math.abs(yScale(fx) - yScale(fc)) < 16) {
      if (fx >= fc) {
        pyFxLbl = yScale(fx) - 5;
        pyFcLbl = yScale(fc) + 11;
      } else {
        pyFxLbl = yScale(fx) + 11;
        pyFcLbl = yScale(fc) - 5;
      }
    }
    attr(fcLbl, { x: xAx - 6, y: pyFcLbl });

    if (showX) {
      hdX.move(xScale(x), yAx);
      hdX.el.setAttribute('aria-valuemin', (c - delta).toFixed(2));
      hdX.el.setAttribute('aria-valuemax', (c + delta).toFixed(2));
      hdX.el.setAttribute('aria-valuenow', x.toFixed(2));

      attr(xLineV, { x1: xScale(x), x2: xScale(x), y1: yAx, y2: yScale(fx) });
      attr(xLineH, { x1: xAx, x2: xScale(x), y1: yScale(fx), y2: yScale(fx) });
      attr(xDot, { cx: xScale(x), cy: yScale(fx) });
      attr(xLbl, { x: xScale(x), y: yAx - 13 });
      attr(fxLbl, { x: xAx - 6, y: pyFxLbl });
    }

    // Steps 4–7: vertical distance |f(x) - f(c)| as accent segment next to 3|x - c|
    triH.style.display = showTri ? '' : 'none';
    triHLbl.style.display = showTri ? '' : 'none';
    triV.style.display = showTri ? '' : 'none';
    triVLbl.style.display = showTri ? '' : 'none';

    if (showTri) {
      const pxC = xScale(c);
      const pxX = xScale(x);
      const pyFc = yScale(fc);
      const pyFx = yScale(fx);

      // Horizontal run |x - c|
      attr(triH, { x1: pxC, x2: pxX, y1: pyFc, y2: pyFc });
      attr(triHLbl, {
        x: (pxC + pxX) / 2,
        y: pyFc + (fx >= fc ? 14 : -7),
      });

      // Vertical rise |f(x) - f(c)|
      attr(triV, { x1: pxX, x2: pxX, y1: pyFc, y2: pyFx });

      const isRight = x >= c;
      const lblAnchor = isRight ? 'start' : 'end';
      const lblX = pxX + (isRight ? 8 : -8);
      const lblY = (pyFc + pyFx) / 2 + 4;

      let vText = '';
      if (currentStep === 3) vText = '|f(x) − f(c)|';
      else if (currentStep === 4) vText = '3|x − c|';
      else if (currentStep === 5) vText = '< 3δ';
      else if (currentStep === 6) vText = '= ε';
      else vText = '< ε';

      attr(triVLbl, { x: lblX, y: lblY, 'text-anchor': lblAnchor });
      triVLbl.textContent = vText;
    }

    // Live formula text depending on current step
    const xDist = Math.abs(x - c);
    const fxDist = Math.abs(fx - fc);
    if (currentStep === 0) {
      f.set(`c = ${c.toFixed(1)},\\; \\varepsilon = ${eps.toFixed(2)}:\\quad f(c) = ${fc.toFixed(1)}`);
    } else if (currentStep === 1) {
      f.set(`\\varepsilon = ${eps.toFixed(2)} \\implies \\delta = \\tfrac{\\varepsilon}{3} = ${delta.toFixed(2)}`);
    } else if (currentStep === 2) {
      f.set(`|x - c| = |${x.toFixed(2)} - ${c.toFixed(1)}| = ${xDist.toFixed(2)} < \\delta = ${delta.toFixed(2)}`);
    } else if (currentStep === 3) {
      f.set(`|f(x) - f(c)| = |${fx.toFixed(2)} - ${fc.toFixed(2)}| = ${fxDist.toFixed(2)}`);
    } else if (currentStep === 4) {
      f.set(`|f(x) - f(c)| = 3|x - c| = ${(3 * xDist).toFixed(2)}`);
    } else if (currentStep === 5) {
      f.set(`3|x - c| = ${(3 * xDist).toFixed(2)} < 3\\delta = ${eps.toFixed(2)}`);
    } else if (currentStep === 6) {
      f.set(`3\\delta = 3(${delta.toFixed(2)}) = \\varepsilon = ${eps.toFixed(2)}`);
    } else {
      f.set(`|f(x) - f(c)| = ${fxDist.toFixed(2)} < \\varepsilon = ${eps.toFixed(2)}`);
    }

    const stepNotes = [
      `Step 1: Fix any point c = ${c.toFixed(1)} (where f(c) = ${fc.toFixed(1)}) and horizontal tolerance band f(c) ± ε.`,
      `Step 2: Because the line has slope 3, we divide the vertical tolerance by 3 and set the horizontal window half-width to δ = ε/3 = ${delta.toFixed(2)}.`,
      `Step 3: Pick any test input x = ${x.toFixed(2)} inside the window (c − δ, c + δ), so its horizontal distance is |x − c| = ${xDist.toFixed(2)} < δ.`,
      `Step 4: Measure the vertical output error |f(x) − f(c)|; the constant +2 cancels in (3x + 2) − (3c + 2).`,
      `Step 5: Factor out the slope 3: the vertical rise |f(x) − f(c)| = ${fxDist.toFixed(2)} is exactly 3 times the horizontal run |x − c| = ${xDist.toFixed(2)}.`,
      `Step 6: Since |x − c| < δ, multiplying by 3 bounds the vertical rise strictly below 3δ = ${(3 * delta).toFixed(2)}.`,
      `Step 7: By our choice δ = ε/3, the bound 3δ equals ε = ${eps.toFixed(2)} — matching the top and bottom edges of the target box.`,
      `Step 8: Every x in (c − δ, c + δ) maps inside (f(c) − ε, f(c) + ε), proving f(x) = 3x + 2 is continuous at c.`,
    ];
    note.textContent = stepNotes[currentStep] ?? '';
  }

  view.onResize(draw);
  draw();
};

export default mount;
