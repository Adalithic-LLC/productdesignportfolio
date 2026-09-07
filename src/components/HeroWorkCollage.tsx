/**
 * The hero's product screens, either side of the introduction and beneath it:
 * the Arcatext deck on the left (see ArcatextCardStack), the deck of screens
 * D2C generated on the right, and beneath them the typing-performance admin
 * tool -- running live, not a capture of it -- beside the D2C plugin window
 * that produced those screens.
 *
 * Both flanking decks inset their cards 3% of their slot, so their cards draw
 * at the same width even though the slots differ.
 */

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { gsap } from 'gsap';

import { CardDeck, type DeckCard } from '@/components/CardDeck';

const BASE = import.meta.env.BASE_URL;

/**
 * A gentle looping bob, the same one the Work cards carry.
 *
 * It drives a wrapper rather than the tile itself. The tiles transition their
 * own transform on hover, and a per-frame transform written through a 300ms
 * transition would lag the animation instead of playing it. Hovering settles
 * the bob to rest rather than freezing it mid-air, and it sits out entirely
 * for anyone who has asked for reduced motion.
 */
function Floating({ phase = 0, children }: { phase?: number; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const amp = 9;   // px -- subtle but perceptible
    const dur = 1.05;
    let bob: gsap.core.Timeline | null = null;
    let settle: gsap.core.Tween | null = null;

    const start = () => {
      bob = gsap
        .timeline({ repeat: -1, defaults: { ease: 'sine.inOut' } })
        .to(el, { y: amp, duration: dur })
        .to(el, { y: -amp, duration: dur * 2 })
        .to(el, { y: 0, duration: dur });
    };
    start();
    bob!.progress(phase);   // only on the first run, so a resume is seamless

    const onEnter = () => {
      bob?.kill();
      settle = gsap.to(el, { y: 0, duration: 0.4, ease: 'power3.out', overwrite: 'auto' });
    };
    const onLeave = () => {
      settle?.kill();
      start();
    };
    el.addEventListener('mouseenter', onEnter);
    el.addEventListener('mouseleave', onLeave);
    return () => {
      el.removeEventListener('mouseenter', onEnter);
      el.removeEventListener('mouseleave', onLeave);
      bob?.kill();
      settle?.kill();
      gsap.set(el, { clearProps: 'transform' });
    };
  }, [phase]);

  return <div ref={ref}>{children}</div>;
}

/**
 * The products rail D2C generated out of the Conversant codebase, as a deck of
 * its own -- one card for now, with room for the rest of the generated screens.
 *
 * The card takes the rail's own proportions -- roughly 1:2.3 -- so the whole
 * panel shows rather than the top of it, which means the slot has to be narrow
 * for the card not to run away in height. Its corner radius is in its own
 * alpha, and the deck clips to the same radius so the grey plate follows the
 * card's shape.
 * It turns half a beat out of phase with the Arcatext deck, so the two never
 * flick together.
 */
const PRODUCTS: DeckCard[] = [
  { src: 'd2c-products.webp', alt: 'A Conversant products panel, generated from the codebase by D2C' },
];

export function ProductsCardStack({ onSelect }: { onSelect: () => void }) {
  return (
    <CardDeck
      cards={PRODUCTS}
      width={1484}
      height={3416}
      cardClass="rounded-[5px] shadow-[0_14px_34px_-16px_rgba(0,0,0,0.45)]"
      phaseMs={1500}
      onSelect={onSelect}
    />
  );
}

/**
 * The D2C plugin window itself, beside the tuning tool. Cut out of its own
 * screenshot, so the window's rounded corners live in the file's alpha rather
 * than in a clip -- which is also why the shadow is a drop-shadow filter: a
 * box-shadow would trace the element's rectangle, not the window inside it.
 */
const D2C = {
  src: 'd2c.webp',
  alt: 'D2C — a Figma plugin bridging design and Claude Code',
  w: 1434,
  h: 1529,
};

function D2CTile({ onSelect }: { onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={`${D2C.alt} — see the projects`}
      style={{ rotate: '1.8deg' }}
      className="group block w-full transition-transform duration-300 hover:rotate-0 focus-visible:rotate-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <img
        src={`${BASE}hero-tiles/${D2C.src}`}
        alt=""
        width={D2C.w}
        height={D2C.h}
        decoding="async"
        className="block w-full transition-transform duration-500 group-hover:scale-[1.03]"
        style={{ filter: 'drop-shadow(0 14px 34px rgba(0,0,0,0.4))' }}
      />
    </button>
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
    <div className="flex flex-col items-start gap-8 lg:flex-row lg:gap-12">
      {/* Exactly half the width, so the gap comes out of the other half. */}
      <div className="w-full shrink-0 lg:w-1/2">
        <Floating>
          <AdminToolTile onSelect={onSelect} />
        </Floating>
      </div>
      {/* Measured against the whole row, not the space left over, so it stands
          about as tall as the tool beside it rather than taking up the slack. */}
      <div className="w-3/4 shrink-0 sm:w-1/2 lg:w-[30%]">
        <Floating phase={0.5}>
          <D2CTile onSelect={onSelect} />
        </Floating>
      </div>
    </div>
  );
}
