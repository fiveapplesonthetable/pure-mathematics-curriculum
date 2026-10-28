// Converts the LaTeX books into per-chapter JSON for the web edition.
//
//   node scripts/build-content.mjs        (writes src/content/<book>/...)
//
// Each book in scripts/books.mjs is read from its main file (\input expanded),
// its preamble and common.tex are scanned for macros, box titles and theorem
// names, and every chapter becomes a list of top-level blocks of HTML. Maths is
// kept as TeX (rendered by KaTeX in the browser) but validated here with
// KaTeX so broken formulas are reported at build time. TikZ pictures are
// rendered separately by scripts/build-figures.mjs; this script links the SVGs
// listed in public/figures/manifest.json.
//
// Blocks carry refs ("definition-1", "proof-2", "plain-english",
// "plain-english/1") that src/chapters/*.ts use to place interactive figures.

import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import katex from 'katex';
import { BOOKS } from './books.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const REPO = join(here, '../..');
const OUT = join(here, '../src/content');
const FIG_MANIFEST = join(here, '../public/figures/manifest.json');
const TIKZ_JOBS = join(here, '../.figures-jobs.json');

const onlyBook = process.argv.includes('--book') ? process.argv[process.argv.indexOf('--book') + 1] : null;
const verbose = process.argv.includes('--verbose');

const manifest = existsSync(FIG_MANIFEST) ? JSON.parse(readFileSync(FIG_MANIFEST, 'utf8')) : {};
const tikzJobs = {};

// ---------------------------------------------------------------- utilities

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escAttr = (s) => esc(s).replace(/"/g, '&quot;');
const slug = (s) =>
  s
    .toLowerCase()
    .replace(/\$[^$]*\$/g, '')
    .replace(/\\[a-zA-Z]+/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60) || 'section';

let warnings = [];
let where = '';
const warn = (msg) => warnings.push(`${where}: ${msg}`);

function stripComments(s) {
  return s
    .split('\n')
    .map((l) => {
      for (let i = 0; i < l.length; i++) {
        if (l[i] === '\\') { i++; continue; }
        if (l[i] === '%') return l.slice(0, i);
      }
      return l;
    })
    .join('\n');
}

// Balanced {...} group at s[i] === '{'. Returns [content, endIndex].
function group(s, i) {
  let depth = 0;
  for (let j = i; j < s.length; j++) {
    if (s[j] === '\\') { j++; continue; }
    if (s[j] === '{') depth++;
    else if (s[j] === '}' && --depth === 0) return [s.slice(i + 1, j), j + 1];
  }
  return [s.slice(i + 1), s.length];
}
// Optional [...] at s[i]; returns [content|null, endIndex].
function optArg(s, i) {
  let j = i;
  while (s[j] === ' ' || s[j] === '\n') j++;
  if (s[j] !== '[') return [null, i];
  let depth = 0;
  for (let k = j; k < s.length; k++) {
    if (s[k] === '{') depth++;
    else if (s[k] === '}') depth--;
    else if (s[k] === ']' && depth === 0) return [s.slice(j + 1, k), k + 1];
  }
  return [null, i];
}
function skipWs(s, i) {
  while (i < s.length && /\s/.test(s[i])) i++;
  return i;
}
// Read n mandatory {..} args starting at i.
function args(s, i, n) {
  const out = [];
  for (let k = 0; k < n; k++) {
    i = skipWs(s, i);
    if (s[i] !== '{') {
      // single token argument
      const m = /^\\[a-zA-Z]+|^./.exec(s.slice(i));
      out.push(m ? m[0] : '');
      i += m ? m[0].length : 0;
      continue;
    }
    const [g, e] = group(s, i);
    out.push(g);
    i = e;
  }
  return [out, i];
}

// Find matching \end{name} for a \begin{name} whose body starts at k.
function findEnd(s, name, k) {
  const open = `\\begin{${name}}`, close = `\\end{${name}}`;
  let depth = 1;
  while (depth > 0) {
    const o = s.indexOf(open, k), c = s.indexOf(close, k);
    if (c < 0) return -1;
    if (o >= 0 && o < c) { depth++; k = o + open.length; } else { depth--; if (depth === 0) return c; k = c + close.length; }
  }
  return -1;
}

// ---------------------------------------------------------------- preamble

const DEFAULT_BOXES = {
  focusbox: 'Focus', intuitionbox: 'Intuition', formalbox: 'Formal', walkbox: 'Walking question', trapbox: 'Common trap',
  historybox: 'History and connection', labbox: 'Proof lab',
};
// Asides start collapsed (progressive disclosure); the rest stay open.
const COLLAPSED = new Set(['historybox', 'connectionbox', 'applicationbox', 'aestheticbox', 'marginnotebox', 'strangbox']);

function readPreamble(text) {
  const macros = {};
  const textMacros = {};
  const boxes = { ...DEFAULT_BOXES };
  const theorems = {};
  const colors = {};
  let i = 0;
  const s = stripComments(text);
  const re = /\\(newcommand|renewcommand|providecommand|DeclareMathOperator|DeclarePairedDelimiter|newtcolorbox|newtheorem|definecolor)\*?/g;
  let m;
  while ((m = re.exec(s))) {
    i = m.index + m[0].length;
    const kind = m[1];
    if (kind === 'newcommand' || kind === 'renewcommand' || kind === 'providecommand') {
      i = skipWs(s, i);
      let name;
      if (s[i] === '{') { const [g, e] = group(s, i); name = g.trim(); i = e; } else { name = /^\\[a-zA-Z]+/.exec(s.slice(i))[0]; i += name.length; }
      const [n, e1] = optArg(s, i); i = e1;
      const [dflt, e2] = optArg(s, i); i = e2;
      i = skipWs(s, i);
      const [body, e3] = group(s, i);
      re.lastIndex = e3;
      if (['\\chapterline'].includes(name)) continue;
      if (dflt !== null) warn(`macro ${name} has an optional argument; default ignored`);
      macros[name] = body;
      textMacros[name] = { n: n ? +n : 0, body };
    } else if (kind === 'DeclareMathOperator') {
      const [[name, body], e] = args(s, i, 2);
      macros[name.trim()] = `\\operatorname{${body}}`;
      re.lastIndex = e;
    } else if (kind === 'DeclarePairedDelimiter') {
      const [[name, l, r], e] = args(s, i, 3);
      const nm = name.trim();
      macros[nm] = `${l}#1${r}`;
      macros[nm + 'Star'] = `\\left${l}#1\\right${r}`;
      re.lastIndex = e;
    } else if (kind === 'newtcolorbox') {
      const [[name, opts], e] = args(s, i, 2);
      const t = /title=([^,}]*)/.exec(opts);
      boxes[name.trim()] = t ? t[1].trim() : name;
      re.lastIndex = e;
    } else if (kind === 'newtheorem') {
      i = skipWs(s, i);
      const [[name], e1] = args(s, i, 1);
      const [shared, e2] = optArg(s, e1);
      const [[label], e3] = args(s, e2, 1);
      const [within, e4] = optArg(s, e3);
      theorems[name.trim()] = { label, shared, within };
      re.lastIndex = e4;
    } else if (kind === 'definecolor') {
      const [[name, model, spec], e] = args(s, i, 3);
      if (model === 'RGB') colors[name] = '#' + spec.split(',').map((v) => (+v).toString(16).padStart(2, '0')).join('');
      else if (model === 'HTML') colors[name] = '#' + spec;
      re.lastIndex = e;
    }
  }
  // amsthm proof is built in
  return { macros, textMacros, boxes, theorems, colors };
}

