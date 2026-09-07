import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronsUpDown,
  Plus,
  ArrowUp,
  Mic,
  X,
  Play,
  Pause,
  RotateCcw,
  Settings,
  Trash2,
} from 'lucide-react';
import { Editable } from '@/content/Editable';
import { ArcatextRoadmap } from '@/components/ArcatextRoadmap';
// Keyboard glyphs, from the Arcatext design assets (shared with adalithic.com),
// so the toolbar and action keys match the shipping app rather than approximating it.
import menuUrl from '@/assets/keyboard/menu.svg';
import pasteUrl from '@/assets/keyboard/paste.svg';
import checkUrl from '@/assets/keyboard/check.svg';
import shiftUrl from '@/assets/keyboard/shift.svg';
import backspaceUrl from '@/assets/keyboard/backspace.svg';
import localesUrl from '@/assets/keyboard/locales.svg';

/**
 * ArcatextKeyboard
 *
 * An auto-playing, pausable, interactive walkthrough of the Arcatext keyboard
 * inside an iPhone Messages context. A timeline engine drives six scenes
 * (Type → Reword → Check → Paste → Menu → Reword Options); the play/pause
 * control below the phone toggles it and each toolbar button can be tapped to
 * jump to its scene. A right-side blurb explains the current step.
 *
 * Colors / sizes / labels come from the iOS source (asset catalog colorsets,
 * StandardToolbar / CustomStyleProvider / CheckView / PasteView /
 * ConfigurationsView / RewordOptionsView .swift).
 */

// ── Colors (light appearance, from the asset catalog) ────────────────────────
const C = {
  toolbarBar: '#D0D3DA',
  toolButtonBg: '#E6E6EB',
  toolIcon: '#0040DD',
  rewordBg: '#0040DD',
  checkText: '#0040DD',
  regularKey: '#FFFFFF',
  actionKey: '#B1C6E0',
  keyText: '#000000',
  send: '#0A7AFF',
  // view chrome
  viewBg: '#F2F2F7', // pasteBg
  cardBg: '#FFFFFF', // CheckCardBgColor / MenuCardBgColor
  cardStroke: '#E5E5EA', // MenuCardStrokeColor (approx)
  label: '#000000', // MenuLabelColor
  placeholder: '#8E8E93', // CheckPlaceholderColor
  primary: '#0040DD', // CheckPrimaryColor / accent
  selectedBg: '#D9EBFF', // CheckSelectedBgColor
  detail: '#8E8E93', // MenuDetailColor
  experimental: '#FFB200', // experimental badge
  smsGreen: '#34C759',
  recvGray: '#E9E9EB',
  xBtnBg: '#D7D9DE',
};

const EN = 'Hello, how are you my friend? Meet me at the bank.';
const JA = 'こんにちは、元気ですか、友よ？銀行で会いましょう。';
const REVERSE = "Hello, how are you, my friend? Let's meet at the bank.";
const SYNONYMS = [
  'やあ、調子はどう、友達？銀行で会おう。',
  'こんにちは、元気にしてる？友よ、銀行で会いましょう。',
  'こんにちは、いかがですか、友人？銀行で会いましょう。',
];
const HOMOGRAPHS = [
  { w: '銀行', d: 'a financial institution; a place for money' },
  { w: '土手', d: 'the land beside a river; a slope' },
];
const RECV_JA = 'わかった、すぐにそこで会おう。';
const RECV_EN = "Got it, let's meet there right away.";
const EN2 = 'See you soon!';
const JA2 = 'またすぐにね！';
const ROMAJI2 = 'mata sugu ni ne!';

const BLURB = {
  type: 'Start by typing a message in your native language.',
  reword:
    'The heart of Arcatext. Translates or refines your message in place while preserving intent, tone and language-specific nuance.',
  check:
    'See if the translation aligns to your intentions with a reverse translation and access additional learning and accuracy features like synonyms, homographs and gender specification.',
  paste:
    'Pulls outside text into the keyboard. Paste a note — or import a message you just received — to translate it and learn from a real conversation.',
  menu:
    'Opens the settings panel — choose your translation language, script/alphabet, formality and the preferences that shape every reword.',
  options:
    'Tunes a single message — switch script/alphabet, set speaker or recipient gender, or send a copy in another language.',
};

type Scene = 'type' | 'reword' | 'check' | 'paste' | 'menu' | 'options';

// Ordered steps with their context-card copy.
const SCENES: { key: Scene; blurb: keyof typeof BLURB; eyebrow: string }[] = [
  { key: 'type', blurb: 'type', eyebrow: 'Write' },
  { key: 'reword', blurb: 'reword', eyebrow: 'Reword' },
  { key: 'check', blurb: 'check', eyebrow: 'Check' },
  { key: 'paste', blurb: 'paste', eyebrow: 'Paste' },
  { key: 'menu', blurb: 'menu', eyebrow: 'Menu' },
  { key: 'options', blurb: 'options', eyebrow: 'Reword options' },
];
type View = 'none' | 'check' | 'paste' | 'menu' | 'options';
type Bubble = { id: number; text: string };

