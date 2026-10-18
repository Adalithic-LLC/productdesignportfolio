/**
 * The Arcatext page's case studies: one card that holds them, and the row they
 * come out into.
 *
 * The page opens with the product running, not with a list of links, so the
 * four case studies are folded into a single card -- four mini cards in a
 * 2 × 2, the same number, name and order they have when they are out. The card
 * sits above the section nav, where the page's other navigation lives, and
 * clicking it sends them out into a row under the page header, above the
 * keyboards.
 *
 * The flight is a FLIP: the row is laid out where it will end up, each card is
 * then transformed back onto the card that holds them -- the same offset and
 * the same scale -- and released a beat apart, so they read as coming out of
 * it rather than appearing near it. Closing runs it backwards, and the row
 * gives its height back once the last card is home.
 *
 * The trigger is rendered twice: in the fixed rail from 1600px, where the rail
 * exists, and inline under the header below that. Whichever one is on screen
 * is the one the cards fly from.
 */
import { useEffect, useRef } from 'react';
import { ArrowRight, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Editable } from '@/content/Editable';
import { useContent } from '@/content/ContentContext';

export interface CaseStudyItem {
  slug: string;
  /** The feature's own index in the content store, not its place in the row. */
  index: number;
}

/** Card width in the row, and the gap between them. */
const CARD = 240;

const DURATION = 0.52;
const STAGGER = 0.07;
const EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';

const reduceMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** The trigger that is actually on screen — the rail's, or the inline one. */
function originRect(): DOMRect | null {
  const triggers = Array.from(document.querySelectorAll<HTMLElement>('[data-genie-origin]'));
  const shown = triggers.find((el) => el.getBoundingClientRect().width > 0);
  return shown ? shown.getBoundingClientRect() : null;
}

/** The transform that lays a card exactly over the card it came out of. */
function onto(origin: DOMRect, card: DOMRect): string {
  const sx = Math.max(0.1, origin.width / Math.max(1, card.width));
  const sy = Math.max(0.1, origin.height / Math.max(1, card.height));
  return `translate(${origin.left - card.left}px, ${origin.top - card.top}px) scale(${sx.toFixed(4)}, ${sy.toFixed(4)})`;
}

/**
 * The folded card: the four case studies as mini cards, in the order they come
 * out in. No images — the same parts as the cards themselves, at the size a
 * navigation rail allows.
 */
export function CaseStudyCard({
  items,
  open,
  onToggle,
  className,
}: {
  items: CaseStudyItem[];
  open: boolean;
  onToggle: () => void;
  className?: string;
}) {
  const { content } = useContent();
  return (
    <button
      type="button"
      data-genie-origin
      aria-expanded={open}
      onClick={onToggle}
      className={cn(
        'group block w-[196px] rounded-xl border border-border/60 bg-card/80 p-3 text-left shadow-sm backdrop-blur transition-shadow duration-300',
        'hover:shadow-[0_0_18px_6px_rgba(13,95,254,0.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        open && 'border-primary/40',
        className
      )}
    >
      <span className="mb-2 flex items-center justify-between gap-2">
        <Editable
          as="span"
          path="arcatext.featuresTitle"
          className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground"
        />
        <ChevronRight
          className={cn(
            'h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-300',
            open && 'rotate-90 text-primary'
          )}
        />
      </span>
      <span className="grid grid-cols-2 gap-1.5">
        {items.map(({ index }, i) => (
          <span
            key={index}
            className="flex min-h-[42px] flex-col justify-between rounded-md bg-muted/60 px-2 py-1.5 transition-colors group-hover:bg-muted"
          >
            <span className="font-mono text-[9px] leading-none text-primary/70">
              {String(i + 1).padStart(2, '0')}
            </span>
            <span className="truncate text-[10px] font-medium leading-tight text-foreground">
              {content.arcatext.features[index]?.title ?? ''}
            </span>
          </span>
        ))}
      </span>
    </button>
  );
}

/**
 * The row the case studies fly out into. Always rendered -- the flight needs
 * them laid out to measure -- but it keeps no height and takes no clicks or
 * tab stops until it is open.
 */
