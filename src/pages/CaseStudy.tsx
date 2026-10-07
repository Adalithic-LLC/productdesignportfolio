/**
 * One Arcatext feature, on its own page, as a run of labelled sections.
 *
 * One component for all six rather than six near-identical files. The six
 * differ only in their copy, which already lives in `arcatext.features`, so
 * the slug in the route picks the entry and every field stays editable at its
 * existing content path.
 */
import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useContent } from '@/content/ContentContext';
import { Editable } from '@/content/Editable';
import { EditableImage } from '@/content/EditableImage';
import { EditableBlocks } from '@/content/EditableBlocks';
import { isMediaBlock } from '@/content/elements';
import { AdminNavEntry } from '@/components/AdminToggle';
import ArcatextKeyboard from '@/components/ArcatextKeyboard';
import RewordOptionScreen from '@/components/RewordOptionScreen';
import type { ArcatextFeature, FigureSection } from '@/content/types';
import type { ProseItem } from '@/content/proseBlocks';

/**
 * The sections, in page order: the content field on the feature, the label
 * beside it, and whether it may carry a figure. Driving the page off a list
 * rather than nine hand-written blocks means adding or reordering a section is
 * a line here.
 *
 * Six of the nine may take an image, and the three that cannot -- why it
 * mattered, the challenge, key constraints -- are a deliberate rhythm rather
 * than an oversight: a picture under every heading reads as a screenshot dump,
 * so those sections carry the argument in prose and the figures land where
 * they show something words cannot.
 */
/* `label` is the key of the heading each section opens with. The heading is a
   block in the section's own list now, not something the page prints above it,
   so it can be retitled, restyled, moved or deleted like any other block --
   and a section can carry more than one. The key is kept because it is what
   seeds a heading that a draft predates. */
const SECTIONS: {
  field: keyof ArcatextFeature;
  label: string;
  figure?: FigureSection;
}[] = [
  { field: 'whatItIs', label: 'whatItIsTitle', figure: 'whatItIs' },
  { field: 'whyItMattered', label: 'whyItMatteredTitle' },
  { field: 'problem', label: 'problemTitle' },
  { field: 'constraints', label: 'constraintsTitle' },
  { field: 'keyDecision', label: 'keyDecisionTitle', figure: 'keyDecision' },
  { field: 'solution', label: 'solutionTitle', figure: 'solution' },
  { field: 'tradeoff', label: 'tradeoffTitle', figure: 'tradeoff' },
  { field: 'validation', label: 'validationTitle', figure: 'validation' },
  { field: 'impact', label: 'impactTitle', figure: 'impact' },
];

