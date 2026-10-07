import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, ExternalLink, Eye, EyeOff, LayoutGrid, List, Loader2, LogOut, Move, Plus, RotateCcw, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ADMIN_TARGET, useContent } from './ContentContext';
import { ContentEditorPanel } from './ContentEditorPanel';
import { HEADER_STYLES, headerConfig } from './proseBlocks';
import { ELEMENTS, ElementPreview, getElement } from './elements';
import { lockAdmin } from '@/lib/adminAuth';

/**
 * Floating control bar shown only in admin mode (#/admin). Lets the editor
 * paste a GitHub token, commit changes back to the repo, and exit.
 */
export function AdminBar() {
  const {
    isAdmin, dirty, token, branch, saveState,
    insertTool, setInsertTool,
    moveMode, selection, startMove, cancelMove,
    setToken, setBranch, save, discardChanges, setPreviewing, content, setText,
  } = useContent();
  const [showToken, setShowToken] = useState(false);
  const [open, setOpen] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
  // Element palette: which variant is being hovered (drives the side preview).
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [hiddenOpen, setHiddenOpen] = useState(false);
  const [hoverVariant, setHoverVariant] = useState<string | null>(null);

  // Esc cancels an armed insert tool or move mode.
  useEffect(() => {
    if (!insertTool && !moveMode) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (insertTool) setInsertTool(null);
      if (moveMode) cancelMove();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [insertTool, moveMode, setInsertTool, cancelMove]);

  if (!isAdmin) return null;

  const hiddenCount = content.arcatext.features.filter((f) => f.hidden).length;
  const paragraphArmed = insertTool?.kind === 'paragraph';
  const headerArmed = insertTool?.kind === 'heading';
  const elementArmed = insertTool?.kind === 'element';
  const armedLabel = !insertTool
    ? ''
    : insertTool.kind === 'paragraph'
      ? 'Paragraph'
      : insertTool.kind === 'heading'
        ? headerConfig(insertTool.style).label
        : getElement(insertTool.variant)?.label ?? 'Element';

  const selectedCount = selection
    ? selection.domain === 'section'
      ? selection.ids.length
      : selection.indices.length
    : 0;
  const selectedNoun = selection?.domain === 'section' ? 'section' : 'block';

  const exitAdmin = () => {
    // Strip any admin URL flag first, then clear the persistent session so the
    // flag can't immediately re-unlock it.
    const hash = window.location.hash;
    const path = hash.startsWith('#/') ? hash.slice(2).split('?')[0] : '';
    const dest = path === 'admin' ? '' : path;
    const target = dest ? `#/${dest}` : '#/';
    if (window.location.hash !== target) window.location.hash = target;
    lockAdmin();
  };

  const saving = saveState.status === 'saving';

  return (
    <>
    <ContentEditorPanel open={panelOpen} onClose={() => setPanelOpen(false)} />
    {/* Element-palette hover preview — a card on the right side of the screen. */}
    {paletteOpen && hoverVariant &&
      createPortal(
        <div className="fixed bottom-4 right-4 z-[101] w-[380px] max-w-[calc(100vw-2rem)] rounded-2xl border border-border/70 bg-background/95 p-4 shadow-2xl backdrop-blur-xl">
          <div className="mb-3 text-xs font-medium text-muted-foreground">
            Preview · {getElement(hoverVariant)?.label}
          </div>
          <ElementPreview variant={hoverVariant} />
        </div>,
        document.body
      )}
    {insertTool && (
      <div className="fixed top-20 left-1/2 z-[100] -translate-x-1/2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-center text-xs font-medium text-primary shadow-lg backdrop-blur">
        Inserting {armedLabel} — click a “+ {armedLabel}” line in the page. Esc to cancel.
      </div>
    )}
    {moveMode && (
      <div className="fixed top-20 left-1/2 z-[100] -translate-x-1/2 max-w-[calc(100%-2rem)] rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-center text-xs font-medium text-primary shadow-lg backdrop-blur">
        {selectedCount === 0
          ? 'Move mode — click sections or paragraphs/headers to select them. Esc to cancel.'
          : `${selectedCount} ${selectedNoun}${selectedCount > 1 ? 's' : ''} selected — click a “Move here” line to place them. Esc to cancel.`}
      </div>
    )}
    <div className="fixed bottom-4 left-1/2 z-[100] w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2">
      <div className="rounded-2xl border border-border/70 bg-background/95 shadow-2xl backdrop-blur-xl">
        {/* Header row */}
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="inline-flex h-2.5 w-2.5 flex-shrink-0 rounded-full bg-primary animate-pulse" />
            <span className="text-sm font-semibold">Admin mode</span>
            {dirty ? (
              <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                Unsaved changes
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">No unsaved changes</span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant="ghost"
              className="h-8 px-2 text-xs"
              onClick={() =>
                setOpen((v) => {
                  const next = !v;
                  // Collapsing also exits any armed insert/move so no orphaned mode lingers.
                  if (!next) {
                    setInsertTool(null);
                    cancelMove();
                  }
                  return next;
                })
              }
            >
              {open ? 'Hide settings' : 'Settings'}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0"
              onClick={exitAdmin}
              title="Exit admin mode"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Insert / Move tools — shown with settings, hidden when collapsed. */}
        {open && (
        <div className="flex flex-wrap items-center gap-2 border-t border-border/60 px-4 py-2.5">
          <span className="text-xs font-medium text-muted-foreground">Insert</span>
          <Button
            size="sm"
            variant={paragraphArmed ? 'default' : 'outline'}
            className="h-8 gap-1.5 px-2.5 text-xs"
            onClick={() => setInsertTool(paragraphArmed ? null : { kind: 'paragraph' })}
          >
            <Plus className="h-3.5 w-3.5" /> Paragraph
          </Button>
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant={headerArmed ? 'default' : 'outline'}
                className="h-8 gap-1.5 px-2.5 text-xs"
              >
                <Plus className="h-3.5 w-3.5" /> Header
                <ChevronDown className="h-3.5 w-3.5 opacity-70" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="top" className="z-[120]">
              {HEADER_STYLES.map((h) => (
                <DropdownMenuItem
                  key={h.style}
                  onClick={() => setInsertTool({ kind: 'heading', style: h.style })}
                  className="gap-6"
                >
                  <span className="flex-1">{h.label}</span>
                  {insertTool?.kind === 'heading' && insertTool.style === h.style && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu
            modal={false}
            open={paletteOpen}
            onOpenChange={(o) => {
              setPaletteOpen(o);
              if (!o) setHoverVariant(null);
            }}
          >
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant={elementArmed ? 'default' : 'outline'}
                className="h-8 gap-1.5 px-2.5 text-xs"
              >
                <LayoutGrid className="h-3.5 w-3.5" /> Element
                <ChevronDown className="h-3.5 w-3.5 opacity-70" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              side="top"
              className="z-[120] w-56"
              onCloseAutoFocus={() => setHoverVariant(null)}
            >
              <DropdownMenuLabel className="text-[11px] font-normal text-muted-foreground">
                Hover to preview · click to place
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {ELEMENTS.map((el) => (
                <DropdownMenuItem
                  key={el.id}
                  onMouseEnter={() => setHoverVariant(el.id)}
                  onFocus={() => setHoverVariant(el.id)}
                  onClick={() => {
                    setInsertTool({ kind: 'element', variant: el.id });
                    setPaletteOpen(false);
                    setHoverVariant(null);
                  }}
                  className="gap-6"
                >
                  <span className="flex-1">{el.label}</span>
                  {insertTool?.kind === 'element' && insertTool.variant === el.id && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <span className="mx-1 h-5 w-px bg-border" aria-hidden />
          <Button
            size="sm"
            variant={moveMode ? 'default' : 'outline'}
            className="h-8 gap-1.5 px-2.5 text-xs"
            onClick={() => (moveMode ? cancelMove() : startMove())}
          >
            <Move className="h-3.5 w-3.5" /> Move
          </Button>
          {moveMode && (
            <div className="ml-auto flex items-center gap-1.5 text-xs text-primary">
              <span className="hidden sm:inline">
                {selectedCount > 0
                  ? `${selectedCount} ${selectedNoun}${selectedCount > 1 ? 's' : ''} selected`
                  : 'Select items to move'}
              </span>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs"
                onClick={cancelMove}
                title="Exit move mode"
              >
                Done
              </Button>
            </div>
          )}
          {insertTool && (
            <div className="ml-auto flex items-center gap-1 text-xs text-primary">
              <span className="hidden sm:inline">Click a line in the page · Esc to cancel</span>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0"
                onClick={() => setInsertTool(null)}
                title="Cancel insert"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
        )}

        {open && (
          <div className="space-y-3 border-t border-border/60 px-4 py-3">
            {/* Token + branch */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">
                GitHub token (fine-grained, with “Contents: write” on this repo)
              </label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Input
                    type={showToken ? 'text' : 'password'}
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="github_pat_…"
                    autoComplete="off"
                    spellCheck={false}
                    className="h-9 pr-9 font-mono text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showToken ? 'Hide token' : 'Show token'}
                  >
                    {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <Input
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  placeholder="branch"
                  spellCheck={false}
                  className="h-9 w-28 text-xs"
                  title="Branch to commit to"
                />
              </div>
              <p className="text-[11px] leading-snug text-muted-foreground">
                Commits to{' '}
                <code className="rounded bg-muted px-1 py-0.5">
                  {ADMIN_TARGET.owner}/{ADMIN_TARGET.repo}
                </code>{' '}
                at <code className="rounded bg-muted px-1 py-0.5">{ADMIN_TARGET.path}</code>. The
                token is stored only in this browser.
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" onClick={save} disabled={saving || !dirty} className="gap-1.5">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? 'Saving…' : 'Save to GitHub'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPanelOpen(true)}
                className="gap-1.5"
              >
                <List className="h-4 w-4" />
                Edit all content
              </Button>
              {/* Shows the draft as the site itself, for checking formatting
                  without waiting on a deploy. */}
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPreviewing(true)}
                className="gap-1.5"
              >
                <Eye className="h-4 w-4" />
                Preview
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={discardChanges}
                disabled={!dirty || saving}
                className="gap-1.5"
              >
                <RotateCcw className="h-4 w-4" />
                Discard
              </Button>
              <a
                href={`https://github.com/${ADMIN_TARGET.owner}/${ADMIN_TARGET.repo}/commits/${branch}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                View commits <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            {/* Status */}
            {saveState.status === 'success' && (
              <div className="flex items-start gap-2 rounded-lg bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-400">
                <Check className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>{saveState.message}</span>
              </div>
            )}
            {saveState.status === 'error' && (
              <div className="flex items-start gap-2 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-700 dark:text-red-400">
                <X className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>{saveState.message}</span>
              </div>
            )}

            {/* Hidden content: case studies kept in full but off the strip.
                Hiding rather than deleting is what keeps a stale admin save
                from taking the writing with it. */}
            <div className="rounded-lg border border-border/60">
              <button
                type="button"
                onClick={() => setHiddenOpen((v) => !v)}
                className="flex w-full items-center justify-between px-3 py-2 text-xs font-medium"
              >
                <span className="flex items-center gap-1.5">
                  <EyeOff className="h-3.5 w-3.5" />
                  Hidden content
                  {hiddenCount > 0 && (
                    <span className="rounded-full bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                      {hiddenCount}
                    </span>
                  )}
                </span>
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${hiddenOpen ? 'rotate-180' : ''}`}
                />
              </button>
              {hiddenOpen && (
                <div className="border-t border-border/60 px-3 py-2">
                  <p className="mb-2 text-[11px] leading-snug text-muted-foreground">
                    A hidden case study keeps every word and picture; it is only off the strip, so
                    nothing is lost by putting it away.
                  </p>
                  <ul className="flex flex-col gap-1">
                    {content.arcatext.features.map((f, i) => {
                      const off = !!f.hidden;
                      return (
                        <li key={f.slug} className="flex items-center justify-between gap-3">
                          <span className={`text-xs ${off ? 'text-muted-foreground' : ''}`}>
                            {f.title}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setText(`arcatext.features.${i}.hidden`, off ? '' : 'hidden')
                            }
                            className="inline-flex items-center gap-1 rounded-md border border-border/60 px-2 py-0.5 text-[11px] transition-colors hover:bg-muted"
                          >
                            {off ? (
                              <>
                                <Eye className="h-3 w-3" /> Show
                              </>
                            ) : (
                              <>
                                <EyeOff className="h-3 w-3" /> Hide
                              </>
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>

            <p className="text-[11px] leading-snug text-muted-foreground">
              Click any text on the page to edit it (Enter confirms, click away to finish), or
              click an image to change it. Use <span className="font-medium">Edit all content</span>{' '}
              for every field, including links and form options.
            </p>
          </div>
        )}
      </div>
    </div>
    </>
  );
}
