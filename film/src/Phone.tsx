import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown, Plus, ArrowUp, Mic, Video, Phone as Phone_, Paperclip, SendHorizontal } from 'lucide-react';
import studyUrl from '@/assets/keyboard/study.svg';
import pasteUrl from '@/assets/keyboard/paste.svg';
import checkUrl from '@/assets/keyboard/check.svg';
import shiftUrl from '@/assets/keyboard/shift.svg';
import backspaceUrl from '@/assets/keyboard/backspace.svg';
import localesUrl from '@/assets/keyboard/locales.svg';
import studyDarkUrl from '@/assets/keyboard/study-dark.svg';
import pasteDarkUrl from '@/assets/keyboard/paste-dark.svg';
import checkDarkUrl from '@/assets/keyboard/check-dark.svg';
import shiftDarkUrl from '@/assets/keyboard/shift-dark.svg';
import backspaceDarkUrl from '@/assets/keyboard/backspace-dark.svg';
import localesDarkUrl from '@/assets/keyboard/locales-dark.svg';
import { AX, AxIcon } from '@/lib/arcatextTheme';
import { CheckPanel, type CheckData, type CheckState } from '@/components/ArcatextViews';
import { clamp01, easeOutCubic, easeOutBack } from './ease';

/**
 * The phone the film shoots: an iPhone body with real edge thickness (stacked
 * layers, so angled shots show a side) around a messaging app with the
 * Arcatext keyboard: Messages for the story, and two generic look-alikes of
 * other messaging apps (no logos) for the app-switching scene. Everything on screen is a pure function of the props, so a frame can
 * be rendered for any time without running anything in between.
 *
 * Screen metrics and colours follow ArcatextKeyboard.tsx (402x874pt, the
 * app's colorsets via AX); the Check view is the site's own CheckPanel.
 */

export const DESIGN_W = 402;
export const SCREEN_H = 874;
export const BEZEL = 12;
export const FRAME = 5;
export const OUTER_W = DESIGN_W + BEZEL * 2;
export const OUTER_H = SCREEN_H + BEZEL * 2;
const DEPTH = 40;
const LAYERS = Number(new URLSearchParams(location.search).get('layers') ?? 20);

export type ScreenState = {
  /** Seconds, for blinking and spinning things. */
  t: number;
  text: string;
  /** 0..1: how far the field has crossfaded from `prevText` to `text`. */
  swap: number;
  prevText: string;
  typing: boolean;
  /** The letter key held down (lowercase), 'space', or null. */
  keyDown: string | null;
  pressed: string | null;
  rewordLoading: boolean;
  sent: { text: string; t0: number }[];
  view: 'none' | 'check';
  check: CheckState;
  checkData: CheckData;
  checkScroll: number;
  /** The apps on screen: one normally, two while switching (index 0 is
      Messages, 1.. are `others`), each slid x px and scaled like an iOS card. */
  cards: { index: number; app: AppCard['app']; x: number; scale: number }[];
  others: AppCard[];
  /** 0..1 through an app-switch swipe, or null. */
  swipe: number | null;
};

/** A messaging app other than Messages, with a reply already in the field. */
export type AppCard = {
  app: 'imessage' | 'whatsapp' | 'telegram';
  contact: string;
  received: string[];
  sent: string[];
  text: string;
};

