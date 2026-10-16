/**
 * "Chat": the second film. A conversation between two people as floating
 * message bubbles (no phone), then a pan down to the Arcatext keyboard, a
 * reword into Japanese, a send, and the end card. Every time is derived here
 * from the script, so changing a line re-times everything after it.
 *
 * `me` is the sceptic (blue, right); `them` is the friend explaining (grey,
 * left). Typed bubbles grow in place as they type; blocks arrive whole.
 */

import { SPLASH_LETTERS } from '../SplashLogo';

export type Who = 'me' | 'them';
export type Line = {
  who: Who;
  kind: 'type' | 'block';
  text: string;
  /** Words a slot-machine reel turns through, on its own last line… */
  slot?: string[];
  /** …or at the end of the text's last line. */
  slotInline?: boolean;
  /** Fades out every bubble above it as it arrives, so it stands alone. */
  clearAbove?: boolean;
  /** Keeps the text on one line, however wide the bubble gets… */
  noWrap?: boolean;
  /** …or widens this bubble past the usual maximum (pt). */
  maxW?: number;
  /** Phrases underlined as they type out. */
  underline?: string[];
  /** A long reel: the first `holds` words each hold `hold` seconds, then the
      rest spin past in `flick` seconds, fast off the mark and slowing to land. */
  slotFlick?: { holds: number; hold: number; flick: number };
  /** Typed bubbles: hold for `secs` once the text up to `after` is typed. */
  pauses?: { after: string; secs: number }[];
  /** With `focus`: push in again onto the reel as its first word types. */
  focusSlot?: boolean;
  /** The reel's last word types on in place of the reel rather than rolling in. */
  slotTypeLast?: boolean;
  /** Extra seconds before the reel's first word types on (after a block
      lands, or after a typed bubble's text). */
  slotTypeDelay?: number;
  /** Seconds each later reel word holds (default SLOT_DWELL). */
  slotDwell?: number;
  /** Seconds the reel's first word holds before it rolls (default SLOT_DELAY). */
  slotHold?: number;
  /** The camera closes on this bubble while it types, and opens back out as
      the next one arrives. */
  focus?: boolean;
  /** With `focus`: after the close-up settles, push in again on this phrase. */
  focusPhrase?: string;
  /** Plays after the first field message is sent, back up in the chat,
      rather than before the pan down to the keyboard. Keep these last. */
  afterSend?: boolean;
  /** Arrives above the field once the camera is down at the keyboard, before
      the first reply is typed. Keep these between the opening and afterSend. */
  atKeys?: boolean;
  /** Seconds from this bubble being complete (its reel landed) to the next
      thing happening; otherwise a reading pause scaled to its length. */
  after?: number;
};

const params = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');
/** Portrait (1080x1920) when the page is opened with ?portrait. */
export const PORTRAIT = params.has('portrait');
/** The short ad cut (?cut=short): fewer lines, both keyboard sequences, the same ending. */
export const SHORT = params.get('cut') === 'short';
export const FRAME = PORTRAIT ? { w: 1080, h: 1920 } : { w: 1920, h: 1080 };
/** Where the action sits. Portrait keeps it inside the area TikTok, Reels and
    Shorts leave clear of their top bar, right-hand buttons and caption/CTA
    (roughly x 60-940, y 150-1440 of 1080x1920); landscape uses the frame. */
export const STAGE = PORTRAIT ? { cx: 500, cy: 800, w: 860 } : { cx: 960, cy: 540, w: 1766 };

/** Reword's languages (Arcatext/Data/LanguageData.swift on main), names
    shortened to how they read in a sentence. */
const REWORD_LANGUAGES = [
  'Afrikaans', 'Albanian', 'Arabic', 'Armenian', 'Azerbaijani', 'Basque', 'Bengali', 'Bosnian', 'Bulgarian',
  'Cantonese', 'Catalan', 'Croatian', 'Czech', 'Danish', 'Dari', 'Dutch', 'Egyptian Arabic', 'English',
  'Esperanto', 'Estonian', 'Filipino', 'Finnish', 'Flemish', 'French', 'Galician', 'German', 'Greek', 'Gujarati',
  'Haitian Creole', 'Hausa', 'Hebrew', 'Hindi', 'Hungarian', 'Icelandic', 'Indonesian', 'Irish', 'Italian',
  'Japanese', 'Kannada', 'Kazakh', 'Khmer', 'Korean', 'Kurdish', 'Latin', 'Malay', 'Mandarin', 'Norwegian',
  'Pashto', 'Persian', 'Polish', 'Portuguese', 'Punjabi', 'Romanian', 'Russian', 'Serbian', 'Slovak',
  'Slovenian', 'Spanish', 'Swahili', 'Swedish', 'Tagalog', 'Tamil', 'Telugu', 'Thai', 'Turkish', 'Ukrainian',
  'Urdu', 'Uzbek', 'Valencian', 'Vietnamese', 'Welsh',
];
const LEAD = ['English', 'Spanish', 'Mandarin'];

