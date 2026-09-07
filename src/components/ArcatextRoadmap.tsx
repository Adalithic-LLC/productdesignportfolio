import { Fragment } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

/**
 * Product roadmap closing the Strategy section. The keyboard demo earlier on
 * the page is Phase 1 (live today); this lays out Phases 2–4 as the next steps
 * — cards (title · value · concepts) connected by animated dashed arrows,
 * styled to match the site's system diagrams.
 *
 * The phases run left to right as a row, so the sequence reads as a timeline.
 * Cards are a fixed width and the row hugs them rather than stretching, and it
 * falls back to a stacked column where a row will not fit.
 */

type Concept = { text: string; sub?: string[] };
type Phase = { n: number; title: string; value: string; concepts: Concept[] };

const PHASES: Phase[] = [
  {
    n: 2,
    title: 'Internal AI Conversation Platform',
    value: '24/7 access to customizable conversations',
    concepts: [
      {
        text: 'Create customized conversations',
        sub: ['Topic', 'Skill level', 'Specific vocabulary', 'Spaced repetition', 'Story writing'],
      },
      { text: 'Save words & phrases' },
    ],
  },
  {
    n: 3,
    title: 'Data-Driven Insights & Stats',
    value: 'Performance reporting',
    concepts: [
      { text: 'Surface missed words to users' },
      { text: 'Generate personalized study guides' },
      { text: 'Show improvement statistics' },
    ],
  },
  {
    n: 4,
    title: 'Teacher Tools',
    value: 'Assessments & accelerated student growth with data',
    concepts: [
      { text: 'Teacher-created conversation templates' },
      { text: 'Chat export for teacher evaluation' },
      { text: 'Define & save words & phrases' },
      { text: 'Teacher dashboard for student performance tracking' },
    ],
  },
];

/** Points right between cards in a row, down between them when stacked. */
function Connector() {
  return (
    <div className="flex shrink-0 items-center justify-center py-1.5 text-primary/70 lg:py-0">
      <div className="flex flex-col items-center lg:hidden">
        <span className="flow-dash-v h-6 w-0.5" aria-hidden />
        <ChevronDown className="-mt-1 h-4 w-4" aria-hidden />
      </div>
      <div className="hidden items-center lg:flex">
        <span className="flow-dash-h h-0.5 w-6" aria-hidden />
        <ChevronRight className="-ml-1 h-4 w-4" aria-hidden />
      </div>
    </div>
  );
}

function PhaseCard({ n, title, value, concepts }: Phase) {
  return (
    <div className="flex w-full flex-col rounded-2xl border border-border bg-card/60 p-5 shadow-sm lg:w-[302px]">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">
          Phase {n}
        </span>
        <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
          Next
        </span>
      </div>
      <h4 className="mt-1.5 text-base font-semibold tracking-tight">{title}</h4>

      <div className="mt-3 rounded-lg border border-accent/30 bg-accent/5 px-3 py-2">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-accent/80">Value</div>
        {/* Reserves two lines so "Concepts" starts at the same height on every
            card and the row reads as one object. */}
        <div className="min-h-[2.4rem] text-sm font-medium leading-snug">{value}</div>
      </div>

      <div className="mt-3 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/70">
        Concepts
      </div>
      <ul className="mt-1.5 space-y-1.5">
        {concepts.map((c) => (
          <li key={c.text} className="text-sm text-muted-foreground">
            <span className="mr-2 text-accent">•</span>
            {c.text}
            {c.sub && (
              <ul className="ml-5 mt-1 space-y-1">
                {c.sub.map((s) => (
                  <li key={s} className="text-[13px] text-muted-foreground/80">
                    <span className="mr-2 text-muted-foreground/40">–</span>
                    {s}
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ArcatextRoadmap() {
  return (
    <div className="w-full">
      <div className="mb-5">
        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">
          Product roadmap
        </div>
        <h3 className="text-xl font-semibold tracking-tight sm:text-2xl">Where it goes next</h3>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          The keyboard demo above is Phase 1 — live today. Phases 2–4 are the next steps in the
          strategy, growing Arcatext from a translation keyboard into a full language-learning
          platform.
        </p>
      </div>

      <div className="mx-auto flex w-fit flex-col items-stretch lg:flex-row">
        {PHASES.map((p, i) => (
          <Fragment key={p.n}>
            {i > 0 && <Connector />}
            <PhaseCard {...p} />
          </Fragment>
        ))}
      </div>
    </div>
  );
}
