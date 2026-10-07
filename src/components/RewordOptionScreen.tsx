import { ArrowUp, ChevronDown, ChevronLeft, ChevronRight, ChevronsUpDown, Plus, Mic, X } from 'lucide-react';
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

/**
 * RewordOptionScreen
 *
 * Still renders for the Reword part of the solution section: the keyboard
 * right after a reword, and the Options page the Reword button's chevron
 * opens.
 *
 * Deliberately separate from ArcatextKeyboard: that component is a timeline
 * engine whose panels only exist in the states its scenes drive, and these are
 * fixed states it never reaches. The chrome is duplicated rather than lifted
 * out so the demo's behaviour can change without silently redrawing these
 * stills.
 *
 * The three option stills are ONE page — ConfigurationsView in rewordOptions
 * mode, titled "Options" — scrolled to the part each caption talks about, not
 * three separate panels. Everything the page draws for Arabic is drawn, in
 * source order, including the parts no caption calls out:
 *
 *   RewordOptionsView (embedded): Who are you texting? · Group Chat ·
 *     Reword Script (Copy Script only when the copy language has scripts,
 *     which English does not)
 *   Reword Language card: shortcut chips, More Languages
 *   Reword Translation Copy card: toggle, View Copy In...
 *   Autocorrect Languages · Your Gender | Typing Settings
 *
 * Sizes, labels and colors are from that source, its Localizable.xcstrings
 * (English) and the asset catalog. Arabic's scripts are from LanguageData.swift.
 *
 * Colors are the shared Arcatext palette (src/lib/arcatextTheme.tsx), whose
 * CSS variables carry each colorset's light and dark value, so the stills
 * follow the portfolio's theme. Icons with dark artwork swap the same way.
 */

const C = {
  send: AX.send,
  pageBg: AX.pageBg, // PasteBgColor
  cardBg: AX.cardBg, // MenuCardBgColor / CheckCardBgColor
  cardStroke: AX.cardStroke, // MenuCardStrokeColor
  label: AX.label, // MenuLabelColor
  detail: AX.detail, // MenuDetailColor
  // RewordOptionsView.selectedAccentColor and the chips' Color.accent: blue in
  // light, #7BA2FF in dark.
  accent: AX.accent,
  item: AX.item, // ToolbarItemColor (the Reword pill)
  selectedBg: AX.selectedBg, // CheckSelectedBgColor
  chipBg: AX.chipBg,
  chipDivider: AX.separator, // PasteSeperatorColor
  xBtnBg: AX.xBtn, // MenuXButtonColor
  xMark: AX.xMark, // ToolbarXMarkColor
  smsGreen: AX.smsGreen,
  keyboardBg: AX.keyboardBg,
  toolButtonBg: AX.toolBtn, // ToolbarIconButtonBgColor
  regularKey: AX.key,
  actionKey: AX.actionKey,
};

// The keyboard's own type is Noto Sans; `.system` text (the script subtitles,
// the host app's chrome, the keys) is SF.
const NOTO = "'Noto Sans', Inter, sans-serif";
const SF = "-apple-system, BlinkMacSystemFont, 'SF Pro Text', Inter, sans-serif";

const DESIGN_W = 402;
const SCREEN_H = 874;
const BEZEL = 12;
const OUTER_W = DESIGN_W + BEZEL * 2;
const OUTER_H = SCREEN_H + BEZEL * 2;

/** ToolbarHelpers.viewHeight() on a 402x874pt phone: 874 x 0.505. */
const VIEW_H = 441;
/** ConfigurationsView.headerSection: the Paste view's 44pt top bar. */
const HEADER_H = 44;

const EN_MSG = 'Can you come pick me up at university?';
const AR_MSG = 'هل يمكنك أن تأتي لتقلّني من الجامعة؟';
/* The keyboard writes "{reword}\n\nCopy text:\n{copy}" into the field, so the
   label is part of the message the user sends -- drawn here as it ships. */
const COPY_LABEL = 'Copy text:';

export type OptionScreen = 'gender' | 'script' | 'copy' | 'reword';

export const OPTION_SCREENS: OptionScreen[] = ['gender', 'script', 'copy', 'reword'];

/**
 * Where the Options page is scrolled for each still. 0 is the top; 228 brings
 * the whole Reword Language card into view, with the Copy card under it.
 */
const SCROLL: Record<Exclude<OptionScreen, 'reword'>, number> = { gender: 0, script: 0, copy: 228 };

// ── Shared phone chrome ──────────────────────────────────────────────────────

