import { ArrowUp, ChevronDown, ChevronLeft, ChevronRight, ChevronsUpDown, Plus, Mic, X } from 'lucide-react';
import studyUrl from '@/assets/keyboard/study.svg';
import pasteUrl from '@/assets/keyboard/paste.svg';
import checkUrl from '@/assets/keyboard/check.svg';
import shiftUrl from '@/assets/keyboard/shift.svg';
import backspaceUrl from '@/assets/keyboard/backspace.svg';
import localesUrl from '@/assets/keyboard/locales.svg';

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
 * Sizes, labels and light-appearance colors are from that source, its
 * Localizable.xcstrings (English) and the asset catalog. Arabic's scripts are
 * from LanguageData.swift.
 */

// Light-appearance colors from the asset catalog.
const C = {
  send: '#0A7AFF',
  pageBg: '#F2F2F7', // PasteBgColor
  cardBg: '#FFFFFF', // MenuCardBgColor / CheckCardBgColor
  cardStroke: '#E6E6EB', // MenuCardStrokeColor
  label: '#000000', // MenuLabelColor
  detail: '#808080', // MenuDetailColor
  accent: '#0040DD', // ToolbarItemColor / AccentColor
  selectedBg: '#D9EBFF', // CheckSelectedBgColor
  chipDivider: '#D1D3D9', // PasteSeperatorColor
  xBtnBg: '#E6E6EB', // MenuXButtonColor
  smsGreen: '#34C759',
  keyboardBg: '#D0D3DA',
  toolButtonBg: '#FFFFFF', // ToolbarIconButtonBgColor
  regularKey: '#FFFFFF',
  actionKey: '#B1C6E0',
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
/** The home-indicator inset under the keyboard, filled with the view's color. */
const BOTTOM_INSET = 45;
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
      style={{ width: 51, height: 31, background: on ? C.smsGreen : '#E9E9EB' }}
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
    <div className="relative flex h-11 items-center justify-between px-7 pt-1 text-black">
      <span className="text-[15px] font-semibold">12:11</span>
      <div className="absolute left-1/2 top-2 h-7 w-[100px] -translate-x-1/2 rounded-full bg-black" />
      <div className="flex items-center gap-1.5">
        <div className="flex items-end gap-[2px]">
          {[6, 9, 12, 15].map((h, i) => (
            <span key={i} className="w-[3px] rounded-[1px] bg-black" style={{ height: h }} />
          ))}
        </div>
        <div className="ml-[1px] flex h-[13px] w-[24px] items-center rounded-[3px] border border-black/40 p-[1.5px]">
          <div className="h-full w-full rounded-[1px] bg-black" />
        </div>
      </div>
    </div>
  );
}

function ChatHeader() {
  return (
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
          AR
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[15px] font-semibold text-black">+1 (888) 555-1212</span>
          <ChevronRight className="h-4 w-4 text-black/50" strokeWidth={2.4} />
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
      <span className="mr-1 mt-0.5 text-[11px] text-black/45">Delivered</span>
    </div>
  );
}

function InputBar({ text, rtl = false }: { text: string; rtl?: boolean }) {
  return (
    <div className="flex items-center gap-2 px-3 pb-2 pt-1">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#e6e8ec]">
        <Plus className="h-5 w-5 text-[#6b7280]" strokeWidth={2.6} />
      </div>
      <div className="flex h-9 min-w-0 flex-1 items-center overflow-hidden rounded-full border border-black/15 pl-4 pr-2">
        {text ? (
          <span dir={rtl ? 'rtl' : undefined} className="min-w-0 flex-1 truncate text-[15px] text-black">
            {text}
          </span>
        ) : (
          <>
            <span className="text-[15px]" style={{ color: '#9aa0a6' }}>
              iMessage
            </span>
            <div className="flex-1" />
            <Mic className="h-5 w-5 shrink-0" style={{ color: '#9aa0a6' }} strokeWidth={2} />
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
        color: '#000',
        height: 42,
        flexGrow: grow,
        flexBasis: 0,
        boxShadow: '0 1px 0 rgba(0,0,0,0.3)',
        fontSize,
        fontFamily: SF,
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

/** A 57x50pt toolbar icon button (StandardToolbar's base metrics). */
function ToolButton({ src, w, h }: { src: string; w: number; h: number }) {
  return (
    <div
      className="grid shrink-0 place-items-center rounded-[12px]"
      style={{ width: 57, height: 50, backgroundColor: C.toolButtonBg }}
    >
      <img src={src} alt="" style={{ width: w, height: h }} />
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
    <div style={{ backgroundColor: C.keyboardBg, paddingBottom: BOTTOM_INSET }} className="px-[5px] pt-2">
      <div className="mb-2 flex items-center px-[3px]" style={{ height: 50, gap: 12 }}>
        <ToolButton src={studyUrl} w={19} h={19} />
        <ToolButton src={pasteUrl} w={16} h={20} />
        <ToolButton src={checkUrl} w={20} h={20} />
        <div className="flex-1" />
        <div className="flex items-stretch overflow-hidden rounded-[12px]" style={{ height: 50, backgroundColor: C.accent }}>
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
          <img src={shiftUrl} alt="" style={{ width: 19, height: 17 }} />
        </Key>
        {row3.map((l) => (
          <Key key={l} label={l} />
        ))}
        <Key bg={C.actionKey} grow={1.5}>
          <img src={backspaceUrl} alt="" style={{ width: 23, height: 17 }} />
        </Key>
      </div>
      <div className="flex gap-[5px]">
        <Key bg={C.actionKey} grow={1.6} fontSize={15}>
          123
        </Key>
        <Key bg={C.actionKey} grow={1.2}>
          <img src={localesUrl} alt="" style={{ width: 14, height: 17 }} />
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
              style={{ height: 46, background: C.cardBg, color: C.label, boxShadow: `inset 0 0 0 1px ${C.cardStroke}` }}
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
    <div style={{ height: VIEW_H + BOTTOM_INSET, background: C.pageBg, fontFamily: NOTO }}>
      <div className="relative flex items-center justify-center px-1" style={{ height: HEADER_H }}>
        <span className="pl-[38px] text-[16px] font-semibold" style={{ color: C.label }}>
          Options
        </span>
        <span
          className="absolute right-1 grid h-[38px] w-[38px] place-items-center rounded-[16px]"
          style={{ background: C.xBtnBg }}
        >
          <X className="h-[18px] w-[18px]" style={{ color: '#000' }} strokeWidth={2.6} />
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
              icon={<img src={localesUrl} alt="" style={{ width: 14, height: 17 }} />}
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
          boxShadow: '0 24px 48px -20px rgba(20,10,40,0.45)',
        }}
      >
        <div
          className="relative flex flex-col overflow-hidden bg-white"
          style={{ width: DESIGN_W, height: SCREEN_H, borderRadius: 44, fontFamily: SF }}
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
        </div>
      </div>
    </div>
  );
}
