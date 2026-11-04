/**
 * The Arcatext page's case studies: one card that holds them, and the modal
 * they come out into.
 *
 * The page opens with the product running, not with a list of links, so the
 * case studies are folded into a single card -- mini cards in a 2 × 2, the
 * same number, name and order they have when they are out. The card sits
 * above the section nav, where the page's other navigation lives, and clicking
 * it sends them out into the middle of the window.
 *
 * A modal rather than a row in the page, because the card is reachable from
 * anywhere: the rail holding it is fixed, so it can be clicked halfway down
 * the page, and a row that opened under the header would then be somewhere the
 * reader is not. Centred on the viewport, they arrive where the click was.
 *
 * The flight is a FLIP: the cards are laid out where they will end up, each is
 * then transformed back onto the card that holds them -- the same offset and
 * the same scale -- and released a beat apart, so they read as coming out of
 * it rather than appearing near it. Closing runs it backwards, from the far
 * end in, and the overlay goes once the last card is home.
 *
 * The trigger is rendered twice: in the fixed rail from 1600px, where the rail
 * exists, and inline under the header below that. Whichever one is on screen
 * is the one the cards fly from.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, ChevronRight, X } from 'lucide-react';
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
 * The case studies, in the middle of the window.
 *
 * It is mounted only while it is wanted, and stays mounted through the closing
 * flight: the cards have to be laid out to be measured, and they have to still
 * be there to fly home.
 */
export function CaseStudyModal({
  items,
  open,
  onClose,
}: {
  items: CaseStudyItem[];
  open: boolean;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(open);
  const row = useRef<HTMLDivElement>(null);
  const chrome = useRef<HTMLDivElement>(null);
  const veil = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) setMounted(true);
  }, [open]);

  /** Everything but the cards: the backdrop, the title and the close button. */
  const fade = useCallback((to: number, delay = 0) => {
    [veil.current, chrome.current].forEach((el) => {
      if (!el) return;
      el.style.transition = `opacity ${(DURATION * 0.6).toFixed(2)}s ease-out ${delay}s`;
      el.style.opacity = String(to);
    });
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const rail = row.current;
    if (!rail) return;
    const cards = Array.from(rail.querySelectorAll<HTMLElement>('[data-genie-card]'));
    const timers: number[] = [];
    const after = (seconds: number, fn: () => void) =>
      timers.push(window.setTimeout(fn, seconds * 1000));

    const settle = () => {
      cards.forEach((card) => {
        card.style.transition = '';
        card.style.transform = '';
        card.style.opacity = '';
      });
    };

    if (reduceMotion()) {
      settle();
      fade(open ? 1 : 0);
      if (!open) after(0.05, () => setMounted(false));
      return () => timers.forEach(clearTimeout);
    }

    const origin = originRect();
    const places = cards.map((card) => card.getBoundingClientRect());

    if (open) {
      cards.forEach((card, i) => {
        card.style.transition = 'none';
        card.style.transform = origin ? onto(origin, places[i]) : 'scale(0.6)';
        card.style.opacity = '0';
      });
      void rail.offsetHeight;
      fade(1);
      cards.forEach((card, i) => {
        const delay = i * STAGGER;
        card.style.transition =
          `transform ${DURATION}s ${EASE} ${delay}s, ` +
          `opacity ${(DURATION * 0.5).toFixed(2)}s ease-out ${delay}s`;
        card.style.transform = '';
        card.style.opacity = '';
      });
      after(DURATION + (cards.length - 1) * STAGGER + 0.05, settle);
      return () => timers.forEach(clearTimeout);
    }

    // Last out, first back, and the overlay goes with the last of them.
    cards.forEach((card, i) => {
      const delay = (cards.length - 1 - i) * STAGGER;
      card.style.transition =
        `transform ${DURATION}s ${EASE} ${delay}s, ` +
        `opacity ${(DURATION * 0.6).toFixed(2)}s ease-in ${delay}s`;
      card.style.transform = origin ? onto(origin, places[i]) : 'scale(0.6)';
      card.style.opacity = '0';
    });
    fade(0, DURATION * 0.35);
    after(DURATION * 1.1 + (cards.length - 1) * STAGGER + 0.05, () => setMounted(false));
    return () => timers.forEach(clearTimeout);
  }, [mounted, open, fade]);

  /* Escape closes it, and the page behind it stays put: the scrollbar's width
     is handed back as padding so nothing shifts under the overlay. */
  useEffect(() => {
    if (!mounted) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const gap = window.innerWidth - document.documentElement.clientWidth;
    const { overflow, paddingRight } = document.body.style;
    document.body.style.overflow = 'hidden';
    if (gap > 0) document.body.style.paddingRight = `${gap}px`;
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      document.body.style.paddingRight = paddingRight;
    };
  }, [mounted, onClose]);

  if (!mounted) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Case studies"
      /* Anywhere outside the cards closes it. The handler is here rather than
         on the backdrop because the centring wrapper covers the backdrop, so
         a click near the edge of the window never reaches it. */
      onClick={onClose}
      className="fixed inset-0 z-[80] overflow-y-auto overscroll-contain"
    >
      <div ref={veil} style={{ opacity: 0 }} className="fixed inset-0 bg-background/80 backdrop-blur-md" />
      {/* min-h-full with the items centred: centred on the window when they
          fit, scrolled from the top when they do not. */}
      <div className="relative flex min-h-full items-center justify-center p-5 sm:p-8">
        <div className="w-full max-w-[1340px]" onClick={(e) => e.stopPropagation()}>
          <div ref={chrome} style={{ opacity: 0 }} className="mb-5 flex items-center justify-between gap-4">
            <Editable
              as="span"
              path="arcatext.featuresTitle"
              className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground"
            />
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="grid h-9 w-9 place-items-center rounded-full border border-border/60 bg-background/80 text-foreground/70 transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div ref={row} className="flex flex-wrap justify-center gap-5">
            {items.map(({ slug, index }, i) => (
              <a
                key={index}
                data-genie-card
                href={`#/arcatext/${slug}`}
                onClick={onClose}
                style={{ width: CARD, transformOrigin: 'top left' }}
                className="flex min-h-44 shrink-0 flex-col rounded-xl border border-border/50 bg-card/90 p-5 shadow-lg backdrop-blur transition-shadow duration-300 hover:shadow-[0_0_18px_8px_rgba(13,95,254,0.25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
      </div>
    </div>,
    document.body
  );
}
