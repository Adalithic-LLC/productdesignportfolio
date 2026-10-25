import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import {
  BarChart3,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleEllipsis,
  CircleUser,
  Globe,
  Languages,
  Pause,
  Play,
  RotateCcw,
  Square,
  Users,
  Volume2,
  X,
  AudioLines,
} from 'lucide-react';
import studyUrl from '@/assets/keyboard/study.svg';
import { AX } from '@/lib/arcatextTheme';
import { Spinner } from '@/components/ArcatextViews';
import { PrototypeKeyboard } from '@/components/prototype/PrototypeKeyboard';

/**
 * The Arcatext app's own tabs, playing in the demo row beside the keyboard
 * phones: Chat (Peer Chat -- real conversations with other learners) and
 * Practice (guided chats). Same phone, size and controls as ArcatextKeyboard,
 * but these are app screens, so each loop runs through the app with its tab
 * bar rather than through the keyboard's views.
 *
 * Drawn from the Swift on Arcatext's main branch: MainTabView, PageTitleBar,
 * PeerChatView / PeerChatListViews / PeerConversationView, and ChatsView /
 * ZeroTokenBrowseView / ZeroTokenCard / ChatScreen / ChatQuizView. Strings are
 * its Localizable.xcstrings (English); colors its asset catalog and the iOS
 * system colors it uses, through the shared palette, so both themes hold.
 * The guided chat is the app's own example script ("Mom wants help with the
 * dishes", tools/chat-content/example_chat.ts).
 *
 * Playback, as the keyboard phones: each loop plays while on screen, holds
 * when the row's toggle says so, and Restart replays it from the top.
 */

export type AppScreen = 'chat' | 'practice';

const DESIGN_W = 402;
const SCREEN_H = 874;
const BEZEL = 12;
const OUTER_W = DESIGN_W + BEZEL * 2;
const OUTER_H = SCREEN_H + BEZEL * 2;
const NOTO = "'Noto Sans', Inter, sans-serif";
const SF = "-apple-system, BlinkMacSystemFont, 'SF Pro Text', Inter, sans-serif";
const BTN =
  'grid h-9 w-9 place-items-center rounded-full border border-border/60 text-foreground/80 transition-colors hover:bg-muted';

type Beat = { fn: () => void; ms: number };

/** Types a string into a setter, one character per beat. */
function typeInto(beats: Beat[], s: string, set: (v: string) => void, ms: number) {
  for (let i = 1; i <= s.length; i++) {
    const part = s.slice(0, i);
    beats.push({ fn: () => set(part), ms });
  }
}

/**
 * A loop of beats: each runs, then waits its ms. Plays only while on screen
 * and allowed to; `restart` goes back to the first beat (which resets).
 */
function useLoop(build: () => Beat[], running: boolean) {
  const rootRef = useRef<HTMLDivElement>(null);
  const beats = useRef<Beat[]>([]);
  const pos = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const visible = useRef(false);
  const run = useRef(running);
  const tick = useRef<() => void>(() => {});
  const buildRef = useRef(build);

  useEffect(() => {
    beats.current = buildRef.current();
    tick.current = () => {
      clearTimeout(timer.current);
      if (!visible.current || !run.current || !beats.current.length) return;
      if (pos.current >= beats.current.length) pos.current = 0;
      const b = beats.current[pos.current];
      b.fn();
      pos.current += 1;
      timer.current = setTimeout(() => tick.current(), b.ms);
    };
    const el = rootRef.current;
    const io = new IntersectionObserver(
      ([e]) => {
        visible.current = e.isIntersecting;
        if (e.isIntersecting) tick.current();
        else clearTimeout(timer.current);
      },
      { threshold: 0.35 }
    );
    if (el) io.observe(el);
    return () => {
      io.disconnect();
      clearTimeout(timer.current);
    };
  }, []);

  useEffect(() => {
    run.current = running;
    if (running) tick.current();
    else clearTimeout(timer.current);
  }, [running]);

  const restart = () => {
    pos.current = 0;
    tick.current();
  };
  return { rootRef, restart };
}

// ── Shared chrome ────────────────────────────────────────────────────────────

function StatusBar() {
  return (
    <div className="relative z-20 flex h-11 shrink-0 items-center justify-between px-7 pt-1" style={{ color: AX.ink }}>
      <span className="text-[15px] font-semibold" style={{ fontFamily: SF }}>
        9:41
      </span>
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
  );
}

/** ArcatextLogo: the I-beam, drawn 25pt tall (viewBox 31x50). */
function Logo() {
  return (
    <svg width="15.5" height="25" viewBox="0 0 31 50" fill={AX.accent} aria-hidden>
      <rect x="0" y="0" width="12" height="5" />
      <rect x="19" y="0" width="12" height="5" />
      <rect x="12" y="5" width="7" height="40" />
      <rect x="0" y="45" width="12" height="5" />
      <rect x="19" y="45" width="12" height="5" />
    </svg>
  );
}

/** PageTitleBar: 44pt, logo leading, Bold 17 title centred, then 24pt. */
function TitleBar({ title, trailing }: { title: string; trailing?: ReactNode }) {
  return (
    <div className="relative mb-6 flex h-11 shrink-0 items-center justify-between px-5">
      <Logo />
      <span className="absolute left-1/2 -translate-x-1/2 text-[17px] font-bold" style={{ color: AX.label }}>
        {title}
      </span>
      {trailing ?? <span />}
    </div>
  );
}

