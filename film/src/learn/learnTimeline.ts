/**
 * The "self-guided learning" film (?film=learn): a portrait ad.
 *
 *   1. Titles: a headline in chunks, then a second line typed out with an
 *      inline reel of apps.
 *   2. The phone: narration bubbles above the field and keyboard, and a camera
 *      that moves between them: type what you know, add what you want to
 *      learn, Reword it to Spanish and send it; then the study-guide line in
 *      chunks while the phone steps away; then open Study.
 *   3. The end card: its line, ending on a reel of languages, then the
 *      app's logo animates in above it.
 *
 * Every time here is in seconds from the film's start. The world is laid out
 * in iOS points; heights are measured up from the keyboard's bottom edge.
 */

import { clamp01, easeInOutCubic } from '../ease';

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
  titleHold: 1.3, // the full headline holds
  titleStart: 0.5, // before the headline's first chunk
  titleOut: 0.5, // it fades away
  slotHold: 0.9, // each app in the headline's reel holds
  slotRoll: 0.32, // and rolls to the next
  line2Hold: 1.5, // the typed line holds once done
  line2Out: 0.4, // then fades away
  worldIn: 0.6, // the phone fades in
  readBubble: 1.6, // a narration bubble is read
  kbWait1: 2.0, // the first bubble shows alone before the keyboard comes up
  kbWait: 2.0, // and the second
  bubbleOut: 0.45, // a narration bubble fades away completely before typing starts
  kbSlide: 0.35, // the keyboard slides up
  pan: 1.0, // the camera moves between the chat and the field
  afterType: 0.5, // a typed run holds
  glide: 0.75, // the camera glides to a button
  tapAfter: 0.35, // then taps it
  readEs: 1.6, // the Spanish is read
  noteFade: 0.5, // the phone fades out for the study-guide line, and back
  noteChunk: 0.75, // between the study-guide line's chunks
  noteHold: 1.6, // the full study-guide line holds
  endChunk: 1.0, // between the end card's chunks
  langHold: 0.5, // each of the first three languages holds
  langFlick: 1.5, // then a flick spins through the rest and coasts onto the last
  studyPause: 2.0, // the open Study Guide is seen still, then
  studyFlick: 1.3, // flicked: a fast scroll that coasts to a stop
  studyRead: 1.0, // and the entries it lands on are read
  sentHold: 1.8, // the sent message holds
  endFade: 0.5, // the phone fades into the end card
  endLead: 0.4, // the end card's line starts once the phone has faded
  logoLen: 2.3, // the logo animates and types "Arcatext"
  endHold: 1.5, // the finished card (line, logo and name) holds
  finalHold: 1.5, // the finished card holds on “a language.”
};

// ── 1. Titles ──
export const CHUNKS = ['How can texting', 'become', 'self-guided', 'language learning?'];
export const CHUNK_AT = CHUNKS.map((_, i) => D.titleStart + i * D.chunk);
export const TITLE1_OUT = CHUNK_AT[CHUNK_AT.length - 1] + 0.5 + D.titleHold;

export const LINE2_A = 'By turning your chats in ';
export const LINE2_SLOT = ['WhatsApp', 'Instagram', 'any messaging app'];
export const LINE2_B = ' into a learning system.';
const L2_START = TITLE1_OUT + D.titleOut + 0.2;
export const LINE2_A_TIMES = typeTimes(LINE2_A, L2_START, 0.04, 3);
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
BUBBLES.push({ text: 'Type what you know...', who: 'them', at: c });
/** The keyboard: down while each of the first two bubbles is read, then up a
    moment later, pushing the chat up. Each entry is [at, up]. */