function Key({
  label,
  num,
  bg = AX.key,
  grow = 1,
  fontSize = 22,
  down,
  children,
}: {
  label?: string;
  num?: string;
  bg?: string;
  grow?: number;
  fontSize?: number;
  down?: boolean;
  children?: ReactNode;
}) {
  return (
    <div
      className="relative flex select-none items-center justify-center rounded-[4.6px]"
      style={{
        backgroundColor: down && !label ? AX.toolBtnPressed : bg,
        color: AX.keyText,
        height: 42,
        flexGrow: grow,
        flexBasis: 0,
        boxShadow: `0 1px 0 ${AX.keyShadow}`,
        fontSize,
      }}
    >
      {num && (
        <span className="absolute right-[5px] top-[3px]" style={{ fontSize: 9, color: AX.keyHint }}>
          {num}
        </span>
      )}
      {children ?? label}
      {/* iOS key popup: the letter, enlarged, above the finger. */}
      {down && label && (
        <div
          className="absolute bottom-0 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center"
          style={{ filter: 'drop-shadow(0 1px 1.5px rgba(0,0,0,0.35))' }}
        >
          <div
            className="grid place-items-center rounded-[9px]"
            style={{ width: 56, height: 56, background: AX.key, fontSize: 36, color: AX.keyText }}
          >
            {label}
          </div>
          <div style={{ width: 34, height: 46, background: AX.key, borderRadius: '0 0 6px 6px', marginTop: -2 }} />
        </div>
      )}
    </div>
  );
}

function ToolButton({ pressed, children }: { pressed: boolean; children: ReactNode }) {
  return (
    <div
      className="grid shrink-0 place-items-center rounded-[12px]"
      style={{ width: 57, height: 50, backgroundColor: pressed ? AX.toolBtnPressed : AX.toolBtn }}
    >
      {children}
    </div>
  );
}

export function Spinner({ t, size = 20 }: { t: number; size?: number }) {
  return (
    <span
      className="block rounded-full border-2"
      style={{
        width: size,
        height: size,
        borderColor: 'rgba(255,255,255,0.4)',
        borderTopColor: '#fff',
        borderRightColor: '#fff',
        transform: `rotate(${t * 360 * 1.2}deg)`,
      }}
    />
  );
}

/** A touch: a soft halo where the finger lands. */
export function Touch({ inset = -8 }: { inset?: number }) {
  return <span aria-hidden className="pointer-events-none absolute rounded-full bg-black/15 dark:bg-white/25" style={{ inset }} />;
}

const JP_FONT = "Inter, 'Noto Sans JP', sans-serif";

function StatusBar() {
  return (
    <div className="relative flex h-11 shrink-0 items-center justify-between px-7 pt-1" style={{ color: '#000' }}>
      <span className="text-[15px] font-semibold">9:41</span>
      <div className="absolute left-1/2 top-2 h-7 w-[100px] -translate-x-1/2 rounded-full bg-black" />
      <div className="flex items-center gap-1.5">
        <div className="flex items-end gap-[2px]">
          {[6, 9, 12, 15].map((h, i) => (
            <span key={i} className="w-[3px] rounded-[1px]" style={{ height: h, background: '#000' }} />
          ))}
        </div>
        <svg width="17" height="13" viewBox="0 0 17 13" fill="none">
          <path
            d="M8.5 2.2c2.5 0 4.8 1 6.5 2.6l-1.3 1.4A7.7 7.7 0 008.5 4.1 7.7 7.7 0 003.3 6.2L2 4.8A9.5 9.5 0 018.5 2.2zm0 3.6c1.5 0 2.9.6 3.9 1.6l-1.4 1.4a3.5 3.5 0 00-5 0L4.6 7.4A5.5 5.5 0 018.5 5.8zm0 3.5c.7 0 1.3.3 1.8.8L8.5 12 6.7 10.1c.5-.5 1.1-.8 1.8-.8z"
            fill="currentColor"
          />
        </svg>
        <div className="ml-[1px] flex h-[13px] w-[24px] items-center rounded-[3px] border p-[1.5px]" style={{ borderColor: 'rgba(0,0,0,0.4)' }}>
          <div className="h-full w-full rounded-[1px] bg-black" />
        </div>
      </div>
    </div>
  );
}

