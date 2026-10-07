"""Recolor a light Arcatext simulator capture to the app's dark appearance.

Every pixel is explained as a blend of two known light colors (an anchor pair,
which captures anti-aliased edges) and re-blended from those colors' dark
values. Anchors and their dark values are per region, because the same light
color means different things in different places: white is the Messages
background (-> black), a view's card (-> MenuCardBgColor dark #3B3B3B), or a
key (-> #3B3B3B). White or blue inside a saturated fill (a button, the Reword
pill, a bubble) is text-on-fill and keeps its fill-context dark value.
Pixels no anchor pair explains (photos, emoji, avatars) are left as they are.

usage: python3 tools/darken_capture.py public/hero-tiles/X.webp public/hero-tiles/dark/X.webp [debug.png]
"""
import sys
import numpy as np
from PIL import Image, ImageFilter


def hx(s):
    s = s.lstrip('#')
    return np.array([int(s[i:i + 2], 16) for i in (0, 2, 4)], dtype=np.float32)


# (light, dark in text context, dark in fill context)
WHITE_FILL = '#FFFFFF'
MESSAGES = [
    ('#FFFFFF', '#000000', WHITE_FILL),
    ('#000000', '#FFFFFF', '#FFFFFF'),
    ('#E9E8EB', '#262628', '#262628'),   # received bubble / glass pills
    ('#8A8A8E', '#8D8D93', '#8D8D93'),   # secondary text
    ('#C7C7CC', '#3A3A3C', '#3A3A3C'),   # field border
    ('#49DD6E', '#30D158', '#30D158'),   # sent bubble
    ('#0A7AFF', '#0A84FF', '#0A84FF'),   # systemBlue (send button, links)
    ('#0140DE', '#7BA2FF', '#3370FF'),
]
PANEL = [
    ('#F2F1F6', '#2B2B2B', '#2B2B2B'),   # PasteBgColor
    ('#FFFFFF', '#3B3B3B', WHITE_FILL),  # MenuCardBgColor / CheckCardBgColor
    ('#000000', '#FFFFFF', '#FFFFFF'),   # MenuLabelColor
    ('#808080', '#ABABAB', '#ABABAB'),   # MenuDetailColor / CheckPlaceholderColor
    ('#E5E5EA', '#4A4A4A', '#4A4A4A'),   # MenuCardStrokeColor / x button
    ('#D9EBFE', '#3B3B3B', '#3B3B3B'),   # CheckSelectedBgColor
    ('#0140DE', '#7BA2FF', '#3370FF'),   # accent text / CheckPrimaryColor fill
    ('#34C759', '#30D158', '#30D158'),   # switch on
    ('#0A7AFF', '#0A84FF', '#0A84FF'),
]
KEYBOARD = [
    ('#E3E4E8', '#161617', '#161617'),   # backdrop -> ToolbarColor dark
    ('#F7F7F7', '#161617', '#161617'),   # top of the glass gradient: dark is flat
    ('#FFFFFF', '#3B3B3B', WHITE_FILL),  # keys, tool buttons -> #3B3B3B
    ('#000000', '#FFFFFF', '#FFFFFF'),   # key glyphs
    ('#B1C6E1', '#3B3B3B', '#3B3B3B'),   # ActionKeyColor
    ('#8A8A8E', '#ABABAB', '#ABABAB'),   # key hints
    ('#C3C5CB', '#0B0B0C', '#0B0B0C'),   # key shadow
    ('#0140DE', '#7BA2FF', '#3370FF'),   # ToolbarIconColor / ToolbarItemColor pill
]


# Inside a bubble, button or the Reword pill: (light, -, dark).
FILL_ONLY = [
    ('#FFFFFF', '#FFFFFF', '#FFFFFF'),
    ('#0140DE', '#3370FF', '#3370FF'),   # ToolbarItemColor / CheckPrimaryColor
    ('#0A7AFF', '#0A84FF', '#0A84FF'),
    ('#49DD6E', '#30D158', '#30D158'),
    ('#34C759', '#30D158', '#30D158'),
]


def box_frac(mask, r):
    im = Image.fromarray((mask * 255).astype(np.uint8))
    return np.asarray(im.filter(ImageFilter.BoxBlur(r)), dtype=np.float32) / 255


def morph(mask, op, r):
    im = Image.fromarray((mask * 255).astype(np.uint8))
    f = ImageFilter.MinFilter(2 * r + 1) if op == 'min' else ImageFilter.MaxFilter(2 * r + 1)
    return (np.asarray(im.filter(f), dtype=np.float32) / 255 > 0.5).astype(np.float32)