// ---------------------------------------------------------------- book reading

function expandInputs(text, root, depth = 0) {
  return text.replace(/\\(input|include)\{([^}]+)\}/g, (all, _c, p) => {
    if (/common(\.tex)?$/.test(p)) return '';
    let file = join(REPO, root, p.endsWith('.tex') ? p : p + '.tex');
    if (!existsSync(file)) { warn(`missing \\input ${p}`); return ''; }
    if (depth > 5) return '';
    return expandInputs(readFileSync(file, 'utf8'), root, depth + 1);
  });
}

// ---------------------------------------------------------------- per-book state

let B; // current book context

function newBookCtx(cfg) {
  const mainText = readFileSync(join(REPO, cfg.main), 'utf8');
  const pre = mainText.slice(0, mainText.indexOf('\\begin{document}'));
  const common = cfg.common.map((p) => readFileSync(join(REPO, p), 'utf8')).join('\n');
  const P = readPreamble(common + '\n' + pre);
  // KaTeX macros: drop text-only things
  const macros = { ...BASE_MACROS, ...P.macros };
  for (const k of Object.keys(macros)) if (/\\(vspace|hrule|newpage|tcb|textbf|emph)/.test(macros[k]) && !/\\text/.test(macros[k])) delete macros[k];
  return {
    cfg,
    P,
    macros,
    labels: {},
    figN: 0,
    bodyDefs: {},
    tikzPreamble: tikzPreamble(common + '\n' + pre),
  };
}

// Packages and definitions needed to compile a TikZ picture on its own.
function tikzPreamble(pre) {
  const lines = stripComments(pre).split('\n');
  const keep = [];
  let buf = '';
  let depth = 0;
  for (const line of lines) {
    if (!buf && !/^\s*\\(usepackage|usetikzlibrary|usepgfplotslibrary|pgfplotsset|tikzset|definecolor|colorlet|newcommand|renewcommand|DeclareMathOperator|DeclarePairedDelimiter|pgfdeclarelayer|pgfsetlayers|tcbuselibrary)/.test(line)) continue;
    buf += line + '\n';
    for (const ch of line) { if (ch === '{') depth++; else if (ch === '}') depth--; }
    if (depth <= 0) {
      if (!/\\usepackage(\[[^\]]*\])?\{(geometry|hyperref|fancyhdr|titlesec|tcolorbox|needspace|float|longtable|multicol|listings|enumitem)\}/.test(buf) && !/\\tcbuselibrary|\\chapterline|\\headrulewidth/.test(buf))
        keep.push(buf.trimEnd());
      buf = '';
      depth = 0;
    }
  }
  return keep.join('\n');
}

// ---------------------------------------------------------------- maths

const DELIM = { p: ['(', ')'], b: ['[', ']'], B: ['\\{', '\\}'], v: ['|', '|'], V: ['\\|', '\\|'] };
// Always-available macros for KaTeX (LaTeX commands KaTeX lacks).
const BASE_MACROS = { '\\qed': '\\quad\\blacksquare', '\\qedsymbol': '\\blacksquare', '\\textsuperscript': '^{\\text{#1}}' };

function prepMath(src) {
  let t = src
    .replace(/\\label\{[^}]*\}/g, '')
    .replace(/\\(nonumber|notag|qedhere)\b/g, '')
    .replace(/\\(abs|norm|set|floor|ceil)\*/g, (_, n) => `\\${n}Star`)
    .replace(/\\(abs|norm|set|floor|ceil)\[\\[a-zA-Z]+\]/g, (_, n) => `\\${n}Star`)
    .replace(/\\bm\b/g, '\\boldsymbol')
    .replace(/\\protect\b/g, '')
    .replace(/(\\text\{[^{}]*)\\textsuperscript\{([^}]*)\}/g, '$1$^{$2}$')
    .replace(/\\bordermatrix\{([\s\S]*?)\}/g, (_, body) => {
      const rows = body.replace(/%[^\n]*\n?/g, '').trim().replace(/\\cr\s*$/, '').split(/\\cr\b/).map((r) => r.trim()).filter(Boolean);
      const cols = Math.max(1, (rows[0]?.split('&').length || 2) - 1);
      return `\\begin{array}{r|${'c'.repeat(cols)}}${rows.join(' \\\\ ')}\\end{array}`;
    })
    .replace(/\\begin\{([pbBvV])smallmatrix\}/g, (_, k) => `\\left${DELIM[k][0]}\\begin{smallmatrix}`)
    .replace(/\\end\{([pbBvV])smallmatrix\}/g, (_, k) => `\\end{smallmatrix}\\right${DELIM[k][1]}`)
    .replace(/\\(eqref|ref|cref|Cref|autoref)\{([^}]*)\}/g, (_, c, l) => `\\text{@@REF:${c}:${l}@@}`);
  // named colours from \definecolor
  t = t.replace(/\\(color|textcolor)\{([a-zA-Z]+)\}/g, (all, c, name) => (B.P.colors[name] ? `\\${c}{${B.P.colors[name]}}` : all));
  // xcolor mixes like blue!50!black: keep the base colour
  t = t.replace(/\\(color|textcolor)\{([a-zA-Z]+)![^}]*\}/g, (_, c, name) => `\\${c}{${B.P.colors[name] || name}}`);
  return t.trim();
}

function checkMath(src, display) {
  try {
    katex.renderToString(src.replace(/@@REF:[^@]*@@/g, '0'), { displayMode: display, macros: { ...B.macros }, throwOnError: true, strict: 'ignore', trust: false });
  } catch (e) {
    warn(`KaTeX: ${String(e.message).split('\n')[0].slice(0, 160)} :: ${src.slice(0, 90).replace(/\s+/g, ' ')}`);
  }
}

