import { useEffect, useMemo, useRef } from 'react';
import type { ElementType } from 'react';
import { cn } from '@/lib/utils';
import { useContent } from './ContentContext';
import {
  LIST_MAX_DEPTH,
  type LineStyle,
  domToSegments,
  domToValue,
  itemDepth,
  itemStyle,
  linesFromDom,
  parseListLine,
  renderMarks,
  segmentsToValue,
  setItemStyle,
  splitLines,
  toHtml,
  toLinesHtml,
} from './inlineMarks';

type EditableTag =
  | 'span'
  | 'p'
  | 'div'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'a'
  | 'dt'
  | 'dd'
  | 'figcaption'
  | 'ul'
  | 'ol';

interface EditableProps {
  /** Dot path into the content store, e.g. "hero.title" or "projects.items.0.title". */
  path: string;
  as?: EditableTag;
  className?: string;
  /** Allow line breaks (Enter inserts a newline instead of committing). */
  multiline?: boolean;
  /**
   * Draw each line separately so lines can carry their own markers. Bulleted
   * and plain lines then sit in one block, which is what a list in the middle
   * of prose actually is.
   */
  lines?: LineStyle[];
  /**
   * Re-style a run of the field's lines: as bullets, as numbers, or as no list
   * at all. The lines are a range because a selection can cover several; with
   * no selection it is the one line the caret is on.
   */
  onLineStyle?: (from: number, to: number, style: LineStyle) => void;
  /** Commit the lines and their styles together. */
  onCommitLines?: (text: string, styles: LineStyle[]) => void;
  /**
   * Enter on an empty last item: ends the list and carries on below it.
   * Called with the text minus that empty item.
   */
  onListBreak?: (value: string) => void;
  /** Extra props forwarded to the rendered element (e.g. href, style). */
  [key: string]: unknown;
}

/**
 * Renders a piece of editable copy from the content store.
 *
 * To a visitor it renders the text, with any inline marks it carries as
 * spans. In an admin session -- preview included, where only the outline
 * changes -- the element becomes `contentEditable`; its contents are
 * managed imperatively through a ref so React never re-reconciles them while
 * the user is typing (which would otherwise drop characters). Changes are
 * committed to the store on blur, read back out of the DOM so marks survive
 * being typed around -- see inlineMarks.tsx.
 */
