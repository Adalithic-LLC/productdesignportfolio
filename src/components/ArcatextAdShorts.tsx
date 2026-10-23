import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Editable } from '@/content/Editable';

/**
 * The Arcatext launch ads, each in 9:16 on an iPhone with the YouTube Shorts
 * interface over it -- the same frame and overlay the Cut Room previews them
 * in, so what is shown here is what was signed off there.
 *
 * Each phone plays muted and looped while it is on screen. Tapping one turns
 * its sound on and starts it from the top (and silences the other); tapping
 * again mutes it. The overlay's counts are left as labels rather than numbers,
 * since these are previews, not published posts.
 */

const BASE = import.meta.env.BASE_URL;

type Ad = { key: string; src: string; poster: string; caption: string };
const ADS: Ad[] = [
  { key: 'a02', src: 'ads/arcatext-a02.mp4', poster: 'ads/arcatext-a02-poster.webp', caption: 'Have you tried texting to learn a language? #shorts' },
  { key: 'a03', src: 'ads/arcatext-a03.mp4', poster: 'ads/arcatext-a03-poster.webp', caption: 'You only need 1000 words to communicate in a new language. #shorts' },
];

// ── The Shorts overlay (sizes in cqw: the video's own width) ──

const ICON: Record<string, ReactNode> = {
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="M15.5 15.5 21 21" />
    </>
  ),
  moreV: (
    <>
      <circle className="f" cx="12" cy="5" r="1.7" />
      <circle className="f" cx="12" cy="12" r="1.7" />
      <circle className="f" cx="12" cy="19" r="1.7" />
    </>
  ),
  thumbF: <path className="f" d="M3 10h4v11H3zM8.5 10.2 12.6 3c1.6 0 2.6 1.2 2.2 2.8L14 9h5.6a2 2 0 0 1 2 2.4l-1.6 7.8a2 2 0 0 1-2 1.8H8.5z" />,
  thumbDownF: <path className="f" d="M21 14h-4V3h4zM15.5 13.8 11.4 21c-1.6 0-2.6-1.2-2.2-2.8L10 15H4.4a2 2 0 0 1-2-2.4L4 4.8A2 2 0 0 1 6 3h9.5z" />,
  commentF: <path className="f" d="M20 11.5a8 7 0 0 1-11.6 6.2L4 19l1.4-3.6A7 7 0 0 1 4 11.5a8 7 0 0 1 16 0z" />,
  share: <path className="f" d="M13 4l8 7.5-8 7.5v-4.6c-5 0-8.2 1.5-10 5.1.8-5.6 4-10.1 10-11z" />,
  remix: <path d="M4 8h12l-3.5-3.5M20 16H8l3.5 3.5" />,
  note: (
    <>
      <path d="M9 17.5V5.5l10-2v12" />
      <circle className="f" cx="6.8" cy="17.5" r="2.4" />
      <circle className="f" cx="16.8" cy="15.5" r="2.4" />
    </>
  ),
  homeF: <path className="f" d="M4 10.5 12 4l8 6.5V20h-5.5v-6h-5v6H4z" />,
  shorts: (
    <>
      <path className="f" d="M15.8 3.6a4.3 4.3 0 0 1 2 8l-1.4.8 1.4.8a4.3 4.3 0 0 1-4 7.6l-6-3.3a4.3 4.3 0 0 1-2-8l1.4-.8-1.4-.8a4.3 4.3 0 0 1 4-7.6z" />
      <path d="M10.2 9.5v5l4.2-2.5z" style={{ fill: '#000', stroke: 'none' }} />
    </>
  ),
  plusCircle: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 8v8M8 12h8" />
    </>
  ),
  subs: (
    <>
      <rect x="3.5" y="7" width="17" height="13" rx="2" />
      <path d="M6 4.5h12M10 11v6l5-3z" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8.5" r="4" />
      <path d="M4.5 20.5c1.2-4 4-5.8 7.5-5.8s6.3 1.8 7.5 5.8" />
    </>
  ),
  soundOff: (
    <>
      <path className="f" d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
      <path d="m16 9.5 5 5M21 9.5l-5 5" />
    </>
  ),
  soundOn: (
    <>
      <path className="f" d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
      <path d="M15.5 9a4.2 4.2 0 0 1 0 6M18.2 6.5a8 8 0 0 1 0 11" />
    </>
  ),
};

