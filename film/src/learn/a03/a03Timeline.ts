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
import { AV_BURST, AV_TEXT, AV_TYPE_TIMES, AV_VOICE_AT, BPM, D, FRAME, PORTRAIT } from '../learnTimeline';

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

// ── The opener ──
// The cloud bursts and the question types (Arcatext 02's opener, faces only);
// it clears, and the second line types in three spoken parts. After
// "collaborative," five pairs snap together; after "individual," they drift
// apart; after "measurable." the ten become progress rings that fill and
// turn green. Then everything collapses into the point.

/** The question's last letter; it holds, then clears. */
export const Q_END = AV_TYPE_TIMES[AV_TYPE_TIMES.length - 1];
export const Q_OUT = Q_END + 0.3;
export const Q_OUT_LEN = 0.35;
export const LINE2 = 'Arcatext makes the journey collaborative, individual, and measurable.';
/** The three spoken parts of the second line: the clip, the text each types,
    and how long its speech runs (read from the clips' waveforms). The mixer
    trims each clip so speech starts 0.06 s after its `at`. */
const PARTS = [
  { key: 'a3-j1', text: 'Arcatext makes the journey collaborative,', spoken: 'Arcatext makes the journey collaborative,', speech: 2.32 },
  { key: 'a3-j2', text: ' individual,', spoken: 'individual,', speech: 0.75 },
  { key: 'a3-j3', text: ' and measurable.', spoken: 'and measurable.', speech: 0.73 },
];
/** The pauses after each part, while the avatars act it out. */
export const D_OP = {
  pair: 1.1, // after "collaborative,": five pairs snap together into pills
  split: 1.1, // after "individual,": the pairs drift apart
  ringsIn: 0.4, // after "measurable.": the ten faces turn into rings
  ringsHold: 0.55, // the last ring has turned green; everything holds
  collapse: 0.6, // the cloud, the rings and the line fall into the point
};
const J1_AT = Q_OUT + Q_OUT_LEN + 0.1;
export const PAIR_AT = J1_AT + 0.06 + PARTS[0].speech;
const J2_AT = PAIR_AT + D_OP.pair - 0.06;
export const SPLIT_AT = J2_AT + 0.06 + PARTS[1].speech;
const J3_AT = SPLIT_AT + D_OP.split - 0.06;
export const RING_AT = J3_AT + 0.06 + PARTS[2].speech;
export const PART_AT = [J1_AT, J2_AT, J3_AT];
/** When each letter of the second line types: an even rate through each
    part's speech; a part's leading space lands just before its first word. */
export const LINE2_TIMES: number[] = PARTS.flatMap((p, k) => {
  const s = PART_AT[k] + 0.06;
  const body = p.text.trimStart();
  const lead = p.text.length - body.length;
  return [
    ...Array.from({ length: lead }, () => s - 0.03),
    ...[...body].map((_, i) => s + (i * (p.speech - 0.1)) / Math.max(1, body.length - 1)),
  ];
});
/** The rings: each fills to its own number at its own pace, and turns green
    when full. The numbers are dealt out of order across the ten. */
export const RING_MAX = [35, 10, 50, 20, 45, 15, 55, 30, 25, 40];
export const RING_FILL = RING_MAX.map((_, j) => {
  const at = RING_AT + D_OP.ringsIn + [0, 0.12, 0.05, 0.2, 0.08, 0.16, 0.02, 0.22, 0.1, 0.14][j];
  const len = [1.5, 1.15, 1.9, 1.3, 1.75, 1.2, 2.0, 1.45, 1.35, 1.6][j];
  return { at, len, done: at + len };
});
export const RINGS_DONE = Math.max(...RING_FILL.map((r) => r.done));
export const OP_COLLAPSE = RINGS_DONE + D_OP.ringsHold;
/** Everything is back in the point; it winks out at OP_END. */
export const OP_GONE = OP_COLLAPSE + D_OP.collapse;
export const OP_END = OP_GONE + 0.35;
/** When each pair's two faces meet (a little apart from pair to pair). */
export const PAIR_DELAY = [0, 0.07, 0.13, 0.04, 0.1];
export const PAIR_SNAP = 0.62; // from PAIR_AT: the approach ends and the snap begins
export const PAIR_HIT = 0.9; // from PAIR_AT: the faces touch

