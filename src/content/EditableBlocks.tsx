import { Children, Fragment, cloneElement, isValidElement, useState } from 'react';
import type { ElementType, ReactElement, ReactNode } from 'react';
import { ArrowDown, ArrowUp, Columns2, Copy, Eye, GripVertical, Check as CheckIcon, Rows3, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useContent } from './ContentContext';
import { Editable } from './Editable';
import {
  blockForTool,
  canMoveBlocks,
  headerConfig,
  isProseBlock,
  type InsertTool,
  type ProseItem,
} from './proseBlocks';
import { ElementPreview, ElementView, getElement, isMediaBlock, makeElementBlock } from './elements';

/** Resolve a nested value out of the content store using a dot path. */
function getByPath(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc == null || typeof acc !== 'object') return undefined;
    return (acc as Record<string, unknown>)[key];
  }, obj);
}

/** Place the text caret at the end of a contentEditable element. */
function focusAtEnd(el: HTMLElement) {
  el.focus();
  const range = document.createRange();
  range.selectNodeContents(el);
  range.collapse(false);
  const sel = window.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(range);
}

/** Short label for the armed tool, used on the insertion line. */
function toolLabel(tool: InsertTool, groups: { id: string; name: string }[] = []): string {
  if (tool.kind === 'paragraph') return 'Paragraph';
  if (tool.kind === 'heading') return headerConfig(tool.style).label;
  if (tool.kind === 'group') return groups.find((g) => g.id === tool.id)?.name ?? 'Group';
  return getElement(tool.variant)?.label ?? 'Element';
}

/** The editable element for a single prose entry (paragraph, heading, or element). */
function blockElement(path: string, index: number, item: ProseItem) {
  const block = isProseBlock(item);
  if (block && item.type === 'element') {
    return <ElementView path={`${path}.${index}`} block={item} />;
  }
  const textPath = block ? `${path}.${index}.text` : `${path}.${index}`;
  if (block && item.type === 'heading') {
    const cfg = headerConfig(item.style);
    return <Editable as={cfg.tag} path={textPath} className={cfg.className} />;
  }
  /* The measure travels with the block; its size, weight and colour do not --
     those belong to the prose the block has been put into, and every page sets
     them its own way. */
  return <Editable as="p" multiline path={textPath} className="max-w-3xl" />;
}

/**
 * Renders a prose section from the content store as a list of editable blocks.
 *
 * Each entry is either a legacy string (rendered as a paragraph) or a typed
 * block (paragraph or heading). In admin it supports three overlays:
 *   - Insert tool armed: a clickable preview line between every block.
 *   - Move mode: each block becomes selectable, and "move here" lines appear
 *     between blocks once blocks from this list are selected.
 *   - Otherwise: inserted blocks show a hover delete affordance.
 */
/** True for an element block whose variant is a "Cards"-group card (griddable). */
function isCardElement(item: ProseItem): boolean {
  return (
    isProseBlock(item) &&
    item.type === 'element' &&
    /* Opted out of the row: it takes the column on its own. */
    !item.stack &&
    getElement(item.variant ?? '')?.group === 'Cards'
  );
}

