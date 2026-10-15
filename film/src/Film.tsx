import { useEffect, useState, type ReactNode } from 'react';
import { flushSync } from 'react-dom';
import Phone, { OUTER_W, OUTER_H } from './Phone';
import { SHOTS, DURATION, REVERSE_AT, SWITCHES, ANY_APP_AT, WORDS, WORD_TIMES, camAt, cues, screenAt, type Cam, type Shot } from './timeline';
import { clamp01, easeOutCubic, easeOutExpo, span } from './ease';

/**
 * The film: one 1920x1080 frame as a pure function of time.
 *
 *   ?t=9.6     a still at 9.6s
 *   ?play      real-time preview, looping
 *   (neither)  waits for render.mjs to call window.__seek(ms) per frame
 *
 * CSS animations inside reused components (spinners, the loading shimmer) are
 * paused and seeked to the frame's time, so every render is reproducible.
 */

const W = 1920;
const H = 1080;
const BLUE_A = '#3370FF';
const BLUE_B = '#7BA2FF';
const DISPLAY = "'Inter Display', Inter, sans-serif";

declare global {
  interface Window {
    __seek: (ms: number) => void;
    __ready: Promise<unknown>;
    __cues: ReturnType<typeof cues>;
  }
}

// The film's own animations (film.css, `film-*`) are pinned to the story beat
// they belong to, so a remount (a cut) never replays them. Anything else — the
// reused views' spinners and shimmer — runs from when it mounted.
const born = new WeakMap<Animation, number>();
export function syncAnimations(ms: number) {
  for (const a of document.getAnimations()) {
    const name = (a as CSSAnimation).animationName ?? '';
    if (!born.has(a)) born.set(a, ms);
    a.pause();
    a.currentTime = name.startsWith('film-') ? ms - REVERSE_AT * 1000 : ms - born.get(a)!;
  }
}

function Words({ text, accent = [], t0, t }: { text: string; accent?: string[]; t0: number; t: number }) {
  return (
    <>
      {text.split(' ').map((w, i) => {
        const k = span(t, t0 + i * 0.09, t0 + i * 0.09 + 0.5, easeOutExpo);
        const isAccent = accent.includes(w);
        return (
          <span
            key={i}
            className="inline-block"
            style={{
              opacity: k,
              transform: `translateY(${(1 - k) * 34}px)`,
              filter: `blur(${(1 - k) * 12}px)`,
              marginRight: '0.24em',
              ...(isAccent
                ? {
                    backgroundImage: `linear-gradient(100deg, ${BLUE_A}, ${BLUE_B} 60%, #B8CCFF)`,
                    WebkitBackgroundClip: 'text',
                    color: 'transparent',
                  }
                : {}),
            }}
          >
            {w}
          </span>
        );
      })}
    </>
  );
}

