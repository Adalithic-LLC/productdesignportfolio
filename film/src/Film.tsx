import { useEffect, useState } from 'react';
import { flushSync } from 'react-dom';
import Phone, { OUTER_W, OUTER_H } from './Phone';
import { SHOTS, DURATION, REVERSE_AT, camAt, cues, screenAt, type Cam, type Shot } from './timeline';
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
function syncAnimations(ms: number) {
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
          fontFamily: "'Inter Display', Inter, sans-serif",
          fontWeight: 700,
          fontSize: 136,
          letterSpacing: '-0.035em',
          lineHeight: 1.04,
          opacity: 1 - out,
          transform: `scale(${1 + local * 0.012}) translateY(${-out * 24}px)`,
          filter: `blur(${out * 8}px)`,
        }}
      >
        {shot.lines.map((l, i) => {
          const t0 = shot.start + 0.12 + wordIndex * 0.09 + i * 0.12;
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
          background: `radial-gradient(60% 70% at ${50 + cam.ry * 0.4}% ${58 - cam.rx * 0.3}%, rgba(51,112,255,0.30), rgba(51,112,255,0.08) 45%, rgba(0,0,0,0) 70%)`,
        }}
      />
      <div className="absolute inset-0" style={{ perspective: 2200, perspectiveOrigin: '50% 50%' }}>
        <div
          className="absolute left-0 top-0"
          style={{ width: OUTER_W, height: OUTER_H, transformOrigin: '0 0', transformStyle: 'preserve-3d', transform }}
        >
          <Phone s={s} glare={cam.ry / 30} />
        </div>
      </div>
    </div>
  );
}

function ArcatextMark({ size }: { size: number }) {
  return (
    <svg width={(size * 31) / 50} height={size} viewBox="0 0 31 50" fill="none">
      <defs>
        <linearGradient id="axm" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={BLUE_B} />
          <stop offset="1" stopColor={BLUE_A} />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="12" height="5" fill="url(#axm)" />
      <rect x="19" y="0" width="12" height="5" fill="url(#axm)" />
      <rect x="12" y="5" width="7" height="40" fill="url(#axm)" />
      <rect x="0" y="45" width="12" height="5" fill="url(#axm)" />
      <rect x="19" y="45" width="12" height="5" fill="url(#axm)" />
    </svg>
  );
}

function EndCard({ shot, t }: { shot: Extract<Shot, { kind: 'end' }>; t: number }) {
  const cam = camAt(shot.keys, t);
  const inPhone = span(t, shot.start, shot.start + 0.9, easeOutExpo);
  const a = (d: number) => span(t, shot.start + d, shot.start + d + 0.7, easeOutExpo);
  const fade = span(t, DURATION - 0.6, DURATION, (k) => k);
  const cam2: Cam = { ...cam, oy: cam.oy + (1 - inPhone) * 220, ry: cam.ry - (1 - inPhone) * 25 };
  return (
    <div className="absolute inset-0">
      <PhoneStage cam={cam2} t={t} />
      <div className="absolute left-[160px] top-1/2 -translate-y-1/2 text-white" style={{ fontFamily: "'Inter Display', Inter, sans-serif" }}>
        <div style={{ opacity: a(0.15), transform: `translateY(${(1 - a(0.15)) * 30}px)` }}>
          <ArcatextMark size={104} />
        </div>
        <div
          className="mt-8"
          style={{ fontSize: 150, fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1, opacity: a(0.3), transform: `translateY(${(1 - a(0.3)) * 30}px)` }}
        >
          Arcatext
        </div>
        <div className="mt-6" style={{ fontSize: 64, fontWeight: 600, letterSpacing: '-0.025em', lineHeight: 1.12, color: 'rgba(255,255,255,0.62)' }}>
          <div style={{ opacity: a(0.55), transform: `translateY(${(1 - a(0.55)) * 24}px)` }}>Write in yours.</div>
          <div style={{ opacity: a(0.75), transform: `translateY(${(1 - a(0.75)) * 24}px)` }}>
            Send in{' '}
            <span style={{ backgroundImage: `linear-gradient(100deg, ${BLUE_A}, ${BLUE_B})`, WebkitBackgroundClip: 'text', color: 'transparent' }}>
              theirs.
            </span>
          </div>
        </div>
      </div>
      <div className="absolute inset-0 bg-black" style={{ opacity: fade }} />
    </div>
  );
}

function Frame({ t }: { t: number }) {
  const shot = SHOTS.find((s) => t >= s.start && t < s.end) ?? SHOTS[SHOTS.length - 1];
  if (shot.kind === 'title') return <TitleCard shot={shot} t={t} />;
  if (shot.kind === 'end') return <EndCard shot={shot} t={t} />;
  // A quick exposure lift on every cut into a phone shot, like a flash frame.
  const flash = 1 - clamp01((t - shot.start) / 0.18);
  return (
    <>
      <PhoneStage cam={camAt(shot.keys, t)} t={t} glow={0.85 + 0.15 * easeOutCubic(clamp01((t - shot.start) / 0.6))} />
      <div className="pointer-events-none absolute inset-0 bg-white" style={{ opacity: flash * 0.06 }} />
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

window.__ready = document.fonts.ready;
