import { useEffect, useRef, useState } from 'react';
import { Maximize2 } from 'lucide-react';

/**
 * A working copy of the Arcatext Cut Room with Arcatext 02 loaded, embedded
 * live. The page is public/cut-room/index.html, built from the Cut Room
 * artifact by tools/cut-room/build.mjs: everything works -- playback, the
 * 9:16 and 16:9 cuts, the phone frame and platform overlays, the music and
 * voice levels, notes and scene retiming -- with a visitor's notes kept in
 * their own browser instead of the artifact's shared database.
 *
 * `?embed` gives the player a fixed height, so the frame can take the Cut
 * Room's whole height (it is same-origin, so it is measured) and nothing
 * scrolls inside it. The Cut Room is one dark grading-suite look by design,
 * so it does not follow the site theme.
 */
const PAGE = `${import.meta.env.BASE_URL}cut-room/index.html`;

export default function CutRoomEmbed() {
  const frame = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(1000);

  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    let ro: ResizeObserver | null = null;
    const watch = () => {
      const doc = el.contentDocument;
      if (!doc?.body) return;
      const fit = () => setHeight(Math.ceil(doc.documentElement.scrollHeight));
      ro?.disconnect();
      ro = new ResizeObserver(fit);
      ro.observe(doc.body);
      fit();
    };
    el.addEventListener('load', watch);
    watch();
    return () => {
      el.removeEventListener('load', watch);
      ro?.disconnect();
    };
  }, []);

  return (
    <div>
      <div className="overflow-hidden rounded-2xl border border-border/60 bg-[#0d0e12] shadow-[0_24px_60px_rgba(0,0,0,0.25)]">
        <iframe
          ref={frame}
          src={`${PAGE}?embed`}
          title="Arcatext Cut Room, with Arcatext 02 loaded"
          className="block w-full"
          style={{ height }}
          allow="autoplay; fullscreen"
          allowFullScreen
        />
      </div>
      <div className="mt-3 flex justify-end">
        <a href={PAGE} target="_blank" rel="noopener" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
          <Maximize2 className="h-3.5 w-3.5" />
          Open full screen
        </a>
      </div>
    </div>
  );
}
