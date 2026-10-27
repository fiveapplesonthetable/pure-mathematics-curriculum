# AGENTS.md

Read this first, then DESIGN.md, then app/PROGRESS.md.

## Mission

Turn the LaTeX book into an interactive web edition for reading and learning mathematics, in the spirit of 3Blue1Brown. Every key idea gets an animated or interactive visual the reader can touch: drag points, scrub sliders, watch transformations morph, step through proofs line by line. Maths is rendered properly with KaTeX. The prose stays faithful to the book and may be improved where a visual makes it clearer.

Not gamified. No points, streaks, badges, leaderboards or quizzes-as-games, and nothing that feels like Brilliant. The site is calm and a pleasure to read.

## The book

- Primary source: `src/proof-reader-deep.tex` ("Proofs From the Ground Up", about 2900 lines). Each `\section{...}` is one chapter (44 of them, listed in `app/PROGRESS.md`). Shared macros and boxes are in `src/common.tex` and the preamble of that file (`\eps`, `\N`, `focusbox`, `intuitionbox`, `trapbox`, `labbox`, theorem environments).
- Other sources (`main-curriculum`, `start-here-reader`, `proof-reader-expanded`, `workbook`, `proof-debugger`, `spaced-repetition`, `src/deep-parts/`) are companions. Use them for exercises and extra material only if useful.
- There are no `\chapter` commands and no TikZ figures; the book has no figures yet, so the visuals are all new work.
- PDFs are in `dist/`. Build with `./build.sh` (needs pdflatex). Never edit or delete existing sources or PDFs in a web PR.
- Convert LaTeX to content by script where possible (a small parser in `app/scripts/` that maps environments to components), not by hand-copying 2900 lines.

## Stack

- Static site under `app/`: Vite plus plain TypeScript, or Svelte. Pick one and stay with it.
- KaTeX for maths. Mafs, JSXGraph or D3 for interactive figures; canvas or SVG animation for 3B1B-style motion.
- Deploy to GitHub Pages from GitHub Actions (`.github/workflows/pages.yml`).
- Phone-first, offline-capable (PWA with a service worker), and great on a laptop.
- Remember reading position and progress per chapter in localStorage. Wrap every access in try/catch; the site must work without it.
- No backend, no accounts, no analytics, no trackers. Never commit secrets or tokens.

## Workflow

1. Pilot ONE chapter first, with 5 to 10 interactive figures. Recommended pilot: chapter 20, "Real Analysis Preview: Epsilon as a Contract" (an epsilon band you drag, a challenger/response game on N, a sequence plotted against its limit). Build the app shell, the LaTeX-to-content pipeline and the Pages deploy around it. Then STOP for human review: open a PR, or write `app/REVIEW-pilot.md` with screenshots and a link to the deployed preview.
2. After approval, go chapter by chapter, one PR per chapter or small group.
3. Keep `app/PROGRESS.md` updated with the per-chapter checklist.
4. A chapter is done only when: `npm run build` passes; there are no console errors; it works at 360px width and in dark mode; keyboard and reduced-motion work.
5. Add a short self-review note per chapter (in the PR and in PROGRESS.md): what is interactive, and what was cut or changed from the book and why.
6. Reference quality bar: `app/examples/*.html`. Open them before building anything.

## Review

All work happens in this repo on branches and PRs. Do not push to `main` except for trivial fixes to these instruction files. The owner's main agent reviews every PR; address comments in the same PR. Keep PRs small enough to review, and say in the description how to run and check them.

## Book improvements

You may also improve the LaTeX book itself (mathematical errors, clarity, better figures such as TikZ). Do this in separate PRs whose titles start with `book:`. A `book:` PR must keep `./build.sh` passing, and must not mix in web changes. If the web edition diverges from the book on purpose, say so in the chapter note.
