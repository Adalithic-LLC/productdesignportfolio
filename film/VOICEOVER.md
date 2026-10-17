# Voiceover (learn film, Cut Room)

The learn film can carry an optional voiceover that reads its on-screen text,
each line starting the moment its text appears. Cut Room shows a **Voice**
picker for any version whose doc has a `voices` list.

## Pieces

- `src/learn/learnTimeline.ts` → `VOICE_LINES`: the script, built from the
  film's own copy and timing constants. Each line has `at` (its text appears),
  `until` (it must be done), and `marks` (when each chunk is revealed). It is
  written into the cue sheet as `voice`.
- `node film/render.mjs --film learn --portrait --cues-only` writes
  `out/cues-learn-portrait.json` without rendering frames.
- `python3 film/tts_chirp.py voices` lists the Chirp 3 HD voices;
  `python3 film/tts_chirp.py synth --film learn --portrait --voice Kore`
  writes one clip per line to `out/vo/Kore/<key>.wav`, re-synthesizing a line
  faster when it overruns its window. It needs Google Cloud Text-to-Speech
  access: `GOOGLE_API_KEY`, `GOOGLE_TTS_TOKEN`, `gcloud` auth, or a proxy that
  injects credentials. With a Text-to-Speech MCP connector instead, call its
  synthesize tool with each line's `text` and the voice, and save the audio
  under the same names.
- `python3 film/voiceover.py mix --film learn --portrait --voice Kore` lays the
  clips on the film's clock (trimmed so speech starts on `at`, fitted inside
  `until`), and mixes them over every soundtrack wav present, with the music
  ducked about 7 dB under the voice:
  `out/soundtrack-learn-portrait[-mellow|-bright]-vo-Kore.mp4`, plus
  `out/vo-learn-portrait-Kore.report.json` (each line's fit and any overrun).
  A `<key>.words.json` beside a clip (word start/end times) makes the mix warp
  each chunk to land as it is revealed.

The soundtrack wavs must be current (rendered with the cut), so run the usual
`soundtrack.py` for pop, mellow and bright first. The 9:16 and 16:9 cuts share
timing, so one set of mixes serves both.

## Cut Room

Upload the three mixes as assets and add to the version doc (both aspects):

```json
"voices": [
  { "id": "kore", "label": "Kore", "tracks": { "cut": "<pop mix id>", "mellow": "<mellow mix id>", "bright": "<bright mix id>" } }
]
```

`tracks` is keyed by the music option (`cut` = Original). Picking a voice plays
its mix with the picked music; Download copies the cut's video and swaps in
that mix (or bakes it into a background export). The viewer's last pick is
saved to `picks/voice`.
