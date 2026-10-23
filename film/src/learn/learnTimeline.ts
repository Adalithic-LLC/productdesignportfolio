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

const params = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');
/** Portrait (1080x1920, the 9:16 ad) with ?portrait; otherwise 16:9 (1920x1080). */
export const PORTRAIT = params.has('portrait');
export const FRAME = PORTRAIT ? { w: 1080, h: 1920 } : { w: 1920, h: 1080 };
/** Where the action sits. Portrait keeps to the platforms' safe area for a
    9:16 ad (as the chat film's portrait cut); landscape centres on the frame.
    `w` is the text column and the camera's framing width in both, so lines
    wrap and close-ups frame the same way. */
export const STAGE = PORTRAIT ? { cx: 500, cy: 800, w: 860 } : { cx: 960, cy: 540, w: 860 };
/** Landscape has about half the room under the framing point, so its camera
    pulls back by this much on every shot. */
/** The opening: Arcatext 01's headline titles (the default), none at all
    (`?cut=noopen`: the film starts on the phone), or Arcatext 02's avatar
    cloud and text block (`?cut=a02`). Everything after keeps its order and
    spacing. */
const CUT = params.get('cut');
/** Arcatext 03 (`?cut=a03`) reuses Arcatext 02's avatar-cloud opener with its
    own question, then plays its own film (a03/). */
export const A03 = CUT === 'a03';
export const OPEN_KIND: 'titles' | 'none' | 'avatars' = CUT === 'noopen' ? 'none' : CUT === 'a02' || A03 ? 'avatars' : 'titles';
export const OPENING = OPEN_KIND === 'titles';
export const AVATARS = OPEN_KIND === 'avatars';
export const CAM_K = PORTRAIT ? 1 : +(params.get('camk') || 0.72);
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
  line2Hold: 2.2, // the typed line holds once done
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
  endChunk0: 1.0, // after its first chunk (Arcatext 02's is a longer line)
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
  checkCard1: 5.0, // Arcatext 02's Check scene: the first card is read (the reverse translation lit)
  checkCard2: 4.2, // the second card is read while Check scrolls to the synonyms
  avBurst: 2.6, // Arcatext 02: the avatars burst out from the point
  avHold: 1.5, // “You text a lot of people” holds in the cloud
  avCollapse: 1.0, // the cloud and the line collapse back into the point
  blockLine1: 4.6, // the first text card is read, fades, and the next comes in
  blockLine2: 4.6, // and the one after (when there are more)
  blockHold: 6.0, // the last card is read and holds
  kbWaitTry: 2.0, // Arcatext 02: “Something you want to try...” shows alone before the keyboard comes up
  type1Len: 0, // Arcatext 02: the whole “Hola como estas” step, when set (0: natural pace)
  tryLen: 0, // and the “finde semaña” step
  readTry: 1.6, // “Something you want to try...” is read
  kbWait3: 2.0, // “Or something you don’t know...” shows alone before the keyboard comes up
  addLen: 0, // Arcatext 02: the whole “, how was it?” step, when set (0: natural pace)
  rewordLen: 0, // Arcatext 02: the whole Reword step, glide to tap to the Spanish read, when set
  headLead: 1.6, // Arcatext 02: “Translate, then send it.” is read before the Reword tap
  headRead: 0.9, // the Spanish is seen before the send
  headSent: 0.8, // the sent message holds before Check
};
/** Arcatext 02's own retimes (Cut Room notes on its cut); 01 keeps the above. */
if (AVATARS) Object.assign(D, { endChunk0: 2.4, kbWait1: 1.5, kbWaitTry: 1.0, readTry: 1.5, kbWait3: 1.0, addLen: 2.0, rewordLen: 2.0, type1Len: 2.0, tryLen: 2.0, langHold: 0.5, langFlick: 1.0, finalHold: 1.0, endHold: 1.0 });

/** Times for `text` typed so its step lasts `len` from `step`: typing starts
    `lead` in (the bubble fading, the camera moving) and the step ends `tail`
    after the last key plus the half second the next bubble's scene starts
    early. The natural rhythm is kept, scaled to fit. */