const DESIGN_W = 402;
const SCREEN_H = 874;
const BEZEL = 12;
const OUTER_W = DESIGN_W + BEZEL * 2;
const OUTER_H = SCREEN_H + BEZEL * 2;
const BASE_SCALE = 0.8;

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
        boxShadow: '0 1px 0 rgba(0,0,0,0.3)',
        fontSize,
        fontWeight: 400,
      }}
    >
      {num && (
        <span className="absolute right-[5px] top-[3px]" style={{ fontSize: 9, color: 'rgba(0,0,0,0.4)' }}>
          {num}
        </span>
      )}
      {children ?? label}
    </div>
  );
}

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <div className="px-1 pb-2 pt-1 text-[12px] font-medium uppercase tracking-wide" style={{ color: C.placeholder }}>
    {children}
  </div>
);

const Radio = ({ on }: { on?: boolean }) => (
  <span
    className="grid h-5 w-5 shrink-0 place-items-center rounded-full"
    style={{ border: `${on ? 2 : 1.5}px solid ${on ? C.primary : C.placeholder}` }}
  >
    {on && <span className="h-3 w-3 rounded-full" style={{ background: C.primary }} />}
  </span>
);

export default function ArcatextKeyboard() {
  // ── visual state driven by the timeline ──
  const [text, setText] = useState('');
  const [sent, setSent] = useState<Bubble[]>([]);
  const [received, setReceived] = useState<Bubble | null>(null);
  const [view, setView] = useState<View>('none');
  const [rewordLoading, setRewordLoading] = useState(false);
  const [pressed, setPressed] = useState<string | null>(null);
  const [playing, setPlaying] = useState(true);
  const [step, setStep] = useState(0);
  const [ended, setEnded] = useState(false);
  // check sub-state
  const [synShown, setSynShown] = useState(false);
  const [homoShown, setHomoShown] = useState(false);
  // paste
  const [pasteLoading, setPasteLoading] = useState(false);
  const [pasteResult, setPasteResult] = useState(false);
  // options
  const [optMenuOpen, setOptMenuOpen] = useState(false);
  const [alphabet, setAlphabet] = useState<'standard' | 'romanized'>('standard');

  // scroll refs
  const checkScrollRef = useRef<HTMLDivElement>(null);
  const synRef = useRef<HTMLDivElement>(null);
  const detectRef = useRef<HTMLDivElement>(null);
  const menuScrollRef = useRef<HTMLDivElement>(null);

  // engine refs
  const beatsRef = useRef<{ fn: () => void; ms: number }[]>([]);
  const startsRef = useRef<Record<Scene, number>>({} as Record<Scene, number>);
  const stepRef = useRef(0);
  const boundsRef = useRef<{ start: number; end: number }[]>([]);
  const endedRef = useRef(false);
  const posRef = useRef(0);
  const playRef = useRef(true);
  const tRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const bubbleId = useRef(1);

  const scrollTo = (ref: React.RefObject<HTMLDivElement | null>, top: number) =>
    ref.current?.scrollTo({ top, behavior: 'smooth' });
  const scrollToEl = (cont: React.RefObject<HTMLDivElement | null>, el: React.RefObject<HTMLElement | null>) => {
    if (cont.current && el.current) cont.current.scrollTo({ top: Math.max(0, el.current.offsetTop - 14), behavior: 'smooth' });
  };

  const schedule = useCallback(() => {
    clearTimeout(tRef.current);
    if (!playRef.current) return;
    const beats = beatsRef.current;
    const bounds = boundsRef.current[stepRef.current];
    if (!beats.length || !bounds) return;
    // Stop (auto-pause) at the end of the current step.
    if (posRef.current >= bounds.end) {
      playRef.current = false;
      endedRef.current = true;
      setPlaying(false);
      setEnded(true);
      return;
    }
    const beat = beats[posRef.current];
    beat.fn();
    posRef.current += 1;
    tRef.current = setTimeout(schedule, beat.ms);
  }, []);

  // Build the timeline once.
  useEffect(() => {
    const beats: { fn: () => void; ms: number }[] = [];
    const starts = {} as Record<Scene, number>;
    const b = (fn: () => void, ms: number) => beats.push({ fn, ms });
    const resetCommon = () => {
      setRewordLoading(false);
      setPressed(null);
      setSynShown(false);
      setHomoShown(false);
      setPasteLoading(false);
      setPasteResult(false);
      setOptMenuOpen(false);
      setAlphabet('standard');
    };

    // SCENE: type
    starts.type = beats.length;
    b(() => {
      resetCommon();
      setView('none');
      setSent([]);
      setReceived(null);
      setText('');
    }, 700);
    for (let i = 1; i <= EN.length; i++) {
      const s = EN.slice(0, i);
      b(() => setText(s), 42);
    }
    b(() => {}, 900);

    // SCENE: reword
    starts.reword = beats.length;
    b(() => {
      resetCommon();
      setView('none');
      setSent([]);
      setReceived(null);
      setText(EN);
    }, 700);
    b(() => {
      setPressed('reword');
      setRewordLoading(true);
    }, 320);
    b(() => setPressed(null), 1300);
    b(() => {
      setRewordLoading(false);
      setText(JA);
    }, 1100);

    // SCENE: check
    starts.check = beats.length;
    b(() => {
      resetCommon();
      setSent([]);
      setReceived(null);
      setText(JA);
      setView('check');
      requestAnimationFrame(() => scrollTo(checkScrollRef, 0));
    }, 1300);
    b(() => scrollToEl(checkScrollRef, synRef), 1200);
    b(() => setSynShown(true), 1500);
    b(() => scrollToEl(checkScrollRef, detectRef), 1200);
    b(() => setHomoShown(true), 1700);
    b(() => scrollTo(checkScrollRef, 99999), 1500);

    // SCENE: paste
    starts.paste = beats.length;
    b(() => {
      resetCommon();
      setView('none');
      setText('');
      setReceived(null);
      setSent([{ id: bubbleId.current++, text: JA }]);
    }, 800);
    b(() => setReceived({ id: bubbleId.current++, text: RECV_JA }), 1400);
    b(() => {
      setView('paste');
      setPasteLoading(true);
    }, 1100);
    b(() => {
      setPasteLoading(false);
      setPasteResult(true);
    }, 1300);
    b(() => {}, 2200);

    // SCENE: menu
    starts.menu = beats.length;
    b(() => {
      resetCommon();
      setView('menu');
      requestAnimationFrame(() => scrollTo(menuScrollRef, 0));
    }, 1000);
    b(() => scrollTo(menuScrollRef, 99999), 2400);
    b(() => scrollTo(menuScrollRef, 0), 1800);

    // SCENE: options
    starts.options = beats.length;
    b(() => {
      resetCommon();
      setView('none');
      setText('');
    }, 700);
    for (let i = 1; i <= EN2.length; i++) {
      const s = EN2.slice(0, i);
      b(() => setText(s), 60);
    }
    b(() => {
      setPressed('reword');
      setRewordLoading(true);
    }, 320);
    b(() => setPressed(null), 1000);
    b(() => {
      setRewordLoading(false);
      setText(JA2);
    }, 800);
    b(() => {
      setView('options');
      setPressed('options');
    }, 420);
    b(() => setPressed(null), 1000);
    b(() => setOptMenuOpen(true), 1300);
    b(() => {
      setAlphabet('romanized');
      setOptMenuOpen(false);
      setText(ROMAJI2);
    }, 1400);
    b(() => setView('none'), 1000);
    b(() => {
      setSent((prev) => [...prev, { id: bubbleId.current++, text: ROMAJI2 }]);
      setText('');
    }, 1500);
    b(() => {}, 1600);

    beatsRef.current = beats;
    startsRef.current = starts;
    const order = SCENES.map((s) => s.key);
    boundsRef.current = order.map((k, idx) => ({
      start: starts[k],
      end: idx < order.length - 1 ? starts[order[idx + 1]] : beats.length,
    }));
    // Autoplay the first step; it auto-pauses at its end.
    stepRef.current = 0;
    setStep(0);
    endedRef.current = false;
    posRef.current = boundsRef.current[0].start;
    playRef.current = true;
    schedule();
    return () => clearTimeout(tRef.current);
  }, [schedule]);

  // Play step `i` from its start; it auto-pauses at its end.
  const goToStep = (i: number) => {
    clearTimeout(tRef.current);
    const n = Math.max(0, Math.min(SCENES.length - 1, i));
    stepRef.current = n;
    setStep(n);
    posRef.current = boundsRef.current[n]?.start ?? 0;
    endedRef.current = false;
    setEnded(false);
    playRef.current = true;
    setPlaying(true);
    schedule();
  };

  const togglePlay = () => {
    if (playRef.current) {
      // pause within the current step
      playRef.current = false;
      setPlaying(false);
      clearTimeout(tRef.current);
    } else {
      // if the step already finished, replay it from the start
      if (endedRef.current) {
        posRef.current = boundsRef.current[stepRef.current]?.start ?? 0;
        endedRef.current = false;
        setEnded(false);
      }
      playRef.current = true;
      setPlaying(true);
      schedule();
    }
  };

  const restart = () => goToStep(0);
  const next = () => goToStep(stepRef.current + 1);
  const back = () => goToStep(stepRef.current - 1);
  const jump = (scene: Scene) => goToStep(SCENES.findIndex((s) => s.key === scene));

  // Close the active view: pause and mark the step finished so Play replays it.
  const closeView = () => {
    clearTimeout(tRef.current);
    playRef.current = false;
    setPlaying(false);
    endedRef.current = true;
    setEnded(true);
    setView('none');
  };

  // ── derived ──
  const hasText = text.length > 0;
  const showChat = sent.length > 0 || received !== null;
  // View panel heights (pt in the 874-tall design space). The views are taller
  // than the keyboard and push the input field up, matching the real app.
  const viewHeight = view === 'check' ? 486 : view === 'paste' ? 472 : view === 'menu' ? 486 : view === 'options' ? 486 : 0;

  // ── keyboard rows ──
  const lower = view !== 'options' && text === ''; // show lowercase look while typing iMessage start
  const row1 = ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'];
  const row2 = ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'];
  const row3 = ['z', 'x', 'c', 'v', 'b', 'n', 'm'];
  const nums = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];

  return (
    <div className="reveal">
      <div className="mb-8">
        <div className="mb-3 flex items-baseline gap-4">
          <span className="font-mono text-sm tracking-wider text-primary/70">00</span>
          <Editable
            as="span"
            path="arcatext.interactive.eyebrow"
            className="text-xs uppercase tracking-[0.2em] text-muted-foreground"
          />
        </div>
        <h2 className="max-w-2xl text-balance text-3xl font-bold tracking-tight sm:text-4xl">
          <Editable as="span" path="arcatext.interactive.titleLead" />{' '}
          <Editable as="span" path="arcatext.interactive.titleHighlight" className="gradient-text" />
        </h2>
        <Editable
          as="p"
          path="arcatext.interactive.description"
          multiline
          className="mt-3 max-w-xl text-sm text-muted-foreground sm:text-base"
        />
      </div>

      <div className="relative flex w-full flex-col gap-10 xl:flex-row xl:items-start xl:gap-12">
        {/* Left: the live interactive demo (Phase 1). */}
        <div className="xl:shrink-0">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
            <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" aria-hidden />
            Phase 1 · Live today
          </div>
          <div className="flex flex-col items-start gap-6 lg:flex-row lg:items-center lg:gap-8">
          {/* iPhone */}
          <div style={{ width: OUTER_W * BASE_SCALE, height: OUTER_H * BASE_SCALE }}>
            <div
              className="relative bg-black"
              style={{
                width: OUTER_W,
                height: OUTER_H,
                padding: BEZEL,
                borderRadius: 56,
                transform: `scale(${BASE_SCALE})`,
                transformOrigin: 'top left',
                boxShadow: '0 30px 60px -20px rgba(20,10,40,0.5)',
              }}
            >
              <div
                className="relative flex flex-col overflow-hidden bg-white"
                style={{ width: DESIGN_W, height: SCREEN_H, borderRadius: 44 }}
              >
                {/* Status bar */}
                <div className="relative flex h-11 items-center justify-between px-7 pt-1 text-black">
                  <span className="text-[15px] font-semibold">12:11</span>
                  <div className="absolute left-1/2 top-2 h-7 w-[100px] -translate-x-1/2 rounded-full bg-black" />
                  <div className="flex items-center gap-1.5">
                    <div className="flex items-end gap-[2px]">
                      {[6, 9, 12, 15].map((h, i) => (
                        <span key={i} className="w-[3px] rounded-[1px] bg-black" style={{ height: h }} />
                      ))}
                    </div>
                    <svg width="17" height="13" viewBox="0 0 17 13" fill="none">
                      <path
                        d="M8.5 2.2c2.5 0 4.8 1 6.5 2.6l-1.3 1.4A7.7 7.7 0 008.5 4.1 7.7 7.7 0 003.3 6.2L2 4.8A9.5 9.5 0 018.5 2.2zm0 3.6c1.5 0 2.9.6 3.9 1.6l-1.4 1.4a3.5 3.5 0 00-5 0L4.6 7.4A5.5 5.5 0 018.5 5.8zm0 3.5c.7 0 1.3.3 1.8.8L8.5 12 6.7 10.1c.5-.5 1.1-.8 1.8-.8z"
                        fill="black"
                      />
                    </svg>
                    <div className="ml-[1px] flex h-[13px] w-[24px] items-center rounded-[3px] border border-black/40 p-[1.5px]">
                      <div className="h-full w-full rounded-[1px] bg-black" />
                    </div>
                  </div>
                </div>

                {/* Header */}
                <div className="flex flex-col items-center border-b border-black/5 px-4 pb-3 pt-1">
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
                      <span className="text-[15px] font-semibold text-black">+1 (888) 555-1212</span>
                      <ChevronRight className="h-4 w-4 text-black/50" strokeWidth={2.4} />
                    </div>
                  </div>
                </div>

                {/* Conversation */}
                <div className="flex flex-1 flex-col justify-end gap-1.5 overflow-hidden px-3 pb-2">
                  {showChat && (
                    <>
                      <div className="text-center text-[13px] font-medium text-black/40">iMessage</div>
                      <div className="mb-1 flex items-center justify-center gap-1 text-[12px] text-black/40">
                        <svg width="9" height="11" viewBox="0 0 9 11" fill="none">
                          <rect x="0.6" y="4.6" width="7.8" height="6" rx="1.6" fill="currentColor" />
                          <path d="M2 4.5V3a2.5 2.5 0 015 0v1.5" stroke="currentColor" strokeWidth="1.1" fill="none" />
                        </svg>
                        Encrypted
                      </div>
                      <div className="mb-1 text-center text-[12px] text-black/45">
                        Today <span className="font-medium">12:12 AM</span>
                      </div>
                    </>
                  )}
                  {received && (
                    <div className="flex justify-start">
                      <div className="max-w-[78%] rounded-[20px] px-3.5 py-2 text-[17px] text-black" style={{ background: C.recvGray }}>
                        {received.text}
                      </div>
                    </div>
                  )}
                  {sent.map((m, i) => (
                    <div key={m.id} className="flex flex-col items-end">
                      <div
                        className="max-w-[78%] rounded-[20px] px-3.5 py-2 text-[17px] text-white"
                        style={{ background: C.smsGreen }}
                      >
                        {m.text}
                      </div>
                      {i === sent.length - 1 && !received && (
                        <span className="mr-1 mt-0.5 text-[11px] text-black/45">Delivered</span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Input bar */}
                <div className="flex items-center gap-2 px-3 pb-2 pt-1">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#e6e8ec]">
                    <Plus className="h-5 w-5 text-[#6b7280]" strokeWidth={2.6} />
                  </div>
                  <div className="flex h-9 flex-1 items-center rounded-full border border-black/15 pl-4 pr-2">
                    {hasText ? (
                      <span className="text-[15px] text-black">{text}</span>
                    ) : (
                      <span className="text-[15px]" style={{ color: '#9aa0a6' }}>
                        iMessage
                      </span>
                    )}
                    <span className="ml-[1px] inline-block h-4 w-[2px] animate-pulse" style={{ background: C.send }} />
                    <div className="flex-1" />
                    {!hasText && <Mic className="h-5 w-5 shrink-0" style={{ color: '#9aa0a6' }} strokeWidth={2} />}
                  </div>
                  {hasText && (
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full" style={{ backgroundColor: C.send }}>
                      <ArrowUp className="h-5 w-5 text-white" strokeWidth={2.8} />
                    </div>
                  )}
                </div>

                {/* Keyboard — replaced by the active view panel when one is open */}
                {view === 'none' && (
                <div style={{ backgroundColor: C.toolbarBar }} className="px-[5px] pb-1 pt-2">
                  {/* Toolbar */}
                  <div className="mb-2 flex items-center" style={{ height: 50, gap: 8 }}>
                    <button onClick={() => jump('menu')} className="relative ml-2 mr-[3px]" aria-label="Open menu">
                      <div className="grid place-items-center rounded-[12px]" style={{ width: 57, height: 50, backgroundColor: C.toolButtonBg }}>
                        <img src={menuUrl} alt="" style={{ width: 21, height: 21 }} />
                      </div>
                    </button>
                    <button onClick={() => jump('paste')} className="relative mr-[3px]" aria-label="Open paste">
                      <div className="grid place-items-center rounded-[12px]" style={{ width: 57, height: 50, backgroundColor: C.toolButtonBg }}>
                        <img src={pasteUrl} alt="" style={{ width: 16, height: 20 }} />
                      </div>
                    </button>
                    <button onClick={() => jump('check')} className="relative" aria-label="Open check">
                      <div className="grid place-items-center rounded-[12px]" style={{ width: 57, height: 50, backgroundColor: C.toolButtonBg }}>
                        <img src={checkUrl} alt="" style={{ width: 20, height: 20 }} />
                      </div>
                    </button>
                    <div className="flex-1" />
                    <div
                      className="relative mr-2 flex items-stretch overflow-hidden rounded-[12px]"
                      style={{ height: 50, backgroundColor: pressed === 'reword' ? '#002B96' : C.rewordBg }}
                    >
                      <button onClick={() => jump('reword')} className="relative flex items-center px-3" aria-label="Reword">
                        {rewordLoading ? (
                          <span className="block h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                        ) : (
                          <span className="text-[16px] font-medium text-white">Reword</span>
                        )}
                      </button>
                      <div className="self-center" style={{ width: 1, height: 20, backgroundColor: 'rgba(255,255,255,0.5)' }} />
                      <button onClick={() => jump('options')} className="relative grid place-items-center" style={{ width: 40 }} aria-label="Reword options">
                        <ChevronDown className="h-4 w-4 text-white" strokeWidth={2.4} />
                      </button>
                    </div>
                  </div>

                  {/* Rows */}
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
                      <img src={shiftUrl} alt="shift" style={{ width: 19, height: 17 }} />
                    </Key>
                    {row3.map((l) => (
                      <Key key={l} label={lower ? l : l.toUpperCase()} />
                    ))}
                    <Key bg={C.actionKey} grow={1.5}>
                      <img src={backspaceUrl} alt="backspace" style={{ width: 23, height: 17 }} />
                    </Key>
                  </div>
                  <div className="mb-2 flex gap-[5px]">
                    <Key bg={C.actionKey} grow={1.6} fontSize={15}>
                      123
                    </Key>
                    <Key bg={C.actionKey} grow={1.2}>
                      <img src={localesUrl} alt="languages" style={{ width: 14, height: 17 }} />
                    </Key>
                    <Key grow={5} fontSize={15}>
                      <span className="text-black/85">space</span>
                    </Key>
                    <Key bg={C.actionKey} grow={1.6}>
                      <svg width="24" height="22" viewBox="0 0 24 24" fill="none">
                        <path d="M19 7v4a2 2 0 0 1-2 2H7" stroke="rgba(0,0,0,0.82)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M11 9l-4 4 4 4" stroke="rgba(0,0,0,0.82)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </Key>
                  </div>
                </div>
                )}

                {/* ── Active view panel — taller than the keyboard, pushes the field up ── */}
                {view !== 'none' && (
                    <div className="relative flex flex-col" style={{ height: viewHeight, background: C.viewBg }}>
                      {/* Header */}
                      <div className="relative flex h-[56px] items-center justify-center px-3">
                        {view === 'paste' && (
                          <Settings className="absolute left-3 h-[22px] w-[22px]" style={{ color: C.primary }} />
                        )}
                        <span className="text-[16px] font-semibold" style={{ color: C.label }}>
                          {view === 'check'
                            ? 'Check'
                            : view === 'paste'
                            ? 'Translate Received Messages'
                            : view === 'menu'
                            ? 'Menu'
                            : 'Reword Options'}
                        </span>
                        <button
                          onClick={closeView}
                          aria-label="Close"
                          className="absolute right-3 grid h-[38px] w-[38px] place-items-center rounded-[12px]"
                          style={{ background: C.xBtnBg }}
                        >
                          <X className="h-[18px] w-[18px]" style={{ color: '#3a3a3c' }} strokeWidth={2.4} />
                        </button>
                      </div>

                      {/* CHECK */}
                      {view === 'check' && (
                        <div ref={checkScrollRef} className="relative flex-1 overflow-y-auto px-3 pb-4">
                          <SectionLabel>Reword Intent Check</SectionLabel>
                          <div className="rounded-[12px] border p-3.5" style={{ background: C.cardBg, borderColor: C.cardStroke }}>
                            <p className="text-[17px] leading-snug" style={{ color: C.label }}>
                              {REVERSE}
                            </p>
                            <div className="mt-3 flex items-center gap-1 text-[16px] font-medium" style={{ color: C.primary }}>
                              English <ChevronRight className="h-4 w-4" strokeWidth={2.4} />
                            </div>
                          </div>
                          <p className="px-1 pt-2 text-[14px]" style={{ color: C.placeholder }}>
                            Verify that Reword captured your intent.
                          </p>

                          <div className="pt-4">
                            <SectionLabel>Current Reword</SectionLabel>
                            <div className="flex items-start gap-3 rounded-[12px] border p-3.5" style={{ background: C.cardBg, borderColor: C.cardStroke }}>
                              <p className="flex-1 text-[17px] leading-snug" style={{ color: C.label }}>
                                {JA}
                              </p>
                              <Radio />
                            </div>
                          </div>

                          <div className="pt-4">
                            <SectionLabel>Original Message</SectionLabel>
                            <div className="flex items-start gap-3 rounded-[12px] border p-3.5" style={{ background: C.cardBg, borderColor: C.cardStroke }}>
                              <p className="flex-1 text-[17px] leading-snug" style={{ color: C.label }}>
                                {EN}
                              </p>
                              <Radio />
                            </div>
                          </div>

                          {/* Synonyms */}
                          <div ref={synRef} className="pt-5">
                            <SectionLabel>Synonyms</SectionLabel>
                            {!synShown ? (
                              <button
                                className="flex h-[38px] w-full items-center justify-center rounded-[12px] text-[16px] font-medium text-white"
                                style={{ background: C.primary }}
                              >
                                Show synonyms
                              </button>
                            ) : (
                              <div className="flex flex-col gap-2.5">
                                {SYNONYMS.map((s, i) => (
                                  <div key={i} className="flex items-start gap-3 rounded-[12px] border p-3.5" style={{ background: C.cardBg, borderColor: C.cardStroke }}>
                                    <p className="flex-1 text-[17px] leading-snug" style={{ color: C.label }}>
                                      {s}
                                    </p>
                                    <Radio />
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Detected in your message */}
                          <div ref={detectRef} className="pt-5">
                            <div className="flex items-center justify-between pb-2">
                              <span className="px-1 text-[12px] font-medium uppercase tracking-wide" style={{ color: C.placeholder }}>
                                Detected in your message
                              </span>
                              <span className="rounded-[8px] px-2 py-1 text-[13px] font-medium" style={{ background: C.experimental, color: '#000' }}>
                                Experimental
                              </span>
                            </div>
                            <div className="rounded-[12px] border p-3" style={{ background: C.cardBg, borderColor: C.cardStroke }}>
                              {!homoShown ? (
                                <>
                                  <button className="flex h-[38px] w-full items-center justify-center rounded-[12px] text-[16px] font-medium" style={{ background: C.selectedBg, color: C.checkText }}>
                                    Check homographs
                                  </button>
                                  <p className="px-1 pb-3 pt-2 text-[16px] leading-snug" style={{ color: C.placeholder }}>
                                    Words with the same spelling, multiple meanings.
                                  </p>
                                </>
                              ) : (
                                <div className="pb-2">
                                  <div className="mb-1 inline-block border-b-2 pb-1 text-[16px] font-medium" style={{ color: C.primary, borderColor: C.primary }}>
                                    bank
                                  </div>
                                  <div className="flex gap-2 overflow-x-auto pb-1">
                                    {HOMOGRAPHS.map((h, i) => (
                                      <div
                                        key={i}
                                        className="shrink-0 rounded-[10px] p-3"
                                        style={{
                                          width: 150,
                                          background: i === 0 ? C.selectedBg : C.cardBg,
                                          border: `${i === 0 ? 2 : 1}px solid ${i === 0 ? C.primary : C.cardStroke}`,
                                        }}
                                      >
                                        <div className="text-[16px] font-semibold" style={{ color: i === 0 ? C.primary : C.label }}>
                                          {h.w}
                                        </div>
                                        <div className="mt-1 text-[15px] leading-snug" style={{ color: i === 0 ? C.primary : C.label }}>
                                          {h.d}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              <button className="mt-1 flex h-[38px] w-full items-center justify-center rounded-[12px] text-[16px] font-medium" style={{ background: C.selectedBg, color: C.checkText }}>
                                Check gendered words
                              </button>
                              <p className="px-1 pt-2 text-[16px] leading-snug" style={{ color: C.placeholder }}>
                                Words that change depending on gender.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* PASTE */}
                      {view === 'paste' && (
                        <div className="flex flex-1 flex-col">
                          <div className="flex gap-1 rounded-[8px] p-1 mx-3" style={{ background: '#E3E3E8' }}>
                            <div className="flex-1 rounded-[6px] bg-white py-1.5 text-center text-[15px] font-medium" style={{ color: C.label }}>
                              Original
                            </div>
                            <div className="flex-1 py-1.5 text-center text-[15px] font-medium" style={{ color: '#5a5a5e' }}>
                              Sentences
                            </div>
                          </div>
                          <div className="flex-1 overflow-y-auto px-4 pt-3">
                            {pasteLoading ? (
                              <div className="flex h-24 items-center justify-center">
                                <span className="block h-6 w-6 animate-spin rounded-full border-2 border-black/20 border-t-black/60" />
                              </div>
                            ) : pasteResult ? (
                              <div>
                                <div className="flex items-start justify-between gap-2">
                                  <p className="text-[18px] leading-snug" style={{ color: C.label }}>
                                    {RECV_EN}
                                  </p>
                                  <ChevronDown className="mt-1 h-5 w-5 rotate-180" style={{ color: '#3a3a3c' }} strokeWidth={2.2} />
                                </div>
                                <div className="mt-3 border-l-[3px] pl-2.5 text-[18px] leading-snug" style={{ borderColor: C.primary, color: C.label }}>
                                  {RECV_JA}
                                </div>
                              </div>
                            ) : null}
                          </div>
                          <div className="flex items-center justify-between border-t px-4 py-2.5" style={{ borderColor: C.cardStroke }}>
                            <span className="text-[16px] font-medium" style={{ color: C.primary }}>
                              English
                            </span>
                            <div className="flex items-center gap-3">
                              <Trash2 className="h-[22px] w-[22px]" style={{ color: C.primary }} strokeWidth={2} />
                              <span className="rounded-[12px] px-5 py-2 text-[16px] font-medium text-white" style={{ background: C.rewordBg }}>
                                Paste
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* MENU */}
                      {view === 'menu' && (
                        <div ref={menuScrollRef} className="flex-1 overflow-y-auto px-3 pb-4 pt-1">
                          <div className="flex gap-2 overflow-x-auto pb-3">
                            {['Spanish', 'French', 'German', 'Japanese', 'Italian'].map((l) => {
                              const on = l === 'Japanese';
                              return (
                                <div
                                  key={l}
                                  className="shrink-0 px-4 py-2.5 text-[16px]"
                                  style={{
                                    borderRadius: on ? 25 : 12,
                                    background: on ? C.selectedBg : C.cardBg,
                                    border: `${on ? 2 : 1}px solid ${on ? C.primary : C.cardStroke}`,
                                    color: on ? C.primary : C.label,
                                  }}
                                >
                                  {l}
                                </div>
                              );
                            })}
                          </div>
                          <div className="flex items-center justify-between rounded-[16px] border px-4 py-3.5" style={{ background: C.cardBg, borderColor: C.cardStroke }}>
                            <span className="text-[16px]" style={{ color: C.label }}>
                              More Reword Languages
                            </span>
                            <ChevronRight className="h-4 w-4" style={{ color: C.detail }} strokeWidth={2.2} />
                          </div>
                          <div className="mt-4 rounded-[16px] border" style={{ background: C.cardBg, borderColor: C.cardStroke }}>
                            <div className="flex items-center justify-between px-4 py-3.5">
                              <span className="text-[16px]" style={{ color: C.label }}>
                                Reword Includes Translation Copy
                              </span>
                              <div className="h-6 w-10 rounded-full bg-black/15 p-0.5">
                                <div className="h-5 w-5 rounded-full bg-white shadow" />
                              </div>
                            </div>
                            <div className="mx-4 border-t" style={{ borderColor: C.cardStroke }} />
                            <div className="flex items-center justify-between px-4 py-3.5">
                              <span className="text-[16px]" style={{ color: C.label }}>
                                View Copy In...
                              </span>
                              <span className="flex items-center gap-1 text-[16px]" style={{ color: C.detail }}>
                                English <ChevronRight className="h-4 w-4" strokeWidth={2.2} />
                              </span>
                            </div>
                          </div>
                          <div className="mt-4 rounded-[16px] border px-4 py-3.5" style={{ background: C.cardBg, borderColor: C.cardStroke }}>
                            <div className="flex items-center justify-between">
                              <span className="text-[16px]" style={{ color: C.label }}>
                                Autocorrect Languages
                              </span>
                              <span className="text-[18px]" style={{ color: C.label }}>
                                文
                              </span>
                            </div>
                            <div className="mt-1 flex items-center justify-between">
                              <span className="text-[16px]" style={{ color: C.detail }}>
                                EN, ES
                              </span>
                              <ChevronRight className="h-4 w-4" style={{ color: C.detail }} strokeWidth={2.2} />
                            </div>
                          </div>
                          <div className="mt-4 flex gap-3">
                            <div className="flex-1 rounded-[16px] border px-4 py-3.5" style={{ background: C.cardBg, borderColor: C.cardStroke }}>
                              <div className="text-[16px]" style={{ color: C.label }}>
                                Your Gender
                              </div>
                              <div className="mt-1 flex items-center justify-between">
                                <span className="text-[16px]" style={{ color: C.detail }}>
                                  Male
                                </span>
                                <ChevronRight className="h-4 w-4" style={{ color: C.detail }} strokeWidth={2.2} />
                              </div>
                            </div>
                            <div className="flex-1 rounded-[16px] border px-4 py-3.5" style={{ background: C.cardBg, borderColor: C.cardStroke }}>
                              <div className="text-[16px]" style={{ color: C.label }}>
                                Typing Settings
                              </div>
                              <div className="mt-1 flex justify-end">
                                <ChevronRight className="h-4 w-4" style={{ color: C.detail }} strokeWidth={2.2} />
                              </div>
                            </div>
                          </div>
                          <div className="mt-4 rounded-[16px] border px-4 py-3.5" style={{ background: C.cardBg, borderColor: C.cardStroke }}>
                            <div className="flex items-center justify-between">
                              <span className="text-[16px] font-semibold" style={{ color: C.label }}>
                                Resets in 1 day
                              </span>
                              <span className="text-[16px] font-semibold" style={{ color: C.label }}>
                                ~37%
                              </span>
                            </div>
                            <div className="mt-2 h-2 w-full overflow-hidden rounded-full" style={{ background: '#D9D9D9' }}>
                              <div className="h-full rounded-full" style={{ width: '37%', background: C.primary }} />
                            </div>
                            <p className="mt-2 text-[15px] leading-snug" style={{ color: C.placeholder }}>
                              The amount of AI tokens you've used so far this month.
                            </p>
                          </div>
                        </div>
                      )}

                      {/* REWORD OPTIONS */}
                      {view === 'options' && (
                        <div className="relative flex-1 px-3 pt-4">
                          <SectionLabel>Reword Language Alphabet (Japanese)</SectionLabel>
                          <div className="flex items-center justify-between rounded-[13px] px-4 py-3.5" style={{ background: C.cardBg }}>
                            <span className="text-[17px] font-semibold" style={{ color: C.label }}>
                              {alphabet === 'romanized' ? 'Romanized' : 'Standard'}
                            </span>
                            <span className="flex items-center gap-3 text-[16px]" style={{ color: C.placeholder }}>
                              {alphabet === 'romanized' ? 'ABC' : 'Kanji / Hiragana / Katakana'}
                              <ChevronsUpDown className="h-5 w-5" style={{ color: C.placeholder }} strokeWidth={2} />
                            </span>
                          </div>
                          {optMenuOpen && (
                            <div className="absolute right-3 top-[120px] w-[300px] overflow-hidden rounded-[13px] bg-white shadow-xl" style={{ border: `1px solid ${C.cardStroke}` }}>
                              <div className="flex items-center justify-between px-4 py-3">
                                <span className="text-[17px] font-semibold" style={{ color: C.label }}>
                                  No Kanji
                                </span>
                                <span className="text-[16px]" style={{ color: C.placeholder }}>
                                  Hiragana / Katakana
                                </span>
                              </div>
                              <div className="mx-2 border-t" style={{ borderColor: C.cardStroke }} />
                              <div className="flex items-center justify-between px-4 py-3" style={{ background: C.selectedBg }}>
                                <span className="text-[17px] font-semibold" style={{ color: C.label }}>
                                  Romanized
                                </span>
                                <span className="text-[16px]" style={{ color: C.placeholder }}>
                                  ABC
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                {/* Bottom utility strip (stays visible under overlays) */}
                <div style={{ backgroundColor: C.toolbarBar }} className="flex items-center justify-between px-5 pb-2 pt-1">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="9.2" stroke="rgba(0,0,0,0.82)" strokeWidth="1.5" />
                    <ellipse cx="12" cy="12" rx="4" ry="9.2" stroke="rgba(0,0,0,0.82)" strokeWidth="1.5" />
                    <path d="M3 12h18M4.5 7.5h15M4.5 16.5h15" stroke="rgba(0,0,0,0.82)" strokeWidth="1.5" />
                  </svg>
                  <Mic className="h-6 w-6" style={{ color: 'rgba(0,0,0,0.82)' }} strokeWidth={2} />
                </div>
              </div>
            </div>
          </div>

          {/* Context card — explains the current step and steps through them */}
          <div className="w-full max-w-sm lg:w-[300px]">
            <div className="overflow-hidden rounded-2xl border border-primary/25 bg-card shadow-lg">
              <div className="h-1 w-full gradient-bg" />
              <div className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                    {SCENES[step].eyebrow}
                  </span>
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {String(step + 1).padStart(2, '0')} / {String(SCENES.length).padStart(2, '0')}
                  </span>
                </div>
                <p className="mt-2 min-h-[6.5rem] text-sm leading-relaxed text-muted-foreground">
                  {BLURB[SCENES[step].blurb]}
                </p>
                <div className="mt-4 flex items-center gap-2">
                  <button
                    onClick={back}
                    disabled={step === 0}
                    className="inline-flex items-center gap-1 rounded-full border border-border/60 px-3.5 py-2 text-xs font-medium text-foreground/80 transition-colors enabled:hover:bg-muted disabled:opacity-40"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    Back
                  </button>
                  <button
                    onClick={next}
                    disabled={step === SCENES.length - 1}
                    className="inline-flex flex-1 items-center justify-center gap-1 rounded-full px-3.5 py-2 text-xs font-semibold text-white gradient-bg transition-opacity disabled:opacity-40"
                  >
                    Next
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Controls — under the phone */}
        <div style={{ width: OUTER_W * BASE_SCALE }} className="mt-6 flex items-center justify-center gap-3">
          <button
            onClick={togglePlay}
            className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium text-white gradient-bg"
          >
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {playing ? 'Pause' : ended ? 'Replay step' : 'Play'}
          </button>
          <button
            onClick={restart}
            aria-label="Restart"
            className="inline-flex items-center gap-2 rounded-full border border-border/60 px-4 py-2.5 text-sm font-medium text-foreground/80 hover:bg-muted"
          >
            <RotateCcw className="h-4 w-4" />
            Restart
          </button>
        </div>

        {/* Helper hint — under the controls */}
        <p
          style={{ width: OUTER_W * BASE_SCALE }}
          className="mt-3 text-center text-xs leading-relaxed text-muted-foreground"
        >
          Explore the prototype by clicking any button in the toolbar! You can also close any view.
        </p>
        </div>

        {/* Right: the product roadmap (Phases 2–4) — how the project evolves. */}
        <div className="min-w-0 flex-1">
          <ArcatextRoadmap />
        </div>
      </div>
    </div>
  );
}
