# Pilot & Multi-Book Interactive Edition Review

## Branches

- **`book/merge-companion-books`** (`book:` commits only):
  - Merges `linear-algebra-from-the-ground-up`, `calculus-from-the-ground-up`, and `probability-from-the-ground-up` under `books/linear-algebra`, `books/calculus`, and `books/probability` via `git subtree add` (preserving commit history).
  - Applies **224 adversarially verified mathematical, TikZ/pgfplots diagram, and LaTeX fixes** across all four books and rebuilds all PDFs in `dist/` and `books/*/dist/` with `./build.sh`.
- **`web/interactive-edition`** (`web:` commits stacked on `book/merge-companion-books`):
  - Interactive web edition under `app/` covering all **4 books (161 chapters, 3,671 cross-reference labels, 679 rendered TikZ/pgfplots SVGs, and 20 interactive figures across 13 chapters)**, plus GitHub Pages deployment (`.github/workflows/pages.yml`) and PR check workflow (`.github/workflows/web-check.yml`).

---

## Pilot Chapter: `proofs/20` ("Real Analysis Preview: Epsilon as a Contract")

Route: `#/proofs/20` (legacy alias `#/20` redirects to `#/proofs/20`).

### 8 Interactive Figures (`app/src/chapters/ch20.ts`)

1. **`epsilon-band`** (`app/src/figures/epsilon-band.ts`): Draggable $\varepsilon$-tube around $L=2$ for $a_n = 2 + (-1)^n/n$. Starts at $\varepsilon = 0.18$ so the cutoff $N = \lfloor 1/\varepsilon \rfloor + 1 = 6$ is immediately visible; hollow dots before $N$, coral dots inside the band from $N$ onward.
2. **`no-limit`** (`app/src/figures/no-limit.ts`): Candidate limit $L$ and $\varepsilon$ sliders for $a_n = (-1)^n$, showing that once $\varepsilon \le 1$, at least one parity of $n$ always lands outside $(L-\varepsilon, L+\varepsilon)$.
3. **`contract-game`** (`app/src/figures/contract-game.ts`): Challenger/builder contract on $a_n = \frac{3n+1}{n+2} \to 3$, with sequence presets and draggable $\varepsilon$ and response $N$.
4. **`proof-one-over-n`** (`app/src/figures/proof-one-over-n.ts`): Step-by-step algebra-to-geometry scrubber for the proof that $1/n \to 0$, linking each proof sentence to the active geometric region and live numbers.
5. **`n-of-eps`** (`app/src/figures/n-of-eps.ts`): Side-by-side comparison of decay rates $1/n$, $1/n^2$, and $1/\sqrt{n}$ showing how the required threshold $N(\varepsilon)$ grows as $\varepsilon \downarrow 0$.
6. **`epsilon-delta`** (`app/src/figures/epsilon-delta.ts`): Draggable target point $c$, output tolerance $\varepsilon$, and input window $\delta$ for $f(x) = x^2$ vs. a jump discontinuity at $c = 1$.
7. **`proof-linear`** (`app/src/figures/proof-linear.ts`): Interactive scratchwork-to-proof diagram for $\lim_{x\to 2}(3x-1)=5$, showing why $|(3x-1)-5| = 3|x-2| < \varepsilon$ forces $\delta = \varepsilon/3$.
8. **`delta-depends-on-c`** (`app/src/figures/delta-depends-on-c.ts`): Demonstrates why $\delta$ depends on both $\varepsilon$ and $c$ for $f(x)=x^2$ using the bound $|x+c| \le |x-c| + 2|c| < 1 + 2|c|$ and $\delta = \min(1, \varepsilon/(2|c|+1))$.

### Cuts / Changes from the Book

- Replaced static ASCII/tabular walkthroughs of $a_n = 1/n$ and $\lim_{x\to 2}(3x-1)=5$ with the interactive figures above (`where: 'replace'` on those blocks).
- All definitions, theorems, proofs, prose, and exercises are preserved verbatim.

---

## Companion Book Interactive Figures (12 Figures across Calculus, Linear Algebra, Probability)

