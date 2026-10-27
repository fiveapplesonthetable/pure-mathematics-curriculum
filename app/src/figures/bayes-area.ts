// Probability Chapter 5: Bayes' Theorem
// Figure: bayes-area
// Visualises Bayes' theorem as areas in a unit square partitioned by
// condition (prevalence) and test result (sensitivity and false positive rate).
// True positives (accent) form a narrow sliver when the condition is rare,
// easily dwarfed by false positives (muted) from the large healthy population.

import {
  responsiveSvg,
  s,
  h,
  attr,
  row,
  button,
  slider,
  formula,
  tween,
  clamp,
  lerp,
  label,
  type Mount,
} from './lib';

const P_MIN = 0.001; // 0.1%
const P_MAX = 0.5; // 50%
const P_DEFAULT = 0.001;
const SENS_DEFAULT = 0.99;
const FPR_DEFAULT = 0.05;

// Log-friendly mapping between slider [0..100] and prevalence [0.001..0.50]
function uToPrev(u: number): number {
  return P_MIN * Math.pow(P_MAX / P_MIN, clamp(u, 0, 100) / 100);
}

function formatPercent(p: number): string {
  const pct = p * 100;
  if (pct < 0.95) return pct.toFixed(1) + '%';
  if (pct > 99.05 && pct < 99.95) return pct.toFixed(1) + '%';
  if (pct < 9.95) return pct.toFixed(1) + '%';
  return Math.round(pct) + '%';
}

function formatProb(p: number): string {
  if (p < 0.001) return p.toFixed(5);
  if (p < 0.01) return p.toFixed(5);
  if (p < 0.1) return p.toFixed(5);
  return p.toFixed(4);
}

function formatCount(v: number): string {
  if (Math.abs(v - Math.round(v)) < 0.05) {
    return Math.round(v).toLocaleString();
  }
  return (Math.round(v * 10) / 10).toLocaleString();
}

