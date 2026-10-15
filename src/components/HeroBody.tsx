/**
 * Hero copy, read into view a word at a time. Used for both the title and the
 * paragraph beneath it, which is why it takes its start time as a prop: the
 * two are chained so the reveal reads as one sweep down the column rather than
 * two that overlap.
 *
 * Each word starts as a faded version of the body colour and darkens to it in
 * sequence, so the sentence arrives at about the pace it is read rather than
 * appearing all at once.
 *
 * It is a colour tween rather than an opacity one on purpose: the hero has a
 * mesh gradient behind it, and fading the glyphs' alpha lets that gradient
 * show through the letterforms. Tweening the colour keeps the type solid the
 * whole way. The faded end is the body colour's own hue at low alpha, so it
 * reads as light grey on the light theme and dark grey on the dark one
 * without either being hardcoded.
 *
 * The copy is admin-editable and lives in the content store, so nothing here
 * hardcodes the sentence -- it is tokenised at render time. Admin mode renders
 * the plain `Editable`, because splitting a contentEditable into per-word
 * spans fights the caret.
 *
 * Inline marks in the copy are drawn on the same clock as the words they sit
 * under: each one is handed the moment its first word is read in, rather than
 * waiting to be scrolled into view like a mark further down the page. The hero
 * is already on screen when the reveal plays, so a scroll trigger there would
 * either fire at once or never.
 *
 * The tween is a `from`, never a `to`: the resting DOM is the finished state,
 * so with motion turned off the paragraph is simply there. A reveal that opens
 * invisible and relies on a tween to arrive is how this page went blank for
 * reduced-motion visitors once already.
 */
import { Fragment, useEffect, useMemo, useRef } from 'react';
import { gsap } from 'gsap';
import { Editable } from '@/content/Editable';
import { useContent } from '@/content/ContentContext';
import { AnimatedMark, markProps, parseMarks } from '@/content/inlineMarks';
import {
  FADED_ALPHA,
  REVEAL_DURATION,
  REVEAL_STAGGER,
  REVEAL_START,
} from '@/lib/heroReveal';


type Token = { kind: 'gap' | 'word'; text: string };

/**
 * Splits the copy into words, keeping whitespace as its own tokens so
 * `whitespace-pre-line` still sees the newline that makes the paragraph break,
 * and so the words wrap exactly the way the plain text would.
 */
function tokenize(text: string): Token[] {
  return text
    .split(/(\s+)/)
    .filter(Boolean)
    .map((piece) => ({ kind: /^\s+$/.test(piece) ? 'gap' : 'word', text: piece }) as Token);
}

/**
 * The resting body colour, restated at `FADED_ALPHA`.
 *
 * The colour is read back from the element rather than rebuilt from the theme
 * token, so it follows whatever the paragraph is actually set to. Returns null
 * if the browser hands back something unparseable, in which case the reveal is
 * skipped rather than guessed at.
 */
function faded(color: string): string | null {
  const parts = color.match(/[\d.]+/g);
  if (!parts || parts.length < 3) return null;
  const [r, g, b] = parts;
  return `rgba(${r}, ${g}, ${b}, ${FADED_ALPHA})`;
}

export function HeroBody({
  path,
  className,
  delay = REVEAL_START,
}: {
  path: string;
  className?: string;
  /** When the reveal starts, in seconds after mount. */
  delay?: number;
}) {
  const { content, isAdmin } = useContent();
  const value = String(resolve(content, path) ?? '');
  const root = useRef<HTMLSpanElement>(null);

  /* Marked runs first, words inside them: a highlight that covers three words
     has to be one box with the spaces inside it, not three. */
  const segments = useMemo(() => parseMarks(value), [value]);

  const body = useMemo(() => {
    let wordsBefore = 0;
    return segments.map((seg, si) => {
      const tokens = tokenize(seg.text);
      const startWord = wordsBefore;
      wordsBefore += tokens.filter((t) => t.kind === 'word').length;
      const inner = tokens.map((token, i) =>
        token.kind === 'gap' ? (
          <Fragment key={i}>{token.text}</Fragment>
        ) : (
          <span key={i} className="hero-word">
            {token.text}
          </span>
        )
      );
      if (!seg.mark) return <Fragment key={si}>{inner}</Fragment>;
      if (!seg.mark.animate) {
        return (
          <span key={si} {...markProps(seg.mark)}>
            {inner}
          </span>
        );
      }
      /* Half a word-reveal behind the word itself, so the mark lands under copy
         that has already arrived rather than racing it. */
      return (
        <AnimatedMark
          key={si}
          spec={seg.mark}
          order={0}
          delay={delay + startWord * REVEAL_STAGGER + REVEAL_DURATION * 0.5}
        >
          {inner}
        </AnimatedMark>
      );
    });
  }, [segments, delay]);

  useEffect(() => {
    if (isAdmin) return;
    const el = root.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    // Wait a frame before reading the colour. ThemeProvider adds the `dark`
    // class from an effect of its own, and it is an ancestor, so React runs it
    // *after* this one -- measuring straight away had the dark theme fading up
    // from the light theme's near-black, a hue shift across the reveal instead
    // of the body colour arriving. One frame is enough: both effects land in
    // the same post-paint pass.
    let ctx: gsap.Context | undefined;
    const frame = requestAnimationFrame(() => {
      ctx = gsap.context(() => {
        const words = gsap.utils.toArray<HTMLElement>('.hero-word', el);
        gsap.from(words, {
          color: faded(window.getComputedStyle(el).color) ?? 'inherit',
          duration: REVEAL_DURATION,
          ease: 'power1.out',
          stagger: REVEAL_STAGGER,
          delay,
          // A finished tween leaves its end colour inline on every word, which
          // would pin the paragraph to whichever theme was live when it
          // played. Handing the colour back to the stylesheet lets the theme
          // toggle keep working afterwards.
          onComplete: () => {
            gsap.set(words, { clearProps: 'color' });
          },
        });
      }, el);
    });

    return () => {
      cancelAnimationFrame(frame);
      ctx?.revert();
    };
  }, [delay, isAdmin, segments]);

  // Admin edits plain text; the caret has no interest in per-word spans.
  if (isAdmin) {
    return <Editable as="span" path={path} className={className} multiline />;
  }

  return (
    <span ref={root} className={className}>
      {body}
    </span>
  );
}

function resolve(content: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc == null || typeof acc !== 'object') return undefined;
    return (acc as Record<string, unknown>)[key];
  }, content);
}
