/**
 * The strip of feature case studies at the top of the Arcatext page.
 *
 * A row of cards built like the deeper case-study cards further down the page
 * -- number, arrow, name, question -- wider than the page's text column and
 * scrolled sideways when it does not fit. The arrows
 * appear only when there is somewhere to go, and each disables itself at its
 * end, so they never offer a scroll that would do nothing.
 *
 * The items are a fixed width rather than a fraction of the row: that is what
 * makes overflow a property of the viewport rather than of the item count, so
 * the same markup handles six items on a phone and on a wide desktop.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { Editable } from '@/content/Editable';

/** Card width, and one card plus one gap -- what an arrow press advances by.
    Wider than the images were: these hold a sentence, and 160px of prose is
    three words a line. */
const CARD = 240;
const GAP = 32;
const STEP = CARD + GAP;


/* Each card carries the feature's own index, not its place in the row: the
   titles and bodies are read from the content store by index, so a row that
   leaves a hidden case study out would otherwise label every later card with
   the wrong feature's words. */
export function CaseStudyStrip({ items }: { items: { slug: string; index: number }[] }) {
  const rail = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(true);

  const measure = useCallback(() => {
    const el = rail.current;
    if (!el) return;
    const slack = el.scrollWidth - el.clientWidth;
    setAtStart(el.scrollLeft <= 1);
    // A pixel of tolerance: fractional layout widths mean the end is rarely
    // reached exactly, and an arrow that never disables looks broken.
    setAtEnd(el.scrollLeft >= slack - 1);
  }, []);

  useEffect(() => {
    measure();
    const el = rail.current;
    if (!el) return;
    const watch = new ResizeObserver(measure);
    watch.observe(el);
    return () => watch.disconnect();
  }, [measure]);

  const step = (direction: 1 | -1) => {
    rail.current?.scrollBy({ left: direction * STEP * 2, behavior: 'smooth' });
  };

  const scrollable = !atStart || !atEnd;

  return (
    <div className="relative">
      <div
        ref={rail}
        data-feature-row
        onScroll={measure}
        /* The 28px of padding is room for the hover glow (18px blur plus 8px
           spread) inside the scroll box. `overflow-x: auto` is not
           one-dimensional -- the vertical axis stops being `visible` along
           with it -- so without this the rail clips the glow off flat, top
           and bottom. The matching negative margins take the same amount back
           off the layout so nothing around the rail moves.
           
           The right side is padded but not pulled back in: the rail already
           runs off the side of the page, so that padding is scroll runway for
           the last item's glow rather than anything seen. `scroll-pl-7` keeps
           snapping aligned to the padded edge instead of 28px left of it. */
        className="-my-7 -ml-7 flex snap-x scroll-pl-7 gap-8 overflow-x-auto px-7 py-7 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map(({ slug, index }, i) => (
          /* A min-height rather than a fixed aspect: the cards are as tall as
             the longest body among them, so the row stays even without any
             one of them clipping its own copy. */
          <a
            key={i}
            href={`#/arcatext/${slug}`}
            style={{ width: CARD }}
            className="flex min-h-44 shrink-0 snap-start flex-col rounded-xl bg-muted/40 p-5 transition-shadow duration-300 hover:shadow-[0_0_18px_8px_rgba(13,95,254,0.25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {/* Same parts, in the same order, as the deeper case-study cards
                lower down the page -- number, arrow, name, question -- at the
                smaller type this strip's width allows. The number is the
                card's position rather than content: the strip is generated
                from the feature list, so there is nothing to keep in step. */}
            <div className="flex items-start justify-between gap-3">
              <span className="font-mono text-[11px] text-primary/70">
                Case {String(i + 1).padStart(2, '0')}
              </span>
              <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            </div>
            <Editable
              as="h3"
              path={`arcatext.features.${index}.title`}
              className="mb-2 mt-2 text-base font-semibold leading-snug text-foreground"
            />
            <Editable
              as="p"
              path={`arcatext.features.${index}.body`}
              multiline
              className="text-sm italic leading-relaxed text-muted-foreground"
            />
          </a>
        ))}
      </div>

      {scrollable && (
        <>
          <Arrow side="left" onClick={() => step(-1)} disabled={atStart} />
          <Arrow side="right" onClick={() => step(1)} disabled={atEnd} />
        </>
      )}
    </div>
  );
}

function Arrow({
  side,
  onClick,
  disabled,
}: {
  side: 'left' | 'right';
  onClick: () => void;
  disabled: boolean;
}) {
  const Icon = side === 'left' ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={side === 'left' ? 'Scroll left' : 'Scroll right'}
      /* Centred on the strip: the names now sit inside the cards, so the
         strip's height is the cards' height and nothing hangs below them to
         pull the arrows off centre.

         The right arrow sits inside the rail rather than outside it: the rail
         now runs to the viewport's edge, and anything beyond that is clipped
         by the page. The left one still has the gutter to sit in. */
      className={`absolute top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-border/60 bg-background/90 text-foreground shadow-sm backdrop-blur-sm transition-opacity duration-200 hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        side === 'left' ? '-left-4' : 'right-3'
      } ${disabled ? 'pointer-events-none opacity-0' : 'opacity-100'}`}
    >
      <Icon className="h-5 w-5" />
    </button>
  );
}
