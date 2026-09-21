import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowLeft, ArrowRight, Layers } from 'lucide-react';
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
];

export default function UsaaApp() {
  const rootRef = useRef<HTMLDivElement>(null);
  const { content } = useContent();
  const u = content.usaa;

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
      <SectionToc items={tocItems} labels={content.usaa.toc} routeHash="#/usaa" order={content.usaa.sectionOrder} />

      {/* Top bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-background/70 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <a
            href="#home"
            className="inline-flex items-center gap-2 text-sm font-medium text-foreground/70 hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <Editable as="span" path="usaa.backToPortfolio" />
          </a>
          <SectionNavDropdown items={tocItems} labels={content.usaa.toc} routeHash="#/usaa" order={content.usaa.sectionOrder} />
          <Editable as="span" path="usaa.brand" className="text-sm font-semibold gradient-text" />
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
            path="usaa.hero.eyebrow"
            className="mb-6 text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground"
          />

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <Editable as="span" path="usaa.hero.status" className="text-xs font-medium text-primary tracking-wide" />
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-6 text-balance">
            <Editable as="span" path="usaa.hero.title" className="gradient-text" />
          </h1>
          <Editable
            as="p"
            path="usaa.hero.subtitle"
            multiline
            className="text-xl sm:text-2xl md:text-3xl text-foreground/80 max-w-3xl leading-snug mb-10 text-balance"
          />

          <div className="flex flex-wrap gap-2 mb-10">
            {u.hero.typeTags.map((_, i) => (
              <Editable
                key={i}
                as="span"
                path={`usaa.hero.typeTags.${i}`}
                className="px-3 py-1.5 text-xs font-medium rounded-full bg-card border border-border/50 text-foreground/80"
              />
            ))}
          </div>

          <dl className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl border-t border-border/40 pt-8">
            <div>
              <Editable as="dt" path="usaa.hero.roleLabel" className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2 block" />
              <Editable as="dd" path="usaa.hero.roleValue" className="text-sm text-foreground/90" />
            </div>
            <div>
              <Editable as="dt" path="usaa.hero.platformLabel" className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2 block" />
              <Editable as="dd" path="usaa.hero.platformValue" className="text-sm text-foreground/90" />
            </div>
            <div>
              <Editable as="dt" path="usaa.hero.surfaceLabel" className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2 block" />
              <Editable as="dd" path="usaa.hero.surfaceValue" className="text-sm text-foreground/90" />
            </div>
          </dl>
        </div>
      </section>

      {/* 01 — Overview */}
      <ReorderableSections pageKey="usaa">
      <section id="sec-01" className="py-20 sm:py-28 scroll-mt-24">
        <SectionBody id="usaa-01">
          <div className="reveal">
            <SectionHeader number="01" eyebrowPath="usaa.overview.eyebrow" titlePath="usaa.overview.titleLead" highlightPath="usaa.overview.titleHighlight" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            <div className="lg:col-span-7 reveal">
              <Prose>
                <Paragraphs base="usaa.overview.intro" items={u.overview.intro} />
              </Prose>
            </div>

            <aside className="lg:col-span-5 reveal">
              <div className="rounded-2xl bg-muted/40 p-8">
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-primary mb-4">
                  <Layers className="w-4 h-4" />
                  <Editable as="span" path="usaa.overview.productTypeLabel" />
                </div>
                <ItemGroup as="ul" path="usaa.overview.productTypeList" className="space-y-3 text-foreground/90">
                  {u.overview.productTypeList.map((_, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary/70 shrink-0" />
                      <Editable as="span" path={`usaa.overview.productTypeList.${i}`} />
                    </li>
                  ))}
                </ItemGroup>
              </div>
            </aside>
          </div>

          <div className="mt-16 reveal">
            <Editable as="h3" path="usaa.overview.roleTitle" className="text-xl sm:text-2xl font-semibold mb-6" />
            <Chips base="usaa.overview.roleList" items={u.overview.roleList} />
          </div>
        </SectionBody>
      </section>

      {/* 02 — Design Challenge */}
      <section id="sec-02" className="py-20 sm:py-28 scroll-mt-24">
        <SectionBody id="usaa-02">
          <div className="reveal">
            <SectionHeader number="02" eyebrowPath="usaa.challenge.eyebrow" titlePath="usaa.challenge.titleLead" highlightPath="usaa.challenge.titleHighlight" />
          </div>

          <div className="reveal rounded-2xl bg-primary/10 p-8 lg:p-10 max-w-3xl">
            <Editable as="p" path="usaa.challenge.hmwLabel" className="text-xs uppercase tracking-[0.2em] text-primary mb-3" />
            <p className="text-xl sm:text-2xl font-semibold text-balance leading-snug">
              <Editable as="span" path="usaa.challenge.hmwLead" multiline />{' '}
              <Editable as="span" path="usaa.challenge.hmwHighlight" className="gradient-text" />
            </p>
          </div>

          <div className="mt-12 reveal">
            <Prose>
              <Paragraphs base="usaa.challenge.intro" items={u.challenge.intro} />
            </Prose>
          </div>

          <div className="mt-16 reveal">
            <Editable as="h3" path="usaa.challenge.contextTitle" className="text-xl sm:text-2xl font-semibold mb-5" />
            <Prose>
              <Paragraphs base="usaa.challenge.context" items={u.challenge.context} />
            </Prose>
          </div>
        </SectionBody>
      </section>

      {/* 03 — Discovery & Synthesis */}
      <section id="sec-03" className="py-20 sm:py-28 scroll-mt-24">
        <SectionBody id="usaa-03">
          <div className="reveal">
            <SectionHeader number="03" eyebrowPath="usaa.discovery.eyebrow" titlePath="usaa.discovery.titleLead" highlightPath="usaa.discovery.titleHighlight" />
          </div>

          <div className="reveal">
            <Prose>
              <Paragraphs base="usaa.discovery.intro" items={u.discovery.intro} />
            </Prose>
          </div>

          <ItemGroup as="div" path="usaa.discovery.insights" className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-4">
            {u.discovery.insights.map((_, i) => (
              <div
                key={i}
                className="reveal rounded-2xl bg-muted/40 p-6 lg:p-7"
              >
                <Editable as="h4" path={`usaa.discovery.insights.${i}.title`} className="font-semibold mb-3 text-balance" />
                <Editable as="p" path={`usaa.discovery.insights.${i}.desc`} multiline className="text-sm text-muted-foreground leading-relaxed" />
              </div>
            ))}
          </ItemGroup>

          <div className="mt-20">
            <Editable as="h3" path="usaa.discovery.responsesTitle" className="text-xl sm:text-2xl font-semibold mb-8 reveal" />
            <ItemGroup as="div" path="usaa.discovery.responses" className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {u.discovery.responses.map((_, i) => (
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
                  <Editable as="h4" path={`usaa.discovery.responses.${i}.insight`} className="font-semibold mb-4 text-balance" />
                  <div className="pt-4 border-t border-primary/15 space-y-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground mb-1">
                        Requirement
                      </p>
                      <Editable as="p" path={`usaa.discovery.responses.${i}.requirement`} multiline className="text-sm text-foreground/85 leading-relaxed" />
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-primary mb-1">
                        Response
                      </p>
                      <Editable as="p" path={`usaa.discovery.responses.${i}.response`} multiline className="text-sm text-foreground/85 leading-relaxed" />
                    </div>
                  </div>
                </div>
              ))}
            </ItemGroup>
          </div>
        </SectionBody>
      </section>

      {/* 04 — Strategic Direction */}
      <section id="sec-04" className="py-20 sm:py-28 scroll-mt-24">
        <SectionBody id="usaa-04">
          <div className="reveal">
            <SectionHeader number="04" eyebrowPath="usaa.strategy.eyebrow" titlePath="usaa.strategy.titleLead" highlightPath="usaa.strategy.titleHighlight" />
          </div>

          <div className="reveal">
            <Prose>
              <Paragraphs base="usaa.strategy.intro" items={u.strategy.intro} />
            </Prose>
          </div>

          <figure className="mt-12 reveal max-w-3xl">
            <blockquote className="text-2xl sm:text-3xl font-semibold leading-snug text-balance">
              <Editable as="span" path="usaa.strategy.quoteLead" multiline />{' '}
              <Editable as="span" path="usaa.strategy.quoteHighlight" className="gradient-text" />
            </blockquote>
          </figure>
        </SectionBody>
      </section>

      {/* 05 — Product System */}
      <section id="sec-05" className="py-20 sm:py-28 scroll-mt-24">
        <SectionBody id="usaa-05">
          <div className="reveal">
            <SectionHeader number="05" eyebrowPath="usaa.productSystem.eyebrow" titlePath="usaa.productSystem.titleLead" highlightPath="usaa.productSystem.titleHighlight" />
          </div>

          <div className="reveal mb-12">
            <Prose>
              <Paragraphs base="usaa.productSystem.intro" items={u.productSystem.intro} />
            </Prose>
          </div>

          <ItemGroup as="div" path="usaa.productSystem.models" className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
            {u.productSystem.models.map((_, i) => (
              <div
                key={i}
                className="reveal rounded-2xl bg-muted/40 p-6 lg:p-8 flex flex-col gap-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <Editable as="h3" path={`usaa.productSystem.models.${i}.title`} className="text-lg font-semibold" />
                  <span className="text-xs font-mono text-muted-foreground shrink-0">
                    0{i + 1}
                  </span>
                </div>
                <Editable as="p" path={`usaa.productSystem.models.${i}.flow`} className="inline-block self-start px-3 py-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20 text-sm font-medium font-mono" />
                <Editable as="p" path={`usaa.productSystem.models.${i}.desc`} multiline className="text-sm text-muted-foreground leading-relaxed" />
              </div>
            ))}
          </ItemGroup>

          <div className="mt-12 reveal">
            <Prose>
              <Paragraphs base="usaa.productSystem.closing" items={u.productSystem.closing} />
            </Prose>
          </div>
        </SectionBody>
      </section>

      {/* 06 — Key Design Decisions */}
      <section id="sec-06" className="py-20 sm:py-28 scroll-mt-24">
        <SectionBody id="usaa-06">
          <div className="reveal">
            <SectionHeader number="06" eyebrowPath="usaa.decisions.eyebrow" titlePath="usaa.decisions.titleLead" highlightPath="usaa.decisions.titleHighlight" />
          </div>

          <div className="reveal">
            <Prose>
              <Paragraphs base="usaa.decisions.intro" items={u.decisions.intro} />
            </Prose>
          </div>

          <ItemGroup as="div" path="usaa.decisions.items" className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-4">
            {u.decisions.items.map((_, i) => (
              <div
                key={i}
                className="reveal rounded-2xl bg-muted/40 p-6 lg:p-8 hover:bg-muted/60 transition-colors"
              >
                <span className="text-sm font-mono text-primary/70">{u.decisions.items[i].n}</span>
                <Editable as="h3" path={`usaa.decisions.items.${i}.title`} className="text-lg lg:text-xl font-semibold mt-2 mb-3" />
                <Editable as="p" path={`usaa.decisions.items.${i}.desc`} multiline className="text-sm text-muted-foreground leading-relaxed" />
                <div className="mt-4 pt-4 border-t border-primary/15">
                  <p className="text-xs uppercase tracking-[0.18em] text-primary mb-2">
                    Tradeoff
                  </p>
                  <Editable as="p" path={`usaa.decisions.items.${i}.tradeoff`} multiline className="text-sm text-foreground/85 leading-relaxed" />
                </div>
              </div>
            ))}
          </ItemGroup>
        </SectionBody>
      </section>

      {/* 07 — Execution & Collaboration */}
      <section id="sec-07" className="py-20 sm:py-28 scroll-mt-24">
        <SectionBody id="usaa-07">
          <div className="reveal">
            <SectionHeader number="07" eyebrowPath="usaa.execution.eyebrow" titlePath="usaa.execution.titleLead" highlightPath="usaa.execution.titleHighlight" />
          </div>

          <div className="reveal">
            <Prose>
              <Paragraphs base="usaa.execution.intro" items={u.execution.intro} />
            </Prose>
          </div>

          <ItemGroup as="div" path="usaa.execution.blocks" className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-4">
            {u.execution.blocks.map((_, i) => (
              <div
                key={i}
                className="reveal flex gap-5 rounded-2xl bg-muted/40 p-6 lg:p-7"
              >
                <span className="text-sm font-mono text-primary/70 shrink-0 pt-0.5">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div>
                  <Editable as="h4" path={`usaa.execution.blocks.${i}.title`} className="font-semibold mb-2 text-balance" />
                  <Editable as="p" path={`usaa.execution.blocks.${i}.desc`} multiline className="text-sm text-muted-foreground leading-relaxed" />
                </div>
              </div>
            ))}
          </ItemGroup>
        </SectionBody>
      </section>

      {/* 08 — Validation & Measurement */}
      <section id="sec-08" className="py-20 sm:py-28 scroll-mt-24">
        <SectionBody id="usaa-08">
          <div className="reveal">
            <SectionHeader number="08" eyebrowPath="usaa.validation.eyebrow" titlePath="usaa.validation.titleLead" highlightPath="usaa.validation.titleHighlight" />
          </div>

          <div className="reveal">
            <Prose>
              <Paragraphs base="usaa.validation.intro" items={u.validation.intro} />
            </Prose>
          </div>

          <div className="mt-12 reveal">
            <Editable as="h3" path="usaa.validation.inputsLabel" className="text-xs uppercase tracking-[0.2em] text-primary mb-5" />
            <Chips base="usaa.validation.inputs" items={u.validation.inputs} />
          </div>

          <div className="mt-16">
            <Editable as="h3" path="usaa.validation.questionsTitle" className="text-xl sm:text-2xl font-semibold mb-8 reveal" />
            <ItemGroup as="div" path="usaa.validation.questions" className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {u.validation.questions.map((item, i) => (
                <div
                  key={i}
                  className="reveal rounded-2xl bg-muted/40 p-6 flex gap-5"
                >
                  <span className="text-sm font-mono text-primary/70 shrink-0">
                    {item.n}
                  </span>
                  <Editable as="p" path={`usaa.validation.questions.${i}.q`} multiline className="text-base text-foreground/90 leading-snug" />
                </div>
              ))}
            </ItemGroup>
          </div>
        </SectionBody>
      </section>

      {/* 09 — Impact */}
      <section id="sec-09" className="py-20 sm:py-28 scroll-mt-24">
        <SectionBody id="usaa-09">
          <div className="reveal">
            <SectionHeader number="09" eyebrowPath="usaa.impact.eyebrow" titlePath="usaa.impact.titleLead" highlightPath="usaa.impact.titleHighlight" />
          </div>

          <div className="reveal">
            <Prose>
              <Paragraphs base="usaa.impact.intro" items={u.impact.intro} />
            </Prose>
          </div>

          <div className="mt-16 reveal rounded-2xl bg-primary/10 p-8 lg:p-10">
            <Editable as="h3" path="usaa.impact.demonstratesTitle" className="text-xl sm:text-2xl font-semibold mb-5" />
            <Prose>
              <Paragraphs base="usaa.impact.demonstrates" items={u.impact.demonstrates} />
            </Prose>
          </div>

          <div className="mt-20">
            <Editable as="h3" path="usaa.impact.caseStudiesTitle" className="text-xl sm:text-2xl font-semibold mb-8 reveal" />
            <ItemGroup as="div" path="usaa.impact.caseStudies" className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {u.impact.caseStudies.map((_, i) => (
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
                      <Editable as="h4" path={`usaa.impact.caseStudies.${i}.title`} className="text-lg lg:text-xl font-semibold mt-2 mb-3 group-hover:text-primary transition-colors" />
                      <Editable as="p" path={`usaa.impact.caseStudies.${i}.question`} multiline className="text-sm text-muted-foreground leading-relaxed italic" />
                    </div>
                    <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0 mt-1" />
                  </div>
                </a>
              ))}
            </ItemGroup>
          </div>

          <p className="mt-12 reveal text-xs text-muted-foreground/80 italic max-w-3xl">
            <Editable as="span" path="usaa.impact.confidentiality" multiline />
          </p>
        </SectionBody>
      </section>
      </ReorderableSections>

      {/* Footer CTA */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-6 text-balance">
            <Editable as="span" path="usaa.footerCta.titleLead" />{' '}
            <Editable as="span" path="usaa.footerCta.titleHighlight" className="gradient-text" />{' '}
            <Editable as="span" path="usaa.footerCta.titleRest" />
          </h2>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              asChild
              size="lg"
              className="rounded-full px-8 py-6 gradient-bg text-white"
            >
              <a href="#contact">
                <Editable as="span" path="usaa.footerCta.getInTouch" />
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
                <Editable as="span" path="usaa.footerCta.backToProjects" />
              </a>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
