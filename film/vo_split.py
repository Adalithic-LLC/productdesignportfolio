"""Splits one voiced take of the whole script (all lines in order, with long
pauses between them, as the Chirp connector's synthesize_dialogue returns it)
into per-line clips for voiceover.py: out/vo/<voice>/<key>.wav.

    python3 film/vo_split.py --film learn --portrait --voice Kore <take.mp3 or URL>
    ... --keys lang-2,lang-3 <take>   # a re-take of just those lines, in order

Lines are separated at the longest silences (>= 0.7 s); the take must hold
exactly one speech run per script line, or nothing is written.
"""
import json
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
vo.SUFFIX = ('' if opt('--film', 'learn') == 'main' else f"-{opt('--film', 'learn')}") + ('-portrait' if '--portrait' in args else '')
lines = vo.cues()['voice']
if opt('--keys'):
    want = opt('--keys').split(',')
    lines = [l for k in want for l in lines if l['key'] == k]
with tempfile.TemporaryDirectory() as d:
    path = src
    if src.startswith('http'):
        path = str(Path(d) / 'take.mp3')
        urllib.request.urlretrieve(src, path)
    x = vo.read_wav(path)
win = int(0.01 * vo.SR)
n = len(x) // win
rms = np.sqrt((x[: n * win].reshape(n, win) ** 2).mean(1))
on = rms > 10 ** (-45 / 20)
# Runs of silence between speech, longest first; the N-1 longest split N lines.
gaps, i = [], 0
while i < n:
    if not on[i]:
        j = i
        while j < n and not on[j]:
            j += 1
        if i > 0 and j < n:
            gaps.append((j - i, i, j))
        i = j
    else:
        i += 1
gaps.sort(reverse=True)
cuts = sorted(gaps[: len(lines) - 1], key=lambda g: g[1])
if len(cuts) != len(lines) - 1 or (cuts and cuts[-1][0] * 0.01 < 0.7):
    sys.exit(f'Expected {len(lines)} lines separated by long pauses; found {len(cuts) + 1} usable runs. Nothing written.')
bounds = [0] + [((a + b) // 2) * win for _, a, b in cuts] + [len(x)]
dest = vo.OUT / 'vo' / voice
dest.mkdir(parents=True, exist_ok=True)
for k, line in enumerate(lines):
    seg = x[bounds[k]: bounds[k + 1]]
    vo.write_wav(dest / f"{line['key']}.wav", seg)
    t, _, _ = vo.trim(seg)
    print(f"{line['key']:<14} {len(t) / vo.SR:5.2f}s spoken / {line['until'] - line['at'] - 0.08:5.2f}s window  {line['text']}")
print('wrote', dest, f'(shortest split pause {cuts[-1][0] * 0.01 if cuts else 0:.2f}s)' if cuts else '')
