"""The film's soundtrack, synthesized from out/cues.json (written by render.mjs).

120 BPM in C major (C - G - Am - F, a bar each), four on the floor, with the
UI's own sounds on top: a click per typed key, a soft thock per tap, a whoosh
on send and a shimmer when the reword and the reverse translation land.

    python3 film/soundtrack.py            -> film/out/soundtrack.wav

A placeholder bed so the cut can be judged in time; swap in a licensed track
by replacing the wav (the UI sounds can be rendered alone with --sfx-only).
"""
import json
import sys
import wave
from pathlib import Path

import numpy as np

SR = 48000
HERE = Path(__file__).parent
cues = json.loads((HERE / 'out' / 'cues.json').read_text())
DUR = cues['duration'] + 1.5
BEAT = 60 / cues['bpm']
BAR = BEAT * 4
N = int(DUR * SR)
rng = np.random.default_rng(7)
sfx_only = '--sfx-only' in sys.argv


def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def t_(n):
    return np.arange(n) / SR


def place(buf, sig, at, gain=1.0):
    i = int(round(at * SR))
    if i >= len(buf):
        return
    j = min(len(buf), i + len(sig))
    buf[i:j] += sig[: j - i] * gain


def fft_filter(x, lo=None, hi=None):
    """Brick-ish band limit with soft shoulders, in the frequency domain."""
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    g = np.ones_like(f)
    if lo:
        g *= 1 / (1 + (lo / np.maximum(f, 1)) ** 4)
    if hi:
        g *= 1 / (1 + (f / hi) ** 4)
    return np.fft.irfft(X * g, len(x))


def env(n, a, d):
    """Linear attack, exponential decay (seconds)."""
    tt = t_(n)
    e = np.exp(-tt / d)
    if a > 0:
        e *= np.clip(tt / a, 0, 1)
    return e


def reverb(x, secs=2.2, mix=0.25):
    n = int(secs * SR)
    ir = rng.standard_normal(n) * np.exp(-t_(n) / (secs / 6))
    ir = fft_filter(ir, lo=200, hi=7000)
    ir /= np.sqrt(np.sum(ir**2))
    L = len(x) + n
    y = np.fft.irfft(np.fft.rfft(x, L) * np.fft.rfft(ir, L), L)[: len(x)]
    return x * (1 - mix) + y * mix * 1.6


# ── Instruments ─────────────────────────────────────────────────────────────

def kick():
    n = int(0.45 * SR)
    tt = t_(n)
    f = 46 + 110 * np.exp(-tt / 0.035)
    ph = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(ph) * np.exp(-tt / 0.22)
    click = fft_filter(rng.standard_normal(n), lo=2500) * np.exp(-tt / 0.004) * 0.25
    return np.tanh((body + click) * 1.6)


def clap():
    n = int(0.35 * SR)
    noise = fft_filter(rng.standard_normal(n), lo=900, hi=6000)
    e = np.zeros(n)
    for k, off in enumerate([0, 0.011, 0.022]):
        e += env(n, 0, 0.008 if k < 2 else 0.12) * (np.arange(n) >= off * SR)
    return noise * e * 0.6


def hat(open_=False):
    n = int((0.25 if open_ else 0.06) * SR)
    return fft_filter(rng.standard_normal(n), lo=7000) * env(n, 0, 0.09 if open_ else 0.018) * 0.6


def saw_note(freq, dur, bright=12, a=0.005, d=None):
    n = int(dur * SR)
    tt = t_(n)
    y = np.zeros(n)
    for h in range(1, 40):
        if freq * h > 16000:
            break
        y += np.sin(2 * np.pi * freq * h * tt) / h * np.exp(-h / bright)
    e = np.clip(tt / a, 0, 1) if a else np.ones(n)
    if d:
        e *= np.exp(-tt / d)
    rel = int(0.01 * SR)
    e[-rel:] *= np.linspace(1, 0, rel)
    return y * e


def pluck(freq, dur=0.35):
    n = int(dur * SR)
    tt = t_(n)
    y = np.sin(2 * np.pi * freq * tt) + 0.45 * np.sin(4 * np.pi * freq * tt) * np.exp(-tt / 0.05) + 0.25 * np.sin(6 * np.pi * freq * tt) * np.exp(-tt / 0.03)
    return y * env(n, 0.002, 0.11)