export const KB: [number, boolean][] = [[c + D.kbWait1, true]];
// The first bubble is seen alone; then, together, the keyboard fades in, the
// bubble fades out and the camera moves to the field; then typing starts.
c += D.kbWait1;
BUBBLES[0].hide = c;
c = move(c, D.pan, { kind: 'caret', scale: TYPE_ZOOM });
const KNOW_TIMES = typeTimes(FIELD_KNOW, Math.max(c, BUBBLES[0].hide + D.bubbleOut) + 0.1, 0.075, 11);
c = KNOW_TIMES[KNOW_TIMES.length - 1] + D.afterType + 0.2;
// Back up to the chat for the next bubble; the keyboard goes down with it.
KB.push([c, false]);
c = move(c, D.pan, { kind: 'bubble', i: 1, scale: 3.2 });
BUBBLES.push({ text: 'Or something you don’t know...', who: 'them', at: c - 0.3 });
KB.push([c - 0.3 + D.kbWait, true]);
c = Math.max(c + D.readBubble, c - 0.3 + D.kbWait + D.kbSlide + 0.45);
c = move(c, D.pan, { kind: 'caret', scale: TYPE_ZOOM });
BUBBLES[1].hide = c;
const ADD_TIMES = typeTimes(FIELD_ADD, c + D.bubbleOut + 0.1, 0.065, 13);
c = ADD_TIMES[ADD_TIMES.length - 1] + D.afterType;
c = move(c, D.glide, { kind: 'button', which: 'reword', scale: TYPE_ZOOM });
export const REWORD_TAP = c + D.tapAfter;
export const REWORD_SWAP = REWORD_TAP + 0.22;
move(REWORD_TAP + 0.1, D.glide, { kind: 'field', scale: 2.2 });
c = REWORD_SWAP + D.readEs;
// Send the Spanish from where the camera already is, on the field.
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
/** The flick down the open Study Guide, once the phone is back. */
export const STUDY_FLICK = NOTE_OUT + 2 * D.noteFade + D.studyPause;
c = STUDY_FLICK + D.studyFlick + D.studyRead;
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
  { entry: 'quedar', translations: 'to meet up', sentence: '¿Quedamos el sábado?', tag: 'Verb', misses: 3 },
  { entry: 'me apetece', translations: 'I feel like', sentence: 'Me apetece un café.', tag: 'Phrase', misses: 2 },
  { entry: 'ahora mismo', translations: 'right now', sentence: 'Voy ahora mismo.', tag: 'Phrase', misses: 2 },
  { entry: 'nos vemos', translations: 'see you', sentence: '¡Nos vemos mañana!', tag: 'Phrase', misses: 1 },
  { entry: 'pues', translations: 'well / so', sentence: 'Pues no sé.', tag: 'Interjection', misses: 1 },
  { entry: 'cansado', translations: 'tired', sentence: 'Estoy muy cansado.', tag: 'Adjective', misses: 1 },
  { entry: 'genial', translations: 'great', sentence: '¡Qué genial!', tag: 'Adjective', misses: 1 },
];

// ── 3. The end card ──
export const ENDING = WORLD_OUT + D.endFade;
/** The end card's line, in chunks: the first two share a line, then one
    line each for the third and for the last (with the reel). */
export const END_CHUNKS = ['Type,', 'make mistakes,', 'get corrections,', 'and learn'];
export const END_CHUNK_AT = END_CHUNKS.map((_, i) => D.endLead + i * D.endChunk);
/** Every language Reword offers (Arcatext/Data/LanguageData.swift on main,
    the top-level names with their parentheticals dropped). */