function mathHtml(src, display) {
  const t = prepMath(src);
  checkMath(t, display);
  return display ? `<div class="md">${esc(t)}</div>` : `<span class="m">${esc(t)}</span>`;
}

// ---------------------------------------------------------------- inline text

const WRAP = { emph: 'em', textit: 'em', textsl: 'em', textbf: 'strong', texttt: 'code', underline: 'u', textsc: 'span', textrm: 'span', textsf: 'span', textup: 'span', textnormal: 'span', mbox: 'span', text: 'span', textmd: 'span', hbox: 'span' };
const SIMPLE = {
  '%': '%', '&': '&amp;', '#': '#', '_': '_', '{': '{', '}': '}', '$': '$', ' ': ' ', ',': '&thinsp;', ';': ' ', '!': '', '/': '', '-': '&shy;', '@': '',
  ldots: '…', dots: '…', textendash: '–', textemdash: '—', LaTeX: 'LaTeX', TeX: 'TeX', '\\': '<br>', newline: '<br>', linebreak: ' ',
  S: '§', P: '¶', checkmark: '✓', textbullet: '•', quad: '&emsp;', qquad: '&emsp;&emsp;', enspace: '&ensp;', thinspace: '&thinsp;', textasciitilde: '~', textbackslash: '\\',
  times: '×', copyright: '©', dag: '†', textdegree: '°', ss: 'ß', ae: 'æ', o: 'ø', aa: 'å', i: 'ı', today: '', par: ' ', relax: '', textquotesingle: "'", 
};
const IGNORE_TEXT = new Set(['small', 'footnotesize', 'scriptsize', 'tiny', 'large', 'Large', 'LARGE', 'huge', 'Huge', 'normalsize', 'centering', 'raggedright', 'raggedleft', 'noindent', 'indent', 'hfill', 'vfill', 'protect', 'medskip', 'bigskip', 'smallskip', 'newpage', 'clearpage', 'pagebreak', 'nopagebreak', 'chapterline', 'bfseries', 'itshape', 'em', 'normalfont', 'ttfamily', 'sffamily', 'rmfamily', 'upshape', 'mdseries', 'selectfont', 'break', 'allowbreak', 'nobreak', 'qed', 'hline', 'toprule', 'midrule', 'bottomrule', 'item', 'maketitle', 'tableofcontents', 'frontmatter', 'mainmatter', 'backmatter', 'appendix', 'null', 'leavevmode', 'strut', 'displaystyle', 'sloppy', 'qedhere']);
const DROP_ARGS = { vspace: 1, hspace: 1, label: 1, addcontentsline: 3, needspace: 1, setlength: 2, addtocontents: 2, phantomsection: 0, markboth: 2, markright: 1, index: 1, rule: 2, color: 1, pagestyle: 1, thispagestyle: 1, setcounter: 2, addtocounter: 2, enlargethispage: 1, vskip: 0, fontsize: 2, addlinespace: 0 };

let footnotes = [];

