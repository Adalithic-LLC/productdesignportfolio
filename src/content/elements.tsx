import { useState } from 'react';
import type { ElementType, ReactNode } from 'react';
import { ArrowRight, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { Editable } from './Editable';
import { BlockSlot } from './EditableBlocks';
import { EditableImage } from './EditableImage';
import { useContent } from './ContentContext';
import { Mark } from '@/components/BrandMark';
import RewordOptionScreen, { OPTION_SCREENS, type OptionScreen } from '@/components/RewordOptionScreen';
import { PromptArchitecture } from '@/components/PromptArchitecture';
import { MARK_KEYS } from '@/lib/brandMarks';
import type { ProseBlock, ProseItem } from './proseBlocks';

/**
 * Registry of insertable "UI element" variations (card designs, callouts, …).
 *
 * Each element renders from a flat `data` map of editable fields. When given a
 * `path` (a live block in the content store) the fields are editable via
 * <Editable>; with `path: null` they render static text from `data` — used for
 * the admin palette's hover preview. New elements are stored as block objects
 * `{ type:'element', variant, data }` in any seam array, so they can be inserted
 * anywhere on the page alongside paragraphs and headings.
 */

type FieldTag = 'span' | 'p' | 'div' | 'h3' | 'h4';
interface ElementCtx {
  path: string | null;
  data: Record<string, string>;
}
interface FieldProps {
  field: string;
  as?: FieldTag;
  className?: string;
  multiline?: boolean;
}
export interface ElementDef {
  id: string;
  label: string;
  group: string;
  /* Brings its own picture. A case study runs the blocks above its first media
     element beside the section figure and the rest full width, so the figure
     stops travelling once a block carries its own. */
  media?: boolean;
  defaultData: Record<string, string>;
  body: (ctx: ElementCtx) => ReactNode;
}

/** Build a field renderer: editable when a path is set, static text otherwise. */
function makeField(ctx: ElementCtx) {
  return function F({ field, as = 'span', className, multiline = false }: FieldProps) {
    if (ctx.path) {
      return <Editable as={as} path={`${ctx.path}.data.${field}`} className={className} multiline={multiline} />;
    }
    const Tag = as as ElementType;
    return <Tag className={className}>{ctx.data[field] ?? ''}</Tag>;
  };
}

/**
 * A card headed by one or more logos.
 *
 * The marks are stored as a comma-separated list of keys in a single `icons`
 * field, because element data is a flat string map. That field is not much use
 * as prose, so it is surfaced only in admin, as a small hint line naming the
 * keys that are available -- a visitor sees the marks alone.
 */
function LogoCard({ ctx }: { ctx: ElementCtx }) {
  const { isAdmin } = useContent();
  const keys = (ctx.data.icons ?? '')
    .split(',')
    .map((k) => k.trim().toLowerCase())
    .filter(Boolean);

  /* Both optional, and both shown in admin even when empty: an empty slot is
     the only way to reach the field and fill it, and clearing the text is how
     one is removed again. A visitor sees only what has been filled in. */
  const title = ctx.data.title ?? '';
  const image = ctx.data.image ?? '';
  const markText = ctx.data.markText ?? '';

  return (
    <div className="flex h-full flex-col gap-4 rounded-xl border border-border/50 bg-card/60 p-5">
      {/* Marks row: logos, and a typed one beside them for anything with no
          logo to borrow -- "NMT", say. Set at the icons' own 24px so a
          wordmark lines up with the glyphs on the other cards rather than
          sitting a size below them. */}
      <div className="flex min-h-6 items-center gap-3">
        {keys.map((name) => (
          <Mark key={name} name={name} />
        ))}
        {(markText || (ctx.path && isAdmin)) &&
          (ctx.path ? (
            <Editable
              as="span"
              path={`${ctx.path}.data.markText`}
              className={`text-2xl font-semibold leading-6 text-foreground/70 ${
                isAdmin ? 'inline-block min-h-6 min-w-10' : ''
              }`}
            />
          ) : (
            <span className="text-2xl font-semibold leading-6 text-foreground/70">{markText}</span>
          ))}
      </div>

      {(image || (ctx.path && isAdmin)) && (
        <div className="overflow-hidden rounded-lg border border-border/50 bg-muted/40">
          {ctx.path ? (
            <EditableImage
              path={`${ctx.path}.data.image`}
              altPath={`${ctx.path}.data.imageAlt`}
              className="block h-auto w-full"
              wrapperClassName="block w-full min-h-24"
            />
          ) : (
            image && <img src={image} alt="" className="block h-auto w-full" />
          )}
        </div>
      )}

      {(title || (ctx.path && isAdmin)) &&
        (ctx.path ? (
          <Editable
            as="h4"
            path={`${ctx.path}.data.title`}
            className={`text-base font-semibold leading-snug text-foreground ${
              isAdmin ? 'min-h-6' : ''
            }`}
          />
        ) : (
          <h4 className="text-base font-semibold leading-snug text-foreground">{title}</h4>
        ))}
      {/* Rendered directly rather than through `makeField`: that builds a
          component during render, which remounts the field on every keystroke
          and drops the caret. */}
      {ctx.path ? (
        <Editable
          as="p"
          path={`${ctx.path}.data.body`}
          multiline
          className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground"
        />
      ) : (
        <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
          {ctx.data.body ?? ''}
        </p>
      )}
      {ctx.path && isAdmin && (
        <p className="mt-auto text-left text-xs text-muted-foreground/70">
          <span className="font-medium">Logos:</span>{' '}
          <Editable as="span" path={`${ctx.path}.data.icons`} />
          <span className="ml-1 opacity-60">
            — one or more of {MARK_KEYS.join(', ')}; anything else goes in the text mark beside them
          </span>
        </p>
      )}
    </div>
  );
}

/**
 * Blank vertical space, with the height editable in admin.
 *
 * Invisible by definition, which makes it unreachable: a block with no height
 * and no ink cannot be clicked to edit, select or delete. So in admin it draws
 * itself as a dashed guide labelled with its height, and a visitor gets the
 * gap alone.
 */
function Spacer({ ctx }: { ctx: ElementCtx }) {
  const { isAdmin } = useContent();
  /* Clamped: the height is typed, and a stray keystroke should not push the
     rest of the page off the bottom of the screen. */
  const height = Math.min(400, Math.max(0, Number(ctx.data.height) || 0));

  if (!isAdmin) return <div style={{ height }} aria-hidden="true" />;

  return (
    <div
      className="relative flex items-center justify-center rounded border border-dashed border-primary/30 bg-primary/5"
      style={{ height: Math.max(height, 24) }}
    >
      <span className="text-[10px] tracking-wide text-muted-foreground/70">
        <span className="uppercase">Spacer</span>{' '}
        {ctx.path ? (
          <Editable
            as="span"
            path={`${ctx.path}.data.height`}
            className="mx-0.5 inline-block min-w-4 normal-case text-foreground/70"
          />
        ) : (
          <span className="mx-0.5">{height}</span>
        )}
        px
      </span>
    </div>
  );
}

/**
 * A still of one Arcatext option screen with a caption under it.
 *
 * The screen itself is a fixed render keyed by name rather than an uploaded
 * image, so it stays in step with the app's colors and labels; only the
 * caption is content. An unrecognised name falls back to the first screen so
 * a typo in admin never blanks the card.
 */
function ScreenCard({ ctx }: { ctx: ElementCtx }) {
  const { isAdmin } = useContent();
  const name = (ctx.data.screen ?? '').trim().toLowerCase() as OptionScreen;
  const screen = OPTION_SCREENS.includes(name) ? name : OPTION_SCREENS[0];

  return (
    <figure className="flex h-full flex-col items-center gap-5">
      <RewordOptionScreen screen={screen} scale={0.68} />
      {/* Rendered directly rather than through `makeField`: that builds a
          component during render, which drops the caret on every keystroke. */}
      <figcaption className="w-full">
        {/* Room for more than the one line this card defines: a heading over
            the text, a note under it, another element entirely. Both slots
            render nothing until something is put in them. */}
        {ctx.path && <BlockSlot path={`${ctx.path}.above`} className="mb-4 mt-0" />}
        {ctx.path ? (
          <Editable
            as="p"
            path={`${ctx.path}.data.caption`}
            multiline
            className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground"
          />
        ) : (
          <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
            {ctx.data.caption ?? ''}
          </p>
        )}
        {ctx.path && <BlockSlot path={`${ctx.path}.below`} className="mb-0 mt-4" />}
        {ctx.path && isAdmin && (
          <p className="mt-2 text-xs text-muted-foreground/70">
            <span className="font-medium">Screen:</span>{' '}
            <Editable as="span" path={`${ctx.path}.data.screen`} />
            <span className="ml-1 opacity-60">— one of {OPTION_SCREENS.join(', ')}</span>
          </p>
        )}
      </figcaption>
    </figure>
  );
}

/**
 * A grid of pictures shown one column at a time, with arrows between columns.
 *
 * The grid is addressed by cell -- `img_r2c1` is row 2 of column 1 -- so rows
 * and columns are just two numbers in the element's data: raise either and the
 * new empty cells appear as upload frames in admin, ready to fill. That keeps
 * a flat string map, which is all an element gets, able to describe a grid of
 * any size.
 *
 * A visitor pages only through columns that have something in them, so a
 * column added but not yet filled is not a blank slide in the sequence; in
 * admin every column is reachable, since an empty one is how a picture gets
 * added to it.
 */
function PagedGallery({ ctx }: { ctx: ElementCtx }) {
  const { isAdmin } = useContent();
  const [col, setCol] = useState(0);

  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
  const rows = clamp(Number(ctx.data.rows) || 2, 1, 8);
  const cols = clamp(Number(ctx.data.cols) || 2, 1, 12);
  const cell = (r: number, c: number) => `r${r + 1}c${c + 1}`;

  const filled = (c: number) =>
    Array.from({ length: rows }, (_, r) => ctx.data[`img_${cell(r, c)}`]).some(Boolean);
  const pages = Array.from({ length: cols }, (_, c) => c).filter((c) => isAdmin || filled(c));
  if (pages.length === 0) return null;

  /* Clamped rather than stored: lowering the column count while a later one is
     open would otherwise leave the view on a column that no longer exists. */
  const at = clamp(col, 0, pages.length - 1);
  const current = pages[at];
  const go = (d: 1 | -1) => setCol(clamp(at + d, 0, pages.length - 1));

  return (
    <figure className="relative">
      <div className="flex flex-col gap-5">
        {Array.from({ length: rows }, (_, r) => {
          const key = cell(r, current);
          const src = ctx.data[`img_${key}`] ?? '';
          const caption = ctx.data[`cap_${key}`] ?? '';
          if (!src && !isAdmin) return null;
          return (
            <div key={key}>
              {/* The frame keeps a height while empty so the shape of the
                  gallery reads before anything is in it -- in the palette
                  preview, and in a column just added. */}
              <div className={`overflow-hidden rounded-xl border border-border/50 bg-muted/40 ${src ? '' : 'min-h-40'}`}>
                {ctx.path ? (
                  <EditableImage
                    path={`${ctx.path}.data.img_${key}`}
                    altPath={`${ctx.path}.data.alt_${key}`}
                    className="block h-auto w-full"
                    wrapperClassName="block w-full min-h-40"
                  />
                ) : (
                  src && <img src={src} alt="" className="block h-auto w-full" />
                )}
              </div>
              {(caption || (ctx.path && isAdmin)) &&
                (ctx.path ? (
                  <Editable
                    as="figcaption"
                    path={`${ctx.path}.data.cap_${key}`}
                    multiline
                    className={`mt-3 text-sm leading-relaxed text-muted-foreground ${
                      isAdmin ? 'min-h-5' : ''
                    }`}
                  />
                ) : (
                  <figcaption className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    {caption}
                  </figcaption>
                ))}
            </div>
          );
        })}
      </div>

      {pages.length > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3">
          <GalleryArrow side="left" onClick={() => go(-1)} disabled={at === 0} />
          <span className="font-mono text-xs text-muted-foreground">
            {at + 1} / {pages.length}
          </span>
          <GalleryArrow side="right" onClick={() => go(1)} disabled={at === pages.length - 1} />
        </div>
      )}

      {ctx.path && isAdmin && (
        <p className="mt-3 text-xs text-muted-foreground/70">
          <span className="font-medium">Rows:</span>{' '}
          <Editable as="span" path={`${ctx.path}.data.rows`} className="inline-block min-w-3" />
          <span className="ml-3 font-medium">Columns:</span>{' '}
          <Editable as="span" path={`${ctx.path}.data.cols`} className="inline-block min-w-3" />
          <span className="ml-2 opacity-60">— raise either to add empty cells to fill</span>
        </p>
      )}
    </figure>
  );
}