export function EditableBlocks({
  path,
  from = 0,
  to,
}: {
  path: string;
  /* A half-open range of the section to render. Indices stay absolute, since
     they address the blocks in the content store: a slice only decides what is
     drawn, never what a block is called. A page splits a section this way to
     put part of it in a different layout -- a case study runs the blocks above
     its first media element beside the section figure, and the rest full
     width. */
  from?: number;
  to?: number;
}) {
  const { content, isAdmin, moveMode, groupMode, insertTool, selection, moveBlocksTo } =
    useContent();
  const raw = getByPath(content, path);
  const all: ProseItem[] = Array.isArray(raw) ? (raw as ProseItem[]) : [];
  const start = Math.max(0, Math.min(from, all.length));
  const end = Math.max(start, Math.min(to ?? all.length, all.length));
  /* Kept full-length so every index below is an index into the stored array;
     `start`/`end` bound the walk instead. */
  const items = all;

  const inMove = isAdmin && moveMode;
  /* Duplicate mode picks blocks exactly as Move does -- same overlay, same
     selection -- so the two share `MoveBlock`. What differs is the gaps: Move
     offers somewhere to put them, Duplicate does not, because a copy lands
     under its original. */
  const picking = inMove || (isAdmin && groupMode);
  // While inserting, moving or duplicating, every gap gets its line.
  const interactive = picking || (isAdmin && !!insertTool);
  const moveActiveHere =
    inMove &&
    selection?.domain === 'block' &&
    selection.indices.length > 0 &&
    canMoveBlocks(selection.path, selection.indices, path);

  const moveLine = (gap: number) =>
    moveActiveHere ? (
      <button
        key={`move-${gap}`}
        type="button"
        aria-label="Move selected blocks here"
        onClick={() => moveBlocksTo(path, gap)}
        className="group/move relative z-40 -my-1 flex w-full items-center gap-2 py-1"
      >
        <span className="whitespace-nowrap text-[10px] font-medium uppercase tracking-wide text-primary/70 transition-colors group-hover/move:text-primary">
          Move {selection!.domain === 'block' ? selection!.indices.length : 0} here
        </span>
        <span className="h-0.5 flex-1 rounded-full bg-primary/40 transition-colors group-hover/move:bg-primary" />
      </button>
    ) : null;

  /* One walk for every mode. Runs of card elements are laid out as a grid
     (2-3 across by default; a page can restyle `data-card-row`), everything
     else full width. While inserting or moving, each block also gets its
     insertion or move line above it -- inside its grid cell, so arming a tool
     does not restack a row of cards into one column and throw the page around
     under the reader. A run of pictures is the exception: its cells lay the
     picture and its caption side by side, which a line in the cell would
     break, so while a tool is armed it stacks with the lines between. */
  const slot = (gap: number) =>
    !interactive ? null : picking ? moveLine(gap) : <InsertZone key={`zone-${gap}`} path={path} index={gap} />;
  const block = (i: number) =>
    picking ? (
      <MoveBlock key={i} path={path} index={i} item={items[i]} />
    ) : (
      <Block key={i} path={path} index={i} item={items[i]} editable={isAdmin} />
    );
  const single = (i: number) => (
    <Fragment key={i}>
      {slot(i)}
      {block(i)}
    </Fragment>
  );

  /* A grid cell is already a column of the author's choosing, so cards in
     one stack rather than forming a row of their own inside it. */
  const inCell = path.includes('.cells.');
  const out: React.ReactNode[] = [];
  let i = start;
  while (i < end) {
    if (!inCell && isCardElement(items[i])) {
      const runStart = i;
      const run: number[] = [];
      while (i < end && isCardElement(items[i])) {
        run.push(i);
        i += 1;
      }
      const media = run.every((idx) => isMediaBlock(items[idx]));
      if (run.length > 1 && !(interactive && media)) {
        out.push(
          <div
            key={`grid-${runStart}`}
            /* Marked so a page can restyle a run of cards -- the case
               study pages put theirs on one row -- without this default
               having to know about them. */
            data-card-row
            /* A run whose cards are all pictures is marked, so a page can
               lay it out by the room a picture needs rather than by the
               column count that suits text cards. */
            data-media-row={media || undefined}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {run.map((idx) =>
              interactive ? (
                <div key={idx} className="flex flex-col">
                  {single(idx)}
                </div>
              ) : (
                block(idx)
              )
            )}
          </div>
        );
      } else {
        run.forEach((idx) => out.push(single(idx)));
      }
    } else {
      out.push(single(i));
      i += 1;
    }
  }
  if (interactive) out.push(<Fragment key="end">{slot(end)}</Fragment>);
  return <>{out}</>;
}

/**
 * A free-form block list placed at a structural seam in a page (after a card
 * grid, a diagram, a figure, or at a section's end). It lets admins insert
 * paragraphs and headers ANYWHERE — not only inside the predefined prose
 * arrays — and reorder them within the slot. The backing array is created on
 * first insert, so it costs nothing until used: when empty and no insert/move
 * tool is armed it renders nothing at all.
 */
