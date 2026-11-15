import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';

/**
 * Widens a block to the right, out of the column it sits in and across the
 * rest of the page.
 *
 * Its left edge stays on the content column. Everything above and below a wide
 * block is read down that edge, and a block that starts to the left of it
 * reads as misaligned rather than as deliberately wider -- so only the right
 * margin is pulled out.
 *
 * The usual CSS-only trick -- `margin-inline: calc(50% - 50vw)` -- assumes the
 * column is centred in the window. Plenty are not: prose sets a max width and
 * stays left-aligned, so that margin lands the block off to one side. This
 * measures the parent's content box instead and pulls the margin out by the
 * gap actually there, which holds wherever the block is nested.
 *
 * It also avoids `100vw`, which counts a scrollbar the page may be showing and
 * so overshoots by its width.
 *
 * The CSS class keeps a centred-column margin as the pre-measurement fallback,
 * so a block starts close to right and is corrected on layout rather than
 * visibly jumping out from nothing.
 */
export function useFullBleed(active: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<CSSProperties>({});

  const measure = useCallback(() => {
    const el = ref.current;
    const parent = el?.parentElement;
    if (!el || !parent) return;

    /* The parent's content box is where this block would sit with no margins
       of its own, and negative margins on a child do not move it. */
    const box = parent.getBoundingClientRect();
    const cs = getComputedStyle(parent);
    const right = box.right - parseFloat(cs.borderRightWidth) - parseFloat(cs.paddingRight);
    const page = document.documentElement.clientWidth;

    setStyle((prev) => {
      /* Left stays put; the block grows into whatever page is left of the
         column's right edge. */
      const next: CSSProperties = { marginRight: -(page - right) };
      if (prev.marginRight === next.marginRight) return prev;
      return next;
    });
  }, []);

  useEffect(() => {
    if (!active) {
      setStyle((prev) => (Object.keys(prev).length ? {} : prev));
      return;
    }
    measure();
    const parent = ref.current?.parentElement;
    const ro = new ResizeObserver(measure);
    if (parent) ro.observe(parent);
    ro.observe(document.documentElement);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [active, measure]);

  return { ref, style };
}
