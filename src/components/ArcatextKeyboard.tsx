import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown, Plus, ArrowUp, Mic, RotateCcw, Pause, Play } from 'lucide-react';
// Keyboard glyphs, from the Arcatext design assets (shared with adalithic.com),
// so the toolbar and action keys match the shipping app rather than approximating it.
// The first toolbar button is the app's Study destination: StandardToolbar
// draws it with `leaf.fill`, the Study tab's icon, because the menu's main
// destination is the Study Guide. study.svg is that symbol itself, exported
// from the SF Symbols app, drawn 20x17 so its visual weight matches the Paste
// (16x20) and Check (20x20) glyphs beside it.
import studyUrl from '@/assets/keyboard/study.svg';
import studyDarkUrl from '@/assets/keyboard/study-dark.svg';
import pasteUrl from '@/assets/keyboard/paste.svg';
import pasteDarkUrl from '@/assets/keyboard/paste-dark.svg';
import checkUrl from '@/assets/keyboard/check.svg';
import checkDarkUrl from '@/assets/keyboard/check-dark.svg';
import shiftUrl from '@/assets/keyboard/shift.svg';
import shiftDarkUrl from '@/assets/keyboard/shift-dark.svg';
import backspaceUrl from '@/assets/keyboard/backspace.svg';
import backspaceDarkUrl from '@/assets/keyboard/backspace-dark.svg';
import localesUrl from '@/assets/keyboard/locales.svg';
import localesDarkUrl from '@/assets/keyboard/locales-dark.svg';
import { AX, AxIcon } from '@/lib/arcatextTheme';
import { Editable } from '@/content/Editable';
// The pointer from the app's onboarding (Assets.xcassets/OB_Arrow).
import obArrowUrl from '@/assets/arcatext/ob-arrow.png';
import ArcatextOptionsPage, { type OptionsConfig } from '@/components/ArcatextOptionsPage';
import {
  CheckPanel,
  PastePanel,
  StudyPanel,
  Spinner,
  type CheckState,
  type PasteStage,
  type StudyRow,
  type StudyStage,
} from '@/components/ArcatextViews';

/**
 * ArcatextKeyboard
 *
 * An auto-playing walkthrough of the Arcatext keyboard inside an iPhone
 * Messages conversation. A timeline engine plays one or more scenes and loops
 * them; ArcatextDemoRow gives each view its own phone (Reword, Check, Paste,
 * Study, Options) and the Reword case study plays write → reword → send.
 *
 * The views are the app's current ones (main branch): CheckView, PasteView,
 * the Study Guide page and the Options page (see ArcatextViews and
 * ArcatextOptionsPage). Colors come from the shared Arcatext palette, so the
 * phone follows the portfolio's light and dark theme.
 *
 * Playback pauses while the phone is off screen and resumes when it returns.
 */

const C = {
  toolbarBar: AX.keyboardBg,
  toolButtonBg: AX.toolBtn, // ToolbarIconButtonBgColor
  toolButtonPressed: AX.toolBtnPressed, // ToolbarButtonPressedColor
  rewordBg: AX.item, // ToolbarItemColor
  rewordPressed: AX.itemPressed,
  regularKey: AX.key,
  actionKey: AX.actionKey,
  keyText: AX.keyText,
  send: AX.send,
  recvGray: AX.recvBubble,
  // The conversation is iMessage, so sent bubbles are blue (systemBlue).
  sentBubble: AX.send,
};

const EN = 'Hello, how are you my friend? Meet me at the bank.';
const JA = 'こんにちは、元気ですか、友よ？銀行で会いましょう。';
const REVERSE = "Hello, how are you, my friend? Let's meet at the bank.";
const SYNONYMS = [
  'やあ、調子はどう、友達？銀行で会おう。',
  'こんにちは、元気にしてる？友よ、銀行で会いましょう。',
  'こんにちは、いかがですか、友人？銀行で会いましょう。',
];
const RECV_JA = 'わかった、すぐにそこで会おう。';
const RECV_EN = "Got it, let's meet there right away.";
const EN2 = 'See you soon!';
const JA2 = 'またすぐにね！';
const ROMAJI2 = 'mata sugu ni ne!';

const CHECK_DATA = {
  reverse: REVERSE,
  reword: JA,
  original: EN,
  synonyms: SYNONYMS,
  homograph: {
    word: 'bank',
    meanings: [
      { title: '銀行', gloss: 'a financial institution; a place for money' },
      { title: '土手', gloss: 'the land beside a river; a slope' },
    ],
  },
};

/** Entries the conversation above would have produced. */
const STUDY_ROWS: StudyRow[] = [
  { entry: '銀行', translations: 'bank', sentence: '銀行で会いましょう。', tag: 'Noun', misses: 2 },
  { entry: '会いましょう', translations: "let's meet", sentence: '銀行で会いましょう。', tag: 'Phrase', misses: 3 },
  { entry: '元気', translations: 'well, healthy, energetic', sentence: 'こんにちは、元気ですか、友よ？', tag: 'Noun', misses: 1 },
  { entry: 'すぐに', translations: 'right away, soon', sentence: 'わかった、すぐにそこで会おう。', tag: 'Adverb', misses: 2 },
  { entry: '友', translations: 'friend', sentence: 'こんにちは、元気ですか、友よ？', tag: 'Noun', misses: 1 },
  { entry: 'またね', translations: 'see you', sentence: 'またすぐにね！', tag: 'Phrase', misses: 1 },
];

