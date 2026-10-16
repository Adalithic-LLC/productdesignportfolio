/**
 * The "self-guided learning" film (?film=learn): a portrait ad.
 *
 *   1. Titles: a headline in chunks, then a second line typed out with an
 *      inline reel of apps.
 *   2. The phone: narration bubbles above the field and keyboard, and a camera
 *      that moves between them: type what you know, add what you want to
 *      learn, Reword it to Spanish and send it; then the study-guide line in
 *      chunks while the phone steps away; then open Study.
 *   3. The end card: the app's splash, then its line, ending on a reel of
 *      languages.
 *
 * Every time here is in seconds from the film's start. The world is laid out
 * in iOS points; heights are measured up from the keyboard's bottom edge.
 */

export const FRAME = { w: 1080, h: 1920 };
/** The platforms' safe area for a 9:16 ad (as the chat film's portrait cut). */
export const STAGE = { cx: 500, cy: 800, w: 860 };
export const FPS = 60;
export const BPM = 120;

const jitter = (i: number, seed: number) => {
  const x = Math.sin(i * 12.9898 + seed * 78.233) * 43758.5453;
  return x - Math.floor(x) - 0.5;
};
/** When each character of `text` lands, from `start`, at `per` seconds a key. */
/** `pauses` holds extra seconds after the character at each index. */
function typeTimes(text: string, start: number, per: number, seed: number, pauses: Record<number, number> = {}) {
  const out: number[] = [];
  let c = start;
  [...text].forEach((ch, i) => {
    out.push(c);
    c += per + jitter(i, seed) * per * 0.4 + (',.?!'.includes(ch) ? 0.08 : 0) + (ch === ' ' ? 0.015 : 0) + (pauses[i] ?? 0);
  });
  return out;
}

/** Named delays, so the Cut Room can list and retime them. */
export const D = {
  chunk: 0.75, // between the headline's chunks
  keyboardPause: 0.5, // the typed line pauses after "keyboard"
  titleHold: 1.3, // the full headline holds
  titleStart: 0.5, // before the headline's first chunk
  titleOut: 0.5, // it fades away
  slotHold: 0.9, // each app in the headline's reel holds
  slotRoll: 0.32, // and rolls to the next
  line2Hold: 1.5, // the typed line holds once done
  line2Out: 0.4, // then fades away
  worldIn: 0.6, // the phone fades in
  readBubble: 1.6, // a narration bubble is read
  kbWait: 1.0, // a narration bubble shows alone before the keyboard comes up
  kbSlide: 0.35, // the keyboard slides up
  pan: 1.0, // the camera moves between the chat and the field
  afterType: 0.5, // a typed run holds
  glide: 0.75, // the camera glides to a button
  tapAfter: 0.35, // then taps it
  readEs: 1.6, // the Spanish is read
  noteFade: 0.5, // the phone fades out for the study-guide line, and back
  noteChunk: 0.75, // between the study-guide line's chunks
  noteHold: 1.6, // the full study-guide line holds
  endChunk: 0.75, // between the end card's chunks
  studyRead: 2.4, // Study's entries are read
  zoomOut: 0.9, // the camera pulls back to the whole phone
  sentHold: 1.8, // the sent message holds
  endFade: 0.5, // the phone fades into the end card
  splash: 2.7, // the app's splash plays before the end card's line
  finalHold: 1.8, // the finished card holds on “a language.”
};

// ── 1. Titles ──
export const CHUNKS = ['How can texting', 'become', 'self-guided', 'language learning?'];
export const CHUNK_AT = CHUNKS.map((_, i) => D.titleStart + i * D.chunk);
export const TITLE1_OUT = CHUNK_AT[CHUNK_AT.length - 1] + 0.5 + D.titleHold;