const mount: Mount = (root) => {
  let prev = P_DEFAULT;
  let sens = SENS_DEFAULT;
  let fpr = FPR_DEFAULT;

  const view = responsiveSvg(root, {
    label: 'Unit square visualising Bayes theorem as areas for a medical diagnostic test',
    aspect: 0.72,
    minH: 260,
    maxH: 330,
  });
  const svgEl = view.el;

  // SVG layers
  const rectsG = s('g', {}, svgEl);
  const bordersG = s('g', {}, svgEl);
  const guidesG = s('g', {}, svgEl);
  const labelsG = s('g', {}, svgEl);

  // Unit square regions
  const outerSquare = s('rect', { class: 'ax' }, rectsG);
  const tpRect = s('rect', { class: 'area-tp' }, rectsG);
  const fnRect = s('rect', { class: 'area-neg' }, rectsG);
  const fpRect = s('rect', { class: 'area-fp' }, rectsG);
  const tnRect = s('rect', { class: 'area-neg' }, rectsG);

  // Dividing lines
  const vertLine = s('line', { class: 'line' }, bordersG);
  const tpLine = s('line', { class: 'line-acc' }, bordersG);
  const fpLine = s('line', { class: 'line-muted' }, bordersG);
  const fpPointer = s('line', { class: 'line-muted' }, bordersG);

  // Leader line & dot for thin TP sliver
  const leaderLine = s('polyline', { class: 'line-acc' }, guidesG);
  const leaderDot = s('circle', { class: 'dot-acc', r: 2.5 }, guidesG);

  // Text labels
  const colLabelD = label(labelsG, 0, 0, '', 'lbl-fg', 'start');
  const colLabelDc = label(labelsG, 0, 0, '', 'lbl-fg', 'end');

  const tpLeaderText = s('text', { class: 'lbl-acc' }, labelsG);
  const tpTspan1 = s('tspan', {}, tpLeaderText);
  const tpTspan2 = s('tspan', {}, tpLeaderText);

  const fpLabel = label(labelsG, 0, 0, '', 'lbl', 'middle');
  const tnLabel = label(labelsG, 0, 0, '', 'lbl dim', 'middle');

  // Natural frequencies note under the SVG
  const noteRow = row(root);
  const noteEl = h('span', { class: 'fig-note' }, noteRow);

  // Live KaTeX formula
  const f = formula(root);

  // Control rows
  const r1 = row(root);
  const sPrev = slider(r1, {
    label: 'Prevalence P(D)',
    texLabel: 'P(D)',
    min: 0,
    max: 100,
    step: 1,
    value: 0,
    format: (u) => formatPercent(uToPrev(u)),
    onInput: (u) => {
      prev = uToPrev(u);
      sPrev.input.setAttribute('aria-valuetext', formatPercent(prev));
      draw();
    },
  });
  sPrev.input.setAttribute('aria-valuetext', formatPercent(prev));

  h('span', { class: 'spacer' }, r1);
  button(r1, 'Reset', () => reset());

  const r2 = row(root);
  const sSens = slider(r2, {
    label: 'Sensitivity P(+|D)',
    texLabel: 'P(+ \\mid D)',
    min: 50,
    max: 100,
    step: 1,
    value: 99,
    format: (v) => v + '%',
    onInput: (v) => {
      sens = v / 100;
      draw();
    },
  });

  const sFpr = slider(r2, {
    label: 'False positive rate P(+|Dᶜ)',
    texLabel: 'P(+ \\mid D^c)',
    min: 0.1,
    max: 20,
    step: 0.1,
    value: 5,
    format: (v) => (v < 1 ? v.toFixed(1) : v % 1 === 0 ? v.toFixed(0) : v.toFixed(1)) + '%',
    onInput: (v) => {
      fpr = v / 100;
      draw();
    },
  });

  let animCancel = () => {};
  function reset() {
    animCancel();
    const fromU = sPrev.value;
    const fromSens = sSens.value;
    const fromFpr = sFpr.value;
    animCancel = tween((k) => {
      const curU = lerp(fromU, 0, k);
      const curSens = lerp(fromSens, 99, k);
      const curFpr = lerp(fromFpr, 5, k);
      sPrev.set(Math.round(curU));
      sSens.set(Math.round(curSens));
      sFpr.set(Math.round(curFpr * 10) / 10);
      prev = uToPrev(curU);
      sens = curSens / 100;
      fpr = curFpr / 100;
      sPrev.input.setAttribute('aria-valuetext', formatPercent(prev));
      draw();
    }, 350);
  }

  function draw() {
    const { W, H } = view;

    // Available space for unit square
    const pad = { t: 30, b: 20, l: 94, r: 20 };
    const availH = H - pad.t - pad.b;
    const availW = W - pad.l - pad.r;
    const sqSize = Math.max(160, Math.min(availH, availW, 250));

    // Position square: centered on wide laptop screens, left-aligned with margin on phones
    const sqX = W >= 540 ? Math.round((W - sqSize) / 2) + 30 : pad.l;
    const sqY = pad.t + Math.max(0, Math.floor((availH - sqSize) / 2));

    // Calculate drawn widths: guarantee minimum drawn width 2px for thin slivers
    const rawW = sqSize * prev;
    const drawnW = Math.max(2, Math.round(rawW));
    const rightW = sqSize - drawnW;

    // Heights for positive/negative splits in both columns
    const hTP = Math.max(2, Math.min(sqSize - 2, Math.round(sqSize * sens)));
    const hFN = sqSize - hTP;
    const hFP = Math.max(2, Math.min(sqSize - 2, Math.round(sqSize * fpr)));
    const hTN = sqSize - hFP;

    // 1. Regions
    attr(outerSquare, { x: sqX, y: sqY, width: sqSize, height: sqSize });
    attr(tpRect, { x: sqX, y: sqY, width: drawnW, height: hTP });
    attr(fnRect, { x: sqX, y: sqY + hTP, width: drawnW, height: hFN });
    attr(fpRect, { x: sqX + drawnW, y: sqY, width: rightW, height: hFP });
    attr(tnRect, { x: sqX + drawnW, y: sqY + hFP, width: rightW, height: hTN });

    // 2. Boundary / division lines
    attr(vertLine, { x1: sqX + drawnW, y1: sqY, x2: sqX + drawnW, y2: sqY + sqSize });
    attr(tpLine, { x1: sqX, y1: sqY + hTP, x2: sqX + drawnW, y2: sqY + hTP });
    attr(fpLine, { x1: sqX + drawnW, y1: sqY + hFP, x2: sqX + sqSize, y2: sqY + hFP });

    // 3. Leader line & label for True Positives
    const isThinSliver = drawnW < 45;
    const yAnchor = sqY + Math.min(35, Math.max(14, Math.round(hTP * 0.3)));

    if (isThinSliver) {
      const xSliver = sqX + drawnW / 2;
      const xLeaderEnd = sqX - 8;
      attr(leaderLine, {
        points: `${xSliver},${yAnchor} ${xLeaderEnd},${yAnchor}`,
        opacity: 1,
      });
      attr(leaderDot, { cx: xSliver, cy: yAnchor, opacity: 1 });

      attr(tpLeaderText, { 'text-anchor': 'end' });
      attr(tpTspan1, { x: sqX - 12, y: yAnchor - 2 });
      tpTspan1.textContent = W < 420 ? 'True pos.' : 'True positives';
      attr(tpTspan2, { x: sqX - 12, dy: 14 });
      tpTspan2.textContent = '(TP)';
    } else {
      attr(leaderLine, { opacity: 0 });
      attr(leaderDot, { opacity: 0 });

      const cx = sqX + drawnW / 2;
      attr(tpLeaderText, { 'text-anchor': 'middle' });
      attr(tpTspan1, { x: cx, y: sqY + Math.min(hTP / 2 - 2, 40) });
      tpTspan1.textContent = drawnW < 75 ? 'True pos.' : 'True positives';
      attr(tpTspan2, { x: cx, dy: 14 });
      tpTspan2.textContent = '(TP)';
    }

    // 4. False Positives label & pointer
    const fpCx = sqX + drawnW + rightW / 2;
    if (hFP >= 22) {
      attr(fpPointer, { opacity: 0 });
      attr(fpLabel, { x: fpCx, y: sqY + hFP / 2 + 4, opacity: 1 });
      fpLabel.textContent = rightW >= 120 ? 'False positives (FP)' : 'FP';
    } else {
      attr(fpPointer, {
        x1: fpCx,
        y1: sqY + hFP + 2,
        x2: fpCx,
        y2: sqY + hFP + 8,
        opacity: 0.5,
      });
      attr(fpLabel, { x: fpCx, y: sqY + hFP + 20, opacity: 1 });
      fpLabel.textContent = rightW >= 120 ? 'False positives (FP)' : 'FP';
    }

    // 5. True Negatives label
    if (hTN >= 38) {
      attr(tnLabel, { x: fpCx, y: sqY + hFP + hTN / 2 + 5, opacity: 1 });
      tnLabel.textContent = rightW >= 130 ? 'True negatives (TN)' : 'TN';
    } else {
      attr(tnLabel, { opacity: 0 });
    }

    // 6. Column headers at top
    attr(colLabelD, { x: sqX, y: sqY - 8 });
    colLabelD.textContent = `D (${formatPercent(prev)})`;

    attr(colLabelDc, { x: sqX + sqSize, y: sqY - 8 });
    colLabelDc.textContent = `Dᶜ (${formatPercent(1 - prev)})`;

    // 7. Natural frequencies readout
    const countD = 10000 * prev;
    const countTP = countD * sens;
    const countFP = 10000 * (1 - prev) * fpr;
    noteEl.textContent = `Out of 10,000 people: ${formatCount(countTP)} true positives, ${formatCount(countFP)} false positives`;

    // 8. Formula readout
    const tp = prev * sens;
    const fp = (1 - prev) * fpr;
    const post = tp / (tp + fp);
    if (W < 460) {
      f.set(
        `P(D \\mid +) = \\frac{\\text{TP}}{\\text{TP} + \\text{FP}} = \\frac{${formatProb(tp)}}{${formatProb(tp + fp)}} \\approx ${(post * 100).toFixed(1)}\\%`,
      );
    } else {
      f.set(
        `P(D \\mid +) = \\frac{\\text{TP}}{\\text{TP} + \\text{FP}} = \\frac{${formatProb(tp)}}{${formatProb(tp)} + ${formatProb(fp)}} \\approx ${(post * 100).toFixed(1)}\\%`,
      );
    }
  }

  view.onResize(draw);
  draw();
};

export default mount;
