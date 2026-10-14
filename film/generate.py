"""Generates the film's people, places and voices with OpenAI (key injected by the proxy).

    python3 film/generate.py images     photoreal stills  -> film/plates/*.png
    python3 film/generate.py voices     the two lines     -> film/plates/vo-*.mp3

Each output is skipped if it already exists, so re-running only fills gaps
(delete a file to regenerate it). A still whose spec names a `ref` is made as
an edit of that still, so each person keeps the same face, hair and clothes
across shots. Phone screens are either turned away or chroma green, so the
real Arcatext UI is always the one composited in (see Composite in Film.tsx).
"""
import base64
import json
import os
import tempfile
import subprocess
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

API = 'https://api.openai.com/v1'
OUT = Path(__file__).parent / 'plates'
OUT.mkdir(exist_ok=True)

LOOK = ('Photorealistic film still, shot on a cinema camera with a 35mm lens, shallow depth of field, natural light, '
        'subtle film grain, restrained natural colour grade, the look of an Apple commercial. No text, no logos.')
SOFIA = ('a Mexican woman in her mid-twenties with long wavy dark-brown hair, warm brown skin and small gold hoop earrings, '
         'wearing a mustard-yellow linen blouse')
JAKE = 'an American man in his late twenties with short light-brown hair and a neatly trimmed beard, wearing a navy crewneck sweater'
GREEN = ('The phone is a modern iPhone with thin black bezels and a titanium frame, held upright in portrait orientation. '
         'Its entire display is a flat, evenly lit, pure chroma-key green (#00FF00) with no interface, no reflections and no glare; '
         'the whole display is visible with all four rounded corners in frame, and no finger covers the upper two-thirds of it.')
AWAY = 'The back of the phone faces the camera, so its screen is not visible.'

IMAGES = {
    'sofia-hero': dict(prompt=(
        f'Medium shot of {SOFIA}, sitting at a small café table on a sunny balcony in the Roma neighbourhood of Mexico City, '
        'pink bougainvillea and pastel colonial facades softly blurred behind her. She holds her phone loosely in one hand, '
        f'looking just off camera with a warm, natural smile, as if talking in an interview. {AWAY} {LOOK}')),
    'sofia-phone': dict(ref='sofia-hero', prompt=(
        f'The same woman in the same place and outfit, now a closer three-quarter shot as she looks down at her phone held in both hands, '
        f'typing with her thumbs and smiling to herself. {AWAY} {LOOK}')),
    'sofia-hands': dict(ref='sofia-hero', prompt=(
        'Over-the-shoulder close-up of the same woman\'s hands holding her phone above the café table on the balcony, '
        'mustard-yellow sleeve at the wrist, her right thumb hovering near the bottom edge of the screen. Bougainvillea and street '
        f'softly blurred beyond. {GREEN} {LOOK}')),
    'jake-phone': dict(prompt=(
        f'{JAKE}, sitting on a sofa in a warm, modern Chicago apartment at dusk, a large window behind him with the city skyline lit up '
        f'in soft bokeh, a table lamp glowing. He looks down at his phone and breaks into a delighted smile. {AWAY} {LOOK}')),
    'jake-hands': dict(ref='jake-phone', prompt=(
        'Close-up of the same man\'s hands holding his phone in front of him on the sofa, navy sweater cuffs visible, warm lamp light, '
        f'the city skyline in soft bokeh through the window behind. {GREEN} {LOOK}')),
    'jake-hero': dict(ref='jake-phone', prompt=(
        'The same man in the same apartment and sweater, a medium shot as he looks just off camera with a proud, amused smile, '
        f'as if talking in an interview, phone resting in his hand on his knee. {AWAY} {LOOK}')),
}

