// Shared building blocks for interactive figures.
//
// A figure module default-exports `mount(root, api)`. `root` is an empty
// element inside <figure class="fig">; the caption is added by the page.
// Build the picture with SVG and the classes listed in style.css
// ("Diagram vocabulary"), so colours follow the theme. Never hard-code colours.

import katex from 'katex';

export type Mount = (root: HTMLElement) => void | (() => void);

const NS = 'http://www.w3.org/2000/svg';

export const MACROS = { '\\N': '\\mathbb{N}', '\\R': '\\mathbb{R}', '\\Z': '\\mathbb{Z}', '\\eps': '\\varepsilon' };

/** Create an SVG element with attributes, optionally appending it. */
export function s<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | number> = {},
  parent?: Element,
): SVGElementTagNameMap[K] {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, String(attrs[k]));
  if (parent) parent.appendChild(e);
  return e;
}

/** Create an HTML element with attributes, optionally appending it. */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {},
  parent?: Element,
  text?: string,
): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (text !== undefined) e.textContent = text;
  if (parent) parent.appendChild(e);
  return e;
}

/** Set several attributes at once. */
export function attr(e: Element, attrs: Record<string, string | number>) {
  for (const k in attrs) e.setAttribute(k, String(attrs[k]));
}

/**
 * An <svg> drawn at the figure's real pixel width, so 1 unit = 1 CSS px and
 * text stays readable on a 360px phone. Height is width * aspect, clamped.
 * Read view.W / view.H inside your draw function, and register it with
 * view.onResize(draw) after creating your elements (it is not called
 * immediately; call draw() yourself once). Prefer this over a fixed viewBox.
 */
export function responsiveSvg(root: HTMLElement, opts: { label: string; aspect: number; minH?: number; maxH?: number }) {
  const el = s('svg', { role: 'img', 'aria-label': opts.label }, root);
  let W = 0, H = 0;
  let cb: ((W: number, H: number) => void) | null = null;
  const fit = () => {
    const w = Math.round(root.clientWidth || 600);
    if (w === W) return false;
    W = w;
    H = Math.round(clamp(W * opts.aspect, opts.minH ?? 220, opts.maxH ?? 420));
    el.setAttribute('viewBox', `0 0 ${W} ${H}`);
    el.setAttribute('width', String(W));
    el.setAttribute('height', String(H));
    return true;
  };
  fit();
  new ResizeObserver(() => {
    if (fit()) cb?.(W, H);
  }).observe(root);
  return {
    el,
    get W() { return W; },
    get H() { return H; },
    onResize(fn: (W: number, H: number) => void) { cb = fn; },
  };
}

/** An <svg> with a fixed viewBox, scaled to the figure width. Text shrinks on phones; prefer responsiveSvg. */
export function svg(root: HTMLElement, width: number, height: number, label: string): SVGSVGElement {
  return s('svg', { viewBox: `0 0 ${width} ${height}`, role: 'img', 'aria-label': label }, root);
}

/** Render TeX into an element (inline). */
export function tex(el: Element, src: string, display = false) {
  el.innerHTML = katex.renderToString(src, { throwOnError: false, displayMode: display, macros: { ...MACROS } });
}

/** A line under the picture showing a live formula. Call .set(tex). */
export function formula(root: HTMLElement) {
  const el = h('div', { class: 'fig-formula', 'aria-live': 'polite' }, root);
  let last = '';
  return {
    el,
    set(src: string) {
      if (src !== last) tex(el, (last = src));
    },
  };
}

/** A row for controls (sliders, buttons, notes). */
export function row(root: HTMLElement) {
  return h('div', { class: 'fig-row' }, root);
}

export function button(parent: HTMLElement, label: string, onClick: () => void) {
  const b = h('button', { type: 'button' }, parent, label);
  b.addEventListener('click', onClick);
  return b;
}

/** A labelled range slider with a live value readout. */
export function slider(
  parent: HTMLElement,
  opts: { label: string; texLabel?: string; min: number; max: number; step: number; value: number; format?: (v: number) => string; onInput: (v: number) => void },
) {
  const lab = h('label', { class: 'slider' }, parent);
  const name = h('span', { class: 'slider-name' }, lab);
  if (opts.texLabel) tex(name, opts.texLabel);
  else name.textContent = opts.label;
  const input = h('input', { type: 'range', min: String(opts.min), max: String(opts.max), step: String(opts.step), value: String(opts.value), 'aria-label': opts.label }, lab);
  const out = h('output', {}, lab);
  const fmt = opts.format ?? ((v: number) => String(v));
  const show = () => (out.textContent = fmt(+input.value));
  show();
  input.addEventListener('input', () => {
    show();
    opts.onInput(+input.value);
  });
  return {
    input,
    get value() {
      return +input.value;
    },
    set(v: number) {
      input.value = String(v);
      show();
    },
  };
}

export const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Eased animation from 0 to 1 over `ms` (default 300). Jumps to the end under reduced motion. Returns a cancel function. */
export function tween(onFrame: (k: number) => void, ms = 300, done?: () => void): () => void {
  if (reducedMotion() || ms <= 0) {
    onFrame(1);
    done?.();
    return () => {};
  }
  const t0 = performance.now();
  let id = 0;
  const step = (t: number) => {
    const k = Math.min(1, (t - t0) / ms);
    onFrame(1 - Math.pow(1 - k, 3));
    if (k < 1) id = requestAnimationFrame(step);
    else done?.();
  };
  id = requestAnimationFrame(step);
  return () => cancelAnimationFrame(id);
}

