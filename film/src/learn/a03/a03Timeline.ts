/**
 * Arcatext 03 (?film=learn&cut=a03): the avatar-cloud opener from Arcatext 02
 * with its own question, then a phone walks through the app (common words,
 * partner challenges, the community), the keyboard hops out of the app into
 * three other messaging apps, the progress rings fill, "Well… you can.", and
 * the closer: "The road to 1000 words." and the logo.
 *
 * Every time is in seconds from the film's start; each shot is as long as its
 * voiced line (Gemini Enceladus) plus a little air.
 */
import { AV_END, AV_TEXT, AV_TYPE_TIMES, AV_GONE, AV_VOICE_AT, BPM, FRAME, PORTRAIT } from '../learnTimeline';

export { PORTRAIT, FRAME };

/** Named durations, so the Cut Room can list them. */
export const D3 = {
  appIn: 0.3, // the chat bubbles follow the cloud
  lead: 0.25, // a line's card comes in this long before its voice
  practice: 2.9, // "Practice the most common words," (1.9 s spoken)
  challenge: 4.0, // (3.4 s spoken) "with unstructured chats and writing challenges with partners."
  community: 3.0, // "chat with real people from the community," (2.2 s): Active, zoom, tap
  freedom: 9.6, // "Now, imagine breaking out of the mold…" (8.3 s spoken), the keyboard hops
  progress: 4.7, // "No matter how you learn, we measure your progress…" (3.8 s), the rings fill and the camera flies through one
};

export type Line = {
  key: string;
  /** What the card shows. */
  text: string;
  /** The words drawn in the accent colour. */
  accent: string;
  /** When the card comes in, and when it leaves. */
  at: number;
  out: number;
};

let c = AV_END + 0.1;
export const APP_IN = c;
c += D3.appIn;

const line = (key: string, text: string, accent: string, dur: number): Line => {
  const l = { key, text, accent, at: c, out: c + dur };
  c += dur;
  return l;
};
export const PRACTICE = line('a3-practice', 'Practice the most common words', 'most common words', D3.practice);
export const COMMUNITY = line('a3-community', 'Chat with real people from the community', 'real people', D3.community);
/** The phone rises in with the community. */
export const PHONE_IN = COMMUNITY.at;
export const CHALLENGE = line('a3-challenge', 'With unstructured chats and writing challenges with partners', 'writing challenges', D3.challenge);
/** The long line is shown as two cards; the second comes in on "using" (4.3 s into the voice). */
export const FREEDOM_AT = c;
export const FREEDOM_A = line('a3-freedom', 'Now, imagine breaking out of the mold, learning in your own way,', 'your own way', 4.45);
export const FREEDOM_B = line('a3-freedom-b', 'using the most powerful AI keyboard inside any messaging app.', 'most powerful AI keyboard', D3.freedom - 4.45);
export const PROGRESS = line('a3-progress', 'No matter how you learn, we measure your progress the whole time.', 'measure your progress', D3.progress);
export const CARDS = [PRACTICE, COMMUNITY, CHALLENGE, FREEDOM_A, FREEDOM_B, PROGRESS];

/** The end of the app part: the rings fly-through hands over to the end card. */
export const APP_OUT = c;

// ── The keyboard's hops (seconds from FREEDOM_AT) ──
/** The phones in the hop: the Arcatext app, then three messaging apps. */
export const HOP_APPS = ['arcatext', 'whatsapp', 'instagram', 'telegram'] as const;
export type HopApp = (typeof HOP_APPS)[number];
/** Each hop: the keyboard lifts out of app i at `lift`, the app is pushed
    aside from `push` and the next one takes the centre, and the keyboard
    lands in app i+1 at `land`. */
export const HOPS = [
  { lift: 1.2, push: 1.6, land: 2.5 },
  { lift: 3.9, push: 4.25, land: 5.15 },
  { lift: 6.6, push: 6.95, land: 7.85 },
].map((h) => ({ lift: FREEDOM_AT + h.lift, push: FREEDOM_AT + h.push, land: FREEDOM_AT + h.land }));
export const HOP = { liftLen: 0.5, pushLen: 0.75, fall: 0.4 };
/** What gets typed in each messaging app once the keyboard lands, and sent. */
export const HOP_TYPED = ['¡Sí! ¿Vamos juntos?', '¡Qué foto tan bonita!', '¡Perfecto, a las 5!'];
const typeTimes = (text: string, start: number, per: number) => [...text].map((_, i) => start + i * per);
export const HOP_TYPE_TIMES = HOP_TYPED.map((x, i) => typeTimes(x, HOPS[i].land + 0.2, 0.048));
export const HOP_SENDS = HOP_TYPE_TIMES.map((x) => x[x.length - 1] + 0.12);

/** Community: the Active list, the camera closes in on Sunny Heron's chat
    card, and the card is tapped into the partner chat. */
export const ZOOM_AT = COMMUNITY.at + 1.0;
export const CARD_TAP = CHALLENGE.at - 0.3;
/** The partner chat opens, the phone dissolves, and the exchange plays as
    bubbles; the phone forms again just before Freedom. Times are absolute
    except firstAt and out, which are from CHALLENGE.at. */
