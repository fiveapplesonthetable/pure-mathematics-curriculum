// Chapter 23: Eigenvalues and Eigenvectors.
// Figure: Eigen-directions — directions a matrix does not turn.
// The reader drags vector x around the unit circle to discover the special
// directions where Ax stays on the same line as x (collinear within 1.5°),
// scaling by eigenvalue λ.

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
  label,
  lerp,
  type Mount,
} from './lib';

interface Preset {
  name: string;
  btnLabel: string;
  matrixName: string;
  a: number;
  b: number;
  c: number;
  d: number;
  eigenvalues: number[]; // real eigenvalues
  // ray angles in radians where Ax is collinear with x
  eigenRays: { angle: number; lambda: number }[];
  // eigen-lines for drawing across the canvas
  eigenLines: { angle: number; lambda: number }[];
  charEqTex: string;
}

const PRESETS: Preset[] = [
  {
    name: 'symmetric',
    btnLabel: 'Symmetric',
    matrixName: 'A',
    a: 2,
    b: 1,
    c: 1,
    d: 2,
    eigenvalues: [3, 1],
    eigenRays: [
      { angle: Math.PI / 4, lambda: 3 },
      { angle: -3 * Math.PI / 4, lambda: 3 },
      { angle: -Math.PI / 4, lambda: 1 },
      { angle: 3 * Math.PI / 4, lambda: 1 },
    ],
    eigenLines: [
      { angle: Math.PI / 4, lambda: 3 },
      { angle: -Math.PI / 4, lambda: 1 },
    ],
    charEqTex: '\\det(A - \\lambda I) = 0 \\implies \\lambda \\in \\{1, 3\\}',
  },
  {
    name: 'rotation',
    btnLabel: 'Rotate',
    matrixName: 'Q',
    a: 0,
    b: -1,
    c: 1,
    d: 0,
    eigenvalues: [],
    eigenRays: [],
    eigenLines: [],
    charEqTex: '\\det(Q - \\lambda I) = 0 \\implies \\lambda = \\pm i',
  },
  {
    name: 'shear',
    btnLabel: 'Shear',
    matrixName: 'S',
    a: 1,
    b: 1,
    c: 0,
    d: 1,
    eigenvalues: [1],
    eigenRays: [
      { angle: 0, lambda: 1 },
      { angle: Math.PI, lambda: 1 },
    ],
    eigenLines: [{ angle: 0, lambda: 1 }],
    charEqTex: '\\det(S - \\lambda I) = 0 \\implies \\lambda = 1',
  },
];

const INITIAL_PRESET = 0;
const INITIAL_ANGLE = 0; // x = (1, 0) — the book's introductory example e_1
const PARALLEL_THRESHOLD_RAD = (1.5 * Math.PI) / 180; // 1.5 degrees

function normAngle(a: number): number {
  let angle = a % (2 * Math.PI);
  if (angle <= -Math.PI) angle += 2 * Math.PI;
  if (angle > Math.PI) angle -= 2 * Math.PI;
  return angle;
}

function fmtNum(n: number): string {
  if (Math.abs(n) < 0.005) return '0.00';
  return n.toFixed(2);
}

