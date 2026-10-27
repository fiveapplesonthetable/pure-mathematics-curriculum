// Chapter 5: Matrices as Machines.
// Interactive matrix action on the 2D grid and unit square.
// The reader drags the columns A e1 and A e2 to transform the plane,
// watches the grid and unit square morph live, and can pick presets.

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
  lerp,
  type Mount,
} from './lib';

// Default matrix: A = [[2, 1], [0, 1]] (book's Figure 5.2)
const DEFAULT_A: [number, number, number, number] = [2, 1, 0, 1];

// Presets: [a, b, c, d] where col 1 is [a, c]^T and col 2 is [b, d]^T
const PRESETS: Record<string, [number, number, number, number]> = {
  'Rotate 90°': [0, -1, 1, 0],
  'Shear': [1, 1, 0, 1],
  'Scale': [2, 0, 0, 0.5],
  'Project (x-axis)': [1, 0, 0, 0],
  'Reflect': [1, 0, 0, -1],
};

function fmtNum(v: number): string {
  const rounded = Math.round(v * 100) / 100;
  if (Object.is(rounded, -0) || Math.abs(rounded) < 1e-6) return '0';
  if (Number.isInteger(rounded)) return String(rounded);
  return rounded.toFixed(2).replace(/\.?0+$/, '');
}