/** iOS switch, drawn at its 51x31pt size. */
function Toggle({ on }: { on: boolean }) {
  return (
    <span
      className="relative inline-block shrink-0 rounded-full"
      style={{ width: 51, height: 31, background: on ? C.smsGreen : AX.toggleOff }}
    >
      <span
        className="absolute top-[2px] rounded-full bg-white"
        style={{ width: 27, height: 27, left: on ? 22 : 2, boxShadow: '0 1px 3px rgba(0,0,0,0.25)' }}
      />
    </span>
  );
}

function StatusBar() {
  return (
    <div className="relative flex h-11 items-center justify-between px-7 pt-1" style={{ color: AX.ink }}>
      <span className="text-[15px] font-semibold">12:11</span>
      <div className="absolute left-1/2 top-2 h-7 w-[100px] -translate-x-1/2 rounded-full bg-black" />
      <div className="flex items-center gap-1.5">
        <div className="flex items-end gap-[2px]">
          {[6, 9, 12, 15].map((h, i) => (
            <span key={i} className="w-[3px] rounded-[1px]" style={{ height: h, background: AX.ink }} />
          ))}
        </div>
        <div className="ml-[1px] flex h-[13px] w-[24px] items-center rounded-[3px] border p-[1.5px]" style={{ borderColor: AX.batteryRing }}>
          <div className="h-full w-full rounded-[1px]" style={{ background: AX.ink }} />
        </div>
      </div>
    </div>
  );
}

function ChatHeader() {
  return (
    <div className="flex flex-col items-center border-b px-4 pb-3 pt-1" style={{ borderColor: AX.hairline }}>
      <div className="flex w-full items-center justify-between">
        <ChevronLeft className="h-7 w-7" style={{ color: C.send }} strokeWidth={2.4} />
        <div className="w-7" />
      </div>
      <div className="-mt-5 flex flex-col items-center gap-1">
        <div
          className="grid h-12 w-12 place-items-center rounded-full text-sm font-semibold text-white"
          style={{ background: 'linear-gradient(160deg,#8e9bd6,#6f7fc4)' }}
        >
          AR
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[15px] font-semibold" style={{ color: AX.ink }}>+1 (888) 555-1212</span>
          <ChevronRight className="h-4 w-4" style={{ color: AX.inkMuted }} strokeWidth={2.4} />
        </div>
      </div>
    </div>
  );
}

/** The sent message, as the field composes it when the copy is on. */
function SentWithCopy() {
  return (
    <div className="flex flex-col items-end">
      <div
        className="max-w-[86%] rounded-[20px] px-3.5 py-1.5 text-[15px] leading-tight text-white"
        style={{ background: C.smsGreen }}
      >
        <span dir="rtl" className="block text-right">
          {AR_MSG}
        </span>
        <span className="mt-2 block">{COPY_LABEL}</span>
        <span className="block">{EN_MSG}</span>
      </div>
      <span className="mr-1 mt-0.5 text-[11px]" style={{ color: AX.inkMuted }}>Delivered</span>
    </div>
  );
}

function InputBar({ text, rtl = false }: { text: string; rtl?: boolean }) {
  return (
    <div className="flex items-center gap-2 px-3 pb-2 pt-1">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full" style={{ background: AX.plusBg }}>
        <Plus className="h-5 w-5" style={{ color: AX.plusIcon }} strokeWidth={2.6} />
      </div>
      <div
        className="flex h-9 min-w-0 flex-1 items-center overflow-hidden rounded-full border pl-4 pr-2"
        style={{ borderColor: AX.fieldBorder }}
      >
        {text ? (
          <span dir={rtl ? 'rtl' : undefined} className="min-w-0 flex-1 truncate text-[15px]" style={{ color: AX.ink }}>
            {text}
          </span>
        ) : (
          <>
            <span className="text-[15px]" style={{ color: AX.fieldPlaceholder }}>
              iMessage
            </span>
            <div className="flex-1" />
            <Mic className="h-5 w-5 shrink-0" style={{ color: AX.fieldPlaceholder }} strokeWidth={2} />
          </>
        )}
      </div>
      {text && (
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full" style={{ backgroundColor: C.send }}>
          <ArrowUp className="h-5 w-5 text-white" strokeWidth={2.8} />
        </div>
      )}
    </div>
  );
}

/**
 * The system row under every keyboard and every open view: globe and dictation,
 * spaced as on the device (icon centres 40pt above the screen's bottom edge,
 * ~28pt of home-indicator space under them).
 */
