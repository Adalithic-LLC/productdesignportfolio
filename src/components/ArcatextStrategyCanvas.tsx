import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  GripHorizontal,
  Maximize2,
  Plus,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Editable } from '@/content/Editable';
import { useContent } from '@/content/ContentContext';
import type {
  CanvasBand,
  CanvasColumn,
  CanvasRow,
  CanvasTint,
  StrategyCanvas,
} from '@/content/types';

/**
 * The product strategy canvas: the phases as columns, and what each one ships,
 * serves, displaces and earns as rows.
 *
 * Both the rows and the columns are content, so the board can be rebuilt from
 * admin rather than from this file: rows move up and down, columns move left
 * and right, and a cell is dragged along its row to pick a column or stretched
 * by its right edge to cross several. Every string is an `<Editable>` into
 * `arcatext.strategyCanvas`.
 *
 * Cells carry a start column and a width and nothing else; which line of the
 * row they land on is grid auto-placement's business. A cell whose columns are
 * already taken on the current line drops to the next by itself, which is what
 * gives Target and Major Disruption their staircase with no line bookkeeping
 * in the content.
 */

const BASE = 'arcatext.strategyCanvas';

/** One hue per role, from the page's own tokens: primary for what gets built,
    accent for who it is for and what it is worth, amber for what it displaces. */
const TINT: Record<CanvasTint, string> = {
  focus: 'border-border bg-secondary',
  offering: 'border-primary/30 bg-primary/10',
  value: 'border-accent/30 bg-accent/5',
  target: 'border-accent/30 bg-accent/[0.06]',
  major: 'border-[hsl(var(--mark-yellow)/0.4)] bg-[hsl(var(--mark-yellow)/0.12)]',
  minor:
    'border-dashed border-[hsl(var(--mark-yellow)/0.35)] bg-[hsl(var(--mark-yellow)/0.05)]',
  revenue: 'border-primary/25 bg-primary/[0.07]',
  ai: 'border-accent/25 bg-accent/[0.06]',
  plain: 'border-border bg-card/60',
};

const TINTS = Object.keys(TINT) as CanvasTint[];

const clamp = (n: number, lo: number, hi: number) => Math.min(Math.max(n, lo), hi);

/** A small square admin control. */
const CTRL =
  'flex h-5 w-5 items-center justify-center rounded border border-border/60 bg-background/90 text-muted-foreground shadow-sm transition hover:text-foreground disabled:opacity-25 disabled:hover:text-muted-foreground';

/** Where a pointer sits, as a 1-based column of `count`. */
function columnAt(field: HTMLElement, clientX: number, count: number) {
  const r = field.getBoundingClientRect();
  const w = r.width / count;
  return clamp(Math.floor((clientX - r.left) / w) + 1, 1, count);
}

type Drag =
  | null
  | { row: number; band: number; mode: 'move'; grab: number; col: number; span: number }
  | { row: number; band: number; mode: 'resize'; col: number; span: number };

export function ArcatextStrategyCanvas() {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const { content, canEdit, isAdmin } = useContent();
  const data = (content as { arcatext?: { strategyCanvas?: StrategyCanvas } }).arcatext
    ?.strategyCanvas;

  if (!data) return null;

  return (
    <div className="w-full">
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
          opens full-screen on click. In an admin session the button is the
          only way in, so clicking a cell edits it. */}
      <div
        onClick={canEdit ? undefined : () => setOpen(true)}
        className={cn(
          'overflow-x-auto rounded-2xl border border-border/60 bg-card/40 p-4',
          !canEdit && 'cursor-zoom-in transition-colors hover:border-primary/40'
        )}
      >
        <Canvas data={data} editing={isAdmin} />
      </div>

      {open && <CanvasModal data={data} editing={isAdmin} onClose={close} />}
    </div>
  );
}

