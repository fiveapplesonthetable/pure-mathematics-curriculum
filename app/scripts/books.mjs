// Books config for the web edition. Paths are relative to the repo root.
// `unit` is the LaTeX command that starts a chapter in the web edition.

export const BOOKS = [
  {
    id: 'proofs',
    short: 'Proofs',
    title: 'Proofs From the Ground Up',
    subtitle: 'A deep conversational reader before Velleman',
    main: 'src/proof-reader-deep.tex',
    root: '.',
    common: ['src/common.tex'],
    unit: 'section',
  },
  {
    id: 'calculus',
    short: 'Calculus',
    title: 'Calculus From the Ground Up',
    subtitle: 'Limits, insight, and why it works, from functions to differential equations',
    main: 'books/calculus/src/main.tex',
    root: 'books/calculus',
    common: ['books/calculus/src/common.tex'],
    unit: 'chapter',
  },
  {
    id: 'linear-algebra',
    short: 'Linear algebra',
    title: 'Linear Algebra From the Ground Up',
    subtitle: 'A reader for before and after Strang',
    main: 'books/linear-algebra/src/main.tex',
    root: 'books/linear-algebra',
    common: ['books/linear-algebra/src/common.tex'],
    unit: 'chapter',
  },
  {
    id: 'probability',
    short: 'Probability',
    title: 'Probability From the Ground Up',
    subtitle: 'Chance, intuition, and the mathematics of uncertainty',
    main: 'books/probability/src/main.tex',
    root: 'books/probability',
    common: ['books/probability/src/common.tex'],
    unit: 'chapter',
  },
];
