"""The voiceover: spoken clips laid onto the film's own clock, then mixed over
each soundtrack with the music ducked under the voice.

The script comes from the cue sheet render.mjs writes (`voice`: one entry per
on-screen line, with `at` = when its text appears, `until` = when it must be
done, and `marks` = when each chunk of it is revealed). Clips are whatever
synthesized each line (Google Chirp via tts_chirp.py, or any other source),
saved as out/vo/<voice>/<key>.wav; an optional <key>.words.json
([{"word", "start", "end"}, ...], seconds into the clip) lets a line be warped
so each chunk is spoken as it is revealed.

    python3 film/voiceover.py script --film learn            # print the lines
    python3 film/voiceover.py mix --film learn --voice Kore   # lay out + mix
    ... --cut noopen --voice-only                            # a cut's voice stem only

Per line, mix:
  * trims the clip's leading and trailing silence, so speech starts on `at`;
  * with word timings, stretches each chunk's span to end where the next
    chunk is revealed (kept within 0.8-1.25x, so speech stays natural);
  * if the line still runs past `until`, speeds it up to fit (pitch kept, at
    most 1.3x; past that the report says to re-synthesize it faster);
  * writes out/vo-<film>-<voice>.wav (the voice alone) and, for every
    soundtrack wav present (Original, Mellow, Bright), a mix with the music
    ducked about 9 dB under speech, plus `-none` (no music: the voice over
    the UI sounds of soundtrack.py --sfx-only), as both .wav and AAC .mp4;
  * writes out/vo-<film>-<voice>.report.json: each line's timing and fit.
"""
import json
import subprocess
import sys
import tempfile
import wave
from pathlib import Path

import numpy as np

HERE = Path(__file__).parent
OUT = HERE / 'out'
SR = 48000
args = sys.argv[1:]
cmd = args[0] if args else 'script'
opt = lambda k, d=None: args[args.index(k) + 1] if k in args else d
FILM = opt('--film', 'learn')
VOICE = opt('--voice')
SUFFIX = ('' if FILM == 'main' else f'-{FILM}') + (f"-{opt('--cut')}" if opt('--cut') else '') + ('-portrait' if '--portrait' in args else '')
# --voice-only: just the placed voice (out/vo<suffix>-<voice>.wav, the stem
# Cut Room mixes from), no pre-mixes over the soundtracks.
VOICE_ONLY = '--voice-only' in args
MARGIN = 0.08  # seconds of air kept before `until`
MAX_FIT = 1.3  # fastest a whole line may be sped up


def cues():
    for name in (f'cues{SUFFIX}.json', f'cues{SUFFIX}-portrait.json', f'cues{SUFFIX}-alpha.json'):
        p = OUT / name
        if p.exists():
            c = json.loads(p.read_text())
            if c.get('voice'):
                return c
    sys.exit(f'No cue sheet with a voice script for {FILM}: render the film first (render.mjs writes out/cues*.json).')


def read_wav(path):
    """Any wav (via ffmpeg, so any rate/format) as mono float at SR."""
    raw = subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-i', str(path), '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype='<f4').astype(np.float64)


def write_wav(path, x, channels=1):
    pcm = (np.clip(x, -1, 1) * 32767).astype('<i2')
    with wave.open(str(path), 'wb') as f:
        f.setnchannels(channels)
        f.setsampwidth(2)
        f.setframerate(SR)
        f.writeframes(pcm.tobytes())


def stretch(x, tempo):
    """Time-stretch by `tempo` (>1 = faster), pitch kept (Rubber Band)."""
    if abs(tempo - 1) < 0.005 or len(x) == 0:
        return x
    with tempfile.TemporaryDirectory() as d:
        a, b = Path(d) / 'a.wav', Path(d) / 'b.wav'
        write_wav(a, x)
        subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-i', str(a), '-af', f'rubberband=tempo={tempo:.5f}:formant=preserved', str(b)], check=True)
        return read_wav(b)


