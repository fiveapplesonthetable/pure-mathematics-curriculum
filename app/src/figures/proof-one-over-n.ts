// Chapter 20: worked proof of lim 1/n = 0.
// Faithful replacement of the book's proof using stepper lines, with an interactive
// plot of 1/n above reacting to each step.

import {
  responsiveSvg,
  s,
  attr,
  handle,
  row,
  slider,
  button,
  stepper,
  texHtml,
  tween,
  clamp,
  scale,
  label,
  lerp,
  h,
  type Mount,
  type Step,
} from './lib';

const E0 = 0.20;
const EMIN = 0.10;
const EMAX = 0.50;
const MAX_N = 16;
// |1/n - 0| = 1/n < ε  ⇔  n > 1/ε, so the least N is floor(1/ε) + 1.
const needN = (e: number) => Math.floor(1 / e + 1e-9) + 1;
const a = (n: number) => 1 / n;

const mount: Mount = (root) => {
  let eps = E0;
  let currentStep = 0;
  const pad = { l: 52, r: 28, t: 22, b: 26 };

  let xScale = scale(0, MAX_N, pad.l, 300);
  let yScale = scale(-0.05, 1.08, 200, pad.t);

  // 1. Responsive SVG plot of 1/n
  const view = responsiveSvg(root, {
    label: 'Plot of terms of 1/n approaching 0, with a tolerance band and boundary N',
    aspect: 0.42,
    minH: 190,
    maxH: 260,
  });
  const svgEl = view.el;

  // Background fills
  const tailBand = s('rect', { class: 'band-muted fade' }, svgEl);
  const epsBand = s('rect', { class: 'band fade' }, svgEl);

  // Boundary and guide lines
  const epsEdge = s('line', { class: 'edge fade' }, svgEl);
  const nLine = s('line', { class: 'line-acc fade' }, svgEl);
  const guideOneOverN = s('line', { class: 'line-muted fade' }, svgEl);

  // Axes
  const xAxis = s('line', { class: 'ax' }, svgEl);
  const yAxis = s('line', { class: 'ax' }, svgEl);

  // Groups for ticks and sequence dots
  const ticksG = s('g', {}, svgEl);
  const dotsG = s('g', {}, svgEl);
  const dots: SVGCircleElement[] = [];
  for (let n = 1; n <= MAX_N; n++) {
    dots.push(s('circle', { class: 'fade' }, dotsG));
  }
  const nRing = s('circle', { class: 'dot-ring fade' }, svgEl);

  // Labels
  const epsLbl = label(svgEl, 0, 0, '', 'lbl-acc fade', 'end');
  const nLbl = label(svgEl, 0, 0, '', 'lbl-acc fade', 'start');
  const oneOverNLbl = label(svgEl, 0, 0, '1/N', 'lbl-acc fade', 'end');

  // Draggable handle on the epsilon band edge
  const hd = handle(svgEl, {
    label: 'Tolerance epsilon',
    x: 0,
    y: 0,
    valueText: () => `epsilon ${eps.toFixed(2)}, N ${needN(eps)}`,
    onDrag: (_px, py) => {
      setEps(yScale.invert(py));
      sl.set(eps);
    },
    onKey: (_dx, dy, big) => {
      setEps(eps + dy * (big ? 0.05 : 0.01));
      sl.set(eps);
    },
  });
  hd.el.setAttribute('aria-valuemin', String(EMIN));
  hd.el.setAttribute('aria-valuemax', String(EMAX));

  // 2. Controls row (slider + Reset)
  const controlsRow = row(root);
  const sl = slider(controlsRow, {
    label: 'Tolerance ε',
    texLabel: '\\varepsilon',
    min: EMIN,
    max: EMAX,
    step: 0.01,
    value: E0,
    format: (v) => v.toFixed(2),
    onInput: (v) => {
      setEps(v);
    },
  });

  h('span', { class: 'spacer' }, controlsRow);

  let st: { go: (n: number) => void; readonly index: number };

  button(controlsRow, 'Reset', () => {
    const from = eps;
    tween((k) => {
      setEps(lerp(from, E0, k));
      sl.set(eps);
    });
    st?.go(0);
  });

  // 3. Step explanation note & Proof environment label
  const note = h('div', { class: 'fig-note' }, root);
  note.style.margin = '0.25rem 8px 0.35rem';
  h('p', { class: 'env-label' }, root, 'Proof');

  function setEps(v: number) {
    eps = clamp(v, EMIN, EMAX);
    draw();
  }

  function draw() {
    const { W, H } = view;
    xScale = scale(0, MAX_N, pad.l, W - pad.r);
    yScale = scale(-0.05, 1.08, H - pad.b, pad.t);

    const N = needN(eps);
    const y0 = yScale(0);
    const yEps = yScale(eps);
    const yOneOverN = yScale(1 / N);
    const x0 = pad.l;
    const x1 = W - pad.r;
    const xN = xScale(Math.min(N, MAX_N));
    const nVisible = N <= MAX_N;

    // Epsilon band & top edge
    attr(epsBand, {
      x: x0,
      y: yEps,
      width: x1 - x0 + 8,
      height: Math.max(0, y0 - yEps),
    });
    attr(epsEdge, {
      x1: x0,
      x2: x1 + 8,
      y1: yEps,
      y2: yEps,
    });
    attr(epsLbl, {
      x: x1 - 22,
      y: yEps - 7,
    });
    epsLbl.textContent = `ε = ${eps.toFixed(2)}`;
    hd.move(x1, yEps);

    // Step-dependent element states:
    // Step 0 (Step 1): Highlight ε band only.
    // Step 1 (Step 2): Draw N line.
    // Step 2 (Step 3): Highlight tail n ≥ N.
    // Step 3 (Step 4): Tail remains highlighted (|1/n - 0| = 1/n).
    // Steps 4-5 (Steps 5-6): Mark 1/N on y-axis between 1/n and ε.
    // Step 6 (Step 7): Show all.
    const showNLine = currentStep >= 1 && nVisible;
    const showTail = currentStep >= 2 && nVisible;
    const showOneOverN = currentStep >= 4;

    // Tail shading (x ≥ xN - half step)
    const halfStep = (xScale(1) - xScale(0)) * 0.45;
    const tailLeft = Math.max(x0, xN - halfStep);
    tailBand.style.display = showTail ? '' : 'none';
    if (showTail) {
      attr(tailBand, {
        x: tailLeft,
        y: pad.t,
        width: Math.max(0, x1 + 8 - tailLeft),
        height: y0 - pad.t,
      });
    }

    // N boundary vertical line
    nLine.style.display = showNLine ? '' : 'none';
    nLbl.style.display = showNLine ? '' : 'none';
    if (showNLine) {
      attr(nLine, {
        x1: xN,
        x2: xN,
        y1: pad.t,
        y2: y0,
      });
      const nLblOnRight = xN + 50 < x1;
      attr(nLbl, {
        x: nLblOnRight ? xN + 6 : xN - 6,
        y: pad.t + 12,
        'text-anchor': nLblOnRight ? 'start' : 'end',
      });
      nLbl.textContent = `N = ${N}`;
    }

    // 1/N guide line from y-axis to (N, 1/N)
    guideOneOverN.style.display = showOneOverN ? '' : 'none';
    oneOverNLbl.style.display = showOneOverN ? '' : 'none';
    if (showOneOverN) {
      attr(guideOneOverN, {
        x1: x0,
        x2: nVisible ? xN : x1,
        y1: yOneOverN,
        y2: yOneOverN,
      });
      attr(oneOverNLbl, {
        x: x0 - 8,
        y: yOneOverN + 4,
      });
    }

    // Ring on term a_N = 1/N
    const showRing = currentStep >= 1 && nVisible;
    nRing.style.display = showRing ? '' : 'none';
    if (showRing) {
      attr(nRing, {
        cx: xN,
        cy: yOneOverN,
        r: 6.5,
      });
    }

    // Axes
    attr(xAxis, { x1: x0 - 4, x2: x1 + 8, y1: y0, y2: y0 });
    attr(yAxis, { x1: x0, x2: x0, y1: pad.t - 6, y2: y0 + 4 });

    // Dots for sequence terms 1/n
    const rad = clamp((W - pad.l - pad.r) / MAX_N / 4.2, 2.5, 4);
    dots.forEach((d, idx) => {
      const n = idx + 1;
      const xn = xScale(n);
      const yn = yScale(a(n));
      let cls = 'dot fade';
      if (showTail) {
        cls = n < N ? 'dot-dim fade' : 'dot-acc fade';
      }
      attr(d, {
        cx: xn,
        cy: yn,
        r: rad,
        class: cls,
      });
    });

    // Axis ticks and labels
    ticksG.replaceChildren();

    // Y ticks: 0, 1, and mark for 1/N
    label(ticksG, x0 - 8, y0 + 4, '0', 'lbl', 'end');
    s('line', { class: 'ax', x1: x0 - 4, x2: x0, y1: y0, y2: y0 }, ticksG);

    label(ticksG, x0 - 8, yScale(1) + 4, '1', 'lbl', 'end');
    s('line', { class: 'ax', x1: x0 - 4, x2: x0, y1: yScale(1), y2: yScale(1) }, ticksG);

    if (showOneOverN) {
      s('line', { class: 'line-acc', x1: x0 - 4, x2: x0, y1: yOneOverN, y2: yOneOverN }, ticksG);
    }
    // Tick at ε
    s('line', { class: 'edge', x1: x0 - 4, x2: x0, y1: yEps, y2: yEps }, ticksG);

    // X ticks: 1, 4, 8, 12, 16
    const xTicks = [1, 4, 8, 12, 16];
    for (const xt of xTicks) {
      const cx = xScale(xt);
      s('line', { class: 'ax', x1: cx, x2: cx, y1: y0, y2: y0 + 4 }, ticksG);
      label(ticksG, cx, y0 + 17, String(xt), 'lbl', 'middle');
    }

    const stepNotes = [
      `Step 1: The challenger fixes an arbitrary tolerance band (0, ε) with ε = ${eps.toFixed(2)}.`,
      `Step 2: By the Archimedean property, we place the vertical cutoff at N = ${N} > 1/ε = ${(1 / eps).toFixed(2)}.`,
      `Step 3: We shade the tail n ≥ ${N}; every highlighted dot to the right of the N-line is now under inspection.`,
      `Step 4: Since 1/n > 0, the distance |1/n − 0| to the limit is simply the height 1/n of each dot.`,
      `Step 5: Because 1/n decreases as n grows, every tail term n ≥ ${N} sits at or below the dashed ceiling 1/N = ${(1 / N).toFixed(3)}.`,
      `Step 6: Our choice N > 1/ε guarantees that the ceiling 1/N = ${(1 / N).toFixed(3)} lies strictly below the band edge ε = ${eps.toFixed(2)}.`,
      `Step 7: Chaining 1/n ≤ 1/N < ε locks the entire tail n ≥ ${N} inside the ε-band, completing the proof.`,
    ];
    note.textContent = stepNotes[currentStep] ?? '';
  }

  // 4. Stepper proof lines faithfully matching the book
  const steps: Step[] = [
    {
      html: `Let ${texHtml('\\eps > 0')} be arbitrary.`,
    },
    {
      html: `Choose ${texHtml('N \\in \\N')} such that ${texHtml('N > 1/\\eps')}.`,
    },
    {
      html: `Let ${texHtml('n \\ge N')}.`,
    },
    {
      html: `${texHtml('|1/n - 0| = 1/n')}`,
    },
    {
      html: `${texHtml('1/n \\le 1/N')}`,
      why: `uses ${texHtml('n \\ge N')}`,
      uses: [2],
    },
    {
      html: `${texHtml('1/N < \\eps')}`,
      why: `uses ${texHtml('N > 1/\\eps')}`,
      uses: [1],
    },
    {
      html: `Therefore ${texHtml('1/n \\to 0')}. <span class="muted" style="float: right;" aria-label="End of proof">∎</span>`,
    },
  ];

  st = stepper(root, steps, (i) => {
    currentStep = i;
    draw();
  });

  view.onResize(draw);
  draw();
};

export default mount;
