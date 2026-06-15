# Calculus From the Ground Up
### Limits, Insight, and Why It Works — From Functions to Differential Equations

A beginner-friendly but genuinely rigorous calculus book built for
**understanding, not rote solving**. It explains where limits came from and
what is *really* happening, what `e^x` and the trig functions actually mean,
why each technique works (not just how to crank it), and it carries the story
all the way down to differential equations. Hundreds of pages, the same
conversational voice and visual language as the companion readers *Proofs*,
*Algorithms*, and *Linear Algebra From the Ground Up*. Inspired by the clarity
of Strang, Spivak, Courant, and the geometric spirit of *Essence of Calculus*.

## What it covers

- **Foundations** — what calculus is about, functions as the language of change,
  the exponential and the number `e`, trig and inverse functions, and the idea
  and **history** of limits (Newton/Leibniz to Cauchy/Weierstrass).
- **Limits and continuity** — the epsilon-delta definition made intuitive,
  computing limits, continuity and the Intermediate Value Theorem, limits at
  infinity.
- **The derivative** — slope/rate/tangent, the rules **and why they work**,
  derivatives of exp/log/trig, implicit and related rates, linear approximation
  and differentials, the Mean Value Theorem.
- **Using the derivative** — shape of graphs, optimization, L'Hopital's rule,
  Newton's method.
- **The integral** — area and accumulation, the **Fundamental Theorem** as the
  bridge, substitution, parts, partial fractions and trig integrals, improper
  integrals, applications, numerical integration.
- **Sequences and series** — sequences, convergence tests, power and Taylor
  series (why functions become polynomials), Taylor's theorem.
- **Multivariable** — partial derivatives, the gradient and chain rule, multiple
  integrals, vector calculus (Green/Stokes/divergence, intuitively).
- **Differential equations** — what an ODE is, first-order, second-order linear
  (oscillations), systems and the link back to linear algebra.
- **Background** — the algebra, functions, and real-number facts you need.

## Build

```bash
./build.sh           # writes dist/calculus-from-the-ground-up.pdf
```

Requires a TeX Live install with `tcolorbox`, `tikz`, `pgfplots`, and
`listings`. Sources are in `src/`, the rendered PDF lands in `dist/`.

## License

MIT — see `LICENSE`.