def trim(x, words=None):
    """Drop leading/trailing silence, breaths and decay: speech starts where
    the clip first comes within 26 dB of its own peak, which skips the
    inhale TTS voices often take first (10 ms windows, 60 ms kept before) and ends after its last window within 40 dB (60 ms kept).
    Word timings shift with the leading cut."""
    win = int(0.01 * SR)
    n = len(x) // win
    if n == 0:
        return x, words or [], 0.0
    rms = np.sqrt((x[: n * win].reshape(n, win) ** 2).mean(1))
    floor = 10 ** (-45 / 20)
    start_on = np.where(rms > max(floor, rms.max() * 10 ** (-26 / 20)))[0]
    end_on = np.where(rms > max(floor, rms.max() * 10 ** (-40 / 20)))[0]
    if len(start_on) == 0:
        return x[:0], [], 0.0
    i0 = max(0, start_on[0] - 6) * win
    i1 = min(n, end_on[-1] + 6) * win
    cut = i0 / SR
    w = [{**k, 'start': k['start'] - cut, 'end': k['end'] - cut} for k in (words or [])]
    return x[i0:i1], w, cut


def norm(s):
    return ''.join(ch for ch in s.lower() if ch.isalnum() or ch in "'’")


def warp(x, words, line):
    """Stretch each chunk's span so the next chunk starts as it is revealed."""
    marks = line['marks']
    if not words or len(marks) < 2:
        return x, None
    # The clip time each mark's first word starts at, matched in order.
    starts, wi = [], 0
    for m in marks:
        first = norm(m['text'].split()[0])
        while wi < len(words) and norm(words[wi]['word']) != first:
            wi += 1
        if wi == len(words):
            return x, None
        starts.append(max(0.0, words[wi]['start']))
        wi += 1
    starts[0] = 0.0
    out, applied = [], []
    for k in range(len(marks)):
        a = int(starts[k] * SR)
        b = int(starts[k + 1] * SR) if k + 1 < len(marks) else len(x)
        seg = x[a:b]
        if k + 1 < len(marks):
            want = marks[k + 1]['at'] - marks[k]['at']
            have = len(seg) / SR
            tempo = float(np.clip(have / want, 0.8, 1.25)) if want > 0 and have > 0 else 1.0
        else:
            tempo = 1.0
        applied.append(round(tempo, 3))
        out.append(stretch(seg, tempo))
    return np.concatenate(out) if out else x, applied


def level(x, target_db=-18.0):
    """Speech-weighted RMS to target, from the loud parts only."""
    win = int(0.05 * SR)
    n = len(x) // win
    if n == 0:
        return x
    rms = np.sqrt((x[: n * win].reshape(n, win) ** 2).mean(1))
    loud = rms[rms > rms.max() * 0.2]
    g = 10 ** (target_db / 20) / max(1e-6, np.sqrt((loud**2).mean()))
    return x * g


def envelope(x, attack=0.08, release=0.35):
    """Follower of |x| with separate attack/release, normalised 0..1."""
    hop = int(0.005 * SR)
    n = len(x) // hop + 1
    blk = np.abs(np.pad(x, (0, n * hop - len(x)))).reshape(n, hop).max(1)
    a, r = np.exp(-0.005 / attack), np.exp(-0.005 / release)
    e = np.zeros(n)
    v = 0.0
    for i, b in enumerate(blk):
        v = a * v + (1 - a) * b if b > v else r * v + (1 - r) * b
        e[i] = v
    e /= max(1e-6, e.max())
    e = np.clip(e * 3, 0, 1)  # any speech counts as fully "on"
    return np.repeat(e, hop)[: len(x)]


def read_track(path):
    with wave.open(str(path)) as f:
        ch, n = f.getnchannels(), f.getnframes()
        x = np.frombuffer(f.readframes(n), '<i2').astype(np.float64) / 32768
    return x.reshape(-1, ch) if ch > 1 else x.reshape(-1, 1)


