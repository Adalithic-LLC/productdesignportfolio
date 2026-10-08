import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';

/**
 * Tells admin when a newer build of the site is live than the one this tab is
 * running.
 *
 * The site is one page: moving between case studies and saving never reload
 * it, so a tab left open keeps running the code it first loaded, and a feature
 * pushed since -- a new control, a fix -- simply is not there, however long
 * the deploy has been live. GitHub Pages also lets the browser reuse the page
 * for ten minutes, so even a plain reload can come back with the old build.
 *
 * So the live index.html is fetched past every cache -- when the tab regains
 * focus and once a minute -- and the bundle it names is compared with the one
 * this page loaded. When they differ, a Reload button appears. Unsaved edits
 * live in the browser draft, so reloading loses nothing.
 */

const BUNDLE = /assets\/index-[\w-]+\.js/;

/** The bundle this page is running, or null in dev (no hashed bundle). */
function runningBundle(): string | null {
  for (const s of Array.from(document.scripts)) {
    const m = s.src.match(BUNDLE);
    if (m) return m[0];
  }
  return null;
}

export function UpdateNotice() {
  const [stale, setStale] = useState(false);

  useEffect(() => {
    const mine = runningBundle();
    if (!mine) return;
    let alive = true;
    const check = async () => {
      try {
        const res = await fetch(`./index.html?v=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok) return;
        const live = (await res.text()).match(BUNDLE)?.[0];
        if (alive && live && live !== mine) setStale(true);
      } catch {
        /* offline: try again on the next tick */
      }
    };
    check();
    const timer = window.setInterval(check, 60_000);
    const onFocus = () => check();
    window.addEventListener('focus', onFocus);
    return () => {
      alive = false;
      window.clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  if (!stale) return null;

  return (
    <div className="fixed left-1/2 top-32 z-[110] flex max-w-[calc(100%-2rem)] -translate-x-1/2 items-center gap-3 rounded-full border border-amber-500/40 bg-background/95 py-1.5 pl-4 pr-1.5 text-xs shadow-lg backdrop-blur">
      <span>A newer version of the site is live. Reload to use it (unsaved edits are kept).</span>
      <button
        type="button"
        onClick={() => {
          /* A new address, so the reload cannot be answered from cache. */
          const url = new URL(window.location.href);
          url.searchParams.set('v', String(Date.now()));
          window.location.replace(url.toString());
        }}
        className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 font-medium text-primary-foreground transition-opacity hover:opacity-90"
      >
        <RefreshCw className="h-3.5 w-3.5" /> Reload
      </button>
    </div>
  );
}
