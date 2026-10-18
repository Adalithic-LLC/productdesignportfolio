import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { ArrowUp, Plus } from 'lucide-react';
import { AX } from '@/lib/arcatextTheme';
import { CheckPanel, StudyPanel, VIEW_H, type CheckData } from '@/components/ArcatextViews';
import { Keyboard, GlobeRow, Touch } from '../Phone';
import { Glow, syncAnimations } from '../Film';
import SplashLogo from '../SplashLogo';
import obArrow from './ob-arrow.png';
import { AV_SIZE, AV_TEXT_STYLE, AvatarOpener, TextBlock, preloadAvatars, type Box } from './Opener';
import { clamp01, easeInOutCubic, easeOutCubic, lerp, span } from '../ease';
import {
  BUBBLES,
  CAMERA,
  CHUNK_AT,
  CHUNKS,
  DURATION,
  END_CHUNKS,
  END_CHUNK_AT,
  ENDING,
  FIELD,
  FIELD_EN,
  FIELD_ES,
  FRAME,
  KB,
  LOGO_AT,
  NOTE_AT,
  NOTE_CHUNKS,
  NOTE_IN,
  NOTE_OUT,
  LANGS,
  langPos,
  LINE2_A,
  LINE2_A_TIMES,
  LINE2_B,
  LINE2_B_TIMES,
  LINE2_LANDS,
  LINE2_OUT,
  LINE2_SLOT,
  LINE2_SLOT_TIMES,
  D,
  STAGE,
  CAM_K,
  CHECK,
  CHECK_AT,
  CHECK_CARDS,
  CHECK_IN,
  CHECK_OUT,
  HEAD,
  HEAD_AT,
  HEAD_OUT,
  SEND,
  NOTE_WITH_STUDY,
  PORTRAIT,
  OPENING,
  AVATARS,
  AV_TEXT,
  BLOCK_LINES,
  TYPE_ZOOM,
  START_VIEW,
  STUDY_GROW,
  STUDY_OPEN,
  STUDY_ROWS_DATA,
  STUDY_FLICK,
  STUDY_TAP,
  TITLE1_OUT,
  WORLD_IN,
  WORLD_OUT,
  cues,
  type View,
} from './learnTimeline';

/**
 * The self-guided learning film: one 1080x1920 frame as a pure function of
 * time, like the chat film. Titles over the glow; then the phone world (the
 * conversation, the field and the keyboard, laid out in iOS points from the
 * keyboard's bottom edge) under a camera that moves between them; then the
 * end card.
 */

const W = FRAME.w;
const H = FRAME.h;
const COL = 402;
const SIDE = 14;
const KEYS_H = 270;
const GLOBE_H = 69;
/** Below the field when the keyboard is down: the home indicator's inset. */
const HOME_H = 34;
const FONT = "Inter, 'SF Pro Text', system-ui, sans-serif";
const DISPLAY = "'Inter Display', Inter, system-ui, sans-serif";
const ACCENT = '#7FA2FF';
const RECV = '#2C2C2E';
/** The field's text box: where its text starts in the column, and its width. */
const FIELD_TEXT_X = 12 + 36 + 8 + 1 + 16;
const FIELD_TEXT_W = COL - 24 - 36 - 36 - 16 - 2 - 16 - 8;
const LINE2_SIZE = 68;
const BUBBLE = { fontFamily: FONT, fontSize: 17, lineHeight: '22px', padding: '7px 12px', maxWidth: 300, borderRadius: 18, letterSpacing: '-0.01em' } as const;

type Metrics = {
  /** Each bubble's laid-out size. */
  bubbles: { w: number; h: number }[];
  /** Caret x (pt from the field text's left) and line with k characters of FIELD_EN typed. */
  caretX: number[];
  caretLine: number[];
  /** How many lines the Spanish takes in the field. */
  esLines: number;
  /** The typed line's reel words, at its size. */
  slotW: number[];
  langW: number[];
  /** Arcatext 02's typed line: the box around each typed prefix. */
  avBox: Box[];
};

