/**
 * "Chat": the second film. A conversation between two people as floating
 * message bubbles (no phone), then a pan down to the Arcatext keyboard, a
 * reword into Japanese, a send, and the end card. Every time is derived here
 * from the script, so changing a line re-times everything after it.
 *
 * `me` is the sceptic (blue, right); `them` is the friend explaining (grey,
 * left). Typed bubbles grow in place as they type; blocks arrive whole.
 */

export type Who = 'me' | 'them';
export type Line = {
  who: Who;
  kind: 'type' | 'block';
  text: string;
  /** Words a slot-machine reel turns through on its own last line. */
  slot?: string[];
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
    text: 'Right here! In your messaging app...wherever your chats already happen',
    slot: ['WhatsApp', 'HelloTalk', 'Instagram', 'any app!'],
  },
  { who: 'them', kind: 'type', text: 'Look at the keyboard!' },
];

export const FIELD_TEXT = 'Ok, this is cool.';
export const FIELD_JA = 'なるほど、これはいいね。';

export const FPS = 60;
export const BPM = 120;

const CHAR = 0.042; // in-place typing: ~24 characters a second
const SLOT_SPIN = 0.5; // the reel's first spin, blank to the first word
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

/** The pan down to the field and keyboard, then the reply. */
export const PAN = [LAST.done + 0.55, LAST.done + 1.75] as const;
const FIELD_START = PAN[1] + 0.35;
export const FIELD_TIMES: number[] = (() => {
  const out: number[] = [];
  let c = FIELD_START;
  for (let i = 0; i < FIELD_TEXT.length; i++) {
    out.push(c);
    let dt = 0.072 + jitter(i, 99) * 0.03;
    if (FIELD_TEXT[i] === ' ') dt += 0.02;
    if (',.'.includes(FIELD_TEXT[i])) dt += 0.08;
    c += dt;
  }
  return out;
})();
const FIELD_END = FIELD_TIMES[FIELD_TIMES.length - 1];
export const REWORD_TAP = FIELD_END + 0.55;
export const REWORD_DONE = REWORD_TAP + 1.0;
export const SEND_TAP = REWORD_DONE + 1.5;
export const SEND_AT = SEND_TAP + 0.17;
export const ENDING = SEND_AT + 1.6;
export const DURATION = Math.ceil((ENDING + 4.4) * 2) / 2;

export function cues() {
  return {
    duration: DURATION,
    bpm: BPM,
    keys: FIELD_TIMES.map((t, i) => ({ t, space: FIELD_TEXT[i] === ' ' })),
    taps: [REWORD_TAP, SEND_TAP],
    reword: REWORD_DONE,
    send: SEND_AT,
    reveal: null,
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
