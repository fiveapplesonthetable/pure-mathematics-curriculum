// End-to-end test of the web edition on a real Android device or emulator,
// in Android System WebView (org.chromium.webview_shell), with real touch input
// through adb and assertions through the WebView DevTools protocol.
//
//   npm run build && npx vite preview --port 4600 --strictPort &
//   node scripts/android-e2e.mjs --serial 127.0.0.1:6528 [--port 4600] [--out dir] [--chapters 6]
//
// Needs adb, a device with org.chromium.webview_shell (any AOSP/Cuttlefish
// image has it), and the preview server running on the host.

import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import puppeteer from 'puppeteer-core';

const argv = process.argv.slice(2);
const opt = (n, d) => (argv.includes(`--${n}`) ? argv[argv.indexOf(`--${n}`) + 1] : d);
const serial = opt('serial', process.env.ANDROID_SERIAL || '');
const port = +opt('port', 4600);
const out = opt('out', null);
const perBook = +opt('chapters', 6);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const adb = (...a) => execFileSync('adb', [...(serial ? ['-s', serial] : []), ...a], { encoding: 'utf8', maxBuffer: 1 << 26 });
const adbBin = (...a) => execFileSync('adb', [...(serial ? ['-s', serial] : []), ...a], { maxBuffer: 1 << 26 });
if (out) mkdirSync(out, { recursive: true });

const results = [];
let failures = 0;
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
}
function shot(name) {
  if (!out) return;
  writeFileSync(join(out, `${name}.png`), adbBin('exec-out', 'screencap', '-p'));
}

// ---- device setup
adb('reverse', `tcp:${port}`, `tcp:${port}`);
adb('shell', 'input', 'keyevent', 'KEYCODE_WAKEUP');
adb('shell', 'wm', 'dismiss-keyguard');
adb('shell', 'settings', 'put', 'system', 'screen_off_timeout', '1800000');
adb('shell', 'am', 'force-stop', 'org.chromium.webview_shell');
adb('shell', 'pm', 'clear', 'org.chromium.webview_shell'); // fresh storage, no service worker
adb('shell', 'am', 'start', '-a', 'android.intent.action.VIEW', '-d', `http://localhost:${port}/`, 'org.chromium.webview_shell');
await sleep(4000);
const sock = [...new Set(adb('shell', 'cat', '/proc/net/unix').match(/webview_devtools_remote_\d+/g) || [])].pop();
if (!sock) throw new Error('No WebView DevTools socket; is the shell running?');
adb('forward', 'tcp:9339', `localabstract:${sock}`);
const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9339', defaultViewport: null });
const pages = await browser.pages();
const page = pages.find((p) => p.url().includes(`localhost:${port}`)) || pages[0];
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(e.message));

const dpr = await page.evaluate(() => devicePixelRatio);
// Calibrate CSS px -> device px with a real tap.
await page.evaluate(() => { window.__tap = null; addEventListener('pointerdown', (e) => (window.__tap = { x: e.clientX, y: e.clientY }), { once: true, capture: true }); });
adb('shell', 'input', 'tap', '360', '900');
await sleep(500);
const tap0 = await page.evaluate(() => window.__tap);
if (!tap0) throw new Error('Calibration tap not received');
const offX = 360 - tap0.x * dpr, offY = 900 - tap0.y * dpr;
const dev = (x, y) => [Math.round(x * dpr + offX), Math.round(y * dpr + offY)];
async function rectOf(sel, i = 0) {
  return page.evaluate((s, k) => {
    const el = document.querySelectorAll(s)[k];
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height, cx: r.x + r.width / 2, cy: r.y + r.height / 2 };
  }, sel, i);
}
async function tapEl(sel, i = 0) {
  await page.evaluate((s, k) => document.querySelectorAll(s)[k]?.scrollIntoView({ block: 'center' }), sel, i);
  await sleep(400);
  const r = await rectOf(sel, i);
  if (!r) throw new Error(`no element ${sel}`);
  adb('shell', 'input', 'tap', ...dev(r.cx, r.cy).map(String));
  await sleep(700);
}
console.log(`device ${serial || '(default)'}, dpr ${dpr}, webview offset (${offX}, ${offY}), socket ${sock}`);