function fitTimes(text: string, step: number, len: number, seed: number, pauses: Record<number, number> = {}, lead = 0.45, tail = 0.3, early = 0.5) {
  const raw = typeTimes(text, 0, 0.075, seed, pauses);
  const span = Math.max(0.3, len - lead - tail - early);
  const k = span / raw[raw.length - 1];
  return { times: raw.map((x) => step + lead + x * k), end: step + lead + span + tail };
}

// ── 1. Titles ──
export const CHUNKS = ['How can texting', 'become', 'self-guided', 'language learning?'];
export const CHUNK_AT = CHUNKS.map((_, i) => D.titleStart + i * D.chunk);
export const TITLE1_OUT = CHUNK_AT[CHUNK_AT.length - 1] + 0.5 + D.titleHold;

export const LINE2_A = 'By turning your chats in ';
export const LINE2_SLOT = ['WhatsApp', 'Instagram', 'AI', 'really...any messaging app'];
export const LINE2_B = ' into a learning system.';
const L2_START = TITLE1_OUT + D.titleOut + 0.2;
export const LINE2_A_TIMES = typeTimes(LINE2_A, L2_START, 0.04, 3);
/** The reel's first word types on, each word holds, then rolls to the next. */
export const LINE2_SLOT_TIMES = typeTimes(LINE2_SLOT[0], LINE2_A_TIMES[LINE2_A_TIMES.length - 1] + 0.12, 0.05, 5);
export const LINE2_LANDS: number[] = [LINE2_SLOT_TIMES[LINE2_SLOT_TIMES.length - 1] + 0.05];
for (let i = 1; i < LINE2_SLOT.length; i++) LINE2_LANDS.push(LINE2_LANDS[i - 1] + D.slotHold + D.slotRoll);
export const LINE2_B_TIMES = typeTimes(LINE2_B, LINE2_LANDS[LINE2_LANDS.length - 1] + 0.35, 0.04, 9);
export const LINE2_OUT = LINE2_B_TIMES[LINE2_B_TIMES.length - 1] + D.line2Hold;

// ── 1b. Arcatext 02's opening: the avatar cloud, then the text block ──
/** A point appears and bursts into a slow, turning cloud of contact avatars;
    the line types out in a clearing it makes for itself; then everything
    collapses back into the point. */
export const AV_POINT = 0.15;
export const AV_BURST = 0.6;
export const AV_TEXT = A03 ? 'You only need 1000 words to communicate in a new language.' : 'Have you tried texting to learn a language?';
/** The typed line keeps pace with its voiceover: when each word is spoken
    (seconds after speech starts), read from the Enceladus take, plus its end.
    Each word types out across its own span; the space lands just before the
    next word. */
const AV_WORD_AT = A03
  ? [0, 0.48, 0.76, 1.04, 1.94, 2.34, 2.6, 3.02, 3.22, 3.42, 3.54, 3.9]
  : [0, 0.16, 0.32, 0.56, 1.0, 1.12, 1.36, 1.46, 1.98];
function spokenTimes(text: string, start: number, wordAt: number[]) {
  const out: number[] = [];
  const words = text.split(' ');
  words.forEach((w, i) => {
    const a = start + wordAt[i];
    const b = start + (wordAt[i + 1] ?? wordAt[i] + 0.4) - 0.04;
    [...w].forEach((_, k) => out.push(a + ((b - a) * k) / Math.max(1, w.length)));
    if (i < words.length - 1) out.push(start + wordAt[i + 1] - 0.02);
  });
  return out;
}
export const AV_TYPE_TIMES = AV_WORD_AT.length === AV_TEXT.split(' ').length + 1
  ? spokenTimes(AV_TEXT, AV_BURST + 1.3, AV_WORD_AT)
  : typeTimes(AV_TEXT, AV_BURST + 1.3, 0.062, 17);
export const AV_COLLAPSE = AV_TYPE_TIMES[AV_TYPE_TIMES.length - 1] + D.avHold;
/** Everything is back in the point; it winks out at AV_END. */
export const AV_GONE = AV_COLLAPSE + D.avCollapse;
export const AV_END = AV_GONE + 0.35;
/** Text cards, one at a time: each fades out before the next comes in. */
export const BLOCK_LINES = [
  'You could be learning more from each message.',
  'Arcatext adds contextual translations, synonyms, and a study guide built from your chats.',
];
/** A card fades out over this, ending just before the next one starts. */
export const BLOCK_FADE = 0.5;
const BLOCK_GAPS = [D.blockLine1, D.blockLine2];
/** When each line of the block comes in (any number of lines). */
export const BLOCK_AT = BLOCK_LINES.map((_, i) => AV_END + 0.3 + BLOCK_GAPS.slice(0, i).reduce((a, b) => a + b, 0));
export const BLOCK_OUT = BLOCK_AT[BLOCK_AT.length - 1] + D.blockHold;

