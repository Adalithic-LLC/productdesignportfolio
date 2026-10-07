/**
 * The Arcatext screens as a deck (see CardDeck for the motion).
 *
 * These are simulator captures of the shipped keyboard rather than the web
 * demos that stood in for it, so they carry the device's own status bar and go
 * edge to edge -- the card clips them instead of supplying a page behind them,
 * and takes the phone's 1206x2622.
 *
 * The capture is 402x874pt, an iPhone 16 Pro, whose display corners are 62pt --
 * 15.4% of the width. The simulator writes the screen out square, so that curve
 * only exists if the card supplies it: 36px at the 231px the card draws at.
 */
import { CardDeck, type DeckCard } from '@/components/CardDeck';
import { useTheme } from '@/hooks/useTheme';

/**
 * Each capture has a dark twin in hero-tiles/dark/, shown on the dark theme.
 * Those are the same captures recolored to the app's dark appearance — the
 * asset catalog's dark colorset values (cards #3B3B3B on #2B2B2B, keys #3B3B3B
 * on #161617, accent #7BA2FF / #3370FF) and iOS dark system colors for the
 * Messages chrome — not separate simulator runs.
 */
const dark = (src: string) => `dark/${src}`;

const KEYBOARD: DeckCard = {
  src: 'arcatext-keyboard.webp',
  darkSrc: dark('arcatext-keyboard.webp'),
  alt: 'Arcatext — the keyboard toolbar, with a message ready to reword',
};

/** Everything the keyboard can do, minus the toolbar shown beside the deck. */
const STATES: DeckCard[] = [
  { src: 'arcatext-reword.webp', darkSrc: dark('arcatext-reword.webp'), alt: 'Arcatext — checking a reword before it sends' },
  { src: 'arcatext-homographs.webp', darkSrc: dark('arcatext-homographs.webp'), alt: 'Arcatext — disambiguating "bank" and gendering "friends"' },
  { src: 'arcatext-analysis.webp', darkSrc: dark('arcatext-analysis.webp'), alt: 'Arcatext — the reword analysed word by word' },
  { src: 'arcatext-synonyms.webp', darkSrc: dark('arcatext-synonyms.webp'), alt: 'Arcatext — synonym alternatives for a reworded phrase' },
  { src: 'arcatext-fix-words.webp', darkSrc: dark('arcatext-fix-words.webp'), alt: 'Arcatext — picking a word to replace in the reword' },
  { src: 'arcatext-fix-words-edit.webp', darkSrc: dark('arcatext-fix-words-edit.webp'), alt: 'Arcatext — typing a replacement for a chosen word' },
  { src: 'arcatext-translate-received.webp', darkSrc: dark('arcatext-translate-received.webp'), alt: 'Arcatext — translating a received message in place' },
  { src: 'arcatext-menu.webp', darkSrc: dark('arcatext-menu.webp'), alt: 'Arcatext — the keyboard menu and language settings' },
  { src: 'arcatext-study-guide.webp', darkSrc: dark('arcatext-study-guide.webp'), alt: 'Arcatext — the study guide of saved words, phrases and expressions' },
];

/** Card styling the deck and the still share, so the pair reads as one set. */
const CARD = 'rounded-[36px] bg-white ring-1 ring-black/5 dark:bg-black dark:ring-white/10';
const SHADOW = 'shadow-[0_14px_34px_-16px_rgba(0,0,0,0.4)]';

/**
 * The toolbar, held still.
 *
 * It sits beside the deck rather than in it: it is the state the others are
 * reached from, so cycling past it read as one screen among ten instead of the
 * one you start at.
 */
export function ArcatextKeyboardStill({ onSelect }: { onSelect: () => void }) {
  const isDark = useTheme().resolvedTheme === 'dark';
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={`${KEYBOARD.alt} — see the projects`}
      className={`group block h-full w-full overflow-hidden ${CARD} ${SHADOW} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
    >
      <img
        src={`${import.meta.env.BASE_URL}hero-tiles/${isDark ? KEYBOARD.darkSrc : KEYBOARD.src}`}
        alt=""
        width={1206}
        height={2622}
        decoding="async"
        className="block h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
      />
    </button>
  );
}

export function ArcatextCardStack({ onSelect }: { onSelect: () => void }) {
  return (
    <CardDeck
      cards={STATES}
      width={1206}
      height={2622}
      cardClass={CARD}
      shadowClass={SHADOW}
      onSelect={onSelect}
    />
  );
}
