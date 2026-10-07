import { useState } from 'react';
import ArcatextKeyboard, { type Scene } from '@/components/ArcatextKeyboard';
import { Editable } from '@/content/Editable';

/**
 * The Arcatext page's "keyboard, in motion": one phone per view, each playing
 * its own loop, in a row that scrolls sideways. The row starts on the page's
 * content column (the max-w-6xl column the section headers sit in) and runs
 * out to the right edge of the window.
 *
 * Copy is content (arcatext.interactive): the heading, and an eyebrow and a
 * description under each phone, in the same order as PHONES.
 *
 * Playback: every phone plays on its own while on screen. Pause, under any
 * phone, holds the whole row; Play plays that one phone alone (the others stay
 * held); Restart replays a phone, and lets it play if the row is held.
 */

const PHONES: Scene[][] = [['type', 'reword'], ['check'], ['paste'], ['study'], ['options']];

/** Phone scale: 426pt × 0.62 ≈ 264px wide. */
const SCALE = 0.62;
const CARD_W = 264;

export default function ArcatextDemoRow() {
  const [paused, setPaused] = useState(false);
  /** The one phone playing while the row is paused. */
  const [solo, setSolo] = useState<number | null>(null);
  const isRunning = (i: number) => (solo !== null ? solo === i : !paused);

  return (
    // --g matches SectionBody's gutters (px-4 sm:px-6 lg:px-8); the column's
    // left edge is half the space the 72rem column leaves, plus that gutter.
    <div className="[--g:1rem] sm:[--g:1.5rem] lg:[--g:2rem]">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 reveal">
          <div className="mb-3 flex items-baseline gap-4">
            <span className="font-mono text-sm tracking-wider text-primary/70">00</span>
            <Editable
              as="span"
              path="arcatext.interactive.eyebrow"
              className="text-xs uppercase tracking-[0.2em] text-muted-foreground"
            />
          </div>
          <h2 className="max-w-2xl text-balance text-3xl font-bold tracking-tight sm:text-4xl">
            <Editable as="span" path="arcatext.interactive.titleLead" />{' '}
            <Editable as="span" path="arcatext.interactive.titleHighlight" className="gradient-text" />
          </h2>
          <Editable
            as="p"
            path="arcatext.interactive.description"
            multiline
            className="mt-3 max-w-xl text-sm text-muted-foreground sm:text-base"
          />
        </div>
      </div>

      <div
        className="flex snap-x snap-mandatory gap-10 overflow-x-auto pb-6 pt-2 [scrollbar-width:thin]"
        style={{
          paddingLeft: 'calc(max(0px, (100% - 72rem) / 2) + var(--g))',
          paddingRight: 'var(--g)',
          scrollPaddingLeft: 'calc(max(0px, (100% - 72rem) / 2) + var(--g))',
        }}
      >
        {PHONES.map((scenes, i) => (
          <figure key={i} className="flex shrink-0 snap-start flex-col" style={{ width: CARD_W }}>
            <ArcatextKeyboard
              scenes={scenes}
              scale={SCALE}
              running={isRunning(i)}
              onPause={() => {
                setPaused(true);
                setSolo(null);
              }}
              onPlay={() => {
                setPaused(true);
                setSolo(i);
              }}
              onRestart={() => {
                if (!isRunning(i)) setSolo(i);
              }}
            />
            <figcaption className="mt-5">
              <Editable
                as="div"
                path={`arcatext.interactive.cards.${i}.eyebrow`}
                className="text-xs font-semibold uppercase tracking-[0.18em] text-primary"
              />
              <Editable
                as="p"
                path={`arcatext.interactive.cards.${i}.body`}
                multiline
                className="mt-2 text-sm leading-relaxed text-muted-foreground"
              />
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
