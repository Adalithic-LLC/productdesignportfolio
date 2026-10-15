/**
 * The admin control for inline marks: select some characters in any editable
 * field and it appears over the selection.
 *
 * It floats by the text rather than living in the admin bar for one reason --
 * the selection is the thing being acted on, and a control at the bottom of the
 * window is a long way to travel from the words you just picked out. Everything
 * in here cancels its own mousedown so that journey never costs the selection.
 *
 * Colour, thickness, radius and the animation flag are sticky: set them once
 * and the next mark takes them too. With a mark already under the selection
 * they re-apply to it instead, so a mark can be recoloured or resized in place.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Eraser, Highlighter, Minus, Plus, Sparkles, Square, Underline } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useContent } from './ContentContext';
import {
  DEFAULT_MARK,
  MARK_COLORS,
  RADIUS_RANGE,
  THICKNESS_RANGE,
  applyMark,
  clampRadius,
  clampThickness,
  domToValue,
  markAt,
  type MarkColor,
  type MarkKind,
  type MarkSpec,
} from './inlineMarks';
import { fieldFor, readSelection, selectPlainRange, type MarkSelection } from './markSelection';

const KINDS: { kind: MarkKind; label: string; Icon: typeof Underline }[] = [
  { kind: 'underline', label: 'Underline', Icon: Underline },
  { kind: 'highlight', label: 'Highlight', Icon: Highlighter },
  { kind: 'outline', label: 'Outline', Icon: Square },
];

/** Height of the bar plus the gap it keeps from the text. */
const OFFSET = 52;

