import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Maximize2, X } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

/**
 * Embeds a working copy of the Arcatext "Typing-UX Admin Tool".
 *
 * The tool is a self-contained static page (public/arcatext-admin-tool.html)
 * generated from the real tool by tools/sync-admin-tool.mjs. It is fully
 * interactive but every network call is stubbed, so it never talks to the app
 * or Supabase. Shown here as a scaled, readable preview with an "Expand &
 * interact" button that opens it full-screen.
 */
const TOOL_SRC = `${import.meta.env.BASE_URL}arcatext-admin-tool.html`;

export function AdminToolShowcase() {
  const [open, setOpen] = useState(false);
  const previewRef = useRef<HTMLIFrameElement>(null);
  // Hovering the preview plays a looping, *fluid* demo on the (same-origin)
  // tool's sliders — each step tweens the thumbs from their current value to
  // the target so they visibly slide (not jump):
  //   1. Decision-margin tiers up (precise→3, average→4, loose→6),
  //   2. Same-row strictness down (→0.5),
  //   3. everything back to its default,
  // repeating while the cursor stays on the preview. Out-of-range targets are
  // clamped (loose maxes at 5, same-row bottoms at 1). The sliders' step is set
  // to "any" during the demo so the thumbs glide continuously rather than snap.
  const DECISION_MARGIN_KEY = 'rekeys.tb.decisionMargin';
  const SAME_ROW_KEY = 'rekeys.tb.sameRowMult';
  const valuesRef = useRef<Map<HTMLInputElement, string>>(new Map()); // default values
  const stepsRef = useRef<Map<HTMLInputElement, string>>(new Map()); // original range steps
  const rafRef = useRef<number | null>(null);
  const holdRef = useRef<number | null>(null);
  const runningRef = useRef(false);

  const previewDoc = () => {
    try {
      return previewRef.current?.contentDocument ?? null;
    } catch {
      return null;
    }
  };

  type TweenItem = {
    input: HTMLInputElement;
    chips: NodeListOf<HTMLInputElement>;
    to: number;
    step: number;
  };

  const chipsFor = (doc: Document, key: string, tier: string) => {
    const tierSel = tier ? `[data-tier="${tier}"]` : ':not([data-tier])';
    return doc.querySelectorAll<HTMLInputElement>(`input.valuechip[data-key="${key}"]${tierSel}`);
  };
  // Build a tween target for one slider, clamped to its [min, max].
  const aim = (doc: Document, key: string, tier: string, value: number): TweenItem | null => {
    const tierSel = tier ? `[data-tier="${tier}"]` : ':not([data-tier])';
    const input = doc.querySelector<HTMLInputElement>(
      `input[type=range][data-key="${key}"]${tierSel}`
    );
    if (!input) return null;
    const min = parseFloat(input.min);
    const max = parseFloat(input.max);
    const step = parseFloat(stepsRef.current.get(input) ?? input.step) || 0.25;
    const to = Math.max(min, Math.min(max, value));
    return { input, chips: chipsFor(doc, key, tier), to, step };
  };
  // Tween targets that return every slider to its snapshot default.
  const resetItems = (doc: Document): TweenItem[] => {
    const items: TweenItem[] = [];
    stepsRef.current.forEach((origStep, input) => {
      const def = parseFloat(valuesRef.current.get(input) ?? input.value);
      items.push({
        input,
        chips: chipsFor(doc, input.getAttribute('data-key') || '', input.getAttribute('data-tier') || ''),
        to: Number.isNaN(def) ? parseFloat(input.value) : def,
        step: parseFloat(origStep) || 0.25,
      });
    });
    return items;
  };

  const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

  const tween = (items: TweenItem[], duration: number, done: () => void) => {
    const froms = items.map((it) => parseFloat(it.input.value));
    const startTs = performance.now();
    const frame = (now: number) => {
      if (!runningRef.current) return;
      const t = Math.min(1, (now - startTs) / duration);
      const e = easeInOut(t);
      items.forEach((it, idx) => {
        const v = froms[idx] + (it.to - froms[idx]) * e;
        it.input.value = String(v); // step="any" → continuous thumb motion
        const disp = String(parseFloat((Math.round(v / it.step) * it.step).toFixed(4)));
        it.chips.forEach((c) => {
          c.value = disp;
        });
      });
      if (t < 1) {
        rafRef.current = requestAnimationFrame(frame);
      } else {
        rafRef.current = null;
        done();
      }
    };
    rafRef.current = requestAnimationFrame(frame);
  };

  const runPhase = (i: number) => {
    if (!runningRef.current) return;
    const doc = previewDoc();
    if (!doc) return;
    let items: TweenItem[];
    if (i === 0) {
      items = [
        aim(doc, DECISION_MARGIN_KEY, 'precise', 3),
        aim(doc, DECISION_MARGIN_KEY, 'average', 4),
        aim(doc, DECISION_MARGIN_KEY, 'loose', 6),
      ].filter((x): x is TweenItem => x !== null);
    } else if (i === 1) {
      items = [aim(doc, SAME_ROW_KEY, '', 0.5)].filter((x): x is TweenItem => x !== null);
    } else {
      items = resetItems(doc);
    }
    tween(items, 650, () => {
      holdRef.current = window.setTimeout(() => runPhase((i + 1) % 3), 300);
    });
  };

  const stopAnim = () => {
    runningRef.current = false;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (holdRef.current) clearTimeout(holdRef.current);
    holdRef.current = null;
  };

  const handleEnter = () => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const doc = previewDoc();
    if (!doc) return;
    // Snapshot defaults + original steps, then loosen the step for fluid motion.
    valuesRef.current.clear();
    stepsRef.current.clear();
    doc.querySelectorAll<HTMLInputElement>('#knobs input').forEach((i) => valuesRef.current.set(i, i.value));
    doc.querySelectorAll<HTMLInputElement>('#knobs input[type=range]').forEach((r) => {
      stepsRef.current.set(r, r.step);
      r.step = 'any';
    });
    runningRef.current = true;
    runPhase(0);
  };
  const handleLeave = () => {
    stopAnim();
    // Restore values + original steps.
    valuesRef.current.forEach((v, i) => {
      i.value = v;
    });
    stepsRef.current.forEach((s, r) => {
      r.step = s;
    });
  };
  useEffect(() => () => stopAnim(), []);

  // Follow the portfolio's theme with the tool's own light and dark (its
  // default, neutral palette), pinned via ?scheme= rather than left to the OS.
  // The user can still pick one of its named themes inside the modal.
  const { resolvedTheme } = useTheme();
  const toolSrc = useMemo(
    () => `${TOOL_SRC}?scheme=${resolvedTheme === 'dark' ? 'dark' : 'light'}`,
    [resolvedTheme]
  );

  // Lock body scroll + close on Esc while the modal is open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <div>
      <div className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-accent">
        Admin App (fully responsive)
      </div>
      <p className="mb-3 text-sm text-muted-foreground">
        Typing-UX admin tool. Aggregates behavior, scores it, recommends settings.
      </p>

      {/* Full-width, non-interactive preview. The tool is responsive, so the
          iframe renders at the container's real width. Hovering plays a scripted
          slider demo on the tool. */}
      <div
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
        className="relative h-[560px] w-full overflow-hidden rounded-xl border border-border bg-card shadow-sm sm:h-[720px] lg:h-[820px]"
      >
        <iframe
          ref={previewRef}
          src={toolSrc}
          title="Typing-UX admin tool preview"
          loading="lazy"
          tabIndex={-1}
          aria-hidden
          className="pointer-events-none h-full w-full border-0"
        />
        {/* Click-catcher: the whole preview opens the tool. */}
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Expand the admin tool"
          className="absolute inset-0 cursor-pointer bg-transparent"
        />
      </div>

      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 flex w-full items-center justify-center gap-2 text-sm font-medium text-primary transition hover:opacity-80"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" aria-hidden />
        Interact
        <Maximize2 className="h-4 w-4" />
      </button>

      {/* Full-screen interactive modal — portalled to <body> so it escapes any
          transformed (GSAP .reveal) ancestor and truly covers the viewport. */}
      {open &&
        createPortal(
          <div className="fixed inset-0 z-[200] flex flex-col bg-background">
            <div className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border px-4">
              <div className="flex min-w-0 items-center gap-2">
                <span className="truncate text-sm font-semibold">Typing-UX Admin Tool</span>
                <span className="hidden shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground sm:inline">
                  Interactive demo · sample data only
                </span>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <iframe
              src={toolSrc}
              title="Typing-UX admin tool"
              className="min-h-0 w-full flex-1 border-0"
            />
          </div>,
          document.body
        )}
    </div>
  );
}
