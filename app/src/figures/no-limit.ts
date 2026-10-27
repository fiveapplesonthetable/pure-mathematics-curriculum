// Chapter 20, figure 2: no limit.
// a_n = (-1)^n has no limit. The reader drags a candidate limit L and the
// tolerance band half-width ε. For ε < 1, terms outside the band keep appearing
// for arbitrarily large n, so no N works.

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

const L0 = 0.30;
const E0 = 0.50;
const L_MIN = -1.10;
const L_MAX = 1.10;
const E_MIN = 0.10;
const E_MAX = 1.60;
const TERMS = 40;

const mount: Mount = (root) => {
  let L = L0;
  let eps = E0;

  const pad = { l: 46, r: 38, t: 22, b: 30 };
  let x = scale(1, TERMS, pad.l, 360 - pad.r);
  let y = scale(-2.4, 2.4, 260 - pad.b, pad.t);

  const view = responsiveSvg(root, {
    label:
      'Terms of the alternating sequence a_n = (-1)^n with candidate limit L and tolerance band epsilon',
    aspect: 0.52,
    minH: 260,
    maxH: 340,
  });
  const svgEl = view.el;

  // Background grid lines for the cluster values and zero
  const grid1 = s('line', { class: 'grid' }, svgEl);
  const grid0 = s('line', { class: 'grid' }, svgEl);
  const gridM1 = s('line', { class: 'grid' }, svgEl);

  // Epsilon tolerance band
  const band = s('rect', { class: 'band' }, svgEl);
  const topEdge = s('line', { class: 'edge' }, svgEl);
  const botEdge = s('line', { class: 'edge' }, svgEl);

  // Candidate limit line and label
  const limLine = s('line', { class: 'line' }, svgEl);
  const limLbl = label(svgEl, 0, 0, '', 'lbl-fg', 'start');

  // Epsilon label
  const epsLbl = label(svgEl, 0, 0, '', 'lbl-acc', 'end');

  // Axes
  const axisY = s('line', { class: 'ax' }, svgEl);
  const axisX = s('line', { class: 'ax' }, svgEl);
  const axisXLbl = label(svgEl, 0, 0, 'n', 'lbl', 'start');

  // Ticks
  const yTicks = s('g', {}, svgEl);
  const xTicks = s('g', {}, svgEl);

  // Dots for sequence terms
  const dotsG = s('g', {}, svgEl);
  const dots: SVGCircleElement[] = [];
  for (let n = 1; n <= TERMS; n++) {
    dots.push(s('circle', { r: 3.5 }, dotsG));
  }

  // Continuation markers beyond visible terms
  const contTop = label(svgEl, 0, 0, '…', 'lbl-acc', 'start');
  const contBot = label(svgEl, 0, 0, '…', 'lbl-acc', 'start');

  // Handles
  const hdL = handle(svgEl, {
    label: 'Candidate limit L',
    x: 0,
    y: 0,
    valueText: () => `L = ${L.toFixed(2)}`,
    onDrag: (_px, py) => setL(y.invert(py)),
    onKey: (_dx, dy, big) => setL(L + dy * (big ? 0.2 : 0.05)),
  });
  hdL.el.setAttribute('aria-valuemin', String(L_MIN));
  hdL.el.setAttribute('aria-valuemax', String(L_MAX));

  const hdEps = handle(svgEl, {
    label: 'Tolerance epsilon',
    x: 0,
    y: 0,
    valueText: () => `epsilon = ${eps.toFixed(2)}`,
    onDrag: (_px, py) => setEps(y.invert(py) - L),
    onKey: (_dx, dy, big) => setEps(eps + dy * (big ? 0.1 : 0.02)),
  });
  hdEps.el.setAttribute('aria-valuemin', String(E_MIN));
  hdEps.el.setAttribute('aria-valuemax', String(E_MAX));

  // Controls row, live formula, status note
  const r = row(root);
  const f = formula(root);
  r.prepend(f.el);
  f.el.style.margin = '0';
  f.el.style.flex = '1 1 260px';

  button(r, 'Reset', () => {
    const fromL = L;
    const fromEps = eps;
    tween((k) => {
      L = lerp(fromL, L0, k);
      eps = lerp(fromEps, E0, k);
      draw();
    });
  });

  const note = h('div', { class: 'fig-note' }, root);
  note.style.margin = '0.3rem 8px 0';

  function setL(v: number) {
    L = clamp(v, Math.max(L_MIN, -2.25 + eps), Math.min(L_MAX, 2.25 - eps));
    draw();
  }

  function setEps(v: number) {
    eps = clamp(v, E_MIN, Math.min(E_MAX, 2.25 - Math.abs(L)));
    draw();
  }

  function draw() {
    const { W, H } = view;
    x = scale(1, TERMS, pad.l, W - pad.r);
    y = scale(-2.4, 2.4, H - pad.b, pad.t);

    const x0 = pad.l;
    const x1 = W - pad.r;

    const yTop = y(L + eps);
    const yBot = y(L - eps);
    const yL = y(L);
    const y1Val = y(1);
    const y0Val = y(0);
    const yM1Val = y(-1);

    // Grid lines
    attr(grid1, { x1: x0, x2: x1, y1: y1Val, y2: y1Val });
    attr(grid0, { x1: x0, x2: x1, y1: y0Val, y2: y0Val });
    attr(gridM1, { x1: x0, x2: x1, y1: yM1Val, y2: yM1Val });

    // Band rect & edges
    attr(band, { x: x0, width: x1 - x0, y: yTop, height: Math.max(0, yBot - yTop) });
    attr(topEdge, { x1: x0, x2: x1, y1: yTop, y2: yTop });
    attr(botEdge, { x1: x0, x2: x1, y1: yBot, y2: yBot });

    // Limit line & label
    attr(limLine, { x1: x0, x2: x1, y1: yL, y2: yL });
    attr(limLbl, { x: x0 + 16, y: yL - 6 });
    limLbl.textContent = `L = ${L.toFixed(2)}`;

    // Epsilon label: position inside the band when top edge is below 1, or above when at/above 1
    // to avoid overlapping dots at y = 1
    const epsLabelY = L + eps < 1.0 ? yTop + 14 : yTop - 8;
    attr(epsLbl, { x: x1 - 34, y: epsLabelY });
    epsLbl.textContent = `ε = ${eps.toFixed(2)}`;

    // Axes
    attr(axisY, { x1: x0, x2: x0, y1: pad.t, y2: H - pad.b });
    attr(axisX, { x1: x0, x2: x1, y1: H - pad.b, y2: H - pad.b });
    attr(axisXLbl, { x: x1 + 8, y: H - pad.b + 4 });

    // y ticks
    yTicks.replaceChildren();
    // +1 tick
    s('line', { class: 'ax', x1: x0 - 4, x2: x0, y1: y1Val, y2: y1Val }, yTicks);
    label(yTicks, x0 - 8, y1Val + 4, '+1', 'lbl', 'end');
    // 0 tick
    s('line', { class: 'ax', x1: x0 - 4, x2: x0, y1: y0Val, y2: y0Val }, yTicks);
    label(yTicks, x0 - 8, y0Val + 4, '0', 'lbl', 'end');
    // -1 tick
    s('line', { class: 'ax', x1: x0 - 4, x2: x0, y1: yM1Val, y2: yM1Val }, yTicks);
    label(yTicks, x0 - 8, yM1Val + 4, '–1', 'lbl', 'end');

    // x ticks
    xTicks.replaceChildren();
    label(xTicks, x(1), H - pad.b + 18, 'n = 1');
    for (const tn of [10, 20, 30, 40]) {
      s('line', { class: 'ax', x1: x(tn), x2: x(tn), y1: H - pad.b, y2: H - pad.b + 4 }, xTicks);
      label(xTicks, x(tn), H - pad.b + 18, String(tn));
    }

    // Mathematical status of escape
    const evenOutside = Math.abs(1 - L) >= eps - 1e-6;
    const oddOutside = Math.abs(-1 - L) >= eps - 1e-6;

    // Dots
    dots.forEach((d, i) => {
      const n = i + 1;
      const val = n % 2 === 0 ? 1 : -1;
      const outside = val === 1 ? evenOutside : oddOutside;
      attr(d, {
        cx: x(n),
        cy: y(val),
        r: outside ? 4 : 3.2,
        class: outside ? 'dot-acc' : 'dot',
      });
    });

    // Continuation markers
    attr(contTop, {
      x: x1 + 6,
      y: y1Val + 4,
      opacity: evenOutside ? 1 : 0,
    });
    attr(contBot, {
      x: x1 + 6,
      y: yM1Val + 4,
      opacity: oddOutside ? 1 : 0,
    });

    // Move handles
    hdL.move(x0, yL);
    hdEps.move(x1 - 12, yTop);

    // Formula line
    let texStr = '';
    if (evenOutside && oddOutside) {
      texStr = `L = ${L.toFixed(2)},\\; \\varepsilon = ${eps.toFixed(2)}:\\; \\text{terms escape for ever: no } N`;
    } else if (oddOutside) {
      texStr = `L = ${L.toFixed(2)},\\; \\varepsilon = ${eps.toFixed(2)}:\\; \\text{terms escape for ever: no } N`;
    } else if (evenOutside) {
      texStr = `L = ${L.toFixed(2)},\\; \\varepsilon = ${eps.toFixed(2)}:\\; \\text{terms escape for ever: no } N`;
    } else {
      texStr = `L = ${L.toFixed(2)},\\; \\varepsilon = ${eps.toFixed(2)}:\\; \\text{every term is inside: } N = 1`;
    }
    f.set(texStr);

    note.textContent = '';
  }

  view.onResize(draw);
  draw();
};

export default mount;