export function BlockSlot({
  path,
  className,
  rise,
  prose = true,
}: {
  path: string;
  className?: string;
  /* Marks the slot as part of a sequenced region, so whatever raises the
     blocks inside it can keep the slot itself -- margins and all -- out of the
     page until the first one arrives. */
  rise?: boolean;
  /* A slot at a structural seam has no prose around it to inherit from, so it
     sets the pages' own body style itself -- otherwise a paragraph dropped
     between two cards comes out at browser defaults beside copy that is a step
     larger and muted. Slots inside an element (a card's caption, a grid cell)
     pass false: their type is the card's, not the page's. */
  prose?: boolean;
}) {
  const { content, isAdmin, insertTool, moveMode, groupMode } = useContent();
  const raw = getByPath(content, path);
  const items: ProseItem[] = Array.isArray(raw) ? (raw as ProseItem[]) : [];
  const armed = isAdmin && (!!insertTool || moveMode || groupMode);
  if (items.length === 0 && !armed) return null;
  return (
    <div
      className={cn(
        'my-6 space-y-5',
        prose && 'text-base leading-relaxed text-muted-foreground sm:text-lg',
        className
      )}
      data-rise-group={rise ? '' : undefined}
    >
      <EditableBlocks path={path} />
    </div>
  );
}

/**
 * Per-item admin controls (reorder · duplicate · delete) overlaid on a repeated
 * element (a card, list row, …). Operates on the content array at `path`.
 */
