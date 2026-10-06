import { ChevronLeft, ChevronRight, ChevronsUpDown, Plus, Mic, X } from 'lucide-react';

/**
 * RewordOptionScreen
 *
 * Still renders of three option screens, for the row that sits under the
 * solution section: the per-message controls the case study describes as
 * living "one level lower in the IA".
 *
 * Deliberately separate from ArcatextKeyboard: that component is a timeline
 * engine whose panels only exist in the states its scenes drive, and these are
 * fixed states it never reaches (Male selected, the Arabic alphabet menu open,
 * Send Copy on with a sent message behind it). The chrome is duplicated rather
 * than lifted out so the demo's behaviour can change without silently redrawing
 * these stills.
 *
 * Content is from the iOS source: RewordOptionsView.swift (recipient gender,
 * alphabet section + menu overlay), ConfigurationsView.swift (the Send Copy
 * card) and LanguageData.swift (Arabic's alphabet options).
 */

// Light-appearance colors from the asset catalog, as in ArcatextKeyboard.
const C = {
  send: '#0A7AFF',
  viewBg: '#F2F2F7',
  cardBg: '#FFFFFF',
  cardStroke: '#E5E5EA',
  label: '#000000',
  detail: '#8E8E93',
  primary: '#0040DD',
  selectedBg: '#D9EBFF',
  smsGreen: '#34C759',
  xBtnBg: '#D7D9DE',
};

const DESIGN_W = 402;
const SCREEN_H = 874;
const BEZEL = 12;
const OUTER_W = DESIGN_W + BEZEL * 2;
const OUTER_H = SCREEN_H + BEZEL * 2;

/** Panel height in the 874pt design space, matching the demo's view panels. */
const PANEL_H = 486;

const EN_MSG = 'Can you come pick me up at university?';
const AR_MSG = 'هل يمكنك أن تأتي لتقلّني من الجامعة؟';
/* The keyboard writes "{reword}\n\nCopy text:\n{copy}" into the field, so the
   label is part of the message the user sends -- drawn here as it ships. */
const COPY_LABEL = 'Copy text:';

export type OptionScreen = 'gender' | 'script' | 'copy';

export const OPTION_SCREENS: OptionScreen[] = ['gender', 'script', 'copy'];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-1 pb-2 pt-1 text-[12px] uppercase tracking-wide" style={{ color: C.detail }}>
      {children}
    </div>
  );
}

/** iOS switch, drawn at its 51x31pt size. */
function Toggle({ on }: { on: boolean }) {
  return (
    <span
      className="relative inline-block shrink-0 rounded-full transition-colors"
      style={{ width: 51, height: 31, background: on ? '#34C759' : '#E9E9EB' }}
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

function PanelHeader({ title }: { title: string }) {
  return (
    <div className="relative flex h-[56px] items-center justify-center px-3">
      <span className="text-[16px] font-semibold" style={{ color: C.label }}>
        {title}
      </span>
      <span
        className="absolute right-3 grid h-[38px] w-[38px] place-items-center rounded-[12px]"
        style={{ background: C.xBtnBg }}
      >
        <X className="h-[18px] w-[18px]" style={{ color: '#3a3a3c' }} strokeWidth={2.4} />
      </span>
    </div>
  );
}

/** "Who are you texting?" — recipient gender, Male selected. */
function GenderPanel() {
  return (
    <div className="flex-1 px-3">
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
              border: g.on ? `2.5px solid ${C.primary}` : '2.5px solid transparent',
              color: g.on ? C.primary : C.label,
            }}
          >
            {g.name}
          </div>
        ))}
      </div>
      <div
        className="mt-3 flex items-center justify-between rounded-[10px] px-3"
        style={{ height: 46, background: C.cardBg }}
      >
        <span className="text-[16px]" style={{ color: C.label }}>
          Group Chat
        </span>
        <Toggle on={false} />
      </div>
    </div>
  );
}