/** person.crop.circle.fill, with the person cut out. */
function PersonFill({ size = 25 }: { size?: number }) {
  const id = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <mask id={id}>
        <rect width="24" height="24" fill="white" />
        <circle cx="12" cy="9.4" r="3.7" fill="black" />
        <path d="M5.3 19.2c1.4-2.8 3.9-4.2 6.7-4.2s5.3 1.4 6.7 4.2" stroke="black" strokeWidth="3.2" fill="none" strokeLinecap="round" />
      </mask>
      <circle cx="12" cy="12" r="11" fill="currentColor" mask={`url(#${id})`} />
    </svg>
  );
}

/**
 * The stock tab bar (MainTabView; UIDesignRequiresCompatibility, so the
 * classic bar): Chat, Practice, Study, Settings, the selected one in the
 * accent, 49pt plus the home-indicator area.
 */
function TabBar({ selected, badge = 0 }: { selected: 'chat' | 'practice'; badge?: number }) {
  const tabs = [
    {
      key: 'chat',
      label: 'Chat',
      icon: (
        <svg width="27" height="24" viewBox="0 0 26 23" fill="currentColor" aria-hidden>
          <path d="M4.2 1h10.6A3.2 3.2 0 0 1 18 4.2v6.6a3.2 3.2 0 0 1-3.2 3.2H9.1L5 17.2V14h-.8A3.2 3.2 0 0 1 1 10.8V4.2A3.2 3.2 0 0 1 4.2 1Z" />
          <path d="M19.6 6.4h1.8a2.6 2.6 0 0 1 2.6 2.6v5.6a2.6 2.6 0 0 1-2.6 2.6H21v3.2l-3.9-3.2h-4.3a2.6 2.6 0 0 1-2.6-2.6v-.8h4.6a4.8 4.8 0 0 0 4.8-4.8Z" />
        </svg>
      ),
    },
    {
      key: 'practice',
      label: 'Practice',
      icon: (
        <svg width="25" height="23" viewBox="0 0 24 22" fill="currentColor" aria-hidden>
          <path d="M12 1.4 1.3 10.6c-.6.5-.2 1.4.5 1.4H4v7.6c0 .8.6 1.4 1.4 1.4H9.5v-6h5v6h4.1c.8 0 1.4-.6 1.4-1.4V12h2.2c.7 0 1.1-.9.5-1.4Z" />
        </svg>
      ),
    },
    {
      key: 'study',
      label: 'Study',
      // leaf.fill itself, tinted through a mask.
      icon: (
        <span
          className="block"
          style={{
            width: 26,
            height: 22,
            background: 'currentColor',
            WebkitMask: `url(${studyUrl}) center / contain no-repeat`,
            mask: `url(${studyUrl}) center / contain no-repeat`,
          }}
        />
      ),
    },
    { key: 'settings', label: 'Settings', icon: <PersonFill /> },
  ];
  return (
    <div className="absolute inset-x-0 bottom-0 z-10" style={{ background: AX.tabbar, borderTop: `0.33px solid ${AX.tabbarLine}`, backdropFilter: 'blur(20px)' }}>
      <div className="flex h-[49px] items-stretch">
        {tabs.map((t) => {
          const on = t.key === selected;
          return (
            <div key={t.key} className="relative flex flex-1 flex-col items-center justify-center gap-[3px] pt-1" style={{ color: on ? AX.accent : AX.tabOff }}>
              <span className="relative grid h-[26px] place-items-center">
                {t.icon}
                {t.key === 'chat' && badge > 0 && (
                  <span
                    className="absolute -right-2.5 -top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full px-1 text-[12px] font-medium text-white animate-in zoom-in-50 duration-200"
                    style={{ background: AX.red, fontFamily: SF }}
                  >
                    {badge}
                  </span>
                )}
              </span>
              <span className="text-[10px] font-medium" style={{ fontFamily: SF }}>
                {t.label}
              </span>
            </div>
          );
        })}
      </div>
      <div className="h-[34px]" />
    </div>
  );
}