let c = OP_GONE + 0.05;
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
  voiceLine('a3-q', AV_TEXT.replace('1000', 'one thousand'), AV_VOICE_AT, J1_AT),
  ...PARTS.map((p, k) => voiceLine(p.key, p.spoken, PART_AT[k], k < 2 ? PART_AT[k + 1] : OP_GONE)),
  voiceLine('a3-community', 'chat with real people from the community,', COMMUNITY.at + D3.lead, CHALLENGE.at),
  voiceLine('a3-challenge', 'complete co-writing challenges with partners.', CHALLENGE.at + D3.lead, FREEDOM_AT),
  voiceLine('a3-freedom', 'Learn in your own way, using the most powerful AI keyboard inside any messaging app.', FREEDOM_AT + D3.lead, PROGRESS.at),
  voiceLine('a3-progress', 'No matter how you learn, we measure your progress the whole time.', PROGRESS.at + D3.lead, END_AT),
  voiceLine('a3-road', 'The road to one thousand words. And beyond. Arcatext.', END_AT + 0.2, DURATION - 0.5),
];

// ── The Cut Room's scenes ──
type FlowPart = { text: string; typed?: boolean; wordTimes?: number[] } | { key: string; kind: string; name: string; label: string; value: number; at: number };
const scene = (id: string, name: string, start: number, texts: { key: string; label: string; text: string }[] = [], flows: FlowPart[][] = []) => ({ id, name, start, texts, flows });
const r2 = (x: number) => Math.round(x * 100) / 100;
const r3 = (x: number) => Math.round(x * 1000) / 1000;
/** A timing the Cut Room's Scene timing tab shows inline, where it happens. */
const inline = (key: string, label: string, value: number, at: number, kind = 'delay', name = 'Delay'): FlowPart => ({ key, kind, name, label, value: r2(value), at: r3(at) });
/** Typed text whose characters land at times[offset…]; each word's end is where a delay can go. */
const typed = (text: string, times: number[], offset = 0): FlowPart => {
  const ends: number[] = [];
  const re = /\S+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) ends.push(m.index + m[0].length - 1);
  return { text, typed: true, wordTimes: ends.slice(0, -1).map((e) => r3((times[offset + e] ?? 0) + 0.03)) };
};
const said = (t: string) => `after “${t.trim()}”`;