/** The end card's "Text and learn …" reel: English, Spanish and Mandarin,
    then the rest of the list faster and faster, settling on "a language".
    Times are from the start of the end card. */
export const TAGLINE_WORDS = [...LEAD, ...REWORD_LANGUAGES.filter((l) => !LEAD.includes(l)), 'a language'];

const FULL_SCRIPT: Line[] = [
  // ── The opening conversation ──
  {
    who: 'them',
    kind: 'type',
    text: 'Want to learn',
    noWrap: true,
    // The closing card's languages: three readable, then a flick that slows
    // to land on "a new language?".
    slot: [...TAGLINE_WORDS.slice(0, -1), 'a new language'].map((w) => w + '?'),
    slotInline: true,
    slotFlick: { holds: 3, hold: 0.8, flick: 2.0 },
  },
  { who: 'me', kind: 'block', text: 'Of course, but how?', after: 2.0 },
  // Held long enough for the close-up and the second push-in on the phrase.
  { who: 'me', kind: 'block', text: "I've tried so many apps.", focus: true, focusPhrase: 'so many apps', after: 2.3 },
  { who: 'them', kind: 'block', text: "I think you'll like this one.", after: 2.5 },
  {
    who: 'them',
    kind: 'block',
    text: 'Learn while you text',
    slot: ['friends!', 'penpals!', 'classmates!', 'AI!'],
    slotInline: true,
    slotTypeDelay: 1.0,
    clearAbove: true,
    after: 1.0,
  },
  // ── Back up in the chat once the reply is sent, then down again ──
  // "Yes!..." arrives alone on screen.
  {
    who: 'them',
    kind: 'block',
    text: "Yes! It's a keyboard with features for",
    maxW: 340,
    // The reel has its own line, so a word typing on never re-wraps the text.
    slot: ['translation.', 'correction.', 'analysis.', 'study.'],
    slotTypeDelay: 1.0,
    clearAbove: true,
    after: 1.0,
    afterSend: true,
  },
  {
    who: 'them',
    kind: 'type',
    text: "This won't replace all your tools, let's be honest.",
    after: 1.5,
    afterSend: true,
  },
  {
    who: 'them',
    kind: 'type',
    // Answers the bubble above, so both stay on screen. The reel has its own
    // last line, so the longest word never re-wraps the sentence.
    text: 'But, it will help you learn the practical language based on your',
    pauses: [{ after: 'But,', secs: 1.0 }],
    maxW: 340,
    slot: ['life.', 'interests.', 'actual conversations.'],
    slotHold: 2.0,
    slotTypeDelay: 1.0,
    focus: true,
    // After the close-up on the bubble, a second push-in onto the reel as its
    // first word starts typing.
    focusSlot: true,
    afterSend: true,
  },
  { who: 'me', kind: 'block', text: 'Where can I use it?', afterSend: true },
  {
    who: 'them',
    kind: 'block',
    text: 'Right where your chats already happen!',
    slot: ['WhatsApp', 'HelloTalk', 'Instagram', 'Really...any app.'],
    slotInline: true,
    slotTypeLast: true,
    after: 1.0,
    afterSend: true,
  },
]

/** The short cut (the owner's script): a quicker setup, both keyboard
    sequences, the same ending. Bubble 1 is the full film's. */