function textToHtml(s) {
  let out = '';
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (c === '$') {
      const dbl = s[i + 1] === '$';
      const open = dbl ? 2 : 1;
      let j = i + open;
      for (; j < s.length; j++) {
        if (s[j] === '\\') { j++; continue; }
        if (s[j] === '$') break;
      }
      if (j >= s.length) { warn(`unclosed $ near: ${s.slice(i, i + 60)}`); out += esc(s.slice(i)); break; }
      out += mathHtml(s.slice(i + open, j), dbl);
      i = j + open;
      continue;
    }
    if (c === '\\') {
      if (s.startsWith('\\(', i)) {
        const end = s.indexOf('\\)', i);
        out += mathHtml(s.slice(i + 2, end), false);
        i = end + 2;
        continue;
      }
      if (s.startsWith('\\[', i)) {
        const end = s.indexOf('\\]', i);
        out += mathHtml(s.slice(i + 2, end), true);
        i = end + 2;
        continue;
      }
      const m = /^\\([a-zA-Z]+\*?|.)/.exec(s.slice(i));
      if (!m) { i++; continue; }
      let name = m[1];
      let j = i + m[0].length;
      const bare = name.replace(/\*$/, '');
      // accents
      const accent = { "'": '\u0301', '`': '\u0300', '"': '\u0308', '^': '\u0302', '~': '\u0303', c: '\u0327', v: '\u030C', u: '\u0306', '=': '\u0304', '.': '\u0307', H: '\u030B' }[name];
      if (accent && (s[j] === '{' || /[a-zA-Z]/.test(s[j]))) {
        let ch;
        if (s[j] === '{') { const [g, e] = group(s, j); ch = g.replace(/\\/g, ''); j = e; } else { ch = s[j]; j++; }
        out += esc(ch).normalize('NFD') + accent;
        out = out.normalize('NFC');
        i = j;
        continue;
      }
      if (WRAP[bare] && s[skipWs(s, j)] === '{') {
        const [inner, end] = group(s, skipWs(s, j));
        out += `<${WRAP[bare]}>${textToHtml(inner)}</${WRAP[bare]}>`;
        i = end;
        continue;
      }
      if (bare === 'textcolor') {
        const [[, inner], e] = args(s, j, 2);
        out += textToHtml(inner);
        i = e;
        continue;
      }
      if (bare === 'texorpdfstring') {
        const [[a], e] = args(s, j, 2);
        out += textToHtml(a);
        i = e;
        continue;
      }
      if (bare === 'textsuperscript' || bare === 'textsubscript') {
        const [[a], e] = args(s, j, 1);
        const tg = bare === 'textsuperscript' ? 'sup' : 'sub';
        out += `<${tg}>${textToHtml(a)}</${tg}>`;
        i = e;
        continue;
      }
      if (bare === 'href') {
        const [[url, lab], e] = args(s, j, 2);
        out += `<a href="${escAttr(url)}" rel="noopener">${textToHtml(lab)}</a>`;
        i = e;
        continue;
      }
      if (bare === 'url' || bare === 'nolinkurl') {
        const [[url], e] = args(s, j, 1);
        out += `<a href="${escAttr(url)}" rel="noopener">${esc(url)}</a>`;
        i = e;
        continue;
      }
      if (bare === 'footnote') {
        const [[t], e] = args(s, j, 1);
        footnotes.push(textToHtml(t));
        out += `<sup class="fnref">${footnotes.length}</sup>`;
        i = e;
        continue;
      }
      if (['ref', 'eqref', 'cref', 'Cref', 'autoref', 'pageref', 'nameref'].includes(bare)) {
        const [[l], e] = args(s, j, 1);
        out += `@@REF:${bare}:${l}@@`;
        i = e;
        continue;
      }
      if (bare === 'cite') {
        const [, e1] = optArg(s, j);
        const [[l], e] = args(s, e1, 1);
        out += `[${esc(l)}]`;
        i = e;
        continue;
      }
      if (bare === 'verb') {
        const d = s[j];
        const end = s.indexOf(d, j + 1);
        out += `<code>${esc(s.slice(j + 1, end))}</code>`;
        i = end + 1;
        continue;
      }
      if (bare === 'newcommand' || bare === 'renewcommand' || bare === 'providecommand' || bare === 'def') {
        let e = j;
        let nm;
        if (bare === 'def') { const mm = /^\\[a-zA-Z]+/.exec(s.slice(e)); nm = mm ? mm[0] : ''; e += nm.length; const p = s.indexOf('{', e); e = p; }
        else { e = skipWs(s, e); if (s[e] === '{') { const [g, ee] = group(s, e); nm = g.trim(); e = ee; } else { const mm = /^\\[a-zA-Z]+/.exec(s.slice(e)); nm = mm[0]; e += nm.length; } }
        const [na, e1] = optArg(s, e);
        e = skipWs(s, e1);
        const [body, e2] = group(s, e);
        if (nm && nm !== '\\arraystretch') { B.macros[nm] = body; B.P.textMacros[nm] = { n: na ? +na : 0, body }; }
        if (nm && nm !== '\\arraystretch') B.bodyDefs[nm] = `\\providecommand{${nm}}${na ? `[${na}]` : ''}{${body}}`;
        i = e2;
        continue;
      }
      if (bare in DROP_ARGS) {
        let e = j;
        if (s[e] === '*') e++;
        [, e] = optArg(s, e);
        [, e] = args(s, e, DROP_ARGS[bare]);
        i = e;
        continue;
      }
      if (bare === 'includegraphics') {
        const [, e1] = optArg(s, j);
        const [[f], e] = args(s, e1, 1);
        warn(`includegraphics ${f} not supported`);
        i = e;
        continue;
      }
      if (name in SIMPLE) {
        out += SIMPLE[name];
        i = j;
        if (/^[a-zA-Z]+$/.test(name)) {
          if (s[i] === '{' && s[i + 1] === '}') i += 2;
          else if (s[i] === ' ' && name !== ' ') i += 0;
        }
        continue;
      }
      if (IGNORE_TEXT.has(bare)) {
        i = j;
        if (s[i] === '{' && s[i + 1] === '}') i += 2;
        continue;
      }
      const um = B.P.textMacros['\\' + bare];
      if (um) {
        const [a, e] = args(s, j, um.n);
        let body = um.body;
        a.forEach((v, k) => (body = body.split('#' + (k + 1)).join(v)));
        // a maths-only macro used in text: render as maths
        out += /\\(mathbb|mathbf|mathcal|operatorname|varepsilon|mathrm|frac|mathsf)/.test(body) || /^[\^_]/.test(body) ? mathHtml('\\' + bare + a.map((v) => `{${v}}`).join(''), false) : textToHtml(body);
        i = e;
        continue;
      }
      warn(`unknown command \\${name}`);
      i = j;
      continue;
    }
    if (s.startsWith('---', i)) { out += '—'; i += 3; continue; }
    if (s.startsWith('--', i)) { out += '–'; i += 2; continue; }
    if (s.startsWith('``', i)) { out += '“'; i += 2; continue; }
    if (s.startsWith("''", i)) { out += '”'; i += 2; continue; }
    if (s.startsWith('?`', i)) { out += '¿'; i += 2; continue; }
    if (c === '`') { out += '‘'; i++; continue; }
    if (c === "'") { out += '’'; i++; continue; }
    if (c === '~') { out += '&nbsp;'; i++; continue; }
    if (c === '{' || c === '}') { i++; continue; }
    if (c === '&') { out += ' '; i++; continue; }
    out += esc(c);
    i++;
  }
  return out.replace(/\s+/g, ' ').trim();
}

// ---------------------------------------------------------------- blocks

const MATH_ENVS = /^(equation|align|alignat|gather|multline|flalign|eqnarray|displaymath|math)\*?$/;
const LIST_ENVS = new Set(['itemize', 'enumerate', 'description', 'compactitem', 'compactenum']);
const PASS_ENVS = new Set(['center', 'flushleft', 'flushright', 'minipage', 'multicols', 'samepage', 'small', 'footnotesize', 'adjustwidth', 'raggedright', 'tcolorbox', 'subfigure']);

function parseBlocks(body, level) {
  const blocks = [];
  let para = [];
  const flush = () => {
    const t = para.join('\n').trim();
    para = [];
    if (!t) return;
    footnotes = [];
    const html = textToHtml(t);
    if (html) blocks.push({ t: 'p', html });
    for (const [k, f] of footnotes.entries()) blocks.push({ t: 'footnote', html: `<sup>${k + 1}</sup> ${f}` });
    footnotes = [];
  };
  let s = body;
  const headRe = level.headings; // [{cmd, tag}]
  while (s.length) {
    // Inside an inline $...$ that spans lines: take the next line verbatim.
    if (dollarParity(para.join('\n'))) {
      const nl0 = s.indexOf('\n');
      para.push(nl0 < 0 ? s : s.slice(0, nl0));
      s = nl0 < 0 ? '' : s.slice(nl0 + 1);
      continue;
    }
    const blank = /^[ \t]*\r?\n[ \t]*\r?\n/.exec(s);
    if (blank) { flush(); s = s.slice(blank[0].length); continue; }

    const head = /^\s*\\(section|subsection|subsubsection|paragraph|subparagraph)(\*?)\s*(\[[^\]]*\])?\s*\{/.exec(s);
    if (head) {
      flush();
      const [title, end] = group(s, head[0].length - 1);
      let rest = s.slice(end);
      const lab = /^\s*\\label\{([^}]*)\}/.exec(rest);
      if (lab) rest = rest.slice(lab[0].length);
      const lvl = headRe[head[1]] ?? 4;
      blocks.push({ t: 'h', level: lvl, cmd: head[1], star: !!head[2], text: title, html: textToHtml(title), label: lab ? lab[1] : null });
      s = rest;
      continue;
    }
    if (s.startsWith('\\[')) {
      flush();
      const end = s.indexOf('\\]');
      blocks.push({ t: 'math', src: s.slice(2, end) });
      s = s.slice(end + 2);
      continue;
    }
    if (s.startsWith('$$')) {
      flush();
      const end = s.indexOf('$$', 2);
      blocks.push({ t: 'math', src: s.slice(2, end) });
      s = s.slice(end + 2);
      continue;
    }
    const begin = /^\\begin\{([a-zA-Z*]+)\}/.exec(s);
    if (begin) {
      flush();
      const name = begin[1];
      const end = findEnd(s, name, begin[0].length);
      if (end < 0) { warn(`unclosed environment ${name}`); s = s.slice(begin[0].length); continue; }
      const inner = s.slice(begin[0].length, end);
      s = s.slice(end + `\\end{${name}}`.length);
      const b = parseEnv(name, inner, level);
      if (Array.isArray(b)) blocks.push(...b);
      else if (b) blocks.push(b);
      continue;
    }
    const nl = s.indexOf('\n');
    let line = nl < 0 ? s : s.slice(0, nl);
    s = nl < 0 ? '' : s.slice(nl + 1);
    const mid = blockStart(line);
    if (mid > 0) {
      para.push(line.slice(0, mid));
      s = line.slice(mid) + '\n' + s;
      continue;
    }
    if (mid === 0 && !/^\s*$/.test(line)) {
      // starts with a block construct that the checks above did not catch (leading spaces)
      s = line.trimStart() + '\n' + s;
      if (line.trimStart() === line) { para.push(line); s = s.slice(line.length + 1); }
      continue;
    }
    para.push(line);
  }
  flush();
  return blocks;
}

