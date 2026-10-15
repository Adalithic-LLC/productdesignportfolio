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
};

export const SCRIPT: Line[] = [
  { who: 'them', kind: 'type', text: 'Want a new way to learn a language?' },
  { who: 'me', kind: 'block', text: 'Ok, how?' },
  { who: 'me', kind: 'type', text: 'Please, not another app that I stop using after 5 minutes...' },
  { who: 'them', kind: 'type', text: 'Nope, you control this one.' },
  {
    who: 'them',
    kind: 'type',
    text: "It's practical learning based on your",
    slot: ['life', 'interests', 'actual conversations.'],
  },
  { who: 'me', kind: 'block', text: "Ok, I'm listening..." },
  { who: 'them', kind: 'type', text: 'Learn while you text your friends!' },
  { who: 'me', kind: 'block', text: 'Where?' },
  {
    who: 'them',
    kind: 'type',
    text: 'Right here! In your messaging app...wherever your chats already happen.',
    slot: ['WhatsApp', 'HelloTalk', 'Instagram', 'any app!'],
    slotInline: true,
  },
  {
    who: 'them',
    kind: 'type',
    text: "There's a keyboard and more features for",
    slot: ['translation.', 'correction.', 'analysis.', 'study.'],
    slotInline: true,
  },
];

export const FIELD_TEXT = 'So, I just type, tap a button, and it translates?';
export const FIELD_JA = 'じゃあ、入力してボタンを押すだけで翻訳してくれるの？';
export const FIELD2_TEXT = 'And it actually adds the words I missed to a study guide?';
export const FIELD2_JA = 'しかも、知らなかった単語を学習ガイドに入れてくれるの？';
export const FIELD3_TEXT = 'Ok this is cool. I kind of want to practice now.';

export const FPS = 60;
export const BPM = 120;

const CHAR = 0.042; // in-place typing: ~24 characters a second
const SLOT_SPIN = 0.2; // the first word fading in on its line
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
    if (prev && prev !== line.who) t += 0.15;
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
    } else {
      done = at + 0.3;
      t = done + 0.4 + line.text.length * 0.025;
    }
    out.push({ ...line, index, at, chars, slotAt, slotLands, done });
    prev = line.who;
  });
  return out;
})();

const LAST = TIMED[TIMED.length - 1];

/** The pan down to the field and keyboard, then two replies typed there. */
export const PAN = [LAST.done + 0.55, LAST.done + 1.75] as const;