export function CaseStudyRow({ items, open }: { items: CaseStudyItem[]; open: boolean }) {
  const wrap = useRef<HTMLDivElement>(null);
  const row = useRef<HTMLDivElement>(null);
  /* The first pass only sets the closed state; there is nothing to fly from
     before anyone has asked for it. */
  const settled = useRef(false);

  useEffect(() => {
    const box = wrap.current;
    const rail = row.current;
    if (!box || !rail) return;
    const cards = Array.from(rail.querySelectorAll<HTMLElement>('[data-genie-card]'));
    const timers: number[] = [];
    const after = (seconds: number, fn: () => void) =>
      timers.push(window.setTimeout(fn, seconds * 1000));

    const settle = () => {
      box.style.transition = '';
      box.style.maxHeight = open ? '' : '0px';
      cards.forEach((card) => {
        card.style.transition = '';
        card.style.transform = '';
        card.style.opacity = '';
      });
    };

    const first = !settled.current;
    settled.current = true;
    if (first || reduceMotion()) {
      settle();
      return;
    }

    const origin = originRect();

    if (open) {
      // Measured open, then put back: the row's own height and each card's
      // place are what the flight is interpolating between.
      box.style.transition = '';
      box.style.maxHeight = '';
      const height = box.scrollHeight;
      const places = cards.map((card) => card.getBoundingClientRect());
      box.style.maxHeight = '0px';
      cards.forEach((card, i) => {
        card.style.transition = 'none';
        card.style.transform = origin ? onto(origin, places[i]) : 'scale(0.6)';
        card.style.opacity = '0';
      });
      void box.offsetHeight;

      box.style.transition = `max-height ${DURATION}s ${EASE}`;
      box.style.maxHeight = `${height}px`;
      cards.forEach((card, i) => {
        const delay = i * STAGGER;
        card.style.transition =
          `transform ${DURATION}s ${EASE} ${delay}s, ` +
          `opacity ${(DURATION * 0.5).toFixed(2)}s ease-out ${delay}s`;
        card.style.transform = '';
        card.style.opacity = '';
      });
      // Height back to auto once they are out, so the row reflows with the page.
      after(DURATION + (cards.length - 1) * STAGGER + 0.05, settle);
      return;
    }

    const height = box.scrollHeight;
    const places = cards.map((card) => card.getBoundingClientRect());
    box.style.transition = '';
    box.style.maxHeight = `${height}px`;
    void box.offsetHeight;

    cards.forEach((card, i) => {
      // Last out, first back: the row empties from its far end inwards.
      const delay = (cards.length - 1 - i) * STAGGER;
      card.style.transition =
        `transform ${DURATION}s ${EASE} ${delay}s, ` +
        `opacity ${(DURATION * 0.6).toFixed(2)}s ease-in ${delay}s`;
      card.style.transform = origin ? onto(origin, places[i]) : 'scale(0.6)';
      card.style.opacity = '0';
    });
    /* The height goes last. Collapsing it while they are still in the air
       would pull the page up from under them. */
    box.style.transition = `max-height ${DURATION}s ${EASE} ${(DURATION * 0.45).toFixed(2)}s`;
    box.style.maxHeight = '0px';
    after(DURATION * 1.45 + (cards.length - 1) * STAGGER + 0.05, settle);

    return () => timers.forEach(clearTimeout);
  }, [open]);

  return (
    <div
      ref={wrap}
      aria-hidden={!open}
      className={cn('overflow-hidden', !open && 'pointer-events-none')}
      style={{ maxHeight: 0 }}
    >
      {/* The row's own spacing lives in here, inside what collapses: the
          section around it keeps none, so closed it takes no room at all. */}
      <div ref={row} className="flex flex-wrap gap-6 pb-10 pt-2">
        {items.map(({ slug, index }, i) => (
          <a
            key={index}
            data-genie-card
            href={`#/arcatext/${slug}`}
            tabIndex={open ? undefined : -1}
            style={{ width: CARD, transformOrigin: 'top left' }}
            className="flex min-h-44 shrink-0 flex-col rounded-xl bg-muted/40 p-5 transition-shadow duration-300 hover:shadow-[0_0_18px_8px_rgba(13,95,254,0.25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {/* The same parts, in the same order, as the deeper case-study
                cards further down the page: number, arrow, name, question. */}
            <span className="flex items-start justify-between gap-3">
              <span className="font-mono text-[11px] text-primary/70">
                Case {String(i + 1).padStart(2, '0')}
              </span>
              <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            </span>
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
    </div>
  );
}
