/**
 * The Arcatext screens as a deck (see CardDeck for the motion).
 *
 * The captures carry their own transparency, so the white card underneath is
 * what gives each screen its page -- the same white the demos were drawn
 * against, now supplied by the deck rather than baked into the file.
 */
import { CardDeck, type DeckCard } from '@/components/CardDeck';

const CARDS: DeckCard[] = [
  { src: 'reword.webp', alt: 'Arcatext — the keyboard toolbar, rewording a message' },
  { src: 'homographs.webp', alt: 'Arcatext — checking a homograph before sending' },
  { src: 'paste-view.webp', alt: 'Arcatext — translating a received message in place' },
  { src: 'reverse-translation.webp', alt: 'Arcatext — reverse translation, to confirm intent' },
  { src: 'reword-options.webp', alt: 'Arcatext — recipient gender and script options' },
  { src: 'synonyms.webp', alt: 'Arcatext — synonym alternatives for a reworded phrase' },
  { src: 'send-copy.webp', alt: 'Arcatext — sending a copy in a second language' },
];

export function ArcatextCardStack({ onSelect }: { onSelect: () => void }) {
  return (
    <CardDeck
      cards={CARDS}
      width={700}
      height={894}
      cardClass="rounded-[20px] bg-white ring-1 ring-black/5 shadow-[0_14px_34px_-16px_rgba(0,0,0,0.4)]"
      onSelect={onSelect}
    />
  );
}
