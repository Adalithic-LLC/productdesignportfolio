import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Maximize2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Editable } from '@/content/Editable';
import { useContent } from '@/content/ContentContext';
import type { CanvasBand, StrategyCanvas } from '@/content/types';

/**
 * The product strategy canvas: the four phases as columns, and what each one
 * ships, serves, displaces and earns as rows.
 *
 * Every string is an `<Editable>` into `arcatext.strategyCanvas`, so the board
 * is edited in admin like the rest of the page rather than being redrawn.
 *
 * Rows place their bands on the phase grid by column and span, and lean on
 * grid auto-placement for the rest: a band whose columns are already taken in
 * the current line drops to the next one by itself, which is what gives the
 * Target and Disruption rows their staircase without any line bookkeeping in
 * the content.
 *
 * The canvas is far wider than the column it sits in, so it scrolls sideways
 * in the page and opens full-screen on click -- see `CanvasFrame`.
 */

const BASE = 'arcatext.strategyCanvas';

/** Row tints. One hue per role, taken from the page's own tokens: primary for
    what gets built, accent for who it is for and what it is worth, amber for
    what it displaces. */
const TINT = {
  offering: 'border-primary/30 bg-primary/10',
  value: 'border-accent/30 bg-accent/5',
  target: 'border-accent/30 bg-accent/[0.06]',
  major:
    'border-[hsl(var(--mark-yellow)/0.4)] bg-[hsl(var(--mark-yellow)/0.12)]',
  minor:
    'border-dashed border-[hsl(var(--mark-yellow)/0.35)] bg-[hsl(var(--mark-yellow)/0.05)]',
  revenue: 'border-primary/25 bg-primary/[0.07]',
  ai: 'border-accent/25 bg-accent/[0.06]',
  plain: 'border-border bg-card/60',
} as const;

type Tint = keyof typeof TINT;

/** A label in the canvas's left gutter. */
function RowLabel({ path }: { path: string }) {
  return (
    <div className="flex w-[108px] shrink-0 items-start pt-1.5">
      <Editable
        as="div"
        path={path}
        className="text-[11px] font-semibold uppercase leading-tight tracking-[0.12em] text-muted-foreground"
      />
    </div>
  );
}

/** The 4-column field a row's bands are placed on. */
function Field({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid flex-1 grid-cols-4 gap-2 [grid-auto-flow:row]">{children}</div>
  );
}

/** One placed band. `col`/`span` address the phase grid; anything that will
    not fit beside what is already on the line wraps to the next one. */
function Band({
  band,
  path,
  tint,
  className,
}: {
  band: CanvasBand;
  path: string;
  tint: Tint;
  className?: string;
}) {
  const col = Math.min(Math.max(band.col || 1, 1), 4);
  const span = Math.min(Math.max(band.span || 1, 1), 5 - col);
  return (
    <div
      style={{ gridColumn: `${col} / span ${span}` }}
      className={cn('rounded-lg border px-3 py-2', TINT[tint], className)}
    >
      <Editable
        as="div"
        multiline
        path={`${path}.text`}
        className="text-[13px] font-medium leading-snug"
      />
      {band.sub?.map((_, i) => (
        <div key={i} className="mt-1 flex gap-2 pl-1">
          <span className="text-muted-foreground/40">–</span>
          <Editable
            as="div"
            multiline
            path={`${path}.sub.${i}`}
            className="text-[12px] leading-snug text-muted-foreground"
          />
        </div>
      ))}
    </div>
  );
}

function BandRow({
  labelPath,
  bands,
  path,
  tint,
}: {
  labelPath: string;
  bands: CanvasBand[];
  path: string;
  tint: Tint;
}) {
  if (!bands?.length) return null;
  return (
    <div className="flex gap-3">
      <RowLabel path={labelPath} />
      <Field>
        {bands.map((b, i) => (
          <Band key={i} band={b} path={`${path}.${i}`} tint={tint} />
        ))}
      </Field>
    </div>
  );
}