function SystemStrip({ gapAbove }: { gapAbove: number }) {
  return (
    <div
      className="flex items-center justify-between px-5 pb-[28px]"
      style={{ backgroundColor: C.keyboardBg, paddingTop: gapAbove }}
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9.2" stroke={AX.glyph} strokeWidth="1.5" />
        <ellipse cx="12" cy="12" rx="4" ry="9.2" stroke={AX.glyph} strokeWidth="1.5" />
        <path d="M3 12h18M4.5 7.5h15M4.5 16.5h15" stroke={AX.glyph} strokeWidth="1.5" />
      </svg>
      <Mic className="h-6 w-6" style={{ color: AX.glyph }} strokeWidth={2} />
    </div>
  );
}

// ── Keyboard (the reword still) ──────────────────────────────────────────────

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
        color: AX.keyText,
        height: 42,
        flexGrow: grow,
        flexBasis: 0,
        boxShadow: `0 1px 0 ${AX.keyShadow}`,
        fontSize,
        fontFamily: SF,
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

/** A 57x50pt toolbar icon button (StandardToolbar's base metrics). */
function ToolButton({ src, dark, w, h }: { src: string; dark: string; w: number; h: number }) {
  return (
    <div
      className="grid shrink-0 place-items-center rounded-[12px]"
      style={{ width: 57, height: 50, backgroundColor: C.toolButtonBg }}
    >
      <AxIcon light={src} dark={dark} width={w} height={h} />
    </div>
  );
}

/**
 * StandardToolbar over the English keys. Study (leaf.fill at 24pt x 0.8),
 * Paste and Check are clustered left with 12pt gaps and 8pt edge margins; the
 * split Reword pill is pushed to the trailing edge.
 */
function Keyboard() {
  const row1 = ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'];
  const row2 = ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'];
  const row3 = ['z', 'x', 'c', 'v', 'b', 'n', 'm'];
  const nums = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];

  return (
    <div style={{ backgroundColor: C.keyboardBg }} className="px-[5px] pt-2">
      <div className="mb-2 flex items-center px-[3px]" style={{ height: 50, gap: 12 }}>
        <ToolButton src={studyUrl} dark={studyDarkUrl} w={24} h={21} />
        <ToolButton src={pasteUrl} dark={pasteDarkUrl} w={16} h={20} />
        <ToolButton src={checkUrl} dark={checkDarkUrl} w={20} h={20} />
        <div className="flex-1" />
        <div className="flex items-stretch overflow-hidden rounded-[12px]" style={{ height: 50, backgroundColor: C.item }}>
          <span
            className="flex items-center justify-center px-[14px] text-[16px] font-medium text-white"
            style={{ minWidth: 70, fontFamily: NOTO }}
          >
            Reword
          </span>
          <div className="self-center" style={{ width: 1, height: 20, backgroundColor: 'rgba(255,255,255,0.5)' }} />
          <span className="grid place-items-center" style={{ width: 40 }}>
            <ChevronDown className="h-4 w-4 text-white" strokeWidth={2.4} />
          </span>
        </div>
      </div>

      <div className="mb-[8px] flex gap-[5px]">
        {row1.map((l, i) => (
          <Key key={l} label={l} num={nums[i]} />
        ))}
      </div>
      <div className="mb-[8px] flex gap-[5px] px-[18px]">
        {row2.map((l) => (
          <Key key={l} label={l} />
        ))}
      </div>
      <div className="mb-[8px] flex gap-[5px]">
        <Key bg={C.actionKey} grow={1.5}>
          <AxIcon light={shiftUrl} dark={shiftDarkUrl} width={19} height={17} />
        </Key>
        {row3.map((l) => (
          <Key key={l} label={l} />
        ))}
        <Key bg={C.actionKey} grow={1.5}>
          <AxIcon light={backspaceUrl} dark={backspaceDarkUrl} width={23} height={17} />
        </Key>
      </div>
      <div className="mb-3 flex gap-[5px]">
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
  );
}

// ── Options page (the three option stills) ───────────────────────────────────

/** 12pt uppercase section label over a control, 8pt above it. */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2 px-1 text-[12px] uppercase leading-[16px]" style={{ color: C.detail }}>
      {children}
    </div>
  );
}

/** A 16pt-radius card with the 1pt menu stroke. */
function Card({ children, height }: { children: React.ReactNode; height?: number }) {
  return (
    <div
      className="overflow-hidden rounded-[16px]"
      style={{ background: C.cardBg, border: `1px solid ${C.cardStroke}`, height }}
    >
      {children}
    </div>
  );
}

function CardDivider() {
  return <div className="mx-4" style={{ height: 1, background: C.cardStroke }} />;
}