/** The Arcatext keyboard: toolbar, keys, and the globe/dictation row. */
export function Keyboard({ s, idle }: { s: Pick<ScreenState, 't' | 'text' | 'keyDown' | 'pressed' | 'rewordLoading'>; idle?: boolean }) {
  const keyDown = idle ? null : s.keyDown;
  const pressed = idle ? null : s.pressed;
  const loading = idle ? false : s.rewordLoading;
  const text = idle ? 'x' : s.text;
  const lower = !(text === '' || /[.?!]\s$/.test(text));
  const row1 = ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'];
  const row2 = ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'];
  const row3 = ['z', 'x', 'c', 'v', 'b', 'n', 'm'];
  const nums = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
  const cap = (l: string) => (lower ? l : l.toUpperCase());
  return (
    <div style={{ backgroundColor: AX.keyboardBg }} className="shrink-0 px-[5px] pb-1 pt-2">
      <div className="mb-2 flex items-center px-[3px]" style={{ height: 50, gap: 12 }}>
        <div className="relative">
          {pressed === 'study' && <Touch inset={-6} />}
          <ToolButton pressed={pressed === 'study'}>
            <AxIcon light={studyUrl} dark={studyDarkUrl} width={20} height={17} />
          </ToolButton>
        </div>
        <ToolButton pressed={pressed === 'paste'}>
          <AxIcon light={pasteUrl} dark={pasteDarkUrl} width={16} height={20} />
        </ToolButton>
        <div className="relative">
          {pressed === 'check' && <Touch inset={-6} />}
          <ToolButton pressed={pressed === 'check'}>
            <AxIcon light={checkUrl} dark={checkDarkUrl} width={20} height={20} />
          </ToolButton>
        </div>
        <div className="flex-1" />
        <div className="relative">
          <div className="relative flex items-stretch overflow-hidden rounded-[12px]" style={{ height: 50, backgroundColor: AX.item }}>
            {/* Pressed, as StandardToolbar's split pill: the label half darkens
                (black at 20%), and nothing else changes. */}
            <div className="relative flex items-center px-[14px]" style={{ background: pressed === 'reword' ? 'rgba(0,0,0,0.2)' : undefined }}>
              <span className={`text-[16px] font-medium text-white ${loading ? 'invisible' : ''}`}>Reword</span>
              {loading && (
                <span className="absolute inset-0 grid place-items-center">
                  <Spinner t={s.t} />
                </span>
              )}
            </div>
            <div className="self-center" style={{ width: 1, height: 20, backgroundColor: 'rgba(255,255,255,0.5)' }} />
            <div className="relative grid place-items-center" style={{ width: 40 }}>
              <ChevronDown className="h-4 w-4 text-white" strokeWidth={2.4} />
            </div>
          </div>
        </div>
      </div>

      <div className="mb-[8px] flex gap-[5px]">
        {row1.map((l, i) => (
          <Key key={l} label={cap(l)} num={nums[i]} down={keyDown === l} />
        ))}
      </div>
      <div className="mb-[8px] flex gap-[5px] px-[18px]">
        {row2.map((l) => (
          <Key key={l} label={cap(l)} down={keyDown === l} />
        ))}
      </div>
      <div className="mb-[8px] flex gap-[5px]">
        <Key bg={AX.actionKey} grow={1.5}>
          <AxIcon light={shiftUrl} dark={shiftDarkUrl} width={19} height={17} />
        </Key>
        {row3.map((l) => (
          <Key key={l} label={cap(l)} down={keyDown === l} />
        ))}
        <Key bg={AX.actionKey} grow={1.5}>
          <AxIcon light={backspaceUrl} dark={backspaceDarkUrl} width={23} height={17} />
        </Key>
      </div>
      <div className="mb-2 flex gap-[5px]">
        <Key bg={AX.actionKey} grow={1.6} fontSize={15} down={keyDown === '123'}>
          123
        </Key>
        <Key bg={AX.actionKey} grow={1.2}>
          <AxIcon light={localesUrl} dark={localesDarkUrl} width={14} height={17} />
        </Key>
        <Key grow={5} fontSize={15} down={keyDown === 'space'}>
          <span style={{ opacity: 0.85 }}>space</span>
        </Key>
        <Key bg={AX.actionKey} grow={1.6}>
          <svg width="24" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M19 7v4a2 2 0 0 1-2 2H7" stroke={AX.glyph} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M11 9l-4 4 4 4" stroke={AX.glyph} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Key>
      </div>
    </div>
  );
}