def bell(freq, dur=1.6):
    n = int(dur * SR)
    tt = t_(n)
    y = (np.sin(2 * np.pi * freq * tt) + 0.5 * np.sin(2 * np.pi * freq * 2.76 * tt) * np.exp(-tt / 0.2)
         + 0.25 * np.sin(2 * np.pi * freq * 5.4 * tt) * np.exp(-tt / 0.08))
    return y * env(n, 0.001, 0.5)


def riser(dur):
    n = int(dur * SR)
    tt = t_(n)
    noise = rng.standard_normal(n)
    # Rising band: filter in blocks with a climbing cutoff.
    out = np.zeros(n)
    blocks = 24
    for b in range(blocks):
        i, j = b * n // blocks, (b + 1) * n // blocks
        c = 400 * (14000 / 400) ** (b / blocks)
        out[i:j] = fft_filter(noise[i:j], lo=c * 0.5, hi=c * 1.5)
    return out * (tt / dur) ** 2.2 * 0.5


def whoosh():
    n = int(0.42 * SR)
    tt = t_(n)
    noise = rng.standard_normal(n)
    out = np.zeros(n)
    for b in range(16):
        i, j = b * n // 16, (b + 1) * n // 16
        c = 600 + 5200 * np.sin(np.pi * b / 16)
        out[i:j] = fft_filter(noise[i:j], lo=c * 0.6, hi=c * 1.4)
    shape = np.sin(np.pi * np.clip(tt / 0.42, 0, 1)) ** 2
    tone = np.sin(2 * np.pi * (700 * tt + 900 * tt**2)) * env(n, 0.01, 0.12) * 0.15
    return (out * shape * 0.5 + tone)


def key_click():
    n = int(0.03 * SR)
    tt = t_(n)
    tick = fft_filter(rng.standard_normal(n), lo=1800, hi=9000) * np.exp(-tt / 0.0025)
    thump = np.sin(2 * np.pi * 320 * tt) * np.exp(-tt / 0.006) * 0.4
    return tick + thump


def tap():
    n = int(0.08 * SR)
    tt = t_(n)
    return np.sin(2 * np.pi * (210 - 600 * tt) * tt) * np.exp(-tt / 0.018) + fft_filter(rng.standard_normal(n), lo=2500) * np.exp(-tt / 0.003) * 0.3


# ── Arrangement ─────────────────────────────────────────────────────────────

CHORDS = [  # (bass, chord tones)
    (48, [60, 64, 67, 72]),  # C
    (43, [59, 62, 67, 71]),  # G
    (45, [57, 60, 64, 69]),  # Am
    (41, [57, 60, 65, 69]),  # F
]
end_t = cues['cuts'][-1]          # the end card
titles = [(0, 2), (6, 8), (14, 16)]


def in_title(t):
    return any(a <= t < b for a, b in titles)


drums = np.zeros(N)
bass = np.zeros(N)
pad = np.zeros(N)
arp = np.zeros(N)
fx = np.zeros(N)
ui = np.zeros(N)
duck = np.ones(N)

