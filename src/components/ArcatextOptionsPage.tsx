import { ChevronRight, ChevronsUpDown, X } from 'lucide-react';
import localesUrl from '@/assets/keyboard/locales.svg';
import localesDarkUrl from '@/assets/keyboard/locales-dark.svg';
import { AX, AxIcon } from '@/lib/arcatextTheme';

/**
 * ArcatextOptionsPage
 *
 * The page the Reword button's chevron opens: ConfigurationsView in
 * rewordOptions mode, titled "Options". Shared by the Reword stills and the
 * keyboard demo, so both draw the same page.
 *
 * Everything the page draws is drawn, in source order, for whichever language
 * the config describes:
 *
 *   RewordOptionsView (embedded), each section only when the language has it:
 *     Who are you texting? · Group Chat · Reword Script
 *   Reword Language card: shortcut chips, More Languages
 *   Reword Translation Copy card: toggle, View Copy In...
 *   Autocorrect Languages · Your Gender | Typing Settings
 *
 * Sizes, labels and colors are from that source, its Localizable.xcstrings
 * (English) and the asset catalog; scripts per language from LanguageData.swift.
 */

const NOTO = "'Noto Sans', Inter, sans-serif";
const SF = "-apple-system, BlinkMacSystemFont, 'SF Pro Text', Inter, sans-serif";

/** ToolbarHelpers.viewHeight() on a 402x874pt phone: 874 x 0.505. */
export const OPTIONS_VIEW_H = 441;
/** ConfigurationsView.headerSection: the Paste view's 44pt top bar. */
const HEADER_H = 44;

export type ScriptOption = { title: string; subtitle: string; rtl?: boolean };

export type OptionsConfig = {
  /** The Reword language, as its chip and More Languages show it. */
  language: string;
  /** "Who are you texting?" — present only for languages with recipient gender. */
  recipientGender?: 'Male' | 'Female';
  /** The Group Chat toggle — present only for languages that have it. */
  groupChat?: boolean;
  /** Reword Script: the selected script and every script the language offers. */
  script?: { selected: ScriptOption; all: ScriptOption[] };
  copy: { on: boolean; language: string };
  /** Autocorrect keyboards, for "N Keyboards". */
  keyboards: number;
  /** Your Gender card: the speaker gender, or null when the language has none. */
  speakerGender: string | null;
};

/** The default shortcut chips (ConfigurationsView.defaultShortcutCodes:
    en, es, zh-Hans, fr, de, ja, it; names drop any parenthetical). */
const DEFAULT_CHIPS = ['English', 'Spanish', 'Mandarin', 'French', 'German', 'Japanese', 'Italian'];

/**
 * Taps, for the interactive prototype. Every handler is optional: a page given
 * none (the stills and the demo) draws exactly as before and takes no taps.
 */
export type OptionsActions = {
  recipient?: (g: 'Male' | 'Female') => void;
  groupChat?: () => void;
  scriptMenu?: () => void;
  script?: (title: string) => void;
  language?: (name: string) => void;
  moreLanguages?: () => void;
  copy?: () => void;
  copyLanguage?: () => void;
  autocorrect?: () => void;
  speakerGender?: () => void;
  typingSettings?: () => void;
};

/** A tappable wrapper when there is a handler, a plain block when not. */
function Tap({ on, className, children }: { on?: () => void; className?: string; children: React.ReactNode }) {
  if (!on) return <div className={className}>{children}</div>;
  return (
    <button type="button" onClick={on} className={`block w-full text-left transition-[filter] active:brightness-90 ${className ?? ''}`}>
      {children}
    </button>
  );
}

/** iOS switch, drawn at its 51x31pt size. */
function Toggle({ on }: { on: boolean }) {
  return (
    <span
      className="relative inline-block shrink-0 rounded-full transition-colors duration-200"
      style={{ width: 51, height: 31, background: on ? AX.smsGreen : AX.toggleOff }}
    >
      <span
        className="absolute top-[2px] rounded-full bg-white transition-[left] duration-200"
        style={{ width: 27, height: 27, left: on ? 22 : 2, boxShadow: '0 1px 3px rgba(0,0,0,0.25)' }}
      />
    </span>
  );
}

/** 12pt uppercase section label over a control, 8pt above it. */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2 px-1 text-[12px] uppercase leading-[16px]" style={{ color: AX.detail }}>
      {children}
    </div>
  );
}

