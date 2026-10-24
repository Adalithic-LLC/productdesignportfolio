import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowUp, ChevronLeft, ChevronRight, Copy, CornerUpLeft, Languages, Mic, MoreHorizontal, Plus } from 'lucide-react';
import { AX } from '@/lib/arcatextTheme';
import ArcatextOptionsPage, { type OptionsConfig } from '@/components/ArcatextOptionsPage';
import { CheckPanel, FixWordsCard, VIEW_H, type CheckData, type CheckState } from '@/components/ArcatextViews';
import { PrototypeKeyboard, type KeyAction, type ToolAction } from './PrototypeKeyboard';
import { LANGS, MESSAGE, RECEIVED, TRIP_GLOSSES, findLang, outFor } from './data';
import {
  KeyboardsPage,
  LanguageList,
  LocalePopover,
  PasteView,
  StudyView,
  ToastBar,
  type PasteItem,
  type Toast,
} from './PrototypeViews';
import { INITIAL_LOCALES, STUDY_SEED, type Locale } from './seed';

/**
 * The "Try it out!" prototype: the Arcatext keyboard in a Messages
 * conversation, every control live. It draws with the same palette and views
 * as the demo phones (ArcatextKeyboard, ArcatextViews, ArcatextOptionsPage),
 * but where those play a timeline, this holds real state:
 *
 *  - any key writes the whole scripted message, and backspace clears it: the
 *    point of the prototype is everything that happens *after* a message is
 *    typed, and spelling one out a character at a time is forty taps of
 *    nothing. A press that drags still draws its glide trail
 *  - Reword turns the field into the chosen language and script; changing an
 *    option and closing Options rewords the saved original again, as
 *    RewordService.autoReword does
 *  - send, with a translation copy when that option is on
 *  - long press a message to copy it; paste it in Paste to translate it
 *  - Check with its loads and choices, and Fix Words; the Study Guide with
 *    its delete flow; the locale switcher, adding and removing keyboards
 *
 * Every answer comes from ./data -- there is no model behind it.
 */

const DESIGN_W = 402;
const SCREEN_H = 874;
const BEZEL = 12;

type View =
  | 'none'
  | 'check'
  | 'fixWords'
  | 'paste'
  | 'study'
  | 'options'
  | 'languages'
  | 'copyLanguages'
  | 'pasteLanguages'
  | 'keyboards';

type Msg = { id: number; from: 'me' | 'them'; text: string; copy?: string };

const CHECK_START: CheckState = { opening: true, reverse: 'loading', synonyms: 'idle', homographs: 'idle', gender: 'idle' };

/** The current time, as the status bar shows it (12-hour, no AM/PM). */
function useClock() {
  const fmt = () => {
    const d = new Date();
    return `${d.getHours() % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')}`;
  };
  const [t, setT] = useState(fmt);
  useEffect(() => {
    const id = setInterval(() => setT(fmt()), 15000);
    return () => clearInterval(id);
  }, []);
  return t;
}

