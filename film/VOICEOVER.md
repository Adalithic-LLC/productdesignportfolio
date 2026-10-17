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
  ducked about 9 dB under the voice (and `-none`, the voice over the UI sounds alone):
  `out/soundtrack-learn-portrait[-mellow|-bright|-none]-vo-Kore.mp4`, plus
  `out/vo-learn-portrait-Kore.report.json` (each line's fit and any overrun).
  A `<key>.words.json` beside a clip (word start/end times) makes the mix warp
  each chunk to land as it is revealed.

### With the Chirp TTS connector (how the current voices were made)

The connector's `synthesize_dialogue` voices every line in one call. Send the
script's lines in order, one voice, `pause_ms: 1600`, then split the take at
those pauses into per-line clips:

    python3 film/vo_split.py --film learn --portrait --voice Kore <mp3 URL>

A line that comes out too long for its window (the mix report says
`RESYNTHESIZE FASTER`, or a fit above about 1.2x) is better re-voiced than
stretched: for the reel's single words, drop the trailing comma ("Spanish."
reads shorter than "Spanish,") and use `speaking_rate` 1.1-1.3, then
`vo_split.py ... --keys lang-2,lang-3 <mp3 URL>` replaces just those clips.

### With Gemini TTS (the "Gemini 3.1 Flash" voices)

The connector speaks Gemini voices by bare name (`Charon`) through the Gemini
API (its `GEMINI_API_KEY`; the project's free tier allows only 10 requests a
minute, so voice the whole script in ONE `synthesize` call per voice, not a
dialogue of 11). Lead the text with a shared style direction in double
brackets and put `<long pause>` between the lines:

    [[Warm, relaxed, confident narrator ... leave a long pause after every line.]] How can texting become self-guided language learning?
    <long pause>
    By turning your chats in WhatsApp,
    ...

Gemini's pauses vary (a slow list's commas can outlast a line break), so
split the take by its words rather than its pauses:

    python3 film/vo_align.py --film learn --portrait --voice G-Charon <wav URL>

It transcribes the take with Whisper (word timestamps), assigns each speech
run between pauses to the script line its words belong to, and cuts in the
pauses between lines. A line that still runs long (the "Type, make
mistakes..." list) is re-voiced alone with a prompt like "one smooth,
flowing phrase, no pauses between the items" and dropped in with
`vo_split.py ... --keys end <wav URL>`. Gemini voices are stems only
(`"stemOnly": true`, `"group": "Gemini 3.1 Flash"` in `voices`; the stem at
`stems/v25/voice-g-<name>.mp4`), so Cut Room offers them where its mixer runs.

The soundtrack wavs must be current (rendered with the cut), so run the usual
`soundtrack.py` for pop, mellow and bright first, plus `--sfx-only` (the UI
sounds alone, at their in-mix level) for the music-muted mixes. The 9:16 and 16:9 cuts share
timing, so one set of mixes serves both.

## Cut Room

The artifact's asset store is full (1 GB), so voice mixes are published as
files of the Cut Room page instead: `vo/<version>/<voice>-<cut|mellow|bright|none>.mp4`
and `vo/<version>/sfx.mp4`, via the Artifact tool's `files` (at most 64 MB per
publish, so 121 mixes go up in two halves). A page version holds at most 256 MB
and 511 files in all, so before adding a new set, drop the oldest `vo/<version>/`
folder (map its paths to null) and remove `voices` from the docs that used it.
Cut Room treats any media ref containing `/` or `.` as such a path and anything
else as an asset id. Then add to the version doc (both aspects):

```json
"voices": [
  { "id": "kore", "label": "Kore · F", "tracks": { "cut": "vo/v25/kore-cut.mp4", "mellow": "vo/v25/kore-mellow.mp4", "bright": "vo/v25/kore-bright.mp4", "none": "vo/v25/kore-none.mp4" } }
],
"sfxAssetId": "vo/v25/sfx.mp4"
```

`tracks` is keyed by the music option (`cut` = Original, `none` = music
muted). In Cut Room the speaker button mutes the music and the mic button
turns the voice on; both apply to the preview and to Download, which copies
the cut's video and swaps in the matching track (or bakes it into a
background export). With music muted and no voice, `sfxAssetId` (the UI
sounds alone) is used. The viewer's last voice pick is saved to `picks/voice`.

## Stems and volumes (v25 on)

A version with `stems` is mixed in Cut Room itself, at the viewer's Music and
Voice volumes (the sliders button by the voice picker), with the music ducked
under the voice exactly as the pre-mixes do; the mix plays through the normal
audio element and Download encodes the same mix. Stems are page files too:

```json
"stems": {
  "music": { "cut": "stems/v25/music-cut.mp4", "mellow": "…", "bright": "…", "beats-house": "…" },
  "sfx": "vo/v25/sfx.mp4",
  "voices": { "leda": "stems/v25/voice-leda.mp4" }
}
```

Make them with `soundtrack.py --music-only` per style (the bed alone, at its
in-mix level; music + `--sfx-only` sums back to the full mix within -50 dB)
and the placed voice wav `out/vo-<film>-<voice>.wav` from `voiceover.py mix`,
each encoded to AAC. Music options that exist only as stems (the
percussion-only `beats-*` styles) are listed in `soundtracks` with
`"stemOnly": true`.
