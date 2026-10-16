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
  /** The camera reads this bubble: zoomed in, it pans along the text and comes
      to rest on the reel, holding there until the next bubble (or the pan to
      the keyboard). A run of `read` bubbles stays zoomed in from one to the next. */
  read?: boolean;
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
    sequences, the same ending. Bubble 1 types out plainly, with no reel. */
const SHORT_SCRIPT: Line[] = [
  {
    who: 'them',
    // Arrives already written; only the reel's first word types on.
    kind: 'block',
    // Broken before "based on your" so the reel sits on the second line and
    // even "actual conversations." fits after it.
    text: 'Want to learn practical language skills\nbased on your',
    maxW: 340,
    slot: ['life?', 'interests?', 'actual conversations?'],
    slotInline: true,
    // The camera reads the text first; the reel starts as it arrives.
    read: true,
    slotTypeDelay: 2.0,
    after: 1.0,
  },
  {
    who: 'them',
    kind: 'block',
    text: 'Use Arcatext to chat with',
    // Wide enough for the longest word on the same line, so the bubble's
    // height never changes as the reel rolls.
    maxW: 340,
    slot: ['friends.', 'penpals.', 'classmates.', 'AI.'],
    slotInline: true,
    read: true,
    // Bubble 1 fades as this one arrives.
    clearAbove: true,
    slotTypeDelay: 1.0,
    after: 1.0,
  },
  // ── Back up in the chat once the reply is sent, then down again ──
  {
    who: 'them',
    kind: 'block',
    text: 'Arcatext is a keyboard for',
    maxW: 340,
    slot: ['translation.', 'correction.', 'analysis.', 'study.'],
    slotTypeDelay: 1.0,
    clearAbove: true,
    after: 1.0,
    afterSend: true,
  },
  { who: 'them', kind: 'block', text: 'Use it in any messaging app!', after: 1.0, afterSend: true },
]

export const SCRIPT: Line[] = SHORT ? SHORT_SCRIPT : FULL_SCRIPT;

/** A field message's pauses: '|' holds for D.typePause (0.5s), '{0.25}' for exactly that long. */
const stripPauses = (raw: string) => raw.replace(/\||\{[\d.]+\}/g, '');
const FIELD_RAW = SHORT ? 'So...|I type a message| and tap Reword?' : 'So...| I just type a message| then tap a button to translate?';
export const FIELD_TEXT = stripPauses(FIELD_RAW);
// The short cut names the button as the Japanese app labels it (button.reword).
export const FIELD_JA = SHORT ? 'じゃあ…メッセージを入力して「変換」を押すの？' : 'じゃあ…メッセージを入力して、ボタンを押すだけで翻訳できるの？';
const FIELD2_RAW = SHORT ? 'And{0.25} it adds words I miss{0.25} to a study guide!' : 'One more thing...it actually adds the words I missed| to a study guide?';
export const FIELD2_TEXT = stripPauses(FIELD2_RAW);
const FIELD3_RAW = 'Ok this is cool.| I kind of want to practice now.';
export const FIELD3_TEXT = stripPauses(FIELD3_RAW);

export const FPS = 60;
export const BPM = 120;

const CHAR = 0.042; // in-place typing: ~24 characters a second
const SLOT_DELAY = 1.0; // a block's reel waits this long after it lands
const SLOT_DWELL = 0.72; // each word holds this long before the next roll
const SLOT_ROLL = 0.32;

/** The film's fixed delays, in seconds, named so the Cut Room can show and
    retime each one (scenes() lists them per scene). */
