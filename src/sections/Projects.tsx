import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowUpRight, ExternalLink, Clock } from 'lucide-react';
import { useContent } from '@/content/ContentContext';
import { Editable } from '@/content/Editable';
import { EditableImage } from '@/content/EditableImage';
import { PasswordModal } from '@/components/PasswordModal';
import { isProjectUnlocked } from '@/lib/projectAuth';

gsap.registerPlugin(ScrollTrigger);

export default function Projects() {
  const { content, isAdmin } = useContent();
  const projects = content.projects.items;
  const sectionRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);
  // Link the visitor is trying to open while the password modal is shown.
  const [pendingLink, setPendingLink] = useState<string | null>(null);

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
        let floatTl: gsap.core.Timeline;
        let snap: gsap.core.Tween | null = null;

        const startFloat = () => {
          floatTl = gsap
            .timeline({ repeat: -1, defaults: { ease: 'sine.inOut' } })
            .to(card, { y: amp, duration: dur })
            .to(card, { y: -amp, duration: dur * 2 })
            .to(card, { y: 0, duration: dur });
        };

        startFloat();
        floatTl!.progress(cards.length ? i / cards.length : 0);

        const onEnter = () => {
          // Stop bobbing and settle to the neutral (y:0) resting position,
          // moving up or down from wherever the float currently is.
          floatTl?.kill();
          snap = gsap.to(card, { y: 0, duration: 0.4, ease: 'power3.out', overwrite: 'auto' });
        };
        const onLeave = () => {
          snap?.kill();
          startFloat(); // resumes smoothly from the current y
        };

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
          {projects.map((project, index) => (
            <div
              key={project.id}
              className="project-card group relative"
              style={{ transform: `rotate(${index % 2 === 0 ? '-1' : '1'}deg)` }}
            >
              <a
                href={project.link}
                onClick={(e) => handleProjectClick(e, project.link)}
                className="block relative overflow-hidden rounded-2xl lg:rounded-3xl bg-card border border-border/50 transition-all duration-500 ease-expo-out hover:border-primary/30 hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-2"
              >
                {/* Image Container */}
                <div className="relative aspect-[4/3] overflow-hidden">
                  <EditableImage
                    path={`projects.items.${index}.image`}
                    alt={project.title}
                    className="w-full h-full object-cover transition-transform duration-700 ease-expo-out group-hover:scale-110"
                    wrapperClassName="w-full h-full"
                  />
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-500" />
                  
                  {/* Timeframe badge */}
                  <div className="absolute top-4 left-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background/80 backdrop-blur-sm text-xs font-medium text-foreground/90">
                    <Clock className="w-3.5 h-3.5 text-primary" />
                    <Editable as="span" path={`projects.items.${index}.timeframe`} />
                  </div>

                  {/* View Project Button */}
                  <div className="absolute top-4 right-4 w-12 h-12 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 ease-expo-out">
                    <ArrowUpRight className="w-5 h-5 text-foreground" />
                  </div>
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
                  <div className="flex items-center gap-2 text-sm font-medium text-primary opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 ease-expo-out">
                    <Editable as="span" path="projects.viewProject" />
                    <ExternalLink className="w-4 h-4" />
                  </div>
                </div>
              </a>
            </div>
          ))}
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
