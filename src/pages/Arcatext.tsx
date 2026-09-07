import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  ArrowLeft,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  GraduationCap,
  Languages,
  MessageSquareText,
  Bot,
  KeyboardIcon,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ArcatextKeyboard from '@/components/ArcatextKeyboard';
import { useContent } from '@/content/ContentContext';
import { Editable } from '@/content/Editable';
import { EditableBlocks, ItemGroup, SectionBody } from '@/content/EditableBlocks';
import { SectionToc, SectionNavDropdown } from '@/components/SectionToc';
import { ReorderableSections } from '@/components/ReorderableSections';
import { PromptArchitecture } from '@/components/PromptArchitecture';
import { TypingFlowDiagram } from '@/components/TypingFlowDiagram';
import { ArcatextRoadmap } from '@/components/ArcatextRoadmap';

gsap.registerPlugin(ScrollTrigger);

// Fixed icons for each Product System flow card, in order.
const flowIcons: LucideIcon[] = [Sparkles, ShieldCheck, MessageSquareText, GraduationCap];

// Fixed icons for the "Product type" list in the Overview section.
const productTypeIcons: LucideIcon[] = [KeyboardIcon, GraduationCap, MessageSquareText, Bot];

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

const tocItems = [
  { id: 'sec-01', n: '01' },
  { id: 'sec-02', n: '02' },
  { id: 'sec-03', n: '03' },
  { id: 'sec-04', n: '04' },
  { id: 'sec-05', n: '05' },
  { id: 'sec-06', n: '06' },
  { id: 'sec-07', n: '07' },
];

