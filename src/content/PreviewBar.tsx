import { useEffect } from 'react';
import { Eye } from 'lucide-react';
import { useContent } from './ContentContext';

/**
 * The band across the top while admin is previewing.
 *
 * Preview exists for the gap between saving and the deploy finishing: the
 * draft is already in memory, so the page can be shown exactly as it will read
 * once the build lands, without waiting for it. Everything editable is off
 * (the context reports `isAdmin: false` while previewing), so this bar is the
 * only thing on screen that is not the site itself -- and the only way back.
 *
 * It is fixed rather than in the flow so it cannot push a sticky header out of
 * position; the matching offsets live in index.css under `html[data-preview]`,
 * which moves the document and any `sticky top-0` header down by its height.
 */
const BAR_H = 36;

export function PreviewBar() {
  const { previewing, setPreviewing, dirty } = useContent();

  /* Set on the document rather than a wrapper: the offsets have to reach
     sticky headers inside pages this component does not own. */
  useEffect(() => {
    const root = document.documentElement;
    if (previewing) root.dataset.preview = '';
    else delete root.dataset.preview;
    return () => {
      delete root.dataset.preview;
    };
  }, [previewing]);

  if (!previewing) return null;

  return (
    <div
      className="fixed inset-x-0 top-0 z-[60] flex items-center justify-center gap-3 px-4 text-sm font-medium text-white"
      style={{ height: BAR_H, backgroundColor: '#0d5ffe' }}
    >
      <Eye className="h-4 w-4 shrink-0" aria-hidden />
      <span>
        Preview — {dirty ? 'showing unsaved changes' : 'showing the saved draft'} as visitors will see
        them
      </span>
      <button
        type="button"
        onClick={() => setPreviewing(false)}
        className="rounded-md bg-white/15 px-2.5 py-1 text-xs font-semibold transition-colors hover:bg-white/25"
      >
        Exit preview
      </button>
    </div>
  );
}