// ── 2. The phone ──
export const WORLD_IN = OPENING ? LINE2_OUT + 0.2 : AVATARS ? BLOCK_OUT + D.titleOut + 0.2 : 0.2;
/** `hide`: when a narration bubble fades away on its own (typing starts). */
export type Bubble = { text: string; who: 'them' | 'me'; at: number; hide?: number; key?: string; wait?: number };
export const BUBBLES: Bubble[] = [];

/** Camera framings: a target point (x across the 402pt column, h up from the
    keyboard's bottom edge) and a scale, resolved per frame by the film. */
export type View =
  | { kind: 'bubble'; i: number; scale: number }
  | { kind: 'caret'; scale: number }
  /** The whole text box, held still while it fills (`until`: typing ends). */
  | { kind: 'typing'; until: number }
  | { kind: 'button'; which: 'reword' | 'study'; scale: number }
  | { kind: 'field'; scale: number }
  | { kind: 'bubbleField'; i: number; scale: number }
  | { kind: 'study'; scale: number }
  /** The open Study Guide alone, set below (9:16) or beside (16:9) the note. */
  | { kind: 'studyNote'; scale: number }
  /** The field and keyboard, set beside a headline as the Study Guide is. */
  | { kind: 'fieldNote'; scale: number }
  | { kind: 'whole'; scale: number }
  /** One still shot (Arcatext 02's bubbles and typing): `h` up from the
      keyboard's bottom edge, scaled so `span` points of height and the whole
      text field fit. */
  | { kind: 'fixed'; h: number; span: number };
/** Arcatext 02 holds one still shot from the first bubble until the Reword
    tap: the whole field, the bubbles above it and the keyboard, with no zooms
    or pans while the keyboard goes down and up. */
export const HOLD_CAM = AVATARS;
export const START_VIEW: View = HOLD_CAM ? { kind: 'fixed', h: 225, span: 450 } : { kind: 'bubble', i: 0, scale: 3.2 };
/** Camera moves: [start, end, to]. */
export const CAMERA: [number, number, View][] = [];
const move = (at: number, dur: number, to: View) => {
  CAMERA.push([at, at + dur, to]);
  return at + dur;
};
/** A move in the bubbles-and-typing stretch: Arcatext 02 keeps its still
    shot, so only the time passes. */
const camMove = (at: number, dur: number, to: View) => (HOLD_CAM ? at + dur : move(at, dur, to));
export const TYPE_ZOOM = 3.6;

/** The one message typed in the field: what you know, then what you want to
    learn, reworded to Spanish and sent. */
export const FIELD_KNOW = 'Hola como estas';
/** Arcatext 02 already said "finde semaña", so it asks just ", how was it?". */
export const FIELD_ADD = AVATARS ? ', how was it?' : ', how was your weekend?';
/** Arcatext 02 adds a middle step: something you want to try, typed as a
    learner would (with a pause before the word you are unsure of). */
export const FIELD_TRY = AVATARS ? ' finde semaña' : '';
export const FIELD_EN = FIELD_KNOW + FIELD_TRY + FIELD_ADD;
export const FIELD_ES = 'Hola, ¿cómo estás? ¿Qué tal tu fin de semana?';

let c = WORLD_IN + 0.4;
BUBBLES.push({ text: 'Type what you know...', who: 'them', at: c, key: 'bubble-1' });
/** The keyboard: down while each of the first two bubbles is read, then up a
    moment later, pushing the chat up. Each entry is [at, up]. */
export const KB: [number, boolean][] = [[c + D.kbWait1, true]];
// The first bubble is seen alone; then, together, the keyboard fades in, the
// bubble fades out and the camera moves to the field; then typing starts.
c += D.kbWait1;
BUBBLES[0].hide = c;
export const TYPE1_START = c;
c = camMove(c, D.pan, { kind: 'caret', scale: TYPE_ZOOM });
let KNOW_TIMES = typeTimes(FIELD_KNOW, Math.max(c, BUBBLES[0].hide + D.bubbleOut) + 0.1, 0.075, 11);
c = KNOW_TIMES[KNOW_TIMES.length - 1] + D.afterType + 0.2;
if (D.type1Len) ({ times: KNOW_TIMES, end: c } = fitTimes(FIELD_KNOW, TYPE1_START, D.type1Len, 11));
/** Back up to the chat for a narration bubble (the keyboard goes down with
    it, then comes back up); returns its index. */
