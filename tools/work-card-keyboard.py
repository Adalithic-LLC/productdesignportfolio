"""Builds the Arcatext work-card image: the keyboard alone, on a 4:3 field.

The work cards render at `aspect-[4/3]` with `object-cover` and a hover zoom,
shared by all six. So the letterbox is baked into the asset rather than added
in CSS: the file is already 4:3, which makes `object-cover` a no-op and leaves
the other five cards untouched.

The crop is the keyboard panel only -- no message thread, no compose field.
The panel's top edge is found by colour rather than hardcoded, and its corner
radius is solved from three points on the curve, so a re-capture at a
different keyboard height still lands.

The margin is sized so the 1.1x hover zoom cannot reach the keyboard: it
crops into the white field instead.
"""
from PIL import Image, ImageDraw
import math
import sys

SRC = 'tools/assets/simulator_screenshot_3F6AE3AB-0434-4509-81B6-7F6E5BA0CC6D.png'
OUT = 'public/project-arcatext-keyboard.webp'

# The keyboard panel's own grey, and how far a pixel may stray from it.
PANEL = (226, 228, 232)
TOL = 6
CANVAS = (1600, 1200)          # 4:3, matching the card's image area

# How much of the card's height the keyboard fills. The margin follows from it
# rather than the other way round, so resizing the keyboard is one number and
# the centring takes care of itself. The hover zoom crops 60px off each edge,
# so the margin this leaves (225px) still keeps the zoom off the keys.
KEYBOARD_HEIGHT = 0.624
BG = (255, 255, 255)


def near(c, target, tol=TOL):
    return all(abs(a - b) <= tol for a, b in zip(c[:3], target))


def panel_top(px, width, height):
    """First row that is the panel's grey clear across its width.

    A single sampled pixel is not enough: the compose field's text caret is
    antialiased to within a few units of the panel grey, and matching it puts
    the crop a hundred rows too high, swallowing the compose field. The panel's
    first rows sit above the toolbar, so the whole row is grey -- require that,
    and require it to hold, so a lone matching row cannot win either.
    """
    columns = range(100, width - 100, 40)   # skip the corner curves
    def grey_row(y):
        return all(near(px[x, y], PANEL) for x in columns)
    for y in range(height // 2, height - 8):
        if grey_row(y) and all(grey_row(y + d) for d in range(1, 8)):
            return y
    raise SystemExit('keyboard panel not found -- has the capture changed?')


def corner_radius(px, top, height):
    """Solve the panel's top-corner radius from the curve's own pixels.

    For a circle of radius r tangent to the panel's top and left edges, the
    first panel row at column x sits at top + r - sqrt(r^2 - (r - x)^2). Each
    sampled column gives an independent estimate; the median resists a stray
    antialiased pixel.
    """
    estimates = []
    for x in (8, 12, 16, 20, 24):
        drop = next(
            (y - top for y in range(top, min(top + 200, height)) if near(px[x, y], PANEL)),
            None,
        )
        if drop is None or drop == 0:
            continue
        # drop = r - sqrt(2rx - x^2) rearranges to a quadratic in r whose
        # larger root is the curve we are on; the smaller one is the circle
        # that would reach the same drop while curving the other way.
        estimates.append(drop + x + math.sqrt(2 * drop * x))
    if not estimates:
        raise SystemExit('could not read the panel corner radius')
    estimates.sort()
    return estimates[len(estimates) // 2]


def main():
    im = Image.open(SRC).convert('RGB')
    px = im.load()
    top = panel_top(px, im.width, im.height)
    radius = corner_radius(px, top, im.height)

    keyboard = im.crop((0, top, im.width, im.height))
    scale = CANVAS[1] * KEYBOARD_HEIGHT / keyboard.height
    size = (round(keyboard.width * scale), round(keyboard.height * scale))
    keyboard = keyboard.resize(size, Image.LANCZOS)

    # Round every corner, not just the two the capture curves: against a white
    # field, square bottom corners under a rounded top read as a mistake.
    r = max(1, round(radius * scale))
    mask = Image.new('L', size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, size[0] - 1, size[1] - 1), radius=r, fill=255)

    card = Image.new('RGB', CANVAS, BG)
    card.paste(keyboard, ((CANVAS[0] - size[0]) // 2, (CANVAS[1] - size[1]) // 2), mask)
    card.save(OUT, 'WEBP', quality=92, method=6)

    print(f'panel top {top}  corner r {radius:.1f}px  keyboard {size[0]}x{size[1]}')
    print(f'margins  x {(CANVAS[0] - size[0]) // 2}  y {(CANVAS[1] - size[1]) // 2}')
    print(f'wrote {OUT}  {CANVAS[0]}x{CANVAS[1]}')


if __name__ == '__main__':
    sys.exit(main())