function measure(root: HTMLElement): Metrics {
  const probe = (style: Partial<CSSStyleDeclaration>) => {
    const d = document.createElement('div');
    Object.assign(d.style, { position: 'absolute', left: '-10000px', top: '0', visibility: 'hidden', ...style });
    root.appendChild(d);
    return d;
  };
  const b = probe({ width: 'fit-content', boxSizing: 'border-box', whiteSpace: 'pre-wrap', overflowWrap: 'break-word', fontFamily: BUBBLE.fontFamily, fontSize: '17px', lineHeight: '22px', padding: BUBBLE.padding, maxWidth: `${BUBBLE.maxWidth}px`, letterSpacing: BUBBLE.letterSpacing });
  const bubbles = BUBBLES.map((x) => {
    b.textContent = x.text;
    return { w: b.offsetWidth, h: b.offsetHeight };
  });
  b.remove();
  const f = probe({ width: `${FIELD_TEXT_W}px`, fontFamily: FONT, fontSize: '16px', lineHeight: '20px', whiteSpace: 'pre-wrap', overflowWrap: 'break-word' });
  const caretX: number[] = [];
  const caretLine: number[] = [];
  // Each typed prefix is laid out with the rest of its word after it (unseen,
  // as the field draws it), so a word wraps where it finally will from its
  // first letter instead of starting on one line and jumping to the next.
  // The caret is the right edge of the last typed character, read from a
  // Range so measuring adds nothing to the line that could move a break.
  for (let k = 0; k <= FIELD_EN.length; k++) {
    f.textContent = FIELD_EN.slice(0, k) + wordRest(k);
    if (k === 0) { caretX.push(0); caretLine.push(0); continue; }
    const r = document.createRange();
    r.setStart(f.firstChild!, k - 1);
    r.setEnd(f.firstChild!, k);
    const rects = r.getClientRects();
    const box = rects[rects.length - 1];
    const fb = f.getBoundingClientRect();
    caretX.push(box.right - fb.left);
    caretLine.push(Math.round((box.top - fb.top) / 20));
  }
  f.textContent = FIELD_ES;
  const esLines = Math.max(1, Math.round(f.offsetHeight / 20));
  f.remove();
  const word = probe({ whiteSpace: 'nowrap', fontFamily: DISPLAY, fontWeight: '700', fontSize: `${LINE2_SIZE}px`, letterSpacing: '-0.02em' });
  const slotW = LINE2_SLOT.map((x) => ((word.textContent = x), word.offsetWidth));
  Object.assign(word.style, { fontSize: '46px', fontWeight: '600', letterSpacing: '-0.015em' });
  const langW = LANGS.map((x) => ((word.textContent = x), word.offsetWidth));
  word.remove();
  // The typed line laid out whole, as the film draws it; each prefix's box
  // grows by its last character's rect.
  const av = probe({});
  Object.assign(av.style, { ...AV_TEXT_STYLE, width: `${AV_TEXT_STYLE.width}px`, fontSize: `${AV_SIZE}px`, fontWeight: '700' });
  av.textContent = AV_TEXT;
  const ab = av.getBoundingClientRect();
  const [mx, my] = [ab.left + ab.width / 2, ab.top + ab.height / 2];
  const charBox = (i: number) => {
    const r = document.createRange();
    r.setStart(av.firstChild!, i);
    r.setEnd(av.firstChild!, i + 1);
    const rects = r.getClientRects();
    const x = rects[rects.length - 1];
    return [x.left - mx, x.right - mx, x.top - my, x.bottom - my] as Box;
  };
  const first = charBox(0);
  const avBox: Box[] = [[first[0], first[0], first[2], first[3]]];
  for (let i = 0; i < AV_TEXT.length; i++) {
    const p = avBox[i];
    const c = charBox(i);
    avBox.push(AV_TEXT[i] === ' ' ? p : [Math.min(p[0], c[0]), Math.max(p[1], c[1]), Math.min(p[2], c[2]), Math.max(p[3], c[3])]);
  }
  av.remove();
  return { bubbles, caretX, caretLine, esLines, slotW, langW, avBox };
}

// ── The phone world's geometry, from the keyboard's bottom edge up ──

/** The untyped rest of the word the caret is in, after `k` characters. */
function wordRest(k: number) {
  if (k === 0 || FIELD_EN[k - 1] === ' ') return '';
  const m = /^\S*/.exec(FIELD_EN.slice(k));
  return m ? m[0] : '';
}
const typedCount = (t: number) => {
  let n = 0;
  while (n < FIELD.times.length && FIELD.times[n] <= t) n++;
  return n;
};
/** The flick down the open Study Guide: a fast start that coasts to a stop. */
const STUDY_SCROLL_MAX = 470;
const studyScroll = (t: number) => STUDY_SCROLL_MAX * (1 - Math.pow(1 - clamp01((t - STUDY_FLICK) / D.studyFlick), 4));

/** How far up the keyboard is: 0 down, 1 up, sliding at each KB change. */
function kbLevel(t: number) {
  let v = 0;
  for (const [at, up] of KB) {
    if (t < at) break;
    const k = easeOutCubic(clamp01((t - at) / D.kbSlide));
    v = up ? k : 1 - k;
  }
  return v;
}

/** Arcatext 02: how far the chat, field and bottom row have faded away for
    the line and the Study Guide (0 = all there, 1 = gone). */
const soloLevel = (t: number) =>
  Math.max(
    NOTE_WITH_STUDY ? span(t, NOTE_IN, NOTE_IN + D.noteFade, (x) => x) : 0,
    CHECK ? span(t, CHECK_IN, CHECK_IN + D.noteFade, (x) => x) * (SEND ? 1 - span(t, CHECK_OUT, CHECK_OUT + D.noteFade, (x) => x) : 1) : 0,
  );
/** Arcatext 02: how far the Check view has opened over the keyboard. */
const checkLevel = (t: number) =>
  CHECK ? easeInOutCubic(clamp01((t - CHECK_IN - 0.15) / STUDY_GROW)) * (1 - easeInOutCubic(clamp01((t - CHECK_OUT) / (SEND ? STUDY_GROW : 0.3)))) : 0;
/** How far the keyboard has opened into a view. With no send between them,
    Check hands straight to the Study Guide and the view stays open. */
const viewGrow = (t: number) =>
  Math.max(
    easeInOutCubic(clamp01((t - STUDY_OPEN) / STUDY_GROW)),
    CHECK && !SEND && t >= CHECK_IN + 0.15 + STUDY_GROW && t < STUDY_OPEN + STUDY_GROW ? 1 : checkLevel(t),
  );
/** Where the Study Guide sits beside the line: its centre's offset from the
    framing point, in frame pixels. */
const STUDY_NOTE_OFF = PORTRAIT ? { x: 0, y: 330 } : { x: 400, y: 0 };

function geometry(met: Metrics, t: number) {
  const grow = viewGrow(t);
  const kb = kbLevel(t);
  const block = lerp(HOME_H, lerp(KEYS_H, VIEW_H, grow) + GLOBE_H, kb);
  // The field's height eases over a quarter second when its line count
  // changes (a wrap, the Reword, the send), so the camera that follows it
  // glides instead of jumping.
  const rawH = (tt: number) => {
    const lines = tt >= FIELD.sendAt ? 1 : tt >= FIELD.swap + 0.16 ? met.esLines : met.caretLine[typedCount(tt)] + 1;
    return 36 + 20 * (lines - 1);
  };
  let fieldH = 0;
  for (let j = 0; j < 12; j++) fieldH += rawH(t - (0.25 * j) / 12) / 12;
  const fieldTop = block + 8 + fieldH;
  const convBottom = fieldTop + 16;
  // The stack, newest at the bottom; a narration bubble fades as the next one arrives.
  const placed: { i: number; bottom: number; h: number; out: number; claim: number }[] = [];
  let y = 0;
  for (let i = BUBBLES.length - 1; i >= 0; i--) {
    const m = BUBBLES[i];
    if (t < m.at) continue;
    const next = BUBBLES.slice(i + 1).find((x) => x.who === 'them' && m.who === 'them');
    const out = Math.max(next ? clamp01((t - next.at) / 0.45) : 0, m.hide !== undefined ? clamp01((t - m.hide) / D.bubbleOut) : 0);
    if (out >= 1) continue;
    const claim = easeOutCubic(clamp01((t - m.at) / 0.35));
    const h = met.bubbles[i].h;
    placed.push({ i, bottom: y, h, out, claim });
    y += (h + 10) * claim;
  }
  return { grow, kb, block, fieldH, fieldTop, convBottom, convTop: convBottom + y, placed };
}