function ItemControls({ path, index }: { path: string; index: number }) {
  const { content, duplicateItem, moveItem, removeItem } = useContent();
  const raw = getByPath(content, path);
  const count = Array.isArray(raw) ? raw.length : 0;
  const act = (fn: () => void) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    fn();
  };
  const btn =
    'flex h-6 w-6 items-center justify-center rounded-md border border-border/60 bg-background/90 text-muted-foreground shadow-sm backdrop-blur transition hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30';
  return (
    <div
      contentEditable={false}
      className="absolute right-2 top-2 z-30 flex items-center gap-1"
    >
      <button type="button" title="Move up" disabled={index === 0} onClick={act(() => moveItem(path, index, -1))} className={btn}>
        <ArrowUp className="h-3.5 w-3.5" />
      </button>
      <button type="button" title="Move down" disabled={index >= count - 1} onClick={act(() => moveItem(path, index, 1))} className={btn}>
        <ArrowDown className="h-3.5 w-3.5" />
      </button>
      <button type="button" title="Duplicate" onClick={act(() => duplicateItem(path, index))} className={btn}>
        <Copy className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        title="Delete"
        onClick={act(() => removeItem(path, index))}
        className={cn(btn, 'hover:border-destructive/50 hover:bg-destructive/10 hover:text-destructive')}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

/**
 * Wraps a repeated element group (a card grid, a list, …) bound to the content
 * array at `path`. In admin mode it injects {@link ItemControls} into each child
 * (reorder · duplicate · delete), so any card/list-row can be duplicated to the
 * end of the list, reordered (numbering auto-updates), or removed — without
 * touching each card's markup. Renders the plain group for visitors.
 */
export function ItemGroup({
  path,
  as = 'div',
  className,
  children,
}: {
  path: string;
  as?: ElementType;
  className?: string;
  children: ReactNode;
}) {
  const { isAdmin } = useContent();
  const Tag = as;
  if (!isAdmin) return <Tag className={className}>{children}</Tag>;
  const kids = Children.toArray(children);
  return (
    <Tag className={className}>
      {kids.map((child, i) => {
        if (!isValidElement(child)) return child;
        const el = child as ReactElement<{ className?: string; children?: ReactNode }>;
        return cloneElement(el as ReactElement<Record<string, unknown>>, {
          key: i,
          className: cn('relative', el.props.className),
          /* Names the content entry this child stands for: the probe that
             checks every editable thing on the page can be moved or deleted
             looks for one of these, a part, or a block. */
          'data-item': `${path}.${i}`,
          children: (
            <>
              {el.props.children}
              <ItemControls path={path} index={i} />
            </>
          ),
        });
      })}
    </Tag>
  );
}

/**
 * A wrapper whose own children can take seams between them: a plain block
 * `div` or `section` with more than one child.
 *
 * Components are left alone -- they own their layout, and their children are
 * props rather than markup. So are rows, columns and anything taken out of the
 * flow: a slot inside a grid becomes a cell of it, a slot inside a flex row
 * becomes an item, and either one moves the things around it.
 */
function seamable(
  child: ReactNode
): child is ReactElement<{ className?: string; children?: ReactNode }> {
  if (!isValidElement(child)) return false;
  const el = child as ReactElement<{ className?: string; children?: ReactNode }>;
  if (el.type !== 'div' && el.type !== 'section') return false;
  if (/(^|[\s:])(grid|flex|absolute|fixed|sticky|inline)(\s|-|$)/.test(el.props.className ?? '')) {
    return false;
  }
  return Children.count(el.props.children) > 1;
}

/** How many levels of wrapper below a section get seams of their own. */
const SEAM_DEPTH = 2;

/**
 * One level of a section's own markup: a slot in every gap, and -- in Move
 * mode -- a handle on every part between them, so the page's own pieces can be
 * reordered and hidden the way inserted blocks already can.
 *
 * A part is addressed by its position in the source, the same way the slots
 * around it are, and the order and the hidden list live beside those slots at
 * `<prefix>.order` and `<prefix>.hidden`. So a part keeps the slot above it
 * when it moves, and -- as with the slots -- adding or removing a piece of
 * markup in the page renumbers what an existing order refers to.
 *
 * Hiding rather than deleting: a part is markup, not content, so there is
 * nothing to throw away and a hidden one can be brought back from the same
 * place it was hidden.
 *
 * Outside Move mode this renders exactly what the page wrote, minus whatever
 * is hidden: no wrapper, no handle, nothing for a visitor to pay for.
 */
function SeamGroup({
  prefix,
  children,
  rise,
  depth,
}: {
  prefix: string;
  children: ReactNode;
  rise?: boolean;
  depth: number;
}) {
  const { content, isAdmin, moveMode, selection, togglePartSelection, movePartsTo, setPartHidden } =
    useContent();
  const kids = Children.toArray(children);
  const natural = kids.map((_, i) => String(i));
  const storedOrder = getByPath(content, `${prefix}.order`);
  const stored = Array.isArray(storedOrder) ? (storedOrder as string[]) : [];
  const order = stored.length
    ? [...stored.filter((k) => natural.includes(k)), ...natural.filter((k) => !stored.includes(k))]
    : natural;
  const hiddenRaw = getByPath(content, `${prefix}.hidden`);
  const hidden = new Set(Array.isArray(hiddenRaw) ? (hiddenRaw as string[]) : []);

  const inMove = isAdmin && moveMode;
  const picked = (key: string) =>
    selection?.domain === 'part' && selection.prefix === prefix && selection.keys.includes(key);
  const active =
    inMove && selection?.domain === 'part' && selection.prefix === prefix && selection.keys.length > 0;

  const line = (gap: number) =>
    active ? (
      <button
        type="button"
        aria-label="Move selected parts here"
        onClick={() => movePartsTo(prefix, natural, gap)}
        className="group/part relative z-40 flex w-full items-center gap-2 py-2"
      >
        <span className="whitespace-nowrap text-[10px] font-medium uppercase tracking-wide text-primary/70 transition-colors group-hover/part:text-primary">
          Move {selection?.domain === 'part' ? selection.keys.length : 0} here
        </span>
        <span className="h-0.5 flex-1 rounded-full bg-primary/40 transition-colors group-hover/part:bg-primary" />
      </button>
    ) : null;

  /* `-in` so a wrapper's inner gaps cannot be mistaken for entries in the slot
     that sits above it, which is the array at this very path. */
  /** A part with no parts of its own inside it: the thing itself, not a box
      around other things. Only these carry a remove button outside Move mode,
      or every heading would sit under three nested crosses. */
  const isLeaf = (key: string) => !(depth > 0 && seamable(kids[Number(key)]));

  const part = (key: string) => {
    const child = kids[Number(key)];
    return depth > 0 && seamable(child)
      ? cloneElement(child, {
          children: (
            <SeamGroup prefix={`${prefix}.${key}-in`} rise={rise} depth={depth - 1}>
              {child.props.children}
            </SeamGroup>
          ),
        })
      : child;
  };

  return (
    <>
      {order.map((key, gap) => {
        const isHidden = hidden.has(key);
        const slot = <BlockSlot path={`${prefix}.${key}`} rise={rise} />;
        if (!inMove) {
          /* Outside Move mode a part is just the page, with one exception:
             an admin looking at a heading that can be retyped but has no
             cross beside it concludes it cannot be removed. Blocks have
             carried one all along; a leaf part gets the same, in the same
             gutter, so the two read as one affordance. */
          if (!isAdmin || !isLeaf(key)) {
            return (
              <Fragment key={key}>
                {slot}
                {!isHidden && part(key)}
              </Fragment>
            );
          }
          return (
            <Fragment key={key}>
              {slot}
              <div data-part={`${prefix}.${key}`} className="relative">
                {isHidden ? (
                  <div className="flex items-center gap-2 rounded-lg border border-dashed border-border/70 px-3 py-2 text-xs text-muted-foreground">
                    <span className="flex-1">Hidden — visitors do not see this part.</span>
                    <button
                      type="button"
                      onClick={() => setPartHidden(prefix, key, false)}
                      aria-label="Bring this part back"
                      className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-border/70 bg-background/90 transition hover:border-primary/60 hover:text-foreground"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    {part(key)}
                    <button
                      type="button"
                      onClick={() => setPartHidden(prefix, key, true)}
                      title="Remove this from the page"
                      aria-label="Remove this from the page"
                      className="absolute -left-8 top-0.5 z-20 flex h-6 w-6 items-center justify-center rounded-md border border-border/60 bg-background/90 text-muted-foreground opacity-70 shadow-sm transition hover:border-destructive/50 hover:bg-destructive/10 hover:text-destructive hover:opacity-100"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </>
                )}
              </div>
            </Fragment>
          );
        }
        return (
          <Fragment key={key}>
            {line(gap)}
            {slot}
            <div
              data-part={`${prefix}.${key}`}
              className={cn(
                'relative',
                picked(key) && 'rounded-xl ring-2 ring-primary ring-offset-4 ring-offset-background'
              )}
            >
              <div contentEditable={false} className="mb-1 flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => togglePartSelection(prefix, key)}
                  aria-label={picked(key) ? 'Deselect this part' : 'Select this part'}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium shadow-sm backdrop-blur transition-colors',
                    picked(key)
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border/70 bg-background/90 text-muted-foreground hover:border-primary/60 hover:text-foreground'
                  )}
                >
                  {picked(key) ? (
                    <CheckIcon className="h-3.5 w-3.5" />
                  ) : (
                    <GripVertical className="h-3.5 w-3.5" />
                  )}
                  Part
                </button>
                <button
                  type="button"
                  onClick={() => setPartHidden(prefix, key, !isHidden)}
                  title={isHidden ? 'Bring this part back' : 'Hide this part'}
                  aria-label={isHidden ? 'Bring this part back' : 'Hide this part'}
                  className={cn(
                    'inline-flex h-6 w-6 items-center justify-center rounded-md border border-border/70 bg-background/90 text-muted-foreground shadow-sm transition',
                    isHidden
                      ? 'hover:border-primary/60 hover:text-foreground'
                      : 'hover:border-destructive/50 hover:bg-destructive/10 hover:text-destructive'
                  )}
                >
                  {isHidden ? <Eye className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                </button>
              </div>
              {isHidden ? (
                <div className="rounded-lg border border-dashed border-border/70 px-3 py-2 text-xs text-muted-foreground">
                  Hidden — visitors do not see this part.
                </div>
              ) : (
                part(key)
              )}
            </div>
          </Fragment>
        );
      })}
      {line(order.length)}
      <BlockSlot path={`${prefix}.${kids.length}`} rise={rise} />
    </>
  );
}

