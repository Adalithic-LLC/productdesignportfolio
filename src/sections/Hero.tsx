import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { useContent } from '@/content/ContentContext';
import { Editable } from '@/content/Editable';
import { HeroWorkCluster, ProductsCardStack } from '@/components/HeroWorkCollage';
import { ArcatextCardStack } from '@/components/ArcatextCardStack';

export default function Hero() {
  const { content, isAdmin } = useContent();
  const hero = content.hero;
  const heroRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Title animation - split characters
      if (titleRef.current) {
        const chars = titleRef.current.querySelectorAll('.char');
        gsap.fromTo(
          chars,
          { opacity: 0, rotateX: 90, translateZ: -100 },
          {
            opacity: 1,
            rotateX: 0,
            translateZ: 0,
            duration: 0.8,
            ease: 'expo.out',
            stagger: 0.03,
            delay: 0.3,
          }
        );
      }

      // Subtitle animation
      gsap.fromTo(
        subtitleRef.current,
        { opacity: 0, filter: 'blur(20px)' },
        {
          opacity: 1,
          filter: 'blur(0px)',
          duration: 0.6,
          ease: 'smooth',
          delay: 0.8,
        }
      );
    }, heroRef);

    return () => ctx.revert();
  }, []);

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

  const scrollToProjects = () => {
    document.querySelector('#projects')?.scrollIntoView({ behavior: 'smooth' });
  };

  const titleText = hero.title;

  return (
    <section
      ref={heroRef}
      id="home"
      className="relative flex min-h-screen items-center justify-center overflow-hidden"
      style={{ perspective: '1200px' }}
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
        {/* The introduction leads from the left, with the deck centred beside it
            and D2C on the right. The first two column fractions are swapped from
            where the copy sat in the middle, so the copy keeps the width it had
            and the deck keeps its own. DOM order puts the copy first, which is
            also the order it wants when the grid collapses to one column. */}
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[minmax(0,1.68fr)_minmax(0,1fr)_minmax(0,1.43fr)] lg:gap-12">
          <div className="max-w-2xl text-left lg:col-start-1 lg:row-start-1">
            <h1
              ref={titleRef}
              className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6 tracking-tight text-balance"
              style={{ transformStyle: 'preserve-3d' }}
            >
              {isAdmin ? (
                <Editable as="span" path="hero.title" />
              ) : (
                titleText.split(' ').map((word, w) => (
                  <span key={w} className="inline-block whitespace-nowrap">
                    {word.split('').map((char, i) => (
                      <span key={i} className="char inline-block">
                        {char}
                      </span>
                    ))}
                    {w < titleText.split(' ').length - 1 && (
                      <span className="char inline-block">&nbsp;</span>
                    )}
                  </span>
                ))
              )}
            </h1>

            <p
              ref={subtitleRef}
              /* pre-line so the blank line typed into the copy reads as a paragraph break. */
              className="whitespace-pre-line text-[15px] sm:text-lg lg:text-2xl font-bold text-foreground/80 leading-relaxed text-balance"
            >
              <Editable as="span" path="hero.subtitle" multiline />
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
          </div>

          <div className="mx-auto w-2/3 sm:w-1/2 lg:col-start-2 lg:row-start-1 lg:w-4/5">
            <ArcatextCardStack onSelect={scrollToProjects} />
          </div>
          <div className="mx-auto w-1/2 sm:w-2/5 lg:col-start-3 lg:row-start-1 lg:ml-auto lg:mr-0 lg:w-[68%]">
            <ProductsCardStack onSelect={scrollToProjects} />
          </div>
        </div>

        {/* The rest of the work, beneath — flush left, under the card deck. */}
        <div className="mt-10 w-full lg:mt-12">
          <HeroWorkCluster onSelect={scrollToProjects} />
        </div>
      </div>

      {/* Bottom Gradient Fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent pointer-events-none" />
    </section>
  );
}