/** How far ahead (s) the typing camera looks for a line break. */
const CARET_LEAD = 0.6;

/** Where a framing points (x across the column, h up from the keyboard's
    bottom) and how close, at time t. */
function resolve(v: View, met: Metrics, t: number) {
  const g = geometry(met, t);
  const visW = 'scale' in v ? STAGE.w / v.scale : STAGE.w;
  const bubbleAt = (i: number) => {
    const p = g.placed.find((x) => x.i === i);
    const b = met.bubbles[i];
    const bottom = p ? p.bottom : 0;
    const x = BUBBLES[i].who === 'me' ? COL - SIDE - b.w / 2 : SIDE + b.w / 2;
    return { x: Math.min(COL - visW / 2 + 10, Math.max(visW / 2 - 10, x)), h: g.convBottom + bottom + b.h / 2 };
  };
  switch (v.kind) {
    case 'bubble': {
      const p = bubbleAt(v.i);
      return { x: p.x, h: p.h, s: v.scale };
    }
    case 'caret': {
      // Just behind the caret, eased over the last half second, kept within the field.
      const lo = 50 + visW / 2;
      const hi = COL - 6 - visW / 2;
      // Looks ahead: when the caret is about to start a new line, the camera
      // is already heading to that line's start, so it arrives as the first
      // letter there is typed.
      const at = (tt: number) => {
        const n = typedCount(tt);
        const ahead = typedCount(tt + CARET_LEAD);
        let m = n;
        for (let j = n + 1; j <= ahead; j++) if (met.caretLine[j] > met.caretLine[n]) { m = j; break; }
        return Math.min(hi, Math.max(lo, FIELD_TEXT_X + met.caretX[m] - visW * 0.12));
      };
      let sum = 0;
      for (let j = 0; j < 12; j++) sum += at(t - (0.5 * j) / 12);
      return { x: sum / 12, h: g.block + 25, s: v.scale };
    }
    case 'typing': {
      // As close as the usual typing shot, but no closer than fits the text
      // box and a margin across the frame (16:9 has room; 9:16 pulls back),
      // centred on the box's height once typing ends, so it never moves.
      const M = 22;
      const end = geometry(met, v.until);
      const s = Math.min(TYPE_ZOOM, STAGE.w / CAM_K / (FIELD_TEXT_W + 2 * M));
      return { x: FIELD_TEXT_X + FIELD_TEXT_W / 2, h: g.block + 8 + end.fieldH / 2, s };
    }
    case 'button':
      return { x: v.which === 'reword' ? Math.min(310, COL - 4 - visW / 2) : Math.max(36.5, 4 + visW / 2), h: g.block - 33, s: v.scale };
    case 'field':
      return { x: COL / 2, h: g.block + 8 + g.fieldH / 2, s: v.scale };
    case 'fixed': {
      // The whole row (plus, field, send) across the frame, and `span` points of height.
      const se = Math.min((PORTRAIT ? 1000 : 1700) / COL, (PORTRAIT ? 1150 : 960) / v.span);
      return { x: COL / 2, h: v.h, s: se / CAM_K };
    }
    case 'bubbleField': {
      const p = bubbleAt(v.i);
      return { x: COL / 2, h: (g.block + 8 + g.fieldH / 2 + p.h) / 2, s: v.scale };
    }
    case 'study':
      return { x: COL / 2, h: g.fieldTop / 2 + 10, s: v.scale };
    case 'studyNote': {
      // The open panel (the bottom row folded away), its centre set off from
      // the framing point so the line has the rest of the frame.
      const se = v.scale * CAM_K;
      const centre = (lerp(KEYS_H, VIEW_H, g.grow) + GLOBE_H * (1 - soloLevel(t))) / 2;
      return { x: COL / 2 - STUDY_NOTE_OFF.x / se, h: centre + STUDY_NOTE_OFF.y / se, s: v.scale };
    }
    case 'fieldNote': {
      // The field, the keyboard and room for the sent message above them,
      // set off from the framing point as the Study Guide is.
      const se = v.scale * CAM_K;
      const centre = (KEYS_H + GLOBE_H + 140) / 2;
      return { x: COL / 2 - STUDY_NOTE_OFF.x / se, h: centre + STUDY_NOTE_OFF.y / se, s: v.scale };
    }
    case 'whole': {
      const s = Math.min(v.scale, 1250 / (g.convTop + 30));
      return { x: COL / 2, h: g.convTop / 2, s };
    }
  }
}

function camera(met: Metrics, t: number) {
  let v = START_VIEW;
  for (const [a, b, to] of CAMERA) {
    if (t >= b) v = to;
    else if (t > a) {
      const k = easeInOutCubic((t - a) / (b - a));
      const p = resolve(v, met, t), q = resolve(to, met, t);
      return { x: lerp(p.x, q.x, k), h: lerp(p.h, q.h, k), s: lerp(p.s, q.s, k) };
    }
  }
  return resolve(v, met, t);
}

// ── Titles ──

/** The headline's words (and its closing ?) in the accent color; everything else is white. */
const HEADLINE_ACCENTS = ['texting', 'language learning?'];
/** `text` with each of `phrases` it contains wrapped in the accent color. */
function accentParts(text: string, phrases: string[]) {
  const re = new RegExp(`(${phrases.map((x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`);
  return text.split(re).map((x, i) => (phrases.includes(x) ? <span key={i} style={{ color: ACCENT }}>{x}</span> : x));
}

