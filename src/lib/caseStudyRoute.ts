/**
 * Where the Arcatext case study pages live, and how a route resolves to one.
 *
 * Its own module because the router needs the lookup before it decides what to
 * render, and the page itself is a component — keeping both in one file trips
 * fast refresh, which only works when a file exports components alone.
 */

/** The route prefix these pages sit under: `#/arcatext/<slug>`. */
export const CASE_STUDY_ROUTE = 'arcatext/';

/**
 * The feature a route points at, or -1 when it names none — which is what
 * makes an unknown `#/arcatext/<typo>` fall through to the home page instead
 * of rendering an empty shell.
 */
export function caseStudyIndex(route: string, slugs: string[]): number {
  if (!route.startsWith(CASE_STUDY_ROUTE)) return -1;
  return slugs.indexOf(route.slice(CASE_STUDY_ROUTE.length));
}
