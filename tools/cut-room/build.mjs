#!/usr/bin/env node
/**
 * Builds the portfolio's working copy of the Arcatext Cut Room
 * (public/cut-room/index.html) from the Cut Room's own page.
 *
 * The real Cut Room is a claude.ai artifact: its cuts, notes and timing live
 * in the artifact's shared database, reached through `window.claude`. This
 * copy keeps the page exactly as it is and puts a small local stand-in for
 * that runtime in front of it:
 *
 *   db        the versions and project in seed.json, plus anything a visitor
 *             adds (notes, retiming, picks), kept in their own localStorage
 *   user      a single local reviewer who can write
 *   downloads saves through an ordinary browser download
 *   comments  absent, so "Submit to Claude" marks notes as submitted and says
 *             what the real one would do
 *
 * The media the seed points at (cut/…, stems/…) sits next to the page in
 * public/cut-room/, at the same relative paths the artifact publishes them.
 *
 *   node tools/cut-room/build.mjs [source.html]
 *
 * source.html defaults to tools/cut-room/source.html: refresh it from the
 * artifact (Artifact read of the Cut Room) when the Cut Room's design changes,
 * then rerun this.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const src = readFileSync(process.argv[2] || join(here, 'source.html'), 'utf8');
const seed = JSON.parse(readFileSync(join(here, 'seed.json'), 'utf8'));

/** Swaps one exact piece of the page, and fails loudly if the page changed under it. */
let page = src;
const swap = (from, to) => {
  const n = page.split(from).length - 1;
  if (n !== 1) throw new Error(`expected exactly one match (found ${n}) for: ${from.slice(0, 80)}`);
  page = page.replace(from, to);
};

// What "Submit to Claude" says once it has marked the notes, here.
swap(
  ': `Marked ${items.length} as submitted. Claude isn’t watching this page right now, so say “go” in your Claude session and it will pick them up.`);',
  ': `Marked ${items.length} as submitted. This is a demo copy: in the real Cut Room the notes go to Claude Code, which makes the changes, renders the next cut and replies on each note.`);',
);
// Open on Arcatext 03 (Arcatext 02 is the other project this copy carries).
swap("state.project = store.get('cutroom.project') || 'chat';", "state.project = store.get('cutroom.project') || 'arcatext03';");
// The voiceover is on unless the visitor turns it off.
swap("state.voiceOn = store.get('cutroom.voiceOn') === '1';", "state.voiceOn = store.get('cutroom.voiceOn') !== '0';");
// Embedded (?embed), the tall player takes a fixed height instead of 78% of
// the frame's, so the frame can grow to fit the whole Cut Room.
swap('.screen.tall { aspect-ratio: 9 / 16; height: min(78vh, 900px);', '.screen.tall { aspect-ratio: 9 / 16; height: min(var(--tall-h, 78vh), 900px);');
// The first cut loaded starts at __CUTROOM_START (set by the stand-in below).
swap('      const t = v.currentTime;\n      state.cur = -1;', "      const t = v.getAttribute('src') ? v.currentTime : (window.__CUTROOM_START || 0);\n      state.cur = -1;");
// The platform overlays' counts become plain labels: on a public page,
// made-up numbers would read as real reach.
swap("['heart', '8,214'], ['comment', '112'], ['plane', '1,036']", "['heart', 'Like'], ['comment', 'Comment'], ['plane', 'Share']");
swap("['heartF', '12.4K'], ['commentF', '318'], ['bookmarkF', '1,204'], ['share', '907']", "['heartF', 'Like'], ['commentF', 'Comment'], ['bookmarkF', 'Save'], ['share', 'Share']");
swap("['thumbF', '24K'], ['thumbDownF', 'Dislike'], ['commentF', '406']", "['thumbF', 'Like'], ['thumbDownF', 'Dislike'], ['commentF', 'Comments']");
// The 16:9 player is held to the same fitted height as the tall one (--fit-h,
// set by the portfolio layer below); embedded, it is left to the width.
swap('.screen { position: relative; background: #000; border-radius: 10px; overflow: hidden; aspect-ratio: 16 / 9; max-width: 100%;', '.screen { position: relative; background: #000; border-radius: 10px; overflow: hidden; aspect-ratio: 16 / 9; max-width: 100%; width: min(100%, calc(var(--fit-h, 9999px) * 16 / 9)); margin-inline: auto;');
// The timeline's head: the scrub hint gives way to a plain label (the Cut
// Room's own fold button and folded scrub bar stay).
swap(`<span class="hint">Click or drag to scrub · drag a block's right edge on <b>Retime</b> to propose a new length</span>`, `<span class="tl-name">Timeline</span>`);
// Never send anything to Claude from the portfolio: the submit path is cut
// at its source, whatever runtime the page finds (the stand-in has no
// comments capability either).
swap("const can = comments ? await comments.canSendToClaude().catch(() => 'off') : 'off';", "const can = 'off'; // portfolio copy: notes never leave the browser");
// The connection badge.
swap("setLive('on', 'Live');", "setLive('on', 'Demo');");

