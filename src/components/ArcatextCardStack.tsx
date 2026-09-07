/**
 * The Arcatext screens as a deck being flipped through: every few seconds the
 * top card lifts, arcs out to the left and tucks in at the back of the stack,
 * letting the greyed card behind it come forward.
 *
 * The captures carry their own transparency, so the white card underneath is
 * what gives each screen its page -- the same white the demos were drawn
 * against, now supplied by the deck rather than baked into the file.
 *
 * Every card below the top one sits at the identical back transform, so the
 * card travelling to the back lands exactly behind the new second card and is
 * occluded rather than having to fade out.
 */
import { useEffect, useRef, useState } from 'react';

const BASE = import.meta.env.BASE_URL;

/** How long a card holds the top, and how long its trip to the back takes. */
const HOLD_MS = 3000;
const FLICK_MS = 750;

type Card = { src: string; alt: string };

const DECK: Card[] = [
  { src: 'reword.webp', alt: 'Arcatext — the keyboard toolbar, rewording a message' },
  { src: 'homographs.webp', alt: 'Arcatext — checking a homograph before sending' },
  { src: 'paste-view.webp', alt: 'Arcatext — translating a received message in place' },
  { src: 'reverse-translation.webp', alt: 'Arcatext — reverse translation, to confirm intent' },
  { src: 'reword-options.webp', alt: 'Arcatext — recipient gender and script options' },
  { src: 'synonyms.webp', alt: 'Arcatext — synonym alternatives for a reworded phrase' },
  { src: 'send-copy.webp', alt: 'Arcatext — sending a copy in a second language' },
];

export function ArcatextCardStack({ onSelect }: { onSelect: () => void }) {
  const [front, setFront] = useState(0);
  /** The card mid-flight to the back, if any. */
  const [leaving, setLeaving] = useState<number | null>(null);
  const frontRef = useRef(0);

  useEffect(() => {
    const tick = setInterval(() => {
      const going = frontRef.current;
      frontRef.current = (going + 1) % DECK.length;
      setLeaving(going);
      setFront(frontRef.current);
    }, HOLD_MS);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    if (leaving === null) return;
    const settled = setTimeout(() => setLeaving(null), FLICK_MS);
    return () => clearTimeout(settled);
  }, [leaving]);

  return (
    <div className="relative w-full" style={{ aspectRatio: '700 / 894' }}>
      {DECK.map((card, i) => {
        const isFront = (i - front + DECK.length) % DECK.length === 0;
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
              'deck-card absolute inset-[3%] overflow-hidden rounded-[20px] bg-white',
              'ring-1 ring-black/5 shadow-[0_14px_34px_-16px_rgba(0,0,0,0.4)]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              isFront ? 'deck-card--front' : 'pointer-events-none',
              isLeaving ? 'deck-card--leaving' : '',
            ].join(' ')}
          >
            <img
              src={`${BASE}hero-tiles/${card.src}`}
              alt=""
              width={700}
              height={894}
              decoding="async"
              className={`h-full w-full object-contain transition-opacity duration-500 ${lit ? 'opacity-100' : 'opacity-0'}`}
            />
            {/* The plain grey card the deck shows behind the live screen. */}
            <span
              aria-hidden
              className={`absolute inset-0 bg-neutral-300 transition-opacity duration-500 ${lit ? 'opacity-0' : 'opacity-100'}`}
            />
          </button>
        );
      })}
    </div>
  );
}
