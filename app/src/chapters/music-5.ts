import type { Placement } from './index';

// Figures for music chapter 5 (rhythm). See index.ts for how refs work.
const placements: Placement[] = [
  {
    ref: 'trapbox-1',
    where: 'after',
    fig: 'music-note-lengths',
    caption: 'Tap a note or a rest to hear it against four steady clicks.',
  },
  {
    ref: 'tryitbox-2',
    where: 'after',
    fig: 'music-rhythm',
    caption: 'Choose a rhythm and press Play to hear it over a steady click.',
  },
];

export default placements;
