/**
 * One Arcatext feature, on its own page: title, brief description, problem,
 * solution.
 *
 * One component for all six rather than six near-identical files. The six
 * differ only in their copy, which already lives in `arcatext.features`, so
 * the slug in the route picks the entry and every field stays editable at its
 * existing content path.
 */
import { ArrowLeft } from 'lucide-react';
import { Editable } from '@/content/Editable';

export default function CaseStudy({ index }: { index: number }) {
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

        <h1 className="text-4xl font-bold tracking-tight text-balance sm:text-5xl">
          <Editable as="span" path={`arcatext.features.${index}.title`} className="gradient-text" />
        </h1>

        {/* The brief description carries the page, so it is set larger than
            the section bodies below it rather than at the same size. */}
        <Editable
          as="p"
          path={`arcatext.features.${index}.body`}
          multiline
          className="mt-6 text-xl leading-snug text-foreground/80 text-balance"
        />

        <Section titlePath="arcatext.caseStudy.problemTitle" bodyPath={`arcatext.features.${index}.problem`} />
        <Section titlePath="arcatext.caseStudy.solutionTitle" bodyPath={`arcatext.features.${index}.solution`} />
      </article>
    </div>
  );
}

function Section({ titlePath, bodyPath }: { titlePath: string; bodyPath: string }) {
  return (
    <section className="mt-14 border-t border-border/40 pt-10">
      <Editable
        as="h2"
        path={titlePath}
        className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground"
      />
      <Editable as="p" path={bodyPath} multiline className="text-lg leading-relaxed text-foreground/90" />
    </section>
  );
}
