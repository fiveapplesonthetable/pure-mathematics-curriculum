import 'katex/dist/katex.min.css';
import './style.css';
import katex from 'katex';
import libraryData from './content/library.json';
import { chapters as chapterFigures, type Placement } from './chapters';
import * as store from './store';
import type { Mount } from './figures/lib';

interface Block { refs: string[]; section: string; html: string }
interface Chapter { book: string; key: string; label: string; title: string; titleHtml: string; blocks: Block[] }
interface ChapterEntry { key: string; label: string; title: string; titleHtml: string; part: number | null }
interface Book {
  id: string; title: string; short: string; subtitle: string; hasPreface: boolean; prefaceTitle: string | null;
  parts: { title: string; titleHtml: string; chapters: string[] }[];
  chapters: ChapterEntry[];
  macros: Record<string, string>;
}

const app = document.getElementById('app')!;
const bar = document.querySelector<HTMLElement>('.progress-bar')!;
const library = libraryData as unknown as Book[];
const bookById = (id: string) => library.find((b) => b.id === id);

const contentFiles = import.meta.glob<{ default: Chapter }>('./content/*/*.json');
const figureFiles = import.meta.glob<{ default: Mount }>('./figures/*.ts');

// ---------- theme ----------

const THEME_NAMES: Record<store.Theme, string> = { system: 'System', light: 'Light', dark: 'Dark' };
const THEME_ICONS: Record<store.Theme, string> = {
  system:
    '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 14.5A6.5 6.5 0 0 1 9.5 6a6.5 6.5 0 1 0 8.5 8.5Z"/><path d="M16 3v2M21 8h-2M19.5 4.5l-1.4 1.4"/></svg>',
  light:
    '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>',
  dark:
    '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>',
};
const BACK_ICON =
  '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>';
function applyTheme(t: store.Theme) {
  if (t === 'system') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = t;
}
function themeButton(): HTMLButtonElement {
  const b = document.createElement('button');
  b.className = 'linkish theme-btn';
  b.type = 'button';
  const show = () => {
    const t = store.theme();
    b.innerHTML = THEME_ICONS[t];
    b.title = `Theme: ${THEME_NAMES[t]}`;
    b.setAttribute('aria-label', `Colour theme: ${THEME_NAMES[t]}. Change theme`);
  };
  b.addEventListener('click', () => {
    const order: store.Theme[] = ['system', 'light', 'dark'];
    const next = order[(order.indexOf(store.theme()) + 1) % 3];
    store.setTheme(next);
    applyTheme(next);
    show();
  });
  show();
  return b;
}
applyTheme(store.theme());

function topBar(back?: { href: string; text: string }) {
  const el = document.createElement('div');
  el.className = 'bar';
  el.innerHTML = back ? `<a href="${back.href}">${BACK_ICON}<span>${back.text}</span></a>` : '<span></span>';
  el.appendChild(themeButton());
  return el;
}

// ---------- maths ----------

function renderMath(root: ParentNode, macros: Record<string, string>) {
  const m = { ...macros };
  root.querySelectorAll<HTMLElement>('.m, .md').forEach((el) => {
    const display = el.classList.contains('md');
    try {
      katex.render(el.textContent || '', el, { displayMode: display, throwOnError: false, macros: m, strict: 'ignore' });
    } catch (e) {
      console.warn('KaTeX', e);
    }
  });
  // Inline formulas wider than their container (e.g. inside indented lists) get their own scrollable line.
  const markWide = () => {
    const host = root instanceof Element ? root : document.body;
    const hb = host.getBoundingClientRect();
    host.querySelectorAll<HTMLElement>('.m').forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width > hb.width + 1 || r.right > hb.right + 1) el.classList.add('wide');
    });
  };
  requestAnimationFrame(markWide);
  document.fonts?.ready.then(markWide);
}

// ---------- views ----------

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const chapterHref = (book: string, key: string) => `#/${book}/${encodeURIComponent(key)}`;