function Canvas({ data }: { data: StrategyCanvas }) {
  const phases = data.phases ?? [];
  return (
    <div className="min-w-[1000px]">
      {/* Header: what the canvas optimizes for, the value proposition, and the
          store description it resolves to. */}
      <div className="mb-6 grid grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)_minmax(0,1.1fr)] gap-6">
        <div>
          <Editable
            as="div"
            path={`${BASE}.optimizedForTitle`}
            className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-accent"
          />
          <ul className="space-y-1">
            {(data.optimizedFor ?? []).map((_, i) => (
              <li key={i} className="flex gap-2 text-[13px] text-muted-foreground">
                <span className="text-accent/70">•</span>
                <Editable as="span" multiline path={`${BASE}.optimizedFor.${i}`} />
              </li>
            ))}
          </ul>
        </div>
        <div>
          <Editable
            as="div"
            path={`${BASE}.vpTitle`}
            className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-accent"
          />
          {(data.vp ?? []).map((_, i) => (
            <Editable
              key={i}
              as="p"
              multiline
              path={`${BASE}.vp.${i}`}
              className="mb-2 text-[13px] leading-relaxed text-muted-foreground"
            />
          ))}
        </div>
        <div>
          <Editable
            as="div"
            path={`${BASE}.storeTitle`}
            className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-accent"
          />
          <Editable
            as="p"
            multiline
            path={`${BASE}.store`}
            className="text-[13px] leading-relaxed text-muted-foreground"
          />
        </div>
      </div>

      <div className="space-y-2 rounded-2xl border border-border/60 bg-background/40 p-4">
        {/* Focus — one band over every phase. */}
        <div className="flex gap-3">
          <RowLabel path={`${BASE}.focusLabel`} />
          <Field>
            <div
              style={{ gridColumn: '1 / span 4' }}
              className="rounded-lg border border-border bg-secondary px-3 py-2 text-center"
            >
              <Editable
                as="div"
                path={`${BASE}.focus`}
                className="text-[13px] font-semibold tracking-tight"
              />
            </div>
          </Field>
        </div>

        {/* Phase · Product Offering · Value — one cell per phase. */}
        <div className="flex gap-3">
          <RowLabel path={`${BASE}.phaseLabel`} />
          <Field>
            {phases.map((_, i) => (
              <div
                key={i}
                className="rounded-lg border border-border bg-muted/60 px-3 py-2 text-center"
              >
                <Editable
                  as="span"
                  path={`${BASE}.phases.${i}.n`}
                  className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"
                />
                <Editable
                  as="div"
                  multiline
                  path={`${BASE}.phases.${i}.name`}
                  className="text-[13px] font-semibold leading-snug"
                />
              </div>
            ))}
          </Field>
        </div>

        <div className="flex gap-3">
          <RowLabel path={`${BASE}.offeringLabel`} />
          <Field>
            {phases.map((_, i) => (
              <div
                key={i}
                className={cn('rounded-lg border px-3 py-3 text-center', TINT.offering)}
              >
                <Editable
                  as="div"
                  multiline
                  path={`${BASE}.phases.${i}.offering`}
                  className="text-sm font-semibold leading-snug text-primary"
                />
              </div>
            ))}
          </Field>
        </div>

        <div className="flex gap-3">
          <RowLabel path={`${BASE}.valueLabel`} />
          <Field>
            {phases.map((_, i) => (
              <div key={i} className={cn('rounded-lg border px-3 py-2', TINT.value)}>
                <Editable
                  as="div"
                  multiline
                  path={`${BASE}.phases.${i}.value`}
                  className="text-[13px] leading-snug"
                />
              </div>
            ))}
          </Field>
        </div>

        <BandRow
          labelPath={`${BASE}.targetLabel`}
          bands={data.target ?? []}
          path={`${BASE}.target`}
          tint="target"
        />
        <BandRow
          labelPath={`${BASE}.majorLabel`}
          bands={data.major ?? []}
          path={`${BASE}.major`}
          tint="major"
        />
        <BandRow
          labelPath={`${BASE}.minorLabel`}
          bands={data.minor ?? []}
          path={`${BASE}.minor`}
          tint="minor"
        />

        {/* Features — a list per phase, the densest row on the board. */}
        <div className="flex gap-3">
          <RowLabel path={`${BASE}.featuresLabel`} />
          <Field>
            {(data.features ?? []).map((col, ci) => (
              <div
                key={ci}
                className={cn('rounded-lg border px-3 py-3', TINT.plain)}
              >
                <ul className="space-y-1.5">
                  {(col.items ?? []).map((it, ii) => (
                    <li key={ii} className="text-[13px] leading-snug">
                      <div className="flex gap-2">
                        <span className="text-accent/70">•</span>
                        <Editable
                          as="span"
                          multiline
                          path={`${BASE}.features.${ci}.items.${ii}.text`}
                        />
                      </div>
                      {it.sub?.map((_, si) => (
                        <div key={si} className="mt-1 flex gap-2 pl-4">
                          <span className="text-muted-foreground/40">–</span>
                          <Editable
                            as="span"
                            multiline
                            path={`${BASE}.features.${ci}.items.${ii}.sub.${si}`}
                            className="text-[12px] text-muted-foreground"
                          />
                        </div>
                      ))}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </Field>
        </div>

        <BandRow
          labelPath={`${BASE}.revenueLabel`}
          bands={data.revenue ?? []}
          path={`${BASE}.revenue`}
          tint="revenue"
        />
        <BandRow
          labelPath={`${BASE}.aiLabel`}
          bands={data.ai ?? []}
          path={`${BASE}.ai`}
          tint="ai"
        />
      </div>
    </div>
  );
}

/** Full-screen copy of the canvas. Escape closes it and the page behind it
    keeps its place, the scrollbar's width handed back so nothing shifts. */
function CanvasModal({ data, onClose }: { data: StrategyCanvas; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const gap = window.innerWidth - document.documentElement.clientWidth;
    const { overflow, paddingRight } = document.body.style;
    document.body.style.overflow = 'hidden';
    if (gap > 0) document.body.style.paddingRight = `${gap}px`;
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      document.body.style.paddingRight = paddingRight;
    };
  }, [onClose]);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={data.title || 'Product strategy canvas'}
      onClick={onClose}
      className="fixed inset-0 z-[90] overflow-hidden"
    >
      <div className="absolute inset-0 bg-background/85 backdrop-blur-md" />
      <div className="relative flex h-full flex-col p-3 sm:p-6 lg:p-8">
        <div
          onClick={(e) => e.stopPropagation()}
          className="mx-auto flex h-full w-full max-w-[1600px] flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/95 shadow-2xl"
        >
          <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border/50 px-5 py-4 sm:px-7">
            <div>
              <Editable
                as="p"
                path={`${BASE}.eyebrow`}
                className="text-xs font-semibold uppercase tracking-[0.18em] text-accent"
              />
              <Editable
                as="h3"
                path={`${BASE}.title`}
                className="text-lg font-semibold tracking-tight sm:text-xl"
              />
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border/70 text-muted-foreground transition hover:border-primary/50 hover:text-foreground"
            >
              <X className="h-4 w-4" aria-hidden />
              <span className="sr-only">{data.close || 'Close'}</span>
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-auto p-5 sm:p-7">
            <Canvas data={data} />
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

export function ArcatextStrategyCanvas() {
  const { content, canEdit } = useContent();
  const data = (content as { arcatext?: { strategyCanvas?: StrategyCanvas } }).arcatext
    ?.strategyCanvas;
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  if (!data) return null;

  return (
    <div className="w-full">
      {/* The copy above the canvas on the page is its heading, so only the
          control sits here. The full-screen view carries the title. */}
      <div className="mb-3 flex items-center justify-end gap-4">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex shrink-0 items-center gap-1.5 rounded-full border border-border/70 bg-background/80 px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-sm transition hover:border-primary/50 hover:text-foreground"
        >
          <Maximize2 className="h-3.5 w-3.5" aria-hidden />
          <Editable as="span" path={`${BASE}.enlarge`} />
        </button>
      </div>

      {/* Wider than the column it sits in, so it scrolls sideways here and
          opens full-screen on click. In an admin session the click target is
          the button alone, so editing a cell cannot open the overlay. */}
      <div
        onClick={canEdit ? undefined : () => setOpen(true)}
        className={cn(
          'overflow-x-auto rounded-2xl border border-border/60 bg-card/40 p-4',
          !canEdit && 'cursor-zoom-in transition-colors hover:border-primary/40'
        )}
      >
        <Canvas data={data} />
      </div>

      {open && <CanvasModal data={data} onClose={close} />}
    </div>
  );
}
