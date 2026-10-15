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
  /** Seconds from this bubble being complete (its reel landed) to the next
      thing happening; otherwise a reading pause scaled to its length. */
  after?: number;
};

export const SCRIPT: Line[] = [
  { who: 'them', kind: 'type', text: 'Want a new way to learn a language?', noWrap: true },
  { who: 'me', kind: 'block', text: 'Of course, but how?', after: 1.0 },
  { who: 'me', kind: 'block', text: 'Will I stop using it after 5 minutes?' },
  { who: 'them', kind: 'block', text: "I think you'll like this.", after: 1.0 },
  {
    who: 'them',
    kind: 'block',
    // Broken after the comma, and a little wider than other bubbles, so even
    // "actual conversations." fits after "your".
    text: 'You learn the practical language,\nbased on your',
    maxW: 340,
    slot: ['life.', 'interests.', 'actual conversations.'],
    slotInline: true,
  },
  { who: 'me', kind: 'block', text: "Ok, I'm listening..." },
  {
    who: 'them',
    kind: 'block',
    text: 'Learn while you text',
    slot: ['friends!', 'penpals!', 'classmates!', 'AI!'],
    slotInline: true,
    clearAbove: true,
  },
  { who: 'me', kind: 'block', text: 'Where?' },
  {
    who: 'them',
    kind: 'block',
    text: 'Right where your chats already happen!',
    slot: ['WhatsApp', 'HelloTalk', 'Instagram', 'any app!'],
    slotInline: true,
    after: 1.0,
  },
  {
    who: 'them',
    kind: 'block',
    text: "It's a keyboard and features for",
    slot: ['translation.', 'correction.', 'analysis.', 'study.'],
    slotInline: true,
    clearAbove: true,
    after: 1.0,
  },
]

// A '|' marks a half-second pause in the typing; it isn't typed.
const FIELD_RAW = 'So,| I just type,| tap a button,| and it translates?';
export const FIELD_TEXT = FIELD_RAW.replaceAll('|', '');
export const FIELD_JA = 'じゃあ、入力してボタンを押すだけで翻訳してくれるの？';
const FIELD2_RAW = 'And it adds the words I missed,| to a study guide?';
export const FIELD2_TEXT = FIELD2_RAW.replaceAll('|', '');
const FIELD3_RAW = 'Ok this is cool.| I kind of want to practice now.';
export const FIELD3_TEXT = FIELD3_RAW.replaceAll('|', '');

export const FPS = 60;
export const BPM = 120;

const CHAR = 0.042; // in-place typing: ~24 characters a second
const SLOT_SPIN = 0.2; // the first word fading in on its line
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
  /** When the slot line appears, and when each slot word lands. */
  slotAt: number;
  slotLands: number[];
  /** When the bubble is complete. */
  done: number;
};

export const TIMED: Timed[] = (() => {
  const out: Timed[] = [];
  let t = 0.8;
  let prev: Who | null = null;
  SCRIPT.forEach((line, index) => {
    if (prev && prev !== line.who && !out[out.length - 1]?.after) t += 0.15;
    const at = t;
    const chars: number[] = [];
    let slotAt = Infinity;
    const slotLands: number[] = [];
    let done: number;
    if (line.kind === 'type') {
      let c = at;
      for (let i = 0; i < line.text.length; i++) {
        chars.push(c);
        let dt = CHAR + jitter(i, index) * 0.016;
        if (',.?!'.includes(line.text[i])) dt += 0.06;
        c += dt;
      }
      done = c;
      if (line.slot) {
        slotAt = done + 0.15;
        let land = slotAt + SLOT_SPIN;
        for (let i = 0; i < line.slot.length; i++) {
          slotLands.push(land);
          land += SLOT_DWELL + SLOT_ROLL;
        }
        done = slotLands[slotLands.length - 1] + 0.25;
      }
      t = done + 0.45 + line.text.length * 0.008 + (line.slot ? 0.4 : 0);
    } else if (line.slot) {
      // A block arrives whole with its reel on the first word; a second after
      // it lands (0.3s), the reel starts to roll.
      slotAt = at;
      slotLands.push(at);
      let land = at + 0.3 + SLOT_DELAY + SLOT_ROLL;
      for (let i = 1; i < line.slot.length; i++) {
        slotLands.push(land);
        land += SLOT_DWELL + SLOT_ROLL;
      }
      done = slotLands[slotLands.length - 1];
      t = done + 0.95;
    } else {
      done = at + 0.3;
      t = done + 0.4 + line.text.length * 0.025;
    }
    if (line.after !== undefined) t = done + line.after;
    out.push({ ...line, index, at, chars, slotAt, slotLands, done });
    prev = line.who;
  });
  return out;
})();

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
const KEYS: View = { scale: 1.6, kb: 335 + (14 + 383) * 1.6 };
// The field's middle sits 365pt above the keyboard's bottom edge over the
// keys, and 551pt over the (taller) Study view.
const FIELD: View = { scale: 2.9, kb: 540 + 365 * 2.9 };
const FIELD_STUDY: View = { scale: 2.9, kb: 540 + 551 * 2.9 };
const ZOOM = 0.75;