/** Reword language alphabet for Arabic, with the alphabet menu open. */
function ScriptPanel() {
  return (
    <div className="relative flex-1 px-3">
      <SectionLabel>Reword Language Alphabet (Arabic)</SectionLabel>
      <div
        className="flex items-center justify-between rounded-[13px] px-3"
        style={{ height: 48, background: C.cardBg }}
      >
        <span className="text-[16px] font-medium" style={{ color: C.label }} dir="rtl">
          الأبجدية العربية
        </span>
        <span className="flex items-center gap-2 text-[15px]" style={{ color: C.detail }}>
          Al-Abjadiyah Al-ʿArabīyah
          <ChevronsUpDown className="h-[13px] w-[13px]" style={{ color: C.detail }} strokeWidth={2.4} />
        </span>
      </div>

      {/* Menu overlay, anchored under the row it belongs to. */}
      <div
        className="absolute left-3 right-3 top-[108px] overflow-hidden rounded-[13px] shadow-xl"
        style={{ background: C.cardBg, border: `1px solid ${C.cardStroke}` }}
      >
        <div className="flex items-center justify-between px-4 py-3" style={{ background: C.selectedBg }}>
          <span className="text-[16px] font-medium" style={{ color: C.label }} dir="rtl">
            الأبجدية العربية
          </span>
          <span className="text-[15px]" style={{ color: C.detail }}>
            Al-Abjadiyah Al-ʿArabīyah
          </span>
        </div>
        <div className="mx-3 border-t" style={{ borderColor: C.cardStroke }} />
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-[16px] font-medium" style={{ color: C.label }}>
            Romanized
          </span>
          <span className="text-[15px]" style={{ color: C.detail }}>
            ABC
          </span>
        </div>
      </div>
    </div>
  );
}

/** The Send Copy card: translation copy on, with the copy language beneath. */
function CopyPanel() {
  return (
    <div className="flex-1 px-3 pt-1">
      <div
        className="overflow-hidden rounded-[16px]"
        style={{ background: C.cardBg, border: `1px solid ${C.cardStroke}` }}
      >
        <div className="flex items-center justify-between px-4" style={{ height: 56 }}>
          <span className="text-[16px]" style={{ color: C.label }}>
            Reword Includes Translation Copy
          </span>
          <Toggle on />
        </div>
        <div className="mx-4 border-t" style={{ borderColor: C.cardStroke }} />
        <div className="flex items-center justify-between px-4" style={{ height: 56 }}>
          <span className="text-[16px]" style={{ color: C.label }}>
            View Copy In...
          </span>
          <span className="flex items-center gap-2 text-[16px]" style={{ color: C.detail }}>
            English
            <ChevronRight className="h-[14px] w-[14px]" strokeWidth={2.4} />
          </span>
        </div>
      </div>
    </div>
  );
}

/** The sent message, as the field composes it when Send Copy is on. */
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

export default function RewordOptionScreen({
  screen,
  scale = 0.62,
}: {
  screen: OptionScreen;
  scale?: number;
}) {
  const sent = screen === 'copy';
  const fieldText = sent ? '' : EN_MSG;

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
          style={{ width: DESIGN_W, height: SCREEN_H, borderRadius: 44 }}
        >
          <StatusBar />
          <ChatHeader />

          {/* Conversation */}
          <div className="flex flex-1 flex-col justify-end gap-1.5 overflow-hidden px-3 pb-2">
            {sent && <SentWithCopy />}
          </div>

          {/* Input bar */}
          <div className="flex items-center gap-2 px-3 pb-2 pt-1">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#e6e8ec]">
              <Plus className="h-5 w-5 text-[#6b7280]" strokeWidth={2.6} />
            </div>
            <div className="flex h-9 flex-1 items-center overflow-hidden rounded-full border border-black/15 pl-4 pr-2">
              {fieldText ? (
                <span className="truncate text-[15px] text-black">{fieldText}</span>
              ) : (
                <span className="text-[15px]" style={{ color: '#9aa0a6' }}>
                  iMessage
                </span>
              )}
              <div className="flex-1" />
              {!fieldText && <Mic className="h-5 w-5 shrink-0" style={{ color: '#9aa0a6' }} strokeWidth={2} />}
            </div>
          </div>

          {/* Panel, in place of the toolbar and keys -- an open view replaces
              both, so no toolbar shows above it. */}
          <div className="relative flex flex-col" style={{ height: PANEL_H, background: C.viewBg }}>
            <PanelHeader title={screen === 'copy' ? 'Menu' : 'Reword Options'} />
            {screen === 'gender' && <GenderPanel />}
            {screen === 'script' && <ScriptPanel />}
            {screen === 'copy' && <CopyPanel />}
          </div>
        </div>
      </div>
    </div>
  );
}
