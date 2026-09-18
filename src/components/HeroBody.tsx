/**
 * The hero paragraph, revealed a word at a time, with a few words that enact
 * what they say.
 *
 * The copy is admin-editable and lives in the content store, so nothing here
 * hardcodes the sentence. The text is tokenised at render time and a word only
 * picks up an effect if it is still in the copy -- edit "clarity" out and the
 * focus-pull simply stops existing. Admin mode skips all of it and renders the
 * plain `Editable`, because splitting a contentEditable into spans fights the
 * caret.
 *
 * Every animation is built as a `from`, never a `to`: the resting DOM is the
 * finished state, so when motion is turned off the paragraph is simply there.
 * A reveal that opens at opacity 0 and relies on a tween to arrive is how the
 * page went blank for reduced-motion visitors once already.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { Editable } from '@/content/Editable';
import { useContent } from '@/content/ContentContext';

/** Words that get their own beat, longest first so phrases win the match. */
const EFFECTS = {
  'fully functional': 'matrix',
  clarity: 'focus',
  limits: 'stretch',
  AI: 'chip',
} as const;

type Effect = (typeof EFFECTS)[keyof typeof EFFECTS];

const PHRASE_RE = new RegExp(
  `(${Object.keys(EFFECTS)
    .sort((a, b) => b.length - a.length)
    .map((phrase) => `\\b${phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`)
    .join('|')})`,
  'gi'
);

const REVEAL_START = 0.75;
const REVEAL_STAGGER = 0.035;

/**
 * Columns of falling digits, and how many digits deep each column runs.
 * The column count is set so the digits sit shoulder to shoulder at the 0.55em
 * they are drawn at -- at eight columns they were spaced twice their own width
 * apart and read as a few stray characters rather than rain.
 */
const RAIN_COLUMNS = 14;
const RAIN_DEPTH = 16;

type Token =
  | { kind: 'gap'; text: string }
  | { kind: 'word'; text: string; effect?: Effect };

/**
 * Splits the copy into words, keeping the whitespace as its own tokens so
 * `whitespace-pre-line` still sees the newline that makes the paragraph break,
 * and so the words wrap the way plain text would.
 */
function tokenize(text: string): Token[] {
  const lookup = new Map(
    Object.entries(EFFECTS).map(([phrase, effect]) => [phrase.toLowerCase(), effect])
  );
  const tokens: Token[] = [];

  for (const part of text.split(PHRASE_RE)) {
    if (!part) continue;
    const effect = lookup.get(part.toLowerCase());
    if (effect) {
      tokens.push({ kind: 'word', text: part, effect });
      continue;
    }
    for (const piece of part.split(/(\s+)/)) {
      if (!piece) continue;
      tokens.push(/^\s+$/.test(piece) ? { kind: 'gap', text: piece } : { kind: 'word', text: piece });
    }
  }
  return tokens;
}

export function HeroBody({ path, className }: { path: string; className?: string }) {
  const { content, isAdmin } = useContent();
  const value = String(resolve(content, path) ?? '');
  const root = useRef<HTMLSpanElement>(null);
  const [stillness] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  /**
   * The rain leaves the DOM once it has landed. `user-select: none` keeps a
   * dragged selection off the digits, but not Select All or a programmatic
   * range, so copying the paragraph came back with two hundred ones and
   * zeroes glued to the phrase. Unmounting is the only version of "not part
   * of the text" that every reader agrees on.
   */
  const [rained, setRained] = useState(false);
  const showRain = !isAdmin && !stillness && !rained;

  const tokens = useMemo(() => tokenize(value), [value]);

  /**
   * Drawn once, not per render, so the rain does not reshuffle on every React
   * pass. The columns are positioned as percentages, so they still fit the
   * phrase if the copy is edited -- only the digits are fixed.
   */
  const rain = useMemo(
    () =>
      Array.from({ length: RAIN_COLUMNS }, () =>
        Array.from({ length: RAIN_DEPTH }, () => (Math.random() < 0.5 ? '0' : '1')).join('')
      ),
    []
  );

  useEffect(() => {
    if (isAdmin) return;
    const el = root.current;
    if (!el) return;
    if (stillness) return;

    const ctx = gsap.context(() => {
      const words = gsap.utils.toArray<HTMLElement>('.hero-word', el);
      const at = (node: Element | null) =>
        REVEAL_START + (node ? words.indexOf(node as HTMLElement) : 0) * REVEAL_STAGGER;

      gsap.from(words, {
        opacity: 0,
        duration: 0.5,
        ease: 'power2.out',
        stagger: REVEAL_STAGGER,
        delay: REVEAL_START,
      });

      // "clarity" arrives out of focus and resolves.
      const focus = el.querySelector<HTMLElement>('[data-effect="focus"]');
      if (focus) {
        gsap.from(focus, {
          filter: 'blur(9px)',
          duration: 0.75,
          ease: 'expo.out',
          delay: at(focus),
        });
      }

      // "limits" is pushed past where it rests, then settles.
      const stretch = el.querySelector<HTMLElement>('[data-effect="stretch"]');
      if (stretch) {
        gsap.fromTo(
          stretch,
          { letterSpacing: '0em' },
          {
            keyframes: [
              { letterSpacing: '0.09em', duration: 0.3, ease: 'power2.out' },
              { letterSpacing: '0em', duration: 0.6, ease: 'back.out(2.2)' },
            ],
            delay: at(stretch),
          }
        );
      }

      // The sparkle beside "AI" opens the line rather than sitting in it: it
      // grows from no width at all, so the sentence makes room as it lands.
      const chip = el.querySelector<HTMLElement>('.hero-chip');
      if (chip) {
        gsap.from(chip, {
          width: 0,
          marginLeft: 0,
          scale: 0,
          rotate: -120,
          opacity: 0,
          duration: 0.6,
          ease: 'back.out(1.7)',
          delay: at(chip.closest('.hero-word')) + 0.1,
        });
      }

      // "fully functional" resolves out of a cascade of ones and zeroes. The
      // digits are an overlay on the phrase's own box, so nothing reflows and
      // the real text never has to be measured or replaced.
      const matrix = el.querySelector<HTMLElement>('[data-effect="matrix"]');
      if (matrix) {
        const start = at(matrix);
        const veil = matrix.querySelector<HTMLElement>('.hero-rain');
        const text = matrix.querySelector<HTMLElement>('.hero-rain-text');
        const columns = gsap.utils.toArray<HTMLElement>('.hero-rain-column', matrix);

        gsap.set(veil, { opacity: 1 });
        // Each column falls at its own speed as well as its own moment, so the
        // front reads as rain rather than as a rigid diagonal wipe.
        columns.forEach((column, i) => {
          gsap.fromTo(
            column,
            { yPercent: -100 },
            {
              yPercent: 100,
              duration: 0.9 + (i % 4) * 0.12,
              ease: 'none',
              delay: start + i * 0.035,
            }
          );
        });
        gsap.to(veil, {
          opacity: 0,
          duration: 0.4,
          ease: 'power1.in',
          delay: start + 0.85,
          onComplete: () => setRained(true),
        });
        gsap.from(text, { opacity: 0, duration: 0.55, ease: 'power2.out', delay: start + 0.6 });
      }
    }, el);

    return () => {
      ctx.revert();
    };
  }, [isAdmin, stillness, tokens]);

  // Admin edits plain text; the caret has no interest in per-word spans.
  if (isAdmin) {
    return <Editable as="span" path={path} className={className} multiline />;
  }

  return (
    <span ref={root} className={className}>
      {tokens.map((token, i) => {
        if (token.kind === 'gap') return token.text;
        const key = `${i}-${token.text}`;

        if (token.effect === 'matrix') {
          return (
            <span
              key={key}
              className="hero-word relative inline-block align-baseline"
              data-effect="matrix"
            >
              <span className="hero-rain-text">{token.text}</span>
              {showRain && (
              <span
                aria-hidden
                className="hero-rain pointer-events-none absolute inset-0 select-none overflow-hidden opacity-0"
              >
                {rain.map((column, c) => (
                  <span
                    key={c}
                    className="hero-rain-column absolute top-0 block font-mono text-[0.55em] leading-none tracking-tighter text-primary/60"
                    style={{ left: `${(c / RAIN_COLUMNS) * 100}%` }}
                  >
                    {column.split('').map((digit, d) => (
                      // The column falls downward, so its last digit is the
                      // leading edge: that one burns brighter, the way the
                      // head of a rain trail does.
                      <span
                        key={d}
                        className={d === RAIN_DEPTH - 1 ? 'block text-primary' : 'block'}
                      >
                        {digit}
                      </span>
                    ))}
                  </span>
                ))}
              </span>
              )}
            </span>
          );
        }

        if (token.effect === 'chip') {
          return (
            <span key={key} className="hero-word">
              {token.text}
              <span
                aria-hidden
                className="hero-chip ml-1 inline-block w-[0.7em] align-middle text-primary"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-full w-full">
                  <path d="M12 0.8l2.3 6.6 6.6 2.3-6.6 2.3L12 18.6l-2.3-6.6L3.1 9.7l6.6-2.3z" />
                  <path d="M19.4 14.6l1 2.8 2.8 1-2.8 1-1 2.8-1-2.8-2.8-1 2.8-1z" opacity="0.6" />
                </svg>
              </span>
            </span>
          );
        }

        return (
          <span
            key={key}
            className={token.effect ? 'hero-word inline-block' : 'hero-word'}
            data-effect={token.effect}
          >
            {token.text}
          </span>
        );
      })}
    </span>
  );
}

function resolve(content: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc == null || typeof acc !== 'object') return undefined;
    return (acc as Record<string, unknown>)[key];
  }, content);
}
