/**
 * Timing for the hero's word-by-word reveal.
 *
 * These live apart from the component that runs them because the hero chains
 * two of those components -- the title, then the paragraph -- and the second
 * needs to know the first's pace to start where it leaves off.
 */

/** How long after mount the first block's reveal begins. */
export const REVEAL_START = 0.6;

/**
 * The reveal's pace. The stagger sets how fast the leading edge travels and
 * the duration how long a word takes to darken once it is reached, so both
 * have to move together to change the speed without changing the character of
 * it -- halving the speed means doubling each.
 */
export const REVEAL_STAGGER = 0.09;
export const REVEAL_DURATION = 1;

/** How much of the resting colour is left in a word that has not been read yet. */
export const FADED_ALPHA = 0.22;

/**
 * When the leading edge clears a block of `words`, which is when the next
 * block should pick it up. Chaining on the edge rather than on the last word
 * finishing keeps the sweep continuous: waiting for every word to finish
 * darkening would leave a visible gap between the title and the paragraph.
 */
export function afterLeadingEdge(words: number, delay = REVEAL_START): number {
  return delay + words * REVEAL_STAGGER;
}
