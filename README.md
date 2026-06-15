# Linear Algebra From the Ground Up
### A Reader for Before *and* After Strang

A beginner-friendly, geometry-first companion to Gilbert Strang's linear
algebra. Read it **before** Strang to build the intuition that makes his
lectures click, and **after** Strang to go deeper into the SVD, data, and the
linear algebra running underneath modern machine learning. Hundreds of pages,
the same conversational voice and visual language as the companion readers
*Proofs From the Ground Up* and *Algorithms From the Ground Up*.

## What it covers

- **Seeing vectors (before Strang)** — what linear algebra is really about,
  vectors as arrows/lists/points, linear combinations and span, dot products,
  matrices as machines (linear transformations).
- **Solving systems** — geometry of equations, Gaussian elimination, matrix
  multiplication and inverses, LU factorization, transposes and permutations.
- **Vector spaces** — subspaces, column space and nullspace, the complete
  solution to `Ax=b`, independence/basis/dimension, the four fundamental
  subspaces, rank and the Fundamental Theorem of Linear Algebra.
- **Orthogonality** — orthogonal subspaces, projections, least squares and
  regression, Gram-Schmidt and QR.
- **Determinants** — volume and sign, cofactors, Cramer's rule.
- **Eigenvalues** — eigenvectors, diagonalization, differential equations and
  the matrix exponential, symmetric matrices and the spectral theorem, positive
  definite matrices, similarity and Jordan form.
- **The SVD and beyond (after Strang)** — the singular value decomposition,
  principal component analysis and data, change of basis abstractly, complex /
  Hermitian / unitary matrices and the Fourier matrix.
- **Linear algebra in the modern world** — numerical linear algebra, the linear
  algebra of machine learning (embeddings, gradient descent, neural nets,
  attention), graphs/networks/Markov chains, optimization and quadratic forms,
  and connections to groups, tensors, and functional analysis.
- **Mathematical background** — sets, functions, fields, sums, complex numbers,
  and the calculus you need.

## Build

```bash
./build.sh           # writes dist/linear-algebra-from-the-ground-up.pdf
```

Requires a TeX Live install with `tcolorbox`, `tikz`, `pgfplots`, and
`listings`. Sources are in `src/`, the rendered PDF lands in `dist/`.

## License

MIT — see `LICENSE`.
