# Web edition

An interactive web edition of the four "From the Ground Up" readers in this
repo: Proofs (`src/proof-reader-deep.tex`), Calculus, Linear Algebra and
Probability (`books/*/src/main.tex`). Vite + plain TypeScript, KaTeX, an
offline-capable PWA, deployed to GitHub Pages by `.github/workflows/pages.yml`.

## Run it

```sh
cd app
npm ci
npm run dev          # converts the LaTeX, then serves on http://localhost:5173
npm run build        # content + typecheck + production build into dist/
npm run preview      # serve dist/
```

## How the content is made

| Step | Script | Output |
|---|---|---|
| LaTeX → chapters | `scripts/build-content.mjs` | `src/content/<book>/<chapter>.json` (generated, not committed) |
| TikZ/pgfplots → SVG | `scripts/build-figures.mjs` (needs pdflatex, pdftocairo) | `public/figures/<book>/*.svg` + `manifest.json` (committed) |
| Interactive figures | hand-written, `src/figures/*.ts` | placed by `src/chapters/*.ts` |

`build-content` reads each book's preamble and `common.tex` for macros, box
titles and theorem names, keeps maths as TeX (rendered by KaTeX in the browser,
validated with KaTeX at build time), numbers theorems, sections, figures and
equations like the PDF, and resolves `\ref`/`\eqref` into links. It prints a
warning summary; it should stay at zero.

Run `build-figures` after changing a `tikzpicture` (only changed pictures are
re-rendered; `--force` redoes all). CI does not need TeX.

Book figures keep the book's colours; in dark mode they are shown with
`invert(0.88) hue-rotate(180deg)`, which keeps hues and swaps light for dark.
Interactive figures use the design tokens directly.

## Adding an interactive figure

1. Write `src/figures/<name>.ts` exporting `mount(root)`; follow
   `src/figures/epsilon-band.ts` and the helpers in `src/figures/lib.ts`
   (responsive SVG, 44px drag handles with arrow keys, sliders, live KaTeX,
   reduced-motion-aware tweens, proof stepper). Colour only through the
   "Diagram vocabulary" classes in `src/style.css`.
2. Place it in `src/chapters/<book>-<key>.ts` by block ref (`definition-1`,
   `proof-2`, a section slug, or `section-slug/3` for the third block after a
   heading), and register that file in `src/chapters/index.ts`.
3. Check it.

## Checks

```sh
npm run check -- --chapter proofs/20 --out /tmp/shots   # 360px + laptop, light + dark, reduced motion
npm run check -- --all                                  # every chapter of every book (phone, light + dark)
```

`scripts/check.mjs` fails on console errors, KaTeX errors, horizontal overflow
at 360px, figures that render nothing and book figures that are missing.

### On Android

`scripts/android-e2e.mjs` drives Android System WebView on a device or emulator
over adb with real touch input (drags, taps, swipes) and checks results through
the WebView DevTools protocol: navigation, figure interaction, scroll not
trapped by figures, theme, resume position, a sample of chapters from every
book, and offline reading through the service worker.

```sh
npm run build && npx vite preview --port 4600 --strictPort &
node scripts/android-e2e.mjs --serial <adb serial> --port 4600 --out /tmp/android
```
