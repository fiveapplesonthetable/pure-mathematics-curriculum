// Chapter 20, figure 1: the epsilon band.
// a_n = 1 + (-1)^n / n converges to L = 1. The reader drags the band edge to
// choose ε; the smallest N that honours the contract moves live, and the axis
// zooms out when N runs past the visible terms.

import { responsiveSvg, s, attr, handle, row, button, formula, tween, clamp, scale, label, lerp, type Mount } from './lib';

const L = 1;
const a = (n: number) => 1 + (n % 2 ? -1 : 1) / n;
// |a_n - 1| = 1/n < ε  ⇔  n > 1/ε, so the least N is floor(1/ε) + 1.
const needN = (e: number) => Math.floor(1 / e + 1e-9) + 1;
const E0 = 0.15;
const EMIN = 0.02;
const EMAX = 0.6;
const MAXN = 160;

const mount: Mount = (root) => {
  let eps = E0;
  let shown = 30; // number of terms on screen (animated when N grows)
  const pad = { l: 34, r: 30, t: 18, b: 30 };
  let x = scale(1, shown, 0, 1);
  let y = scale(-0.05, 1.6, 1, 0);

  const view = responsiveSvg(root, { label: 'Terms of the sequence a_n = 1 + (-1)^n / n with a draggable tolerance band around the limit 1', aspect: 0.5, minH: 260, maxH: 340 });
  const svgEl = view.el;

  const tail = s('rect', { class: 'band-muted' }, svgEl);
  const band = s('rect', { class: 'band' }, svgEl);
  const top = s('line', { class: 'edge' }, svgEl);
  const bot = s('line', { class: 'edge' }, svgEl);
  const axis = s('line', { class: 'ax' }, svgEl);
  const lim = s('line', { class: 'line' }, svgEl);
  const limLbl = label(svgEl, 0, 0, 'L = 1', 'lbl-fg', 'start');
  const epsLbl = label(svgEl, 0, 0, '', 'lbl-acc', 'end');
  const nLine = s('line', { class: 'line-acc' }, svgEl);
  const nLbl = label(svgEl, 0, 0, '', 'lbl-acc', 'start');
  const ticks = s('g', {}, svgEl);
  const dotsG = s('g', {}, svgEl);
  const dots: SVGCircleElement[] = [];
  for (let n = 1; n <= MAXN; n++) dots.push(s('circle', { r: 4 }, dotsG));
  const worst = s('circle', { class: 'dot-ring', r: 7 }, svgEl);

  const hd = handle(svgEl, {
    label: 'Tolerance epsilon',
    x: 0,
    y: 0,
    valueText: () => `epsilon ${eps.toFixed(2)}, N ${needN(eps)}`,
    onDrag: (_px, py) => setEps(y.invert(py) - L),
    onKey: (_dx, dy, big) => setEps(eps + dy * (big ? 0.05 : 0.01)),
  });
  hd.el.setAttribute('aria-valuemin', String(EMIN));
  hd.el.setAttribute('aria-valuemax', String(EMAX));

  const f = formula(root);
  const r = row(root);
  button(r, 'Reset', () => {
    const from = eps;
    tween((k) => setEps(lerp(from, E0, k)));
  });

  let zoomCancel = () => {};
  function setEps(v: number) {
    eps = clamp(v, EMIN, EMAX);
    const N = needN(eps);
    // keep a little tail after N visible; zoom smoothly when it changes range
    const want = clamp(Math.max(30, Math.ceil((N * 1.6) / 10) * 10), 30, MAXN);
    if (want !== shown) {
      zoomCancel();
      const from = shown;
      zoomCancel = tween((k) => {
        shown = lerp(from, want, k);
        draw();
      }, 350);
    }
    draw();
  }

  function draw() {
    const { W, H } = view;
    x = scale(1, shown, pad.l, W - pad.r);
    y = scale(-0.05, 1.6, H - pad.b, pad.t);
    const N = needN(eps);
    const yt = y(L + eps), yb = y(L - eps), xN = x(N);
    const x0 = pad.l - 12, x1 = W - pad.r + 12;
    attr(band, { x: x0, width: x1 - x0, y: yt, height: yb - yt });
    attr(tail, { x: Math.min(xN, x1), width: Math.max(0, x1 - xN), y: pad.t, height: H - pad.b - pad.t });
    attr(top, { x1: x0, x2: x1, y1: yt, y2: yt });
    attr(bot, { x1: x0, x2: x1, y1: yb, y2: yb });
    attr(axis, { x1: x0, x2: x1, y1: H - pad.b, y2: H - pad.b });
    attr(lim, { x1: x0, x2: x1, y1: y(L), y2: y(L) });
    attr(limLbl, { x: x0 + 2, y: y(L) - 6 });
    attr(epsLbl, { x: x1 - 26, y: yt - 8 });
    epsLbl.textContent = `ε = ${eps.toFixed(2)}`;
    const nVisible = N <= shown;
    attr(nLine, { x1: xN, x2: xN, y1: pad.t, y2: H - pad.b, opacity: nVisible ? 1 : 0 });
    attr(nLbl, { x: Math.min(xN + 6, W - 70), y: pad.t + 12, opacity: nVisible ? 1 : 0 });
    nLbl.textContent = `N = ${N}`;
    const rad = clamp((W - pad.l - pad.r) / shown / 3, 1.6, 4.5);
    dots.forEach((d, i) => {
      const n = i + 1;
      const on = n <= Math.ceil(shown);
      d.style.display = on ? '' : 'none';
      if (!on) return;
      attr(d, { cx: x(n), cy: y(a(n)), r: rad, class: n < N ? 'dot-dim' : 'dot' });
    });
    attr(worst, { cx: x(N), cy: y(a(N)), r: rad + 3.5, opacity: nVisible ? 1 : 0 });
    hd.move(x1 - 12, yt);
    // n ticks
    ticks.replaceChildren();
    const stepT = shown > 80 ? 40 : shown > 40 ? 20 : 10;
    for (let n = stepT; n <= shown; n += stepT) label(ticks, x(n), H - pad.b + 18, String(n));
    label(ticks, x(1), H - pad.b + 18, 'n = 1');

    f.set(
      `N=${N}:\\ \\ n\\ge ${N}\\implies |a_n-1|=\\tfrac1n\\le\\tfrac1{${N}}<${eps.toFixed(2)}=\\varepsilon`,
    );
  }
  view.onResize(draw);
  draw();
};

export default mount;