export const PARTNER = {
  dissolve: CHALLENGE.at + 0.2,
  gone: CHALLENGE.at + 0.7,
  firstAt: 0.55,
  /** When each line of the exchange arrives (them, me). */
  lineAt: [0.55, 1.7],
  out: D3.challenge - 0.45,
  back: FREEDOM_AT - 0.3,
};

/** Practice: chat bubbles alone, no phone (seconds from PRACTICE.at). */
export const CHAT = { askAt: 0.1, sendAt: 0.85, dotsAt: 1.25, answerAt: 1.95, out: D3.practice - 0.55 };
export const CHAT_ASK = PRACTICE.at + CHAT.askAt;
export const CHAT_SEND = PRACTICE.at + CHAT.sendAt;
export const CHAT_ANSWER = PRACTICE.at + CHAT.answerAt;
/** The Telegram phone steps back and the rings come up on their own. */
export const PHONE_AWAY = PROGRESS.at;

// ── The rings ──
/** The rings fill from RINGS_AT over this long. */
export const RINGS_AT = PROGRESS.at + 0.8;
export const RINGS_LEN = 2.2;

// ── The closer ──
export const END_AT = c;
/** The road line, then the logo; the logo's name types on "Arcatext" (3.8 s into the take). */
export const ROAD = 'The road to 1000 words.';
export const LOGO_AT = END_AT + 0.2 + 3.82 - 1.55;
/** The end card runs 5.5 s (to the frame): the line, the logo, a brief hold. */
export const END_LEN = 5.5;
export const DURATION = Math.round((END_AT + END_LEN) * 60) / 60;

// ── Voice ──
export type VoiceLine = { key: string; text: string; at: number; until: number; marks: { text: string; at: number }[] };
const voiceLine = (key: string, text: string, at: number, until: number): VoiceLine => ({ key, text, at, until, marks: [{ text, at }] });
export const VOICE_LINES: VoiceLine[] = [
  voiceLine('a3-q', AV_TEXT.replace('1000', 'one thousand'), AV_VOICE_AT, AV_GONE),
  voiceLine('a3-practice', 'Practice the most common words,', PRACTICE.at + D3.lead, COMMUNITY.at),
  voiceLine('a3-community', 'chat with real people from the community,', COMMUNITY.at + D3.lead, CHALLENGE.at),
  voiceLine('a3-challenge', 'with unstructured chats and writing challenges with partners.', CHALLENGE.at + D3.lead, FREEDOM_AT),
  voiceLine('a3-freedom', 'Now, imagine breaking out of the mold, learning in your own way, using the most powerful AI keyboard inside any messaging app.', FREEDOM_AT + D3.lead, PROGRESS.at),
  voiceLine('a3-progress', 'No matter how you learn, we measure your progress the whole time.', PROGRESS.at + D3.lead, END_AT),
  voiceLine('a3-road', 'The road to one thousand words. Arcatext.', END_AT + 0.2, DURATION - 0.5),
];

// ── The Cut Room's scenes ──
const scene = (id: string, name: string, start: number, texts: { key: string; label: string; text: string }[] = []) => ({ id, name, start, texts });
export function scenes() {
  const list = [
    scene('avatars', `Avatars: ${AV_TEXT}`, 0, [{ key: 'q', label: 'Typed line', text: AV_TEXT }]),
    ...[PRACTICE, COMMUNITY, CHALLENGE].map((l) => scene(l.key.slice(3), `Text: ${l.text}`, l.at, [{ key: l.key, label: 'Text', text: l.text }])),
    scene('freedom', `Text: ${FREEDOM_A.text}`, FREEDOM_AT, [{ key: 'freedom', label: 'Text cards', text: `${FREEDOM_A.text} / ${FREEDOM_B.text}` }]),
    scene('progress', `Text: ${PROGRESS.text}`, PROGRESS.at, [{ key: 'progress', label: 'Text', text: PROGRESS.text }]),
    scene('end', 'End card', END_AT, [{ key: 'road', label: 'Line', text: ROAD }]),
  ];
  return list.map((s, i) => ({ flows: [] as unknown[], delays: [], ...s, end: i + 1 < list.length ? list[i + 1].start : DURATION }));
}

export function cues() {
  return {
    scenes: scenes(),
    duration: DURATION,
    bpm: BPM,
    keys: [
      ...AV_TYPE_TIMES.map((t, i) => ({ t, space: AV_TEXT[i] === ' ' })),
      ...HOP_TYPE_TIMES.flatMap((times, k) => times.map((t, i) => ({ t, space: HOP_TYPED[k][i] === ' ' }))),
    ],
    taps: [CARD_TAP, ...HOPS.map((h) => h.land)].sort((a, b) => a - b),
    reword: null,
    reveal: null,
    send: null,
    sends: [CHAT_SEND, CHALLENGE.at + PARTNER.lineAt[1], ...HOP_SENDS],
    swipes: HOPS.map((h) => h.push),
    words: [...CARDS.map((l) => l.at), END_AT],
    ticks: Array.from({ length: 8 }, (_, i) => RINGS_AT + (i * RINGS_LEN) / 8),
    pops: [{ t: CHAT_ASK, who: 'them' }, { t: CHALLENGE.at + PARTNER.lineAt[0], who: 'them' }],
    titles: [[0, APP_IN]],
    phones: [PHONE_IN],
    opening: [0, 0],
    closing: LOGO_AT,
    studyFlick: null,
    voice: VOICE_LINES,
  };
}
