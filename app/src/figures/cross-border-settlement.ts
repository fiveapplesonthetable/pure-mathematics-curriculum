// Chapter 9: Bitcoin, USDT, Collection and Payout Providers, and Book Settlement — cross-border-settlement.
// Interactive corridor unit-margin and 4-book settlement calculator ($50,000 batch).
// Drag customer FX spread (bps) and adjust collection + USDT/HoneyCoin payout rail costs.

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

const mount: Mount = (root) => {
  const BATCH_USD = 50000;
  const MAX_SPREAD = 320; // bps
  let fxSpread = 180; // bps charged over wholesale mid-market
  let colCost = 80; // bps Collection PSP fee
  let bridgePayoutCost = 55; // bps OTC USDT swap + network gas + HoneyCoin mobile-money payout

  const pad = { l: 46, r: 18, t: 22, b: 32 };
  const view = responsiveSvg(root, {
    label: 'Cross-border mobile money net margin in basis points versus customer FX spread',
    aspect: 0.54,
    minH: 225,
    maxH: 330,
  });

  const gridG = s('g', {}, view.el);
  const lossBand = s('rect', { class: 'band-muted' }, view.el);
  const gainBand = s('polygon', { class: 'band' }, view.el);
  const zeroLine = s('line', { class: 'axis-trans' }, view.el);
  const axisX = s('line', { class: 'ax' }, view.el);
  const axisY = s('line', { class: 'ax' }, view.el);
  const ticksG = s('g', {}, view.el);

  const breakLine = s('line', { class: 'edge' }, view.el);
  const marginLine = s('path', { class: 'curve-acc' }, view.el);
  const breakLbl = label(view.el, 0, 0, '', 'lbl', 'middle');
  const titleLbl = label(view.el, 0, 0, 'Net corridor margin (bps)', 'lbl-fg', 'start');

  let xScale = scale(0, MAX_SPREAD, pad.l, 320);
  let yScale = scale(-200, 260, 200, pad.t);

  const spreadHandle = handle(view.el, {
    label: 'Customer FX spread in basis points',
    x: 0,
    y: 0,
    valueText: () => {
      const net = fxSpread - colCost - bridgePayoutCost;
      return `Spread ${fxSpread} bps, Net margin ${net} bps`;
    },
    onDrag: (px) => {
      cancelAnim();
      fxSpread = clamp(Math.round(xScale.invert(px) / 5) * 5, 0, MAX_SPREAD);
      draw();
    },
    onKey: (dx, _dy, big) => {
      cancelAnim();
      fxSpread = clamp(fxSpread + dx * (big ? 25 : 5), 0, MAX_SPREAD);
      draw();
    },
  });

  const rSliders = row(root);
  const colSlider = slider(rSliders, {
    label: 'Collection (bps)',
    min: 20,
    max: 200,
    step: 5,
    value: colCost,
    format: (v) => `${v} bps`,
    onInput: (v) => {
      cancelAnim();
      colCost = v;
      draw();
    },
  });
  const bridgeSlider = slider(rSliders, {
    label: 'USDT + payout (bps)',
    min: 15,
    max: 180,
    step: 5,
    value: bridgePayoutCost,
    format: (v) => `${v} bps`,
    onInput: (v) => {
      cancelAnim();
      bridgePayoutCost = v;
      draw();
    },
  });

  const rButtons = row(root);
  button(rButtons, 'ACH + USDT + MoMo', () => applyPreset(160, 45, 55));
  button(rButtons, 'Card + MoMo', () => applyPreset(240, 145, 55));
  button(rButtons, 'Tight B2B', () => applyPreset(95, 25, 35));
  h('span', { class: 'spacer' }, rButtons);
  button(rButtons, 'Reset', () => applyPreset(180, 80, 55));

  const f = formula(root);
  const note = h('div', { class: 'fig-note' }, root);
  note.style.margin = '0.25rem 8px 0';

  let cancelAnim = () => {};

  function applyPreset(tSpread: number, tCol: number, tBridge: number) {
    cancelAnim();
    const s0 = fxSpread;
    const c0 = colCost;
    const b0 = bridgePayoutCost;
    cancelAnim = tween((t) => {
      fxSpread = Math.round(lerp(s0, tSpread, t));
      colCost = Math.round(lerp(c0, tCol, t));
      bridgePayoutCost = Math.round(lerp(b0, tBridge, t));
      colSlider.set(colCost);
      bridgeSlider.set(bridgePayoutCost);
      draw();
    }, 300);
  }

  function draw() {
    const { W, H } = view;
    const yMin = -220;
    const yMax = 260;
    const totalCost = colCost + bridgePayoutCost;

    xScale = scale(0, MAX_SPREAD, pad.l, W - pad.r);
    yScale = scale(yMin, yMax, H - pad.b, pad.t);

    const pyZero = yScale(0);
    const pyBot = yScale(yMin);

    attr(axisX, { x1: pad.l, x2: W - pad.r, y1: pyBot, y2: pyBot });
    attr(axisY, { x1: pad.l, x2: pad.l, y1: pyBot, y2: pad.t });
    attr(zeroLine, { x1: pad.l, x2: W - pad.r, y1: pyZero, y2: pyZero });

    gridG.innerHTML = '';
    ticksG.innerHTML = '';
    for (const yt of [-150, 0, 150]) {
      const py = yScale(yt);
      if (yt !== 0) s('line', { class: 'grid', x1: pad.l, x2: W - pad.r, y1: py, y2: py }, gridG);
      label(ticksG, pad.l - 6, py + 4, `${yt > 0 ? '+' : ''}${yt}`, 'lbl', 'end');
    }
    for (const xt of [0, 80, 160, 240, 320]) {
      const px = xScale(xt);
      s('line', { class: 'ax', x1: px, x2: px, y1: pyBot, y2: pyBot + 4 }, ticksG);
      label(ticksG, px, pyBot + 18, `${xt}`, 'lbl', 'middle');
    }

    const pxBreak = xScale(clamp(totalCost, 0, MAX_SPREAD));
    attr(lossBand, {
      x: pad.l,
      y: pyZero,
      width: Math.max(0, pxBreak - pad.l),
      height: pyBot - pyZero,
    });

    if (totalCost < MAX_SPREAD) {
      const pxEnd = xScale(MAX_SPREAD);
      const pyEnd = yScale(clamp(MAX_SPREAD - totalCost, yMin, yMax));
      attr(gainBand, {
        points: `${pxBreak.toFixed(1)},${pyZero.toFixed(1)} ${pxEnd.toFixed(1)},${pyEnd.toFixed(1)} ${pxEnd.toFixed(1)},${pyZero.toFixed(1)}`,
      });
    } else {
      attr(gainBand, { points: '0,0' });
    }

    if (totalCost <= MAX_SPREAD) {
      attr(breakLine, { x1: pxBreak, x2: pxBreak, y1: pyBot, y2: pad.t, opacity: 1 });
      attr(breakLbl, { x: clamp(pxBreak, pad.l + 36, W - pad.r - 36), y: pad.t - 6, opacity: 1 });
      breakLbl.textContent = `Breakeven ${totalCost} bps`;
    } else {
      attr(breakLine, { opacity: 0 });
      attr(breakLbl, { opacity: 0 });
    }

    const p0y = yScale(clamp(-totalCost, yMin, yMax));
    const p1y = yScale(clamp(MAX_SPREAD - totalCost, yMin, yMax));
    attr(marginLine, {
      d: `M${xScale(0).toFixed(1)},${p0y.toFixed(1)} L${xScale(MAX_SPREAD).toFixed(1)},${p1y.toFixed(1)}`,
    });

    const netBps = fxSpread - totalCost;
    const pxCur = xScale(fxSpread);
    const pyCur = yScale(clamp(netBps, yMin, yMax));
    spreadHandle.move(pxCur, pyCur);
    attr(titleLbl, { x: pad.l + 8, y: pad.t + 14 });

    const sign = netBps >= 0 ? '+' : '';
    f.set(`m_{\\text{net}} = ${fxSpread} - ${colCost} - ${bridgePayoutCost} = ${sign}${netBps}\\text{ bps}`);

    const colUsd = (BATCH_USD * colCost) / 10000;
    const bridgeUsd = (BATCH_USD * bridgePayoutCost) / 10000;
    const spreadUsd = (BATCH_USD * fxSpread) / 10000;
    const netUsd = spreadUsd - colUsd - bridgeUsd;
    const settledFromPsp = BATCH_USD - colUsd;
    const recipientMidVal = BATCH_USD - spreadUsd;
    note.textContent = `On a $50,000 batch: Collection PSP settles $${settledFromPsp.toFixed(0)} (after $${colUsd.toFixed(0)} fee); USDT bridge + HoneyCoin payout rail cost $${bridgeUsd.toFixed(0)}; recipients receive $${recipientMidVal.toFixed(0)} at mid-market KES; net settled profit is ${netUsd >= 0 ? '+' : '-'}$${Math.abs(netUsd).toFixed(0)}.`;
  }

  view.onResize(draw);
  draw();
};

export default mount;
