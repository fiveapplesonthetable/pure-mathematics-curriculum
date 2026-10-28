import {
  responsiveSvg,
  s,
  h,
  attr,
  handle,
  slider,
  row,
  button,
  formula,
  tween,
  clamp,
  lerp,
  label,
  type Mount,
} from './lib';

// Book defaults from linear-algebra chapter 3:
// v = (2, 1), w = (1, 2) laying down the skewed grid (Section 3.3.2).
const V0 = { x: 2, y: 1 };
const W0 = { x: 1, y: 2 };
const A0 = 1.5;
const B0 = 1.0;

function fmtNum(n: number): string {
  const r = Math.round(n * 100) / 100;
  if (Math.abs(r) < 1e-6) return '0';
  if (Number.isInteger(r)) return String(r);
  return String(+r.toFixed(2));
}

function cleanCoord(val: number): number {
  const r = Math.round(val);
  if (Math.abs(val - r) < 0.08) return r;
  return Math.round(val * 4) / 4;
}

function updateArrow(
  lineEl: SVGElement,
  headEl: SVGElement,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  headLen = 9,
) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len < 2) {
    attr(lineEl, { x1, y1, x2, y2, opacity: 0 });
    attr(headEl, { d: '', opacity: 0 });
    return;
  }
  const angle = Math.atan2(dy, dx);
  const ang = Math.PI / 6.5;
  const backOff = headLen * 0.7;
  const lx2 = len > backOff ? x2 - backOff * Math.cos(angle) : x1;
  const ly2 = len > backOff ? y2 - backOff * Math.sin(angle) : y1;

  attr(lineEl, { x1, y1, x2: lx2, y2: ly2, opacity: 1 });

  const leftX = x2 - headLen * Math.cos(angle - ang);
  const leftY = y2 - headLen * Math.sin(angle - ang);
  const rightX = x2 - headLen * Math.cos(angle + ang);
  const rightY = y2 - headLen * Math.sin(angle + ang);
  const indentX = x2 - headLen * 0.75 * Math.cos(angle);
  const indentY = y2 - headLen * 0.75 * Math.sin(angle);

  const headD = `M ${x2} ${y2} L ${leftX} ${leftY} L ${indentX} ${indentY} L ${rightX} ${rightY} Z`;
  attr(headEl, { d: headD, opacity: 1 });
}

function placeMidLabel(
  el: SVGTextElement,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  offset = 14,
) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len < 2) {
    attr(el, { opacity: 0 });
    return;
  }
  const nx = -dy / len;
  const ny = dx / len;
  const mx = (x1 + x2) / 2 + nx * offset;
  const my = (y1 + y2) / 2 + ny * offset + 4;
  attr(el, { x: mx, y: my, opacity: 1 });
}

function placeTipLabel(
  el: SVGTextElement,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  W: number,
  H: number,
  offset = 12,
) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len < 2) {
    attr(el, { opacity: 0 });
    return;
  }
  const ux = dx / len;
  const uy = dy / len;
  const lx = clamp(x2 + ux * offset, 40, W - 45);
  const ly = clamp(y2 + uy * offset + 4, 18, H - 12);
  attr(el, { x: lx, y: ly, opacity: 1 });
}

