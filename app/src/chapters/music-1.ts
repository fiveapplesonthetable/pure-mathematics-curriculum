import type { Placement } from './index';

// Figures for music chapter 1. See index.ts for how refs work.
const placements: Placement[] = [
  {
    ref: 'the-seven-letter-names/6',
    where: 'replace',
    fig: 'music-keyboard-explorer',
    caption: 'Tap any key to hear it and see its name.',
  },
  {
    ref: 'trapbox-1',
    where: 'after',
    fig: 'music-step-counter',
    caption: 'Tap a starting key, then take half steps and whole steps.',
  },
  {
    ref: 'a-first-look-at-intervals/7',
    where: 'after',
    fig: 'music-interval-listener',
    caption: 'Tap two keys, or pick an interval, to count the half steps and hear it.',
  },
];

export default placements;