K, CL = kick(), clap()
nbeats = int(cues['duration'] / BEAT)
for b in range(nbeats):
    t = b * BEAT
    bar = int(t // BAR)
    beat_in_bar = b % 4
    if t < 2:  # intro: pad and arp only
        continue
    groove = not in_title(t) or (6 <= t < 8)
    if t >= end_t + BAR:  # last bar: let the end chord ring
        continue
    if groove and not (14 <= t < 16):
        place(drums, K, t, 0.75)
        i = int(t * SR)
        dn = int(0.22 * SR)
        duck[i:i + dn] = np.minimum(duck[i:i + dn], 0.35 + 0.65 * (np.arange(min(dn, N - i)) / dn) ** 0.6)
        if beat_in_bar in (1, 3) and t >= 8:
            place(drums, CL, t, 0.55)
    # Hats on the offbeats everywhere but the intro; 16ths in the busiest sections.
    place(drums, hat(open_=(beat_in_bar == 3)), t + BEAT / 2, 0.8)
    if t >= 8 and not (14 <= t < 16):
        place(drums, hat(), t + BEAT / 4, 0.22)
        place(drums, hat(), t + 3 * BEAT / 4, 0.22)

# Snare build into the reword shot.
for k in range(8):
    place(drums, CL, 7.5 + k * BEAT / 8, 0.15 + 0.05 * k)

nbars = int(np.ceil(cues['duration'] / BAR))
for bar in range(nbars):
    t0 = bar * BAR
    root, tones = CHORDS[bar % 4]
    last = t0 >= end_t
    # Pad: the chord, soft and wide; the end card holds the tonic.
    if last:
        root, tones = CHORDS[0]
    padlen = BAR + (2.5 if t0 >= end_t + BAR else 0.05)
    for m in tones:
        for det in (-0.08, 0.08):
            place(pad, saw_note(mtof(m + det), padlen, bright=3, a=0.25), t0, 0.05)
    if t0 >= 2 and t0 < end_t + BAR:
        for k in range(8):  # driving 8th-note bass
            place(bass, saw_note(mtof(root), BEAT / 2 * 0.9, bright=6, a=0.003, d=0.12), t0 + k * BEAT / 2, 0.26)
    # Arp: 16ths up and down the chord, an octave up.
    pattern = [0, 1, 2, 3, 2, 1, 2, 3] * 2
    if t0 < end_t + BAR:
        for k, idx in enumerate(pattern):
            g = 0.16 if t0 < 2 else 0.26
            if in_title(t0) and t0 > 0:
                g *= 0.7
            place(arp, pluck(mtof(tones[idx] + 12)), t0 + k * BEAT / 4, g)

# Risers into each phone shot after a title; a big tonic hit on the end card.
for at in (2, 8, 16):
    r = riser(1.6)
    place(fx, r, at - 1.6, 0.5)
for m in (36, 48, 60, 64, 67, 72, 76):
    place(fx, saw_note(mtof(m), 3.8, bright=6, a=0.004, d=1.2), end_t, 0.09)
place(fx, kick(), end_t, 1.0)

# Shimmers when the reword and the reverse translation land.
for at in (cues['reword'], cues['reveal']):
    for k, m in enumerate([84, 88, 91, 96]):
        place(fx, bell(mtof(m)), at + k * 0.045, 0.09)

# UI sounds.
for k in cues['keys']:
    place(ui, key_click(), k['t'], 0.16 if k['space'] else 0.2)
for at in cues['taps']:
    place(ui, tap(), at, 0.35)
place(ui, whoosh(), cues['send'] - 0.04, 0.55)

# ── Mix ─────────────────────────────────────────────────────────────────────

bass = fft_filter(bass, hi=900)
pad = fft_filter(pad, hi=3500)
music = drums + (bass + pad * 1.0) * duck + reverb(arp * duck, 1.8, 0.35) + reverb(fx, 2.6, 0.3)
mix = (ui * 1.0) if sfx_only else (music * 0.8 + ui)

# Fade out with the picture.
fade_from = cues['duration'] - 0.6
tt = t_(N)
mix *= np.clip(1 - (tt - fade_from) / 1.9, 0, 1) ** 1.5 * (tt >= fade_from) + (tt < fade_from)
mix = mix[: int(cues['duration'] * SR)]
mix = np.tanh(mix * 1.1)
mix /= np.max(np.abs(mix)) / 0.89

stereo = np.stack([mix, mix], axis=1)
# A touch of width: the arp and fx a few ms apart between channels.
w = int(0.008 * SR)
side = (reverb(arp, 1.8, 0.35) * 0.05)[: len(mix)]
stereo[:, 0] += np.concatenate([side[w:], np.zeros(w)])
stereo[:, 1] += side
pcm = (np.clip(stereo, -1, 1) * 32767).astype('<i2')
out = HERE / 'out' / ('sfx.wav' if sfx_only else 'soundtrack.wav')
with wave.open(str(out), 'wb') as f:
    f.setnchannels(2)
    f.setsampwidth(2)
    f.setframerate(SR)
    f.writeframes(pcm.tobytes())
print('wrote', out)