function showLibrary() {
  current = null;
  document.body.classList.remove('reading');
  document.title = 'From the Ground Up';
  const last = store.lastChapter();
  const lastBook = last ? bookById(last.book) : undefined;
  const lastCh = lastBook?.chapters.find((c) => c.key === last!.key);
  app.replaceChildren(topBar());
  const main = document.createElement('div');
  main.innerHTML = `
    <h1 class="title">From the Ground Up</h1>
    <p class="subtitle">Four readers in pure mathematics, calculus, linear algebra and probability, with figures you can move.</p>
    ${lastBook && lastCh ? `<p class="continue"><a href="${chapterHref(lastBook.id, lastCh.key)}">Continue reading</a><span class="muted"> · ${esc(lastBook.title)}, ${lastCh.label}. ${lastCh.titleHtml}</span></p>` : ''}
    <ul class="books">${library
      .map((b) => `<li><a href="#/${b.id}"><span class="book-title">${esc(b.title)}</span><span class="book-sub">${esc(b.subtitle)}</span><span class="book-meta">${b.chapters.length} chapters</span></a></li>`)
      .join('')}</ul>`;
  app.appendChild(main);
  window.scrollTo(0, 0);
}

function showBook(book: Book) {
  current = null;
  document.body.classList.remove('reading');
  document.title = book.title;
  const last = store.lastChapter();
  const row = (c: ChapterEntry) => {
    const here = last?.book === book.id && last.key === c.key;
    const st = store.chapterState(book.id, c.key);
    const note = here ? 'You left off here' : st.read > 0.9 ? 'Read' : chapterFigures[`${book.id}/${c.key}`] ? 'With figures' : '';
    return `<li${here ? ' class="toc-here"' : ''}><a href="${chapterHref(book.id, c.key)}"><span class="toc-num">${c.label}</span><span class="toc-title">${c.titleHtml}${
      note ? ` <span class="toc-note">· ${note}</span>` : ''
    }</span></a></li>`;
  };
  let toc = '';
  if (book.parts.length) {
    const seen = new Set<string>();
    for (const p of book.parts) {
      const chs = book.chapters.filter((c) => p.chapters.includes(c.key));
      chs.forEach((c) => seen.add(c.key));
      if (chs.length) toc += `<h2 class="part">${p.titleHtml}</h2><ol class="toc">${chs.map(row).join('')}</ol>`;
    }
    const rest = book.chapters.filter((c) => !seen.has(c.key));
    if (rest.length) toc = `<ol class="toc">${rest.map(row).join('')}</ol>` + toc;
  } else toc = `<ol class="toc">${book.chapters.map(row).join('')}</ol>`;
  app.replaceChildren(topBar({ href: '#/', text: 'All books' }));
  const main = document.createElement('div');
  main.innerHTML = `
    <h1 class="title">${esc(book.title)}</h1>
    <p class="subtitle">${esc(book.subtitle)}</p>
    ${book.hasPreface ? `<details class="preface"><summary>${book.prefaceTitle ?? 'Preface'}</summary><div class="preface-body"></div></details>` : ''}
    ${toc}`;
  app.appendChild(main);
  const details = main.querySelector('details.preface') as HTMLDetailsElement | null;
  details?.addEventListener('toggle', async () => {
    const body = details.querySelector('.preface-body')!;
    if (!details.open || body.childElementCount) return;
    const loader = contentFiles[`./content/${book.id}/preface.json`];
    if (!loader) return;
    body.innerHTML = (await loader()).default.blocks.map((b) => b.html).join('');
    renderMath(body, book.macros);
  });
  window.scrollTo(0, 0);
}

async function mountFigure(fig: HTMLElement, name: string) {
  const loader = figureFiles[`./figures/${name}.ts`];
  const body = fig.querySelector<HTMLElement>('.fig-body')!;
  if (!loader) {
    console.error(`Missing figure module ${name}`);
    fig.remove();
    return;
  }
  try {
    (await loader()).default(body);
  } catch (e) {
    console.error(`Figure ${name} failed`, e);
  }
}

function figureHtml(p: Placement) {
  return `<figure class="fig" data-fig="${esc(p.fig)}"><div class="fig-body"></div>${p.caption ? `<figcaption>${p.caption}</figcaption>` : ''}</figure>`;
}