/**
 * Wraps a section's children and drops a {@link BlockSlot} in *every* gap —
 * before the first child, between each pair, and after the last — so admins can
 * insert paragraphs/headers at any structural seam (after a card grid, a
 * diagram, etc.), not only inside the predefined prose arrays.
 *
 * It goes a couple of levels down, into the plain wrappers a section groups
 * its parts with, so the gaps that matter are reachable too: between a
 * subsection's heading and the cards under it, say. A gap costs nothing until
 * something is put in it — an empty slot renders nothing at all.
 *
 * Each slot's backing array lives at `seams.<id>.<gap>`, and a nested one at
 * `seams.<id>.<gap>-in.<gap>`; both are created on first insert.
 */
export function Seams({
  id,
  children,
  rise,
}: {
  id: string;
  children: ReactNode;
  /** Passed to every slot — see {@link BlockSlot}. */
  rise?: boolean;
}) {
  return (
    <SeamGroup prefix={`seams.${id}`} rise={rise} depth={SEAM_DEPTH}>
      {children}
    </SeamGroup>
  );
}

/**
 * A section's max-width content column with {@link Seams} applied, so every gap
 * between its blocks is an insertion point. Drop-in replacement for the
 * `<div className="max-w-6xl …">` wrapper each section used.
 */
