import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { SiteContent } from './types';
import type { InsertTool, ProseBlock } from './proseBlocks';
import defaultContent from './site-content.json';

/**
 * The current admin "Move" selection. Homogeneous by design: either whole
 * sections (by id) or prose blocks within a single list (by array path + index).
 */
export type MoveSelection =
  | { domain: 'section'; ids: string[] }
  | { domain: 'block'; path: string; indices: number[] };

/**
 * Where the content lives in the repo and which repo/branch admin edits commit to.
 * The save target branch can be overridden from the admin bar at runtime.
 */
const CONTENT_PATH = 'src/content/site-content.json';
const REPO_OWNER = 'Adalithic-LLC';
const REPO_NAME = 'productdesignportfolio';
const DEFAULT_BRANCH = 'main';

const DRAFT_KEY = 'pdp.content.draft';
const TOKEN_KEY = 'pdp.admin.token';
const BRANCH_KEY = 'pdp.admin.branch';

export type SaveState =
  | { status: 'idle' }
  | { status: 'saving' }
  | { status: 'success'; message: string }
  | { status: 'error'; message: string };

interface ContentContextValue {
  content: SiteContent;
  isAdmin: boolean;
  dirty: boolean;
  token: string;
  branch: string;
  saveState: SaveState;
  /** The armed insert tool for placing new prose blocks, or null. */
  insertTool: InsertTool | null;
  setInsertTool: (tool: InsertTool | null) => void;
  /** Whether admin "Move" mode is active (select + reorder sections/blocks). */
  moveMode: boolean;
  /** The current move selection, or null when nothing is selected. */
  selection: MoveSelection | null;
  /** Enter move mode (clears any insert tool and selection). */
  startMove: () => void;
  /** Exit move mode and clear the selection. */
  cancelMove: () => void;
  toggleSectionSelection: (id: string) => void;
  toggleBlockSelection: (path: string, index: number) => void;
  /** Move the selected sections before gap `targetGap` in the current order. */
  moveSectionsTo: (pageKey: string, naturalIds: string[], targetGap: number) => void;
  /** Move the selected blocks before gap `targetGap` within their list. */
  moveBlocksTo: (targetPath: string, targetGap: number) => void;
  setText: (path: string, value: string | number) => void;
  /** Insert a block into the array at `path` at the given index. */
  insertBlock: (path: string, index: number, block: ProseBlock) => void;
  /** Remove the array entry at `path`[index]. */
  removeBlock: (path: string, index: number) => void;
  /** Duplicate the array item at `path`[index], appending the copy to the end. */
  duplicateItem: (path: string, index: number) => void;
  /** Move the array item at `path`[index] by `delta` (-1 up / +1 down). */
  moveItem: (path: string, index: number, delta: number) => void;
  /** Remove the array item at `path`[index] and renumber if items carry `n`. */
  removeItem: (path: string, index: number) => void;
  setToken: (token: string) => void;
  setBranch: (branch: string) => void;
  save: () => Promise<void>;
  discardChanges: () => void;
  /** Commit an image file to the repo's public/ folder; returns the served path. */
  uploadAsset: (file: File) => Promise<string>;
}

const ContentContext = createContext<ContentContextValue | null>(null);


/** Read a nested value out of an object using a dot path like "hero.stats.0.label". */
function getByPath(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc == null || typeof acc !== 'object') return undefined;
    return (acc as Record<string, unknown>)[key];
  }, obj);
}

/** Immutably set a nested value using a dot path, cloning each level along the way. */
function setByPath<T>(obj: T, path: string, value: unknown): T {
  const keys = path.split('.');
  const clone: unknown = Array.isArray(obj) ? [...obj] : { ...(obj as object) };
  let cursor = clone as Record<string, unknown>;
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    const next = cursor[key];
    cursor[key] = Array.isArray(next) ? [...next] : { ...(next as object) };
    cursor = cursor[key] as Record<string, unknown>;
  }
  cursor[keys[keys.length - 1]] = value;
  return clone as T;
}

