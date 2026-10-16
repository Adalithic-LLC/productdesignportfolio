import { useMemo, useState, type ReactNode } from 'react';
import {
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Circle,
  Download,
  Filter,
  MoreHorizontal,
  Settings,
  Trash2,
  X,
} from 'lucide-react';
import { AX } from '@/lib/arcatextTheme';
import { Spinner, VIEW_H } from '@/components/ArcatextViews';
import { ADDABLE_LOCALES, NATIVE, type Locale, type StudyEntry } from './seed';

/**
 * The prototype's interactive views that the demo phones never needed: Paste
 * with its tabs and delete mode, the Study Guide with its menu, filters,
 * delete mode and entry page, the language sheets, and the locale popover and
 * Autocorrect Languages page. Drawn from the Swift on main (PasteView,
 * StudyGuideView, RewordLanguageView, LocalePopoverView, KeyboardsView,
 * NewKeyboardsView); labels from Localizable.xcstrings.
 */

const NOTO = "'Noto Sans', Inter, sans-serif";
const SF = "-apple-system, BlinkMacSystemFont, 'SF Pro Text', Inter, sans-serif";

export type Toast = { text: string; undo?: () => void };

// ── Shared ───────────────────────────────────────────────────────────────────

function CornerButton({ onClick, label, children }: { onClick: () => void; label: string; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-[16px] active:brightness-90"
      style={{ background: AX.xBtn, color: AX.xMark }}
    >
      {children}
    </button>
  );
}

const xIcon = <X className="h-[17px] w-[17px]" strokeWidth={2.8} />;
const backIcon = <ChevronLeft className="h-[19px] w-[19px]" strokeWidth={2.8} />;

/** UndoToastView / ToastView: black, radius 12, at the bottom of the view. */
export function ToastBar({ toast, onDone }: { toast: Toast; onDone: () => void }) {
  return (
    <div
      className="absolute inset-x-4 bottom-[132px] z-40 flex items-center gap-2.5 rounded-[12px] px-4 py-3 shadow-lg animate-in fade-in-0 slide-in-from-bottom-2 duration-200"
      style={{ background: '#000', fontFamily: NOTO }}
    >
      <CheckCircle2 className="h-5 w-5 shrink-0 fill-white text-black" strokeWidth={2} />
      <span className="flex-1 text-[16px] font-semibold text-white">{toast.text}</span>
      {toast.undo && (
        <button
          onClick={() => {
            toast.undo!();
            onDone();
          }}
          className="rounded-[12px] px-3 py-2 text-[16px] font-medium"
          style={{ background: 'rgba(255,255,255,0.8)', color: '#0070F3' }}
        >
          Undo
        </button>
      )}
    </div>
  );
}

/** A small system-style menu, anchored by the caller. */
function MenuCard({ items }: { items: { label: string; on?: boolean; red?: boolean; icon?: ReactNode; act: () => void }[] }) {
  return (
    <div
      className="z-30 min-w-[210px] overflow-hidden rounded-[13px] shadow-2xl animate-in fade-in-0 zoom-in-95 duration-150"
      style={{ background: AX.cardBg, fontFamily: SF }}
    >
      {items.map((it, i) => (
        <button
          key={it.label}
          onClick={it.act}
          className="flex w-full items-center gap-2 px-3.5 py-[11px] text-left text-[16px] active:brightness-90"
          style={{ color: it.red ? '#FF3B30' : AX.label, borderTop: i ? `0.5px solid ${AX.cardStroke}` : undefined, background: AX.cardBg }}
        >
          <span className="w-4 shrink-0">{it.on && <Check className="h-4 w-4" strokeWidth={2.6} />}</span>
          <span className="flex-1">{it.label}</span>
          {it.icon}
        </button>
      ))}
    </div>
  );
}

// ── Paste ────────────────────────────────────────────────────────────────────

export type PasteItem = { id: number; original: string; translation: string | null; open: boolean };

function TrashFill({ color }: { color: string }) {
  return (
    <svg width="17" height="19" viewBox="0 0 17 19" fill={color} aria-hidden>
      <path d="M6 0h5a1 1 0 0 1 1 1v1h4a1 1 0 1 1 0 2H1a1 1 0 0 1 0-2h4V1a1 1 0 0 1 1-1Z" />
      <path d="M2 5.5h13l-.9 11.6A2 2 0 0 1 12.1 19H4.9a2 2 0 0 1-2-1.9L2 5.5Zm4 2.2a.75.75 0 0 0-.75.8l.4 7a.75.75 0 0 0 1.5-.1l-.4-7a.75.75 0 0 0-.75-.7Zm5 0a.75.75 0 0 0-.75.7l-.4 7a.75.75 0 0 0 1.5.1l.4-7a.75.75 0 0 0-.75-.8Z" />
    </svg>
  );
}