function Headline({ t }: { t: number }) {
  const out = span(t, TITLE1_OUT, TITLE1_OUT + D.titleOut, (x) => x);
  if (out >= 1) return null;
  return (
    <div
      className="absolute"
      style={{ left: STAGE.cx - STAGE.w / 2, width: STAGE.w, top: STAGE.cy, transform: `translateY(calc(-50% - ${out * 40}px))`, opacity: 1 - out }}
    >
      <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 100, lineHeight: 1.04, letterSpacing: '-0.025em', color: '#fff', textWrap: 'balance' }}>
        {CHUNKS.map((c, i) => {
          const k = span(t, CHUNK_AT[i], CHUNK_AT[i] + 0.55, easeOutCubic);
          return (
            <span key={i}>
              <span
                style={{
                  display: 'inline-block',
                  opacity: k,
                  transform: `translateY(${(1 - k) * 26}px)`,
                  filter: k < 1 ? `blur(${(1 - k) * 12}px)` : undefined,
                }}
              >
                {accentParts(c, HEADLINE_ACCENTS)}
              </span>{' '}
            </span>
          );
        })}
      </div>
    </div>
  );
}

/** The study-guide line, in bold chunks while the phone steps away. */
function Note({ t }: { t: number }) {
  if (t < NOTE_IN || t > NOTE_OUT + D.noteFade) return null;
  const out = span(t, NOTE_OUT, NOTE_OUT + D.noteFade, (x) => x);
  // Arcatext 02 sets the line above (9:16) or beside (16:9) the Study Guide.
  const place = !NOTE_WITH_STUDY
    ? { left: STAGE.cx - STAGE.w / 2, width: STAGE.w, top: STAGE.cy }
    : PORTRAIT
      ? { left: STAGE.cx - STAGE.w / 2, width: STAGE.w, top: STAGE.cy - 420 }
      : { left: 150, width: 720, top: FRAME.h / 2 };
  return (
    <div className="absolute" style={{ ...place, transform: `translateY(calc(-50% - ${out * 30}px))`, opacity: 1 - out }}>
      <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 76, lineHeight: 1.1, letterSpacing: '-0.02em', color: '#fff', textWrap: 'balance' }}>
        {NOTE_CHUNKS.map((c, i) => {
          const k = span(t, NOTE_AT[i], NOTE_AT[i] + 0.55, easeOutCubic);
          const parts = c.split('study guide');
          return (
            <span key={i}>
              <span style={{ display: 'inline-block', opacity: k, transform: `translateY(${(1 - k) * 22}px)`, filter: k < 1 ? `blur(${(1 - k) * 10}px)` : undefined }}>
                {parts.length > 1 ? (
                  <>
                    {parts[0]}
                    <span style={{ color: ACCENT }}>study guide</span>
                    {parts[1]}
                  </>
                ) : (
                  c
                )}
              </span>{' '}
            </span>
          );
        })}
      </div>
    </div>
  );
}

/** Arcatext 02: the headline over the Reword and the quick send. */
function HeadCard({ t }: { t: number }) {
  if (!HEAD || t < HEAD_AT || t > HEAD_OUT + 0.45) return null;
  const place = PORTRAIT ? { left: STAGE.cx - STAGE.w / 2, width: STAGE.w, top: STAGE.cy - 420 } : { left: 150, width: 720, top: FRAME.h / 2 };
  const k = span(t, HEAD_AT, HEAD_AT + 0.55, easeOutCubic);
  const out = span(t, HEAD_OUT, HEAD_OUT + 0.4, (x) => x);
  // The first word (the action) in blue.
  const first = HEAD.split(/[ ,]/)[0];
  const b = HEAD.slice(first.length);
  return (
    <div className="absolute" style={{ ...place, transform: `translateY(calc(-50% + ${(1 - k) * 22 - out * 30}px))`, opacity: k * (1 - out), filter: k < 1 ? `blur(${(1 - k) * 10}px)` : undefined }}>
      <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 76, lineHeight: 1.1, letterSpacing: '-0.02em', color: '#fff', textWrap: 'balance' }}>
        <span style={{ color: ACCENT }}>{first}</span>
        {b}
      </div>
    </div>
  );
}

/** Arcatext 02: the two lines over the Check view, one after the other. */
function CheckCards({ t }: { t: number }) {
  if (!CHECK || t < CHECK_AT[0] || t > CHECK_OUT + D.noteFade) return null;
  const place = PORTRAIT ? { left: STAGE.cx - STAGE.w / 2, width: STAGE.w, top: STAGE.cy - 420 } : { left: 150, width: 720, top: FRAME.h / 2 };
  const accent = ['reverse translation', 'synonyms'];
  return (
    <>
      {CHECK_CARDS.map((c, i) => {
        const k = span(t, CHECK_AT[i], CHECK_AT[i] + 0.55, easeOutCubic);
        const outAt = i === 0 ? CHECK_AT[1] - 0.45 : CHECK_OUT;
        const out = span(t, outAt, outAt + (i === 0 ? 0.4 : D.noteFade), (x) => x);
        if (k <= 0 || out >= 1) return null;
        const [a, b] = c.split(accent[i]);
        return (
          <div key={i} className="absolute" style={{ ...place, transform: `translateY(calc(-50% + ${(1 - k) * 22 - out * 30}px))`, opacity: k * (1 - out), filter: k < 1 ? `blur(${(1 - k) * 10}px)` : undefined }}>
            <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 76, lineHeight: 1.1, letterSpacing: '-0.02em', color: '#fff', textWrap: 'balance' }}>
              {a}
              <span style={{ color: ACCENT }}>{accent[i]}</span>
              {b}
            </div>
          </div>
        );
      })}
    </>
  );
}

