// Chapter 6: Liquidation Waterfalls, Vesting, and Founder Contracts — liquidation-waterfall.
// Compares Common/Founder payout vs Preferred Investor payout across exit enterprise values E.
// Modes: 1x non-participating, 1x participating, and 2x non-participating preferred stock.

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

type PrefMode = '1x-nonpart' | '1x-part' | '2x-nonpart';

function preferredPayout(E: number, inv: number, alpha: number, mode: PrefMode): number {
  if (E <= 0) return 0;
  if (mode === '1x-nonpart') {
    const pref = Math.min(E, inv);
    const conv = alpha * E;
    return Math.max(pref, conv);
  }
  if (mode === '2x-nonpart') {
    const pref = Math.min(E, 2 * inv);
    const conv = alpha * E;
    return Math.max(pref, conv);
  }
  // 1x participating: takes L first, plus alpha of remaining (E - L)
  if (E <= inv) return E;
  return inv + alpha * (E - inv);
}

const mount: Mount = (root) => {
  const MAX_E = 120; // $M
  let exitVal = 50; // $M
  let invest = 20; // $M
  let alphaPct = 25; // %
  let mode: PrefMode = '1x-nonpart';

  const pad = { l: 42, r: 26, t: 22, b: 32 };
  const view = responsiveSvg(root, {
    label: 'Startup exit waterfall showing founder common payout and preferred investor payout versus exit value',
    aspect: 0.56,
    minH: 230,
    maxH: 340,
  });

  const gridG = s('g', {}, view.el);
  const deadZone = s('rect', { class: 'band-muted' }, view.el);
  const axisX = s('line', { class: 'ax' }, view.el);
  const axisY = s('line', { class: 'ax' }, view.el);
  const ticksG = s('g', {}, view.el);

  const convLine = s('line', { class: 'edge' }, view.el);
  const cursorLine = s('line', { class: 'line-muted' }, view.el);

  const prefPath = s('path', { class: 'curve-muted' }, view.el);
  const comPath = s('path', { class: 'curve-acc' }, view.el);

  const prefDot = s('circle', { class: 'dot-ring', r: 4.5 }, view.el);
  const legCom = label(view.el, 0, 0, 'Common (founders)', 'lbl-acc', 'start');
  const legPref = label(view.el, 0, 0, 'Preferred (investor)', 'lbl', 'start');
  const convLbl = label(view.el, 0, 0, '', 'lbl', 'middle');

  let xScale = scale(0, MAX_E, pad.l, 320);
  let yScale = scale(0, MAX_E, 200, pad.t);

  const exitHandle = handle(view.el, {
    label: 'Exit enterprise value in millions',
    x: 0,
    y: 0,
    valueText: () => {
      const p = preferredPayout(exitVal, invest, alphaPct / 100, mode);
      const c = Math.max(0, exitVal - p);
      return `Exit ${exitVal.toFixed(0)}M, Common ${c.toFixed(1)}M, Preferred ${p.toFixed(1)}M`;
    },
    onDrag: (px) => {
      cancelAnim();
      exitVal = clamp(Math.round(xScale.invert(px)), 0, MAX_E);
      draw();
    },
    onKey: (dx, _dy, big) => {
      cancelAnim();
      exitVal = clamp(exitVal + dx * (big ? 10 : 2), 0, MAX_E);
      draw();
    },
  });

  const rSliders = row(root);
  const invSlider = slider(rSliders, {
    label: 'Invested ($M)',
    min: 5,
    max: 40,
    step: 1,
    value: invest,
    format: (v) => `$${v}M`,
    onInput: (v) => {
      cancelAnim();
      invest = v;
      draw();
    },
  });
  const alphaSlider = slider(rSliders, {
    label: 'Investor %',
    min: 10,
    max: 50,
    step: 1,
    value: alphaPct,
    format: (v) => `${v}%`,
    onInput: (v) => {
      cancelAnim();
      alphaPct = v;
      draw();
    },
  });

  const rButtons = row(root);
  const btn1xNP = button(rButtons, '1x non-part.', () => setMode('1x-nonpart'));
  const btn1xP = button(rButtons, '1x participating', () => setMode('1x-part'));
  const btn2xNP = button(rButtons, '2x non-part.', () => setMode('2x-nonpart'));
  h('span', { class: 'spacer' }, rButtons);
  button(rButtons, 'Reset', () => reset());

  const f = formula(root);
  const note = h('div', { class: 'fig-note' }, root);
  note.style.margin = '0.25rem 8px 0';

  let cancelAnim = () => {};

  function syncModeButtons() {
    btn1xNP.setAttribute('aria-pressed', String(mode === '1x-nonpart'));
    btn1xP.setAttribute('aria-pressed', String(mode === '1x-part'));
    btn2xNP.setAttribute('aria-pressed', String(mode === '2x-nonpart'));
  }

  function setMode(next: PrefMode) {
    cancelAnim();
    mode = next;
    syncModeButtons();
    draw();
  }

  function reset() {
    cancelAnim();
    const sE = exitVal;
    const sI = invest;
    const sA = alphaPct;
    mode = '1x-nonpart';
    syncModeButtons();
    cancelAnim = tween((t) => {
      exitVal = Math.round(lerp(sE, 50, t));
      invest = Math.round(lerp(sI, 20, t));
      alphaPct = Math.round(lerp(sA, 25, t));
      invSlider.set(invest);
      alphaSlider.set(alphaPct);
      draw();
    }, 300);
  }

  function draw() {
    const { W, H } = view;
    const alpha = alphaPct / 100;
    const mult = mode === '2x-nonpart' ? 2 : 1;
    const liqPref = mult * invest;
    const yMax = 100;

    xScale = scale(0, MAX_E, pad.l, W - pad.r);
    yScale = scale(0, yMax, H - pad.b, pad.t);
    const py0 = yScale(0);

    attr(axisX, { x1: pad.l, x2: W - pad.r, y1: py0, y2: py0 });
    attr(axisY, { x1: pad.l, x2: pad.l, y1: py0, y2: pad.t });

    gridG.innerHTML = '';
    ticksG.innerHTML = '';
    for (const yt of [25, 50, 75, 100]) {
      const py = yScale(yt);
      s('line', { class: 'grid', x1: pad.l, x2: W - pad.r, y1: py, y2: py }, gridG);
      label(ticksG, pad.l - 6, py + 4, `$${yt}`, 'lbl', 'end');
    }
    for (const xt of [0, 30, 60, 90, 120]) {
      const px = xScale(xt);
      s('line', { class: 'ax', x1: px, x2: px, y1: py0, y2: py0 + 4 }, ticksG);
      label(ticksG, px, py0 + 18, `$${xt}M`, 'lbl', xt === MAX_E ? 'end' : 'middle');
    }

    // Liquidation overhang zone [0, liqPref] where Common gets $0
    const pxPrefEnd = xScale(Math.min(MAX_E, liqPref));
    attr(deadZone, {
      x: pad.l,
      y: pad.t,
      width: Math.max(0, pxPrefEnd - pad.l),
      height: py0 - pad.t,
    });

    // Conversion threshold line for non-participating modes
    if (mode !== '1x-part') {
      const eStar = liqPref / alpha;
      if (eStar <= MAX_E) {
        const pxStar = xScale(eStar);
        attr(convLine, { x1: pxStar, x2: pxStar, y1: py0, y2: pad.t, opacity: 1 });
        attr(convLbl, { x: clamp(pxStar, pad.l + 28, W - pad.r - 28), y: pad.t - 6, opacity: 1 });
        convLbl.textContent = `E* = $${eStar.toFixed(0)}M`;
      } else {
        attr(convLine, { opacity: 0 });
        attr(convLbl, { opacity: 0 });
      }
    } else {
      attr(convLine, { opacity: 0 });
      attr(convLbl, { opacity: 0 });
    }

    // Curves
    const N = 120;
    let dPref = '';
    let dCom = '';
    for (let i = 0; i <= N; i++) {
      const ev = (i / N) * MAX_E;
      const pv = Math.min(yMax, preferredPayout(ev, invest, alpha, mode));
      const cv = Math.min(yMax, Math.max(0, ev - preferredPayout(ev, invest, alpha, mode)));
      const px = xScale(ev);
      dPref += (i === 0 ? 'M' : ' L') + `${px.toFixed(1)},${yScale(pv).toFixed(1)}`;
      dCom += (i === 0 ? 'M' : ' L') + `${px.toFixed(1)},${yScale(cv).toFixed(1)}`;
    }
    attr(prefPath, { d: dPref });
    attr(comPath, { d: dCom });

    const curPref = preferredPayout(exitVal, invest, alpha, mode);
    const curCom = Math.max(0, exitVal - curPref);
    const pxCur = xScale(exitVal);
    const pyCom = yScale(Math.min(yMax, curCom));
    const pyPref = yScale(Math.min(yMax, curPref));

    attr(cursorLine, { x1: pxCur, x2: pxCur, y1: py0, y2: pad.t });
    attr(prefDot, { cx: pxCur, cy: pyPref });
    exitHandle.move(pxCur, pyCom);

    attr(legCom, { x: pad.l + 8, y: pad.t + 14 });
    attr(legPref, { x: pad.l + 8, y: pad.t + 30 });

    f.set(`E = ${exitVal.toFixed(0)},\\; P_{\\text{com}} = ${curCom.toFixed(1)},\\; P_{\\text{pref}} = ${curPref.toFixed(1)}`);

    const impliedPost = invest / alpha;
    if (exitVal <= liqPref) {
      note.textContent = `Implied post-money valuation is $${impliedPost.toFixed(0)}M. Below the $${liqPref.toFixed(0)}M preference stack, preferred holders take 100% of exit proceeds and common shares receive $0.`;
    } else if (mode === '1x-part') {
      note.textContent = `Under 1x participating preferred, the investor takes $${invest}M off the top plus ${alphaPct}% of the remaining $${(exitVal - invest).toFixed(0)}M, leaving founders ${(curCom / exitVal * 100).toFixed(1)}% of the exit.`;
    } else {
      const eStar = liqPref / alpha;
      const converted = exitVal > eStar;
      note.textContent = converted
        ? `Exit ($${exitVal}M) exceeds conversion threshold E* = $${eStar.toFixed(0)}M: preferred converts to ${alphaPct}% common ($${curPref.toFixed(1)}M) and founders receive ${100 - alphaPct}% ($${curCom.toFixed(1)}M).`
        : `Between $${liqPref}M and E* = $${eStar.toFixed(0)}M, preferred keeps its flat $${liqPref}M liquidation preference while common collects every dollar above $${liqPref}M.`;
    }
  }

  syncModeButtons();
  view.onResize(draw);
  draw();
};

export default mount;
