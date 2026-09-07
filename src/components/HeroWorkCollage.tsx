/**
 * The hero's collage of real product UI, sitting around the introduction: the
 * Arcatext deck to its left (see ArcatextCardStack), one screen to its right,
 * and the tools clustered beneath it.
 *
 * Every tile is real product: the send-a-copy screen as it runs on
 * adalithic.com, the typing-performance admin tool running live (see
 * AdminToolTile), and the D2C Figma plugin. Clicking any of them jumps to the
 * projects section.
 *
 * The cluster is a five-column grid so the two landscape tools can span three
 * and two columns respectively — wide enough to read. Each tile carries a small
 * rotation so the set reads as a pinned-up collection, not a table.
 *
 * The screen genuinely floats: the Arcatext demo was recaptured with the page's
 * ground knocked out, so the transparency is in the file itself and the bubbles
 * sit straight on the hero in either theme. The two tools keep their own chrome
 * -- an admin console and a plugin panel read as windows.
 */

import { useEffect, useRef, useState } from 'react';

const BASE = import.meta.env.BASE_URL;

/**
 * The admin tool is the real prototype rather than a capture of it -- the same
 * self-contained page the Arcatext case study embeds. It is pinned to the
 * tool's daylight palette whatever the portfolio's theme, so it reads as a
 * light window beside the other screens, and it renders at its full desktop
 * width before being scaled into the tile: at the tile's own width the tool's
 * responsive layout would collapse to a single narrow column.
 */
const TOOL = {
  src: `${BASE}arcatext-admin-tool.html?theme=daylight`,
  alt: 'Arcatext typing-performance admin tool',
  w: 1400,
  h: 897,
};

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

/** Sits beneath it, alongside the live admin tool. */
const CLUSTER: Tile[] = [
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

/**
 * The admin tool, live. The iframe is laid out at the tool's desktop width and
 * scaled to whatever the tile is actually given; a ResizeObserver keeps the two
 * in step, since the factor is a ratio CSS cannot work out on its own.
 */
function AdminToolTile({ onSelect }: { onSelect: () => void }) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);

  useEffect(() => {
    const box = frameRef.current;
    if (!box) return;
    const watch = new ResizeObserver(([entry]) => setScale(entry.contentRect.width / TOOL.w));
    watch.observe(box);
    return () => watch.disconnect();
  }, []);

  return (
    <div
      ref={frameRef}
      style={{ rotate: '0.6deg', aspectRatio: `${TOOL.w} / ${TOOL.h}` }}
      className="relative col-span-2 overflow-hidden rounded-xl bg-white transition-transform duration-300 hover:rotate-0 sm:rounded-2xl lg:col-span-3"
    >
      <iframe
        src={TOOL.src}
        title={TOOL.alt}
        tabIndex={-1}
        aria-hidden
        className="pointer-events-none absolute left-0 top-0 origin-top-left border-0"
        style={{ width: TOOL.w, height: TOOL.h, transform: `scale(${scale})` }}
      />
      {/* The tool is a picture here, not a control: the whole tile is the link. */}
      <button
        type="button"
        onClick={onSelect}
        aria-label={`${TOOL.alt} — see the projects`}
        className="absolute inset-0 cursor-pointer bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
    </div>
  );
}

export function HeroWorkCluster({ onSelect }: { onSelect: () => void }) {
  return (
    <div className="grid grid-cols-2 items-start gap-3 sm:gap-4 lg:grid-cols-5">
      <AdminToolTile onSelect={onSelect} />
      {CLUSTER.map((t) => (
        <TileButton key={t.src} tile={t} onSelect={onSelect} className={t.span ? SPAN_CLASS[t.span] : ''} />
      ))}
    </div>
  );
}
