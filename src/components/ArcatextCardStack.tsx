/**
 * The Arcatext screens as a deck (see CardDeck for the motion).
 *
 * These are simulator captures of the shipped keyboard rather than the web
 * demos that stood in for it, so they carry the device's own status bar and go
 * edge to edge -- the card clips them to its corner radius instead of supplying
 * a page behind them, and the deck's card takes the phone's 1206x2622.
 */
import { CardDeck, type DeckCard } from '@/components/CardDeck';

const CARDS: DeckCard[] = [
  { src: 'arcatext-reword.webp', alt: 'Arcatext — checking a reword before it sends' },
  { src: 'arcatext-homographs.webp', alt: 'Arcatext — disambiguating "bank" and gendering "friends"' },
  { src: 'arcatext-analysis.webp', alt: 'Arcatext — the reword analysed word by word' },
  { src: 'arcatext-synonyms.webp', alt: 'Arcatext — synonym alternatives for a reworded phrase' },
  { src: 'arcatext-fix-words.webp', alt: 'Arcatext — picking a word to replace in the reword' },
  { src: 'arcatext-fix-words-edit.webp', alt: 'Arcatext — typing a replacement for a chosen word' },
  { src: 'arcatext-translate-received.webp', alt: 'Arcatext — translating a received message in place' },
  { src: 'arcatext-menu.webp', alt: 'Arcatext — the keyboard menu and language settings' },
];

export function ArcatextCardStack({ onSelect }: { onSelect: () => void }) {
  return (
    <CardDeck
      cards={CARDS}
      width={1206}
      height={2622}
      cardClass="rounded-[22px] bg-white ring-1 ring-black/5 shadow-[0_14px_34px_-16px_rgba(0,0,0,0.4)]"
      onSelect={onSelect}
    />
  );
}