/**
 * If every item in a list is an object with a purely-numeric `n` field, reassign
 * those `n`s sequentially (1-based) so card numbering stays correct after a
 * duplicate / move / delete. The zero-padding width is preserved from the widest
 * existing value (e.g. "01".."09"). Lists without a numeric `n` are unchanged.
 */
function renumberList<T>(list: T[]): T[] {
  const numbered = list.every(
    (it) => it && typeof it === 'object' && 'n' in it && /^\d+$/.test(String((it as { n: unknown }).n))
  );
  if (!numbered || list.length === 0) return list;
  const width = Math.max(...list.map((it) => String((it as { n: unknown }).n).length), 1);
  return list.map((it, i) => ({ ...(it as object), n: String(i + 1).padStart(width, '0') })) as T[];
}

/** Base64-encode a UTF-8 string (btoa only handles latin1 on its own). */
function utf8ToBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  return bytesToBase64(bytes);
}

/** Base64-encode raw bytes in chunks (avoids call-stack limits on large files). */
function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/** Make a filesystem-safe, unique-ish name for an uploaded asset. */
function safeAssetName(name: string): string {
  const dot = name.lastIndexOf('.');
  const ext = dot > -1 ? name.slice(dot).toLowerCase() : '';
  const base = (dot > -1 ? name.slice(0, dot) : name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'image';
  return `${base}-${Date.now().toString(36)}${ext}`;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/**
 * Merge a saved draft over the default content. Draft values win for fields it
 * contains, but any key missing from the draft (e.g. a section added to the
 * schema after the draft was saved) falls back to the default — preventing
 * stale drafts from crashing the app with `undefined` content.
 */
function deepMerge<T>(base: T, override: unknown): T {
  if (isPlainObject(base) && isPlainObject(override)) {
    const out: Record<string, unknown> = { ...base };
    for (const key of Object.keys(override)) {
      out[key] = key in base ? deepMerge((base as Record<string, unknown>)[key], override[key]) : override[key];
    }
    return out as T;
  }
  // Arrays and primitives: take the draft's value when present, else the base.
  return (override === undefined ? base : (override as T));
}

function readDraft(): SiteContent | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as SiteContent) : null;
  } catch {
    return null;
  }
}

