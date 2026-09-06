import { useEffect, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ThemeProvider } from '@/hooks/useTheme';
import { ContentProvider } from '@/content/ContentContext';
import { AdminBar } from '@/content/AdminBar';
import Navigation from '@/sections/Navigation';
import Hero from '@/sections/Hero';
import Projects from '@/sections/Projects';
import About from '@/sections/About';
import Contact from '@/sections/Contact';
import Footer from '@/sections/Footer';
import Arcatext from '@/pages/Arcatext';
import Conversant from '@/pages/Conversant';
import UsaaApp from '@/pages/UsaaApp';
import MemberHome from '@/pages/MemberHome';
import { ProjectGate } from '@/components/ProjectGate';
import { AdminToggle } from '@/components/AdminToggle';
import { isAdminUnlocked, unlockAdminSession, ADMIN_CHANGE_EVENT } from '@/lib/adminAuth';

gsap.registerPlugin(ScrollTrigger);

/** Routes whose pages carry a section nav, which hosts its own Admin entry. */
const PROJECT_ROUTES = ['arcatext', 'conversant', 'usaa', 'memberhome'];

/**
 * Resolves the current route and whether the URL carries an admin flag.
 * Admin mode is enabled by `#/admin` (home), an `?admin` flag on any route
 * (e.g. `#/arcatext?admin`), or — once unlocked via the Admin button — a
 * sessionStorage flag that persists across navigation.
 */
function parseLocation(): { route: string; urlAdmin: boolean } {
  const hash = window.location.hash;
  const path = hash.startsWith('#/') ? hash.slice(2).split('?')[0] : '';
  const query = hash.split('?')[1] ?? '';
  const urlAdmin = path === 'admin' || new URLSearchParams(query).has('admin');
  return { route: path === 'admin' ? '' : path, urlAdmin };
}

function App() {
  const [route, setRoute] = useState(() => parseLocation().route);
  const [isAdmin, setIsAdmin] = useState(
    () => parseLocation().urlAdmin || isAdminUnlocked()
  );

  useEffect(() => {
    const sync = () => {
      const { route: nextRoute, urlAdmin } = parseLocation();
      // An admin URL flag unlocks the persistent session (idempotent).
      if (urlAdmin) unlockAdminSession();
      setRoute(nextRoute);
      setIsAdmin(urlAdmin || isAdminUnlocked());
      ScrollTrigger.refresh();
    };
    window.addEventListener('hashchange', sync);
    window.addEventListener(ADMIN_CHANGE_EVENT, sync);
    sync();
    return () => {
      window.removeEventListener('hashchange', sync);
      window.removeEventListener(ADMIN_CHANGE_EVENT, sync);
    };
  }, []);

  useEffect(() => {
    gsap.config({ nullTargetWarn: false });
    ScrollTrigger.refresh();

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      gsap.globalTimeline.timeScale(0);
    }

    return () => {
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    };
  }, [route]);

  return (
    <ThemeProvider>
      <ContentProvider isAdmin={isAdmin}>
        <div className="relative min-h-screen bg-background text-foreground overflow-x-clip">
          {route === 'arcatext' ? (
            <ProjectGate bypass={isAdmin}>
              <Arcatext />
            </ProjectGate>
          ) : route === 'conversant' ? (
            <ProjectGate bypass={isAdmin}>
              <Conversant />
            </ProjectGate>
          ) : route === 'usaa' ? (
            <ProjectGate bypass={isAdmin}>
              <UsaaApp />
            </ProjectGate>
          ) : route === 'memberhome' ? (
            <ProjectGate bypass={isAdmin}>
              <MemberHome />
            </ProjectGate>
          ) : (
            <>
              <Navigation />
              <main>
                <Hero />
                <Projects />
                <About />
                <Contact />
              </main>
              <Footer />
            </>
          )}

          {/* Admin entry for pages with no section nav to host one. Project
              pages put it at the foot of their section navigation instead. */}
          {!PROJECT_ROUTES.includes(route) && <AdminToggle isAdmin={isAdmin} />}

          <div
            className="fixed inset-0 pointer-events-none -z-10"
            style={{
              background: 'radial-gradient(ellipse at 50% 0%, hsl(var(--primary) / 0.08) 0%, transparent 50%)',
            }}
          />

          <AdminBar />
        </div>
      </ContentProvider>
    </ThemeProvider>
  );
}

export default App;
