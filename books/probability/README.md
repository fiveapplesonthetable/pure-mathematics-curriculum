# Probability From the Ground Up
### Chance, Intuition, and the Mathematics of Uncertainty

A beginner-friendly but genuinely rigorous probability book built for
**understanding, not rote formula-pushing**. It starts with what probability
even means, builds the whole theory from counting and the axioms, and carries
the story all the way to the Central Limit Theorem, stochastic processes,
statistical inference, and the measure-theoretic foundations. Hundreds of pages,
the same conversational voice and visual language as the companion readers
*Calculus*, *Linear Algebra*, and *Algorithms From the Ground Up*. Inspired by
the clarity of Blitzstein & Hwang, Ross, Feller, and Wasserman.

## What it covers

- **Foundations of chance** — what probability really is, counting and
  combinatorics, sample spaces and the Kolmogorov axioms, conditional
  probability and independence, Bayes' theorem.
- **Random variables** — the idea, discrete distributions, expectation,
  variance and moments, continuous random variables and densities, the major
  continuous families, and a deep dive on the Normal distribution.
- **Multiple random variables** — joint distributions, covariance and
  correlation, conditional expectation, transformations, sums and convolutions,
  generating functions.
- **Limit theorems** — concentration inequalities, the laws of large numbers,
  the Central Limit Theorem (and *why* it works), and modes of convergence.
- **Stochastic processes** — Markov chains and steady states, Poisson
  processes, random walks, continuous-time chains and queues, martingales,
  and Brownian motion.
- **Probability meets data** — maximum likelihood, Bayesian inference,
  confidence intervals and hypothesis testing, information theory, probability
  in machine learning, and Monte Carlo methods.
- **Rigorous foundations** — measure-theoretic probability, the Lebesgue
  integral and expectation, and conditional expectation done rigorously.
- **Background** — sets, sums, combinatorics, and the calculus/linear algebra
  you need.

## Build

```bash
./build.sh           # writes dist/probability-from-the-ground-up.pdf
```

Requires a TeX Live install with `tcolorbox`, `tikz`, `pgfplots`, and
`listings`. Sources are in `src/`, the rendered PDF lands in `dist/`.

## License

MIT — see `LICENSE`.
