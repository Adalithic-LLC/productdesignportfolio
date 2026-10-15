import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { ArrowUp, Plus } from 'lucide-react';
import { AX } from '@/lib/arcatextTheme';
import { Keyboard, GlobeRow, Touch } from '../Phone';
import { BrandLockup, Glow, syncAnimations } from '../Film';
import { clamp01, easeInOutCubic, easeOutBack, easeOutCubic, lerp, span } from '../ease';
import {
  DURATION,
  ENDING,
  FIELD_JA,
  FIELD_TEXT,
  FIELD_TIMES,
  PAN,
  REWORD_DONE,
  REWORD_TAP,
  SEND_AT,
  SEND_TAP,
  TIMED,
  cues,
  type Timed,
  type Who,
} from './chatTimeline';

/**
 * The chat film: one 1920x1080 frame as a pure function of time. The world is
 * laid out in iOS points (a 402pt column, like the phone films) and a camera
 * scales it up; nothing is drawn around it, so the bubbles float.
 *
 * Bubbles are absolutely stacked up from the conversation's bottom edge, like
 * Messages, and only the latest two stay: older ones fade out as new ones
 * arrive. Every bubble's height at every typed length is measured once at
 * load, so a typed bubble can grow a line smoothly and push the ones above it
 * up without any state carried between frames.
 */

const W = 1920;
const H = 1080;
const COL = 402;
const FONT = "Inter, 'Noto Sans JP', sans-serif";
const LINE = 22;
const MAX_W = 312;
const SIDE = 14;
const RECV = '#2C2C2E';
const SLOT_COLOR = '#A9C2FF';
/** How long an older bubble takes to fade out once two newer ones are up. */
const FADE_OUT = 0.4;

type Metrics = {
  /** heights[i][k]: bubble i's height with k characters typed. */
  heights: number[][];
  /** slotW[i][j]: the width of bubble i's j-th slot word. */
  slotW: number[][];
  /** The height of an inline-slot bubble with its widest word in place. */
  inlineH: number[];
};

const bubbleStyle = {
  fontFamily: FONT,
  fontSize: 17,
  lineHeight: `${LINE}px`,
  padding: '7px 12px',
  maxWidth: MAX_W,
  borderRadius: 18,
  letterSpacing: '-0.01em',
} as const;

/** Lays every bubble out off screen at every length and records the sizes. */
function measure(root: HTMLElement): Metrics {
  const probe = document.createElement('div');
  Object.assign(probe.style, {
    position: 'absolute',
    left: '-10000px',
    top: '0',
    visibility: 'hidden',
    width: 'fit-content',
    boxSizing: 'border-box',
    whiteSpace: 'pre-wrap',
    overflowWrap: 'break-word',
    ...Object.fromEntries(Object.entries(bubbleStyle).map(([k, v]) => [k, typeof v === 'number' ? `${v}px` : v])),
  });
  root.appendChild(probe);
  const word = document.createElement('span');
  Object.assign(word.style, { position: 'absolute', left: '-10000px', visibility: 'hidden', whiteSpace: 'nowrap', fontFamily: FONT, fontSize: '17px', fontWeight: '600' });
  root.appendChild(word);

  const heights = TIMED.map((m) => {
    const out = [0];
    for (let k = 1; k <= m.text.length; k++) {
      probe.textContent = m.text.slice(0, k);
      out.push(probe.offsetHeight);
    }
    return out;
  });
  const slotW = TIMED.map((m) =>
    (m.slot ?? []).map((w) => {
      word.textContent = w;
      return word.offsetWidth;
    }),
  );
  // An inline slot sits after the text on its last line; size the bubble for
  // whichever word needs the most room, so the reel never re-wraps it.
  const inlineH = TIMED.map((m) => {
    if (!m.slot || !m.slotInline) return 0;
    return Math.max(
      ...m.slot.map((w) => {
        probe.textContent = m.text + ' ';
        const s = document.createElement('span');
        Object.assign(s.style, { display: 'inline-block', fontWeight: '600', whiteSpace: 'nowrap' });
        s.textContent = w;
        probe.appendChild(s);
        return probe.offsetHeight;
      }),
    );
  });
  probe.remove();
  word.remove();
  return { heights, slotW, inlineH };
}