const CHECK_VIEW: CheckData = {
  reverse: 'Hi, how are you? How was your weekend?',
  reword: FIELD_ES,
  original: FIELD_EN,
  synonyms: [
    'Hola, ¿qué tal estás? ¿Cómo te fue el fin de semana?',
    '¡Hola! ¿Cómo andas? ¿Qué tal el finde?',
    'Hola, ¿cómo te va? ¿Cómo pasaste el fin de semana?',
  ],
  homograph: { word: '', meanings: [] },
};

/** The app's onboarding pointer (OB_Arrow, 44pt, pointing left), as
    PointerArrow animates it: it springs in from 60pt to the right (response
    0.5, damping 0.6), then nudges toward its target twice (6pt, then 3pt). */
const ARROW = 44;
function arrowMotion(t: number, at: number) {
  const u = t - at;
  if (u <= 0) return { x: 60, o: 0 };
  const w = (2 * Math.PI) / 0.5;
  const z = 0.6;
  const wd = w * Math.sqrt(1 - z * z);
  const k = 1 - Math.exp(-z * w * u) * (Math.cos(wd * u) + ((z * w) / wd) * Math.sin(wd * u));
  let nudge = 0;
  let b = u - 0.5;
  for (const amp of [6, 3]) {
    if (b >= 0 && b < 0.2) nudge = -amp * easeInOutCubic(b / 0.2);
    else if (b >= 0.2 && b < 0.42) nudge = -amp * (1 - easeInOutCubic((b - 0.2) / 0.22));
    b -= 0.42;
  }
  return { x: 60 * (1 - k) + nudge, o: clamp01(k) };
}
/** When each arrow comes in: on the reverse translation with the first card,
    on Synonyms once the scroll to them has settled. */
const ARROW_AT = [CHECK_AT[0] + 0.3, CHECK_AT[1] + 1.1];

/** The Check view, already loaded: the reverse translation lights up with
    the first line, and the view scrolls to the synonyms with the second. The
    onboarding arrow points at each. */
function CheckView({ t }: { t: number }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const synRef = useRef<HTMLDivElement>(null);
  const a1 = useRef<HTMLImageElement>(null);
  const a2 = useRef<HTMLImageElement>(null);
  useLayoutEffect(() => {
    const root = rootRef.current;
    const sc = scrollRef.current;
    const syn = synRef.current;
    if (!root || !sc || !syn) return;
    sc.scrollTop = easeInOutCubic(clamp01((t - CHECK_AT[1]) / 1.0)) * (syn.offsetTop - 8);
    const rev = sc.querySelector('[data-tour="reverse"]') as HTMLElement | null;
    // The text wraps short of the arrow, as the app leaves it room.
    if (rev) rev.style.paddingRight = `${ARROW}px`;
    const box = rev?.parentElement?.parentElement as HTMLElement | null;
    if (box) {
      const h = span(t, CHECK_AT[0] + 0.4, CHECK_AT[0] + 0.8, (x) => x) * (1 - span(t, CHECK_AT[1], CHECK_AT[1] + 0.4, (x) => x));
      box.style.background = h > 0 ? `color-mix(in srgb, ${AX.accent} ${h * 24}%, transparent)` : '';
      box.style.boxShadow = `inset 0 0 0 ${1 + h}px ${h > 0 ? `color-mix(in srgb, ${AX.accent} ${h * 100}%, ${AX.cardStroke})` : AX.cardStroke}`;
    }
    // Positions in the panel's own points (the world's scale is outside it).
    const r0 = root.getBoundingClientRect();
    const k = root.offsetWidth / r0.width;
    const place = (el: HTMLImageElement | null, tipX: number, tipY: number, m: { x: number; o: number }, o: number) => {
      if (!el) return;
      el.style.left = `${tipX + m.x}px`;
      el.style.top = `${tipY - ARROW * 0.667}px`;
      el.style.opacity = String(m.o * o);
    };
    if (box) {
      const b = box.getBoundingClientRect();
      // Inside the box's trailing edge, 8pt in, its tip at the box's middle.
      const right = (b.right - r0.left) * k - 8;
      place(a1.current, right - ARROW, ((b.top + b.bottom) / 2 - r0.top) * k, arrowMotion(t, ARROW_AT[0]), 1 - span(t, CHECK_AT[1], CHECK_AT[1] + 0.25, (x) => x));
    }
    const label = syn.firstElementChild as HTMLElement | null;
    if (label) {
      // Just after the SYNONYMS label's text, its tip on the label's middle.
      const range = document.createRange();
      range.selectNodeContents(label);
      const lr = range.getBoundingClientRect();
      place(a2.current, (lr.right - r0.left) * k + 8, ((lr.top + lr.bottom) / 2 - r0.top) * k, arrowMotion(t, ARROW_AT[1]), 1);
    }
  });
  return (
    <div ref={rootRef} className="relative">
      <CheckPanel state={{ opening: false, reverse: 'done', synonyms: 'done', homographs: 'idle' }} data={CHECK_VIEW} scrollRef={scrollRef} synRef={synRef} />
      {[a1, a2].map((r, i) => (
        <img key={i} ref={r} src={obArrow} alt="" className="pointer-events-none absolute" style={{ width: ARROW, height: ARROW, maxWidth: 'none', opacity: 0 }} />
      ))}
    </div>
  );
}

const countAt = (times: number[], t: number) => {
  let n = 0;
  while (n < times.length && times[n] <= t) n++;
  return n;
};