function Icon({ k, size = 7.4, filter = true }: { k: string; size?: number; filter?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="[&_.f]:fill-white [&_.f]:stroke-none"
      style={{
        width: `${size}cqw`,
        height: `${size}cqw`,
        fill: 'none',
        stroke: '#fff',
        strokeWidth: 1.8,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        filter: filter ? 'drop-shadow(0 1px 1.5px rgba(0,0,0,0.45))' : undefined,
      }}
    >
      {ICON[k]}
    </svg>
  );
}

const SHADOW = '0 1px 2px rgba(0,0,0,0.55)';

function ShortsOverlay({ caption, progress }: { caption: string; progress: number }) {
  const rail: [ReactNode, string][] = [
    [<Icon k="thumbF" />, 'Like'],
    [<Icon k="thumbDownF" />, 'Dislike'],
    [<Icon k="commentF" />, 'Comments'],
    [<Icon k="share" />, 'Share'],
    [<Icon k="remix" />, 'Remix'],
    [<div style={{ width: '9cqw', height: '9cqw', borderRadius: '2cqw', background: 'linear-gradient(135deg,#555,#222)', border: '0.5cqw solid #fff' }} />, ''],
  ];
  const nav: [string, string][] = [
    ['homeF', 'Home'],
    ['shorts', 'Shorts'],
    ['plusCircle', ''],
    ['subs', 'Subscriptions'],
    ['user', 'You'],
  ];
  return (
    // The outer box is the size container; the type is set one level in,
    // since an element's own cqw resolves against its parent, not itself.
    <div className="pointer-events-none absolute inset-0 select-none" style={{ containerType: 'size' }} aria-hidden="true">
    <div className="absolute inset-0" style={{ color: '#fff', fontFamily: "-apple-system, system-ui, 'Helvetica Neue', sans-serif", textShadow: SHADOW, fontSize: '3.3cqw', lineHeight: 1.3 }}>
      <div className="absolute flex items-center justify-end" style={{ top: '2.6cqh', left: '3.6cqw', right: '3.6cqw', gap: '5cqw' }}>
        <Icon k="search" />
        <Icon k="moreV" />
      </div>
      <div className="absolute flex flex-col items-center" style={{ right: '2.2cqw', width: '14cqw', bottom: '18cqw', gap: '4.2cqw', fontSize: '2.7cqw', fontWeight: 600 }}>
        {rail.map(([icon, label], i) => (
          <div key={i} className="flex flex-col items-center" style={{ gap: '0.6cqw' }}>
            {icon}
            {label && <span>{label}</span>}
          </div>
        ))}
      </div>
      <div className="absolute flex flex-col" style={{ left: '3.6cqw', width: '74cqw', bottom: '15.5cqw', gap: '1.6cqw' }}>
        <div className="flex items-center" style={{ gap: '2.2cqw' }}>
          <span style={{ width: '8.6cqw', height: '8.6cqw', borderRadius: '50%', background: 'linear-gradient(135deg,#8aa6ff,#3f5bd6)', border: '0.5cqw solid #fff', flex: 'none' }} />
          <b style={{ fontWeight: 650 }}>@arcatext</b>
          <span style={{ background: '#fff', color: '#111', textShadow: 'none', borderRadius: 99, padding: '0.6cqw 2.4cqw', fontSize: '3cqw', fontWeight: 600 }}>Subscribe</span>
        </div>
        <div>{caption}</div>
        <div className="flex items-center" style={{ gap: '2.2cqw', fontSize: '3cqw' }}>
          <Icon k="note" size={3.6} />
          Original sound
        </div>
      </div>
      <div className="absolute" style={{ left: 0, right: 0, bottom: '12cqw', height: '0.6cqw', background: 'rgba(255,255,255,0.35)' }}>
        <i className="block h-full bg-white" style={{ width: `${progress * 100}%` }} />
      </div>
      <div className="absolute flex items-center justify-around" style={{ left: 0, right: 0, bottom: 0, height: '12cqw', background: '#000', fontSize: '2.4cqw', textShadow: 'none' }}>
        {nav.map(([k, label]) => (
          <div key={k} className="flex flex-col items-center" style={{ gap: '0.4cqw', opacity: 0.92 }}>
            <Icon k={k} size={6.4} filter={false} />
            {label && <span>{label}</span>}
          </div>
        ))}
      </div>
    </div>
    </div>
  );
}