export function SectionBody({
  id,
  children,
  className,
}: {
  id: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('max-w-6xl mx-auto px-4 sm:px-6 lg:px-8', className)}>
      <Seams id={id}>{children}</Seams>
    </div>
  );
}

/** A block in move mode: a click target that toggles its selection. */
function MoveBlock({ path, index, item }: { path: string; index: number; item: ProseItem }) {
  const { selection, toggleBlockSelection } = useContent();
  const selected =
    selection?.domain === 'block' && selection.path === path && selection.indices.includes(index);

  return (
    <div
      /* On the wrapper as well as the overlay below: the overlay is a sibling
         of the content, so anything asking "is this thing selectable?" by
         walking up from the content would never find it there. */
      data-movable={`${path}.${index}`}
      className={cn(
        'relative rounded-lg transition-shadow',
        selected && 'ring-2 ring-primary ring-offset-2 ring-offset-background'
      )}
    >
      {/* z-30 sits above the section-level select overlay (z-20) so clicking a
          paragraph/heading selects the block, not the whole section. */}
      <button
        type="button"
        aria-label="Select block"
        data-move-block={`${path}.${index}`}
        onClick={(e) => {
          e.stopPropagation();
          toggleBlockSelection(path, index);
        }}
        className="absolute inset-0 z-30 cursor-pointer rounded-lg transition-colors hover:bg-primary/10"
      />
      {blockElement(path, index, item)}
    </div>
  );
}

/** A single paragraph or heading entry, with an admin delete affordance for blocks. */
function Block({
  path,
  index,
  item,
  editable,
}: {
  path: string;
  index: number;
  item: ProseItem;
  editable: boolean;
}) {
  const { removeBlock, toggleBlockStack } = useContent();
  const el = blockElement(path, index, item);

  // Visitors see plain content; in admin every block gets a delete button.
  if (!editable) return el;

  // Element cards are boxed (and may sit in a grid cell), so anchor their delete
  // inside the top-right corner; prose blocks keep the gutter position.
  const isElement = isProseBlock(item) && item.type === 'element';
  const delPos = isElement ? 'right-2 top-2' : '-left-8 top-0.5';
  /* Only a card has a row to leave: everything else is full width already. */
  const canStack = isElement && getElement(item.variant ?? '')?.group === 'Cards';
  const stacked = isProseBlock(item) && !!item.stack;

  return (
    /* Marked so a grid cell can stretch the card inside to the cell's height
       through this wrapper, which only admin adds. */
    <div className="relative" data-block>
      {el}
      {/* Always rendered (not hover-gated) so it never vanishes mid-click. */}
      <button
        type="button"
        onClick={() => removeBlock(path, index)}
        title="Delete this block"
        aria-label="Delete this block"
        className={cn(
          'absolute z-20 flex h-6 w-6 items-center justify-center rounded-md border border-border/60 bg-background/90 text-muted-foreground opacity-70 shadow-sm transition hover:border-destructive/50 hover:bg-destructive/10 hover:text-destructive hover:opacity-100',
          delPos
        )}
      >
        <X className="h-3.5 w-3.5" />
      </button>
      {canStack && (
        <button
          type="button"
          onClick={() => toggleBlockStack(path, index)}
          title={stacked ? 'Put this card back in the row' : 'Give this card the full width'}
          aria-label={stacked ? 'Put this card back in the row' : 'Give this card the full width'}
          className="absolute right-10 top-2 z-20 flex h-6 w-6 items-center justify-center rounded-md border border-border/60 bg-background/90 text-muted-foreground opacity-70 shadow-sm transition hover:border-primary/50 hover:text-foreground hover:opacity-100"
        >
          {stacked ? <Columns2 className="h-3.5 w-3.5" /> : <Rows3 className="h-3.5 w-3.5" />}
        </button>
      )}
    </div>
  );
}

