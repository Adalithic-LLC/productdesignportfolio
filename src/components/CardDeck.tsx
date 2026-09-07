/**
 * A stack of screens being flipped through, like a hand of cards: every few
 * seconds the top card lifts, arcs out to the left and tucks in at the back,
 * letting the greyed card behind it come forward.
 *
 * Every card below the top sits at the identical back transform, so the card
 * travelling to the back lands exactly behind the new second card and is
 * occluded rather than having to fade out. In a two-card deck there is nothing
 * to hide behind -- the departing card *is* the new back card -- so it simply
 * greys over once it settles.
 *
 * Every card's screen stays painted; it is the grey plate on top that comes and
 * goes. Hiding the screens with opacity instead let Chromium drop their decoded
 * data while they sat at zero, so a promoted card painted its blank card body
 * for a frame before the image came back -- a visible flash on every turn. The
 * plate is instant on the way off and fades on the way back.
 *
 * Hovering holds the deck still -- the turn stops where it is, and the stack
 * takes up the same bob the tiles below it carry, so it reads as picked up
 * rather than frozen. Leaving settles the bob and starts the turn over.
 *
 * The motion itself lives in .deck-card in index.css.
 */
import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';

const BASE = import.meta.env.BASE_URL;

/** How long a card's trip to the back takes; must match the deck-flick keyframe. */
const FLICK_MS = 750;

export type DeckCard = { src: string; alt: string };

export function CardDeck({
  cards,
  width,
  height,
  cardClass,
  holdMs = 3000,
  onSelect,
}: {
  cards: DeckCard[];
  width: number;
  height: number;
  cardClass: string;
  holdMs?: number;
  onSelect: () => void;
}) {
  const [front, setFront] = useState(0);
  /** The card mid-flight to the back, if any. */
  const [leaving, setLeaving] = useState<number | null>(null);
  const [held, setHeld] = useState(false);
  const frontRef = useRef(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const count = cards.length;

  useEffect(() => {
    if (held) return;   // leaving starts the interval over, which is the intent
    const advance = () => {
      const going = frontRef.current;
      frontRef.current = (going + 1) % count;
      setLeaving(going);
      setFront(frontRef.current);
    };
    const turning = setInterval(advance, holdMs);
    return () => clearInterval(turning);
  }, [count, holdMs, held]);

  // The bob, only while held. Its cleanup kills the loop before the next run
  // settles it, so releasing eases back to rest rather than snapping.
  useEffect(() => {
    const el = boxRef.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!held) {
      gsap.to(el, { y: 0, duration: 0.4, ease: 'power3.out', overwrite: 'auto' });
      return;
    }
    const bob = gsap
      .timeline({ repeat: -1, defaults: { ease: 'sine.inOut' } })
      .to(el, { y: 9, duration: 1.05 })
      .to(el, { y: -9, duration: 2.1 })
      .to(el, { y: 0, duration: 1.05 });
    return () => bob.kill();
  }, [held]);

  useEffect(() => {
    if (leaving === null) return;
    const settled = setTimeout(() => setLeaving(null), FLICK_MS);
    return () => clearTimeout(settled);
  }, [leaving]);

  return (
    <div
      ref={boxRef}
      onMouseEnter={() => setHeld(true)}
      onMouseLeave={() => setHeld(false)}
      className="relative w-full"
      style={{ aspectRatio: `${width} / ${height}` }}
    >
      {cards.map((card, i) => {
        const isFront = (i - front + count) % count === 0;
        const isLeaving = leaving === i;
        const lit = isFront || isLeaving;
        return (
          <button
            key={card.src}
            type="button"
            onClick={onSelect}
            tabIndex={isFront ? 0 : -1}
            aria-hidden={!isFront}
            aria-label={`${card.alt} — see the projects`}
            className={[
              'deck-card absolute inset-[3%] overflow-hidden',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              cardClass,
              isFront ? 'deck-card--front' : 'pointer-events-none',
              isLeaving ? 'deck-card--leaving' : '',
            ].join(' ')}
          >
            <img
              src={`${BASE}hero-tiles/${card.src}`}
              alt=""
              width={width}
              height={height}
              decoding="sync"
              className="h-full w-full object-contain"
            />
            {/* The plain grey card the deck shows behind the live screen. */}
            <span
              aria-hidden
              className={`absolute inset-0 bg-neutral-300 transition-opacity ${lit ? 'opacity-0 duration-0' : 'opacity-100 duration-200'}`}
            />
          </button>
        );
      })}
    </div>
  );
}