export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Convert a pointer event to SVG user coordinates. */
export function toSvg(svgEl: SVGSVGElement, ev: { clientX: number; clientY: number }) {
  const m = svgEl.getScreenCTM();
  if (!m) return { x: 0, y: 0 };
  const p = new DOMPoint(ev.clientX, ev.clientY).matrixTransform(m.inverse());
  return { x: p.x, y: p.y };
}

/**
 * A draggable, keyboard-operable handle: a visible knob with a 44 CSS px hit
 * area (kept at 44px whatever the figure's scale).
 *
 * onDrag receives SVG coordinates; clamp and apply them yourself, then call
 * handle.move(x, y). onKey receives arrow-key steps (dx, dy in {-1,0,1});
 * `big` is true with Shift.
 */
export function handle(
  svgEl: SVGSVGElement,
  opts: {
    label: string;
    x: number;
    y: number;
    onDrag: (x: number, y: number) => void;
    onKey: (dx: number, dy: number, big: boolean) => void;
    valueText?: () => string;
    r?: number;
    parent?: Element;
  },
) {
  const g = s('g', { class: 'handle', tabindex: 0, role: 'slider', 'aria-label': opts.label }, opts.parent ?? svgEl);
  const hit = s('circle', { class: 'hit', r: 22 }, g);
  const ring = s('circle', { class: 'ring', r: (opts.r ?? 9) + 6 }, g);
  s('circle', { class: 'knob', r: opts.r ?? 9 }, g);
  void ring;
  const fitHit = () => {
    const w = svgEl.getBoundingClientRect().width;
    const vb = svgEl.viewBox.baseVal.width || w;
    if (w > 0) hit.setAttribute('r', String(22 * (vb / w)));
  };
  fitHit();
  const ro = new ResizeObserver(fitHit);
  ro.observe(svgEl);

  let dragging = false;
  g.addEventListener('pointerdown', (e) => {
    dragging = true;
    g.setPointerCapture(e.pointerId);
    e.preventDefault();
    (g as unknown as HTMLElement).focus({ preventScroll: true });
  });
  g.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const p = toSvg(svgEl, e);
    opts.onDrag(p.x, p.y);
  });
  const end = () => (dragging = false);
  g.addEventListener('pointerup', end);
  g.addEventListener('pointercancel', end);
  g.addEventListener('keydown', (e) => {
    const k: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] };
    const d = k[e.key];
    if (!d) return;
    e.preventDefault();
    opts.onKey(d[0], d[1], e.shiftKey);
  });

  const api = {
    el: g,
    move(x: number, y: number) {
      g.setAttribute('transform', `translate(${x},${y})`);
      if (opts.valueText) g.setAttribute('aria-valuetext', opts.valueText());
    },
  };
  api.move(opts.x, opts.y);
  return api;
}

/** Linear scale helper: maps [d0,d1] to [r0,r1]. */
export function scale(d0: number, d1: number, r0: number, r1: number) {
  const f = (v: number) => r0 + ((v - d0) / (d1 - d0)) * (r1 - r0);
  f.invert = (p: number) => d0 + ((p - r0) / (r1 - r0)) * (d1 - d0);
  return f;
}

/** SVG text label. */
export function label(parent: Element, x: number, y: number, text: string, cls = 'lbl', anchor: 'start' | 'middle' | 'end' = 'middle') {
  const t = s('text', { x, y, class: cls, 'text-anchor': anchor }, parent);
  t.textContent = text;
  return t;
}

export interface Step {
  /** TeX or HTML for the line; set `isTex` for pure TeX. */
  html: string;
  /** Short reason shown under the current step, e.g. "uses n ≥ N". */
  why?: string;
  /** Indices of earlier steps this one relies on; they are highlighted. */
  uses?: number[];
}

/**
 * A proof shown one line at a time. Later lines start hidden; Next reveals
 * them. The current line is marked with the accent and the lines it uses are
 * underlined. onStep(i) lets a companion picture react to the current step.
 */
export function stepper(root: HTMLElement, steps: Step[], onStep?: (i: number) => void) {
  const ol = h('ol', { class: 'steps', 'aria-live': 'polite' }, root);
  const items = steps.map((st) => {
    const li = h('li', {}, ol);
    const t = h('span', { class: 'step-text' }, li);
    t.innerHTML = st.html;
    if (st.why) {
      const w = h('span', { class: 'step-why' }, li);
      w.innerHTML = st.why;
    }
    return li;
  });
  const r = row(root);
  const prev = button(r, 'Previous', () => go(i - 1));
  const next = button(r, 'Next', () => go(i + 1));
  h('span', { class: 'spacer' }, r);
  const all = button(r, 'Show all', () => go(steps.length - 1));
  let i = 0;
  function go(n: number) {
    i = clamp(n, 0, steps.length - 1);
    const used = new Set(steps[i].uses ?? []);
    items.forEach((li, k) => {
      li.className = k < i ? 'past' : k === i ? 'current' : 'future';
      if (used.has(k)) li.classList.add('used');
      li.setAttribute('aria-hidden', k > i ? 'true' : 'false');
    });
    prev.disabled = i === 0;
    next.disabled = all.disabled = i === steps.length - 1;
    onStep?.(i);
  }
  go(0);
  return { go, get index() { return i; } };
}

/** Render a TeX string to HTML (for stepper lines). */
export const texHtml = (src: string, display = false) =>
  katex.renderToString(src, { throwOnError: false, displayMode: display, macros: { ...MACROS } });
