import { useLayoutEffect, useRef, useState } from 'react';
import ArcatextKeyboard, { type Still } from '@/components/ArcatextKeyboard';

/** The phone screen's design width, in points (ArcatextKeyboard's DESIGN_W). */
const DESIGN_W = 402;

/**
 * One Arcatext screen, drawn rather than captured, held at a moment of a
 * scene and scaled to fill its container's width -- the home page hero's
 * cards. It is the same renderer as the Arcatext page's playing phones, so
 * its labels, layout and both themes come from the app's code and its
 * colorsets, never from a recolored screenshot.
 *
 * It is a picture inside a clickable card, so it takes no clicks or focus of
 * its own (`inert`): the card is the control.
 */
export function ArcatextScreen({ still }: { still: Still }) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => setScale(el.clientWidth / DESIGN_W);
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={ref} inert aria-hidden className="pointer-events-none h-full w-full select-none overflow-hidden">
      {scale > 0 && <ArcatextKeyboard bare still={still} scale={scale} />}
    </div>
  );
}