def main():
    if cmd == 'script':
        c = cues()
        for l in c['voice']:
            print(f"{l['key']:<14} {l['at']:6.2f} -> {l['until']:6.2f}  ({l['until'] - l['at']:.2f}s)  {l['text']}")
        return

    if cmd != 'mix' or not VOICE:
        sys.exit(__doc__)

    c = cues()
    src = OUT / 'vo' / VOICE
    N = int(c['duration'] * SR)
    vo = np.zeros(N)
    report = []
    for line in c['voice']:
        # A cut can carry its own take of a shared line (key@cut.wav), e.g. a
        # quicker word where that cut's hold is shorter.
        clip = src / f"{line['key']}@{opt('--cut')}.wav"
        if not opt('--cut') or not clip.exists():
            clip = src / f"{line['key']}.wav"
        if not clip.exists():
            report.append({'key': line['key'], 'missing': True})
            continue
        wj = src / f"{line['key']}.words.json"
        x, words, _ = trim(read_wav(clip), json.loads(wj.read_text()) if wj.exists() else None)
        x, warped = warp(x, words, line)
        x = level(x, -11.5)
        slot = line['until'] - line['at'] - MARGIN
        dur = len(x) / SR
        fit = 1.0
        if dur > slot:
            fit = min(MAX_FIT, dur / slot)
            x = stretch(x, fit)
        end = line['at'] + len(x) / SR
        # A few ms of fade at each edge so a clip never starts or stops on a step.
        f = min(len(x) // 2, int(0.004 * SR))
        if f:
            x[:f] *= np.linspace(0, 1, f)
            x[-f:] *= np.linspace(1, 0, f)
        i = int(round(line['at'] * SR))
        j = min(N, i + len(x))
        vo[i:j] += x[: j - i]
        report.append({'key': line['key'], 'text': line['text'], 'at': round(line['at'], 3), 'until': round(line['until'], 3),
                       'spoken': round(dur, 3), 'fit': round(fit, 3), 'warp': warped, 'ends': round(end, 3),
                       'overrun': round(max(0.0, end - line['until']), 3),
                       'resynthesize_faster': dur / slot > MAX_FIT})

    write_wav(OUT / f'vo{SUFFIX}-{VOICE}.wav', vo)
    duck = 1 - 0.65 * envelope(vo)  # about -9 dB under speech
    mixes = []
    # '-none' is the music muted: the voice over the UI sounds alone
    # (soundtrack.py --sfx-only), which need no ducking.
    for style in () if VOICE_ONLY else ('', '-mellow', '-bright', '-none'):
        track = OUT / (f'sfx{SUFFIX}.wav' if style == '-none' else f'soundtrack{SUFFIX}{style}.wav')
        if not track.exists():
            continue
        m = read_track(track)[:N]
        m = np.pad(m, ((0, N - len(m)), (0, 0)))
        out = m * (1.0 if style == '-none' else duck[:, None]) + vo[:, None]
        out = np.tanh(out * 1.05)
        out /= max(1.0, np.abs(out).max() / 0.95)
        name = f'soundtrack{SUFFIX}{style}-vo-{VOICE}'
        write_wav(OUT / f'{name}.wav', out.reshape(-1), channels=out.shape[1])
        subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-i', str(OUT / f'{name}.wav'), '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', str(OUT / f'{name}.mp4')], check=True)
        mixes.append(name)

    (OUT / f'vo{SUFFIX}-{VOICE}.report.json').write_text(json.dumps(report, indent=2, ensure_ascii=False))
    missing = [r['key'] for r in report if r.get('missing')]
    for r in report:
        if not r.get('missing'):
            flag = '  RESYNTHESIZE FASTER' if r['resynthesize_faster'] else ('  overruns' if r['overrun'] else '')
            print(f"{r['key']:<14} at {r['at']:6.2f}  spoken {r['spoken']:.2f}s  fit {r['fit']:.2f}x  ends {r['ends']:6.2f} / {r['until']:6.2f}{flag}")
    if missing:
        print('missing clips:', ', '.join(missing))
    print('wrote', ', '.join([f'vo{SUFFIX}-{VOICE}.wav'] + [m + '.mp4' for m in mixes]))


if __name__ == '__main__':
    main()