const mount: Mount = (root) => {
  // Current live matrix entries: [a, b, c, d]
  // A = [ a  b ]
  //     [ c  d ]
  let a = DEFAULT_A[0];
  let b = DEFAULT_A[1];
  let c = DEFAULT_A[2];
  let d = DEFAULT_A[3];

  // Remember the user's matrix for toggling between Input (Identity) and Applied
  let userA: [number, number, number, number] = [...DEFAULT_A];
  let isInput = false;

  let cancelActiveTween = () => {};

  const view = responsiveSvg(root, {
    label:
      'Transformed grid and unit square under a 2x2 matrix with draggable basis vector handles',
    aspect: 0.72,
    minH: 260,
    maxH: 400,
  });
  const svgEl = view.el;

  // Clip path so extended grid lines stay within the SVG box
  const defs = s('defs', {}, svgEl);
  const clip = s('clipPath', { id: 'matrix-grid-clip' }, defs);
  const clipRect = s('rect', { x: 0, y: 0, width: 0, height: 0 }, clip);

  // Group for clipped background plane and grids
  const gridG = s('g', { 'clip-path': 'url(#matrix-grid-clip)' }, svgEl);

  // Original faint grid
  const origGridLines: SVGLineElement[] = [];
  const GRID_RANGE = [-4, -3, -2, -1, 0, 1, 2, 3, 4];
  for (const k of GRID_RANGE) {
    if (k !== 0) {
      origGridLines.push(s('line', { class: 'grid' }, gridG)); // vertical
      origGridLines.push(s('line', { class: 'grid' }, gridG)); // horizontal
    }
  }
  const origAxisX = s('line', { class: 'ax' }, gridG);
  const origAxisY = s('line', { class: 'ax' }, gridG);

  // Original unit square
  const origSquareFill = s('polygon', { class: 'band-muted' }, gridG);
  const origSquareEdge = s('polygon', { class: 'line-muted' }, gridG);

  // Transformed grid lines
  const transLinesX: SVGLineElement[] = [];
  const transLinesY: SVGLineElement[] = [];
  for (const k of GRID_RANGE) {
    const cls = k === 0 ? 'axis-trans' : 'grid-trans';
    transLinesX.push(s('line', { class: cls }, gridG));
    transLinesY.push(s('line', { class: cls }, gridG));
  }

  // Transformed unit square (parallelogram)
  const transSquareFill = s('polygon', { class: 'band' }, gridG);
  const transSquareEdge = s('polygon', { class: 'line-acc' }, gridG);

  // Foreground unclipped group for vectors, handles, and labels
  const fgG = s('g', {}, svgEl);

  const originDot = s('circle', { class: 'dot-dim', r: 3 }, fgG);
  void originDot;

  // Basis vector arrow shafts
  const arrow1 = s('line', { class: 'line-acc', 'stroke-linecap': 'round' }, fgG);
  const arrow2 = s('line', { class: 'curve', 'stroke-linecap': 'round' }, fgG);

  // Labels for the basis vector tips
  const lbl1 = s('text', { class: 'lbl-acc', 'text-anchor': 'middle' }, fgG);
  lbl1.textContent = 'Ae₁';
  const lbl2 = s('text', { class: 'lbl-fg', 'text-anchor': 'middle' }, fgG);
  lbl2.textContent = 'Ae₂';

  // Handle 1: tip of A e1 = (a, c)
  const hd1 = handle(svgEl, {
    label: 'Column 1: image of e1',
    x: 0,
    y: 0,
    parent: fgG,
    valueText: () => `Ae1 = (${fmtNum(a)}, ${fmtNum(c)})`,
    onDrag: (px, py) => {
      cancelActiveTween();
      clearPresetHighlight();
      isInput = false;
      toggleBtn.textContent = 'Show input';
      toggleBtn.setAttribute('aria-pressed', 'false');
      const { cx, cy, U } = getGeom();
      const nx = clamp((px - cx) / U, -3, 3);
      const ny = clamp((cy - py) / U, -3, 3);
      const snapX = Math.abs(nx - Math.round(nx)) < 0.08 ? Math.round(nx) : Math.round(nx * 20) / 20;
      const snapY = Math.abs(ny - Math.round(ny)) < 0.08 ? Math.round(ny) : Math.round(ny * 20) / 20;
      a = snapX;
      c = snapY;
      userA = [a, b, c, d];
      draw();
    },
    onKey: (dx, dy, big) => {
      cancelActiveTween();
      clearPresetHighlight();
      isInput = false;
      toggleBtn.textContent = 'Show input';
      toggleBtn.setAttribute('aria-pressed', 'false');
      const step = big ? 0.5 : 0.1;
      a = clamp(Math.round((a + dx * step) * 10) / 10, -3, 3);
      c = clamp(Math.round((c + dy * step) * 10) / 10, -3, 3);
      userA = [a, b, c, d];
      draw();
    },
  });
  hd1.el.setAttribute('aria-valuemin', '-3');
  hd1.el.setAttribute('aria-valuemax', '3');

  // Handle 2: tip of A e2 = (b, d)
  const hd2 = handle(svgEl, {
    label: 'Column 2: image of e2',
    x: 0,
    y: 0,
    parent: fgG,
    valueText: () => `Ae2 = (${fmtNum(b)}, ${fmtNum(d)})`,
    onDrag: (px, py) => {
      cancelActiveTween();
      clearPresetHighlight();
      isInput = false;
      toggleBtn.textContent = 'Show input';
      toggleBtn.setAttribute('aria-pressed', 'false');
      const { cx, cy, U } = getGeom();
      const nx = clamp((px - cx) / U, -3, 3);
      const ny = clamp((cy - py) / U, -3, 3);
      const snapX = Math.abs(nx - Math.round(nx)) < 0.08 ? Math.round(nx) : Math.round(nx * 20) / 20;
      const snapY = Math.abs(ny - Math.round(ny)) < 0.08 ? Math.round(ny) : Math.round(ny * 20) / 20;
      b = snapX;
      d = snapY;
      userA = [a, b, c, d];
      draw();
    },
    onKey: (dx, dy, big) => {
      cancelActiveTween();
      clearPresetHighlight();
      isInput = false;
      toggleBtn.textContent = 'Show input';
      toggleBtn.setAttribute('aria-pressed', 'false');
      const step = big ? 0.5 : 0.1;
      b = clamp(Math.round((b + dx * step) * 10) / 10, -3, 3);
      d = clamp(Math.round((d + dy * step) * 10) / 10, -3, 3);
      userA = [a, b, c, d];
      draw();
    },
  });
  hd2.el.setAttribute('aria-valuemin', '-3');
  hd2.el.setAttribute('aria-valuemax', '3');

  // Controls
  const f = formula(root);

  // Preset buttons row
  const r1 = row(root);
  const presetBtns: Record<string, HTMLButtonElement> = {};
  for (const name in PRESETS) {
    const mat = PRESETS[name];
    presetBtns[name] = button(r1, name, () => {
      clearPresetHighlight();
      presetBtns[name].setAttribute('aria-pressed', 'true');
      tweenTo(mat, 300);
    });
  }

  function clearPresetHighlight() {
    for (const k in presetBtns) presetBtns[k].setAttribute('aria-pressed', 'false');
  }

  // Toggle & Reset row
  const r2 = row(root);
  const toggleBtn = button(r2, 'Show input', () => {
    cancelActiveTween();
    clearPresetHighlight();
    if (!isInput) {
      // Morph to identity
      isInput = true;
      toggleBtn.textContent = 'Apply';
      toggleBtn.setAttribute('aria-pressed', 'true');
      const start = [a, b, c, d];
      const target = [1, 0, 0, 1];
      cancelActiveTween = tween((k) => {
        a = lerp(start[0], target[0], k);
        b = lerp(start[1], target[1], k);
        c = lerp(start[2], target[2], k);
        d = lerp(start[3], target[3], k);
        draw();
      }, 300);
    } else {
      // Morph back to userA
      isInput = false;
      toggleBtn.textContent = 'Show input';
      toggleBtn.setAttribute('aria-pressed', 'false');
      const start = [a, b, c, d];
      cancelActiveTween = tween((k) => {
        a = lerp(start[0], userA[0], k);
        b = lerp(start[1], userA[1], k);
        c = lerp(start[2], userA[2], k);
        d = lerp(start[3], userA[3], k);
        draw();
      }, 300);
    }
  });

  h('span', { class: 'spacer' }, r2);

  button(r2, 'Reset', () => {
    clearPresetHighlight();
    tweenTo(DEFAULT_A, 300);
  });

  function tweenTo(target: [number, number, number, number], ms = 300) {
    cancelActiveTween();
    isInput = false;
    toggleBtn.textContent = 'Show input';
    toggleBtn.setAttribute('aria-pressed', 'false');
    userA = [...target];
    const start = [a, b, c, d];
    cancelActiveTween = tween((k) => {
      a = lerp(start[0], target[0], k);
      b = lerp(start[1], target[1], k);
      c = lerp(start[2], target[2], k);
      d = lerp(start[3], target[3], k);
      draw();
    }, ms);
  }

  function getGeom() {
    const W = view.W;
    const H = view.H;
    const cx = W / 2;
    const cy = H / 2;
    // Scale: keep 1:1 aspect ratio so geometric angles/circles are true
    const U = Math.min((W - 44) / 7.2, (H - 36) / 5.4);
    return { W, H, cx, cy, U };
  }

  function draw() {
    const { W, H, cx, cy, U } = getGeom();

    attr(clipRect, { width: W, height: H });

    const toX = (px: number) => cx + px * U;
    const toY = (py: number) => cy - py * U;

    // Original faint grid
    let idx = 0;
    for (const k of GRID_RANGE) {
      if (k !== 0) {
        attr(origGridLines[idx++], { x1: toX(k), x2: toX(k), y1: toY(-4.5), y2: toY(4.5) });
        attr(origGridLines[idx++], { x1: toX(-4.5), x2: toX(4.5), y1: toY(k), y2: toY(k) });
      }
    }
    attr(origAxisX, { x1: toX(-4.5), x2: toX(4.5), y1: toY(0), y2: toY(0) });
    attr(origAxisY, { x1: toX(0), x2: toX(0), y1: toY(-4.5), y2: toY(4.5) });

    // Original unit square: (0,0) -> (1,0) -> (1,1) -> (0,1)
    const origPts = `${toX(0)},${toY(0)} ${toX(1)},${toY(0)} ${toX(1)},${toY(1)} ${toX(0)},${toY(1)}`;
    attr(origSquareFill, { points: origPts });
    attr(origSquareEdge, { points: origPts });

    // Transformed grid lines:
    // Line x = k transforms to k * Ae1 + t * Ae2, t in [-5, 5]
    // Line y = m transforms to t * Ae1 + m * Ae2, t in [-5, 5]
    const T = 5;
    GRID_RANGE.forEach((k, i) => {
      attr(transLinesX[i], {
        x1: toX(k * a - T * b),
        y1: toY(k * c - T * d),
        x2: toX(k * a + T * b),
        y2: toY(k * c + T * d),
      });
      attr(transLinesY[i], {
        x1: toX(-T * a + k * b),
        y1: toY(-T * c + k * d),
        x2: toX(T * a + k * b),
        y2: toY(T * c + k * d),
      });
    });

    // Transformed unit square (parallelogram): (0,0) -> (a,c) -> (a+b,c+d) -> (b,d)
    const transPts = `${toX(0)},${toY(0)} ${toX(a)},${toY(c)} ${toX(a + b)},${toY(c + d)} ${toX(b)},${toY(d)}`;
    attr(transSquareFill, { points: transPts });
    attr(transSquareEdge, { points: transPts });

    // Origin
    attr(originDot, { cx: toX(0), cy: toY(0) });

    // Vector arrow shafts
    const p1x = toX(a), p1y = toY(c);
    const p2x = toX(b), p2y = toY(d);
    attr(arrow1, { x1: toX(0), y1: toY(0), x2: p1x, y2: p1y });
    attr(arrow2, { x1: toX(0), y1: toY(0), x2: p2x, y2: p2y });

    // Move handles
    hd1.move(p1x, p1y);
    hd2.move(p2x, p2y);

    // Position vector labels with safe offsets avoiding the handle knobs
    if (Math.abs(c) < 0.2) {
      attr(lbl1, {
        'text-anchor': a >= 0 ? 'start' : 'end',
        x: clamp(p1x + (a >= 0 ? 15 : -15), 14, W - 24),
        y: clamp(p1y - 12, 16, H - 10),
      });
    } else {
      const offX = a >= 0 ? 15 : -15;
      const offY = c >= 0 ? 16 : -12;
      attr(lbl1, {
        'text-anchor': a >= 0 ? 'start' : 'end',
        x: clamp(p1x + offX, 14, W - 24),
        y: clamp(p1y + offY, 16, H - 10),
      });
    }

    if (Math.abs(b) < 0.2) {
      attr(lbl2, {
        'text-anchor': 'end',
        x: clamp(p2x - 14, 14, W - 24),
        y: clamp(p2y - 12, 16, H - 10),
      });
    } else {
      const offX = b >= 0 ? -14 : 14;
      const offY = d >= 0 ? -12 : 16;
      attr(lbl2, {
        'text-anchor': b >= 0 ? 'end' : 'start',
        x: clamp(p2x + offX, 14, W - 24),
        y: clamp(p2y + offY, 16, H - 10),
      });
    }

    // Update formula
    const det = a * d - b * c;
    f.set(
      `A = \\begin{bmatrix} ${fmtNum(a)} & ${fmtNum(b)} \\\\ ${fmtNum(c)} & ${fmtNum(d)} \\end{bmatrix} \\qquad \\det A = ${fmtNum(det)}`,
    );
  }

  view.onResize(draw);
  draw();

  return () => {
    cancelActiveTween();
  };
};

export default mount;