/** arrow.up.circle.fill. */
function SendCircle({ size, on }: { size: number; on: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden className="transition-colors duration-200" style={{ color: on ? AX.accent : AX.gray3 }}>
      <circle cx="16" cy="16" r="15" fill="currentColor" />
      <path d="M16 23V10m0 0-5.5 5.5M16 10l5.5 5.5" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

/** Globe and dictation, under the keyboard. */
function SystemStrip() {
  return (
    <div style={{ backgroundColor: AX.keyboardBg, paddingTop: 17 }} className="flex shrink-0 items-center justify-between px-5 pb-[28px]">
      <Globe className="h-6 w-6" style={{ color: AX.glyph }} strokeWidth={1.5} />
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={AX.glyph} strokeWidth="2" strokeLinecap="round">
        <rect x="9" y="3" width="6" height="11" rx="3" />
        <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
      </svg>
    </div>
  );
}

const noop = () => {};

/** The Arcatext keyboard, as it comes up under the app's text fields. */
function Keyboard({ rewording = false }: { rewording?: boolean }) {
  return (
    <div className="pointer-events-none shrink-0 animate-in slide-in-from-bottom-full duration-300">
      <PrototypeKeyboard upper={false} numbers={false} rewordLoading={rewording} onKey={noop} onTool={noop} />
      <SystemStrip />
    </div>
  );
}

// ── Chat (Peer Chat) ─────────────────────────────────────────────────────────

type ChatMsg = {
  id: number;
  mine: boolean;
  text: string;
  time: string;
  /** Mine, from a Reword: the text before it. */
  original?: string;
  /** Theirs: the Translate section's state. */
  translate?: 'idle' | 'loading' | 'done';
  translation?: string;
  open?: boolean;
};

const HISTORY: ChatMsg[] = [
  { id: 1, mine: false, text: '¡Hola! ¿Qué tal tu semana?', time: '9:36 AM' },
  { id: 2, mine: true, text: '¡Muy bien! Estoy aprendiendo mucho.', time: '9:38 AM', original: 'Very good! I am learning a lot.' },
];

function Presence({ online, text }: { online: boolean; text: string }) {
  return (
    <span className="flex items-center gap-[5px] text-[12px]" style={{ color: AX.secLabel }}>
      <span className="h-2 w-2 rounded-full transition-colors duration-300" style={{ background: online ? AX.green : AX.gray3 }} />
      {text}
    </span>
  );
}

function ChatCard({
  name,
  unread = 0,
  online,
  presence,
  meta,
  pressed,
}: {
  name: string;
  unread?: number;
  online: boolean;
  presence: string;
  meta: string;
  pressed?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-[14px] p-3.5 transition-[filter] duration-100" style={{ background: AX.cardBg, filter: pressed ? 'brightness(0.92)' : 'none' }}>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className={`truncate text-[16px] ${unread ? 'font-bold' : 'font-semibold'}`} style={{ color: AX.label }}>
            {name}
          </span>
          {unread > 0 && (
            <span className="grid h-5 min-w-5 place-items-center rounded-full px-[7px] text-[12px] font-bold text-white animate-in zoom-in-50 duration-200" style={{ background: AX.accent }}>
              {unread}
            </span>
          )}
        </div>
        <Presence online={online} text={presence} />
        <span className="flex items-center gap-1 truncate text-[13px]" style={{ color: AX.secLabel }}>
          <Globe className="h-[13px] w-[13px] shrink-0" strokeWidth={2} />
          {meta}
        </span>
      </div>
      <span className="px-1 text-[14px] font-semibold" style={{ color: AX.accent }}>
        Chat
      </span>
    </div>
  );
}

function ChatBubble({ m }: { m: ChatMsg }) {
  const expander = m.mine ? (m.original ? 'Original' : null) : 'Translate';
  return (
    <div className={`flex flex-col ${m.mine ? 'items-end pl-12' : 'items-start pr-12'} animate-in fade-in-0 slide-in-from-bottom-2 duration-200`}>
      <div
        className="max-w-full rounded-[16px] px-3 py-2 text-[16px] leading-[22px]"
        style={m.mine ? { background: AX.accent, color: '#fff' } : { background: AX.cardBg, color: AX.label }}
      >
        {m.text}
        {m.open && (
          <div className="animate-in fade-in-0 duration-150">
            <div className="my-2" style={{ height: 1, background: m.mine ? 'rgba(255,255,255,0.3)' : AX.terLabel }} />
            {m.mine ? (
              <>
                <div className="text-[10px] font-semibold tracking-wide opacity-80">ORIGINAL</div>
                <div className="text-[15px]">{m.original}</div>
              </>
            ) : m.translate === 'done' ? (
              <div className="flex flex-col gap-0.5">
                <span className="flex items-center gap-1 text-[12px] font-medium" style={{ color: AX.accent }}>
                  🌐 English (US) <ChevronDown className="h-2 w-2" strokeWidth={3} />
                </span>
                <span className="text-[15px] animate-in fade-in-0 duration-300">{m.translation}</span>
              </div>
            ) : m.translate === 'loading' ? (
              <span className="flex items-center gap-2 text-[14px]" style={{ color: AX.secLabel }}>
                <Spinner size={14} /> Translating…
              </span>
            ) : (
              <span className="flex items-center gap-3">
                <span className="flex items-center gap-1 text-[14px] font-semibold" style={{ color: AX.accent }}>
                  <Languages className="h-4 w-4" strokeWidth={2.2} /> Translate
                </span>
                <span className="flex items-center gap-1 text-[12px] font-medium" style={{ color: AX.accent }}>
                  🌐 English (US) <ChevronDown className="h-2 w-2" strokeWidth={3} />
                </span>
              </span>
            )}
          </div>
        )}
      </div>
      <div className="flex h-8 items-center gap-2 text-[11px]" style={{ color: AX.secLabel }}>
        {!m.mine && expander && <Expander label={expander} open={!!m.open} />}
        <span>{m.time}</span>
        {m.mine && expander && <Expander label={expander} open={!!m.open} />}
      </div>
    </div>
  );
}

function Expander({ label, open }: { label: string; open: boolean }) {
  return (
    <span className="flex items-center gap-1 text-[12px] font-medium" style={{ color: AX.accent }}>
      {label}
      <ChevronDown className={`h-2.5 w-2.5 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} strokeWidth={3} />
    </span>
  );
}

function ChatScreenLoop({ running, onToggleRun, onRestart, scale }: LoopProps) {
  const [pushed, setPushed] = useState(false);
  const [unread, setUnread] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [msgs, setMsgs] = useState<ChatMsg[]>(HISTORY);
  const [kb, setKb] = useState(false);
  const [draft, setDraft] = useState('');
  const [rewording, setRewording] = useState(false);

  const edit = (id: number, patch: Partial<ChatMsg>) => setMsgs((ms) => ms.map((m) => (m.id === id ? { ...m, ...patch } : m)));

  const { rootRef, restart } = useLoop(() => {
    const b: Beat[] = [];
    b.push({
      fn: () => {
        setPushed(false);
        setUnread(false);
        setPressed(false);
        setMsgs(HISTORY);
        setKb(false);
        setDraft('');
        setRewording(false);
      },
      ms: 1300,
    });
    // A reply lands: the card goes bold with a badge, Sleepy Otter is online.
    b.push({ fn: () => setUnread(true), ms: 1500 });
    b.push({ fn: () => setPressed(true), ms: 220 });
    b.push({
      fn: () => {
        setPressed(false);
        setPushed(true);
      },
      ms: 900,
    });
    b.push({ fn: () => setMsgs((ms) => [...ms, { id: 3, mine: false, text: '¿Qué vas a hacer mañana?', time: '9:41 AM' }]), ms: 1300 });
    // Translate it in place.
    b.push({ fn: () => edit(3, { open: true, translate: 'idle' }), ms: 1100 });
    b.push({ fn: () => edit(3, { translate: 'loading' }), ms: 1200 });
    b.push({ fn: () => edit(3, { translate: 'done', translation: 'What are you going to do tomorrow?' }), ms: 1700 });
    // Answer with the Arcatext keyboard: type it your way, Reword, send.
    b.push({ fn: () => setKb(true), ms: 700 });
    typeInto(b, 'I want go beach tomorrow', setDraft, 55);
    b.push({ fn: () => {}, ms: 500 });
    b.push({ fn: () => setRewording(true), ms: 1150 });
    b.push({
      fn: () => {
        setRewording(false);
        setDraft('Mañana quiero ir a la playa.');
      },
      ms: 1300,
    });
    b.push({
      fn: () => {
        setMsgs((ms) => [...ms, { id: 4, mine: true, text: 'Mañana quiero ir a la playa.', time: '9:42 AM', original: 'I want go beach tomorrow' }]);
        setDraft('');
        setKb(false);
      },
      ms: 1200,
    });
    // Only the sender sees what they wrote before Reword.
    b.push({ fn: () => edit(4, { open: true }), ms: 2600 });
    return b;
  }, running);

  const screen = (
    <>
      <StatusBar />
      {/* The Chat tab. */}
      <div className="absolute inset-0 flex flex-col pt-11">
        <TitleBar
          title="Chat"
          trailing={
            <span className="grid h-[38px] w-[38px] place-items-center rounded-[16px]" style={{ background: AX.xBtn, color: AX.xMark }}>
              <CircleUser className="h-[18px] w-[18px]" strokeWidth={2.2} />
            </span>
          }
        />
        <div className="mx-5 mb-3 flex h-[38px] gap-0.5 rounded-[6px] p-0.5" style={{ background: AX.segBg, fontFamily: SF }}>
          {['Active', 'Find', 'Requests'].map((s, i) => (
            <span
              key={s}
              className="flex flex-1 items-center justify-center rounded-[5px] text-[13px] font-medium"
              style={i === 0 ? { background: AX.pickerSelected, color: AX.label, boxShadow: '0 1px 3px rgba(0,0,0,0.12)' } : { color: AX.label }}
            >
              {s}
            </span>
          ))}
        </div>
        <div className="flex flex-col gap-3 px-5">
          <div className="flex gap-2">
            {['All', 'Spanish', 'Japanese'].map((c, i) => (
              <span
                key={c}
                className="flex min-h-[34px] items-center rounded-full px-3.5 text-[14px] font-medium"
                style={i === 0 ? { background: AX.accent, color: '#fff' } : { background: AX.cardBg, color: AX.label }}
              >
                {c}
              </span>
            ))}
          </div>
          <div className="flex items-start gap-2 rounded-[10px] px-3 py-2" style={{ background: AX.noticeBg, color: AX.noticeFg }}>
            <Users className="mt-[2px] h-[13px] w-[13px] shrink-0" fill="currentColor" strokeWidth={2.4} />
            <span className="flex-1 text-[13px] font-medium">These are anonymous chats with real people.</span>
            <X className="mt-[3px] h-[11px] w-[11px]" strokeWidth={3} />
          </div>
          <ChatCard
            name="Sleepy Otter"
            unread={unread ? 1 : 0}
            online={unread}
            presence={unread ? 'Online' : 'Last seen 5 min. ago'}
            meta="Spanish · 12 sent · 9 received"
            pressed={pressed}
          />
          <ChatCard name="Brave Falcon 42" online={false} presence="Last seen 2 hr. ago" meta="Japanese · 4 sent · 6 received" />
          <ChatCard name="Quiet Heron" online={false} presence="Offline" meta="Spanish · 20 sent · 18 received" />
        </div>
        <TabBar selected="chat" badge={unread ? 1 : 0} />
      </div>

      {/* A conversation, pushed over the whole tab view. */}
      <div
        className="absolute inset-0 z-10 flex flex-col pt-11 transition-transform duration-[350ms] ease-out"
        style={{ background: AX.pageBg, transform: pushed ? 'translateX(0)' : 'translateX(102%)' }}
      >
        <div className="relative flex h-11 shrink-0 items-center px-4">
          <span className="grid h-[38px] w-[38px] place-items-center rounded-[16px]" style={{ background: AX.xBtn, color: AX.xMark }}>
            <ChevronLeft className="h-[18px] w-[18px]" strokeWidth={2.8} />
          </span>
          <div className="absolute left-1/2 flex -translate-x-1/2 flex-col items-center gap-px">
            <span className="text-[16px] font-semibold" style={{ color: AX.label }}>
              Sleepy Otter
            </span>
            <Presence online text="Online" />
          </div>
          <span className="flex-1" />
          <CircleEllipsis className="h-[22px] w-[22px]" style={{ color: AX.accent }} strokeWidth={2} />
        </div>
        <div className="flex min-h-0 flex-1 flex-col justify-end gap-1.5 overflow-hidden px-5 pb-1">
          {msgs.map((m) => (
            <ChatBubble key={m.id} m={m} />
          ))}
        </div>
        {/* The composer: the keyboard's own surface, so the two read as one. */}
        <div className="shrink-0" style={{ background: AX.keyboardBg }}>
          <div className="flex items-end gap-2 px-3 py-2">
            <div className="flex min-h-10 flex-1 items-center rounded-[20px] px-3.5 py-[9px] text-[16px]" style={{ background: AX.cardBg }}>
              {draft ? (
                <span style={{ color: AX.label }}>
                  {draft}
                  <span className="ml-px inline-block h-[18px] w-[2px] translate-y-[3px] animate-pulse" style={{ background: AX.accent }} />
                </span>
              ) : (
                <span style={{ color: AX.terLabel }}>Message</span>
              )}
            </div>
            <span className="grid h-11 w-11 place-items-center">
              <SendCircle size={32} on={!!draft} />
            </span>
          </div>
          {kb ? <Keyboard rewording={rewording} /> : <div className="h-[34px]" />}
        </div>
      </div>
    </>
  );

  return (
    <Phone rootRef={rootRef} scale={scale} bg={AX.pageBg} running={running} onToggleRun={onToggleRun} onRestart={() => (onRestart?.(), restart())}>
      {screen}
    </Phone>
  );
}

// ── Practice (guided chats) ──────────────────────────────────────────────────

type Line =
  | { id: number; kind: 'typing' }
  | { id: number; kind: 'them'; text: string; tr: string; open?: boolean; playing?: boolean }
  | { id: number; kind: 'me'; text: string; tr: string; corrected?: string };

const REPLIES = [
  { text: 'Sí, voy ahora.', tr: "Yes, I'm coming now." },
  { text: 'En diez minutos, ¿vale?', tr: 'In ten minutes, okay?' },
  { text: 'Hoy no puedo, lo siento.', tr: "I can't today, sorry." },
];

/** ProgressBadge: a 16pt ring and the percent (nothing at 0; green check at 100). */
function ProgressBadge({ pct }: { pct: number }) {
  if (pct <= 0) return null;
  if (pct >= 100)
    return (
      <span className="flex items-center gap-1 text-[12px] font-medium" style={{ color: AX.green }}>
        <CheckCircle2 className="h-4 w-4" fill="currentColor" stroke="white" strokeWidth={2} /> 100%
      </span>
    );
  const r = 6.5;
  const c = 2 * Math.PI * r;
  return (
    <span className="flex items-center gap-1 text-[12px] font-medium" style={{ color: AX.secLabel }}>
      <svg width="16" height="16" viewBox="0 0 16 16" className="-rotate-90">
        <circle cx="8" cy="8" r={r} fill="none" stroke={AX.secLabel} strokeOpacity={0.4} strokeWidth="3" />
        <circle cx="8" cy="8" r={r} fill="none" stroke={AX.accent} strokeWidth="3" strokeLinecap="round" strokeDasharray={`${(pct / 100) * c} ${c}`} className="transition-[stroke-dasharray] duration-500" />
      </svg>
      {pct}%
    </span>
  );
}

function Ring({ value, frac, label }: { value: number; frac: number; label: string }) {
  const r = 24.5;
  const c = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative h-[54px] w-[54px]">
        <svg width="54" height="54" viewBox="0 0 54 54" className="-rotate-90">
          <circle cx="27" cy="27" r={r} fill="none" stroke={AX.secLabel} strokeOpacity={0.4} strokeWidth="5" />
          <circle cx="27" cy="27" r={r} fill="none" stroke={AX.accent} strokeWidth="5" strokeLinecap="round" strokeDasharray={`${frac * c} ${c}`} />
        </svg>
        <span className="absolute inset-0 grid place-items-center text-[15px] font-semibold" style={{ color: AX.label }}>
          {value}
        </span>
      </div>
      <span className="text-[12px]" style={{ color: AX.secLabel }}>
        {label}
      </span>
    </div>
  );
}

function PracticeCard({ title, lengths, level, pct, quiz, pressed }: { title: string; lengths?: boolean; level: string; pct: number; quiz?: string; pressed?: boolean }) {
  return (
    <div className="flex min-h-[120px] flex-col gap-2 rounded-[12px] p-3 transition-[filter] duration-100" style={{ background: AX.cardBg, filter: pressed ? 'brightness(0.92)' : 'none' }}>
      <span className="line-clamp-3 text-[15px] font-semibold leading-snug" style={{ color: AX.label }}>
        {title}
      </span>
      {lengths && (
        <span className="text-[12px]" style={{ color: AX.secLabel }}>
          S · M · L
        </span>
      )}
      {quiz && (
        <span className="self-start rounded-[4px] px-1.5 py-0.5 text-[11px] font-medium" style={{ color: AX.green, background: 'color-mix(in srgb, var(--ax-green) 15%, transparent)' }}>
          {quiz}
        </span>
      )}
      <span className="flex-1" />
      <div className="flex items-center gap-1.5">
        <span className="rounded-[4px] px-1.5 py-0.5 text-[11px] font-medium" style={{ color: AX.accent, background: 'color-mix(in srgb, var(--ax-accent) 12%, transparent)' }}>
          {level}
        </span>
        <span className="flex-1" />
        <ProgressBadge pct={pct} />
      </div>
    </div>
  );
}

function PracticeScreenLoop({ running, onToggleRun, onRestart, scale }: LoopProps) {
  const [pushed, setPushed] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [lines, setLines] = useState<Line[]>([]);
  const [card, setCard] = useState(0);
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(0);
  const [kb, setKb] = useState(false);
  const [pct, setPct] = useState(0);
  const [mode, setMode] = useState<'chat' | 'quiz' | 'results'>('chat');
  const [pick, setPick] = useState<number | null>(null);

  const { rootRef, restart } = useLoop(() => {
    const b: Beat[] = [];
    let id = 10;
    const say = (text: string, tr: string) => {
      const typingId = ++id;
      b.push({ fn: () => setLines((l) => [...l, { id: typingId, kind: 'typing' }]), ms: 600 });
      const lineId = ++id;
      b.push({
        fn: () => setLines((l) => [...l.filter((x) => x.id !== typingId), { id: lineId, kind: 'them', text, tr, playing: true }]),
        ms: 1300,
      });
      b.push({ fn: () => setLines((l) => l.map((x) => (x.id === lineId && x.kind === 'them' ? { ...x, playing: false } : x))), ms: 400 });
      return lineId;
    };
    b.push({
      fn: () => {
        setPushed(false);
        setPressed(false);
        setLines([]);
        setCard(0);
        setInput('');
        setError(null);
        setKb(false);
        setPct(0);
        setMode('chat');
        setPick(null);
      },
      ms: 2800,
    });
    b.push({ fn: () => setPressed(true), ms: 220 });
    b.push({
      fn: () => {
        setPressed(false);
        setPushed(true);
      },
      ms: 800,
    });
    const first = say('¿Me ayudas a lavar los platos?', 'Can you help me wash the dishes?');
    // Tap the bubble for its translation; look through the replies.
    b.push({ fn: () => setLines((l) => l.map((x) => (x.id === first && x.kind === 'them' ? { ...x, open: true } : x))), ms: 1300 });
    b.push({ fn: () => setCard(1), ms: 900 });
    b.push({ fn: () => setCard(0), ms: 800 });
    b.push({ fn: () => setKb(true), ms: 500 });
    // English is not a reply: the bar shakes.
    typeInto(b, "Yes I'm coming now", setInput, 38);
    b.push({
      fn: () => {
        setError('Type in Spanish');
        setShake((s) => s + 1);
      },
      ms: 1400,
    });
    b.push({
      fn: () => {
        setInput('');
        setError(null);
      },
      ms: 350,
    });
    // Close enough to a reply is the reply, with what was typed noted.
    typeInto(b, 'si voy ahora', setInput, 60);
    b.push({ fn: () => {}, ms: 300 });
    b.push({
      fn: () => {
        setLines((l) => [...l, { id: 99, kind: 'me', text: REPLIES[0].text, tr: REPLIES[0].tr, corrected: 'si voy ahora' }]);
        setInput('');
        setPct(20);
      },
      ms: 700,
    });
    say('Genial, te espero en la cocina.', "Great, I'll wait for you in the kitchen.");
    b.push({ fn: () => {}, ms: 800 });
    // The chat's words, quizzed.
    b.push({
      fn: () => {
        setKb(false);
        setMode('quiz');
      },
      ms: 1500,
    });
    b.push({ fn: () => setPick(0), ms: 1500 });
    b.push({ fn: () => setMode('results'), ms: 2800 });
    return b;
  }, running);

  const header = (
    <div className="flex h-11 shrink-0 items-center border-b pl-1 pr-4" style={{ borderColor: AX.hairline }}>
      <span className="grid h-11 w-11 place-items-center" style={{ color: AX.accent }}>
        <ChevronLeft className="h-[22px] w-[22px]" strokeWidth={2.6} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[16px] font-semibold" style={{ color: AX.label }}>
          Mom wants help with the dishes
        </div>
        <div className="text-[12px]" style={{ color: AX.secLabel }}>
          A1
        </div>
      </div>
      <span className="grid h-11 w-9 place-items-center" style={{ color: AX.accent }}>
        <AudioLines className="h-[18px] w-[18px]" strokeWidth={2.4} />
      </span>
      <span className="grid h-11 w-9 place-items-center" style={{ color: AX.accent }}>
        <BarChart3 className="h-[18px] w-[18px]" strokeWidth={2.4} />
      </span>
      <span className="ml-1 min-w-[44px]">
        <ProgressBadge pct={pct} />
      </span>
    </div>
  );

  const speaker = (playing?: boolean) => (
    <span className="grid h-11 w-11 shrink-0 place-items-center" style={{ color: AX.accent }}>
      {playing ? <Square className="h-[14px] w-[14px]" fill="currentColor" /> : <Volume2 className="h-[18px] w-[18px]" strokeWidth={2.4} />}
    </span>
  );

  const quizOptions = ['dishes', 'kitchen', 'help'];

  const screen = (
    <>
      <StatusBar />
      {/* The Practice tab. */}
      <div className="absolute inset-0 flex flex-col pt-11">
        <TitleBar title="Practice" />
        <div className="flex flex-col gap-4">
          <div className="mx-5 flex flex-col gap-3 rounded-[16px] p-4" style={{ background: AX.groupedCard }}>
            <span className="text-[16px] font-semibold" style={{ color: AX.label }}>
              Word progress
            </span>
            <div className="flex items-center text-[15px]" style={{ color: AX.label }}>
              <span className="flex-1">
                <b>342</b> of 5,000 words used
              </span>
              <ChevronRight className="h-[14px] w-[14px]" style={{ color: AX.secLabel }} strokeWidth={2.6} />
            </div>
            <div className="h-1 overflow-hidden rounded-full" style={{ background: 'color-mix(in srgb, var(--ax-sec-label) 33%, transparent)' }}>
              <div className="h-full rounded-full" style={{ width: '6.84%', background: AX.accent }} />
            </div>
            <div className="grid grid-cols-4">
              <Ring value={128} frac={0.42} label="Nouns" />
              <Ring value={74} frac={0.3} label="Verbs" />
              <Ring value={41} frac={0.24} label="Adj." />
              <Ring value={22} frac={0.16} label="Adverbs" />
            </div>
            <span className="flex items-center justify-center gap-1 text-[14px] font-medium" style={{ color: AX.accent }}>
              Show more <ChevronDown className="h-3.5 w-3.5" strokeWidth={2.6} />
            </span>
          </div>
          <div className="flex gap-2 px-5">
            {['Topic', 'A1', 'A2', 'B1'].map((c, i) => (
              <span key={c} className="flex items-center gap-1 rounded-full px-3 py-[7px] text-[14px] font-medium" style={{ background: AX.cardBg, color: AX.label }}>
                {c}
                {i === 0 && <ChevronDown className="h-[11px] w-[11px]" strokeWidth={3} />}
              </span>
            ))}
          </div>
          <div className="px-5 text-[18px] font-semibold" style={{ color: AX.label }}>
            Family
          </div>
          <div className="grid grid-cols-2 gap-3 px-5">
            <PracticeCard title="Mom wants help with the dishes" level="A1" pct={0} pressed={pressed} />
            <PracticeCard title="Dinner at Grandma's" lengths level="A1" pct={40} />
            <PracticeCard title="Planning a birthday surprise" lengths level="A2" pct={100} quiz="Quiz 8/10" />
            <PracticeCard title="Borrowing the car" level="A2" pct={0} />
          </div>
        </div>
        <TabBar selected="practice" />
      </div>

      {/* A guided chat, pushed over the tab view. */}
      <div
        className="absolute inset-0 z-10 flex flex-col pt-11 transition-transform duration-[350ms] ease-out"
        style={{ background: AX.screen, transform: pushed ? 'translateX(0)' : 'translateX(102%)' }}
      >
        {header}
        {mode === 'chat' ? (
          <>
            <div className="flex min-h-0 flex-1 flex-col justify-end gap-2 overflow-hidden p-3">
              {lines.map((l) =>
                l.kind === 'typing' ? (
                  <span key={l.id} className="self-start rounded-[16px] px-3.5 py-2 text-[18px] font-bold leading-none tracking-widest animate-pulse" style={{ background: AX.sys2, color: AX.secLabel }}>
                    •••
                  </span>
                ) : l.kind === 'them' ? (
                  <div key={l.id} className="flex items-start pr-4 animate-in fade-in-0 slide-in-from-bottom-1 duration-200">
                    <div className="flex min-h-11 max-w-[260px] flex-col justify-center rounded-[16px] p-2.5" style={{ background: AX.sys2, color: AX.label }}>
                      <span className="flex items-start gap-2 text-[16px]">
                        {l.text}
                        <ChevronDown className={`mt-1.5 h-3 w-3 shrink-0 transition-transform ${l.open ? 'rotate-180' : ''}`} style={{ color: AX.secLabel }} strokeWidth={3} />
                      </span>
                      {l.open && (
                        <span className="mt-1 text-[13px] animate-in fade-in-0 duration-200" style={{ color: AX.secLabel }}>
                          {l.tr}
                        </span>
                      )}
                    </div>
                    {speaker(l.playing)}
                  </div>
                ) : (
                  <div key={l.id} className="flex flex-col items-end animate-in fade-in-0 slide-in-from-bottom-1 duration-200">
                    <div className="flex items-start">
                      {speaker()}
                      <div className="flex min-h-11 max-w-[260px] items-center gap-2 rounded-[16px] p-2.5 text-[16px] text-white" style={{ background: AX.ztBlue }}>
                        {l.text}
                        <ChevronDown className="h-3 w-3 shrink-0" style={{ color: 'rgba(255,255,255,0.85)' }} strokeWidth={3} />
                      </div>
                    </div>
                    {l.corrected && (
                      <span className="mt-1 text-[11px]" style={{ color: AX.secLabel }}>
                        Corrected from “{l.corrected}”
                      </span>
                    )}
                  </div>
                )
              )}
            </div>
            {/* Replies to choose from, one at a time, then the field. */}
            <div className="shrink-0 px-3 pb-2">
              {lines.some((l) => l.kind === 'them') && !lines.some((l) => l.kind === 'typing') && !lines.some((l) => l.kind === 'me') && (
                <div className="mb-2 flex items-center animate-in fade-in-0 duration-200">
                  <ChevronLeft className="h-5 w-9 shrink-0" style={{ color: AX.accent, opacity: card === 0 ? 0.35 : 1 }} strokeWidth={2.6} />
                  <div className="relative min-w-0 flex-1 overflow-hidden">
                    <div className="flex transition-transform duration-300 ease-out" style={{ transform: `translateX(calc(${-card * 100}% - ${card * 12}px))`, gap: 12 }}>
                      {REPLIES.map((r) => (
                        <div key={r.text} className="w-full shrink-0 rounded-[12px] p-3" style={{ background: AX.selectedBg }}>
                          <div className="text-[15px] font-medium" style={{ color: AX.btnTextBlue }}>
                            {r.text}
                          </div>
                          <div className="text-[12px] opacity-70" style={{ color: AX.btnTextBlue }}>
                            {r.tr}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  {speaker()}
                  <ChevronRight className="h-5 w-9 shrink-0" style={{ color: AX.accent }} strokeWidth={2.6} />
                </div>
              )}
              {error && (
                <div className="mb-1 px-1 text-[12px] animate-in fade-in-0 duration-150" style={{ color: AX.red }}>
                  {error}
                </div>
              )}
              <div key={shake} className={`flex items-center gap-2 ${shake ? 'ax-shake' : ''}`}>
                <div className="flex h-10 flex-1 items-center rounded-full px-3 text-[16px]" style={{ background: AX.sys2 }}>
                  {input ? (
                    <span style={{ color: AX.label }}>
                      {input}
                      <span className="ml-px inline-block h-[18px] w-[2px] translate-y-[3px] animate-pulse" style={{ background: AX.accent }} />
                    </span>
                  ) : (
                    <span style={{ color: AX.terLabel }}>Type a reply</span>
                  )}
                </div>
                <SendCircle size={30} on={!!input} />
              </div>
            </div>
            {kb ? <Keyboard /> : <div className="h-[34px] shrink-0" />}
          </>
        ) : mode === 'quiz' ? (
          <div className="flex flex-1 flex-col animate-in fade-in-0 slide-in-from-right-4 duration-300">
            <div className="flex items-center gap-3 px-4 pt-4">
              <div className="h-1 flex-1 overflow-hidden rounded-full" style={{ background: AX.sys2 }}>
                <div className="h-full rounded-full" style={{ width: '30%', background: AX.accent }} />
              </div>
              <span className="text-[13px] font-medium tabular-nums" style={{ color: AX.secLabel }}>
                3/10
              </span>
              <span className="text-[15px] font-semibold" style={{ color: AX.accent }}>
                Skip
              </span>
            </div>
            <div className="mt-12 text-center text-[15px]" style={{ color: AX.secLabel }}>
              What does this mean?
            </div>
            <div className="mt-2 flex items-center justify-center gap-1">
              <span className="text-[34px] font-semibold" style={{ color: AX.label }}>
                platos
              </span>
              {speaker()}
            </div>
            <div className="mt-8 flex flex-col gap-2.5 px-4">
              {quizOptions.map((o, i) => {
                const right = pick !== null && i === 0;
                const dim = pick !== null && !right;
                return (
                  <div
                    key={o}
                    className="flex min-h-[52px] items-center rounded-[12px] px-4 text-[16px] font-medium transition-all duration-200"
                    style={
                      right
                        ? { background: 'color-mix(in srgb, var(--ax-green) 20%, transparent)', boxShadow: `inset 0 0 0 2px ${AX.green}`, color: AX.btnTextBlue }
                        : { background: AX.selectedBg, color: AX.btnTextBlue, opacity: dim ? 0.6 : 1 }
                    }
                  >
                    <span className="flex-1">{o}</span>
                    {right && <CheckCircle2 className="h-5 w-5" style={{ color: AX.green }} fill="currentColor" stroke="white" strokeWidth={2} />}
                  </div>
                );
              })}
            </div>
            {pick !== null && (
              <div className="mx-4 mt-6 flex min-h-11 items-center justify-center rounded-[12px] text-[16px] font-semibold text-white animate-in fade-in-0 duration-200" style={{ background: AX.accent }}>
                Next
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center px-4 pt-16 animate-in fade-in-0 duration-300">
            <span className="text-[44px] font-semibold" style={{ color: AX.green }}>
              8/10
            </span>
            <span className="text-[17px] font-medium" style={{ color: AX.label }}>
              Great work
            </span>
            <div className="mt-8 w-full text-[13px] font-semibold" style={{ color: AX.secLabel }}>
              Words to review
            </div>
            <div className="mt-2 w-full rounded-[12px] p-4" style={{ background: AX.sys2 }}>
              {[
                ['cocina', 'kitchen'],
                ['secas', 'you dry'],
              ].map(([w, m], i) => (
                <div key={w} className={`flex items-center justify-between ${i ? 'mt-3' : ''}`}>
                  <span className="text-[16px] font-semibold" style={{ color: AX.label }}>
                    {w}
                  </span>
                  <span className="text-[15px]" style={{ color: AX.secLabel }}>
                    {m}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-6 flex min-h-11 w-full items-center justify-center rounded-[12px] text-[16px] font-semibold text-white" style={{ background: AX.accent }}>
              Continue
            </div>
          </div>
        )}
      </div>
    </>
  );

  return (
    <Phone rootRef={rootRef} scale={scale} bg={AX.pageBg} running={running} onToggleRun={onToggleRun} onRestart={() => (onRestart?.(), restart())}>
      {screen}
    </Phone>
  );
}

// ── The phone ────────────────────────────────────────────────────────────────

type LoopProps = { running: boolean; onToggleRun?: () => void; onRestart?: () => void; scale: number };

function Phone({
  rootRef,
  scale,
  bg,
  running,
  onToggleRun,
  onRestart,
  children,
}: {
  rootRef: React.RefObject<HTMLDivElement | null>;
  scale: number;
  bg: string;
  running: boolean;
  onToggleRun?: () => void;
  onRestart: () => void;
  children: ReactNode;
}) {
  return (
    <div ref={rootRef} className="flex flex-col items-center">
      <div className="relative" style={{ width: OUTER_W * scale, height: OUTER_H * scale }}>
        <div
          className="relative bg-black"
          style={{
            width: OUTER_W,
            height: OUTER_H,
            padding: BEZEL,
            borderRadius: 56,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            boxShadow: `0 0 0 1px ${AX.bezelRing}, 0 30px 60px -20px rgba(20,10,40,0.5)`,
          }}
        >
          <div className="relative select-none overflow-hidden" style={{ width: DESIGN_W, height: SCREEN_H, borderRadius: 44, background: bg, fontFamily: NOTO }}>
            {children}
          </div>
        </div>
      </div>
      <div className="mt-5 flex items-center gap-2">
        {onToggleRun && (
          <button onClick={onToggleRun} aria-label={running ? 'Pause' : 'Play'} title={running ? 'Pause' : 'Play'} className={BTN}>
            {running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 translate-x-[1px]" />}
          </button>
        )}
        <button onClick={onRestart} aria-label="Restart" title="Restart" className={BTN}>
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default function ArcatextAppPhone({
  screen,
  scale = 0.62,
  running = true,
  onToggleRun,
  onRestart,
}: {
  screen: AppScreen;
  scale?: number;
  running?: boolean;
  onToggleRun?: () => void;
  onRestart?: () => void;
}) {
  return screen === 'chat' ? (
    <ChatScreenLoop scale={scale} running={running} onToggleRun={onToggleRun} onRestart={onRestart} />
  ) : (
    <PracticeScreenLoop scale={scale} running={running} onToggleRun={onToggleRun} onRestart={onRestart} />
  );
}