export default function CaseStudy({ index }: { index: number }) {
  const { content, isAdmin } = useContent();
  const feature = content.arcatext.features[index];

  /** How many blocks a section holds. */
  const blocks = (field: keyof ArcatextFeature) => {
    const value = feature[field];
    return Array.isArray(value) ? value.length : 0;
  };

  /** A section with nothing written in it is left off the page rather than
      shown as a heading over blank space -- but it is kept in admin, where an
      empty slot is the only way to reach the field and fill it. */
  const shown = SECTIONS.filter(({ field }) => isAdmin || blocks(field));

  return (
    <div className="min-h-screen">
      {/* Same bar as the project pages, but pointing one level up: these are
          Arcatext's own case studies, so back means Arcatext, not the
          portfolio home. */}
      <div className="sticky top-0 z-40 border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <a
            href="#/arcatext"
            className="inline-flex items-center gap-2 text-sm font-medium text-foreground/70 transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            <Editable as="span" path="arcatext.caseStudy.back" />
          </a>
          {/* The brand holds the centre of the bar, so Admin sits beyond it on
              the far right. It renders nothing once admin is unlocked. */}
          <div className="flex items-center gap-4">
            <Editable as="span" path="arcatext.brand" className="text-sm font-semibold gradient-text" />
            <AdminNavEntry />
          </div>
        </div>
      </div>

      <article className="mx-auto max-w-6xl px-4 pb-32 pt-20 sm:px-6 sm:pt-28 lg:px-8">
        <Editable
          as="h2"
          path="arcatext.caseStudy.eyebrow"
          className="mb-6 text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground"
        />

        <h1 className="mb-14 max-w-4xl text-4xl font-bold tracking-tight text-balance sm:text-5xl">
          <Editable as="span" path={`arcatext.features.${index}.title`} className="gradient-text" />
        </h1>

        {shown.map(({ field, figure }, i) => {
          const slot = figure ? feature.figures?.[figure] : undefined;
          /* Side-by-side only when the slot actually holds something. An empty
             slot still shows in admin, so the image can be uploaded. */
          const media = !!(slot?.src || slot?.demo);
          /* The column appears in admin even when the slot is empty: that
             frame is how an image gets uploaded, and it has to be in the
             place the image will occupy for the layout to be judged. */
          const twoCol = media || (isAdmin && !!figure);
          const value = feature[field];
          const items: ProseItem[] = Array.isArray(value) ? (value as ProseItem[]) : [];
          /* Where the figure's column ends. No media block means the whole
             section travels with it, as before. */
          const firstMedia = items.findIndex(isMediaBlock);
          const splitAt = firstMedia === -1 ? items.length : firstMedia;
          return (
          <section
            key={field}
            /* The rule sits above each section but the first, so the title is
               not fenced off from the copy it heads. */
            className={i === 0 ? '' : 'mt-12 border-t border-border/40 pt-10'}
          >
            {/* Two columns only where there is something to show: a rigid
                page-wide grid would leave half the width empty beside the
                prose-only sections. The media sticks, so a tall animation
                stays in view while its prose scrolls past. */}
            {twoCol ? (
              /* The figure travels with the blocks above the section's first
                 block that brings its own picture, and stops there: two
                 columns to that point, full width from it on. Sticking past
                 that would park the section figure alongside the other
                 pictures, each competing for the same glance. */
              <>
                <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:gap-12 xl:grid-cols-[minmax(0,1fr)_minmax(0,27rem)]">
                  <Prose stacked>
                    <EditableBlocks path={`arcatext.features.${index}.${field}`} to={splitAt} />
                  </Prose>
                  <div className="mt-8 lg:mt-0 lg:sticky lg:top-24 lg:self-start">
                    <Figure index={index} section={figure!} />
                  </div>
                </div>
                {splitAt < items.length && (
                  <Prose className="mt-10">
                    <EditableBlocks path={`arcatext.features.${index}.${field}`} from={splitAt} />
                  </Prose>
                )}
              </>
            ) : (
              <>
                <Prose>
                  <EditableBlocks path={`arcatext.features.${index}.${field}`} />
                </Prose>
                {figure && <Figure index={index} section={figure} />}
              </>
            )}
          </section>
          );
        })}
      </article>
    </div>
  );
}

/**
 * The body text's measure and rhythm. `EditableBlocks` renders each block as a
 * bare element so it can be selected and reordered, which leaves the styling to
 * whatever wraps it -- hence a wrapper rather than a className on each block.
 */
function Prose({
  children,
  className,
  stacked = false,
}: {
  children: ReactNode;
  className?: string;
  /* Beside a media column there is no room for cards abreast, so a run
     stacks instead of laying out on one row. */
  stacked?: boolean;
}) {
  /* Stacked, a run of screen cards would be a tower of phones with a caption
     under each -- the column is wide enough to set the phone and its caption
     side by side instead, which keeps the run to a readable height. */
  /* Text cards go on one row however many there are; a run of pictures goes
     two across, because a phone and its caption need the width and a third
     column would set both too small to read. The `:not()` keeps the two rules
     from being settled by stylesheet order, which two bare attribute
     selectors of equal specificity would be. An odd card left alone on the
     last row spans both columns rather than sitting in half the width, and
     sets its caption beside the picture so the extra width is not one very
     long line. */
  const cardRun = stacked
    ? '[&_[data-card-row]]:grid-cols-1 sm:[&_[data-card-row]>figure]:flex-row sm:[&_[data-card-row]>figure]:items-start sm:[&_[data-card-row]>figure]:gap-6 sm:[&_[data-card-row]>figure>figcaption]:flex-1'
    : 'lg:[&_[data-card-row]:not([data-media-row])]:auto-cols-fr lg:[&_[data-card-row]:not([data-media-row])]:grid-flow-col lg:[&_[data-card-row]:not([data-media-row])]:grid-cols-none lg:[&_[data-media-row]]:grid-cols-2 lg:[&_[data-media-row]]:gap-10 lg:[&_[data-media-row]>*:last-child:nth-child(odd)]:col-span-2 lg:[&_[data-media-row]>*:last-child:nth-child(odd)]:flex-row lg:[&_[data-media-row]>*:last-child:nth-child(odd)]:items-start lg:[&_[data-media-row]>*:last-child:nth-child(odd)]:gap-10 lg:[&_[data-media-row]>*:last-child:nth-child(odd)_figure]:flex-row lg:[&_[data-media-row]>*:last-child:nth-child(odd)_figure]:items-start lg:[&_[data-media-row]>*:last-child:nth-child(odd)_figure]:gap-10 lg:[&_[data-media-row]>*:last-child:nth-child(odd)_figcaption]:flex-1';
  return (
    /* The reading measure lives on the blocks, not on this wrapper, so a block
       that wants the room can take the column's full width: a run of cards
       (`data-card-row`) and the prompt diagram (`data-wide`) opt out with
       `max-w-none`. `grid-cols-none` clears the default three-column track so
       `grid-flow-col` + `auto-cols-fr` lay every card in a run out in equal
       widths, however many there are -- stacked below lg, where a row of four
       would be unreadable. */
    <div
      className={`space-y-5 text-lg leading-relaxed text-foreground/90 [&>*]:max-w-3xl [&_p]:text-lg [&_p]:leading-relaxed [&>[data-card-row]]:max-w-none [&>[data-wide]]:max-w-none ${cardRun} ${
        className ?? ''
      }`}
    >
      {children}
    </div>
  );
}

