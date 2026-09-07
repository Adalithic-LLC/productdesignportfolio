/**
 * A loose collage of real product UI, sitting beside the hero intro.
 *
 * Every tile is a shipped screen: the Arcatext feature demos as they run on
 * adalithic.com (captured from the live components, not the older App Store
 * compositions), its typing-performance admin tool, and the D2C Figma plugin.
 * Clicking any of them jumps to the projects section.
 *
 * A grid rather than CSS columns, because the two landscape tools need to span
 * the full width to be legible at all — in a column they came out ~165px wide.
 * The phone screens sit three to a row around them. Each tile carries a small
 * rotation and vertical nudge so the set still reads as a pinned-up collection
 * rather than a table.
 */

const BASE = import.meta.env.BASE_URL;

type Tile = {
  /** File in public/hero-tiles, without extension. */
  src: string;
  /** Describes the screen; also the button's accessible name. */
  alt: string;
  w: number;
  h: number;
  /** Degrees; small and alternating, to break the grid without looking sloppy. */
  tilt: number;
  /** Pixels of vertical offset, kept under the row gap so rows never collide. */
  drop?: number;
  /** Span the whole row — the two landscape tools. */
  wide?: boolean;
  /** Sit in the middle column, for the odd tile that ends the set. */
  centred?: boolean;
};

const TILES: Tile[] = [
  { src: 'reword', alt: 'Arcatext — rewording a message from the keyboard', w: 420, h: 488, tilt: -1.4, drop: 0 },
  { src: 'homographs', alt: 'Arcatext — disambiguating a homograph before sending', w: 420, h: 544, tilt: 1.2, drop: 10 },
  { src: 'paste-view', alt: 'Arcatext — translating a received message in place', w: 420, h: 559, tilt: -0.9, drop: 4 },

  { src: 'typing-admin', alt: 'Arcatext typing-performance admin tool', w: 620, h: 397, tilt: 0.6, wide: true },

  { src: 'reverse-translation', alt: 'Arcatext — reverse translation to confirm intent', w: 420, h: 544, tilt: 1.5, drop: 6 },
  { src: 'reword-options', alt: 'Arcatext — recipient gender and script options', w: 420, h: 544, tilt: -1.6, drop: 0 },
  { src: 'synonyms', alt: 'Arcatext — synonym alternatives for a reworded phrase', w: 420, h: 559, tilt: 1.1, drop: 11 },

  { src: 'figma-plugin', alt: 'D2C — a Figma plugin bridging design and Claude Code', w: 620, h: 310, tilt: -0.7, wide: true },

  { src: 'send-copy', alt: 'Arcatext — sending a copy in a second language', w: 420, h: 545, tilt: 1.3, drop: 5, centred: true },
];

export function HeroWorkCollage({ onSelect }: { onSelect: () => void }) {
  return (
    <div className="grid grid-cols-2 items-start gap-3 sm:grid-cols-3 sm:gap-4">
      {TILES.map((t) => (
        <button
          key={t.src}
          type="button"
          onClick={onSelect}
          aria-label={`${t.alt} — see the projects`}
          style={{ rotate: `${t.tilt}deg`, translate: t.drop ? `0 ${t.drop}px` : undefined }}
          className={`group block w-full overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm transition-[transform,box-shadow,border-color] duration-300 hover:rotate-0 hover:border-primary/40 hover:shadow-lg focus-visible:rotate-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:rounded-2xl ${
            t.wide ? 'col-span-2 sm:col-span-3' : ''
          } ${t.centred ? 'sm:col-start-2' : ''}`}
        >
          <img
            src={`${BASE}hero-tiles/${t.src}.jpg`}
            alt=""
            width={t.w}
            height={t.h}
            decoding="async"
            className="block w-full transition-transform duration-500 group-hover:scale-[1.03]"
          />
        </button>
      ))}
    </div>
  );
}