export default function ArcatextPrototype({ scale = 1, bezel = true }: { scale?: number; bezel?: boolean }) {
  const clock = useClock();

  // ── the message field ──
  const [text, setText] = useState('');
  /** The field holds a Reword result (not something typed). */
  const [reworded, setReworded] = useState(false);
  /** What the reword was made from, kept to reword again (originalTextKey). */
  const [original, setOriginal] = useState('');
  const [rewording, setRewording] = useState(false);
  const [shift, setShift] = useState<boolean | null>(null);
  const [numbers, setNumbers] = useState(false);

  // ── options ──
  const [lang, setLang] = useState('Spanish');
  const [recents, setRecents] = useState<string[]>(['Japanese']);
  const [scripts, setScripts] = useState<Record<string, string>>({});
  const [recipient, setRecipient] = useState<'Male' | 'Female'>('Male');
  const [groupChat, setGroupChat] = useState(false);
  const [speaker, setSpeaker] = useState<'Male' | 'Female'>('Male');
  const [copyOn, setCopyOn] = useState(false);
  const [copyLang, setCopyLang] = useState('English');
  const [scriptMenu, setScriptMenu] = useState(false);
  /** An option changed while a reword sits in the field: reword on close. */
  const dirty = useRef(false);

  // ── conversation ──
  const [msgs, setMsgs] = useState<Msg[]>([{ id: 1, from: 'them', text: RECEIVED }]);
  const nextId = useRef(2);
  const [menu, setMenu] = useState<{ id: number; top: number; from: 'me' | 'them' } | null>(null);
  const [clipboard, setClipboard] = useState<string | null>(null);

  // ── views ──
  const [view, setView] = useState<View>('none');
  const [check, setCheck] = useState<CheckState>(CHECK_START);
  const [checkData, setCheckData] = useState<CheckData | null>(null);
  const [checkSel, setCheckSel] = useState('reword');
  const [meaning, setMeaning] = useState(0);
  const [fixText, setFixText] = useState('');
  const [pasteItems, setPasteItems] = useState<PasteItem[]>([]);
  const [pasting, setPasting] = useState(false);
  const [pasteLang, setPasteLang] = useState('Spanish');
  const [study, setStudy] = useState(STUDY_SEED);
  const [locales, setLocales] = useState<Locale[]>(INITIAL_LOCALES);
  const [locale, setLocale] = useState(INITIAL_LOCALES[0].id);
  const [popover, setPopover] = useState(false);
  /** The space bar names the language for 2s after a switch. */
  const [spaceLabel, setSpaceLabel] = useState('space');
  const [toast, setToast] = useState<Toast | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const showToast = (t: Toast) => {
    clearTimeout(toastTimer.current);
    setToast(t);
    toastTimer.current = setTimeout(() => setToast(null), 5000);
  };
  const spaceTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const switchTo = (id: string) => {
    setLocale(id);
    clearTimeout(spaceTimer.current);
    setSpaceLabel(locales.find((l) => l.id === id)?.name ?? 'space');
    spaceTimer.current = setTimeout(() => setSpaceLabel('space'), 2000);
  };

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const later = (fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  };
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const L = findLang(lang);
  const script = scripts[lang] ?? L.scripts?.[0].title;
  const out = outFor(L, script);

  // ── typing ──
  const autoCap = text === '' || /[.!?]\s$/.test(text);
  const upper = shift ?? autoCap;

  /** Any key writes the scripted message, whole. */
  const typeMessage = useCallback(() => {
    // A reword in the field is finished text; typing only writes the script.
    setText((t) => (t === MESSAGE ? t : MESSAGE));
    setReworded(false);
    setShift(null);
  }, []);

  const onKey = useCallback(
    (a: KeyAction) => {
      if (view === 'fixWords') {
        const target = checkData?.reverse ?? '';
        if (a.kind === 'backspace') setFixText('');
        else if (a.kind === 'char' || a.kind === 'space') setFixText(target);
        return;
      }
      switch (a.kind) {
        case 'char':
        case 'space':
          if (!reworded) typeMessage();
          break;
        case 'backspace':
          // The whole field, not a character: it was written in one press, so
          // it comes out in one.
          setText('');
          setReworded(false);
          break;
        case 'shift':
          setShift((s) => !(s ?? autoCap));
          break;
        case 'layer':
          setNumbers((n) => !n);
          break;
        case 'locales': {
          // A tap moves to the next keyboard (it is only there with two or more).
          const i = locales.findIndex((l) => l.id === locale);
          switchTo(locales[(i + 1) % locales.length].id);
          break;
        }
        case 'localesHold':
          setPopover(true);
          break;
        case 'return':
          break;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [view, checkData, reworded, typeMessage, autoCap, locales, locale]
  );

  // ── reword ──
  const reword = (from?: string) => {
    const src = from ?? (reworded ? original : text);
    if (!src.trim() || rewording) return;
    setOriginal(src);
    setRewording(true);
    const result = outFor(findLang(lang), scripts[lang]).reword;
    later(() => {
      setText(result);
      setReworded(true);
      setRewording(false);
    }, 1100);
  };

  const send = () => {
    if (!text.trim()) return;
    const copy = reworded && copyOn ? (copyLang === 'English' ? original : outFor(findLang(copyLang)).reword) : undefined;
    setMsgs((m) => [...m, { id: nextId.current++, from: 'me', text, copy }]);
    setText('');
    setReworded(false);
  };

  // ── views ──
  const openCheck = () => {
    const src = reworded ? original : text;
    const isReword = reworded;
    setCheckData({
      reverse: isReword ? L.reverse : text,
      reword: text,
      original: src,
      synonyms: isReword ? out.synonyms : outFor(LANGS[0]).synonyms,
      homograph: {
        word: 'trip',
        meanings: [
          { title: isReword ? out.trip[0] : 'trip', gloss: TRIP_GLOSSES[0] },
          { title: isReword ? out.trip[1] : 'stumble', gloss: TRIP_GLOSSES[1] },
        ],
      },
    });
    setCheck(CHECK_START);
    setCheckSel('reword');
    setMeaning(0);
    setView('check');
    later(() => setCheck((s) => ({ ...s, opening: false })), 700);
    later(() => setCheck((s) => ({ ...s, reverse: 'done' })), 1500);
  };

  /* The reword runs a tick after the options close, from a ref, so it reads
     the options as they now are -- not as they were when the tap began. */
  const rewordRef = useRef(reword);
  useEffect(() => {
    rewordRef.current = reword;
  });
  const closeView = () => {
    setView('none');
    setScriptMenu(false);
    setPopover(false);
    // A toast belongs to the view it reported on.
    setToast(null);
    if (dirty.current && reworded) later(() => rewordRef.current(), 0);
    dirty.current = false;
  };

  const closeViewRef = useRef(closeView);
  useEffect(() => {
    closeViewRef.current = closeView;
  });

  const onTool = (t: ToolAction) => {
    if (t === 'reword') reword();
    else if (t === 'options') setView('options');
    else if (t === 'check') openCheck();
    else setView(t);
  };

  /** An option changed: remember to reword on the way out. */
  const changed = () => {
    dirty.current = true;
  };

  const pickLanguage = (name: string) => {
    if (name !== lang) {
      setRecents((r) => [lang, ...r.filter((x) => x !== name && x !== lang)].slice(0, 3));
      setLang(name);
      changed();
    }
  };

  const optionsConfig: OptionsConfig = {
    language: lang,
    recipientGender: L.recipientGender ? recipient : undefined,
    groupChat: L.groupChat ? groupChat : undefined,
    script: L.scripts
      ? { selected: L.scripts.find((s) => s.title === script) ?? L.scripts[0], all: L.scripts }
      : undefined,
    copy: { on: copyOn, language: copyLang },
    keyboards: locales.length,
    speakerGender: L.speakerGender ? speaker : null,
  };

  // ── long press on a message ──
  const pressTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const screenRef = useRef<HTMLDivElement>(null);
  const startPress = (m: Msg, el: HTMLElement) => {
    clearTimeout(pressTimer.current);
    pressTimer.current = setTimeout(() => {
      const s = screenRef.current!.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      const k = s.width / DESIGN_W;
      setMenu({ id: m.id, top: (r.top - s.top) / k, from: m.from });
    }, 450);
  };
  const cancelPress = () => clearTimeout(pressTimer.current);

  const doPaste = () => {
    if (pasting) return;
    if (!clipboard) {
      showToast({ text: 'No messages to paste.' });
      return;
    }
    const src = clipboard;
    setPasting(true);
    later(() => {
      setPasting(false);
      const id = Date.now();
      setPasteItems((items) => [{ id, original: src, translation: null, open: true }, ...items]);
      later(() => {
        setPasteItems((items) =>
          items.map((it) => (it.id === id ? { ...it, translation: translate(src, pasteLang) } : it))
        );
      }, 1300);
    }, 500);
  };

  const showChat = msgs.length > 0;
  const menuMsg = menu ? msgs.find((m) => m.id === menu.id) : null;

  const screen = (
    <div
      ref={screenRef}
      className="relative flex select-none flex-col overflow-hidden"
      style={{ width: DESIGN_W, height: SCREEN_H, borderRadius: bezel ? 44 : 0, background: AX.screen }}
    >
      {/* Status bar */}
      <div className="relative flex h-11 shrink-0 items-center justify-between px-7 pt-1" style={{ color: AX.ink }}>
        <span className="text-[15px] font-semibold tabular-nums">{clock}</span>
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
          <ChevronLeft className="h-7 w-7" style={{ color: AX.send }} strokeWidth={2.4} />
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
            <span className="text-[15px] font-semibold" style={{ color: AX.ink }}>
              +1 (888) 555-1212
            </span>
            <ChevronRight className="h-4 w-4" style={{ color: AX.inkMuted }} strokeWidth={2.4} />
          </div>
        </div>
      </div>

      {/* Conversation: newest at the bottom, scrolls when it outgrows the room. */}
      <div className="flex min-h-0 flex-1 flex-col-reverse overflow-y-auto px-3 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex flex-col gap-1.5">
          {showChat && (
            <>
              <div className="pt-2 text-center text-[13px] font-medium" style={{ color: AX.inkMuted }}>
                iMessage
              </div>
              <div className="mb-1 text-center text-[12px]" style={{ color: AX.inkMuted }}>
                Today <span className="font-medium">{clock} PM</span>
              </div>
            </>
          )}
          {msgs.map((m, i) => {
            const last = i === msgs.length - 1;
            const mine = m.from === 'me';
            return (
              <div key={m.id} className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
                <div
                  onPointerDown={(e) => startPress(m, e.currentTarget)}
                  onPointerUp={cancelPress}
                  onPointerLeave={cancelPress}
                  onContextMenu={(e) => e.preventDefault()}
                  className={`max-w-[78%] cursor-pointer whitespace-pre-wrap rounded-[20px] px-3.5 py-2 text-[17px] animate-in fade-in-0 duration-300 ${
                    mine ? 'origin-bottom-right zoom-in-90 slide-in-from-bottom-6 text-white' : 'origin-bottom-left zoom-in-95'
                  }`}
                  style={{ background: mine ? AX.send : AX.recvBubble, color: mine ? '#fff' : AX.ink, WebkitTouchCallout: 'none' }}
                >
                  {m.text}
                  {m.copy && (
                    <span className="mt-1.5 block border-t border-white/30 pt-1.5 text-[15px] opacity-90">{m.copy}</span>
                  )}
                </div>
                {last && mine && (
                  <span className="mr-1 mt-0.5 text-[11px]" style={{ color: AX.inkMuted }}>
                    Delivered
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Input bar */}
      <div className="flex shrink-0 items-end gap-2 px-3 pb-2 pt-1">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full" style={{ background: AX.plusBg }}>
          <Plus className="h-5 w-5" style={{ color: AX.plusIcon }} strokeWidth={2.6} />
        </div>
        <div className="flex min-h-9 min-w-0 flex-1 items-end rounded-[18px] border py-[7px] pl-4 pr-2" style={{ borderColor: AX.fieldBorder }}>
          {text ? (
            <span className="max-h-[100px] min-w-0 flex-1 overflow-y-auto break-words text-[15px] leading-5" style={{ color: AX.ink }} dir="auto">
              {text}
              <span className="ml-[1px] inline-block h-4 w-[2px] translate-y-[3px] animate-pulse" style={{ background: AX.send }} />
            </span>
          ) : (
            <>
              <span className="text-[15px] leading-5" style={{ color: AX.fieldPlaceholder }}>
                iMessage
              </span>
              <span className="ml-[1px] inline-block h-4 w-[2px] self-center animate-pulse" style={{ background: AX.send }} />
              <div className="flex-1" />
              <Mic className="h-5 w-5 shrink-0" style={{ color: AX.fieldPlaceholder }} strokeWidth={2} />
            </>
          )}
        </div>
        {text && (
          <button
            onClick={send}
            aria-label="Send"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full transition-transform active:scale-[0.86] active:brightness-90"
            style={{ backgroundColor: AX.send }}
          >
            <ArrowUp className="h-5 w-5 text-white" strokeWidth={2.8} />
          </button>
        )}
      </div>

      {/* Keyboard, or the view open in its place. */}
      {view === 'none' && (
        <PrototypeKeyboard
          upper={upper}
          numbers={numbers}
          rewordLoading={rewording}
          onKey={onKey}
          onTool={onTool}
          spaceLabel={spaceLabel}
        />
      )}

      {view === 'check' && checkData && (
        <div className="shrink-0">
          <CheckPanel
            state={check}
            data={checkData}
            selected={checkSel}
            meaning={meaning}
            onClose={closeView}
            actions={{
              fixWords: () => {
                setFixText(checkData.reverse);
                setView('fixWords');
              },
              synonyms: () => {
                setCheck((s) => ({ ...s, synonyms: 'loading' }));
                later(() => setCheck((s) => ({ ...s, synonyms: 'done' })), 1400);
              },
              homographs: () => {
                setCheck((s) => ({ ...s, homographs: 'loading' }));
                later(() => setCheck((s) => ({ ...s, homographs: 'done' })), 1300);
              },
              gender: () => {
                setCheck((s) => ({ ...s, gender: 'loading' }));
                later(() => setCheck((s) => ({ ...s, gender: 'done' })), 1200);
              },
              select: (key) => {
                setCheckSel(key);
                // Choosing a card puts its text in the message field.
                const t =
                  key === 'reword'
                    ? checkData.reword
                    : key === 'original'
                      ? checkData.original
                      : checkData.synonyms[Number(key.slice(4))];
                setText(t);
                setReworded(key !== 'original');
              },
              meaning: (i) => setMeaning(i),
            }}
          />
        </div>
      )}

      {view === 'fixWords' && checkData && (
        <div className="flex shrink-0 flex-col" style={{ height: VIEW_H, background: AX.pageBg }}>
          <div className="pt-5">
            <FixWordsCard
              text={fixText}
              edited={fixText.trim() !== checkData.reverse.trim() && fixText.trim() !== ''}
              onCancel={() => setView('check')}
              onApply={() => {
                // Apply rewords from the corrected intent, and Check reloads.
                setView('check');
                setCheck({ ...CHECK_START, opening: false });
                later(() => setCheck((s) => ({ ...s, reverse: 'done' })), 1100);
              }}
            />
          </div>
          <div className="flex-1" />
          <PrototypeKeyboard upper={false} numbers={false} rewordLoading={false} onKey={onKey} onTool={() => {}} keysOnly />
        </div>
      )}

      {view === 'paste' && (
        <PasteView
          items={pasteItems}
          pasting={pasting}
          language={pasteLang}
          onPaste={doPaste}
          onChange={setPasteItems}
          onToast={showToast}
          onToggle={(id) => setPasteItems((items) => items.map((it) => (it.id === id ? { ...it, open: !it.open } : it)))}
          onLanguage={() => setView('pasteLanguages')}
          onClose={closeView}
        />
      )}

      {view === 'study' && <StudyView rows={study} onChange={setStudy} onToast={showToast} onClose={closeView} />}

      {view === 'options' && (
        <div className="shrink-0">
          <ArcatextOptionsPage
            config={optionsConfig}
            recents={recents}
            scriptMenuOpen={scriptMenu}
            onClose={closeView}
            actions={{
              recipient: (g) => {
                setRecipient(g);
                changed();
              },
              groupChat: () => {
                setGroupChat((g) => !g);
                changed();
              },
              scriptMenu: () => setScriptMenu((o) => !o),
              script: (title) => {
                // Picking a script closes Options after a beat and rewords.
                setScripts((s) => ({ ...s, [lang]: title }));
                setScriptMenu(false);
                changed();
                later(closeViewRef.current, 200);
              },
              language: pickLanguage,
              moreLanguages: () => setView('languages'),
              copy: () => {
                setCopyOn((c) => !c);
                changed();
              },
              copyLanguage: () => setView('copyLanguages'),
              autocorrect: () => setView('keyboards'),
              speakerGender: () => {
                setSpeaker((g) => (g === 'Male' ? 'Female' : 'Male'));
                changed();
              },
            }}
          />
        </div>
      )}

      {view === 'languages' && (
        <LanguageList
          title="More Reword Languages"
          names={LANGS.map((l) => l.name)}
          selected={lang}
          onPick={(n) => {
            // Picking one closes the sheet and Options, and rewords.
            pickLanguage(n);
            later(closeViewRef.current, 0);
          }}
          onDone={() => setView('options')}
        />
      )}
      {view === 'copyLanguages' && (
        <LanguageList
          title="View Copy In..."
          names={LANGS.map((l) => l.name)}
          selected={copyLang}
          onPick={(n) => {
            setCopyLang(n);
            changed();
            setView('options');
          }}
          onDone={() => setView('options')}
        />
      )}
      {view === 'pasteLanguages' && (
        <LanguageList
          title="Language"
          names={LANGS.map((l) => l.name)}
          selected={pasteLang}
          onPick={(n) => {
            setPasteLang(n);
            // Picking a language translates what is there again.
            setPasteItems((items) => items.map((it) => ({ ...it, translation: translate(it.original, n) })));
            setView('paste');
          }}
          onDone={() => setView('paste')}
        />
      )}

      {view === 'keyboards' && (
        <KeyboardsPage
          locales={locales}
          current={locale}
          onPick={(id) => switchTo(id)}
          onChange={(next, removedCurrent) => {
            setLocales(next);
            if (removedCurrent) setLocale(next[0].id);
          }}
          onBack={() => setView('options')}
        />
      )}

      {/* Globe and dictation, under the keyboard and under every view. */}
      <div
        style={{ backgroundColor: AX.keyboardBg, paddingTop: view === 'none' ? 17 : 22 }}
        className="flex shrink-0 items-center justify-between px-5 pb-[28px]"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9.2" stroke={AX.glyph} strokeWidth="1.5" />
          <ellipse cx="12" cy="12" rx="4" ry="9.2" stroke={AX.glyph} strokeWidth="1.5" />
          <path d="M3 12h18M4.5 7.5h15M4.5 16.5h15" stroke={AX.glyph} strokeWidth="1.5" />
        </svg>
        <Mic className="h-6 w-6" style={{ color: AX.glyph }} strokeWidth={2} />
      </div>

      {popover && view === 'none' && (
        <LocalePopover
          locales={locales}
          current={locale}
          onPick={(id) => {
            switchTo(id);
            setPopover(false);
          }}
          onManage={() => {
            setPopover(false);
            setView('keyboards');
          }}
          onDismiss={() => setPopover(false)}
        />
      )}

      {toast && <ToastBar toast={toast} onDone={() => setToast(null)} />}

      {/* Long-press menu: the page dims and blurs, the message lifts, and the
          menu sits under it. */}
      {menu && menuMsg && (
        <div className="absolute inset-0 z-50" onPointerDown={() => setMenu(null)}>
          <div className="absolute inset-0 bg-black/25 backdrop-blur-md animate-in fade-in-0 duration-200" />
          <div
            className={`absolute flex flex-col gap-2 px-3 animate-in zoom-in-95 fade-in-0 duration-200 ${menu.from === 'me' ? 'right-0 items-end' : 'left-0 items-start'}`}
            style={{ top: Math.min(menu.top, SCREEN_H - 330) }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div
              className="max-w-[300px] whitespace-pre-wrap rounded-[20px] px-3.5 py-2 text-[17px]"
              style={{ background: menuMsg.from === 'me' ? AX.send : AX.recvBubble, color: menuMsg.from === 'me' ? '#fff' : AX.ink }}
            >
              {menuMsg.text}
            </div>
            <div className="w-[230px] overflow-hidden rounded-[14px] shadow-2xl" style={{ background: AX.cardBg }}>
              {[
                { label: 'Reply', icon: CornerUpLeft, act: () => setMenu(null) },
                {
                  label: 'Copy',
                  icon: Copy,
                  act: () => {
                    setClipboard(menuMsg.copy ? `${menuMsg.text}` : menuMsg.text);
                    setMenu(null);
                  },
                },
                { label: 'Translate', icon: Languages, act: () => setMenu(null) },
                { label: 'More...', icon: MoreHorizontal, act: () => setMenu(null) },
              ].map((it, i) => (
                <button
                  key={it.label}
                  onClick={it.act}
                  className="flex w-full items-center justify-between px-4 py-[11px] text-left text-[17px] active:brightness-90"
                  style={{ color: AX.label, borderTop: i ? `0.5px solid ${AX.cardStroke}` : undefined, background: AX.cardBg }}
                >
                  {it.label}
                  <it.icon className="h-[18px] w-[18px]" strokeWidth={2} />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const W = (bezel ? DESIGN_W + BEZEL * 2 : DESIGN_W) * scale;
  const H = (bezel ? SCREEN_H + BEZEL * 2 : SCREEN_H) * scale;
  return (
    <div style={{ width: W, height: H }}>
      <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: bezel ? DESIGN_W + BEZEL * 2 : DESIGN_W }}>
        {bezel ? (
          <div
            className="bg-black"
            style={{
              padding: BEZEL,
              borderRadius: 56,
              boxShadow: `0 0 0 1px ${AX.bezelRing}, 0 30px 60px -20px rgba(20,10,40,0.5)`,
            }}
          >
            {screen}
          </div>
        ) : (
          screen
        )}
      </div>
    </div>
  );
}

/** Paste's translation: the received message into a language, or a message
    of ours (in some language) back into English. */
function translate(src: string, into: string): string {
  if (src === RECEIVED) return outFor(findLang(into)).received;
  for (const l of LANGS) for (const o of Object.values(l.out)) if (o.reword === src || o.synonyms.includes(src)) return MESSAGE;
  return src;
}
