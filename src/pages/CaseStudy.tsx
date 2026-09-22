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
import type { ArcatextFeature, FigureSection } from '@/content/types';

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
          <Editable as="span" path="arcatext.brand" className="text-sm font-semibold gradient-text" />
        </div>
      </div>

      <article className="mx-auto max-w-3xl px-4 pb-32 pt-20 sm:px-6 sm:pt-28 lg:px-8">
        <Editable
          as="h2"
          path="arcatext.caseStudy.eyebrow"
          className="mb-6 text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground"
        />

        <h1 className="mb-14 text-4xl font-bold tracking-tight text-balance sm:text-5xl">
          <Editable as="span" path={`arcatext.features.${index}.title`} className="gradient-text" />
        </h1>

        {shown.map(({ field, figure }, i) => (
          <section
            key={field}
            /* The rule sits above each section but the first, so the title is
               not fenced off from the copy it heads. */
            className={i === 0 ? '' : 'mt-12 border-t border-border/40 pt-10'}
          >
            <Prose>
              <EditableBlocks path={`arcatext.features.${index}.${field}`} />
            </Prose>
            {figure && <Figure index={index} section={figure} />}
          </section>
        ))}
      </article>
    </div>
  );
}

/**
 * The body text's measure and rhythm. `EditableBlocks` renders each block as a
 * bare element so it can be selected and reordered, which leaves the styling to
 * whatever wraps it -- hence a wrapper rather than a className on each block.
 */
function Prose({ children, className }: { children: ReactNode; className?: string }) {
  return (
    /* A run of cards goes on one row and breaks out past the prose column.
       The article is held to a reading measure, which is right for paragraphs
       but would put four cards in two rows of very narrow columns. `grid-cols-none`
       clears the default three-column track so `grid-flow-col` + `auto-cols-fr`
       can lay every card in the run out in equal widths, however many there
       are. Stacked below lg, where a row of four would be unreadable. */
    <div
      className={`space-y-5 text-lg leading-relaxed text-foreground/90 [&_p]:text-lg [&_p]:leading-relaxed lg:[&_[data-card-row]]:-mx-24 lg:[&_[data-card-row]]:auto-cols-fr lg:[&_[data-card-row]]:grid-flow-col lg:[&_[data-card-row]]:grid-cols-none xl:[&_[data-card-row]]:-mx-40 ${
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
  if (!figure?.src && !isAdmin) return null;
  if (!figure) return null;

  const base = `arcatext.features.${index}.figures.${section}`;
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
