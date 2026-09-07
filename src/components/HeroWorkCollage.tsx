/**
 * The hero's collage of real product UI, sitting around the introduction: the
 * Arcatext deck to its left (see ArcatextCardStack), one screen to its right,
 * and the tools clustered beneath it.
 *
 * Every tile is a shipped screen: the Arcatext feature demos as they run on
 * adalithic.com (captured from the live components), its typing-performance
 * admin tool, and the D2C Figma plugin. Clicking any of them jumps to the
 * projects section.
 *
 * The cluster is a five-column grid so the two landscape tools can span three
 * and two columns respectively — wide enough to read. Each tile carries a small
 * rotation so the set reads as a pinned-up collection, not a table.
 *
 * The screens genuinely float: the Arcatext demos were recaptured with the
 * page's ground knocked out, so the transparency is in the files themselves and
 * the bubbles sit straight on the hero in either theme. The two tools keep
 * their own chrome -- an admin console and a plugin panel read as windows.
 */

const BASE = import.meta.env.BASE_URL;

type Tile = {
  /** Filename in public/hero-tiles. */
  src: string;
  /** Describes the screen; also the button's accessible name. */
  alt: string;
  w: number;
  h: number;
  /** Degrees; small and alternating, to break the grid without looking sloppy. */
  tilt: number;
  /** Pixels of vertical offset, kept under the row gap so rows never collide. */
  drop?: number;
  /** Columns to span inside the cluster grid. */
  span?: number;
  /** Fraction of its grid cell the tile fills, when the cell is wider than it should draw. */
  width?: string;
};

/** Flanks the introduction, opposite the card deck. */
const RIGHT: Tile = {
  src: 'send-copy.webp',
  alt: 'Arcatext — sending a copy in a second language',
  w: 700, h: 861, tilt: 1.7,
};

/** Sits beneath it: the two tools the Arcatext deck does not cover. */
const CLUSTER: Tile[] = [
  { src: 'typing-admin.jpg', alt: 'Arcatext typing-performance admin tool', w: 1400, h: 897, tilt: 0.6, span: 3 },
  { src: 'figma-plugin.jpg', alt: 'D2C — a Figma plugin bridging design and Claude Code', w: 1400, h: 700, tilt: -0.8, span: 2, width: 'w-1/2' },
];

const SPAN_CLASS: Record<number, string> = {
  2: 'col-span-2 lg:col-span-2',
  3: 'col-span-2 lg:col-span-3',
};

function TileButton({
  tile,
  onSelect,
  className = '',
}: {
  tile: Tile;
  onSelect: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={`${tile.alt} — see the projects`}
      style={{ rotate: `${tile.tilt}deg`, translate: tile.drop ? `0 ${tile.drop}px` : undefined }}
      className={`group block overflow-hidden rounded-xl transition-transform duration-300 hover:rotate-0 focus-visible:rotate-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:rounded-2xl ${tile.width ?? 'w-full'} ${className}`}
    >
      <img
        src={`${BASE}hero-tiles/${tile.src}`}
        alt=""
        width={tile.w}
        height={tile.h}
        decoding="async"
        className="block w-full transition-transform duration-500 group-hover:scale-[1.03]"
      />
    </button>
  );
}

export function HeroSideTile({ onSelect }: { onSelect: () => void }) {
  return <TileButton tile={RIGHT} onSelect={onSelect} />;
}

export function HeroWorkCluster({ onSelect }: { onSelect: () => void }) {
  return (
    <div className="grid grid-cols-2 items-start gap-3 sm:gap-4 lg:grid-cols-5">
      {CLUSTER.map((t) => (
        <TileButton key={t.src} tile={t} onSelect={onSelect} className={t.span ? SPAN_CLASS[t.span] : ''} />
      ))}
    </div>
  );
}