/** A 16pt-radius card with the 1pt menu stroke. */
function Card({ children, height }: { children: React.ReactNode; height?: number }) {
  return (
    <div
      className="overflow-hidden rounded-[16px]"
      style={{ background: AX.cardBg, border: `1px solid ${AX.cardStroke}`, height }}
    >
      {children}
    </div>
  );
}

function CardDivider() {
  return <div className="mx-4" style={{ height: 1, background: AX.cardStroke }} />;
}

/** A 56pt card row: label left, value and chevron right. */
function ValueRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4" style={{ height: 56 }}>
      <span className="text-[16px]" style={{ color: AX.label }}>
        {label}
      </span>
      <span className="flex items-center gap-2 text-[16px]" style={{ color: AX.detail }}>
        {value}
        <ChevronRight className="h-[15px] w-[15px]" strokeWidth={2} />
      </span>
    </div>
  );
}

/** An 84pt grid card: title at the top, value and chevron at the bottom. */
function GridCard({ title, value, icon, muted }: { title: string; value?: string; icon?: React.ReactNode; muted?: boolean }) {
  return (
    <Card height={84}>
      <div className="flex h-full flex-col justify-between pb-4 pt-3">
        <div className="flex items-start justify-between px-4">
          <span className="text-[16px]" style={{ color: AX.label }}>
            {title}
          </span>
          {icon}
        </div>
        <div className="flex items-center justify-between px-4">
          <span className="text-[16px]" style={{ color: AX.detail }}>
            {value}
          </span>
          <ChevronRight
            className="h-[15px] w-[15px]"
            style={{ color: AX.detail, opacity: muted ? 0.5 : 1 }}
            strokeWidth={2}
          />
        </div>
      </div>
    </Card>
  );
}

