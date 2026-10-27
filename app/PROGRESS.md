# Progress

Source of truth: `src/proof-reader-deep.tex` ("Proofs From the Ground Up", one `\section` per chapter below). Tick a box only when the chapter meets the checks in AGENTS.md. Add a one-line self-review note under each finished chapter.

Per chapter: [ ] build passes  [ ] no console errors  [ ] 360px ok  [ ] dark ok  [ ] interactives listed  [ ] cuts/changes noted

| # | Chapter | Status | PR | Interactives | Notes |
|---|---|---|---|---|---|
| 1 | The Change in Game: From Getting Answers to Giving Reasons | [ ] | | | |
| 2 | Mathematical Sentences: Statements, Predicates, and Claims | [ ] | | | |
| 3 | Variables Have Roles: Fixed, Arbitrary, Chosen, Bound | [ ] | | | |
| 4 | Quantifiers: The Game of For Every and There Exists | [ ] | | | |
| 5 | Negation: How to Disagree Precisely | [ ] | | | |
| 6 | Definitions: The Machines Inside the Words | [ ] | | | |
| 7 | If-Then Statements and Proof Strategy | [ ] | | | |
| 8 | Proof by Contradiction: Power and Danger | [ ] | | | |
| 9 | Examples, Non-Examples, and Counterexamples | [ ] | | | |
| 10 | Sets: The Grammar of Modern Mathematics | [ ] | | | |
| 11 | Set Proofs: Element Chasing in Detail | [ ] | | | |
| 12 | Functions: Structured Promises, Not Just Formulas | [ ] | | | |
| 13 | Injective, Surjective, Bijective | [ ] | | | |
| 14 | Images and Inverse Images | [ ] | | | |
| 15 | Relations and Equivalence | [ ] | | | |
| 16 | Orders: Another Kind of Relation | [ ] | | | |
| 17 | Induction: Infinite Claims, Finite Proofs | [ ] | | | |
| 18 | Strong Induction and Recursive Thinking | [ ] | | | |
| 19 | Countability and the First Shock of Infinity | [ ] | | | |
| 20 | Real Analysis Preview: Epsilon as a Contract | [x] PILOT | `web/interactive-edition` | `epsilon-band`, `no-limit`, `contract-game`, `proof-one-over-n`, `n-of-eps`, `epsilon-delta`, `proof-linear`, `delta-depends-on-c` | Replaced static ASCII/table walkthroughs with 8 interactive diagrams; all prose, definitions, proofs and exercises preserved. Verified at 360px & 1280px light/dark and on Android WebView. |
| 21 | Abstract Algebra Preview: Structure and Symmetry | [ ] | | | |
| 22 | Topology Preview: Continuity Without Rulers | [ ] | | | |
| 23 | Differential Geometry Preview: Calculus on Curved Worlds | [ ] | | | |
| 24 | Algebraic Geometry Preview: Equations as Shapes | [ ] | | | |
| 25 | Proof Debugging: Turning Fog Into Work | [ ] | | | |
| 26 | A Serious Velleman Readiness Plan | [ ] | | | |
| 27 | Second Pass: Logic as a Language You Can Speak | [ ] | | | |
| 28 | Second Pass: Quantifier Order in Real Problems | [ ] | | | |
| 29 | Second Pass: Definitions Under a Microscope | [ ] | | | |
| 30 | Second Pass: Proofs as Programs With Human Readers | [ ] | | | |
| 31 | Second Pass: Set Algebra and Boolean Thinking | [ ] | | | |
| 32 | Second Pass: Functions as Maps of Structure | [ ] | | | |
| 33 | Second Pass: Relations, Classification, and Quotients | [ ] | | | |
| 34 | Second Pass: Induction Beyond Formulas | [ ] | | | |
| 35 | Second Pass: Analysis as Quantifier Discipline | [ ] | | | |
| 36 | Second Pass: Algebra as Lawful Manipulation | [ ] | | | |
| 37 | Second Pass: Topology as the Study of Stable Nearness | [ ] | | | |
| 38 | Second Pass: Geometry, Coordinates, and What Is Real | [ ] | | | |
| 39 | Second Pass: Algebraic Geometry as Translation | [ ] | | | |
| 40 | Guided Solutions and Commentary | [ ] | | | |
| 41 | Final Exam: From Beginner to Ready | [ ] | | | |

