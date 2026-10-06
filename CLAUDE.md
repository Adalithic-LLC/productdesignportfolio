# Product Design Portfolio — Claude Code guide

## Publishing workflow (owner's standing instruction)

Every change goes **straight to `main`** and is published by that push. Do not
open pull requests or leave work on a feature branch, even if the session was
started on one.

1. `git fetch origin main` and work on top of it (merge it in if the session
   branch is behind). Admin-mode saves and other sessions commit to `main`
   directly, so it often moves.
2. Make the change, then verify it before pushing:
   - `npx tsc -b` and `npm run build` must pass.
   - Look at the changed page in a browser (`npx vite`, then screenshot with
     Playwright using `executablePath: '/opt/pw-browsers/chromium'`). Project
     pages are behind a password gate; set
     `sessionStorage['project-unlocked'] = 'true'` in an init script to view
     them locally.
3. Commit and `git push origin HEAD:main`.
4. `.github/workflows/deploy.yml` builds and deploys to GitHub Pages on every
   push to `main` (about a minute). Check that the run went green and tell the
   owner the change is live at https://andrewrichards.design.

`dist/` is still tracked, but the deploy rebuilds it from source, so a
conflict in `dist/` is never meaningful: delete the old hashed bundles in
`dist/assets/` and rerun `npm run build`.

## Content

All case-study copy lives in `src/content/site-content.json` and is also edited
in the browser through admin mode, which commits that file to `main`. When
editing it by hand, change only the blocks you mean to and keep its two-space
formatting, so the diff stays small. An admin save from a stale browser draft
has dropped hand-added blocks before, so check that they are still there after
any merge.

## Arcatext stills

`src/components/RewordOptionScreen.tsx` and `ArcatextKeyboard.tsx` mirror the
iOS app in the `Adalithic-LLC/Arcatext` repo. Take labels, sizes and colors
from that repo's `main` (the Swift views, `Arcatext/Localizable.xcstrings` and
the asset catalog's colorsets) rather than from memory.