function TypedLine({ t, met }: { t: number; met: Metrics }) {
  const start = LINE2_A_TIMES[0] - 0.05;
  if (t < start) return null;
  const out = span(t, LINE2_OUT, LINE2_OUT + D.line2Out, (x) => x);
  if (out >= 1) return null;
  const a = LINE2_A.slice(0, countAt(LINE2_A_TIMES, t));
  const first = LINE2_SLOT[0].slice(0, countAt(LINE2_SLOT_TIMES, t));
  const bTyped = LINE2_B.slice(0, countAt(LINE2_B_TIMES, t));
  // The reel: where it stands (fractional while rolling), and its width.
  let p = 0;
  for (let i = 1; i < LINE2_LANDS.length; i++) p += clamp01(easeInOutCubic((t - (LINE2_LANDS[i] - D.slotRoll)) / D.slotRoll));
  const i0 = Math.min(LINE2_SLOT.length - 1, Math.floor(p));
  const w = lerp(met.slotW[i0], met.slotW[Math.min(LINE2_SLOT.length - 1, i0 + 1)], p - i0);
  const reelStarted = t >= LINE2_LANDS[0];
  const lineH = LINE2_SIZE * 1.12;
  return (
    <div
      className="absolute"
      style={{ left: STAGE.cx - STAGE.w / 2, width: STAGE.w, top: STAGE.cy, transform: `translateY(-50%)`, opacity: 1 - out }}
    >
      <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: LINE2_SIZE, lineHeight: `${lineH}px`, letterSpacing: '-0.02em', color: '#fff' }}>
        {a}
        {/* The reel types and rolls on the line below. */}
        {t >= LINE2_SLOT_TIMES[0] && <br />}
        {t >= LINE2_SLOT_TIMES[0] &&
          (reelStarted ? (
            <span className="relative inline-block overflow-hidden align-top" style={{ width: w, height: lineH + 2 * REEL_PAD * LINE2_SIZE, margin: `${-REEL_PAD * LINE2_SIZE}px 0`, color: ACCENT }}>
              {LINE2_SLOT.map((s, i) => (
                <span key={s} className="absolute left-0 whitespace-nowrap" style={{ top: REEL_PAD * LINE2_SIZE, transform: `translateY(${(i - p) * (lineH + 2 * REEL_PAD * LINE2_SIZE)}px)`, opacity: 1 - Math.min(1, Math.abs(i - p)) * 0.7 }}>
                  {s}
                </span>
              ))}
            </span>
          ) : (
            <span style={{ color: ACCENT }}>{first}</span>
          ))}
        {/* Then the rest types out on the line below. */}
        {bTyped && <br />}
        {bTyped.trimStart()}
      </div>
    </div>
  );
}

// ── The phone ──

const ES_WORDS = FIELD_ES.split(' ');

function Field({ t }: { t: number }) {
  const n = typedCount(t);
  const swap = t >= FIELD.swap ? clamp01((t - FIELD.swap) / 0.32) : 0;
  // The reword lands loudly: the field rings blue and pulses, a light sweeps
  // across it, and the Spanish cascades in word by word in blue before
  // settling to ink.
  const since = t - FIELD.swap;
  const ring = since >= 0 ? Math.sin(Math.PI * clamp01(since / 1.1)) * (since < 0.25 ? clamp01(since / 0.12) : 1) : 0;
  const pulse = since >= 0 ? clamp01(since / 0.7) : 0;
  const sweep = since >= 0 && since < 0.75 ? easeInOutCubic(clamp01(since / 0.75)) : null;
  const pop = since >= 0 && since < 0.5 ? 1 + 0.035 * Math.sin(Math.PI * clamp01(since / 0.5)) : 1;
  const sent = t >= FIELD.sendAt;
  const pressed = t >= FIELD.sendTap && t < FIELD.sendAt;
  const has = n > 0 && !sent;
  return (
    <div className="flex items-end gap-2 px-3" style={{ fontFamily: FONT }}>
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full" style={{ background: AX.plusBg }}>
        <Plus className="h-5 w-5" style={{ color: AX.plusIcon }} strokeWidth={2.6} />
      </div>
      <div
        className="relative flex min-h-9 min-w-0 flex-1 items-end rounded-[18px] border py-[7px] pl-4 pr-2"
        style={{
          borderColor: ring > 0.02 ? `color-mix(in srgb, ${AX.send} ${Math.round(ring * 100)}%, ${AX.fieldBorder})` : AX.fieldBorder,
          boxShadow: ring > 0.02 ? `0 0 0 ${1.5 * ring}px color-mix(in srgb, ${AX.send} ${Math.round(ring * 100)}%, transparent), 0 0 ${6 + 22 * pulse}px ${2 + 8 * pulse}px color-mix(in srgb, ${AX.send} ${Math.round(ring * 45 * (1 - pulse * 0.6))}%, transparent)` : undefined,
          transform: pop !== 1 ? `scale(${pop})` : undefined,
        }}
      >
        {sweep !== null && (
          <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[18px]">
            <div className="absolute inset-y-0" style={{ left: `${-40 + sweep * 140}%`, width: '40%', background: `linear-gradient(90deg, transparent, color-mix(in srgb, ${AX.send} 22%, transparent), transparent)` }} />
          </div>
        )}
        {has ? (
          <span className="relative min-w-0 flex-1 text-[16px] leading-5" style={{ color: AX.ink }}>
            {swap ? (
              <span className="block break-words">
                {ES_WORDS.map((w, i) => {
                  const k = easeOutCubic(clamp01((since - 0.06 - i * 0.055) / 0.3));
                  const tint = clamp01(1 - (since - 0.35 - i * 0.055) / 0.9);
                  return (
                    <span key={i}>
                      {i > 0 && ' '}
                      <span className="inline-block" style={{ opacity: k, transform: k < 1 ? `translateY(${(1 - k) * 7}px)` : undefined, filter: k < 1 ? `blur(${(1 - k) * 4}px)` : undefined, color: tint > 0 ? `color-mix(in srgb, ${AX.send} ${Math.round(tint * 100)}%, ${AX.ink})` : undefined }}>
                        {w}
                      </span>
                    </span>
                  );
                })}
              </span>
            ) : (
              <span className="block break-words">
                {FIELD_EN.slice(0, n)}
                <span style={{ visibility: 'hidden' }}>{wordRest(n)}</span>
              </span>
            )}
            {swap > 0 && swap < 1 && (
              <span className="absolute inset-x-0 top-0 block break-words" style={{ opacity: clamp01(1 - since / 0.18), filter: `blur(${clamp01(since / 0.18) * 6}px)` }}>
                {FIELD_EN}
              </span>
            )}
          </span>
        ) : (
          <span className="text-[16px] leading-5" style={{ color: AX.fieldPlaceholder }}>
            Message
          </span>
        )}
      </div>
      <div className="relative h-9 w-9 shrink-0" style={{ opacity: has ? 1 : 0.35 }}>
        {pressed && <Touch />}
        <div className="relative grid h-9 w-9 place-items-center rounded-full" style={{ backgroundColor: AX.send, transform: pressed ? 'scale(0.86)' : undefined }}>
          <ArrowUp className="h-5 w-5 text-white" strokeWidth={2.8} />
        </div>
      </div>
    </div>
  );
}

