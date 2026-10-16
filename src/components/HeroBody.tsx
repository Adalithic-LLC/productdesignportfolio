/**
 * Hero copy, typed into view a character at a time. Used for both the title
 * and the paragraph beneath it, which is why it takes its start time as a
 * prop: the two are chained so the typing reads as one hand working down the
 * column rather than two that overlap.
 *
 * The copy is there from the first frame -- every character is in the DOM,
 * holding its own space, and only `visibility` is flipped as the typing
 * reaches it. There is no cursor: one riding the last character typed dropped
 * to the next line whenever that character was a space at a line break. So the paragraph is its final size before a word of it can be
 * read, and nothing below it moves while it types. A reveal that built the
 * text up instead would reflow the page on every character and shift the
 * previews under it line by line.
 *
 * The copy is admin-editable and lives in the content store, so nothing here
 * hardcodes the sentence -- it is split at render time. Admin mode renders the
 * plain `Editable`, because splitting a contentEditable into per-character
 * spans fights the caret; the speed is set there instead and watched in
 * Preview.
 *
 * Inline marks in the copy are drawn as the words they sit on are typed: a
 * mark covering several words is cut into a span per word, each starting on
 * that word's first character and drawing for exactly as long as the word
 * takes to type. The pieces carry their position in the run (see `MarkPiece`)
 * so they still read as one mark.
 *
 * Nothing here opens invisible to a visitor who has asked for less motion:
 * then the copy is simply there, which is how this page went blank for those
 * visitors once already.
 */
import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { Editable } from '@/content/Editable';
import { useContent } from '@/content/ContentContext';
import { AnimatedMark, markProps, parseMarks } from '@/content/inlineMarks';
import { REVEAL_START, SPEED_LIMITS, typeSpeed } from '@/lib/heroReveal';

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
 * A word with the whitespace that leads up to it (and, for the last one, what
 * trails it), so a mark cut into per-word pieces still covers the spaces
 * between those words -- a highlight with gaps at every space is not a
 * highlight.
 */
type Piece = { lead: string; word: string; trail: string };