/**
 * A clickable insertion slot for the Insert tool. Renders nothing unless a tool
 * is armed. Shows a primary insertion line plus, on hover, a faded preview of
 * the block that will be created.
 */
function InsertZone({ path, index }: { path: string; index: number }) {
  const { content, isAdmin, insertTool, insertBlock, insertGroup } = useContent();
  const [hover, setHover] = useState(false);

  if (!isAdmin || !insertTool) return null;

  const groups = content.blockGroups ?? [];
  const heading = insertTool.kind === 'heading';
  const isElement = insertTool.kind === 'element';
  const isGroup = insertTool.kind === 'group';
  const cfg = heading ? headerConfig(insertTool.style) : null;

  const handleInsert = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    /* A group is several blocks at once, so it splices and there is no one
       field to put the caret in afterwards. */
    if (insertTool.kind === 'group') {
      insertGroup(path, index, insertTool.id);
      return;
    }
    const block = isElement ? makeElementBlock(insertTool.variant) : blockForTool(insertTool);
    insertBlock(path, index, block);
    /* The tool stays armed: adding one of something is rarely the whole job,
       and re-arming between every insert was the slow part. It is dropped by
       picking a different one, or by Escape -- neither of which touches what
       has already been added, since an insert writes into the content the
       moment it happens. */
    // Focus the new block's first editable field once it has rendered.
    const firstField = isElement ? Object.keys(block.data ?? {})[0] : null;
    const focusPath = isElement
      ? `${path}.${index}.data.${firstField}`
      : `${path}.${index}.text`;
    requestAnimationFrame(() => {
      const el = document.querySelector<HTMLElement>(`[data-editable-path="${focusPath}"]`);
      if (el) focusAtEnd(el);
    });
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Insert ${toolLabel(insertTool, groups)} here`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={handleInsert}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') handleInsert(e as unknown as React.MouseEvent);
      }}
      className="group/zone relative -my-1 cursor-pointer py-1"
    >
      <div className="flex items-center gap-2" aria-hidden>
        <span
          className={cn(
            'text-[10px] font-medium uppercase tracking-wide whitespace-nowrap transition-colors',
            hover ? 'text-primary' : 'text-primary/60'
          )}
        >
          + {toolLabel(insertTool, groups)}
        </span>
        <span
          className={cn(
            'h-0.5 flex-1 rounded-full transition-colors',
            hover ? 'bg-primary' : 'bg-primary/30'
          )}
        />
      </div>

      {hover && (
        <div className="pointer-events-none mt-2 select-none opacity-60" aria-hidden>
          {isGroup ? (
            <p className="text-sm text-muted-foreground">
              {groups.find((g) => g.id === (insertTool as { id: string }).id)?.blocks.length ?? 0}{' '}
              blocks
            </p>
          ) : isElement ? (
            <ElementPreview variant={insertTool.variant} />
          ) : cfg ? (
            (() => {
              const Tag = cfg.tag;
              return <Tag className={cn(cfg.className, 'opacity-70')}>{cfg.previewText}</Tag>;
            })()
          ) : (
            <p>New paragraph…</p>
          )}
        </div>
      )}
    </div>
  );
}
