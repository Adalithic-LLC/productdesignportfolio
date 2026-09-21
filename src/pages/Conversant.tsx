import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowLeft, ArrowRight, Check, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useContent } from '@/content/ContentContext';
import { Editable } from '@/content/Editable';
import { EditableBlocks, ItemGroup, SectionBody } from '@/content/EditableBlocks';
import { SectionToc, SectionNavDropdown } from '@/components/SectionToc';
import { ReorderableSections } from '@/components/ReorderableSections';

gsap.registerPlugin(ScrollTrigger);

function SectionHeader({
  number,
  eyebrowPath,
  titlePath,
  highlightPath,
}: {
  number: string;
  eyebrowPath: string;
  titlePath: string;
  highlightPath: string;
}) {
  return (
    <div className="mb-12 lg:mb-16">
      <div className="flex items-baseline gap-4 mb-4">
        <span className="text-sm font-mono text-primary/70 tracking-wider">{number}</span>
        <Editable
          as="span"
          path={eyebrowPath}
          className="text-xs uppercase tracking-[0.2em] text-muted-foreground"
        />
      </div>
      <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-balance max-w-3xl">
        <Editable as="span" path={titlePath} />{' '}
        <Editable as="span" path={highlightPath} className="gradient-text" />
      </h2>
    </div>
  );
}

function Prose({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-5 text-base sm:text-lg text-muted-foreground leading-relaxed max-w-3xl">
      {children}
    </div>
  );
}

/** Renders a prose section as editable blocks (paragraphs + inserted headings). */
function Paragraphs({ base }: { base: string; items?: readonly unknown[] }) {
  return <EditableBlocks path={base} />;
}

/** Renders an array of strings as editable pill/chips. */
function Chips({ base, items }: { base: string; items: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((_, i) => (
        <Editable
          key={i}
          as="span"
          path={`${base}.${i}`}
          className="px-3 py-1.5 text-sm rounded-full bg-muted/60 text-foreground/85"
        />
      ))}
    </div>
  );
}

const tocItems = [
  { id: 'sec-01', n: '01' },
  { id: 'sec-02', n: '02' },
  { id: 'sec-03', n: '03' },
  { id: 'sec-04', n: '04' },
  { id: 'sec-05', n: '05' },
  { id: 'sec-06', n: '06' },
  { id: 'sec-07', n: '07' },
  { id: 'sec-08', n: '08' },
  { id: 'sec-09', n: '09' },
  { id: 'sec-10', n: '10' },
];

