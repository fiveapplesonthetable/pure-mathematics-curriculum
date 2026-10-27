# Pure Mathematics Curriculum PDFs

> Building an interactive edition: see AGENTS.md

This directory contains LaTeX sources and rendered PDFs for a beginner-friendly self-study path from engineering mathematics into rigorous pure mathematics.

Build all PDFs:

```bash
./build.sh
```

Outputs are written to `dist/`.

## Companion books

Three companion readers live under `books/`, each merged with its full history
(`git subtree`) from its original repository:

| Book | Source | Build | PDF |
|---|---|---|---|
| Calculus From the Ground Up | `books/calculus/src/main.tex` | `books/calculus/build.sh` | `books/calculus/dist/calculus-from-the-ground-up.pdf` |
| Linear Algebra From the Ground Up | `books/linear-algebra/src/main.tex` | `books/linear-algebra/build.sh` | `books/linear-algebra/dist/linear-algebra-from-the-ground-up.pdf` |
| Probability From the Ground Up | `books/probability/src/main.tex` | `books/probability/build.sh` | `books/probability/dist/probability-from-the-ground-up.pdf` |

Each `build.sh` runs from its own directory (`cd books/calculus && ./build.sh`).
