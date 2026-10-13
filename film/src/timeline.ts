import type { CheckData, CheckState } from '@/components/ArcatextViews';
import type { ScreenState } from './Phone';
import { clamp01, easeInOutCubic, lerp } from './ease';

/**
 * The film's single source of truth: when everything happens, in seconds.
 * 120 BPM, so a beat is 0.5s and a bar 2s; cuts land on bar lines and taps
 * land on beats. render.mjs exports CUES so the soundtrack is built against
 * the same numbers.
 */

export const FPS = 60;
export const BPM = 120;
export const DURATION = 26;

// The message, the reword and Check's results: the same example the site's
// keyboard demo uses (ArcatextKeyboard.tsx), so the film and the case study agree.
export const EN = 'Hello, how are you my friend? Meet me at the bank.';
export const JA = 'こんにちは、元気ですか、友よ？銀行で会いましょう。';
export const CHECK_DATA: CheckData = {
  reverse: "Hello, how are you, my friend? Let's meet at the bank.",
  reword: JA,
  original: EN,
  synonyms: [],
  homograph: { word: 'bank', meanings: [] },
};

// ── Story beats ─────────────────────────────────────────────────────────────

const TYPE_START = 2.4;
export const REWORD_TAP = 8.5;
const REWORD_DONE = 9.5;
const SWAP_LEN = 0.32;
export const SEND_TAP = 12.5;
const SEND_AT = SEND_TAP + 0.17;
export const CHECK_TAP = 16.5;
const CHECK_OPEN = CHECK_TAP + 0.18;
const CHECK_LOADED = 17.15;
export const REVERSE_AT = 17.95;
const SCROLL_FROM = 20.0;
const SCROLL_TO = 21.0;
const SCROLL_PX = 150;
const SCROLL_BACK = 21.3;

/** Deterministic jitter so the typing has a human rhythm. */
const jitter = (i: number) => {
  const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x) - 0.5;
};

/** When each character of EN lands. */
export const TYPE_TIMES: number[] = (() => {
  const out: number[] = [];
  let t = TYPE_START;
  for (let i = 0; i < EN.length; i++) {
    out.push(t);
    const c = EN[i];
    let dt = 0.047 + jitter(i) * 0.022;
    if (c === ' ') dt += 0.012;
    if (',?.'.includes(c)) dt += 0.07;
    t += dt;
  }
  return out;
})();
export const TYPE_END = TYPE_TIMES[TYPE_TIMES.length - 1];

const KEY_HOLD = 0.075;

export function screenAt(t: number): ScreenState {
  // Typing
  let typed = 0;
  while (typed < EN.length && TYPE_TIMES[typed] <= t) typed++;
  const lastKeyAt = typed > 0 ? TYPE_TIMES[typed - 1] : -1;
  const lastChar = typed > 0 ? EN[typed - 1] : '';
  let keyDown: string | null = null;
  if (t < TYPE_END + KEY_HOLD && t - lastKeyAt < KEY_HOLD) {
    keyDown = lastChar === ' ' ? 'space' : /[a-z]/i.test(lastChar) ? lastChar.toLowerCase() : '123';
  }

  let text = EN.slice(0, typed);
  let prevText = '';
  let swap = 1;
  if (t >= REWORD_DONE) {
    text = JA;
    prevText = EN;
    swap = clamp01((t - REWORD_DONE) / SWAP_LEN);
  }
  const sent: ScreenState['sent'] = [];
  if (t >= SEND_AT) {
    sent.push({ text: JA, t0: SEND_AT });
    text = '';
    swap = 1;
  }

  let pressed: string | null = null;
  if (t >= REWORD_TAP && t < REWORD_TAP + 0.22) pressed = 'reword';
  if (t >= SEND_TAP && t < SEND_AT) pressed = 'send';
  if (t >= CHECK_TAP && t < CHECK_OPEN) pressed = 'check';

  const check: CheckState = {
    opening: t < CHECK_LOADED,
    reverse: t < REVERSE_AT ? 'loading' : 'done',
    synonyms: 'idle',
    homographs: 'idle',
  };

  return {
    t,
    text,
    prevText,
    swap,
    typing: t >= TYPE_START - 0.2 && t < TYPE_END + 0.4,
    keyDown,
    pressed,
    rewordLoading: t >= REWORD_TAP && t < REWORD_DONE,
    sent,
    view: t >= CHECK_OPEN ? 'check' : 'none',
    check,
    checkData: CHECK_DATA,
    // Down to the reword and the original, then back up for the closing shot.
    checkScroll:
      lerp(0, SCROLL_PX, easeInOutCubic(clamp01((t - SCROLL_FROM) / (SCROLL_TO - SCROLL_FROM)))) -
      lerp(0, SCROLL_PX, easeInOutCubic(clamp01((t - SCROLL_BACK) / 0.8))),
  };
}

// ── Shots ───────────────────────────────────────────────────────────────────

/** A camera: the phone point (fx, fy) — bezel coordinates, 426x898 — lands at
    the frame centre plus (ox, oy), magnified z, turned rx/ry/rz degrees. */
export type Cam = { fx: number; fy: number; z: number; rx: number; ry: number; rz: number; ox: number; oy: number };
export type Key = [time: number, cam: Partial<Cam>];