export default function Conversant() {
  const rootRef = useRef<HTMLDivElement>(null);
  const { content } = useContent();
  const c = content.conversant;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>('.reveal').forEach((el) => {
        gsap.fromTo(
          el,
          { opacity: 0, y: 30 },
          {
            opacity: 1,
            y: 0,
            duration: 0.7,
            ease: 'expo.out',
            scrollTrigger: {
              trigger: el,
              start: 'top 88%',
              toggleActions: 'play none none reverse',
            },
          }
        );
      });
    }, rootRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={rootRef} className="relative">
      <SectionToc items={tocItems} labels={content.conversant.toc} routeHash="#/conversant" order={content.conversant.sectionOrder} />

      {/* Top bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-background/70 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <a
            href="#home"
            className="inline-flex items-center gap-2 text-sm font-medium text-foreground/70 hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <Editable as="span" path="conversant.backToPortfolio" />
          </a>
          <SectionNavDropdown items={tocItems} labels={content.conversant.toc} routeHash="#/conversant" order={content.conversant.sectionOrder} />
          <Editable as="span" path="conversant.brand" className="text-sm font-semibold gradient-text" />
        </div>
      </div>

      {/* Hero */}
      <section className="relative pt-40 pb-24 sm:pt-48 sm:pb-32 overflow-hidden">
        <div
          className="absolute inset-0 -z-10 opacity-60"
          style={{
            background:
              'radial-gradient(ellipse at 20% 20%, hsl(var(--primary) / 0.18) 0%, transparent 55%), radial-gradient(ellipse at 80% 0%, hsl(var(--accent) / 0.14) 0%, transparent 50%)',
          }}
        />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Heads the hero the way the Arcatext page's does, above the
              status pill so it reads as the section's name rather than as a
              second label on the pill. */}
          <Editable
            as="h2"
            path="conversant.hero.eyebrow"
            className="mb-6 text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground"
          />

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <Editable as="span" path="conversant.hero.status" className="text-xs font-medium text-primary tracking-wide" />
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-6 text-balance">
            <Editable as="span" path="conversant.hero.title" className="gradient-text" />
          </h1>
          <Editable
            as="p"
            path="conversant.hero.subtitle"
            multiline
            className="text-xl sm:text-2xl md:text-3xl text-foreground/80 max-w-3xl leading-snug mb-10 text-balance"
          />

          <div className="flex flex-wrap gap-2 mb-10">
            {c.hero.typeTags.map((_, i) => (
              <Editable
                key={i}
                as="span"
                path={`conversant.hero.typeTags.${i}`}
                className="px-3 py-1.5 text-xs font-medium rounded-full bg-card border border-border/50 text-foreground/80"
              />
            ))}
          </div>

          <dl className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl border-t border-border/40 pt-8">
            <div>
              <Editable as="dt" path="conversant.hero.roleLabel" className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2 block" />
              <Editable as="dd" path="conversant.hero.roleValue" className="text-sm text-foreground/90" />
            </div>
            <div>
              <Editable as="dt" path="conversant.hero.platformLabel" className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2 block" />
              <Editable as="dd" path="conversant.hero.platformValue" className="text-sm text-foreground/90" />
            </div>
            <div>
              <Editable as="dt" path="conversant.hero.surfaceLabel" className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2 block" />
              <Editable as="dd" path="conversant.hero.surfaceValue" className="text-sm text-foreground/90" />
            </div>
          </dl>
        </div>
      </section>

      {/* 01 — Overview */}
      <ReorderableSections pageKey="conversant">
      <section id="sec-01" className="py-20 sm:py-28 scroll-mt-24">
        <SectionBody id="conversant-01">
          <div className="reveal">
            <SectionHeader number="01" eyebrowPath="conversant.overview.eyebrow" titlePath="conversant.overview.titleLead" highlightPath="conversant.overview.titleHighlight" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            <div className="lg:col-span-7 reveal">
              <Prose>
                <Paragraphs base="conversant.overview.intro" items={c.overview.intro} />
              </Prose>
            </div>

            <aside className="lg:col-span-5 reveal">
              <div className="rounded-2xl bg-muted/40 p-8">
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-primary mb-4">
                  <Layers className="w-4 h-4" />
                  <Editable as="span" path="conversant.overview.productTypeLabel" />
                </div>
                <ItemGroup as="ul" path="conversant.overview.productTypeList" className="space-y-3 text-foreground/90">
                  {c.overview.productTypeList.map((_, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary/70 shrink-0" />
                      <Editable as="span" path={`conversant.overview.productTypeList.${i}`} />
                    </li>
                  ))}
                </ItemGroup>
              </div>
            </aside>
          </div>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="reveal">
              <Editable as="h3" path="conversant.overview.roleTitle" className="text-xl sm:text-2xl font-semibold mb-6" />
              <Chips base="conversant.overview.roleList" items={c.overview.roleList} />
            </div>
            <div className="reveal">
              <Editable as="h3" path="conversant.overview.usersLabel" className="text-xl sm:text-2xl font-semibold mb-6" />
              <Chips base="conversant.overview.usersList" items={c.overview.usersList} />
            </div>
          </div>

          <div className="mt-12 reveal">
            <Editable as="h3" path="conversant.overview.workstreamsLabel" className="text-xs uppercase tracking-[0.2em] text-primary mb-5" />
            <Chips base="conversant.overview.workstreamsList" items={c.overview.workstreamsList} />
          </div>
        </SectionBody>
      </section>

      {/* 02 — Design Challenge */}
      <section id="sec-02" className="py-20 sm:py-28 scroll-mt-24">
        <SectionBody id="conversant-02">
          <div className="reveal">
            <SectionHeader number="02" eyebrowPath="conversant.challenge.eyebrow" titlePath="conversant.challenge.titleLead" highlightPath="conversant.challenge.titleHighlight" />
          </div>

          <div className="reveal rounded-2xl bg-primary/10 p-8 lg:p-10 max-w-3xl">
            <Editable as="p" path="conversant.challenge.hmwLabel" className="text-xs uppercase tracking-[0.2em] text-primary mb-3" />
            <p className="text-xl sm:text-2xl font-semibold text-balance leading-snug">
              <Editable as="span" path="conversant.challenge.hmwLead" multiline />{' '}
              <Editable as="span" path="conversant.challenge.hmwHighlight" className="gradient-text" />
            </p>
          </div>

          <div className="mt-12 reveal">
            <Prose>
              <Paragraphs base="conversant.challenge.intro" items={c.challenge.intro} />
            </Prose>
          </div>

          <div className="mt-16 reveal">
            <Editable as="h3" path="conversant.challenge.contextTitle" className="text-xl sm:text-2xl font-semibold mb-5" />
            <Prose>
              <Paragraphs base="conversant.challenge.context" items={c.challenge.context} />
            </Prose>
          </div>
        </SectionBody>
      </section>

      {/* 03 — Discovery & Research */}
      <section id="sec-03" className="py-20 sm:py-28 scroll-mt-24">
        <SectionBody id="conversant-03">
          <div className="reveal">
            <SectionHeader number="03" eyebrowPath="conversant.discovery.eyebrow" titlePath="conversant.discovery.titleLead" highlightPath="conversant.discovery.titleHighlight" />
          </div>

          <div className="reveal">
            <Prose>
              <Paragraphs base="conversant.discovery.intro" items={c.discovery.intro} />
            </Prose>
          </div>

          <div className="mt-10 reveal">
            <Editable as="h3" path="conversant.discovery.processLabel" className="text-xs uppercase tracking-[0.2em] text-primary mb-5" />
            <div className="flex flex-wrap items-center gap-x-3 gap-y-3">
              {c.discovery.processSteps.map((_, i) => (
                <span key={i} className="flex items-center gap-3">
                  <Editable
                    as="span"
                    path={`conversant.discovery.processSteps.${i}`}
                    className="px-4 py-2 rounded-full bg-primary/10 text-primary border border-primary/20 text-sm font-medium"
                  />
                  {i < c.discovery.processSteps.length - 1 && (
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  )}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-20">
            <Editable as="h3" path="conversant.discovery.responsesTitle" className="text-xl sm:text-2xl font-semibold mb-8 reveal" />
            <ItemGroup as="div" path="conversant.discovery.responses" className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {c.discovery.responses.map((_, i) => (
                <div
                  key={i}
                  className="reveal rounded-2xl bg-muted/40 p-6 lg:p-7"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xs font-mono text-primary/70">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      Insight
                    </span>
                  </div>
                  <Editable as="h4" path={`conversant.discovery.responses.${i}.insight`} className="font-semibold mb-4 text-balance" />
                  <div className="pt-4 border-t border-primary/15">
                    <p className="text-xs uppercase tracking-[0.18em] text-primary mb-2">
                      Product response
                    </p>
                    <Editable as="p" path={`conversant.discovery.responses.${i}.response`} multiline className="text-sm text-foreground/85 leading-relaxed" />
                  </div>
                </div>
              ))}
            </ItemGroup>
          </div>
        </SectionBody>
      </section>

      {/* 04 — Strategic Direction */}
      <section id="sec-04" className="py-20 sm:py-28 scroll-mt-24">
        <SectionBody id="conversant-04">
          <div className="reveal">
            <SectionHeader number="04" eyebrowPath="conversant.strategy.eyebrow" titlePath="conversant.strategy.titleLead" highlightPath="conversant.strategy.titleHighlight" />
          </div>

          <div className="reveal">
            <Prose>
              <Paragraphs base="conversant.strategy.intro" items={c.strategy.intro} />
            </Prose>
          </div>

          <ItemGroup as="div" path="conversant.strategy.pillars" className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {c.strategy.pillars.map((_, i) => (
              <div
                key={i}
                className="reveal rounded-2xl bg-gradient-to-br from-primary/10 to-primary/[0.03] p-6 lg:p-7"
              >
                <span className="text-xs font-mono text-primary/70">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <Editable as="h4" path={`conversant.strategy.pillars.${i}.title`} className="text-lg font-semibold mt-2 mb-2" />
                <Editable as="p" path={`conversant.strategy.pillars.${i}.desc`} multiline className="text-sm text-muted-foreground leading-relaxed" />
              </div>
            ))}
          </ItemGroup>

          <figure className="mt-12 reveal max-w-3xl">
            <blockquote className="text-2xl sm:text-3xl font-semibold leading-snug text-balance">
              <Editable as="span" path="conversant.strategy.quoteLead" multiline />{' '}
              <Editable as="span" path="conversant.strategy.quoteHighlight" className="gradient-text" />
            </blockquote>
          </figure>
        </SectionBody>
      </section>

      {/* 05 — Product System */}
      <section id="sec-05" className="py-20 sm:py-28 scroll-mt-24">
        <SectionBody id="conversant-05">
          <div className="reveal">
            <SectionHeader number="05" eyebrowPath="conversant.productSystem.eyebrow" titlePath="conversant.productSystem.titleLead" highlightPath="conversant.productSystem.titleHighlight" />
          </div>

          <div className="reveal mb-12">
            <Prose>
              <Paragraphs base="conversant.productSystem.intro" items={c.productSystem.intro} />
            </Prose>
          </div>

          <ItemGroup as="div" path="conversant.productSystem.models" className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
            {c.productSystem.models.map((_, i) => (
              <div
                key={i}
                className="reveal rounded-2xl bg-muted/40 p-6 lg:p-8 flex flex-col gap-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <Editable as="h3" path={`conversant.productSystem.models.${i}.title`} className="text-lg font-semibold" />
                  <span className="text-xs font-mono text-muted-foreground shrink-0">
                    0{i + 1}
                  </span>
                </div>
                <Editable as="p" path={`conversant.productSystem.models.${i}.flow`} className="inline-block self-start px-3 py-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20 text-sm font-medium font-mono" />
                <Editable as="p" path={`conversant.productSystem.models.${i}.desc`} multiline className="text-sm text-muted-foreground leading-relaxed" />
              </div>
            ))}
          </ItemGroup>

          <div className="mt-12 reveal">
            <Prose>
              <Paragraphs base="conversant.productSystem.closing" items={c.productSystem.closing} />
            </Prose>
          </div>
        </SectionBody>
      </section>

      {/* 06 — Selected Work */}
      <section id="sec-06" className="py-20 sm:py-28 scroll-mt-24">
        <SectionBody id="conversant-06">
          <div className="reveal">
            <SectionHeader number="06" eyebrowPath="conversant.selectedWork.eyebrow" titlePath="conversant.selectedWork.titleLead" highlightPath="conversant.selectedWork.titleHighlight" />
          </div>

          <div className="reveal">
            <Prose>
              <Paragraphs base="conversant.selectedWork.intro" items={c.selectedWork.intro} />
            </Prose>
          </div>

          <ItemGroup as="div" path="conversant.selectedWork.items" className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-6">
            {c.selectedWork.items.map((work, i) => (
              <div
                key={i}
                className="reveal rounded-2xl bg-muted/40 p-8 lg:p-10 flex flex-col"
              >
                <div className="flex items-baseline gap-4 mb-4">
                  <span className="text-sm font-mono text-primary/70">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <Editable as="h3" path={`conversant.selectedWork.items.${i}.title`} className="text-xl lg:text-2xl font-semibold" />
                </div>
                <div className="space-y-4 text-sm sm:text-base text-muted-foreground leading-relaxed">
                  {work.desc.map((_, j) => (
                    <Editable key={j} as="p" multiline path={`conversant.selectedWork.items.${i}.desc.${j}`} />
                  ))}
                </div>
              </div>
            ))}
          </ItemGroup>
        </SectionBody>
      </section>

      {/* 07 — Key Design Decisions */}
      <section id="sec-07" className="py-20 sm:py-28 scroll-mt-24">
        <SectionBody id="conversant-07">
          <div className="reveal">
            <SectionHeader number="07" eyebrowPath="conversant.decisions.eyebrow" titlePath="conversant.decisions.titleLead" highlightPath="conversant.decisions.titleHighlight" />
          </div>

          <div className="reveal">
            <Prose>
              <Paragraphs base="conversant.decisions.intro" items={c.decisions.intro} />
            </Prose>
          </div>

          <ItemGroup as="div" path="conversant.decisions.items" className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-4">
            {c.decisions.items.map((_, i) => (
              <div
                key={i}
                className="reveal rounded-2xl bg-muted/40 p-6 lg:p-8 hover:bg-muted/60 transition-colors"
              >
                <span className="text-sm font-mono text-primary/70">{c.decisions.items[i].n}</span>
                <Editable as="h3" path={`conversant.decisions.items.${i}.title`} className="text-lg lg:text-xl font-semibold mt-2 mb-3" />
                <Editable as="p" path={`conversant.decisions.items.${i}.desc`} multiline className="text-sm text-muted-foreground leading-relaxed" />
                <div className="mt-4 pt-4 border-t border-primary/15">
                  <p className="text-xs uppercase tracking-[0.18em] text-primary mb-2">
                    Tradeoff
                  </p>
                  <Editable as="p" path={`conversant.decisions.items.${i}.tradeoff`} multiline className="text-sm text-foreground/85 leading-relaxed" />
                </div>
              </div>
            ))}
          </ItemGroup>
        </SectionBody>
      </section>

      {/* 08 — Constraints & Collaboration */}
      <section id="sec-08" className="py-20 sm:py-28 scroll-mt-24">
        <SectionBody id="conversant-08">
          <div className="reveal">
            <SectionHeader number="08" eyebrowPath="conversant.constraints.eyebrow" titlePath="conversant.constraints.titleLead" highlightPath="conversant.constraints.titleHighlight" />
          </div>

          <div className="reveal">
            <Prose>
              <Paragraphs base="conversant.constraints.intro" items={c.constraints.intro} />
            </Prose>
          </div>

          <div className="mt-12">
            <Editable as="h3" path="conversant.constraints.constraintsTitle" className="text-xl sm:text-2xl font-semibold mb-8 reveal" />
            <ItemGroup as="div" path="conversant.constraints.items" className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {c.constraints.items.map((_, i) => (
                <div
                  key={i}
                  className="reveal rounded-2xl bg-muted/40 p-6 lg:p-7"
                >
                  <Editable as="h4" path={`conversant.constraints.items.${i}.title`} className="font-semibold mb-2 text-balance" />
                  <Editable as="p" path={`conversant.constraints.items.${i}.desc`} multiline className="text-sm text-muted-foreground leading-relaxed" />
                </div>
              ))}
            </ItemGroup>
          </div>

          <div className="mt-20 reveal">
            <Editable as="h3" path="conversant.constraints.collaborationTitle" className="text-xl sm:text-2xl font-semibold mb-5" />
            <Prose>
              <Paragraphs base="conversant.constraints.collaboration" items={c.constraints.collaboration} />
            </Prose>
            <div className="mt-8">
              <Editable as="h4" path="conversant.constraints.collaboratorsLabel" className="text-xs uppercase tracking-[0.2em] text-primary mb-4" />
              <Chips base="conversant.constraints.collaborators" items={c.constraints.collaborators} />
            </div>
          </div>
        </SectionBody>
      </section>

      {/* 09 — Validation & Measurement */}
      <section id="sec-09" className="py-20 sm:py-28 scroll-mt-24">
        <SectionBody id="conversant-09">
          <div className="reveal">
            <SectionHeader number="09" eyebrowPath="conversant.validation.eyebrow" titlePath="conversant.validation.titleLead" highlightPath="conversant.validation.titleHighlight" />
          </div>

          <div className="reveal">
            <Prose>
              <Paragraphs base="conversant.validation.intro" items={c.validation.intro} />
            </Prose>
          </div>

          <div className="mt-16">
            <Editable as="h3" path="conversant.validation.questionsTitle" className="text-xl sm:text-2xl font-semibold mb-8 reveal" />
            <ItemGroup as="div" path="conversant.validation.questions" className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {c.validation.questions.map((item, i) => (
                <div
                  key={i}
                  className="reveal rounded-2xl bg-muted/40 p-6 flex gap-5"
                >
                  <span className="text-sm font-mono text-primary/70 shrink-0">
                    {item.n}
                  </span>
                  <Editable as="p" path={`conversant.validation.questions.${i}.q`} multiline className="text-base text-foreground/90 leading-snug" />
                </div>
              ))}
            </ItemGroup>
          </div>
        </SectionBody>
      </section>

      {/* 10 — Impact */}
      <section id="sec-10" className="py-20 sm:py-28 scroll-mt-24">
        <SectionBody id="conversant-10">
          <div className="reveal">
            <SectionHeader number="10" eyebrowPath="conversant.impact.eyebrow" titlePath="conversant.impact.titleLead" highlightPath="conversant.impact.titleHighlight" />
          </div>

          <div className="reveal">
            <Prose>
              <Paragraphs base="conversant.impact.intro" items={c.impact.intro} />
            </Prose>
          </div>

          <ItemGroup as="div" path="conversant.impact.highlights" className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-4">
            {c.impact.highlights.map((_, i) => (
              <div
                key={i}
                className="reveal flex gap-4 rounded-2xl bg-muted/40 p-6"
              >
                <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                  <Check className="w-4 h-4 text-primary" />
                </div>
                <Editable as="p" path={`conversant.impact.highlights.${i}`} multiline className="text-sm sm:text-base text-foreground/85 leading-relaxed" />
              </div>
            ))}
          </ItemGroup>

          <div className="mt-16 reveal rounded-2xl bg-primary/10 p-8 lg:p-10">
            <Editable as="h3" path="conversant.impact.demonstratesTitle" className="text-xl sm:text-2xl font-semibold mb-5" />
            <Prose>
              <Paragraphs base="conversant.impact.demonstrates" items={c.impact.demonstrates} />
            </Prose>
          </div>

          <div className="mt-20">
            <Editable as="h3" path="conversant.impact.caseStudiesTitle" className="text-xl sm:text-2xl font-semibold mb-8 reveal" />
            <ItemGroup as="div" path="conversant.impact.caseStudies" className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {c.impact.caseStudies.map((_, i) => (
                <a
                  key={i}
                  href="#"
                  className="reveal group rounded-2xl bg-muted/40 p-6 lg:p-8 hover:bg-muted/70 transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <span className="text-xs font-mono text-primary/70">
                        Case {String(i + 1).padStart(2, '0')}
                      </span>
                      <Editable as="h4" path={`conversant.impact.caseStudies.${i}.title`} className="text-lg lg:text-xl font-semibold mt-2 mb-3 group-hover:text-primary transition-colors" />
                      <Editable as="p" path={`conversant.impact.caseStudies.${i}.question`} multiline className="text-sm text-muted-foreground leading-relaxed italic" />
                    </div>
                    <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0 mt-1" />
                  </div>
                </a>
              ))}
            </ItemGroup>
          </div>

          <p className="mt-12 reveal text-xs text-muted-foreground/80 italic max-w-3xl">
            <Editable as="span" path="conversant.impact.confidentiality" multiline />
          </p>
        </SectionBody>
      </section>
      </ReorderableSections>

      {/* Footer CTA */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-6 text-balance">
            <Editable as="span" path="conversant.footerCta.titleLead" />{' '}
            <Editable as="span" path="conversant.footerCta.titleHighlight" className="gradient-text" />{' '}
            <Editable as="span" path="conversant.footerCta.titleRest" />
          </h2>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              asChild
              size="lg"
              className="rounded-full px-8 py-6 gradient-bg text-white"
            >
              <a href="#contact">
                <Editable as="span" path="conversant.footerCta.getInTouch" />
              </a>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="rounded-full px-8 py-6 border-border/50 hover:border-primary/50 hover:bg-primary/5"
            >
              <a href="#projects" className="inline-flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" />
                <Editable as="span" path="conversant.footerCta.backToProjects" />
              </a>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
