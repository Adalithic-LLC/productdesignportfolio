/**
 * Mapping between a live text selection and the stored string behind it.
 *
 * The toolbar works in plain-text offsets -- "characters 12 to 25 of this
 * field" -- because that is what survives the round trip: the stored value may
 * carry mark tokens, and the DOM may carry mark spans, but both agree on the
 * text a reader sees. Everything here converts between the two.
 */
import { domToSegments, plainLength } from './inlineMarks';

export interface MarkSelection {
  /** Dot path of the field the selection sits in. */
  path: string;
  /** Plain-text offsets, start inclusive, end exclusive. */
  start: number;
  end: number;
  /** The selected text itself, for the toolbar to show. */
  text: string;
}

/** The editable field a node sits in, if any. */
export function editableHost(node: Node | null): HTMLElement | null {
  let el: Node | null = node;
  while (el && el.nodeType !== Node.ELEMENT_NODE) el = el.parentNode;
  return (el as Element | null)?.closest<HTMLElement>('[data-editable-path]') ?? null;
}

/**
 * Read the current selection as offsets into one field's plain text. Returns
 * null unless it is a real range sitting inside a single editable field.
 */
export function readSelection(): MarkSelection | null {
  const sel = typeof window === 'undefined' ? null : window.getSelection();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return null;
  const range = sel.getRangeAt(0);
  const host = editableHost(range.startContainer);
  if (!host || host !== editableHost(range.endContainer)) return null;
  const path = host.dataset.editablePath;
  if (!path) return null;

  const before = range.cloneRange();
  before.selectNodeContents(host);
  before.setEnd(range.startContainer, range.startOffset);
  const start = plainLength(before.cloneContents());
  const text = domToSegments(range.cloneContents())
    .map((s) => s.text)
    .join('');
  if (!text) return null;
  return { path, start, end: start + text.length, text };
}

/** The field element for a path, as it is on the page right now. */
export function fieldFor(path: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(
    `[data-editable-path="${CSS.escape(path)}"]`
  );
}

/**
 * Put the selection back over the same characters after a field has been
 * re-rendered, so a mark can be recoloured or resized without picking the
 * words out again.
 */
export function selectPlainRange(host: HTMLElement, start: number, end: number): void {
  const range = document.createRange();
  let at = 0;
  let startSet = false;

  const walk = (node: Node): boolean => {
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === Node.TEXT_NODE) {
        const len = (child as Text).data.length;
        if (!startSet && at + len >= start) {
          range.setStart(child, Math.max(0, start - at));
          startSet = true;
        }
        if (startSet && at + len >= end) {
          range.setEnd(child, Math.max(0, end - at));
          return true;
        }
        at += len;
        continue;
      }
      if (child.nodeType !== Node.ELEMENT_NODE) continue;
      if ((child as Element).tagName === 'BR') {
        at += 1;
        continue;
      }
      if (walk(child)) return true;
    }
    return false;
  };

  if (!walk(host) || !startSet) return;
  const sel = window.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(range);
}