// ── Bubble geometry over time ────────────────────────────────────────────────

const typedCount = (m: Timed, t: number) => {
  let n = 0;
  while (n < m.chars.length && m.chars[n] <= t) n++;
  return n;
};

/** The height a bubble occupies at time t, eased as it gains lines. */
function heightAt(m: Timed, met: Metrics, t: number): number {
  const hs = met.heights[m.index];
  if (m.kind === 'block') return hs[hs.length - 1];
  const n = typedCount(m, t);
  if (n === 0) return 0;
  let h = hs[n];
  // The most recent line break: ease from the old height to the new one.
  for (let j = n; j >= 2; j--) {
    if (hs[j] !== hs[j - 1]) {
      h = lerp(hs[j - 1], hs[n], easeOutCubic(clamp01((t - m.chars[j - 1]) / 0.2)));
      break;
    }
  }
  if (m.slot && t >= m.slotAt) {
    const grow = easeOutCubic(clamp01((t - m.slotAt) / 0.25));
    h = m.slotInline ? lerp(h, met.inlineH[m.index], grow) : h + LINE * grow;
  }
  return h;
}

/** How much of its height a bubble claims in the stack (0..1 as it arrives). */
const arrival = (at: number, t: number, len = 0.3) => easeOutCubic(clamp01((t - at) / len));

// ── Pieces ───────────────────────────────────────────────────────────────────

/** Messages' tail, at the bubble's bottom outer corner. */
function Tail({ who, color }: { who: Who; color: string }) {
  return (
    <svg
      width="17"
      height="21"
      viewBox="0 0 17 21"
      className="absolute bottom-0"
      style={who === 'me' ? { right: -5 } : { left: -5, transform: 'scaleX(-1)' }}
    >
      <path d="M0 0 H5 C5 9 8 16 16.5 20.3 C10 21.4 4 19.6 0 15.5 Z" fill={color} />
    </svg>
  );
}

/** The slot machine: the first word appears, then the reel rolls word to word. */
function Slot({ m, met, t }: { m: Timed; met: Metrics; t: number }) {
  const words = m.slot!;
  const n = words.length;
  const widths = met.slotW[m.index];
  const reelPos = (tt: number) => {
    // The first word simply appears on its line; the reel rolls from there.
    let p = 2 * n;
    for (let i = 1; i < n; i++) {
      const rollStart = m.slotLands[i] - 0.32;
      if (tt >= m.slotLands[i]) p = 2 * n + i;
      else if (tt >= rollStart) p = 2 * n + (i - 1) + easeOutBack((tt - rollStart) / 0.32);
    }
    return p;
  };
  const p = reelPos(t);
  const v = Math.abs(p - reelPos(t - 1 / 60)) * 60;
  const word = (j: number) => words[((j % n) + n) % n];
  const width = (j: number) => widths[((j % n) + n) % n];
  const base = Math.floor(p);
  const frac = p - base;
  const w = lerp(width(base), width(base + 1), frac);
  const items = [];
  for (let j = base - 1; j <= base + 2; j++) {
    items.push(
      <div key={j} className="absolute left-0 whitespace-nowrap font-semibold" style={{ top: (j - p) * LINE, height: LINE, color: SLOT_COLOR }}>
        {word(j)}
      </div>,
    );
  }
  const reel = (
    <span
      className="relative inline-block overflow-hidden align-top"
      style={{ width: Math.max(w, 1), height: LINE, filter: `blur(${Math.min(2.5, v * 0.12)}px)`, opacity: easeOutCubic(clamp01((t - m.slotAt) / 0.3)) }}
    >
      {items}
    </span>
  );
  return m.slotInline ? <> {reel}</> : <div style={{ height: LINE }}>{reel}</div>;
}

