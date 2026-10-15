import type { CheckData, CheckState } from '@/components/ArcatextViews';
import type { AppCard, ScreenState } from './Phone';
import { clamp01, easeInOutCubic, lerp } from './ease';

/**
 * The film's single source of truth: when everything happens, in seconds.
 * 120 BPM, so a beat is 0.5s and a bar 2s; cuts and taps land on beats.
 * render.mjs exports cues() so the soundtrack is built against the same
 * numbers.
 *
 *   0  Opening: icon, Arcatext, "Practical language learning"
 *   4  "Start with a message in your language."         → typing
 *  10  "Tap Reword to translate it."                     → Reword
 *  16  "Make sure the translation is what you intended…" → Check, close, send
 *  27  Works in Messages, WhatsApp, Telegram, and any other messaging app
 *  35  Closing: icon, Arcatext, "Learn languages by texting {…}"
 */

export const FPS = 60;
export const BPM = 120;
export const DURATION = 40;

export const EN = "Hey, let's go to the beach this weekend!";
export const JA = 'ねえ、今週末ビーチに行こうよ！';
export const CHECK_DATA: CheckData = {
  reverse: "Hey, let's go to the beach this weekend!",
  reword: JA,
  original: EN,
  synonyms: [],
  homograph: { word: 'beach', meanings: [] },
};

// ── Story beats ─────────────────────────────────────────────────────────────

const TYPE_START = 6.45;
export const REWORD_TAP = 12.5;
const REWORD_DONE = 13.5;
const SWAP_LEN = 0.32;
export const CHECK_TAP = 19.5;
const CHECK_OPEN = CHECK_TAP + 0.18;
const CHECK_LOADED = 20.15;
export const REVERSE_AT = 20.95;
export const CLOSE_TAP = 24.0;
const CHECK_CLOSED = CLOSE_TAP + 0.18;
export const SEND_TAP = 25.0;
const SEND_AT = SEND_TAP + 0.17;
/** App switches: a swipe along the home indicator, [start, end]. */
export const SWITCHES: [number, number][] = [
  [28.55, 29.25],
  [30.55, 31.25],
];
/** When the app list ends on "and any other messaging app!". */
export const ANY_APP_AT = 32.5;
export const CLOSING = 35;
/** The closing line's rotating word, and when each one lands. */
export const WORDS = ['friends', 'penpals', 'classmates', 'AI'];
export const WORD_TIMES = [36.3, 37.1, 37.9, 38.7];

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
    let dt = 0.05 + jitter(i) * 0.022;
    if (c === ' ') dt += 0.012;
    if (",'!".includes(c)) dt += 0.06;
    t += dt;
  }
  return out;
})();
export const TYPE_END = TYPE_TIMES[TYPE_TIMES.length - 1];

const KEY_HOLD = 0.075;

/** The two other apps in the switching scene: a message already reworded in
    the field, ready to send, to show the keyboard works the same everywhere. */
const OTHER_APPS: AppCard[] = [
  {
    app: 'whatsapp',
    contact: 'Lucía',
    received: ['¿Qué planes tienes para el sábado?'],
    sent: [],
    text: '¡Vamos a la playa! ¿Te apuntas?',
  },
  {
    app: 'telegram',
    contact: 'Antoine',
    received: ['Tu viens au concert vendredi ?'],
    sent: [],
    text: 'Oui, avec plaisir ! On se retrouve où ?',
  },
];

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
  if (t >= CHECK_TAP && t < CHECK_OPEN) pressed = 'check';
  if (t >= CLOSE_TAP && t < CHECK_CLOSED) pressed = 'close';
  if (t >= SEND_TAP && t < SEND_AT) pressed = 'send';

  const check: CheckState = {
    opening: t < CHECK_LOADED,
    reverse: t < REVERSE_AT ? 'loading' : 'done',
    synonyms: 'idle',
    homographs: 'idle',
  };

  // App switching: which cards are on screen, and where.
  const apps = ['imessage', 'whatsapp', 'telegram'] as const;
  let cards: { index: number; x: number; scale: number }[] = [{ index: 0, x: 0, scale: 1 }];
  let swipe: number | null = null;
  SWITCHES.forEach(([a, b], i) => {
    if (t >= b) cards = [{ index: i + 1, x: 0, scale: 1 }];
    else if (t >= a) {
      const p = easeInOutCubic((t - a) / (b - a));
      // Like iOS: both apps shrink a little into cards while they slide.
      const scale = 1 - 0.09 * Math.sin(Math.PI * p);
      const gap = 18;
      cards = [
        { index: i, x: -p * (402 + gap), scale },
        { index: i + 1, x: (1 - p) * (402 + gap), scale },
      ];
      swipe = p;
    }
  });

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
    view: t >= CHECK_OPEN && t < CHECK_CLOSED ? 'check' : 'none',
    check,
    checkData: CHECK_DATA,
    checkScroll: 0,
    cards: cards.map((c) => ({ ...c, app: apps[c.index] })),
    others: OTHER_APPS,
    swipe,
  };
}

