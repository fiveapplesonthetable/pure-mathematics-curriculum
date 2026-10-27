// Where each chapter's figures go.
//
// `ref` names a block produced by scripts/build-content.mjs: an environment
// such as "definition-1" or "proof-2" (counted within the chapter), or a
// subsection slug such as "plain-english" (the heading block), or the k-th
// block after a heading such as "plain-english/1" ("intro/1" before the
// first heading). `where` is
// before, after, or replace (replace swaps the block for the figure, e.g. a
// proof shown as a stepper; the figure must then carry the full text).
// `fig` is a module in src/figures/. Captions are one short sentence.

export interface Placement {
  ref: string;
  where: 'before' | 'after' | 'replace';
  fig: string;
  caption?: string;
}

import ch20 from './ch20';
import calculus10 from './calculus-10';
import calculus20 from './calculus-20';
import calculus21 from './calculus-21';
import calculus30 from './calculus-30';
import linearAlgebra21 from './linear-algebra-21';
import linearAlgebra3 from './linear-algebra-3';
import linearAlgebra5 from './linear-algebra-5';
import probability12 from './probability-12';
import probability20 from './probability-20';
import probability21 from './probability-21';
import probability5 from './probability-5';
import linearAlgebra23 from './linear-algebra-23';

// Keyed by "<book>/<chapter key>".
export const chapters: Record<string, Placement[]> = {
  'calculus/10': calculus10,
  'proofs/20': ch20,
  'calculus/20': calculus20,
  'calculus/21': calculus21,
  'calculus/30': calculus30,
  'linear-algebra/21': linearAlgebra21,
  'linear-algebra/3': linearAlgebra3,
  'linear-algebra/5': linearAlgebra5,
  'linear-algebra/23': linearAlgebra23,
  'probability/12': probability12,
  'probability/20': probability20,
  'probability/21': probability21,
  'probability/5': probability5,
};