const shim = `<script>
/* A local stand-in for the claude.ai runtime the Cut Room runs on (see
   tools/cut-room/build.mjs). Seeded with Arcatext 02; a visitor's own notes,
   retiming and picks stay in their browser. */
(() => {
  // Once per release of this copy, forget the picks an earlier one left
  // behind (project, cut, voice switch), so everyone opens on its defaults.
  try {
    if (localStorage.getItem('arcatext-cut-room-demo.release') !== '2') {
      ['cutroom.project', 'cutroom.slot', 'cutroom.voiceOn'].forEach((k) => localStorage.removeItem(k));
      localStorage.setItem('arcatext-cut-room-demo.release', '2');
    }
  } catch {}
  const SEED = ${JSON.stringify(seed)};
  const KEY = 'arcatext-cut-room-demo-v1';
  let local = {};
  try { local = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch {}
  const docs = new Map();
  for (const [col, items] of Object.entries(SEED)) for (const [id, d] of Object.entries(items)) docs.set(col + '/' + id, d);
  for (const [p, d] of Object.entries(local)) { if (d === null) docs.delete(p); else docs.set(p, d); }
  const clone = (x) => (x == null ? x : JSON.parse(JSON.stringify(x)));
  const persist = (p, d) => { local[p] = d; try { localStorage.setItem(KEY, JSON.stringify(local)); } catch {} };

  const listeners = new Set();
  const inCol = (p, col) => p.startsWith(col + '/') && p.split('/').length === col.split('/').length + 1;
  const docSnap = (p) => ({ id: p.split('/').pop(), exists: docs.has(p), data: () => clone(docs.get(p)), metadata: { hasPendingWrites: false } });
  const colSnap = (col, order) => {
    let list = [...docs.keys()].filter((p) => inCol(p, col));
    if (order) {
      const s = order.dir === 'desc' ? -1 : 1;
      list.sort((a, b) => { const x = (docs.get(a) || {})[order.f], y = (docs.get(b) || {})[order.f]; return x === y ? 0 : x > y ? s : -s; });
    }
    const out = list.map(docSnap);
    return { docs: out, size: out.length, empty: !out.length, forEach: (fn) => out.forEach(fn) };
  };
  const fire = (l) => { try { l.cb(l.col ? colSnap(l.col, l.order) : docSnap(l.p)); } catch (e) { console.error(e); } };
  let queued = false;
  const notify = () => { if (queued) return; queued = true; setTimeout(() => { queued = false; listeners.forEach(fire); }, 0); };
  const write = (p, d) => { if (d === null) docs.delete(p); else docs.set(p, d); persist(p, d); notify(); };
  const listen = (l) => { listeners.add(l); setTimeout(() => listeners.has(l) && fire(l), 0); return () => listeners.delete(l); };

  const docRef = (p) => ({
    id: p.split('/').pop(), path: p,
    set: async (d, o) => write(p, o && o.merge ? { ...(docs.get(p) || {}), ...clone(d) } : clone(d)),
    update: async (patch) => { if (!docs.has(p)) throw { code: 'not_found', message: 'No such document' }; write(p, { ...docs.get(p), ...clone(patch) }); },
    delete: async () => write(p, null),
    get: async () => docSnap(p),
    onSnapshot: (cb) => listen({ p, cb }),
  });
  const colRef = (col, order) => ({
    id: col.split('/').pop(), path: col,
    orderBy: (f, dir) => colRef(col, { f, dir: dir || 'asc' }),
    limit: () => colRef(col, order),
    doc: (id) => docRef(col + '/' + (id || Math.random().toString(36).slice(2, 12))),
    add: async (d) => { const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8); write(col + '/' + id, clone(d)); return docRef(col + '/' + id); },
    get: async () => colSnap(col, order),
    onSnapshot: (cb) => listen({ col, order, cb }),
  });
  const db = { collection: (c) => colRef(c), doc: (p) => docRef(p) };
  const user = { id: async () => 'reviewer', me: async () => ({ id: 'reviewer', name: 'You' }), can: async () => true, isOwner: () => true, canEdit: () => true, profiles: async () => ({}) };
  const downloads = {
    save: async ({ filename, data }) => {
      const blob = data instanceof Blob ? data : new Blob([data]);
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = filename;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 60000);
    },
  };
  const NS = { db, user, downloads };
  const EMBED = new URLSearchParams(location.search).has('embed');
  // Embedded, the player has a fixed height and the frame grows to fit; on
  // its own page it opens at 110% and the layer below fits it to the window.
  if (EMBED) document.documentElement.style.setProperty('--tall-h', 'min(600px, 125vw)');
  else document.documentElement.style.zoom = '1.1';
  // The first cut opens on a finished frame of its opener rather than its
  // black first frame; the first press of play still starts from 0:00, so
  // the whole voiceover is heard.
  window.__CUTROOM_START = 5.1;
  document.addEventListener('DOMContentLoaded', () => {
    const v = document.getElementById('v');
    if (!v) return;
    const first = () => {
      v.removeEventListener('play', first);
      if (Math.abs(v.currentTime - window.__CUTROOM_START) < 0.02) v.currentTime = 0;
    };
    v.addEventListener('play', first);
  });
  // Fixed in place, so nothing loaded later can swap in a runtime that talks to Claude.
  Object.defineProperty(window, 'claude', { value: Object.freeze({ use: async (name) => NS[name] || null }), writable: false, configurable: false });
})();
</script>`;

