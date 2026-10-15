/**
 * Inline marks: underline, highlight and outline on a run of characters inside
 * any editable string.
 *
 * Every piece of copy on the site is a plain string in the content store, and
 * that is worth keeping -- it is what makes the store readable, diffable and
 * safe to write back to the repo. So a mark is stored *in* the string, as a
 * token the renderer understands:
 *
 *     Design is [mark:highlight:yellow:2:4:1]a negotiation[/mark] at every step.
 *
 * The five values are the kind, the colour, the thickness in px (underline and
 * outline), the corner radius in px (highlight and outline), and whether the
 * mark draws itself on. Nothing else is
 * ever written into a field, so the store never holds markup a browser could
 * execute: the visitor's page renders React elements from the parsed segments,
 * never `dangerouslySetInnerHTML`.
 *
 * Admin edits the marked text in place, which means `contentEditable` has to
 * round-trip: {@link toHtml} lays the value out as spans, and {@link domToValue}
 * reads the spans back into tokens on blur. Anything the browser or a paste put
 * in there that is not a mark span degrades to its text, exactly as the old
 * `innerText` commit did.
 */
import { Fragment, useEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export const MARK_KINDS = ['underline', 'highlight', 'outline'] as const;
export type MarkKind = (typeof MARK_KINDS)[number];

/** Drawn from the site's own palette -- see `--mark-*` in index.css. */
export const MARK_COLORS = ['yellow', 'green', 'blue', 'red'] as const;
export type MarkColor = (typeof MARK_COLORS)[number];

export interface MarkSpec {
  kind: MarkKind;
  color: MarkColor;
  /** Underline rule / outline border, in px. */
  thickness: number;
  /** Corner radius of a highlight or outline, in px. */
  radius: number;
  /** Draw the mark on rather than having it there from the start. */
  animate: boolean;
}

/** A run of text that is either plain or carries one mark. */
export interface Segment {
  text: string;
  mark: MarkSpec | null;
}

export const THICKNESS_RANGE = { min: 1, max: 8 } as const;
export const RADIUS_RANGE = { min: 0, max: 16 } as const;

export const DEFAULT_MARK: MarkSpec = {
  kind: 'highlight',
  color: 'yellow',
  thickness: 2,
  radius: 4,
  animate: true,
};

/** Seconds between one animated mark starting and the next one in the block. */
export const MARK_STAGGER = 0.22;

const TOKEN =
  '\\[mark:(underline|highlight|outline):(yellow|green|blue|red):(\\d{1,2}):(\\d{1,2})(?::([01]))?\\]' +
  '([\\s\\S]*?)\\[\\/mark\\]';

/** Tags that end a visual line, so a newline is read back out of them. */
const BLOCK_TAGS = new Set(['DIV', 'P', 'LI', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE']);

const clamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, Math.round(Number.isFinite(n) ? n : min)));

export const clampThickness = (n: number) => clamp(n, THICKNESS_RANGE.min, THICKNESS_RANGE.max);
export const clampRadius = (n: number) => clamp(n, RADIUS_RANGE.min, RADIUS_RANGE.max);

/** True when the value carries at least one mark token. */
export function hasMarks(value: string): boolean {
  return new RegExp(TOKEN).test(value);
}

/** Split a stored value into its plain and marked runs, in order. */
export function parseMarks(value: string): Segment[] {
  const re = new RegExp(TOKEN, 'g');
  const out: Segment[] = [];
  let at = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(value))) {
    if (m.index > at) out.push({ text: value.slice(at, m.index), mark: null });
    const [, kind, color, thickness, radius, animate, text] = m;
    if (text) {
      out.push({
        text,
        mark: {
          kind: kind as MarkKind,
          color: color as MarkColor,
          thickness: clampThickness(Number(thickness)),
          radius: clampRadius(Number(radius)),
          animate: animate === '1',
        },
      });
    }
    at = m.index + m[0].length;
  }
  if (at < value.length) out.push({ text: value.slice(at), mark: null });
  return out;
}

/** The value with its tokens taken off — what a reader actually sees. */
export function plainText(value: string): string {
  return parseMarks(value)
    .map((s) => s.text)
    .join('');
}

const sameMark = (a: MarkSpec | null, b: MarkSpec | null) =>
  a === b ||
  (!!a &&
    !!b &&
    a.kind === b.kind &&
    a.color === b.color &&
    a.thickness === b.thickness &&
    a.radius === b.radius &&
    a.animate === b.animate);

