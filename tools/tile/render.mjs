/**
 * Re-render public/hero-tiles/arcatext-keyboard.webp and its dark twin from
 * the drawn keyboard, for when that keyboard changes (a toolbar button, a
 * colour, a metric). The tiles are 1206x2622 -- the phone's 402x874pt screen
 * at 3x -- and feed tools/hero-thumbs.py, which builds the hero's previews.
 *
 *   npx vite --port 5179 &            # the dev server renders the page
 *   node tools/tile/render.mjs        # writes both tiles
 *   python3 tools/hero-thumbs.py && python3 tools/hero-thumbs.py --dark
 *
 * The page it shoots is tools/tile/still.html, which holds the same still
 * ArcatextCardStack shows beside the deck.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import pw from '/opt/node22/lib/node_modules/playwright/index.js';

const PORT = process.env.PORT ?? 5179;
const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const OUT = {
  light: 'public/hero-tiles/arcatext-keyboard.webp',
  dark: 'public/hero-tiles/dark/arcatext-keyboard.webp',
};

const tmp = mkdtempSync(join(tmpdir(), 'tile-'));
const browser = await pw.chromium.launch({ executablePath: CHROME });
for (const scheme of ['light', 'dark']) {
  const ctx = await browser.newContext({ viewport: { width: 1206, height: 1000 } });
  const page = await ctx.newPage();
  await page.goto(`http://localhost:${PORT}/tools/tile/still.html?scheme=${scheme}`, {
    waitUntil: 'networkidle',
  });
  await page.waitForTimeout(1200);
  const png = join(tmp, `${scheme}.png`);
  await page.locator('#shot').screenshot({ path: png });
  await ctx.close();
  // webp at the quality the other tiles are kept at.
  execFileSync('python3', [
    '-c',
    'import sys;from PIL import Image;Image.open(sys.argv[1]).convert("RGB").save(sys.argv[2],"WEBP",quality=88)',
    png,
    OUT[scheme],
  ]);
  console.log(`${scheme} -> ${OUT[scheme]}`);
}
await browser.close();