let saveTimer = 0;
let current: { book: string; key: string } | null = null;

async function showChapter(book: Book, key: string, anchor: string | null) {
  const idx = book.chapters.findIndex((c) => c.key === key);
  const loader = contentFiles[`./content/${book.id}/${key}.json`];
  if (idx < 0 || !loader) return showBook(book);
  const ch = (await loader()).default;
  const placements = chapterFigures[`${book.id}/${key}`] ?? [];
  const at = (b: Block, where: Placement['where']) => placements.filter((p) => p.where === where && b.refs.includes(p.ref));

  let html = '';
  for (const b of ch.blocks) {
    for (const p of at(b, 'before')) html += figureHtml(p);
    const rep = at(b, 'replace');
    html += rep.length ? rep.map(figureHtml).join('') : b.html;
    for (const p of at(b, 'after')) html += figureHtml(p);
  }
  for (const p of placements) {
    if (!ch.blocks.some((b) => b.refs.includes(p.ref))) console.error(`${book.id}/${key}: no block with ref "${p.ref}" for figure ${p.fig}`);
  }

  const prev = book.chapters[idx - 1];
  const next = book.chapters[idx + 1];
  document.title = `${ch.title} · ${book.title}`;
  document.body.classList.add('reading');
  app.replaceChildren(topBar({ href: `#/${book.id}`, text: book.short }));
  const main = document.createElement('div');
  main.innerHTML = `
    <article>
      <h1><span class="muted">${ch.label}</span>&ensp;${ch.titleHtml}</h1>
      ${html}
    </article>
    <nav class="pager" aria-label="Chapters">
      ${prev ? `<a class="prev" href="${chapterHref(book.id, prev.key)}"><small>Previous</small>${prev.titleHtml}</a>` : ''}
      ${next ? `<a class="next" href="${chapterHref(book.id, next.key)}"><small>Next</small>${next.titleHtml}</a>` : ''}
    </nav>`;
  app.appendChild(main);
  renderMath(main.querySelector('article')!, book.macros);

  await Promise.all([...main.querySelectorAll<HTMLElement>('figure.fig')].map((f) => mountFigure(f, f.dataset.fig!)));

  current = { book: book.id, key };
  store.setLastChapter(book.id, key);
  const st = store.chapterState(book.id, key);
  requestAnimationFrame(() => {
    const target = anchor ? document.getElementById(anchor) : null;
    if (target) {
      target.scrollIntoView();
    } else {
      const max = document.documentElement.scrollHeight - innerHeight;
      window.scrollTo(0, st.pos > 0.01 && st.pos < 0.99 ? st.pos * max : 0);
    }
    onScroll();
  });
}

function onScroll() {
  if (current === null) return;
  const max = document.documentElement.scrollHeight - innerHeight;
  const pos = max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 1;
  bar.style.transform = `scaleX(${pos})`;
  clearTimeout(saveTimer);
  const c = current;
  saveTimer = window.setTimeout(() => {
    const st = store.chapterState(c.book, c.key);
    store.saveChapterState(c.book, c.key, { pos, read: Math.max(st.read, pos) });
  }, 250);
}
addEventListener('scroll', onScroll, { passive: true });

let lastRoute = '';
function route() {
  // #/book/chapter#anchor ; legacy #/20 means proofs chapter 20
  const raw = location.hash.slice(1);
  const [path, anchor] = raw.split('#');
  const parts = (path || '/').split('/').filter(Boolean).map(decodeURIComponent);
  const routeKey = parts.join('/');
  if (routeKey === lastRoute && anchor) {
    document.getElementById(anchor)?.scrollIntoView();
    return;
  }
  lastRoute = routeKey;
  current = null;
  if (parts.length === 1 && /^\d+$/.test(parts[0])) {
    location.replace(`#/proofs/${parts[0]}`);
    return;
  }
  const book = parts[0] ? bookById(parts[0]) : undefined;
  if (!book) return showLibrary();
  if (parts[1]) return showChapter(book, parts[1], anchor || null);
  showBook(book);
}
addEventListener('hashchange', route);
route();
