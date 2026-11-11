/**
 * The interview wall: what people actually said, on sticky notes, grouped the
 * way they were grouped when the insights came out of them.
 *
 * It opens over the page rather than sitting in it. The quotes are evidence
 * for a claim made elsewhere -- an insight card -- and evidence read before
 * the claim is just a wall of talk, so the card links to it and the board
 * arrives already scrolled to the cluster that card is about, with that
 * cluster lit for a moment so the eye lands in the right place.
 *
 * Structure follows the affinity map: a cluster per insight, and inside it
 * the subgroups the notes fell into. Both are addressable -- a cluster by its
 * own id, which is what a link carries, and the board can be deep-linked from
 * outside the page with `?quotes=<cluster-id>`.
 */
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createContext } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Check, Link2, MessageSquareQuote, Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Editable } from '@/content/Editable';
import { ItemGroup } from '@/content/EditableBlocks';
import { useContent } from '@/content/ContentContext';

/**
 * The sticky colours. Taken per affinity group rather than per column, and
 * counted across the whole board, so neighbouring groups never land on the
 * same colour and the wall reads as sorted rather than colour-coded. A note
 * can override its group with a `color` of its own.
 */
const NOTE_COLORS = ['yellow', 'green', 'blue', 'pink', 'orange', 'violet', 'teal'] as const;
type NoteColor = (typeof NOTE_COLORS)[number];

const isColor = (v: unknown): v is NoteColor =>
  typeof v === 'string' && (NOTE_COLORS as readonly string[]).includes(v);

/* Pastel in light, muted in dark, so a wall of them is readable either way
   rather than seven highlighters on a black page. */
const NOTE_STYLE: Record<NoteColor, string> = {
  yellow: 'bg-amber-200/80 text-amber-950 dark:bg-amber-300/15 dark:text-amber-100',
  green: 'bg-emerald-200/80 text-emerald-950 dark:bg-emerald-300/15 dark:text-emerald-100',
  blue: 'bg-sky-200/80 text-sky-950 dark:bg-sky-300/15 dark:text-sky-100',
  pink: 'bg-pink-200/80 text-pink-950 dark:bg-pink-300/15 dark:text-pink-100',
  orange: 'bg-orange-200/80 text-orange-950 dark:bg-orange-300/15 dark:text-orange-100',
  violet: 'bg-violet-200/80 text-violet-950 dark:bg-violet-300/15 dark:text-violet-100',
  teal: 'bg-teal-200/80 text-teal-950 dark:bg-teal-300/15 dark:text-teal-100',
};

/** A hand-placed look without a hand: the tilt is derived, not random, so a
    note sits the same way on every render and nothing jumps on a re-render. */
const tilt = (i: number) => [-1.6, 1.1, -0.7, 1.8, -1.2, 0.6][i % 6];

interface BoardApi {
  /** Open the board, scrolled to this cluster. */
  open: (clusterId?: string) => void;
}

const BoardContext = createContext<BoardApi | null>(null);

/**
 * Opens the board from anywhere under the provider. `available` is false on a
 * page that has no board, so a button dropped there can take itself off
 * rather than sit on the page doing nothing when clicked.
 */
export function useQuoteBoard(): BoardApi & { available: boolean } {
  const api = useContext(BoardContext);
  return { open: api?.open ?? (() => {}), available: !!api };
}

/** Everything but letters and numbers goes, so punctuation cannot miss a match. */
const norm = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/**
 * The cluster a card is about, worked out from the card rather than typed in.
 *
 * A quotes button lives in a card's `inside` slot, so its own path names the
 * card that holds it: strip the slot off and the block left is the insight.
 * Its title is matched against the clusters -- exactly first, then by one
 * containing the other, then by how many words they share. Good enough to be
 * right without being asked, and `cluster` in the button's own data overrides
 * it when it is wrong.
 */