/** The Cut Room's scenes, each with its text and its timings inline. */
export function scenes() {
  const [p1, p2, p3] = PARTS.map((p) => p.text);
  const coTimes = (s: (typeof COWRITE.segs)[number]) => s.times.map((t) => CHALLENGE.at + t);
  const list = [
    scene('avatars', `Avatars: ${AV_TEXT}`, 0, [
      { key: 'q', label: 'Typed line', text: AV_TEXT },
      { key: 'line2', label: 'Second line', text: LINE2 },
    ], [
      [
        inline('av-burst', 'the burst', D.avBurst, AV_BURST, 'duration', 'Burst'),
        typed(AV_TEXT, AV_TYPE_TIMES),
        inline('q-hold', 'the question holds', Q_OUT - Q_END, Q_END, 'hold', 'Hold'),
        inline('q-clear', 'the question clears', Q_OUT_LEN, Q_OUT, 'duration', 'Clear'),
      ],
      [
        typed(p1, LINE2_TIMES, 0),
        inline('pairs', `${said(p1)}: five pairs snap together`, D_OP.pair, PAIR_AT, 'duration', 'Pairs'),
        typed(p2, LINE2_TIMES, p1.length),
        inline('split', `${said(p2)}: the pairs drift apart`, D_OP.split, SPLIT_AT, 'duration', 'Split'),
        typed(p3, LINE2_TIMES, p1.length + p2.length),
        inline('rings-in', `${said(p3)}: the ten faces turn into rings`, D_OP.ringsIn, RING_AT, 'duration', 'Rings'),
        inline('rings-fill', 'the rings count up and turn green', RINGS_DONE - (RING_AT + D_OP.ringsIn), RING_AT + D_OP.ringsIn, 'duration', 'Fill'),
        inline('rings-hold', 'the green rings hold', D_OP.ringsHold, RINGS_DONE, 'hold', 'Hold'),
        inline('op-collapse', 'the collapse', D_OP.collapse, OP_COLLAPSE, 'duration', 'Collapse'),
      ],
    ]),
    scene('community', `Text: ${COMMUNITY.text}`, COMMUNITY.at, [{ key: COMMUNITY.key, label: 'Text', text: COMMUNITY.text }], [
      [{ text: COMMUNITY.text }, inline('community-hold', 'the community list scrolls', D3.community, COMMUNITY.at, 'hold', 'Hold')],
    ]),
    scene('challenge', `Text: ${CHALLENGE.text}`, CHALLENGE.at, [{ key: CHALLENGE.key, label: 'Text', text: CHALLENGE.text }], [
      [{ text: CHALLENGE.text }],
      [
        inline('cowrite-lead', 'before the paragraph', COWRITE.segs[0].at, CHALLENGE.at),
        ...COWRITE.segs.flatMap((sg, i) => [
          typed(sg.text, coTimes(sg)),
          ...(i < COWRITE.segs.length - 1 ? [inline(`cowrite-turn-${i}`, `${said(sg.text)}: the other writer takes over`, COWRITE.segs[i + 1].at - (sg.times[sg.times.length - 1] ?? sg.at), CHALLENGE.at + (sg.times[sg.times.length - 1] ?? sg.at))] : []),
        ]),
        inline('challenge-hold', 'the challenge scene', D3.challenge, CHALLENGE.at, 'hold', 'Hold'),
      ],
    ]),
    scene('freedom', `Text: ${FREEDOM_A.text}`, FREEDOM_AT, [{ key: 'freedom', label: 'Text cards', text: `${FREEDOM_A.text} / ${FREEDOM_B.text}` }], [
      [
        { text: FREEDOM_A.text },
        inline('freedom-a', said(FREEDOM_A.text), FREEDOM_A.out - FREEDOM_A.at, FREEDOM_A.at),
        { text: FREEDOM_B.text },
        inline('freedom-hold', 'the keyboard hops through three apps', FREEDOM_B.out - FREEDOM_B.at, FREEDOM_B.at, 'hold', 'Hold'),
      ],
      ...HOP_TYPED.map((m, h) => [
        inline(`hop-${h}`, `before typing in app ${h + 1}`, HOP_TYPE_TIMES[h][0] - HOPS[h].land, HOPS[h].land),
        typed(m, HOP_TYPE_TIMES[h]),
      ]),
    ]),
    scene('progress', `Text: ${PROGRESS.text}`, PROGRESS.at, [{ key: 'progress', label: 'Text', text: PROGRESS.text }], [
      [
        { text: PROGRESS.text },
        inline('rings-at', 'before the rings fill', RINGS_AT - PROGRESS.at, PROGRESS.at),
        inline('rings-len', 'the rings fill', RINGS_LEN, RINGS_AT, 'duration', 'Fill'),
        inline('progress-hold', 'the progress scene', D3.progress, PROGRESS.at, 'hold', 'Hold'),
      ],
    ]),
    scene('end', 'End card', END_AT, [{ key: 'road', label: 'Line', text: `${ROAD}\n${ROAD2}` }], [
      [
        { text: ROAD },
        inline('road2', said(ROAD), ROAD2_AT - (END_AT + 0.15), END_AT + 0.15),
        { text: ROAD2 },
        inline('road-out', 'before the logo', LOGO_AT - ROAD2_AT, ROAD2_AT),
        inline('logo-hold', 'the logo holds', DURATION - LOGO_AT, LOGO_AT, 'hold', 'Hold'),
      ],
    ]),
  ];
  return list.map((s, i) => ({ delays: [], ...s, end: i + 1 < list.length ? list[i + 1].start : DURATION }));
}

export function cues() {
  return {
    scenes: scenes(),
    duration: DURATION,
    bpm: BPM,
    keys: [
      ...AV_TYPE_TIMES.map((t, i) => ({ t, space: AV_TEXT[i] === ' ' })),
      ...LINE2_TIMES.map((t, i) => ({ t, space: LINE2[i] === ' ' })),
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
    // The pairs meeting, then each ring turning green.
    pops: [
      ...PAIR_DELAY.map((d) => ({ t: PAIR_AT + PAIR_HIT + d, who: 'them' })),
      ...RING_FILL.map((r) => ({ t: r.done, who: 'me' })),
    ].sort((a, b) => a.t - b.t),
    titles: [[0, APP_IN]],
    phones: [PHONE_IN],
    opening: [0, 0],
    closing: LOGO_AT,
    studyFlick: null,
    voice: VOICE_LINES,
  };
}