export default function Arcatext() {
  const rootRef = useRef<HTMLDivElement>(null);
  const { content } = useContent();
  const arc = content.arcatext;

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
      <SectionToc items={tocItems} labels={content.arcatext.toc} routeHash="#/arcatext" order={content.arcatext.sectionOrder} />

      {/* Top bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-background/70 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <a
            href="#home"
            className="inline-flex items-center gap-2 text-sm font-medium text-foreground/70 hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <Editable as="span" path="arcatext.backToPortfolio" />
          </a>
          <SectionNavDropdown items={tocItems} labels={content.arcatext.toc} routeHash="#/arcatext" order={content.arcatext.sectionOrder} />
          <Editable as="span" path="arcatext.brand" className="text-sm font-semibold gradient-text" />
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
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <Editable as="span" path="arcatext.hero.status" className="text-xs font-medium text-primary tracking-wide" />
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-6 text-balance">
            <Editable as="span" path="arcatext.hero.title" className="gradient-text" />
          </h1>
          <Editable
            as="p"
            path="arcatext.hero.subtitle"
            multiline
            className="text-xl sm:text-2xl md:text-3xl text-foreground/80 max-w-3xl leading-snug mb-10 text-balance"
          />

          <div className="flex flex-wrap gap-2 mb-10">
            {arc.hero.typeTags.map((_, i) => (
              <Editable
                key={i}
                as="span"
                path={`arcatext.hero.typeTags.${i}`}
                className="px-3 py-1.5 text-xs font-medium rounded-full bg-card border border-border/50 text-foreground/80"
              />
            ))}
          </div>

          <dl className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl border-t border-border/40 pt-8">
            <div>
              <Editable as="dt" path="arcatext.hero.roleLabel" className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2 block" />
              <Editable as="dd" path="arcatext.hero.roleValue" className="text-sm text-foreground/90" />
            </div>
            <div>
              <Editable as="dt" path="arcatext.hero.platformLabel" className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2 block" />
              <Editable as="dd" path="arcatext.hero.platformValue" className="text-sm text-foreground/90" />
            </div>
            <div>
              <Editable as="dt" path="arcatext.hero.surfaceLabel" className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2 block" />
              <Editable as="dd" path="arcatext.hero.surfaceValue" className="text-sm text-foreground/90" />
            </div>
          </dl>
        </div>
      </section>

      {/* My role — framing for the demo that follows, so the reader knows whose
          work they are about to explore. Outside ReorderableSections, which
          only covers the numbered sections. */}
      <section className="pt-12 sm:pt-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="reveal">
            <Editable as="h3" path="arcatext.overview.roleTitle" className="text-xl sm:text-2xl font-semibold mb-4" />
            <Prose>
              <Paragraphs base="arcatext.overview.role" items={arc.overview.role} />
            </Prose>
          </div>
        </div>
      </section>

      {/* Interactive keyboard diagram — breaks out to the full page width,
          clearing the left section-nav rail at >=1600px. */}
      <section className="py-12 sm:py-16">
        <div className="mx-[calc(50%-50vw)] px-4 sm:px-6 lg:px-8 min-[1600px]:pl-56 min-[1600px]:pr-12">
          <ArcatextKeyboard />
        </div>
      </section>

      {/* 01 — Overview */}
      <ReorderableSections pageKey="arcatext">
      <section id="sec-01" className="py-20 sm:py-28 scroll-mt-24">
        <SectionBody id="arcatext-01">
          <div className="reveal">
            <SectionHeader number="01" eyebrowPath="arcatext.overview.eyebrow" titlePath="arcatext.overview.titleLead" highlightPath="arcatext.overview.titleHighlight" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            <div className="lg:col-span-7 reveal">
              <Prose>
                <Paragraphs base="arcatext.overview.intro" items={arc.overview.intro} />
              </Prose>
            </div>

            <aside className="lg:col-span-5 reveal">
              <div className="rounded-2xl bg-muted/40 p-8">
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-primary mb-4">
                  <Languages className="w-4 h-4" />
                  <Editable as="span" path="arcatext.overview.productTypeLabel" />
                </div>
                <ItemGroup as="ul" path="arcatext.overview.productTypeList" className="space-y-3 text-foreground/90">
                  {arc.overview.productTypeList.map((_, i) => {
                    const Icon = productTypeIcons[i] ?? KeyboardIcon;
                    return (
                      <li key={i} className="flex items-center gap-3">
                        <Icon className="w-4 h-4 text-primary/70" />
                        <Editable as="span" path={`arcatext.overview.productTypeList.${i}`} />
                      </li>
                    );
                  })}
                </ItemGroup>
              </div>
            </aside>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 mt-20">
            <div className="reveal">
              <Editable as="h3" path="arcatext.overview.originTitle" className="text-xl sm:text-2xl font-semibold mb-4" />
              <Prose>
                <Paragraphs base="arcatext.overview.origin" items={arc.overview.origin} />
              </Prose>
            </div>
            <div className="reveal">
              <Editable as="h3" path="arcatext.overview.readingWritingTitle" className="text-xl sm:text-2xl font-semibold mb-4" />
              <Prose>
                <Paragraphs base="arcatext.overview.readingWriting" items={arc.overview.readingWriting} />
              </Prose>
            </div>
          </div>

        </SectionBody>
      </section>

      {/* 02 — Problem / Opportunity */}
      <section id="sec-02" className="py-20 sm:py-28 scroll-mt-24">
        <SectionBody id="arcatext-02">
          <div className="reveal">
            <SectionHeader number="02" eyebrowPath="arcatext.problem.eyebrow" titlePath="arcatext.problem.titleLead" highlightPath="arcatext.problem.titleHighlight" />
          </div>

          <div className="reveal">
            <Prose>
              <Paragraphs base="arcatext.problem.intro" items={arc.problem.intro} />
            </Prose>

            <div className="mt-10 rounded-2xl bg-primary/10 p-8">
              <Editable as="p" path="arcatext.problem.opportunityEyebrow" className="text-xs uppercase tracking-[0.2em] text-primary mb-3" />
              <p className="text-xl sm:text-2xl font-semibold text-balance leading-snug">
                <Editable as="span" path="arcatext.problem.opportunityLead" multiline />{' '}
                <Editable as="span" path="arcatext.problem.opportunityHighlight" className="gradient-text" />
              </p>
            </div>
          </div>

          {/* Problems */}
          <div className="mt-20">
            <Editable as="h3" path="arcatext.problem.problemsTitle" className="text-xl sm:text-2xl font-semibold mb-8 reveal" />
            <ItemGroup as="div" path="arcatext.problem.problems" className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {arc.problem.problems.map((_, i) => (
                <div
                  key={i}
                  className="reveal rounded-2xl bg-muted/40 p-6 hover:bg-muted/60 transition-colors"
                >
                  <Editable as="h4" path={`arcatext.problem.problems.${i}.title`} className="font-semibold mb-2" />
                  <Editable as="p" path={`arcatext.problem.problems.${i}.desc`} multiline className="text-sm text-muted-foreground leading-relaxed" />
                </div>
              ))}
            </ItemGroup>
          </div>

          {/* Opportunities */}
          <div className="mt-16">
            <Editable as="h3" path="arcatext.problem.opportunitiesTitle" className="text-xl sm:text-2xl font-semibold mb-8 reveal" />
            <ItemGroup as="div" path="arcatext.problem.opportunities" className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {arc.problem.opportunities.map((_, i) => (
                <div
                  key={i}
                  className="reveal rounded-2xl bg-gradient-to-br from-primary/10 to-primary/[0.03] p-6"
                >
                  <Editable as="h4" path={`arcatext.problem.opportunities.${i}.title`} className="font-semibold mb-2" />
                  <Editable as="p" path={`arcatext.problem.opportunities.${i}.desc`} multiline className="text-sm text-muted-foreground leading-relaxed" />
                </div>
              ))}
            </ItemGroup>
          </div>

          <div className="mt-16 reveal">
            <Prose>
              <Paragraphs base="arcatext.problem.closing" items={arc.problem.closing} />
            </Prose>
          </div>
        </SectionBody>
      </section>

      {/* 03 — Strategy */}
      <section id="sec-03" className="py-20 sm:py-28 scroll-mt-24">
        <SectionBody id="arcatext-03">
          <div className="reveal">
            <SectionHeader number="03" eyebrowPath="arcatext.strategy.eyebrow" titlePath="arcatext.strategy.titleLead" highlightPath="arcatext.strategy.titleHighlight" />
          </div>

          <div className="reveal">
            <Prose>
              <Paragraphs base="arcatext.strategy.intro" items={arc.strategy.intro} />
            </Prose>
          </div>

          <div className="mt-12 reveal">
            <Prose>
              <Paragraphs base="arcatext.strategy.second" items={arc.strategy.second} />
            </Prose>
          </div>

          <figure className="mt-12 reveal max-w-3xl">
            <blockquote className="text-2xl sm:text-3xl font-semibold leading-snug text-balance">
              <Editable as="span" path="arcatext.strategy.quoteLead" multiline />{' '}
              <Editable as="span" path="arcatext.strategy.quoteHighlight" className="gradient-text" />
            </blockquote>
          </figure>

          <ItemGroup as="div" path="arcatext.strategy.cards" className="mt-16 grid grid-cols-1 lg:grid-cols-2 gap-6">
            {arc.strategy.cards.map((_, i) => (
              <div
                key={i}
                className="reveal rounded-2xl bg-muted/40 p-6 lg:p-8"
              >
                <Editable as="h3" path={`arcatext.strategy.cards.${i}.title`} className="text-lg font-semibold mb-3" />
                <Editable as="p" path={`arcatext.strategy.cards.${i}.desc`} multiline className="text-sm text-muted-foreground leading-relaxed" />
              </div>
            ))}
          </ItemGroup>

          <div className="mt-16 reveal rounded-2xl bg-muted/40 p-8 lg:p-10">
            <Editable as="p" path="arcatext.strategy.artifactEyebrow" className="text-xs uppercase tracking-[0.2em] text-primary mb-3" />
            <Editable as="h3" path="arcatext.strategy.artifactTitle" className="text-xl sm:text-2xl font-semibold mb-4" />
            <Prose>
              <Paragraphs base="arcatext.strategy.artifact" items={arc.strategy.artifact} />
            </Prose>
          </div>

          <div className="mt-6 reveal rounded-2xl bg-gradient-to-br from-primary/10 to-primary/[0.03] p-8 lg:p-10">
            <Editable as="p" path="arcatext.strategy.aiEyebrow" className="text-xs uppercase tracking-[0.2em] text-primary mb-3" />
            <Editable as="h3" path="arcatext.strategy.aiTitle" className="text-xl sm:text-2xl font-semibold mb-4" />
            <Prose>
              <Paragraphs base="arcatext.strategy.ai" items={arc.strategy.ai} />
            </Prose>
          </div>

          {/* Product roadmap — closes the strategy with where the product goes next. */}
          <div className="mt-16 reveal">
            <ArcatextRoadmap />
          </div>
        </SectionBody>
      </section>

      {/* 04 — Product System */}
      <section id="sec-04" className="py-20 sm:py-28 scroll-mt-24">
        <SectionBody id="arcatext-04">
          <div className="reveal">
            <SectionHeader number="04" eyebrowPath="arcatext.productSystem.eyebrow" titlePath="arcatext.productSystem.titleLead" highlightPath="arcatext.productSystem.titleHighlight" />
          </div>

          <div className="reveal mb-12">
            <Prose>
              <Paragraphs base="arcatext.productSystem.intro" items={arc.productSystem.intro} />
            </Prose>
          </div>

          <ItemGroup as="div" path="arcatext.productSystem.flows" className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
            {arc.productSystem.flows.map((flow, i) => {
              const Icon = flowIcons[i] ?? Sparkles;
              return (
                <div
                  key={i}
                  className="reveal rounded-2xl bg-muted/40 p-6 lg:p-8 flex flex-col gap-5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                      <Editable as="h3" path={`arcatext.productSystem.flows.${i}.title`} className="text-lg font-semibold" />
                    </div>
                    <span className="text-xs font-mono text-muted-foreground">
                      0{i + 1}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {flow.steps.map((_, j) => (
                      <span key={j} className="flex items-center gap-2">
                        <Editable
                          as="span"
                          path={`arcatext.productSystem.flows.${i}.steps.${j}`}
                          className="px-3 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-sm font-medium"
                        />
                        {j < flow.steps.length - 1 && (
                          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        )}
                      </span>
                    ))}
                  </div>

                  <Editable as="p" path={`arcatext.productSystem.flows.${i}.desc`} multiline className="text-sm text-muted-foreground leading-relaxed" />
                </div>
              );
            })}
          </ItemGroup>

          <div className="mt-12 reveal">
            <Prose>
              <Paragraphs base="arcatext.productSystem.closing" items={arc.productSystem.closing} />
            </Prose>
          </div>
        </SectionBody>
      </section>

      {/* 05 — Key Design Decisions */}
      <section id="sec-05" className="py-20 sm:py-28 scroll-mt-24">
        <SectionBody id="arcatext-05">
          <div className="reveal">
            <SectionHeader number="05" eyebrowPath="arcatext.decisions.eyebrow" titlePath="arcatext.decisions.titleLead" highlightPath="arcatext.decisions.titleHighlight" />
          </div>

          <div className="reveal">
            <Prose>
              <Paragraphs base="arcatext.decisions.intro" items={arc.decisions.intro} />
            </Prose>
          </div>

          <ItemGroup as="div" path="arcatext.decisions.items" className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-4">
            {arc.decisions.items.map((d, i) => (
              <div
                key={i}
                className="reveal rounded-2xl bg-muted/40 p-6 lg:p-8 hover:bg-muted/60 transition-colors"
              >
                <span className="text-sm font-mono text-primary/70">{d.n}</span>
                <Editable as="h3" path={`arcatext.decisions.items.${i}.title`} className="text-lg lg:text-xl font-semibold mt-2 mb-3" />
                <Editable as="p" path={`arcatext.decisions.items.${i}.desc`} multiline className="text-sm text-muted-foreground leading-relaxed" />
              </div>
            ))}
          </ItemGroup>
        </SectionBody>
      </section>

      {/* 06 — Execution / Outcomes */}
      <section id="sec-06" className="py-20 sm:py-28 scroll-mt-24">
        <SectionBody id="arcatext-06">
          <div className="reveal">
            <SectionHeader number="06" eyebrowPath="arcatext.execution.eyebrow" titlePath="arcatext.execution.titleLead" highlightPath="arcatext.execution.titleHighlight" />
          </div>

          {/* Discovery interviews */}
          <div className="reveal">
            <Editable as="h3" path="arcatext.execution.discoveryTitle" className="text-xl sm:text-2xl font-semibold mb-5" />
            <Prose>
              <Paragraphs base="arcatext.execution.discovery" items={arc.execution.discovery} />
            </Prose>
          </div>

          {/* Research synthesis */}
          <div className="mt-16 reveal">
            <Editable as="h3" path="arcatext.execution.synthesisTitle" className="text-xl sm:text-2xl font-semibold mb-5" />
            <Prose>
              <Paragraphs base="arcatext.execution.synthesis" items={arc.execution.synthesis} />
            </Prose>
          </div>

          {/* Directional insights */}
          <div className="mt-20">
            <Editable as="h3" path="arcatext.execution.directionalTitle" className="text-xl sm:text-2xl font-semibold mb-8 reveal" />
            <ItemGroup as="div" path="arcatext.execution.directionalInsights" className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {arc.execution.directionalInsights.map((insight, i) => (
                <div
                  key={i}
                  className="reveal rounded-2xl bg-muted/40 p-6 lg:p-7"
                >
                  <Editable as="h4" path={`arcatext.execution.directionalInsights.${i}.title`} className="font-semibold mb-3 text-balance" />
                  <Editable as="p" path={`arcatext.execution.directionalInsights.${i}.desc`} multiline className="text-sm text-muted-foreground leading-relaxed" />
                  {insight.response && (
                    <div className="mt-5 pt-5 border-t border-primary/15">
                      <p className="text-xs uppercase tracking-[0.18em] text-primary mb-2">
                        Product response
                      </p>
                      <Editable as="p" path={`arcatext.execution.directionalInsights.${i}.response`} multiline className="text-sm text-foreground/85 leading-relaxed" />
                    </div>
                  )}
                </div>
              ))}
            </ItemGroup>
          </div>

          {/* So what */}
          <div className="mt-20 reveal rounded-2xl bg-primary/10 p-8 lg:p-10">
            <Editable as="p" path="arcatext.execution.soWhatLabel" className="text-xs uppercase tracking-[0.2em] text-primary mb-4" />
            <p className="text-xl sm:text-2xl font-semibold leading-snug text-balance mb-5">
              <Editable as="span" path="arcatext.execution.soWhatLead" multiline />{' '}
              <Editable as="span" path="arcatext.execution.soWhatHighlight" className="gradient-text" />
            </p>
            <Prose>
              <Paragraphs base="arcatext.execution.soWhat" items={arc.execution.soWhat} />
            </Prose>
          </div>

          {/* From insight to product response */}
          <div className="mt-20">
            <Editable as="h3" path="arcatext.execution.insightToResponseTitle" className="text-xl sm:text-2xl font-semibold mb-8 reveal" />
            <ItemGroup as="div" path="arcatext.execution.productResponses" className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {arc.execution.productResponses.map((_, i) => (
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
                  <Editable as="h4" path={`arcatext.execution.productResponses.${i}.insight`} className="font-semibold mb-4 text-balance" />
                  <div className="pt-4 border-t border-primary/15">
                    <p className="text-xs uppercase tracking-[0.18em] text-primary mb-2">
                      Response
                    </p>
                    <Editable as="p" path={`arcatext.execution.productResponses.${i}.response`} multiline className="text-sm text-foreground/85 leading-relaxed" />
                  </div>
                </div>
              ))}
            </ItemGroup>
          </div>

          {/* Shipped */}
          <div className="mt-20">
            <Editable as="h3" path="arcatext.execution.shippedTitle" className="text-xl sm:text-2xl font-semibold mb-8 reveal" />
            <ItemGroup as="ol" path="arcatext.execution.outcomes" className="space-y-4">
              {arc.execution.outcomes.map((_, i) => (
                <li
                  key={i}
                  className="reveal flex gap-6 rounded-2xl bg-muted/40 p-6"
                >
                  <span className="text-sm font-mono text-primary/70 pt-0.5 shrink-0 w-8">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <Editable as="h4" path={`arcatext.execution.outcomes.${i}.title`} className="font-semibold mb-1" />
                    <Editable as="p" path={`arcatext.execution.outcomes.${i}.desc`} multiline className="text-sm text-muted-foreground leading-relaxed" />
                  </div>
                </li>
              ))}
            </ItemGroup>
          </div>

          {/* The modular prompt system */}
          <div className="mt-20 reveal">
            <h3 className="text-xl sm:text-2xl font-semibold mb-5">The modular prompt system</h3>
            <PromptArchitecture />
          </div>

          {/* Competitive product requirement */}
          <div className="mt-20 reveal">
            <Editable as="h3" path="arcatext.execution.competitiveTitle" className="text-xl sm:text-2xl font-semibold mb-5" />
            <Prose>
              <Paragraphs base="arcatext.execution.competitive" items={arc.execution.competitive} />
            </Prose>
            {/* Typing-UX diagram for this subsection. It breaks out of the
                centered content column to span the full
                page width (clearing the left section-nav rail at >=1600px),
                without affecting any other content's width. */}
            <div className="mx-[calc(50%-50vw)] px-4 sm:px-6 lg:px-8 min-[1600px]:pl-56 min-[1600px]:pr-12">
              <TypingFlowDiagram />
            </div>
          </div>

          {/* Launch measurement plan */}
          <div className="mt-20">
            <div className="reveal mb-10">
              <Editable as="p" path="arcatext.execution.launchEyebrow" className="text-xs uppercase tracking-[0.2em] text-primary mb-3" />
              <h3 className="text-2xl sm:text-3xl font-semibold mb-6 text-balance max-w-3xl">
                <Editable as="span" path="arcatext.execution.launchLead" />{' '}
                <Editable as="span" path="arcatext.execution.launchHighlight" className="gradient-text" />
              </h3>
              <Prose>
                <Paragraphs base="arcatext.execution.launch" items={arc.execution.launch} />
              </Prose>
            </div>

            <ItemGroup as="div" path="arcatext.execution.launchQuestions" className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12">
              {arc.execution.launchQuestions.map((item, i) => (
                <div
                  key={i}
                  className="reveal rounded-2xl bg-muted/40 p-6 flex gap-5"
                >
                  <span className="text-sm font-mono text-primary/70 shrink-0">
                    {item.n}
                  </span>
                  <Editable as="p" path={`arcatext.execution.launchQuestions.${i}.q`} multiline className="text-base sm:text-lg text-foreground/90 leading-snug" />
                </div>
              ))}
            </ItemGroup>

            <div className="reveal">
              <Editable as="h4" path="arcatext.execution.plannedSignalsLabel" className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-5" />
              <div className="flex flex-wrap gap-2">
                {arc.execution.launchSignals.map((_, i) => (
                  <Editable
                    key={i}
                    as="span"
                    path={`arcatext.execution.launchSignals.${i}`}
                    className="px-3 py-1.5 text-sm rounded-full bg-muted/60 text-foreground/85"
                  />
                ))}
              </div>
            </div>
          </div>
        </SectionBody>
      </section>

      {/* 07 — Deeper Case Studies */}
      <section id="sec-07" className="py-20 sm:py-28 scroll-mt-24">
        <SectionBody id="arcatext-07">
          <div className="reveal">
            <SectionHeader number="07" eyebrowPath="arcatext.caseStudies.eyebrow" titlePath="arcatext.caseStudies.titleLead" highlightPath="arcatext.caseStudies.titleHighlight" />
          </div>

          <div className="reveal">
            <Prose>
              <Paragraphs base="arcatext.caseStudies.intro" items={arc.caseStudies.intro} />
            </Prose>
          </div>

          <ItemGroup as="div" path="arcatext.caseStudies.items" className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-4">
            {arc.caseStudies.items.map((_, i) => (
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
                    <Editable as="h3" path={`arcatext.caseStudies.items.${i}.title`} className="text-lg lg:text-xl font-semibold mt-2 mb-3 group-hover:text-primary transition-colors" />
                    <Editable as="p" path={`arcatext.caseStudies.items.${i}.question`} multiline className="text-sm text-muted-foreground leading-relaxed italic" />
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0 mt-1" />
                </div>
              </a>
            ))}
          </ItemGroup>
        </SectionBody>
      </section>
      </ReorderableSections>

      {/* Footer CTA */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-6 text-balance">
            <Editable as="span" path="arcatext.footerCta.titleLead" />{' '}
            <Editable as="span" path="arcatext.footerCta.titleHighlight" className="gradient-text" />{' '}
            <Editable as="span" path="arcatext.footerCta.titleRest" />
          </h2>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              asChild
              size="lg"
              className="rounded-full px-8 py-6 gradient-bg text-white"
            >
              <a href="#contact">
                <Editable as="span" path="arcatext.footerCta.getInTouch" />
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
                <Editable as="span" path="arcatext.footerCta.backToProjects" />
              </a>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