export const LINE2_A = 'With an AI keyboard that turns your chats in ';
export const LINE2_SLOT = ['WhatsApp', 'Instagram', 'Any messaging app'];
export const LINE2_B = ' into a learning system.';
const L2_START = TITLE1_OUT + D.titleOut + 0.2;
/** Index of the last letter of "keyboard", which the typing pauses after. */
export const LINE2_A_PAUSE_AT = LINE2_A.indexOf('keyboard') + 'keyboard'.length - 1;
export const LINE2_A_TIMES = typeTimes(LINE2_A, L2_START, 0.04, 3, { [LINE2_A_PAUSE_AT]: D.keyboardPause });
/** The reel's first word types on, each word holds, then rolls to the next. */
export const LINE2_SLOT_TIMES = typeTimes(LINE2_SLOT[0], LINE2_A_TIMES[LINE2_A_TIMES.length - 1] + 0.12, 0.05, 5);
export const LINE2_LANDS: number[] = [LINE2_SLOT_TIMES[LINE2_SLOT_TIMES.length - 1] + 0.05];
for (let i = 1; i < LINE2_SLOT.length; i++) LINE2_LANDS.push(LINE2_LANDS[i - 1] + D.slotHold + D.slotRoll);
export const LINE2_B_TIMES = typeTimes(LINE2_B, LINE2_LANDS[LINE2_LANDS.length - 1] + 0.35, 0.04, 9);
export const LINE2_OUT = LINE2_B_TIMES[LINE2_B_TIMES.length - 1] + D.line2Hold;

// ── 2. The phone ──
export const WORLD_IN = LINE2_OUT + 0.2;
/** `hide`: when a narration bubble fades away on its own (typing starts). */
export type Bubble = { text: string; who: 'them' | 'me'; at: number; hide?: number };
export const BUBBLES: Bubble[] = [];

/** Camera framings: a target point (x across the 402pt column, h up from the
    keyboard's bottom edge) and a scale, resolved per frame by the film. */
export type View =
  | { kind: 'bubble'; i: number; scale: number }
  | { kind: 'caret'; scale: number }
  | { kind: 'button'; which: 'reword' | 'study'; scale: number }
  | { kind: 'field'; scale: number }
  | { kind: 'bubbleField'; i: number; scale: number }
  | { kind: 'study'; scale: number }
  | { kind: 'whole'; scale: number };
export const START_VIEW: View = { kind: 'bubble', i: 0, scale: 3.2 };
/** Camera moves: [start, end, to]. */
export const CAMERA: [number, number, View][] = [];
const move = (at: number, dur: number, to: View) => {
  CAMERA.push([at, at + dur, to]);
  return at + dur;
};
export const TYPE_ZOOM = 3.6;

/** The one message typed in the field: what you know, then what you want to
    learn, reworded to Spanish and sent. */
export const FIELD_KNOW = 'Hola como estas';
export const FIELD_ADD = ', how was your weekend?';
export const FIELD_EN = FIELD_KNOW + FIELD_ADD;
export const FIELD_ES = 'Hola, ¿cómo estás? ¿Qué tal tu fin de semana?';

let c = WORLD_IN + 0.4;
BUBBLES.push({ text: 'First, type what you know...', who: 'them', at: c });
/** The keyboard: down while each of the first two bubbles is read, then up a
    moment later, pushing the chat up. Each entry is [at, up]. */
export const KB: [number, boolean][] = [[c + D.kbWait, true]];
c = Math.max(c + D.readBubble, c + D.kbWait + D.kbSlide + 0.45);
c = move(c, D.pan, { kind: 'caret', scale: TYPE_ZOOM });
const KNOW_TIMES = typeTimes(FIELD_KNOW, c + 0.2, 0.075, 11);
BUBBLES[0].hide = KNOW_TIMES[0];
c = KNOW_TIMES[KNOW_TIMES.length - 1] + D.afterType + 0.2;
// Back up to the chat for the next bubble; the keyboard goes down with it.
KB.push([c, false]);
c = move(c, D.pan, { kind: 'bubble', i: 1, scale: 3.2 });
BUBBLES.push({ text: 'Then add what you want to learn...', who: 'them', at: c - 0.3 });
KB.push([c - 0.3 + D.kbWait, true]);
c = Math.max(c + D.readBubble, c - 0.3 + D.kbWait + D.kbSlide + 0.45);
c = move(c, D.pan, { kind: 'caret', scale: TYPE_ZOOM });
const ADD_TIMES = typeTimes(FIELD_ADD, c + 0.2, 0.065, 13);
BUBBLES[1].hide = ADD_TIMES[0];
c = ADD_TIMES[ADD_TIMES.length - 1] + D.afterType;
c = move(c, D.glide, { kind: 'button', which: 'reword', scale: TYPE_ZOOM });
export const REWORD_TAP = c + D.tapAfter;
export const REWORD_SWAP = REWORD_TAP + 0.22;
move(REWORD_TAP + 0.1, D.glide, { kind: 'field', scale: 2.2 });
c = REWORD_SWAP + D.readEs;
// Pull back to the whole phone and send the Spanish.
c = move(c, D.zoomOut, { kind: 'whole', scale: 1.6 });
export const SEND_TAP = c + 0.35;
export const SEND_AT = SEND_TAP + 0.17;
BUBBLES.push({ text: FIELD_ES, who: 'me', at: SEND_AT });
c = SEND_AT + D.sentHold;
// The study-guide line: the phone fades away and the line comes in chunk by
// chunk, as the headline does; the camera waits on Study for the phone's return.
export const NOTE_IN = c;
export const NOTE_CHUNKS = ['If you miss a word', 'we add it', 'to your study guide.'];
export const NOTE_AT = NOTE_CHUNKS.map((_, i) => NOTE_IN + D.noteFade + 0.1 + i * D.noteChunk);
export const NOTE_OUT = NOTE_AT[NOTE_AT.length - 1] + 0.5 + D.noteHold;
// The phone comes back once the line has gone, already on the open Study Guide:
// it opens, and the camera settles on it, while the phone is away.
move(NOTE_IN + D.noteFade, 0.01, { kind: 'study', scale: 1.9 });
export const STUDY_OPEN = NOTE_OUT;
export const STUDY_TAP = STUDY_OPEN; // no tap: it is simply open
export const STUDY_GROW = 0.01;
c = NOTE_OUT + 2 * D.noteFade + D.studyRead;
export const FIELD = {
  times: [...KNOW_TIMES, ...ADD_TIMES],
  rewordTap: REWORD_TAP,
  swap: REWORD_SWAP,
  sendTap: SEND_TAP,
  sendAt: SEND_AT,
};
export const WORLD_OUT = c;

