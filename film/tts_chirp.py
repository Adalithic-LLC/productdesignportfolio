"""Synthesizes the voiceover script with Google Cloud Text-to-Speech (Chirp 3:
HD voices), one clip per line, into out/vo/<voice>/<key>.wav for voiceover.py.

    python3 film/tts_chirp.py voices                          # list Chirp 3 HD voices
    python3 film/tts_chirp.py synth --film learn --voice Kore [--lang en-US]

Auth, first that is set: GOOGLE_API_KEY (an API key with Text-to-Speech
enabled), GOOGLE_TTS_TOKEN (an OAuth access token), else `gcloud auth
print-access-token`. With an outbound proxy that injects Google credentials,
none is needed. A session whose Google access comes through an MCP connector
instead should call that connector's synthesize tool with the same text and
voice and save each clip under the same name; voiceover.py takes it from there.

Each line is synthesized at normal pace first. If it comes out longer than its
window (`until - at`, from the cue sheet), it is synthesized again with a
faster speakingRate so voiceover.py rarely needs to stretch it; Chirp's own
pacing sounds better than a time-stretch.
"""
import base64
import json
import os
import subprocess
import sys
import urllib.error
import urllib.request
from pathlib import Path

HERE = Path(__file__).parent
OUT = HERE / 'out'
API = 'https://texttospeech.googleapis.com/v1'
args = sys.argv[1:]
cmd = args[0] if args else 'voices'
opt = lambda k, d=None: args[args.index(k) + 1] if k in args else d
LANG = opt('--lang', 'en-US')


def headers():
    h = {'Content-Type': 'application/json'}
    if os.environ.get('GOOGLE_API_KEY'):
        h['X-Goog-Api-Key'] = os.environ['GOOGLE_API_KEY']
    else:
        tok = os.environ.get('GOOGLE_TTS_TOKEN')
        if not tok:
            try:
                tok = subprocess.run(['gcloud', 'auth', 'print-access-token'], capture_output=True, text=True, check=True).stdout.strip()
            except (OSError, subprocess.CalledProcessError):
                tok = None
        if tok:
            h['Authorization'] = f'Bearer {tok}'
        if os.environ.get('GOOGLE_CLOUD_PROJECT'):
            h['X-Goog-User-Project'] = os.environ['GOOGLE_CLOUD_PROJECT']
    return h


def call(path, body=None):
    req = urllib.request.Request(API + path, data=json.dumps(body).encode() if body is not None else None, headers=headers(), method='POST' if body is not None else 'GET')
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        sys.exit(f'Text-to-Speech {e.code}: {e.read().decode(errors="replace")[:400]}')


def chirp_voices():
    vs = call(f'/voices?languageCode={LANG}').get('voices', [])
    return [v for v in vs if 'Chirp3-HD' in v['name']]


def synth(text, name, rate=1.0):
    body = {
        'input': {'text': text},
        'voice': {'languageCode': LANG, 'name': name},
        'audioConfig': {'audioEncoding': 'LINEAR16', 'sampleRateHertz': 48000, **({'speakingRate': round(rate, 3)} if rate != 1.0 else {})},
    }
    return base64.b64decode(call('/text:synthesize', body)['audioContent'])


def duration(wav_bytes):
    """Spoken length (leading/trailing silence trimmed), via voiceover.trim."""
    sys.path.insert(0, str(HERE))
    import tempfile
    import voiceover  # noqa: E402  (its module body only runs a command when given one)
    with tempfile.NamedTemporaryFile(suffix='.wav') as f:
        f.write(wav_bytes)
        f.flush()
        x, _, _ = voiceover.trim(voiceover.read_wav(f.name))
    return len(x) / voiceover.SR


if cmd == 'voices':
    for v in chirp_voices():
        print(f"{v['name']:<34} {v.get('ssmlGender', '')}")
    sys.exit()

if cmd != 'synth' or not opt('--voice'):
    sys.exit(__doc__)

voice = opt('--voice')
name = voice if '-' in voice else f'{LANG}-Chirp3-HD-{voice}'
film = opt('--film', 'learn')
suffix = ('' if film == 'main' else f'-{film}') + ('-portrait' if '--portrait' in args else '')
cues = None
for n in (f'cues{suffix}.json', f'cues{suffix}-portrait.json'):
    p = OUT / n
    if p.exists() and json.loads(p.read_text()).get('voice'):
        cues = json.loads(p.read_text())
        break
if not cues:
    sys.exit('No cue sheet with a voice script: run `node film/render.mjs --film learn --cues-only` first.')
dest = OUT / 'vo' / voice.split('-')[-1]
dest.mkdir(parents=True, exist_ok=True)
for line in cues['voice']:
    slot = line['until'] - line['at'] - 0.08
    audio = synth(line['text'], name)
    d = duration(audio)
    rate = 1.0
    if d > slot:
        rate = min(1.5, d / slot * 1.03)
        audio = synth(line['text'], name, rate)
        d = duration(audio)
    (dest / f"{line['key']}.wav").write_bytes(audio)
    print(f"{line['key']:<14} {d:5.2f}s / {slot:5.2f}s  rate {rate:.2f}  {line['text']}")
print('wrote', dest)