/** "Who are you texting?" — accent ring on the selected tile. */
function RecipientGender({ selected, onPick }: { selected: 'Male' | 'Female'; onPick?: (g: 'Male' | 'Female') => void }) {
  return (
    <div>
      <SectionLabel>Who are you texting?</SectionLabel>
      <div className="flex gap-2">
        {(['Male', 'Female'] as const).map((name) => {
          const on = name === selected;
          return (
            <div
              key={name}
              role={onPick ? 'button' : undefined}
              onClick={onPick ? () => onPick(name) : undefined}
              className={`flex flex-1 items-center justify-center rounded-[10px] text-[16px] font-medium ${onPick ? 'cursor-pointer' : ''}`}
              style={{
                height: 46,
                background: on ? AX.selectedBg : AX.cardBg,
                boxShadow: on ? `inset 0 0 0 2.5px ${AX.accent}` : undefined,
                color: on ? AX.accent : AX.label,
              }}
            >
              {name}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function GroupChat({ on, onToggle }: { on: boolean; onToggle?: () => void }) {
  return (
    <div
      role={onToggle ? 'switch' : undefined}
      aria-checked={onToggle ? on : undefined}
      onClick={onToggle}
      className={`flex items-center justify-between rounded-[10px] px-3 ${onToggle ? 'cursor-pointer' : ''}`}
      style={{ height: 46, background: AX.cardBg }}
    >
      <span className="text-[16px]" style={{ color: AX.label }}>
        Group Chat
      </span>
      <Toggle on={on} />
    </div>
  );
}

/**
 * Reword Script. With the menu open it lists only the scripts NOT selected —
 * RewordOptionsView filters the current one out — right-aligned under the row,
 * sized to its content, over the card below, rows split by a divider.
 */
function RewordScript({
  script,
  menuOpen,
  highlight,
  onOpen,
  onPick,
}: {
  script: NonNullable<OptionsConfig['script']>;
  menuOpen: boolean;
  highlight?: string;
  onOpen?: () => void;
  onPick?: (title: string) => void;
}) {
  const others = script.all.filter((o) => o.title !== script.selected.title);
  return (
    <div className="relative z-10">
      <SectionLabel>Reword Script</SectionLabel>
      <div
        role={onOpen ? 'button' : undefined}
        onClick={onOpen}
        className={`flex items-center rounded-[13px] px-3 ${onOpen ? 'cursor-pointer' : ''}`}
        style={{ height: 48, background: AX.cardBg }}
      >
        <span className="text-[16px] font-medium" style={{ color: AX.label }} dir={script.selected.rtl ? 'rtl' : undefined}>
          {script.selected.title}
        </span>
        <span className="flex-1" />
        <span className="mr-2 text-[15px]" style={{ color: AX.detail, fontFamily: SF }}>
          {script.selected.subtitle}
        </span>
        <ChevronsUpDown className="h-[14px] w-[14px]" style={{ color: AX.detail }} strokeWidth={2.2} />
      </div>

      {menuOpen && (
        <div
          className="absolute right-0 overflow-hidden rounded-[12px] animate-in fade-in-0 zoom-in-95 duration-150"
          style={{ top: '100%', marginTop: 4, background: AX.cardBg, boxShadow: '0 4px 24px rgba(0,0,0,0.2)' }}
        >
          {others.map((o, i) => (
            <div key={o.title}>
              {i > 0 && <div className="ml-4" style={{ height: 1, background: AX.cardStroke }} />}
              <div
                role={onPick ? 'button' : undefined}
                onClick={onPick ? () => onPick(o.title) : undefined}
                className={`flex items-center gap-4 p-3 transition-colors ${onPick ? 'cursor-pointer active:brightness-90' : ''}`}
                // The row being tapped takes PressedLabelColor, as
                // AlphabetMenuRowButtonStyle does while pressed.
                style={{ background: highlight === o.title ? AX.cardStroke : undefined }}
              >
                <span className="flex-1 text-[16px] font-medium" style={{ color: AX.label }}>
                  {o.title}
                </span>
                <span className="text-[15px]" style={{ color: AX.detail, fontFamily: SF }}>
                  {o.subtitle}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * The Reword language card. Recents lead the chip row (the current language,
 * selected: a 25pt-radius pill with the accent ring), then a divider, then the
 * default shortcuts minus any already in recents. The row scrolls sideways and
 * is clipped by the card.
 */
function RewordLanguageCard({
  language,
  recents = [],
  onPick,
  onMore,
}: {
  language: string;
  /** Recently used languages after the current one (the prototype's). */
  recents?: string[];
  onPick?: (name: string) => void;
  onMore?: () => void;
}) {
  const lead = [language, ...recents.filter((r) => r !== language)];
  const defaults = DEFAULT_CHIPS.filter((n) => !lead.includes(n));
  return (
    <Card>
      <div className="py-4">
        <div className="px-4 text-[18px] font-medium leading-[25px]" style={{ color: AX.label }}>
          Reword Language
        </div>
        <div
          className={`mt-3 flex items-center gap-2 whitespace-nowrap pl-4 ${
            onPick ? 'overflow-x-auto pr-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden' : 'overflow-hidden'
          }`}
        >
          {lead.map((name, i) => {
            const on = i === 0;
            return (
              <span
                key={name}
                role={onPick ? 'button' : undefined}
                onClick={onPick ? () => onPick(name) : undefined}
                className={`flex shrink-0 items-center px-3 text-[16px] transition-all duration-200 ${onPick ? 'cursor-pointer' : ''}`}
                style={
                  on
                    ? { height: 46, borderRadius: 25, background: AX.selectedBg, color: AX.accent, boxShadow: `inset 0 0 0 2px ${AX.accent}` }
                    : { height: 46, borderRadius: 12, background: AX.chipBg, color: AX.label, boxShadow: `inset 0 0 0 1px ${AX.cardStroke}` }
                }
              >
                {name}
              </span>
            );
          })}
          <span className="mx-1 shrink-0 rounded-full" style={{ width: 2, height: 32, background: AX.separator }} />
          {defaults.map((name) => (
            <span
              key={name}
              role={onPick ? 'button' : undefined}
              onClick={onPick ? () => onPick(name) : undefined}
              className={`flex shrink-0 items-center rounded-[12px] px-3 text-[16px] ${onPick ? 'cursor-pointer' : ''}`}
              style={{ height: 46, background: AX.chipBg, color: AX.label, boxShadow: `inset 0 0 0 1px ${AX.cardStroke}` }}
            >
              {name}
            </span>
          ))}
        </div>
      </div>
      <CardDivider />
      <Tap on={onMore}>
        <ValueRow label="More Languages" value={language} />
      </Tap>
    </Card>
  );
}

function TranslationCopyCard({
  on,
  language,
  onToggle,
  onLanguage,
}: {
  on: boolean;
  language: string;
  onToggle?: () => void;
  onLanguage?: () => void;
}) {
  return (
    <Card>
      <div
        role={onToggle ? 'switch' : undefined}
        aria-checked={onToggle ? on : undefined}
        onClick={onToggle}
        className={`flex items-center justify-between pl-4 pr-3 ${onToggle ? 'cursor-pointer' : ''}`}
        style={{ height: 56 }}
      >
        <span className="text-[16px]" style={{ color: AX.label }}>
          Reword Translation Copy
        </span>
        <Toggle on={on} />
      </div>
      <CardDivider />
      <Tap on={onLanguage}>
        <ValueRow label="View Copy In..." value={language} />
      </Tap>
    </Card>
  );
}

export default function ArcatextOptionsPage({
  config,
  scroll = 0,
  scriptMenuOpen = false,
  scriptHighlight,
  onClose,
  actions,
  recents,
}: {
  config: OptionsConfig;
  /** Taps (the prototype). With them the page scrolls natively. */
  actions?: OptionsActions;
  /** Recently used Reword languages, leading the chips after the current one. */
  recents?: string[];
  /** How far the page is scrolled, in points. */
  scroll?: number;
  scriptMenuOpen?: boolean;
  /** A script menu row shown pressed, mid-tap. */
  scriptHighlight?: string;
  /** Makes the × a real button (the demo); stills leave it inert. */
  onClose?: () => void;
}) {
  const hasEmbedded = Boolean(config.recipientGender || config.groupChat !== undefined || config.script);
  const xMark = <X className="h-[18px] w-[18px]" style={{ color: AX.xMark }} strokeWidth={2.6} />;
  const xClass = 'absolute right-1 grid h-[38px] w-[38px] place-items-center rounded-[16px]';

  return (
    <div style={{ height: OPTIONS_VIEW_H, background: AX.pageBg, fontFamily: NOTO }}>
      <div className="relative flex items-center justify-center px-1" style={{ height: HEADER_H }}>
        <span className="pl-[38px] text-[16px] font-semibold" style={{ color: AX.label }}>
          Options
        </span>
        {onClose ? (
          <button onClick={onClose} aria-label="Close" className={xClass} style={{ background: AX.xBtn }}>
            {xMark}
          </button>
        ) : (
          <span className={xClass} style={{ background: AX.xBtn }}>
            {xMark}
          </span>
        )}
      </div>

      {/* The scroll view, clipped at the keyboard's height. */}
      <div
        className={`relative ${actions ? 'overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden' : 'overflow-hidden'}`}
        style={{ height: OPTIONS_VIEW_H - HEADER_H }}
      >
        <div
          className="px-3 transition-transform duration-500 ease-in-out"
          style={{ transform: `translateY(${-scroll}px)` }}
        >
          {/* RewordOptionsView, embedded: 16pt above, 16pt between sections,
              and no top gap at all when the language has none of them. */}
          {hasEmbedded && (
            <div className="relative z-10 flex flex-col gap-4 pt-4">
              {config.recipientGender && <RecipientGender selected={config.recipientGender} onPick={actions?.recipient} />}
              {config.groupChat !== undefined && <GroupChat on={config.groupChat} onToggle={actions?.groupChat} />}
              {config.script && (
                <RewordScript
                  script={config.script}
                  menuOpen={scriptMenuOpen}
                  highlight={scriptHighlight}
                  onOpen={actions?.scriptMenu}
                  onPick={actions?.script}
                />
              )}
            </div>
          )}
          <div className="flex flex-col gap-4 pb-6 pt-4">
            <RewordLanguageCard
              language={config.language}
              recents={recents}
              onPick={actions?.language}
              onMore={actions?.moreLanguages}
            />
            <TranslationCopyCard
              on={config.copy.on}
              language={config.copy.language}
              onToggle={actions?.copy}
              onLanguage={actions?.copyLanguage}
            />
            <Tap on={actions?.autocorrect}>
              <GridCard
                title="Autocorrect Languages"
                value={`${config.keyboards} Keyboard${config.keyboards === 1 ? '' : 's'}`}
                icon={<AxIcon light={localesUrl} dark={localesDarkUrl} width={14} height={17} />}
              />
            </Tap>
            <div className="flex gap-4">
              <Tap on={config.speakerGender === null ? undefined : actions?.speakerGender} className="flex-1">
                <GridCard
                  title="Your Gender"
                  value={config.speakerGender ?? 'Not needed'}
                  muted={config.speakerGender === null}
                />
              </Tap>
              <Tap on={actions?.typingSettings} className="flex-1">
                <GridCard title="Typing Settings" />
              </Tap>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
