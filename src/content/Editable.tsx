import { useEffect, useRef } from 'react';
import type { ElementType } from 'react';
import { cn } from '@/lib/utils';
import { useContent } from './ContentContext';

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
 * In normal mode it renders plain text. In admin mode the element becomes
 * `contentEditable`; the text is managed imperatively through a ref so React
 * never re-reconciles the text node while the user is typing (which would
 * otherwise drop characters). Changes are committed to the store on blur.
 */
export function Editable({ path, as = 'span', className, multiline = false, ...rest }: EditableProps) {
  const { content, isAdmin, setText } = useContent();
  const value = String(resolveValue(content, path) ?? '');
  const ref = useRef<HTMLElement>(null);
  const Tag = as as ElementType;

  // Keep the DOM text in sync with the store, but never while focused/typing.
  useEffect(() => {
    const el = ref.current;
    if (!isAdmin || !el) return;
    if (document.activeElement !== el && el.innerText !== value) {
      el.innerText = value;
    }
  }, [isAdmin, value]);

  if (!isAdmin) {
    return (
      <Tag className={className} {...rest}>
        {value}
      </Tag>
    );
  }

  return (
    <Tag
      ref={ref}
      className={cn('admin-editable', className)}
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      data-editable-path={path}
      title={`Editing: ${path}`}
      onBlur={(e: React.FocusEvent<HTMLElement>) =>
        setText(path, e.currentTarget.innerText.replace(/\u00a0/g, ' ').trimEnd())
      }
      onKeyDown={(e: React.KeyboardEvent<HTMLElement>) => {
        if (!multiline && e.key === 'Enter') {
          e.preventDefault();
          e.currentTarget.blur();
        }
      }}
      onClick={(e: React.MouseEvent) => {
        // Editing a clicked element shouldn't trigger parent button/link handlers.
        e.stopPropagation();
        if (as === 'a') e.preventDefault();
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
