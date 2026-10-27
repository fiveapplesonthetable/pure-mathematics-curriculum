import type { Placement } from './index';

// Chapter 20, Real Analysis Preview: Epsilon as a Contract.
const ch20: Placement[] = [
  {
    ref: 'definition-1',
    where: 'after',
    fig: 'epsilon-band',
    caption: 'Drag the band narrower. The first index after which every term stays inside is the N that works for this ε.',
  },
  {
    ref: 'plain-english/1',
    where: 'after',
    fig: 'no-limit',
    caption: 'A sequence that never settles. Move the candidate limit L and the tolerance: once ε is small, terms keep escaping however far you go.',
  },
  {
    ref: 'who-chooses-what/1',
    where: 'after',
    fig: 'contract-game',
    caption: 'The contract, one move at a time: the challenger picks ε, you answer with N, then the challenger tests any n ≥ N.',
  },
  {
    ref: 'proof-1',
    where: 'replace',
    fig: 'proof-one-over-n',
    caption: 'The proof line by line. The picture follows the current line.',
  },
  {
    ref: 'proof-1',
    where: 'after',
    fig: 'n-of-eps',
    caption: 'N is a function of ε. Halve the tolerance and the required N roughly doubles.',
  },
  {
    ref: 'definition-2',
    where: 'after',
    fig: 'epsilon-delta',
    caption: 'The same contract for functions. The challenger sets the height of the ε band around f(c); you choose a δ window around c that keeps the graph inside.',
  },
  {
    ref: 'proof-2',
    where: 'replace',
    fig: 'proof-linear',
    caption: 'The proof line by line, with δ = ε/3 drawn on the graph.',
  },
  {
    ref: 'why-analysis-is-proof-training/1',
    where: 'after',
    fig: 'delta-depends-on-c',
    caption: 'For f(x) = x², keep ε fixed and move c. The steeper the graph, the narrower the δ that works: δ depends on c.',
  },
];

export default ch20;