function World({ met, t }: { met: Metrics; t: number }) {
  const g = geometry(met, t);
  const c0 = camera(met, t);
  const cam = { ...c0, s: c0.s * CAM_K };
  const away = NOTE_WITH_STUDY ? 0 : span(t, NOTE_IN, NOTE_IN + D.noteFade, (x) => x) * (1 - span(t, NOTE_OUT + D.noteFade, NOTE_OUT + 2 * D.noteFade, (x) => x));
  const solo = soloLevel(t);
  const fade = span(t, WORLD_IN, WORLD_IN + D.worldIn, (x) => x) * (1 - span(t, WORLD_OUT, ENDING, (x) => x)) * (1 - away);
  if (fade <= 0 && t > WORLD_IN + D.worldIn) return null;
  const pressed = t >= FIELD.rewordTap && t < FIELD.rewordTap + 0.22 ? 'reword' : t >= STUDY_TAP && t < STUDY_OPEN ? 'study' : null;
  const sent = t >= FIELD.sendAt;
  return (
    <div
      className="dark absolute left-0 top-0"
      style={{ width: COL, height: 0, transformOrigin: '0 0', transform: `translate(${STAGE.cx - cam.x * cam.s}px, ${STAGE.cy + cam.h * cam.s}px) scale(${cam.s})`, opacity: fade }}
    >
      {/* The conversation, stacked up from just above the field. */}
      {g.placed.map(({ i, bottom, out, claim }) => {
        const m = BUBBLES[i];
        const rise = m.who === 'me' ? (1 - easeOutCubic(clamp01((t - m.at) / 0.45))) * 70 : 0;
        const pop = m.who === 'me' ? 1 : lerp(0.92, 1, claim);
        return (
          <div
            key={i}
            className="absolute"
            style={{
              bottom: g.convBottom + bottom,
              ...(m.who === 'me' ? { right: SIDE } : { left: SIDE }),
              opacity: (m.who === 'me' ? 1 : claim) * (1 - out) * (1 - solo),
              transform: `translateY(${rise - out * 10}px) scale(${pop})`,
              transformOrigin: m.who === 'me' ? '100% 100%' : '0 100%',
              filter: out > 0 ? `blur(${out * 4}px)` : undefined,
            }}
          >
            <div style={{ ...BUBBLE, background: m.who === 'me' ? AX.send : RECV, color: '#fff', whiteSpace: 'pre-wrap' }}>{m.text}</div>
          </div>
        );
      })}
      {solo < 1 && (
        <div className="absolute left-0" style={{ width: COL, bottom: g.block + 8, opacity: 1 - solo }}>
          <Field t={t} />
        </div>
      )}
      <div
        className="absolute bottom-0 left-0 overflow-hidden rounded-[26px] ring-1 ring-white/10"
        style={{ width: COL, opacity: g.kb, transform: `translateY(${(1 - g.kb) * (KEYS_H + GLOBE_H)}px)` }}
      >
        <div className="relative overflow-hidden" style={{ height: lerp(KEYS_H, VIEW_H, g.grow) }}>
          {g.grow < 1 && (
            <div className="absolute inset-x-0 top-0" style={{ opacity: 1 - g.grow }}>
              <Keyboard s={{ t, text: sent ? '' : FIELD_EN.slice(0, typedCount(t)), keyDown: null, pressed, rewordLoading: false }} />
            </div>
          )}
          {CHECK && t >= CHECK_IN && t < CHECK_OUT + STUDY_GROW && (
            <div className="absolute inset-x-0 top-0 [&_*]:!transition-none [&_*]:!animate-none" style={{ opacity: checkLevel(t) }}>
              <CheckView t={t} />
            </div>
          )}
          {t >= STUDY_OPEN && (
            <div className="absolute inset-x-0 top-0 [&_*]:!transition-none [&_*]:!animate-none" style={{ opacity: easeInOutCubic(clamp01((t - STUDY_OPEN) / STUDY_GROW)) }}>
              <StudyPanel stage="rows" rows={STUDY_ROWS_DATA} total={18} scroll={studyScroll(t)} />
            </div>
          )}
        </div>
        {/* Folded away (Arcatext 02) so the Study Guide stands alone. */}
        <div className="overflow-hidden" style={solo > 0 ? { height: GLOBE_H * (1 - solo), opacity: 1 - solo } : undefined}>
          <GlobeRow padTop={lerp(17, 22, g.grow)} />
        </div>
      </div>
    </div>
  );
}

// ── The end card ──

/** Room a reel's clipping box keeps above and below its line, in em, so
    descenders (g, p, y) and accents are never cut by the box's edge; the box's
    negative margins keep the line itself where it was. */
const REEL_PAD = 0.3;

/** The end card's reel of languages, rolling up in place at the line's end.
    Its box is as wide as the longest language, so the line never moves. */
function Reel({ met, local }: { met: Metrics; local: number }) {
  const p = langPos(local);
  const w = Math.max(...met.langW);
  const lineH = 58;
  const pad = REEL_PAD * 46;
  return (
    <span className="relative inline-block overflow-hidden text-left align-top" style={{ width: w, height: lineH + 2 * pad, margin: `${-pad}px 0`, color: ACCENT }}>
      {LANGS.map((s, i) => (
        <span key={s} className="absolute left-0 whitespace-nowrap" style={{ top: pad, transform: `translateY(${(i - p) * (lineH + 2 * pad)}px)`, opacity: 1 - Math.min(1, Math.abs(i - p)) * 0.7 }}>
          {s}
        </span>
      ))}
    </span>
  );
}