export type Shot =
  | { kind: 'title'; start: number; end: number; lines: { text: string; accent?: string[] }[] }
  | { kind: 'phone'; start: number; end: number; keys: Key[] }
  | { kind: 'end'; start: number; end: number; keys: Key[] };

const BASE: Cam = { fx: 213, fy: 449, z: 1, rx: 0, ry: 0, rz: 0, ox: 0, oy: 0 };

export const SHOTS: Shot[] = [
  { kind: 'title', start: 0, end: 2, lines: [{ text: 'Write in your language.', accent: ['your'] }] },
  {
    // Typing: low and angled over the keys, drifting up toward the field.
    kind: 'phone',
    start: 2,
    end: 6,
    keys: [
      [2, { fx: 200, fy: 690, z: 2.05, rx: 26, ry: 24, rz: -7, ox: 60, oy: 40 }],
      [6, { fx: 215, fy: 610, z: 2.35, rx: 18, ry: 16, rz: -4, ox: 0, oy: 20 }],
    ],
  },
  { kind: 'title', start: 6, end: 8, lines: [{ text: 'Arcatext rewords it', accent: [] }, { text: 'in theirs.', accent: ['theirs.'] }] },
  {
    // Reword: straight on, tight on the pill; pull up to the field as it changes.
    kind: 'phone',
    start: 8,
    end: 12,
    keys: [
      [8, { fx: 345, fy: 588, z: 3.4, rx: 0, ry: 0, rz: 0, ox: 0, oy: 40 }],
      [9.15, { fx: 330, fy: 570, z: 3.2 }],
      [10.2, { fx: 230, fy: 515, z: 2.3, rx: 4, ry: -5, oy: 0 }],
      [12, { fx: 228, fy: 505, z: 2.4, rx: 3, ry: -7 }],
    ],
  },
  {
    // Send: the other angle, from the send button up to the bubble.
    kind: 'phone',
    start: 12,
    end: 14,
    keys: [
      [12, { fx: 360, fy: 520, z: 2.9, rx: 12, ry: -30, rz: 5, ox: 40, oy: 30 }],
      [12.6, { fx: 352, fy: 505, z: 2.85, rx: 12, ry: -29, rz: 5 }],
      [13.4, { fx: 300, fy: 440, z: 2.3, rx: 8, ry: -22, rz: 3, ox: 0, oy: 0 }],
      [14, { fx: 296, fy: 432, z: 2.25, rx: 7, ry: -20, rz: 3 }],
    ],
  },
  { kind: 'title', start: 14, end: 16, lines: [{ text: "Then check what", accent: [] }, { text: "they'll read.", accent: ["they'll", 'read.'] }] },
  {
    // Check: medium on the toolbar, then a slow push into the reverse translation.
    kind: 'phone',
    start: 16,
    end: 22,
    keys: [
      [16, { fx: 200, fy: 560, z: 1.55, rx: 8, ry: 14, rz: -2, oy: 30 }],
      [16.9, { fx: 205, fy: 590, z: 1.7, rx: 6, ry: 10, rz: -1 }],
      [18.6, { fx: 213, fy: 520, z: 2.75, rx: 0, ry: 0, rz: 0, oy: 0 }],
      [19.9, { fx: 213, fy: 515, z: 2.85 }],
      [21.2, { fx: 213, fy: 560, z: 2.2, rx: 4, ry: -6 }],
      [22, { fx: 213, fy: 560, z: 2.1, rx: 5, ry: -8 }],
    ],
  },
  {
    kind: 'end',
    start: 22,
    end: DURATION,
    keys: [
      [22, { fx: 213, fy: 449, z: 0.9, rx: 6, ry: -30, rz: 2, ox: 330, oy: 20 }],
      [26, { fx: 213, fy: 449, z: 0.95, rx: 4, ry: -20, rz: 1, ox: 330, oy: 0 }],
    ],
  },
];

export function camAt(keys: Key[], t: number): Cam {
  // Resolve each key against the previous one, so a key only names what changes.
  const full: [number, Cam][] = [];
  let prev = BASE;
  for (const [kt, c] of keys) {
    prev = { ...prev, ...c };
    full.push([kt, prev]);
  }
  if (t <= full[0][0]) return full[0][1];
  for (let i = 1; i < full.length; i++) {
    const [t1, c1] = full[i];
    const [t0, c0] = full[i - 1];
    if (t <= t1) {
      const k = easeInOutCubic((t - t0) / (t1 - t0));
      const out = {} as Cam;
      for (const p of Object.keys(c0) as (keyof Cam)[]) out[p] = lerp(c0[p], c1[p], k);
      return out;
    }
  }
  return full[full.length - 1][1];
}

/** Sound cues for the soundtrack. */
export function cues() {
  return {
    duration: DURATION,
    bpm: BPM,
    keys: TYPE_TIMES.map((t, i) => ({ t, space: EN[i] === ' ' })),
    taps: [REWORD_TAP, SEND_TAP, CHECK_TAP],
    reword: REWORD_DONE,
    send: SEND_AT,
    reveal: REVERSE_AT,
    cuts: SHOTS.map((s) => s.start),
  };
}