// ---- 1. library
await page.goto(`http://localhost:${port}/`, { waitUntil: 'networkidle0' });
await sleep(800);
const nBooks = await page.$$eval('.books li', (l) => l.length);
check('library lists four books', nBooks === 4, `${nBooks}`);
shot('01-library');

// ---- 2. real taps: book, then chapter 20
await tapEl('.books a', 0);
check('tap opens the Proofs book', (await page.evaluate(() => location.hash)) === '#/proofs');
await tapEl('.toc a[href="#/proofs/20"]');
await page.waitForSelector('article .fig svg', { timeout: 15000 });
await sleep(1000);
check('tap opens chapter 20', (await page.evaluate(() => location.hash)) === '#/proofs/20');
const ch = await page.evaluate(() => ({
  figs: document.querySelectorAll('figure.fig').length,
  mounted: [...document.querySelectorAll('figure.fig .fig-body')].filter((b) => b.childElementCount).length,
  katex: document.querySelectorAll('.katex').length,
  katexErr: document.querySelectorAll('.katex-error').length,
  overflow: document.documentElement.scrollWidth - innerWidth,
}));
check('chapter 20 mounts all 8 figures', ch.figs === 8 && ch.mounted === 8, JSON.stringify(ch));
check('maths rendered with no KaTeX errors', ch.katex > 20 && ch.katexErr === 0);
check('no horizontal overflow on the phone', ch.overflow <= 0, `${ch.overflow}px`);
shot('02-chapter20-top');

// ---- 3. drag the epsilon handle with a real touch swipe
await page.evaluate(() => document.querySelector('figure[data-fig="epsilon-band"]').scrollIntoView({ block: 'center' }));
await sleep(600);
const before = await page.evaluate(() => ({ v: document.querySelector('figure[data-fig="epsilon-band"] .handle').getAttribute('aria-valuetext'), y: scrollY }));
const h = await rectOf('figure[data-fig="epsilon-band"] .handle .knob');
const [hx, hy] = dev(h.cx, h.cy);
adb('shell', 'input', 'swipe', String(hx), String(hy), String(hx), String(hy + 45), '600');
await sleep(800);
const after = await page.evaluate(() => ({ v: document.querySelector('figure[data-fig="epsilon-band"] .handle').getAttribute('aria-valuetext'), y: scrollY }));
const epsOf = (s) => +/epsilon ([\d.]+)/.exec(s)[1];
const nOf = (s) => +/N (\d+)/.exec(s)[1];
check('touch drag narrows epsilon', epsOf(after.v) < epsOf(before.v), `${before.v} -> ${after.v}`);
check('N grows as epsilon shrinks', nOf(after.v) > nOf(before.v));
check('dragging the handle does not scroll the page', Math.abs(after.y - before.y) < 2, `${before.y} -> ${after.y}`);
shot('03-epsilon-dragged');

// ---- 4. a vertical swipe on the picture (not the handle) still scrolls the page
const svgR = await rectOf('figure[data-fig="epsilon-band"] svg');
const [sx, sy] = dev(svgR.x + svgR.w * 0.3, svgR.y + svgR.h * 0.7);
const y0 = await page.evaluate(() => scrollY);
adb('shell', 'input', 'swipe', String(sx), String(sy), String(sx), String(sy - 300), '300');
await sleep(900);
const y1 = await page.evaluate(() => scrollY);
check('swiping over a figure scrolls the page (no scroll trap)', y1 > y0 + 50, `${y0} -> ${y1}`);

// ---- 5. Reset
await tapEl('figure[data-fig="epsilon-band"] button');
await sleep(600);
const reset = await page.evaluate(() => document.querySelector('figure[data-fig="epsilon-band"] .handle').getAttribute('aria-valuetext'));
check('Reset restores epsilon 0.15', epsOf(reset) === 0.15, reset);

