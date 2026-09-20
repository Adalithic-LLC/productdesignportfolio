/**
 * The Arcatext analysis tool, as the hero shows it.
 *
 * What used to be a collage of tiles here is now a single display zone driven
 * by previews -- see HeroShowcase. The tool is all that is left in this file,
 * because unlike the other screens it is not an image: it is the real
 * prototype, running in an iframe.
 */
import { useEffect, useRef, useState } from 'react';

const BASE = import.meta.env.BASE_URL;

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

export function AdminToolTile({ onSelect }: { onSelect: () => void }) {
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
