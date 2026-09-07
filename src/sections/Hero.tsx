import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ArrowDown } from 'lucide-react';
import { useContent } from '@/content/ContentContext';
import { Editable } from '@/content/Editable';

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

      // Scroll indicator bounce
      gsap.to('.scroll-indicator', {
        y: 10,
        duration: 1.5,
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true,
        delay: 2,
      });
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

  const titleText = hero.title;

  return (
    <section
      ref={heroRef}
      id="home"
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
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
      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8 opacity-0 animate-fade-in"
          style={{ animationDelay: '0.2s', animationFillMode: 'forwards' }}
        >
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <Editable as="span" path="hero.badge" className="text-sm font-medium text-primary" />
        </div>

        {/* Title */}
        <h1
          ref={titleRef}
          className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 tracking-tight"
          style={{ transformStyle: 'preserve-3d' }}
        >
          {isAdmin ? (
            <Editable as="span" path="hero.title" />
          ) : (
            titleText.split('').map((char, i) => (
              <span
                key={i}
                className="char inline-block"
                style={{ display: char === ' ' ? 'inline' : 'inline-block' }}
              >
                {char === ' ' ? '\u00A0' : char}
              </span>
            ))
          )}
        </h1>

        {/* Subtitle */}
        <p
          ref={subtitleRef}
          className="text-lg sm:text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-10 leading-relaxed"
        >
          <Editable as="span" path="hero.subtitle" multiline />
        </p>

        {/* Stats Row */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8 max-w-2xl mx-auto opacity-0 animate-fade-in"
          style={{ animationDelay: '1.4s', animationFillMode: 'forwards' }}
        >
          {hero.stats.map((_, i) => (
            <div key={i} className="text-center">
              <Editable
                as="div"
                path={`hero.stats.${i}.value`}
                className="text-2xl sm:text-3xl font-bold gradient-text"
              />
              <Editable
                as="div"
                path={`hero.stats.${i}.label`}
                className="text-sm text-muted-foreground mt-1"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="scroll-indicator absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-muted-foreground">
        <Editable as="span" path="hero.scrollText" className="text-xs font-medium uppercase tracking-wider" />
        <ArrowDown className="w-5 h-5" />
      </div>

      {/* Bottom Gradient Fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent pointer-events-none" />
    </section>
  );
}