// Count unescaped single $ (a $$ pair counts twice, so parity is unchanged).
function dollarParity(t) {
  let n = 0;
  for (let i = 0; i < t.length; i++) {
    if (t[i] === '\\') { i++; continue; }
    if (t[i] === '$') n++;
  }
  return n % 2;
}
// Index of a block construct (display maths, environment, heading) on a line,
// ignoring anything inside inline $...$. -1 if none.
function blockStart(line) {
  let inMath = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '$') {
      if (line[i + 1] === '$') { if (!inMath) return i; i++; continue; }
      inMath = !inMath;
      continue;
    }
    if (c !== '\\') continue;
    if (!inMath && (line.startsWith('\\[', i) || line.startsWith('\\begin{', i) || /^\\(sub)*section\*?\{/.test(line.slice(i)))) {
      // \begin of a maths-only environment inside text maths is handled by KaTeX
      return i;
    }
    i++;
  }
  return -1;
}

function captionOf(inner) {
  const m = /\\caption(\[[^\]]*\])?\{/.exec(inner);
  if (!m) return [null, inner];
  const [cap, end] = group(inner, m.index + m[0].length - 1);
  return [cap, inner.slice(0, m.index) + inner.slice(end)];
}
function labelOf(inner) {
  const m = /\\label\{([^}]*)\}/.exec(inner);
  return m ? [m[1], inner.replace(m[0], '')] : [null, inner];
}

function tikzBlock(code) {
  // macros defined in the chapter body that this picture uses
  const defs = Object.entries(B.bodyDefs).filter(([nm]) => code.includes(nm)).map(([, d]) => d);
  if (defs.length) code = defs.join('\n') + '\n' + code;
  const hash = createHash('sha1').update(B.tikzPreamble).update('\0').update(code).digest('hex').slice(0, 14);
  tikzJobs[`${B.cfg.id}/${hash}`] = { book: B.cfg.id, hash, code, preamble: B.tikzPreamble, where };
  return { t: 'tikz', key: `${B.cfg.id}/${hash}` };
}

function parseEnv(name, inner, level) {
  const bare = name.replace(/\*$/, '');
  if (LIST_ENVS.has(bare)) {
    const [, e0] = optArg(inner, 0);
    inner = inner.slice(e0);
    const parts = splitTopLevel(inner, '\\item').slice(1);
    const items = parts.map((it) => {
      const [term, e] = optArg(it, 0);
      const blocks = parseBlocks(it.slice(e), level);
      return { term: term !== null ? textToHtml(term) : null, blocks };
    });
    return { t: 'list', kind: bare === 'enumerate' || bare === 'compactenum' ? 'ol' : bare === 'description' ? 'dl' : 'ul', items };
  }
  if (bare === 'quote' || bare === 'quotation' || bare === 'verse') return { t: 'quote', blocks: parseBlocks(inner, level) };
  if (bare === 'verbatim' || bare === 'lstlisting' || bare === 'Verbatim' || bare === 'minted') {
    inner = inner.replace(/^\[[^\]]*\]/, '').replace(/^\{[^}]*\}/, '');
    return { t: 'pre', text: inner.replace(/^\r?\n/, '').replace(/\s+$/, '') };
  }
  if (bare === 'tikzpicture') {
    const b = tikzBlock(`\\begin{tikzpicture}${inner}\\end{tikzpicture}`);
    return b;
  }
  if (bare === 'figure' || bare === 'figure*' || bare === 'wrapfigure' || bare === 'marginfigure') {
    let [cap, rest] = captionOf(inner);
    let [lab, rest2] = labelOf(rest);
    rest2 = rest2.replace(/^\s*\[[^\]]*\]/, '');
    const pics = [];
    const re = /\\begin\{tikzpicture\}/g;
    let m;
    const hasTikz = /\\begin\{tikzpicture\}/.test(rest2);
    if (hasTikz) {
      // Keep everything except the caption/label; standalone puts each picture on a page.
      const code = rest2.replace(/\\centering/g, '');
      pics.push(tikzBlock(code));
    } else {
      // e.g. a table or text inside a figure float
      const blocks = parseBlocks(rest2, level);
      pics.push(...blocks);
      void m; void re;
    }
    B.figN++;
    const num = `${B.chapNum}.${B.figN}`;
    if (lab) B.labels[lab] = { text: `Figure ${B.cfg.unit === 'section' ? B.figN : num}`, anchor: `fig-${B.figN}` };
    return { t: 'figure', items: pics, caption: cap ? textToHtml(cap) : null, number: B.cfg.unit === 'section' ? `${B.figN}` : num, anchor: `fig-${B.figN}` };
  }
  if (bare === 'table') {
    let [cap, rest] = captionOf(inner);
    let [lab, rest2] = labelOf(rest);
    rest2 = rest2.replace(/^\s*\[[^\]]*\]/, '');
    B.tabN = (B.tabN || 0) + 1;
    const num = B.cfg.unit === 'section' ? `${B.tabN}` : `${B.chapNum}.${B.tabN}`;
    if (lab) B.labels[lab] = { text: `Table ${num}`, anchor: `tab-${B.tabN}` };
    return { t: 'tablefloat', blocks: parseBlocks(rest2, level), caption: cap ? textToHtml(cap) : null, number: num, anchor: `tab-${B.tabN}` };
  }
  if (bare === 'tabular' || bare === 'longtable' || bare === 'tabularx' || bare === 'array') {
    let body = inner;
    if (bare === 'tabularx') body = body.replace(/^\s*\{[^}]*\}/, '');
    body = body.replace(/^\s*\[[^\]]*\]/, '');
    // column spec
    body = body.trimStart();
    if (body[0] === '{') body = body.slice(group(body, 0)[1]);
    body = body.replace(/\\(toprule|midrule|bottomrule|hline|endhead|endfirsthead|endfoot|endlastfoot)\b/g, '').replace(/\\cmidrule(\([^)]*\))?\{[^}]*\}/g, '').replace(/\\cline\{[^}]*\}/g, '');
    const rows = splitTopLevel(body, '\\\\').map((r) => r.replace(/^\s*\[[^\]]*\]/, '').trim()).filter((r) => r.length);
    const cells = rows.map((r) => splitCells(r).map((c) => textToHtml(c.replace(/\\multicolumn\{\d+\}\{[^}]*\}/g, '').trim())));
    return { t: 'table', head: cells[0] ?? [], rows: cells.slice(1) };
  }
  if (MATH_ENVS.test(name)) {
    const star = name.endsWith('*') || bare === 'displaymath' || bare === 'math';
    return mathEnv(bare, inner, star);
  }
  if (PASS_ENVS.has(bare)) {
    let body = inner;
    if (bare === 'minipage' || bare === 'multicols' || bare === 'adjustwidth') {
      body = body.replace(/^\s*\[[^\]]*\]/, '');
      body = body.trimStart();
      if (body[0] === '{') body = body.slice(group(body, 0)[1]);
      if (bare === 'adjustwidth' && body.trimStart()[0] === '{') body = body.trimStart().slice(group(body.trimStart(), 0)[1]);
    }
    return parseBlocks(body, level);
  }
  const theorem = B.P.theorems[bare];
  const box = B.P.boxes[bare];
  if (theorem || box || bare === 'proof') {
    let [title, e] = optArg(inner, 0);
    inner = inner.slice(e);
    const [lab, rest] = labelOf(inner);
    let label, number = null, anchor;
    if (theorem) {
      const counter = theorem.shared || bare;
      B.counters[counter] = (B.counters[counter] || 0) + 1;
      if (B.cfg.unit === 'section') {
        B.global[counter] = (B.global[counter] || 0) + 1;
        number = String(B.global[counter]);
      } else number = `${B.chapNum}.${B.counters[counter]}`;
      label = `${theorem.label} ${number}`;
      anchor = `${bare}-${number.replace(/\./g, '-')}`;
      if (lab) B.labels[lab] = { text: `${theorem.label} ${number}`, anchor };
    } else {
      label = bare === 'proof' ? 'Proof' : box;
      if (lab) B.labels[lab] = { text: label, anchor: lab.replace(/[^a-zA-Z0-9-]/g, '-') };
      anchor = lab ? lab.replace(/[^a-zA-Z0-9-]/g, '-') : null;
    }
    return { t: 'env', kind: bare, isTheorem: !!theorem, title, label, number, anchor, blocks: parseBlocks(rest, level), collapsed: COLLAPSED.has(bare) };
  }
  if (bare === 'abstract') return parseBlocks(inner, level);
  warn(`unknown environment ${name}`);
  return { t: 'quote', blocks: parseBlocks(inner, level) };
}

