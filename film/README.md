# Arcatext marketing film

A short, Apple-style product film rendered from the site's own drawn Arcatext
views. Every frame is a pure function of time (`src/timeline.ts` holds every
beat, shot and camera move), rendered headless and encoded with ffmpeg.

```
npx vite --config film/vite.config.ts          # dev server on :5199
#   http://localhost:5199/?play                 real-time preview
#   http://localhost:5199/?t=9.6                a still
node film/render.mjs --stills 3.5,9.6           # PNG stills -> film/out/stills
node film/render.mjs --workers 4                # film/out/frames.mp4 + cues.json
python3 film/soundtrack.py                      # film/out/soundtrack.wav (120 BPM bed + UI sounds)
ffmpeg -i film/out/frames.mp4 -i film/out/soundtrack.wav -c:v copy -c:a aac -b:a 256k \
  -shortest -movflags +faststart film/out/arcatext-film.mp4
```

`render.mjs` imports `playwright`; link the global install if it is missing:
`ln -s /opt/node22/lib/node_modules/playwright film/node_modules/playwright`.

The chat film (floating message bubbles, then the keyboard) is a second
composition in the same app: add `--film chat` to `render.mjs` and
`soundtrack.py`, or open `?film=chat`. Its script and timing are in
`src/chat/chatTimeline.ts`; outputs are `out/frames-chat.mp4` and
`out/soundtrack-chat.wav`.

Not part of the site build: `npm run build` only bundles the root index.html.
