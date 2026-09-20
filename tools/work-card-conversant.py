"""Builds the Conversant work-card image: the products panel beside the phone.

Same contract as the Arcatext card (see work-card-keyboard.py): the work cards
render at `aspect-[4/3]` with `object-cover` and a hover zoom, shared by all
six, so the letterbox is baked into the asset rather than added in CSS. The
file is already 4:3, which makes `object-cover` a no-op.

The two screens are drawn at ONE shared scale, which is the point of the
composition: the panel and the phone are different sizes in the product, and
rendering each to fit its own slot would have left them with different type
sizes sitting side by side. The same rule governs the pair in the hero.

See CONTENT_HEIGHT for why this card is filled more than the Arcatext one
rather than matched to it.
"""
from PIL import Image, ImageDraw
import math
import sys

PANEL = 'tools/assets/Products Panel v3.png'
PHONE = 'tools/assets/Phone.png'
OUT = 'public/project-conversant-screens.webp'

CANVAS = (1600, 1200)          # 4:3, matching the card's image area
BG = (255, 255, 255)

# The share of the card's height the taller screen fills.
#
# This does NOT match the Arcatext card's 0.624, and deliberately so. That card
# carries a keyboard, which reads as a shape at any size; these are dense text
# panels, and matching the other card's vertical margin left the products panel
# at 118 CSS pixels on a 598px card -- about a third of native, where the type
# is noise rather than detail. The panel is 1484x3532, so it cannot be both
# whole and readable in a 4:3 frame; this is as large as it goes while staying
# whole. The 96px margin it leaves still clears the 60px the 1.1x hover zoom
# crops.
CONTENT_HEIGHT = 0.84

# The gap between the two screens, as a share of the group's height.
GAP = 0.06


def corner_radius(alpha, rows=(5, 10, 20, 40)):
    """Solve a rounded corner's radius from its own alpha, at the top left.

    At row y the first opaque pixel sits at x = r - sqrt(2ry - y^2), which
    rearranges to a quadratic in r whose larger root is the curve we are on.
    Several rows are sampled and the median taken, so one antialiased pixel
    cannot throw it.
    """
    px = alpha.load()
    w, h = alpha.size
    estimates = []
    for y in rows:
        if y >= h:
            continue
        x = next((x for x in range(w) if px[x, y] > 128), None)
        if x is None or x == 0:
            continue
        estimates.append(x + y + math.sqrt(2 * x * y))
    if not estimates:
        raise SystemExit('could not read a corner radius')
    estimates.sort()
    return estimates[len(estimates) // 2]


def rounded(im, radius):
    """The image on white, with its corners rounded to `radius`."""
    flat = Image.new('RGB', im.size, BG)
    flat.paste(im, mask=im.getchannel('A') if im.mode == 'RGBA' else None)
    mask = Image.new('L', im.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        (0, 0, im.size[0] - 1, im.size[1] - 1), radius=round(radius), fill=255
    )
    out = Image.new('RGB', im.size, BG)
    out.paste(flat, (0, 0), mask)
    return out, mask


def main():
    panel = Image.open(PANEL).convert('RGBA')
    phone = Image.open(PHONE).convert('RGBA')

    # The phone already carries a rounded corner; the panel is a hard
    # rectangle. Reading the phone's radius and giving the panel the same one
    # in SOURCE pixels means they match on the card, since both are drawn at
    # the same scale.
    radius = corner_radius(phone.getchannel('A'))

    panel_flat, panel_mask = rounded(panel, radius)
    phone_flat, phone_mask = rounded(phone, radius)

    scale = CANVAS[1] * CONTENT_HEIGHT / panel.height
    def sized(im, mask):
        size = (round(im.width * scale), round(im.height * scale))
        return im.resize(size, Image.LANCZOS), mask.resize(size, Image.LANCZOS)

    panel_flat, panel_mask = sized(panel_flat, panel_mask)
    phone_flat, phone_mask = sized(phone_flat, phone_mask)

    gap = round(panel_flat.height * GAP)
    group_w = panel_flat.width + gap + phone_flat.width
    left = (CANVAS[0] - group_w) // 2

    card = Image.new('RGB', CANVAS, BG)
    # Centred against each other rather than aligned on an edge: the phone is
    # less than half the panel's height, and hanging it off the top or bottom
    # reads as a mistake rather than a composition.
    card.paste(panel_flat, (left, (CANVAS[1] - panel_flat.height) // 2), panel_mask)
    card.paste(
        phone_flat,
        (left + panel_flat.width + gap, (CANVAS[1] - phone_flat.height) // 2),
        phone_mask,
    )
    card.save(OUT, 'WEBP', quality=92, method=6)

    print(f'corner r {radius:.1f}px (source)  scale {scale:.4f}')
    print(f'panel {panel_flat.width}x{panel_flat.height}  phone {phone_flat.width}x{phone_flat.height}  gap {gap}')
    print(f'group {group_w}x{panel_flat.height}  margins x {left}  y {(CANVAS[1] - panel_flat.height) // 2}')
    print(f'wrote {OUT}  {CANVAS[0]}x{CANVAS[1]}')


if __name__ == '__main__':
    sys.exit(main())
