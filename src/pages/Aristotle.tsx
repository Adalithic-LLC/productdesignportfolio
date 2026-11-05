/**
 * Aristotle — the speed reading experiment, written up against the research.
 *
 * Shorter than the other project pages on purpose: the project was a weekend
 * idea, and the case study's job is the reading that came after it rather than
 * a process narrative it never had. Every factual claim in the copy carries a
 * source, and the sources are listed at the end of the page.
 */
import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowLeft, ArrowUpRight, BookOpen, Check } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useContent } from '@/content/ContentContext';
import { Editable } from '@/content/Editable';
import { EditableBlocks, ItemGroup, SectionBody } from '@/content/EditableBlocks';
import { EditableImage } from '@/content/EditableImage';
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
      <div className="mb-4 flex items-baseline gap-4">
        <span className="font-mono text-sm tracking-wider text-primary/70">{number}</span>
        <Editable
          as="span"
          path={eyebrowPath}
          className="text-xs uppercase tracking-[0.2em] text-muted-foreground"
        />
      </div>
      <h2 className="max-w-3xl text-balance text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
        <Editable as="span" path={titlePath} />{' '}
        <Editable as="span" path={highlightPath} className="gradient-text" />
      </h2>
    </div>
  );
}

/** A section's prose: the stored paragraphs, with blocks insertable between. */
function Paragraphs({ base }: { base: string }) {
  return <EditableBlocks path={base} />;
}

function Prose({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-5 text-base leading-relaxed text-foreground/80 sm:text-lg">
      {children}
    </div>
  );
}

/** A screen from the app, with its caption, at the width the page reads at. */
function Shot({
  src,
  darkSrc,
  altPath,
  caption = false,
}: {
  src: string;
  darkSrc: string;
  altPath: string;
  /** Repeat the alt text under the picture, as this page's figures do. */
  caption?: boolean;
}) {
  return (
    <figure className="reveal">
      <div className="overflow-hidden rounded-2xl border border-border/50 bg-muted/30 shadow-sm">
        <EditableImage
          path={src}
          darkPath={darkSrc}
          altPath={altPath}
          className="block h-auto w-full"
        />
      </div>
      {caption && (
        <figcaption className="mt-3 text-sm text-muted-foreground">
          <Editable as="span" path={altPath} />
        </figcaption>
      )}
    </figure>
  );
}