// ---- 6. proof stepper with real taps
const stepSel = 'figure[data-fig="proof-one-over-n"]';
const nextIdx = await page.evaluate((s) => [...document.querySelectorAll(`${s} button`)].findIndex((b) => b.textContent === 'Next'), stepSel);
for (let i = 0; i < 3; i++) await tapEl(`${stepSel} button`, nextIdx);
const cur = await page.evaluate((s) => [...document.querySelectorAll(`${s} .steps li`)].findIndex((li) => li.classList.contains('current')), stepSel);
check('tapping Next three times reaches step 4', cur === 3, `current ${cur}`);
shot('04-stepper');

// ---- 7. slider by touch
const sl = await rectOf('figure[data-fig="contract-game"] input[type=range]', 0);
await page.evaluate(() => document.querySelector('figure[data-fig="contract-game"] input[type=range]').scrollIntoView({ block: 'center' }));
await sleep(500);
const sl2 = await rectOf('figure[data-fig="contract-game"] input[type=range]', 0);
const v0 = await page.evaluate(() => document.querySelector('figure[data-fig="contract-game"] input[type=range]').value);
adb('shell', 'input', 'tap', ...dev(sl2.x + sl2.w * 0.9, sl2.cy).map(String));
await sleep(600);
const v1 = await page.evaluate(() => document.querySelector('figure[data-fig="contract-game"] input[type=range]').value);
check('tapping a slider track changes its value', v1 !== v0, `${v0} -> ${v1}`);
void sl;

// ---- 8. theme toggle by tap
await page.evaluate(() => scrollTo(0, 0));
await sleep(300);
await tapEl('.bar .linkish');
await tapEl('.bar .linkish'); // system -> light -> dark
const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
check('theme toggle switches to dark', bg === 'rgb(23, 22, 20)', bg);
shot('05-dark');
await tapEl('.bar .linkish'); // back to system

// ---- 9. reading position remembered across a reload
await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight * 0.5));
await sleep(800);
await page.goto(`http://localhost:${port}/`, { waitUntil: 'networkidle0' });
await sleep(800);
const cont = await page.evaluate(() => document.querySelector('.continue a')?.getAttribute('href'));
check('library offers to continue where you left off', cont === '#/proofs/20', String(cont));
await tapEl('.continue a');
await sleep(1200);
const pos = await page.evaluate(() => scrollY / (document.documentElement.scrollHeight - innerHeight));
check('chapter reopens near the saved position', pos > 0.35 && pos < 0.65, pos.toFixed(2));

// ---- 9b. every chapter with interactive figures: mounts, and a touch drag moves a handle
const figChapters = [...readFileSync(new URL('../src/chapters/index.ts', import.meta.url), 'utf8').matchAll(/'([a-z-]+\/[0-9A-Z]+)':/g)].map((m) => m[1]);
for (const key of figChapters) {
  errors.length = 0;
  await page.evaluate((h) => (location.hash = h), `#/${key}`);
  await page.waitForSelector('article figure.fig .fig-body > *', { timeout: 15000 }).catch(() => {});
  await sleep(900);
  const info = await page.evaluate(() => ({
    figs: document.querySelectorAll('figure.fig').length,
    mounted: [...document.querySelectorAll('figure.fig .fig-body')].filter((b) => b.childElementCount).length,
    handles: document.querySelectorAll('figure.fig .handle').length,
    overflow: document.documentElement.scrollWidth - innerWidth,
  }));
  let moved = 'no handle';
  if (info.handles) {
    await page.evaluate(() => document.querySelector('figure.fig .handle').scrollIntoView({ block: 'center' }));
    await sleep(500);
    const v0 = await page.evaluate(() => { const hd = document.querySelector('figure.fig .handle'); return hd.getAttribute('aria-valuetext') || hd.getAttribute('transform'); });
    const r = await rectOf('figure.fig .handle .knob');
    const c = await rectOf('figure.fig svg');
    const [x, y] = dev(r.cx, r.cy);
    // drag toward the middle of the picture, so a handle at the edge of its range can move
    const k = 70 / Math.max(1, Math.hypot(c.cx - r.cx, c.cy - r.cy));
    const [x2, y2] = dev(r.cx + (c.cx - r.cx) * k, r.cy + (c.cy - r.cy) * k);
    adb('shell', 'input', 'swipe', String(x), String(y), String(x2), String(y2), '500');
    await sleep(700);
    const v1 = await page.evaluate(() => { const hd = document.querySelector('figure.fig .handle'); return hd.getAttribute('aria-valuetext') || hd.getAttribute('transform'); });
    moved = v1 !== v0 ? 'moved' : 'did not move';
  }
  const ok = info.figs > 0 && info.mounted === info.figs && info.overflow <= 0 && errors.length === 0 && moved !== 'did not move';
  check(`${key}: ${info.figs} interactive figure(s) mount; touch drag ${moved}`, ok, ok ? '' : JSON.stringify({ ...info, errors: errors.slice(0, 3) }));
  if (out) shot(`09-${key.replace('/', '-')}`);
}