/** Rebuild a stored value from segments, merging neighbours that match. */
export function segmentsToValue(segments: Segment[]): string {
  const merged: Segment[] = [];
  for (const seg of segments) {
    if (!seg.text) continue;
    const last = merged[merged.length - 1];
    if (last && sameMark(last.mark, seg.mark)) last.text += seg.text;
    else merged.push({ ...seg });
  }
  return merged
    .map((seg) =>
      seg.mark
        ? `[mark:${seg.mark.kind}:${seg.mark.color}:${seg.mark.thickness}:${seg.mark.radius}:` +
          `${seg.mark.animate ? 1 : 0}]${seg.text}[/mark]`
        : seg.text
    )
    .join('');
}

/**
 * Put `spec` on the characters between `start` and `end` (offsets into the
 * plain text), or clear whatever is there when `spec` is null. A range that
 * crosses an existing mark takes it over for the overlap and leaves the rest,
 * so marks can be extended, split and recoloured without special cases.
 */
export function applyMark(
  value: string,
  start: number,
  end: number,
  spec: MarkSpec | null
): string {
  if (end <= start) return value;
  const out: Segment[] = [];
  let at = 0;
  for (const seg of parseMarks(value)) {
    const segStart = at;
    const segEnd = at + seg.text.length;
    at = segEnd;
    const lo = Math.max(start, segStart);
    const hi = Math.min(end, segEnd);
    if (hi <= lo) {
      out.push(seg);
      continue;
    }
    if (lo > segStart) out.push({ text: seg.text.slice(0, lo - segStart), mark: seg.mark });
    out.push({ text: seg.text.slice(lo - segStart, hi - segStart), mark: spec });
    if (hi < segEnd) out.push({ text: seg.text.slice(hi - segStart), mark: seg.mark });
  }
  return segmentsToValue(out);
}

/** The mark covering a plain-text range, when one covers all of it. */
export function markAt(value: string, start: number, end: number): MarkSpec | null {
  let at = 0;
  let found: MarkSpec | null = null;
  for (const seg of parseMarks(value)) {
    const segStart = at;
    const segEnd = at + seg.text.length;
    at = segEnd;
    if (Math.min(end, segEnd) <= Math.max(start, segStart)) continue;
    if (!seg.mark) return null;
    if (found && !sameMark(found, seg.mark)) return null;
    found = seg.mark;
  }
  return found;
}

/**
 * The attributes a mark span carries, shared by every render path.
 *
 * `order` is the mark's position among the animated marks of its own block,
 * which is what staggers them: the first one drawn is the first one written.
 * `delay` overrides that with an absolute time, for the hero, where the marks
 * run off the paragraph's own word-by-word reveal rather than off a stagger of
 * their own.
 */
export function markProps(spec: MarkSpec, order = 0, delay?: number) {
  const style: Record<string, string> = {
    '--mark-thickness': String(spec.thickness),
    '--mark-radius': String(spec.radius),
  };
  if (spec.animate) {
    style['--mark-delay'] =
      delay != null ? `${Math.max(0, delay).toFixed(2)}s` : `${(order * MARK_STAGGER).toFixed(2)}s`;
  }
  return {
    className: 'pdp-mark',
    'data-mark': spec.kind,
    'data-color': spec.color,
    ...(spec.animate ? { 'data-animate': '1' } : null),
    style: style as CSSProperties,
  };
}

const reduceMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * A mark that draws itself on.
 *
 * With a `delay` it starts on its own clock, as soon as it is on the page --
 * that is the hero, where the copy reads itself in whether or not anything is
 * scrolled. Everywhere else it waits until it is scrolled into view, so a mark
 * further down the page still draws where it can be seen rather than having
 * played to nobody.
 */