const SHORT_SCRIPT: Line[] = [
  FULL_SCRIPT[0],
  {
    who: 'them',
    kind: 'block',
    text: 'Just by texting your',
    slot: ['friends?', 'penpals?', 'classmates?', 'AI?'],
    slotInline: true,
    slotTypeDelay: 1.0,
  },
  { who: 'me', kind: 'block', text: "Yeah! Let's see it.", after: 1.0 },
  // ── Back up in the chat once the reply is sent, then down again ──
  {
    who: 'them',
    kind: 'block',
    text: "Yes! It's a keyboard with features for",
    maxW: 340,
    slot: ['translation.', 'correction.', 'analysis.', 'study.'],
    slotTypeDelay: 1.0,
    clearAbove: true,
    after: 1.0,
    afterSend: true,
  },
  {
    who: 'them',
    kind: 'type',
    // Broken before "based on your" so even "actual conversations." fits after it.
    text: 'Learn the practical language\nbased on your',
    maxW: 340,
    slot: ['life.', 'interests.', 'actual conversations.'],
    slotInline: true,
    slotHold: 2.0,
    slotTypeDelay: 1.0,
    focus: true,
    focusSlot: true,
    clearAbove: true,
    afterSend: true,
  },
  { who: 'me', kind: 'block', text: 'Where can I use it?', afterSend: true },
  {
    who: 'them',
    kind: 'block',
    text: 'In any messaging app!',
    slot: ['WhatsApp', 'HelloTalk', 'Instagram'],
    slotInline: true,
    after: 1.0,
    afterSend: true,
  },
]

export const SCRIPT: Line[] = SHORT ? SHORT_SCRIPT : FULL_SCRIPT;

// A '|' marks a half-second pause in the typing; it isn't typed.
const FIELD_RAW = 'So...| I just type a message| then tap a button to translate?';
export const FIELD_TEXT = FIELD_RAW.replaceAll('|', '');
export const FIELD_JA = 'じゃあ…メッセージを入力して、ボタンを押すだけで翻訳できるの？';
const FIELD2_RAW = SHORT ? 'And it adds words I miss| to a study guide!' : 'One more thing...it actually adds the words I missed| to a study guide?';
export const FIELD2_TEXT = FIELD2_RAW.replaceAll('|', '');
const FIELD3_RAW = 'Ok this is cool.| I kind of want to practice now.';
export const FIELD3_TEXT = FIELD3_RAW.replaceAll('|', '');

export const FPS = 60;
export const BPM = 120;

const CHAR = 0.042; // in-place typing: ~24 characters a second
const SLOT_DELAY = 1.0; // a block's reel waits this long after it lands
const SLOT_DWELL = 0.72; // each word holds this long before the next roll
const SLOT_ROLL = 0.32;

/** Deterministic jitter so typing has a human rhythm. */
const jitter = (i: number, seed: number) => {
  const x = Math.sin(i * 12.9898 + seed * 78.233) * 43758.5453;
  return x - Math.floor(x) - 0.5;
};

export type Timed = Line & {
  index: number;
  /** When the bubble appears. */
  at: number;
  /** When each character lands (typed bubbles). */
  chars: number[];
  /** When the slot line appears, and when each slot word lands. The first
      word types out letter by letter (`slotChars`); it "lands" when typed. */
  slotAt: number;
  slotChars: number[];
  /** With slotTypeLast: when each letter of the last word lands. */
  slotLastChars: number[];
  slotLands: number[];
  /** When the bubble is complete. */
  done: number;
  /** A slotFlick's spin: from the last held word (`startIdx`) to the end,
      one continuous motion from `from` to `to` along flickEase. */
  flick?: { from: number; to: number; startIdx: number };
};

/** A flick's progress (0..1): a short ramp up to speed, then a long glide to
    rest, like a momentum scroll. cubic-bezier(0.3, 0, 0.15, 1). */
export function flickEase(x: number) {
  const k = Math.min(1, Math.max(0, x));
  const [x1, y1, x2, y2] = [0.3, 0, 0.15, 1];
  let t = k;
  for (let i = 0; i < 10; i++) {
    const bx = 3 * (1 - t) ** 2 * t * x1 + 3 * (1 - t) * t * t * x2 + t ** 3;
    const dx = 3 * (1 - t) ** 2 * x1 + 6 * (1 - t) * t * (x2 - x1) + 3 * t * t * (1 - x2);
    if (Math.abs(dx) < 1e-6) break;
    t = Math.min(1, Math.max(0, t - (bx - k) / dx));
  }
  return 3 * (1 - t) ** 2 * t * y1 + 3 * (1 - t) * t * t * y2 + t ** 3;
}

