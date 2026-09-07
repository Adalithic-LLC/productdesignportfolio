/**
 * The hero's product screens, either side of the introduction and beneath it:
 * the Arcatext deck on the left (see ArcatextCardStack), the D2C plugin window
 * on the right, and the typing-performance admin tool -- running live, not a
 * capture of it -- across the half-width below.
 *
 * The two flanking slots draw at the same width by construction: both inset
 * their content 3% of the slot, so the D2C window measures exactly what the
 * deck's cards do. D2C is next in line for a deck of its own once its second
 * screen lands, which is why it keeps that geometry rather than filling its
 * slot edge to edge.
 */

import { useEffect, useRef, useState } from 'react';

const BASE = import.meta.env.BASE_URL;

/**
 * Cut out of its own screenshot, so the window's rounded corners are in the
 * file's alpha rather than a clip. The shadow is a drop-shadow filter for the
 * same reason -- a box-shadow would trace the element's rectangle, not the
 * window inside it.
 */
const D2C = {
  src: 'd2c.webp',
  alt: 'D2C — a Figma plugin bridging design and Claude Code',
  w: 700,
  h: 746,
};

export function D2CTile({ onSelect }: { onSelect: () => void }) {
  return (
    <div className="relative w-full" style={{ aspectRatio: `${D2C.w} / ${D2C.h}` }}>
      <button
        type="button"
        onClick={onSelect}
        aria-label={`${D2C.alt} — see the projects`}
        style={{ rotate: '1.8deg' }}
        className="group absolute inset-[3%] transition-transform duration-300 hover:rotate-0 focus-visible:rotate-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <img
          src={`${BASE}hero-tiles/${D2C.src}`}
          alt=""
          width={D2C.w}
          height={D2C.h}
          decoding="async"
          className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-[1.03]"
          style={{ filter: 'drop-shadow(0 14px 34px rgba(0,0,0,0.4))' }}
        />
      </button>
    </div>
  );
}

/**
 * The admin tool is the real prototype -- the same self-contained page the
 * Arcatext case study embeds, pinned to the tool's daylight palette whatever
 * the portfolio's theme. The iframe is laid out at the tool's full desktop
 * width and scaled to whatever the tile is given, with a ResizeObserver keeping
 * the two in step, since that factor is a ratio CSS cannot work out on its own;
 * at the tile's own width the tool's responsive layout would collapse to a
 * single narrow column.
 */
const TOOL = {
  src: `${BASE}arcatext-admin-tool.html?theme=daylight`,
  alt: 'Arcatext typing-performance admin tool',
  w: 1400,
  h: 897,
};

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
      className="relative w-full overflow-hidden rounded-xl bg-white transition-transform duration-300 hover:rotate-0 sm:rounded-2xl"
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
    <div className="w-full lg:w-1/2">
      <AdminToolTile onSelect={onSelect} />
    </div>
  );
}