| Book & Route | Figure Module | What the Reader Moves |
|---|---|---|
| Calculus 10 (`#/calculus/10`) | `secant-to-tangent.ts` | Base point $a$ and step $h \to 0$ on $f(x)$, watching the secant line approach the tangent and $\frac{f(a+h)-f(a)}{h} \to f'(a)$. |
| Calculus 20 (`#/calculus/20`) | `riemann-sums.ts` | Partition size $n \in [2,48]$ and rule (Left, Right, Midpoint, Lower, Upper) with live integral error. |
| Calculus 21 (`#/calculus/21`) | `accumulation.ts` | Upper limit $x$ synchronizing shaded signed area $A(x)=\int_0^x f(t)\,dt$ (top) with curve height and slope $A'(x)=f(x)$ (bottom). |
| Calculus 30 (`#/calculus/30`) | `taylor-polynomials.ts` | Degree $n \in [0,11]$ and function ($\sin x$, $\cos x$, $e^x$, $\frac{1}{1-x}$ with convergence boundary $R=1$). |
| Linear Algebra 3 (`#/linear-algebra/3`) | `span-combination.ts` | Basis vectors $\vec{v}, \vec{w}$ and target $\vec{b}$ in $\mathbb{R}^2$, showing the slanted coordinate grid and $c_1\vec{v}+c_2\vec{w}$ (or collapsing to a 1D line when collinear). |
| Linear Algebra 5 (`#/linear-algebra/5`) | `matrix-grid.ts` | Columns $\vec{a}_1, \vec{a}_2$ of $A$, transformation presets (Rotation, Shear, Reflection, Projection), and morph slider $t \in [0,1]$. |
| Linear Algebra 21 (`#/linear-algebra/21`) | `determinant-area.ts` | Columns $\vec{a}_1, \vec{a}_2$ with oriented parallelogram area $\det A$; fill shade and sign flip when orientation reverses. |
| Linear Algebra 23 (`#/linear-algebra/23`) | `eigen-directions.ts` | Unit vector $\vec{u}_\theta$ around the circle, showing $A\vec{u}_\theta$ aligning along invariant eigenlines (or rotating without real eigenlines). |
| Probability 5 (`#/probability/5`) | `bayes-area.ts` | Prior $P(H)$, sensitivity $P(E\mid H)$, and false-positive rate $P(E\mid H^c)$ on a unit-square joint probability diagram. |
| Probability 12 (`#/probability/12`) | `normal-areas.ts` | Threshold $z$ on $\mathcal{N}(\mu,\sigma^2)$ with live shaded mass $P(|X-\mu|\le z\sigma)=\Phi(z)-\Phi(-z)$. |
| Probability 20 (`#/probability/20`) | `lln-running-mean.ts` | Sample-path generator for $\bar{X}_n$ converging inside the $\mu \pm \sigma/\sqrt{n}$ envelope over $n=250$ trials. |
| Probability 21 (`#/probability/21`) | `clt-convolution.ts` | Sum count $n \in [1,25]$ and base law (Skewed Bernoulli, Uniform, U-shaped), plotting exact standardized $n$-fold convolution bars against $\mathcal{N}(0,1)$. |

---

## Verification

```bash
cd app
npm ci
npm run build                        # builds content JSON for 4 books + Vite bundle
node scripts/check.mjs --all         # headless Chrome check across all 161 chapters (360px light & dark)
node scripts/android-e2e.mjs         # Android Cuttlefish WebView E2E + touch-drag on all 13 interactive chapters
```

- **Build**: `0` warnings across all 4 books (`161` chapters, `3,671` labels, `679` SVG figures), TypeScript + Vite bundle clean, offline PWA manifest + service worker included.
- **Headless check (`check.mjs --all`)**: 161/161 chapters pass in light and dark mode at 360px width (0 console errors, 0 page errors, 0 broken images, 0 KaTeX errors, 0 horizontal overflow).
- **Android WebView E2E (`android-e2e.mjs`)**: 47/47 general & pilot checks + 43/43 interactive-chapter touch-drag checks pass on Cuttlefish Android 17 (`720x1348`, `dpr = 1.75`).
