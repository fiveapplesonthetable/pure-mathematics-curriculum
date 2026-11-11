# Music book: writing and figure guide

Read this before touching `books/music/` or a music figure. Also read the repo's
`AGENTS.md` and `DESIGN.md` (calm, minimal, no gamification).

## Who the reader is

An adult who has **never had a music lesson**. They may not own a piano. They do
not know what a note, a key, a chord or a beat is. They are smart and curious,
and they will quit if a page feels like a wall of jargon. The old version of this
book was accurate but hard to follow: long sentences, words used before they
were explained, note names typeset as maths (`$C - E - G$` reads as subtraction),
bold everywhere, and maths (Z_12, mod 12, gcd) in the main text. Fix all of that.

## Prose rules

1. **Short sentences, short paragraphs.** Aim for under 20 words per sentence and
   at most 4 sentences per paragraph. One idea per paragraph. Leave a blank line
   between paragraphs (each becomes its own paragraph on the web).
2. **Define every music word before (or as) you first use it**, in plain words,
   with an everyday comparison where it helps. Bold only the word being defined,
   once, at its definition. No other bold except very rarely.
   Words that need care: note, pitch, key (a piano key) vs key (the musical key of
   a song: say "the key of G" and explain it), octave, half step, whole step,
   sharp, flat, natural, interval, scale, root, chord, triad, third, fifth,
   inversion, beat, tempo, bar/measure, time signature, staff, clef, ledger line.
3. **No hype or filler**: avoid "instantly", "effortlessly", "simply", "just",
   "literally", "magic", "irresistibly", "beautiful", "completely", exclamation marks.
   Be warm and direct, like a patient teacher sitting next to the reader.
4. **Show, then hear, then try.** Each idea: explain it, point at a picture, give a
   `\listen{...}` so the reader hears it, then a small thing to try with their hands.
5. Prefer "count up 4 keys" to "+4". If you use a shorthand like "4 + 3", explain
   it in words the first time in each chapter.
6. **No maths in the main text.** No Z_12, mod, gcd, 2^{1/12}, ratios like 3:2 in
   running text. A short `curiousbox` ("For the mathematically curious", collapsed
   on the web) may hold that material for readers who want it.
7. **American spelling** (memorize, color, neighbor, practice as noun and verb).
8. End each chapter with a `summarybox` ("What to remember": 4 to 8 bullets in
   plain words, including the new words with one-line meanings), then
   `\section*{Exercises}` with 3 to 6 exercises. **Every exercise is followed by an
   `answerbox`** with a full, friendly worked answer (collapsed on the web).

## Notation rules (important)

- Note names are **plain upright text**, never maths: `C`, `D`, `E\fl`, `F\sh`,
  `B\fl`, `C\sh`. Macros: `\sh` (sharp), `\fl` (flat), `\nat` (natural). Write
  `E\fl{}` or `E\fl\ ` when a space must follow.
- Octave numbers: middle C is `C4`, the next C up is `C5`. Write `C4`, `F\sh3`.
- Lists of notes: "C, E and G", or with en dashes "C--E--G". **Never** `$C - E - G$`.
- Chord symbols are plain text: `C`, `Cm`, `G7`, `Cmaj7`, `C/E`, `Bdim`. Roman
  numerals in plain text: I, ii, iii, IV, V, vi, vii\textdegree{} (use `vii\textdegree{}`
  or write "vii (diminished)").
- Finger numbers in plain text: "finger 3", "fingers 1--3--5".
- Do not use `$...$` for plain numbers either: write 4, 12, 3/4.
  Time signatures may be written "4/4", "3/4", "6/8".
- Keep `\label`s on chapters and figures, refer with `Figure~\ref{...}`.

## Sound: `\listen{...}`

`\listen{spec}` prints nothing in the PDF and becomes a small round play button
in the web edition. Put one right after every example the reader could hear:
every note, interval, chord, scale, progression, rhythm and melody. Be generous.

Spec syntax (parsed by `app/src/audio.ts`):

| spec | meaning |
|---|---|
| `C4 D4 E4` | melody, one beat each |
| `C4+E4+G4` | chord, notes together |
| `C4+E4+G4:2 F4:0.5` | `:n` = length in beats (default 1) |
| `- r` | rests (also take `:n`) |
| `x X` | soft click / accented click (for rhythm) |
| `@80 ...` | tempo in beats per minute (default 96) |
| `~ C4+E4+G4` | leading `~` rolls (strums) the chords |
| `=C3:4 E4 G4 C5 G4` | leading `=` holds a note without moving time on (bass rings under a melody) |