function mathEnv(bare, inner, star) {
  const labels = [...inner.matchAll(/\\label\{([^}]*)\}/g)].map((m) => m[1]);
  let src;
  const env = bare === 'eqnarray' ? 'align' : bare;
  if (env === 'equation' || env === 'displaymath' || env === 'math') {
    src = inner;
    if (!star && !/\\(nonumber|notag)/.test(inner)) {
      const n = nextEq();
      src = `${inner}\\tag{${n}}`;
      for (const l of labels) B.labels[l] = { text: `(${n})`, anchor: `eq-${n.replace(/\./g, '-')}`, eq: true };
    }
    // equation may contain split/aligned already
  } else {
    // align-like: number each line unless starred or \nonumber
    let lines = splitTopLevel(inner, '\\\\');
    if (!star) {
      lines = lines.map((ln, k) => {
        if (!ln.trim() && k === lines.length - 1) return ln;
        if (/\\(nonumber|notag)/.test(ln)) return ln;
        const n = nextEq();
        const lab = /\\label\{([^}]*)\}/.exec(ln);
        if (lab) B.labels[lab[1]] = { text: `(${n})`, anchor: `eq-${n.replace(/\./g, '-')}`, eq: true };
        return `${ln}\\tag{${n}}`;
      });
    }
    let e = env === 'alignat' ? 'alignat' : env === 'flalign' ? 'align' : env;
    let body = lines.join('\\\\');
    if (env === 'alignat') body = body.replace(/^\s*\{[^}]*\}/, (m) => m);
    src = `\\begin{${e}*}${body}\\end{${e}*}`;
    if (e === 'multline') src = `\\begin{gather*}${body}\\end{gather*}`;
  }
  return { t: 'math', src };
}

function nextEq() {
  B.eqN = (B.eqN || 0) + 1;
  return B.cfg.unit === 'section' ? `${B.eqN}` : `${B.chapNum}.${B.eqN}`;
}

function splitTopLevel(s, token) {
  const parts = [];
  let depth = 0, brace = 0, last = 0;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '\\' && s.startsWith('\\begin{', i)) { depth++; continue; }
    if (s[i] === '\\' && s.startsWith('\\end{', i)) { depth--; continue; }
    if (s[i] === '\\' && !s.startsWith(token, i)) { i++; continue; }
    if (s[i] === '{') brace++;
    else if (s[i] === '}') brace--;
    else if (depth === 0 && brace === 0 && s.startsWith(token, i) && !/[a-zA-Z]/.test(token.slice(-1) === '\\' ? '' : s[i + token.length] || '')) {
      parts.push(s.slice(last, i));
      last = i + token.length;
      i += token.length - 1;
    }
  }
  parts.push(s.slice(last));
  return parts;
}
function splitCells(r) {
  const out = [];
  let brace = 0, last = 0, inMath = false;
  for (let i = 0; i < r.length; i++) {
    if (r[i] === '\\') { i++; continue; }
    if (r[i] === '$') inMath = !inMath;
    if (r[i] === '{') brace++;
    else if (r[i] === '}') brace--;
    else if (r[i] === '&' && brace === 0 && !inMath) { out.push(r.slice(last, i)); last = i + 1; }
  }
  out.push(r.slice(last));
  return out;
}

// ---------------------------------------------------------------- render