/** Arcatext 02 keeps the keyboard up through the whole exchange once it is
    up: the later bubbles appear above the field without it going down. */
const KEEP_KB = AVATARS;
const askBubble = (text: string, key: string, wait = D.kbWait, read = D.readBubble) => {
  if (!KEEP_KB) KB.push([c, false]);
  c = camMove(c, D.pan, { kind: 'bubble', i: BUBBLES.length, scale: 3.2 });
  BUBBLES.push({ text, who: 'them', at: c - 0.3, key, wait });
  if (!KEEP_KB) KB.push([c - 0.3 + wait, true]);
  c = Math.max(c + read, c - 0.3 + wait + D.kbSlide + 0.45);
  return BUBBLES.length - 1;
};
let TRY_TIMES: number[] = [];
export let TRY_START = 0;
if (FIELD_TRY) {
  const i = askBubble('Something you want to try...', 'bubble-try', D.kbWaitTry, D.readTry);
  TRY_START = c;
  c = camMove(c, D.pan, { kind: 'caret', scale: TYPE_ZOOM });
  BUBBLES[i].hide = c;
  const unsure = { [FIELD_TRY.indexOf('semaña') - 1]: 0.35 };
  TRY_TIMES = typeTimes(FIELD_TRY, c + D.bubbleOut + 0.1, 0.085, 7, unsure);
  c = TRY_TIMES[TRY_TIMES.length - 1] + D.afterType + 0.2;
  if (D.tryLen) {
    // A short step: the bubble fades as the camera leaves it.
    BUBBLES[i].hide = TRY_START;
    ({ times: TRY_TIMES, end: c } = fitTimes(FIELD_TRY, TRY_START, D.tryLen, 7, unsure));
  }
}
const DONT_KNOW = askBubble('Or something you don’t know...', 'bubble-2', D.kbWait3);
export const TYPE2_START = c;
// The longer half is typed with the whole text box in frame, so the camera
// holds still instead of panning after the caret and across the line break.
const ADD_START = c + D.pan;
let ADD_TIMES = typeTimes(FIELD_ADD, ADD_START + D.bubbleOut + 0.1, 0.065, 13);
// A short step (Arcatext 02): typing starts while the camera settles, and the
// bubble fades as the camera leaves it.
const addFit = D.addLen ? fitTimes(FIELD_ADD, c, D.addLen, 13, {}, 0.55, 0.3, 0) : null;
if (addFit) ADD_TIMES = addFit.times;
c = camMove(c, D.pan, { kind: 'typing', until: ADD_TIMES[ADD_TIMES.length - 1] });
BUBBLES[DONT_KNOW].hide = addFit ? TYPE2_START : c;
c = addFit ? addFit.end : ADD_TIMES[ADD_TIMES.length - 1] + D.afterType;
export const REWORD_START = c;
/** Arcatext 02: a headline comes in just before the Reword tap, the phone
    set beside it (as for Check and the Study Guide); the Spanish lands and is
    sent at once, a quick send before Check. */
