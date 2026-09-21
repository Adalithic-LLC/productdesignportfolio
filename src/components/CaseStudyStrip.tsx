/**
 * The strip of feature case studies at the top of the Arcatext page.
 *
 * A row of images with their names beneath, wider than the page's text column
 * and scrolled sideways when it does not fit. The arrows appear only when
 * there is somewhere to go, and each disables itself at its end, so they never
 * offer a scroll that would do nothing.
 *
 * The items are a fixed width rather than a fraction of the row: that is what
 * makes overflow a property of the viewport rather than of the item count, so
 * the same markup handles seven items on a phone and on a wide desktop.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Editable } from '@/content/Editable';
import { EditableImage } from '@/content/EditableImage';

/** One item plus one gap, which is what an arrow press should advance by. */
const STEP = 160 + 32;


export function CaseStudyStrip({ count }: { count: number }) {
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
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className="w-40 shrink-0 snap-start">
            <div className="aspect-[3/4] overflow-hidden rounded-xl bg-muted transition-shadow duration-300 hover:shadow-[0_0_18px_8px_rgba(13,95,254,0.25)]">
              <EditableImage
                path={`arcatext.features.${i}.image`}
                alt=""
                className="h-full w-full object-cover"
                wrapperClassName="h-full w-full"
              />
            </div>
            <Editable
              as="h3"
              path={`arcatext.features.${i}.title`}
              className="mt-3 text-center text-sm font-medium leading-snug text-foreground"
            />
          </div>
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
      /* Sat against the images rather than the whole strip, whose height
         includes the names underneath -- centred on the strip it would ride
         low of the thing it scrolls.

         The right arrow sits inside the rail rather than outside it: the rail
         now runs to the viewport's edge, and anything beyond that is clipped
         by the page. The left one still has the gutter to sit in. */
      className={`absolute top-[38%] z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-border/60 bg-background/90 text-foreground shadow-sm backdrop-blur-sm transition-opacity duration-200 hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        side === 'left' ? '-left-4' : 'right-3'
      } ${disabled ? 'pointer-events-none opacity-0' : 'opacity-100'}`}
    >
      <Icon className="h-5 w-5" />
    </button>
  );
}