export function clusterForPath(
  content: { arcatext: { quoteBoard?: { clusters: { id: string; insight: string }[] } } },
  path: string | null
): string | null {
  const clusters = content.arcatext.quoteBoard?.clusters ?? [];
  if (!clusters.length || !path) return null;

  const owner = path.replace(/\.inside\.\d+$/, '');
  if (owner === path) return null;
  const block = owner.split('.').reduce<unknown>((acc, k) => {
    if (acc == null || typeof acc !== 'object') return undefined;
    return (acc as Record<string, unknown>)[k];
  }, content as unknown);
  const data = (block as { data?: Record<string, string> } | undefined)?.data ?? {};
  const title = norm(data.title || data.text || data.desc || '');
  if (!title) return null;

  const exact = clusters.find((c) => norm(c.insight) === title);
  if (exact) return exact.id;
  const inside = clusters.find((c) => {
    const n = norm(c.insight);
    return n.includes(title) || title.includes(n);
  });
  if (inside) return inside.id;

  const words = new Set(title.split(' ').filter((w) => w.length > 3));
  let best: { id: string; score: number } | null = null;
  for (const c of clusters) {
    const score = norm(c.insight)
      .split(' ')
      .filter((w) => words.has(w)).length;
    if (score > (best?.score ?? 0)) best = { id: c.id, score };
  }
  return best && best.score >= 2 ? best.id : null;
}

export function QuoteBoardProvider({ children }: { children: ReactNode }) {
  const [focus, setFocus] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const api = useMemo<BoardApi>(
    () => ({
      open: (clusterId?: string) => {
        setFocus(clusterId ?? null);
        setOpen(true);
      },
    }),
    []
  );

  /* A link from outside the page: ?quotes=<cluster-id> opens the board on
     that cluster once the content is there to scroll to. */
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('quotes');
    if (!id) return;
    const t = window.setTimeout(() => api.open(id), 400);
    return () => window.clearTimeout(t);
  }, [api]);

  return (
    <BoardContext.Provider value={api}>
      {children}
      <QuoteBoardModal open={open} focusId={focus} onClose={() => setOpen(false)} />
    </BoardContext.Provider>
  );
}

/**
 * The link an insight card carries. Renders nothing when the board has no
 * cluster under that id, so a card whose quotes have not been written yet
 * does not offer a door into an empty room.
 */
export function QuoteBoardLink({
  clusterId,
  className,
}: {
  clusterId?: string;
  className?: string;
}) {
  const { content } = useContent();
  const board = content.arcatext.quoteBoard;
  const cluster = clusterId
    ? board?.clusters?.find((c) => c.id === clusterId)
    : undefined;
  const { open, available } = useQuoteBoard();
  if (!cluster || !available) return null;
  const count = cluster.groups.reduce((n, g) => n + g.notes.length, 0);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        open(cluster.id);
      }}
      className={cn(
        'mt-4 inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:border-primary/50 hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className
      )}
    >
      <MessageSquareQuote className="h-3.5 w-3.5" />
      What people said
      <span className="font-mono opacity-70">{count}</span>
    </button>
  );
}

/**
 * The quotes button as something droppable: put it in an insight card and it
 * finds the card's own cluster. In admin it says which one it landed on, and
 * says so when it lands on none, because a button that silently shows nothing
 * is indistinguishable from a broken one.
 */
export function QuoteLinkElement({
  path,
  data,
}: {
  path: string | null;
  data: Record<string, string>;
}) {
  const { content, isAdmin } = useContent();
  const { available } = useQuoteBoard();
  const board = content.arcatext.quoteBoard;
  const typed = (data.cluster ?? '').trim();
  const resolved = typed || clusterForPath(content, path) || '';
  const cluster = board?.clusters?.find((c) => c.id === resolved);

  if (!path) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary">
        <MessageSquareQuote className="h-3.5 w-3.5" />
        What people said
      </span>
    );
  }

  /* One line of explanation, as a tooltip rather than as copy on the page:
     the first version printed the cluster id under the button in grey, which
     read as something the page was saying rather than as a control. */
  const hint = !available
    ? 'No quote board on this page, so the button is hidden from visitors.'
    : cluster
      ? `Opens the “${cluster.insight}” column.${typed ? ' Set here.' : ' Matched from the card above — type an id here to override it.'}`
      : `Nothing matched the card above. Type one of: ${(board?.clusters ?? []).map((c) => c.id).join(', ')}`;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <QuoteBoardLink clusterId={cluster?.id} className="mt-0" />
      {isAdmin && (
        <span
          title={hint}
          className={cn(
            'inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 font-mono text-[10px]',
            cluster
              ? 'border-border/60 bg-muted/50 text-muted-foreground/70'
              : 'border-destructive/40 bg-destructive/10 text-destructive/80'
          )}
        >
          <Link2 className="h-3 w-3 opacity-60" aria-hidden />
          {!typed && <span className="opacity-70">{cluster ? cluster.id : 'no match'}</span>}
          <Editable as="span" path={`${path}.data.cluster`} className="inline-block min-w-3" />
        </span>
      )}
    </div>
  );
}