const mount: Mount = (root) => {
  const v = { ...V0 };
  const w = { ...W0 };
  let a = A0;
  let b = B0;

  const view = responsiveSvg(root, {
    label: 'Linear combination a v + b w in the plane with draggable vectors and sliders',
    aspect: 0.75,
    minH: 260,
    maxH: 380,
  });
  const svgEl = view.el;

  // Defs & Clip path
  const defs = s('defs', {}, svgEl);
  const clipId = 'span-clip-' + Math.random().toString(36).slice(2, 8);
  const clip = s('clipPath', { id: clipId }, defs);
  const clipRect = s('rect', {}, clip);

  // Background Cartesian Grid (coverage for any aspect ratio)
  const bgGridG = s('g', { 'clip-path': `url(#${clipId})` }, svgEl);
  const vGridLines: SVGLineElement[] = [];
  const hGridLines: SVGLineElement[] = [];
  for (let k = -15; k <= 15; k++) {
    if (k !== 0) vGridLines.push(s('line', { class: 'grid' }, bgGridG));
  }
  for (let k = -10; k <= 10; k++) {
    if (k !== 0) hGridLines.push(s('line', { class: 'grid' }, bgGridG));
  }

  // Coordinate axes
  const axesG = s('g', {}, svgEl);
  const xAxis = s('line', { class: 'ax' }, axesG);
  const yAxis = s('line', { class: 'ax' }, axesG);
  const xLabel = label(axesG, 0, 0, 'x', 'lbl', 'end');
  const yLabel = label(axesG, 0, 0, 'y', 'lbl', 'start');

  // Skewed grid lattice (7 lines parallel to w, 7 lines parallel to v)
  const skewedGridG = s('g', { 'clip-path': `url(#${clipId})` }, svgEl);
  const skewedLinesV: SVGLineElement[] = [];
  const skewedLinesW: SVGLineElement[] = [];
  for (let i = -3; i <= 3; i++) {
    skewedLinesV.push(s('line', { class: 'grid', style: 'opacity: 0.22;' }, skewedGridG));
    skewedLinesW.push(s('line', { class: 'grid', style: 'opacity: 0.22;' }, skewedGridG));
  }

  // Collapsed span line and note (when |det| < 0.05)
  const spanLine = s('line', { 'clip-path': `url(#${clipId})`, class: 'curve-muted', style: 'stroke-width: 2;' }, svgEl);
  const spanNote = label(svgEl, 24, 32, 'span is a line', 'lbl', 'start');
  spanNote.style.display = 'none';

  // Parallelogram fill
  const poly = s('polygon', { class: 'band-muted' }, svgEl);

  // Scaled vectors and tip-to-tail dashed segments
  const avLine = s('line', { class: 'line-muted' }, svgEl);
  const bwLine = s('line', { class: 'line-muted' }, svgEl);
  const tailBwLine = s('line', { class: 'line-muted' }, svgEl);
  const tailAvLine = s('line', { class: 'line-muted' }, svgEl);

  // Base vector v: solid line + stealth head + label
  const vLine = s('line', { class: 'curve' }, svgEl);
  const vHead = s('path', { class: 'dot' }, svgEl);
  const vLbl = label(svgEl, 0, 0, 'v', 'lbl-fg', 'middle');

  // Base vector w: solid line + stealth head + label
  const wLine = s('line', { class: 'curve-muted' }, svgEl);
  const wHead = s('path', { class: 'dot-dim' }, svgEl);
  const wLbl = label(svgEl, 0, 0, 'w', 'lbl', 'middle');

  // Result vector a·v + b·w: accent curve + accent head + dot + label
  const resLine = s('line', { class: 'curve-acc' }, svgEl);
  const resHead = s('path', { class: 'dot-acc' }, svgEl);
  const resDot = s('circle', { class: 'dot-acc', r: 3.5 }, svgEl);
  const resLbl = label(svgEl, 0, 0, 'a v + b w', 'lbl-acc', 'middle');

  // Origin dot
  s('circle', { class: 'dot-dim', r: 3 }, svgEl);

  // Coordinate mapping
  let u = 28;
  let ox = 170, oy = 140;
  const toPx = (xVal: number, yVal: number) => ({ px: ox + xVal * u, py: oy - yVal * u });
  const fromPx = (px: number, py: number) => ({ x: (px - ox) / u, y: (oy - py) / u });

  // Draggable handle for vector v
  const hdV = handle(svgEl, {
    label: 'Vector v',
    x: 0,
    y: 0,
    r: 6,
    valueText: () => `v = (${fmtNum(v.x)}, ${fmtNum(v.y)})`,
    onDrag: (px, py) => {
      const p = fromPx(px, py);
      let nx = clamp(cleanCoord(p.x), -4, 4);
      let ny = clamp(cleanCoord(p.y), -4, 4);

      // Subtle magnetic snap to parallel with w
      const det = nx * w.y - ny * w.x;
      if (Math.abs(det) < 0.15 && (w.x !== 0 || w.y !== 0)) {
        const dot = nx * w.x + ny * w.y;
        const lenSq = w.x * w.x + w.y * w.y;
        const k = Math.round((dot / lenSq) * 2) / 2;
        nx = clamp(k * w.x, -4, 4);
        ny = clamp(k * w.y, -4, 4);
      }

      if (Math.hypot(nx, ny) >= 0.3) {
        v.x = nx;
        v.y = ny;
      }
      draw();
    },
    onKey: (dx, dy, big) => {
      const step = big ? 1 : 0.5;
      const nx = clamp(Math.round((v.x + dx * step) * 2) / 2, -4, 4);
      const ny = clamp(Math.round((v.y + dy * step) * 2) / 2, -4, 4);
      if (Math.hypot(nx, ny) >= 0.3) {
        v.x = nx;
        v.y = ny;
      }
      draw();
    },
  });

  // Draggable handle for vector w
  const hdW = handle(svgEl, {
    label: 'Vector w',
    x: 0,
    y: 0,
    r: 6,
    valueText: () => `w = (${fmtNum(w.x)}, ${fmtNum(w.y)})`,
    onDrag: (px, py) => {
      const p = fromPx(px, py);
      let nx = clamp(cleanCoord(p.x), -4, 4);
      let ny = clamp(cleanCoord(p.y), -4, 4);

      // Subtle magnetic snap to parallel with v
      const det = v.x * ny - v.y * nx;
      if (Math.abs(det) < 0.15 && (v.x !== 0 || v.y !== 0)) {
        const dot = nx * v.x + ny * v.y;
        const lenSq = v.x * v.x + v.y * v.y;
        const k = Math.round((dot / lenSq) * 2) / 2;
        nx = clamp(k * v.x, -4, 4);
        ny = clamp(k * v.y, -4, 4);
      }

      if (Math.hypot(nx, ny) >= 0.3) {
        w.x = nx;
        w.y = ny;
      }
      draw();
    },
    onKey: (dx, dy, big) => {
      const step = big ? 1 : 0.5;
      const nx = clamp(Math.round((w.x + dx * step) * 2) / 2, -4, 4);
      const ny = clamp(Math.round((w.y + dy * step) * 2) / 2, -4, 4);
      if (Math.hypot(nx, ny) >= 0.3) {
        w.x = nx;
        w.y = ny;
      }
      draw();
    },
  });

  // Controls: Sliders for a and b, Reset button
  const rControls = row(root);
  const sa = slider(rControls, {
    label: 'Weight a',
    texLabel: 'a',
    min: -3,
    max: 3,
    step: 0.1,
    value: A0,
    format: (val) => val.toFixed(1),
    onInput: (val) => {
      a = val;
      draw();
    },
  });

  const sb = slider(rControls, {
    label: 'Weight b',
    texLabel: 'b',
    min: -3,
    max: 3,
    step: 0.1,
    value: B0,
    format: (val) => val.toFixed(1),
    onInput: (val) => {
      b = val;
      draw();
    },
  });

  button(rControls, 'Reset', () => {
    const fromVx = v.x, fromVy = v.y;
    const fromWx = w.x, fromWy = w.y;
    const fromA = a, fromB = b;
    tween((k) => {
      v.x = lerp(fromVx, V0.x, k);
      v.y = lerp(fromVy, V0.y, k);
      w.x = lerp(fromWx, W0.x, k);
      w.y = lerp(fromWy, W0.y, k);
      a = lerp(fromA, A0, k);
      b = lerp(fromB, B0, k);
      sa.set(Math.round(a * 10) / 10);
      sb.set(Math.round(b * 10) / 10);
      draw();
    });
  });

  // Live Formula display and explanation note
  const f = formula(root);
  const note = h('div', { class: 'fig-note' }, root);
  note.style.margin = '0.25rem 8px 0';

  function draw() {
    const { W, H } = view;
    if (W === 0 || H === 0) return;

    const pad = { l: 16, r: 16, t: 16, b: 16 };
    attr(clipRect, { x: pad.l, y: pad.t, width: W - pad.l - pad.r, height: H - pad.t - pad.b });

    ox = Math.round(W / 2);
    oy = Math.round(H / 2);
    u = Math.min((W - pad.l - pad.r) / 12, (H - pad.t - pad.b) / 9.5);

    // Update Cartesian grid across full visible range
    let idxV = 0;
    for (let k = -15; k <= 15; k++) {
      if (k === 0) continue;
      const px = ox + k * u;
      attr(vGridLines[idxV++], { x1: px, y1: pad.t, x2: px, y2: H - pad.b });
    }
    let idxH = 0;
    for (let k = -10; k <= 10; k++) {
      if (k === 0) continue;
      const py = oy - k * u;
      attr(hGridLines[idxH++], { x1: pad.l, y1: py, x2: W - pad.r, y2: py });
    }

    // Axes
    attr(xAxis, { x1: pad.l, y1: oy, x2: W - pad.r, y2: oy });
    attr(yAxis, { x1: ox, y1: H - pad.b, x2: ox, y2: pad.t });
    attr(xLabel, { x: W - pad.r - 4, y: oy - 6 });
    attr(yLabel, { x: ox + 8, y: pad.t + 12 });

    // Determinant and parallel check
    const det = v.x * w.y - v.y * w.x;
    const isParallel = Math.abs(det) < 0.05;

    // Skewed grid vs collapsed span line
    attr(spanNote, { x: pad.l + 8, y: pad.t + 16 });
    if (isParallel) {
      attr(skewedGridG, { opacity: 0 });
      attr(spanLine, { opacity: 1 });
      spanNote.style.display = '';

      // Determine span line direction
      let dx = v.x, dy = v.y;
      if (Math.hypot(dx, dy) < 0.1) {
        dx = w.x;
        dy = w.y;
      }
      if (Math.hypot(dx, dy) < 0.1) {
        dx = 1;
        dy = 0;
      }
      const len = Math.hypot(dx, dy);
      const ux = dx / len;
      const uy = dy / len;
      const p1 = toPx(-30 * ux, -30 * uy);
      const p2 = toPx(30 * ux, 30 * uy);
      attr(spanLine, { x1: p1.px, y1: p1.py, x2: p2.px, y2: p2.py });
    } else {
      attr(skewedGridG, { opacity: 1 });
      attr(spanLine, { opacity: 0 });
      spanNote.style.display = 'none';

      // Skewed lattice lines:
      // Family 1: lines parallel to w shifted by i * v
      for (let i = -3; i <= 3; i++) {
        const p1 = toPx(i * v.x - 12 * w.x, i * v.y - 12 * w.y);
        const p2 = toPx(i * v.x + 12 * w.x, i * v.y + 12 * w.y);
        attr(skewedLinesV[i + 3], { x1: p1.px, y1: p1.py, x2: p2.px, y2: p2.py });
      }
      // Family 2: lines parallel to v shifted by j * w
      for (let j = -3; j <= 3; j++) {
        const p1 = toPx(j * w.x - 12 * v.x, j * w.y - 12 * v.y);
        const p2 = toPx(j * w.x + 12 * v.x, j * w.y + 12 * v.y);
        attr(skewedLinesW[j + 3], { x1: p1.px, y1: p1.py, x2: p2.px, y2: p2.py });
      }
    }

    // Points of interest
    const pO = toPx(0, 0);
    const pV = toPx(v.x, v.y);
    const pW = toPx(w.x, w.y);
    const pAv = toPx(a * v.x, a * v.y);
    const pBw = toPx(b * w.x, b * w.y);
    const rx = a * v.x + b * w.x;
    const ry = a * v.y + b * w.y;
    const pRes = toPx(rx, ry);

    // Parallelogram fill
    attr(poly, {
      points: `${pO.px},${pO.py} ${pAv.px},${pAv.py} ${pRes.px},${pRes.py} ${pBw.px},${pBw.py}`,
      opacity: isParallel ? 0 : 1,
    });

    // Dashed lines for parallelogram construction
    attr(avLine, { x1: pO.px, y1: pO.py, x2: pAv.px, y2: pAv.py, opacity: Math.abs(a) > 0.05 ? 0.7 : 0 });
    attr(bwLine, { x1: pO.px, y1: pO.py, x2: pBw.px, y2: pBw.py, opacity: Math.abs(b) > 0.05 ? 0.7 : 0 });
    attr(tailBwLine, { x1: pAv.px, y1: pAv.py, x2: pRes.px, y2: pRes.py, opacity: Math.abs(b) > 0.05 ? 0.7 : 0 });
    attr(tailAvLine, { x1: pBw.px, y1: pBw.py, x2: pRes.px, y2: pRes.py, opacity: Math.abs(a) > 0.05 ? 0.7 : 0 });

    // Base vectors v and w
    updateArrow(vLine, vHead, pO.px, pO.py, pV.px, pV.py, 8);
    placeMidLabel(vLbl, pO.px, pO.py, pV.px, pV.py, 14);

    updateArrow(wLine, wHead, pO.px, pO.py, pW.px, pW.py, 8);
    placeMidLabel(wLbl, pO.px, pO.py, pW.px, pW.py, -14);

    // Result vector a·v + b·w
    updateArrow(resLine, resHead, pO.px, pO.py, pRes.px, pRes.py, 10);
    attr(resDot, { cx: pRes.px, cy: pRes.py });
    placeTipLabel(resLbl, pO.px, pO.py, pRes.px, pRes.py, W, H, 14);

    // Move handles
    hdV.move(pV.px, pV.py);
    hdW.move(pW.px, pW.py);

    // Formula readout
    const bSign = b >= 0 ? '+' : '-';
    const absB = Math.abs(b);
    f.set(
      `a\\vec{v} + b\\vec{w} = ${fmtNum(a)}\\begin{bmatrix}${fmtNum(v.x)}\\\\${fmtNum(v.y)}\\end{bmatrix} ${bSign} ${fmtNum(absB)}\\begin{bmatrix}${fmtNum(w.x)}\\\\${fmtNum(w.y)}\\end{bmatrix} = \\begin{bmatrix}${fmtNum(rx)}\\\\${fmtNum(ry)}\\end{bmatrix}`
    );
    note.textContent = isParallel
      ? `Vectors v and w are collinear (det = 0): the skewed grid collapses onto a single line, so linear combinations a·v + b·w cannot reach points off that line.`
      : `Walking a = ${fmtNum(a)} steps along v and b = ${fmtNum(b)} steps along w traces the parallelogram to (${fmtNum(rx)}, ${fmtNum(ry)}); because v and w are independent (det = ${fmtNum(det)} ≠ 0), their skewed grid spans the entire plane.`;
  }

  view.onResize(draw);
  draw();
};

export default mount;