export function Editable({
  path,
  as = 'span',
  className,
  multiline = false,
  lines,
  onLineStyle,
  onCommitLines,
  onListBreak,
  ...rest
}: EditableProps) {
  const { content, canEdit, previewing, setText } = useContent();
  const value = String(resolveValue(content, path) ?? '');
  const ref = useRef<HTMLElement>(null);
  /* Set when a key has just rebuilt the blocks around this field. The
     element is about to be replaced, and the blur on the way out would
     otherwise commit what it still holds -- the whole list -- over the
     first of the new blocks. */
  const restructured = useRef(false);
  const Tag = as as ElementType;
  const list = !!lines;
  const html = useMemo(
    () => (lines ? toLinesHtml(value, lines) : toHtml(value)),
    [lines, value]
  );
  /* Drawn lines carry depth and a marker, which plain text has no room for,
     so they are committed as a pair rather than through `setText`. */
  const read = (el: HTMLElement) => (lines ? linesFromDom(el).text : domToValue(el));
  const commit = (el: HTMLElement) => {
    if (lines && onCommitLines) {
      const next = linesFromDom(el);
      onCommitLines(next.text, next.styles);
    } else {
      setText(path, domToValue(el));
    }
  };

  // Keep the DOM in sync with the store, but never while focused/typing. The
  // comparison is on what the DOM *means* rather than on its markup, because
  // the browser rewrites the markup it is given (attribute order, quoting) and
  // a string comparison would then rewrite the field on every render.
  /* `as` is a dependency because changing it swaps the element: a list going
     from bulleted to numbered is a new, empty `<ol>` in place of the `<ul>`,
     and the markup to put in it has not changed -- so without this the field
     would be left blank. */
  useEffect(() => {
    const el = ref.current;
    if (!canEdit || !el) return;
    if (document.activeElement !== el && read(el) !== value) {
      el.innerHTML = html;
    }
  }, [as, canEdit, html, value]);

  if (!canEdit) {
    return (
      <Tag className={className} {...rest}>
        {lines
          ? splitLines(value).map((line, i) => {
              const { depth, text } = parseListLine(line);
              return (
                <div
                  key={i}
                  data-style={lines[i] ?? 'none'}
                  data-depth={depth}
                  style={{ marginLeft: `${depth * 1.35}rem` }}
                >
                  {renderMarks(text)}
                </div>
              );
            })
          : renderMarks(value)}
      </Tag>
    );
  }

  return (
    <Tag
      ref={ref}
      /* In preview the field keeps the page's own look until it is reached
         for: no dashed outline at rest, one on hover, the full one on focus.
         Preview is for reading the page as a visitor would, and a typo seen
         there should be fixable without leaving it. */
      className={cn(previewing ? 'preview-editable' : 'admin-editable', className)}
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      data-editable-path={path}
      title={`Editing: ${path}`}
      onBlur={(e: React.FocusEvent<HTMLElement>) => {
        if (restructured.current) {
          restructured.current = false;
          return;
        }
        commit(e.currentTarget);
      }}
      onKeyDown={(e: React.KeyboardEvent<HTMLElement>) => {
        if (!multiline && e.key === 'Enter') {
          e.preventDefault();
          e.currentTarget.blur();
          return;
        }
        /* The list shortcuts: the usual pair, 8 for bullets and 7 for
           numbers. By code, not by key -- with Shift held the 8 key reports
           '*'. They apply to the line the caret is on, or to every line a
           selection covers. */
        if (
          (e.metaKey || e.ctrlKey) &&
          e.shiftKey &&
          (e.code === 'Digit8' || e.code === 'Digit7')
        ) {
          const want: LineStyle = e.code === 'Digit8' ? 'bullet' : 'number';
          const span = lineSpan(e.currentTarget, list);
          if (span) {
            e.preventDefault();
            /* Pressed again on what is already that style, it comes off. */
            const here = lines?.[span.from] ?? 'none';
            onLineStyle?.(span.from, span.to, here === want ? 'none' : want);
          }
          return;
        }
        if (!list) return;
        const el = e.currentTarget;
        const at = caretItem(el);
        if (!at) return;
        const items = Array.from(el.children) as HTMLElement[];
        const line = items[at.index];

        /* Tab indents, Shift+Tab is the way back out: a level of indent if
           there is one to give back, then the marker itself, leaving the
           line's text where it is and the rest of the block alone. */
        if (e.key === 'Tab') {
          e.preventDefault();
          const now = itemDepth(line);
          const style = itemStyle(line);
          if (!e.shiftKey) {
            if (style === 'none') return;
            const above = at.index > 0 ? itemDepth(items[at.index - 1]) : -1;
            const next = Math.min(now + 1, above + 1, LIST_MAX_DEPTH);
            if (next !== now) {
              setItemStyle(line, style, next);
              commit(el);
            }
            return;
          }
          if (now > 0) setItemStyle(line, style, now - 1);
          else if (style !== 'none') setItemStyle(line, 'none', 0);
          else return;
          commit(el);
          return;
        }

        /* Backspace at the start of a line does the same, so the two keys
           agree: give back the indent, then the marker. Only once the line is
           plain does it behave like ordinary text and join the line above. */
        if (e.key === 'Backspace' && at.atStart) {
          const now = itemDepth(line);
          const style = itemStyle(line);
          if (now > 0) {
            e.preventDefault();
            setItemStyle(line, style, now - 1);
            commit(el);
            return;
          }
          if (style !== 'none') {
            e.preventDefault();
            setItemStyle(line, 'none', 0);
            commit(el);
            return;
          }
        }

        if (e.key === 'Enter' && at.empty && itemStyle(line) !== 'none') {
          /* The second Enter of the usual pair: the first made an empty item,
             this one ends the run of markers rather than the block. */
          e.preventDefault();
          setItemStyle(line, 'none', 0);
          commit(el);
        }
      }}
      onInput={
        list
          ? (e: React.FormEvent<HTMLElement>) => {
              /* A line the browser made (Enter at the end of one) carries no
                 style of its own, so it takes the style and depth of the line
                 above -- which is what continuing a list means. */
              let style: LineStyle = 'none';
              let depth = 0;
              Array.from(e.currentTarget.children).forEach((child) => {
                const el = child as HTMLElement;
                if (el.hasAttribute('data-style')) {
                  style = itemStyle(el);
                  depth = itemDepth(el);
                } else {
                  setItemStyle(el, style, depth);
                }
              });
            }
          : undefined
      }
      onClick={(e: React.MouseEvent) => {
        // Editing a clicked element shouldn't trigger parent button/link
        // handlers, and must not follow a link it happens to sit inside.
        // `stopPropagation` alone does neither of the latter: a link navigates
        // on the browser's default action, which only `preventDefault` cancels
        // -- so a title inside a card would edit and navigate at once.
        // Click fires after mousedown, where the caret is placed, so cancelling
        // it costs nothing.
        e.stopPropagation();
        e.preventDefault();
      }}
      {...rest}
    />
  );
}

