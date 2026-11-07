# Pure Mathematics Curriculum PDFs

> Building an interactive edition: see AGENTS.md

This directory contains LaTeX sources and rendered PDFs for a beginner-friendly self-study path from engineering mathematics into rigorous pure mathematics.

Build all PDFs:

```bash
./build.sh
```

Outputs are written to `dist/`.

## Companion books

Companion readers live under `books/`:

| Book | Source | Build | PDF |
|---|---|---|---|
| Calculus From the Ground Up | `books/calculus/src/main.tex` | `books/calculus/build.sh` | `books/calculus/dist/calculus-from-the-ground-up.pdf` |
| Linear Algebra From the Ground Up | `books/linear-algebra/src/main.tex` | `books/linear-algebra/build.sh` | `books/linear-algebra/dist/linear-algebra-from-the-ground-up.pdf` |
| Probability From the Ground Up | `books/probability/src/main.tex` | `books/probability/build.sh` | `books/probability/dist/probability-from-the-ground-up.pdf` |
| Statistics From the Ground Up | `books/statistics/src/main.tex` | `books/statistics/build.sh` | `books/statistics/dist/statistics-from-the-ground-up.pdf` |
| Finance and Accounting From the Ground Up | `books/finance/src/main.tex` | `books/finance/build.sh` | `books/finance/dist/finance-from-the-ground-up.pdf` |

Each `build.sh` runs from its own directory (`cd books/calculus && ./build.sh`).
