import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Briefcase } from 'lucide-react';
import { useContent } from '@/content/ContentContext';
import { Editable } from '@/content/Editable';

gsap.registerPlugin(ScrollTrigger);

export default function About() {
  const { content } = useContent();
  const about = content.about;
  const sectionRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        contentRef.current?.querySelectorAll('.animate-item') || [],
        { opacity: 0, y: 40 },
        {
          opacity: 1,
          y: 0,
          duration: 0.6,
          ease: 'expo.out',
          stagger: 0.1,
          scrollTrigger: {
            trigger: contentRef.current,
            start: 'top 80%',
            toggleActions: 'play none none reverse',
          },
        }
      );

      gsap.fromTo(
        '.skill-tag',
        { opacity: 0, scale: 0.8 },
        {
          opacity: 1,
          scale: 1,
          duration: 0.4,
          ease: 'elastic.out(1, 0.5)',
          stagger: 0.05,
          scrollTrigger: {
            trigger: '.skills-container',
            start: 'top 85%',
            toggleActions: 'play none none reverse',
          },
        }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="about"
      className="relative py-24 md:py-32 overflow-hidden"
    >
      {/* Background Decoration */}
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      {/* One column now that the portrait is gone. Held to a reading width
          rather than run across the full 7xl the two-column layout used: the
          bio is prose, and prose set that wide is hard to track back from the
          end of one line to the start of the next. */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div ref={contentRef} className="space-y-8">
          {/* Section Title */}
          <div className="animate-item">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold">
              <Editable as="span" path="about.headingLead" />{' '}
              <Editable as="span" path="about.headingHighlight" className="gradient-text" />
            </h2>
          </div>

          {/* Bio */}
          <div className="animate-item space-y-4">
            <Editable
              as="p"
              path="about.bio1"
              multiline
              className="text-lg text-foreground/90 leading-relaxed"
            />
            <Editable
              as="p"
              path="about.bio2"
              multiline
              className="text-muted-foreground leading-relaxed"
            />
          </div>

          {/* Skills */}
          <div className="animate-item">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-primary" />
              <Editable as="span" path="about.skillsTitle" />
            </h3>
            <div className="skills-container flex flex-wrap gap-2">
              {about.skills.map((_, i) => (
                <Editable
                  key={i}
                  as="span"
                  path={`about.skills.${i}`}
                  className="skill-tag px-4 py-2 text-sm font-medium rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors duration-200"
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