/** Camera moves after the pan: [start, end, to]. */
export const CAMERA: [number, number, View][] = [];
const move = (at: number, to: View) => {
  CAMERA.push([at, at + ZOOM, to]);
  return at + ZOOM;
};
export const KEYS_VIEW = KEYS;

export const FIELD_MSGS: FieldMsg[] = [];
let c = PAN[1] + 0.5;
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
// 2. Close on the field again; this one stays in English. Back out, and open Study.
c = move(c + 0.4, FIELD);
{
  const times = typeTimes(FIELD2_RAW, c + 0.2, 7);
  c = move(times[times.length - 1] + 1.0, KEYS);
  FIELD_MSGS.push({ en: FIELD2_TEXT, ja: '', times, rewordTap: Infinity, rewordDone: Infinity, sendTap: Infinity, sendAt: Infinity, clearAt: Infinity });
}

/** The Study tap, the view opening (its height easing from the keys' to its
    own), and its loading stages. The camera holds its zoom throughout. */
export const STUDY_TAP = c + 0.4;
export const STUDY_OPEN = STUDY_TAP + 0.18;
export const STUDY_GROW = 0.4;
export const STUDY_SKELETON = STUDY_OPEN + 0.35;
export const STUDY_ROWS = STUDY_OPEN + 1.0;
/** A finger-flick down the entries once they've loaded. */
export const STUDY_FLICK = STUDY_ROWS + 0.7;
/** Once it settles, the sent reply fades so the field is the only focus. */
export const HIDE_SENT = STUDY_FLICK + 1.3;
// The English question isn't sent: once the entries have been seen, the field
// is cleared for the last line.
FIELD_MSGS[1].clearAt = STUDY_FLICK + 2.0;

// 3. Close on the field over Study for the last line, which stays unsent.
c = move(FIELD_MSGS[1].clearAt + 0.1, FIELD_STUDY);
{
  const times = typeTimes(FIELD3_RAW, c + 0.2, 23);
  FIELD_MSGS.push({ en: FIELD3_TEXT, ja: '', times, rewordTap: Infinity, rewordDone: Infinity, sendTap: Infinity, sendAt: Infinity, clearAt: Infinity });
  c = times[times.length - 1];
}

export const SEND_AT = FIELD_MSGS[0].sendAt;
/** The end card: a second after the last line is typed, the scene fades out
    over END_FADE, then the card. */
export const END_FADE = 0.9;
export const ENDING = c + 1.0 + END_FADE;

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
export const TAGLINE_LANDS: number[] = (() => {
  // English holds while the tagline fades in, then the reel rolls.
  const out = [2.4];
  let dt = 0.3 + 0.75;
  for (let i = 1; i < TAGLINE_WORDS.length - 1; i++) {
    out.push(out[out.length - 1] + dt);
    dt = i === 1 ? 0.3 * 0.78 : Math.max(0.017, dt * 0.78);
  }
  // A slower last roll settles on "a language".
  out.push(out[out.length - 1] + 0.4);
  return out;
})();
// The end card runs the app's splash (3s), the reel, then holds.
export const DURATION = Math.ceil((ENDING + TAGLINE_LANDS[TAGLINE_LANDS.length - 1] + 1.8) * 2) / 2;