function Bubble({ m, met, t, h, tail }: { m: Timed; met: Metrics; t: number; h: number; tail: boolean }) {
  const color = m.who === 'me' ? AX.send : RECV;
  const typed = m.kind === 'type' ? m.text.slice(0, typedCount(m, t)) : m.text;
  // Arrivals: a block pops from its tail corner; a typed bubble eases open.
  const k = m.kind === 'block' ? clamp01((t - m.at) / 0.38) : clamp01((t - m.at) / 0.18);
  const scale = m.kind === 'block' ? 0.55 + 0.45 * easeOutBack(k) : 0.85 + 0.15 * easeOutCubic(k);
  return (
    <div
      className="relative"
      style={{
        transformOrigin: m.who === 'me' ? '100% 100%' : '0% 100%',
        transform: `scale(${scale})`,
        opacity: clamp01(k * 2.5),
      }}
    >
      <div
        className="overflow-hidden text-white"
        style={{ ...bubbleStyle, background: color, height: m.kind === 'type' ? h : undefined, width: 'fit-content', whiteSpace: 'pre-wrap', overflowWrap: 'break-word' }}
      >
        {typed}
        {m.slot && t >= m.slotAt && <Slot m={m} met={met} t={t} />}
      </div>
      {tail && <Tail who={m.who} color={color} />}
    </div>
  );
}

/** The field above the keyboard, Messages-style, in dark mode. */
function Field({ t }: { t: number }) {
  let n = 0;
  while (n < FIELD_TIMES.length && FIELD_TIMES[n] <= t) n++;
  const sent = t >= SEND_AT;
  const swap = t >= REWORD_DONE ? clamp01((t - REWORD_DONE) / 0.32) : 0;
  const en = FIELD_TEXT.slice(0, n);
  const hasText = !sent && n > 0;
  const typing = n > 0 && t < FIELD_TIMES[FIELD_TIMES.length - 1] + 0.4;
  const cursor = (
    <span
      className="ml-[1px] inline-block h-[18px] w-[2px] translate-y-[3px] rounded-full"
      style={{ background: AX.send, opacity: typing || Math.floor(t * 2) % 2 === 0 ? 1 : 0 }}
    />
  );
  return (
    <div className="flex items-end gap-2 px-3" style={{ fontFamily: FONT }}>
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full" style={{ background: AX.plusBg }}>
        <Plus className="h-5 w-5" style={{ color: AX.plusIcon }} strokeWidth={2.6} />
      </div>
      <div className="relative flex min-h-9 min-w-0 flex-1 items-end rounded-[18px] border py-[7px] pl-4 pr-2" style={{ borderColor: AX.fieldBorder }}>
        {hasText ? (
          <span className="relative min-w-0 flex-1 text-[16px] leading-5" style={{ color: AX.ink }}>
            <span className="block break-words" style={{ opacity: swap ? swap : 1, filter: swap ? `blur(${(1 - swap) * 6}px)` : undefined }}>
              {swap ? FIELD_JA : en}
              {cursor}
            </span>
            {swap > 0 && swap < 1 && (
              <span className="absolute inset-x-0 top-0 block break-words" style={{ opacity: 1 - swap, filter: `blur(${swap * 6}px)` }}>
                {en}
              </span>
            )}
          </span>
        ) : (
          <span className="text-[16px] leading-5" style={{ color: AX.fieldPlaceholder }}>
            Message
          </span>
        )}
      </div>
      <div className="relative h-9 w-9 shrink-0" style={{ opacity: hasText ? 1 : 0.35 }}>
        {t >= SEND_TAP && t < SEND_AT && <Touch />}
        <div
          className="relative grid h-9 w-9 place-items-center rounded-full"
          style={{ backgroundColor: AX.send, transform: t >= SEND_TAP && t < SEND_AT ? 'scale(0.86)' : undefined }}
        >
          <ArrowUp className="h-5 w-5 text-white" strokeWidth={2.8} />
        </div>
      </div>
    </div>
  );
}

