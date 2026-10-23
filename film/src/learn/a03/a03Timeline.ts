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
import { AV_TEXT, AV_TYPE_TIMES, AV_GONE, AV_VOICE_AT, BPM, FRAME, PORTRAIT } from '../learnTimeline';

export { PORTRAIT, FRAME };

/** Named durations, so the Cut Room can list them. */
export const D3 = {
  appIn: 0.3, // the phone follows the cloud
  lead: 0.25, // a line's card comes in this long before its voice
  challenge: 4.3, // "complete co-writing challenges with partners.": a paragraph typed by two people
  community: 3.0, // "chat with real people from the community," (2.2 s): Active, zoom, tap
  freedom: 8.2, // "Learn in your own way, using…" (5.6 s spoken), the keyboard hops
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

let c = AV_GONE + 0.05;
export const APP_IN = c;
c += D3.appIn;

const line = (key: string, text: string, accent: string, dur: number): Line => {
  const l = { key, text, accent, at: c, out: c + dur };
  c += dur;
  return l;
};
export const COMMUNITY = line('a3-community', 'Chat with real people from the community', 'real people', D3.community);
/** The phone rises in with the community. */
export const PHONE_IN = COMMUNITY.at;
export const CHALLENGE = line('a3-challenge', 'Complete co-writing challenges with partners', 'co-writing challenges', D3.challenge);
/** The long line is shown as two cards; the second comes in on "using" (2.4 s into the voice). */
export const FREEDOM_AT = c;
export const FREEDOM_A = line('a3-freedom', 'Learn in your own way,', 'your own way', 2.56);
export const FREEDOM_B = line('a3-freedom-b', 'using the most powerful AI keyboard inside any messaging app.', 'most powerful AI keyboard', D3.freedom - 2.56);
export const PROGRESS = line('a3-progress', 'No matter how you learn, we measure your progress the whole time.', 'measure your progress', D3.progress);
export const CARDS = [COMMUNITY, CHALLENGE, FREEDOM_A, FREEDOM_B, PROGRESS];

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
  { lift: 0.9, push: 1.25, land: 2.1 },
  { lift: 3.25, push: 3.55, land: 4.4 },
  { lift: 5.6, push: 5.9, land: 6.75 },
].map((h) => ({ lift: FREEDOM_AT + h.lift, push: FREEDOM_AT + h.push, land: FREEDOM_AT + h.land }));
export const HOP = { liftLen: 0.5, pushLen: 0.75, fall: 0.4 };
/** What gets typed in each messaging app once the keyboard lands, and sent. */
export const HOP_TYPED = ['¡Sí! ¿Vamos juntos?', '¡Qué foto tan bonita!', '¡Perfecto, a las 5!'];
const typeTimes = (text: string, start: number, per: number) => [...text].map((_, i) => start + i * per);
export const HOP_TYPE_TIMES = HOP_TYPED.map((x, i) => typeTimes(x, HOPS[i].land + 0.15, 0.04));
export const HOP_SENDS = HOP_TYPE_TIMES.map((x) => x[x.length - 1] + 0.12);

/** Community: close in on the Active list from the start, and scroll down it. */
export const LIST_SCROLL = { from: 0.45, to: D3.community - 0.1, by: 330 };
/** The partner chat opens, the phone dissolves, and the exchange plays as
    bubbles; the phone forms again just before Freedom. Times are absolute
    except firstAt and out, which are from CHALLENGE.at. */
/** The co-written paragraph: you and your partner take turns, each typing
    in their own highlight (seconds from CHALLENGE.at). */
const COWRITE_PER = 0.026;
export const COWRITE = (() => {
  const parts: { who: 'me' | 'them'; text: string }[] = [
    { who: 'me', text: 'El sábado fuimos al mercado. ' },
    { who: 'them', text: 'Compramos fruta y pan fresco. ' },
    { who: 'me', text: '¡Después cocinamos juntos!' },
  ];
  let at = 1.05;
  const segs = parts.map((p) => {
    const seg = { ...p, at, times: [...p.text].map((_, i) => at + i * COWRITE_PER) };
    at += p.text.length * COWRITE_PER + 0.12;
    return seg;
  });
  return { cardAt: 0.9, segs };
})();

