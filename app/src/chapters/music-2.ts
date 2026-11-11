import type { Placement } from './index';

// Figures for music chapter 2. See index.ts for how refs work.
const placements: Placement[] = [
  {
    ref: 'tryitbox-1',
    where: 'after',
    fig: 'music-scale-builder',
    caption: 'Tap a key to start there, choose a scale, and climb it one step at a time.',
  },
  {
    ref: 'the-circle-of-fifths/4',
    where: 'replace',
    fig: 'music-circle-of-fifths',
    caption: 'Tap a key on the circle to see its scale, its sharps or flats, and its relative minor.',
  },
];

export default placements;