const mount: Mount = (root) => {
  let presetIdx = INITIAL_PRESET;
  let angle = INITIAL_ANGLE;
  let cancelTween = () => {};

  const view = responsiveSvg(root, {
    label: 'Interactive figure demonstrating eigenvectors as directions a matrix does not turn',
    aspect: 0.85,
    minH: 300,
    maxH: 420,
  });
  const svgEl = view.el;

  // Background grid and circle group
  const bgG = s('g', {}, svgEl);
  const axesG = s('g', {}, svgEl);
  const eigenLinesG = s('g', {}, svgEl);
  const vectorsG = s('g', {}, svgEl);
  const handlesG = s('g', {}, svgEl);

  // Unit circle where x lives
  const unitCircle = s('circle', { class: 'grid', 'stroke-dasharray': '3 3' }, bgG);
  const circleLbl = label(bgG, 0, 0, '|x| = 1', 'lbl', 'end');

  // Coordinate axes
  const xAxis = s('line', { class: 'ax' }, axesG);
  const yAxis = s('line', { class: 'ax' }, axesG);
  const xLbl = label(axesG, 0, 0, 'x', 'lbl', 'end');
  const yLbl = label(axesG, 0, 0, 'y', 'lbl', 'start');

  // Axis ticks
  const ticksG = s('g', {}, axesG);

  // Eigen-lines (up to 2 for a 2x2 matrix)
  const eigenLineEls: SVGLineElement[] = [];
  const eigenLabelEls: SVGTextElement[] = [];
  for (let i = 0; i < 2; i++) {
    eigenLineEls.push(s('line', { class: 'line-muted' }, eigenLinesG));
    eigenLabelEls.push(label(eigenLinesG, 0, 0, '', 'lbl', 'middle'));
  }

  // Angle turning arc between x and Ax
  const turnArc = s('path', { class: 'edge' }, vectorsG);
  const turnLbl = label(vectorsG, 0, 0, '', 'lbl', 'middle');

  // Vector x line and label
  const xLine = s('line', { class: 'line' }, vectorsG);
  const xArrow = s('polygon', { class: 'dot' }, vectorsG);
  const xNameLbl = label(vectorsG, 0, 0, 'x', 'lbl-fg', 'middle');

  // Vector Ax line, arrowhead and label
  const axLine = s('line', { class: 'curve' }, vectorsG);
  const axArrow = s('polygon', { class: 'dot' }, vectorsG);
  const axNameLbl = label(vectorsG, 0, 0, 'Ax', 'lbl-fg', 'middle');

  // Status banner inside SVG
  const statusLbl = label(svgEl, 0, 0, '', 'lbl', 'middle');

  // Handle for vector x tip
  const hd = handle(svgEl, {
    label: 'Vector x direction',
    x: 0,
    y: 0,
    parent: handlesG,
    valueText: () => {
      const deg = Math.round((((angle * 180) / Math.PI) % 360 + 360) % 360);
      return `angle ${deg} degrees`;
    },
    onDrag: (px, py) => {
      cancelTween();
      const x0 = view.W / 2;
      const y0 = view.H / 2 + 10;
      const dx = px - x0;
      const dy = -(py - y0); // invert SVG y
      if (dx * dx + dy * dy > 1e-4) {
        angle = Math.atan2(dy, dx);
        draw();
      }
    },
    onKey: (dx, dy, big) => {
      cancelTween();
      const step = ((big ? 5 : 1) * Math.PI) / 180;
      const delta = (dx !== 0 ? dx : dy) * step;
      angle = normAngle(angle + delta);
      draw();
    },
  });
  hd.el.setAttribute('aria-valuemin', '0');
  hd.el.setAttribute('aria-valuemax', '360');

  // Formula line under the picture
  const f = formula(root);
  f.el.style.fontSize = 'clamp(0.82rem, 3.6vw, 0.95rem)';

  // Controls Row 1: Matrix presets
  const rPresets = row(root);
  const presetButtons = PRESETS.map((preset, idx) => {
    const btn = button(rPresets, preset.btnLabel, () => {
      cancelTween();
      presetIdx = idx;
      updatePresetUi();
      draw();
    });
    return btn;
  });

  // Controls Row 2: Snap to eigenvector & Reset
  const rActions = row(root);
  const snapBtn = button(rActions, 'Snap to an eigenvector', () => {
    const cur = PRESETS[presetIdx];
    if (!cur.eigenRays.length) return;
    cancelTween();

    // Find nearest eigen-direction ray
    let bestDelta = 0;
    let bestDist = Infinity;
    for (const ray of cur.eigenRays) {
      const d = normAngle(ray.angle - angle);
      if (Math.abs(d) < bestDist) {
        bestDist = Math.abs(d);
        bestDelta = d;
      }
    }

    const fromAngle = angle;
    const toAngle = angle + bestDelta;
    cancelTween = tween((k) => {
      angle = lerp(fromAngle, toAngle, k);
      draw();
    }, 300);
  });

  h('span', { class: 'spacer' }, rActions);

  button(rActions, 'Reset', () => {
    cancelTween();
    presetIdx = INITIAL_PRESET;
    updatePresetUi();

    const fromAngle = angle;
    const d = normAngle(INITIAL_ANGLE - fromAngle);
    const toAngle = fromAngle + d;
    cancelTween = tween((k) => {
      angle = lerp(fromAngle, toAngle, k);
      draw();
    }, 300);
  });

  function updatePresetUi() {
    presetButtons.forEach((b, i) => {
      b.setAttribute('aria-pressed', i === presetIdx ? 'true' : 'false');
    });
    const cur = PRESETS[presetIdx];
    snapBtn.disabled = cur.eigenRays.length === 0;
    if (cur.eigenRays.length === 0) {
      snapBtn.title = 'No real eigenvectors for this matrix';
    } else {
      snapBtn.removeAttribute('title');
    }
  }
  updatePresetUi();

  function draw() {
    const { W, H } = view;
    const x0 = W / 2;
    const y0 = H / 2 + 10;

    // Radius in pixels for coordinate unit = 1
    // Range [-3.1, 3.1] fits x (|x|=1) and max Ax (|Ax| up to 3) comfortably
    const scaleUnit = Math.min((W - 48) / 6.4, (H - 52) / 6.4);
    const maxCoord = 3.0;
    const extentPx = maxCoord * scaleUnit;

    // Unit circle
    attr(unitCircle, { cx: x0, cy: y0, r: scaleUnit });
    // Faint label for unit circle near bottom-left
    attr(circleLbl, {
      x: x0 - scaleUnit * 0.72 - 6,
      y: y0 + scaleUnit * 0.72 + 12,
    });

    // Coordinate axes
    attr(xAxis, { x1: x0 - extentPx, y1: y0, x2: x0 + extentPx, y2: y0 });
    attr(yAxis, { x1: x0, y1: y0 - extentPx, x2: x0, y2: y0 + extentPx });
    // Place axis labels clearly at the ends
    attr(xLbl, { x: x0 + extentPx + 8, y: y0 + 4, 'text-anchor': 'start' });
    attr(yLbl, { x: x0 + 6, y: y0 - extentPx - 4, 'text-anchor': 'start' });

    // Tick marks at 1, 2, 3
    ticksG.replaceChildren();
    for (let t = 1; t <= 3; t++) {
      const p = t * scaleUnit;
      // x ticks
      s('line', { class: 'ax', x1: x0 + p, y1: y0 - 3, x2: x0 + p, y2: y0 + 3 }, ticksG);
      s('line', { class: 'ax', x1: x0 - p, y1: y0 - 3, x2: x0 - p, y2: y0 + 3 }, ticksG);
      // y ticks
      s('line', { class: 'ax', x1: x0 - 3, y1: y0 - p, x2: x0 + 3, y2: y0 - p }, ticksG);
      s('line', { class: 'ax', x1: x0 - 3, y1: y0 + p, x2: x0 + 3, y2: y0 + p }, ticksG);
    }

    const cur = PRESETS[presetIdx];
    const { a, b, c, d, matrixName } = cur;

    // Vector x (unit length)
    const cosT = Math.cos(angle);
    const sinT = Math.sin(angle);
    const xTipX = x0 + cosT * scaleUnit;
    const xTipY = y0 - sinT * scaleUnit; // SVG y inverted

    // Vector Ax
    const u = a * cosT + b * sinT;
    const v = c * cosT + d * sinT;
    const axTipX = x0 + u * scaleUnit;
    const axTipY = y0 - v * scaleUnit;
    const lenAx = Math.hypot(u, v);

    // Parallel check: collinear within PARALLEL_THRESHOLD_RAD
    // Cross product (u sinT - v cosT) and dot product (u cosT + v sinT)
    const dot = u * cosT + v * sinT;
    const cross = cosT * v - sinT * u;
    const angleDiff = Math.atan2(cross, dot); // in [-pi, pi]
    const devFromCollinear = Math.min(Math.abs(angleDiff), Math.abs(Math.PI - Math.abs(angleDiff)));
    const isAligned = cur.eigenvalues.length > 0 && devFromCollinear < PARALLEL_THRESHOLD_RAD;

    // Signed lambda: sign of dot product times length ratio |Ax| / |x| (with |x| = 1)
    const sign = dot >= 0 ? 1 : -1;
    const measuredLambda = sign * lenAx;

    // Find which eigenvalue this corresponds to if aligned
    let matchedLambda = cur.eigenvalues[0] ?? 1;
    let minLambdaDiff = Infinity;
    for (const val of cur.eigenvalues) {
      const diff = Math.abs(val - measuredLambda);
      if (diff < minLambdaDiff) {
        minLambdaDiff = diff;
        matchedLambda = val;
      }
    }

    // Draw eigen-lines
    eigenLineEls.forEach((el, i) => {
      const lblEl = eigenLabelEls[i];
      if (i < cur.eigenLines.length) {
        const eline = cur.eigenLines[i];
        const eCos = Math.cos(eline.angle);
        const eSin = Math.sin(eline.angle);
        const lx1 = x0 - extentPx * eCos;
        const ly1 = y0 + extentPx * eSin;
        const lx2 = x0 + extentPx * eCos;
        const ly2 = y0 - extentPx * eSin;
        attr(el, { x1: lx1, y1: ly1, x2: lx2, y2: ly2, display: '' });

        const isThisLineActive = isAligned && Math.abs(matchedLambda - eline.lambda) < 0.2;
        el.setAttribute('class', isThisLineActive ? 'line-acc' : 'line-muted');

        // Place label at 65% radius, offset perpendicularly so it never clashes with axes or tips
        // When active, the vector Ax label already displays the eigenvalue, so hide duplicate line label
        if (isThisLineActive) {
          attr(lblEl, { display: 'none' });
        } else {
          const labDist = extentPx * 0.65;
          const perpX = -eSin;
          const perpY = -eCos;
          const labX = x0 + labDist * eCos + 10 * perpX;
          const labY = y0 - labDist * eSin + 10 * perpY;
          attr(lblEl, { x: labX, y: labY + 4, display: '' });
          lblEl.setAttribute('class', 'lbl');
          lblEl.textContent = `λ = ${eline.lambda}`;
        }
      } else {
        attr(el, { display: 'none' });
        attr(lblEl, { display: 'none' });
      }
    });

    // Turning arc (only when not aligned and Ax has length)
    if (!isAligned && lenAx > 0.05) {
      const rArc = Math.min(28, scaleUnit * 0.65);
      const startX = x0 + rArc * cosT;
      const startY = y0 - rArc * sinT;
      const axNormX = u / lenAx;
      const axNormY = v / lenAx;
      const endX = x0 + rArc * axNormX;
      const endY = y0 - rArc * axNormY;

      // In SVG inverted y: positive counter-clockwise angleDiff corresponds to sweepFlag 0
      const sweepFlag = angleDiff > 0 ? 0 : 1;
      turnArc.setAttribute(
        'd',
        `M ${startX} ${startY} A ${rArc} ${rArc} 0 0 ${sweepFlag} ${endX} ${endY}`,
      );
      attr(turnArc, { display: '' });

      // Label at arc midpoint
      const midAngle = angle + angleDiff / 2;
      const midX = x0 + (rArc + 12) * Math.cos(midAngle);
      const midY = y0 - (rArc + 12) * Math.sin(midAngle);
      attr(turnLbl, { x: midX, y: midY, display: '' });
      const degTurn = Math.round(Math.abs((angleDiff * 180) / Math.PI));
      turnLbl.textContent = `${degTurn}°`;
    } else {
      attr(turnArc, { display: 'none' });
      attr(turnLbl, { display: 'none' });
    }

    // Draw vector x
    attr(xLine, {
      x1: x0,
      y1: y0,
      x2: xTipX,
      y2: xTipY,
      class: isAligned ? 'curve-acc' : 'line',
    });

    // Arrowhead helper
    const makeArrowHead = (tipX: number, tipY: number, dirX: number, dirY: number, size = 10, width = 4.5) => {
      const len = Math.hypot(dirX, dirY) || 1;
      const nx = dirX / len;
      const ny = dirY / len;
      const p1x = tipX;
      const p1y = tipY;
      const p2x = tipX - size * nx + width * -ny;
      const p2y = tipY - size * ny - width * nx;
      const p3x = tipX - size * nx - width * -ny;
      const p3y = tipY - size * ny + width * nx;
      return `${p1x},${p1y} ${p2x},${p2y} ${p3x},${p3y}`;
    };

    // Vector x arrowhead (underneath the handle)
    attr(xArrow, {
      points: makeArrowHead(xTipX, xTipY, cosT, -sinT, 9, 4),
      class: isAligned ? 'dot-acc' : 'dot',
    });

    // Move handle to tip of x
    hd.move(xTipX, xTipY);
    hd.el.setAttribute(
      'aria-valuenow',
      String(Math.round((((angle * 180) / Math.PI) % 360 + 360) % 360)),
    );

    // Vector Ax line and arrowhead
    attr(axLine, {
      x1: x0,
      y1: y0,
      x2: axTipX,
      y2: axTipY,
      class: isAligned ? 'curve-acc' : 'curve',
    });
    if (lenAx > 0.05) {
      attr(axArrow, {
        points: makeArrowHead(axTipX, axTipY, u, -v, 10, 4.5),
        class: isAligned ? 'dot-acc' : 'dot',
        display: '',
      });
    } else {
      attr(axArrow, { display: 'none' });
    }

    // Vector labels
    const perpX = -sinT;
    const perpY = -cosT;

    if (isAligned && Math.abs(lenAx - 1) < 0.15) {
      // If Ax and x coincide (e.g. lambda = 1), show one unified label placed cleanly above/beside
      attr(xNameLbl, { display: 'none' });
      axNameLbl.textContent = `${matrixName}x = x (λ = +1)`;
      attr(axNameLbl, {
        x: xTipX + 14 * cosT + 14 * perpX,
        y: xTipY - 14 * sinT + 14 * perpY,
        class: 'lbl-acc',
        display: '',
      });
    } else {
      // Vector x label (offset slightly perpendicular to x)
      const xLblX = xTipX + 16 * cosT + 8 * perpX;
      const xLblY = xTipY - 16 * sinT + 8 * perpY;
      attr(xNameLbl, {
        x: xLblX,
        y: xLblY + 4,
        class: isAligned ? 'lbl-acc' : 'lbl-fg',
        display: '',
      });
      xNameLbl.textContent = 'x';

      // Vector Ax label
      axNameLbl.textContent = isAligned ? `${matrixName}x = ${matchedLambda}x` : `${matrixName}x`;
      const axDirX = lenAx > 0.05 ? u / lenAx : cosT;
      const axDirY = lenAx > 0.05 ? -v / lenAx : -sinT;
      const axPerpX = -axDirY;
      const axPerpY = axDirX;
      attr(axNameLbl, {
        x: axTipX + 16 * axDirX + 8 * axPerpX,
        y: axTipY + 16 * axDirY + 8 * axPerpY + 4,
        class: isAligned ? 'lbl-acc' : 'lbl-fg',
        display: '',
      });
    }

    // Status banner at the top of the SVG
    attr(statusLbl, { x: x0, y: 16 });
    if (isAligned) {
      statusLbl.setAttribute('class', 'lbl-acc');
      statusLbl.textContent = `Eigenvector direction: ${matrixName}x = ${matchedLambda}x (λ = ${matchedLambda > 0 ? '+' : ''}${matchedLambda})`;
    } else if (cur.eigenvalues.length === 0) {
      statusLbl.setAttribute('class', 'lbl');
      statusLbl.textContent = 'Rotation turns every arrow (no real eigenvectors)';
    } else {
      statusLbl.setAttribute('class', 'lbl');
      const degTurn = Math.round(Math.abs((angleDiff * 180) / Math.PI));
      statusLbl.textContent = `${matrixName}x is turned by ${degTurn}° (not an eigenvector)`;
    }

    // Live KaTeX formula
    if (isAligned) {
      f.set(
        `${matrixName}\\vec{x} = \\lambda\\vec{x} = ${matchedLambda}\\vec{x} \\quad (\\lambda = ${matchedLambda > 0 ? '+' : ''}${matchedLambda}, \\; \\det(${matrixName}-\\lambda I)=0)`,
      );
    } else {
      f.set(
        `${matrixName}\\vec{x} = \\begin{bmatrix} ${fmtNum(u)} \\\\ ${fmtNum(v)} \\end{bmatrix} \\quad (${cur.charEqTex})`,
      );
    }
  }

  view.onResize(draw);
  draw();
};

export default mount;