function Canvas({ data, editing }: { data: StrategyCanvas; editing: boolean }) {
  const { setValue } = useContent();
  const columns: CanvasColumn[] = data.columns ?? [];
  const rows: CanvasRow[] = data.rows ?? [];
  const count = Math.max(columns.length, 1);
  const [drag, setDrag] = useState<Drag>(null);
  const fields = useRef<(HTMLDivElement | null)[]>([]);

  const writeRows = useCallback(
    (next: CanvasRow[]) => setValue(`${BASE}.rows`, next),
    [setValue]
  );

  /* --- rows ------------------------------------------------------------- */
  const moveRow = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= rows.length) return;
    const list = rows.slice();
    [list[i], list[j]] = [list[j], list[i]];
    writeRows(list);
  };
  const removeRow = (i: number) => writeRows(rows.filter((_, k) => k !== i));
  const addRow = () =>
    writeRows([
      ...rows,
      { label: 'New row', kind: 'bands', tint: 'plain', bands: [{ col: 1, span: 1, text: 'New cell' }] },
    ]);
  const cycleTint = (i: number) => {
    const list = rows.slice();
    const at = TINTS.indexOf(list[i].tint);
    list[i] = { ...list[i], tint: TINTS[(at + 1) % TINTS.length] };
    writeRows(list);
  };

  /* --- columns ---------------------------------------------------------- */
  /* Moving a column swaps it with its neighbour and carries that column's own
     cells with it. A cell spanning several columns names a stretch of the
     board rather than one column, so it keeps its place. */
  const moveColumn = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= columns.length) return;
    const cols = columns.slice();
    [cols[i], cols[j]] = [cols[j], cols[i]];
    const a = i + 1;
    const b = j + 1;
    writeRows(
      rows.map((r) => ({
        ...r,
        bands: (r.bands ?? []).map((bd) =>
          bd.span === 1 && (bd.col === a || bd.col === b)
            ? { ...bd, col: bd.col === a ? b : a }
            : bd
        ),
      }))
    );
    setValue(`${BASE}.columns`, cols);
  };
  const addColumn = () =>
    setValue(`${BASE}.columns`, [
      ...columns,
      { n: `Phase ${columns.length + 1}`, name: 'New phase' },
    ]);
  /* Removing a column narrows every cell that covered it and drops the ones
     that were only it. */
  const removeColumn = (i: number) => {
    const c = i + 1;
    setValue(
      `${BASE}.columns`,
      columns.filter((_, k) => k !== i)
    );
    writeRows(
      rows.map((r) => ({
        ...r,
        bands: (r.bands ?? [])
          .map((bd) => {
            const end = bd.col + bd.span - 1;
            if (bd.col > c) return { ...bd, col: bd.col - 1 };
            if (bd.col === c) return bd.span > 1 ? { ...bd, span: bd.span - 1 } : null;
            return end >= c ? { ...bd, span: bd.span - 1 } : bd;
          })
          .filter((bd): bd is CanvasBand => !!bd && bd.span >= 1),
      }))
    );
  };

  /* --- cells ------------------------------------------------------------ */
  const writeBand = (ri: number, bi: number, patch: Partial<CanvasBand>) => {
    const list = rows.slice();
    const bands = (list[ri].bands ?? []).slice();
    bands[bi] = { ...bands[bi], ...patch };
    list[ri] = { ...list[ri], bands };
    writeRows(list);
  };
  const addBand = (ri: number, col: number) => {
    const list = rows.slice();
    list[ri] = {
      ...list[ri],
      bands: [...(list[ri].bands ?? []), { col, span: 1, text: 'New cell' }],
    };
    writeRows(list);
  };
  const removeBand = (ri: number, bi: number) => {
    const list = rows.slice();
    list[ri] = { ...list[ri], bands: (list[ri].bands ?? []).filter((_, k) => k !== bi) };
    writeRows(list);
  };

  /* Dragging a cell picks its column; dragging its right edge sets its width.
     The move is previewed from local state and committed on release, so the
     store is written once per drag rather than once per pixel. */
  useEffect(() => {
    if (!drag) return;
    const onMove = (e: PointerEvent) => {
      const field = fields.current[drag.row];
      if (!field) return;
      const at = columnAt(field, e.clientX, count);
      setDrag((d) => {
        if (!d) return d;
        if (d.mode === 'move') {
          return { ...d, col: clamp(at - d.grab, 1, count - d.span + 1) };
        }
        return { ...d, span: clamp(at - d.col + 1, 1, count - d.col + 1) };
      });
    };
    const onUp = () => {
      setDrag((d) => {
        if (d) writeBand(d.row, d.band, { col: d.col, span: d.span });
        return null;
      });
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp, { once: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag?.row, drag?.band, drag?.mode, count]);

  /* Columns stay readable rather than being squeezed to fit the page. */
  const minWidth = 120 + count * 230;

  return (
    <div style={{ minWidth }}>
      <CanvasHeader data={data} />

      <div className="space-y-2 rounded-2xl border border-border/60 bg-background/40 p-4">
        {editing && (
          <div className="flex gap-3">
            <div className="w-[108px] shrink-0" />
            <div
              className="grid flex-1 gap-2"
              style={{ gridTemplateColumns: `repeat(${count}, minmax(0,1fr))` }}
            >
              {columns.map((_, i) => (
                <div key={i} className="flex items-center justify-center gap-1">
                  <button
                    type="button"
                    className={CTRL}
                    disabled={i === 0}
                    onClick={() => moveColumn(i, -1)}
                    title="Move column left"
                  >
                    <ArrowLeft className="h-3 w-3" aria-hidden />
                  </button>
                  <button
                    type="button"
                    className={CTRL}
                    disabled={i === columns.length - 1}
                    onClick={() => moveColumn(i, 1)}
                    title="Move column right"
                  >
                    <ArrowRight className="h-3 w-3" aria-hidden />
                  </button>
                  <button
                    type="button"
                    className={cn(CTRL, 'hover:border-destructive/50 hover:text-destructive')}
                    onClick={() => removeColumn(i)}
                    title="Delete column"
                  >
                    <X className="h-3 w-3" aria-hidden />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addColumn}
              title="Add column"
              className="flex h-5 shrink-0 items-center gap-1 self-center rounded border border-dashed border-border/70 px-2 text-[10px] font-medium text-muted-foreground transition hover:border-primary/60 hover:text-foreground"
            >
              <Plus className="h-3 w-3" aria-hidden /> Column
            </button>
          </div>
        )}

        {rows.map((row, ri) => (
          <div key={ri} className="flex gap-3">
            {/* Row gutter: the label, and in admin the row's own controls. */}
            <div className="w-[108px] shrink-0 pt-1.5">
              <Editable
                as="div"
                path={`${BASE}.rows.${ri}.label`}
                className="text-[11px] font-semibold uppercase leading-tight tracking-[0.12em] text-muted-foreground"
              />
              {editing && (
                <div className="mt-1 flex flex-wrap gap-1">
                  <button
                    type="button"
                    className={CTRL}
                    disabled={ri === 0}
                    onClick={() => moveRow(ri, -1)}
                    title="Move row up"
                  >
                    <ArrowUp className="h-3 w-3" aria-hidden />
                  </button>
                  <button
                    type="button"
                    className={CTRL}
                    disabled={ri === rows.length - 1}
                    onClick={() => moveRow(ri, 1)}
                    title="Move row down"
                  >
                    <ArrowDown className="h-3 w-3" aria-hidden />
                  </button>
                  <button
                    type="button"
                    className={CTRL}
                    onClick={() => cycleTint(ri)}
                    title={`Colour: ${row.tint}`}
                  >
                    <span
                      className={cn('h-2.5 w-2.5 rounded-sm border', TINT[row.tint])}
                      aria-hidden
                    />
                  </button>
                  <button
                    type="button"
                    className={cn(CTRL, 'hover:border-destructive/50 hover:text-destructive')}
                    onClick={() => removeRow(ri)}
                    title="Delete row"
                  >
                    <X className="h-3 w-3" aria-hidden />
                  </button>
                </div>
              )}
            </div>

            <div
              ref={(el) => {
                fields.current[ri] = el;
              }}
              className="grid flex-1 gap-2 [grid-auto-flow:row]"
              style={{ gridTemplateColumns: `repeat(${count}, minmax(0,1fr))` }}
            >
              {row.kind === 'columns'
                ? columns.map((_, ci) => (
                    <div
                      key={ci}
                      className="rounded-lg border border-border bg-muted/60 px-3 py-2 text-center"
                    >
                      <Editable
                        as="span"
                        path={`${BASE}.columns.${ci}.n`}
                        className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"
                      />
                      <Editable
                        as="div"
                        multiline
                        path={`${BASE}.columns.${ci}.name`}
                        className="text-[13px] font-semibold leading-snug"
                      />
                    </div>
                  ))
                : (row.bands ?? []).map((band, bi) => {
                    const live =
                      drag && drag.row === ri && drag.band === bi
                        ? { col: drag.col, span: drag.span }
                        : { col: band.col, span: band.span };
                    const col = clamp(live.col || 1, 1, count);
                    const span = clamp(live.span || 1, 1, count - col + 1);
                    return (
                      <div
                        key={bi}
                        data-band={`${ri}.${bi}`}
                        data-col={col}
                        data-span={span}
                        style={{ gridColumn: `${col} / span ${span}` }}
                        className={cn(
                          'group/band relative rounded-lg border px-3 py-2',
                          TINT[row.tint],
                          drag && drag.row === ri && drag.band === bi && 'ring-2 ring-primary/60'
                        )}
                      >
                        {editing && (
                          <>
                            {/* Drag along the row to pick a column. */}
                            <button
                              type="button"
                              title="Drag to move across columns"
                              onPointerDown={(e) => {
                                e.preventDefault();
                                const field = fields.current[ri];
                                if (!field) return;
                                const at = columnAt(field, e.clientX, count);
                                setDrag({
                                  row: ri,
                                  band: bi,
                                  mode: 'move',
                                  grab: at - band.col,
                                  col: band.col,
                                  span: band.span,
                                });
                              }}
                              className="absolute -top-2 left-2 z-10 flex h-4 w-6 cursor-grab items-center justify-center rounded border border-border/70 bg-background/95 text-muted-foreground opacity-0 shadow-sm transition group-hover/band:opacity-100"
                            >
                              <GripHorizontal className="h-3 w-3" aria-hidden />
                            </button>
                            <button
                              type="button"
                              title="Delete cell"
                              onClick={() => removeBand(ri, bi)}
                              className="absolute -top-2 right-2 z-10 flex h-4 w-4 items-center justify-center rounded border border-border/70 bg-background/95 text-muted-foreground opacity-0 shadow-sm transition hover:border-destructive/50 hover:text-destructive group-hover/band:opacity-100"
                            >
                              <X className="h-2.5 w-2.5" aria-hidden />
                            </button>
                            {/* Drag the right edge to cross more columns. */}
                            <button
                              type="button"
                              title="Drag to span columns"
                              onPointerDown={(e) => {
                                e.preventDefault();
                                setDrag({
                                  row: ri,
                                  band: bi,
                                  mode: 'resize',
                                  col: band.col,
                                  span: band.span,
                                });
                              }}
                              className="absolute -right-1 top-1/2 z-10 h-7 w-2 -translate-y-1/2 cursor-col-resize rounded-full bg-primary/70 opacity-0 transition group-hover/band:opacity-100"
                            >
                              <span className="sr-only">Resize</span>
                            </button>
                          </>
                        )}

                        {band.items ? (
                          <ul className="space-y-1.5">
                            {band.items.map((it, ii) => (
                              <li key={ii} className="text-[13px] leading-snug">
                                <div className="flex gap-2">
                                  <span className="text-accent/70">•</span>
                                  <Editable
                                    as="span"
                                    multiline
                                    path={`${BASE}.rows.${ri}.bands.${bi}.items.${ii}.text`}
                                  />
                                </div>
                                {it.sub?.map((_, si) => (
                                  <div key={si} className="mt-1 flex gap-2 pl-4">
                                    <span className="text-muted-foreground/40">–</span>
                                    <Editable
                                      as="span"
                                      multiline
                                      path={`${BASE}.rows.${ri}.bands.${bi}.items.${ii}.sub.${si}`}
                                      className="text-[12px] text-muted-foreground"
                                    />
                                  </div>
                                ))}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <>
                            <Editable
                              as="div"
                              multiline
                              path={`${BASE}.rows.${ri}.bands.${bi}.text`}
                              className={cn(
                                'text-[13px] font-medium leading-snug',
                                row.tint === 'offering' && 'text-sm font-semibold text-primary',
                                row.tint === 'focus' && 'text-center font-semibold'
                              )}
                            />
                            {band.sub?.map((_, si) => (
                              <div key={si} className="mt-1 flex gap-2 pl-1">
                                <span className="text-muted-foreground/40">–</span>
                                <Editable
                                  as="div"
                                  multiline
                                  path={`${BASE}.rows.${ri}.bands.${bi}.sub.${si}`}
                                  className="text-[12px] leading-snug text-muted-foreground"
                                />
                              </div>
                            ))}
                          </>
                        )}
                      </div>
                    );
                  })}

              {/* A click target in each free column, so a cell can be added
                  where it belongs rather than at the end of the row. */}
              {editing &&
                row.kind !== 'columns' &&
                freeColumns(row.bands ?? [], count).map((ci) => (
                  <button
                    key={`add-${ci}`}
                    type="button"
                    title="Add cell"
                    onClick={() => addBand(ri, ci)}
                    style={{ gridColumn: `${ci} / span 1` }}
                    className="flex min-h-[2rem] items-center justify-center rounded-lg border border-dashed border-border/50 text-muted-foreground/50 transition hover:border-primary/50 hover:text-foreground"
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden />
                  </button>
                ))}
            </div>
          </div>
        ))}

        {editing && (
          <div className="flex gap-3 pt-1">
            <div className="w-[108px] shrink-0" />
            <button
              type="button"
              onClick={addRow}
              className="flex items-center gap-1.5 rounded-lg border border-dashed border-border/70 px-3 py-1.5 text-[11px] font-medium text-muted-foreground transition hover:border-primary/60 hover:text-foreground"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden /> Row
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/** Columns with no cell on the row's first line — where a new cell can go. */
function freeColumns(bands: CanvasBand[], count: number) {
  const taken = new Set<number>();
  bands.forEach((b) => {
    for (let k = 0; k < (b.span || 1); k += 1) taken.add((b.col || 1) + k);
  });
  const free: number[] = [];
  for (let c = 1; c <= count; c += 1) if (!taken.has(c)) free.push(c);
  return free;
}

function CanvasHeader({ data }: { data: StrategyCanvas }) {
  return (
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
  );
}

/** Full-screen copy. Escape closes it and the page behind keeps its place,
    the scrollbar's width handed back so nothing shifts. */
function CanvasModal({
  data,
  editing,
  onClose,
}: {
  data: StrategyCanvas;
  editing: boolean;
  onClose: () => void;
}) {
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
            <Canvas data={data} editing={editing} />
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
