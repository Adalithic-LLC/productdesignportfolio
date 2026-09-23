import type { ElementType, ReactNode } from 'react';
import { ArrowRight, Check } from 'lucide-react';
import { Editable } from './Editable';
import { EditableImage } from './EditableImage';
import { useContent } from './ContentContext';
import { Mark } from '@/components/BrandMark';
import { MARK_KEYS } from '@/lib/brandMarks';
import type { ProseBlock } from './proseBlocks';

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

  return (
    <div className="flex h-full flex-col gap-4 rounded-xl border border-border/50 bg-card/60 p-5">
      <div className="flex items-center gap-3">
        {keys.map((name) => (
          <Mark key={name} name={name} />
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
          <span className="ml-1 opacity-60">— one or more of {MARK_KEYS.join(', ')}</span>
        </p>
      )}
    </div>
  );
}

export const ELEMENTS: ElementDef[] = [
  {
    id: 'card-logo',
    label: 'Card — logos & text',
    group: 'Cards',
    defaultData: {
      icons: 'google, apple',
      title: '',
      image: '',
      imageAlt: '',
      body: 'What this product does, and why it falls short.',
    },
    body: (ctx) => <LogoCard ctx={ctx} />,
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