// ── Shots ───────────────────────────────────────────────────────────────────

/** A camera: the phone point (fx, fy) — bezel coordinates, 426x898 — lands at
    the frame centre plus (ox, oy), magnified z, turned rx/ry/rz degrees. */
export type Cam = { fx: number; fy: number; z: number; rx: number; ry: number; rz: number; ox: number; oy: number };
export type Key = [time: number, cam: Partial<Cam>];
export type TitleLine = { text: string; accent?: string[] };

export type Shot =
  | { kind: 'open'; start: number; end: number }
  | { kind: 'title'; start: number; end: number; lines: TitleLine[]; size?: number }
  | { kind: 'phone'; start: number; end: number; keys: Key[]; label?: boolean }
  | { kind: 'close'; start: number; end: number };

const BASE: Cam = { fx: 213, fy: 449, z: 1, rx: 0, ry: 0, rz: 0, ox: 0, oy: 0 };

export const SHOTS: Shot[] = [
  { kind: 'open', start: 0, end: 4 },
  {
    kind: 'title',
    start: 4,
    end: 6,
    lines: [{ text: 'Start with a message' }, { text: 'in your language.', accent: ['your', 'language.'] }],
  },
  // Every phone shot is straight on, framed once, with only a slow push-in.
  {
    // Typing: the field and the keys together.
    kind: 'phone',
    start: 6,
    end: 10,
    keys: [
      [6, { fx: 213, fy: 630, z: 2.0 }],
      [10, { fx: 213, fy: 625, z: 2.1 }],
    ],
  },
  { kind: 'title', start: 10, end: 12, lines: [{ text: 'Tap Reword', accent: ['Reword'] }, { text: 'to translate it.' }] },
  {
    // Reword: the field and the toolbar in one frame.
    kind: 'phone',
    start: 12,
    end: 16,
    keys: [
      [12, { fx: 213, fy: 560, z: 2.3 }],
      [16, { fx: 213, fy: 555, z: 2.4 }],
    ],
  },
  {
    kind: 'title',
    start: 16,
    end: 19,
    size: 112,
    lines: [
      { text: 'Make sure the translation' },
      { text: 'is what you intended to say.', accent: ['intended'] },
    ],
  },
  {
    // Check: from the conversation down to the bottom of the view, so the
    // tap, the reverse translation, the close and the send all stay in frame.
    kind: 'phone',
    start: 19,
    end: 27,
    keys: [
      [19, { fx: 213, fy: 545, z: 1.68 }],
      [27, { fx: 213, fy: 540, z: 1.78 }],
    ],
  },
  {
    // App switching: the whole phone, right of centre, the app's name beside it.
    kind: 'phone',
    start: 27,
    end: CLOSING,
    label: true,
    keys: [
      [27, { fx: 213, fy: 449, z: 1.02, ox: 330 }],
      [CLOSING, { fx: 213, fy: 449, z: 1.06, ox: 330 }],
    ],
  },
  { kind: 'close', start: CLOSING, end: DURATION },
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
    taps: [REWORD_TAP, CHECK_TAP, CLOSE_TAP, SEND_TAP],
    reword: REWORD_DONE,
    send: SEND_AT,
    reveal: REVERSE_AT,
    swipes: SWITCHES.map(([a]) => a),
    words: WORD_TIMES,
    titles: SHOTS.filter((s) => s.kind === 'title').map((s) => [s.start, s.end]),
    phones: SHOTS.filter((s) => s.kind === 'phone').map((s) => s.start),
    opening: [SHOTS[0].start, SHOTS[0].end],
    closing: CLOSING,
  };
}