/** When each character of a field message lands, from `start`. */
function typeTimes(text: string, start: number, seed: number) {
  const out: number[] = [];
  let c = start;
  for (let i = 0; i < text.length; i++) {
    out.push(c);
    let dt = 0.058 + jitter(i, seed) * 0.024;
    if (text[i] === ' ') dt += 0.02;
    if (',.'.includes(text[i])) dt += 0.08;
    c += dt;
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
  /** Infinity: it stays in the field. */
  sendTap: number;
  sendAt: number;
};

export const FIELD_MSGS: FieldMsg[] = (() => {
  const msgs: FieldMsg[] = [];
  // 1. Typed, reworded and sent.
  {
    const times = typeTimes(FIELD_TEXT, PAN[1] + 0.35, 99);
    const rewordTap = times[times.length - 1] + 0.55;
    const rewordDone = rewordTap + 1.0;
    const sendTap = rewordDone + 1.5;
    msgs.push({ en: FIELD_TEXT, ja: FIELD_JA, times, rewordTap, rewordDone, sendTap, sendAt: sendTap + 0.17 });
  }
  // 2. Typed and reworded; the Study Guide opens over the keys, then it's sent.
  {
    const times = typeTimes(FIELD2_TEXT, msgs[0].sendAt + 0.9, 7);
    const rewordTap = times[times.length - 1] + 0.55;
    msgs.push({ en: FIELD2_TEXT, ja: FIELD2_JA, times, rewordTap, rewordDone: rewordTap + 1.0, sendTap: Infinity, sendAt: Infinity });
  }
  return msgs;
})();

/** The Study tap, the view opening, and its loading stages. */
export const STUDY_TAP = FIELD_MSGS[1].rewordDone + 1.4;
export const STUDY_OPEN = STUDY_TAP + 0.18;
export const STUDY_SKELETON = STUDY_OPEN + 0.35;
export const STUDY_ROWS = STUDY_OPEN + 1.0;
FIELD_MSGS[1].sendTap = STUDY_ROWS + 2.6;
FIELD_MSGS[1].sendAt = FIELD_MSGS[1].sendTap + 0.17;

/** Then a close-up on the field, and a last line typed there (not sent). */
export const FIELD_ZOOM = [FIELD_MSGS[1].sendAt + 0.15, FIELD_MSGS[1].sendAt + 1.15] as const;
{
  const times = typeTimes(FIELD3_TEXT, FIELD_ZOOM[1] + 0.25, 23);
  FIELD_MSGS.push({ en: FIELD3_TEXT, ja: '', times, rewordTap: Infinity, rewordDone: Infinity, sendTap: Infinity, sendAt: Infinity });
}
const FIELD3_END = FIELD_MSGS[2].times[FIELD_MSGS[2].times.length - 1];

export const SEND_AT = FIELD_MSGS[0].sendAt;
/** The end card; the scene fades out over the second before it. */
export const ENDING = FIELD3_END + 1.6;
export const END_FADE = 0.9;
// The end card runs the app's splash (3s), then holds on the tagline.
export const DURATION = Math.ceil((ENDING + 5.2) * 2) / 2;

/** The Study Guide's entries: the words from the two Japanese replies. */
export const STUDY_ROWS_DATA = [
  { entry: '翻訳', translations: 'translation', sentence: 'ボタンを押すだけで翻訳してくれるの？', tag: 'Noun', misses: 2 },
  { entry: '単語', translations: 'word', sentence: '知らなかった単語を学習ガイドに入れてくれるの？', tag: 'Noun', misses: 3 },
  { entry: '入力', translations: 'input, typing', sentence: 'じゃあ、入力してボタンを押すだけで…', tag: 'Noun', misses: 1 },
  { entry: '押す', translations: 'to press, to push', sentence: 'ボタンを押すだけで翻訳してくれるの？', tag: 'Verb', misses: 2 },
  { entry: '知らなかった', translations: "didn't know", sentence: '知らなかった単語を学習ガイドに入れてくれるの？', tag: 'Verb', misses: 1 },
  { entry: '学習ガイド', translations: 'study guide', sentence: '知らなかった単語を学習ガイドに入れてくれるの？', tag: 'Phrase', misses: 1 },
];

export function cues() {
  return {
    duration: DURATION,
    bpm: BPM,
    keys: [
      ...FIELD_MSGS.flatMap((m) => m.times.map((t, i) => ({ t, space: m.en[i] === ' ' }))),
      ...SPLASH_LETTERS.map((t) => ({ t: ENDING + t, space: true })),
    ],
    taps: [...FIELD_MSGS.flatMap((m) => [m.rewordTap, m.sendTap].filter(Number.isFinite)), STUDY_TAP],
    // A shimmer as each reword lands.
    reword: FIELD_MSGS[0].rewordDone,
    reveal: FIELD_MSGS[1].rewordDone,
    send: SEND_AT,
    sends: FIELD_MSGS.map((m) => m.sendAt).filter(Number.isFinite),
    swipes: [],
    // A tick each time a reel lands, and a pop as each bubble arrives.
    words: TIMED.flatMap((m) => m.slotLands),
    pops: TIMED.map((m) => ({ t: m.at, who: m.who })),
    titles: [],
    phones: [PAN[0]],
    opening: [0, 0],
    closing: ENDING,
  };
}