def smooth(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


def recolor(px, anchors, fillw):
    """px: (N,3); fillw: (N,) in 0..1. Returns mapped (N,3) and fit error (N,)."""
    L = np.stack([hx(a[0]) for a in anchors])
    Dt = np.stack([hx(a[1]) for a in anchors])
    Df = np.stack([hx(a[2]) for a in anchors])
    D = Dt[None] * (1 - fillw[:, None, None]) + Df[None] * fillw[:, None, None]  # (N,K,3)
    n = len(anchors)
    best = np.full(len(px), np.inf, dtype=np.float32)
    fit = np.zeros(len(px), dtype=np.float32)
    out = np.zeros_like(px)
    for i in range(n):
        for j in range(i, n):
            a, b = L[i], L[j]
            d = b - a
            dd = float(d @ d)
            t = np.zeros(len(px), dtype=np.float32) if dd == 0 else np.clip(((px - a) @ d) / dd, 0, 1)
            proj = a + t[:, None] * d
            # Neutral greys sit near several collinear pairs at once; a small
            # cost on the pair's length makes the nearest pair win, so webp
            # noise cannot flip neighbouring pixels between pairs (dashes).
            err = np.sqrt(((px - proj) ** 2).sum(1))
            score = err + 0.02 * np.sqrt(dd)
            better = score < best
            if better.any():
                best[better] = score[better]
                fit[better] = err[better]
                tt = t[better][:, None]
                out[better] = D[better, i] * (1 - tt) + D[better, j] * tt
    return out, fit


def main(src, dst, debug=None):
    img = np.asarray(Image.open(src).convert('RGB'), dtype=np.float32)
    H, W, _ = img.shape

    def near(c, tol=14):
        return (np.abs(img - hx(c)).max(2) <= tol).astype(np.float32)

    # Rows: the open panel or the keyboard starts at the first row (below the
    # conversation) that is mostly view or keyboard background.
    # Tight tolerances: the glass gradient above a view (#F5-#F9) and the
    # received bubble (#E9E8EB) must not read as view or keyboard background.
    kb = near('#E3E4E8', 3)
    pn = near('#F2F1F6', 2) * ((img[..., 2] - img[..., 0]) >= 3)
    kbr, pnr = kb.mean(1), pn.mean(1)
    start = next((y for y in range(int(H * 0.3), H) if kbr[y] > 0.45 or pnr[y] > 0.45), H)
    region = np.zeros(H, dtype=np.int8)  # 0 messages, 1 panel, 2 keyboard
    cur = 1 if pnr[start:start + 40].mean() > kbr[start:start + 40].mean() else 2
    for y in range(start, H):
        if kbr[y] > 0.3 and kbr[y] > pnr[y]:
            cur = 2
        elif pnr[y] > 0.3:
            cur = 1
        region[y] = cur

    # Fill context: a neighbourhood dominated by a saturated blue or green.
    r, g, b = img[..., 0], img[..., 1], img[..., 2]
    blue = ((b > 150) & (r < 90) & (b - r > 110)).astype(np.float32)
    green = ((g > 160) & (r < 120) & (b < 150) & (g - r > 60)).astype(np.float32)
    # Inside a SOLID fill shape (a bubble, button or the Reword pill), not just
    # near one: an erosion drops thin blue text, a dilation from the surviving
    # core covers the text holes, and a closing of the mask bounds it so the
    # shape never grows past its own anti-aliased edge (that leaked white
    # fringes around every bubble).
    m = np.maximum(blue, green)
    core = morph(morph(m, 'min', 3), 'max', 14)
    closed = morph(morph(m, 'max', 10), 'min', 10)
    fill = np.asarray(Image.fromarray(((core * closed) * 255).astype(np.uint8)).filter(
        ImageFilter.GaussianBlur(1)), dtype=np.float32) / 255
    # The amber Experimental badge keeps its colors in both appearances.
    amber = (np.abs(img - hx('#FFB200')).max(2) < 40).astype(np.float32)
    keep_amber = box_frac(amber, 6) > 0.12

    out = img.copy()
    err = np.zeros((H, W), dtype=np.float32)
    for rid, anchors in ((0, MESSAGES), (1, PANEL), (2, KEYBOARD)):
        rows = region == rid
        if not rows.any():
            continue
        sub = img[rows].reshape(-1, 3)
        fw = fill[rows].reshape(-1)
        m, e = recolor(sub, anchors, fw)
        # Inside a solid fill only white and the fill colors occur; matching
        # against just those keeps webp's chroma blur on letter edges from
        # fitting a grey pair (which outlined white button text).
        inside = fw > 0.02
        if inside.any():
            fm, _ = recolor(sub[inside], FILL_ONLY, np.ones(int(inside.sum()), dtype=np.float32))
            w = fw[inside][:, None]
            m[inside] = m[inside] * (1 - w) + fm * w
        out[rows] = m.reshape(-1, W, 3)
        err[rows] = e.reshape(-1, W)

    # Unexplained pixels (photos, emoji, the avatar) fade back to the original.
    keep = smooth(18, 40, err)
    keep = np.maximum(keep, keep_amber.astype(np.float32))
    out = out * (1 - keep[..., None]) + img * keep[..., None]
    Image.fromarray(np.clip(out, 0, 255).astype(np.uint8)).save(dst, quality=90, method=6)
    if debug:
        dbg = np.stack([err / err.max() * 255, fill * 255, np.broadcast_to(region[:, None] * 100.0, (H, W))], 2)
        Image.fromarray(np.clip(dbg, 0, 255).astype(np.uint8)).save(debug)
    print(src, '-> rows from', start, 'unexplained px:', int((keep > 0.5).sum()))


if __name__ == '__main__':
    main(*sys.argv[1:])
