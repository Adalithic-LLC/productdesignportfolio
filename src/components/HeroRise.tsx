/**
 * The blocks under the hero copy, raised into place one at a time once the
 * copy has finished typing.
 *
 * Unlike the copy itself, these do *not* hold their final height: the point is
 * that the role line sits directly under the paragraph when the page opens and
 * is pushed down as each card arrives, so the column builds itself in the order
 * it is read. Each card grows from nothing to the height it needs, and the
 * block that holds them keeps no space at all until the first one appears --
 * margins included, or the role line would start 48px lower than it looks.
 *
 * It works on the DOM rather than through props because what it raises is
 * authored content: cards an admin dropped into the hero's seams, nested
 * through a grid element and two block lists. Every cell marks itself
 * `data-rise` (see GridElement) and the slot holding them `data-rise-group`,
 * and the sequence is whatever those turn out to be, in document order.
 *
 * Nothing is hidden from a visitor who has asked for less motion, or in admin,
 * where the cards are being edited and have to be there to be clicked.
 */
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useContent } from '@/content/ContentContext';
import { RISE_DURATION, RISE_STAGGER } from '@/lib/heroReveal';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';

/**
 * Let the slot holding the cards back into the page as the first one arrives,
 * margins and all -- they are the difference between the role line starting
 * directly under the paragraph and starting 48px lower.
 */
function showGroup(group: HTMLElement, done: (fn: () => void) => void) {
  if (group.style.display) return;
  const { marginTop, marginBottom } = window.getComputedStyle(group);
  group.style.display = 'block';
  group.style.marginTop = '0px';
  group.style.marginBottom = '0px';
  void group.offsetHeight;
  group.style.transition = `margin ${RISE_DURATION}s ${EASE}`;
  group.style.marginTop = marginTop;
  group.style.marginBottom = marginBottom;
  done(() => {
    group.style.transition = '';
    group.style.marginTop = '';
    group.style.marginBottom = '';
  });
}

/** Grow one card from nothing to the height it asks for. */
function raise(unit: HTMLElement, done: (fn: () => void) => void) {
  const group = unit.closest<HTMLElement>('[data-rise-group]');
  if (group && group !== unit) showGroup(group, done);
  /* A slot with no cells of its own rises as one piece, so it brings its own
     margins with it rather than having them appear under it. */
  const own = group === unit ? window.getComputedStyle(unit) : null;
  const margins = own ? { top: own.marginTop, bottom: own.marginBottom } : null;

  // Shown before measuring, measured before collapsing: the natural height is
  // what the card will grow to, and it cannot be read off a hidden element.
  unit.style.display = unit.dataset.rise || 'block';
  const target = unit.scrollHeight;
  unit.style.overflow = 'hidden';
  unit.style.maxHeight = '0px';
  unit.style.opacity = '0';
  unit.style.transform = 'translateY(10px)';
  if (margins) {
    unit.style.marginTop = '0px';
    unit.style.marginBottom = '0px';
  }
  void unit.offsetHeight;
  unit.style.transition =
    `max-height ${RISE_DURATION}s ${EASE}, ` +
    `transform ${RISE_DURATION}s ${EASE}, ` +
    `margin ${RISE_DURATION}s ${EASE}, ` +
    `opacity ${(RISE_DURATION * 0.7).toFixed(2)}s ease-out`;
  unit.style.maxHeight = `${target}px`;
  unit.style.opacity = '1';
  unit.style.transform = 'none';
  if (margins) {
    unit.style.marginTop = margins.top;
    unit.style.marginBottom = margins.bottom;
  }

  /* Everything but `display` is handed back once the card has arrived, so it
     can reflow with the page afterwards. `display` has to stay until the whole
     sequence is over, because the rule hiding it is still live. */
  done(() => {
    unit.style.transition = '';
    unit.style.maxHeight = '';
    unit.style.overflow = '';
    unit.style.transform = '';
    unit.style.opacity = '';
    unit.style.marginTop = '';
    unit.style.marginBottom = '';
  });
}

export function HeroRise({ startAt, children }: { startAt: number; children: ReactNode }) {
  const { content, isAdmin } = useContent();
  const root = useRef<HTMLDivElement>(null);
  /* Decided at mount and used by the render as well as the effect: they have to
     agree, or the cards are laid out hidden with nothing to raise them. */
  const [staged] = useState(() => !prefersReducedMotion());
  const pending = staged && !isAdmin;

  useEffect(() => {
    const el = root.current;
    if (!pending || !el) return;

    /* A slot at a time, and inside it a cell at a time where the blocks are
       laid out in a grid -- that is what makes three cards in one grid three
       arrivals rather than one. A slot with no grid rises whole. */
    const groups = Array.from(el.querySelectorAll<HTMLElement>('[data-rise-group]'));
    const units = groups.flatMap((group) => {
      const cells = Array.from(group.querySelectorAll<HTMLElement>('[data-rise]'));
      /* The innermost marks win: a grid inside a grid is one animation per
         innermost cell, not one per nesting level. */
      const inner = cells.filter((cell) => !cells.some((o) => o !== cell && cell.contains(o)));
      return inner.length > 0 ? inner : [group];
    });
    /* Nothing to raise yet. The content arrives after the first paint, so this
       is the normal first run -- leave the region pending and wait to be told
       the blocks are there, rather than declaring the sequence over. */
    if (units.length === 0) return;
    el.dataset.riseRoot = 'pending';

    const timers: number[] = [];
    const after = (seconds: number, fn: () => void) =>
      timers.push(window.setTimeout(fn, Math.max(0, seconds) * 1000));
    const done = (fn: () => void) => after(RISE_DURATION + 0.05, fn);

    units.forEach((unit, i) => after(startAt + i * RISE_STAGGER, () => raise(unit, done)));
    after(startAt + (units.length - 1) * RISE_STAGGER + RISE_DURATION + 0.05, () => {
      el.dataset.riseRoot = 'done';
      units.forEach((unit) => (unit.style.display = ''));
      groups.forEach((group) => (group.style.display = ''));
    });

    return () => {
      timers.forEach(clearTimeout);
      // Whatever interrupted the sequence must not leave the column half built.
      el.dataset.riseRoot = 'done';
      units.forEach((unit) => unit.removeAttribute('style'));
      el.querySelectorAll<HTMLElement>('[data-rise-group]').forEach((group) =>
        group.removeAttribute('style')
      );
    };
    /* `content` is in here because the hero's blocks are authored: they land
       after the first paint, and an admin save can change them. Either way the
       sequence is rebuilt from what is on the page now. */
  }, [pending, startAt, content]);

  return (
    <div ref={root} data-rise-root={pending ? 'pending' : 'done'}>
      {children}
    </div>
  );
}
