import { useState } from 'react';
import ArcatextKeyboard, { type Scene } from '@/components/ArcatextKeyboard';
import { TryItOut } from '@/components/prototype/TryItOut';
import { Editable } from '@/content/Editable';

/**
 * The keyboard in motion, and the first thing the Arcatext page shows: one
 * phone per view, each playing its own loop, in a row that scrolls sideways.
 * The row starts on the page's content column (the max-w-6xl column the
 * section headers sit in) and runs out to the right edge of the window.
 *
 * It introduces itself -- phones playing is not a thing that needs a heading
 * to say what it is -- so the only copy here is an eyebrow and a description
 * under each phone (arcatext.interactive.cards, in the same order as PHONES;
 * the prototype card at the head of the row has its own pair, since it is not
 * one of them). The heading copy is left in the content file rather than
 * deleted, in case it is wanted back.
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
      <div
        /* The row still scrolls sideways; it just does not say so with a bar
           across the width of the window. The phones running past the right
           edge are the affordance. */
        className="flex snap-x snap-mandatory gap-10 overflow-x-auto pb-6 pt-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{
          paddingLeft: 'calc(max(0px, (100% - 72rem) / 2) + var(--g))',
          paddingRight: 'var(--g)',
          scrollPaddingLeft: 'calc(max(0px, (100% - 72rem) / 2) + var(--g))',
        }}
      >
        {/* The one you can use comes first, at the same size as the ones
            playing: the row reads as five keyboards running and one to pick
            up, rather than a demo and an advert for it. */}
        <figure className="flex shrink-0 snap-start flex-col" style={{ width: CARD_W }}>
          <TryItOut variant="phone" width={CARD_W} phoneScale={SCALE} />
          <figcaption className="mt-5">
            <Editable
              as="div"
              path="arcatext.interactive.prototype.eyebrow"
              className="text-xs font-semibold uppercase tracking-[0.18em] text-primary"
            />
            <Editable
              as="p"
              path="arcatext.interactive.prototype.body"
              multiline
              className="mt-2 text-sm leading-relaxed text-muted-foreground"
            />
          </figcaption>
        </figure>

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