function TitleCard({ shot, t }: { shot: Extract<Shot, { kind: 'title' }>; t: number }) {
  const local = t - shot.start;
  const out = span(t, shot.end - 0.28, shot.end, (k) => k * k);
  let wordIndex = 0;
  return (
    <div className="absolute inset-0 grid place-items-center bg-black">
      <div
        className="text-center text-white"
        style={{
          fontFamily: DISPLAY,
          fontWeight: 700,
          fontSize: shot.size ?? 136,
          letterSpacing: '-0.035em',
          lineHeight: 1.06,
          opacity: 1 - out,
          transform: `scale(${1 + local * 0.012}) translateY(${-out * 24}px)`,
          filter: `blur(${out * 8}px)`,
        }}
      >
        {shot.lines.map((l, i) => {
          const t0 = shot.start + 0.12 + wordIndex * 0.08 + i * 0.1;
          wordIndex += l.text.split(' ').length;
          return (
            <div key={i}>
              <Words text={l.text} accent={l.accent} t0={t0} t={t} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** The stage: perspective camera on the phone, a soft blue glow behind it. */
function PhoneStage({ cam, t, glow = 1 }: { cam: Cam; t: number; glow?: number }) {
  const s = screenAt(t);
  const transform =
    `translate3d(${W / 2 + cam.ox}px, ${H / 2 + cam.oy}px, 0) ` +
    `rotateX(${cam.rx}deg) rotateY(${cam.ry}deg) rotateZ(${cam.rz}deg) ` +
    `scale3d(${cam.z}, ${cam.z}, ${cam.z}) translate3d(${-cam.fx}px, ${-cam.fy}px, 0)`;
  return (
    <div className="absolute inset-0 overflow-hidden bg-black">
      <div
        className="absolute inset-0"
        style={{
          opacity: glow,
          background: `radial-gradient(60% 70% at ${50 + cam.ox / 38 + cam.ry * 0.4}% ${58 - cam.rx * 0.3}%, rgba(51,112,255,0.30), rgba(51,112,255,0.08) 45%, rgba(0,0,0,0) 70%)`,
        }}
      />
      <div className="absolute inset-0" style={{ perspective: 2200, perspectiveOrigin: '50% 50%' }}>
        <div className="absolute left-0 top-0" style={{ width: OUTER_W, height: OUTER_H, transformOrigin: '0 0', transformStyle: 'preserve-3d', transform }}>
          <Phone s={s} glare={cam.ry / 30} />
        </div>
      </div>
    </div>
  );
}

/**
 * The Arcatext mark (ArcatextLogo.imageset: a column with a beam at each
 * corner), built in two moves: the column grows out from its centre (`grow`),
 * then the four beams slide out from it (`beams`).
 */
function ArcatextMark({ size, grow = 1, beams = 1 }: { size: number; grow?: number; beams?: number }) {
  const ch = 40 * grow;
  const bw = 12 * beams;
  return (
    <svg width={(size * 31) / 50} height={size} viewBox="0 0 31 50" fill="none" overflow="visible">
      <defs>
        <linearGradient id="axm" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={BLUE_B} />
          <stop offset="1" stopColor={BLUE_A} />
        </linearGradient>
      </defs>
      <rect x="12" y={25 - ch / 2 - 5 * grow} width="7" height={ch + 10 * grow} fill="url(#axm)" />
      {beams > 0 && (
        <>
          <rect x={12 - bw} y="0" width={bw} height="5" fill="url(#axm)" />
          <rect x="19" y="0" width={bw} height="5" fill="url(#axm)" />
          <rect x={12 - bw} y="45" width={bw} height="5" fill="url(#axm)" />
          <rect x="19" y="45" width={bw} height="5" fill="url(#axm)" />
        </>
      )}
    </svg>
  );
}

/** Icon, wordmark and a line under them, each rising in on its own beat. */
export function BrandLockup({ t, t0, children }: { t: number; t0: number; children: ReactNode }) {
  const grow = span(t, t0 + 0.1, t0 + 0.6, easeOutExpo);
  const beams = span(t, t0 + 0.45, t0 + 0.9, easeOutExpo);
  const word = span(t, t0 + 0.75, t0 + 1.45, easeOutExpo);
  return (
    <div className="flex flex-col items-center text-center text-white" style={{ fontFamily: DISPLAY }}>
      <div style={{ filter: `drop-shadow(0 0 ${24 * beams}px rgba(51,112,255,${0.55 * beams}))` }}>
        <ArcatextMark size={120} grow={grow} beams={beams} />
      </div>
      <div
        className="mt-9"
        style={{ fontSize: 156, fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1, opacity: word, transform: `translateY(${(1 - word) * 36}px)`, filter: `blur(${(1 - word) * 10}px)` }}
      >
        Arcatext
      </div>
      {children}
    </div>
  );
}

function Opening({ shot, t }: { shot: Extract<Shot, { kind: 'open' }>; t: number }) {
  const sub = span(t, shot.start + 1.2, shot.start + 1.9, easeOutExpo);
  const out = span(t, shot.end - 0.35, shot.end, (k) => k * k);
  return (
    <div className="absolute inset-0 grid place-items-center bg-black">
      <Glow />
      <div style={{ opacity: 1 - out, transform: `scale(${1 + (t - shot.start) * 0.01}) translateY(${-out * 30}px)`, filter: `blur(${out * 10}px)` }}>
        <BrandLockup t={t} t0={shot.start}>
          <div className="mt-7" style={{ fontSize: 60, fontWeight: 600, letterSpacing: '-0.02em', color: 'rgba(255,255,255,0.62)', opacity: sub, transform: `translateY(${(1 - sub) * 26}px)` }}>
            Practical language learning
          </div>
        </BrandLockup>
      </div>
    </div>
  );
}

/** "Learn languages by texting" over a word that turns over on the beat. */
function Closing({ shot, t }: { shot: Extract<Shot, { kind: 'close' }>; t: number }) {
  const sub = span(t, shot.start + 1.2, shot.start + 1.9, easeOutExpo);
  const fade = span(t, DURATION - 0.6, DURATION, (k) => k);
  return (
    <div className="absolute inset-0 grid place-items-center bg-black">
      <Glow />
      <div style={{ transform: `scale(${1 + (t - shot.start) * 0.008})` }}>
        <BrandLockup t={t} t0={shot.start}>
          <div className="mt-7" style={{ fontSize: 60, fontWeight: 600, letterSpacing: '-0.02em', color: 'rgba(255,255,255,0.62)', opacity: sub, transform: `translateY(${(1 - sub) * 26}px)` }}>
            Learn languages by texting
          </div>
          <div className="relative mt-1 w-[1000px]" style={{ height: 96 }}>
            {WORDS.map((w, i) => {
              const inK = span(t, WORD_TIMES[i], WORD_TIMES[i] + 0.4, easeOutExpo);
              const outK = i + 1 < WORDS.length ? span(t, WORD_TIMES[i + 1], WORD_TIMES[i + 1] + 0.3, (k) => k * k) : 0;
              if (inK <= 0 || outK >= 1) return null;
              return (
                <div
                  key={w}
                  className="absolute inset-x-0 top-0"
                  style={{
                    fontSize: 84,
                    fontWeight: 700,
                    letterSpacing: '-0.03em',
                    lineHeight: '96px',
                    opacity: inK * (1 - outK),
                    transform: `translateY(${(1 - inK) * 50 - outK * 50}px)`,
                    filter: `blur(${(1 - inK) * 10 + outK * 10}px)`,
                  }}
                >
                  <span style={{ backgroundImage: `linear-gradient(100deg, ${BLUE_A}, ${BLUE_B} 60%, #B8CCFF)`, WebkitBackgroundClip: 'text', color: 'transparent' }}>
                    {w}
                  </span>
                </div>
              );
            })}
          </div>
        </BrandLockup>
      </div>
      <div className="absolute inset-0 bg-black" style={{ opacity: fade }} />
    </div>
  );
}

export function Glow() {
  return (
    <div
      className="absolute inset-0"
      style={{ background: 'radial-gradient(50% 55% at 50% 45%, rgba(51,112,255,0.22), rgba(51,112,255,0.06) 45%, rgba(0,0,0,0) 70%)' }}
    />
  );
}

/** "Works in" and the app's name beside the phone during the switching
    scene, ending on "and any other messaging app!". */
const APP_NAMES = ['Messages', 'WhatsApp', 'Telegram', 'and any other messaging app!'];
function AppLabel({ t, start }: { t: number; start: number }) {
  const first = span(t, start + 0.2, start + 0.8, easeOutExpo);
  // Each name turns over at the middle of the swipe that reaches its app; the
  // last one has no swipe of its own.
  const turns = [start + 0.3, ...SWITCHES.map(([a, b]) => (a + b) / 2), ANY_APP_AT];
  return (
    <div className="absolute left-[150px] top-1/2 h-[260px] w-[760px] -translate-y-[60%]" style={{ fontFamily: DISPLAY }}>
      <div className="mb-2 text-[40px] font-semibold tracking-[-0.02em]" style={{ color: 'rgba(255,255,255,0.55)', opacity: first }}>
        Works in
      </div>
      {APP_NAMES.map((name, i) => {
        // The outgoing name clears before the incoming one rises.
        const inK = span(t, turns[i] + (i ? 0.1 : 0), turns[i] + (i ? 0.1 : 0) + 0.45, easeOutExpo);
        const next = i + 1 < APP_NAMES.length ? turns[i + 1] - 0.15 : Infinity;
        const outK = span(t, next, next + 0.25, (k) => k * k);
        if (inK <= 0 || outK >= 1) return null;
        const last = i === APP_NAMES.length - 1;
        return (
          <div
            key={name}
            className="absolute left-0 text-white"
            style={{
              top: 56,
              fontSize: last ? 84 : 104,
              fontWeight: 700,
              letterSpacing: '-0.035em',
              lineHeight: 1.05,
              opacity: inK * (1 - outK),
              transform: `translateY(${(1 - inK) * 40 - outK * 40}px)`,
              filter: `blur(${(1 - inK) * 8 + outK * 8}px)`,
            }}
          >
            {last ? (
              <>
                and any other
                <br />
                <span style={{ backgroundImage: `linear-gradient(100deg, ${BLUE_A}, ${BLUE_B} 60%, #B8CCFF)`, WebkitBackgroundClip: 'text', color: 'transparent' }}>
                  messaging app!
                </span>
              </>
            ) : (
              name
            )}
          </div>
        );
      })}
    </div>
  );
}

function Frame({ t }: { t: number }) {
  const shot = SHOTS.find((s) => t >= s.start && t < s.end) ?? SHOTS[SHOTS.length - 1];
  if (shot.kind === 'open') return <Opening shot={shot} t={t} />;
  if (shot.kind === 'title') return <TitleCard shot={shot} t={t} />;
  if (shot.kind === 'close') return <Closing shot={shot} t={t} />;
  // A quick exposure lift on every cut into a phone shot, like a flash frame.
  const flash = 1 - clamp01((t - shot.start) / 0.18);
  const out = shot.label ? span(t, shot.end - 0.3, shot.end, (k) => k * k) : 0;
  return (
    <>
      <PhoneStage cam={camAt(shot.keys, t)} t={t} glow={0.85 + 0.15 * easeOutCubic(clamp01((t - shot.start) / 0.6))} />
      {shot.label && <AppLabel t={t} start={shot.start} />}
      <div className="pointer-events-none absolute inset-0 bg-white" style={{ opacity: flash * 0.06 }} />
      <div className="pointer-events-none absolute inset-0 bg-black" style={{ opacity: out }} />
    </>
  );
}

export default function Film() {
  const params = new URLSearchParams(location.search);
  const still = params.get('t');
  const [t, setT] = useState(still ? parseFloat(still) : 0);

  useEffect(() => {
    window.__cues = cues();
    window.__seek = (ms: number) => {
      flushSync(() => setT(ms / 1000));
      syncAnimations(ms);
    };
    if (params.has('play')) {
      const t0 = performance.now();
      let raf = 0;
      const tick = (now: number) => {
        setT((((now - t0) / 1000) % DURATION));
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(raf);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative overflow-hidden bg-black" style={{ width: W, height: H }}>
      <Frame t={t} />
    </div>
  );
}

window.__ready ??= document.fonts.ready;