/** Study's entries: the Spanish this message used that a learner would miss. */
export const STUDY_ROWS_DATA = [
  { entry: 'fin de semana', translations: 'weekend', sentence: '¿Qué tal tu fin de semana?', tag: 'Phrase', misses: 2 },
  { entry: '¿Qué tal...?', translations: 'how was...? / how is...?', sentence: '¿Qué tal tu día?', tag: 'Phrase', misses: 3 },
  { entry: 'estar', translations: 'to be (how you are)', sentence: '¿Cómo estás?', tag: 'Verb', misses: 2 },
  { entry: 'cómo', translations: 'how', sentence: '¿Cómo te fue?', tag: 'Adverb', misses: 1 },
  { entry: 'semana', translations: 'week', sentence: 'La semana pasada fue larga.', tag: 'Noun', misses: 1 },
  { entry: 'hola', translations: 'hello', sentence: '¡Hola! ¿Qué tal?', tag: 'Interjection', misses: 1 },
  { entry: 'tu', translations: 'your', sentence: '¿Cómo está tu familia?', tag: 'Determiner', misses: 1 },
];

// ── 3. The end card ──
export const ENDING = WORLD_OUT + D.endFade;
/** The end card's line, in chunks: the first on its own line, the other two
    (then the reel) on the second. */
export const END_CHUNKS = ['Your safety net to explore,', 'make mistakes,', 'and learn'];
export const END_CHUNK_AT = END_CHUNKS.map((_, i) => D.splash + i * D.endChunk);
export const LANGS = ['Spanish', 'Japanese', 'Mandarin', 'French', 'Korean', 'Portuguese', 'German', 'Arabic', 'a language.'];
/** When each language is up, from the card's start: the first lands as the
    line settles, and every language holds long enough to read as the reel
    scrolls through them all, easing in to land on "a language.". */
export const LANG_GAPS = [0.7, 0.6, 0.55, 0.5, 0.5, 0.55, 0.6, 0.75];
export const LANG_LANDS: number[] = [END_CHUNK_AT[END_CHUNK_AT.length - 1] + 0.6];
for (const g of LANG_GAPS) LANG_LANDS.push(LANG_LANDS[LANG_LANDS.length - 1] + g);
export const LANG_ROLL = 0.24;
export const DURATION = Math.ceil((ENDING + LANG_LANDS[LANG_LANDS.length - 1] + D.finalHold) * 2) / 2;

