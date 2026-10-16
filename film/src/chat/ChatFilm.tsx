import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { ArrowUp, Plus } from 'lucide-react';
import { AX } from '@/lib/arcatextTheme';
import { StudyPanel, VIEW_H } from '@/components/ArcatextViews';
import { Keyboard, GlobeRow, Touch } from '../Phone';
import { Glow, syncAnimations } from '../Film';
import SplashLogo, { SPLASH_DONE } from '../SplashLogo';
import { clamp01, easeInOutCubic, easeOutBack, easeOutCubic, lerp, span } from '../ease';
import {
  DURATION,
  ENDING,
  FIELD_JA,
  END_FADE,
  PAN,
  BACK,
  PAN2,
  CAMERA,
  START_VIEW,
  SHORT,
  STUDY_GROW,
  STUDY_FLICK,
  HIDE_SENT,
  TAGLINE_LANDS,
  TAGLINE_FLICK_START,
  TAGLINE_WORDS,
  FIELD_MSGS,
  STUDY_OPEN,
  STUDY_ROWS,
  STUDY_ROWS_DATA,
  STUDY_SKELETON,
  STUDY_TAP,
  TIMED,
  FRAME,
  PORTRAIT,
  STAGE,
  flickEase,
  cues,
  type FieldMsg,
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

const W = FRAME.w;
const H = FRAME.h;
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
  /** slotTypeW[i][k]: the width of the first k letters of bubble i's first
      slot word, as it types on. */
  slotTypeW: number[][];
  /** The same for the last slot word, where it types on (slotTypeLast). */
  slotLastTypeW: number[][];
  /** The height of an inline-slot bubble with its widest word in place. */
  inlineH: number[];
  /** lineW[i][k]: the widest line of bubble i's text with k characters typed,
      so a wrapped bubble hugs its text like Messages instead of filling its
      max width. */
  lineW: number[][];
  /** For inline slots: the full text's last line, and its widest other line. */
  lastW: number[];
  otherW: number[];
  spaceW: number;
  /** For a `focusPhrase`: the phrase's centre within its bubble (from the
      bubble's top-left, padding included). */
  phrase: ({ x: number; y: number } | null)[];
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
function measure(root: HTMLElement, extra: string[]): Metrics {
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

  /** The width of each laid-out line of the probe's text, top to bottom. */
  const lineWidths = () => {
    const range = document.createRange();
    range.selectNodeContents(probe);
    const byTop = new Map<number, [number, number]>();
    for (const r of range.getClientRects()) {
      const key = Math.round(r.top);
      const [l, rt] = byTop.get(key) ?? [Infinity, -Infinity];
      byTop.set(key, [Math.min(l, r.left), Math.max(rt, r.right)]);
    }
    return [...byTop.entries()].sort((a, b) => a[0] - b[0]).map(([, [l, r]]) => r - l);
  };

  // Every bubble at every typed length, then the sent replies (whole).
  const texts = [...TIMED.map((m) => m.text), ...extra];
  const heights: number[][] = [];
  const lineW: number[][] = [];
  texts.forEach((text, i) => {
    const noWrap = !!TIMED[i]?.noWrap;
    probe.style.whiteSpace = noWrap ? 'pre' : 'pre-wrap';
    probe.style.maxWidth = noWrap ? 'none' : `${TIMED[i]?.maxW ?? MAX_W}px`;
    const hs = [0];
    const ws = [0];
    const from = i < TIMED.length ? 1 : text.length;
    for (let k = from; k <= text.length; k++) {
      probe.textContent = text.slice(0, k);
      hs[k] = probe.offsetHeight;
      ws[k] = Math.max(...lineWidths());
    }
    heights.push(hs);
    lineW.push(ws);
  });
  probe.style.whiteSpace = 'pre-wrap';
  probe.style.maxWidth = `${MAX_W}px`;
  const lastW: number[] = [];
  const otherW: number[] = [];
  TIMED.forEach((m) => {
    probe.style.maxWidth = `${m.maxW ?? MAX_W}px`;
    probe.textContent = m.text;
    const ls = lineWidths();
    lastW.push(ls[ls.length - 1]);
    otherW.push(Math.max(0, ...ls.slice(0, -1)));
  });
  const phrase = TIMED.map((m) => {
    const at = m.focusPhrase ? m.text.indexOf(m.focusPhrase) : -1;
    if (at < 0) return null;
    probe.style.whiteSpace = m.noWrap ? 'pre' : 'pre-wrap';
    probe.style.maxWidth = m.noWrap ? 'none' : `${m.maxW ?? MAX_W}px`;
    probe.textContent = m.text;
    const range = document.createRange();
    range.setStart(probe.firstChild!, at);
    range.setEnd(probe.firstChild!, at + m.focusPhrase!.length);
    const r = range.getBoundingClientRect();
    const box = probe.getBoundingClientRect();
    return { x: r.left + r.width / 2 - box.left, y: r.top + r.height / 2 - box.top };
  });
  word.style.fontWeight = '400';
  word.textContent = 'a b';
  const ab = word.offsetWidth;
  word.textContent = 'ab';
  const spaceW = ab - word.offsetWidth;
  word.style.fontWeight = '600';
  const slotTypeW = TIMED.map((m) => {
    const w0 = m.slot?.[0] ?? '';
    return [...w0].map((_, k) => {
      word.textContent = w0.slice(0, k + 1);
      return word.offsetWidth;
    });
  });
  const slotLastTypeW = TIMED.map((m) => {
    const wl = m.slotTypeLast ? m.slot![m.slot!.length - 1] : '';
    return [...wl].map((_, k) => {
      word.textContent = wl.slice(0, k + 1);
      return word.offsetWidth;
    });
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
    probe.style.maxWidth = `${m.maxW ?? MAX_W}px`;
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
  return { heights, slotW, slotTypeW, slotLastTypeW, inlineH, lineW, lastW, otherW, spaceW, phrase };
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
  if (m.kind === 'block') {
    const full = hs[hs.length - 1];
    if (!m.slot) return full;
    return m.slotInline ? met.inlineH[m.index] : full + LINE;
  }
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
/** Where a slot's reel is (in words, fractional while rolling) at time t. */
function reelPos(m: Timed, tt: number) {
  const n = m.slot!.length;
  // The first word simply appears on its line; the reel rolls from there.
  const L = m.slotLands;
  const f = m.flick;
  // A flick spins as one continuous motion, not word by word.
  if (f && tt >= f.from) return 2 * n + f.startIdx + (n - 1 - f.startIdx) * flickEase((tt - f.from) / (f.to - f.from));
  let p = 2 * n;
  for (let i = 1; i < (f ? f.startIdx + 1 : n); i++) {
    if (tt >= L[i]) {
      p = 2 * n + i;
      continue;
    }
    // A roll takes 0.32s, or less when the words come faster (a flick); a
    // fast roll is linear so the run reads as a spin, a readable one springs.
    // (Bounded by the next gap too, so a flick's first word spins straight
    // off the hold before it rather than easing out of it.)
    const next = i + 1 < n ? L[i + 1] - L[i] : Infinity;
    const roll = Math.min(0.32, 0.9 * (L[i] - L[i - 1]), 0.9 * next);
    if (tt >= L[i] - roll) {
      const k = (tt - (L[i] - roll)) / roll;
      p = 2 * n + (i - 1) + (roll >= 0.2 ? easeOutBack(k) : k);
    }
    break;
  }
  return p;
}

/** The reel's width at time t, eased between the words it rolls through. */
const slotTyped = (m: Timed, t: number) => m.slotChars.filter((c) => c <= t).length;
const slotLastTyped = (m: Timed, t: number) => m.slotLastChars.filter((c) => c <= t).length;
/** Whether the last word is typing on (or typed) in place of the reel. */
const typingLast = (m: Timed, t: number) => m.slotLastChars.length > 0 && t >= m.slotLastChars[0];

function slotWidthAt(m: Timed, met: Metrics, t: number) {
  const n = m.slot!.length;
  const widths = met.slotW[m.index];
  if (t < m.slotLands[0]) return met.slotTypeW[m.index][slotTyped(m, t) - 1] ?? 0;
  if (typingLast(m, t)) return met.slotLastTypeW[m.index][slotLastTyped(m, t) - 1] ?? 0;
  const width = (j: number) => widths[((j % n) + n) % n];
  const p = reelPos(m, t);
  const base = Math.floor(p);
  const fl = m.slotFlick;
  if (fl) {
    // Through a flick the reel holds the width of its widest word, so the
    // bubble doesn't flutter as dozens of words spin past.
    const a = 2 * n + fl.holds - 1;
    const b = 2 * n + n - 2;
    const wide = Math.max(...widths.slice(fl.holds, n - 1));
    if (p > a && p < a + 1) return lerp(width(a), wide, p - a);
    if (p >= a + 1 && p <= b) return wide;
    if (p > b) return lerp(wide, width(n - 1), p - b);
  }
  return lerp(width(base), width(base + 1), p - base);
}

function Slot({ m, met, t }: { m: Timed; met: Metrics; t: number }) {
  if (t < m.slotLands[0] || typingLast(m, t)) {
    // The first word types on, like the text before it (and the last, with slotTypeLast).
    const last = typingLast(m, t);
    const typed = last ? m.slot![m.slot!.length - 1].slice(0, slotLastTyped(m, t)) : m.slot![0].slice(0, slotTyped(m, t));
    const span = <span className="whitespace-nowrap font-semibold" style={{ color: SLOT_COLOR }}>{typed}</span>;
    return m.slotInline ? <> {span}</> : <div style={{ height: LINE }}>{span}</div>;
  }
  const words = m.slot!;
  const n = words.length;
  const p = reelPos(m, t);
  const v = Math.abs(p - reelPos(m, t - 1 / 60)) * 60;
  const word = (j: number) => words[((j % n) + n) % n];
  const base = Math.floor(p);
  const w = slotWidthAt(m, met, t);
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
      style={{ width: Math.max(w, 1), height: LINE, filter: `blur(${Math.min(2.5, v * 0.12)}px)` }}
    >
      {items}
    </span>
  );
  return m.slotInline ? <> {reel}</> : <div style={{ height: LINE }}>{reel}</div>;
}

/** The typed text, with any underlined phrases drawn as their letters land. */
function TypedText({ m, n }: { m: Timed; n: number }) {
  const marks: [number, number][] = (m.underline ?? [])
    .map((p) => [m.text.indexOf(p), m.text.indexOf(p) + p.length] as [number, number])
    .filter(([a]) => a >= 0)
    .sort((a, b) => a[0] - b[0]);
  if (!marks.length) return <>{m.text.slice(0, n)}</>;
  const parts = [];
  let i = 0;
  for (const [a, b] of marks) {
    if (n <= a) break;
    if (a > i) parts.push(m.text.slice(i, a));
    parts.push(
      <span
        key={a}
        style={{ textDecoration: 'underline', textDecorationColor: SLOT_COLOR, textDecorationThickness: 2, textUnderlineOffset: 4, textDecorationSkipInk: 'none' }}
      >
        {m.text.slice(a, Math.min(b, n))}
      </span>,
    );
    i = Math.min(b, n);
  }
  if (n > i) parts.push(m.text.slice(i, n));
  return <>{parts}</>;
}

function Bubble({ m, met, t, h, tail }: { m: Timed; met: Metrics; t: number; h: number; tail: boolean }) {
  const color = m.who === 'me' ? AX.send : RECV;
  const n = m.kind === 'type' ? typedCount(m, t) : m.text.length;
  // Hug the text: its widest line, or the reel if that's wider.
  let contentW = met.lineW[m.index][n] ?? 0;
  if (m.slot && t >= m.slotAt) {
    const sw = slotWidthAt(m, met, t);
    contentW = m.slotInline ? Math.max(met.otherW[m.index], met.lastW[m.index] + met.spaceW + sw) : Math.max(contentW, sw);
  }
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
        style={{ ...bubbleStyle, background: color, height: m.kind === 'type' || m.slot ? h : undefined, width: Math.ceil(contentW) + 25, whiteSpace: m.noWrap ? 'pre' : 'pre-wrap', maxWidth: m.noWrap ? 'none' : m.maxW ?? MAX_W, overflowWrap: 'break-word' }}
      >
        <TypedText m={m} n={n} />
        {m.slot && t >= m.slotAt && <Slot m={m} met={met} t={t} />}
      </div>
      {tail && <Tail who={m.who} color={color} />}
    </div>
  );
}

/** What the field holds at time t: the message being typed, reworded or sent. */
function fieldAt(t: number) {
  // The latest message whose typing has begun (the first before any).
  let m: FieldMsg = FIELD_MSGS[0];
  for (const f of FIELD_MSGS) if (t >= f.times[0]) m = f;
  let n = 0;
  while (n < m.times.length && m.times[n] <= t) n++;
  const last = n > 0 ? m.en[n - 1] : '';
  const sent = t >= m.clearAt;
  const typingEnd = m.times[m.times.length - 1];
  return {
    m,
    n,
    en: m.en.slice(0, n),
    sent,
    hasText: !sent && n > 0,
    swap: t >= m.rewordDone ? clamp01((t - m.rewordDone) / 0.32) : 0,
    typing: n > 0 && t < typingEnd + 0.4,
    keyDown:
      n > 0 && t - m.times[n - 1] < 0.075 && t < typingEnd + 0.075
        ? last === ' ' ? 'space' : /[a-z]/i.test(last) ? last.toLowerCase() : '123'
        : null,
    sendPressed: t >= m.sendTap && t < m.sendAt,
  };
}

/** The field above the keyboard, Messages-style, in dark mode. */
function Field({ t }: { t: number }) {
  const f = fieldAt(t);
  const cursor = (
    <span
      className="ml-[1px] inline-block h-[18px] w-[2px] translate-y-[3px] rounded-full"
      style={{ background: AX.send, opacity: f.typing || Math.floor(t * 2) % 2 === 0 ? 1 : 0 }}
    />
  );
  return (
    <div className="flex items-end gap-2 px-3" style={{ fontFamily: FONT }}>
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full" style={{ background: AX.plusBg }}>
        <Plus className="h-5 w-5" style={{ color: AX.plusIcon }} strokeWidth={2.6} />
      </div>
      <div className="relative flex min-h-9 min-w-0 flex-1 items-end rounded-[18px] border py-[7px] pl-4 pr-2" style={{ borderColor: AX.fieldBorder }}>
        {f.hasText ? (
          <span className="relative min-w-0 flex-1 text-[16px] leading-5" style={{ color: AX.ink }}>
            <span className="block break-words" style={{ opacity: f.swap ? f.swap : 1, filter: f.swap ? `blur(${(1 - f.swap) * 6}px)` : undefined }}>
              {f.swap ? f.m.ja : f.en}
              {cursor}
            </span>
            {f.swap > 0 && f.swap < 1 && (
              <span className="absolute inset-x-0 top-0 block break-words" style={{ opacity: 1 - f.swap, filter: `blur(${f.swap * 6}px)` }}>
                {f.en}
              </span>
            )}
          </span>
        ) : (
          <span className="text-[16px] leading-5" style={{ color: AX.fieldPlaceholder }}>
            Message
          </span>
        )}
      </div>
      <div className="relative h-9 w-9 shrink-0" style={{ opacity: f.hasText ? 1 : 0.35 }}>
        {f.sendPressed && <Touch />}
        <div
          className="relative grid h-9 w-9 place-items-center rounded-full"
          style={{ backgroundColor: AX.send, transform: f.sendPressed ? 'scale(0.86)' : undefined }}
        >
          <ArrowUp className="h-5 w-5 text-white" strokeWidth={2.8} />
        </div>
      </div>
    </div>
  );
}

function keyboardState(t: number) {
  const f = fieldAt(t);
  const rewording = FIELD_MSGS.find((m) => t >= m.rewordTap && t < m.rewordDone);
  let pressed: string | null = null;
  if (rewording && t < rewording.rewordTap + 0.22) pressed = 'reword';
  if (t >= STUDY_TAP && t < STUDY_OPEN) pressed = 'study';
  return {
    t,
    text: f.sent ? '' : f.en,
    // No key popups in this film: the keys stay flat while the field types.
    keyDown: null,
    pressed,
    rewordLoading: false,
  };
}

// ── The frame ────────────────────────────────────────────────────────────────

/** The reply, once sent, joins the conversation like any other bubble. */
/** Replies sent from the field join the conversation like any other bubble. */
const SENT: Timed[] = FIELD_MSGS.filter((f) => Number.isFinite(f.sendAt)).map((f, j) => ({
  who: 'me',
  kind: 'block',
  text: f.ja,
  index: TIMED.length + j,
  at: f.sendAt,
  chars: [],
  slotAt: Infinity,
  slotChars: [],
  slotLastChars: [],
  slotLands: [],
  done: f.sendAt + 0.3,
}));

function Conversation({ met, t }: { met: Metrics; t: number }) {
  const all = [...TIMED, ...SENT].filter((m) => t >= m.at).sort((a, b) => a.at - b.at);
  const placed: { m: Timed; bottom: number; h: number; tail: boolean; out: number }[] = [];
  let y = 0;
  for (let i = all.length - 1; i >= 0; i--) {
    const m = all[i];
    // Only the latest two stay: a bubble fades out as the one two after it
    // arrives, and is gone once faded…
    let fadeAt = all[i + 2]?.at ?? Infinity;
    // …or as a later line that stands alone arrives…
    const clearer = all.slice(i + 1).find((x) => x.clearAbove);
    if (clearer) fadeAt = Math.min(fadeAt, clearer.at);
    // …and the whole conversation clears as the keyboard comes up, and the
    // sent replies once the Study list has been flicked through.
    // (Script bubbles clear as the camera next pans down to the keyboard.)
    // Everything clears at the next cut between the chat and the keyboard: the
    // opening as the camera first pans down, the keyboard-side bubbles and the
    // sent reply as it goes back up, the second chat as it comes down again.
    // (In the short cut the sent reply leaves with the keyboard instead, on
    // the keyboard's own fade as the camera goes back up.)
    const sentLeaves = SHORT && m.index >= TIMED.length;
    fadeAt = Math.min(fadeAt, [PAN[0], ...(sentLeaves ? [] : [BACK[0]]), PAN2[0], HIDE_SENT].find((x) => x > m.at) ?? Infinity);
    let out = clamp01((t - fadeAt) / FADE_OUT);
    if (sentLeaves && t >= BACK[0]) {
      const kb = 1 - easeInOutCubic(clamp01((t - BACK[0]) / (BACK[1] - BACK[0])));
      // (Inverts the easeOutCubic below, so its opacity tracks the keyboard's exactly.)
      out = Math.max(out, 1 - Math.cbrt(clamp01(kb * 2.5)));
    }
    if (out >= 1) break;
    const h = m.index >= TIMED.length ? met.heights[m.index]?.at(-1) ?? 36 : heightAt(m, met, t);
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
        const rise = m.index >= TIMED.length ? (1 - easeOutCubic(clamp01((t - m.at) / 0.45))) * 70 : 0;
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

/** The field row (one line) plus the gap and the keyboard under it, in pt. */
const BELOW_CHAT = 36 + 8 + 339;
/** The keys' height, and the Study view's, which replaces them. */
const KEYS_H = 270;

/** The Study list after a finger-flick: fast off the mark, decelerating to a
    stop, like a scroll view's momentum. (The view's own CSS transition is
    switched off so every frame is set here.) */
const FLICK_DISTANCE = 760;
function studyScroll(t: number) {
  if (t < STUDY_FLICK) return 0;
  return FLICK_DISTANCE * (1 - Math.exp(-(t - STUDY_FLICK) / 0.3));
}

/** The camera after the pan: hold a framing, ease between them on each move. */
function framingAt(t: number) {
  let v = START_VIEW;
  for (const [a, b, to] of CAMERA) {
    if (t >= b) v = to;
    else if (t > a) {
      const k = easeInOutCubic((t - a) / (b - a));
      return { scale: lerp(v.scale, to.scale, k), kb: lerp(v.kb, to.kb, k) };
    }
  }
  return v;
}

/** Before the pan, the chat hangs at this scale with its bottom bubble's
    lower edge this far down the frame. */
const CHAT_SCALE = PORTRAIT ? 2.15 : 2.35;
const CHAT_BOTTOM = PORTRAIT ? 1080 : 760;
const FOCUS_ZOOM = 1.7;
/** The second push-in, onto a bubble's `focusPhrase`, once the first settles. */
const PHRASE_ZOOM = PORTRAIT ? 2.3 : 3.0;
const PHRASE_DELAY = 1.1;
/** The push-in onto a `focusSlot` bubble's reel. */
const SLOT_ZOOM = 2.6;

/** A close-up on a `focus` bubble: the camera eases in on it as it starts
    typing and opens back out as the next bubble arrives. Returns the CSS
    transform for the whole chat, about the bubble's (final) centre. */
function focusTransform(met: Metrics, t: number) {
  for (const m of TIMED) {
    if (!m.focus) continue;
    const next = TIMED[m.index + 1];
    const k =
      easeInOutCubic(clamp01((t - m.at) / 0.7)) * (1 - easeInOutCubic(clamp01((t - ((next?.at ?? Infinity) - 0.05)) / 0.4)));
    if (k <= 0) continue;
    const slotMax = Math.max(0, ...(met.slotW[m.index] ?? []));
    const bw = (m.slotInline ? Math.max(met.otherW[m.index], met.lastW[m.index] + met.spaceW + slotMax) : met.lineW[m.index].at(-1)!) + 25;
    const bh = m.slotInline ? met.inlineH[m.index] : met.heights[m.index].at(-1)!;
    const left = STAGE.cx - (COL / 2) * CHAT_SCALE;
    // The bubble's left edge in the chat column (it sits at the bottom of the stack).
    const bx = m.who === 'me' ? COL - SIDE - bw : SIDE;
    let px = left + (bx + bw / 2) * CHAT_SCALE;
    let py = CHAT_BOTTOM - (bh / 2) * CHAT_SCALE;
    // Close-ups never push the bubble (or the reel) past the frame's edges.
    const fit = (w: number) => STAGE.w / (w * CHAT_SCALE);
    const focusZoom = Math.min(FOCUS_ZOOM, fit(bw));
    let zoom = focusZoom;
    const ph = met.phrase[m.index];
    if (m.focusSlot && m.slot) {
      // Onto the reel (after the text on its last line, or on a line of its
      // own), centred on its widest word.
      const k2 = easeInOutCubic(clamp01((t - m.slotAt) / 0.6));
      const sx = 12 + (m.slotInline ? met.lastW[m.index] + met.spaceW : 0) + slotMax / 2;
      const sy = bh - 7 - LINE / 2;
      px = lerp(px, left + (bx + sx) * CHAT_SCALE, k2);
      py = lerp(py, CHAT_BOTTOM - (bh - sy) * CHAT_SCALE, k2);
      zoom = lerp(focusZoom, Math.min(SLOT_ZOOM, fit(slotMax + 24)), k2);
    } else if (ph) {
      const k2 = easeInOutCubic(clamp01((t - (m.at + PHRASE_DELAY)) / 0.6));
      px = lerp(px, left + (bx + ph.x) * CHAT_SCALE, k2);
      py = lerp(py, CHAT_BOTTOM - (bh - ph.y) * CHAT_SCALE, k2);
      zoom = lerp(focusZoom, PHRASE_ZOOM, k2);
    }
    const z = lerp(1, zoom, k);
    return `translate(${lerp(px, STAGE.cx, k)}px, ${lerp(py, STAGE.cy, k)}px) scale(${z}) translate(${-px}px, ${-py}px)`;
  }
  return undefined;
}

function World({ met, t }: { met: Metrics; t: number }) {
  // Close on the conversation, then a pan down to the field and the keyboard;
  // the field waits out of shot, then settles under the last bubble.
  // 0 on the chat, 1 on the keyboard: down, back up to the chat after the
  // first send, and down again.
  const seg = (s: readonly [number, number]) => easeInOutCubic(clamp01((t - s[0]) / (s[1] - s[0])));
  const k = seg(PAN) - seg(BACK) + seg(PAN2);
  const gap = lerp(90, 14, k);
  const chatScale = CHAT_SCALE;
  // The world hangs from the keyboard's bottom edge, as on iOS: when the
  // field gains a line, or Study opens taller than the keys, everything above
  // rises with it.
  const chatKb = CHAT_BOTTOM + (90 + BELOW_CHAT) * chatScale;
  const after = framingAt(t);
  const scale = lerp(chatScale, after.scale, k);
  const keyboardBottom = lerp(chatKb, after.kb, k);
  const fade = span(t, ENDING - END_FADE, ENDING, (x) => x);
  // Study opening: the keys' area grows to the view's height as they cross-fade.
  const grow = easeInOutCubic(clamp01((t - STUDY_OPEN) / STUDY_GROW));
  return (
    <div
      className="dark absolute left-0 top-0"
      style={{
        width: COL,
        transformOrigin: '0 0',
        transform: `translate(${STAGE.cx - (COL / 2) * scale}px, ${keyboardBottom}px) scale(${scale})`,
        opacity: 1 - fade,
      }}
    >
      <div className="absolute bottom-0 left-0 flex flex-col" style={{ width: COL }}>
        {/* The conversation stacks upward from this edge. */}
        <div className="relative" style={{ height: 0, marginBottom: gap }}>
          <div className="absolute bottom-0 left-0" style={{ width: COL, height: 2000 }}>
            <Conversation met={met} t={t} />
          </div>
        </div>
        {/* The field and keyboard show only while the camera is down with them,
            so the chat reads as floating bubbles, as in the opening. */}
        <div style={{ opacity: clamp01(k * 2.5) }}>
          <Field t={t} />
          <div className="mt-2 overflow-hidden rounded-[26px] ring-1 ring-white/10">
            {/* Study replaces the toolbar and keys, as every Arcatext view does. */}
            <div className="relative overflow-hidden" style={{ height: lerp(KEYS_H, VIEW_H, grow) }}>
              {grow < 1 && (
                <div className="absolute inset-x-0 top-0" style={{ opacity: 1 - grow }}>
                  <Keyboard s={keyboardState(t)} />
                </div>
              )}
              {t >= STUDY_OPEN && (
                <div
                  className="absolute inset-x-0 top-0 [&_*]:!transition-none"
                  style={{ opacity: grow }}
                  data-pin={t >= STUDY_ROWS ? STUDY_ROWS : undefined}
                >
                  <StudyPanel
                    stage={t >= STUDY_ROWS ? 'rows' : t >= STUDY_SKELETON ? 'skeleton' : 'spinner'}
                    rows={STUDY_ROWS_DATA}
                    total={24}
                    scroll={studyScroll(t)}
                  />
                </div>
              )}
            </div>
            <GlobeRow padTop={lerp(17, 22, grow)} />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Where the end card's reel is, in words (fractional while rolling). */
function taglinePos(s: number) {
  const L = TAGLINE_LANDS;
  let p = 0;
  for (let i = 1; i < L.length; i++) {
    const last = i === L.length - 1;
    // The flick's first word spins straight off Mandarin's hold, not after it.
    const prev = i === 3 ? TAGLINE_FLICK_START : L[i - 1];
    const roll = last ? 0.5 : Math.min(0.3, 0.9 * (L[i] - prev));
    if (s >= L[i]) p = i;
    else if (s >= L[i] - roll) {
      const k = (s - (L[i] - roll)) / roll;
      // Readable rolls ease; the fast run is linear so it reads as a spin; the
      // last one settles.
      p = i - 1 + (last ? easeOutCubic(k) : roll >= 0.2 ? easeInOutCubic(k) : k);
    }
  }
  return p;
}

const TAG_SIZE = 19;
const TAG_LINE = TAG_SIZE * 1.3;

/** "Text and learn …": the reel is left-anchored, sized for "a language", so
    the line stays put while the words roll past at any speed. */
function Tagline({ s }: { s: number }) {
  const p = taglinePos(s);
  const v = Math.abs(p - taglinePos(s - 1 / 60)) * 60;
  const base = Math.floor(p);
  const items = [];
  for (let j = Math.max(0, base - 1); j <= Math.min(TAGLINE_WORDS.length - 1, base + 2); j++) {
    items.push(
      <span key={j} className="absolute left-0 whitespace-nowrap" style={{ top: (j - p) * TAG_LINE, color: SLOT_COLOR }}>
        {TAGLINE_WORDS[j]}
      </span>,
    );
  }
  return (
    <div className="whitespace-nowrap text-center" style={{ fontSize: TAG_SIZE, lineHeight: `${TAG_LINE}px` }}>
      Text and learn{' '}
      <span className="relative inline-block align-top" style={{ height: TAG_LINE }}>
        <span style={{ visibility: 'hidden' }}>a language</span>
        {/* Clips the reel to its one line, wide enough for any language. */}
        <span
          className="absolute left-0 top-0 overflow-hidden"
          style={{ width: '30em', height: TAG_LINE, filter: `blur(${Math.min(1.4, v * 0.05)}px)` }}
        >
          {items}
        </span>
      </span>
    </div>
  );
}

/** The end card: the app's own splash animation, then the tagline under it. */
function Ending({ t }: { t: number }) {
  const local = t - ENDING;
  const sub = span(t, ENDING + SPLASH_DONE - 0.6, ENDING + SPLASH_DONE + 0.1, (x) => 1 - (1 - x) ** 3);
  const fade = span(t, DURATION - 0.6, DURATION, (x) => x);
  return (
    <div className="absolute inset-0 grid place-items-center bg-black">
      <Glow />
      {/* Centred on the stage (in portrait, above the platforms' caption zone). */}
      <div style={{ transform: `translate(${STAGE.cx - W / 2}px, ${STAGE.cy - H / 2}px)` }}>
      <SplashLogo s={local} scale={PORTRAIT ? 2.4 : 3.2}>
        <div
          className="mt-4"
          style={{
            fontFamily: "'Inter Display', Inter, sans-serif",
            fontWeight: 600,
            letterSpacing: '-0.02em',
            color: 'rgba(255,255,255,0.62)',
            opacity: sub,
            transform: `translateY(${(1 - sub) * 8}px)`,
          }}
        >
          <Tagline s={local} />
        </div>
      </SplashLogo>
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
      document.fonts.load("17px 'Noto Sans JP'", FIELD_JA + STUDY_ROWS_DATA.map((r) => r.entry + r.sentence).join('')),
      document.fonts.load("14px 'Noto Sans'", 'Study Guide entries'),
      document.fonts.load("700 32px 'Noto Sans'", 'Arcatext'),
    ]))
      .then(() => document.fonts.ready)
      .then(() => {
      if (!live || !rootRef.current) return;
      const m = measure(rootRef.current, SENT.map((x) => x.text));
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
      // Animations inside a [data-pin] element run from that time instead of
      // from whenever they mounted (a render can start mid-film).
      for (const a of document.getAnimations()) {
        const target = (a.effect as KeyframeEffect | null)?.target as Element | null;
        const pin = target?.closest('[data-pin]')?.getAttribute('data-pin');
        if (pin) a.currentTime = ms - Number(pin) * 1000;
      }
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
          <div className="absolute inset-0" style={{ transformOrigin: '0 0', transform: focusTransform(met, t) }}>
            <World met={met} t={t} />
          </div>
        </>
      )}
      {t >= ENDING && <Ending t={t} />}
    </div>
  );
}