function toPieces(tokens: Token[]): Piece[] {
  const pieces: Piece[] = [];
  let lead = '';
  for (const token of tokens) {
    if (token.kind === 'gap') {
      if (pieces.length && !pieces[pieces.length - 1].word) pieces[pieces.length - 1].trail += token.text;
      else lead += token.text;
      continue;
    }
    pieces.push({ lead, word: token.text, trail: '' });
    lead = '';
  }
  if (lead && pieces.length) pieces[pieces.length - 1].trail += lead;
  return pieces;
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function HeroBody({
  path,
  className,
  delay = REVEAL_START,
  speed,
}: {
  path: string;
  className?: string;
  /** When the typing starts, in seconds after mount. */
  delay?: number;
  /** Characters a second. */
  speed: number;
}) {
  const { content, isAdmin } = useContent();
  const value = String(resolve(content, path) ?? '');
  const root = useRef<HTMLSpanElement>(null);

  /* Decided once, at mount, and used by both the render and the effect: they
     have to agree, or the copy is laid out hidden with nothing to reveal it. */
  const [typing] = useState(() => !prefersReducedMotion());
  const animate = typing && !isAdmin;

  /* Marked runs first, words inside them, characters inside those: a highlight
     that covers three words has to be one box with the spaces inside it, and
     each word has to know which character of the whole block it starts at. */
  const segments = useMemo(() => parseMarks(value), [value]);

  const body = useMemo(() => {
    let charsBefore = 0;

    /** Characters as spans, so each can be shown on its own. */
    const chars = (text: string, key: string) =>
      Array.from(text).map((ch, i) => (
        <span key={`${key}-${i}`} className="hero-char" style={animate ? HIDDEN : undefined}>
          {ch}
        </span>
      ));

    const run = (tokens: Token[], key: string) =>
      tokens.map((token, i) =>
        token.kind === 'gap' ? (
          <Fragment key={`${key}-g${i}`}>{chars(token.text, `${key}-g${i}`)}</Fragment>
        ) : (
          <span key={`${key}-w${i}`} className="hero-word">
            {chars(token.text, `${key}-w${i}`)}
          </span>
        )
      );

    return segments.map((seg, si) => {
      const tokens = tokenize(seg.text);
      const startChar = charsBefore;
      charsBefore += seg.text.length;

      if (!seg.mark) return <Fragment key={si}>{run(tokens, `s${si}`)}</Fragment>;
      if (!seg.mark.animate || !animate) {
        return (
          <span key={si} {...markProps(seg.mark)}>
            {run(tokens, `s${si}`)}
          </span>
        );
      }

      /* One piece per word, each drawing over exactly the time that word takes
         to type, so the mark arrives with the typing rather than ahead of or
         behind it. A segment with no words in it (whitespace between two
         marks) has nothing to time, so it stays whole. */
      const pieces = toPieces(tokens);
      if (pieces.length === 0) {
        return (
          <AnimatedMark key={si} spec={seg.mark} delay={delay + startChar / speed}>
            {run(tokens, `s${si}`)}
          </AnimatedMark>
        );
      }
      const mark = seg.mark;
      let at = startChar;
      return (
        <Fragment key={si}>
          {pieces.map((piece, pi) => {
            const text = piece.lead + piece.word + piece.trail;
            const from = at;
            at += text.length;
            return (
              <AnimatedMark
                key={pi}
                spec={mark}
                delay={delay + from / speed}
                duration={text.length / speed}
                piece={
                  pieces.length === 1
                    ? 'only'
                    : pi === 0
                      ? 'first'
                      : pi === pieces.length - 1
                        ? 'last'
                        : 'middle'
                }
              >
                {run(tokenize(text), `s${si}-p${pi}`)}
              </AnimatedMark>
            );
          })}
        </Fragment>
      );
    });
  }, [segments, animate, delay, speed]);

  useEffect(() => {
    if (!animate) return;
    const el = root.current;
    if (!el) return;
    const letters = Array.from(el.querySelectorAll<HTMLElement>('.hero-char'));
    if (letters.length === 0) return;

    /* Hidden here as well as at render: the cleanup below hands every
       character back its visibility, and React will not re-apply a style it
       believes is already set, so a second run of this effect -- a speed
       change, or StrictMode in development -- would otherwise find the whole
       block already showing and have nothing left to type. */
    letters.forEach((letter) => (letter.style.visibility = 'hidden'));

    let shown = 0;
    const startAt = performance.now() + delay * 1000;

    const step = (now: number) => {
      const want = Math.min(
        letters.length,
        Math.max(0, Math.floor(((now - startAt) / 1000) * speed))
      );
      if (want !== shown) {
        for (let i = shown; i < want; i++) letters[i].style.visibility = 'visible';
        shown = want;
      }
      if (shown < letters.length) frame = requestAnimationFrame(step);
    };

    let frame = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(frame);
      // Whatever interrupted this -- an edit, a theme change, a speed change --
      // must not leave the copy half written.
      letters.forEach((letter) => (letter.style.visibility = ''));
    };
  }, [animate, delay, speed, body]);

  // Admin edits plain text; the caret has no interest in per-character spans.
  if (isAdmin) {
    return <Editable as="span" path={path} className={className} multiline />;
  }

  return (
    <span ref={root} className={className}>
      {body}
    </span>
  );
}

const HIDDEN = { visibility: 'hidden' } as const;

/**
 * The typing speed, set in admin and stored with the copy.
 *
 * It sits under the hero rather than in the admin bar because it belongs to
 * this copy, and it is only shown in admin: a visitor has no speed to choose.
 * Admin itself renders the copy as plain editable text, so the way to watch a
 * speed is Preview, which is what the line says.
 */
export function HeroTypingSpeed() {
  const { content, isAdmin, setText } = useContent();
  if (!isAdmin) return null;
  const speed = typeSpeed(content.hero.typeSpeed);
  const set = (n: number) =>
    setText('hero.typeSpeed', String(Math.min(SPEED_LIMITS.max, Math.max(SPEED_LIMITS.min, n))));
  const btn =
    'inline-flex h-6 w-6 items-center justify-center rounded-md border border-border/70 text-muted-foreground transition hover:border-foreground/40 hover:text-foreground disabled:opacity-40';
  return (
    <div contentEditable={false} className="mt-6 flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60">
        Typing speed
      </span>
      <button type="button" className={btn} disabled={speed <= SPEED_LIMITS.min} onClick={() => set(speed - 5)}>
        −
      </button>
      <span className="w-16 text-center tabular-nums">{speed} ch/s</span>
      <button type="button" className={btn} disabled={speed >= SPEED_LIMITS.max} onClick={() => set(speed + 5)}>
        +
      </button>
      <span className="ml-1 opacity-60">— Preview to watch it play</span>
    </div>
  );
}

function resolve(content: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc == null || typeof acc !== 'object') return undefined;
    return (acc as Record<string, unknown>)[key];
  }, content);
}