const layer = `<style>
/* Portfolio layer (tools/cut-room/build.mjs). */
.tl-name { margin-right: auto; font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.07em; color: var(--muted); }
.timeline.folded .tl-name { display: none; }
/* Side by side, the side panel ends where the player column does (its panes scroll). */
@media (min-width: 1021px) { .side { max-height: min(calc(var(--win-h, 100vh) - 28px), var(--stage-h, 100vh)); } }
</style>
<script>
(() => {
  const $ = (id) => document.getElementById(id);
  const tl = document.querySelector('.timeline');
  const root = document.documentElement;
  const EMBED = new URLSearchParams(location.search).has('embed');

  // On its own page, the player shrinks until the controls and the timeline
  // fit in the window. Measured, not assumed: the page is zoomed, and the
  // timeline is taller open than folded (its fold button is the Cut Room's own).
  const probe = document.createElement('div');
  probe.style.cssText = 'position:absolute;visibility:hidden;height:100px;width:1px;top:0;left:0';
  document.body.appendChild(probe);
  let fitQueued = false;
  const fit = () => {
    fitQueued = false;
    const scr = $('screen'), stage = document.querySelector('.stage');
    if (!scr || !tl) return;
    const k = probe.getBoundingClientRect().height / 100 || 1;
    // The player column's height caps the side panel, here and embedded, so
    // the page ends at the bottom of the timeline (folded or not).
    if (stage) {
      const sh = Math.ceil(stage.getBoundingClientRect().height / k);
      if (Math.abs(sh - (parseFloat(root.style.getPropertyValue('--stage-h')) || 0)) >= 1) root.style.setProperty('--stage-h', sh + 'px');
    }
    if (EMBED) return;
    const r = scr.getBoundingClientRect(), b = tl.getBoundingClientRect();
    const other = b.bottom + window.scrollY - r.height;
    // What sits under the timeline: the body's bottom padding and the root's.
    const under = (parseFloat(getComputedStyle(document.body).paddingBottom || '0') + parseFloat(getComputedStyle(root).paddingBottom || '0') + 1) * k;
    const want = Math.round(Math.max(300, Math.min(900, (window.innerHeight - under - other) / k)));
    // The side panel's cap is 100vh, which the zoom would inflate past the window.
    root.style.setProperty('--win-h', Math.floor(window.innerHeight / k) + 'px');
    const cur = parseFloat(root.style.getPropertyValue('--tall-h')) || 0;
    if (Math.abs(want - cur) < 2) return;
    root.style.setProperty('--tall-h', want + 'px');
    root.style.setProperty('--fit-h', want + 'px');
  };
  const queueFit = () => { if (!fitQueued) { fitQueued = true; requestAnimationFrame(fit); } };
  window.addEventListener('resize', queueFit);
  new ResizeObserver(queueFit).observe(document.querySelector('.stage') || document.body);
  new MutationObserver(queueFit).observe($('screen'), { attributes: true, attributeFilter: ['class'] });

  queueFit();
})();
</script>`;

// The artifact runtime wraps the page in this skeleton when it publishes it;
// a static copy has to carry it itself.
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<style>:root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0;font:14px/1.4 system-ui,-apple-system,sans-serif}img{max-width:100%}[hidden]{display:none!important}</style>
${shim}
</head>
<body>
${page}
${layer}
</body>
</html>
`;

const out = join(root, 'public', 'cut-room', 'index.html');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, html);
console.log('wrote', out, (html.length / 1024).toFixed(0) + ' KB');
