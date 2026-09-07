#!/usr/bin/env python3
"""Turn an iOS simulator capture into a hero deck card.

    python3 tools/hero-card.py <capture.png> <name>
        -> public/hero-tiles/<name>.webp

The simulator bakes the Dynamic Island into the screenshot as a solid black
pill. It is found rather than assumed: within the status bar it is the only run
of near-black wider than MIN_RUN, which is what separates it from the clock and
the battery. Each of its rows is then repainted with the colour immediately
beside it, so a status bar on a tinted background stays right.

The screen is written out square -- the card supplies the phone's corner radius
in CSS, so nothing is rounded here.
"""
import sys
from PIL import Image

WIDTH = 640        # ~2.7x the width the card draws at
QUALITY = 88
STATUS_BAR = 220   # rows to search for the island
MIN_RUN = 150      # px; longer than the clock or the battery, shorter than the island
PAD = 5            # cover the island's anti-aliased edge
BLACK = 110        # sum(rgb) below this counts as the island

def strip_island(im):
    w, h = im.size
    px = im.load()
    rows = []
    for y in range(min(STATUS_BAR, h)):
        best = bs = run = start = 0
        for x in range(w):
            if sum(px[x, y]) < BLACK:
                if run == 0:
                    start = x
                run += 1
                if run > best:
                    best, bs = run, start
            else:
                run = 0
        if best >= MIN_RUN:
            rows.append((y, bs, bs + best - 1))
    if not rows:
        return None
    y0, y1 = rows[0][0], rows[-1][0]
    x0 = min(r[1] for r in rows)
    x1 = max(r[2] for r in rows)
    for y in range(max(y0 - PAD, 0), min(y1 + PAD + 1, h)):
        fill = px[max(x0 - 15, 0), y]
        for x in range(max(x0 - PAD, 0), min(x1 + PAD + 1, w)):
            px[x, y] = fill
    return x0, x1, y0, y1

def main(src, name):
    im = Image.open(src).convert('RGB')
    box = strip_island(im)
    print('island', box if box else 'not found -- leaving the capture as it is')
    im = im.resize((WIDTH, round(im.height * WIDTH / im.width)), Image.LANCZOS)
    out = f'public/hero-tiles/{name}.webp'
    im.save(out, quality=QUALITY, method=6)
    print(f'wrote {out} {im.size}')

if __name__ == '__main__':
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2])