/**
 * Chosen notes, brought from the board onto the card.
 *
 * The notes are not copied: they are rendered from the board's own paths, so
 * editing one here edits the board and the two can never drift. What is
 * stored on the card is only which ones -- "<group>.<note>" refs, resolved
 * defensively, so a note taken off the board leaves no hole behind.
 */
export function QuoteNotesElement({
  path,
  data,
}: {
  path: string | null;
  data: Record<string, string>;
}) {
  const { content, isAdmin, setText } = useContent();
  const board = content.arcatext.quoteBoard;
  const typed = (data.cluster ?? '').trim();
  const resolved = typed || clusterForPath(content, path) || '';
  const ci = (board?.clusters ?? []).findIndex((c) => c.id === resolved);
  const cluster = ci >= 0 ? board!.clusters[ci] : undefined;

  const picked = (data.notes ?? '')
    .split(',')
    .map((r) => r.trim())
    .filter(Boolean);

  const toggle = (ref: string) => {
    if (!path) return;
    const next = picked.includes(ref) ? picked.filter((r) => r !== ref) : [...picked, ref];
    setText(`${path}.data.notes`, next.join(','));
  };

  /* Colour follows the board: a note keeps the colour of the group it was
     sorted into, so the same quote is the same colour in both places. */
  let g0 = 0;
  for (let k = 0; k < Math.max(0, ci); k++) g0 += board!.clusters[k].groups.length;

  const resolve = (ref: string) => {
    const [g, n] = ref.split('.').map(Number);
    const note = cluster?.groups?.[g]?.notes?.[n];
    if (!note) return null;
    const override = (note as { color?: string }).color;
    return {
      g,
      n,
      note,
      color: isColor(override) ? override : NOTE_COLORS[(g0 + g) % NOTE_COLORS.length],
    };
  };

  if (!path) {
    return (
      <div className="rounded-[10px] bg-amber-200/80 px-4 py-3.5 text-sm leading-snug text-amber-950 dark:bg-amber-300/15 dark:text-amber-100">
        A quote from the board, chosen for this card.
      </div>
    );
  }

  if (!cluster) {
    return isAdmin ? (
      <p className="font-mono text-[10px] text-destructive/80">
        Quotes: nothing matched this card. Set a cluster on the Quotes button, or here:{' '}
        <Editable as="span" path={`${path}.data.cluster`} className="inline-block min-w-8" />
      </p>
    ) : null;
  }

  return (
    <div>
      {/* Capped and upright, unlike the board's. A degree and a half of tilt
          reads as a hand-placed sticky at the 288px a board column gives it;
          across the full width of a card the same angle drops one end 30px
          below the other and the note reads as a wedge. */}
      <div className="flex max-w-[34rem] flex-col gap-2.5">
        {picked.map((ref) => {
          const r = resolve(ref);
          if (!r) return null;
          return (
            <div
              key={ref}
              className={cn('rounded-[10px] px-4 py-3 shadow-sm', NOTE_STYLE[r.color])}
            >
              <Editable
                as="p"
                multiline
                className="whitespace-pre-line text-sm leading-snug"
                path={`arcatext.quoteBoard.clusters.${ci}.groups.${r.g}.notes.${r.n}.text`}
              />
              <Editable
                as="p"
                className="mt-2 font-mono text-[10px] uppercase tracking-wide opacity-55"
                path={`arcatext.quoteBoard.clusters.${ci}.groups.${r.g}.notes.${r.n}.who`}
              />
            </div>
          );
        })}
      </div>

      {isAdmin && (
        <div contentEditable={false} className="mt-3 rounded-lg border border-dashed border-border/70 p-2.5">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-wide text-muted-foreground/70">
            Notes from “{cluster.insight}” · {picked.length} chosen
          </p>
          <div className="flex flex-col gap-2">
            {cluster.groups.map((group, g) => (
              <div key={g}>
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/60">
                  {group.title}
                </p>
                <div className="flex flex-col gap-1">
                  {group.notes.map((note, n) => {
                    const ref = `${g}.${n}`;
                    const on = picked.includes(ref);
                    return (
                      <button
                        key={n}
                        type="button"
                        onClick={() => toggle(ref)}
                        className={cn(
                          'flex items-start gap-2 rounded-md border px-2 py-1.5 text-left text-xs leading-snug transition-colors',
                          on
                            ? 'border-primary/50 bg-primary/10 text-foreground'
                            : 'border-transparent bg-muted/40 text-muted-foreground hover:bg-muted'
                        )}
                      >
                        <span className="mt-0.5 shrink-0">
                          {on ? <Check className="h-3 w-3 text-primary" /> : <Plus className="h-3 w-3 opacity-50" />}
                        </span>
                        <span className="line-clamp-2">{note.text}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Note({
  path,
  color,
  index,
  who,
}: {
  path: string;
  color: NoteColor;
  index: number;
  who: string;
}) {
  const { isAdmin } = useContent();
  return (
    <div
      className={cn(
        'rounded-[10px] px-4 py-3.5 shadow-sm transition-transform duration-200 hover:rotate-0 hover:shadow-md',
        NOTE_STYLE[color]
      )}
      style={{ transform: `rotate(${tilt(index)}deg)` }}
    >
      <Editable
        as="p"
        path={`${path}.text`}
        multiline
        className="whitespace-pre-line text-sm leading-snug"
      />
      {(who || isAdmin) && (
        <Editable
          as="p"
          path={`${path}.who`}
          className="mt-2 font-mono text-[10px] uppercase tracking-wide opacity-55"
        />
      )}
      {isAdmin && (
        <Editable
          as="p"
          path={`${path}.color`}
          className="mt-1 font-mono text-[9px] opacity-40"
        />
      )}
    </div>
  );
}

/** The board itself, centred over the page. */
function QuoteBoardModal({
  open,
  focusId,
  onClose,
}: {
  open: boolean;
  focusId: string | null;
  onClose: () => void;
}) {
  const { content, isAdmin } = useContent();
  const board = content.arcatext.quoteBoard;
  const scroller = useRef<HTMLDivElement>(null);
  const [lit, setLit] = useState<string | null>(null);

  /* Scrolled, then lit for a beat: the board can be long, and arriving at the
     right cluster with nothing to say so reads as having arrived at the top. */
  useEffect(() => {
    if (!open || !focusId) return;
    const t = window.setTimeout(() => {
      const el = scroller.current?.querySelector<HTMLElement>(`[data-cluster="${focusId}"]`);
      /* `inline`, not `block`: the board scrolls sideways, and block alone
         leaves a cluster off to the right exactly where it was. */
      el?.scrollIntoView({ block: 'nearest', inline: 'start', behavior: 'auto' });
      setLit(focusId);
    }, 30);
    const off = window.setTimeout(() => setLit(null), 1800);
    return () => {
      window.clearTimeout(t);
      window.clearTimeout(off);
    };
  }, [open, focusId]);

  /* Escape closes it, and the page behind it stays put: the scrollbar's width
     is handed back as padding so nothing shifts under the overlay. */
  useEffect(() => {
    if (!open) return;
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
  }, [open, onClose]);

  const copyLink = useCallback((id: string) => {
    const url = `${window.location.origin}${window.location.pathname}?quotes=${id}#/arcatext`;
    navigator.clipboard?.writeText(url).catch(() => {});
  }, []);

  if (!open || !board) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={board.label || 'Interview quotes'}
      onClick={onClose}
      className="fixed inset-0 z-[90] overflow-hidden"
    >
      <div className="absolute inset-0 bg-background/85 backdrop-blur-md" />
      <div className="relative flex h-full flex-col p-4 sm:p-6 lg:p-8">
        <div
          onClick={(e) => e.stopPropagation()}
          className="mx-auto flex h-full w-full max-w-[1400px] flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/95 shadow-2xl"
        >
          <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border/50 px-5 py-4 sm:px-7">
            <div>
              <Editable
                as="p"
                path="arcatext.quoteBoard.label"
                className="text-xs font-semibold uppercase tracking-[0.18em] text-primary"
              />
              <Editable
                as="p"
                path="arcatext.quoteBoard.intro"
                multiline
                className="mt-1.5 max-w-3xl text-sm leading-relaxed text-muted-foreground"
              />
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close the board"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border/60 bg-background/80 text-foreground/70 transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Sideways, like the board it is a picture of: a cluster is a
              column, and the subgroups stack inside it. */}
          <div
            ref={scroller}
            className="flex flex-1 gap-5 overflow-auto px-5 py-6 sm:px-7 [scrollbar-width:thin]"
          >
            <ItemGroup as="div" path="arcatext.quoteBoard.clusters" className="flex gap-5">
              {board.clusters.map((cluster, ci) => {
                /* Groups before this column, so the colour keeps walking
                   across the board instead of restarting at every cluster. */
                let g0 = 0;
                for (let k = 0; k < ci; k++) g0 += board.clusters[k].groups.length;
                let n = 0;
                return (
                  <section
                    key={cluster.id || ci}
                    data-cluster={cluster.id}
                    className={cn(
                      'flex w-[320px] shrink-0 flex-col rounded-xl border border-border/50 bg-muted/30 p-4 transition-shadow duration-500',
                      lit === cluster.id && 'ring-2 ring-primary ring-offset-2 ring-offset-card'
                    )}
                  >
                    <div className="mb-3 flex items-start gap-2">
                      <span className="mt-0.5 font-mono text-[11px] text-primary/70">
                        {String(ci + 1).padStart(2, '0')}
                      </span>
                      <Editable
                        as="h3"
                        path={`arcatext.quoteBoard.clusters.${ci}.insight`}
                        className="flex-1 text-sm font-semibold leading-snug text-foreground"
                      />
                      <button
                        type="button"
                        onClick={() => copyLink(cluster.id)}
                        title="Copy a link to this cluster"
                        aria-label={`Copy a link to ${cluster.insight}`}
                        className="shrink-0 text-muted-foreground/60 transition-colors hover:text-primary"
                      >
                        <Link2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    {isAdmin && (
                      <Editable
                        as="p"
                        path={`arcatext.quoteBoard.clusters.${ci}.id`}
                        className="mb-3 font-mono text-[10px] text-muted-foreground/60"
                      />
                    )}

                    <div className="flex flex-col gap-4">
                      {cluster.groups.map((group, gi) => {
                        const color = NOTE_COLORS[(g0 + gi) % NOTE_COLORS.length];
                        return (
                        <div key={gi}>
                          <Editable
                            as="p"
                            path={`arcatext.quoteBoard.clusters.${ci}.groups.${gi}.title`}
                            className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground"
                          />
                          <ItemGroup
                            as="div"
                            path={`arcatext.quoteBoard.clusters.${ci}.groups.${gi}.notes`}
                            className="flex flex-col gap-2.5"
                          >
                            {group.notes.map((note, ni) => (
                              <Note
                                key={ni}
                                color={isColor(note.color) ? note.color : color}
                                who={note.who ?? ''}
                                index={n++}
                                path={`arcatext.quoteBoard.clusters.${ci}.groups.${gi}.notes.${ni}`}
                              />
                            ))}
                          </ItemGroup>
                        </div>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </ItemGroup>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
