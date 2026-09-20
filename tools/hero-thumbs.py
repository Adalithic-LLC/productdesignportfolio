"""Builds the hero's mini previews -- one per project cluster.

Each thumbnail mirrors what the main display shows for that cluster: the same
screens, in the same order, side by side. They are drawn here rather than by
scaling the live components, because two of those are not images at all (the
card deck animates, the analysis tool is an iframe) and neither shrinks to
thumbnail size usefully.

Every cluster is fitted to the same box by height first, then squeezed if the
row is too wide, so four very differently shaped groups all sit at one size.
"""
from PIL import Image
import sys

TILES = 'public/hero-tiles/'
OUT = 'public/hero-thumbs/'

# 1.467, the proportion of the preview in the layout it was designed against.
CANVAS = (640, 436)
BG = (242, 245, 251)
CONTENT_HEIGHT = 0.80    # of the canvas
CONTENT_WIDTH = 0.88     # the row is squeezed to this if height alone overflows
GAP = 0.05               # of the canvas width

CLUSTERS = {
    # The toolbar still beside one of the states it opens, which is how the
    # zone shows this cluster.
    'arcatext': ['arcatext-keyboard.webp', 'arcatext-reword.webp'],
    'arcatext-analysis': ['arcatext-tuning.webp'],
    'd2c': ['d2c.webp'],
    'conversant': ['d2c-products.webp', 'conversant-phone.webp'],
    'usaa': ['usaa-web.webp', 'usaa-home.webp'],
}


def main():
    import os
    os.makedirs(OUT, exist_ok=True)

    for name, files in CLUSTERS.items():
        items = [Image.open(TILES + f).convert('RGBA') for f in files]
        gap = round(CANVAS[0] * GAP)

        # Height first, then squeeze the whole row if that makes it too wide,
        # so the tall phones and the wide dashboards end up at one visual size.
        height = CANVAS[1] * CONTENT_HEIGHT
        widths = [height * im.width / im.height for im in items]
        total = sum(widths) + gap * (len(items) - 1)
        limit = CANVAS[0] * CONTENT_WIDTH
        if total > limit:
            squeeze = (limit - gap * (len(items) - 1)) / sum(widths)
            height *= squeeze
            widths = [w * squeeze for w in widths]
            total = limit

        card = Image.new('RGB', CANVAS, BG)
        x = round((CANVAS[0] - total) / 2)
        for im, w in zip(items, widths):
            size = (max(1, round(w)), max(1, round(height)))
            scaled = im.resize(size, Image.LANCZOS)
            card.paste(scaled, (x, round((CANVAS[1] - size[1]) / 2)), scaled)
            x += size[0] + gap

        path = f'{OUT}{name}.webp'
        card.save(path, 'WEBP', quality=90, method=6)
        print(f'{name:11} {len(items)} screen(s)  row {round(total)}x{round(height)}  -> {path}')


if __name__ == '__main__':
    sys.exit(main())