Use `#` and `b` in specs: `\listen{F#4+A4+C#5}`, `\listen{Bb3+D4+F4}`.
Middle C = C4. Keep the right hand around C4-C5 and left hand around C2-C3, as a
pianist would. Double-check every spec: it must play exactly what the text says.

Examples:

    C major chord, C--E--G \listen{C4+E4+G4:2}.
    The C major scale \listen{C4 D4 E4 F4 G4 A4 B4 C5:2}.
    Four steady beats with the first one stronger \listen{@80 X x x x X x x x}.
    Left hand C, right hand chord: \listen{C3+C4+E4+G4:2}.

## Boxes available (common.tex)

Open on the web: `intuitionbox` (Intuition), `trapbox` (Common trap),
`tryitbox` (Try it at the keyboard), `labbox` (Work it yourself), `focusbox`,
`wordsbox` (New words), `summarybox` (What to remember), `recoverybox` (Pause).
Collapsed on the web: `curiousbox` (For the mathematically curious), `answerbox`
(Answer), `historybox`. Use boxes sparingly; most text should be plain paragraphs.
Don't use `formalbox` in this book.

## Static figures (TikZ, shown in PDF and as SVG on the web)

- One clear point per figure. Fewer labels. No callout boxes inside figures.
- Text at least `\small` (never `\scriptsize`/`\tiny`); width at most 14 cm.
- Note names in figures are plain text (`C`, `E$\flat$` is fine inside TikZ nodes,
  or `E\fl`), not maths italics.
- Every figure has a one- or two-sentence `\caption` and a `\label`.
- Check there is no overlapping text in the rendered SVG (look at it).
- On the web an interactive figure can replace a static one (placement
  `where: 'replace'`); the PDF keeps the TikZ.

## Interactive figures (web only)

- Files: `app/src/figures/<name>.ts`, placed by `app/src/chapters/music-<n>.ts`
  (see `app/src/chapters/index.ts` for how refs work: `"section-slug/k"` = k-th
  block after a heading, `"tryitbox-2"` = 2nd tryitbox in the chapter, etc.).
- Use the shared helpers: `app/src/figures/music-lib.ts` (keyboard, note names,
  correct spelling, arcs) and `app/src/audio.ts` (sound; one AudioContext).
  Use `responsiveSvg`, `row`, `button`, `slider` from `lib.ts`. Look at
  `app/src/figures/music-chord-builder.ts` for an example built on the shared helpers.
- Theme colors only via CSS classes (`.key-w.on`, `.lbl`, `.lbl-acc`, `.line-acc`,
  etc. in `style.css`). Never hard-code colors.
- Tapping a piano key always makes its sound. Anything that plays lights the keys
  as it plays (`onEvent` + `kb.flash`).
- Must work at 360 px wide and on a laptop, light and dark, with keyboard and with
  reduced motion; no console errors. Few controls, no walls of instructions.
  Caption: one short sentence saying what to do.
- Not a game: no scores, streaks, timers or "correct!" celebrations.

## Do not edit (shared; message the coordinator if you need a change)

`app/src/audio.ts`, `app/src/figures/music-lib.ts`, `app/src/figures/lib.ts`,
`app/src/style.css`, `app/src/main.ts`, `app/scripts/*`,
`app/src/chapters/index.ts`, `books/music/src/common.tex`, `books/music/src/main.tex`,
and other agents' chapter files.

## How to build and check (several agents share this checkout)

Use your own temp directory name instead of `NAME`.

    # PDF (do NOT use build.sh, it writes the shared dist/):
    cd books/music && mkdir -p /tmp/NAME-pdf && pdflatex -interaction=nonstopmode -halt-on-error -output-directory /tmp/NAME-pdf src/main.tex | tail -3

    # Web content + TikZ SVGs (serialized with a lock because the outputs are shared):
    cd app && flock /tmp/music-build.lock sh -c 'node scripts/build-content.mjs --book music && node scripts/build-figures.mjs --book music'
    # Warnings for the music book: app/.content-warnings.json (fix all for your chapters).

    # Type check:
    cd app && npx tsc --noEmit

    # Headless check + screenshots of one chapter (phone/laptop, light/dark):
    cd app && node scripts/check.mjs --chapter music/3 --out /tmp/NAME-shots
    # then look at the PNGs in /tmp/NAME-shots with the image viewer.

Never run `npm run build` (it rebuilds every book's content) and never commit or
push; the coordinator does that.
