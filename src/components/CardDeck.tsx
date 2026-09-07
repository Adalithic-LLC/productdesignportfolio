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
 * The motion itself lives in .deck-card in index.css.
 */
import { useEffect, useRef, useState } from 'react';

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
  const frontRef = useRef(0);
  const count = cards.length;

  useEffect(() => {
    const advance = () => {
      const going = frontRef.current;
      frontRef.current = (going + 1) % count;
      setLeaving(going);
      setFront(frontRef.current);
    };
    const turning = setInterval(advance, holdMs);
    return () => clearInterval(turning);
  }, [count, holdMs]);

  useEffect(() => {
    if (leaving === null) return;
    const settled = setTimeout(() => setLeaving(null), FLICK_MS);
    return () => clearTimeout(settled);
  }, [leaving]);

  return (
    <div className="relative w-full" style={{ aspectRatio: `${width} / ${height}` }}>
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