const REWORD_LANGS = [
  'Afrikaans', 'Albanian', 'Arabic', 'Armenian', 'Azerbaijani', 'Basque', 'Bengali', 'Bosnian',
  'Bulgarian', 'Cantonese', 'Catalan', 'Croatian', 'Czech', 'Danish', 'Dari-Persian', 'Dutch',
  'Egyptian Arabic', 'English', 'Esperanto', 'Estonian', 'Filipino', 'Finnish', 'Flemish',
  'French', 'Galician', 'German', 'Greek', 'Gujarati', 'Haitian Creole', 'Hausa', 'Hebrew',
  'Hindi', 'Hungarian', 'Icelandic', 'Indonesian', 'Irish', 'Italian', 'Japanese', 'Kannada',
  'Kazakh', 'Khmer', 'Korean', 'Kurdish', 'Latin', 'Malay', 'Mandarin', 'Norwegian', 'Pashto',
  'Persian', 'Polish', 'Portuguese', 'Punjabi', 'Romanian', 'Russian', 'Serbian', 'Slovak',
  'Slovenian', 'Spanish', 'Swahili', 'Swedish', 'Tagalog', 'Tamil', 'Telugu', 'Thai', 'Turkish',
  'Ukrainian', 'Urdu', 'Uzbek', 'Valencian', 'Vietnamese', 'Welsh',
];
/** The reel: three to start, then the rest of Reword's list, then the landing. */
const LANG_FIRST = ['English', 'Spanish', 'Mandarin'];
export const LANGS = [...LANG_FIRST, ...REWORD_LANGS.filter((x) => !LANG_FIRST.includes(x)), 'a language.'];
/** The reel: the first three languages land one by one and hold, then a flick
    spins through the rest and coasts to a stop on "a language.". Times are
    from the card's start. */
export const LANG_SHOWN = 3;
export const LANG_ROLL = 0.24;
export const LANG_LANDS: number[] = [END_CHUNK_AT[END_CHUNK_AT.length - 1] + 0.6];
for (let i = 1; i < LANG_SHOWN; i++) LANG_LANDS.push(LANG_LANDS[i - 1] + D.langHold + LANG_ROLL);
export const LANG_FLICK_AT = LANG_LANDS[LANG_SHOWN - 1] + D.langHold;
export const LANG_END = LANG_FLICK_AT + D.langFlick;
const flickEase = (x: number) => 1 - Math.pow(1 - x, 4);
/** Where the reel stands, in languages (fractional while it moves). */
export function langPos(local: number) {
  let p = 0;
  for (let i = 1; i < LANG_SHOWN; i++) p += clamp01(easeInOutCubic((local - (LANG_LANDS[i] - LANG_ROLL)) / LANG_ROLL));
  return p + (LANGS.length - LANG_SHOWN) * flickEase(clamp01((local - LANG_FLICK_AT) / D.langFlick));
}
/** When the reel passes each language after the first, for the soundtrack's
    ticks (thinned so the fast part of the flick is a run of clicks, not a buzz). */
const LANG_PASS_ALL = LANGS.slice(1).map((_, k) => {
  const n = k + 1;
  if (n < LANG_SHOWN) return LANG_LANDS[n] - LANG_ROLL / 2;
  const f = (n - (LANG_SHOWN - 1)) / (LANGS.length - LANG_SHOWN);
  return LANG_FLICK_AT + (1 - Math.pow(1 - f, 1 / 4)) * D.langFlick;
});
const LANG_PASS: number[] = [];
for (const [i, t] of LANG_PASS_ALL.entries()) {
  const last = LANG_PASS[LANG_PASS.length - 1];
  if (last === undefined || t - last >= 0.07 || i === LANG_PASS_ALL.length - 1) LANG_PASS.push(t);
}

