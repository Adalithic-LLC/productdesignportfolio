/**
 * Timing for the hero's typing reveal.
 *
 * These live apart from the component that runs them because the hero chains
 * two of those components -- the title, then the paragraph -- and the second
 * needs to know when the first finishes typing to start where it leaves off.
 */

/** How long after mount the first block starts typing. */
export const REVEAL_START = 0.6;

/** Characters a second, when the content does not say otherwise. */
export const DEFAULT_TYPE_SPEED = 42;

/** The beat between one block finishing and the next starting. */
export const TYPE_GAP = 0.3;

const SPEED_RANGE = { min: 10, max: 160 } as const;

/** Read a stored speed, which is content and so arrives as a string. */
export function typeSpeed(value: string | number | undefined): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_TYPE_SPEED;
  return Math.min(SPEED_RANGE.max, Math.max(SPEED_RANGE.min, Math.round(n)));
}

export const SPEED_LIMITS = SPEED_RANGE;

/**
 * When a block of `chars` has finished typing and the next should pick it up.
 * The gap is a beat rather than nothing, so the two blocks read as one hand
 * typing twice instead of one continuous run-on.
 */
export function afterTyping(chars: number, speed: number, delay = REVEAL_START): number {
  return delay + chars / typeSpeed(speed) + TYPE_GAP;
}
