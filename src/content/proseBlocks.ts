/**
 * Block model for editable prose sections.
 *
 * Historically a prose section was stored as a plain `string[]` — one paragraph
 * per entry. To let admins insert headings and paragraphs anywhere, an entry can
 * now also be a typed block object. Legacy plain strings are still valid and are
 * treated as paragraphs, so no existing content needs migrating.
 */

export type HeaderStyle = 'h2' | 'h3' | 'h4' | 'eyebrow' | 'sectionLabel';

export interface ProseBlock {
  type: 'paragraph' | 'heading' | 'element';
  /** Only set for `heading` blocks. */
  style?: HeaderStyle;
  /** Set for `paragraph` / `heading` blocks. */
  text?: string;
  /** Set for `element` blocks: the elements-registry variant id. */
  variant?: string;
  /** Set for `element` blocks: the element's editable field values. */
  data?: Record<string, string>;
}

/** A single entry in a prose array: a legacy string (= paragraph) or a block. */
export type ProseItem = string | ProseBlock;

/** The currently-armed admin insert tool, or null when nothing is armed. */
export type InsertTool =
  | { kind: 'paragraph' }
  | { kind: 'heading'; style: HeaderStyle }
  | { kind: 'element'; variant: string };

export interface HeaderStyleConfig {
  style: HeaderStyle;
  /** Label shown in the admin "Add header" menu. */
  label: string;
  /** Element rendered for this style. */
  tag: 'h2' | 'h3' | 'h4' | 'p';
  /**
   * Tailwind classes mirroring how this heading style is used on the project
   * pages. Colours use semantic tokens so they adapt to light/dark mode.
   */
  className: string;
  /** Placeholder copy shown in the insertion preview. */
  previewText: string;
}

/**
 * The heading styles actually used across the case-study pages. Keep these in
 * sync with the inline heading markup in the page components (SectionHeader h2,
 * subsection h3, item h4, and the uppercase eyebrow label).
 */
export const HEADER_STYLES: HeaderStyleConfig[] = [
  {
    style: 'h2',
    label: 'Section title',
    tag: 'h2',
    className:
      'text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-balance text-foreground',
    previewText: 'Section title',
  },
  {
    style: 'h3',
    label: 'Subsection',
    tag: 'h3',
    className: 'text-xl sm:text-2xl font-semibold text-foreground',
    previewText: 'Subsection heading',
  },
  {
    style: 'h4',
    label: 'Minor heading',
    tag: 'h4',
    className: 'text-base font-semibold text-foreground',
    previewText: 'Minor heading',
  },
  {
    style: 'eyebrow',
    label: 'Eyebrow / label',
    tag: 'p',
    className: 'text-xs uppercase tracking-[0.2em] text-muted-foreground',
    previewText: 'Eyebrow label',
  },
  {
    /* The style the case study pages head each section with -- "WHY IT
       MATTERS". Heavier and a step larger than the eyebrow above, which is
       why it is its own entry rather than a reuse of it. */
    style: 'sectionLabel',
    label: 'Section label',
    tag: 'h2',
    className: 'text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground',
    previewText: 'Section label',
  },
];

export function isProseBlock(item: ProseItem): item is ProseBlock {
  return typeof item === 'object' && item !== null;
}

/** The display text for any prose entry. */
export function proseText(item: ProseItem): string {
  return typeof item === 'string' ? item : item.text ?? '';
}

/** Look up a header config by style, falling back to the subsection style. */
export function headerConfig(style: HeaderStyle | undefined): HeaderStyleConfig {
  return HEADER_STYLES.find((h) => h.style === style) ?? HEADER_STYLES[1];
}

/** Build a fresh, empty block for the given armed insert tool. (Element blocks
 *  are built via `makeElementBlock` in elements.tsx so they carry sample data.) */
export function blockForTool(tool: InsertTool): ProseBlock {
  if (tool.kind === 'paragraph') return { type: 'paragraph', text: '' };
  if (tool.kind === 'heading') return { type: 'heading', style: tool.style, text: '' };
  return { type: 'element', variant: tool.variant, data: {} };
}