function render(b) {
  switch (b.t) {
    case 'p': return `<p>${b.html}</p>`;
    case 'footnote': return `<p class="footnote">${b.html}</p>`;
    case 'h': {
      const tag = `h${Math.min(4, b.level)}`;
      const id = b.id ? ` id="${b.id}"` : '';
      return `<${tag}${id}>${b.number ? `<span class="secnum">${b.number}</span> ` : ''}${b.html}</${tag}>`;
    }
    case 'math': return mathHtml(b.src, true);
    case 'pre': return `<pre><code>${esc(b.text)}</code></pre>`;
    case 'quote': return `<blockquote>${b.blocks.map(render).join('')}</blockquote>`;
    case 'list': {
      if (b.kind === 'dl') return `<dl>${b.items.map((it) => `<dt>${it.term ?? ''}</dt><dd>${it.blocks.map(render).join('')}</dd>`).join('')}</dl>`;
      return `<${b.kind}>${b.items
        .map((it) => `<li>${it.term !== null ? `<strong>${it.term}</strong> ` : ''}${it.blocks.map(render).join('')}</li>`)
        .join('')}</${b.kind}>`;
    }
    case 'table':
      return `<div class="table"><table>${b.head.length ? `<thead><tr>${b.head.map((h) => `<th>${h}</th>`).join('')}</tr></thead>` : ''}<tbody>${b.rows
        .map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`)
        .join('')}</tbody></table></div>`;
    case 'tablefloat':
      return `<div class="tablefloat" id="${b.anchor}">${b.caption ? `<p class="caption"><span class="caption-num">Table ${b.number}.</span> ${b.caption}</p>` : ''}${b.blocks.map(render).join('')}</div>`;
    case 'tikz': return tikzHtml(b.key);
    case 'figure':
      return `<figure class="bookfig" id="${b.anchor}">${b.items.map(render).join('')}${
        b.caption ? `<figcaption><span class="caption-num">Figure ${b.number}.</span> ${b.caption}</figcaption>` : ''
      }</figure>`;
    case 'env': {
      let label = b.label;
      if (b.title) label += ` (${textToHtml(b.title)})`;
      const inner = b.blocks.map(render).join('');
      const end = b.kind === 'proof' ? '<span class="qed" aria-label="End of proof">∎</span>' : '';
      const id = b.anchor ? ` id="${b.anchor}"` : '';
      const cls = `env env-${b.kind}${b.isTheorem ? ' thm' : ''}`;
      if (b.collapsed) return `<details class="${cls}"${id}><summary class="env-label">${label}</summary>${inner}</details>`;
      return `<section class="${cls}"${id}><p class="env-label">${label}</p>${inner}${end}</section>`;
    }
  }
  throw new Error(`unknown block ${b.t}`);
}

function tikzHtml(key) {
  const m = manifest[key];
  if (!m || !m.pages?.length) {
    warn(`figure not rendered yet: ${key}`);
    return `<div class="tikz tikz-missing">Figure not rendered yet.</div>`;
  }
  return m.pages
    .map((p) => `<img class="tikz" src="figures/${p.file}" width="${p.w}" height="${p.h}" alt="" loading="lazy" decoding="async">`)
    .join('');
}

// ---------------------------------------------------------------- book → chapters

function splitBook(cfg) {
  const mainText = readFileSync(join(REPO, cfg.main), 'utf8');
  let body = mainText.slice(mainText.indexOf('\\begin{document}') + 16, mainText.indexOf('\\end{document}'));
  body = stripComments(expandInputs(stripComments(body), cfg.root));
  body = body.replace(/\\(maketitle|tableofcontents|listoffigures|listoftables)\b/g, '');

  const chapters = [];
  const parts = [];
  let preface = null;
  if (cfg.unit === 'section') {
    const pieces = body.split(/^\\section(\*?)(?:\[[^\]]*\])?\{/m);
    let n = 0;
    for (let p = 1; p < pieces.length; p += 2) {
      const [title, end] = group('{' + pieces[p + 1], 0);
      const content = pieces[p + 1].slice(end - 1);
      if (pieces[p] === '*') { preface = { title, content }; continue; }
      n++;
      chapters.push({ key: String(n), num: n, label: String(n), title, content, part: null });
    }
    return { chapters, parts, preface };
  }
  // chapter books: walk \part, \chapter, \appendix, \frontmatter, \mainmatter
  const re = /\\(part|chapter)(\*?)\s*(\[[^\]]*\])?\s*\{|\\(appendix|frontmatter|mainmatter|backmatter)\b/g;
  let m, mode = 'main', chapN = 0, appN = 0, last = null, curPart = null;
  const marks = [];
  while ((m = re.exec(body))) {
    if (m[4]) { marks.push({ kind: m[4], at: m.index, end: m.index + m[0].length }); continue; }
    const [title, end] = group(body, m.index + m[0].length - 1);
    marks.push({ kind: m[1], star: !!m[2], title, at: m.index, end });
  }
  for (let k = 0; k < marks.length; k++) {
    const mk = marks[k];
    const next = marks[k + 1]?.at ?? body.length;
    if (mk.kind === 'frontmatter') { mode = 'front'; continue; }
    if (mk.kind === 'mainmatter') { mode = 'main'; continue; }
    if (mk.kind === 'backmatter') { mode = 'back'; continue; }
    if (mk.kind === 'appendix') { mode = 'appendix'; curPart = { title: 'Appendices', chapters: [] }; parts.push(curPart); continue; }
    if (mk.kind === 'part') { curPart = { title: mk.title, chapters: [] }; parts.push(curPart); continue; }
    const content = body.slice(mk.end, next);
    if (mode === 'front' || mk.star) {
      if (!preface) preface = { title: mk.title, content };
      else preface.content += `\n\n\\section*{${mk.title}}\n` + content;
      continue;
    }
    let label, key;
    if (mode === 'appendix') { appN++; label = String.fromCharCode(64 + appN); key = label; }
    else { chapN++; label = String(chapN); key = label; }
    last = { key, num: chapters.length + 1, label, title: mk.title, content, part: curPart ? parts.indexOf(curPart) : null };
    chapters.push(last);
    curPart?.chapters.push(key);
  }
  return { chapters, parts, preface };
}

function buildChapter(ch, headings) {
  B.chapNum = ch.label;
  B.counters = {};
  B.figN = 0;
  B.tabN = 0;
  B.eqN = 0;
  where = `${B.cfg.id} ch ${ch.label}`;
  const blocks = parseBlocks(ch.content, { headings });
  // number headings and assign ids/refs
  const out = [];
  let section = '';
  let k = 0;
  let secN = 0, subN = 0;
  const used = new Set();
  for (const b of blocks) {
    const refs = [];
    if (b.t === 'h') {
      if (B.cfg.unit === 'chapter' && !b.star) {
        if (b.cmd === 'section') { secN++; subN = 0; b.number = `${ch.label}.${secN}`; }
        else if (b.cmd === 'subsection') { subN++; b.number = `${ch.label}.${secN}.${subN}`; }
      }
      let id = slug(b.text);
      while (used.has(id)) id += '-x';
      used.add(id);
      b.id = id;
      section = id;
      k = 0;
      refs.push(section);
      if (b.label) B.labels[b.label] = { text: b.number ? `Section ${b.number}` : b.text, anchor: id };
    } else refs.push(`${section || 'intro'}/${++k}`);
    if (b.t === 'env') {
      B.localCounts[b.kind] = (B.localCounts[b.kind] || 0) + 1;
      refs.push(`${b.kind}-${B.localCounts[b.kind]}`);
    }
    out.push({ refs, section, html: render(b) });
  }
  // label → chapter for cross refs
  return out;
}

// ---------------------------------------------------------------- main

if (!onlyBook) rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const library = [];
const allWarnings = {};
for (const cfg of BOOKS) {
  if (onlyBook && cfg.id !== onlyBook) continue;
  warnings = [];
  where = cfg.id;
  B = newBookCtx(cfg);
  B.global = {};
  const { chapters, parts, preface } = splitBook(cfg);
  const headings = cfg.unit === 'section' ? { subsection: 2, subsubsection: 3, paragraph: 4, section: 2 } : { section: 2, subsection: 3, subsubsection: 4, paragraph: 4 };
  const dir = join(OUT, cfg.id);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const built = [];
  for (const ch of chapters) {
    B.localCounts = {};
    const before = new Set(Object.keys(B.labels));
    const blocks = buildChapter(ch, headings);
    for (const l of Object.keys(B.labels)) if (!before.has(l)) B.labels[l].chapter = ch.key;
    built.push({ ch, blocks });
  }
  let prefaceBlocks = null;
  if (preface) {
    B.localCounts = {};
    prefaceBlocks = buildChapter({ label: '0', content: preface.content, key: 'preface' }, headings);
  }
  // resolve cross references
  const resolve = (html) =>
    html.replace(/@@REF:([a-zA-Z]+):([^@]*)@@/g, (_, cmd, l) => {
      const t = B.labels[l];
      if (!t) { warn(`undefined reference ${l}`); return '??'; }
      let text = t.text;
      if (cmd === 'ref' || cmd === 'eqref') text = t.eq ? (cmd === 'eqref' ? t.text : t.text.replace(/[()]/g, '')) : t.text.replace(/^[A-Z][a-z]+ /, '');
      if (cmd === 'pageref') text = t.text;
      return `<a class="xref" href="#/${cfg.id}/${t.chapter}#${t.anchor}">${text}</a>`;
    });
  const resolveMath = (html) =>
    html.replace(/\\text\{@@REF:([a-zA-Z]+):([^@]*)@@\}/g, (_, cmd, l) => {
      const t = B.labels[l];
      if (!t) return '\\text{??}';
      let text = t.eq ? (cmd === 'eqref' ? t.text : t.text.replace(/[()]/g, '')) : t.text.replace(/^[A-Z][a-z]+ /, '');
      return `\\text{${text}}`;
    });
  const fix = (h) => resolve(resolveMath(h));
  for (const { ch, blocks } of built) {
    for (const b of blocks) b.html = fix(b.html);
    where = `${cfg.id} ch ${ch.label}`;
    writeFileSync(join(dir, `${ch.key}.json`), JSON.stringify({ book: cfg.id, key: ch.key, label: ch.label, title: ch.title, titleHtml: textToHtml(ch.title), blocks }));
  }
  if (prefaceBlocks) {
    for (const b of prefaceBlocks) b.html = fix(b.html);
    writeFileSync(join(dir, `preface.json`), JSON.stringify({ title: preface.title, blocks: prefaceBlocks }));
  }
  const entry = {
    id: cfg.id,
    title: cfg.title,
    short: cfg.short,
    subtitle: cfg.subtitle,
    hasPreface: !!prefaceBlocks,
    prefaceTitle: preface ? textToHtml(preface.title) : null,
    parts: parts.map((p) => ({ title: p.title, titleHtml: textToHtml(p.title), chapters: p.chapters })),
    chapters: built.map(({ ch }) => ({ key: ch.key, label: ch.label, title: ch.title, titleHtml: textToHtml(ch.title), part: ch.part })),
    macros: B.macros,
  };
  library.push(entry);
  if (cfg.id === 'proofs') {
    const indexData = built.map(({ ch }) => ({
      num: Number(ch.label),
      title: ch.title,
      titleHtml: textToHtml(ch.title),
      slug: String(ch.label),
    }));
    writeFileSync(join(OUT, 'index.json'), JSON.stringify(indexData));
    for (const { ch, blocks } of built) {
      const padNum = String(ch.label).padStart(2, '0');
      writeFileSync(join(OUT, `ch-${padNum}.json`), JSON.stringify({ num: Number(ch.label), title: ch.title, titleHtml: textToHtml(ch.title), blocks }));
    }
    if (prefaceBlocks) {
      writeFileSync(join(OUT, 'preface.json'), JSON.stringify({ title: preface.title, blocks: prefaceBlocks }));
    }
  }
  const uniq = [...new Set(warnings)];
  allWarnings[cfg.id] = uniq;
  const kinds = {};
  for (const w of uniq) {
    const k = w.replace(/^[^:]*: /, '').replace(/ :: .*/, '').replace(/(unknown (command|environment) \S+|figure not rendered yet|undefined reference|KaTeX).*/, '$1');
    kinds[k] = (kinds[k] || 0) + 1;
  }
  console.log(`content: ${cfg.id}: ${chapters.length} chapters, ${Object.keys(B.labels).length} labels, ${uniq.length} warnings`);
  for (const [k, n] of Object.entries(kinds).sort((a, b) => b[1] - a[1]).slice(0, verbose ? 100 : 12)) console.log(`    ${n} × ${k}`);
}

if (!onlyBook) writeFileSync(join(OUT, 'library.json'), JSON.stringify(library));
else {
  const p = join(OUT, 'library.json');
  const lib = existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : [];
  const merged = BOOKS.map((b) => library.find((x) => x.id === b.id) || lib.find((x) => x.id === b.id)).filter(Boolean);
  writeFileSync(p, JSON.stringify(merged));
}
writeFileSync(TIKZ_JOBS, JSON.stringify(tikzJobs));
writeFileSync(join(here, '../.content-warnings.json'), JSON.stringify(allWarnings, null, 1));