function keyboardState(t: number) {
  let n = 0;
  while (n < FIELD_TIMES.length && FIELD_TIMES[n] <= t) n++;
  const last = n > 0 ? FIELD_TEXT[n - 1] : '';
  const down = n > 0 && t - FIELD_TIMES[n - 1] < 0.075 && t < FIELD_TIMES[FIELD_TIMES.length - 1] + 0.075;
  return {
    t,
    text: t >= SEND_AT ? '' : FIELD_TEXT.slice(0, n),
    keyDown: down ? (last === ' ' ? 'space' : /[a-z]/i.test(last) ? last.toLowerCase() : '123') : null,
    pressed: t >= REWORD_TAP && t < REWORD_TAP + 0.22 ? 'reword' : null,
    rewordLoading: t >= REWORD_TAP && t < REWORD_DONE,
  };
}

// ── The frame ────────────────────────────────────────────────────────────────

/** The reply, once sent, joins the conversation like any other bubble. */
const SENT: Timed = {
  who: 'me',
  kind: 'block',
  text: FIELD_JA,
  index: TIMED.length,
  at: SEND_AT,
  chars: [],
  slotAt: Infinity,
  slotLands: [],
  done: SEND_AT + 0.3,
};

function Conversation({ met, t }: { met: Metrics; t: number }) {
  const all = [...TIMED, SENT].filter((m) => t >= m.at);
  const placed: { m: Timed; bottom: number; h: number; tail: boolean; out: number }[] = [];
  let y = 0;
  for (let i = all.length - 1; i >= 0; i--) {
    const m = all[i];
    // Only the latest two stay: a bubble fades out as the one two after it
    // arrives, and is gone once faded.
    const pusher = all[i + 2];
    const out = pusher ? clamp01((t - pusher.at) / FADE_OUT) : 0;
    if (out >= 1) break;
    const h = m === SENT ? met.heights[TIMED.length]?.at(-1) ?? 36 : heightAt(m, met, t);
    const claim = m.kind === 'block' ? arrival(m.at, t) : arrival(m.at, t, 0.2);
    const next = all[i + 1];
    placed.push({ m, bottom: y, h, tail: !next || next.who !== m.who, out });
    const above = all[i - 1];
    y += h * claim + (above ? (above.who === m.who ? 3 : 12) : 0) * claim;
  }
  return (
    <>
      {placed.map(({ m, bottom, h, tail, out }) => {
        // The sent reply rises out of the field below.
        const rise = m === SENT ? (1 - easeOutCubic(clamp01((t - SEND_AT) / 0.45))) * 70 : 0;
        const o = easeOutCubic(out);
        return (
          <div
            key={m.index}
            className="absolute"
            style={{
              bottom,
              transform: `translateY(${rise - o * 10}px)`,
              opacity: 1 - o,
              filter: o > 0 ? `blur(${o * 4}px)` : undefined,
              ...(m.who === 'me' ? { right: SIDE } : { left: SIDE }),
            }}
          >
            <Bubble m={m} met={met} t={t} h={h} tail={tail} />
          </div>
        );
      })}
    </>
  );
}

function World({ met, t }: { met: Metrics; t: number }) {
  // The camera: close on the conversation, then a pan down (and back) to
  // frame the field and the keyboard under it.
  const k = easeInOutCubic(clamp01((t - PAN[0]) / (PAN[1] - PAN[0])));
  const scale = lerp(2.35, 1.6, k);
  const bottomY = lerp(760, 335, k);
  // The field waits out of shot, then settles under the last bubble.
  const gap = lerp(90, 14, k);
  const fade = span(t, ENDING - 0.35, ENDING, (x) => x);
  return (
    <div
      className="dark absolute left-0 top-0"
      style={{
        width: COL,
        transformOrigin: '0 0',
        transform: `translate(${W / 2 - (COL / 2) * scale}px, ${bottomY}px) scale(${scale})`,
        opacity: 1 - fade,
      }}
    >
      {/* The conversation stacks upward from y = 0. */}
      <div className="absolute bottom-0 left-0" style={{ width: COL, height: 2000 }}>
        <Conversation met={met} t={t} />
      </div>
      <div className="absolute left-0" style={{ top: gap, width: COL, opacity: clamp01((t - PAN[0]) / 0.4) }}>
        <Field t={t} />
        <div className="mt-2 overflow-hidden rounded-[26px] ring-1 ring-white/10">
          <Keyboard s={keyboardState(t)} />
          <GlobeRow />
        </div>
      </div>
    </div>
  );
}