/** Times a run of script lines (with their indexes in SCRIPT) from `start`. */
function timeLines(lines: [Line, number][], start: number): Timed[] {
  const out: Timed[] = [];
  let t = start;
  let prev: Who | null = null;
  lines.forEach(([line, index]) => {
    if (prev && prev !== line.who && !out[out.length - 1]?.after) t += 0.15;
    const at = t;
    const chars: number[] = [];
    let slotAt = Infinity;
    const slotLands: number[] = [];
    let slotChars: number[] = [];
    let slotLastChars: number[] = [];
    let flick: Timed['flick'];
    /** Types the reel's first word from `from`; returns when it's complete. */
    const typeFirst = (from: number) => {
      let c = from;
      slotChars = [...line.slot![0]].map((ch, i) => {
        const at = c;
        c += CHAR + jitter(i, index + 31) * 0.016 + (',.?!'.includes(ch) ? 0.06 : 0);
        return at;
      });
      return c;
    };
    let done: number;
    if (line.kind === 'type') {
      let c = at;
      const holds = new Map((line.pauses ?? []).map((p) => [line.text.indexOf(p.after) + p.after.length - 1, p.secs]));
      for (let i = 0; i < line.text.length; i++) {
        chars.push(c);
        let dt = CHAR + jitter(i, index) * 0.016;
        if (',.?!'.includes(line.text[i])) dt += 0.06;
        c += dt + (holds.get(i) ?? 0);
      }
      done = c;
      if (line.slot) {
        // The first word types on after the text, holds, then the reel rolls.
        slotAt = done + 0.15 + (line.slotTypeDelay ?? 0);
        let land = typeFirst(slotAt);
        slotLands.push(land);
        const fl = line.slotFlick;
        if (fl) {
          for (let i = 1; i < fl.holds; i++) slotLands.push(slotLands[i - 1] + fl.hold + SLOT_ROLL);
          const from = slotLands[fl.holds - 1] + fl.hold;
          const rest = line.slot.length - fl.holds;
          flick = { from, to: from + fl.flick, startIdx: fl.holds - 1 };
          // Each word "lands" (for the ticks) when the spin passes it.
          for (let j = 1; j <= rest; j++) {
            let lo = 0;
            let hi = 1;
            for (let k = 0; k < 30; k++) {
              const mid = (lo + hi) / 2;
              if (flickEase(mid) * rest < j - 1e-9) lo = mid;
              else hi = mid;
            }
            slotLands.push(from + fl.flick * hi);
          }
        } else {
          land += (line.slotHold ?? SLOT_DELAY) + SLOT_ROLL;
          for (let i = 1; i < line.slot.length; i++) {
            slotLands.push(land);
            land += (line.slotDwell ?? SLOT_DWELL) + SLOT_ROLL;
          }
        }
        done = slotLands[slotLands.length - 1] + 0.25;
      }
      t = done + 0.45 + line.text.length * 0.008 + (line.slot ? 0.4 : 0);
    } else if (line.slot) {
      // A block arrives whole; once it settles (0.3s) the reel's first word
      // types on, holds, then the reel rolls.
      slotAt = at + 0.3 + (line.slotTypeDelay ?? 0);
      const first = typeFirst(slotAt);
      slotLands.push(first);
      let land = first + (line.slotHold ?? SLOT_DELAY) + SLOT_ROLL;
      for (let i = 1; i < line.slot.length; i++) {
        slotLands.push(land);
        land += (line.slotDwell ?? SLOT_DWELL) + SLOT_ROLL;
      }
      if (line.slotTypeLast) {
        // The last word types on where the reel stood, a dwell after the one before.
        let c = slotLands[slotLands.length - 2] + SLOT_DWELL;
        const last = line.slot[line.slot.length - 1];
        slotLastChars = [...last].map((ch, i) => {
          const at2 = c;
          c += CHAR + jitter(i, index + 57) * 0.016 + (',.?!'.includes(ch) ? 0.06 : 0);
          return at2;
        });
        slotLands[slotLands.length - 1] = c;
      }
      done = slotLands[slotLands.length - 1];
      t = done + 0.95;
    } else {
      done = at + 0.3;
      t = done + 0.4 + line.text.length * 0.025;
    }
    if (line.after !== undefined) t = done + line.after;
    out.push({ ...line, index, at, chars, slotAt, slotChars, slotLastChars, slotLands, done, flick });
    prev = line.who;
  });
  return out;
}

const indexed = SCRIPT.map((line, i) => [line, i] as [Line, number]);
/** Every script bubble, in SCRIPT order (= TIMED[i].index). The afterSend
    lines are timed once the first reply's send is known, below. */