export function AnimatedMark({
  spec,
  order,
  delay,
  children,
}: {
  spec: MarkSpec;
  order: number;
  delay?: number;
  children: ReactNode;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [drawn, setDrawn] = useState(() => reduceMotion() || delay != null);

  useEffect(() => {
    if (drawn) return;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setDrawn(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setDrawn(true);
          io.disconnect();
        }
      },
      /* A touch inside the fold, so a mark draws once it is properly in view
         rather than while its first pixel is still on the edge. */
      { rootMargin: '0px 0px -12% 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [drawn]);

  const props = markProps(spec, order, delay);
  return (
    <span {...props} ref={ref} className={cn(props.className, drawn && 'is-drawn')}>
      {children}
    </span>
  );
}

/**
 * Render a stored value for a visitor: text and marks, no HTML parsing.
 *
 * `delayFor` is how the hero hands each animated mark the moment its own words
 * are read in; without it they stagger among themselves.
 */
export function renderMarks(
  value: string,
  delayFor?: (segmentIndex: number) => number | undefined
): ReactNode {
  if (!hasMarks(value)) return value;
  let order = 0;
  return parseMarks(value).map((seg, i) => {
    if (!seg.mark) return <Fragment key={i}>{seg.text}</Fragment>;
    if (!seg.mark.animate) {
      return (
        <span key={i} {...markProps(seg.mark)}>
          {seg.text}
        </span>
      );
    }
    return (
      <AnimatedMark key={i} spec={seg.mark} order={order++} delay={delayFor?.(i)}>
        {seg.text}
      </AnimatedMark>
    );
  });
}

const escapeHtml = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * The value as markup for a contentEditable. Newlines become `<br>` because
 * that is what the browser itself puts in when Enter is pressed, so what we
 * write and what the user types read back the same way.
 */
export function toHtml(value: string): string {
  return parseMarks(value)
    .map((seg) => {
      const body = escapeHtml(seg.text).replace(/\n/g, '<br>');
      if (!seg.mark) return body;
      const { kind, color, thickness, radius, animate } = seg.mark;
      /* `is-drawn` from the start: in admin a mark is something being edited,
         so it is shown at rest rather than replaying its draw on every keystroke
         that re-syncs the field. */
      return (
        `<span class="pdp-mark${animate ? ' is-drawn' : ''}" data-mark="${kind}" ` +
        `data-color="${color}"${animate ? ' data-animate="1"' : ''} ` +
        `style="--mark-thickness:${thickness};--mark-radius:${radius};--mark-delay:0s"` +
        `>${body}</span>`
      );
    })
    .join('');
}

/** Read a mark off a DOM element, if it is one of ours and well formed. */
function specFromEl(el: Element): MarkSpec | null {
  const kind = el.getAttribute('data-mark');
  const color = el.getAttribute('data-color');
  if (!kind || !color) return null;
  if (!MARK_KINDS.includes(kind as MarkKind) || !MARK_COLORS.includes(color as MarkColor)) {
    return null;
  }
  const style = (el as HTMLElement).style;
  return {
    kind: kind as MarkKind,
    color: color as MarkColor,
    thickness: clampThickness(Number(style.getPropertyValue('--mark-thickness')) || 2),
    radius: clampRadius(Number(style.getPropertyValue('--mark-radius')) || 0),
    animate: el.getAttribute('data-animate') === '1',
  };
}

/**
 * Read a contentEditable (or a Range's contents) back into segments.
 *
 * Only our own mark spans survive as marks; every other element contributes its
 * text alone, which is what keeps a pasted document from bringing markup into
 * the store.
 */
export function domToSegments(root: Node): Segment[] {
  const segs: Segment[] = [];
  const push = (text: string, mark: MarkSpec | null) => {
    if (text) segs.push({ text, mark });
  };
  const endsOpen = () => {
    const last = segs[segs.length - 1];
    return !!last && !last.text.endsWith('\n');
  };

  const walk = (node: Node, mark: MarkSpec | null) => {
    node.childNodes.forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        push((child as Text).data.replace(/ /g, ' '), mark);
        return;
      }
      if (child.nodeType !== Node.ELEMENT_NODE) return;
      const el = child as Element;
      if (el.tagName === 'BR') {
        push('\n', null);
        return;
      }
      if (BLOCK_TAGS.has(el.tagName) && segs.length > 0 && endsOpen()) push('\n', null);
      walk(el, specFromEl(el) ?? mark);
    });
  };

  walk(root, null);
  return segs;
}

/**
 * What {@link domToSegments} would read, as a stored value.
 *
 * Trimmed at the end like the plain-text commit it replaces: a contentEditable
 * keeps a filler `<br>` at the bottom of a field, and that would otherwise
 * collect a newline in the store every time a field was visited.
 */
export function domToValue(root: Node): string {
  return segmentsToValue(domToSegments(root)).trimEnd();
}

/** How many characters of plain text a node holds, counting a `<br>` as one. */
export function plainLength(node: Node): number {
  return domToSegments(node).reduce((n, seg) => n + seg.text.length, 0);
}