function GalleryArrow({
  side,
  onClick,
  disabled,
}: {
  side: 'left' | 'right';
  onClick: () => void;
  disabled: boolean;
}) {
  const Icon = side === 'left' ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={side === 'left' ? 'Previous column' : 'Next column'}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-background/90 text-foreground shadow-sm transition-colors hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-30"
    >
      <Icon className="h-5 w-5" />
    </button>
  );
}

export const ELEMENTS: ElementDef[] = [
  {
    id: 'card-logo',
    label: 'Card — logos & text',
    group: 'Cards',
    defaultData: {
      icons: 'google, apple',
      markText: '',
      title: '',
      image: '',
      imageAlt: '',
      body: 'What this product does, and why it falls short.',
    },
    body: (ctx) => <LogoCard ctx={ctx} />,
  },
  {
    id: 'screen-reword',
    label: 'Screen — Reword option',
    group: 'Cards',
    media: true,
    defaultData: {
      screen: 'gender',
      caption: 'What this screen shows, and why it sits here.',
    },
    body: (ctx) => <ScreenCard ctx={ctx} />,
  },
  {
    id: 'card-basic',
    label: 'Card — title & text',
    group: 'Cards',
    defaultData: { title: 'Card title', desc: 'Supporting detail for this card.' },
    body: (ctx) => {
      const F = makeField(ctx);
      return (
        <div className="rounded-2xl bg-muted/40 p-6 lg:p-8">
          <F field="title" as="h4" className="font-semibold mb-2 text-balance" />
          <F field="desc" as="p" multiline className="text-sm text-muted-foreground leading-relaxed" />
        </div>
      );
    },
  },
  {
    id: 'card-numbered',
    label: 'Card — numbered',
    group: 'Cards',
    defaultData: { num: '01', title: 'Numbered card', desc: 'Supporting detail for this card.' },
    body: (ctx) => {
      const F = makeField(ctx);
      return (
        <div className="rounded-2xl bg-muted/40 p-6 lg:p-8">
          <F field="num" as="span" className="text-sm font-mono text-primary/70" />
          <F field="title" as="h3" className="text-lg lg:text-xl font-semibold mt-2 mb-3" />
          <F field="desc" as="p" multiline className="text-sm text-muted-foreground leading-relaxed" />
        </div>
      );
    },
  },
  {
    id: 'card-highlight',
    label: 'Card — highlight',
    group: 'Cards',
    defaultData: { title: 'Highlight card', desc: 'An idea worth emphasizing.' },
    body: (ctx) => {
      const F = makeField(ctx);
      return (
        <div className="rounded-2xl bg-gradient-to-br from-primary/10 to-primary/[0.03] p-6 lg:p-8">
          <F field="title" as="h4" className="font-semibold mb-2 text-balance" />
          <F field="desc" as="p" multiline className="text-sm text-muted-foreground leading-relaxed" />
        </div>
      );
    },
  },
  {
    id: 'card-flow',
    label: 'Card — flow',
    group: 'Cards',
    defaultData: { title: 'Flow name', num: '01', flow: 'Input → Process → Output', desc: 'How this flow works.' },
    body: (ctx) => {
      const F = makeField(ctx);
      return (
        <div className="rounded-2xl bg-muted/40 p-6 lg:p-8 flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <F field="title" as="h3" className="text-lg font-semibold" />
            <F field="num" as="span" className="text-xs font-mono text-muted-foreground shrink-0" />
          </div>
          <F
            field="flow"
            as="p"
            className="inline-block self-start px-3 py-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20 text-sm font-medium font-mono"
          />
          <F field="desc" as="p" multiline className="text-sm text-muted-foreground leading-relaxed" />
        </div>
      );
    },
  },
  {
    id: 'stat-tile',
    label: 'Stat tile',
    group: 'Cards',
    defaultData: { value: '100%', label: 'What this metric measures.' },
    body: (ctx) => {
      const F = makeField(ctx);
      return (
        <div className="rounded-2xl bg-gradient-to-br from-primary/10 to-primary/[0.03] p-6">
          <F field="value" as="div" className="text-3xl sm:text-4xl font-bold gradient-text mb-2" />
          <F field="label" as="div" multiline className="text-sm text-muted-foreground leading-relaxed" />
        </div>
      );
    },
  },
  {
    id: 'checklist-point',
    label: 'Checklist point',
    group: 'Cards',
    defaultData: { text: 'A concrete outcome or highlight.' },
    body: (ctx) => {
      const F = makeField(ctx);
      return (
        <div className="flex gap-4 rounded-2xl bg-muted/40 p-6">
          <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
            <Check className="w-4 h-4 text-primary" />
          </div>
          <F field="text" as="p" multiline className="text-sm sm:text-base text-foreground/85 leading-relaxed" />
        </div>
      );
    },
  },
  {
    id: 'case-study',
    label: 'Case-study link',
    group: 'Cards',
    defaultData: { eyebrow: 'Case 01', title: 'Case study title', question: 'The question this study explores.' },
    body: (ctx) => {
      const F = makeField(ctx);
      return (
        <div className="rounded-2xl bg-muted/40 p-6 lg:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <F field="eyebrow" as="span" className="text-xs font-mono text-primary/70" />
              <F field="title" as="h4" className="text-lg lg:text-xl font-semibold mt-2 mb-3" />
              <F field="question" as="p" multiline className="text-sm text-muted-foreground leading-relaxed italic" />
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground shrink-0 mt-1" />
          </div>
        </div>
      );
    },
  },
  {
    id: 'callout',
    label: 'Callout',
    group: 'Callouts',
    defaultData: { eyebrow: 'The opportunity', text: 'A bold statement that frames the work.' },
    body: (ctx) => {
      const F = makeField(ctx);
      return (
        <div className="rounded-2xl bg-primary/10 p-8">
          <F field="eyebrow" as="p" className="text-xs uppercase tracking-[0.2em] text-primary mb-3" />
          <F field="text" as="p" multiline className="text-xl sm:text-2xl font-semibold text-balance leading-snug" />
        </div>
      );
    },
  },
  {
    /* The rule the case study pages set between sections -- same token, same
       weight -- so one dropped inside a section matches the ones around it.
       Not in the "Cards" group, so a run of them is never gridded; a divider
       is always full width. */
    id: 'divider',
    label: 'Divider line',
    group: 'Layout',
    defaultData: {},
    body: () => <div className="my-2 border-t border-border/40" aria-hidden="true" />,
  },
  {
    /* A grid of pictures paged a column at a time. Not in "Cards", so a run
       of them is never gridded; it does its own paging. */
    id: 'gallery-paged',
    label: 'Gallery — paged columns',
    group: 'Layout',
    media: true,
    defaultData: { rows: '2', cols: '2' },
    body: (ctx) => <PagedGallery ctx={ctx} />,
  },
  {
    /* The Arcatext page's modular prompt diagram, insertable into a case
       study. It is interactive and two-column, so it carries `data-wide` to
       claim the same breakout past the reading measure that a row of cards
       gets -- a reading-width column would squeeze it to nothing. */
    id: 'prompt-system',
    label: 'Modular prompt diagram',
    group: 'Layout',
    media: true,
    defaultData: {},
    body: () => (
      <div data-wide>
        <PromptArchitecture />
      </div>
    ),
  },
  {
    id: 'spacer',
    label: 'Spacer',
    group: 'Layout',
    defaultData: { height: '32' },
    body: (ctx) => <Spacer ctx={ctx} />,
  },
  {
    id: 'quote',
    label: 'Quote',
    group: 'Callouts',
    defaultData: { text: 'A memorable quote that captures the insight.' },
    body: (ctx) => {
      const F = makeField(ctx);
      return (
        <figure className="max-w-3xl">
          <blockquote className="text-2xl sm:text-3xl font-semibold leading-snug text-balance">
            <F field="text" as="span" multiline />
          </blockquote>
        </figure>
      );
    },
  },
];

export function getElement(variant: string): ElementDef | undefined {
  return ELEMENTS.find((e) => e.id === variant);
}

/** True for a block that brings its own picture (see `ElementDef.media`). */
export function isMediaBlock(item: ProseItem): boolean {
  return (
    typeof item === 'object' &&
    item !== null &&
    item.type === 'element' &&
    !!getElement(item.variant ?? '')?.media
  );
}

/** A fresh element block (with default sample data) for the given variant. */
export function makeElementBlock(variant: string): ProseBlock {
  const def = getElement(variant);
  return { type: 'element', variant, data: { ...(def?.defaultData ?? {}) } };
}

/** Live (editable) render of an element block at its content path. */
export function ElementView({ path, block }: { path: string; block: ProseBlock }) {
  const def = block.variant ? getElement(block.variant) : undefined;
  if (!def) return null;
  return <>{def.body({ path, data: block.data ?? def.defaultData })}</>;
}

/** Static render of an element variant with its sample data (palette preview). */
export function ElementPreview({ variant }: { variant: string }) {
  const def = getElement(variant);
  if (!def) return null;
  return <>{def.body({ path: null, data: def.defaultData })}</>;
}