const JA_SCRIPTS = {
  standard: { title: 'Standard', subtitle: 'Kanji / Hiragana / Katakana' },
  noKanji: { title: 'No Kanji', subtitle: 'Hiragana / Katakana' },
  romanized: { title: 'Romanized', subtitle: 'ABC' },
};

/** Japanese on the Options page: scripts only (no recipient gender or group
    chat), a speaker gender, copy off. From LanguageData.swift. */
const japaneseOptions = (alphabet: 'standard' | 'romanized'): OptionsConfig => ({
  language: 'Japanese',
  script: {
    selected: JA_SCRIPTS[alphabet],
    all: [JA_SCRIPTS.standard, JA_SCRIPTS.noKanji, JA_SCRIPTS.romanized],
  },
  copy: { on: false, language: 'English' },
  keyboards: 2,
  speakerGender: 'Male',
});

/** `checkTour`: Check fully loaded, scrolled slowly top to bottom.
    `checkGuide`: Check walked through stop by stop — a yellow arrow and a
    caption at each element, waiting for Next (the Check case study's figure). */
export type Scene = 'type' | 'reword' | 'check' | 'checkTour' | 'checkGuide' | 'paste' | 'study' | 'options';

type View = 'none' | 'check' | 'paste' | 'study' | 'options';
type Bubble = { id: number; text: string };

const DESIGN_W = 402;
const SCREEN_H = 874;
const BEZEL = 12;
const OUTER_W = DESIGN_W + BEZEL * 2;
const OUTER_H = SCREEN_H + BEZEL * 2;
const BASE_SCALE = 0.8;

const CHECK_IDLE: CheckState = {
  opening: true,
  reverse: 'loading',
  synonyms: 'idle',
  homographs: 'idle',
  analysis: 'idle',
  gender: 'idle',
};

/** The guided Check tour's example: Spanish, as the app's own Check captures
    show it, because it has real results at every stop (a homograph, a
    gendered word, a word-by-word analysis). */
const ES = 'Conocí a tus amigos en el banco la semana pasada.';
const CHECK_ES = {
  reverse: 'I met your friends at the bank last week.',
  reword: ES,
  original: 'I met your friends at the bank last week.',
  synonyms: [
    'Conocí a tus amigos en la entidad financiera la semana pasada.',
    'Conocí a tus amigos en la oficina bancaria la semana pasada.',
    'Conocí a tus amigos en el local bancario la semana pasada.',
  ],
  homograph: {
    word: 'bank',
    meanings: [
      { title: 'banco', gloss: 'a financial institution;' },
      { title: 'orilla', gloss: 'the side of a river;' },
    ],
  },
  analysis: [
    { gloss: 'I met', chunk: 'Conocí' },
    { gloss: '(to)', chunk: 'a' },
    { gloss: 'your', chunk: 'tus' },
    { gloss: 'friends', chunk: 'amigos' },
    { gloss: '(at)', chunk: 'en' },
    { gloss: 'the', chunk: 'el' },
    { gloss: 'bank', chunk: 'banco' },
    { gloss: '(last)', chunk: 'la' },
    { gloss: 'week', chunk: 'semana' },
    { gloss: 'last.', chunk: 'pasada.' },
  ],
  gender: {
    word: 'friend',
    options: [
      { word: 'friends', label: 'All Male' },
      { word: 'friends', label: 'All Female' },
      { word: 'friends', label: 'Both' },
    ],
  },
};

/** The guided tour's stops, in order; copy is content at arcatext.checkTour.N. */
const TOUR_STOPS = ['reverse', 'fixWords', 'reword', 'analysis', 'original', 'synonyms', 'homographs', 'gender'] as const;
type TourStop = (typeof TOUR_STOPS)[number];

function Key({
  label,
  num,
  bg = C.regularKey,
  grow = 1,
  fontSize = 22,
  children,
}: {
  label?: string;
  num?: string;
  bg?: string;
  grow?: number;
  fontSize?: number;
  children?: React.ReactNode;
}) {
  return (
    <div
      className="relative flex select-none items-center justify-center rounded-[4.6px]"
      style={{
        backgroundColor: bg,
        color: C.keyText,
        height: 42,
        flexGrow: grow,
        flexBasis: 0,
        boxShadow: `0 1px 0 ${AX.keyShadow}`,
        fontSize,
        fontWeight: 400,
      }}
    >
      {num && (
        <span className="absolute right-[5px] top-[3px]" style={{ fontSize: 9, color: AX.keyHint }}>
          {num}
        </span>
      )}
      {children ?? label}
    </div>
  );
}

/** A 57x50pt toolbar icon button; darkens to ToolbarButtonPressedColor on tap. */
function ToolButton({
  pressed,
  onClick,
  label,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button onClick={onClick} aria-label={label} className="shrink-0">
      <div
        className="grid place-items-center rounded-[12px] transition-colors duration-100"
        style={{ width: 57, height: 50, backgroundColor: pressed ? C.toolButtonPressed : C.toolButtonBg }}
      >
        {children}
      </div>
    </button>
  );
}

/** OB_Arrow's own yellow, for the Next button. */
const TOUR_YELLOW = '#FFC600';

/**
 * A tour stop's callout: the Arcatext onboarding pointer (OB_Arrow, the app's
 * own asset) on the phone, pointing left at the element tagged
 * `data-tour={tag}` — free to run past the phone's edge — and a caption box
 * with Next. The box sits beside the phone when the page has room to its
 * left, otherwise under it. Its text is content (arcatext.checkTour), so it
 * edits in place in admin mode.
 *
 * The pointer moves as PointerArrow does in the app's onboarding: it springs
 * in from 60pt to the right, gives a soft double bounce toward its target
 * (6pt, then 3pt) and settles. Like the app it is drawn at 44pt (scaled with
 * the phone), with its tip — the image's left corner, two-thirds down —
 * landing just inside the target's right edge.
 */
