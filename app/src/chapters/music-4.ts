import type { Placement } from './index';

// Figures for music chapter 4. See index.ts for how refs work.
const placements: Placement[] = [
  {
    ref: 'tryitbox-1',
    where: 'after',
    fig: 'music-inversions',
    caption: 'Choose a chord and a position, and watch the bottom note move to the top.',
  },
  {
    ref: 'smooth-chord-changes-keep-the-shared-note-still/13',
    where: 'after',
    fig: 'music-voice-leading',
    caption: 'Play the same chords in root position, then smoothly, and compare how far the hand moves.',
  },
  {
    ref: 'the-pop-bounce/1',
    where: 'after',
    fig: 'music-accompaniment',
    caption: 'Choose a pattern and press Play to hear C, G, Am, F with both hands.',
  },
];

export default placements;