export function scenes() {
  // Inline timings for the Cut Room, as the chat film gives them: {text}
  // runs (`typed`, with `wordTimes`, when they type out letter by letter, so a
  // delay can go between any two words), {word} reel words, and timings
  // {key, kind, name, label, value, at}.
  const r2 = (x: number) => Math.round(x * 100) / 100;
  const r3 = (x: number) => Math.round(x * 1000) / 1000;
  const inline = (key: string, label: string, value: number, at: number, kind = 'delay', name = 'Delay') =>
    ({ key, kind, name, label, value: r2(value), at: r3(at) });
  /** Typed text whose characters land at times[offset...]. */
  const typed = (text: string, times: number[], offset = 0) => {
    const ends: number[] = [];
    const re = /\S+/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) ends.push(m.index + m[0].length - 1);
    return { text, typed: true, wordTimes: ends.slice(0, -1).map((e) => r3((times[offset + e] ?? 0) + 0.03)) };
  };
  const headlineFlow = [
    inline('title-start', `before “${CHUNKS[0]}”`, D.titleStart, 0),
    ...CHUNKS.flatMap((c, i) =>
      i < CHUNKS.length - 1 ? [{ text: c }, inline(`chunk-${i}`, `after “${c}”`, D.chunk, CHUNK_AT[i])] : [{ text: c }]),
    inline('title-hold', 'the full headline holds', D.titleHold, CHUNK_AT[CHUNK_AT.length - 1] + 0.5, 'hold', 'Hold'),
    inline('title-out', 'the headline fades out', D.titleOut, TITLE1_OUT, 'duration', 'Fade'),
  ];
  const reelStart = LINE2_SLOT_TIMES[0] - LINE2_A_TIMES[LINE2_A_TIMES.length - 1];
  const line2Flow = [
    typed(LINE2_A.slice(0, LINE2_A_PAUSE_AT + 1), LINE2_A_TIMES),
    inline('pause-keyboard', 'after “keyboard”', D.keyboardPause, LINE2_A_TIMES[LINE2_A_PAUSE_AT]),
    typed(LINE2_A.slice(LINE2_A_PAUSE_AT + 2).trimEnd(), LINE2_A_TIMES, LINE2_A_PAUSE_AT + 2),
    inline('reel-start', 'before the reel', reelStart, LINE2_A_TIMES[LINE2_A_TIMES.length - 1]),
    ...LINE2_SLOT.flatMap((w, i) =>
      i < LINE2_SLOT.length - 1
        ? [
            { word: w },
            inline(i === 0 ? 'reel-first' : `reel-each-${i}`, `on “${w}”`, D.slotHold, LINE2_LANDS[i], 'hold', 'Hold'),
            inline(`reel-roll-${i}`, `from “${w}” to “${LINE2_SLOT[i + 1]}”`, D.slotRoll, LINE2_LANDS[i] + D.slotHold, 'duration', 'Scroll'),
          ]
        : [{ word: w }]),
    inline('after-reel', `after “${LINE2_SLOT[LINE2_SLOT.length - 1]}”`, LINE2_B_TIMES[0] - LINE2_LANDS[LINE2_LANDS.length - 1], LINE2_LANDS[LINE2_LANDS.length - 1]),
    typed(LINE2_B, LINE2_B_TIMES),
    inline('line2-hold', 'the full line holds', D.line2Hold, LINE2_B_TIMES[LINE2_B_TIMES.length - 1], 'hold', 'Hold'),
    inline('line2-out', 'the line fades out', D.line2Out, LINE2_OUT, 'duration', 'Fade'),
  ];
  const endFlow = [
    inline('end-logo', 'before the line (the logo plays)', D.splash, ENDING),
    ...END_CHUNKS.flatMap((x, i) =>
      i < END_CHUNKS.length - 1 ? [{ text: x }, inline(`end-${i}`, `after “${x}”`, D.endChunk, ENDING + END_CHUNK_AT[i])] : [{ text: x }]),
    ...LANGS.flatMap((w, i) =>
      i < LANGS.length - 1
        ? [
            { word: w },
            inline(`lang-each-${i}`, `on “${w}”`, LANG_GAPS[i] - LANG_ROLL, ENDING + LANG_LANDS[i], 'hold', 'Hold'),
            inline(`lang-roll-${i}`, `from “${w}” to “${LANGS[i + 1]}”`, LANG_ROLL, ENDING + LANG_LANDS[i + 1] - LANG_ROLL, 'duration', 'Scroll'),
          ]
        : [{ word: w }]),
    inline('final-hold', `on “${LANGS[LANGS.length - 1]}”`, D.finalHold, ENDING + LANG_LANDS[LANG_LANDS.length - 1], 'hold', 'Hold'),
  ];
  const noteFlow = [
    inline('note-in', 'the phone fades out', D.noteFade, NOTE_IN, 'duration', 'Fade'),
    ...NOTE_CHUNKS.flatMap((x, i) =>
      i < NOTE_CHUNKS.length - 1 ? [{ text: x }, inline(`note-${i}`, `after “${x}”`, D.noteChunk, NOTE_AT[i])] : [{ text: x }]),
    inline('note-hold', 'the full line holds', D.noteHold, NOTE_AT[NOTE_AT.length - 1] + 0.5, 'hold', 'Hold'),
    inline('note-out', 'the line fades out', D.noteFade, NOTE_OUT, 'duration', 'Fade'),
  ];
  const list = [
    { id: 'title1', name: 'Headline: How can texting become self-guided…', start: 0,
      texts: [{ key: 'headline', label: 'Headline', text: CHUNKS.map((x) => `[${x}]`).join(' ') }], flows: [headlineFlow] },
    { id: 'title2', name: 'Typed: With an AI keyboard… [apps] …learning system.', start: TITLE1_OUT,
      texts: [{ key: 'line2', label: 'Typed line', text: `${LINE2_A}[${LINE2_SLOT.join(' / ')}]${LINE2_B}` }], flows: [line2Flow] },
    ...BUBBLES.map((b, i) => ({
      id: `b${i + 1}`,
      name: b.who === 'me' ? `Send: ${b.text}` : `${i + 1}. ${b.text}`,
      start: i === 0 ? WORLD_IN : b.who === 'me' ? CAMERA.find((x) => x[2].kind === 'whole')![0] : b.at - 0.2,
      texts: [{ key: `b${i + 1}`, label: b.who === 'me' ? 'Sent message' : 'Left bubble', text: b.text }],
      ...(i < 2 ? { flows: [[{ text: b.text }, inline(i === 0 ? 'kb-wait' : `kb-wait-${i + 1}`, 'before the keyboard comes up', D.kbWait, b.at)]] } : {}),
    })),
    { id: 'type1', name: `Type: ${FIELD_KNOW}`, start: CAMERA[0][0], texts: [{ key: 'know', label: 'Typed message', text: FIELD_KNOW }], flows: [[typed(FIELD_KNOW, KNOW_TIMES)]] },
    { id: 'type2', name: `Type: …${FIELD_ADD}`, start: CAMERA[2][0], texts: [{ key: 'add', label: 'Typed (added)', text: FIELD_ADD }], flows: [[typed(FIELD_ADD, ADD_TIMES)]] },
    { id: 'reword', name: 'Reword to Spanish', start: CAMERA[3][0], texts: [{ key: 'es', label: 'Reworded (Spanish)', text: FIELD_ES }] },
    { id: 'note', name: 'Text: If you miss a word, we add it to your study guide.', start: NOTE_IN,
      texts: [{ key: 'note', label: 'Text', text: NOTE_CHUNKS.map((x) => `[${x}]`).join(' ') }], flows: [noteFlow] },
    { id: 'study', name: 'The Study Guide, open', start: NOTE_OUT + D.noteFade, texts: [],
      flows: [[{ text: 'Study Guide' }, inline('study-read', 'the open Study Guide holds', D.studyRead, NOTE_OUT + 2 * D.noteFade, 'hold', 'Hold')]] },
    { id: 'end', name: 'End card', start: WORLD_OUT,
      texts: [{ key: 'line1', label: 'Line 1', text: `${END_CHUNKS.map((x) => `[${x}]`).join(' ')} [${LANGS.join(' / ')}]` }], flows: [endFlow] },
  ].sort((a, b) => a.start - b.start);
  return list.map((s, i) => ({ flows: [] as unknown[], ...s, delays: [], end: i + 1 < list.length ? list[i + 1].start : DURATION }));
}

export function cues() {
  return {
    scenes: scenes(),
    duration: DURATION,
    bpm: BPM,
    keys: [
      ...FIELD.times.map((t, i) => ({ t, space: FIELD_EN[i] === ' ' })),
      ...[...LINE2_A_TIMES, ...LINE2_SLOT_TIMES, ...LINE2_B_TIMES].map((t) => ({ t, space: true })),
    ],
    taps: [REWORD_TAP, SEND_TAP],
    reword: REWORD_SWAP,
    reveal: null,
    send: SEND_AT,
    sends: [SEND_AT],
    swipes: [],
    words: [...LINE2_LANDS, ...CHUNK_AT, ...NOTE_AT],
    ticks: LANG_LANDS.slice(1).map((x) => ENDING + x),
    pops: BUBBLES.map((b) => ({ t: b.at, who: b.who })),
    titles: [[0, WORLD_IN]],
    phones: [WORLD_IN],
    opening: [0, 0],
    closing: ENDING,
    studyFlick: null,
  };
}
