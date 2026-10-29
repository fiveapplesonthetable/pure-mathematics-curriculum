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
    ref: 'when-the-contract-breaks-proving-divergence/9',
    where: 'after',
    fig: 'no-limit',
    caption: 'A sequence that never settles. Move the candidate limit L and the tolerance: once ε is small, terms keep escaping however far you go.',
  },
  {
    ref: 'understanding-the-quantifiers/3',
    where: 'after',
    fig: 'contract-game',
    caption: 'Play the contract one move at a time: pick ε, answer with N, and test whether any n ≥ N stays inside.',
  },
  {
    ref: 'proof-1',
    where: 'replace',
    fig: 'proof-one-over-n',
    caption: 'Step through the proof line by line: the picture follows each line and highlights the working N.',
  },
  {
    ref: 'proof-1',
    where: 'after',
    fig: 'n-of-eps',
    caption: 'Drag ε or click “Halve ε”: as the tolerance tightens, the required N roughly doubles.',
  },
  {
    ref: 'definition-2',
    where: 'after',
    fig: 'epsilon-delta',
    caption: 'Adjust ε and c, then drag δ or click “Use δ = ε/3” to keep the graph inside the target box.',
  },
  {
    ref: 'proof-2',
    where: 'replace',
    fig: 'proof-linear',
    caption: 'Step through the proof line by line: see how δ = ε/3 keeps the graph inside the target box.',
  },
  {
    ref: 'non-linear-functions-and-provisional-bounds/9',
    where: 'after',
    fig: 'delta-depends-on-c',
    caption: 'For f(x) = x², keep ε fixed and move c. The steeper the graph, the narrower the δ that works: δ depends on c.',
  },
];

export default ch20;