/** Splits a message into sentences for the Sentences tab. */
const sentences = (s: string) => s.match(/[^.!?。！？]+[.!?。！？]*/g)?.map((x) => x.trim()).filter(Boolean) ?? [s];

export function PasteView({
  items,
  pasting,
  language,
  onPaste,
  onToggle,
  onChange,
  onLanguage,
  onToast,
  onClose,
}: {
  items: PasteItem[];
  pasting: boolean;
  /** The language Paste translates into. */
  language: string;
  onPaste: () => void;
  onToggle: (id: number) => void;
  onChange: (items: PasteItem[]) => void;
  onLanguage: () => void;
  onToast: (t: Toast) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<'original' | 'sentences'>('original');
  const [deleting, setDeleting] = useState(false);
  const [picked, setPicked] = useState<number[]>([]);

  const startDelete = () => {
    if (!items.length) return;
    setDeleting(true);
    setPicked([items[0].id]); // the first item comes selected
  };
  const doDelete = () => {
    const before = items;
    const n = picked.length;
    onChange(items.filter((it) => !picked.includes(it.id)));
    setDeleting(false);
    setPicked([]);
    onToast({ text: `${n} message${n === 1 ? '' : 's'} deleted`, undo: () => onChange(before) });
  };
  const toggle = (id: number) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  return (
    <div className="relative flex shrink-0 flex-col" style={{ height: VIEW_H, background: AX.pageBg, fontFamily: NOTO }}>
      {/* Top bar: gear, title, ×; then the Original | Sentences control. */}
      <div style={{ background: AX.pageBg }}>
        <div className="flex h-11 items-center px-1">
          <span className="grid h-[38px] w-[38px] place-items-center">
            <Settings className="h-[19px] w-[19px]" style={{ color: AX.accent }} strokeWidth={2.4} />
          </span>
          <span className="flex-1 text-center text-[16px] font-semibold" style={{ color: AX.label }}>
            Translate Received Messages
          </span>
          <CornerButton onClick={onClose} label="Close">
            {xIcon}
          </CornerButton>
        </div>
        <div className="px-1 pb-1.5">
          <div className="flex h-[38px] gap-0.5 rounded-[6px] p-0.5" style={{ background: AX.pickerBg }}>
            {(['original', 'sentences'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="flex flex-1 items-center justify-center rounded-[5px] text-[14px] font-medium transition-colors"
                style={
                  tab === t
                    ? { background: AX.pickerSelected, color: AX.label, boxShadow: '0 1px 3px rgba(0,0,0,0.12)' }
                    : { color: AX.label }
                }
              >
                {t === 'original' ? 'Original' : 'Sentences'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* The list, newest first. */}
      <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.length === 0 ? (
          <div className="flex h-full items-center justify-center px-3">
            <p className="text-center text-[17px]" style={{ color: '#8F8F94', fontFamily: SF }}>
              Paste to translate messages
            </p>
          </div>
        ) : (
          items.map((it, i) => {
            const pairs =
              tab === 'sentences' && it.translation
                ? sentences(it.translation).map((t, k) => ({ t, o: sentences(it.original)[k] ?? '' }))
                : [];
            return (
              <div key={it.id}>
                {i > 0 && <div className="mx-2" style={{ height: 1, background: AX.separator }} />}
                <div
                  className="flex cursor-pointer items-start py-2"
                  style={{ background: AX.cardBg }}
                  onClick={() => (deleting ? toggle(it.id) : it.translation && onToggle(it.id))}
                >
                  <div className="min-w-0 flex-1 px-3">
                    {it.translation === null ? (
                      <div className="flex min-h-[37px] items-center">
                        <div className="ax-shimmer h-[22px] w-full rounded-[4px]" />
                      </div>
                    ) : tab === 'original' ? (
                      <>
                        <p className={`flex min-h-[37px] items-center text-[16px] ${it.open ? '' : 'line-clamp-2'}`} style={{ color: AX.label }}>
                          {it.translation}
                        </p>
                        {it.open && (
                          <div className="flex gap-2 pb-2 pt-3 animate-in fade-in-0 duration-200">
                            <span className="w-[2px] shrink-0 rounded-full" style={{ background: AX.accent }} />
                            <p className="py-0.5 text-[16px]" style={{ color: AX.label }}>
                              {it.original}
                            </p>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="flex flex-col gap-2.5 py-1.5">
                        {(it.open ? pairs : pairs.slice(0, 1)).map((p, k) => (
                          <div key={k}>
                            <p className="text-[16px] font-bold" style={{ color: AX.label }}>
                              {p.t}
                            </p>
                            <div className="mt-[3px] flex gap-2">
                              <span className="w-[2px] shrink-0 rounded-full" style={{ background: AX.accent }} />
                              <p className="text-[16px]" style={{ color: AX.label }}>
                                {p.o}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="mr-[3px] grid h-[37px] w-[37px] shrink-0 place-items-center">
                    {deleting ? (
                      picked.includes(it.id) ? (
                        <CheckCircle2 className="h-[22px] w-[22px] fill-[var(--ax-accent)] text-white" strokeWidth={2} />
                      ) : (
                        <Circle className="h-[22px] w-[22px]" style={{ color: AX.placeholder }} strokeWidth={1.8} />
                      )
                    ) : (
                      it.translation && (
                        <ChevronDown
                          className={`h-4 w-4 transition-transform duration-200 ${it.open ? 'rotate-180' : ''}`}
                          style={{ color: AX.xMark }}
                          strokeWidth={2.4}
                        />
                      )
                    )}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Bottom bar: language, trash, Paste -- or, deleting, Cancel / Select all / delete. */}
      <div style={{ height: 1, background: AX.separator }} />
      {deleting ? (
        <div className="flex h-[50px] items-center gap-2 px-2 py-1.5">
          <button onClick={() => setDeleting(false)} className="rounded-[12px] px-4 py-1.5 text-[16px] font-medium active:brightness-90" style={{ color: AX.accent }}>
            Cancel
          </button>
          <span className="flex-1" />
          <button
            onClick={() => setPicked(picked.length === items.length ? [] : items.map((x) => x.id))}
            className="rounded-[12px] px-3 py-2 text-[16px] font-medium"
            style={{ background: AX.actionKey, color: AX.accent }}
          >
            {picked.length === items.length ? 'De-select all' : 'Select all'}
          </button>
          <button
            onClick={doDelete}
            disabled={!picked.length}
            aria-label="Delete selected messages"
            className="flex items-center gap-1.5 rounded-[12px] px-4 py-2 text-[16px] font-medium text-white disabled:opacity-40"
            style={{ background: AX.item }}
          >
            <TrashFill color="#fff" /> {picked.length > 10 ? '10+' : picked.length}
          </button>
        </div>
      ) : (
        <div className="flex h-[50px] items-center gap-3 px-2 py-1.5">
          <button onClick={onLanguage} className="rounded-[12px] px-3 py-2 text-[16px] font-medium active:brightness-90" style={{ color: AX.accent }}>
            {language}
          </button>
          <span className="flex-1" />
          <button onClick={startDelete} aria-label="Delete messages" className="rounded-[12px] px-5 py-2 active:brightness-90">
            <TrashFill color={AX.accent} />
          </button>
          <button
            onClick={onPaste}
            className="relative rounded-[12px] px-5 py-2 text-[16px] font-medium text-white active:brightness-90"
            style={{ background: AX.item }}
          >
            <span className={pasting ? 'opacity-0' : ''}>Paste</span>
            {pasting && (
              <span className="absolute inset-0 grid place-items-center">
                <Spinner size={16} color="#fff" track="rgba(255,255,255,0.35)" />
              </span>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Study ────────────────────────────────────────────────────────────────────

const SORTS = ['Recently used', 'Frequently missed', 'Previous entries'] as const;

function Chip({ children, on, onClick }: { children: ReactNode; on?: boolean; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex h-[46px] shrink-0 items-center gap-1 rounded-full px-3 text-[14px] font-medium"
      style={
        on
          ? { background: AX.selectedBg, color: AX.accent, boxShadow: `inset 0 0 0 2px ${AX.accent}` }
          : { background: AX.grouped, color: AX.label }
      }
    >
      {children}
      <ChevronDown className="h-3 w-3" strokeWidth={2.8} />
    </button>
  );
}

export function StudyView({
  rows,
  onChange,
  onToast,
  onClose,
}: {
  rows: StudyEntry[];
  onChange: (rows: StudyEntry[]) => void;
  onToast: (t: Toast) => void;
  onClose: () => void;
}) {
  const [menu, setMenu] = useState<'more' | 'sort' | 'type' | 'lang' | null>(null);
  const [sort, setSort] = useState<(typeof SORTS)[number]>('Recently used');
  const [type, setType] = useState('All types');
  const [lang, setLang] = useState('All languages');
  const [deleting, setDeleting] = useState(false);
  const [picked, setPicked] = useState<number[]>([]);
  const [detail, setDetail] = useState<StudyEntry | null>(null);

  const types = useMemo(() => ['All types', ...Array.from(new Set(rows.map((r) => r.tag)))], [rows]);
  const langs = useMemo(() => ['All languages', ...Array.from(new Set(rows.map((r) => r.language)))], [rows]);
  const shown = rows
    .filter((r) => (type === 'All types' || r.tag === type) && (lang === 'All languages' || r.language === lang))
    .sort((a, b) => (sort === 'Frequently missed' ? b.misses - a.misses : sort === 'Previous entries' ? a.id - b.id : b.id - a.id));
  const filtered = type !== 'All types' || lang !== 'All languages';

  const doDelete = () => {
    const before = rows;
    const n = picked.length;
    onChange(rows.filter((r) => !picked.includes(r.id)));
    setPicked([]);
    onToast({ text: `${n} ${n === 1 ? 'entry' : 'entries'} deleted`, undo: () => onChange(before) });
  };

  if (detail) {
    return (
      <div className="relative flex shrink-0 flex-col animate-in slide-in-from-right-8 fade-in-0 duration-200" style={{ height: VIEW_H, background: AX.pageBg, fontFamily: NOTO }}>
        <div className="relative flex h-11 items-center px-1">
          <CornerButton onClick={() => setDetail(null)} label="Back">
            {backIcon}
          </CornerButton>
          <span className="absolute inset-x-[52px] truncate text-center text-[16px] font-semibold" style={{ color: AX.label }}>
            {detail.entry}
          </span>
        </div>
        <p className="px-4 pb-2 text-center text-[15px] font-medium" style={{ color: AX.label }}>
          {detail.translations}
        </p>
        <div className="flex justify-center gap-1.5 pb-3">
          {[detail.language, detail.tag].map((t) => (
            <span key={t} className="rounded-[8px] px-2 py-[3px] text-[14px] font-medium" style={{ background: AX.pageBg, color: AX.label, boxShadow: `inset 0 0 0 1px ${AX.cardStroke}` }}>
              {t}
            </span>
          ))}
          <span className="rounded-full px-2.5 py-[3px] text-[14px] font-semibold" style={{ background: AX.warningBg, color: AX.label, boxShadow: `inset 0 0 0 1.5px ${AX.warningStroke}` }}>
            1 Reword
          </span>
        </div>
        <div className="mx-4 rounded-[12px] px-3.5 py-3" style={{ background: AX.cardBg, boxShadow: `inset 0 0 0 1px ${AX.cardStroke}` }}>
          <p className="text-[16px]" style={{ color: AX.label }}>
            {detail.sentence}
          </p>
          <p className="mt-1.5 text-[12px] font-medium" style={{ color: AX.detail }}>
            You wrote
          </p>
          <p className="text-[14px]" style={{ color: AX.detail }}>
            {detail.wrote}
          </p>
        </div>
      </div>
    );
  }

  const menuItems =
    menu === 'more'
      ? [
          { label: 'Export for Anki', act: () => setMenu(null), icon: <Download className="h-4 w-4" /> },
          { label: 'Export as CSV', act: () => setMenu(null), icon: <Download className="h-4 w-4" /> },
          ...(filtered
            ? [{ label: 'Reset filters', act: () => (setType('All types'), setLang('All languages'), setMenu(null)), icon: <Filter className="h-4 w-4" /> }]
            : []),
          {
            label: 'Delete entries',
            red: true,
            icon: <Trash2 className="h-4 w-4" />,
            act: () => {
              setDeleting(true);
              setPicked([]);
              setMenu(null);
            },
          },
        ]
      : menu === 'sort'
        ? SORTS.map((s) => ({ label: s, on: s === sort, act: () => (setSort(s), setMenu(null)) }))
        : menu === 'type'
          ? types.map((s) => ({ label: s, on: s === type, act: () => (setType(s), setMenu(null)) }))
          : menu === 'lang'
            ? langs.map((s) => ({ label: s, on: s === lang, act: () => (setLang(s), setMenu(null)) }))
            : [];

  return (
    <div className="relative flex shrink-0 flex-col" style={{ height: VIEW_H, background: AX.pageBg, fontFamily: NOTO }}>
      {/* Header: ⋯ menu (not while deleting), Study, ×. */}
      <div className="relative flex h-11 items-center px-1">
        {deleting || !rows.length ? (
          <span className="h-[38px] w-[38px]" />
        ) : (
          <CornerButton onClick={() => setMenu(menu === 'more' ? null : 'more')} label="More">
            <MoreHorizontal className="h-[18px] w-[18px]" strokeWidth={2.6} />
          </CornerButton>
        )}
        <span className="absolute left-1/2 -translate-x-1/2 text-[16px] font-semibold" style={{ color: AX.label }}>
          Study
        </span>
        <span className="flex-1" />
        <CornerButton onClick={onClose} label="Close">
          {xIcon}
        </CornerButton>
      </div>

      {/* Filters. */}
      <div className="flex gap-2 overflow-x-auto whitespace-nowrap px-4 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <span className="flex h-[46px] shrink-0 items-center rounded-[12px] px-3 text-[14px] font-medium tabular-nums" style={{ background: AX.grouped, color: AX.label }}>
          {shown.length} total
        </span>
        <Chip onClick={() => setMenu(menu === 'sort' ? null : 'sort')} on={sort !== 'Recently used'}>
          {sort}
        </Chip>
        <Chip onClick={() => setMenu(menu === 'type' ? null : 'type')} on={type !== 'All types'}>
          {type}
        </Chip>
        <Chip onClick={() => setMenu(menu === 'lang' ? null : 'lang')} on={lang !== 'All languages'}>
          {lang}
        </Chip>
      </div>

      {/* Entries. */}
      <div className="min-h-0 flex-1 overflow-y-auto pb-2 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {shown.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-8 text-center">
            {filtered && rows.length ? (
              <>
                <p className="text-[16px] font-semibold" style={{ color: AX.label }}>
                  Nothing matches these filters
                </p>
                <p className="text-[14px]" style={{ color: AX.detail }}>
                  You have entries, just none of this type or language.
                </p>
                <button className="text-[15px] font-medium" style={{ color: AX.accent }} onClick={() => (setType('All types'), setLang('All languages'))}>
                  Show all entries
                </button>
              </>
            ) : (
              <p className="text-[14px]" style={{ color: AX.detail }}>
                Words and phrases taken from your translations and corrections with Reword will appear here.
              </p>
            )}
          </div>
        ) : (
          shown.map((r) => {
            const on = picked.includes(r.id);
            return (
              <div
                key={r.id}
                onClick={() => (deleting ? setPicked((p) => (on ? p.filter((x) => x !== r.id) : [...p, r.id])) : setDetail(r))}
                className="mx-4 mb-2.5 flex cursor-pointer items-start gap-3 rounded-[12px] px-3.5 py-3 animate-in fade-in-0 duration-200 active:brightness-95"
                style={{ background: AX.cardBg, boxShadow: `inset 0 0 0 1px ${AX.cardStroke}` }}
              >
                {deleting && (
                  <span className="mt-0.5 w-6 shrink-0">
                    {on ? (
                      <CheckCircle2 className="h-[22px] w-[22px] fill-[var(--ax-accent)] text-white" strokeWidth={2} />
                    ) : (
                      <Circle className="h-[22px] w-[22px]" style={{ color: AX.placeholder }} strokeWidth={1.8} />
                    )}
                  </span>
                )}
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <span className="truncate text-[16px] font-semibold" style={{ color: AX.label }}>
                    {r.entry}
                  </span>
                  <span className="line-clamp-2 text-[14px] font-medium" style={{ color: AX.label }}>
                    {r.translations}
                  </span>
                  <span className="line-clamp-2 text-[14px]" style={{ color: AX.detail }}>
                    {r.sentence}
                  </span>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  {!deleting && <ChevronRight className="h-[15px] w-[15px]" style={{ color: AX.detail }} strokeWidth={2} />}
                  <span className="rounded-[8px] px-2 py-[3px] text-[14px] font-medium leading-tight" style={{ background: AX.pageBg, color: AX.label, boxShadow: `inset 0 0 0 1px ${AX.cardStroke}` }}>
                    {r.tag}
                  </span>
                  <span className="rounded-full px-2.5 py-[3px] text-[13px] font-semibold leading-tight tabular-nums" style={{ background: AX.warningBg, color: AX.label, boxShadow: `inset 0 0 0 1.5px ${AX.warningStroke}` }}>
                    ×{r.misses}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Delete mode's bar: Done, Select all, delete N. */}
      {deleting && (
        <>
          <div style={{ height: 1, background: AX.separator }} />
          <div className="flex h-11 items-center gap-2 px-2 py-1">
            <button onClick={() => (setDeleting(false), setPicked([]))} className="rounded-[12px] px-4 py-1.5 text-[16px] font-medium" style={{ color: AX.accent }}>
              Done
            </button>
            <span className="flex-1" />
            <button
              onClick={() => setPicked(picked.length === shown.length ? [] : shown.map((r) => r.id))}
              disabled={!shown.length}
              className="rounded-[12px] px-3 py-1.5 text-[16px] font-medium disabled:opacity-40"
              style={{ background: AX.actionKey, color: AX.accent }}
            >
              {picked.length && picked.length === shown.length ? 'De-select all' : 'Select all'}
            </button>
            <button
              onClick={doDelete}
              disabled={!picked.length}
              aria-label="Delete selected entries"
              className="flex items-center gap-1.5 rounded-[12px] px-4 py-1.5 text-[16px] font-medium text-white disabled:opacity-40"
              style={{ background: AX.item }}
            >
              <TrashFill color="#fff" /> {picked.length}
            </button>
          </div>
        </>
      )}

      {menu && (
        <>
          <div className="absolute inset-0 z-20" onClick={() => setMenu(null)} />
          <div className={`absolute z-30 ${menu === 'more' ? 'left-2 top-11' : 'left-4 top-[100px]'}`}>
            <MenuCard items={menuItems} />
          </div>
        </>
      )}
    </div>
  );
}

// ── Language sheet ───────────────────────────────────────────────────────────

/**
 * RewordLanguageView as a large-detent sheet: a title, Done, and an
 * inset-grouped list in A-Z sections -- checkmark on the current language,
 * each language's own name under its English one.
 */
export function LanguageList({
  title,
  names,
  selected,
  onPick,
  onDone,
}: {
  title: string;
  names: string[];
  selected: string;
  onPick: (name: string) => void;
  onDone: () => void;
}) {
  const sections = useMemo(() => {
    const by: Record<string, string[]> = {};
    [...names].sort().forEach((n) => (by[n[0]] ??= []).push(n));
    return Object.entries(by);
  }, [names]);
  return (
    <div
      className="relative flex shrink-0 flex-col overflow-hidden rounded-t-[12px] animate-in slide-in-from-bottom-6 fade-in-0 duration-200"
      style={{ height: VIEW_H, background: AX.pageBg, fontFamily: NOTO }}
    >
      <div className="mx-auto mt-1.5 h-[5px] w-9 rounded-full" style={{ background: AX.detail, opacity: 0.4 }} />
      <div className="relative flex h-11 items-center justify-center px-4">
        <span className="text-[16px] font-semibold" style={{ color: AX.label }}>
          {title}
        </span>
        <button onClick={onDone} className="absolute right-4 text-[16px] font-semibold" style={{ color: AX.accent }}>
          Done
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6 pt-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {sections.map(([letter, list]) => (
          <div key={letter} className="mb-4">
            <div className="px-4 pb-1.5 text-[13px] uppercase" style={{ color: AX.detail, fontFamily: SF }}>
              {letter}
            </div>
            <div className="overflow-hidden rounded-[10px]" style={{ background: AX.cardBg }}>
              {list.map((n, i) => {
                const native = NATIVE[n];
                return (
                  <button
                    key={n}
                    onClick={() => onPick(n)}
                    className="relative flex w-full items-center py-2.5 pl-[54px] pr-4 text-left active:brightness-95"
                    style={{ background: AX.cardBg }}
                  >
                    {i > 0 && <span className="absolute left-[54px] right-0 top-0" style={{ height: 0.5, background: AX.cardStroke }} />}
                    {n === selected && <Check className="absolute left-[17px] h-[19px] w-[19px]" style={{ color: AX.accent }} strokeWidth={2.6} />}
                    <span className="flex flex-col">
                      <span className="text-[16px]" style={{ color: AX.label }}>
                        {n}
                      </span>
                      {native && native !== n && (
                        <span className="mt-0.5 text-[13px]" style={{ color: AX.detail }}>
                          {native}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Locales ──────────────────────────────────────────────────────────────────

/** LocalePopoverView: the 文 key's long press. Autocorrect, the installed
    keyboards with a check on the current one, and Manage. */
export function LocalePopover({
  locales,
  current,
  onPick,
  onManage,
  onDismiss,
}: {
  locales: Locale[];
  current: string;
  onPick: (id: string) => void;
  onManage: () => void;
  onDismiss: () => void;
}) {
  return (
    <>
      <div className="absolute inset-0 z-40" onPointerDown={onDismiss} />
      <div
        className="absolute bottom-[121px] left-1 z-50 w-[200px] overflow-hidden rounded-[12px] animate-in fade-in-0 duration-150"
        style={{ background: AX.cardBg, boxShadow: '0 4px 12px rgba(0,0,0,0.2)', fontFamily: NOTO }}
      >
        <div className="px-4 pb-1.5 pt-2.5 text-[13px] font-semibold" style={{ color: AX.placeholder }}>
          Autocorrect
        </div>
        <div style={{ height: 0.5, background: AX.cardStroke }} />
        {locales.map((l, i) => (
          <button
            key={l.id}
            onClick={() => onPick(l.id)}
            className="relative flex w-full items-center justify-between px-4 py-3 text-left text-[16px] font-medium active:brightness-90"
            style={{ color: AX.label, background: AX.cardBg }}
          >
            {i > 0 && <span className="absolute left-4 right-0 top-0" style={{ height: 0.5, background: AX.cardStroke }} />}
            {l.name}
            {l.id === current && <Check className="h-[14px] w-[14px]" style={{ color: AX.accent }} strokeWidth={3} />}
          </button>
        ))}
        <div style={{ height: 0.5, background: AX.cardStroke }} />
        <button onClick={onManage} className="w-full px-4 py-3 text-left text-[16px] font-medium active:brightness-90" style={{ color: AX.accent, background: AX.cardBg }}>
          Manage
        </button>
      </div>
    </>
  );
}

/**
 * KeyboardsView: Autocorrect Languages. The system keyboard, then the added
 * ones; tapping one makes it active. Edit puts a check beside each added
 * keyboard -- untick to remove, and Done removes them all at once. "Add new
 * autocorrect language" opens the add sheet.
 */
export function KeyboardsPage({
  locales,
  current,
  onPick,
  onChange,
  onBack,
}: {
  locales: Locale[];
  current: string;
  onPick: (id: string) => void;
  onChange: (locales: Locale[], removedCurrent: boolean) => void;
  onBack: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [keep, setKeep] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);
  const extra = locales.length > 1;

  const done = () => {
    const next = locales.filter((l, i) => i === 0 || keep.includes(l.id));
    onChange(next, !next.some((l) => l.id === current));
    setEditing(false);
  };

  if (adding) {
    return (
      <AddLocaleSheet
        exclude={locales.map((l) => l.name)}
        onDone={(picked) => {
          if (picked.length) onChange([...locales, ...picked], false);
          setAdding(false);
        }}
      />
    );
  }

  return (
    <div className="relative flex shrink-0 flex-col" style={{ height: VIEW_H, background: AX.pageBg, fontFamily: NOTO }}>
      <div className="relative flex items-center py-2.5 pl-1 pr-3">
        {editing ? (
          <span className="h-[38px] w-[38px]" />
        ) : (
          <CornerButton onClick={onBack} label="Back">
            {backIcon}
          </CornerButton>
        )}
        <span className="flex-1 text-center text-[16px] font-semibold" style={{ color: AX.label }}>
          Autocorrect Languages
        </span>
        {extra ? (
          <button
            onClick={() => (editing ? done() : (setKeep(locales.map((l) => l.id)), setEditing(true)))}
            className="w-[38px] text-right text-[16px] font-semibold"
            style={{ color: AX.accent }}
          >
            {editing ? 'Done' : 'Edit'}
          </button>
        ) : (
          <span className="w-[38px]" />
        )}
      </div>
      <div className="mx-3 mt-2 overflow-hidden rounded-[16px]" style={{ background: AX.cardBg, border: `1px solid ${AX.cardStroke}` }}>
        {locales.map((l, i) => {
          const kept = keep.includes(l.id);
          const removable = i > 0;
          return (
            <div key={l.id}>
              {i > 0 && <div className="mx-4" style={{ height: 1, background: AX.cardStroke }} />}
              <button
                onClick={() =>
                  editing ? removable && setKeep((k) => (kept ? k.filter((x) => x !== l.id) : [...k, l.id])) : onPick(l.id)
                }
                className="flex h-14 w-full items-center px-4 text-left active:brightness-95"
                style={{ background: AX.cardBg }}
              >
                {editing && removable && (
                  <span className="mr-3.5 grid w-6 place-items-center animate-in slide-in-from-left-4 fade-in-0 duration-200" style={{ opacity: kept ? 1 : 0 }}>
                    <Check className="h-4 w-4" style={{ color: AX.accent }} strokeWidth={3} />
                  </span>
                )}
                <span className="flex-1 text-[16px]" style={{ color: editing && removable && !kept ? AX.detail : AX.label }}>
                  {l.name}
                </span>
                {!editing && l.id === current && (
                  <span className="flex items-center gap-2 text-[16px]" style={{ color: AX.detail }}>
                    Active <Check className="h-4 w-4" style={{ color: AX.accent }} strokeWidth={3} />
                  </span>
                )}
              </button>
            </div>
          );
        })}
        {!editing && (
          <>
            <div className="mx-4" style={{ height: 1, background: AX.cardStroke }} />
            <button onClick={() => setAdding(true)} className="flex min-h-14 w-full items-center px-4 text-left text-[16px] active:brightness-95" style={{ color: AX.accent, background: AX.cardBg }}>
              Add new autocorrect language
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/** NewKeyboardsView: pick any number of locales, A-Z; Done adds them. */
function AddLocaleSheet({ exclude, onDone }: { exclude: string[]; onDone: (picked: Locale[]) => void }) {
  const [picked, setPicked] = useState<string[]>([]);
  const available = ADDABLE_LOCALES.filter((l) => !exclude.includes(l.name));
  const sections = useMemo(() => {
    const by: Record<string, Locale[]> = {};
    available.forEach((l) => (by[l.name[0]] ??= []).push(l));
    return Object.entries(by);
  }, [available]);
  return (
    <div
      className="relative flex shrink-0 flex-col overflow-hidden rounded-t-[12px] animate-in slide-in-from-bottom-6 fade-in-0 duration-200"
      style={{ height: VIEW_H, background: AX.pageBg, fontFamily: NOTO }}
    >
      <div className="relative flex h-12 items-center justify-center px-4">
        <span className="text-[16px] font-semibold" style={{ color: AX.label }}>
          Add New Autocorrect Language
        </span>
        <button
          onClick={() => onDone(available.filter((l) => picked.includes(l.id)))}
          className="absolute right-4 text-[16px] font-semibold"
          style={{ color: AX.accent }}
        >
          Done
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6 pt-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {sections.map(([letter, list]) => (
          <div key={letter} className="mb-4">
            <div className="px-4 pb-1.5 text-[13px] uppercase" style={{ color: AX.detail, fontFamily: SF }}>
              {letter}
            </div>
            <div className="overflow-hidden rounded-[10px]" style={{ background: AX.cardBg }}>
              {list.map((l, i) => (
                <button
                  key={l.id}
                  onClick={() => setPicked((p) => (p.includes(l.id) ? p.filter((x) => x !== l.id) : [...p, l.id]))}
                  className="relative flex w-full items-center py-2.5 pl-[54px] pr-4 text-left text-[17px] active:brightness-95"
                  style={{ background: AX.cardBg, color: AX.label, fontFamily: SF }}
                >
                  {i > 0 && <span className="absolute left-[54px] right-0 top-0" style={{ height: 0.5, background: AX.cardStroke }} />}
                  {picked.includes(l.id) && <Check className="absolute left-[17px] h-[19px] w-[19px]" style={{ color: AX.accent }} strokeWidth={2.6} />}
                  {l.name}
                </button>
              ))}
            </div>
          </div>
        ))}
        {available.length === 0 && (
          <p className="pt-10 text-center text-[15px]" style={{ color: AX.detail }}>
            Every keyboard is already added.
          </p>
        )}
      </div>
    </div>
  );
}