/** The Study Guide's entries: words from the Japanese reply first, then older ones. */
export const STUDY_ROWS_DATA = [
  { entry: '翻訳', translations: 'translation', sentence: 'ボタンを押すだけで翻訳してくれるの？', tag: 'Noun', misses: 2 },
  { entry: '入力', translations: 'input, typing', sentence: 'じゃあ、入力してボタンを押すだけで…', tag: 'Noun', misses: 3 },
  { entry: '押す', translations: 'to press, to push', sentence: 'ボタンを押すだけで翻訳してくれるの？', tag: 'Verb', misses: 2 },
  { entry: 'ボタン', translations: 'button', sentence: 'ボタンを押すだけで翻訳してくれるの？', tag: 'Noun', misses: 1 },
  { entry: '〜だけで', translations: 'just by …', sentence: 'ボタンを押すだけで翻訳してくれるの？', tag: 'Phrase', misses: 1 },
  { entry: 'じゃあ', translations: 'so, well then', sentence: 'じゃあ、入力してボタンを押すだけで…', tag: 'Phrase', misses: 1 },
  // Older entries further down, from earlier conversations.
  { entry: '週末', translations: 'weekend', sentence: '今週末、ビーチに行こうよ！', tag: 'Noun', misses: 2 },
  { entry: '練習', translations: 'practice', sentence: '毎日ちょっとずつ練習してるよ。', tag: 'Noun', misses: 2 },
  { entry: '友達', translations: 'friend', sentence: '友達とメッセージで話すのが好き。', tag: 'Noun', misses: 1 },
  { entry: '会話', translations: 'conversation', sentence: '会話の中で覚えるのが一番だね。', tag: 'Noun', misses: 3 },
  { entry: '興味', translations: 'interest', sentence: '日本の映画に興味があるんだ。', tag: 'Noun', misses: 1 },
  { entry: '毎日', translations: 'every day', sentence: '毎日ちょっとずつ練習してるよ。', tag: 'Adverb', misses: 1 },
  { entry: '覚える', translations: 'to learn, to remember', sentence: '会話の中で覚えるのが一番だね。', tag: 'Verb', misses: 2 },
  { entry: '楽しみ', translations: 'looking forward to', sentence: '来週会えるのが楽しみ！', tag: 'Noun', misses: 1 },
]

/** Scene boundaries for the review tool: each runs until the next starts.
    Ids stay stable across versions so timing notes carry over. */
export function scenes() {
  const short = (m: Timed) => m.text.replace(/\n/g, ' ') + (m.slot ? ` [${m.slot.join(' / ')}]` : '');
  const list = [
    ...TIMED.map((m, i) => ({ id: `b${i + 1}`, name: `${i + 1}. ${short(m)}`, start: i === 0 ? 0 : m.at })),
    { id: 'keyboard', name: 'Pan to keyboard', start: PAN[0] },
    { id: 'field1', name: 'Type: So, I just type…', start: CAMERA[0][0] },
    { id: 'reword', name: 'Reword to Japanese + send', start: CAMERA[1][0] },
    { id: 'field2', name: 'Type: And it adds the words…', start: CAMERA[2][0] },
    { id: 'study', name: 'Study Guide + flick', start: CAMERA[3][0] },
    { id: 'field3', name: 'Type: Ok this is cool…', start: CAMERA[4][0] },
    { id: 'end', name: 'End card', start: ENDING - END_FADE },
  ];
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
    phones: [PAN[0]],
    opening: [0, 0],
    closing: ENDING,
    studyFlick: STUDY_FLICK,
  };
}
