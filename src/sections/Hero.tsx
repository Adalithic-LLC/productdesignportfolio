import { useEffect, useRef } from 'react';
import { useContent } from '@/content/ContentContext';
import { Editable } from '@/content/Editable';
import { Seams } from '@/content/EditableBlocks';
import { plainText } from '@/content/inlineMarks';
import { HeroShowcase } from '@/components/HeroShowcase';
import { HeroBody, HeroTypingSpeed } from '@/components/HeroBody';
import { HeroRise } from '@/components/HeroRise';
import { afterTyping, typeSpeed, typingEnd } from '@/lib/heroReveal';

export default function Hero() {
  const { content } = useContent();
  const hero = content.hero;
  const heroRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);

  // The title and the paragraph both type themselves in -- see HeroBody, which
  // owns that timeline for each of them. The title used to flip its characters
  // in from 90 degrees; that fought the paragraph's reveal for attention and
  // needed a 3D context the hero no longer sets up.

  // Parallax effect on scroll
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const heroHeight = heroRef.current?.offsetHeight || 0;
      const progress = Math.min(scrollY / heroHeight, 1);

      if (titleRef.current) {
        titleRef.current.style.transform = `translateY(${-scrollY * 0.3}px)`;
        titleRef.current.style.opacity = String(1 - progress * 1.5);
      }

      if (subtitleRef.current) {
        subtitleRef.current.style.transform = `translateY(${-scrollY * 0.2}px)`;
        subtitleRef.current.style.opacity = String(1 - progress * 2);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  /** The paragraph starts when the title has finished typing, so the two read
      as one hand working down the column instead of two that overlap. */
  const speed = typeSpeed(hero.typeSpeed);
  const titleChars = plainText(hero.title).length;
  const subtitleStart = afterTyping(titleChars, speed);

  /** The cards in the hero's seams start arriving a beat after the last
      character is typed, so the copy is finished before the column grows. */
  const cardsStart = typingEnd(plainText(hero.subtitle).length, speed, subtitleStart) + 0.25;

  return (
    <section
      ref={heroRef}
      id="home"
      className="relative flex min-h-screen items-center justify-center overflow-hidden"
    >
      {/* Animated Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5 animate-gradient" />
      
      {/* Mesh Gradient Overlay */}
      <div 
        className="absolute inset-0 opacity-30 dark:opacity-20"
        style={{
          background: 'radial-gradient(ellipse at 20% 30%, hsl(var(--primary) / 0.3) 0%, transparent 50%), radial-gradient(ellipse at 80% 70%, hsl(var(--accent) / 0.2) 0%, transparent 50%)',
        }}
      />

      {/* Main Content */}
      <div className="relative z-10 w-full px-4 sm:px-6 lg:px-10 py-24">
        {/* The copy leads, and the previews beneath it drive the display zone
            on the right. One zone rather than a scattered collage: every
            screen now gets the same room instead of competing for it. */}
        <HeroShowcase>
          {/* Every gap in the hero copy is an insertion point in admin, the same
              as a case study's section body: above the headline, between the
              headline and the paragraph, and under the role line. */}
          <HeroRise startAt={cardsStart}>
          <Seams id="hero" rise>
            <h1
              ref={titleRef}
              /* The brand blue, through the same class the rest of the site
                 marks its name with. */
              className="gradient-text text-3xl sm:text-4xl lg:text-5xl font-bold mb-6 tracking-tight text-balance"
            >
              <HeroBody path="hero.title" speed={speed} />
            </h1>

            <p
              ref={subtitleRef}
              /* pre-line so the blank line typed into the copy reads as a paragraph break. */
              className="whitespace-pre-line text-[15px] sm:text-lg lg:text-2xl font-semibold text-foreground/80 leading-relaxed text-balance"
            >
              <HeroBody
                path="hero.subtitle"
                delay={subtitleStart}
                speed={speed}
              />
            </p>

            {/* Same shape as the case-study callouts: label over value. */}
            <dl className="mt-8">
              <Editable
                as="dt"
                path="hero.roleLabel"
                className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2 block"
              />
              <Editable as="dd" path="hero.roleValue" className="text-base text-foreground/90" />
            </dl>

            {/* Admin only: the copy above is plain text while it is being
                edited, so the speed is set here and watched in Preview. */}
            <HeroTypingSpeed />
          </Seams>
          </HeroRise>
        </HeroShowcase>
      </div>

      {/* Bottom Gradient Fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent pointer-events-none" />
    </section>
  );
}