// ---- 10. a sample of chapters from every book
const lib = JSON.parse(readFileSync(new URL('../src/content/library.json', import.meta.url), 'utf8'));
const timings = [];
for (const b of lib) {
  const step = Math.max(1, Math.floor(b.chapters.length / perBook));
  for (let i = 0; i < b.chapters.length; i += step) {
    const c = b.chapters[i];
    errors.length = 0;
    const t0 = Date.now();
    const prevH1 = await page.evaluate(() => document.querySelector('article h1')?.textContent || '');
    await page.evaluate((h) => (location.hash = h), `#/${b.id}/${c.key}`);
    await page.waitForFunction((p) => { const t = document.querySelector('article h1')?.textContent; return t && t !== p && document.querySelector('article .katex, article p'); }, { timeout: 20000 }, prevH1).catch(() => {});
    const ms = Date.now() - t0;
    await sleep(500);
    const r = await page.evaluate(async () => {
      const imgs = [...document.querySelectorAll('img.tikz')];
      for (const im of imgs.slice(0, 40)) { im.loading = 'eager'; }
      await new Promise((res) => setTimeout(res, 1200));
      return {
        katex: document.querySelectorAll('.katex').length,
        katexErr: document.querySelectorAll('.katex-error').length,
        imgs: imgs.length,
        broken: imgs.slice(0, 40).filter((i) => i.complete && i.naturalWidth === 0).length,
        overflow: document.documentElement.scrollWidth - innerWidth,
      };
    });
    timings.push(ms);
    const ok = r.katexErr === 0 && r.broken === 0 && r.overflow <= 0 && errors.length === 0;
    check(`${b.id}/${c.key} renders (${ms} ms, ${r.katex} formulas, ${r.imgs} figures)`, ok, ok ? '' : JSON.stringify({ ...r, errors: errors.slice(0, 3) }));
    if (out && i % (step * 3) === 0) {
      await page.evaluate(() => document.querySelector('.bookfig, .md')?.scrollIntoView({ block: 'center' }));
      await sleep(800);
      shot(`10-${b.id}-${c.key}`);
    }
  }
}
timings.sort((a, b) => a - b);
check('median chapter open time under 2.5 s on the device', timings[timings.length >> 1] < 2500, `median ${timings[timings.length >> 1]} ms, max ${timings.at(-1)} ms`);

// ---- 11. offline (service worker)
await page.goto(`http://localhost:${port}/`, { waitUntil: 'networkidle0' });
await page.waitForFunction(() => navigator.serviceWorker?.controller, { timeout: 20000 }).catch(() => {});
await page.reload({ waitUntil: 'networkidle0' });
await sleep(1500);
const sw = await page.evaluate(() => !!navigator.serviceWorker?.controller);
check('service worker controls the page', sw);
if (sw) {
  const cdp = await page.createCDPSession();
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
  await sleep(1500);
  await page.evaluate(() => (location.hash = '#/probability/21'));
  await sleep(2500);
  const off = await page.evaluate(() => ({ h1: document.querySelector('article h1')?.textContent || '', katex: document.querySelectorAll('.katex').length }));
  check('a chapter never opened before reads offline', off.h1.includes('Central Limit') && off.katex > 10, JSON.stringify(off));
  shot('11-offline');
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
}

await browser.disconnect();
adb('forward', '--remove', 'tcp:9339');
console.log(`\n${results.length - failures}/${results.length} checks passed`);
if (out) writeFileSync(join(out, 'results.json'), JSON.stringify(results, null, 1));
process.exit(failures ? 1 : 0);