// ── One phone ──

function ShortsPhone({ ad, sound, onSound }: { ad: Ad; sound: boolean; onSound: (on: boolean) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  // Plays while at least a third of it is on screen.
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    const v = video.current;
    if (!v) return;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (visible && (sound || !still)) v.play().catch(() => undefined);
    else v.pause();
  }, [visible, sound]);
  useEffect(() => {
    const v = video.current;
    if (v) v.muted = !sound;
  }, [sound]);

  // The Shorts progress bar follows the video every frame while it plays.
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const v = video.current;
      if (v && v.duration) setProgress(v.currentTime / v.duration);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const toggle = () => {
    const v = video.current;
    if (!v) return;
    if (!sound) {
      // Sound on: from the top, so the voiceover is heard whole.
      v.currentTime = 0;
      v.muted = false;
      v.play().catch(() => undefined);
    }
    onSound(!sound);
  };

  return (
    <div
      ref={box}
      className="relative mx-auto w-full overflow-hidden bg-black"
      style={{
        aspectRatio: '9 / 19.5',
        borderRadius: '14% / 6.46%',
        boxShadow: '0 0 0 9px #08080a, 0 0 0 10.5px #3b3d44, 0 0 0 11.5px #15161a, 0 24px 60px rgba(0,0,0,0.45)',
      }}
    >
      {/* The 9:16 cut sits in the 19.5:9 screen as Shorts shows it. */}
      <div className="absolute inset-x-0" style={{ top: '8.97%', bottom: '8.97%' }}>
        <video
          ref={video}
          className="block h-full w-full object-cover"
          src={`${BASE}${ad.src}`}
          poster={`${BASE}${ad.poster}`}
          muted
          loop
          playsInline
          preload="metadata"
        />
        <ShortsOverlay caption={ad.caption} progress={progress} />
        <button
          type="button"
          onClick={toggle}
          aria-label={sound ? 'Mute' : 'Play with sound'}
          aria-pressed={sound}
          className="absolute inset-0 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-white"
          style={{ containerType: 'size' }}
        >
          <span
            className="absolute flex items-center rounded-full"
            style={{ left: '3.6cqw', top: '2.2cqh', gap: '1.6cqw', padding: '1.4cqw 3cqw 1.4cqw 2cqw', background: 'rgba(0,0,0,0.55)', color: '#fff', fontSize: '3cqw', fontWeight: 600, fontFamily: "-apple-system, system-ui, 'Helvetica Neue', sans-serif" }}
          >
            <Icon k={sound ? 'soundOn' : 'soundOff'} size={5} filter={false} />
            {sound ? 'Sound on' : 'Tap for sound'}
          </span>
        </button>
      </div>
      <i className="pointer-events-none absolute rounded-full bg-black" style={{ left: '34%', right: '34%', top: '1.4%', height: '4.2%', boxShadow: '0 0 0 1px rgba(255,255,255,0.07)' }} />
      <i className="pointer-events-none absolute rounded-full" style={{ left: '33%', right: '33%', bottom: '0.9%', height: '0.6%', background: 'rgba(255,255,255,0.55)' }} />
    </div>
  );
}

// ── The row ──

export default function ArcatextAdShorts() {
  /** Which phone has its sound on (one at a time). */
  const [sound, setSound] = useState<string | null>(null);
  return (
    <div className="flex flex-wrap justify-center gap-x-16 gap-y-14 sm:justify-start lg:gap-x-24">
      {ADS.map((ad, i) => (
        <figure key={ad.key} className="flex w-full max-w-[300px] flex-col">
          <div className="px-3 pt-3">
            <ShortsPhone ad={ad} sound={sound === ad.key} onSound={(on) => setSound(on ? ad.key : null)} />
          </div>
          <figcaption className="mt-7">
            <Editable as="div" path={`arcatext.ads.cards.${i}.eyebrow`} className="text-xs font-semibold uppercase tracking-[0.18em] text-primary" />
            <Editable as="p" path={`arcatext.ads.cards.${i}.body`} multiline className="mt-2 text-sm leading-relaxed text-muted-foreground" />
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