export const TIMED: Timed[] = timeLines(indexed.filter(([l]) => !l.afterSend && !l.atKeys), 0.8);

const LAST = TIMED[TIMED.length - 1];

/** The pan down to the field and keyboard, then two replies typed there. */
export const PAN = [LAST.done + (LAST.after ?? 0.55), LAST.done + (LAST.after ?? 0.55) + 1.2] as const;

/** When each character of a field message lands, from `start`. `raw` is the
    message with a '|' wherever the typing pauses for half a second. */
function typeTimes(raw: string, start: number, seed: number) {
  const out: number[] = [];
  let c = start;
  let i = 0;
  for (const ch of raw) {
    if (ch === '|') {
      c += 0.5;
      continue;
    }
    out.push(c);
    let dt = 0.058 + jitter(i, seed) * 0.024;
    if (ch === ' ') dt += 0.02;
    if (',.'.includes(ch)) dt += 0.08;
    c += dt;
    i++;
  }
  return out;
}

/** A message typed in the field: reworded, then sent or kept. */
export type FieldMsg = {
  en: string;
  ja: string;
  times: number[];
  rewordTap: number;
  rewordDone: number;
  /** Infinity: it isn't sent. */
  sendTap: number;
  sendAt: number;
  /** When the field empties: on send, or cleared for the next line. */
  clearAt: number;
};

/**
 * The camera after the pan, as a list of framings: `scale`, and where the
 * keyboard's bottom edge sits on screen (the world hangs from it).
 *   KEYS        the field and the full keyboard (or the Study view, same zoom)
 *   FIELD       close on the field over the keys
 *   FIELD_STUDY close on the field over the open Study view
 */
export type View = { scale: number; kb: number };
// Portrait frames the same world taller and narrower, all of it inside the
// platforms' safe area (STAGE): the keyboard ends above the caption zone.
const KEYS: View = PORTRAIT ? { scale: 2.05, kb: 1430 } : { scale: 1.6, kb: 335 + (14 + 383) * 1.6 };
// The field's middle sits 365pt above the keyboard's bottom edge over the
// keys, and 551pt over the (taller) Study view.
const FIELD: View = PORTRAIT ? { scale: 2.2, kb: STAGE.cy + 365 * 2.2 } : { scale: 2.9, kb: 540 + 365 * 2.9 };
const FIELD_STUDY: View = PORTRAIT ? { scale: 2.2, kb: STAGE.cy + 551 * 2.2 } : { scale: 2.9, kb: 540 + 551 * 2.9 };
const ZOOM = 0.75;

/** Camera moves after the pan: [start, end, to]. */
export const CAMERA: [number, number, View][] = [];
const move = (at: number, to: View) => {
  CAMERA.push([at, at + ZOOM, to]);
  return at + ZOOM;
};
export const KEYS_VIEW = KEYS;

export const FIELD_MSGS: FieldMsg[] = [];
// Down at the keyboard, the friend's next bubble arrives above the field first.
const keysLines = timeLines(indexed.filter(([l]) => l.atKeys), PAN[1] + 0.3);
TIMED.push(...keysLines);
const KEYS_LAST = keysLines[keysLines.length - 1];
let c = KEYS_LAST ? KEYS_LAST.done + (KEYS_LAST.after ?? 0.8) : PAN[1] + 0.5;
// 1. Close on the field while it's typed; back out to the keys to Reword it, and send.
c = move(c, FIELD);
{
  const times = typeTimes(FIELD_RAW, c + 0.2, 99);
  c = move(times[times.length - 1] + 1.0, KEYS);
  const rewordTap = c + 0.35;
  const rewordDone = rewordTap + 1.0;
  const sendTap = rewordDone + 1.3;
  FIELD_MSGS.push({ en: FIELD_TEXT, ja: FIELD_JA, times, rewordTap, rewordDone, sendTap, sendAt: sendTap + 0.17, clearAt: sendTap + 0.17 });
  c = sendTap + 0.17;
}

/** Once the reply has risen into the chat, the camera goes back up to the
    conversation for the afterSend bubbles, then pans down to the keyboard again. */
