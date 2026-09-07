/**
 * Lets a hero tile point at the work card it belongs to.
 *
 * The two live in sibling sections with no shared state between them, and the
 * signal is a one-off nudge rather than something either needs to hold, so it
 * travels as a window event instead of a store or a lifted prop.
 */
const EVENT = 'portfolio:highlight-project';

/** How long the card stays lit before it goes back to floating with the rest. */
export const HIGHLIGHT_MS = 6000;

/** @param title matched against the project's title, case-insensitively. */
export function requestProjectHighlight(title: string) {
  window.dispatchEvent(new CustomEvent(EVENT, { detail: title }));
}

export function onProjectHighlight(handler: (title: string) => void) {
  const listener = (e: Event) => handler((e as CustomEvent<string>).detail);
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
}
