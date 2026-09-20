"""Builds the Design 2 Code work-card image: the plugin window on white.

Same contract as the other two work cards (see work-card-keyboard.py): the
cards render at `aspect-[4/3]` with `object-cover` and a hover zoom, so the
letterbox is baked into the asset and the file is already 4:3.

The capture ships flattened onto a grey matte rather than transparency, so the
window is cut out of it by bounding box and its corners re-rounded -- pasted as
shipped, the matte would show as grey wedges at each corner of the white field.

Sizing matches the Arcatext card by AREA, not by height or width. The keyboard
there is wide and this window is nearly square, so matching either edge would
have made one card visibly heavier than the other; equal area is what reads as
"about the same size" for two different shapes.
"""
from PIL import Image, ImageChops, ImageDraw
import math
import sys

SRC = 'tools/assets/D2C.png'
OUT = 'public/project-d2c-window.webp'

CANVAS = (1600, 1200)          # 4:3, matching the card's image area
BG = (255, 255, 255)
MATTE = (160, 160, 160)        # what the capture was flattened onto
MATTE_TOL = 12

# The Arcatext card's keyboard, whose area this one matches.
REFERENCE = (816, 749)


def window_box(im):
    """The window's bounds inside the grey matte the capture was flattened on."""
    matte = Image.new('RGB', im.size, MATTE)
    mask = ImageChops.difference(im, matte).convert('L')
    box = mask.point(lambda v: 255 if v > MATTE_TOL else 0).getbbox()
    if not box:
        raise SystemExit('no window found -- has the capture changed?')
    return box


def corner_radius(im, rows=(10, 15, 25, 40)):
    """Solve the window's corner radius from its own top-left curve.

    At row y the window's first dark pixel sits at x = r - sqrt(2ry - y^2),
    which rearranges to a quadratic in r whose larger root is the curve. The
    median of several rows resists a stray antialiased pixel.
    """
    px = im.load()
    estimates = []
    for y in rows:
        x = next((x for x in range(im.width) if sum(px[x, y]) < 300), None)
        if x is None or x == 0:
            continue
        estimates.append(x + y + math.sqrt(2 * x * y))
    if not estimates:
        raise SystemExit('could not read the window corner radius')
    estimates.sort()
    return estimates[len(estimates) // 2]


def main():
    im = Image.open(SRC).convert('RGB')
    window = im.crop(window_box(im))
    radius = corner_radius(window)

    aspect = window.width / window.height
    area = REFERENCE[0] * REFERENCE[1]
    size = (round(math.sqrt(area * aspect)), round(math.sqrt(area / aspect)))
    scale = size[0] / window.width

    window = window.resize(size, Image.LANCZOS)
    mask = Image.new('L', size, 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        (0, 0, size[0] - 1, size[1] - 1), radius=max(1, round(radius * scale)), fill=255
    )

    card = Image.new('RGB', CANVAS, BG)
    card.paste(window, ((CANVAS[0] - size[0]) // 2, (CANVAS[1] - size[1]) // 2), mask)
    card.save(OUT, 'WEBP', quality=92, method=6)

    print(f'window {window.width}x{window.height}  corner r {radius:.1f}px source'
          f' -> {round(radius * scale)}px')
    print(f'area {size[0] * size[1]} against the keyboard\'s {area}')
    print(f'margins  x {(CANVAS[0] - size[0]) // 2}  y {(CANVAS[1] - size[1]) // 2}')
    print(f'wrote {OUT}  {CANVAS[0]}x{CANVAS[1]}')


if __name__ == '__main__':
    sys.exit(main())
