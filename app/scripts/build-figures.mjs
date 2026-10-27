// Renders every TikZ/pgfplots picture found by build-content.mjs to SVG.
//
//   node scripts/build-figures.mjs [--book calculus] [--jobs 16] [--force]
//
// Needs pdflatex and pdftocairo (TeX Live, poppler-utils). Output goes to
// public/figures/<book>/<hash>-<page>.svg plus public/figures/manifest.json,
// and is committed, so the site build (and CI) does not need TeX. Pictures are
// keyed by a hash of their code and the book preamble: unchanged pictures are
// skipped on the next run.

import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { cpus, tmpdir } from 'node:os';

const run = promisify(execFile);
const here = dirname(fileURLToPath(import.meta.url));
const PUB = join(here, '../public/figures');
const MANIFEST = join(PUB, 'manifest.json');
const jobsAll = JSON.parse(readFileSync(join(here, '../.figures-jobs.json'), 'utf8'));
const argv = process.argv.slice(2);
const opt = (n, d) => (argv.includes(`--${n}`) ? argv[argv.indexOf(`--${n}`) + 1] : d);
const onlyBook = opt('book', null);
const parallel = +opt('jobs', Math.max(2, cpus().length - 2));
const force = argv.includes('--force');

const manifest = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, 'utf8')) : {};
const work = Object.entries(jobsAll).filter(([k, j]) => (!onlyBook || j.book === onlyBook) && (force || !manifest[k]?.pages?.length));
console.log(`figures: ${Object.keys(jobsAll).length} pictures known, ${work.length} to render`);

const TMP = join(tmpdir(), `pfg-figures-${process.pid}`);
mkdirSync(TMP, { recursive: true });

// Each \begin{tikzpicture} at nesting depth 0 becomes one page in standalone.
function topLevelPictures(code) {
  let depth = 0, n = 0;
  const re = /\\(begin|end)\{tikzpicture\}/g;
  let m;
  while ((m = re.exec(code))) {
    if (m[1] === 'begin') { if (depth === 0) n++; depth++; } else depth--;
  }
  return n;
}

// Top-level tikzpicture environments, with any \def/\pgfmathsetmacro before them.
function extractPictures(code) {
  const out = [];
  let depth = 0, start = -1;
  const re = /\\(begin|end)\{tikzpicture\}/g;
  let m;
  const defs = (code.match(/\\(def|pgfmathsetmacro|newcommand|colorlet)[^\n]*/g) || []).join('\n');
  while ((m = re.exec(code))) {
    if (m[1] === 'begin') { if (depth === 0) start = m.index; depth++; }
    else { depth--; if (depth === 0) out.push(defs + '\n' + code.slice(start, m.index + m[0].length)); }
  }
  return out;
}

function doc(preamble, codes) {
  return `\\documentclass[tikz,border=3pt]{standalone}
${preamble}
\\providecommand{\\chapterline}{}
\\begin{document}
${codes.join('\n')}
\\end{document}
`;
}

async function compile(name, tex) {
  const dir = join(TMP, name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'fig.tex'), tex);
  try {
    await run('pdflatex', ['-interaction=nonstopmode', '-halt-on-error', 'fig.tex'], { cwd: dir, timeout: 180000, maxBuffer: 1 << 26 });
  } catch (e) {
    const log = existsSync(join(dir, 'fig.log')) ? readFileSync(join(dir, 'fig.log'), 'utf8') : String(e);
    const err = (log.match(/^! .*$/m) || ['unknown error'])[0];
    return { ok: false, err, dir };
  }
  const info = await run('pdfinfo', [join(dir, 'fig.pdf')]).catch(() => null);
  const pages = info ? +(/Pages:\s+(\d+)/.exec(info.stdout)?.[1] ?? 0) : 0;
  return { ok: true, pages, dir };
}

