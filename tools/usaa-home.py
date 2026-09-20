"""Cuts the left phone out of the two-up USAA capture, for the hero and the card.

The capture holds two devices side by side. They are separated by a band of
fully transparent columns, so the split is found from the alpha channel rather
than hardcoded -- a re-export at a different size still lands.

Nothing here upscales. The source is small (the left device is 395x787), so the
work-card version places it at its native size rather than filling the frame
the way the other cards do; stretching it to their content height would have
meant a 1.28x enlargement and a visibly soft phone.
"""
from PIL import Image
import sys

SRC = 'tools/assets/usaa-home-2up.png'
HERO = 'public/hero-tiles/usaa-home.webp'
CARD = 'public/project-usaa-home.webp'

CANVAS = (1600, 1200)   # 4:3, matching the card's image area
BG = (255, 255, 255)


def left_device(im):
    """The left device, cropped to its own bounds."""
    alpha = im.getchannel('A')
    width, height = im.size
    columns = [alpha.crop((x, 0, x + 1, height)).getextrema()[1] for x in range(width)]

    # Walk in from the left edge: past the first device, then across the empty
    # band, and stop where the second one starts.
    seen = False
    split = width
    for x, top in enumerate(columns):
        if top > 0:
            if seen and x > 0 and columns[x - 1] == 0:
                split = x
                break
            seen = True
        elif seen and all(v == 0 for v in columns[x:x + 8]):
            split = next((i for i in range(x, width) if columns[i] > 0), width)
            break

    left = im.crop((0, 0, split, height))
    return left.crop(left.getbbox())


def main():
    phone = left_device(Image.open(SRC).convert('RGBA'))
    phone.save(HERO, 'WEBP', quality=94, method=6, exact=True)

    card = Image.new('RGB', CANVAS, BG)
    card.paste(phone, ((CANVAS[0] - phone.width) // 2, (CANVAS[1] - phone.height) // 2), phone)
    card.save(CARD, 'WEBP', quality=92, method=6)

    print(f'phone {phone.width}x{phone.height}  aspect {phone.width / phone.height:.3f}')
    print(f'card margins  x {(CANVAS[0] - phone.width) // 2}  y {(CANVAS[1] - phone.height) // 2}')
    print(f'wrote {HERO} and {CARD}')


if __name__ == '__main__':
    sys.exit(main())