export function GlobeRow({ tall, padTop }: { tall?: boolean; padTop?: number }) {
  return (
    <div style={{ backgroundColor: AX.keyboardBg, paddingTop: padTop ?? (tall ? 22 : 17) }} className="flex shrink-0 items-center justify-between px-5 pb-[28px]">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9.2" stroke={AX.glyph} strokeWidth="1.5" />
        <ellipse cx="12" cy="12" rx="4" ry="9.2" stroke={AX.glyph} strokeWidth="1.5" />
        <path d="M3 12h18M4.5 7.5h15M4.5 16.5h15" stroke={AX.glyph} strokeWidth="1.5" />
      </svg>
      <Mic className="h-6 w-6" style={{ color: AX.glyph }} strokeWidth={2} />
    </div>
  );
}

function Cursor({ on, color }: { on: boolean; color: string }) {
  return <span className="ml-[1px] inline-block h-[18px] w-[2px] translate-y-[3px] rounded-full" style={{ background: color, opacity: on ? 1 : 0 }} />;
}

// ── iMessage ────────────────────────────────────────────────────────────────

function MessagesApp({ s }: { s: ScreenState }) {
  const hasText = s.text.length > 0 || (s.swap < 1 && s.prevText.length > 0);
  // The cursor is solid while typing and blinks (iOS: ~0.5s on, 0.5s off) when idle.
  const cursor = <Cursor on={s.typing || Math.floor(s.t * 2) % 2 === 0} color={AX.send} />;
  return (
    <>
      <div className="flex shrink-0 flex-col items-center border-b px-4 pb-3 pt-1" style={{ borderColor: AX.hairline }}>
        <div className="flex w-full items-center justify-between">
          <ChevronLeft className="h-7 w-7" style={{ color: AX.send }} strokeWidth={2.4} />
          <div className="w-7" />
        </div>
        <div className="-mt-5 flex flex-col items-center gap-1">
          <div className="grid h-12 w-12 place-items-center rounded-full text-sm font-semibold text-white" style={{ background: 'linear-gradient(160deg,#8e9bd6,#6f7fc4)' }}>
            JA
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[15px] font-semibold" style={{ color: AX.ink }}>
              Junko
            </span>
            <ChevronRight className="h-4 w-4" style={{ color: AX.inkMuted }} strokeWidth={2.4} />
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col justify-end gap-1.5 overflow-hidden px-3 pb-2">
        <div className="text-center text-[13px] font-medium" style={{ color: AX.inkMuted }}>
          iMessage
        </div>
        <div className="mb-1 text-center text-[12px]" style={{ color: AX.inkMuted }}>
          Today <span className="font-medium">9:41 AM</span>
        </div>
        {s.sent.map((m, i) => {
          // Rises out of the field and settles, like Messages.
          const k = clamp01((s.t - m.t0) / 0.42);
          const y = (1 - easeOutCubic(k)) * 70;
          const sc = 0.82 + 0.18 * easeOutBack(k);
          return (
            <div key={i} className="flex flex-col items-end">
              <div
                className="max-w-[78%] origin-bottom-right rounded-[20px] px-3.5 py-2 text-[17px] text-white"
                style={{ background: AX.send, transform: `translateY(${y}px) scale(${sc})`, opacity: clamp01(k * 3), fontFamily: JP_FONT }}
              >
                {m.text}
              </div>
              {i === s.sent.length - 1 && (
                <span className="mr-1 mt-0.5 text-[11px]" style={{ color: AX.inkMuted, opacity: clamp01((s.t - m.t0 - 0.5) / 0.2) }}>
                  Delivered
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex shrink-0 items-end gap-2 px-3 pb-2 pt-1">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full" style={{ background: AX.plusBg }}>
          <Plus className="h-5 w-5" style={{ color: AX.plusIcon }} strokeWidth={2.6} />
        </div>
        <div className="relative flex min-h-9 min-w-0 flex-1 items-end rounded-[18px] border py-[7px] pl-4 pr-2" style={{ borderColor: AX.fieldBorder, fontFamily: JP_FONT }}>
          {hasText ? (
            s.swap < 1 ? (
              // Reword: the original blurs out as the new text resolves in.
              <span className="relative min-w-0 flex-1 text-[15px] leading-5">
                <span className="block break-words" style={{ color: AX.ink, opacity: s.swap, filter: `blur(${(1 - s.swap) * 6}px)` }}>
                  {s.text}
                  {cursor}
                </span>
                <span className="absolute inset-x-0 top-0 block break-words" style={{ color: AX.ink, opacity: 1 - s.swap, filter: `blur(${s.swap * 6}px)` }}>
                  {s.prevText}
                </span>
              </span>
            ) : (
              <span className="min-w-0 flex-1 break-words text-[15px] leading-5" style={{ color: AX.ink }}>
                {s.text}
                {cursor}
              </span>
            )
          ) : (
            <>
              <span className="text-[15px] leading-5" style={{ color: AX.fieldPlaceholder }}>
                iMessage
              </span>
              <div className="flex-1" />
              <Mic className="h-5 w-5 shrink-0" style={{ color: AX.fieldPlaceholder }} strokeWidth={2} />
            </>
          )}
        </div>
        {hasText && (
          <div className="relative h-9 w-9 shrink-0">
            {s.pressed === 'send' && <Touch />}
            <div
              className="relative grid h-9 w-9 place-items-center rounded-full"
              style={{
                backgroundColor: AX.send,
                transform: s.pressed === 'send' ? 'scale(0.86)' : 'scale(1)',
                filter: s.pressed === 'send' ? 'brightness(0.82)' : 'none',
              }}
            >
              <ArrowUp className="h-5 w-5 text-white" strokeWidth={2.8} />
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ── Other messaging apps (generic look-alikes, no logos) ─────────────────────

const OTHER_LOOK = {
  whatsapp: {
    headerBg: '#FFFFFF',
    chatBg: '#EFEAE2',
    pattern: 'radial-gradient(rgba(120,100,70,0.08) 1.2px, transparent 1.3px)',
    barBg: '#F6F6F6',
    accent: '#25D366',
    avatar: 'linear-gradient(160deg,#f6b26b,#e8835a)',
  },
  telegram: {
    headerBg: '#F7F7F7',
    chatBg: 'linear-gradient(160deg,#dfe9b0 0%,#b5d6a3 45%,#94c4b6 100%)',
    pattern: 'radial-gradient(rgba(255,255,255,0.22) 1.4px, transparent 1.5px)',
    barBg: '#F7F7F7',
    accent: '#3390EC',
    avatar: 'linear-gradient(160deg,#72d5fd,#2a9ef1)',
  },
} as const;

function OtherApp({ card, t }: { card: AppCard; t: number }) {
  const look = OTHER_LOOK[card.app as 'whatsapp' | 'telegram'];
  const wa = card.app === 'whatsapp';
  const initials = card.contact.slice(0, 1);
  return (
    <>
      {/* Header */}
      {wa ? (
        <div className="flex shrink-0 items-center gap-2 border-b px-2 pb-2 pt-1" style={{ background: look.headerBg, borderColor: 'rgba(0,0,0,0.08)' }}>
          <ChevronLeft className="h-7 w-7 text-black" strokeWidth={2.2} />
          <div className="grid h-9 w-9 place-items-center rounded-full text-[15px] font-semibold text-white" style={{ background: look.avatar }}>
            {initials}
          </div>
          <div className="flex-1 leading-tight">
            <div className="text-[16px] font-semibold text-black">{card.contact}</div>
            <div className="text-[12px] text-black/50">online</div>
          </div>
          <Video className="h-6 w-6 text-black" strokeWidth={1.8} />
          <Phone_ className="ml-4 mr-2 h-[22px] w-[22px] text-black" strokeWidth={1.8} />
        </div>
      ) : (
        <div className="flex shrink-0 items-center border-b px-2 pb-2 pt-1" style={{ background: look.headerBg, borderColor: 'rgba(0,0,0,0.1)' }}>
          <div className="flex w-[90px] items-center text-[17px]" style={{ color: '#007AFF' }}>
            <ChevronLeft className="h-7 w-7" strokeWidth={2.2} />
            Chats
          </div>
          <div className="flex-1 text-center leading-tight">
            <div className="text-[16px] font-semibold text-black">{card.contact}</div>
            <div className="text-[13px] text-black/45">last seen recently</div>
          </div>
          <div className="flex w-[90px] justify-end pr-1">
            <div className="grid h-9 w-9 place-items-center rounded-full text-[15px] font-semibold text-white" style={{ background: look.avatar }}>
              {initials}
            </div>
          </div>
        </div>
      )}

      {/* Chat */}
      <div className="relative flex min-h-0 flex-1 flex-col justify-end gap-1.5 overflow-hidden px-3 pb-2" style={{ background: look.chatBg }}>
        <div className="absolute inset-0" style={{ backgroundImage: look.pattern, backgroundSize: '18px 18px' }} />
        <div className="relative mb-1 self-center rounded-[8px] bg-white/85 px-2.5 py-0.5 text-[12px] font-medium text-black/55 shadow-sm">
          Today
        </div>
        {card.received.map((m, i) => (
          <div key={i} className="relative flex justify-start">
            <div className="max-w-[78%] rounded-[16px] rounded-bl-[4px] bg-white px-3 py-1.5 text-[16px] text-black shadow-[0_1px_0.5px_rgba(0,0,0,0.13)]">
              {m}
              <span className="ml-2 inline-block translate-y-[3px] text-[11px] text-black/40">9:38</span>
            </div>
          </div>
        ))}
      </div>

      {/* Input bar with a message ready to send */}
      <div className="flex shrink-0 items-end gap-2 px-2 pb-2 pt-1.5" style={{ background: look.barBg }}>
        <div className="grid h-9 w-8 shrink-0 place-items-center">
          {wa ? <Plus className="h-6 w-6 text-black" strokeWidth={2} /> : <Paperclip className="h-6 w-6 text-black/45" strokeWidth={1.9} />}
        </div>
        <div className="flex min-h-9 min-w-0 flex-1 items-end rounded-[18px] border bg-white py-[7px] pl-3.5 pr-2" style={{ borderColor: 'rgba(0,0,0,0.12)' }}>
          <span className="min-w-0 flex-1 break-words text-[15px] leading-5 text-black">
            {card.text}
            <Cursor on={Math.floor(t * 2) % 2 === 0} color={look.accent} />
          </span>
        </div>
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full" style={{ background: look.accent }}>
          {wa ? <SendHorizontal className="h-[18px] w-[18px] translate-x-[1px] text-white" strokeWidth={2.4} /> : <ArrowUp className="h-5 w-5 text-white" strokeWidth={2.8} />}
        </div>
      </div>
    </>
  );
}

function Screen({ s }: { s: ScreenState }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = s.checkScroll;
  });
  const switching = s.cards.length > 1;

  return (
    <div className="relative h-full overflow-hidden" style={{ borderRadius: 44, background: '#0b0d12' }}>
      {s.cards.map((c) => {
        const other = c.index > 0 ? s.others[c.index - 1] : null;
        return (
          <div
            key={c.index}
            className="absolute inset-0 flex flex-col overflow-hidden"
            style={{
              background: other ? OTHER_LOOK[other.app as 'whatsapp' | 'telegram'].headerBg : AX.screen,
              borderRadius: switching ? 40 : 44,
              transform: `translateX(${c.x}px) scale(${c.scale})`,
              boxShadow: switching ? '0 10px 40px rgba(0,0,0,0.45)' : undefined,
            }}
          >
            <div style={{ background: other ? OTHER_LOOK[other.app as 'whatsapp' | 'telegram'].headerBg : undefined }}>
              <StatusBar />
            </div>
            {other ? <OtherApp card={other} t={s.t} /> : <MessagesApp s={s} />}
            {!other && s.view === 'check' ? (
              <div className="relative shrink-0">
                <CheckPanel state={s.check} data={s.checkData} scrollRef={scrollRef} />
                {/* The close tap: the panel's × is 38pt at its top right. */}
                {s.pressed === 'close' && <span className="absolute h-[52px] w-[52px] rounded-full bg-black/15" style={{ right: -3, top: -3 }} />}
              </div>
            ) : (
              <Keyboard s={s} idle={!!other} />
            )}
            <GlobeRow tall={!other && s.view === 'check'} />
            <div className="absolute bottom-[8px] left-1/2 h-[5px] w-[134px] -translate-x-1/2 rounded-full bg-black" />
          </div>
        );
      })}
      {/* The swipe along the home indicator that switches apps. */}
      {s.swipe !== null && (
        <span
          className="absolute h-[44px] w-[44px] rounded-full"
          style={{
            bottom: 0,
            left: 280 - 170 * easeOutCubic(s.swipe) - 22,
            background: 'radial-gradient(circle, rgba(255,255,255,0.75), rgba(255,255,255,0.25) 60%, transparent 70%)',
            opacity: Math.sin(Math.PI * s.swipe) * 1.4,
          }}
        />
      )}
    </div>
  );
}

/**
 * The body. Origin (0,0) is the top-left of the black bezel; the titanium band
 * sits FRAME px outside it. `glare` (−1..1) slides the screen reflection with
 * the camera's yaw so turning the phone catches the light.
 */
export default function Phone({ s, glare = 0 }: { s: ScreenState; glare?: number }) {
  const W = OUTER_W + FRAME * 2;
  const H = OUTER_H + FRAME * 2;
  const R = 56 + FRAME;
  const layers = [];
  for (let i = LAYERS; i >= 1; i--) {
    const z = -(i / LAYERS) * DEPTH;
    // Rounded edge shading: bright at the middle of the band, darker toward the faces.
    const u = i / LAYERS;
    const light = 0.36 + 0.34 * Math.sin(Math.PI * u);
    const c = Math.round(255 * light);
    layers.push(
      <div
        key={i}
        className="absolute"
        style={{
          left: -FRAME,
          top: -FRAME,
          width: W,
          height: H,
          borderRadius: R,
          // Only the rim shows past the front face, so the inner layers are
          // rings: far cheaper to rasterize than 48 solid slabs.
          ...(i === LAYERS
            ? { background: '#1b1b1e' }
            : { border: `10px solid rgb(${c},${c},${c + 4})` }),
          transform: `translateZ(${z}px)`,
        }}
      />,
    );
  }
  return (
    <div className="absolute left-0 top-0" style={{ width: OUTER_W, height: OUTER_H, transformStyle: 'preserve-3d' }}>
      {layers}
      {/* Front band */}
      <div
        className="absolute"
        style={{
          left: -FRAME,
          top: -FRAME,
          width: W,
          height: H,
          borderRadius: R,
          background: 'linear-gradient(135deg,#b9bac0 0%,#6d6e74 22%,#d6d7dc 48%,#5c5d63 74%,#a9aab0 100%)',
        }}
      />
      {/* Glass + bezel */}
      <div className="absolute inset-0 bg-black" style={{ borderRadius: 56, padding: BEZEL }}>
        <div style={{ width: DESIGN_W, height: SCREEN_H }}>
          <Screen s={s} />
        </div>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            borderRadius: 56,
            background: `linear-gradient(${115 + glare * 20}deg, rgba(255,255,255,0) ${30 + glare * 25}%, rgba(255,255,255,0.10) ${40 + glare * 25}%, rgba(255,255,255,0) ${55 + glare * 25}%)`,
          }}
        />
      </div>
    </div>
  );
}