const D = {
  pan: 1.2, // each pan between the chat and the keyboard
  keysHold: 0.5, // at the keyboard, before closing in on the field
  pan2Hold: 0.3, // the same, after the second pan
  zoom: 0.75, // each camera push in or out
  typePause: 0.5, // each pause mid-typing in the field
  afterType: 1.0, // a typed message holds before the camera backs out
  rewordTap: 0.35, // backed out, then Reword is tapped
  readJa: 1.3, // the Japanese reads before Send
  backAfterSend: 0.6, // the sent reply rises before the camera goes back up
  studyTap: 0.4, // backed out, then Study is tapped
  studyLoad: SHORT ? 0 : 1.0, // Study opens, then its entries appear (the short has no loading state)
  studyFlick: 2.2, // the entries are read, then flicked
  studyClear: 2.0, // after the flick, the field clears for the last line
  endHold: 1.0, // the last line holds before the fade to the end card
  tagFirst: 2.4, // the end card's first tagline word lands
  tagHold: 0.5, // each of the tagline's first three words holds
  tagSpin: SHORT ? 1.0 : 2.2, // the tagline's spin to "a language"
  tagRest: SHORT ? 1.5 : 1.8, // the finished card holds
};

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
export const PAN = [LAST.done + (LAST.after ?? 0.55), LAST.done + (LAST.after ?? 0.55) + D.pan] as const;

/** When each character of a field message lands, from `start`. `raw` is the
    message with a pause marker wherever the typing waits (see PAUSE_RE). */