VOICES = {
    'vo-sofia': dict(voice='coral', text="I'm using the Arcatext keyboard to text my boyfriend in the US, and practice my English.",
                     instructions='A young woman from Mexico City speaking English with a natural, light Mexican Spanish accent. '
                                  'Warm, relaxed and a little playful, like a candid interview. Natural pace.'),
    'vo-jake': dict(voice='ash', text="My girlfriend is improving so much. It's time for me to learn Spanish!",
                    instructions='A young American man from Chicago, warm and proud, with a little laugh in his voice on the last '
                                 'sentence, like a candid interview. Natural pace.'),
}


def curl(args):
    out = subprocess.run(['curl', '-sS', '--max-time', '900', '-w', '\n%{http_code}', *args], capture_output=True, check=True).stdout
    body, code = out.rsplit(b'\n', 1)
    if code != b'200':
        raise RuntimeError(f'HTTP {code.decode()}: {body[:400]!r}')
    return body


def generate(prompt, ref=None):
    """One still via the Responses API in background mode: the request returns
    at once and is polled, because the proxy cuts requests that take longer
    than ~30s, and a high-quality image takes a minute or more."""
    content = [{'type': 'input_text', 'text': 'Generate this image exactly as described, without changing the description: ' + prompt}]
    if ref:
        b64 = base64.b64encode((OUT / f'{ref}.png').read_bytes()).decode()
        content.insert(0, {'type': 'input_image', 'image_url': f'data:image/png;base64,{b64}'})
    tool = {'type': 'image_generation', 'model': 'gpt-image-2', 'size': '1536x1024', 'quality': 'high'}
    if ref:
        tool['input_fidelity'] = 'high'
    body = {'model': 'gpt-5-mini', 'background': True, 'input': [{'role': 'user', 'content': content}],
            'tools': [tool], 'tool_choice': {'type': 'image_generation'}}
    # One request file per call: stills are generated in parallel.
    fd, name = tempfile.mkstemp(suffix='.json')
    tmp = Path(name)
    with os.fdopen(fd, 'w') as f:
        f.write(json.dumps(body))
    r = json.loads(curl([f'{API}/responses', '-H', 'Content-Type: application/json', '-d', f'@{tmp}']))
    tmp.unlink()
    while r['status'] in ('queued', 'in_progress'):
        time.sleep(8)
        r = json.loads(curl([f'{API}/responses/{r["id"]}']))
    for o in r.get('output', []):
        if o['type'] == 'image_generation_call' and o.get('result'):
            return base64.b64decode(o['result'])
    raise RuntimeError(f'no image: {r["status"]} {r.get("error")}')


def images(only=None):
    def one(name):
        spec = IMAGES[name]
        for attempt in range(3):
            try:
                (OUT / f'{name}.png').write_bytes(generate(spec['prompt'], spec.get('ref')))
                print('wrote', name, flush=True)
                return
            except Exception as e:  # noqa: BLE001 - report and retry
                print('retry', name, e, flush=True)

    todo = [n for n in IMAGES if not (OUT / f'{n}.png').exists() and (not only or n in only)]
    # Base stills first, then the edits that reference them, each wave in parallel.
    for wave in ([n for n in todo if 'ref' not in IMAGES[n]], [n for n in todo if 'ref' in IMAGES[n]]):
        with ThreadPoolExecutor(len(wave) or 1) as pool:
            list(pool.map(one, wave))


def voices():
    for name, spec in VOICES.items():
        dest = OUT / f'{name}.mp3'
        if dest.exists():
            continue
        body = curl([f'{API}/audio/speech', '-H', 'Content-Type: application/json', '-d',
                     json.dumps({'model': 'gpt-4o-mini-tts', 'voice': spec['voice'], 'input': spec['text'],
                                 'instructions': spec['instructions'], 'response_format': 'mp3'})])
        dest.write_bytes(body)
        print('wrote', dest, flush=True)


if __name__ == '__main__':
    {'images': lambda: images(sys.argv[2:] or None), 'voices': voices}[sys.argv[1]]()