/**
 * A section's image. Hidden entirely until one is set, so a page with no
 * artwork yet has no empty frames in it; in admin the frame always shows,
 * because clicking it is how an image gets uploaded.
 */
function Figure({ index, section }: { index: number; section: FigureSection }) {
  const { content, isAdmin } = useContent();
  /* Optional, not assumed. An admin save writes back the whole content file
     from the page that was open, so a save made before a slot existed drops
     it -- and reading `.src` off the missing key used to throw and blank the
     whole page. A slot the content does not carry is simply not rendered. */
  const figure = content.arcatext.features[index]?.figures?.[section];
  if (!figure) return null;
  /* A slot earns its place with an image OR a built-in demo; without either
     there is nothing to show a visitor. */
  if (!figure.src && !figure.demo && !isAdmin) return null;

  const base = `arcatext.features.${index}.figures.${section}`;

  /* A slot can name a built-in animation instead of carrying an image. The
     keyboard runs in compact mode here: the prose beside it is the commentary,
     so it needs the phone and its controls, not the full feature's header and
     context card. */
  if (figure.demo === 'reword') {
    return (
      <figure className="mt-0">
        {/* Same scale as the Arcatext page's full feature, so the phone reads
            at one size across the site. The media column is sized to fit it. */}
        <ArcatextKeyboard compact />
        {(figure.caption || isAdmin) && (
          <Editable
            as="figcaption"
            path={`${base}.caption`}
            multiline
            className={`mt-3 text-sm text-muted-foreground ${isAdmin ? 'min-h-5' : ''}`}
          />
        )}
      </figure>
    );
  }

  /* The same slot can name a still instead: the keyboard mid-reword, drawn
     rather than animated, so the prose beside it does the explaining. */
  if (figure.demo === 'reword-still') {
    return (
      <figure className="mt-0">
        <RewordOptionScreen screen="reword" scale={0.68} />
        {(figure.caption || isAdmin) && (
          <Editable
            as="figcaption"
            path={`${base}.caption`}
            multiline
            className={`mt-4 text-sm leading-relaxed text-muted-foreground ${isAdmin ? 'min-h-5' : ''}`}
          />
        )}
      </figure>
    );
  }

  return (
    <figure className="mt-8">
      {/* Direction for the slot, not page copy: admin only. */}
      {isAdmin && figure.note && (
        <p className="mb-2 rounded-lg border border-dashed border-primary/30 bg-primary/5 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
          {figure.note}
        </p>
      )}
      <div className="overflow-hidden rounded-xl border border-border/50 bg-muted/40">
        <EditableImage
          path={`${base}.src`}
          altPath={`${base}.alt`}
          className="block h-auto w-full"
          wrapperClassName="block w-full min-h-40"
        />
      </div>
      {(figure.caption || isAdmin) && (
        <Editable
          as="figcaption"
          path={`${base}.caption`}
          multiline
          className={`mt-3 text-sm text-muted-foreground ${isAdmin ? 'min-h-5' : ''}`}
        />
      )}
    </figure>
  );
}