/** A 56pt card row: label left, value and chevron right. */
function ValueRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4" style={{ height: 56 }}>
      <span className="text-[16px]" style={{ color: C.label }}>
        {label}
      </span>
      <span className="flex items-center gap-2 text-[16px]" style={{ color: C.detail }}>
        {value}
        <ChevronRight className="h-[15px] w-[15px]" strokeWidth={2} />
      </span>
    </div>
  );
}

/** An 84pt grid card: title at the top, value and chevron at the bottom. */
function GridCard({ title, value, icon }: { title: string; value?: string; icon?: React.ReactNode }) {
  return (
    <Card height={84}>
      <div className="flex h-full flex-col justify-between pb-4 pt-3">
        <div className="flex items-start justify-between px-4">
          <span className="text-[16px]" style={{ color: C.label }}>
            {title}
          </span>
          {icon}
        </div>
        <div className="flex items-center justify-between px-4">
          <span className="text-[16px]" style={{ color: C.detail }}>
            {value}
          </span>
          <ChevronRight className="h-[15px] w-[15px]" style={{ color: C.detail }} strokeWidth={2} />
        </div>
      </div>
    </Card>
  );
}

/** "Who are you texting?" — Male selected, accent ring on the selected tile. */
function RecipientGender() {
  return (
    <div>
      <SectionLabel>Who are you texting?</SectionLabel>
      <div className="flex gap-2">
        {[
          { name: 'Male', on: true },
          { name: 'Female', on: false },
        ].map((g) => (
          <div
            key={g.name}
            className="flex flex-1 items-center justify-center rounded-[10px] text-[16px] font-medium"
            style={{
              height: 46,
              background: g.on ? C.selectedBg : C.cardBg,
              boxShadow: g.on ? `inset 0 0 0 2.5px ${C.accent}` : undefined,
              color: g.on ? C.accent : C.label,
            }}
          >
            {g.name}
          </div>
        ))}
      </div>
    </div>
  );
}

function GroupChat() {
  return (
    <div className="flex items-center justify-between rounded-[10px] px-3" style={{ height: 46, background: C.cardBg }}>
      <span className="text-[16px]" style={{ color: C.label }}>
        Group Chat
      </span>
      <Toggle on={false} />
    </div>
  );
}

/**
 * Reword Script for Arabic. With the menu open, the menu lists only the
 * script NOT selected — RewordOptionsView filters the current one out — and
 * sits right-aligned under the row, sized to its content, over the card below.
 */
