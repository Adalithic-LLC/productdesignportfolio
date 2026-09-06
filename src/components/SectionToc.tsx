import { useEffect, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useContent } from '@/content/ContentContext';
import { AdminNavEntry } from '@/components/AdminToggle';

export interface TocItem {
  /** The id of the <section> this entry links to (e.g. "sec-01"). */
  id: string;
  /** The display number for the entry (e.g. "01"). */
  n: string;
}

interface SectionNavProps {
  items: TocItem[];
  /** Human-readable label per item, index-aligned with `items`. */
  labels: string[];
  /** Hash route for this page (e.g. "#/arcatext"), used to preserve the URL. */
  routeHash: string;
  /** Admin-set section display order (ids); falls back to natural order. */
  order?: string[];
}

/** Reorder items + parallel labels by a list of section ids. */
function applyOrder(
  items: TocItem[],
  labels: string[],
  order?: string[]
): { items: TocItem[]; labels: string[] } {
  if (!order || !order.length) return { items, labels };
  const outItems: TocItem[] = [];
  const outLabels: string[] = [];
  order.forEach((id) => {
    const idx = items.findIndex((it) => it.id === id);
    if (idx >= 0) {
      outItems.push(items[idx]);
      outLabels.push(labels[idx]);
    }
  });
  // Append any sections not present in the stored order (e.g. newly added).
  items.forEach((it, idx) => {
    if (!order.includes(it.id)) {
      outItems.push(it);
      outLabels.push(labels[idx]);
    }
  });
  return { items: outItems, labels: outLabels };
}

/**
 * Tracks which section is currently in view via an IntersectionObserver and
 * returns its id. Shared by the desktop rail and the mobile dropdown so both
 * highlight the same active section.
 */
function useActiveSection(items: TocItem[]): string {
  const [activeId, setActiveId] = useState<string>(items[0]?.id ?? '');

  useEffect(() => {
    const sections = items
      .map((item) => document.getElementById(item.id))
      .filter((el): el is HTMLElement => el !== null);

    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible.length > 0) {
          setActiveId(visible[0].target.id);
        }
      },
      {
        rootMargin: '-30% 0px -55% 0px',
        threshold: [0, 0.25, 0.5, 0.75, 1],
      }
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [items]);

  return activeId;
}

/** Smooth-scroll to a section while preserving the admin URL flag. */
function useSectionJump(routeHash: string): (id: string) => void {
  const { isAdmin } = useContent();
  return (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    // Preserve the admin flag so scrolling doesn't drop out of edit mode.
    history.replaceState(null, '', isAdmin ? `${routeHash}?admin` : routeHash);
  };
}

/**
 * Desktop section navigation: a fixed vertical rail in the left gutter, shown
 * only at >=1600px where the gutter is guaranteed wide enough to clear the
 * centred content column. On narrower screens it renders nothing — the top-bar
 * SectionNavDropdown takes over there.
 */
export function SectionToc({ items: rawItems, labels: rawLabels, routeHash, order }: SectionNavProps) {
  const { items, labels } = applyOrder(rawItems, rawLabels, order);
  const activeId = useActiveSection(items);
  const jump = useSectionJump(routeHash);

  return (
    <nav
      aria-label="Section navigation"
      className="hidden min-[1600px]:block fixed top-1/2 left-6 -translate-y-1/2 z-40"
    >
      <ol className="space-y-3 text-sm">
        {items.map((item, i) => {
          const isActive = activeId === item.id;
          return (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  jump(item.id);
                }}
                className={`group flex items-baseline gap-3 py-1 transition-colors duration-200 ${
                  isActive
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <span
                  className={`text-xs font-mono ${
                    isActive ? 'text-primary' : 'text-muted-foreground/70'
                  }`}
                >
                  {item.n}
                </span>
                <span
                  className={`relative leading-snug ${
                    isActive
                      ? 'underline underline-offset-4 decoration-primary decoration-2'
                      : 'no-underline'
                  }`}
                >
                  {labels[i]}
                </span>
              </a>
            </li>
          );
        })}
      </ol>

      {/* Admin entry, under the last section. */}
      <div className="mt-4 border-t border-border/40 pt-3 pl-[1.9rem]">
        <AdminNavEntry />
      </div>
    </nav>
  );
}

/**
 * Mobile / narrow-screen section navigation, designed to sit in the top bar
 * between the Back link and the project label. Shows a single label — the
 * section currently in view — and opens a dropdown to jump to any section.
 * Hidden at >=1600px, where the vertical rail is used instead.
 */
export function SectionNavDropdown({ items: rawItems, labels: rawLabels, routeHash, order }: SectionNavProps) {
  const { items, labels } = applyOrder(rawItems, rawLabels, order);
  const activeId = useActiveSection(items);
  const jump = useSectionJump(routeHash);

  const activeIndex = Math.max(
    0,
    items.findIndex((item) => item.id === activeId)
  );
  const activeItem = items[activeIndex];
  const activeLabel = labels[activeIndex] ?? '';

  if (!activeItem) return null;

  return (
    <div className="min-[1600px]:hidden min-w-0 flex-1 flex justify-center px-2">
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Jump to section"
            className="inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium text-foreground transition-colors hover:bg-muted/60"
          >
            <span className="font-mono text-xs text-primary">{activeItem.n}</span>
            <span className="truncate">{activeLabel}</span>
            <ChevronDown className="h-4 w-4 shrink-0 opacity-60" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="center"
          className="z-[120] max-h-[70vh] overflow-y-auto"
        >
          {items.map((item, i) => {
            const isActive = item.id === activeId;
            return (
              <DropdownMenuItem
                key={item.id}
                onSelect={() => jump(item.id)}
                className="gap-3"
              >
                <span className="font-mono text-xs text-muted-foreground">{item.n}</span>
                <span className={`flex-1 ${isActive ? 'font-medium text-foreground' : ''}`}>
                  {labels[i]}
                </span>
                {isActive && <Check className="h-4 w-4 text-primary" />}
              </DropdownMenuItem>
            );
          })}

          {/* Admin entry, under the last section. */}
          <DropdownMenuSeparator />
          <div className="px-2 py-1.5">
            <AdminNavEntry className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground" />
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
