"""Dark variant of the keyboard product shot: the keyboard recolored with the
keyboard anchors, the white page around it made transparent so the card's own
background shows through.
usage: python3 tools/darken_product_shot.py public/project-arcatext-keyboard.webp public/project-arcatext-keyboard-dark.webp"""
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import darken_capture as d

src, dst = sys.argv[1:3]
im = Image.open(src).convert('RGB')
img = np.asarray(im, dtype=np.float32)
H, W, _ = img.shape

# Outside = near-white connected to the border.
white = (img.min(2) >= 248).astype(np.uint8) * 255
m = Image.fromarray(white).copy()  # fromarray shares a read-only buffer
for xy in [(0, 0), (W - 1, 0), (0, H - 1), (W - 1, H - 1), (W // 2, H - 1), (W // 2, 0)]:
    if m.getpixel(xy) == 255:
        ImageDraw.floodfill(m, xy, 128)
outside = (np.asarray(m) == 128)

r, g, b = img[..., 0], img[..., 1], img[..., 2]
blue = ((b > 150) & (r < 90) & (b - r > 110)).astype(np.float32)
core = d.morph(d.morph(blue, 'min', 6), 'max', 26)
closed = d.morph(d.morph(blue, 'max', 20), 'min', 20)
fill = np.asarray(Image.fromarray(((core * closed) * 255).astype(np.uint8)).filter(
    ImageFilter.GaussianBlur(2)), dtype=np.float32) / 255

px = img.reshape(-1, 3)
fw = fill.reshape(-1)
out, _ = d.recolor(px, d.KEYBOARD, fw)
inside = fw > 0.02
if inside.any():
    fm, _ = d.recolor(px[inside], d.FILL_ONLY, np.ones(int(inside.sum()), dtype=np.float32))
    w = fw[inside][:, None]
    out[inside] = out[inside] * (1 - w) + fm * w
out = out.reshape(H, W, 3)

alpha = np.where(outside, 0, 255).astype(np.uint8)
alpha = np.asarray(Image.fromarray(alpha).filter(ImageFilter.GaussianBlur(1.2)))
rgba = np.dstack([np.clip(out, 0, 255).astype(np.uint8), alpha])
Image.fromarray(rgba, 'RGBA').save(dst, quality=90, method=6)
print('outside px', int(outside.sum()), 'of', H * W)
