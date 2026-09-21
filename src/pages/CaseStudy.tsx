/**
 * One Arcatext feature, on its own page, as a run of labelled sections: what
 * it is, why it mattered, problem, constraints, key decision, solution,
 * tradeoff, validation, impact.
 *
 * One component for all six rather than six near-identical files. The six
 * differ only in their copy, which already lives in `arcatext.features`, so
 * the slug in the route picks the entry and every field stays editable at its
 * existing content path.
 */
import { ArrowLeft } from 'lucide-react';
import { useContent } from '@/content/ContentContext';
import { Editable } from '@/content/Editable';
import type { ArcatextFeature } from '@/content/types';

/**
 * The sections, in page order: the content field on the feature, and the label
 * beside it. Driving the page off a list rather than nine hand-written blocks
 * means adding or reordering a section is a line here.
 *
 * `body` leads because it is the brief description the strip's card already
 * shows -- one field, so the card and the page cannot drift apart.
 */
const SECTIONS: { field: keyof ArcatextFeature; label: string }[] = [
  { field: 'body', label: 'whatItIsTitle' },
  { field: 'whyItMattered', label: 'whyItMatteredTitle' },
  { field: 'problem', label: 'problemTitle' },
  { field: 'constraints', label: 'constraintsTitle' },
  { field: 'keyDecision', label: 'keyDecisionTitle' },
  { field: 'solution', label: 'solutionTitle' },
  { field: 'tradeoff', label: 'tradeoffTitle' },
  { field: 'validation', label: 'validationTitle' },
  { field: 'impact', label: 'impactTitle' },
];

export default function CaseStudy({ index }: { index: number }) {
  const { content, isAdmin } = useContent();
  const feature = content.arcatext.features[index];

  /* A section with nothing written in it is left off the page rather than
     shown as a heading over blank space -- but it is kept in admin, where an
     empty slot is the only way to reach the field and fill it. */
  const shown = SECTIONS.filter(({ field }) => isAdmin || feature[field]);

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

        {shown.map(({ field, label }, i) => (
          <section
            key={field}
            /* The rule sits above each section but the first, so the title is
               not fenced off from the copy it heads. */
            className={i === 0 ? '' : 'mt-12 border-t border-border/40 pt-10'}
          >
            <Editable
              as="h2"
              path={`arcatext.caseStudy.${label}`}
              className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground"
            />
            <Editable
              as="p"
              path={`arcatext.features.${index}.${field}`}
              multiline
              /* min-h in admin only: an empty paragraph collapses to nothing,
                 and a target with no height cannot be clicked into. */
              className={`text-lg leading-relaxed text-foreground/90 ${
                isAdmin ? 'min-h-7' : ''
              }`}
            />
          </section>
        ))}
      </article>
    </div>
  );
}
