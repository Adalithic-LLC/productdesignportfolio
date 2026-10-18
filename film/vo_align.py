"""Splits one voiced take of the whole script into per-line clips by its words,
not its pauses: out/vo/<voice>/<key>.wav for voiceover.py.

    python3 film/vo_align.py --film learn --portrait --voice G-Charon <take.wav or URL>

For takes whose pauses can't be trusted (Gemini TTS reads the whole script in
one request and its pauses vary: a long comma can outlast a line break).
Whisper (OpenAI API, word timestamps) places every spoken word; the script's
words are aligned to them, and each line is cut in the quietest stretch
between its last word and the next line's first.
A line whose words Whisper left out takes the longest pauses between the
nearest words it did hear. Needs api.openai.com access
(OPENAI_API_KEY, or a proxy that injects it).
"""
import difflib
import json
import re
import subprocess
import sys
import tempfile
import urllib.request
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).parent))
import voiceover as vo  # noqa: E402

args = sys.argv[1:]
opt = lambda k, d=None: args[args.index(k) + 1] if k in args else d
voice = opt('--voice')
src = args[-1]
if not voice or src.startswith('--') or src == opt('--keys'):
    sys.exit(__doc__)
vo.SUFFIX = ('' if opt('--film', 'learn') == 'main' else f"-{opt('--film', 'learn')}") + (f"-{opt('--cut')}" if opt('--cut') else '') + ('-portrait' if '--portrait' in args else '')
lines = vo.cues()['voice']
if opt('--keys'):  # a take of just these lines, in order
    want = opt('--keys').split(',')
    lines = [l for k in want for l in lines if l['key'] == k]
norm = lambda w: re.sub(r"[^a-z0-9]", '', w.lower().replace('’', "'"))


def whisper_words(path):
    """[(word, start, end)] from the OpenAI transcription API."""
    out = subprocess.run(
        ['curl', '-sS', 'https://api.openai.com/v1/audio/transcriptions',
         '-F', 'model=whisper-1', '-F', 'response_format=verbose_json',
         '-F', 'timestamp_granularities[]=word', '-F', f'file=@{path}'],
        capture_output=True, text=True, check=True).stdout
    data = json.loads(out)
    if 'words' not in data:
        sys.exit(f'Transcription failed: {out[:300]}')
    return [(w['word'], w['start'], w['end']) for w in data['words']]


with tempfile.TemporaryDirectory() as d:
    path = src
    if src.startswith('http'):
        path = str(Path(d) / ('take' + Path(src).suffix))
        urllib.request.urlretrieve(src, path)
    x = vo.read_wav(path)
    heard = whisper_words(path)

# Script tokens, each tagged with its line.
script, owner = [], []
for k, line in enumerate(lines):
    for w in line['text'].split():
        if norm(w):
            script.append(norm(w))
            owner.append(k)
said = [norm(w) for w, _, _ in heard]
match = {}
for a, b, n in difflib.SequenceMatcher(None, script, said, autojunk=False).get_matching_blocks():
    for i in range(n):
        match[a + i] = b + i
win = int(0.01 * vo.SR)
n = len(x) // win
rms = np.sqrt((x[: n * win].reshape(n, win) ** 2).mean(1))
quiet = rms < rms.max() * 10 ** (-40 / 20)
runs, i = [], 0  # pauses: (start, end) in 10 ms windows, at least 80 ms long
while i < n:
    if quiet[i]:
        j = i
        while j < n and quiet[j]:
            j += 1
        if i > 0 and j < n and j - i >= 8:
            runs.append((i, j))
        i = j
    else:
        i += 1
# Speech chunks between the pauses; each heard word votes its line onto the
# chunk it falls in (or the nearest, since Whisper's word edges are loose).
edges = [0] + [e for r in runs for e in r] + [n]
chunks = list(zip(edges[::2], edges[1::2]))
lines_in = [set() for _ in chunks]
for i, k in enumerate(owner):
    if i in match:
        _, t0, t1 = heard[match[i]]
        mid = (t0 + t1) / 2 * 100
        c = min(range(len(chunks)), key=lambda c: 0 if chunks[c][0] <= mid <= chunks[c][1] else min(abs(mid - chunks[c][0]), abs(mid - chunks[c][1])))
        lines_in[c].add(k)
# The cut between line b and b+1 is a pause after every chunk holding lines
# <= b and before every chunk holding lines > b. A line Whisper heard none of
# ("Mandarin.") shares its neighbours' range, and those cuts take its longest
# pauses.
bounds, b = [0], 0
while b < len(lines) - 1:
    after = max([c for c, ks in enumerate(lines_in) if any(k <= b for k in ks)], default=-1)
    before = min([c for c, ks in enumerate(lines_in) if any(k > b for k in ks)], default=len(chunks))
    g = b
    while g + 1 < len(lines) - 1 and not any(k == g + 1 for ks in lines_in for k in ks):
        g += 1
    m = g - b + 1
    # Pause p sits between chunk p and p+1.
    cand = [(runs[p][1] - runs[p][0], p) for p in range(after, before) if 0 <= p < len(runs)]
    if len(cand) < m:
        sys.exit(f"No pause to cut after {lines[b]['key']!r} (it runs into the next line). Nothing written.")
    for _, p in sorted(sorted(cand, reverse=True)[:m], key=lambda c: c[1]):
        bounds.append(((runs[p][0] + runs[p][1]) // 2) * win)
    b = g + 1
bounds.append(len(x))

dest = vo.OUT / 'vo' / voice
dest.mkdir(parents=True, exist_ok=True)
for k, line in enumerate(lines):
    seg = x[bounds[k]: bounds[k + 1]]
    vo.write_wav(dest / f"{line['key']}.wav", seg)
    t, _, _ = vo.trim(seg)
    print(f"{line['key']:<14} {len(t) / vo.SR:5.2f}s spoken / {line['until'] - line['at'] - 0.08:5.2f}s window  {line['text']}")
print('wrote', dest)