export function ContentProvider({
  isAdmin,
  children,
}: {
  isAdmin: boolean;
  children: ReactNode;
}) {
  const base = defaultContent as SiteContent;
  const [content, setContent] = useState<SiteContent>(() => {
    const draft = readDraft();
    return draft ? deepMerge(base, draft) : base;
  });
  const [dirty, setDirty] = useState<boolean>(() => readDraft() != null);
  const [token, setTokenState] = useState<string>(() => localStorage.getItem(TOKEN_KEY) ?? '');
  const [branch, setBranchState] = useState<string>(
    () => localStorage.getItem(BRANCH_KEY) ?? DEFAULT_BRANCH
  );
  const [saveState, setSaveState] = useState<SaveState>({ status: 'idle' });
  const [insertTool, setInsertToolState] = useState<InsertTool | null>(null);
  const [moveMode, setMoveMode] = useState(false);
  const [selection, setSelection] = useState<MoveSelection | null>(null);

  // When a move reorders content, the reflow (and tearing down the move-mode
  // overlays/insertion lines) would otherwise make the page jump. We record the
  // scroll offset before the mutation and restore it synchronously after the
  // commit, in a layout effect (pre-paint) so the viewport never visibly moves.
  const scrollRestoreRef = useRef<number | null>(null);
  const requestScrollRestore = useCallback(() => {
    if (typeof window === 'undefined') return;
    scrollRestoreRef.current = window.scrollY;
    // Disable scroll anchoring BEFORE the reorder commits, so the browser won't
    // follow a moved node (which is what makes the page jump). Re-enabled once
    // the restore settles.
    document.documentElement.style.overflowAnchor = 'none';
  }, []);
  useLayoutEffect(() => {
    const y = scrollRestoreRef.current;
    if (y == null) return;
    scrollRestoreRef.current = null;
    const html = document.documentElement;
    const prevBehavior = html.style.scrollBehavior;
    html.style.scrollBehavior = 'auto'; // restore instantly, not smoothly
    window.scrollTo(0, y);
    // Keep it pinned for a few frames against late reflows, then re-enable
    // scroll anchoring and restore smooth scrolling.
    let frame = 0;
    const tick = () => {
      if (window.scrollY !== y) window.scrollTo(0, y);
      if (++frame < 8) {
        requestAnimationFrame(tick);
      } else {
        html.style.overflowAnchor = '';
        html.style.scrollBehavior = prevBehavior;
      }
    };
    requestAnimationFrame(tick);
  });

  // Insert and Move are mutually exclusive modes; arming one exits the other.
  const setInsertTool = useCallback((tool: InsertTool | null) => {
    if (tool) {
      setMoveMode(false);
      setSelection(null);
    }
    setInsertToolState(tool);
  }, []);

  const startMove = useCallback(() => {
    setInsertToolState(null);
    setSelection(null);
    setMoveMode(true);
  }, []);

  const cancelMove = useCallback(() => {
    setMoveMode(false);
    setSelection(null);
  }, []);

  const toggleSectionSelection = useCallback((id: string) => {
    setSelection((prev) => {
      if (prev?.domain === 'section') {
        const ids = prev.ids.includes(id)
          ? prev.ids.filter((x) => x !== id)
          : [...prev.ids, id];
        return ids.length ? { domain: 'section', ids } : null;
      }
      return { domain: 'section', ids: [id] };
    });
  }, []);

  const toggleBlockSelection = useCallback((path: string, index: number) => {
    setSelection((prev) => {
      // Block selection is constrained to a single list; selecting in a
      // different list starts a fresh selection there.
      if (prev?.domain === 'block' && prev.path === path) {
        const indices = prev.indices.includes(index)
          ? prev.indices.filter((x) => x !== index)
          : [...prev.indices, index];
        return indices.length ? { domain: 'block', path, indices } : null;
      }
      return { domain: 'block', path, indices: [index] };
    });
  }, []);

  const persistDraft = useCallback((next: SiteContent) => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(next));
    } catch {
      /* ignore quota errors */
    }
    setDirty(true);
    setSaveState({ status: 'idle' });
  }, []);

  const setText = useCallback(
    (path: string, value: string | number) => {
      setContent((prev) => {
        const current = getByPath(prev, path);
        if (current === value) return prev;
        const next = setByPath(prev, path, value);
        persistDraft(next);
        return next;
      });
    },
    [persistDraft]
  );

  const insertBlock = useCallback(
    (path: string, index: number, block: ProseBlock) => {
      setContent((prev) => {
        const arr = getByPath(prev, path);
        const list = Array.isArray(arr) ? [...arr] : [];
        const at = Math.max(0, Math.min(index, list.length));
        list.splice(at, 0, block);
        const next = setByPath(prev, path, list);
        persistDraft(next);
        return next;
      });
    },
    [persistDraft]
  );

  const removeBlock = useCallback(
    (path: string, index: number) => {
      setContent((prev) => {
        const arr = getByPath(prev, path);
        if (!Array.isArray(arr) || index < 0 || index >= arr.length) return prev;
        const list = [...arr];
        list.splice(index, 1);
        const next = setByPath(prev, path, list);
        persistDraft(next);
        return next;
      });
    },
    [persistDraft]
  );

  const duplicateItem = useCallback(
    (path: string, index: number) => {
      setContent((prev) => {
        const arr = getByPath(prev, path);
        if (!Array.isArray(arr) || index < 0 || index >= arr.length) return prev;
        const copy = JSON.parse(JSON.stringify(arr[index]));
        const next = setByPath(prev, path, renumberList([...arr, copy]));
        persistDraft(next);
        return next;
      });
    },
    [persistDraft]
  );

  const moveItem = useCallback(
    (path: string, index: number, delta: number) => {
      requestScrollRestore();
      setContent((prev) => {
        const arr = getByPath(prev, path);
        if (!Array.isArray(arr)) return prev;
        const j = index + delta;
        if (index < 0 || index >= arr.length || j < 0 || j >= arr.length) return prev;
        const list = [...arr];
        [list[index], list[j]] = [list[j], list[index]];
        const next = setByPath(prev, path, renumberList(list));
        persistDraft(next);
        return next;
      });
    },
    [persistDraft, requestScrollRestore]
  );

  const removeItem = useCallback(
    (path: string, index: number) => {
      setContent((prev) => {
        const arr = getByPath(prev, path);
        if (!Array.isArray(arr) || index < 0 || index >= arr.length) return prev;
        const list = [...arr];
        list.splice(index, 1);
        const next = setByPath(prev, path, renumberList(list));
        persistDraft(next);
        return next;
      });
    },
    [persistDraft]
  );

  const moveSectionsTo = useCallback(
    (pageKey: string, naturalIds: string[], targetGap: number) => {
      if (selection?.domain !== 'section') return;
      const ids = selection.ids;
      requestScrollRestore();
      setContent((prev) => {
        const orderPath = `${pageKey}.sectionOrder`;
        const stored = getByPath(prev, orderPath) as string[] | undefined;
        // Current rendered order: stored ids that still exist, then any new ones.
        const current =
          stored && stored.length
            ? [...stored.filter((id) => naturalIds.includes(id)), ...naturalIds.filter((id) => !stored.includes(id))]
            : naturalIds;
        const removedBefore = current.slice(0, targetGap).filter((id) => ids.includes(id)).length;
        const moving = current.filter((id) => ids.includes(id)); // preserve relative order
        const remaining = current.filter((id) => !ids.includes(id));
        const at = Math.max(0, Math.min(targetGap - removedBefore, remaining.length));
        const nextOrder = [...remaining.slice(0, at), ...moving, ...remaining.slice(at)];
        const next = setByPath(prev, orderPath, nextOrder);
        persistDraft(next);
        return next;
      });
      cancelMove();
    },
    [selection, persistDraft, cancelMove, requestScrollRestore]
  );

  const moveBlocksTo = useCallback(
    (targetPath: string, targetGap: number) => {
      if (selection?.domain !== 'block' || selection.path !== targetPath) return;
      const indices = selection.indices;
      requestScrollRestore();
      setContent((prev) => {
        const arr = getByPath(prev, targetPath);
        if (!Array.isArray(arr)) return prev;
        const sorted = [...indices].sort((a, b) => a - b);
        const moving = sorted.map((i) => arr[i]); // preserve top-to-bottom order
        const remaining = arr.filter((_, i) => !sorted.includes(i));
        const removedBefore = sorted.filter((i) => i < targetGap).length;
        const at = Math.max(0, Math.min(targetGap - removedBefore, remaining.length));
        const nextArr = [...remaining.slice(0, at), ...moving, ...remaining.slice(at)];
        const next = setByPath(prev, targetPath, nextArr);
        persistDraft(next);
        return next;
      });
      cancelMove();
    },
    [selection, persistDraft, cancelMove, requestScrollRestore]
  );

  const setToken = useCallback((value: string) => {
    setTokenState(value);
    try {
      if (value) localStorage.setItem(TOKEN_KEY, value);
      else localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const setBranch = useCallback((value: string) => {
    const next = value.trim() || DEFAULT_BRANCH;
    setBranchState(next);
    try {
      localStorage.setItem(BRANCH_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const discardChanges = useCallback(() => {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      /* ignore */
    }
    setContent(base);
    setDirty(false);
    setSaveState({ status: 'idle' });
    setInsertTool(null);
    setMoveMode(false);
    setSelection(null);
  }, [base, setInsertTool]);

  const save = useCallback(async () => {
    if (!token) {
      setSaveState({ status: 'error', message: 'Enter a GitHub token first.' });
      return;
    }
    setSaveState({ status: 'saving' });
    const apiUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${CONTENT_PATH}`;
    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };

    try {
      const json = `${JSON.stringify(content, null, 2)}\n`;

      // Read the file's current blob SHA, bypassing any HTTP cache so we never
      // send a stale SHA — GitHub rejects those with a 409 "…does not match…".
      const fetchSha = async (): Promise<string | undefined> => {
        const getRes = await fetch(
          `${apiUrl}?ref=${encodeURIComponent(branch)}&t=${Date.now()}`,
          { headers, cache: 'no-store' }
        );
        if (getRes.ok) {
          const data = (await getRes.json()) as { sha?: string };
          return data.sha;
        }
        if (getRes.status === 404) return undefined; // file doesn't exist yet
        throw new Error(`Could not read existing file (${getRes.status}).`);
      };

      const commit = (sha: string | undefined) =>
        fetch(apiUrl, {
          method: 'PUT',
          headers,
          body: JSON.stringify({
            message: 'Update site content via admin mode',
            content: utf8ToBase64(json),
            branch,
            sha,
          }),
        });

      // Commit, and on a stale-SHA conflict re-read the latest SHA and retry.
      let putRes = await commit(await fetchSha());
      for (let attempt = 0; putRes.status === 409 && attempt < 2; attempt++) {
        putRes = await commit(await fetchSha());
      }

      if (!putRes.ok) {
        let detail = `${putRes.status}`;
        try {
          const err = (await putRes.json()) as { message?: string };
          if (err.message) detail = err.message;
        } catch {
          /* ignore */
        }
        if (putRes.status === 401 || putRes.status === 403) {
          detail = 'Authentication failed — check the token has "Contents: write" on this repo.';
        } else if (putRes.status === 409) {
          detail = 'The file changed during save — click Save again.';
        }
        throw new Error(detail);
      }

      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {
        /* ignore */
      }
      setDirty(false);
      setSaveState({
        status: 'success',
        message: `Committed to ${branch}. The live site updates on the next build.`,
      });
    } catch (e) {
      setSaveState({
        status: 'error',
        message: e instanceof Error ? e.message : 'Save failed.',
      });
    }
  }, [token, branch, content]);

  const uploadAsset = useCallback(
    async (file: File): Promise<string> => {
      if (!token) throw new Error('Enter a GitHub token first.');
      const fileName = safeAssetName(file.name);
      const repoPath = `public/uploads/${fileName}`;
      const buffer = new Uint8Array(await file.arrayBuffer());
      const apiUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${repoPath}`;
      const res = await fetch(apiUrl, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
        body: JSON.stringify({
          message: `Upload image ${fileName} via admin mode`,
          content: bytesToBase64(buffer),
          branch,
        }),
      });
      if (!res.ok) {
        let detail = `${res.status}`;
        try {
          const err = (await res.json()) as { message?: string };
          if (err.message) detail = err.message;
        } catch {
          /* ignore */
        }
        throw new Error(detail);
      }
      // Served from the site root once the build copies public/ into the bundle.
      return `/uploads/${fileName}`;
    },
    [token, branch]
  );

  const value = useMemo<ContentContextValue>(
    () => ({
      content,
      isAdmin,
      dirty,
      token,
      branch,
      saveState,
      insertTool,
      setInsertTool,
      moveMode,
      selection,
      startMove,
      cancelMove,
      toggleSectionSelection,
      toggleBlockSelection,
      moveSectionsTo,
      moveBlocksTo,
      setText,
      insertBlock,
      removeBlock,
      duplicateItem,
      moveItem,
      removeItem,
      setToken,
      setBranch,
      save,
      discardChanges,
      uploadAsset,
    }),
    [content, isAdmin, dirty, token, branch, saveState, insertTool, setInsertTool, moveMode, selection, startMove, cancelMove, toggleSectionSelection, toggleBlockSelection, moveSectionsTo, moveBlocksTo, setText, insertBlock, removeBlock, duplicateItem, moveItem, removeItem, setToken, setBranch, save, discardChanges, uploadAsset]
  );

  return <ContentContext.Provider value={value}>{children}</ContentContext.Provider>;
}

export function useContent(): ContentContextValue {
  const ctx = useContext(ContentContext);
  if (!ctx) {
    throw new Error('useContent must be used within a ContentProvider');
  }
  return ctx;
}

// Re-exported so the admin bar can show the user where edits land.
export const ADMIN_TARGET = { owner: REPO_OWNER, repo: REPO_NAME, path: CONTENT_PATH };
