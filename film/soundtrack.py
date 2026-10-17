"""The film's soundtrack, synthesized from out/cues.json (written by render.mjs).

120 BPM in C major (C - G - Am - F, a bar each), four on the floor, with the
UI's own sounds on top: a click per typed key, a soft thock per tap, a whoosh
on send and on each app switch, and a shimmer when the reword and the reverse
translation land. The arrangement follows the cue sheet's sections: logo
cards, headline cards and product shots.

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
FILM = sys.argv[sys.argv.index('--film') + 1] if '--film' in sys.argv else 'main'
SUFFIX = ('' if FILM == 'main' else f'-{FILM}')
if '--cut' in sys.argv:  # the short cut, as rendered with render.mjs --cut short
    SUFFIX += '-' + sys.argv[sys.argv.index('--cut') + 1]
if '--portrait' in sys.argv:  # same timing as landscape; reads its own cue file
    SUFFIX += '-portrait'
cues = json.loads((HERE / 'out' / f'cues{SUFFIX}.json').read_text())
DUR = cues['duration'] + 1.5
BEAT = 60 / cues['bpm']
BAR = BEAT * 4
N = int(DUR * SR)
rng = np.random.default_rng(7)
sfx_only = '--sfx-only' in sys.argv
# --style picks the bed: 'pop' (the original 120 BPM C-G-Am-F), 'mellow'
# (90 BPM, soft keys over Fmaj7-Em7-Dm7-Cmaj7) or 'bright' (124 BPM,
# Am-F-C-G with a bigger pulse). The UI sounds are the same in all three.
STYLE = sys.argv[sys.argv.index('--style') + 1] if '--style' in sys.argv else 'pop'
if STYLE != 'pop':
    SUFFIX += f'-{STYLE}'
# The learn film has no dings: no bell hits on the logo, the reword or the
# reel words, and its mellow keys drop the bell's inharmonic partials.
NO_DINGS = FILM == 'learn'
# The learn film also runs a smooth bed: no kick, claps or builds, a
# continuous bass, and every layer eased in and out instead of switched at
# section changes, so nothing pops or jumps from the first frame to the last.
SMOOTH = FILM == 'learn'
BEAT = 60 / {'pop': cues['bpm'], 'mellow': 90, 'bright': 124}[STYLE]
BAR = BEAT * 4


def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def t_(n):
    return np.arange(n) / SR


def place(buf, sig, at, gain=1.0):
    i = int(round(at * SR))
    if i >= len(buf):
        return
    if i < 0:  # starts before the film: keep the part that's inside it
        sig, i = sig[-i:], 0
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


def env(n, a, d, tail=0.03):
    """Linear attack, exponential decay (seconds), and a short fade at the very
    end so a note never stops on a step (a step is an audible click)."""
    tt = t_(n)
    e = np.exp(-tt / d)
    if a > 0:
        e *= np.clip(tt / a, 0, 1)
    r = min(n, int(tail * SR))
    if r:
        e[-r:] *= np.linspace(1, 0, r)
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


def saw_note(freq, dur, bright=12, a=0.005, d=None, rel=0.04):
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
    r = int(rel * SR)
    e[-r:] *= np.linspace(1, 0, r) ** 0.7
    return y * e


def pluck(freq, dur=0.6):
    n = int(dur * SR)
    tt = t_(n)
    y = np.sin(2 * np.pi * freq * tt) + 0.45 * np.sin(4 * np.pi * freq * tt) * np.exp(-tt / 0.05) + 0.25 * np.sin(6 * np.pi * freq * tt) * np.exp(-tt / 0.03)
    return y * env(n, 0.002, 0.2)


def bell(freq, dur=1.6):
    n = int(dur * SR)
    tt = t_(n)
    y = (np.sin(2 * np.pi * freq * tt) + 0.5 * np.sin(2 * np.pi * freq * 2.76 * tt) * np.exp(-tt / 0.2)
         + 0.25 * np.sin(2 * np.pi * freq * 5.4 * tt) * np.exp(-tt / 0.08))
    return y * env(n, 0.001, 0.5)


def keys(freq, dur=1.4):
    # A soft electric-piano tone: harmonic partials only, so it never rings
    # like a bell.
    n = int(dur * SR)
    tt = t_(n)
    y = np.sin(2 * np.pi * freq * tt) + 0.3 * np.sin(4 * np.pi * freq * tt) * np.exp(-tt / 0.15)
    return y * env(n, 0.006, 0.45)


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

CHORDS = {  # (bass, chord tones), a bar each
    'pop': [(48, [60, 64, 67, 72]), (43, [59, 62, 67, 71]), (45, [57, 60, 64, 69]), (41, [57, 60, 65, 69])],  # C G Am F
    'mellow': [(41, [57, 60, 64, 65]), (40, [55, 59, 62, 64]), (38, [53, 57, 60, 62]), (36, [55, 59, 60, 64])],  # Fmaj7 Em7 Dm7 Cmaj7
    'bright': [(45, [57, 60, 64, 69]), (41, [57, 60, 65, 69]), (48, [60, 64, 67, 72]), (43, [59, 62, 67, 71])],  # Am F C G
}[STYLE]
titles = [tuple(x) for x in cues['titles']]
phones = cues['phones']
closing = cues['closing']
open_end = cues['opening'][1]


def on_beat(at):
    """The next beat at or after `at`, so builds and risers land on the grid."""
    return np.ceil(at / BEAT - 1e-6) * BEAT


def section(t):
    if t < open_end:
        return 'open'
    if t >= closing:
        return 'close'
    if any(a <= t < b for a, b in titles):
        return 'title'
    return 'phone'


drums = np.zeros(N)
bass = np.zeros(N)
pad = np.zeros(N)
arp = np.zeros(N)
fx = np.zeros(N)
ui = np.zeros(N)
duck = np.ones(N)

def smoothstep(x, a, b):
    u = np.clip((x - a) / (b - a), 0, 1)
    return u * u * (3 - 2 * u)


if SMOOTH:
    T = t_(N)
    first_phone = phones[0] if phones else closing
    # Energy rises over two bars into the product shot and settles over two
    # bars into the closing card; the whole bed then eases out under the logo.
    drive = smoothstep(T, first_phone - BAR, first_phone + BAR) * (1 - smoothstep(T, closing - BAR, closing + BAR))
    outro = 1 - 0.55 * smoothstep(T, closing, cues['duration'])
    # Pulse: soft closed hats on the off-beats only, no kick or clap.
    hats = np.zeros(N)
    nbeats = int(cues['duration'] / BEAT) + 1
    for b in range(nbeats):
        t = b * BEAT
        place(hats, hat(), t + BEAT / 2, 1.0)
        if STYLE != 'mellow':
            place(hats, hat(), t + BEAT / 4, 0.35)
            place(hats, hat(), t + 3 * BEAT / 4, 0.35)
    hats = fft_filter(hats, hi=11000)
    drums = hats * (0.18 + 0.22 * drive) * outro * (0.6 if STYLE == 'mellow' else 1.0)
    # Bass: one continuous oscillator that glides between roots, so a note
    # change is never a fresh attack (each attack was a low thump).
    nbars = int(np.ceil(cues['duration'] / BAR)) + 1
    freq = np.zeros(N)
    for bar in range(nbars):
        root = CHORDS[bar % 4][0]
        if bar * BAR >= closing:
            root = (CHORDS[0] if STYLE != 'mellow' else CHORDS[3])[0]
        i, j = int(bar * BAR * SR), min(N, int((bar + 1) * BAR * SR))
        freq[i:j] = mtof(root)
    g = int(0.06 * SR)
    freq = np.convolve(np.pad(freq, (g, g), mode='edge'), np.ones(g) / g, mode='same')[g:-g]
    ph = 2 * np.pi * np.cumsum(freq) / SR
    bass = (np.sin(ph) + 0.35 * np.sin(2 * ph) + 0.12 * np.sin(3 * ph)) * smoothstep(T, 0, 1.5)
    bass *= (0.16 + 0.08 * drive) * outro
    # Pad: unchanged legato chords; the closing card holds the tonic.
    for bar in range(nbars):
        t0 = bar * BAR
        root, tones = CHORDS[bar % 4]
        if t0 >= closing:
            root, tones = CHORDS[0] if STYLE != 'mellow' else CHORDS[3]
        phrase_b = (bar // 4) % 2 == 1
        voicing = [m + (12 if phrase_b and k == len(tones) - 1 and STYLE != 'mellow' else 0) for k, m in enumerate(tones)]
        for m in voicing:
            for det in (-0.08, 0.08):
                place(pad, saw_note(mtof(m + det), BAR + 1.2, bright=1.6 if STYLE == 'mellow' else 3, a=0.5, rel=1.0), t0 - 0.3, 0.05)
        if STYLE == 'mellow':
            for off, idxs in [(0, [0, 1, 2, 3]), (1.5 * BEAT, [2, 3]), (2.5 * BEAT, [1, 2]), (3.5 * BEAT, [3])]:
                for idx in idxs:
                    place(arp, keys(mtof(tones[idx] + 12), 1.4), t0 + off, 0.2 * 0.55 * 0.6)
                    place(arp, pluck(mtof(tones[idx])), t0 + off, 0.2 * 0.55 * 0.4)
        else:
            pattern = ([0, 1, 2, 3, 2, 1, 2, 3] if not phrase_b else [3, 2, 1, 2, 0, 1, 2, 1]) * 2
            lift = 24 if STYLE == 'bright' and phrase_b else 12
            for k, idx in enumerate(pattern):
                place(arp, pluck(mtof(tones[idx] + lift)), t0 + k * BEAT / 4, 0.2)
    pad = pad[:N]
    arp *= (0.85 + 0.15 * drive) * outro
    pad *= outro
else:
    K, CL = kick(), clap()
    nbeats = int(cues['duration'] / BEAT)
    for b in range(nbeats):
        t = b * BEAT
        beat_in_bar = b % 4
        sec = section(t)
        if sec in ('open', 'close'):  # the logo cards: pad, arp and their hits only
            continue
        if sec == 'phone':
            if STYLE == 'mellow':  # a soft kick on 1 and 3, a rim click on 2 and 4
                if beat_in_bar in (0, 2):
                    place(drums, K, t, 0.45)
                else:
                    c = clap()
                    h = hat()
                    place(drums, c * 0.25, t, 0.5)
                    place(drums, h * 0.5, t, 0.5)
            else:  # four on the floor
                place(drums, K, t, 0.75 if STYLE == 'pop' else 0.85)
                i = int(t * SR)
                dn = int(0.22 * SR)
                # A gentle duck under the kick, on the bass only: a deep one on
                # everything made the bed pump (and read as choppy).
                depth = 0.72
                duck[i:i + dn] = np.minimum(duck[i:i + dn], depth + (1 - depth) * np.sin(np.pi / 2 * np.arange(min(dn, N - i)) / dn))
                if beat_in_bar in (1, 3):
                    place(drums, CL, t, 0.5 if STYLE == 'pop' else 0.6)
                place(drums, hat(), t + BEAT / 4, 0.22)
                place(drums, hat(), t + 3 * BEAT / 4, 0.22)
        # Offbeat hats keep the pulse through the headline cards too.
        place(drums, hat(open_=(beat_in_bar == 3 and STYLE != 'mellow')), t + BEAT / 2, 0.8 if STYLE != 'mellow' else 0.35)

    # A snare build into each camera move and a riser under it, both landing on
    # the beat (an off-grid build is what made the bed sound like a bad loop).
    for at in phones:
        q = on_beat(at)
        if STYLE != 'mellow':
            for k in range(8):
                place(drums, CL, q - BEAT + k * BEAT / 8, 0.1 + 0.04 * k)
    for at in phones + [closing]:
        q = on_beat(at)
        place(fx, riser(1.6), q - 1.6, 0.35 if STYLE == 'mellow' else 0.45)

    nbars = int(np.ceil(cues['duration'] / BAR))
    for bar in range(nbars):
        t0 = bar * BAR
        root, tones = CHORDS[bar % 4]
        sec = section(t0)
        phrase_b = (bar // 4) % 2 == 1  # every other 4-bar phrase answers the first
        if sec == 'close':  # the closing card holds the tonic
            root, tones = CHORDS[0] if STYLE != 'mellow' else CHORDS[3]
        # Pad: legato. Each chord overlaps the next by a long crossfade, so there
        # is no dip at the bar line (the old pad re-attacked from silence every bar).
        voicing = [m + (12 if phrase_b and k == len(tones) - 1 and STYLE != 'mellow' else 0) for k, m in enumerate(tones)]
        last = t0 + BAR >= cues['duration']
        for m in voicing:
            for det in (-0.08, 0.08):
                place(pad, saw_note(mtof(m + det), BAR + (2.5 if last else 0.7), bright=1.6 if STYLE == 'mellow' else 3, a=0.35, rel=0.8), t0 - 0.1, 0.05)
        if sec in ('phone', 'title'):
            if STYLE == 'mellow':  # a round bass on 1 and the "and" of 2
                for off, g in ((0, 0.3), (1.5 * BEAT, 0.2), (3 * BEAT, 0.18)):
                    place(bass, saw_note(mtof(root), BEAT * 1.4, bright=1.2, a=0.02, d=0.8, rel=0.25), t0 + off, g)
            else:  # driving 8th-note bass
                for k in range(8):
                    note = root + (12 if STYLE == 'bright' and k % 2 else 0)
                    place(bass, saw_note(mtof(note), BEAT / 2 * 1.15, bright=6, a=0.006, d=0.3, rel=0.08), t0 + k * BEAT / 2, 0.24 if sec == 'phone' else 0.17)
        if t0 < closing + BAR:
            g = {'open': 0.16, 'title': 0.2, 'phone': 0.26, 'close': 0.12}[sec]
            if STYLE == 'mellow':
                # Soft keys: the chord on 1, then two of its notes on the off-beats.
                for k, (off, idxs) in enumerate([(0, [0, 1, 2, 3]), (1.5 * BEAT, [2, 3]), (2.5 * BEAT, [1, 2]), (3.5 * BEAT, [3])]):
                    for idx in idxs:
                        place(arp, (keys if NO_DINGS else bell)(mtof(tones[idx] + 12), 1.4), t0 + off, g * 0.55 * 0.6)
                        place(arp, pluck(mtof(tones[idx])), t0 + off, g * 0.55 * 0.4)
            else:
                # Arp: 16ths over the chord, an octave up; the answering phrase
                # turns the pattern around so 8 bars don't read as one loop.
                pattern = ([0, 1, 2, 3, 2, 1, 2, 3] if not phrase_b else [3, 2, 1, 2, 0, 1, 2, 1]) * 2
                lift = 24 if STYLE == 'bright' and phrase_b else 12
                for k, idx in enumerate(pattern):
                    place(arp, pluck(mtof(tones[idx] + lift)), t0 + k * BEAT / 4, g)

    # The logo landing, on the opening and the closing card.
    for at in ([cues['opening'][0] + 0.5] if cues['opening'][1] > 0 else []) + [closing + 0.5]:
        for k, m in enumerate([] if NO_DINGS else [72, 79, 84, 88]):
            place(fx, bell(mtof(m)), at + k * 0.05, 0.08)
    for m in (36, 48, 60, 64, 67, 72, 76):
        place(fx, saw_note(mtof(m), 4.5, bright=6, a=0.004, d=1.4), closing, 0.09)
    place(fx, kick(), closing, 1.0)

    # Shimmers when the reword and the reverse translation land; a note per
    # closing word.
    for at in [] if NO_DINGS else [c for c in (cues['reword'], cues.get('reveal')) if c is not None]:
        for k, m in enumerate([84, 88, 91, 96]):
            place(fx, bell(mtof(m)), at + k * 0.045, 0.09)
    # A bell per readable reel word; a spin's words just tick.
    last_bell = -9.0
    notes = [76, 79, 81, 84]
    k = 0
    for at in sorted(cues['words']):
        if at - last_bell >= 0.3 and not NO_DINGS:
            place(fx, bell(mtof(notes[k % 4])), at, 0.1)
            last_bell = at
            k += 1
        else:
            place(ui, key_click(), at, 0.05)

# UI sounds.
for k in cues['keys']:
    click = fft_filter(key_click(), lo=900) if SMOOTH else key_click()
    place(ui, click, k['t'], 0.16 if k['space'] else 0.2)
for at in cues['taps']:
    if SMOOTH:  # a light tick; the low thock read as a bass pop
        place(ui, fft_filter(key_click(), lo=1200), at, 0.25)
    else:
        place(ui, tap(), at, 0.35)
for at in cues.get('sends', [cues['send']]):
    place(ui, whoosh(), at - 0.04, 0.55)
# Message arrivals in the chat film: a soft pop, pitched by who sent it.
for p in cues.get('pops', []):
    n = int(0.09 * SR)
    tt = t_(n)
    f = 880 if p['who'] == 'me' else 660
    place(ui, np.sin(2 * np.pi * (f * tt + 900 * tt**2)) * env(n, 0.008 if SMOOTH else 0.002, 0.03), p['t'], 0.14 if SMOOTH else 0.22)
for at in cues.get('ticks', []):
    place(ui, key_click(), at, 0.07)
for at in cues['swipes']:
    place(ui, whoosh(), at + 0.05, 0.3)

# ── Mix ─────────────────────────────────────────────────────────────────────

bass = fft_filter(bass, hi=900)
pad = fft_filter(pad, hi=3500)
music = drums + bass * duck + pad + reverb(arp, 1.8, 0.35) + reverb(fx, 2.6, 0.3)
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
out = HERE / 'out' / (('sfx' if sfx_only else 'soundtrack') + SUFFIX + '.wav')
with wave.open(str(out), 'wb') as f:
    f.setnchannels(2)
    f.setsampwidth(2)
    f.setframerate(SR)
    f.writeframes(pcm.tobytes())
print('wrote', out)
