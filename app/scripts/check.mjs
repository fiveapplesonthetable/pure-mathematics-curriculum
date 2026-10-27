// Headless check of chapters: console errors, horizontal overflow at 360px,
// light and dark, reduced motion. Saves screenshots of each figure.
//
//   npm run check -- [--chapter 20] [--out /tmp/shots] [--fig name] [--port 5179] [--build]
//
// Uses the Vite dev server by default (--build checks the production build via
// vite preview). Needs Chrome: set CHROME=/path/to/chrome if not found.

import { createServer, preview, build } from 'vite';
import puppeteer from 'puppeteer-core';
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const args = process.argv.slice(2);
const opt = (name, dflt) => {
  const i = args.indexOf(`--${name}`);
  return i < 0 ? dflt : args[i + 1];
};
// --chapter proofs/20,calculus/6 (a bare number means the proofs book); --all checks every chapter (phone, light + dark only).
const all = args.includes('--all');
let chapters = (opt('chapter', 'proofs/20') + '').split(',').map((c) => (/^\d+$/.test(c) ? `proofs/${c}` : c));
if (all) {
  const lib = JSON.parse((await import('node:fs')).readFileSync(new URL('../src/content/library.json', import.meta.url), 'utf8'));
  chapters = lib.flatMap((b) => b.chapters.map((c) => `${b.id}/${c.key}`));
}
const out = opt('out', null);
const useBuild = args.includes('--build');
const port = Number(opt('port', useBuild ? 4179 : 5179));
const only = opt('fig', null); // screenshot only this figure

const chrome =
  process.env.CHROME ||
  ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(existsSync);
if (!chrome) {
  console.error('No Chrome found; set CHROME=/path/to/chrome');
  process.exit(2);
}

let server, base;
if (useBuild) {
  await build({ logLevel: 'warn' });
  server = await preview({ preview: { port, strictPort: false } });
  base = server.resolvedUrls.local[0];
} else {
  server = await createServer({ server: { port, strictPort: false }, logLevel: 'warn' });
  await server.listen();
  base = server.resolvedUrls.local[0];
}

const browser = await puppeteer.launch({ executablePath: chrome, headless: true, args: ['--no-sandbox'] });
let failures = 0;
if (out) mkdirSync(out, { recursive: true });

const combos = [
  { name: 'phone-light', width: 360, height: 780, scheme: 'light' },
  { name: 'phone-dark', width: 360, height: 780, scheme: 'dark' },
  { name: 'laptop-light', width: 1280, height: 860, scheme: 'light' },
  { name: 'laptop-dark', width: 1280, height: 860, scheme: 'dark', reduced: true },
];

const quick = combos.filter((c) => c.name.startsWith('phone'));
for (const n of chapters) {
  for (const c of all ? quick : combos) {
    const page = await browser.newPage();
    const errors = [];
    page.on('console', (m) => {
      if (m.type() === 'error' || m.type() === 'warning') errors.push(`${m.type()}: ${m.text()}`);
    });
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
    await page.setViewport({ width: c.width, height: c.height, deviceScaleFactor: 2 });
    await page.emulateMediaFeatures([
      { name: 'prefers-color-scheme', value: c.scheme },
      { name: 'prefers-reduced-motion', value: c.reduced ? 'reduce' : 'no-preference' },
    ]);
    await page.goto(`${base}#/${n}`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('article');
    await new Promise((r) => setTimeout(r, 600));
    const t0 = Date.now();
    const info = await page.evaluate(() => ({
      katexErrors: [...document.querySelectorAll('.katex-error')].slice(0, 5).map((e) => (e.getAttribute('title') || '').slice(0, 120)),
      missingFigs: document.querySelectorAll('.tikz-missing').length,
      brokenImgs: [...document.querySelectorAll('img.tikz')].filter((i) => i.complete && i.naturalWidth === 0).length,
      overflow: document.documentElement.scrollWidth - window.innerWidth,
      figures: [...document.querySelectorAll('figure.fig')].map((f) => ({
        name: f.dataset.fig,
        empty: !f.querySelector('.fig-body')?.childElementCount,
        width: f.getBoundingClientRect().width,
      })),
      wide: [...document.querySelectorAll('article *')]
        .filter((e) => e.getBoundingClientRect().right > window.innerWidth + 1 && !e.closest('.display, .table, pre, .fig-formula'))
        .slice(0, 5)
        .map((e) => e.tagName + '.' + e.className),
    }));
    const problems = [...errors];
    if (info.overflow > 0) problems.push(`horizontal overflow ${info.overflow}px: ${info.wide.join(', ')}`);
    for (const f of info.figures) if (f.empty) problems.push(`figure ${f.name} rendered nothing`);
    for (const k of info.katexErrors) problems.push(`KaTeX error: ${k}`);
    if (info.missingFigs) problems.push(`${info.missingFigs} book figure(s) not rendered`);
    void t0;
    console.log(`ch ${n} ${c.name}: ${info.figures.length} figures, ${problems.length ? problems.length + ' problem(s)' : 'ok'}`);
    for (const p of problems) console.log('   ' + p);
    failures += problems.length;
    if (out) {
      await page.screenshot({ path: join(out, `${n.replace('/', '-')}-${c.name}-top.png`) });
      const figs = await page.$$('figure.fig');
      for (const [i, el] of figs.entries()) {
        const name = await el.evaluate((f) => f.dataset.fig);
        if (only && name !== only) continue;
        await el.scrollIntoView();
        await el.screenshot({ path: join(out, `${n.replace('/', '-')}-${c.name}-${String(i + 1).padStart(2, '0')}-${name}.png`) });
      }
    }
    await page.close();
  }
}

await browser.close();
await (server.close?.() ?? server.httpServer?.close());
if (failures) {
  console.log(`${failures} problem(s)`);
  process.exit(1);
}
console.log('all checks passed');
process.exit(0);