export const HEAD = AVATARS ? 'Reword, then send it.' : '';
let rwTap: number;
let rwSwap: number;
let quickTap = Infinity;
if (HEAD) {
  move(c, 0.9, { kind: 'fieldNote', scale: 1.9 });
  rwTap = c + D.headLead;
  rwSwap = rwTap + 0.15;
  quickTap = rwSwap + D.headRead;
  c = quickTap + 0.17 + D.headSent;
} else {
  // A short Reword: a quicker glide and tap, and the Spanish lands while the
  // camera pulls back rather than after.
  const RW = D.rewordLen ? { glide: 0.5, tap: 0.25, back: 0.6, swap: 0.15 } : { glide: D.glide, tap: D.tapAfter, back: D.glide, swap: 0.1 + D.glide + 0.05 };
  c = move(c, RW.glide, { kind: 'button', which: 'reword', scale: TYPE_ZOOM });
  rwTap = c + RW.tap;
  // The camera pulls back to the field; the reword plays once it is there.
  move(rwTap + 0.1, RW.back, { kind: 'field', scale: 2.2 });
  rwSwap = rwTap + RW.swap;
  c = D.rewordLen ? REWORD_START + D.rewordLen : rwSwap + D.readEs;
}
export const REWORD_TAP = rwTap;
export const REWORD_SWAP = rwSwap;
export const HEAD_AT = REWORD_START + 0.3;
export const HEAD_OUT = c;
/** Arcatext 02, before sending: the Check page, set beside its text cards
    as the Study Guide is later. The chat, field and bottom row fade, the
    keyboard opens into Check (already loaded) with the reverse translation
    lit; when the second card starts, Check scrolls to the synonyms. The
    message is never sent: Check hands straight over to the Study Guide. */
export const CHECK = AVATARS;
export const CHECK_CARDS = ['A reverse translation lets you check if it’s what you actually wanted to say.', 'And while you’re here, get synonyms of your message.'];
export const CHECK_IN = c;
export const CHECK_AT = [c + 0.5, c + 0.5 + D.checkCard1];
export const CHECK_OUT = CHECK ? CHECK_AT[1] + D.checkCard2 : c;
/** Whether the message is sent (Arcatext 01); 02 cut the send. */
export const SEND = !CHECK;
if (CHECK) {
  move(CHECK_IN, 0.9, { kind: 'studyNote', scale: 1.9 });
  c = SEND ? move(CHECK_OUT, 0.9, { kind: 'field', scale: 2.2 }) + 0.3 : CHECK_OUT;
}
// Send the Spanish from where the camera already is, on the field (or, in
// Arcatext 02, the quick send under the headline).
export const SEND_TAP = HEAD ? quickTap : SEND ? c + 0.35 : Infinity;
export const SEND_AT = SEND_TAP + 0.17;
if (HEAD) BUBBLES.push({ text: FIELD_ES, who: 'me', at: SEND_AT });
if (SEND) {
  BUBBLES.push({ text: FIELD_ES, who: 'me', at: SEND_AT });
  c = SEND_AT + D.sentHold;
}
// The study-guide line: the phone fades away and the line comes in chunk by
// chunk, as the headline does; the camera waits on Study for the phone's return.
export const NOTE_IN = c;
export const NOTE_CHUNKS = ['If you miss a word', 'we add it', 'to your study guide.'];
export const NOTE_AT = NOTE_CHUNKS.map((_, i) => NOTE_IN + D.noteFade + 0.1 + i * D.noteChunk);
/** Arcatext 02 shows the line and the open Study Guide together: the phone
    stays, its chat, field and bottom row fade away, and the keyboard opens
    into the Study Guide beside the line. Arcatext 01 steps the phone away for
    the line, then brings it back on the Study Guide. */
