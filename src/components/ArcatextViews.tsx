import type { ReactNode, RefObject } from 'react';
import { ChevronDown, ChevronRight, MoreHorizontal, Settings, X } from 'lucide-react';
import { AX } from '@/lib/arcatextTheme';

/**
 * The keyboard's full-height views, drawn from the Swift source on Arcatext's
 * main branch for the keyboard demo (ArcatextKeyboard):
 *
 *   CheckPanel  — Keyboard/Features/Check/Views/CheckView.swift
 *   PastePanel  — Keyboard/Features/Paste/Views/ (PasteView, PasteItemView)
 *   StudyPanel  — Keyboard/Features/StudyGuide/Views/ (StudyGuideView, the
 *                 filter bar, StudyItemRow), as the keyboard ships it: no tab
 *                 bar, no insight cards
 *
 * Each is state-driven, so the demo's timeline only flips props. Every view is
 * ToolbarHelpers.viewHeight() tall (441pt on a 402x874pt phone) on PasteBgColor
 * and replaces the toolbar and keys together.
 */

export const VIEW_H = 441;

const NOTO = "'Noto Sans', Inter, sans-serif";
const SF = "-apple-system, BlinkMacSystemFont, 'SF Pro Text', Inter, sans-serif";

// ── Shared pieces ────────────────────────────────────────────────────────────

/** UIActivityIndicatorView, approximately. */
export function Spinner({ size = 20, color = AX.detail, track }: { size?: number; color?: string; track?: string }) {
  return (
    <span
      className="block animate-spin rounded-full border-2"
      style={{ width: size, height: size, borderColor: track ?? 'transparent', borderTopColor: color, borderRightColor: color }}
    />
  );
}

/** LoadingBarComponent: a 22pt shimmer bar, radius 4. */
function LoadingBar() {
  return <div className="ax-shimmer h-[22px] w-full rounded-[4px]" />;
}

/** The 38pt × close button the views share. */
function CloseButton({ radius, onClose }: { radius: number; onClose?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClose}
      aria-label="Close"
      className="grid h-[38px] w-[38px] shrink-0 place-items-center"
      style={{ background: AX.xBtn, borderRadius: radius }}
    >
      <X className="h-[18px] w-[18px]" style={{ color: AX.xMark }} strokeWidth={2.6} />
    </button>
  );
}

/** Check's section label: Regular 12, CheckPlaceholderColor, uppercase. */
function CheckLabel({ children }: { children: ReactNode }) {
  return (
    <div className="px-3 text-[12px] uppercase leading-4" style={{ color: AX.placeholder }}>
      {children}
    </div>
  );
}

function Radio({ on }: { on: boolean }) {
  return (
    <span
      className="mt-[1px] grid h-5 w-5 shrink-0 place-items-center rounded-full"
      style={{ border: `${on ? 2 : 1.5}px solid ${on ? AX.accent : AX.placeholder}` }}
    >
      {on && <span className="h-3 w-3 rounded-full" style={{ background: AX.accent }} />}
    </span>
  );
}

/** CheckCardSelectionButtonStyle: a radio card, accent ring when selected. */
function SelectRow({ text, on }: { text: string; on: boolean }) {
  return (
    <div
      className="flex items-start gap-2 rounded-[12px] p-3"
      style={{ background: AX.cardBg, boxShadow: `inset 0 0 0 ${on ? 2 : 1}px ${on ? AX.accent : AX.cardStroke}` }}
    >
      <p className="flex-1 text-[16px] leading-[26px]" style={{ color: AX.label }}>
        {text}
      </p>
      <Radio on={on} />
    </div>
  );
}

function ExperimentalTag() {
  return (
    <span className="rounded-[8px] px-1.5 py-1 text-[14px] font-medium leading-none" style={{ background: AX.experimental, color: '#000' }}>
      Experimental
    </span>
  );
}

// ── Check ────────────────────────────────────────────────────────────────────

export type CheckState = {
  /** The "Loading..." screen the view opens on. */
  opening: boolean;
  reverse: 'loading' | 'done';
  synonyms: 'idle' | 'loading' | 'done';
  homographs: 'idle' | 'loading' | 'done';
};

