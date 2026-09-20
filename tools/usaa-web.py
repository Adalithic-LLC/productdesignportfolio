"""Prepares the USAA member home page capture for the hero and its work card.

The capture is an edge-to-edge page (no device frame), so there is nothing to
cut out -- it is flattened onto white and written twice: once at its own size
for the hero tile, which rounds its corners in CSS like the admin tool beside
it, and once letterboxed into the 4:3 field the work cards use.

The card version is fitted by height to the same share the Conversant card
uses, which is a downscale from the source rather than an enlargement.
"""
from PIL import Image
import sys

SRC = 'tools/assets/usaa-member-home.png'
HERO = 'public/hero-tiles/usaa-web.webp'
CARD = 'public/project-memberhome.webp'

CANVAS = (1600, 1200)   # 4:3, matching the card's image area
BG = (255, 255, 255)
CONTENT_HEIGHT = 0.84   # as the Conversant card, whose panel is also a tall page


def main():
    src = Image.open(SRC)
    page = Image.new('RGB', src.size, BG)
    page.paste(src, mask=src.getchannel('A') if src.mode == 'RGBA' else None)
    page.save(HERO, 'WEBP', quality=92, method=6)

    height = round(CANVAS[1] * CONTENT_HEIGHT)
    if height > page.height:
        raise SystemExit(f'would enlarge the capture ({page.height}px -> {height}px)')
    size = (round(page.width * height / page.height), height)
    card = Image.new('RGB', CANVAS, BG)
    card.paste(page.resize(size, Image.LANCZOS),
               ((CANVAS[0] - size[0]) // 2, (CANVAS[1] - size[1]) // 2))
    card.save(CARD, 'WEBP', quality=92, method=6)

    print(f'page {page.width}x{page.height}  aspect {page.width / page.height:.3f}')
    print(f'card {size[0]}x{size[1]}  margins x {(CANVAS[0] - size[0]) // 2}  y {(CANVAS[1] - size[1]) // 2}')
    print(f'wrote {HERO} and {CARD}')


if __name__ == '__main__':
    sys.exit(main())