export const PARTNER = {
  dissolve: CHALLENGE.at + 0.2,
  gone: CHALLENGE.at + 0.7,
  firstAt: 0.55,
  /** When the partner's challenge arrives. */
  lineAt: [0.55],
  out: D3.challenge - 0.45,
  back: FREEDOM_AT - 0.15,
};

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
export const ROAD2 = 'And beyond.';
/** "And beyond." comes in as it's spoken (3.45 s into the voice). */
export const ROAD2_AT = END_AT + 0.2 + 3.35;
/** The road line fades as "words" ends; the logo starts only once it's gone,
    and plays 2x fast so "Arcatext" types as it's spoken. */
export const ROAD_OUT = END_AT + 0.2 + 4.2;
export const LOGO_AT = ROAD_OUT + 0.25;
export const LOGO_SPEED = 2;
/** The end card (to the frame): the two lines, the logo, a short hold once the name has typed. */
export const END_LEN = 6.5;
export const DURATION = Math.round((END_AT + END_LEN) * 60) / 60;

// ── Voice ──
export type VoiceLine = { key: string; text: string; at: number; until: number; marks: { text: string; at: number }[] };
const voiceLine = (key: string, text: string, at: number, until: number): VoiceLine => ({ key, text, at, until, marks: [{ text, at }] });
export const VOICE_LINES: VoiceLine[] = [
  voiceLine('a3-q', AV_TEXT.replace('1000', 'one thousand'), AV_VOICE_AT, AV_GONE),
  voiceLine('a3-community', 'chat with real people from the community,', COMMUNITY.at + D3.lead, CHALLENGE.at),
  voiceLine('a3-challenge', 'complete co-writing challenges with partners.', CHALLENGE.at + D3.lead, FREEDOM_AT),
  voiceLine('a3-freedom', 'Learn in your own way, using the most powerful AI keyboard inside any messaging app.', FREEDOM_AT + D3.lead, PROGRESS.at),
  voiceLine('a3-progress', 'No matter how you learn, we measure your progress the whole time.', PROGRESS.at + D3.lead, END_AT),
  voiceLine('a3-road', 'The road to one thousand words. And beyond. Arcatext.', END_AT + 0.2, DURATION - 0.5),
];

// ── The Cut Room's scenes ──
const scene = (id: string, name: string, start: number, texts: { key: string; label: string; text: string }[] = []) => ({ id, name, start, texts });
export function scenes() {
  const list = [
    scene('avatars', `Avatars: ${AV_TEXT}`, 0, [{ key: 'q', label: 'Typed line', text: AV_TEXT }]),
    ...[COMMUNITY, CHALLENGE].map((l) => scene(l.key.slice(3), `Text: ${l.text}`, l.at, [{ key: l.key, label: 'Text', text: l.text }])),
    scene('freedom', `Text: ${FREEDOM_A.text}`, FREEDOM_AT, [{ key: 'freedom', label: 'Text cards', text: `${FREEDOM_A.text} / ${FREEDOM_B.text}` }]),
    scene('progress', `Text: ${PROGRESS.text}`, PROGRESS.at, [{ key: 'progress', label: 'Text', text: PROGRESS.text }]),
    scene('end', 'End card', END_AT, [{ key: 'road', label: 'Line', text: `${ROAD}\n${ROAD2}` }]),
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
      ...COWRITE.segs.flatMap((s) => s.times.map((t, i) => ({ t: CHALLENGE.at + t, space: s.text[i] === ' ' }))),
    ],
    taps: HOPS.map((h) => h.land).sort((a, b) => a - b),
    reword: null,
    reveal: null,
    send: null,
    sends: HOP_SENDS,
    swipes: HOPS.map((h) => h.push),
    words: [...CARDS.map((l) => l.at), END_AT],
    ticks: Array.from({ length: 8 }, (_, i) => RINGS_AT + (i * RINGS_LEN) / 8),
    pops: [{ t: CHALLENGE.at + PARTNER.lineAt[0], who: 'them' }],
    titles: [[0, APP_IN]],
    phones: [PHONE_IN],
    opening: [0, 0],
    closing: LOGO_AT,
    studyFlick: null,
    voice: VOICE_LINES,
  };
}
