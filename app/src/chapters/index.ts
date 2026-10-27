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

// Keyed by "<book>/<chapter key>".
export const chapters: Record<string, Placement[]> = {
  'proofs/20': ch20,
};
