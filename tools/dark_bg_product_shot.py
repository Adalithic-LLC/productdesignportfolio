"""Dark-theme twin of a flat product shot: the white field around the screens
becomes transparent, so the work card's own dark background shows through,
while the screens keep their light appearance.

Two ways to find the screens:

  (default)  flood  the near-white region connected to the image's border is
                    the field. Right for screens with their own edge (a phone
                    bezel, a bordered window).
  --boxes    boxes  each screen is the padded, rounded bounding box of a
                    cluster of its content. Right for borderless panels whose
                    white runs straight into the white field, which a flood
                    would eat into.

usage: python3 tools/dark_bg_product_shot.py SRC DST [--boxes] [--pad 14] [--radius 10] [--merge 36]

The work cards use: project-usaa-home (default), project-conversant-screens
(--boxes --merge 24), project-memberhome (--boxes --merge 80).
"""
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

args = sys.argv[1:]
src, dst = args[0], args[1]
opt = lambda k, d: int(args[args.index(k) + 1]) if k in args else d
boxes = '--boxes' in args
im = Image.open(src).convert('RGB')
img = np.asarray(im)
H, W, _ = img.shape
content = img.min(2) < 250

if not boxes:
    m = Image.fromarray((~content).astype(np.uint8) * 255).copy()
    for x in range(0, W, 40):
        for y in (0, H - 1):
            if m.getpixel((x, y)) == 255:
                ImageDraw.floodfill(m, (x, y), 128)
    for y in range(0, H, 40):
        for x in (0, W - 1):
            if m.getpixel((x, y)) == 255:
                ImageDraw.floodfill(m, (x, y), 128)
    keep = (np.asarray(m) != 128)
    alpha = np.asarray(Image.fromarray(keep.astype(np.uint8) * 255).filter(ImageFilter.GaussianBlur(0.8)))
else:
    pad, radius, merge = opt('--pad', 14), opt('--radius', 10), opt('--merge', 36)
    # Cluster the content at quarter scale: grow it by `merge` so the pieces of
    # one panel (header, rows, buttons) join, then label the clusters.
    q = 4
    small = Image.fromarray(content.astype(np.uint8) * 255).resize((W // q, H // q), Image.BOX)
    small = small.point(lambda v: 255 if v > 0 else 0).filter(ImageFilter.MaxFilter(2 * (merge // q) + 1))
    lab = small.copy()
    a = np.asarray(lab).copy()
    rects = []
    h, w = a.shape
    seen = np.zeros_like(a, dtype=bool)
    for y in range(h):
        for x in range(w):
            if a[y, x] == 255 and not seen[y, x]:
                # Flood this cluster (iterative, 4-connected).
                stack = [(y, x)]; seen[y, x] = True
                y0 = y1 = y; x0 = x1 = x; n = 0
                while stack:
                    cy, cx = stack.pop(); n += 1
                    y0, y1, x0, x1 = min(y0, cy), max(y1, cy), min(x0, cx), max(x1, cx)
                    for ny, nx in ((cy + 1, cx), (cy - 1, cx), (cy, cx + 1), (cy, cx - 1)):
                        if 0 <= ny < h and 0 <= nx < w and a[ny, nx] == 255 and not seen[ny, nx]:
                            seen[ny, nx] = True; stack.append((ny, nx))
                if n > 40:
                    rects.append((x0, y0, x1, y1))
    # Back to full scale: the cluster less the growth, the content's true extent, then the padding.
    mask = Image.new('L', (W, H), 0)
    d = ImageDraw.Draw(mask)
    g = merge
    for x0, y0, x1, y1 in rects:
        X0, Y0, X1, Y1 = x0 * q + g, y0 * q + g, (x1 + 1) * q - g, (y1 + 1) * q - g
        sub = content[max(0, Y0 - q):min(H, Y1 + q), max(0, X0 - q):min(W, X1 + q)]
        ys, xs = np.nonzero(sub)
        if len(xs):
            X0, X1 = max(0, X0 - q) + xs.min(), max(0, X0 - q) + xs.max()
            Y0, Y1 = max(0, Y0 - q) + ys.min(), max(0, Y0 - q) + ys.max()
        d.rounded_rectangle([max(0, X0 - pad), max(0, Y0 - pad), min(W - 1, X1 + pad), min(H - 1, Y1 + pad)], radius=radius, fill=255)
        print(f'  screen {X1 - X0 + 1}x{Y1 - Y0 + 1} at {X0},{Y0}')
    alpha = np.asarray(mask.filter(ImageFilter.GaussianBlur(0.6)))

out = np.dstack([img, alpha]).astype(np.uint8)
Image.fromarray(out, 'RGBA').save(dst, 'WEBP', quality=88, method=6)
print(dst, f'{(alpha < 128).mean():.0%} of the image is field')