/** The logo plays once the reel has landed and held on "a language.". */
export const LOGO_AT = LANG_END + D.finalHold;
export const DURATION = Math.ceil((ENDING + LOGO_AT + D.logoLen + D.endHold) * 2) / 2;

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
    typed(LINE2_A.trimEnd(), LINE2_A_TIMES),
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
    inline('end-lead', 'before the line', D.endLead, ENDING),
    ...END_CHUNKS.flatMap((x, i) =>
      i < END_CHUNKS.length - 1 ? [{ text: x }, inline(`end-${i}`, `after “${x}”`, D.endChunk, ENDING + END_CHUNK_AT[i])] : [{ text: x }]),
    ...LANGS.slice(0, LANG_SHOWN).flatMap((w, i) => [
      { word: w },
      inline(`lang-each-${i}`, `on “${w}”`, D.langHold, ENDING + LANG_LANDS[i], 'hold', 'Hold'),
      ...(i < LANG_SHOWN - 1 ? [inline(`lang-roll-${i}`, `from “${w}” to “${LANGS[i + 1]}”`, LANG_ROLL, ENDING + LANG_LANDS[i + 1] - LANG_ROLL, 'duration', 'Scroll')] : []),
    ]),
    inline('lang-flick', 'through the rest', D.langFlick, ENDING + LANG_FLICK_AT, 'duration', 'Flick'),
    ...LANGS.slice(LANG_SHOWN).map((w) => ({ word: w })),
    inline('final-hold', `on “${LANGS[LANGS.length - 1]}”, before the logo`, D.finalHold, ENDING + LANG_END, 'hold', 'Hold'),
    { text: 'Arcatext (logo)' },
    inline('end-hold', 'the finished card holds', D.endHold, ENDING + LOGO_AT + D.logoLen, 'hold', 'Hold'),
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
    { id: 'title2', name: 'Typed: By turning your chats in [apps] into a learning system.', start: TITLE1_OUT,
      texts: [{ key: 'line2', label: 'Typed line', text: `${LINE2_A}[${LINE2_SLOT.join(' / ')}]${LINE2_B}` }], flows: [line2Flow] },
    ...BUBBLES.map((b, i) => ({
      id: `b${i + 1}`,
      name: b.who === 'me' ? `Send: ${b.text}` : `${i + 1}. ${b.text}`,
      start: i === 0 ? WORLD_IN : b.who === 'me' ? SEND_TAP - 0.35 : b.at - 0.2,
      texts: [{ key: `b${i + 1}`, label: b.who === 'me' ? 'Sent message' : 'Left bubble', text: b.text }],
      ...(i < 2 ? { flows: [[{ text: b.text }, inline(i === 0 ? 'kb-wait' : `kb-wait-${i + 1}`, 'before the keyboard comes up', i === 0 ? D.kbWait1 : D.kbWait, b.at)]] } : {}),
    })),
    { id: 'type1', name: `Type: ${FIELD_KNOW}`, start: CAMERA[0][0], texts: [{ key: 'know', label: 'Typed message', text: FIELD_KNOW }], flows: [[typed(FIELD_KNOW, KNOW_TIMES)]] },
    { id: 'type2', name: `Type: …${FIELD_ADD}`, start: CAMERA[2][0], texts: [{ key: 'add', label: 'Typed (added)', text: FIELD_ADD }], flows: [[typed(FIELD_ADD, ADD_TIMES)]] },
    { id: 'reword', name: 'Reword to Spanish', start: CAMERA[3][0], texts: [{ key: 'es', label: 'Reworded (Spanish)', text: FIELD_ES }] },
    { id: 'note', name: 'Text: If you miss a word, we add it to your study guide.', start: NOTE_IN,
      texts: [{ key: 'note', label: 'Text', text: NOTE_CHUNKS.map((x) => `[${x}]`).join(' ') }], flows: [noteFlow] },
    { id: 'study', name: 'The Study Guide, open', start: NOTE_OUT + D.noteFade, texts: [],
      flows: [[{ text: 'Study Guide' }, inline('study-pause', 'before the flick', D.studyPause, NOTE_OUT + 2 * D.noteFade, 'hold', 'Hold'),
        inline('study-flick', 'the flick', D.studyFlick, STUDY_FLICK, 'duration', 'Scroll'), inline('study-read', 'after the flick', D.studyRead, STUDY_FLICK + D.studyFlick, 'hold', 'Hold')]] },
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
    ticks: LANG_PASS.map((x) => ENDING + x),
    pops: BUBBLES.map((b) => ({ t: b.at, who: b.who })),
    titles: [[0, WORLD_IN]],
    phones: [WORLD_IN],
    opening: [0, 0],
    closing: ENDING + LOGO_AT,
    studyFlick: null,
  };
}
