# DESIGN.md

Calm, minimal, quiet. The reader came to think, not to be entertained.

## Principles

- Progressive disclosure: show less, reveal on tap. Hints, proofs' later steps and asides start collapsed.
- No stray card backgrounds, borders or boxes-in-boxes. Structure comes from spacing and type. The book's coloured boxes (focus, intuition, trap, lab) become plain labelled passages, not cards.
- One accent colour, used sparingly for links, handles, the current step and the progress line.

## Colour

| | Light | Dark |
|---|---|---|
| background | `#f6f3ee` | `#171614` |
| text | `#22201c` | `#eeeae3` |
| muted | `#6d675e` | `#a39d93` |
| accent | `#D2553C` | `#D2553C` |

Define these as CSS custom properties. Dark mode follows the system (`prefers-color-scheme`) and has a manual toggle (light / dark / system) remembered in localStorage. Diagrams use the same tokens, never hard-coded colours; derive secondary tones from text and muted with opacity. Check contrast in both modes.

## Type and layout

- System font stack for prose. KaTeX for maths, sized to match.
- Line-height about 1.65, measure about 65ch, generous vertical rhythm. Body text at least 17px on phones.
- Single column. Figures may be wider than the text but never cause horizontal scroll at 360px.

## Copy

Plain, human, consistent. No hype, no exclamation marks, no emoji, no "Let's dive in". Use the same word for the same thing everywhere (pick "figure" or "diagram" once; "Reset" always "Reset"). Sentence case. Buttons are verbs.

## Motion

Purposeful and eased, 200 to 400 ms, for things that explain (a map morphing, a band shrinking), never for decoration. Respect `prefers-reduced-motion`: jump to the end state and keep controls working.

## Interactives

- One short caption explains the diagram. No instruction paragraphs.
- A clear affordance: a visible drag handle (at least 44px hit area) or a labelled slider, plus a Reset.
- Values update live while dragging. Show the relevant formula next to the picture with the live numbers.
- Never hide the surrounding text: no modal, no full-screen takeover.
- Keyboard operable (arrow keys on handles), with an accessible label. Touch and mouse both work; avoid trapping page scroll on touch.

## Navigation

A chapter list, then the chapter, with a thin progress line at the top and previous/next at the end. Nothing else: no sidebar, no search clutter, no badges, no streaks, no percentages shouting at the reader. The list quietly marks where you left off.

## What good looks like

- A reader drags epsilon smaller and sees N move, and the definition suddenly makes sense.
- The page is mostly text, with a figure exactly where the prose needs one.
- Looks the same on a 360px phone and a laptop, light and dark, offline.
- A proof can be stepped line by line, each step highlighting what it used.

## What to avoid

- Points, streaks, badges, confetti, progress rings, congratulations.
- Quiz popups, multiple-choice game shows, timers.
- Cards inside cards, drop shadows, gradients, coloured callout boxes.
- Autoplaying animation that cannot be paused, or motion that ignores reduced-motion.
- Several accent colours, decorative illustrations, stock imagery.
- Walls of instructions on how to use a figure.