async function toSvg(dir, page, outFile) {
  await run('pdftocairo', ['-svg', '-f', String(page), '-l', String(page), join(dir, 'fig.pdf'), outFile]);
  let svg = readFileSync(outFile, 'utf8');
  // pdftocairo sizes are in pt (with or without the unit); CSS px = pt * 4/3.
  const w = parseFloat(/<svg[^>]*\swidth="([\d.]+)/.exec(svg)?.[1] ?? '0');
  const h = parseFloat(/<svg[^>]*\sheight="([\d.]+)/.exec(svg)?.[1] ?? '0');
  // Make glyph/clip ids unique per file (several SVGs may share a page when inlined).
  const tag = 'f' + outFile.split('/').pop().replace(/\.svg$/, '').replace(/[^a-zA-Z0-9]/g, '');
  svg = svg.replace(/id="([^"]+)"/g, `id="${tag}-$1"`).replace(/(xlink:href|href)="#([^"]+)"/g, `$1="#${tag}-$2"`).replace(/url\(#([^)]+)\)/g, `url(#${tag}-$1)`);
  // Two decimals is far below a pixel; this roughly halves the file size.
  svg = svg.replace(/(\d+\.\d\d)\d+/g, '$1').replace(/\n\s*/g, '\n');
  writeFileSync(outFile, svg);
  return { w: Math.round(w * 4 / 3), h: Math.round(h * 4 / 3) };
}

async function renderGroup(book, preamble, items, name) {
  const expected = items.map(([, j]) => topLevelPictures(j.code));
  const res = await compile(name, doc(preamble, items.map(([, j]) => j.code)));
  const total = expected.reduce((a, b) => a + b, 0);
  if (!res.ok || res.pages !== total) {
    if (items.length === 1) {
      const [key, j] = items[0];
      // Text between pictures (minipages, \hfill) makes extra pages: render each picture alone.
      if (res.ok && !j.split) {
        const pics = extractPictures(j.code);
        const one = await compile(name + 's', doc(preamble, pics));
        if (one.ok && one.pages === pics.length) {
          mkdirSync(join(PUB, book), { recursive: true });
          const pages = [];
          for (let p = 0; p < pics.length; p++) {
            const file = `${book}/${j.hash}-${p + 1}.svg`;
            pages.push({ file, ...(await toSvg(one.dir, p + 1, join(PUB, file))) });
          }
          return [[key, { pages }]];
        }
      }
      return [[key, { error: res.ok ? `page count ${res.pages} != ${total}` : res.err, where: j.where }]];
    }
    // split and retry
    const mid = Math.ceil(items.length / 2);
    const a = await renderGroup(book, preamble, items.slice(0, mid), name + 'a');
    const b = await renderGroup(book, preamble, items.slice(mid), name + 'b');
    return [...a, ...b];
  }
  const out = [];
  let page = 1;
  mkdirSync(join(PUB, book), { recursive: true });
  for (let k = 0; k < items.length; k++) {
    const [key, j] = items[k];
    const pages = [];
    for (let p = 0; p < expected[k]; p++) {
      const file = `${book}/${j.hash}-${p + 1}.svg`;
      const size = await toSvg(res.dir, page++, join(PUB, file));
      pages.push({ file, ...size });
    }
    out.push([key, { pages }]);
  }
  rmSync(res.dir, { recursive: true, force: true });
  return out;
}

// Group by book, then chunk.
const byBook = {};
for (const [k, j] of work) (byBook[j.book] ??= []).push([k, j]);
const groups = [];
for (const [book, items] of Object.entries(byBook)) {
  for (let i = 0; i < items.length; i += 12) groups.push({ book, preamble: items[0][1].preamble, items: items.slice(i, i + 12), name: `${book}-${i}` });
}

let done = 0, failed = 0;
const queue = [...groups];
async function worker() {
  while (queue.length) {
    const g = queue.shift();
    const results = await renderGroup(g.book, g.preamble, g.items, g.name);
    for (const [key, r] of results) {
      manifest[key] = r;
      if (r.error) failed++;
      else done++;
    }
    writeFileSync(MANIFEST, JSON.stringify(manifest, null, 0));
    process.stdout.write(`\rfigures: ${done} rendered, ${failed} failed`);
  }
}
await Promise.all(Array.from({ length: parallel }, worker));
console.log('');

// Drop SVGs no longer referenced.
const live = new Set(Object.values(manifest).flatMap((m) => (m.pages || []).map((p) => p.file)));
for (const book of readdirSync(PUB, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name)) {
  for (const f of readdirSync(join(PUB, book))) if (!live.has(`${book}/${f}`) && Object.keys(jobsAll).length) rmSync(join(PUB, book, f));
}
for (const k of Object.keys(manifest)) if (!jobsAll[k]) delete manifest[k];
writeFileSync(MANIFEST, JSON.stringify(manifest, null, 0));
const errs = Object.entries(manifest).filter(([, m]) => m.error);
if (errs.length) {
  console.log(`figures: ${errs.length} failed:`);
  for (const [k, m] of errs.slice(0, 40)) console.log(`  ${k} (${m.where}): ${m.error}`);
}
rmSync(TMP, { recursive: true, force: true });
