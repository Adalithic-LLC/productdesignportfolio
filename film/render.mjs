// Renders the film frame by frame.
//
//   node film/render.mjs --stills 3,9.6,18.5     PNG stills into film/out/stills
//   node film/render.mjs                          film/out/frames.mp4 (silent) + cues.json
//   node film/render.mjs --workers 4              the same, split across 4 browsers
//   --film chat                                   the chat film instead: out/frames-chat.mp4, cues-chat.json
//
// Needs the film dev server: npx vite --config film/vite.config.ts
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const here = path.dirname(new URL(import.meta.url).pathname);
const out = path.join(here, 'out');
fs.mkdirSync(out, { recursive: true });
const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const film = flag('--film') ?? 'main';
// --portrait renders the chat film at 1080x1920 (out/frames-chat-portrait.mp4).
const portrait = args.includes('--portrait');
const suffix = (film === 'main' ? '' : `-${film}`) + (portrait ? '-portrait' : '');
const url = (process.env.FILM_URL ?? 'http://127.0.0.1:5199/') + (film === 'main' ? '' : `?film=${film}`) + (portrait ? (film === 'main' ? '?portrait' : '&portrait') : '');
const [VW, VH] = portrait ? [1080, 1920] : [1920, 1080];
const cuesFile = path.join(out, `cues${suffix}.json`);
const fps = Number(flag('--fps') ?? 60);
const workers = Number(flag('--workers') ?? 1);

if (workers > 1) {
  // Split the frame range, render each part in its own process, then join the
  // parts without re-encoding (they share every encoder setting).
  const cuesProbe = JSON.parse(fs.readFileSync(cuesFile, 'utf8'));
  const total = Math.round(cuesProbe.duration * fps);
  const parts = [];
  for (let w = 0; w < workers; w++) {
    const f0 = Math.floor((total * w) / workers);
    const f1 = Math.floor((total * (w + 1)) / workers);
    const name = `part${suffix}${w}.mp4`;
    parts.push(name);
    const child = spawn(process.execPath, [new URL(import.meta.url).pathname, '--f0', String(f0), '--f1', String(f1), '--out', name, '--fps', String(fps), '--film', film, ...(portrait ? ['--portrait'] : [])], { stdio: ['ignore', 'pipe', 'inherit'] });
    child.stdout.on('data', (d) => process.stdout.write(`[${w}] ${d}`));
    parts[w] = new Promise((r) => child.on('close', () => r(name)));
  }
  const names = await Promise.all(parts);
  const list = path.join(out, `parts${suffix}.txt`);
  const joined = path.join(out, `frames${suffix}.mp4`);
  fs.writeFileSync(list, names.map((n) => `file '${n}'`).join('\n'));
  await new Promise((r) => spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', joined], { stdio: 'inherit' }).on('close', r));
  for (const n of names) fs.rmSync(path.join(out, n));
  console.log('wrote', joined);
  process.exit(0);
}

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--force-color-profile=srgb'] });
const page = await browser.newPage({ viewport: { width: VW, height: VH }, deviceScaleFactor: 1 });
await page.goto(url);
await page.waitForFunction(() => typeof window.__seek === 'function');
await page.evaluate(() => window.__ready);
await page.evaluate(() => document.fonts.load("16px 'Noto Sans JP'", 'こんにちは'));
const cues = await page.evaluate(() => window.__cues);
fs.writeFileSync(cuesFile, JSON.stringify(cues, null, 2));

const shot = async (ms, type = 'png') => {
  await page.evaluate((v) => window.__seek(v), ms);
  return page.screenshot({ type, ...(type === 'jpeg' ? { quality: 97 } : {}), clip: { x: 0, y: 0, width: VW, height: VH } });
};

if (flag('--stills')) {
  const dir = path.join(out, 'stills');
  fs.mkdirSync(dir, { recursive: true });
  for (const s of flag('--stills').split(',')) {
    fs.writeFileSync(path.join(dir, `${film === 'main' ? '' : film + '-'}${portrait ? 'portrait-' : ''}t${s}.png`), await shot(Number(s) * 1000));
    console.log('still', s);
  }
} else {
  const f0 = Number(flag('--f0') ?? 0);
  const f1 = Number(flag('--f1') ?? Math.round(cues.duration * fps));
  const file = path.join(out, flag('--out') ?? `frames${suffix}.mp4`);
  const ff = spawn('ffmpeg', [
    '-y', '-loglevel', 'error',
    '-f', 'image2pipe', '-framerate', String(fps), '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '14', '-pix_fmt', 'yuv420p',
    '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709',
    file,
  ], { stdio: ['pipe', 'inherit', 'inherit'] });
  const n = f1 - f0;
  const t0 = Date.now();
  for (let i = 0; i < n; i++) {
    const png = await shot(((f0 + i) / fps) * 1000, 'jpeg');
    if (!ff.stdin.write(png)) await new Promise((r) => ff.stdin.once('drain', r));
    if (i % fps === 0) console.log(`frame ${i}/${n}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  ff.stdin.end();
  await new Promise((r) => ff.on('close', r));
  console.log('wrote', file);
}
await browser.close();
