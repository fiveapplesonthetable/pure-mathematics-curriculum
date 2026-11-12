import type { Placement } from './index';

// Figures for music chapter 7 (first pieces). See index.ts for how refs work.
// One song player next to each piece; the n-th player starts on the n-th song.
const placements: Placement[] = [
  {
    ref: 'stage-2-chords/3',
    where: 'after',
    fig: 'music-song-player',
    caption: 'Press Play to hear Ode to Joy as the keys light up; slow it down, then try both hands.',
  },
  {
    ref: 'the-left-hand/4',
    where: 'after',
    fig: 'music-song-player',
    caption: 'Amazing Grace: right hand alone first, then both hands.',
  },
  {
    ref: 'two-patterns/2',
    where: 'after',
    fig: 'music-song-player',
    caption: 'Pattern 2 of the four-chord loop: press Both hands to add the roots.',
  },
];

export default placements;