export const BACK = [c + 0.6, c + 0.6 + 1.2] as const;
TIMED.push(...timeLines(indexed.filter(([l]) => l.afterSend), BACK[1] + 0.2));
const LAST2 = TIMED[TIMED.length - 1];
const tail = (() => {
  const PAN2 = [LAST2.done + (LAST2.after ?? 0.55), LAST2.done + (LAST2.after ?? 0.55) + 1.2] as const;
  let c = PAN2[1] + 0.3;
  // 2. Close on the field again; this one stays in English. Back out, and open Study.
  c = move(c, FIELD);
  {
    const times = typeTimes(FIELD2_RAW, c + 0.2, 7);
    c = move(times[times.length - 1] + 1.0, KEYS);
    FIELD_MSGS.push({ en: FIELD2_TEXT, ja: '', times, rewordTap: Infinity, rewordDone: Infinity, sendTap: Infinity, sendAt: Infinity, clearAt: Infinity });
  }
  return { PAN2, STUDY_TAP: c + 0.4 };
})();
export const PAN2 = tail.PAN2;

/** The Study tap, the view opening (its height easing from the keys' to its
    own), and its loading stages. The camera holds its zoom throughout. */
export const STUDY_TAP = tail.STUDY_TAP;
export const STUDY_OPEN = STUDY_TAP + 0.18;
export const STUDY_GROW = 0.4;
export const STUDY_SKELETON = STUDY_OPEN + 0.35;
export const STUDY_ROWS = STUDY_OPEN + 1.0;
/** A finger-flick down the entries once they've loaded. */
export const STUDY_FLICK = STUDY_ROWS + 0.7 + 1.5;
/** Once it settles, the sent reply fades so the field is the only focus. */
export const HIDE_SENT = STUDY_FLICK + 1.3;

{
  // The English question isn't sent: once the entries have been seen, the
  // field is cleared for the last line.
  FIELD_MSGS[1].clearAt = STUDY_FLICK + 2.0;
  // 3. Close on the field over Study for the last line, which stays unsent.
  c = move(FIELD_MSGS[1].clearAt + 0.1, FIELD_STUDY);
  const times = typeTimes(FIELD3_RAW, c + 0.2, 23);
  FIELD_MSGS.push({ en: FIELD3_TEXT, ja: '', times, rewordTap: Infinity, rewordDone: Infinity, sendTap: Infinity, sendAt: Infinity, clearAt: Infinity });
  c = times[times.length - 1];
}

export const SEND_AT = FIELD_MSGS[0].sendAt;
/** The end card: a second after the last line is typed, the scene fades out
    over END_FADE, then the card. */
export const END_FADE = 0.9;
export const ENDING = c + 1.0 + END_FADE;

/** When the closing reel's flick begins (Mandarin's hold over), from the card's start. */
const TAGLINE_HOLD = 0.5;
export const TAGLINE_FLICK_START = 2.4 + 2 * (TAGLINE_HOLD + 0.3) + TAGLINE_HOLD;
export const TAGLINE_LANDS: number[] = (() => {
  // English, Spanish and Mandarin each hold for TAGLINE_HOLD; then a flick spins
  // through the rest, fast off the mark and slowing to settle on "a language".
  const out = [2.4];
  for (let i = 1; i < 3; i++) out.push(out[i - 1] + TAGLINE_HOLD + 0.3);
  const rest = TAGLINE_WORDS.length - 3;
  const FLICK = 2.2;
  const flickStart = TAGLINE_FLICK_START;
  for (let j = 1; j <= rest; j++) out.push(flickStart + FLICK * (1 - Math.cbrt(1 - j / rest)));
  return out;
})();
// The end card runs the app's splash (3s), the reel, then holds.
export const DURATION = Math.ceil((ENDING + TAGLINE_LANDS[TAGLINE_LANDS.length - 1] + 1.8) * 2) / 2;