export default function Aristotle() {
  const rootRef = useRef<HTMLDivElement>(null);
  const { content } = useContent();
  const a = content.aristotle;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>('.reveal').forEach((el) => {
        gsap.fromTo(
          el,
          { opacity: 0, y: 24 },
          {
            opacity: 1,
            y: 0,
            duration: 0.7,
            ease: 'expo.out',
            scrollTrigger: { trigger: el, start: 'top 88%', toggleActions: 'play none none reverse' },
          }
        );
      });
    }, rootRef);
    return () => ctx.revert();
  }, []);

  const tocItems = a.toc.map((_, i) => ({ id: `sec-0${i + 1}`, n: `0${i + 1}` }));

  return (
    <div ref={rootRef} className="relative">
      <SectionToc items={tocItems} labels={a.toc} routeHash="#/aristotle" />

      {/* Top bar */}
      <div className="fixed left-0 right-0 top-0 z-50 border-b border-border/50 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <a
            href="#home"
            className="inline-flex items-center gap-2 text-sm font-medium text-foreground/70 transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            <Editable as="span" path="aristotle.backToPortfolio" />
          </a>
          <SectionNavDropdown items={tocItems} labels={a.toc} routeHash="#/aristotle" />
          <div className="flex items-center gap-2">
            <Editable as="span" path="aristotle.brand" className="text-sm font-semibold gradient-text" />
            <ThemeToggle />
          </div>
        </div>
      </div>

      {/* Page header: the name, what it is, and the facts of the work. */}
      <section className="relative overflow-hidden pb-10 pt-28 sm:pb-12 sm:pt-32">
        <div
          className="absolute inset-0 -z-10 opacity-60"
          style={{
            background:
              'radial-gradient(ellipse at 20% 20%, hsl(var(--primary) / 0.18) 0%, transparent 55%), radial-gradient(ellipse at 80% 0%, hsl(var(--accent) / 0.14) 0%, transparent 50%)',
          }}
        />
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-5xl font-bold tracking-tight text-balance sm:text-6xl lg:text-7xl">
            <Editable as="span" path="aristotle.hero.title" className="gradient-text" />
          </h1>
          <Editable
            as="p"
            path="aristotle.hero.tagline"
            className="mt-5 max-w-3xl text-balance text-xl font-bold tracking-tight text-foreground sm:text-2xl lg:text-3xl"
          />
          <dl className="mt-10 grid max-w-3xl grid-cols-1 gap-6 sm:grid-cols-3">
            {(['role', 'platform', 'status'] as const).map((key) => (
              <div key={key}>
                <Editable
                  as="dt"
                  path={`aristotle.hero.${key}Label`}
                  className="mb-2 block text-xs uppercase tracking-[0.2em] text-muted-foreground"
                />
                <Editable as="dd" path={`aristotle.hero.${key}Value`} className="text-sm text-foreground/90" />
              </div>
            ))}
          </dl>
        </div>
      </section>

      <ReorderableSections pageKey="aristotle">
        {/* 01 — What it is */}
        <section id="sec-01" className="scroll-mt-24 py-16 sm:py-24">
          <SectionBody id="aristotle-01">
            <div className="reveal">
              <SectionHeader
                number="01"
                eyebrowPath="aristotle.overview.eyebrow"
                titlePath="aristotle.overview.titleLead"
                highlightPath="aristotle.overview.titleHighlight"
              />
            </div>

            <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
              <div className="reveal lg:col-span-7">
                <Prose>
                  <Paragraphs base="aristotle.overview.intro" />
                </Prose>
              </div>
              <aside className="reveal lg:col-span-5">
                <div className="rounded-2xl bg-muted/40 p-8">
                  <div className="mb-4 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-primary">
                    <BookOpen className="h-4 w-4" />
                    <Editable as="span" path="aristotle.overview.featuresLabel" />
                  </div>
                  <ItemGroup as="ul" path="aristotle.overview.featuresList" className="space-y-3 text-foreground/90">
                    {a.overview.featuresList.map((_, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <Check className="mt-1 h-4 w-4 shrink-0 text-primary/70" />
                        <Editable as="span" path={`aristotle.overview.featuresList.${i}`} />
                      </li>
                    ))}
                  </ItemGroup>
                </div>
              </aside>
            </div>

            <div className="mt-14">
              <Shot
                src="aristotle.overview.shot"
                darkSrc="aristotle.overview.shotDark"
                altPath="aristotle.overview.shotAlt"
                caption
              />
            </div>
          </SectionBody>
        </section>

        {/* 02 — The claim it shipped with */}
        <section id="sec-02" className="scroll-mt-24 py-16 sm:py-24">
          <SectionBody id="aristotle-02">
            <div className="reveal">
              <SectionHeader
                number="02"
                eyebrowPath="aristotle.origin.eyebrow"
                titlePath="aristotle.origin.titleLead"
                highlightPath="aristotle.origin.titleHighlight"
              />
            </div>
            <div className="reveal max-w-3xl">
              <Prose>
                <Paragraphs base="aristotle.origin.intro" />
              </Prose>
            </div>
          </SectionBody>
        </section>

        {/* 03 — What the research changes */}
        <section id="sec-03" className="scroll-mt-24 py-16 sm:py-24">
          <SectionBody id="aristotle-03">
            <div className="reveal">
              <SectionHeader
                number="03"
                eyebrowPath="aristotle.research.eyebrow"
                titlePath="aristotle.research.titleLead"
                highlightPath="aristotle.research.titleHighlight"
              />
            </div>
            <div className="reveal max-w-3xl">
              <Prose>
                <Paragraphs base="aristotle.research.intro" />
              </Prose>
            </div>

            {/* One card per finding, each ending in where it comes from. */}
            <ItemGroup
              as="div"
              path="aristotle.research.findings"
              className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-2"
            >
              {a.research.findings.map((_, i) => (
                <div key={i} className="reveal flex flex-col rounded-2xl bg-muted/40 p-6 lg:p-8">
                  <Editable
                    as="h3"
                    path={`aristotle.research.findings.${i}.title`}
                    className="mb-3 text-balance text-lg font-semibold leading-snug"
                  />
                  <Editable
                    as="p"
                    path={`aristotle.research.findings.${i}.body`}
                    multiline
                    className="text-sm leading-relaxed text-muted-foreground"
                  />
                  <Editable
                    as="p"
                    path={`aristotle.research.findings.${i}.source`}
                    className="mt-auto pt-5 text-xs uppercase tracking-[0.14em] text-primary/80"
                  />
                </div>
              ))}
            </ItemGroup>

            <div className="reveal mt-12 max-w-3xl rounded-2xl bg-primary/10 p-8">
              <Prose>
                <Paragraphs base="aristotle.research.closing" />
              </Prose>
            </div>
          </SectionBody>
        </section>

        {/* 04 — What I would change */}
        <section id="sec-04" className="scroll-mt-24 py-16 sm:py-24">
          <SectionBody id="aristotle-04">
            <div className="reveal">
              <SectionHeader
                number="04"
                eyebrowPath="aristotle.rethink.eyebrow"
                titlePath="aristotle.rethink.titleLead"
                highlightPath="aristotle.rethink.titleHighlight"
              />
            </div>
            <div className="reveal max-w-3xl">
              <Prose>
                <Paragraphs base="aristotle.rethink.intro" />
              </Prose>
            </div>

            <div className="mt-12 grid grid-cols-1 gap-12 lg:grid-cols-2">
              <div>
                <Editable
                  as="h3"
                  path="aristotle.rethink.keepsLabel"
                  className="reveal mb-6 text-xl font-semibold sm:text-2xl"
                />
                <ItemGroup as="div" path="aristotle.rethink.keeps" className="space-y-4">
                  {a.rethink.keeps.map((_, i) => (
                    <div key={i} className="reveal rounded-2xl bg-muted/40 p-6">
                      <Editable
                        as="h4"
                        path={`aristotle.rethink.keeps.${i}.title`}
                        className="mb-2 font-semibold"
                      />
                      <Editable
                        as="p"
                        path={`aristotle.rethink.keeps.${i}.body`}
                        multiline
                        className="text-sm leading-relaxed text-muted-foreground"
                      />
                    </div>
                  ))}
                </ItemGroup>
              </div>

              <div>
                <Editable
                  as="h3"
                  path="aristotle.rethink.changesLabel"
                  className="reveal mb-6 text-xl font-semibold sm:text-2xl"
                />
                <ItemGroup as="ul" path="aristotle.rethink.changes" className="reveal space-y-4">
                  {a.rethink.changes.map((_, i) => (
                    <li key={i} className="flex items-start gap-3 text-foreground/85">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" />
                      <Editable as="span" path={`aristotle.rethink.changes.${i}`} multiline />
                    </li>
                  ))}
                </ItemGroup>
              </div>
            </div>

            {/* The whole window, and beside it the pacing block on its own:
                the wide shot carries the reading surface, the narrow one the
                controls that are too small to read in it. The 8/4 split is
                what keeps the two frames close to the same height. */}
            <div className="mt-14 grid grid-cols-1 gap-8 lg:grid-cols-12">
              <div className="lg:col-span-8">
                <Shot
                  src="aristotle.rethink.isolateShot"
                  darkSrc="aristotle.rethink.isolateShotDark"
                  altPath="aristotle.rethink.isolateAlt"
                  caption
                />
              </div>
              <div className="lg:col-span-4">
                <Shot
                  src="aristotle.rethink.settingsShot"
                  darkSrc="aristotle.rethink.settingsShotDark"
                  altPath="aristotle.rethink.settingsAlt"
                  caption
                />
              </div>
            </div>
          </SectionBody>
        </section>

        {/* 05 — Where the reading piles up */}
        <section id="sec-05" className="scroll-mt-24 py-16 sm:py-24">
          <SectionBody id="aristotle-05">
            <div className="reveal">
              <SectionHeader
                number="05"
                eyebrowPath="aristotle.opportunity.eyebrow"
                titlePath="aristotle.opportunity.titleLead"
                highlightPath="aristotle.opportunity.titleHighlight"
              />
            </div>
            <div className="reveal max-w-3xl">
              <Prose>
                <Paragraphs base="aristotle.opportunity.intro" />
              </Prose>
            </div>

            <ItemGroup
              as="div"
              path="aristotle.opportunity.areas"
              className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-3"
            >
              {a.opportunity.areas.map((_, i) => (
                <div key={i} className="reveal rounded-2xl bg-muted/40 p-6 lg:p-8">
                  <Editable
                    as="h3"
                    path={`aristotle.opportunity.areas.${i}.title`}
                    className="mb-3 text-balance text-lg font-semibold leading-snug"
                  />
                  <Editable
                    as="p"
                    path={`aristotle.opportunity.areas.${i}.body`}
                    multiline
                    className="text-sm leading-relaxed text-muted-foreground"
                  />
                </div>
              ))}
            </ItemGroup>

            <div className="reveal mt-12 max-w-3xl">
              <Prose>
                <Paragraphs base="aristotle.opportunity.closing" />
              </Prose>
            </div>
          </SectionBody>
        </section>

        {/* 06 — What I would test next */}
        <section id="sec-06" className="scroll-mt-24 py-16 sm:py-24">
          <SectionBody id="aristotle-06">
            <div className="reveal">
              <SectionHeader
                number="06"
                eyebrowPath="aristotle.next.eyebrow"
                titlePath="aristotle.next.titleLead"
                highlightPath="aristotle.next.titleHighlight"
              />
            </div>
            <div className="reveal max-w-3xl">
              <Prose>
                <Paragraphs base="aristotle.next.intro" />
              </Prose>
            </div>

            <ItemGroup as="ul" path="aristotle.next.tests" className="reveal mt-10 max-w-3xl space-y-4">
              {a.next.tests.map((_, i) => (
                <li key={i} className="flex items-start gap-3 text-foreground/85">
                  <span className="mt-1 font-mono text-xs text-primary/70">{String(i + 1).padStart(2, '0')}</span>
                  <Editable as="span" path={`aristotle.next.tests.${i}`} multiline />
                </li>
              ))}
            </ItemGroup>

            <div className="reveal mt-12 max-w-3xl rounded-2xl bg-muted/40 p-8">
              <Editable
                as="h3"
                path="aristotle.next.closingLabel"
                className="mb-4 text-xs uppercase tracking-[0.2em] text-primary"
              />
              <Prose>
                <Paragraphs base="aristotle.next.closing" />
              </Prose>
            </div>

            {/* The sources behind every figure above. */}
            <div className="reveal mt-16 border-t border-border/40 pt-8">
              <Editable
                as="h3"
                path="aristotle.sources.label"
                className="mb-5 text-xs uppercase tracking-[0.2em] text-muted-foreground"
              />
              <ItemGroup as="ol" path="aristotle.sources.items" className="space-y-3">
                {a.sources.items.map((item, i) => (
                  <li key={i} className="text-sm leading-relaxed text-muted-foreground">
                    <Editable as="span" path={`aristotle.sources.items.${i}.text`} multiline />{' '}
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      Link
                      <ArrowUpRight className="h-3 w-3" />
                    </a>
                  </li>
                ))}
              </ItemGroup>
            </div>
          </SectionBody>
        </section>
      </ReorderableSections>
    </div>
  );
}
