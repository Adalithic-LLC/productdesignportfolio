import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowRight, ArrowUpRight, ExternalLink, Clock, Layers, X } from 'lucide-react';
import { useContent } from '@/content/ContentContext';
import { Editable } from '@/content/Editable';
import { BlockSlot } from '@/content/EditableBlocks';
import { EditableImage } from '@/content/EditableImage';
import { PasswordModal } from '@/components/PasswordModal';
import { isProjectUnlocked } from '@/lib/projectAuth';
import { HIGHLIGHT_MS, onProjectHighlight } from '@/lib/highlightProject';

gsap.registerPlugin(ScrollTrigger);

export default function Projects() {
  const { content, isAdmin, setText, insertTool, moveMode } = useContent();
  const projects = content.projects.items;
  /* The Arcatext case studies, as their own tile in the Work grid. Hidden ones
     are left out here exactly as they are on the project page, and so are any
     taken off this card alone (`offHome`) -- admin's Hidden content panel
     puts either back. */
  const caseStudies = content.arcatext.features
    .map((f, i) => ({ slug: f.slug, index: i, hidden: f.hidden, offHome: f.offHome }))
    .filter((f) => !f.hidden && !f.offHome);
  const sectionRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);
  // Link the visitor is trying to open while the password modal is shown.
  const [pendingLink, setPendingLink] = useState<string | null>(null);
  /** Card a hero tile pointed at: it glows and holds still for a few seconds. */
  const [litTitle, setLitTitle] = useState<string | null>(null);
  const litIndex = litTitle
    ? projects.findIndex((p) => p.title.toLowerCase() === litTitle.toLowerCase())
    : -1;
  /** Read inside the GSAP closures, which are built once and never re-run. */
  const litIndexRef = useRef(-1);
  /** Same, for the highlight listener: it is registered once, with no deps. */
  const projectsRef = useRef(projects);
  useEffect(() => {
    projectsRef.current = projects;
  }, [projects]);
  /** Per-card float controls, so the lit card can be held still from outside. */
  const floats = useRef(new Map<number, { stop: () => void; start: () => void }>());

  useEffect(() => {
    let clear: ReturnType<typeof setTimeout>;
    const off = onProjectHighlight((title) => {
      setLitTitle(title);
      clearTimeout(clear);
      clear = setTimeout(() => setLitTitle(null), HIGHLIGHT_MS);

      // Go to the card, not to the top of the section. The grid is several
      // rows tall, so landing on the heading regularly leaves the card that
      // was just lit below the fold -- the highlight would burn its few
      // seconds out of sight. Centring it also means the last row travels as
      // far as the browser can take it rather than stopping short.
      //
      // A frame's wait lets the effect below settle the card out of its float
      // first, so the scroll is measured against a card at rest.
      const index = projectsRef.current.findIndex(
        (p) => p.title.toLowerCase() === title.toLowerCase()
      );
      requestAnimationFrame(() => {
        const cards = cardsRef.current?.querySelectorAll<HTMLElement>('.project-card');
        // No card by that name: the section is still the right neighbourhood.
        const target = (index === -1 ? null : cards?.[index]) ?? sectionRef.current;
        target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    });
    return () => {
      off();
      clearTimeout(clear);
    };
  }, []);

  // Only the card that changed state is touched, so the others keep the phase
  // they have been bobbing at rather than restarting.
  const wasLit = useRef(-1);
  useEffect(() => {
    litIndexRef.current = litIndex;
    if (wasLit.current !== -1 && wasLit.current !== litIndex) {
      floats.current.get(wasLit.current)?.start();
    }
    if (litIndex !== -1) floats.current.get(litIndex)?.stop();
    wasLit.current = litIndex;
  }, [litIndex]);

  const handleProjectClick = (e: React.MouseEvent, link: string) => {
    // In admin mode, navigate normally — admin persists across pages and the
    // project gate is bypassed for admins. (Clicking editable text edits it
    // instead, since Editable stops propagation in admin.)
    if (isAdmin) return;
    // Already unlocked this session — let the link navigate normally.
    if (isProjectUnlocked()) return;
    e.preventDefault();
    setPendingLink(link);
  };

  useEffect(() => {
    // Cleanups for the manually-attached hover listeners.
    const removers: Array<() => void> = [];

    const ctx = gsap.context(() => {
      // Title animation
      gsap.fromTo(
        titleRef.current,
        { opacity: 0, y: 50, clipPath: 'inset(100% 0 0 0)' },
        {
          opacity: 1,
          y: 0,
          clipPath: 'inset(0% 0 0 0)',
          duration: 0.6,
          ease: 'expo.out',
          scrollTrigger: {
            trigger: titleRef.current,
            start: 'top 85%',
            toggleActions: 'play none none reverse',
          },
        }
      );

      const cards = Array.from(
        cardsRef.current?.querySelectorAll<HTMLElement>('.project-card') ?? []
      );

      cards.forEach((card, i) => {
        // Entrance: cards fade in on scroll. Opacity only -- the float below
        // owns the transform, so the entrance stays off it entirely.
        gsap.fromTo(
          card,
          { opacity: 0 },
          {
            opacity: 1,
            duration: 0.7,
            ease: 'expo.out',
            scrollTrigger: {
              trigger: card,
              start: 'top 85%',
              toggleActions: 'play none none reverse',
            },
          }
        );

        // Persistent floating: a gentle, looping bob on the Y axis. Each loop
        // starts and ends at y:0, and
        // every `.to` reads the current value, so resuming after a hover is
        // seamless. Cards are phase-offset so they don't bob in unison.
        const amp = 9; // px — subtle but perceptible
        const dur = 0.9 + (i % 4) * 0.18;
        const stillness = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        let floatTl: gsap.core.Timeline | undefined;
        let snap: gsap.core.Tween | null = null;

        const startFloat = () => {
          if (stillness) return;
          floatTl = gsap
            .timeline({ repeat: -1, defaults: { ease: 'sine.inOut' } })
            .to(card, { y: amp, duration: dur })
            .to(card, { y: -amp, duration: dur * 2 })
            .to(card, { y: 0, duration: dur });
        };

        startFloat();
        floatTl?.progress(cards.length ? i / cards.length : 0);

        const onEnter = () => {
          // Stop bobbing and settle to the neutral (y:0) resting position,
          // moving up or down from wherever the float currently is.
          floatTl?.kill();
          snap = gsap.to(card, { y: 0, duration: 0.4, ease: 'power3.out', overwrite: 'auto' });
        };
        const onLeave = () => {
          snap?.kill();
          if (litIndexRef.current === i) return; // a lit card stays still
          startFloat(); // resumes smoothly from the current y
        };

        const settle = () => {
          floatTl?.kill();
          snap?.kill();
          snap = gsap.to(card, { y: 0, duration: 0.4, ease: 'power3.out', overwrite: 'auto' });
        };
        floats.current.set(i, {
          stop: settle,
          start: () => {
            snap?.kill();
            startFloat();
          },
        });

        card.addEventListener('mouseenter', onEnter);
        card.addEventListener('mouseleave', onLeave);
        removers.push(() => {
          card.removeEventListener('mouseenter', onEnter);
          card.removeEventListener('mouseleave', onLeave);
        });
      });
    }, sectionRef);

    return () => {
      removers.forEach((fn) => fn());
      ctx.revert();
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      id="projects"
      className="relative py-24 md:py-32"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div ref={titleRef} className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold">
            <Editable as="span" path="projects.heading" className="gradient-text" />
          </h2>
        </div>

        {/* Projects Grid */}
        <div
          ref={cardsRef}
          className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8"
        >
          {projects.map((project, index) => {
            // A project without a case study page yet: the card still reads,
            // but nothing about it should promise a page to open.
            const hasPage = Boolean(project.link);
            return (
            <div
              key={project.id}
              className="project-card group relative"
              /* The case-studies tile sits at order 1, so the first project
                 keeps the opening slot and every later one moves down by one
                 rather than the tile being appended at the end. */
              style={{
                transform: `rotate(${index % 2 === 0 ? '-1' : '1'}deg)`,
                order: index === 0 ? 0 : index + 1,
              }}
            >
              <a
                href={hasPage ? project.link : undefined}
                onClick={hasPage ? (e) => handleProjectClick(e, project.link) : undefined}
                className={`block relative overflow-hidden rounded-2xl lg:rounded-3xl bg-card border border-border/50 transition-all duration-500 ease-expo-out hover:border-primary/30 hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-2 ${
                  litIndex === index ? 'project-lit' : ''
                }`}
              >
                {/* Image Container */}
                <div className="relative aspect-[4/3] overflow-hidden">
                  <EditableImage
                    path={`projects.items.${index}.image`}
                    darkPath={`projects.items.${index}.imageDark`}
                    alt={project.title}
                    className="w-full h-full object-cover transition-transform duration-700 ease-expo-out group-hover:scale-110"
                    wrapperClassName="w-full h-full"
                  />
                  {/* Scrim, so the pill and the arrow stay legible over a
                      photograph. A flat product shot needs no help, and on the
                      dark theme the gradient would wash its background from
                      white down to charcoal. */}
                  {!project.flatImage && (
                    <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-500" />
                  )}
                  
                  {/* Timeframe badge — skipped when there is no duration to
                      show, rather than rendering an empty pill. */}
                  {(project.timeframe || isAdmin) && (
                    <div className="absolute top-4 left-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background/80 backdrop-blur-sm text-xs font-medium text-foreground/90">
                      <Clock className="w-3.5 h-3.5 text-primary" />
                      <Editable as="span" path={`projects.items.${index}.timeframe`} />
                    </div>
                  )}

                  {/* View Project Button */}
                  {hasPage && (
                    <div className="absolute top-4 right-4 w-12 h-12 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 ease-expo-out">
                      <ArrowUpRight className="w-5 h-5 text-foreground" />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-6 lg:p-8">
                  {/* Tags */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {project.tags.map((_, tagIndex) => (
                      <Editable
                        key={tagIndex}
                        as="span"
                        path={`projects.items.${index}.tags.${tagIndex}`}
                        className="px-3 py-1 text-xs font-medium rounded-full bg-primary/10 text-primary"
                      />
                    ))}
                  </div>

                  {/* Title */}
                  <Editable
                    as="h3"
                    path={`projects.items.${index}.title`}
                    className="text-xl lg:text-2xl font-semibold mb-2 group-hover:text-primary transition-colors duration-300"
                  />

                  {/* Description */}
                  <Editable
                    as="p"
                    path={`projects.items.${index}.description`}
                    multiline
                    className="text-muted-foreground text-sm lg:text-base mb-4"
                  />

                  {/* Link */}
                  {hasPage && (
                    <div className="flex items-center gap-2 text-sm font-medium text-primary opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 ease-expo-out">
                      <Editable as="span" path="projects.viewProject" />
                      <ExternalLink className="w-4 h-4" />
                    </div>
                  )}
                </div>
              </a>
            </div>
            );
          })}

          {/* The Arcatext case studies take the slot after the first project,
              pushing everything below down one. Deliberately not a
              `.project-card`: that class indexes one-to-one with `projects`
              for the float animation and the hero-tile highlight, and an extra
              member would point both at the wrong card. */}
          <div className="relative" style={{ order: 1 }}>
            <div className="relative h-full rounded-2xl lg:rounded-3xl border border-border/50 bg-card p-4 pt-16 lg:p-5 lg:pt-16">
              {/* Same floating pill as the timeframe badge on the cards. */}
              <div className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-background/80 px-3 py-1.5 text-xs font-medium text-foreground/90 backdrop-blur-sm">
                <Layers className="h-3.5 w-3.5 text-primary" />
                Arcatext case studies
              </div>

              {caseStudies.length > 0 && (
                <div className="grid grid-cols-2 gap-3 lg:gap-4">
                  {caseStudies.map(({ slug, index }, n) => (
                    <div key={slug} className="relative flex">
                      <a
                        href={`#/arcatext/${slug}`}
                        onClick={(e) => handleProjectClick(e, `#/arcatext/${slug}`)}
                        className="group/mini flex flex-1 flex-col rounded-xl bg-muted/40 p-3.5 transition-shadow duration-300 hover:shadow-[0_0_18px_8px_rgba(13,95,254,0.25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:p-4"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-mono text-[11px] text-primary/70">
                            Case {String(n + 1).padStart(2, '0')}
                          </span>
                          {!isAdmin && (
                            <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          )}
                        </div>
                        <Editable
                          as="h3"
                          path={`arcatext.features.${index}.title`}
                          className="mb-1.5 mt-1.5 text-sm font-semibold leading-snug text-foreground lg:text-base"
                        />
                        <Editable
                          as="p"
                          path={`arcatext.features.${index}.body`}
                          multiline
                          className="text-xs italic leading-relaxed text-muted-foreground lg:text-[13px]"
                        />
                      </a>
                      {/* Outside the link, so a click removes the tile rather
                          than opening the case study. Only off this card: the
                          case study and its page stay as they are. */}
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => setText(`arcatext.features.${index}.offHome`, 'hidden')}
                          title="Remove from this card (the case study itself stays; Hidden content puts it back)"
                          aria-label="Remove from this card"
                          className="absolute right-2 top-2 z-20 flex h-6 w-6 items-center justify-center rounded-md border border-border/60 bg-background/90 text-muted-foreground opacity-70 shadow-sm transition hover:border-destructive/50 hover:bg-destructive/10 hover:text-destructive hover:opacity-100"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {/* Anything else the card should carry -- a grid, a card, a
                  line of text -- inserted from admin's Element menu. */}
              <BlockSlot
                path="projects.caseStudiesBlocks"
                className={caseStudies.length > 0 ? 'mb-0 mt-4' : 'my-0'}
              />
              {/* The slot draws nothing until a tool is armed, so in admin an
                  empty one says where it is and how to fill it. */}
              {isAdmin &&
                !insertTool &&
                !moveMode &&
                !(content.projects.caseStudiesBlocks ?? []).length && (
                  <div
                    className={`flex min-h-24 items-center justify-center rounded-xl border border-dashed border-primary/30 bg-primary/5 p-4 text-center text-[11px] leading-relaxed text-muted-foreground ${
                      caseStudies.length > 0 ? 'mt-4' : ''
                    }`}
                  >
                    Add to this card: open Settings, pick an element (a grid, a card, text) from
                    Element, then click the line that appears here.
                  </div>
                )}
            </div>
          </div>
        </div>

      </div>

      <PasswordModal
        open={pendingLink !== null}
        onOpenChange={(open) => {
          if (!open) setPendingLink(null);
        }}
        onSuccess={() => {
          if (pendingLink) window.location.href = pendingLink;
          setPendingLink(null);
        }}
      />
    </section>
  );
}