function typeTimes(raw: string, start: number, seed: number) {
  const out: number[] = [];
  let c = start;
  let i = 0;
  for (const tok of raw.split(/(\||\{[\d.]+\})/)) {
    if (tok === '|') {
      c += D.typePause;
      continue;
    }
    const m = /^\{([\d.]+)\}$/.exec(tok);
    if (m) {
      c += Number(m[1]);
      continue;
    }
    for (const ch of tok) {
      out.push(c);
      let dt = 0.058 + jitter(i, seed) * 0.024;
      if (ch === ' ') dt += 0.02;
      if (',.'.includes(ch)) dt += 0.08;
      c += dt;
      i++;
    }
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
// The short cut is already this close over Study, so its last line pushes in further.
const FIELD_CLOSE: View = PORTRAIT ? { scale: 2.85, kb: STAGE.cy + 551 * 2.85 } : { scale: 3.4, kb: 540 + 551 * 3.4 };
const ZOOM = D.zoom;
/** The framing each pan down lands on. The short cut lands straight on the
    close-up and stays there to type, Reword and send. */
export const START_VIEW: View = SHORT ? FIELD : KEYS;
/** Scene starts the Cut Room lists, set as the timeline is built. */
const AT = { field1: 0, reword: 0, study: 0, field3: 0 };

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
let c = KEYS_LAST ? KEYS_LAST.done + (KEYS_LAST.after ?? 0.8) : PAN[1] + D.keysHold;
// 1. Close on the field while it's typed; back out to the keys to Reword it, and send.
// (The short cut is already close on the field, and stays there.)
AT.field1 = SHORT ? PAN[1] : c;
if (!SHORT) c = move(c, FIELD);
{
  const times = typeTimes(FIELD_RAW, c + 0.2, 99);
  AT.reword = times[times.length - 1] + D.afterType;
  c = SHORT ? AT.reword : move(AT.reword, KEYS);
  const rewordTap = c + D.rewordTap;
  // No loading state: the tap press, then the swap.
  const rewordDone = rewordTap + 0.22;
  const sendTap = rewordDone + D.readJa;
  FIELD_MSGS.push({ en: FIELD_TEXT, ja: FIELD_JA, times, rewordTap, rewordDone, sendTap, sendAt: sendTap + 0.17, clearAt: sendTap + 0.17 });
  c = sendTap + 0.17;
}

/** Once the reply has risen into the chat, the camera goes back up to the
    conversation for the afterSend bubbles, then pans down to the keyboard again. */
/** In the short cut the sent reply holds this long over the keyboard, then
    leaves with it as the camera goes back up. */
export const SENT_HOLD = SHORT ? 1.5 : D.backAfterSend;
export const BACK = [c + SENT_HOLD, c + SENT_HOLD + D.pan] as const;
TIMED.push(...timeLines(indexed.filter(([l]) => l.afterSend), BACK[1] + 0.2));
const LAST2 = TIMED[TIMED.length - 1];
const tail = (() => {
  const PAN2 = [LAST2.done + (LAST2.after ?? 0.55), LAST2.done + (LAST2.after ?? 0.55) + D.pan] as const;
  let c = PAN2[1] + D.pan2Hold;
  // 2. Close on the field again; this one stays in English. Back out, and open Study.
  if (!SHORT) c = move(c, FIELD);
  {
    const times = typeTimes(FIELD2_RAW, c + 0.2, 7);
    AT.study = times[times.length - 1] + D.afterType;
    // (The short cut holds its zoom as Study opens under the field.)
    c = SHORT ? AT.study : move(AT.study, KEYS);
    FIELD_MSGS.push({ en: FIELD2_TEXT, ja: '', times, rewordTap: Infinity, rewordDone: Infinity, sendTap: Infinity, sendAt: Infinity, clearAt: Infinity });
  }
  return { PAN2, STUDY_TAP: c + D.studyTap };
})();
export const PAN2 = tail.PAN2;

/** The Study tap, the view opening (its height easing from the keys' to its
    own), and its loading stages. The camera holds its zoom throughout. */
export const STUDY_TAP = tail.STUDY_TAP;
export const STUDY_OPEN = STUDY_TAP + 0.18;
export const STUDY_GROW = 0.4;
export const STUDY_SKELETON = STUDY_OPEN + 0.35;
export const STUDY_ROWS = STUDY_OPEN + D.studyLoad;
/** A finger-flick down the entries once they've loaded. */
export const STUDY_FLICK = STUDY_ROWS + D.studyFlick;
/** Once it settles, the sent reply fades so the field is the only focus. */
export const HIDE_SENT = STUDY_FLICK + 1.3;

{
  // The English question isn't sent: once the entries have been seen, the
  // field is cleared for the last line.
  FIELD_MSGS[1].clearAt = STUDY_FLICK + D.studyClear;
  // 3. Close on the field over Study for the last line, which stays unsent.
  AT.field3 = FIELD_MSGS[1].clearAt + 0.1;
  c = move(AT.field3, SHORT ? FIELD_CLOSE : FIELD_STUDY);
  const times = typeTimes(FIELD3_RAW, c + 0.2, 23);
  FIELD_MSGS.push({ en: FIELD3_TEXT, ja: '', times, rewordTap: Infinity, rewordDone: Infinity, sendTap: Infinity, sendAt: Infinity, clearAt: Infinity });
  c = times[times.length - 1];
}

export const SEND_AT = FIELD_MSGS[0].sendAt;
/** The end card: a second after the last line is typed, the scene fades out
    over END_FADE, then the card. */
export const END_FADE = 0.9;
export const ENDING = c + D.endHold + END_FADE;

/** When the closing reel's flick begins (Mandarin's hold over), from the card's start. */
const TAGLINE_HOLD = D.tagHold;
export const TAGLINE_FLICK_START = D.tagFirst + 2 * (TAGLINE_HOLD + 0.3) + TAGLINE_HOLD;
export const TAGLINE_LANDS: number[] = (() => {
  // English, Spanish and Mandarin each hold for TAGLINE_HOLD; then a flick spins
  // through the rest, fast off the mark and slowing to settle on "a language".
  const out = [D.tagFirst];
  for (let i = 1; i < 3; i++) out.push(out[i - 1] + TAGLINE_HOLD + 0.3);
  const rest = TAGLINE_WORDS.length - 3;
  const FLICK = D.tagSpin;
  const flickStart = TAGLINE_FLICK_START;
  for (let j = 1; j <= rest; j++) out.push(flickStart + FLICK * (1 - Math.cbrt(1 - j / rest)));
  return out;
})();
// The end card runs the app's splash (3s), the reel, then holds.
export const DURATION = Math.ceil((ENDING + TAGLINE_LANDS[TAGLINE_LANDS.length - 1] + D.tagRest) * 2) / 2;

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
  // A long reel (the language list) reads as its first few words and its last.
  const reel = (w: string[]) => (w.length > 8 ? [...w.slice(0, 3), '…', w[w.length - 1]] : w).join(' / ');
  const short = (m: Timed) => m.text.replace(/\n/g, ' ') + (m.slot ? ` [${reel(m.slot)}]` : '');
  // The words on screen in each scene, so the Cut Room can offer them for direct edits.
  const typed = (label: string, text: string) => [{ key: label.toLowerCase().replace(/\W+/g, '-'), label, text }];
  // Every timing that shapes each scene, as {key, label, value} in seconds.
  // `at` is where it starts in the film, so the Cut Room's preview can play a
  // proposed value: the stretch [at, at + value] is sped up, slowed or skipped.
  const r2 = (x: number) => Math.round(x * 100) / 100;
  const r3 = (x: number) => Math.round(x * 1000) / 1000;
  const dl = (key: string, label: string, value: number, at?: number) => ({ key, label, value: r2(value), ...(at != null && Number.isFinite(at) ? { at: r3(at) } : {}) });
  const events = [...TIMED.map((m) => m.at), PAN[0], BACK[0], PAN2[0], ...CAMERA.map((x) => x[0]), ENDING - END_FADE];
  const bubbleDelays = (m: Timed) => {
    const next = Math.min(...events.filter((x) => x > m.done + 1e-6), DURATION);
    return [dl('hold', 'Hold before what comes next', next - m.done, m.done)];
  };
  // Typing and reel sequences as text with each timing in place, for the Cut
  // Room's inline controls: {text} runs (`typed` when they type out letter by
  // letter, with `wordTimes` — when each word but the last finishes — so a
  // delay can go between any two words), {word} reel words, and timings
  // {key, kind, name, label, value, at}: a `delay` is a wait, a `hold` how long
  // a word stays up, a `duration` how long a motion (a scroll, a spin) takes.
  type Kind = 'delay' | 'hold' | 'duration';
  type Part =
    | { text: string; typed?: boolean; wordTimes?: number[] }
    | { word: string }
    | { key: string; kind: Kind; name: string; label: string; value: number; at?: number };
  const lastWord = (x: string) => x.trim().split(/\s+/).pop() ?? '';
  const inline = (key: string, label: string, value: number, at: number, kind: Kind = 'delay', name = 'Delay'): Part =>
    ({ key, kind, name, label, value: r2(value), at: r3(at) });
  /** Typed text whose characters land at times[offset...]. */
  const typedText = (text: string, offset: number, times: number[]): Part => {
    const wordTimes: number[] = [];
    const re = /\S+/g;
    let mm: RegExpExecArray | null;
    const ends: number[] = [];
    while ((mm = re.exec(text))) ends.push(mm.index + mm[0].length - 1);
    for (const e of ends.slice(0, -1)) wordTimes.push(r3((times[offset + e] ?? 0) + 0.03));
    return { text, typed: true, wordTimes };
  };
  /** A reel: its words with the hold on each and the scroll between them, or
      held words then a spin. `lands[i]` is when word i is up. */
  const reelParts = (
    words: string[], startAt: number, start: number, startLabel: string, lands: number[],
    holds: (i: number) => [string, number] | null, spin?: { held: number; secs: number; from: number }, roll = SLOT_ROLL,
  ): Part[] => {
    const out: Part[] = [inline('reel-start', startLabel, start, startAt)];
    const shown = spin ? spin.held : words.length;
    for (let i = 0; i < shown; i++) {
      out.push({ word: words[i] });
      const h = holds(i);
      if (h) out.push(inline(h[0], `on “${words[i]}”`, h[1], lands[i], 'hold', 'Hold'));
      const scrollAt = lands[i] + (h ? h[1] : 0);
      if (i < shown - 1) out.push(inline(`${h ? h[0].replace(/-(first|each|hold).*$/, '') : 'reel'}-roll-${i}`, `from “${words[i]}” to “${words[i + 1]}”`, roll, scrollAt, 'duration', 'Scroll'));
      else if (!spin && i < words.length - 1) out.push(inline(`reel-roll-${i}`, `from “${words[i]}” to “${words[i + 1]}”`, roll, scrollAt, 'duration', 'Scroll'));
    }
    if (spin) {
      out.push(inline('reel-spin', `to “${words[words.length - 1]}”`, spin.secs, spin.from, 'duration', 'Spin'));
      if (words.length > spin.held + 1) out.push({ text: '…' });
      out.push({ word: words[words.length - 1] });
    }
    return out;
  };
  const bubbleFlow = (m: Timed): Part[] => {
    const out: Part[] = [];
    const isTyped = m.kind === 'type';
    const text = m.text.replace(/\n/g, ' ');
    const run = (from: number, to: number): Part => (isTyped ? typedText(text.slice(from, to), from, m.chars) : { text: text.slice(from, to) });
    let pos = 0;
    for (const p of m.pauses ?? []) {
      const at = text.indexOf(p.after, pos);
      if (at < 0) continue;
      const end = at + p.after.length;
      out.push(run(pos, end), inline(`pause-${p.after}`, `after “${p.after}”`, p.secs, (m.chars[end] ?? m.done) - p.secs));
      pos = end;
    }
    out.push(run(pos, text.length));
    if (!m.slot) return isTyped ? out : [];
    const w = m.slot;
    const fl = m.slotFlick;
    const start = (m.kind === 'type' ? 0.15 : 0.3) + (m.slotTypeDelay ?? 0);
    const L = m.slotLands;
    if (fl) return [...out, ...reelParts(w, m.slotAt - start, start, 'before the reel', L, (i) => [`reel-hold-${i}`, fl.hold], { held: fl.holds, secs: fl.flick, from: m.flick!.from })];
    return [
      ...out,
      ...reelParts(w, m.slotAt - start, start, 'before the reel', L, (i) =>
        i === w.length - 1 ? null : i === 0 ? ['reel-first', m.slotHold ?? SLOT_DELAY] : [`reel-each-${i}`, m.slotDwell ?? SLOT_DWELL]),
    ];
  };
  const fieldFlow = (raw: string, times: number[]): Part[] => {
    // Alternating text and pause markers ('|' or '{secs}').
    const toks = raw.split(/(\||\{[\d.]+\})/);
    const out: Part[] = [];
    let offset = 0;
    let n = 0;
    for (let i = 0; i < toks.length; i += 2) {
      const seg = toks[i];
      out.push(typedText(seg, offset, times));
      offset += seg.length;
      const mark = toks[i + 1];
      if (mark == null) break;
      const secs = mark === '|' ? D.typePause : Number(mark.slice(1, -1));
      out.push(inline(`type-pause-${n++}`, `after “${lastWord(seg)}”`, secs, (times[offset] ?? 0) - secs));
    }
    return out;
  };
  const flow = (parts: Part[]) => (parts.length ? [parts] : []);
  const tagFlow: Part[] = [
    { text: 'Text and learn' },
    ...reelParts(TAGLINE_WORDS, ENDING, D.tagFirst, 'before the first word', TAGLINE_LANDS.map((x) => ENDING + x),
      (i) => [`tag-hold-${i}`, D.tagHold], { held: 3, secs: D.tagSpin, from: ENDING + TAGLINE_FLICK_START }, 0.3),
  ];
  const [F1, F2, F3] = FIELD_MSGS;
  const typedEnd = (f: FieldMsg) => f.times[f.times.length - 1];
  const firstAfterSend = TIMED.find((m) => m.afterSend);
  const list = [
    ...TIMED.map((m, i) => ({
      id: `b${i + 1}`,
      name: `${i + 1}. ${short(m)}`,
      texts: [{ key: `b${i + 1}`, label: m.who === 'me' ? 'Right bubble' : 'Left bubble', text: m.text + (m.slot ? ` [${reel(m.slot)}]` : '') }],
      flows: flow(bubbleFlow(m)),
      delays: [...(m === firstAfterSend ? [dl('pan', 'Pan back up to the chat', D.pan, BACK[0])] : []), ...bubbleDelays(m)],
      // The first bubble back in the chat owns the pan up to it.
      start: i === 0 ? 0 : m === firstAfterSend ? BACK[0] : m.at,
    })),
    { id: 'keyboard', name: 'Pan to keyboard', texts: [], start: PAN[0],
      delays: [dl('pan', 'Pan down to the keyboard', D.pan, PAN[0]), ...(SHORT ? [] : [dl('keys-hold', 'Hold before closing in on the field', D.keysHold, PAN[1])])] },
    { id: 'field1', name: `Type: ${FIELD_TEXT.slice(0, 24)}…`, texts: typed('Typed message', FIELD_TEXT), start: AT.field1, flows: flow(fieldFlow(FIELD_RAW, F1.times)),
      delays: [SHORT ? dl('keys-hold', 'Hold before typing', D.keysHold + 0.2, PAN[1]) : dl('zoom-in', 'Push in on the field', D.zoom), dl('after-type', 'Hold after typing', D.afterType, typedEnd(F1))] },
    { id: 'reword', name: 'Reword to Japanese + send', texts: typed('Reworded (Japanese)', FIELD_JA), start: AT.reword,
      delays: [...(SHORT ? [] : [dl('zoom-out', 'Back out to the keys', D.zoom)]), dl('reword-tap', 'Then tap Reword after', D.rewordTap, F1.rewordTap - D.rewordTap), dl('read-ja', 'Japanese reads before Send', D.readJa, F1.rewordDone), dl('after-send', SHORT ? 'Sent reply holds before the camera goes up' : 'Reply rises before the camera goes up', SENT_HOLD, BACK[0] - SENT_HOLD)] },
    { id: 'field2', name: `Back to keyboard, type: ${FIELD2_TEXT.slice(0, 22)}…`, texts: typed('Typed message', FIELD2_TEXT), start: PAN2[0], flows: flow(fieldFlow(FIELD2_RAW, F2.times)),
      delays: [dl('pan', 'Pan down to the keyboard', D.pan, PAN2[0]), dl('keys-hold', SHORT ? 'Hold before typing' : 'Hold before closing in on the field', SHORT ? D.pan2Hold + 0.2 : D.pan2Hold, PAN2[1]), ...(SHORT ? [] : [dl('zoom-in', 'Push in on the field', D.zoom)]), dl('after-type', 'Hold after typing', D.afterType, typedEnd(F2))] },
    { id: 'study', name: 'Study Guide + flick', texts: [], start: AT.study,
      delays: [...(SHORT ? [] : [dl('zoom-out', 'Back out to the keys', D.zoom)]), dl('study-tap', 'Then tap Study after', D.studyTap, STUDY_TAP - D.studyTap), ...(SHORT ? [] : [dl('study-load', 'Entries appear after', D.studyLoad, STUDY_OPEN)]), dl('study-flick', 'Entries read before the flick', D.studyFlick, STUDY_ROWS), dl('study-clear', 'Field clears after the flick', D.studyClear, STUDY_FLICK)] },
    { id: 'field3', name: 'Type: Ok this is cool…', texts: typed('Typed message', FIELD3_TEXT), start: AT.field3, flows: flow(fieldFlow(FIELD3_RAW, F3.times)),
      delays: [dl('zoom-in', 'Push in on the field', D.zoom), dl('end-hold', 'Hold before the fade', D.endHold, typedEnd(F3)), dl('fade', 'Fade to the end card', END_FADE, ENDING - END_FADE)] },
    { id: 'end', name: 'End card', texts: typed('Tagline', `Text and learn [${reel(TAGLINE_WORDS)}]`), start: ENDING - END_FADE, flows: [tagFlow],
      delays: [dl('tag-rest', 'Final hold', D.tagRest, ENDING + TAGLINE_LANDS[TAGLINE_LANDS.length - 1])] },
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