function Ending({ t, met }: { t: number; met: Metrics }) {
  const local = t - ENDING;
  const fadeIn = span(t, WORLD_OUT, ENDING, (x) => x);
  const fade = span(t, DURATION - 0.6, DURATION, (x) => x);
  const line = (at: number) => {
    const k = span(local, at, at + 0.6, easeOutCubic);
    return { opacity: k, transform: `translateY(${(1 - k) * 18}px)`, filter: k < 1 ? `blur(${(1 - k) * 8}px)` : undefined };
  };
  return (
    <div className="absolute inset-0" style={{ opacity: fadeIn * (CLEAR ? 1 - fade : 1) }}>
      <div className="absolute left-0 top-0" style={{ width: W, height: H }}>
        {/* The logo plays alone, centered, as the line fades away. */}
        <div className="absolute grid place-items-center" style={{ left: STAGE.cx - 300, width: 600, top: STAGE.cy - 150, height: 300 }}>
          {local >= LOGO_AT && <SplashLogo s={local - LOGO_AT} scale={2.2} keepBlue />}
        </div>
        <div
          className="absolute flex justify-center"
          style={{ opacity: 1 - span(local, LOGO_AT - 0.35, LOGO_AT + 0.15, (x) => x), left: STAGE.cx - STAGE.w / 2, width: STAGE.w, top: STAGE.cy - 19, fontFamily: DISPLAY, fontWeight: 600, fontSize: 46, lineHeight: '58px', letterSpacing: '-0.015em', color: 'rgba(255,255,255,0.86)' }}
        >
          {/* Left-aligned, as the film's other lines, in a block centered at its widest. */}
          <div>
            {/* A long first chunk (Arcatext 02) takes the first line alone;
                the next two share the second. */}
            {END_CHUNKS[0].length > 12 ? (
              <>
                <div className="whitespace-nowrap" style={line(END_CHUNK_AT[0])}>{END_CHUNKS[0]}</div>
                <div className="whitespace-nowrap">
                  <span className="inline-block" style={line(END_CHUNK_AT[1])}>{END_CHUNKS[1]}</span>{' '}
                  <span className="inline-block" style={line(END_CHUNK_AT[2])}>{END_CHUNKS[2]}</span>
                </div>
              </>
            ) : (
              <>
                <div className="whitespace-nowrap">
                  <span className="inline-block" style={line(END_CHUNK_AT[0])}>{END_CHUNKS[0]}</span>{' '}
                  <span className="inline-block" style={line(END_CHUNK_AT[1])}>{END_CHUNKS[1]}</span>
                </div>
                <div style={line(END_CHUNK_AT[2])}>{END_CHUNKS[2]}</div>
              </>
            )}
            <div className="whitespace-nowrap" style={line(END_CHUNK_AT[3])}>
              {END_CHUNKS[3]} <Reel met={met} local={local} />
            </div>
          </div>
        </div>
      </div>
      {!CLEAR && <div className="absolute inset-0 bg-black" style={{ opacity: fade }} />}
    </div>
  );
}

/** `?clear`: a transparent background and no glow, for an alpha render the
    Cut Room can lay any background under. */
const CLEAR = new URLSearchParams(location.search).has('clear');
if (CLEAR) document.head.appendChild(Object.assign(document.createElement('style'), { textContent: 'html, body, #root { background: transparent !important; }' }));

let resolveReady: () => void;
export const learnReady = new Promise<void>((r) => (resolveReady = r));

export default function LearnFilm() {
  const params = new URLSearchParams(location.search);
  const still = params.get('t');
  const [t, setT] = useState(still ? parseFloat(still) : 0);
  const [met, setMet] = useState<Metrics | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    let live = true;
    // As the chat film: measure once Inter's faces are really registered.
    const interRegistered = new Promise<void>((resolve) => {
      const t0 = performance.now();
      const check = () =>
        [...document.fonts].some((f) => f.family.replace(/["']/g, '') === 'Inter') || performance.now() - t0 > 8000 ? resolve() : setTimeout(check, 50);
      check();
    });
    interRegistered
      .then(() =>
        Promise.all([
          document.fonts.load('17px Inter', FIELD_EN + FIELD_ES),
          document.fonts.load("700 62px 'Inter Display'", LINE2_A + LINE2_SLOT.join('')),
          document.fonts.load("600 46px 'Inter Display'", END_CHUNKS.join('') + LANGS.join('')),
          document.fonts.load(`700 ${AV_SIZE}px 'Inter Display'`, AV_TEXT + BLOCK_LINES.join('')),
          document.fonts.load("14px 'Noto Sans'", 'Study Guide entries'),
          document.fonts.load("700 32px 'Noto Sans'", 'Arcatext'),
        ]),
      )
      .then(() => document.fonts.ready)
      .then(() => (AVATARS ? preloadAvatars() : undefined))
      .then(() => {
        if (!live || !rootRef.current) return;
        const m = measure(rootRef.current);
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
    <div ref={rootRef} className={`relative overflow-hidden ${CLEAR ? '' : 'bg-black'}`} style={{ width: W, height: H }}>
      {!CLEAR && <Glow />}
      {met && OPENING && t < WORLD_IN + 1 && (
        <>
          <Headline t={t} />
          <TypedLine t={t} met={met} />
        </>
      )}
      {met && AVATARS && t < WORLD_IN && (
        <>
          <AvatarOpener t={t} boxes={met.avBox} />
          <TextBlock t={t} />
        </>
      )}
      {met && t >= WORLD_IN && t < ENDING && <World met={met} t={t} />}
      <Note t={t} />
      <CheckCards t={t} />
      <HeadCard t={t} />
      {met && t >= WORLD_OUT && <Ending t={t} met={met} />}
    </div>
  );
}
