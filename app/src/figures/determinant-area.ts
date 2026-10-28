// Linear Algebra, Chapter 21: Determinant as signed area.
// The columns a1 = (a, c)^T and a2 = (b, d)^T of a 2x2 matrix span a parallelogram
// whose signed area is det [a1 a2] = ad - bc.
// Dragging either handle updates the parallelogram, live formula, and orientation arc.

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
  label,
  lerp,
  type Mount,
} from './lib';

// Initial column vectors: a1 = (2.0, 0.5), a2 = (0.5, 1.5) -> det = 2.75
const A1_INIT = { x: 2.0, y: 0.5 };
const A2_INIT = { x: 0.5, y: 1.5 };

const mount: Mount = (root) => {
  let a = A1_INIT.x;
  let c = A1_INIT.y;
  let b = A2_INIT.x;
  let d = A2_INIT.y;

  const pad = { l: 24, r: 24, t: 18, b: 24 };
  const xMin = -1.6, xMax = 3.6;
  const yMin = -1.2, yMax = 2.6;

  const view = responsiveSvg(root, {
    label: 'Interactive 2D parallelogram spanned by column vectors a1 and a2 demonstrating determinant as signed area',
    aspect: 0.72,
    minH: 260,
    maxH: 360,
  });
  const svgEl = view.el;

  // Background layers
  const gridG = s('g', {}, svgEl);
  const axesG = s('g', {}, svgEl);

  // Unit square for comparison (faint area = 1)
  const unitSqFill = s('polygon', { class: 'band-muted' }, svgEl);
  const unitSqLine = s('polygon', { class: 'line-muted' }, svgEl);
  const unitSqLbl = label(svgEl, 0, 0, 'area 1', 'lbl dim', 'middle');

  // Parallelogram spanned by a1 and a2
  const poly = s('polygon', { class: 'band' }, svgEl);
  const edge1 = s('line', { class: 'line-muted' }, svgEl);
  const edge2 = s('line', { class: 'line-muted' }, svgEl);
  const flatLine = s('line', { class: 'edge' }, svgEl);

  // Orientation curved arc and arrowhead
  const arcPath = s('path', { class: 'curve-muted' }, svgEl);
  const arcHead = s('path', { class: 'curve-muted' }, svgEl);
  const arcLbl = label(svgEl, 0, 0, '', 'lbl', 'middle');

  // Vector lines
  const vec1 = s('line', { class: 'curve' }, svgEl);
  const vec2 = s('line', { class: 'curve' }, svgEl);
  const originDot = s('circle', { r: 3, class: 'dot' }, svgEl);

  // Vector labels
  const lbl1 = label(svgEl, 0, 0, 'a₁', 'lbl-fg', 'middle');
  const lbl2 = label(svgEl, 0, 0, 'a₂', 'lbl-fg', 'middle');

  // Draggable handles at tips of a1 and a2
  let toX = (x: number) => x;
  let toY = (y: number) => y;
  let fromX = (px: number) => px;
  let fromY = (py: number) => py;

  const hd1 = handle(svgEl, {
    label: 'Vector a1 (first column)',
    x: 0,
    y: 0,
    r: 8,
    valueText: () => `a1 = (${a.toFixed(1)}, ${c.toFixed(1)})`,
    onDrag: (px, py) => {
      setA1(fromX(px), fromY(py));
    },
    onKey: (dx, dy, big) => {
      const step = big ? 0.5 : 0.1;
      setA1(a + dx * step, c + dy * step);
    },
  });

  const hd2 = handle(svgEl, {
    label: 'Vector a2 (second column)',
    x: 0,
    y: 0,
    r: 8,
    valueText: () => `a2 = (${b.toFixed(1)}, ${d.toFixed(1)})`,
    onDrag: (px, py) => {
      setA2(fromX(px), fromY(py));
    },
    onKey: (dx, dy, big) => {
      const step = big ? 0.5 : 0.1;
      setA2(b + dx * step, d + dy * step);
    },
  });

  // Formula readout, explanation note, and Reset button
  const f = formula(root);
  f.el.style.fontSize = 'clamp(0.84rem, 3.8vw, 1rem)';
  const note = h('div', { class: 'fig-note' }, root);
  note.style.margin = '0.25rem 8px 0';
  const r = row(root);

  button(r, 'Reset', () => {
    const fromA = a, fromC = c, fromB = b, fromD = d;
    tween((k) => {
      a = lerp(fromA, A1_INIT.x, k);
      c = lerp(fromC, A1_INIT.y, k);
      b = lerp(fromB, A2_INIT.x, k);
      d = lerp(fromD, A2_INIT.y, k);
      draw();
    });
  });

  function setA1(newX: number, newY: number) {
    const minX = Math.max(-1.2, -1.5 - b);
    const maxX = Math.min(2.5, 3.5 - b);
    const minY = Math.max(-1.0, -1.1 - d);
    const maxY = Math.min(2.2, 2.5 - d);
    a = clamp(Math.round(newX * 10) / 10, minX, maxX);
    c = clamp(Math.round(newY * 10) / 10, minY, maxY);
    draw();
  }

  function setA2(newX: number, newY: number) {
    const minX = Math.max(-1.2, -1.5 - a);
    const maxX = Math.min(2.5, 3.5 - a);
    const minY = Math.max(-1.0, -1.1 - c);
    const maxY = Math.min(2.2, 2.5 - c);
    b = clamp(Math.round(newX * 10) / 10, minX, maxX);
    d = clamp(Math.round(newY * 10) / 10, minY, maxY);
    draw();
  }

  function draw() {
    const { W, H } = view;
    const availW = Math.max(10, W - pad.l - pad.r);
    const availH = Math.max(10, H - pad.t - pad.b);
    const S = Math.min(availW / (xMax - xMin), availH / (yMax - yMin));

    const totalW = (xMax - xMin) * S;
    const totalH = (yMax - yMin) * S;
    const Ox = pad.l + (availW - totalW) / 2 + (-xMin) * S;
    const Oy = pad.t + (availH - totalH) / 2 + yMax * S;

    toX = (x: number) => Ox + x * S;
    toY = (y: number) => Oy - y * S;
    fromX = (px: number) => (px - Ox) / S;
    fromY = (py: number) => (Oy - py) / S;

    // Grid lines and axes
    gridG.replaceChildren();
    axesG.replaceChildren();

    for (let x = -1; x <= 3; x++) {
      if (x === 0) continue;
      const gx = toX(x);
      s('line', { x1: gx, x2: gx, y1: toY(yMin), y2: toY(yMax), class: 'grid' }, gridG);
      label(axesG, gx, Oy + 14, String(x), 'lbl', 'middle');
    }

    for (let y = -1; y <= 2; y++) {
      if (y === 0) continue;
      const gy = toY(y);
      s('line', { x1: toX(xMin), x2: toX(xMax), y1: gy, y2: gy, class: 'grid' }, gridG);
      label(axesG, Ox - 10, gy + 4, String(y), 'lbl', 'end');
    }

    // Axes
    s('line', { x1: toX(xMin), x2: toX(xMax), y1: Oy, y2: Oy, class: 'ax' }, axesG);
    s('line', { x1: Ox, x2: Ox, y1: toY(yMin), y2: toY(yMax), class: 'ax' }, axesG);
    label(axesG, Ox - 8, Oy + 14, '0', 'lbl dim', 'end');
    attr(originDot, { cx: Ox, cy: Oy });

    // Unit square
    const sq0x = toX(0), sq0y = toY(0);
    const sq1x = toX(1), sq1y = toY(0);
    const sq2x = toX(1), sq2y = toY(1);
    const sq3x = toX(0), sq3y = toY(1);

    attr(unitSqFill, { points: `${sq0x},${sq0y} ${sq1x},${sq1y} ${sq2x},${sq2y} ${sq3x},${sq3y}` });
    attr(unitSqLine, { points: `${sq0x},${sq0y} ${sq1x},${sq1y} ${sq2x},${sq2y} ${sq3x},${sq3y}` });
    attr(unitSqLbl, { x: toX(0.80), y: toY(0.80) + 4, 'text-anchor': 'middle' });

    // Parallelogram corners
    const p0x = toX(0), p0y = toY(0);
    const p1x = toX(a), p1y = toY(c);
    const p2x = toX(a + b), p2y = toY(c + d);
    const p3x = toX(b), p3y = toY(d);

    const det = Math.round((a * d - b * c) * 100) / 100;
    const isFlat = Math.abs(det) < 0.02;
    const isPositive = det >= 0.02;

    attr(poly, {
      points: `${p0x},${p0y} ${p1x},${p1y} ${p2x},${p2y} ${p3x},${p3y}`,
      class: isFlat ? 'band-muted dim' : isPositive ? 'band' : 'band-muted',
    });

    if (isFlat) {
      edge1.style.display = 'none';
      edge2.style.display = 'none';
      flatLine.style.display = '';
      attr(flatLine, { x1: p0x, y1: p0y, x2: p2x, y2: p2y });
    } else {
      edge1.style.display = '';
      edge2.style.display = '';
      flatLine.style.display = 'none';
      attr(edge1, { x1: p1x, y1: p1y, x2: p2x, y2: p2y });
      attr(edge2, { x1: p3x, y1: p3y, x2: p2x, y2: p2y });
    }

    attr(vec1, { x1: p0x, y1: p0y, x2: p1x, y2: p1y });
    attr(vec2, { x1: p0x, y1: p0y, x2: p3x, y2: p3y });

    // Position vector labels near the handle tips, slightly outward
    const len1 = Math.hypot(p1x - Ox, p1y - Oy) || 1;
    const u1x = (p1x - Ox) / len1;
    const u1y = (p1y - Oy) / len1;

    const len2 = Math.hypot(p3x - Ox, p3y - Oy) || 1;
    const u2x = (p3x - Ox) / len2;
    const u2y = (p3y - Oy) / len2;

    const distHandles = Math.hypot(p1x - p3x, p1y - p3y);
    const overlapShift = distHandles < 24 ? 9 : 0;

    attr(lbl1, {
      x: p1x + u1x * 16,
      y: p1y + u1y * 16 + 4 - overlapShift,
      'text-anchor': u1x >= 0 ? 'start' : 'end',
    });

    attr(lbl2, {
      x: p3x + u2x * 16,
      y: p3y + u2y * 16 + 4 + overlapShift,
      'text-anchor': u2x >= 0 ? 'start' : 'end',
    });

    // Orientation arc from a1 to a2
    const rArc = clamp(Math.min(len1, len2) * 0.32, 16, 24);

    if (isFlat || len1 < 16 || len2 < 16) {
      arcPath.style.display = 'none';
      arcHead.style.display = 'none';
      arcLbl.style.display = 'none';
    } else {
      arcPath.style.display = '';
      arcHead.style.display = '';
      arcLbl.style.display = '';

      const alpha1 = Math.atan2(p1y - Oy, p1x - Ox);
      const alpha2 = Math.atan2(p3y - Oy, p3x - Ox);

      const sx = Ox + rArc * Math.cos(alpha1);
      const sy = Oy + rArc * Math.sin(alpha1);
      const ex = Ox + rArc * Math.cos(alpha2);
      const ey = Oy + rArc * Math.sin(alpha2);

      if (isPositive) {
        // Counter-clockwise: decreasing angle in SVG coordinates
        let diff = alpha1 - alpha2;
        while (diff < 0) diff += 2 * Math.PI;
        while (diff >= 2 * Math.PI) diff -= 2 * Math.PI;

        const largeArc = diff > Math.PI ? 1 : 0;
        const sweep = 0; // CCW in SVG
        arcPath.setAttribute('d', `M ${sx} ${sy} A ${rArc} ${rArc} 0 ${largeArc} ${sweep} ${ex} ${ey}`);
        arcPath.setAttribute('class', 'curve-muted');

        // CCW tangent at tip: (sin(alpha2), -cos(alpha2))
        const phi = Math.atan2(-Math.cos(alpha2), Math.sin(alpha2));
        const hLen = 7;
        const ax1 = ex - hLen * Math.cos(phi - 0.45);
        const ay1 = ey - hLen * Math.sin(phi - 0.45);
        const ax2 = ex - hLen * Math.cos(phi + 0.45);
        const ay2 = ey - hLen * Math.sin(phi + 0.45);
        arcHead.setAttribute('d', `M ${ax1} ${ay1} L ${ex} ${ey} L ${ax2} ${ay2}`);
        arcHead.setAttribute('class', 'curve-muted');

        const midAngle = alpha1 - diff / 2;
        const lx = Ox + (rArc + 9) * Math.cos(midAngle);
        const ly = Oy + (rArc + 9) * Math.sin(midAngle) + 4;
        attr(arcLbl, { x: lx, y: ly, class: 'lbl' });
        arcLbl.textContent = 'ccw';
      } else {
        // Clockwise: increasing angle in SVG coordinates
        let diff = alpha2 - alpha1;
        while (diff < 0) diff += 2 * Math.PI;
        while (diff >= 2 * Math.PI) diff -= 2 * Math.PI;

        const largeArc = diff > Math.PI ? 1 : 0;
        const sweep = 1; // CW in SVG
        arcPath.setAttribute('d', `M ${sx} ${sy} A ${rArc} ${rArc} 0 ${largeArc} ${sweep} ${ex} ${ey}`);
        arcPath.setAttribute('class', 'curve-acc');

        // CW tangent at tip: (-sin(alpha2), cos(alpha2))
        const phi = Math.atan2(Math.cos(alpha2), -Math.sin(alpha2));
        const hLen = 7;
        const ax1 = ex - hLen * Math.cos(phi - 0.45);
        const ay1 = ey - hLen * Math.sin(phi - 0.45);
        const ax2 = ex - hLen * Math.cos(phi + 0.45);
        const ay2 = ey - hLen * Math.sin(phi + 0.45);
        arcHead.setAttribute('d', `M ${ax1} ${ay1} L ${ex} ${ey} L ${ax2} ${ay2}`);
        arcHead.setAttribute('class', 'curve-acc');

        const midAngle = alpha1 + diff / 2;
        const lx = Ox + (rArc + 9) * Math.cos(midAngle);
        const ly = Oy + (rArc + 9) * Math.sin(midAngle) + 4;
        attr(arcLbl, { x: lx, y: ly, class: 'lbl-acc' });
        arcLbl.textContent = 'cw';
      }
    }

    // Handles
    hd1.move(p1x, p1y);
    hd2.move(p3x, p3y);

    // Live formula & geometric explanation
    if (isFlat) {
      f.set(
        W >= 460
          ? '\\det [\\mathbf{a}_1\\,\\mathbf{a}_2] = ad - bc = 0\\text{ (flat: zero area)}'
          : '\\det [\\mathbf{a}_1\\,\\mathbf{a}_2] = ad - bc = 0',
      );
      note.textContent = `Vectors a₁ = (${a.toFixed(1)}, ${c.toFixed(1)}) and a₂ = (${b.toFixed(1)}, ${d.toFixed(1)}) lie on the same line: the parallelogram flattens to zero area, so det [a₁ a₂] = 0.`;
    } else {
      const sign = det < 0 ? '-' : '';
      const val = Math.abs(det).toFixed(2);
      f.set(
        W >= 460
          ? `\\det [\\mathbf{a}_1\\,\\mathbf{a}_2] = ad - bc = ${sign}${val}\\text{ (= signed area)}`
          : `\\det [\\mathbf{a}_1\\,\\mathbf{a}_2] = ad - bc = ${sign}${val}`,
      );
      note.textContent = isPositive
        ? `Rotating from a₁ = (${a.toFixed(1)}, ${c.toFixed(1)}) to a₂ = (${b.toFixed(1)}, ${d.toFixed(1)}) goes counter-clockwise (right-handed), giving positive signed area ad − bc = +${val}.`
        : `Sweeping a₁ past a₂ reverses orientation to clockwise (cw), flipping the sign of the determinant to ad − bc = −${val} while the geometric area is ${val}.`;
    }
  }

  view.onResize(draw);
  draw();
};

export default mount;