/** The Study Guide's entries: words from the Japanese reply first, then older ones. */
export const STUDY_ROWS_DATA = [
  // Everyday Japanese a learner would have missed in their own chats, across
  // the app's parts of speech (StudyPartOfSpeech in the Arcatext repo).
  { entry: 'ありがとう', translations: 'thank you', sentence: 'ありがとう、助かったよ！', tag: 'Interjection', misses: 2 },
  { entry: '食べる', translations: 'to eat', sentence: '今夜は何を食べる？', tag: 'Verb', misses: 3 },
  { entry: '美味しい', translations: 'delicious', sentence: 'このラーメン、すごく美味しい！', tag: 'Adjective', misses: 2 },
  { entry: 'よろしくお願いします', translations: 'nice to meet you', sentence: 'はじめまして、よろしくお願いします。', tag: 'Phrase', misses: 2 },
  { entry: '天気', translations: 'weather', sentence: '今日はいい天気だね。', tag: 'Noun', misses: 1 },
  { entry: 'ゆっくり', translations: 'slowly', sentence: 'もう少しゆっくり話してください。', tag: 'Adverb', misses: 1 },
  { entry: '駅', translations: 'station', sentence: '駅で待ってるね。', tag: 'Noun', misses: 2 },
  { entry: '行く', translations: 'to go', sentence: '明日、一緒に行く？', tag: 'Verb', misses: 1 },
  { entry: 'お疲れさま', translations: 'good work, thanks for your effort', sentence: '今日もお疲れさま！', tag: 'Phrase', misses: 3 },
  { entry: '楽しい', translations: 'fun', sentence: '昨日のパーティー、楽しかったね！', tag: 'Adjective', misses: 1 },
  { entry: 'いつも', translations: 'always', sentence: 'いつもありがとう。', tag: 'Adverb', misses: 1 },
  { entry: '約束', translations: 'promise, plans', sentence: '週末の約束、覚えてる？', tag: 'Noun', misses: 2 },
  { entry: '分かる', translations: 'to understand', sentence: 'その気持ち、よく分かるよ。', tag: 'Verb', misses: 2 },
  { entry: 'もちろん', translations: 'of course', sentence: 'もちろん、いいよ！', tag: 'Adverb', misses: 1 },
]

/** Scene boundaries for the review tool: each runs until the next starts.
    Ids stay stable across versions so timing notes carry over. */
export function scenes() {
  const short = (m: Timed) => m.text.replace(/\n/g, ' ') + (m.slot ? ` [${m.slot.join(' / ')}]` : '');
  const firstAfterSend = TIMED.find((m) => m.afterSend);
  const list = [
    ...TIMED.map((m, i) => ({
      id: `b${i + 1}`,
      name: `${i + 1}. ${short(m)}`,
      // The first bubble back in the chat owns the pan up to it.
      start: i === 0 ? 0 : m === firstAfterSend ? BACK[0] : m.at,
    })),
    { id: 'keyboard', name: 'Pan to keyboard', start: PAN[0] },
    { id: 'field1', name: 'Type: So... I just type a message…', start: CAMERA[0][0] },
    { id: 'reword', name: 'Reword to Japanese + send', start: CAMERA[1][0] },
    { id: 'field2', name: `Back to keyboard, type: ${FIELD2_TEXT.slice(0, 22)}…`, start: PAN2[0] },
    { id: 'study', name: 'Study Guide + flick', start: CAMERA[3][0] },
    { id: 'field3', name: 'Type: Ok this is cool…', start: CAMERA[4][0] },
    { id: 'end', name: 'End card', start: ENDING - END_FADE },
  ].sort((a, b) => a.start - b.start);
  return list.map((s, i) => ({ ...s, end: i + 1 < list.length ? list[i + 1].start : DURATION }));
}

export function cues() {
  return {
    scenes: scenes(),
    duration: DURATION,
    bpm: BPM,
    keys: [
      ...FIELD_MSGS.flatMap((m) => m.times.map((t, i) => ({ t, space: m.en[i] === ' ' }))),
      ...SPLASH_LETTERS.map((t) => ({ t: ENDING + t, space: true })),
    ],
    taps: [...FIELD_MSGS.flatMap((m) => [m.rewordTap, m.sendTap].filter(Number.isFinite)), STUDY_TAP],
    // A shimmer as each reword lands.
    reword: FIELD_MSGS[0].rewordDone,
    reveal: null,
    send: SEND_AT,
    sends: FIELD_MSGS.map((m) => m.sendAt).filter(Number.isFinite),
    swipes: [],
    // A tick each time a reel lands, and a pop as each bubble arrives.
    words: TIMED.flatMap((m) => m.slotLands),
    // The end card's reel, as quiet ticks.
    ticks: TAGLINE_LANDS.map((x) => ENDING + x),
    pops: TIMED.map((m) => ({ t: m.at, who: m.who })),
    titles: [],
    phones: [PAN[0], BACK[0], PAN2[0]],
    opening: [0, 0],
    closing: ENDING,
    studyFlick: STUDY_FLICK,
  };
}