Preface section "How This Book Should Be Read" is unnumbered; folded into the book landing page (`#/proofs`).

## Companion Books (Blended into the Interactive Web Edition)

All 161 chapters and 679 TikZ/pgfplots diagrams across the four books are parsed into structured JSON and SVG figures, with flagship interactive diagrams in Calculus, Linear Algebra, and Probability:

| Book | Chapter | Status | Branch | Interactives | Notes |
|---|---|---|---|---|---|
| Calculus | 10 · The Derivative as a Limit and a Slope | [x] | `web/interactive-edition` | `secant-to-tangent` | Draggable base point $a$ and step $h\to 0$ with live difference quotient $\frac{f(a+h)-f(a)}{h}$ and tangent line. |
| Calculus | 20 · The Integral: Area and Accumulation | [x] | `web/interactive-edition` | `riemann-sums` | Partition slider $n\in[2,48]$ and rule selector (Left, Right, Midpoint, Lower, Upper) with live gap to exact integral. |
| Calculus | 21 · The Fundamental Theorem of Calculus | [x] | `web/interactive-edition` | `accumulation` | Synchronized upper-limit handle $x$ coupling shaded signed area $A(x)=\int_0^x f(t)\,dt$ with slope $A'(x)=f(x)$. |
| Calculus | 30 · Power Series and Taylor Series | [x] | `web/interactive-edition` | `taylor-polynomials` | Degree slider $n\in[0,11]$ and function selector ($\sin x$, $\cos x$, $e^x$, $\frac{1}{1-x}$ with radius of convergence $R=1$). |
| Linear Algebra | 3 · Linear Combinations and Span | [x] | `web/interactive-edition` | `span-combination` | Draggable basis vectors $\vec{v},\vec{w}$ and target $\vec{b}$ with live coordinate grid and unique decomposition $c_1\vec{v}+c_2\vec{w}$ (collapses to line when collinear). |
| Linear Algebra | 5 · Matrices as Linear Machines | [x] | `web/interactive-edition` | `matrix-grid` | Draggable column vectors $\vec{a}_1,\vec{a}_2$, presets (Rotation, Shear, Reflection, Projection), and interpolation slider $t\in[0,1]$. |
| Linear Algebra | 21 · Determinants: Volume and Sign | [x] | `web/interactive-edition` | `determinant-area` | Oriented parallelogram with coral/muted fill that flips shade and sign when $\vec{a}_1,\vec{a}_2$ cross and collapses at $\det A=0$. |
| Linear Algebra | 23 · Eigenvalues and Eigenvectors | [x] | `web/interactive-edition` | `eigen-directions` | Unit-circle direction probe $\vec{u}_\theta$ showing $A\vec{u}_\theta$ locking onto invariant eigenlines (or rotating without real eigenlines). |
| Probability | 5 · Bayes' Theorem: Updating Beliefs | [x] | `web/interactive-edition` | `bayes-area` | Unit-square joint probability diagram with draggable base rate $P(H)$, sensitivity $P(E\mid H)$, and false-positive rate $P(E\mid H^c)$. |
| Probability | 12 · The Normal Distribution | [x] | `web/interactive-edition` | `normal-areas` | Draggable symmetric threshold $z$ on $\mathcal{N}(\mu,\sigma^2)$ with live shaded mass $\Phi(z)-\Phi(-z)$ and $1\sigma/2\sigma/3\sigma$ ticks. |
| Probability | 20 · Laws of Large Numbers | [x] | `web/interactive-edition` | `lln-running-mean` | Sample-path generator for $\bar{X}_n$ converging into the $\mu\pm\sigma/\sqrt{n}$ envelope up to $n=250$ trials. |
| Probability | 21 · The Central Limit Theorem | [x] | `web/interactive-edition` | `clt-convolution` | Exact discrete $n$-fold convolution standardized against $\mathcal{N}(0,1)$ for skewed Bernoulli, Uniform, and U-shaped base laws. |