function TourCallout({
  phoneRef,
  tag,
  index,
  total,
  onNext,
}: {
  phoneRef: React.RefObject<HTMLDivElement | null>;
  tag: string;
  index: number;
  total: number;
  onNext: () => void;
}) {
  const [geo, setGeo] = useState<{ x: number; y: number; w: number; h: number; pw: number; side: boolean } | null>(null);

  useEffect(() => {
    const measure = () => {
      const wrap = phoneRef.current;
      const el = wrap?.querySelector<HTMLElement>(`[data-tour="${tag}"]`);
      if (!wrap || !el) return;
      const w = wrap.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      setGeo({
        x: r.left - w.left,
        y: r.top - w.top,
        w: r.width,
        h: r.height,
        pw: w.width,
        // Room for a 260px box and its gap to the phone's left?
        side: w.left >= 300,
      });
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [phoneRef, tag]);

  if (!geo) return null;

  // OnboardingPage3AnimationView.tipPoint: just inside the right edge, at the
  // middle (of the first line, for tall targets).
  const k = geo.pw / OUTER_W;
  const size = 44 * k;
  const tipX = geo.x + geo.w - Math.min(geo.w * 0.25, 22);
  const tipY = geo.y + Math.min(geo.h / 2, 22);

  const box = (
    <div className="w-[260px] rounded-2xl border border-border bg-card p-4 text-left shadow-xl animate-in fade-in-0 zoom-in-95 duration-200">
      <div className="mb-1 font-mono text-[11px] text-muted-foreground">
        {index + 1} / {total}
      </div>
      <Editable as="div" path={`arcatext.checkTour.${index}.title`} className="text-sm font-semibold text-foreground" />
      <Editable
        as="p"
        path={`arcatext.checkTour.${index}.body`}
        multiline
        className="mt-1 text-sm leading-relaxed text-muted-foreground"
      />
      <div className="mt-3 flex justify-end">
        <button
          onClick={onNext}
          className="rounded-full px-4 py-1.5 text-sm font-semibold text-black transition-[filter] hover:brightness-95"
          style={{ background: TOUR_YELLOW }}
        >
          {index + 1 === total ? 'Start over' : 'Next'}
        </button>
      </div>
    </div>
  );

  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute z-20"
        style={{ left: tipX, top: tipY - size * 0.667, width: size, height: size, ['--ob-in' as string]: `${60 * k}px`, ['--ob-k' as string]: k }}
      >
        <div className="ob-arrow-in h-full w-full">
          <img src={obArrowUrl} alt="" className="ob-arrow-bounce block h-full w-full" />
        </div>
      </div>

      {geo.side ? (
        <div className="absolute z-30" style={{ right: 'calc(100% + 24px)', top: Math.max(0, tipY - 44) }}>
          {box}
        </div>
      ) : (
        // Under the phone, past the Restart row, when there is no room beside it.
        <div className="absolute left-1/2 top-full z-30 mt-[68px] -translate-x-1/2">{box}</div>
      )}
    </>
  );
}

export default function ArcatextKeyboard({
  scenes = ['type', 'reword'],
  scale,
  running = true,
  onPause,
  onPlay,
  onRestart,
}: {
  /** The scenes this phone plays, in order, looping. */
  scenes?: Scene[];
  scale?: number;
  /** Whether this phone may play (a row pauses its phones together). */
  running?: boolean;
  /** Given by a row: a Pause button left of Restart (pauses the whole row)… */
  onPause?: () => void;
  /** …and a Play button right of it (plays this phone alone). */
  onPlay?: () => void;
  /** Called on Restart or a toolbar tap, so a paused row can let this phone run. */
  onRestart?: () => void;
  /** Accepted for older call sites; the demo is always the compact phone. */
  compact?: boolean;
} = {}) {
  const phoneScale = scale ?? BASE_SCALE;
  // ── visual state driven by the timeline ──
  const [text, setText] = useState('');
  const [sent, setSent] = useState<Bubble[]>([]);
  const [received, setReceived] = useState<Bubble | null>(null);
  const [view, setView] = useState<View>('none');
  const [rewordLoading, setRewordLoading] = useState(false);
  const [pressed, setPressed] = useState<string | null>(null);
  const [check, setCheck] = useState<CheckState>(CHECK_IDLE);
  /** The guided tour's current stop, while it waits for Next. */
  const [callout, setCallout] = useState<TourStop | null>(null);
  const [pasteStage, setPasteStage] = useState<PasteStage>('empty');
  const [studyStage, setStudyStage] = useState<StudyStage>('spinner');
  const [studyScroll, setStudyScroll] = useState(0);
  const [optMenuOpen, setOptMenuOpen] = useState(false);
  const [optHighlight, setOptHighlight] = useState<string | null>(null);
  const [alphabet, setAlphabet] = useState<'standard' | 'romanized'>('standard');

  const rootRef = useRef<HTMLDivElement>(null);
  const checkScrollRef = useRef<HTMLDivElement>(null);
  const synRef = useRef<HTMLDivElement>(null);
  const detectRef = useRef<HTMLDivElement>(null);

  // engine refs
  const beatsRef = useRef<{ fn: () => void; ms: number }[]>([]);
  const boundsRef = useRef<{ start: number; end: number }[]>([]);
  const stepRef = useRef(0);
  const posRef = useRef(0);
  /** Playing (not closed by the viewer). */
  const playRef = useRef(true);
  /** On screen. */
  const visibleRef = useRef(false);
  /** Allowed to play by the row. */
  const runningRef = useRef(running);
  const tRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  /** Holding at a tour stop until Next. */
  const waitRef = useRef(false);
  const phoneRef = useRef<HTMLDivElement>(null);
  const bubbleId = useRef(1);
  const scenesKey = scenes.join(',');

  const scrollTo = (ref: React.RefObject<HTMLDivElement | null>, top: number) =>
    ref.current?.scrollTo({ top, behavior: 'smooth' });
  /** A slow, continuous scroll to the bottom of a view over `ms`, eased at
      both ends, so each element can be read as it passes. */
  const glideRef = useRef<number | undefined>(undefined);
  const glideTo = (el: HTMLElement, to: number, ms: number) => {
    cancelAnimationFrame(glideRef.current ?? 0);
    const from = el.scrollTop;
    const t0 = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / ms);
      const eased = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
      el.scrollTop = from + (to - from) * eased;
      if (t < 1) glideRef.current = requestAnimationFrame(step);
    };
    glideRef.current = requestAnimationFrame(step);
  };
  const glideToBottom = (ref: React.RefObject<HTMLDivElement | null>, ms: number) => {
    const el = ref.current;
    if (el) glideTo(el, el.scrollHeight - el.clientHeight, ms);
  };
  /** Brings a tour target into view, a little below the top of the view. */
  const scrollToTag = (tag: string) => {
    const c = checkScrollRef.current;
    const el = c?.querySelector<HTMLElement>(`[data-tour="${tag}"]`);
    if (!c || !el) return;
    glideTo(c, Math.max(0, Math.min(el.offsetTop - 70, c.scrollHeight - c.clientHeight)), 700);
  };
  const scrollToEl = (cont: React.RefObject<HTMLDivElement | null>, el: React.RefObject<HTMLElement | null>) => {
    if (cont.current && el.current) cont.current.scrollTo({ top: Math.max(0, el.current.offsetTop - 14), behavior: 'smooth' });
  };

  const schedule = useCallback(() => {
    clearTimeout(tRef.current);
    if (waitRef.current || !playRef.current || !visibleRef.current || !runningRef.current) return;
    const beats = beatsRef.current;
    const bounds = boundsRef.current[stepRef.current];
    if (!beats.length || !bounds) return;
    if (posRef.current >= bounds.end) {
      // Loop: the next scene in this phone's list, round again after the last.
      const next = (stepRef.current + 1) % boundsRef.current.length;
      stepRef.current = next;
      posRef.current = boundsRef.current[next].start;
      tRef.current = setTimeout(schedule, 900);
      return;
    }
    const beat = beats[posRef.current];
    beat.fn();
    posRef.current += 1;
    tRef.current = setTimeout(schedule, beat.ms);
  }, []);

  // Build the timeline for this phone's scenes.
  useEffect(() => {
    const beats: { fn: () => void; ms: number }[] = [];
    const b = (fn: () => void, ms: number) => beats.push({ fn, ms });
    const reset = (opts: { text?: string; sent?: string[]; received?: string | null } = {}) => {
      cancelAnimationFrame(glideRef.current ?? 0);
      waitRef.current = false;
      setCallout(null);
      setRewordLoading(false);
      setPressed(null);
      setView('none');
      setCheck(CHECK_IDLE);
      setPasteStage('empty');
      setStudyStage('spinner');
      setStudyScroll(0);
      setOptMenuOpen(false);
      setOptHighlight(null);
      setAlphabet('standard');
      setText(opts.text ?? '');
      setSent((opts.sent ?? []).map((t) => ({ id: bubbleId.current++, text: t })));
      setReceived(opts.received ? { id: bubbleId.current++, text: opts.received } : null);
    };
    /** A tap on something: pressed for about as long as a finger is down. */
    const tap = (what: string, then: () => void, hold = 220) => {
      b(() => setPressed(what), hold);
      b(() => {
        setPressed(null);
        then();
      }, 0);
    };
    const type = (s: string, ms: number) => {
      for (let i = 1; i <= s.length; i++) {
        const part = s.slice(0, i);
        b(() => setText(part), ms);
      }
    };

    const build: Record<Scene, () => void> = {
      type: () => {
        b(() => reset(), 700);
        type(EN, 42);
        b(() => {}, 700);
      },
      reword: () => {
        b(() => reset({ text: EN }), 700);
        b(() => {
          setPressed('reword');
          setRewordLoading(true);
        }, 320);
        b(() => setPressed(null), 1300);
        b(() => {
          setRewordLoading(false);
          setText(JA);
        }, 1150);
        // A beat to read the reword, then a quick tap on send.
        tap('send', () => {
          setSent([{ id: bubbleId.current++, text: JA }]);
          setText('');
        }, 260);
        b(() => {}, 2200);
      },
      check: () => {
        b(() => reset({ text: JA }), 1000);
        tap('check', () => setView('check'));
        b(() => {}, 700);
        b(() => setCheck((s) => ({ ...s, opening: false })), 900);
        b(() => setCheck((s) => ({ ...s, reverse: 'done' })), 1500);
        b(() => scrollToEl(checkScrollRef, synRef), 900);
        b(() => setCheck((s) => ({ ...s, synonyms: 'loading' })), 1100);
        b(() => setCheck((s) => ({ ...s, synonyms: 'done' })), 1700);
        b(() => scrollToEl(checkScrollRef, detectRef), 900);
        b(() => setCheck((s) => ({ ...s, homographs: 'loading' })), 1100);
        b(() => setCheck((s) => ({ ...s, homographs: 'done' })), 500);
        // The cards make the page taller; follow them down.
        b(() => scrollToEl(checkScrollRef, detectRef), 2400);
        b(() => scrollTo(checkScrollRef, 0), 1600);
      },
      checkTour: () => {
        b(() => reset({ text: JA }), 900);
        tap('check', () => setView('check'));
        b(() => {}, 600);
        b(() => setCheck((s) => ({ ...s, opening: false })), 900);
        // Everything loaded, so the tour passes every part of the view.
        b(() => setCheck({ opening: false, reverse: 'done', synonyms: 'done', homographs: 'done' }), 1800);
        b(() => glideToBottom(checkScrollRef, 16000), 16000 + 2200);
        b(() => scrollTo(checkScrollRef, 0), 1600);
      },
      checkGuide: () => {
        /** Scroll the stop into view, point at it, and hold for Next. */
        const stop = (tag: TourStop) => {
          b(() => scrollToTag(tag), 850);
          b(() => {
            waitRef.current = true;
            setCallout(tag);
          }, 0);
        };
        /** Tap a control in the view, let it load, show its result. */
        const run = (control: string, key: keyof CheckState, scrollTag: string) => {
          b(() => scrollToTag(scrollTag), 850);
          tap(control, () => setCheck((s) => ({ ...s, [key]: 'loading' })), 260);
          b(() => {}, 1500);
          b(() => setCheck((s) => ({ ...s, [key]: 'done' })), 450);
        };
        b(() => reset({ text: ES }), 900);
        tap('check', () => setView('check'));
        b(() => {}, 500);
        b(() => setCheck((s) => ({ ...s, opening: false })), 900);
        b(() => setCheck((s) => ({ ...s, reverse: 'done' })), 900);
        stop('reverse');
        stop('fixWords');
        stop('reword');
        run('analyze', 'analysis', 'analyze');
        stop('analysis');
        stop('original');
        run('synonyms', 'synonyms', 'synonyms');
        stop('synonyms');
        run('homographs', 'homographs', 'homographsButton');
        stop('homographs');
        run('gender', 'gender', 'genderButton');
        stop('gender');
        b(() => scrollTo(checkScrollRef, 0), 1400);
      },
      paste: () => {
        b(() => reset({ sent: [JA] }), 800);
        b(() => setReceived({ id: bubbleId.current++, text: RECV_JA }), 1500);
        // Copied the reply; open Paste.
        tap('paste', () => setView('paste'));
        b(() => {}, 1300);
        tap('pasteButton', () => setPasteStage('pasting'));
        b(() => {}, 600);
        b(() => setPasteStage('loading'), 1400);
        b(() => setPasteStage('done'), 2800);
      },
      study: () => {
        b(() => reset({ sent: [JA], received: RECV_JA }), 1000);
        tap('study', () => setView('study'));
        b(() => {}, 350);
        b(() => setStudyStage('skeleton'), 900);
        b(() => setStudyStage('rows'), 1700);
        b(() => setStudyScroll(190), 1900);
        b(() => setStudyScroll(0), 1700);
      },
      options: () => {
        b(() => reset(), 700);
        type(EN2, 60);
        b(() => {
          setPressed('reword');
          setRewordLoading(true);
        }, 320);
        b(() => setPressed(null), 1000);
        b(() => {
          setRewordLoading(false);
          setText(JA2);
        }, 900);
        tap('options', () => setView('options'));
        b(() => {}, 1000);
        // Reword Script: open the menu, tap Romanized.
        b(() => setOptMenuOpen(true), 1100);
        b(() => setOptHighlight('Romanized'), 260);
        b(() => {
          setOptHighlight(null);
          setOptMenuOpen(false);
          setAlphabet('romanized');
        }, 1100);
        // Back to the keyboard. A changed option rewords the SAVED original on
        // return (RewordService.autoReword), so the field rewords itself.
        b(() => setView('none'), 700);
        b(() => setRewordLoading(true), 1000);
        b(() => {
          setRewordLoading(false);
          setText(ROMAJI2);
        }, 1150);
        tap('send', () => {
          setSent([{ id: bubbleId.current++, text: ROMAJI2 }]);
          setText('');
        }, 260);
        b(() => {}, 2000);
      },
    };

    const bounds: { start: number; end: number }[] = [];
    for (const s of scenesKey.split(',') as Scene[]) {
      const start = beats.length;
      build[s]();
      bounds.push({ start, end: beats.length });
    }
    beatsRef.current = beats;
    boundsRef.current = bounds;
    stepRef.current = 0;
    posRef.current = 0;
    playRef.current = true;
    schedule();
    return () => clearTimeout(tRef.current);
  }, [schedule, scenesKey]);

  // Play only while on screen: a row of phones would otherwise all run at once.
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        visibleRef.current = entry.isIntersecting;
        if (entry.isIntersecting) schedule();
        else clearTimeout(tRef.current);
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [schedule]);

  // The row pausing or playing this phone: hold where it is, or carry on from
  // the same beat.
  useEffect(() => {
    runningRef.current = running;
    if (running) schedule();
    else clearTimeout(tRef.current);
  }, [running, schedule]);

  /** Next, at a tour stop: drop the callout and carry on. */
  const nextStop = () => {
    waitRef.current = false;
    setCallout(null);
    schedule();
  };

  const restart = () => {
    waitRef.current = false;
    setCallout(null);
    clearTimeout(tRef.current);
    stepRef.current = 0;
    posRef.current = 0;
    playRef.current = true;
    onRestart?.();
    schedule();
  };

  /** A toolbar tap: replays this phone's scene that starts from it. */
  const jump = (scene: Scene) => {
    const i = scenesKey.split(',').indexOf(scene);
    if (i < 0) return;
    clearTimeout(tRef.current);
    stepRef.current = i;
    posRef.current = boundsRef.current[i]?.start ?? 0;
    playRef.current = true;
    onRestart?.();
    schedule();
  };

  // Close the active view: the phone holds there until Restart.
  const closeView = () => {
    clearTimeout(tRef.current);
    playRef.current = false;
    setView('none');
  };

  // ── derived ──
  const hasText = text.length > 0;
  const showChat = sent.length > 0 || received !== null;
  const lower = text === '';
  const row1 = ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'];
  const row2 = ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'];
  const row3 = ['z', 'x', 'c', 'v', 'b', 'n', 'm'];
  const nums = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];

  return (
    <div ref={rootRef} className="flex flex-col items-center">
      {/* iPhone */}
      <div ref={phoneRef} className="relative" style={{ width: OUTER_W * phoneScale, height: OUTER_H * phoneScale }}>
        {callout && (
          <TourCallout
            key={callout}
            phoneRef={phoneRef}
            tag={callout}
            index={TOUR_STOPS.indexOf(callout)}
            total={TOUR_STOPS.length}
            onNext={nextStop}
          />
        )}
        <div
          className="relative bg-black"
          style={{
            width: OUTER_W,
            height: OUTER_H,
            padding: BEZEL,
            borderRadius: 56,
            transform: `scale(${phoneScale})`,
            transformOrigin: 'top left',
            boxShadow: `0 0 0 1px ${AX.bezelRing}, 0 30px 60px -20px rgba(20,10,40,0.5)`,
          }}
        >
          <div
            className="relative flex flex-col overflow-hidden"
            style={{ width: DESIGN_W, height: SCREEN_H, borderRadius: 44, background: AX.screen }}
          >
            {/* Status bar */}
            <div className="relative flex h-11 shrink-0 items-center justify-between px-7 pt-1" style={{ color: AX.ink }}>
              <span className="text-[15px] font-semibold">12:11</span>
              <div className="absolute left-1/2 top-2 h-7 w-[100px] -translate-x-1/2 rounded-full bg-black" />
              <div className="flex items-center gap-1.5">
                <div className="flex items-end gap-[2px]">
                  {[6, 9, 12, 15].map((h, i) => (
                    <span key={i} className="w-[3px] rounded-[1px]" style={{ height: h, background: AX.ink }} />
                  ))}
                </div>
                <svg width="17" height="13" viewBox="0 0 17 13" fill="none">
                  <path
                    d="M8.5 2.2c2.5 0 4.8 1 6.5 2.6l-1.3 1.4A7.7 7.7 0 008.5 4.1 7.7 7.7 0 003.3 6.2L2 4.8A9.5 9.5 0 018.5 2.2zm0 3.6c1.5 0 2.9.6 3.9 1.6l-1.4 1.4a3.5 3.5 0 00-5 0L4.6 7.4A5.5 5.5 0 018.5 5.8zm0 3.5c.7 0 1.3.3 1.8.8L8.5 12 6.7 10.1c.5-.5 1.1-.8 1.8-.8z"
                    fill="currentColor"
                  />
                </svg>
                <div className="ml-[1px] flex h-[13px] w-[24px] items-center rounded-[3px] border p-[1.5px]" style={{ borderColor: AX.batteryRing }}>
                  <div className="h-full w-full rounded-[1px]" style={{ background: AX.ink }} />
                </div>
              </div>
            </div>

            {/* Header */}
            <div className="flex shrink-0 flex-col items-center border-b px-4 pb-3 pt-1" style={{ borderColor: AX.hairline }}>
              <div className="flex w-full items-center justify-between">
                <ChevronLeft className="h-7 w-7" style={{ color: C.send }} strokeWidth={2.4} />
                <div className="w-7" />
              </div>
              <div className="-mt-5 flex flex-col items-center gap-1">
                <div
                  className="grid h-12 w-12 place-items-center rounded-full text-sm font-semibold text-white"
                  style={{ background: 'linear-gradient(160deg,#8e9bd6,#6f7fc4)' }}
                >
                  JA
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[15px] font-semibold" style={{ color: AX.ink }}>+1 (888) 555-1212</span>
                  <ChevronRight className="h-4 w-4" style={{ color: AX.inkMuted }} strokeWidth={2.4} />
                </div>
              </div>
            </div>

            {/* Conversation */}
            <div className="flex min-h-0 flex-1 flex-col justify-end gap-1.5 overflow-hidden px-3 pb-2">
              {showChat && (
                <>
                  <div className="text-center text-[13px] font-medium" style={{ color: AX.inkMuted }}>iMessage</div>
                  <div className="mb-1 flex items-center justify-center gap-1 text-[12px]" style={{ color: AX.inkMuted }}>
                    <svg width="9" height="11" viewBox="0 0 9 11" fill="none">
                      <rect x="0.6" y="4.6" width="7.8" height="6" rx="1.6" fill="currentColor" />
                      <path d="M2 4.5V3a2.5 2.5 0 015 0v1.5" stroke="currentColor" strokeWidth="1.1" fill="none" />
                    </svg>
                    Encrypted
                  </div>
                  <div className="mb-1 text-center text-[12px]" style={{ color: AX.inkMuted }}>
                    Today <span className="font-medium">12:12 AM</span>
                  </div>
                </>
              )}
              {sent.map((m, i) => (
                <div key={m.id} className="flex flex-col items-end">
                  {/* Rises out of the field as it sends. */}
                  <div
                    className="max-w-[78%] origin-bottom-right rounded-[20px] px-3.5 py-2 text-[17px] text-white animate-in fade-in-0 zoom-in-90 slide-in-from-bottom-6 duration-300"
                    style={{ background: C.sentBubble }}
                  >
                    {m.text}
                  </div>
                  {i === sent.length - 1 && !received && (
                    <span className="mr-1 mt-0.5 text-[11px]" style={{ color: AX.inkMuted }}>Delivered</span>
                  )}
                </div>
              ))}
              {received && (
                <div className="flex justify-start">
                  <div
                    className="max-w-[78%] origin-bottom-left rounded-[20px] px-3.5 py-2 text-[17px] animate-in fade-in-0 zoom-in-95 duration-300"
                    style={{ background: C.recvGray, color: AX.ink }}
                  >
                    {received.text}
                  </div>
                </div>
              )}
            </div>

            {/* Input bar. The field grows a line at a time as the message wraps,
                like Messages: the + and send buttons stay on its bottom line. */}
            <div className="flex shrink-0 items-end gap-2 px-3 pb-2 pt-1">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full" style={{ background: AX.plusBg }}>
                <Plus className="h-5 w-5" style={{ color: AX.plusIcon }} strokeWidth={2.6} />
              </div>
              <div
                className="flex min-h-9 min-w-0 flex-1 items-end rounded-[18px] border py-[7px] pl-4 pr-2"
                style={{ borderColor: AX.fieldBorder }}
              >
                {hasText ? (
                  <span className="min-w-0 flex-1 break-words text-[15px] leading-5" style={{ color: AX.ink }}>
                    {text}
                    <span className="ml-[1px] inline-block h-4 w-[2px] translate-y-[3px] animate-pulse" style={{ background: C.send }} />
                  </span>
                ) : (
                  <>
                    <span className="text-[15px] leading-5" style={{ color: AX.fieldPlaceholder }}>
                      iMessage
                    </span>
                    <span className="ml-[1px] inline-block h-4 w-[2px] self-center animate-pulse" style={{ background: C.send }} />
                    <div className="flex-1" />
                    <Mic className="h-5 w-5 shrink-0" style={{ color: AX.fieldPlaceholder }} strokeWidth={2} />
                  </>
                )}
              </div>
              {hasText && (
                <div className="relative h-9 w-9 shrink-0">
                  {/* The tap: a touch halo, and the button dips while held. */}
                  {pressed === 'send' && (
                    <span
                      aria-hidden
                      className="absolute -inset-2 rounded-full bg-black/15 animate-in fade-in-0 zoom-in-50 duration-150 dark:bg-white/25"
                    />
                  )}
                  <div
                    className="relative grid h-9 w-9 place-items-center rounded-full"
                    style={{
                      backgroundColor: C.send,
                      transform: pressed === 'send' ? 'scale(0.86)' : 'scale(1)',
                      filter: pressed === 'send' ? 'brightness(0.82)' : 'none',
                      transition: 'transform 120ms ease-out, filter 120ms ease-out',
                    }}
                  >
                    <ArrowUp className="h-5 w-5 text-white" strokeWidth={2.8} />
                  </div>
                </div>
              )}
            </div>

            {/* Keyboard, or the open view in its place (a view replaces the
                toolbar and the keys together). */}
            {view === 'none' && (
              <div style={{ backgroundColor: C.toolbarBar }} className="shrink-0 px-[5px] pb-1 pt-2">
                {/* Toolbar: Study, Paste, Check left-clustered with 12pt gaps
                    and 8pt edge margins; the split Reword pill at the trailing
                    edge (StandardToolbar base metrics). */}
                <div className="mb-2 flex items-center px-[3px]" style={{ height: 50, gap: 12 }}>
                  <ToolButton pressed={pressed === 'study'} onClick={() => jump('study')} label="Open Study">
                    <AxIcon light={studyUrl} dark={studyDarkUrl} width={20} height={17} />
                  </ToolButton>
                  <ToolButton pressed={pressed === 'paste'} onClick={() => jump('paste')} label="Open Paste">
                    <AxIcon light={pasteUrl} dark={pasteDarkUrl} width={16} height={20} />
                  </ToolButton>
                  <ToolButton pressed={pressed === 'check'} onClick={() => jump('check')} label="Open Check">
                    <AxIcon light={checkUrl} dark={checkDarkUrl} width={20} height={20} />
                  </ToolButton>
                  <div className="flex-1" />
                  <div
                    className="relative flex items-stretch overflow-hidden rounded-[12px] transition-colors duration-100"
                    style={{ height: 50, backgroundColor: pressed === 'reword' ? C.rewordPressed : C.rewordBg }}
                  >
                    {/* The label stays in the layout (hidden) under the spinner,
                        as StandardToolbar does with opacity 0, so the pill
                        keeps its width while it loads. */}
                    <button
                      onClick={() => jump(scenesKey.includes('reword') ? 'reword' : 'options')}
                      className="relative flex items-center px-[14px]"
                      aria-label="Reword"
                    >
                      <span className={`text-[16px] font-medium text-white ${rewordLoading ? 'invisible' : ''}`}>Reword</span>
                      {rewordLoading && (
                        <span className="absolute inset-0 grid place-items-center">
                          <Spinner size={20} color="#fff" track="rgba(255,255,255,0.4)" />
                        </span>
                      )}
                    </button>
                    <div className="self-center" style={{ width: 1, height: 20, backgroundColor: 'rgba(255,255,255,0.5)' }} />
                    <button
                      onClick={() => jump('options')}
                      className="relative grid place-items-center transition-colors duration-100"
                      style={{ width: 40, background: pressed === 'options' ? 'rgba(0,0,0,0.2)' : undefined }}
                      aria-label="Reword options"
                    >
                      <ChevronDown className="h-4 w-4 text-white" strokeWidth={2.4} />
                    </button>
                  </div>
                </div>

                <div className="mb-[8px] flex gap-[5px]">
                  {row1.map((l, i) => (
                    <Key key={l} label={lower ? l : l.toUpperCase()} num={nums[i]} />
                  ))}
                </div>
                <div className="mb-[8px] flex gap-[5px] px-[18px]">
                  {row2.map((l) => (
                    <Key key={l} label={lower ? l : l.toUpperCase()} />
                  ))}
                </div>
                <div className="mb-[8px] flex gap-[5px]">
                  <Key bg={C.actionKey} grow={1.5}>
                    <AxIcon light={shiftUrl} dark={shiftDarkUrl} width={19} height={17} />
                  </Key>
                  {row3.map((l) => (
                    <Key key={l} label={lower ? l : l.toUpperCase()} />
                  ))}
                  <Key bg={C.actionKey} grow={1.5}>
                    <AxIcon light={backspaceUrl} dark={backspaceDarkUrl} width={23} height={17} />
                  </Key>
                </div>
                <div className="mb-2 flex gap-[5px]">
                  <Key bg={C.actionKey} grow={1.6} fontSize={15}>
                    123
                  </Key>
                  <Key bg={C.actionKey} grow={1.2}>
                    <AxIcon light={localesUrl} dark={localesDarkUrl} width={14} height={17} />
                  </Key>
                  <Key grow={5} fontSize={15}>
                    <span style={{ opacity: 0.85 }}>space</span>
                  </Key>
                  <Key bg={C.actionKey} grow={1.6}>
                    <svg width="24" height="22" viewBox="0 0 24 24" fill="none">
                      <path d="M19 7v4a2 2 0 0 1-2 2H7" stroke={AX.glyph} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M11 9l-4 4 4 4" stroke={AX.glyph} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </Key>
                </div>
              </div>
            )}

            {view === 'check' && (
              <div className="shrink-0">
                <CheckPanel
                  state={check}
                  data={scenesKey.includes('checkGuide') ? CHECK_ES : CHECK_DATA}
                  scrollRef={checkScrollRef}
                  synRef={synRef}
                  detectRef={detectRef}
                  onClose={closeView}
                  showAnalyze={scenesKey.includes('checkGuide')}
                  pressed={pressed}
                />
              </div>
            )}
            {view === 'paste' && (
              <div className="shrink-0">
                <PastePanel
                  stage={pasteStage}
                  original={RECV_JA}
                  translation={RECV_EN}
                  pastePressed={pressed === 'pasteButton'}
                  onClose={closeView}
                />
              </div>
            )}
            {view === 'study' && (
              <div className="shrink-0">
                <StudyPanel stage={studyStage} rows={STUDY_ROWS} total={36} scroll={studyScroll} onClose={closeView} />
              </div>
            )}
            {view === 'options' && (
              <div className="shrink-0">
                <ArcatextOptionsPage
                  config={japaneseOptions(alphabet)}
                  scriptMenuOpen={optMenuOpen}
                  scriptHighlight={optHighlight ?? undefined}
                  onClose={closeView}
                />
              </div>
            )}

            {/* Globe and dictation, under the keyboard and under every view.
                Spaced as on device captures: 29pt from the last key row to the
                icons (12pt of keyboard padding + 17pt), 22pt from the bottom of
                an open view, and 28pt under them for the home indicator. */}
            <div
              style={{ backgroundColor: C.toolbarBar, paddingTop: view === 'none' ? 17 : 22 }}
              className="flex shrink-0 items-center justify-between px-5 pb-[28px]"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="9.2" stroke={AX.glyph} strokeWidth="1.5" />
                <ellipse cx="12" cy="12" rx="4" ry="9.2" stroke={AX.glyph} strokeWidth="1.5" />
                <path d="M3 12h18M4.5 7.5h15M4.5 16.5h15" stroke={AX.glyph} strokeWidth="1.5" />
              </svg>
              <Mic className="h-6 w-6" style={{ color: AX.glyph }} strokeWidth={2} />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 flex items-center gap-2">
        {onPause && (
          <button
            onClick={onPause}
            disabled={!running}
            aria-label="Pause all"
            title="Pause all"
            className="grid h-9 w-9 place-items-center rounded-full border border-border/60 text-foreground/80 transition-opacity hover:bg-muted disabled:opacity-35 disabled:hover:bg-transparent"
          >
            <Pause className="h-4 w-4" />
          </button>
        )}
        <button
          onClick={restart}
          aria-label="Restart"
          className="inline-flex items-center gap-2 rounded-full border border-border/60 px-4 py-2 text-sm font-medium text-foreground/80 hover:bg-muted"
        >
          <RotateCcw className="h-4 w-4" />
          Restart
        </button>
        {onPlay && (
          <button
            onClick={onPlay}
            disabled={running}
            aria-label="Play this one"
            title="Play this one"
            className="grid h-9 w-9 place-items-center rounded-full border border-border/60 text-foreground/80 transition-opacity hover:bg-muted disabled:opacity-35 disabled:hover:bg-transparent"
          >
            <Play className="h-4 w-4 translate-x-[1px]" />
          </button>
        )}
      </div>
    </div>
  );
}