/**
 * The lines a selection covers, as indices into the stored value.
 *
 * In a list that is which items the selection touches. In a paragraph the
 * lines are separated by `<br>`, so it is how many line breaks the text before
 * each end of the selection holds -- counted off the DOM, the same way the
 * value itself is read, rather than from an offset into a single text node.
 */
function lineSpan(root: HTMLElement, list: boolean): { from: number; to: number } | null {
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount || !sel.anchorNode || !root.contains(sel.anchorNode)) return null;
  const range = sel.getRangeAt(0);

  if (list) {
    const items = Array.from(root.children);
    const from = items.findIndex((el) => el.contains(range.startContainer));
    const to = items.findIndex((el) => el.contains(range.endContainer));
    if (from < 0) return null;
    return { from, to: to < 0 ? from : to };
  }

  const linesTo = (node: Node, offset: number) => {
    const pre = document.createRange();
    pre.selectNodeContents(root);
    try {
      pre.setEnd(node, offset);
    } catch {
      return 0;
    }
    return segmentsToValue(domToSegments(pre.cloneContents())).split('\n').length - 1;
  };
  return {
    from: linesTo(range.startContainer, range.startOffset),
    to: linesTo(range.endContainer, range.endOffset),
  };
}

/**
 * Where a collapsed caret sits among a list's items: which item, whether it is
 * at the very start of it, whether that item is empty, and whether it is the
 * last one. Null when the selection is not a caret inside one of the items.
 */
function caretItem(
  root: HTMLElement
): { index: number; last: boolean; atStart: boolean; empty: boolean } | null {
  const sel = window.getSelection();
  if (!sel || !sel.isCollapsed || !sel.anchorNode || !root.contains(sel.anchorNode)) return null;
  const items = Array.from(root.children);
  const index = items.findIndex((el) => el.contains(sel.anchorNode));
  if (index < 0) return null;
  const li = items[index];
  /* Measured as text rather than by offset: the caret can sit at offset 0 of a
     node that is itself part-way through the item (just inside a mark, say). */
  const before = document.createRange();
  before.selectNodeContents(li);
  before.setEnd(sel.anchorNode, sel.anchorOffset);
  return {
    index,
    last: index === items.length - 1,
    atStart: before.toString().length === 0,
    empty: (li.textContent ?? '').trim() === '',
  };
}

function resolveValue(content: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc == null || typeof acc !== 'object') return undefined;
    return (acc as Record<string, unknown>)[key];
  }, content);
}