export function MarkToolbar() {
  const { isAdmin, setText } = useContent();
  const [sel, setSel] = useState<MarkSelection | null>(null);
  const [at, setAt] = useState<{ top: number; left: number } | null>(null);
  const [style, setStyle] = useState<Omit<MarkSpec, 'kind'>>({
    color: DEFAULT_MARK.color,
    thickness: DEFAULT_MARK.thickness,
    radius: DEFAULT_MARK.radius,
    animate: DEFAULT_MARK.animate,
  });
  const bar = useRef<HTMLDivElement>(null);

  /** Where the selection is on screen, so the bar can sit over it. */
  const place = useCallback(() => {
    const live = window.getSelection();
    if (!live || live.rangeCount === 0) return;
    const rect = live.getRangeAt(0).getBoundingClientRect();
    if (!rect.width && !rect.height) return;
    const width = bar.current?.offsetWidth ?? 420;
    const left = Math.min(
      Math.max(12 + width / 2, rect.left + rect.width / 2),
      window.innerWidth - width / 2 - 12
    );
    /* Below the words when there is no room above -- at the top of a page the
       bar would otherwise be off-screen, which is exactly where the hero's
       headline is. */
    const above = rect.top > OFFSET + 12;
    setAt({ top: above ? rect.top - OFFSET : rect.bottom + 12, left });
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    const read = () => {
      const next = readSelection();
      if (next) {
        setSel(next);
        place();
      } else {
        setSel(null);
        setAt(null);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSel(null);
        setAt(null);
      }
    };
    document.addEventListener('selectionchange', read);
    window.addEventListener('keydown', onKey);
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    return () => {
      document.removeEventListener('selectionchange', read);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
    };
  }, [isAdmin, place]);

  // Re-measure once the bar itself is on the page and its width is known.
  useLayoutEffect(() => {
    if (sel) place();
  }, [sel, place]);

  if (!isAdmin || !sel || !at) return null;

  const host = fieldFor(sel.path);
  const current = host ? domToValue(host) : '';
  const active = host ? markAt(current, sel.start, sel.end) : null;
  /* The controls show the mark under the selection when there is one, and the
     sticky style when there is not -- so they always say what the next click
     will do. */
  const shown = active ?? style;

  /** Write `spec` (or clear) over the selected characters and keep them selected. */
  const write = (spec: MarkSpec | null) => {
    const el = fieldFor(sel.path);
    if (!el) return;
    const value = applyMark(domToValue(el), sel.start, sel.end, spec);
    // Blurring commits what is on screen; the store write that follows wins,
    // and the field is then free to be re-rendered with the mark in it.
    if (document.activeElement === el) el.blur();
    setText(sel.path, value);
    requestAnimationFrame(() => {
      const back = fieldFor(sel.path);
      if (back) selectPlainRange(back, sel.start, sel.end);
    });
  };

  /** A control that changes the style: re-applies when a mark is already there. */
  const restyle = (patch: Partial<Omit<MarkSpec, 'kind'>>) => {
    const next = { ...style, ...patch };
    setStyle(next);
    if (active) write({ ...active, ...patch });
  };

  /** Clicking the kind a mark already is takes it off; anything else sets it. */
  const toggleKind = (kind: MarkKind) => {
    if (active?.kind === kind) return write(null);
    const { color, thickness, radius, animate } = active ?? style;
    write({ kind, color, thickness, radius, animate });
  };

  const btn =
    'inline-flex h-7 items-center justify-center rounded-md px-2 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-40';
  const on = 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground';
  const stepper = (
    label: string,
    title: string,
    value: number,
    set: (n: number) => void,
    range: { min: number; max: number }
  ) => (
    <div className="flex items-center gap-0.5" title={title}>
      <span className="px-0.5 text-[10px] uppercase tracking-wider text-muted-foreground/70">
        {label}
      </span>
      <button type="button" className={btn} disabled={value <= range.min} onClick={() => set(value - 1)}>
        <Minus className="h-3 w-3" />
      </button>
      <span className="w-4 text-center text-xs tabular-nums">{value}</span>
      <button type="button" className={btn} disabled={value >= range.max} onClick={() => set(value + 1)}>
        <Plus className="h-3 w-3" />
      </button>
    </div>
  );

  return createPortal(
    <div
      ref={bar}
      // The selection is the input here, so nothing in the bar may take focus.
      onMouseDown={(e) => e.preventDefault()}
      style={{ top: at.top, left: at.left }}
      className="fixed z-[130] -translate-x-1/2 flex items-center gap-1 rounded-xl border border-border/70 bg-background/95 px-2 py-1.5 shadow-2xl backdrop-blur-xl"
    >
      {KINDS.map(({ kind, label, Icon }) => (
        <button
          key={kind}
          type="button"
          title={label}
          onClick={() => toggleKind(kind)}
          className={cn(btn, active?.kind === kind && on)}
        >
          <Icon className="h-3.5 w-3.5" />
        </button>
      ))}

      <span className="mx-0.5 h-5 w-px bg-border" aria-hidden />

      {MARK_COLORS.map((color) => (
        <button
          key={color}
          type="button"
          title={color[0].toUpperCase() + color.slice(1)}
          onClick={() => restyle({ color: color as MarkColor })}
          className={cn(
            'h-5 w-5 rounded-full border transition',
            shown.color === color
              ? 'border-foreground/70 ring-2 ring-primary/40'
              : 'border-border hover:border-foreground/40'
          )}
          style={{ background: `hsl(var(--mark-${color}))` }}
        />
      ))}

      <span className="mx-0.5 h-5 w-px bg-border" aria-hidden />

      {stepper('T', 'Thickness — the underline rule and the outline border', shown.thickness, (n) =>
        restyle({ thickness: clampThickness(n) }), THICKNESS_RANGE)}
      {stepper('R', 'Corner radius — highlight and outline', shown.radius, (n) =>
        restyle({ radius: clampRadius(n) }), RADIUS_RANGE)}

      <span className="mx-0.5 h-5 w-px bg-border" aria-hidden />

      <button
        type="button"
        title={
          shown.animate
            ? 'Animated — draws on in turn when scrolled into view'
            : 'Static — there as soon as the page is'
        }
        onClick={() => restyle({ animate: !shown.animate })}
        className={cn(btn, shown.animate && on)}
      >
        <Sparkles className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        title="Remove the mark"
        disabled={!active}
        onClick={() => write(null)}
        className={btn}
      >
        <Eraser className="h-3.5 w-3.5" />
      </button>
    </div>,
    document.body
  );
}
