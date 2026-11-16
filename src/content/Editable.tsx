import { useEffect, useMemo, useRef } from 'react';
import type { ElementType } from 'react';
import { cn } from '@/lib/utils';
import { useContent } from './ContentContext';
import {
  LIST_MAX_DEPTH,
  domToValue,
  itemDepth,
  listDomToValue,
  listItemStyle,
  parseListLine,
  renderMarks,
  setItemDepth,
  splitLines,
  toHtml,
  toListHtml,
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
   * Render the value's lines as list items rather than as one run of text.
   * The stored value is the same either way -- one line per item -- so a
   * paragraph can be shown as a list and back without rewriting it.
   */
  list?: boolean;
  /**
   * Backspace at the very start of the first item: the caret has nowhere left
   * to go inside the list, so it leaves it. Called with the text as it stands.
   */
  onListExit?: (value: string) => void;
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
  list = false,
  onListExit,
  onListBreak,
  ...rest
}: EditableProps) {
  const { content, canEdit, previewing, setText } = useContent();
  const value = String(resolveValue(content, path) ?? '');
  const ref = useRef<HTMLElement>(null);
  const Tag = as as ElementType;
  const ordered = as === 'ol';
  const html = useMemo(
    () => (list ? toListHtml(value, ordered) : toHtml(value)),
    [list, ordered, value]
  );
  /* A list keeps each item's depth, which plain text has no room for. */
  const read = (el: HTMLElement) => (list ? listDomToValue(el) : domToValue(el));

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
        {list
          ? splitLines(value).map((line, i) => {
              const { depth, text } = parseListLine(line);
              return (
                <li key={i} style={cssFromText(listItemStyle(depth, as === 'ol'))}>
                  {renderMarks(text)}
                </li>
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
      onBlur={(e: React.FocusEvent<HTMLElement>) => setText(path, read(e.currentTarget))}
      onKeyDown={(e: React.KeyboardEvent<HTMLElement>) => {
        if (!multiline && e.key === 'Enter') {
          e.preventDefault();
          e.currentTarget.blur();
          return;
        }
        if (!list) return;
        /* Inside a list the browser handles the ordinary cases -- backspace at
           the start of an item merges it into the one above, and emptying an
           item and deleting again removes it. The two it cannot handle are the
           ways out of the list, because the list is the editing host: there is
           no block above the first item to merge into, and no paragraph after
           the last one to drop into. */
        const el = e.currentTarget;
        const at = caretItem(el);
        if (!at) return;
        const items = Array.from(el.querySelectorAll('li'));
        if (e.key === 'Tab') {
          /* Indent is capped one level below the item above: a sub-item needs
             something to be under, and a list that jumps two levels at once
             has no parent to show. */
          e.preventDefault();
          const li = items[at.index];
          const above = at.index > 0 ? itemDepth(items[at.index - 1]) : -1;
          const now = itemDepth(li);
          const next = e.shiftKey
            ? Math.max(0, now - 1)
            : Math.min(now + 1, above + 1, LIST_MAX_DEPTH);
          if (next !== now) {
            setItemDepth(li, next, ordered);
            setText(path, listDomToValue(el));
          }
          return;
        }
        if (e.key === 'Backspace' && at.atStart) {
          /* An indented item comes back a level first; only a top-level one at
             the very top leaves the list. */
          const li = items[at.index];
          const now = itemDepth(li);
          if (now > 0) {
            e.preventDefault();
            setItemDepth(li, now - 1, ordered);
            setText(path, listDomToValue(el));
            return;
          }
          if (at.index === 0) {
            e.preventDefault();
            onListExit?.(read(el));
            return;
          }
        }
        if (e.key === 'Enter' && at.empty && at.last) {
          e.preventDefault();
          const lines = read(el).split('\n');
          while (lines.length && lines[lines.length - 1].trim() === '') lines.pop();
          /* The item the caret is in goes now, by hand. The value it leaves
             behind is the one already stored, so nothing re-renders this field
             and the empty bullet would otherwise sit there until something
             else did. */
          el.querySelectorAll('li')[at.index]?.remove();
          onListBreak?.(lines.join('\n'));
        }
      }}
      onInput={
        list
          ? (e: React.FormEvent<HTMLElement>) => {
              /* An item the browser made (Enter at the end of one) carries no
                 depth of its own, so it takes the depth of the item above --
                 which is what continuing a sub-list means. */
              let depth = 0;
              e.currentTarget.querySelectorAll('li').forEach((li) => {
                if (li.hasAttribute('data-depth')) depth = itemDepth(li);
                else setItemDepth(li, depth, ordered);
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

/** The shared item style, as React wants it. */
function cssFromText(style: string): React.CSSProperties {
  const out: Record<string, string> = {};
  style.split(';').forEach((rule) => {
    const [prop, value] = rule.split(':');
    if (!prop || !value) return;
    const key = prop.trim().replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
    out[key] = value.trim();
  });
  return out as React.CSSProperties;
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
  const items = Array.from(root.querySelectorAll('li'));
  const index = items.findIndex((li) => li.contains(sel.anchorNode));
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