function RewordScript({ menuOpen }: { menuOpen: boolean }) {
  return (
    <div className="relative z-10">
      <SectionLabel>Reword Script</SectionLabel>
      <div className="flex items-center rounded-[13px] px-3" style={{ height: 48, background: C.cardBg }}>
        <span className="text-[16px] font-medium" style={{ color: C.label }} dir="rtl">
          الأبجدية العربية
        </span>
        <span className="flex-1" />
        <span className="mr-2 text-[15px]" style={{ color: C.detail, fontFamily: SF }}>
          Al-Abjadiyah Al-ʿArabīyah
        </span>
        <ChevronsUpDown className="h-[14px] w-[14px]" style={{ color: C.detail }} strokeWidth={2.2} />
      </div>

      {menuOpen && (
        <div
          className="absolute right-0 flex items-center gap-4 rounded-[12px] p-3"
          style={{ top: '100%', marginTop: 4, background: C.cardBg, boxShadow: '0 4px 24px rgba(0,0,0,0.2)' }}
        >
          <span className="text-[16px] font-medium" style={{ color: C.label }}>
            Romanized
          </span>
          <span className="text-[15px]" style={{ color: C.detail, fontFamily: SF }}>
            ABC
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * The Reword language card. Recents lead the chip row (Arabic, selected: a
 * 25pt-radius pill with the accent ring), then a divider, then the default
 * shortcuts minus any already in recents. The row scrolls sideways and is
 * clipped by the card.
 */
function RewordLanguageCard() {
  const defaults = ['English', 'Spanish', 'Chinese', 'French', 'German', 'Japanese', 'Italian'];
  return (
    <Card>
      <div className="py-4">
        <div className="px-4 text-[18px] font-medium leading-[25px]" style={{ color: C.label }}>
          Reword Language
        </div>
        <div className="mt-3 flex items-center gap-2 overflow-hidden whitespace-nowrap pl-4">
          <span
            className="flex shrink-0 items-center px-3 text-[16px]"
            style={{ height: 46, borderRadius: 25, background: C.selectedBg, color: C.accent, boxShadow: `inset 0 0 0 2px ${C.accent}` }}
          >
            Arabic
          </span>
          <span className="mx-1 shrink-0 rounded-full" style={{ width: 2, height: 32, background: C.chipDivider }} />
          {defaults.map((name) => (
            <span
              key={name}
              className="flex shrink-0 items-center rounded-[12px] px-3 text-[16px]"
              style={{ height: 46, background: C.chipBg, color: C.label, boxShadow: `inset 0 0 0 1px ${C.cardStroke}` }}
            >
              {name}
            </span>
          ))}
        </div>
      </div>
      <CardDivider />
      <ValueRow label="More Languages" value="Arabic" />
    </Card>
  );
}

function TranslationCopyCard() {
  return (
    <Card>
      <div className="flex items-center justify-between pl-4 pr-3" style={{ height: 56 }}>
        <span className="text-[16px]" style={{ color: C.label }}>
          Reword Translation Copy
        </span>
        <Toggle on />
      </div>
      <CardDivider />
      <ValueRow label="View Copy In..." value="English" />
    </Card>
  );
}

function OptionsPage({ scroll, scriptMenuOpen }: { scroll: number; scriptMenuOpen: boolean }) {
  return (
    <div style={{ height: VIEW_H, background: C.pageBg, fontFamily: NOTO }}>
      <div className="relative flex items-center justify-center px-1" style={{ height: HEADER_H }}>
        <span className="pl-[38px] text-[16px] font-semibold" style={{ color: C.label }}>
          Options
        </span>
        <span
          className="absolute right-1 grid h-[38px] w-[38px] place-items-center rounded-[16px]"
          style={{ background: C.xBtnBg }}
        >
          <X className="h-[18px] w-[18px]" style={{ color: C.xMark }} strokeWidth={2.6} />
        </span>
      </div>

      {/* The scroll view, clipped at the keyboard's height. */}
      <div className="relative overflow-hidden" style={{ height: VIEW_H - HEADER_H }}>
        <div className="px-3" style={{ transform: `translateY(${-scroll}px)` }}>
          {/* RewordOptionsView, embedded: 16pt above, 16pt between sections. */}
          <div className="relative z-10 flex flex-col gap-4 pt-4">
            <RecipientGender />
            <GroupChat />
            <RewordScript menuOpen={scriptMenuOpen} />
          </div>
          <div className="flex flex-col gap-4 pb-6 pt-4">
            <RewordLanguageCard />
            <TranslationCopyCard />
            <GridCard
              title="Autocorrect Languages"
              value="2 Keyboards"
              icon={<AxIcon light={localesUrl} dark={localesDarkUrl} width={14} height={17} />}
            />
            <div className="flex gap-4">
              <div className="flex-1">
                <GridCard title="Your Gender" value="Male" />
              </div>
              <div className="flex-1">
                <GridCard title="Typing Settings" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RewordOptionScreen({
  screen,
  scale = 0.62,
}: {
  screen: OptionScreen;
  scale?: number;
}) {
  const sent = screen === 'copy';
  const fieldText = screen === 'reword' ? AR_MSG : sent ? '' : EN_MSG;

  return (
    <div style={{ width: OUTER_W * scale, height: OUTER_H * scale }}>
      <div
        className="relative bg-black"
        style={{
          width: OUTER_W,
          height: OUTER_H,
          padding: BEZEL,
          borderRadius: 56,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          boxShadow: `0 0 0 1px ${AX.bezelRing}, 0 24px 48px -20px rgba(20,10,40,0.45)`,
        }}
      >
        <div
          className="relative flex flex-col overflow-hidden"
          style={{ width: DESIGN_W, height: SCREEN_H, borderRadius: 44, fontFamily: SF, background: AX.screen }}
        >
          <StatusBar />
          <ChatHeader />

          {/* Conversation */}
          <div className="flex flex-1 flex-col justify-end gap-1.5 overflow-hidden px-3 pb-2">
            {sent && <SentWithCopy />}
          </div>

          <InputBar text={fieldText} rtl={screen === 'reword'} />

          {/* An open view replaces the toolbar and the keys together, so the
              option stills draw no toolbar above the page. */}
          {screen === 'reword' ? (
            <Keyboard />
          ) : (
            <OptionsPage scroll={SCROLL[screen]} scriptMenuOpen={screen === 'script'} />
          )}
          {/* As measured on device captures: 29pt from the last key row to the
              icons (12pt mb-3 + 17pt), 22pt from the bottom of an open view. */}
          <SystemStrip gapAbove={screen === 'reword' ? 17 : 22} />
        </div>
      </div>
    </div>
  );
}