function Ending({ t }: { t: number }) {
  const sub = span(t, ENDING + 1.2, ENDING + 1.9, (x) => 1 - (1 - x) ** 3);
  const fade = span(t, DURATION - 0.6, DURATION, (x) => x);
  return (
    <div className="absolute inset-0 grid place-items-center bg-black">
      <Glow />
      <div style={{ transform: `scale(${1 + (t - ENDING) * 0.008})` }}>
        <BrandLockup t={t} t0={ENDING}>
          <div className="mt-7" style={{ fontSize: 60, fontWeight: 600, letterSpacing: '-0.02em', color: 'rgba(255,255,255,0.62)', opacity: sub, transform: `translateY(${(1 - sub) * 26}px)` }}>
            Text and learn a language
          </div>
        </BrandLockup>
      </div>
      <div className="absolute inset-0 bg-black" style={{ opacity: fade }} />
    </div>
  );
}

let resolveReady: () => void;
export const chatReady = new Promise<void>((r) => (resolveReady = r));

export default function ChatFilm() {
  const params = new URLSearchParams(location.search);
  const still = params.get('t');
  const [t, setT] = useState(still ? parseFloat(still) : 0);
  const [met, setMet] = useState<Metrics | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    let live = true;
    // Measure only once the bubble fonts are really loaded: nothing on screen
    // uses them yet, so document.fonts.ready alone resolves on the fallback.
    // Inter comes from a Google Fonts @import that lands after the page loads;
    // until its faces are registered, a load() resolves on the local fallback.
    const interRegistered = new Promise<void>((resolve) => {
      const t0 = performance.now();
      const check = () =>
        [...document.fonts].some((f) => f.family.replace(/["']/g, '') === 'Inter') || performance.now() - t0 > 8000
          ? resolve()
          : setTimeout(check, 50);
      check();
    });
    interRegistered.then(() => Promise.all([
      document.fonts.load('17px Inter', 'Want a new way'),
      document.fonts.load('600 17px Inter', 'interests'),
      document.fonts.load("17px 'Noto Sans JP'", 'なるほど'),
    ]))
      .then(() => document.fonts.ready)
      .then(() => {
      if (!live || !rootRef.current) return;
      const m = measure(rootRef.current);
      // The sent reply's height, measured as one more bubble.
      const probe = document.createElement('div');
      Object.assign(probe.style, { position: 'absolute', left: '-10000px', visibility: 'hidden', width: 'fit-content', maxWidth: `${MAX_W}px`, padding: '7px 12px', fontFamily: FONT, fontSize: '17px', lineHeight: `${LINE}px` });
      probe.textContent = FIELD_JA;
      rootRef.current.appendChild(probe);
      m.heights.push([probe.offsetHeight]);
      probe.remove();
      flushSync(() => setMet(m));
      resolveReady();
    });
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    window.__cues = cues() as never;
    window.__seek = (ms: number) => {
      flushSync(() => setT(ms / 1000));
      syncAnimations(ms);
    };
    if (params.has('play')) {
      const t0 = performance.now();
      let raf = 0;
      const tick = (now: number) => {
        setT(((now - t0) / 1000) % DURATION);
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(raf);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={rootRef} className="relative overflow-hidden bg-black" style={{ width: W, height: H }}>
      {met && t < ENDING && (
        <>
          <div className="absolute inset-0" style={{ background: 'radial-gradient(55% 60% at 50% 70%, rgba(51,112,255,0.16), rgba(51,112,255,0.04) 50%, rgba(0,0,0,0) 75%)' }} />
          <World met={met} t={t} />
        </>
      )}
      {t >= ENDING && <Ending t={t} />}
    </div>
  );
}
