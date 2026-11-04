import { useEffect, useMemo, useRef } from 'react';
import type { ElementType } from 'react';
import { cn } from '@/lib/utils';
import { useContent } from './ContentContext';
import { domToValue, renderMarks, toHtml } from './inlineMarks';

type EditableTag = 'span' | 'p' | 'div' | 'h1' | 'h2' | 'h3' | 'h4' | 'a' | 'dt' | 'dd' | 'figcaption';

interface EditableProps {
  /** Dot path into the content store, e.g. "hero.title" or "projects.items.0.title". */
  path: string;
  as?: EditableTag;
  className?: string;
  /** Allow line breaks (Enter inserts a newline instead of committing). */
  multiline?: boolean;
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
export function Editable({ path, as = 'span', className, multiline = false, ...rest }: EditableProps) {
  const { content, canEdit, previewing, setText } = useContent();
  const value = String(resolveValue(content, path) ?? '');
  const ref = useRef<HTMLElement>(null);
  const Tag = as as ElementType;
  const html = useMemo(() => toHtml(value), [value]);

  // Keep the DOM in sync with the store, but never while focused/typing. The
  // comparison is on what the DOM *means* rather than on its markup, because
  // the browser rewrites the markup it is given (attribute order, quoting) and
  // a string comparison would then rewrite the field on every render.
  useEffect(() => {
    const el = ref.current;
    if (!canEdit || !el) return;
    if (document.activeElement !== el && domToValue(el) !== value) {
      el.innerHTML = html;
    }
  }, [canEdit, html, value]);

  if (!canEdit) {
    return (
      <Tag className={className} {...rest}>
        {renderMarks(value)}
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
      onBlur={(e: React.FocusEvent<HTMLElement>) => setText(path, domToValue(e.currentTarget))}
      onKeyDown={(e: React.KeyboardEvent<HTMLElement>) => {
        if (!multiline && e.key === 'Enter') {
          e.preventDefault();
          e.currentTarget.blur();
        }
      }}
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

function resolveValue(content: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc == null || typeof acc !== 'object') return undefined;
    return (acc as Record<string, unknown>)[key];
  }, content);
}