export type CheckData = {
  reverse: string;
  reword: string;
  original: string;
  synonyms: string[];
  /** The original's word, and its meanings (the reword's word + an English gloss). */
  homograph: { word: string; meanings: { title: string; gloss: string }[] };
};

/** The detection card's "before" state: a description and a pale button. */
function DetectionButton({ description, label }: { description: string; label: string }) {
  return (
    <div className="flex flex-col gap-3 px-3">
      <p className="text-[16px] leading-[26px]" style={{ color: AX.placeholder }}>
        {description}
      </p>
      <div
        className="flex h-[38px] items-center justify-center rounded-[12px] text-[16px] font-medium"
        style={{ background: AX.selectedBg, color: AX.checkText }}
      >
        {label}
      </div>
    </div>
  );
}

export function CheckPanel({
  state,
  data,
  scrollRef,
  synRef,
  detectRef,
  onClose,
}: {
  state: CheckState;
  data: CheckData;
  scrollRef?: RefObject<HTMLDivElement | null>;
  synRef?: RefObject<HTMLDivElement | null>;
  detectRef?: RefObject<HTMLDivElement | null>;
  onClose?: () => void;
}) {
  return (
    <div className="flex flex-col" style={{ height: VIEW_H, background: AX.pageBg, fontFamily: NOTO }}>
      {/* Header: 4 + 38 + 16. */}
      <div className="flex items-start px-1 pb-4 pt-1">
        <span className="flex h-[38px] flex-1 items-center justify-center pl-[38px] text-[16px] font-semibold" style={{ color: AX.label }}>
          Check
        </span>
        <CloseButton radius={12} onClose={onClose} />
      </div>

      {state.opening ? (
        <div className="flex flex-1 flex-col items-center justify-center pb-10">
          <Spinner size={26} />
          <span className="mt-3 text-[16px]" style={{ color: AX.placeholder }}>
            Loading...
          </span>
        </div>
      ) : (
        <div ref={scrollRef} className="relative flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex flex-col gap-5 pb-5 pt-3">
            {/* Card A: intent check, the reword, the original. */}
            <div className="mx-3 flex flex-col gap-4 rounded-[12px] py-3" style={{ background: AX.cardBg }}>
              <div className="flex flex-col gap-2.5">
                <CheckLabel>Reword intent check</CheckLabel>
                <div className="mx-3 rounded-[12px]" style={{ boxShadow: `inset 0 0 0 1px ${AX.cardStroke}` }}>
                  <div className="min-h-[37px] px-3 pb-1 pt-4">
                    {state.reverse === 'loading' ? (
                      <LoadingBar />
                    ) : (
                      <p className="text-[16px] leading-[26px]" style={{ color: AX.label }}>
                        {data.reverse}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center justify-between px-3 py-2">
                    <span className="-ml-2 flex items-center gap-1 p-2 text-[16px] font-medium" style={{ color: AX.accent }}>
                      English <ChevronRight className="h-3 w-3" strokeWidth={2.6} />
                    </span>
                    {state.reverse === 'done' && (
                      <span className="text-[16px] font-medium" style={{ color: AX.accent }}>
                        Fix Words
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2.5">
                <CheckLabel>Reword</CheckLabel>
                <div className="px-3">
                  <SelectRow text={data.reword} on />
                </div>
              </div>
              <div className="flex flex-col gap-2.5">
                <CheckLabel>Original message</CheckLabel>
                <div className="px-3">
                  <SelectRow text={data.original} on={false} />
                </div>
              </div>
            </div>

            {/* Card B: synonyms. */}
            <div ref={synRef} className="mx-3 flex flex-col gap-2.5 rounded-[12px] py-3" style={{ background: AX.cardBg }}>
              <CheckLabel>Synonyms</CheckLabel>
              <div className="flex flex-col gap-3 px-3">
                {state.synonyms === 'done' ? (
                  data.synonyms.map((s) => <SelectRow key={s} text={s} on={false} />)
                ) : (
                  <div
                    className="flex h-[38px] items-center justify-center rounded-[12px] text-[16px] font-medium text-white"
                    style={{ background: AX.primary }}
                  >
                    {state.synonyms === 'loading' ? <Spinner size={16} color="#fff" track="rgba(255,255,255,0.35)" /> : 'Show synonyms'}
                  </div>
                )}
              </div>
            </div>

            {/* Section C: detected in your message. */}
            <div ref={detectRef} className="flex flex-col gap-2.5">
              <div className="flex items-center gap-2 px-6">
                <span className="flex-1 text-[12px] uppercase leading-4" style={{ color: AX.placeholder }}>
                  Detected in your message
                </span>
                <ExperimentalTag />
              </div>
              <div className="mx-3 flex flex-col gap-4 rounded-[12px] py-3" style={{ background: AX.cardBg }}>
                {state.homographs === 'idle' && (
                  <DetectionButton description="Words with the same spelling, multiple meanings." label="Check homographs" />
                )}
                {state.homographs === 'loading' && (
                  <div className="min-h-[37px] px-3">
                    <LoadingBar />
                  </div>
                )}
                {state.homographs === 'done' && (
                  <div className="flex flex-col gap-3">
                    {/* Word tabs: the original's words, 2pt bar under the selected one. */}
                    <div className="flex h-10 px-3">
                      <span className="flex flex-col justify-center px-3 pt-1.5 text-[16px] font-medium" style={{ color: AX.accent }}>
                        {data.homograph.word}
                        <span className="mt-1.5 h-[2px] w-full" style={{ background: AX.accent }} />
                      </span>
                    </div>
                    {/* Meaning cards, 168pt wide; the meaning in use leads. */}
                    <div className="flex gap-2 overflow-hidden px-3 py-0.5">
                      {data.homograph.meanings.map((m, i) => {
                        const on = i === 0;
                        return (
                          <div
                            key={m.title}
                            className="flex w-[168px] shrink-0 flex-col gap-1 rounded-[10px] p-3"
                            style={{
                              background: on ? AX.selectedBg : AX.cardBg,
                              boxShadow: `inset 0 0 0 ${on ? 2 : 1}px ${on ? AX.accent : AX.cardStroke}`,
                              color: on ? AX.accent : AX.label,
                            }}
                          >
                            <span className="text-[16px] font-semibold">{m.title}</span>
                            <span className="text-[16px] font-medium leading-[24px]">{m.gloss}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                <DetectionButton description="Words that change depending on gender." label="Check gendered words" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Paste ────────────────────────────────────────────────────────────────────

export type PasteStage = 'empty' | 'pasting' | 'loading' | 'done';

/** SF trash.fill, approximately. */
function TrashFill({ color }: { color: string }) {
  return (
    <svg width="17" height="19" viewBox="0 0 17 19" fill={color} aria-hidden>
      <path d="M6 0h5a1 1 0 0 1 1 1v1h4a1 1 0 1 1 0 2H1a1 1 0 0 1 0-2h4V1a1 1 0 0 1 1-1Z" />
      <path d="M2 5.5h13l-.9 11.6A2 2 0 0 1 12.1 19H4.9a2 2 0 0 1-2-1.9L2 5.5Zm4 2.2a.75.75 0 0 0-.75.8l.4 7a.75.75 0 0 0 1.5-.1l-.4-7a.75.75 0 0 0-.75-.7Zm5 0a.75.75 0 0 0-.75.7l-.4 7a.75.75 0 0 0 1.5.1l.4-7a.75.75 0 0 0-.75-.8Z" />
    </svg>
  );
}

export function PastePanel({
  stage,
  original,
  translation,
  pastePressed,
  onClose,
}: {
  stage: PasteStage;
  original: string;
  translation: string;
  pastePressed?: boolean;
  onClose?: () => void;
}) {
  const hasItem = stage === 'loading' || stage === 'done';
  return (
    <div className="relative flex flex-col" style={{ height: VIEW_H, background: AX.pageBg, fontFamily: NOTO }}>
      {/* The content area; the top bar floats over it (88 = 44 + 38 + 6). */}
      <div className="relative flex-1 overflow-hidden">
        {hasItem ? (
          <div className="pt-[88px]">
            <div className="flex items-start py-2">
              <div className="min-w-0 flex-1 px-3">
                {stage === 'loading' ? (
                  <div className="flex min-h-[37px] items-center">
                    <LoadingBar />
                  </div>
                ) : (
                  <>
                    <p className="flex min-h-[37px] items-center text-[16px]" style={{ color: AX.label }}>
                      {translation}
                    </p>
                    {/* Expanded: the original under a 2pt ToolbarIconColor bar. */}
                    <div className="flex gap-2 pb-2 pt-3 animate-in fade-in-0 slide-in-from-top-1 duration-200">
                      <span className="w-[2px] shrink-0 rounded-full" style={{ background: AX.accent }} />
                      <p className="py-0.5 text-[16px]" style={{ color: AX.label }}>
                        {original}
                      </p>
                    </div>
                  </>
                )}
              </div>
              {stage === 'done' && (
                <span className="mr-[3px] grid h-[37px] w-[37px] shrink-0 place-items-center">
                  <ChevronDown className="h-4 w-4 rotate-180" style={{ color: AX.xMark }} strokeWidth={2.4} />
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center px-3 pt-[72px]">
            <p className="text-center text-[17px]" style={{ color: '#8F8F94', fontFamily: SF }}>
              Paste to translate messages
            </p>
          </div>
        )}

        <div className="absolute inset-x-0 top-0" style={{ background: AX.pageBg }}>
          <div className="flex h-11 items-center px-1">
            <span className="grid h-[38px] w-[38px] place-items-center">
              <Settings className="h-[19px] w-[19px]" style={{ color: AX.accent }} strokeWidth={2.4} />
            </span>
            <span className="flex-1 text-center text-[16px] font-semibold" style={{ color: AX.label }}>
              Translate Received Messages
            </span>
            <CloseButton radius={16} onClose={onClose} />
          </div>
          {/* The native segmented control: Original | Sentences. */}
          <div className="px-1 pb-1.5">
            <div className="flex h-[38px] gap-0.5 rounded-[8px] p-0.5" style={{ background: AX.pickerBg, fontFamily: SF }}>
              <span
                className="flex flex-1 items-center justify-center rounded-[7px] text-[13px] font-semibold"
                style={{ background: AX.pickerSelected, color: AX.label, boxShadow: '0 1px 3px rgba(0,0,0,0.12)' }}
              >
                Original
              </span>
              <span className="flex flex-1 items-center justify-center text-[13px] font-medium" style={{ color: AX.label }}>
                Sentences
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar: 1pt separator + 50pt bar. */}
      <div style={{ height: 1, background: AX.separator }} />
      <div className="flex h-[50px] items-center gap-3 px-2 py-1.5">
        <span className="px-3 py-2 text-[16px] font-medium" style={{ color: AX.accent }}>
          English
        </span>
        <span className="flex-1" />
        <span className="px-5 py-2">
          <TrashFill color={AX.accent} />
        </span>
        <span
          className="relative rounded-[12px] px-5 py-2 text-[16px] font-medium text-white transition-[filter] duration-100"
          style={{ background: AX.item, filter: pastePressed ? 'brightness(0.78)' : 'none' }}
        >
          <span className={stage === 'pasting' ? 'opacity-0' : ''}>Paste</span>
          {stage === 'pasting' && (
            <span className="absolute inset-0 grid place-items-center">
              <Spinner size={16} color="#fff" track="rgba(255,255,255,0.35)" />
            </span>
          )}
        </span>
      </div>
    </div>
  );
}

// ── Study ────────────────────────────────────────────────────────────────────

export type StudyStage = 'spinner' | 'skeleton' | 'rows';

export type StudyRow = {
  entry: string;
  translations: string;
  sentence: string;
  tag: string;
  misses: number;
};

/** A filter chip: Medium 14, chevron, capsule, 46pt tall. */
function Chip({ children, round = true }: { children: ReactNode; round?: boolean }) {
  return (
    <span
      className={`flex h-[46px] shrink-0 items-center gap-1 px-3 text-[14px] font-medium ${round ? 'rounded-full' : 'rounded-[12px]'}`}
      style={{ background: AX.grouped, color: AX.label }}
    >
      {children}
    </span>
  );
}

function RowCard({ children }: { children: ReactNode }) {
  return (
    <div
      className="mx-4 mb-2.5 rounded-[12px]"
      style={{ background: AX.cardBg, boxShadow: `inset 0 0 0 1px ${AX.cardStroke}` }}
    >
      {children}
    </div>
  );
}

export function StudyPanel({
  stage,
  rows,
  total,
  scroll = 0,
  onClose,
}: {
  stage: StudyStage;
  rows: StudyRow[];
  total: number;
  /** How far the list is scrolled; the header pushes out by as much (up to 106). */
  scroll?: number;
  onClose?: () => void;
}) {
  const push = Math.min(scroll, 106);
  return (
    <div className="relative overflow-hidden" style={{ height: VIEW_H, background: AX.pageBg, fontFamily: NOTO }}>
      {stage === 'spinner' && (
        <div className="absolute inset-0 grid place-items-center pt-[106px]">
          <Spinner size={22} />
        </div>
      )}

      {stage !== 'spinner' && (
        <div
          className="pt-[106px] transition-transform duration-700 ease-in-out"
          style={{ transform: `translateY(${-scroll}px)` }}
        >
          {stage === 'skeleton'
            ? Array.from({ length: 6 }, (_, i) => (
                <div
                  key={i}
                  className="mx-4 mb-2.5 h-[86px] animate-pulse rounded-[12px]"
                  style={{ background: AX.detail, opacity: 0.18 }}
                />
              ))
            : rows.map((r, i) => (
                <div key={r.entry} className="animate-in fade-in-0 duration-300" style={{ animationDelay: `${i * 40}ms`, animationFillMode: 'both' }}>
                  <RowCard>
                    <div className="flex items-start gap-3 px-3.5 py-3">
                      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                        <span className="truncate text-[16px] font-semibold" style={{ color: AX.label }}>
                          {r.entry}
                        </span>
                        <span className="text-[14px] font-medium" style={{ color: AX.label }}>
                          {r.translations}
                        </span>
                        <span className="text-[14px]" style={{ color: AX.detail }}>
                          {r.sentence}
                        </span>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        <ChevronRight className="h-[15px] w-[15px]" style={{ color: AX.detail }} strokeWidth={2} />
                        <span
                          className="rounded-[8px] px-2 py-[3px] text-[14px] font-medium leading-tight"
                          style={{ background: AX.pageBg, color: AX.label, boxShadow: `inset 0 0 0 1px ${AX.cardStroke}` }}
                        >
                          {r.tag}
                        </span>
                        <span
                          className="rounded-full px-2.5 py-[3px] text-[13px] font-semibold leading-tight tabular-nums"
                          style={{ background: AX.warningBg, color: AX.label, boxShadow: `inset 0 0 0 1.5px ${AX.warningStroke}` }}
                        >
                          ×{r.misses}
                        </span>
                      </div>
                    </div>
                  </RowCard>
                </div>
              ))}
        </div>
      )}

      {/* Header + filter bar (44 + 62), opaque, pushed out as the list scrolls. */}
      <div
        className="absolute inset-x-0 top-0 transition-transform duration-700 ease-in-out"
        style={{ background: AX.pageBg, transform: `translateY(${-push}px)` }}
      >
        <div className="relative flex h-11 items-center px-1">
          <span
            className="ml-3 grid h-[38px] w-[38px] place-items-center rounded-[16px]"
            style={{ background: AX.xBtn }}
          >
            <MoreHorizontal className="h-[18px] w-[18px]" style={{ color: AX.xMark }} strokeWidth={2.6} />
          </span>
          <span className="absolute left-1/2 -translate-x-1/2 text-[16px] font-semibold" style={{ color: AX.label }}>
            Study
          </span>
          <span className="flex-1" />
          <CloseButton radius={16} onClose={onClose} />
        </div>
        <div className="flex gap-2 overflow-hidden whitespace-nowrap px-4 py-2">
          <Chip round={false}>
            <span className="tabular-nums">{total} total</span>
          </Chip>
          {['Recently used', 'All types', 'All languages'].map((c) => (
            <Chip key={c}>
              {c}
              <ChevronDown className="h-3 w-3" strokeWidth={2.8} />
            </Chip>
          ))}
        </div>
      </div>
    </div>
  );
}