export const NOTE_WITH_STUDY = AVATARS;
const NOTE_DONE = NOTE_AT[NOTE_AT.length - 1] + 0.5;
if (NOTE_WITH_STUDY) move(NOTE_IN, 0.9, { kind: 'studyNote', scale: 1.9 });
else move(NOTE_IN + D.noteFade, 0.01, { kind: 'study', scale: 1.9 });
export const STUDY_OPEN = NOTE_WITH_STUDY ? NOTE_IN + 0.15 : NOTE_DONE + D.noteHold;
export const STUDY_TAP = STUDY_OPEN; // no tap: it is simply open
export const STUDY_GROW = NOTE_WITH_STUDY ? 0.6 : 0.01;
/** The flick down the open Study Guide, once it is in view. */
export const STUDY_FLICK = NOTE_WITH_STUDY ? NOTE_DONE + 0.6 : NOTE_DONE + D.noteHold + 2 * D.noteFade + D.studyPause;
c = STUDY_FLICK + D.studyFlick + D.studyRead;
/** When the line leaves: on its own (01), or with the phone at the end (02). */
export const NOTE_OUT = NOTE_WITH_STUDY ? c : NOTE_DONE + D.noteHold;
export const FIELD = {
  times: [...KNOW_TIMES, ...TRY_TIMES, ...ADD_TIMES],
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
export const END_CHUNKS = [AVATARS ? 'Use Arcatext to chat in any app,' : 'Type,', 'make mistakes,', 'get corrections,', 'and learn'];
export const END_CHUNK_AT = END_CHUNKS.map((_, i) => D.endLead + (i ? D.endChunk0 + (i - 1) * D.endChunk : 0));
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

// ── Voiceover ──
/** One spoken line of the optional voiceover. It starts exactly when its text
    appears (`at`) and must be finished by `until` (the next line, or its text
    leaving). `marks` are when each chunk of it is revealed, so a voice with
    word timings can be warped to land each chunk as it appears. Built from
    the constants above, so a copy or timing change carries into the script. */
export type VoiceLine = { key: string; text: string; at: number; until: number; marks: { text: string; at: number }[] };
const spoken = (x: string) => x.replace(/\.\.\.$|…$/, '').trim();
const BUBBLE_LINES = BUBBLES.filter((b) => b.who === 'them');
const LINE2_A_AT = LINE2_A_TIMES[0];
const OPENING_LINES: VoiceLine[] = [
  { key: 'headline', text: CHUNKS.join(' '), at: CHUNK_AT[0], until: TITLE1_OUT, marks: CHUNKS.map((x, i) => ({ text: x, at: CHUNK_AT[i] })) },
  { key: 'line2-a', text: `${LINE2_A.trim()} ${LINE2_SLOT[0]},`, at: LINE2_A_AT, until: LINE2_LANDS[1] - D.slotRoll / 2, marks: [{ text: LINE2_A.trim(), at: LINE2_A_AT }, { text: LINE2_SLOT[0], at: LINE2_SLOT_TIMES[0] }] },
  ...LINE2_SLOT.slice(1, -1).map((x, k) => ({ key: `line2-slot-${k + 1}`, text: `${x},`, at: LINE2_LANDS[k + 1] - D.slotRoll / 2, until: LINE2_LANDS[k + 2] - D.slotRoll / 2, marks: [{ text: x, at: LINE2_LANDS[k + 1] - D.slotRoll / 2 }] })),
  { key: 'line2-b', text: `${LINE2_SLOT[LINE2_SLOT.length - 1]}, ${LINE2_B.trim()}`, at: LINE2_LANDS[LINE2_LANDS.length - 1] - D.slotRoll / 2, until: LINE2_OUT + D.titleOut, marks: [{ text: LINE2_SLOT[LINE2_SLOT.length - 1], at: LINE2_LANDS[LINE2_LANDS.length - 1] - D.slotRoll / 2 }, { text: LINE2_B.trim(), at: LINE2_B_TIMES[0] }] },
];
const CHECK_LINES: VoiceLine[] = CHECK
  ? CHECK_CARDS.map((x, i) => ({
      key: `check-${i + 1}`,
      text: x.replace('you’re here see', 'you’re here, see'),
      at: CHECK_AT[i],
      until: i === 0 ? CHECK_AT[1] - 0.6 : CHECK_OUT,
      marks: [{ text: x, at: CHECK_AT[i] }],
    }))
  : [];
const AVATAR_LINES: VoiceLine[] = [
  { key: 'you-text', text: /[.?!]$/.test(AV_TEXT) ? AV_TEXT : `${AV_TEXT}.`, at: AV_TYPE_TIMES[0], until: AV_GONE, marks: [{ text: AV_TEXT, at: AV_TYPE_TIMES[0] }] },
  ...BLOCK_LINES.map((x, i) => ({
    key: `block-${i + 1}`,
    text: spoken(x).replace(' & ', ' and '),
    at: BLOCK_AT[i],
    until: i < BLOCK_LINES.length - 1 ? BLOCK_AT[i + 1] - BLOCK_FADE - 0.1 : BLOCK_OUT + D.titleOut,
    marks: [{ text: spoken(x), at: BLOCK_AT[i] }],
  })),
];
export const VOICE_LINES: VoiceLine[] = [
  ...(OPENING ? OPENING_LINES : AVATARS ? AVATAR_LINES : []),
  ...BUBBLE_LINES.map((b, i) => ({ key: b.key ?? `bubble-${i + 1}`, text: spoken(b.text), at: b.at, until: (b.hide ?? b.at + 2) + D.bubbleOut, marks: [{ text: spoken(b.text), at: b.at }] })),
  ...(HEAD ? [{ key: 'head', text: HEAD, at: HEAD_AT, until: HEAD_OUT + 0.3, marks: [{ text: HEAD, at: HEAD_AT }] }] : []),
  ...CHECK_LINES,
  { key: 'note', text: NOTE_CHUNKS.join(' ').replace('If you miss a word we', 'If you miss a word, we'), at: NOTE_AT[0], until: NOTE_OUT + D.noteFade, marks: NOTE_CHUNKS.map((x, i) => ({ text: x, at: NOTE_AT[i] })) },
  { key: 'end', text: `${END_CHUNKS.join(' ')} ${LANGS[0]},`, at: ENDING + END_CHUNK_AT[0], until: ENDING + LANG_LANDS[1] - LANG_ROLL / 2, marks: [...END_CHUNKS.map((x, i) => ({ text: x, at: ENDING + END_CHUNK_AT[i] })), { text: LANGS[0], at: ENDING + LANG_LANDS[0] }] },
  ...LANGS.slice(1, LANG_SHOWN).map((x, k) => ({ key: `lang-${k + 2}`, text: `${x},`, at: ENDING + LANG_LANDS[k + 1] - LANG_ROLL / 2, until: ENDING + (k + 2 < LANG_SHOWN ? LANG_LANDS[k + 2] - LANG_ROLL / 2 : LANG_FLICK_AT + 0.3), marks: [{ text: x, at: ENDING + LANG_LANDS[k + 1] - LANG_ROLL / 2 }] })),
  { key: 'lang-last', text: LANGS[LANGS.length - 1], at: ENDING + LANG_END, until: ENDING + LOGO_AT, marks: [{ text: LANGS[LANGS.length - 1], at: ENDING + LANG_END }] },
];

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
      i < END_CHUNKS.length - 1 ? [{ text: x }, inline(i === 0 ? 'end-0' : `end-${i}`, `after “${x}”`, i === 0 ? D.endChunk0 : D.endChunk, ENDING + END_CHUNK_AT[i])] : [{ text: x }]),
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
  const titles = [
    { id: 'title1', name: 'Headline: How can texting become self-guided…', start: 0,
      texts: [{ key: 'headline', label: 'Headline', text: CHUNKS.map((x) => `[${x}]`).join(' ') }], flows: [headlineFlow] },
    { id: 'title2', name: 'Typed: By turning your chats in [apps] into a learning system.', start: TITLE1_OUT,
      texts: [{ key: 'line2', label: 'Typed line', text: `${LINE2_A}[${LINE2_SLOT.join(' / ')}]${LINE2_B}` }], flows: [line2Flow] },
  ];
  const avatars = [
    { id: 'avatars', name: `Avatars: ${AV_TEXT}`, start: 0,
      texts: [{ key: 'avtext', label: 'Typed line', text: AV_TEXT }],
      flows: [[
        inline('av-burst', 'the burst', D.avBurst, AV_BURST, 'duration', 'Burst'),
        typed(AV_TEXT, AV_TYPE_TIMES),
        inline('av-hold', 'the line holds', D.avHold, AV_TYPE_TIMES[AV_TYPE_TIMES.length - 1], 'hold', 'Hold'),
        inline('av-collapse', 'the collapse', D.avCollapse, AV_COLLAPSE, 'duration', 'Collapse'),
      ]] },
    { id: 'block', name: `Text: ${BLOCK_LINES[0]}`, start: AV_END,
      texts: [{ key: 'block', label: 'Text block', text: BLOCK_LINES.join(' / ') }],
      flows: [
        BLOCK_LINES.flatMap((x, i) => [
          { text: x },
          i < BLOCK_LINES.length - 1
            ? inline(`block-${i + 1}`, `after “${x}”`, BLOCK_GAPS[i], BLOCK_AT[i])
            : inline('block-hold', 'the block holds', D.blockHold, BLOCK_AT[i], 'hold', 'Hold'),
        ]),
      ] },
  ];
  const list = [
    ...(OPENING ? titles : AVATARS ? avatars : []),
    ...BUBBLES.map((b, i) => ({
      id: `b${i + 1}`,
      name: b.who === 'me' ? `Send: ${b.text}` : `${i + 1}. ${b.text}`,
      start: i === 0 ? WORLD_IN : b.who === 'me' ? SEND_TAP - 0.35 : b.at - 0.2,
      texts: [{ key: `b${i + 1}`, label: b.who === 'me' ? 'Sent message' : 'Left bubble', text: b.text }],
      ...(b.who === 'them' ? { flows: [[{ text: b.text }, inline(i === 0 ? 'kb-wait' : `kb-wait-${i + 1}`, 'before the keyboard comes up', b.wait ?? (i === 0 ? D.kbWait1 : D.kbWait), b.at)]] } : {}),
    })),
    { id: 'type1', name: `Type: ${FIELD_KNOW}`, start: TYPE1_START, texts: [{ key: 'know', label: 'Typed message', text: FIELD_KNOW }], flows: [[typed(FIELD_KNOW, KNOW_TIMES)]] },
    ...(FIELD_TRY
      ? [{ id: 'typeTry', name: `Type: …${FIELD_TRY}`, start: TRY_START, texts: [{ key: 'try', label: 'Typed (try)', text: FIELD_TRY.trim() }], flows: [[typed(FIELD_TRY, TRY_TIMES)]] }]
      : []),
    { id: 'type2', name: `Type: …${FIELD_ADD}`, start: TYPE2_START, texts: [{ key: 'add', label: 'Typed (added)', text: FIELD_ADD }], flows: [[typed(FIELD_ADD, ADD_TIMES)]] },
    { id: 'reword', name: HEAD ? `Text: ${HEAD}` : 'Reword to Spanish', start: REWORD_START, texts: [...(HEAD ? [{ key: 'head', label: 'Headline', text: HEAD }] : []), { key: 'es', label: 'Reworded (Spanish)', text: FIELD_ES }] },
    ...(CHECK
      ? [{ id: 'check', name: `Check: ${CHECK_CARDS[0]}`, start: CHECK_IN,
          texts: [{ key: 'check', label: 'Text cards', text: CHECK_CARDS.join(' / ') }],
          flows: [[{ text: CHECK_CARDS[0] }, inline('check-1', 'the first card', D.checkCard1, CHECK_AT[0]), { text: CHECK_CARDS[1] }, inline('check-2', 'the second card (synonyms)', D.checkCard2, CHECK_AT[1])]] }]
      : []),
    { id: 'note', name: 'Text: If you miss a word, we add it to your study guide.', start: NOTE_IN,
      texts: [{ key: 'note', label: 'Text', text: NOTE_CHUNKS.map((x) => `[${x}]`).join(' ') }], flows: [noteFlow] },
    { id: 'study', name: 'The Study Guide, open', start: NOTE_WITH_STUDY ? NOTE_DONE : NOTE_OUT + D.noteFade, texts: [],
      flows: [[{ text: 'Study Guide' }, inline('study-pause', 'before the flick', STUDY_FLICK - (NOTE_WITH_STUDY ? NOTE_DONE : NOTE_OUT + 2 * D.noteFade), NOTE_WITH_STUDY ? NOTE_DONE : NOTE_OUT + 2 * D.noteFade, 'hold', 'Hold'),
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
      ...(OPENING ? [...LINE2_A_TIMES, ...LINE2_SLOT_TIMES, ...LINE2_B_TIMES] : []).map((t) => ({ t, space: true })),
      ...(AVATARS ? AV_TYPE_TIMES.map((t, i) => ({ t, space: AV_TEXT[i] === ' ' })) : []),
    ],
    taps: Number.isFinite(SEND_TAP) ? [REWORD_TAP, SEND_TAP] : [REWORD_TAP],
    reword: REWORD_SWAP,
    reveal: null,
    send: Number.isFinite(SEND_AT) ? SEND_AT : null,
    sends: Number.isFinite(SEND_AT) ? [SEND_AT] : [],
    swipes: [],
    words: [...(OPENING ? [...LINE2_LANDS, ...CHUNK_AT] : AVATARS ? BLOCK_AT : []), ...(CHECK ? CHECK_AT : []), ...NOTE_AT],
    ticks: LANG_PASS.map((x) => ENDING + x),
    pops: BUBBLES.map((b) => ({ t: b.at, who: b.who })),
    titles: OPENING || AVATARS ? [[0, WORLD_IN]] : [],
    phones: [WORLD_IN],
    opening: [0, 0],
    closing: ENDING + LOGO_AT,
    studyFlick: null,
    voice: VOICE_LINES,
  };
}
