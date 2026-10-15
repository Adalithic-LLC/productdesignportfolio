/**
 * The Arcatext screens as a deck (see CardDeck for the motion), and the
 * keyboard held still beside it.
 *
 * Every card is drawn by the same renderer as the Arcatext page's playing
 * phones (ArcatextScreen → ArcatextKeyboard), held at one moment of a scene.
 * They used to be simulator captures with recolored dark twins, which went
 * stale as the app changed and showed recoloring seams in the dark theme;
 * drawn, they follow the app's current views, labels and colorsets, and the
 * dark theme is the app's own dark appearance.
 *
 * The cards keep the phone's proportions, 402x874pt (an iPhone 16 Pro), and
 * its display corners, 62pt -- 15.4% of the width, 36px at the 231px the card
 * draws at.
 *
 * One conversation runs through the set, as it did through the captures: a
 * Spanish message to a friend, checked before it sends, then their reply.
 */
import { CardDeck, type DeckCard } from '@/components/CardDeck';
import { ArcatextScreen } from '@/components/ArcatextScreen';
import type { Still } from '@/components/ArcatextKeyboard';
import type { OptionsConfig } from '@/components/ArcatextOptionsPage';
import type { StudyRow } from '@/components/ArcatextViews';

const ES = 'Conocí a tus amigos en el banco la semana pasada.';
const REPLY = '¿Oh, de verdad?';
const REPLY_EN = 'Oh, really?';

/** The Study Guide, filled from the same conversation. */
const STUDY_ROWS: StudyRow[] = [
  { entry: 'banco', translations: 'bank', sentence: ES, tag: 'Noun', misses: 2 },
  { entry: '¿Oh, de verdad?', translations: 'Oh, really?', sentence: REPLY, tag: 'Expression', misses: 1 },
  { entry: 'conocí', translations: 'I met', sentence: ES, tag: 'Verb', misses: 3 },
  { entry: 'la semana pasada', translations: 'last week', sentence: ES, tag: 'Phrase', misses: 1 },
  { entry: 'amigos', translations: 'friends', sentence: ES, tag: 'Noun', misses: 1 },
  { entry: 'orilla', translations: 'bank (of a river)', sentence: 'Nos sentamos en la orilla.', tag: 'Noun', misses: 2 },
];

/** Spanish on the Options page (LanguageData.swift: speaker and recipient
    gender and group chat, no script choice), with a translation copy. */
const SPANISH_OPTIONS: OptionsConfig = {
  language: 'Spanish',
  recipientGender: 'Male',
  groupChat: false,
  copy: { on: true, language: 'English' },
  keyboards: 2,
  speakerGender: 'Male',
};

/** The toolbar, mid-reply: what every other card is reached from. */
const KEYBOARD: Still = { sent: [ES], received: REPLY, text: 'I can meet you there.' };

const checking = (more: Still = {}): Still => ({ view: 'check', text: ES, ...more });

const card = (id: string, alt: string, still: Still): DeckCard => ({
  id,
  alt,
  screen: <ArcatextScreen still={still} />,
});

/** Everything the keyboard can do, minus the toolbar shown beside the deck. */
const STATES: DeckCard[] = [
  card('reword', 'Arcatext — checking a reword before it sends', checking()),
  card(
    'homographs',
    'Arcatext — disambiguating "bank" and gendering "friends"',
    checking({ check: { homographs: 'done', gender: 'done' }, checkAt: 'homographs' }),
  ),
  card('analysis', 'Arcatext — the reword analysed word by word', checking({ check: { analysis: 'done' }, checkAt: 'analysis' })),
  card('synonyms', 'Arcatext — synonym alternatives for a reworded phrase', checking({ check: { synonyms: 'done' }, checkAt: 'synonyms' })),
  card('fix-words', 'Arcatext — correcting what the reword should say', {
    view: 'fixWords',
    text: ES,
    fixWords: { text: 'I met your friends at the bank last night.', edited: true },
  }),
  card('translate-received', 'Arcatext — translating a received message in place', {
    view: 'paste',
    sent: [ES],
    received: REPLY,
    paste: { stage: 'done', original: REPLY, translation: REPLY_EN },
  }),
  card('options', 'Arcatext — the Reword options for Spanish', { view: 'options', text: ES, options: SPANISH_OPTIONS }),
  card('study-guide', 'Arcatext — the study guide of saved words, phrases and expressions', {
    view: 'study',
    sent: [ES],
    received: REPLY,
    study: { stage: 'rows', rows: STUDY_ROWS },
  }),
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
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      aria-label="Arcatext — the keyboard toolbar, with a reply being typed — see the projects"
      className={`group block h-full w-full cursor-pointer overflow-hidden ${CARD} ${SHADOW} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
    >
      <div className="h-full w-full transition-transform duration-500 group-hover:scale-[1.02]">
        <ArcatextScreen still={KEYBOARD} />
      </div>
    </div>
  );
}

export function ArcatextCardStack({ onSelect }: { onSelect: () => void }) {
  return (
    <CardDeck cards={STATES} width={402} height={874} cardClass={CARD} shadowClass={SHADOW} onSelect={onSelect} />
  );
}
