import type { Placement } from './index';

// Figures for music chapter 3. See index.ts for how refs work.
const placements: Placement[] = [
  {
    ref: 'tryitbox-1',
    where: 'after',
    fig: 'music-chord-builder',
    caption: 'Tap a key to build a chord on it, then switch between major and minor.',
  },
  {
    ref: 'famous-chord-progressions/5',
    where: 'after',
    fig: 'music-key-chords',
    caption: 'Choose a key to see its seven chords, then play a progression in that key.',
  },
];

export default placements;
