/**
 * A loose collage of real product UI, sitting beside the hero intro.
 *
 * Every tile is a shipped screen: the Arcatext feature demos as they run on
 * adalithic.com (captured from the live components, not the older App Store
 * compositions), its typing-performance admin tool, and the D2C Figma plugin.
 * Tiles are laid out in CSS columns rather than a strict grid, and each has a
 * small
 * rotation, so the set reads as a pinned-up collection rather than a table.
 * Clicking any of them jumps to the projects section.
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
};

const TILES: Tile[] = [
  { src: 'reword', alt: 'Arcatext — rewording a message from the keyboard', w: 420, h: 488, tilt: -1.4 },
  { src: 'typing-admin', alt: 'Arcatext typing-performance admin tool', w: 620, h: 397, tilt: 1.1 },
  { src: 'homographs', alt: 'Arcatext — disambiguating a homograph before sending', w: 420, h: 544, tilt: 1.6 },
  { src: 'paste-view', alt: 'Arcatext — translating a received message in place', w: 420, h: 559, tilt: -0.9 },
  { src: 'figma-plugin', alt: 'D2C — a Figma plugin bridging design and Claude Code', w: 620, h: 310, tilt: -1.5 },
  { src: 'reverse-translation', alt: 'Arcatext — reverse translation to confirm intent', w: 420, h: 544, tilt: 1.2 },
  { src: 'reword-options', alt: 'Arcatext — recipient gender and script options', w: 420, h: 544, tilt: -1.7 },
  { src: 'synonyms', alt: 'Arcatext — synonym alternatives for a reworded phrase', w: 420, h: 559, tilt: 1.4 },
  { src: 'send-copy', alt: 'Arcatext — sending a copy in a second language', w: 420, h: 545, tilt: -1.1 },
];

export function HeroWorkCollage({ onSelect }: { onSelect: () => void }) {
  return (
    <div className="columns-2 gap-3 sm:columns-3 sm:gap-4">
      {TILES.map((t) => (
        <button
          key={t.src}
          type="button"
          onClick={onSelect}
          aria-label={`${t.alt} — see the projects`}
          style={{ rotate: `${t.tilt}deg` }}
          className="group mb-3 block w-full overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm transition-[transform,box-shadow,border-color] duration-300 hover:rotate-0 hover:border-primary/40 hover:shadow-lg focus-visible:rotate-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:mb-4 sm:rounded-2xl"
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
